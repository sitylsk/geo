# Anthill (geo)

Discovery-intelligence web app for minerals, gemstones, energy and water. See
`README.md` for the product overview, data sources and full API reference.

## Cursor Cloud specific instructions

### Services

There are two services. The Node app is the product and runs fully standalone;
the Python raster service is optional and the Node app degrades gracefully when
it is offline.

| Service | Dir | Dev command | Port |
|---|---|---|---|
| Node app (API + static frontend) | repo root | `npm run dev` (node `--watch`, hot reload) | 8080 |
| Raster microservice (FastAPI) | `raster-service/` | `.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 5005` | 5005 |

### Setup / run notes

- Copy `.env.example` to `.env` before running. The app runs with **no API keys**
  (it produces a full grounded analysis from free data feeds); keys only enable
  the extra AI-fusion pass. To connect the raster service, set
  `RASTER_SERVICE_URL=http://127.0.0.1:5005` in `.env`.
- The Python raster service uses a virtualenv at `raster-service/.venv`. Creating
  it requires the `python3.12-venv` system package (already installed in this
  environment/snapshot). `rasterio` ships its own bundled GDAL via wheels, so no
  system GDAL is needed.
- There is **no lint config and no test suite** in this repo (`package.json` only
  defines `start` and `dev`). "Validating" a change means running the app and
  exercising the API/UI.
- `POST /api/scan`, `/api/analyze`, `/api/intelligence` and `/api/discover` call
  **live external data feeds** (USGS, NASA, NOAA, Open-Meteo, IRIS, Planetary
  Computer, etc.), so they need internet access and can take several seconds;
  individual feeds fail soft. Quick smoke checks: `GET /api/health`,
  `GET /api/commodities`, and the raster service `GET /health`.
