// LLM providers for the analysis brain.
//
// OpenAI GPT-5 family via the Responses API with the built-in web_search tool,
// so the model can search the internet and ground its reasoning. Anthropic is
// supported via its Messages API when a key is present. Either provider degrades
// gracefully to the deterministic knowledge synthesis when unavailable.

const OPENAI_RESPONSES = "https://api.openai.com/v1/responses";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Powerful but cheap default. Override with OPENAI_MODEL (e.g. gpt-5-nano,
// gpt-5.4-mini, gpt-5). gpt-5-mini is $0.25/$2.00 per 1M tokens.
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-1-20250805";
const WEB_SEARCH = process.env.OPENAI_DISABLE_WEB_SEARCH !== "1";

export function providerStatus() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openaiModel: OPENAI_MODEL,
    webSearch: WEB_SEARCH,
  };
}

function parseResponsesOutput(data) {
  let text = "";
  const citations = [];
  let usedWebSearch = false;
  for (const item of data.output || []) {
    if (item.type === "web_search_call" || item.type === "web_search") usedWebSearch = true;
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text") {
          text += c.text || "";
          for (const a of c.annotations || []) {
            if (a.type === "url_citation" && a.url) {
              citations.push({ title: a.title || a.url, url: a.url });
            }
          }
        }
      }
    }
  }
  return { text: text.trim(), citations, usedWebSearch };
}

async function callOpenAIResponses(system, user, { maxTokens = 2000, effort = "low", tools = true } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const body = {
    model: OPENAI_MODEL,
    instructions: system,
    input: user,
    max_output_tokens: maxTokens,
    reasoning: { effort },
  };
  if (tools && WEB_SEARCH) body.tools = [{ type: "web_search" }];
  const res = await fetch(OPENAI_RESPONSES, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return parseResponsesOutput(data);
}

async function callAnthropic(system, user, { maxTokens = 2000 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return { text: (data.content || []).map((c) => c.text || "").join("\n").trim(), citations: [], usedWebSearch: false };
}

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}
export function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function analyzeOpenAI(system, user, opts = {}) {
  try {
    const out = await callOpenAIResponses(system, user, opts);
    if (out && out.text) {
      return { provider: "openai", model: OPENAI_MODEL, simulated: false, ...out };
    }
  } catch (err) {
    return { provider: "openai", model: OPENAI_MODEL, simulated: true, error: err.message, text: heuristicNarrative(user), citations: [] };
  }
  return { provider: "openai", model: OPENAI_MODEL, simulated: true, text: heuristicNarrative(user), citations: [] };
}

export async function analyzeAnthropic(system, user, opts = {}) {
  try {
    const out = await callAnthropic(system, user, opts);
    if (out && out.text) return { provider: "anthropic", model: ANTHROPIC_MODEL, simulated: false, ...out };
  } catch (err) {
    return { provider: "anthropic", model: ANTHROPIC_MODEL, simulated: true, error: err.message, text: heuristicNarrative(user), citations: [] };
  }
  return { provider: "anthropic", model: ANTHROPIC_MODEL, simulated: true, text: heuristicNarrative(user), citations: [] };
}

function heuristicNarrative(user) {
  let evidence = {};
  const m = user.match(/```json\s*([\s\S]*?)```/);
  if (m) {
    try {
      evidence = JSON.parse(m[1]);
    } catch {
      /* ignore */
    }
  }
  const c = evidence.commodity || {};
  const targets = evidence.targets || [];
  const top = targets[0] || {};
  const lines = [];
  lines.push(`Intelligence brief for ${c.name || "the selected resource"}.`);
  lines.push("");
  lines.push("Ranked targets:");
  targets.slice(0, 5).forEach((t) => {
    lines.push(
      `- ${t.id} (Priority ${t.tier}, ${(t.confidence * 100).toFixed(0)}% confidence) at ${t.lat}, ${t.lng}. Recommended for field verification.`,
    );
  });
  lines.push("");
  if (top.id) {
    lines.push(`Highest-ranked target ${top.id} shows the strongest signal in this search area and should be investigated first.`);
  }
  lines.push("");
  lines.push("Note: outputs are for exploration planning only. All targets require field validation before economic decisions.");
  return lines.join("\n");
}
