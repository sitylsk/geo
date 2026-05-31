// Client for the Anthill raster microservice (Python/rasterio).
// Provides real multispectral alteration band ratios that fold into the
// prospectivity model. Degrades gracefully (returns null) when the service is
// not running, so the main app keeps working.

const RASTER_URL = process.env.RASTER_SERVICE_URL || "http://127.0.0.1:5005";

export function rasterServiceUrl() {
  return RASTER_URL;
}

export async function rasterHealth() {
  try {
    const res = await fetch(`${RASTER_URL}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function normaliseGrid(grid) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) for (const v of row) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;
  return grid.map((row) => row.map((v) => (v - min) / span));
}

// Combine the alteration ratios into one favorability grid (real Sentinel-2).
// Iron-oxide (gossan), clay (argillic/phyllic) and vegetation stress all flag
// mineralised / altered ground.
function alterationFromLayers(layers) {
  const io = layers.iron_oxide?.grid;
  const clay = layers.clay_alteration?.grid;
  const veg = layers.vegetation_stress?.grid;
  if (!io || !clay || !veg) return null;
  const n = io.length;
  const out = [];
  for (let j = 0; j < n; j++) {
    const row = [];
    for (let i = 0; i < n; i++) {
      row.push(0.4 * (io[j][i] ?? 0) + 0.3 * (clay[j][i] ?? 0) + 0.3 * (veg[j][i] ?? 0));
    }
    out.push(row);
  }
  return normaliseGrid(out);
}

/** Fetch real alteration band ratios for an AOI at a given grid size. */
export async function fetchAlteration(bounds, size = 16) {
  try {
    const body = {
      bbox: [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat],
      size: Math.max(16, Math.min(48, size)),
    };
    const res = await fetch(`${RASTER_URL}/band-ratios`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.available) return { available: false, reason: data.reason };
    return {
      available: true,
      scene: data.scene,
      cloud: data.cloud_cover,
      source: data.source,
      layers: data.layers,
      alterationGrid: alterationFromLayers(data.layers),
    };
  } catch {
    return null;
  }
}
