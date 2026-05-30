// Dual-AI analysis pipeline (KoBold/TerraShed-style fusion).
//
// Flow requested by the user:
//   1. Claude analyses the evidence stack           -> Analysis A
//   2. GPT analyses the same evidence stack          -> Analysis B
//   3. The two are combined                          -> Synthesis 1
//   4. Both models re-analyse the combined synthesis -> Re-analysis A', B'
//   5. The re-analyses are combined                  -> FINAL fused assessment
//
// Each step degrades gracefully if a provider key is missing.

import { analyzeAnthropic, analyzeOpenAI, providerStatus } from "./ai.js";

const SYSTEM_ANALYST = `You are a senior exploration geoscientist on a TerraShed-style AI mineral-systems team.
You reason like KoBold Metals: fuse magnetics, gravity, radiometrics, geochemistry, structure and multispectral remote sensing into a probabilistic mineral-systems assessment.
You hunt BLIND deposits under cover. Be quantitative, cite which coincident layers drive each target, give a confidence and a concrete next step. Be concise and structured with short headers and bullet points. Always include a calibrated risk caveat.`;

const SYSTEM_COMBINER = `You are the lead arbiter fusing two independent AI geoscience assessments.
Reconcile agreements, flag disagreements, up-rank targets supported by BOTH analyses and down-rank those supported by only one. Produce one ranked, decision-ready target list with confidence, the discriminating evidence, and recommended next action. Be concise and structured.`;

function evidenceBlock(engineResult) {
  const compact = {
    commodity: engineResult.commodity,
    bounds: engineResult.bounds,
    layerWeights: engineResult.layerWeights,
    targets: engineResult.targets,
  };
  return "```json\n" + JSON.stringify(compact, null, 2) + "\n```";
}

export async function runPipeline(engineResult, { aoiLabel } = {}) {
  const ev = evidenceBlock(engineResult);
  const intro = `Area: ${aoiLabel || "selected AOI"}. Commodity: ${engineResult.commodity.name}.
Evidence stack (synthetic multi-layer prospectivity with ranked local maxima):

${ev}

Task: produce a ranked target assessment.`;

  // ---- Stage 1: independent analyses (parallel) ----
  const [a1, b1] = await Promise.all([
    analyzeAnthropic(SYSTEM_ANALYST, intro),
    analyzeOpenAI(SYSTEM_ANALYST, intro),
  ]);

  // ---- Stage 2: combine ----
  const combinePrompt = `Two independent assessments of the SAME evidence are below.

=== ASSESSMENT A (Claude) ===
${a1.text}

=== ASSESSMENT B (GPT) ===
${b1.text}

Fuse them into a single ranked synthesis. State per-target whether A, B, or BOTH support it.

Evidence for reference:
${ev}`;
  const synthesis1 = await analyzeAnthropic(SYSTEM_COMBINER, combinePrompt);

  // ---- Stage 3: both re-analyse the synthesis (parallel) ----
  const rePrompt = `Here is a fused first-pass synthesis. Critically re-analyse it: stress-test the top targets, adjust confidence, and surface any missed coincident-anomaly target. Keep it tight.

${synthesis1.text}

Original evidence for reference:
${ev}`;
  const [a2, b2] = await Promise.all([
    analyzeAnthropic(SYSTEM_ANALYST, rePrompt),
    analyzeOpenAI(SYSTEM_ANALYST, rePrompt),
  ]);

  // ---- Stage 4: final fusion ----
  const finalPrompt = `Two re-analyses of the fused synthesis are below. Produce the FINAL decision-ready exploration brief.

=== RE-ANALYSIS A' (Claude) ===
${a2.text}

=== RE-ANALYSIS B' (GPT) ===
${b2.text}

Deliver:
1. Executive summary (2-3 sentences).
2. Final ranked target table (ID, tier, confidence %, discriminating evidence, next action).
3. Spectral vectoring plan (which band ratios / RGB recipes to map).
4. Risk & confidence caveat.

Evidence for reference:
${ev}`;
  const finalAssessment = await analyzeOpenAI(SYSTEM_COMBINER, finalPrompt, { maxTokens: 1800 });

  const anySimulated = [a1, b1, synthesis1, a2, b2, finalAssessment].some((s) => s.simulated);

  return {
    providers: providerStatus(),
    simulated: anySimulated,
    stages: {
      analysisA: a1,
      analysisB: b1,
      synthesis1,
      reAnalysisA: a2,
      reAnalysisB: b2,
      finalAssessment,
    },
    final: finalAssessment.text,
  };
}
