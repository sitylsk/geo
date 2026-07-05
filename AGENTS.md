# Anthill

Anthill ("Advanced Neural Targeting & Hyper-spectral Intelligence for Land & Lithosphere") is a
mineral / energy / water exploration intelligence web app. A user picks a resource, drops a pin on a
map, and gets a ranked prospectivity target map plus a grounded geological brief built from live free
public data feeds. See `README.md` for the full product and API description.

## Cursor Cloud specific instructions

### Services

| Service | Required | Port | Run command | Notes |
|---|---|---|---|---|
| Node web app (`server/index.js`) | Yes | 8080 | `npm run dev` (watch) or `npm start` | Core app + `/api/*` + static frontend in `public/`. Open `http://localhost:8080` (Explorer at `/explorer.html`). |
| Python raster service (`raster-service/app.py`) | Optional | 5005 | `raster-service/.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 5005` (run from `raster-service/`) | Adds real Sentinel-2/ASTER alteration ratios + EMAG2 magnetics/derivatives + 3D depth. Node degrades gracefully if offline. |

- There is no build step, no database, and no lint or automated-test scripts (`package.json` only defines `start`/`dev`). Validate changes by running the app and hitting `/api/*` or the Explorer UI.
- The Node app writes runtime state to a gitignored `data/` dir (auto-created on startup).

### Non-obvious gotchas

- **Live data needs outbound internet.** `/api/scan`, `/api/analyze`, and `/api/intelligence` fetch third‑party public feeds (USGS, NOAA, NASA, Microsoft Planetary Computer, Open‑Meteo, etc.). Servers start fine offline, but scans will be sparse or fail without network access. No API keys are required; OpenAI/Anthropic keys in `.env` are strictly optional (LLM brain only).
- **Wire the raster service via `.env`.** Copy `.env.example` to `.env` and add `RASTER_SERVICE_URL=http://127.0.0.1:5005` so the Node app uses the raster service. Confirm with `curl http://localhost:8080/api/sources` → `rasterService.online: true`.
- **`node --watch` does not reload on `.env` changes.** Restart the Node process after editing `.env` (it only watches source files).
- **First-time raster venv setup (one-off, not needed after snapshot).** The raster service uses a venv at `raster-service/.venv`. Creating it requires the `python3-venv` system package (`sudo apt-get install -y python3-venv`). `rasterio` installs from a manylinux wheel with bundled GDAL 3.12 — no system GDAL package needed. The update script refreshes an existing venv but does not create one.
