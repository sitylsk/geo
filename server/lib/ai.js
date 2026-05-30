// Dual-AI providers: Anthropic (Claude) + OpenAI (GPT).
// Uses native fetch (Node >=18). Each provider degrades gracefully to a
// deterministic heuristic narrative when its API key is absent, so the full
// pipeline always returns a result.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-1-20250805";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export function providerStatus() {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropicModel: ANTHROPIC_MODEL,
    openaiModel: OPENAI_MODEL,
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

// Provider wrappers with fallback flag.
export async function analyzeAnthropic(system, user, opts) {
  try {
    const out = await callAnthropic(system, user, opts);
    if (out) return { provider: "anthropic", model: ANTHROPIC_MODEL, simulated: false, text: out };
  } catch (err) {
    return {
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      simulated: true,
      error: err.message,
      text: heuristicNarrative("Claude", user),
    };
  }
  return { provider: "anthropic", model: ANTHROPIC_MODEL, simulated: true, text: heuristicNarrative("Claude", user) };
}

export async function analyzeOpenAI(system, user, opts) {
  try {
    const out = await callOpenAI(system, user, opts);
    if (out) return { provider: "openai", model: OPENAI_MODEL, simulated: false, text: out };
  } catch (err) {
    return {
      provider: "openai",
      model: OPENAI_MODEL,
      simulated: true,
      error: err.message,
      text: heuristicNarrative("GPT", user),
    };
  }
  return { provider: "openai", model: OPENAI_MODEL, simulated: true, text: heuristicNarrative("GPT", user) };
}

// Deterministic narrative used when no API keys are configured. It reads the
// embedded JSON evidence block so the offline output is still substantive.
function heuristicNarrative(label, user) {
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
  lines.push(`${label} prospectivity assessment for ${c.name || "the selected commodity"}.`);
  lines.push("");
  lines.push(
    `Deposit model in play: ${c.depositModel || "structurally controlled mineralisation"}. The evidence stack was weighted across magnetics, gravity, radiometrics, geochemistry (${(c.pathfinders || []).join(", ")}), structure and spectral indices.`,
  );
  lines.push("");
  lines.push("Ranked targets:");
  targets.slice(0, 5).forEach((t) => {
    lines.push(
      `- ${t.id} (Tier ${t.tier}, ${(t.confidence * 100).toFixed(0)}% confidence) at ${t.lat}, ${t.lng}, ~${t.radiusKm} km halo. ${t.anomaly}. ${t.recommendedAction}`,
    );
  });
  lines.push("");
  lines.push(
    `Highest-ranked target ${top.id || "T-1"} shows coincident multi-layer agreement, the hallmark of a blind system where individual datasets were previously read in isolation. Spectral vectoring should use ${(c.spectral || []).map((s) => s.label).slice(0, 3).join("; ")}.`,
  );
  lines.push(`Surface cues to confirm on imagery: ${c.satelliteCues || "alteration halos and vegetation stress"}.`);
  lines.push("");
  lines.push(
    "Risk note: signatures are model-derived prospectivity, not confirmed resource. Validate with ground geophysics, soil geochem and drilling before economic decisions.",
  );
  return lines.join("\n");
}
