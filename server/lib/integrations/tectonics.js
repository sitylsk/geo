// Bird 2002 global tectonic plate boundaries - nearest plate context.

const PLATES_URL =
  "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";

let plateCache = null;

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-12;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  const dLat = (py - ny) * 111;
  const dLng = (px - nx) * 111 * Math.cos((py * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

async function loadPlates() {
  if (plateCache) return plateCache;
  const res = await fetch(PLATES_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Plates fetch failed");
  plateCache = await res.json();
  return plateCache;
}

export async function fetchTectonicContext(lat, lng) {
  try {
    const geo = await loadPlates();
    let nearest = null;
    let minDist = Infinity;
    for (const f of geo.features || []) {
      const coords = f.geometry?.coordinates || [];
      const lines = f.geometry?.type === "MultiLineString" ? coords : [coords];
      for (const line of lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const [x1, y1] = line[i];
          const [x2, y2] = line[i + 1];
          const d = pointToSegmentDist(lng, lat, x1, y1, x2, y2);
          if (d < minDist) {
            minDist = d;
            nearest = {
              plateBoundary: f.properties?.Name || f.properties?.name || "Unknown boundary",
              boundaryType: f.properties?.TYPE || f.properties?.type || "unknown",
              distanceKm: Number(d.toFixed(1)),
            };
          }
        }
      }
    }
    return {
      source: "Bird 2002 global tectonic model",
      nearestBoundary: nearest,
      inRiftZone: nearest && nearest.distanceKm < 50,
    };
  } catch {
    return { source: "Bird 2002", nearestBoundary: null };
  }
}
