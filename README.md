# TerraShed Explorer

AI-powered exploration intelligence platform. Pick **any** commodity — gold,
copper, emeralds, diamonds, lithium, rare earths, oil & gas, geothermal or
groundwater — drop a pin **anywhere on Earth**, and get a high-fidelity
prospectivity color map with circled, ranked targets plus a **dual-AI
(Claude + GPT)** fused exploration brief.

It generalises the arsenopyrite-gold workflow (magnetics, gravity,
geochemistry, structure and satellite spectral band ratios) into a
TerraShed/KoBold-style mineral-systems engine that hunts **blind** deposits
under cover.

## Features

- **18+ commodity models** across precious & base metals, gemstones, critical
  minerals/REE, energy (oil & gas, geothermal) and groundwater — each with its
  own deposit model, pathfinder geochemistry and tailored spectral recipe.
- **Dual-AI fusion pipeline**: Claude analyses → GPT analyses → combine →
  both re-analyse → final fused, decision-ready brief. Degrades gracefully to a
  deterministic "demo AI" mode when no API keys are present.
- **HD satellite color maps**: smooth probability heatmaps + procedural
  false-colour spectral previews (ASTER sulphide RGB 12-5-3, argillic/iron
  RGB 4-2-1, Sentinel-2 iron-oxide B4/B2, ferrous B11/B8A, NDVI stress, NDWI,
  thermal and more) rendered over Esri satellite imagery.
- **Ranked circled targets** with tier (A/B/C), confidence, per-layer evidence
  readout, recommended next action, popups and click-to-fly.
- **Export** targets + AOI to GeoJSON, or a text exploration report.
- **Polished landing page, pricing for mines, and a contact / pilot-scan form.**

## Architecture

```
server/
  index.js              Express app + API routes + static hosting
  lib/
    commodities.js      Commodity knowledge base + spectral recipes
    engine.js           Deterministic prospectivity engine (grid + targets)
    ai.js               Anthropic + OpenAI callers with heuristic fallback
    pipeline.js         Dual-AI analyse/combine/re-analyse/fuse orchestration
public/
  index.html            Landing page
  explorer.html         Interactive map application
  pricing.html          Plans for mines
  contact.html          Contact / pilot-scan form
  assets/               CSS + client JS
```

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Status + which AI providers are live |
| GET | `/api/commodities` | Categories + commodity models |
| POST | `/api/scan` | Deterministic prospectivity grid + targets (fast) |
| POST | `/api/analyze` | Engine + full dual-AI pipeline |
| POST | `/api/contact` | Lead capture |

`scan` / `analyze` body:

```json
{ "commodityId": "gold-orogenic", "aoi": { "lat": -13.15, "lng": 28.6, "radiusKm": 40 }, "gridSize": 36, "maxTargets": 6 }
```

## Run locally

```bash
npm install
cp .env.example .env   # optional: add ANTHROPIC_API_KEY / OPENAI_API_KEY for live AI
npm start
```

Open http://localhost:8080

Without API keys the platform runs in **demo AI** mode: the full 6-stage
pipeline still executes and returns substantive, data-grounded narratives from
the deterministic engine.

## Disclaimer

Prospectivity output is model-derived for exploration **planning** only. It is
not verified mineral-resource evidence. Validate every target with ground
geophysics, soil geochemistry and drilling before any economic decision.
