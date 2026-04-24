# Fiskehelseregisteret — Anleggsoversikt

A viewer for Mattilsynet's public fish-health register that lets you check
whether a particular Norwegian aquaculture site (*anlegg*) has had a reported
fish-disease case, and browse/filter the full national inventory of ~1 500
sites.

This was originally built as a weekend exploration after wanting to look up a
specific *lokalitetsnummer* and finding no user-friendly public frontend on
top of the official API. The current version is a React + TypeScript + Vite
SPA that streams live data through a small local Node proxy.

**Stack at a glance**

| Piece       | Tech                                                   |
|-------------|--------------------------------------------------------|
| Frontend    | React 18 + TypeScript (strict) + Vite 6 + Tailwind 3   |
| Styling     | Hand-written CSS (editorial/newspaper aesthetic) + CSS vars, Tailwind for layout utilities |
| Data layer  | Plain `fetch` + a module-singleton paginated loader    |
| Proxy       | Node `node:https` + keep-alive agent + in-memory cache + retry-on-5xx |
| Legacy      | A vanilla-HTML static viewer and vanilla-HTML live viewer (kept under `legacy/` as references) |
| Language    | All user-facing strings in Norwegian bokmål            |

---

## The API this builds on

**Upstream:** `https://akvakultur-offentlig-api.fisk.mattilsynet.io`

Public API operated by Mattilsynet (the Norwegian Food Safety Authority).
Documentation and OpenAPI spec:

- Swagger UI: <https://akvakultur-offentlig-api.fisk.mattilsynet.io/docs/>
- OpenAPI JSON: <https://akvakultur-offentlig-api.fisk.mattilsynet.io/q/openapi?format=json>

The `/anlegg` endpoint is **fully public** — no Maskinporten, no OAuth, just a
`Client-Id` header you make up to identify yourself. The subscription endpoints
(`/abonnement`) do require Maskinporten but are out of scope for this viewer.

### Endpoints this project actually uses

Only one endpoint is wired up today:

#### `GET /api/fiskehelseregisteret/v1/anlegg`

Returns an array of aquaculture sites with inline disease-case summaries.
Paginated — you call it repeatedly with `limit` and `offset` until upstream
returns a short page or the total is reached.

**Query parameters**

| Param    | Default | Notes                                                 |
|----------|---------|-------------------------------------------------------|
| `limit`  | 100     | Page size. Upstream accepts up to 500.               |
| `offset` | 0       | Starting index.                                      |

**Required request headers**

| Header      | Value                                  |
|-------------|----------------------------------------|
| `Client-Id` | Any non-empty identifier you pick.     |
| `Accept`    | `application/json` (not strictly enforced but polite) |

**Response headers of interest**

| Header    | Meaning                                                       |
|-----------|---------------------------------------------------------------|
| `X-Count` | Total count of records available — lets the client plan pagination and show a `loaded / total` progress indicator. |
| `X-Limit` | Echo of the applied limit.                                    |

**Response body** — array of `Anlegg`:

```jsonc
[
  {
    "anleggId": 13562,                   // == lokalitetsnummer
    "anleggNavn": "RISHOLMEN",
    "produksjonsform": ["MATFISK"],
    "eiere": [
      { "id": "983970400", "navn": "SØRVEST LAKS AS" },
      { "id": "951375772", "navn": "HELLESUND FISKEOPPDRETT AS" }
    ],
    "arter": [],
    "sykdomstilfeller": [
      { "sykdomstype": "PANKREASSYKDOM", "diagnoseDato": "2025-04-24T22:00:00Z" }
    ]
  }
]
```

### Observed upstream behaviour

Things worth knowing that aren't in the spec but matter for a real
implementation (discovered during development):

- **Latency is ~linear in page size.** `limit=50 ≈ 7s`, `limit=100 ≈ 10s`,
  `limit=200 ≈ 20s`, `limit=500 ≈ 42s`. The loader uses a ramp schedule
  (50 → 100×3 → 150×3 → 200×∞) so the first rows appear fast while overall
  throughput stays high.
- **Concurrency is rate-limited.** Fetching 2 in parallel is nearly free
  (first request: ~9s, second: ~13s). Fetching 4 in parallel makes every
  individual request balloon to ~25–30s — net slowdown. `PARALLEL_CONCURRENCY`
  is pinned at 2.
- **Transient 500s** come through Google Frontend (the upstream is hosted
  behind `server: Google Frontend`). The proxy retries 5xx responses up to
  4 times with exponential backoff (0.5s / 1s / 2s / 4s).
- **Node's global `fetch` (undici) is unreliable against this upstream** on
  some macOS setups — the TLS connection stalls for 30–60s before failing.
  The proxy deliberately uses `node:https` instead.

### The `Sykdomstype` enum

Nine reportable diseases. The app renders each with a short red-badge code
plus the full Norwegian name in a tooltip.

| Enum value                                               | Short | Full name                                              |
|----------------------------------------------------------|-------|--------------------------------------------------------|
| `PANKREASSYKDOM`                                         | PD    | Pankreassykdom                                         |
| `INFEKSIOES_LAKSEANEMI`                                  | ILA   | Infeksiøs lakseanemi                                   |
| `INFEKSIOES_HEMATOPOIETISK_NEKROSE`                      | IHN   | Infeksiøs hematopoietisk nekrose                       |
| `VIRAL_HEMORAGISK_SEPTIKEMI`                             | VHS   | Viral hemoragisk septikemi                             |
| `FURUNKULOSE`                                            | FUR   | Furunkulose                                            |
| `FRANCISELLOSE`                                          | FRA   | Francisellose                                          |
| `BAKTERIELL_NYRESYKE`                                    | BKD   | Bakteriell nyresyke                                    |
| `SYSTEMISK_INFEKSJON_MED_FLAVOBACTERIUM_PSYCHROPHILUM`   | FLAV  | Systemisk infeksjon m/ *Flavobacterium psychrophilum*  |
| `INFEKSJON_GYRODACTYLUS_SALARIS`                         | GYRO  | Infeksjon med *Gyrodactylus salaris*                   |

Canonical mapping lives in `src/lib/sykdom.ts`.

### Endpoints NOT used (yet)

The API exposes more than this viewer currently consumes. Candidates for
future work:

- `GET /api/sykdomstilfeller/v1/rapporteringer` — fuller case lifecycle
  (varslingsdato, diagnosedato, avslutningsdato, avslutningsårsak, subtype).
  The summary embedded in `/anlegg` is abbreviated; this endpoint is the
  source of truth for clinical detail.
- `GET /api/fiskehelseregisteret/v1/anlegg/{anleggId}` — single-site lookup.
- `/abonnement` endpoints — push subscriptions to new cases (Maskinporten
  required).

Cross-referencing `anleggId` against
[Akvakulturregisteret](https://sikker.fiskeridir.no/akvakulturregisteret/)
would add latitude/longitude for a map view.

---

## Running locally

You need Node 18+ and npm.

```bash
npm install
npm run dev
```

That single command boots **both** processes (`concurrently`):

- `proxy.js` on `http://localhost:8787` — forwards `/api/*` to Mattilsynet,
  injects the `Client-Id` header, solves CORS, caches for 5 min.
- Vite dev server on `http://localhost:5173` — the React app. Its dev-server
  proxy forwards `/api/*` to `:8787`, so the browser only ever sees relative
  URLs.

Open <http://localhost:5173>. Data starts streaming in within ~7 seconds;
the full ~1 538 anlegg take about a minute.

**Logs are prefixed** `[proxy]` and `[vite]`. `Ctrl-C` stops both.

### Other scripts

```bash
npm run build       # typechecked production build → dist/
npm run preview     # preview the built output
npm run typecheck   # tsc --noEmit, zero errors expected
npm run dev:vite    # just Vite (if you want to run proxy separately)
npm run dev:proxy   # just the proxy
```

### Environment variables

| Var         | Default                            | Purpose                                  |
|-------------|------------------------------------|------------------------------------------|
| `CLIENT_ID` | `trollefsen-fiskehelse-viewer`     | What the proxy sends upstream as `Client-Id`. Pick your own if you fork. |
| `PORT`      | `8787`                             | Port the proxy listens on.               |

---

## Architecture

### Frontend (`src/`)

```
src/
├── main.tsx                      # React root; NO <StrictMode> (it double-
│                                 #   invokes effects, which would restart
│                                 #   the slow paginated loader in dev)
├── App.tsx                       # Composes: Masthead / Controls / Table / Detail / Footer
├── index.css                     # CSS variables (design tokens), base styles, responsive rules
├── types.ts                      # Anlegg, Eier, SykdomstilfelleSummary, FilterCriteria, ...
│
├── lib/
│   ├── api.ts                    # fetchAnleggPage() + ramp page-size schedule
│   ├── filter.ts                 # Pure filterAnlegg() + sortAnlegg()
│   ├── format.ts                 # Date/number/owner formatters (nb-NO locale)
│   └── sykdom.ts                 # SYKDOM_LABELS + sykShort() / sykFull()
│
├── hooks/
│   └── useAnleggLoader.ts        # Module-singleton paginated loader — see below
│
└── components/
    ├── Masthead.tsx              # Title + status/counters row
    ├── Controls.tsx              # Search, two dropdowns, filter pill
    ├── AnleggTable.tsx           # Table with colgroup; caps at 400 rendered rows
    ├── AnleggRow.tsx             # Single row (name, ID, owner, disease badges)
    ├── DiseaseBadge.tsx          # Red monospace chip; inline | solid variants
    ├── DetailPanel.tsx           # Right panel on desktop, slide-up sheet on mobile
    ├── Spinner.tsx               # Pure-CSS spinner
    └── Footer.tsx                # Proxy URL + API docs link
```

**Design tokens** (in `src/index.css` under `:root`) — warm earth-toned
editorial palette:

```
--paper      #f5f1ea       /* body background                 */
--paper-2    #ede8df       /* alternate band / hover          */
--rule       #d8d1c3       /* hairline rules                  */
--rule-2     #c2b9a7       /* structural rules                */
--ink        #1a1a1d       /* body text (used sparingly)      */
--ink-2      #3a3936       /* secondary text                  */
--ink-warm   #4a3f30       /* warm dark for selected / status */
--mute       #8a7e6e       /* labels, metadata                */
--alarm      #c7382d       /* disease cases                   */
--alarm-bg   #f3d9d5       /* disease badge background        */
```

Typography: **Spectral** for editorial headings, **IBM Plex Sans** for body,
**IBM Plex Mono** for metadata and labels. All loaded from Google Fonts.

### The loader (`src/hooks/useAnleggLoader.ts`)

Singleton state lives at module level, subscribers register via a small
pub/sub. This matters because:

- React `StrictMode` / Vite HMR remounts would otherwise restart the slow
  paginated load from scratch.
- Multiple components that observe the same data stay in sync without prop
  drilling the entire list.

Load strategy:

1. Fire the **first page small (50)** so rows appear on screen in ~7s.
2. Read `X-Count` from the response to learn the total.
3. If total is known, build a schedule of remaining pages using the ramp
   `100, 100, 100, 150, 150, 150, 200, 200, ...` and fetch them through a
   worker pool of 2 concurrent requests.
4. After each page returns, merge into a sorted list (cases-first, then
   alphabetical by `anleggNavn` using `localeCompare(x, "nb")`) and emit
   an update. The table re-renders progressively.
5. If `X-Count` is missing for any reason, fall back to sequential pagination
   until an empty page comes back — guarantees a complete dataset.

### The proxy (`proxy.js`)

Small dependency-free Node server. Responsibilities:

- **CORS** — lets the browser call `/api/*` from `localhost:5173`.
- **Client-Id injection** — adds the required upstream header so the React
  app never handles it.
- **Path allowlist** — only `/api/fiskehelseregisteret/v1/anlegg[...]` and
  `/api/sykdomstilfeller/v1/rapporteringer[...]` are forwarded; anything
  else returns 404.
- **Cache** — in-memory, 5-minute TTL, keyed on path+query. Makes
  filter-fiddling and reloads instant.
- **Retry on 5xx** — transient upstream 500s are swallowed with up to 4
  attempts and exponential backoff.
- **`node:https` not `fetch`** — deliberately; `fetch` (undici) stalls on
  this upstream on some machines. See "Observed upstream behaviour" above.
- **Passes through `X-Count`** — exposed to the browser via
  `Access-Control-Expose-Headers`.

### Vite dev proxy

`vite.config.ts` forwards `/api/*` to `http://localhost:8787` with a 120 s
timeout (upstream can legitimately take 40+ seconds per page). This keeps
the browser making fully-relative requests that would also work in
production behind any edge proxy.

---

## UX decisions

A few that aren't obvious from the code:

- **Rows with cases are sorted to the top.** The whole point of this viewer
  is answering "has anlegg X ever had a case?", so surfacing all cases-first
  means that scanning works even before typing a query.
- **Max 400 rendered rows**, with a "viser 400 av N treff" footer when
  truncated. At 1 500+ rows the DOM was perceptibly sluggish in filtering.
  400 is enough that you can always narrow to what you want via the search.
- **Click a row to open detail; click the same row to close it.** On mobile
  the detail becomes a slide-up sheet with a circular `×` close button
  (44×44 touch target) because tapping the row behind isn't discoverable.
- **Filter pill, not a checkbox.** The original `<input type=checkbox>` with
  `<label>` was visually clumsy and had a CSS specificity bug that stacked
  the checkbox above the text. A pill button with an `aria-pressed` state
  reads the same to assistive tech and looks better.
- **Eier column hides below 480px width** — it's still visible inside the
  detail sheet, so no information is lost; the table just fits.
- **`scrollbar-gutter: stable`** on `<html>` keeps the layout from jumping
  horizontally when the filtered row count changes enough to add/remove the
  scrollbar.
- **`font-size: 16px`** on mobile inputs prevents iOS Safari's unwanted
  zoom-on-focus.

---

## Files

| File                              | Purpose                                                    |
|-----------------------------------|------------------------------------------------------------|
| `src/`                            | React + TS source                                          |
| `index.html`                      | Vite entry                                                 |
| `vite.config.ts`                  | Vite config + dev-server proxy                             |
| `tailwind.config.ts`              | Tailwind theme extended with CSS-var-backed tokens         |
| `tsconfig.json`                   | `strict` TS config                                         |
| `proxy.js`                        | Local CORS-solving proxy (Node ≥ 18)                       |
| `fetch_data.py`                   | Original Python fetcher for the legacy static viewer       |
| `legacy/index.static.html`        | Self-contained static viewer (data baked in)               |
| `legacy/index.live.html`          | Legacy vanilla-HTML viewer that hits the proxy             |
| `legacy/index.template.html`      | Template the Python fetcher fills in                       |
| `data.json`                       | Sample data dump from an early fetch; useful for debugging |
| `README.md`                       | You are here.                                              |

---

## Deploying to a VPS (notes for an agent or operator)

**Target environment:** a small Linux VPS (1 vCPU / 512 MB RAM is plenty),
publicly reachable on 80/443, with a domain pointed at it. The app is static
but needs the Node proxy running alongside so browsers can hit `/api/*`.

The shape of the deployment is:

```
Internet ── 443 ──▶ Caddy (TLS, static files, reverse proxy /api)
                     │
                     ├── serves  /var/www/fiskehelse/dist/*   (Vite build)
                     └── proxies /api/*  →  127.0.0.1:8787    (Node proxy.js, systemd)
```

Only the Caddy ports (80/443) are exposed to the internet. The Node proxy
stays on `127.0.0.1:8787`, reachable only from Caddy on the same box.

### 1. One-time host prep

Assumes a fresh Debian/Ubuntu box and `root` or `sudo`:

```bash
# Node 20 LTS (18+ works, 20 is a good default)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt update && apt install -y nodejs git caddy ufw

# Firewall: only expose 80/443 + SSH
ufw allow ssh
ufw allow 80,443/tcp
ufw --force enable

# Dedicated unprivileged user to own the app
adduser --system --group --home /var/www/fiskehelse fiskehelse
```

### 2. Clone, build, place the app

```bash
cd /var/www/fiskehelse
sudo -u fiskehelse git clone https://github.com/da-troll/fishfarming-incidents-norway.git app
cd app
sudo -u fiskehelse npm ci
sudo -u fiskehelse npm run build    # produces dist/
```

`dist/` is what Caddy will serve. `node_modules/` and `proxy.js` stay in
`app/` for the systemd service.

### 3. systemd unit for the proxy

Create `/etc/systemd/system/fiskehelse-proxy.service`:

```ini
[Unit]
Description=Fiskehelse API proxy (node:https → Mattilsynet)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=fiskehelse
Group=fiskehelse
WorkingDirectory=/var/www/fiskehelse/app
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=CLIENT_ID=your-org-fiskehelse-viewer
ExecStart=/usr/bin/node /var/www/fiskehelse/app/proxy.js
Restart=on-failure
RestartSec=5

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6
RestrictNamespaces=true
LockPersonality=true
MemoryDenyWriteExecute=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

Change `CLIENT_ID` to something that identifies you (Mattilsynet only asks
that it be non-empty and distinct per consumer).

Enable and start:

```bash
systemctl daemon-reload
systemctl enable --now fiskehelse-proxy
systemctl status fiskehelse-proxy      # should be active (running)
journalctl -u fiskehelse-proxy -f      # live logs
```

Sanity check locally on the box:

```bash
curl -s http://127.0.0.1:8787/api/fiskehelseregisteret/v1/anlegg?limit=1 | head -c 200
```

### 4. Caddy — TLS + static + `/api` reverse proxy

`/etc/caddy/Caddyfile`:

```caddyfile
fiskehelse.example.com {
    encode zstd gzip

    # Reverse-proxy API calls to the Node proxy.
    # The upstream API can legitimately take 40+s per page, so bump timeouts.
    handle /api/* {
        reverse_proxy 127.0.0.1:8787 {
            transport http {
                dial_timeout 5s
                response_header_timeout 120s
                read_timeout 120s
            }
        }
    }

    # Everything else: static SPA.
    handle {
        root * /var/www/fiskehelse/app/dist
        file_server
        try_files {path} /index.html
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options    "nosniff"
        Referrer-Policy           "no-referrer-when-downgrade"
        # Only first-party assets + Google Fonts for Spectral/IBM Plex.
        Content-Security-Policy   "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
        -Server
    }

    # Long cache on build-hashed assets; no cache on index.
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    @root path /
    header @root Cache-Control "no-cache"

    log {
        output file /var/log/caddy/fiskehelse.log
        format json
    }
}
```

Replace `fiskehelse.example.com` with your domain. Caddy automatically
obtains and renews a Let's Encrypt certificate on first start, assuming the
domain's `A`/`AAAA` records already point at the VPS.

```bash
systemctl reload caddy
journalctl -u caddy -f
```

Hit `https://your-domain/` in a browser — the app should load and start
streaming data the same way it does locally.

### 5. Updates / redeploys

```bash
cd /var/www/fiskehelse/app
sudo -u fiskehelse git pull
sudo -u fiskehelse npm ci
sudo -u fiskehelse npm run build
systemctl restart fiskehelse-proxy       # only if proxy.js changed
# Caddy picks up new static files automatically (no restart needed).
```

You could wrap the above in a `deploy.sh` at the repo root or a GitHub
Actions workflow; nothing in the code stops you.

### 6. Operational notes

- **Memory:** Node proxy idles at ~40 MB. Caddy at ~20 MB. Plenty of room on
  a 512 MB VPS.
- **Cache sizing:** The proxy's in-memory cache is unbounded but each entry
  is a few KB — 1 538 anlegg fully cached ≈ 1 MB. Fine.
- **Traffic characteristics:** First page load per client is ~200 KB
  uncompressed; the API pages themselves are 20–100 KB each. The proxy's
  cache absorbs most of the load, so Mattilsynet's upstream only sees one
  request per path every 5 minutes regardless of visitor count.
- **Rate limiting:** No formal upstream contract is known, but the observed
  throttling at concurrency > 2 suggests Mattilsynet is unhappy with bursts.
  The proxy cache plus the client's fixed concurrency of 2 keep well within
  reasonable bounds. If you expect many simultaneous visitors, consider
  bumping `CACHE_TTL_MS` in `proxy.js` from 5 min to 30–60 min.
- **Logs:** `journalctl -u fiskehelse-proxy` for the proxy (includes the
  `[retry N/4]` line when upstream 5xxs); `/var/log/caddy/fiskehelse.log`
  for access + access-style metadata.
- **Backups:** Nothing to back up. State is either on GitHub (code) or at
  Mattilsynet (data).
- **Health check:** `curl -fsS http://127.0.0.1:8787/api/fiskehelseregisteret/v1/anlegg?limit=1 > /dev/null` from cron every few minutes, alert on non-zero exit. Good enough.

### Alternative: Docker

If you prefer containers, a minimal `Dockerfile` + `docker-compose.yml` would
build `dist/` in a builder stage, run `proxy.js` in the runtime stage, and
let Caddy (running on the host or in a second container) reverse-proxy to
it. Not included here; the systemd path above is simpler for a single box.

---

## Not implemented (deliberately)

- Map view (needs cross-reference to Akvakulturregisteret for lat/long)
- Case drill-down via `/sykdomstilfeller/v1/rapporteringer`
- Maskinporten + subscription endpoints
- Production deployment config — dev only
- Unit tests (the logic that would most benefit is `filterAnlegg` — a single
  Vitest file against pure functions would be the right amount)
- Virtualised table rendering (400-row cap makes it unnecessary)
- Dark mode

---

## License

No license specified; this is a personal tool. The upstream data belongs to
Mattilsynet and is published under their terms. Treat as MIT-ish for
reuse but attribute appropriately if you build on it.
