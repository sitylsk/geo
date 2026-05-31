import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import compression from "compression";

import { listCommodities, CATEGORIES, getCommodity } from "./lib/commodities.js";
import { runEngine, normaliseAoi } from "./lib/engine.js";
import { runPipeline } from "./lib/pipeline.js";
import { providerStatus } from "./lib/ai.js";
import {
  publicCommodityList,
  publicEngineResult,
  publicAiResult,
  publicCoverage,
} from "./lib/public.js";
import { queryDeepScanCoverage, queryFullGeophysicalStack, listSources } from "./lib/satellite.js";
import { gatherRegionalIntelligence, listIntegrations } from "./lib/integrations/index.js";
import {
  fetchThermalContext,
  fetchMagneticContext,
  buildGravityGrid,
  GEOPHYSICAL_SOURCES,
} from "./lib/geophysical.js";
import { listRemoteMethods, activeMethods, availableToAdd } from "./lib/remote-methods.js";
import { buildRealProspectivity } from "./lib/prospectivity.js";
import { discoverAtLocation } from "./lib/discover.js";
import { geocodePlace } from "./lib/geocode.js";
import { analyzeOpenAI } from "./lib/ai.js";
import { validateAgainstDeposits, spatialCrossValidate } from "./lib/validation.js";
import { logDrillResult, loadDrillResults } from "./lib/drill.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "8mb" }));

const api = express.Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true, providers: providerStatus(), time: new Date().toISOString() });
});

api.get("/sources", (_req, res) => {
  res.json({
    ...listSources(),
    geophysical: GEOPHYSICAL_SOURCES,
    integrations: listIntegrations(),
    remoteMethods: listRemoteMethods(),
    geology: [
      { id: "macrostrat", name: "Macrostrat bedrock geology", type: "Lithology + age map units", agency: "Macrostrat (CC-BY)", use: "Real host-rock favorability per commodity" },
    ],
    roadmap: [
      { id: "emag2", name: "EMAG2 magnetic anomaly grids + derivatives (RTP, tilt, worms)", status: "needs raster service" },
      { id: "gravity", name: "WGM2012 / GOCE gravity anomaly grids", status: "needs raster service" },
      { id: "radiometrics", name: "Airborne K/U/Th radiometrics", status: "needs raster service" },
      { id: "hyperspectral", name: "Sentinel-2 / ASTER / EMIT alteration pixels", status: "needs raster service" },
    ],
  });
});

api.get("/methods", (_req, res) => {
  res.json({ active: activeMethods(), available: availableToAdd(), all: listRemoteMethods() });
});

api.get("/commodities", (_req, res) => {
  res.json(publicCommodityList(CATEGORIES, listCommodities()));
});

api.post("/coverage", async (req, res) => {
  try {
    const { aoi, xray } = req.body || {};
    const bounds = normaliseAoi(aoi);
    const coverage = xray ? await queryFullGeophysicalStack(bounds) : await queryDeepScanCoverage(bounds);
    res.json(publicCoverage(coverage));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/intelligence", async (req, res) => {
  try {
    const { aoi, commodityId, radiusKm } = req.body || {};
    if (!aoi || (typeof aoi.lat !== "number" && typeof aoi.minLat !== "number")) {
      return res.status(400).json({ error: "aoi with lat/lng required" });
    }
    const intel = await gatherRegionalIntelligence({ aoi, commodityId, radiusKm });
    res.json(intel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept operator documents as parsed text (free, no upload service needed).
// Frontend reads text/csv/json client-side; other types send name + note.
api.post("/documents/parse", (req, res) => {
  const { documents } = req.body || {};
  if (!Array.isArray(documents)) {
    return res.status(400).json({ error: "documents array required" });
  }
  const parsed = documents.slice(0, 12).map((d) => {
    const text = typeof d.text === "string" ? d.text : "";
    const excerpt = text.slice(0, 600);
    const wordCount = text ? text.trim().split(/\s+/).length : 0;
    return {
      name: d.name || "document",
      type: d.type || "text",
      wordCount,
      excerpt,
      summary: text ? `${wordCount} words ingested for analysis grounding.` : "Filename noted (binary types are referenced, not parsed).",
    };
  });
  res.json({ accepted: parsed.length, documents: parsed });
});

async function buildGeophysicalContext(bounds, gridSize, xrayScan) {
  if (!xrayScan) return null;
  const [stac, thermal] = await Promise.all([
    queryFullGeophysicalStack(bounds),
    fetchThermalContext(bounds),
  ]);
  const seed = stac.sceneSeed || 0;
  const magnetic = fetchMagneticContext(bounds, gridSize);
  const gravity = buildGravityGrid(bounds, gridSize, seed);
  return { stac, thermal, magnetic, gravity };
}

async function runScanEngine(body, sharedIntel) {
  const { commodityId, aoi, gridSize, maxTargets, deepScan, xrayScan } = body || {};
  const bounds = normaliseAoi(aoi);
  const gs = clampInt(gridSize, 16, 64, 36);
  const useXray = Boolean(xrayScan);
  const useDeep = Boolean(deepScan) || useXray;

  let intel = sharedIntel;
  if (!intel) {
    try {
      intel = await gatherRegionalIntelligence({ aoi, commodityId, radiusKm: aoi?.radiusKm });
    } catch {
      intel = null;
    }
  }

  const [lbandContext, geophysicalContext, prospectivityContext] = await Promise.all([
    useDeep ? queryFullGeophysicalStack(bounds) : null,
    buildGeophysicalContext(bounds, gs, useXray),
    buildRealProspectivity({ bounds, gridSize: gs, commodityId, intel }).catch(() => null),
  ]);

  const result = runEngine({
    commodityId,
    aoi,
    gridSize: gs,
    maxTargets: clampInt(maxTargets, 1, 12, 6),
    deepScan: useDeep,
    xrayScan: useXray,
    lbandContext: lbandContext || null,
    geophysicalContext,
    prospectivityContext,
  });

  if (result.realScoreGrid && intel) {
    const deposits = (intel.deposits?.mrdsNearby || []).concat(intel.deposits?.globalSurvey?.nearby || []);
    result.validation = validateAgainstDeposits({ scoreGrid: result.realScoreGrid, bounds, deposits });
    result.spatialValidation = spatialCrossValidate({ scoreGrid: result.realScoreGrid, bounds, deposits });
  }
  return { result, intel };
}

api.post("/scan", async (req, res) => {
  try {
    const { commodityId } = req.body || {};
    if (!getCommodity(commodityId)) {
      return res.status(400).json({ error: `Unknown commodityId: ${commodityId}` });
    }
    const { result } = await runScanEngine(req.body);
    res.json(publicEngineResult(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/analyze", async (req, res) => {
  try {
    const { commodityId, aoi, aoiLabel, documents } = req.body || {};
    if (!getCommodity(commodityId)) {
      return res.status(400).json({ error: `Unknown commodityId: ${commodityId}` });
    }
    const { result: engineResult, intel } = await runScanEngine(req.body);
    const ai = await runPipeline(engineResult, { aoiLabel, intel, documents });
    res.json({ engine: publicEngineResult(engineResult), ai: publicAiResult(ai), intel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/discover", async (req, res) => {
  try {
    let { place, lat, lng, radiusKm, narrative } = req.body || {};
    let label = null;
    if ((typeof lat !== "number" || typeof lng !== "number") && place) {
      const geo = await geocodePlace(place);
      if (!geo) return res.status(404).json({ error: `Could not locate "${place}".` });
      lat = geo.lat;
      lng = geo.lng;
      label = geo.label;
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Provide a place name or lat/lng." });
    }
    const discovery = await discoverAtLocation({ lat, lng, radiusKm: clampInt(radiusKm, 10, 300, 80), label });

    if (narrative !== false) {
      const top = discovery.topResources.length ? discovery.topResources : discovery.ranked.slice(0, 5);
      const lines = top.map((r) => `- ${r.name}: ${(r.confidence * 100).toFixed(0)}% at ${r.point.lat}, ${r.point.lng}; ${r.rationale}`);
      const known = discovery.knownDeposits.map((d) => `${d.name} (${d.commodity || "?"})`).slice(0, 8).join("; ") || "none in public databases";
      const prompt = [
        `Location: ${discovery.location.label} (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
        `Ranked resource prospectivity (model + documented occurrences):`,
        lines.join("\n"),
        ``,
        `Documented nearby occurrences: ${known}.`,
        ``,
        `Write a concise "what is here" geological brief: which resources are most likely, where (named points), the geological reason, and what to check first. Use web_search to confirm the regional geology and known mines, and cite sources. Add a planning-only disclaimer.`,
      ].join("\n");
      const ai = await analyzeOpenAI(
        "You are an exploration geologist answering: what mineral and resource potential exists at this place? Be specific, structured and honest about uncertainty.",
        prompt,
        { effort: "low", maxTokens: 1800 },
      );
      discovery.narrative = ai.text;
      discovery.citations = ai.citations || [];
      discovery.model = ai.simulated ? null : ai.model;
    }
    res.json(discovery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/drill", (req, res) => {
  const { commodityId, lat, lng, outcome } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng required" });
  }
  const rec = logDrillResult({ commodityId, lat, lng, outcome, grade: req.body?.grade, note: req.body?.note });
  res.json({ ok: true, hole: rec, totalLogged: loadDrillResults().length });
});

api.get("/drill", (req, res) => {
  res.json({ holes: loadDrillResults(req.query.commodityId) });
});

api.post("/contact", (req, res) => {
  const { name, email, company, message, plan } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required" });
  }
  const lead = {
    id: `lead_${Date.now()}`,
    name,
    email,
    company: company || null,
    plan: plan || null,
    message,
    receivedAt: new Date().toISOString(),
  };
  try {
    fs.appendFileSync(path.join(dataDir, "leads.jsonl"), JSON.stringify(lead) + "\n");
  } catch {
    /* non-fatal */
  }
  res.json({ ok: true, id: lead.id });
});

app.use("/api", api);
app.use(express.static(publicDir, { extensions: ["html"] }));
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

function clampInt(v, lo, hi, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Anthill running on http://localhost:${PORT}`);
  console.log(`Free data stack active: L-band PALSAR, WMM magnetics, NASA POWER, USGS, NASA, NOAA, Open-Meteo, IRIS, tectonics.`);
});

export { app, normaliseAoi };
