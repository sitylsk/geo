// Model validation: how well does the score grid concentrate known deposits?
// Uses known occurrences (USGS MRDS etc.) as positive labels and computes:
//   - Capture-efficiency: % of known deposits inside the top X% highest-scoring
//     area (the standard prospectivity success metric).
//   - A rank-based AUC proxy (probability a random deposit cell outscores a
//     random background cell).
// This produces a real, defensible accuracy number for an AOI that contains
// known deposits.

function scoreAtPoint(scoreGrid, bounds, lat, lng) {
  const n = scoreGrid.length;
  const fx = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1);
  const fy = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1);
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
  const i = Math.round(fx * (n - 1));
  const j = Math.round(fy * (n - 1));
  return scoreGrid[j]?.[i] ?? null;
}

export function validateAgainstDeposits({ scoreGrid, bounds, deposits }) {
  const positives = (deposits || [])
    .map((d) => scoreAtPoint(scoreGrid, bounds, d.lat, d.lng))
    .filter((v) => v != null);

  if (positives.length < 3) {
    return {
      available: false,
      reason: "Too few known deposits inside the area to validate (need >=3). This is frontier ground.",
      knownDeposits: positives.length,
    };
  }

  // Flatten all cell scores as the background population.
  const allScores = scoreGrid.flat();
  allScores.sort((a, b) => b - a);
  const total = allScores.length;

  // Capture efficiency at 10%, 20%, 30% of area.
  const capture = {};
  for (const frac of [0.1, 0.2, 0.3]) {
    const cutIdx = Math.max(1, Math.floor(total * frac)) - 1;
    const threshold = allScores[cutIdx];
    const captured = positives.filter((p) => p >= threshold).length;
    capture[`top${Math.round(frac * 100)}pct`] = Number((captured / positives.length).toFixed(3));
  }

  // Rank-based AUC proxy (Mann-Whitney): P(positive score > random background).
  const bg = scoreGrid.flat();
  let wins = 0;
  let comparisons = 0;
  const sample = bg.length > 600 ? sampleArray(bg, 600) : bg;
  for (const p of positives) {
    for (const b of sample) {
      comparisons++;
      if (p > b) wins++;
      else if (p === b) wins += 0.5;
    }
  }
  const auc = comparisons ? Number((wins / comparisons).toFixed(3)) : null;

  return {
    available: true,
    knownDeposits: positives.length,
    auc,
    captureEfficiency: capture,
    interpretation: interpret(auc, capture.top10pct),
    caveat:
      "Known-deposit proximity is one model input, so this in-sample score is optimistic. Rigorous accuracy requires spatial hold-out cross-validation (train on one sub-region, test on deposits in another).",
  };
}

function interpret(auc, top10) {
  if (auc == null) return "Insufficient data for interpretation.";
  const quality = auc >= 0.8 ? "strong" : auc >= 0.65 ? "moderate" : "weak";
  return `Model shows ${quality} discrimination (AUC ${auc}); it captures ${Math.round((top10 || 0) * 100)}% of known deposits in the top 10% of ranked ground.`;
}

function sampleArray(arr, k) {
  const out = [];
  const step = arr.length / k;
  for (let i = 0; i < k; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}
