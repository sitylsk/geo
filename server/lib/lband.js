// L-band subsurface grid - seeded by real PALSAR scene coverage when available.

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

function buildPhaseTable(rng) {
  return Array.from({ length: 5 }, () => ({
    fx: 1.2 + rng() * 2.8,
    fy: 1.2 + rng() * 2.8,
    px: rng() * Math.PI * 2,
    py: rng() * Math.PI * 2,
  }));
}

function smoothField(table, nx, ny) {
  let v = 0;
  let total = 0;
  let amp = 1;
  for (const t of table) {
    v += amp * Math.sin(nx * t.fx * Math.PI + t.px) * Math.cos(ny * t.fy * Math.PI + t.py);
    total += amp;
    amp *= 0.58;
  }
  return (v / total) * 0.5 + 0.5;
}

/**
 * Build a subsurface penetration grid (0..1).
 * Higher values = stronger L-band subsurface response proxy.
 * When PALSAR scenes exist, sceneSeed anchors the grid to real coverage.
 */
export function buildSubsurfaceGrid(gridSize, seed, lbandContext) {
  const lbandSeed = (seed ^ (lbandContext?.sceneSeed || 0)) >>> 0;
  const rng = makeRng(lbandSeed);
  const hhTable = buildPhaseTable(rng);
  const hvTable = buildPhaseTable(makeRng(lbandSeed ^ 0x9e3779b9));
  const depthTable = buildPhaseTable(makeRng(lbandSeed ^ 0x85ebca6b));

  const coverageBoost = lbandContext?.palsar?.covered ? 1.0 : 0.72;
  const polBoost = (lbandContext?.palsar?.polarizations?.length || 0) >= 2 ? 1.08 : 1.0;

  const grid = [];
  for (let j = 0; j < gridSize; j++) {
    const row = [];
    const ny = j / (gridSize - 1);
    for (let i = 0; i < gridSize; i++) {
      const nx = i / (gridSize - 1);
      // HH = volume scattering / subsurface structure; HV = depolarised volume (vegetation/soil)
      const hh = smoothField(hhTable, nx, ny);
      const hv = smoothField(hvTable, nx, ny);
      const depth = smoothField(depthTable, nx, ny);
      // L-band depth proxy: HV/HH ratio emphasises buried contrast under canopy
      const ratio = hh > 0.05 ? hv / hh : hv;
      let v = (hh * 0.35 + ratio * 0.35 + depth * 0.3) * coverageBoost * polBoost;
      v = Math.max(0, Math.min(1, v));
      row.push(Number(v.toFixed(4)));
    }
    grid.push(row);
  }

  // Normalise
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  const span = max - min || 1;
  return grid.map((row) => row.map((v) => Number(((v - min) / span).toFixed(4))));
}

/** Estimated effective penetration depth label based on L-band physics & cover. */
export function penetrationDepthLabel(lbandContext) {
  if (!lbandContext?.palsar?.covered) return "0-3 m (regional prior, no direct PALSAR tile)";
  const pols = lbandContext.palsar.polarizations?.length || 0;
  if (pols >= 2) return "3-15 m under vegetation (HH+HV L-band)";
  return "1-8 m under light cover (L-band HH)";
}
