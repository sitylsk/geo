// Analysis pipeline.
//
// Always builds a complete knowledge-synthesis brief from every wired data
// stream (engine targets + regional intelligence + geological knowledge base +
// remote-method stack + operator documents).
//
// If external model keys are configured, the synthesis is used as grounding and
// the dual-model fusion (analyse -> combine -> re-analyse -> finalise) runs on
// top. If no keys are configured, the synthesis itself is the complete result,
// surfaced through every stage so nothing is a placeholder demo.

import { analyzeAnthropic, analyzeOpenAI, providerStatus } from "./ai.js";
import { buildSynthesis } from "./synthesis.js";

const SYSTEM_ANALYST = `You are a senior exploration geologist preparing a client-facing intelligence brief.
You are given a grounded synthesis built from satellite geophysics, regional databases and geological domain knowledge.
Improve and tighten it: rank targets, sharpen confidence, integrate the indicator and regional evidence, and recommend field verification steps.
Be concise with short headers and bullet points. Include a planning-only disclaimer.`;

const SYSTEM_COMBINER = `You are the lead arbiter producing one client-facing exploration brief.
Reconcile the two assessments into a single ranked target list with confidence, supporting evidence, and recommended field actions.
Be concise and structured.`;

export async function runPipeline(engineResult, { aoiLabel, intel, documents } = {}) {
  const { brief, sections } = buildSynthesis({ engineResult, intel, aoiLabel, documents });
  const providers = providerStatus();
  const hasKeys = providers.anthropic || providers.openai;

  // No external models: the grounded synthesis is the complete result.
  if (!hasKeys) {
    const stage = (text, role) => ({ provider: role, simulated: true, text });
    return {
      providers,
      simulated: true,
      grounded: true,
      sections,
      stages: {
        analysisA: stage(sections.depositModel + "\n\n" + sections.classicIndicators, "knowledge"),
        analysisB: stage(sections.regionalIntelligence + "\n\n" + sections.sensingPlan, "regional-data"),
        synthesis1: stage(sections.executiveSummary + "\n\n" + sections.rankedTargets, "synthesis"),
        reAnalysisA: stage(sections.fieldProgram, "field-program"),
        reAnalysisB: stage(sections.sensingPlan, "sensing-plan"),
        finalAssessment: stage(brief, "final"),
      },
      final: brief,
    };
  }

  // With keys: ground the models on the synthesis brief.
  const grounding = "Grounded synthesis (from satellite + regional + geological knowledge):\n\n" + brief;

  const [a1, b1] = await Promise.all([
    analyzeAnthropic(SYSTEM_ANALYST, grounding),
    analyzeOpenAI(SYSTEM_ANALYST, grounding),
  ]);

  const combinePrompt = `Two independent assessments of the same grounded synthesis are below.\n\n=== ASSESSMENT A ===\n${a1.text}\n\n=== ASSESSMENT B ===\n${b1.text}\n\nFuse into one ranked synthesis.\n\n${grounding}`;
  const synthesis1 = await analyzeAnthropic(SYSTEM_COMBINER, combinePrompt);

  const rePrompt = `Critically re-analyse this fused synthesis: stress-test the top targets, adjust confidence, surface any missed target.\n\n${synthesis1.text}\n\n${grounding}`;
  const [a2, b2] = await Promise.all([
    analyzeAnthropic(SYSTEM_ANALYST, rePrompt),
    analyzeOpenAI(SYSTEM_ANALYST, rePrompt),
  ]);

  const finalPrompt = `Two re-analyses are below. Produce the FINAL decision-ready exploration brief with: 1) executive summary, 2) ranked target table, 3) indicator and regional evidence, 4) field program, 5) risk caveat.\n\n=== A' ===\n${a2.text}\n\n=== B' ===\n${b2.text}\n\n${grounding}`;
  const finalAssessment = await analyzeOpenAI(SYSTEM_COMBINER, finalPrompt, { maxTokens: 1800 });

  return {
    providers,
    simulated: false,
    grounded: true,
    sections,
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
