#!/usr/bin/env python3
"""
Fetch all anlegg from Mattilsynet's public Fiskehelseregister API and
write them to data.json for the static viewer.

Run:  python3 fetch_data.py
Output: data.json (same directory)

The API is fully public — no auth required, only a Client-Id header.
Docs: https://akvakultur-offentlig-api.fisk.mattilsynet.io/docs/
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib import request
from urllib.error import HTTPError, URLError

API_BASE = "https://akvakultur-offentlig-api.fisk.mattilsynet.io"
ENDPOINT = "/api/fiskehelseregisteret/v1/anlegg"

# Identifier sent as Client-Id header. Can be anything reasonable.
# Change it to something that identifies your client (e.g. "trollefsen-viewer").
CLIENT_ID = "trollefsen-fiskehelse-viewer"

PAGE_SIZE = 500          # Server accepts larger; 500 is a safe balance.
MAX_PAGES = 200          # Safety cap — 100k anlegg is way more than exists.
REQUEST_TIMEOUT = 60     # seconds
SLEEP_BETWEEN = 0.2      # polite pacing between pages


def fetch_page(offset: int, limit: int) -> list[dict]:
    url = f"{API_BASE}{ENDPOINT}?limit={limit}&offset={offset}"
    req = request.Request(url, headers={
        "Client-Id": CLIENT_ID,
        "Accept": "application/json",
    })
    with request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    out_path = Path(__file__).parent / "data.json"
    all_anlegg: list[dict] = []
    seen_ids: set[int] = set()

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        print(f"[{page+1:03d}] GET offset={offset} limit={PAGE_SIZE} ... ",
              end="", flush=True)
        try:
            batch = fetch_page(offset, PAGE_SIZE)
        except (HTTPError, URLError) as e:
            print(f"ERROR: {e}")
            return 1

        if not batch:
            print("empty — done")
            break

        # De-dupe defensively (if the server ever changes ordering mid-fetch)
        new = [a for a in batch if a.get("anleggId") not in seen_ids]
        for a in new:
            seen_ids.add(a["anleggId"])
        all_anlegg.extend(new)

        print(f"{len(batch)} rows  (total: {len(all_anlegg)})")

        if len(batch) < PAGE_SIZE:
            break

        time.sleep(SLEEP_BETWEEN)

    with_cases = sum(1 for a in all_anlegg if a.get("sykdomstilfeller"))

    payload = {
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": API_BASE + ENDPOINT,
        "count": len(all_anlegg),
        "countWithCases": with_cases,
        "anlegg": all_anlegg,
    }

    # 1. Plain JSON dump — handy for the proxy version and for debugging.
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    # 2. Self-contained HTML with data embedded, so index.html works from file://
    template_path = Path(__file__).parent / "index.template.html"
    standalone_path = Path(__file__).parent / "index.html"
    if template_path.exists():
        template = template_path.read_text(encoding="utf-8")
        embedded = template.replace(
            '<!--DATA_PLACEHOLDER-->',
            '<script id="data" type="application/json">'
            + json.dumps(payload, ensure_ascii=False).replace('</', '<\\/')
            + '</script>'
        )
        standalone_path.write_text(embedded, encoding="utf-8")
        print(f"\nWrote {len(all_anlegg)} anlegg ({with_cases} with disease "
              f"cases)\n  → {out_path}\n  → {standalone_path}")
    else:
        print(f"\nWrote {len(all_anlegg)} anlegg ({with_cases} with disease "
              f"cases)\n  → {out_path}\n  (no template found — skipping HTML)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
