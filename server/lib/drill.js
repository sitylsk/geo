// Drill-result feedback loop. Operators log hole outcomes (hit/miss + optional
// grade); positives become new training positives that boost nearby
// prospectivity on the next scan, and misses are recorded as informative
// negatives. Persisted to data/drillholes.jsonl. This is the active-learning
// loop: every hole, including a miss, sharpens the model.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "..", "data", "drillholes.jsonl");

export function logDrillResult(hole) {
  const rec = {
    id: `dh_${Date.now()}`,
    commodityId: hole.commodityId || null,
    lat: hole.lat,
    lng: hole.lng,
    outcome: hole.outcome === "hit" ? "hit" : "miss",
    grade: hole.grade ?? null,
    note: hole.note || null,
    loggedAt: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(rec) + "\n");
  } catch {
    /* non-fatal */
  }
  return rec;
}

export function loadDrillResults(commodityId) {
  try {
    const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    const all = lines.map((l) => JSON.parse(l));
    return commodityId ? all.filter((d) => !d.commodityId || d.commodityId === commodityId) : all;
  } catch {
    return [];
  }
}

// Positive holes within the AOI become extra deposit-like positives; misses are
// returned separately so the scorer can damp those cells.
export function drillFeedbackForBounds(bounds, commodityId) {
  const all = loadDrillResults(commodityId);
  const inBounds = (d) =>
    d.lat >= bounds.minLat && d.lat <= bounds.maxLat && d.lng >= bounds.minLng && d.lng <= bounds.maxLng;
  const hits = all.filter((d) => d.outcome === "hit" && inBounds(d));
  const misses = all.filter((d) => d.outcome === "miss" && inBounds(d));
  return { hits, misses, total: all.length };
}
