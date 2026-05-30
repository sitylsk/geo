// Deterministic prospectivity engine.
// Given an Area Of Interest (AOI) and a commodity, it synthesises the same
// multi-layer evidence stack a TerraShed-style system reasons over (magnetics,
// gravity, radiometrics, geochemistry, structure, spectral indices), then
// produces a probability grid (the color map) and a ranked list of circled
// targets. Fully deterministic from the AOI hash so results are reproducible
// and the app works end-to-end with no external data dependency.

import { getCommodity } from "./commodities.js";

// Small seeded PRNG (mulberry32) so a given AOI+commodity always yields the
// same prospectivity map.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Build the AOI bounds. Accepts either a center+radius or explicit bbox.
export function normaliseAoi(aoi = {}) {
  if (
    typeof aoi.minLat === "number" &&
    typeof aoi.maxLat === "number" &&
    typeof aoi.minLng === "number" &&
    typeof aoi.maxLng === "number"
  ) {
    return {
      minLat: Math.min(aoi.minLat, aoi.maxLat),
      maxLat: Math.max(aoi.minLat, aoi.maxLat),
      minLng: Math.min(aoi.minLng, aoi.maxLng),
      maxLng: Math.max(aoi.minLng, aoi.maxLng),
    };
  }
  const lat = typeof aoi.lat === "number" ? aoi.lat : -13.1;
  const lng = typeof aoi.lng === "number" ? aoi.lng : 28.6;
  const r = clamp(aoi.radiusKm || 30, 2, 400);
  const dLat = r / 111;
  const dLng = r / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

// Simulated geophysical field value at a normalised coordinate (0..1).
function fieldValue(rng, nx, ny, octaves = 3) {
  // Sum of a few sinusoids with random phase = smooth pseudo-random field.
  let v = 0;
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const fx = (o + 1) * (1.5 + rng() * 2.5);
    const fy = (o + 1) * (1.5 + rng() * 2.5);
    const px = rng() * Math.PI * 2;
    const py = rng() * Math.PI * 2;
    v += amp * Math.sin(nx * fx * Math.PI + px) * Math.cos(ny * fy * Math.PI + py);
    total += amp;
    amp *= 0.55;
  }
  return (v / total) * 0.5 + 0.5; // 0..1
}

export function runEngine({ commodityId, aoi, gridSize = 36, maxTargets = 6 }) {
  const commodity = getCommodity(commodityId);
  if (!commodity) throw new Error(`Unknown commodity: ${commodityId}`);
  const bounds = normaliseAoi(aoi);
  const seed = hashString(
    `${commodityId}|${bounds.minLat.toFixed(3)}|${bounds.minLng.toFixed(3)}|${bounds.maxLat.toFixed(3)}|${bounds.maxLng.toFixed(3)}`,
  );
  const rng = makeRng(seed);

  // Independent random fields representing each evidence layer.
  const layers = {
    magnetic: { rng: makeRng(seed ^ 0x9e3779b1), weight: 0.22 },
    gravity: { rng: makeRng(seed ^ 0x85ebca6b), weight: 0.18 },
    radiometric: { rng: makeRng(seed ^ 0xc2b2ae35), weight: 0.14 },
    geochem: { rng: makeRng(seed ^ 0x27d4eb2f), weight: 0.24 },
    structure: { rng: makeRng(seed ^ 0x165667b1), weight: 0.12 },
    spectral: { rng: makeRng(seed ^ 0xd3a2646c), weight: 0.10 },
  };

  // Precompute phase tables per layer so fieldValue is smooth across the grid.
  const phaseTables = {};
  for (const key of Object.keys(layers)) {
    const r = layers[key].rng;
    phaseTables[key] = Array.from({ length: 4 }, () => ({
      fx: 1.5 + r() * 3,
      fy: 1.5 + r() * 3,
      px: r() * Math.PI * 2,
      py: r() * Math.PI * 2,
      amp: 1,
    }));
  }
  function smoothField(table, nx, ny) {
    let v = 0;
    let total = 0;
    let amp = 1;
    for (const t of table) {
      v += amp * Math.sin(nx * t.fx * Math.PI + t.px) * Math.cos(ny * t.fy * Math.PI + t.py);
      total += amp;
      amp *= 0.6;
    }
    return (v / total) * 0.5 + 0.5;
  }

  const grid = [];
  let pMin = Infinity;
  let pMax = -Infinity;
  for (let j = 0; j < gridSize; j++) {
    const row = [];
    const ny = j / (gridSize - 1);
    for (let i = 0; i < gridSize; i++) {
      const nx = i / (gridSize - 1);
      const contributions = {};
      let p = 0;
      for (const key of Object.keys(layers)) {
        const val = smoothField(phaseTables[key], nx, ny);
        contributions[key] = val;
        p += val * layers[key].weight;
      }
      // Reward coincident anomalies (multi-layer agreement = KoBold idea).
      const vals = Object.values(contributions);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      const coincidence = clamp(1 - variance * 3, 0, 1);
      p = clamp(p * (0.65 + 0.35 * coincidence), 0, 1);
      row.push(Number(p.toFixed(4)));
      pMin = Math.min(pMin, p);
      pMax = Math.max(pMax, p);
    }
    grid.push(row);
  }

  // Normalise the grid 0..1 for crisp color mapping.
  const span = pMax - pMin || 1;
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      grid[j][i] = Number(((grid[j][i] - pMin) / span).toFixed(4));
    }
  }

  // Find local maxima as targets.
  const candidates = [];
  for (let j = 1; j < gridSize - 1; j++) {
    for (let i = 1; i < gridSize - 1; i++) {
      const v = grid[j][i];
      if (v < 0.6) continue;
      let isPeak = true;
      for (let dj = -1; dj <= 1 && isPeak; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue;
          if (grid[j + dj][i + di] > v) {
            isPeak = false;
            break;
          }
        }
      }
      if (isPeak) candidates.push({ i, j, v });
    }
  }
  candidates.sort((a, b) => b.v - a.v);

  const latPerCell = (bounds.maxLat - bounds.minLat) / (gridSize - 1);
  const lngPerCell = (bounds.maxLng - bounds.minLng) / (gridSize - 1);
  const aoiKm = (bounds.maxLat - bounds.minLat) * 111;

  const targets = candidates.slice(0, maxTargets).map((c, idx) => {
    const lat = bounds.minLat + c.j * latPerCell;
    const lng = bounds.minLng + c.i * lngPerCell;
    const tr = makeRng(seed ^ ((idx + 1) * 0x45d9f3b));
    const confidence = clamp(c.v * (0.8 + tr() * 0.2), 0, 0.99);
    const radiusKm = clamp(aoiKm * (0.05 + tr() * 0.08), 1.2, 18);

    // Per-target evidence readout.
    const evidence = {
      magnetic: scoreLabel(smoothField(phaseTables.magnetic, c.i / (gridSize - 1), c.j / (gridSize - 1))),
      gravity: scoreLabel(smoothField(phaseTables.gravity, c.i / (gridSize - 1), c.j / (gridSize - 1))),
      radiometric: scoreLabel(smoothField(phaseTables.radiometric, c.i / (gridSize - 1), c.j / (gridSize - 1))),
      geochem: scoreLabel(smoothField(phaseTables.geochem, c.i / (gridSize - 1), c.j / (gridSize - 1))),
      structure: scoreLabel(smoothField(phaseTables.structure, c.i / (gridSize - 1), c.j / (gridSize - 1))),
      spectral: scoreLabel(smoothField(phaseTables.spectral, c.i / (gridSize - 1), c.j / (gridSize - 1))),
    };

    const pathfinders = commodity.geochemistry.pathfinders;
    const pf = pathfinders[Math.floor(tr() * pathfinders.length)];

    return {
      id: `T-${idx + 1}`,
      rank: idx + 1,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      confidence: Number(confidence.toFixed(3)),
      radiusKm: Number(radiusKm.toFixed(2)),
      tier: confidence > 0.8 ? "A" : confidence > 0.65 ? "B" : "C",
      evidence,
      anomaly: `Coincident ${evidence.geochem.toLowerCase()} ${pf} geochem + ${evidence.magnetic.toLowerCase()} magnetic + ${evidence.spectral.toLowerCase()} spectral response`,
      recommendedAction:
        confidence > 0.8
          ? "Priority: ground geophysics + soil grid then RC/diamond drilling."
          : confidence > 0.65
            ? "Infill soil geochem + detailed magnetics to refine drill collar."
            : "Reconnaissance mapping + portable XRF traverse.",
    };
  });

  return {
    commodity: {
      id: commodity.id,
      name: commodity.name,
      category: commodity.category,
      color: commodity.color,
      depositModel: commodity.depositModel,
      pathfinders: commodity.geochemistry.pathfinders,
      spectral: commodity.spectral.map((s) => ({
        id: s.id,
        label: s.label,
        sensor: s.sensor,
        rgb: s.rgb || null,
        expr: s.expr || null,
        detects: s.detects,
        palette: s.palette,
      })),
      satelliteCues: commodity.satelliteCues,
    },
    bounds,
    gridSize,
    grid,
    targets,
    layerWeights: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.weight])),
    generatedAt: new Date().toISOString(),
  };
}

function scoreLabel(v) {
  if (v > 0.78) return "Strong";
  if (v > 0.6) return "Elevated";
  if (v > 0.42) return "Moderate";
  if (v > 0.25) return "Subtle";
  return "Background";
}
