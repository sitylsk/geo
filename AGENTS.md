# Anthill

Discovery intelligence for minerals, gemstones, energy and water. See `README.md`
for the product overview, API routes, data sources and knowledge base.

## Cursor Cloud specific instructions

### Services

| Service | Path | Start command | Port | Required? |
|---|---|---|---|---|
| Node API + static frontend | `server/`, `public/` | `npm run dev` (watch) or `npm start` | 8080 | Yes |
| Python raster microservice | `raster-service/` | `raster-service/.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 5005` | 5005 | Optional |

- Open the app at `http://localhost:8080` (landing) / `http://localhost:8080/explorer` (main tool).
- There are no `lint` or `test` scripts in `package.json` — only `start` and `dev`. Sanity-check code with `node --check server/index.js`.

### Non-obvious notes

- The app runs fully with **no API keys**: it produces a complete grounded analysis
  from live free data feeds + the knowledge base. `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`
  in `.env` only add an extra LLM synthesis pass; leave them unset for local dev.
- The raster service is **optional** and the Node app degrades gracefully when it is
  offline (scans just omit the real alteration/magnetics layers). When both run, the
  Node app auto-discovers it at `http://127.0.0.1:5005` (`RASTER_SERVICE_URL` default),
  so no `.env` wiring is needed to connect them.
- The Python service must run from its virtualenv at `raster-service/.venv`
  (Ubuntu is PEP-668 externally-managed, so a venv is required rather than a global
  `pip install`). `rasterio` ships GDAL in its wheel, so no system GDAL package is needed.
- Scans and analysis hit live external geoscience APIs (USGS, NASA POWER, NOAA, IRIS,
  Open-Meteo, Microsoft Planetary Computer STAC, etc.). A single `/api/scan` can take
  ~10-20s. Results vary run-to-run with live data, and transient upstream failures are
  swallowed (graceful fallback) rather than crashing a scan.
- Runtime data (e.g. `data/leads.jsonl`, drill logs) is written to `data/` at the repo
  root, which is git-ignored and created on startup.
