# Anthill

Advanced Neural Targeting and Hyper-spectral Intelligence for Land and Lithosphere.

Discovery intelligence for minerals, gemstones, energy and water. Pick a resource,
drop a pin anywhere on Earth, and get a ranked target map plus a complete,
grounded exploration brief built from live free data and a deep geological
knowledge base.

## Run locally

```bash
npm install
cp .env.example .env   # optional: add AI keys for an extra model-fusion pass
npm run dev            # or: npm start
```

Open http://localhost:8080

The full analysis works with no API keys: Anthill produces a complete grounded
synthesis from the live free data feeds and the geological knowledge base.

The AI brain uses OpenAI GPT-5 (default `gpt-5-mini`, powerful but cheap) via the
Responses API with the built-in `web_search` tool, so it can search the internet
and cite sources. It runs a prospector vs skeptic multi-pass reasoning flow on
top of the grounded brief. Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`)
in `.env` to enable it. Adding `ANTHROPIC_API_KEY` splits the two voices across
providers.

## Free data sources (no API key required)

Every source below is free and open. None requires a paid key.

| Data | Source | Use |
|---|---|---|
| Satellite imagery | Esri World Imagery, OSM, OpenTopoMap, CARTO | Base maps |
| L-band SAR | JAXA ALOS PALSAR (Microsoft Planetary Computer STAC) | Subsurface / canopy penetration |
| Magnetics | NOAA WMM-2025 (computed locally) | Magnetic field and declination |
| Gravity | GRACE/GOCE-class prior | Deep density context |
| Thermal / soil | NASA POWER | Hydrothermal and moisture screening |
| Earthquakes | USGS FDSN | Active structures |
| Seismicity | IRIS FDSN | Crustal plumbing |
| Mineral deposits | USGS MRDS (WFS) | Nearby known occurrences |
| Geochem sites | USGS NWIS | Water and sediment chemistry |
| Environmental events | NASA EONET | Hazard and environment context |
| Near-earth objects | NASA NeoWs (DEMO_KEY) | Optional context |
| Climate and soil temperature | Open-Meteo | Elevation, multi-depth soil temperature |
| Commodity prices | Metals.live with gold-api.com fallback | Live spot prices |
| Tectonic plates | Bird 2002 model | Plate boundary context |
| STAC scenes | MODIS LST, ASTER, Landsat, gNATSGO, GPM, Sentinel-3 | Coverage and thermal |

## Space-based and non-invasive methods

Anthill catalogs the modern sensing methods that probe the ground from space.
See `GET /api/methods`. Active methods are used in every scan; available methods
are free sources ready to add:

- Active: L-band SAR, satellite gravimetry, magnetic field, thermal inertia,
  geobotanical NDVI stress.
- Available to add (all free): InSAR deformation (Sentinel-1), hyperspectral
  mineral mapping (EMIT/EnMAP), spaceborne lidar (GEDI/ICESat-2), GNSS
  reflectometry soil moisture (CYGNSS), L-band soil moisture (SMAP),
  magnetotelluric conductivity priors.

No space-based method confirms an ore body at depth. They tell you where to look
and what is happening regionally; ground geophysics and drilling provide proof.

## Geological knowledge base

The analysis fuses classic and modern indicators:

- Geobotanical indicator species (for example Becium homblei for copper,
  Berkheya coddii for nickel, Viola calaminaria for zinc, Astragalus for
  selenium and uranium).
- Pressure-temperature windows and metamorphic facies per deposit type.
- Pathfinder element haloes and structural settings.
- Surface and weathering expressions (gossans, malachite, calcrete, sinter).

## Your documents

In the Explorer you can add your own survey reports, assays, field notes or CSV
data. Text, CSV, JSON and similar files are read in your browser and fed into the
analysis as grounding. See `POST /api/documents/parse`.

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Status and provider availability |
| GET | `/api/sources` | All data sources and integrations |
| GET | `/api/methods` | Space-based sensing methods |
| GET | `/api/commodities` | Resource list |
| POST | `/api/scan` | Ranked target map (fast) |
| POST | `/api/analyze` | Full grounded analysis brief |
| POST | `/api/intelligence` | Regional intelligence for an area |
| POST | `/api/documents/parse` | Ingest operator documents |
| POST | `/api/contact` | Pilot scan requests |

## Disclaimer

Outputs are for exploration planning only, not verified resource evidence.
Validate all targets with field work before economic decisions.
