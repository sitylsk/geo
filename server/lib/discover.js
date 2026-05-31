// Discovery engine: "what is here?"
// Given a location, scores every commodity using one shared real-data context,
// ranks what is most prospective, pinpoints the strongest spot per commodity,
// and cross-checks against documented occurrences (USGS MRDS commodity tags).

import { listCommodities, getCommodity } from "./commodities.js";
import { normaliseAoi } from "./engine.js";
import { gatherRegionalIntelligence } from "./integrations/index.js";
import { buildSharedContext, scoreFromContext } from "./prospectivity.js";
import { mineralSystemFor } from "./geo-expertise.js";

// Map common MRDS / report commodity tokens to our commodity ids.
const TOKEN_MAP = [
  [/\b(au|gold)\b/i, "gold-orogenic"],
  [/\b(cu|copper)\b/i, "copper-sediment"],
  [/\b(co|cobalt)\b/i, "copper-sediment"],
  [/\b(ni|nickel)\b/i, "nickel-cobalt"],
  [/\b(li|lithium)\b/i, "lithium"],
  [/\b(ree|rare\s?earth|nd|ce|la)\b/i, "ree"],
  [/\b(u|uranium)\b/i, "uranium"],
  [/\b(mn|manganese)\b/i, "manganese"],
  [/\b(diamond)\b/i, "diamond"],
  [/\b(emerald|beryl)\b/i, "emerald"],
  [/\b(ruby|sapphire|corundum)\b/i, "ruby-sapphire"],
  [/\b(zn|pb|zinc|lead)\b/i, "copper-sediment"],
];

function documentedCommodities(deposits) {
  const counts = {};
  for (const d of deposits || []) {
    const tag = `${d.commodity || ""} ${d.name || ""}`;
    for (const [re, id] of TOKEN_MAP) {
      if (re.test(tag)) counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

function meanGrid(g) {
  if (!g || !g.length) return 0.5;
  let s = 0;
  let n = 0;
  for (const row of g) for (const v of row) { s += v; n++; }
  return n ? s / n : 0.5;
}

// Geological setting preferences per commodity (how high each environmental
// factor should be: terrain ruggedness, tectonic-boundary proximity, seismicity).
const SETTING_PREF = {
  "gold-orogenic": { rug: 0.85, tect: 0.7, seis: 0.6 },
  "copper-sediment": { rug: 0.4, tect: 0.45, seis: 0.35 },
  "copper-porphyry": { rug: 0.85, tect: 0.85, seis: 0.85 },
  "nickel-cobalt": { rug: 0.7, tect: 0.6, seis: 0.5 },
  manganese: { rug: 0.45, tect: 0.4, seis: 0.35 },
  diamond: { rug: 0.25, tect: 0.15, seis: 0.15 },
  emerald: { rug: 0.7, tect: 0.6, seis: 0.5 },
  "ruby-sapphire": { rug: 0.65, tect: 0.6, seis: 0.5 },
  "aquamarine-tourmaline": { rug: 0.7, tect: 0.55, seis: 0.45 },
  amethyst: { rug: 0.55, tect: 0.5, seis: 0.45 },
  lithium: { rug: 0.65, tect: 0.55, seis: 0.45 },
  ree: { rug: 0.55, tect: 0.8, seis: 0.5 },
  uranium: { rug: 0.3, tect: 0.4, seis: 0.3 },
  "oil-gas": { rug: 0.15, tect: 0.3, seis: 0.25 },
  geothermal: { rug: 0.6, tect: 0.9, seis: 0.9 },
  groundwater: { rug: 0.35, tect: 0.4, seis: 0.3 },
};

// Baseline prior: common/widespread resources start higher; rare/exotic
// deposit types must earn their rank from documented evidence, not terrain alone.
const BASE_PRIOR = {
  groundwater: 1.0,
  "oil-gas": 0.7,
  geothermal: 0.7,
  "gold-orogenic": 0.8,
  "copper-sediment": 0.8,
  "copper-porphyry": 0.7,
  "nickel-cobalt": 0.6,
  manganese: 0.6,
  uranium: 0.6,
  amethyst: 0.55,
  lithium: 0.6,
  "aquamarine-tourmaline": 0.5,
  "ruby-sapphire": 0.45,
  emerald: 0.45,
  ree: 0.45,
  diamond: 0.35,
};

function settingSuitability(commodityId, env) {
  const p = SETTING_PREF[commodityId] || { rug: 0.5, tect: 0.5, seis: 0.5 };
  const match = (pref, val) => 1 - Math.abs(pref - val);
  const s = match(p.rug, env.rug) * 0.5 + match(p.tect, env.tect) * 0.3 + match(p.seis, env.seis) * 0.2;
  return 0.45 + 0.55 * s;
}

function topCell(scoreGrid) {
  let best = { v: -1, i: 0, j: 0 };
  for (let j = 0; j < scoreGrid.length; j++) {
    for (let i = 0; i < scoreGrid[j].length; i++) {
      if (scoreGrid[j][i] > best.v) best = { v: scoreGrid[j][i], i, j };
    }
  }
  return best;
}

export async function discoverAtLocation({ lat, lng, radiusKm = 80, label }) {
  const aoi = { lat, lng, radiusKm };
  const bounds = normaliseAoi(aoi);
  const intel = await gatherRegionalIntelligence({ aoi, radiusKm }).catch(() => null);
  const gridSize = 24;
  const ctx = await buildSharedContext({ bounds, gridSize, intel });

  const deposits = ctx.deposits || [];
  const documented = documentedCommodities(deposits);

  const latPerCell = (bounds.maxLat - bounds.minLat) / (gridSize - 1);
  const lngPerCell = (bounds.maxLng - bounds.minLng) / (gridSize - 1);

  const env = {
    rug: meanGrid(ctx.rug?.grid),
    tect: ctx.tectonicScore ?? 0.3,
    seis: meanGrid(ctx.seismicProx?.grid),
  };

  const ranked = listCommodities().map((c) => {
    const scored = scoreFromContext(ctx, c.id);
    const peak = topCell(scored.scoreGrid);
    const documentedCount = documented[c.id] || 0;
    const suit = settingSuitability(c.id, env);
    const prior = BASE_PRIOR[c.id] ?? 0.6;
    const docBoost = Math.min(0.4, documentedCount * 0.12);
    // Rare types (low prior) lean more on documented evidence than on terrain.
    const base = peak.v * 0.78 * suit * (0.55 + 0.45 * prior);
    const confidence = Math.max(0, Math.min(0.99, base + docBoost));
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      color: c.color,
      confidence: Number(confidence.toFixed(3)),
      settingSuitability: Number(suit.toFixed(2)),
      documentedOccurrences: documentedCount,
      point: {
        lat: Number((bounds.minLat + peak.j * latPerCell).toFixed(5)),
        lng: Number((bounds.minLng + peak.i * lngPerCell).toFixed(5)),
      },
      rationale: rationale(c.id, documentedCount, ctx.dataConfidence),
    };
  });

  ranked.sort((a, b) => b.confidence - a.confidence);

  return {
    location: { lat, lng, label: label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, radiusKm },
    dataConfidence: ctx.dataConfidence,
    knownDeposits: deposits.slice(0, 12),
    documentedCommodities: documented,
    ranked,
    topResources: ranked.filter((r) => r.confidence >= 0.55).slice(0, 6),
    generatedAt: new Date().toISOString(),
  };
}

function rationale(commodityId, documentedCount, dc) {
  const ms = mineralSystemFor(commodityId);
  const bits = [];
  if (documentedCount > 0) bits.push(`${documentedCount} documented occurrence(s) nearby`);
  if (dc?.dem) bits.push("structural setting from real terrain");
  if (dc?.tectonic) bits.push("tectonic context resolved");
  if (ms) bits.push(ms.detection.split(";")[0].toLowerCase());
  return bits.join("; ") || "model-derived prospectivity from regional signals";
}
