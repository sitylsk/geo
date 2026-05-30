# Zambia Frontier Target Map

Interactive, browser-based map for visualizing the four supplied Zambia
arsenopyrite-gold frontier target coordinates.

## What it includes

- HD satellite imagery layer from Esri World Imagery
- Satellite labels, street, topographic, and dark contrast base maps
- Color-coded markers and adjustable planning circles for each target
- Popups with coordinates, province, signature, and satellite cue notes
- GeoJSON export for loading the points into GIS tools

## Run locally

This is a static site. From the repository root:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

The map requires an internet connection so Leaflet and the map tile layers can
load from their public CDNs/providers.

## Targets shown

| # | Target | Coordinates |
|---|---|---|
| 1 | Chifunabuli Structural Anomaly | 11.3500 deg S, 29.1500 deg E |
| 2 | Southern Kapiri Mposhi Kalahari Cover | 14.4500 deg S, 28.8000 deg E |
| 3 | Eastern Irumide Root Zone | 13.6500 deg S, 32.1000 deg E |
| 4 | Kabompo Dome Margin | 11.6500 deg S, 24.5000 deg E |

## Data note

The coordinates and geological interpretations are user-supplied exploration
hypotheses. This viewer is intended for visualization and planning only, not as
verified mineral-resource evidence.
