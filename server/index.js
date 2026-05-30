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
import {
  fetchThermalContext,
  fetchMagneticContext,
  buildGravityGrid,
  GEOPHYSICAL_SOURCES,
} from "./lib/geophysical.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "1mb" }));

const api = express.Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true, providers: providerStatus(), time: new Date().toISOString() });
});

api.get("/sources", (_req, res) => {
  res.json({ ...listSources(), geophysical: GEOPHYSICAL_SOURCES });
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

async function runScanEngine(body) {
  const { commodityId, aoi, gridSize, maxTargets, deepScan, xrayScan } = body || {};
  const bounds = normaliseAoi(aoi);
  const gs = clampInt(gridSize, 16, 64, 36);
  const useXray = Boolean(xrayScan);
  const useDeep = Boolean(deepScan) || useXray;

  const [lbandContext, geophysicalContext] = await Promise.all([
    useDeep ? queryFullGeophysicalStack(bounds) : null,
    buildGeophysicalContext(bounds, gs, useXray),
  ]);

  return runEngine({
    commodityId,
    aoi,
    gridSize: gs,
    maxTargets: clampInt(maxTargets, 1, 12, 6),
    deepScan: useDeep,
    xrayScan: useXray,
    lbandContext: lbandContext || null,
    geophysicalContext,
  });
}

api.post("/scan", async (req, res) => {
  try {
    const { commodityId } = req.body || {};
    if (!getCommodity(commodityId)) {
      return res.status(400).json({ error: `Unknown commodityId: ${commodityId}` });
    }
    const result = await runScanEngine(req.body);
    res.json(publicEngineResult(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post("/analyze", async (req, res) => {
  try {
    const { commodityId, aoiLabel } = req.body || {};
    if (!getCommodity(commodityId)) {
      return res.status(400).json({ error: `Unknown commodityId: ${commodityId}` });
    }
    const engineResult = await runScanEngine(req.body);
    const ai = await runPipeline(engineResult, { aoiLabel });
    res.json({ engine: publicEngineResult(engineResult), ai: publicAiResult(ai) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  console.log(`Satellite stack: L-band PALSAR + WMM magnetics + NASA POWER thermal + X-ray fusion`);
});

export { app, normaliseAoi };
