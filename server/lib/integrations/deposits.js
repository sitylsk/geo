// Curated deposit KBs + nearby search — lithium brine, BGS UK, global occurrences.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { haversineKm } from "./usgs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../../data");

function loadJson(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
  } catch {
    return [];
  }
}

function nearby(items, lat, lng, radiusKm, mapFn = (x) => x) {
  return items
    .map((item) => {
      const m = mapFn(item);
      const d = haversineKm(lat, lng, m.lat, m.lng);
      return { ...m, distanceKm: Number(d.toFixed(1)) };
    })
    .filter((x) => x.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function fetchLithiumIntelligence(lat, lng, radiusKm = 5000) {
  const deposits = loadJson("lithium-brine-deposits.json");
  const near = nearby(deposits, lat, lng, radiusKm);
  return {
    source: "Anthill lithium brine KB (20 major global deposits)",
    totalInKb: deposits.length,
    nearby: near.slice(0, 8),
  };
}

export function fetchBgsUk(lat, lng, radiusKm = 800) {
  const deposits = loadJson("bgs-uk-deposits.json");
  const near = nearby(deposits, lat, lng, radiusKm);
  return {
    source: "BGS UK mineral occurrences (curated)",
    nearby: near,
  };
}

export function fetchGlobalDeposits(lat, lng, radiusKm = 500) {
  const lithium = loadJson("lithium-brine-deposits.json");
  const uk = loadJson("bgs-uk-deposits.json");
  const all = [...lithium.map((d) => ({ ...d, commodity: "Lithium" })), ...uk];
  const near = nearby(all, lat, lng, radiusKm);
  return {
    source: "Global geological survey deposits (aggregated KB)",
    nearby: near.slice(0, 12),
  };
}

export function fetchIeaDemand(commodityId) {
  const forecast = loadJson("iea-demand-forecast.json");
  const map = {
    "gold-orogenic": "gold",
    gold: "gold",
    "copper-sediment": "copper",
    "copper-porphyry": "copper",
    "nickel-cobalt": "nickel",
    lithium: "lithium",
    ree: "rare_earths",
  };
  const key = map[commodityId] || "copper";
  return {
    source: forecast.source,
    commodity: key,
    demandIndex: forecast.forecast[key] || forecast.forecast.copper,
    note: forecast.note,
  };
}

export function fetchSupplyChainNote(commodityId) {
  const notes = {
    copper: "IEA: copper demand doubles by 2040 under net-zero — supply gap widening.",
    lithium: "IEA: lithium demand ~3× by 2030 — brine & hard-rock both critical.",
    "gold-orogenic": "USGS: gold remains safe-haven — all-in sustaining costs rising.",
    ree: "IEA/USGS: rare earth separation capacity concentrated — diversification priority.",
  };
  return notes[commodityId] || "USGS/IEA: critical mineral supply chains under structural pressure to 2040.";
}
