// Analysis pipeline.
//
// Always builds a complete knowledge-synthesis brief from every wired data
// stream. When an LLM key is present, the brief grounds a multi-pass reasoning
// flow run on the available providers; the GPT-5 brain can also search the
// internet (web_search tool). When no key is present, the grounded synthesis is
// the complete result with nothing faked.

import { analyzeAnthropic, analyzeOpenAI, providerStatus, hasOpenAI, hasAnthropic } from "./ai.js";
import { buildSynthesis } from "./synthesis.js";

const SYSTEM_PROSPECTOR = `You are a senior exploration geologist (the "prospector" voice) writing a client-facing brief.
You are given a grounded synthesis built from satellite geophysics, regional databases and geological domain knowledge.
Sharpen it: rank targets, justify each with the strongest coincident evidence (structure, geochemistry, known-deposit proximity, geophysics), and give concrete field-verification steps.
Use the web_search tool to check recent regional geology, known deposits, and any operator news that strengthens or weakens a target, and cite sources.
Be concise with short headers and bullet points. End with a planning-only disclaimer.`;

const SYSTEM_SKEPTIC = `You are a hard-nosed exploration manager (the "skeptic" voice) reviewing a brief.
Stress-test every target: where is the evidence thin, what could be a false anomaly, what data is missing, what would kill the target. Re-rank if needed.
Use the web_search tool to verify claims and surface contradicting evidence, and cite sources.
Be concise and direct.`;

const SYSTEM_COMBINER = `You are the lead arbiter producing one client-facing exploration brief.
Reconcile the prospector and skeptic into a single ranked target list with confidence, supporting evidence, recommended field actions, and a short "what would change our mind" note.
Deliver: 1) executive summary, 2) ranked target table, 3) key evidence per target, 4) field program, 5) risk caveat. Be structured and concise.`;

export async function runPipeline(engineResult, { aoiLabel, intel, documents } = {}) {
  const { brief, sections } = buildSynthesis({ engineResult, intel, aoiLabel, documents });
  const providers = providerStatus();
  const useOpenAI = hasOpenAI();
  const useAnthropic = hasAnthropic();

  if (!useOpenAI && !useAnthropic) {
    const stage = (text, role) => ({ provider: role, simulated: true, text });
    return {
      providers,
      simulated: true,
      grounded: true,
      sections,
      citations: [],
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

  const grounding = "Grounded synthesis (from satellite + regional databases + geological knowledge):\n\n" + brief;

  // Provider-aware analyst roster. With both keys, prospector=Anthropic and
  // skeptic=OpenAI. With only one, that provider plays both voices.
  const prospector = (sys, usr, opts) => (useAnthropic ? analyzeAnthropic(sys, usr, opts) : analyzeOpenAI(sys, usr, opts));
  const skeptic = (sys, usr, opts) => (useOpenAI ? analyzeOpenAI(sys, usr, opts) : analyzeAnthropic(sys, usr, opts));
  const combiner = (sys, usr, opts) => (useOpenAI ? analyzeOpenAI(sys, usr, opts) : analyzeAnthropic(sys, usr, opts));

  const [a1, b1] = await Promise.all([
    prospector(SYSTEM_PROSPECTOR, grounding, { effort: "low", maxTokens: 2200 }),
    skeptic(SYSTEM_SKEPTIC, grounding, { effort: "low", maxTokens: 2000 }),
  ]);

  const combinePrompt = `Prospector assessment:\n${a1.text}\n\nSkeptic review:\n${b1.text}\n\nReconcile into one ranked synthesis.\n\n${grounding}`;
  const synthesis1 = await combiner(SYSTEM_COMBINER, combinePrompt, { effort: "low", maxTokens: 2200, tools: false });

  const rePrompt = `Re-examine this fused synthesis. Confirm or adjust the top targets and confidence, and surface any target that was missed.\n\n${synthesis1.text}\n\n${grounding}`;
  const [a2, b2] = await Promise.all([
    prospector(SYSTEM_PROSPECTOR, rePrompt, { effort: "low", maxTokens: 1800, tools: false }),
    skeptic(SYSTEM_SKEPTIC, rePrompt, { effort: "low", maxTokens: 1600, tools: false }),
  ]);

  const finalPrompt = `Prospector re-analysis:\n${a2.text}\n\nSkeptic re-analysis:\n${b2.text}\n\nProduce the FINAL decision-ready exploration brief.\n\n${grounding}`;
  const finalAssessment = await combiner(SYSTEM_COMBINER, finalPrompt, { effort: "medium", maxTokens: 2600, tools: false });

  const stages = { analysisA: a1, analysisB: b1, synthesis1, reAnalysisA: a2, reAnalysisB: b2, finalAssessment };
  const citations = [];
  const seen = new Set();
  for (const s of Object.values(stages)) {
    for (const c of s.citations || []) {
      if (!seen.has(c.url)) {
        seen.add(c.url);
        citations.push(c);
      }
    }
  }

  return {
    providers,
    simulated: Object.values(stages).some((s) => s.simulated),
    grounded: true,
    sections,
    citations,
    stages,
    final: finalAssessment.text || brief,
  };
}
