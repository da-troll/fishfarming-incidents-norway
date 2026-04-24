# Fiskehelseregisteret — Anleggsoversikt

Simple viewer for Mattilsynet's public Fiskehelseregister API. Browse every Norwegian aquaculture site (anlegg), filter by disease type, and check whether a specific location has ever had a reported case.

API: <https://akvakultur-offentlig-api.fisk.mattilsynet.io/docs/>
The `anlegg` endpoint is fully public — no Maskinporten, no auth, just a `Client-Id` header you make up.

---

## Three ways to run it

### v3 — React + TypeScript (current)

Modern Vite + React + TypeScript app. Live data via the same `proxy.js`.

```bash
npm install
npm run dev                  # starts proxy (:8787) + Vite (:5173) together
```

One command runs both processes via `concurrently`; logs are prefixed
`[proxy]` / `[vite]`. Vite proxies `/api/*` → `http://localhost:8787`,
so the React app fetches relative URLs and the browser never has to know
about the upstream host. `Ctrl-C` stops both.

Split scripts are also available: `npm run dev:vite` and `npm run dev:proxy`.

Other scripts:
- `npm run build` — typechecked production build to `dist/`
- `npm run preview` — preview the built output
- `npm run typecheck` — `tsc --noEmit`

The legacy vanilla HTML viewers are preserved under `legacy/` for reference.

### v1 — Static (recommended for casual lookups)

One HTML file with data baked in. Refresh by re-running the fetch script.

```bash
python3 fetch_data.py         # writes data.json + index.html
open index.html               # double-click in Finder / Explorer also works
```

**Pros:** zero dependencies to keep running, opens from `file://`, works offline, instant filtering across the whole dataset.
**Cons:** data is frozen at fetch time — rerun the script whenever you want fresh data.

### v2 — Live proxy

Tiny Node server forwards browser calls to Mattilsynet, solving CORS and injecting the `Client-Id`. The HTML streams data in as it loads.

```bash
node proxy.js                 # listens on http://localhost:8787
open index.live.html          # same viewer, live data
```

**Pros:** always up-to-date; ready if you want to wire in the `/sykdomstilfeller` drill-down later.
**Cons:** needs Node 18+; proxy has to be running whenever you open the page.

Configure the `Client-Id` sent upstream by setting an env var:
```bash
CLIENT_ID="trollefsen-viewer" PORT=8787 node proxy.js
```

---

## Files

| File | Purpose |
|---|---|
| `src/` | React + TypeScript source for the current viewer |
| `index.html` | Vite entry HTML |
| `vite.config.ts` | Vite config (proxies `/api/*` to `:8787`) |
| `fetch_data.py` | Paginates `/anlegg` and builds the legacy static HTML |
| `legacy/index.template.html` | Legacy template — `<!--DATA_PLACEHOLDER-->` is replaced at build time |
| `legacy/index.static.html` | Legacy self-contained static viewer |
| `legacy/index.live.html` | Legacy live viewer that hits `http://localhost:8787` |
| `data.json` | Generated — raw dump, useful for debugging |
| `proxy.js` | Tiny CORS-solving proxy for the live viewer (Node ≥ 18) |

---

## Disease codes used in the UI

Short codes rendered in red badges next to each anlegg:

| Code | Full name (Norwegian) |
|---|---|
| `PD`   | Pankreassykdom |
| `ILA`  | Infeksiøs lakseanemi |
| `IHN`  | Infeksiøs hematopoietisk nekrose |
| `VHS`  | Viral hemoragisk septikemi |
| `FUR`  | Furunkulose |
| `FRA`  | Francisellose |
| `BKD`  | Bakteriell nyresyke |
| `FLAV` | Systemisk infeksjon m/ Flavobacterium psychrophilum |
| `GYRO` | Infeksjon med Gyrodactylus salaris |

These match the nine values in the API's `Sykdomstype` enum.

---

## Next steps (not wired yet)

- Pull `/sykdomstilfeller/v1/rapporteringer?lokalitetsnummer=…` for the full lifecycle per case (varslingsdato, diagnosedato, avslutningsdato, avslutningsårsak, sykdomssubtype). Currently only the compact summary embedded in the anlegg response is shown.
- Cross-reference Akvakulturregisteret for lat/long → map view.
- Subscribe to updates via the `/abonnement` endpoints (requires Maskinporten).
