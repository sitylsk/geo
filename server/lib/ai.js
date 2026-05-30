// Intelligence providers. Degrades gracefully when API keys are absent.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-1-20250805";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export function providerStatus() {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
  };
}

async function callAnthropic(system, user, { maxTokens = 1400 } = {}) {
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
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map((c) => c.text || "").join("\n").trim();
}

async function callOpenAI(system, user, { maxTokens = 1400 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function analyzeAnthropic(system, user, opts) {
  try {
    const out = await callAnthropic(system, user, opts);
    if (out) return { provider: "anthropic", simulated: false, text: out };
  } catch (err) {
    return { provider: "anthropic", simulated: true, error: err.message, text: heuristicNarrative(user) };
  }
  return { provider: "anthropic", simulated: true, text: heuristicNarrative(user) };
}

export async function analyzeOpenAI(system, user, opts) {
  try {
    const out = await callOpenAI(system, user, opts);
    if (out) return { provider: "openai", simulated: false, text: out };
  } catch (err) {
    return { provider: "openai", simulated: true, error: err.message, text: heuristicNarrative(user) };
  }
  return { provider: "openai", simulated: true, text: heuristicNarrative(user) };
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
