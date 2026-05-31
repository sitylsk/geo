// Real, explainable prospectivity scorer (weights-of-evidence / fuzzy hybrid).
//
// Unlike a synthetic field, this scores each grid cell from REAL signals where
// they are available:
//   - Terrain ruggedness from a real DEM (Open-Meteo elevation) as a structure
//     / lineament proxy (deposits favour structural complexity).
//   - Proximity to known mineral occurrences (USGS MRDS) - "nearology", a
//     standard and powerful prospectivity input (deposits cluster).
//   - Proximity to tectonic plate boundaries / rift influence (Bird 2002).
//   - Seismicity density (active crustal plumbing).
//   - Thermal/moisture gradient (NASA POWER) for hydrothermal/energy/water.
// Each cell carries the contribution of every component, so a target can be
// explained the way a geologist would justify it.

import { fetchGeologyGrid, geologyFavorability } from "./integrations/geology.js";
import { drillFeedbackForBounds } from "./drill.js";
import { fetchAlteration, fetchPotentialField } from "./raster.js";

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchElevationGrid(bounds, n) {
  const lats = [];
  const lngs = [];
  for (let j = 0; j < n; j++) {
    const lat = bounds.minLat + (j / (n - 1)) * (bounds.maxLat - bounds.minLat);
    for (let i = 0; i < n; i++) {
      const lng = bounds.minLng + (i / (n - 1)) * (bounds.maxLng - bounds.minLng);
      lats.push(Number(lat.toFixed(4)));
      lngs.push(Number(lng.toFixed(4)));
    }
  }
  const elevations = new Array(lats.length).fill(null);
  const CHUNK = 100;
  for (let start = 0; start < lats.length; start += CHUNK) {
    const la = lats.slice(start, start + CHUNK).join(",");
    const lo = lngs.slice(start, start + CHUNK).join(",");
    try {
      const res = await fetch(`${ELEVATION_URL}?latitude=${la}&longitude=${lo}`, {
        signal: AbortSignal.timeout(9000),
      });
      if (res.ok) {
        const data = await res.json();
        (data.elevation || []).forEach((e, k) => (elevations[start + k] = e));
      }
    } catch {
      /* leave nulls */
    }
  }
  const grid = [];
  for (let j = 0; j < n; j++) {
    grid.push(elevations.slice(j * n, j * n + n));
  }
  return grid;
}

// Terrain ruggedness = local elevation gradient magnitude (structure proxy).
function ruggednessGrid(elev, n) {
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  let hasData = false;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c = elev[j][i];
      if (c == null) continue;
      const neigh = [];
      for (const [dj, di] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nj = j + dj;
        const ni = i + di;
        if (nj >= 0 && nj < n && ni >= 0 && ni < n && elev[nj][ni] != null) {
          neigh.push(Math.abs(elev[nj][ni] - c));
        }
      }
      if (neigh.length) {
        out[j][i] = neigh.reduce((a, b) => a + b, 0) / neigh.length;
        hasData = true;
      }
    }
  }
  return { grid: normalise(out), hasData };
}

function normalise(grid) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) for (const v of row) { if (v < min) min = v; if (v > max) max = v; }
  const span = max - min || 1;
  return grid.map((row) => row.map((v) => (v - min) / span));
}

// Gaussian proximity kernel to a set of points (lat/lng), 0..1.
function proximityGrid(bounds, n, points, decayKm) {
  const grid = Array.from({ length: n }, () => new Array(n).fill(0));
  if (!points || !points.length) return { grid, hasData: false };
  for (let j = 0; j < n; j++) {
    const lat = bounds.minLat + (j / (n - 1)) * (bounds.maxLat - bounds.minLat);
    for (let i = 0; i < n; i++) {
      const lng = bounds.minLng + (i / (n - 1)) * (bounds.maxLng - bounds.minLng);
      let best = 0;
      for (const p of points) {
        if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
        const d = haversineKm(lat, lng, p.lat, p.lng);
        const w = Math.exp(-(d * d) / (2 * decayKm * decayKm));
        if (w > best) best = w;
      }
      grid[j][i] = best;
    }
  }
  return { grid, hasData: true };
}

/**
 * Build the commodity-independent shared context once (real DEM ruggedness,
 * known-deposit proximity, seismicity, tectonic setting). Reused across many
 * commodities for fast discovery without repeated network calls.
 */
export async function buildSharedContext({ bounds, gridSize, intel }) {
  const coarse = Math.min(gridSize, 16);
  const [elev, geology, alteration, magnetics] = await Promise.all([
    fetchElevationGrid(bounds, coarse),
    fetchGeologyGrid(bounds, 3).catch(() => null),
    fetchAlteration(bounds, coarse).catch(() => null),
    fetchPotentialField(bounds, coarse).catch(() => null),
  ]);
  const rug = ruggednessGrid(elev, coarse);

  const baseDeposits = (intel?.deposits?.mrdsNearby || []).concat(intel?.deposits?.globalSurvey?.nearby || []);
  const drill = drillFeedbackForBounds(bounds);
  // Confirmed drill hits act as strong extra positives.
  const deposits = baseDeposits.concat(drill.hits.map((h) => ({ name: "Confirmed drill hit", commodity: "drill", lat: h.lat, lng: h.lng })));
  const eqEvents = (intel?.seismic?.iris?.events || []).concat(intel?.usgs?.earthquakes?.events || []);
  const aoiKm = Math.max((bounds.maxLat - bounds.minLat) * 111, 20);

  const depositProx = proximityGrid(bounds, coarse, deposits, Math.max(aoiKm * 0.15, 8));
  const missProx = proximityGrid(bounds, coarse, drill.misses, Math.max(aoiKm * 0.08, 4));
  const seismicProx = proximityGrid(bounds, coarse, eqEvents, Math.max(aoiKm * 0.25, 25));

  const tb = intel?.tectonics?.nearestBoundary;
  const tectonicScore = tb ? clamp(1 - tb.distanceKm / 600, 0, 1) : 0.3;

  return {
    coarse,
    bounds,
    gridSize,
    rug,
    depositProx,
    seismicProx,
    tectonicScore,
    deposits,
    missProx,
    drill,
    geology,
    alteration: alteration && alteration.available ? alteration : null,
    magnetics: magnetics && magnetics.available ? magnetics : null,
    dataConfidence: {
      dem: rug.hasData,
      knownDeposits: depositProx.hasData ? deposits.length : 0,
      seismic: eqEvents.length,
      tectonic: Boolean(tb),
      geology: geology?.coverage || 0,
      drillHits: drill.hits.length,
      drillMisses: drill.misses.length,
      alteration: alteration && alteration.available ? (alteration.scene || true) : 0,
      magnetics: magnetics && magnetics.available ? (magnetics.source || true) : 0,
    },
  };
}

/** Apply commodity-specific weights to a shared context to get a score grid. */
export function scoreFromContext(ctx, commodityId, weights) {
  const { coarse, rug, depositProx, seismicProx, tectonicScore } = ctx;
  const altGrid = ctx.alteration?.alterationGrid || null;
  const magGrid = ctx.magnetics?.magneticsGrid || null;
  const w = weights || defaultWeights(commodityId);
  const geoFav = geologyFavorability(commodityId, ctx.geology);
  const score = Array.from({ length: coarse }, () => new Array(coarse).fill(0));
  const components = { ruggedness: rug.grid, depositProximity: depositProx.grid, seismic: seismicProx.grid };
  for (let j = 0; j < coarse; j++) {
    for (let i = 0; i < coarse; i++) {
      const rugV = rug.hasData ? rug.grid[j][i] : 0.5;
      const depV = depositProx.hasData ? depositProx.grid[j][i] : 0;
      const seisV = seismicProx.hasData ? seismicProx.grid[j][i] : 0.3;
      const altV = altGrid && altGrid[j] && typeof altGrid[j][i] === "number" ? altGrid[j][i] : null;
      const magV = magGrid && magGrid[j] && typeof magGrid[j][i] === "number" ? magGrid[j][i] : null;
      let cell =
        rugV * w.structure +
        depV * w.deposits +
        seisV * w.seismic +
        tectonicScore * w.tectonic +
        geoFav.score * w.geology +
        (altV != null ? altV * w.alteration : 0) +
        (magV != null ? magV * w.magnetics : 0);
      // Drill misses damp their immediate surroundings (informative negatives).
      const miss = ctx.missProx?.hasData ? ctx.missProx.grid[j][i] : 0;
      cell *= 1 - 0.5 * miss;
      score[j][i] = cell;
    }
  }
  return {
    coarse,
    scoreGrid: upsample(normalise(score), ctx.gridSize),
    componentsCoarse: components,
    tectonicScore,
    geologyFavorability: geoFav,
    alteration: ctx.alteration ? { scene: ctx.alteration.scene, cloud: ctx.alteration.cloud, source: ctx.alteration.source } : null,
    magnetics: ctx.magnetics ? { source: ctx.magnetics.source, stats: ctx.magnetics.stats, depthToSource: ctx.magnetics.depthToSource } : null,
    dataConfidence: ctx.dataConfidence,
    weights: w,
  };
}

/**
 * Build the real prospectivity score grid for a single commodity.
 */
export async function buildRealProspectivity({ bounds, gridSize, commodityId, intel, weights }) {
  const ctx = await buildSharedContext({ bounds, gridSize, intel });
  return scoreFromContext(ctx, commodityId, weights);
}

function defaultWeights(commodityId) {
  // Structure + real host-rock geology + deposit nearology + alteration drive the score.
  const base = { structure: 0.18, deposits: 0.24, seismic: 0.08, tectonic: 0.1, geology: 0.18, alteration: 0.1, magnetics: 0.12 };
  if (commodityId === "diamond") return { structure: 0.16, deposits: 0.22, seismic: 0.05, tectonic: 0.2, geology: 0.16, alteration: 0.08, magnetics: 0.13 };
  if (commodityId === "geothermal") return { structure: 0.16, deposits: 0.12, seismic: 0.22, tectonic: 0.12, geology: 0.16, alteration: 0.12, magnetics: 0.1 };
  if (commodityId === "ree") return { structure: 0.12, deposits: 0.22, seismic: 0.08, tectonic: 0.2, geology: 0.16, alteration: 0.08, magnetics: 0.14 };
  if (commodityId === "groundwater") return { structure: 0.32, deposits: 0.08, seismic: 0.12, tectonic: 0.16, geology: 0.16, alteration: 0.08, magnetics: 0.08 };
  return base;
}

// Bilinear upsample a coarse grid to target size.
function upsample(grid, target) {
  const n = grid.length;
  if (n === target) return grid.map((r) => r.map((v) => Number(v.toFixed(4))));
  const out = [];
  for (let j = 0; j < target; j++) {
    const row = [];
    const gy = (j / (target - 1)) * (n - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(y0 + 1, n - 1);
    const fy = gy - y0;
    for (let i = 0; i < target; i++) {
      const gx = (i / (target - 1)) * (n - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, n - 1);
      const fx = gx - x0;
      const top = grid[y0][x0] * (1 - fx) + grid[y0][x1] * fx;
      const bot = grid[y1][x0] * (1 - fx) + grid[y1][x1] * fx;
      row.push(Number((top * (1 - fy) + bot * fy).toFixed(4)));
    }
    out.push(row);
  }
  return out;
}

export { haversineKm };
