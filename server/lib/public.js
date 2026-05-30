// Public-facing serializers — strip internal methodology before anything
// reaches the browser or export files.

export function publicCommodity(c) {
  return {
    id: c.id,
    name: c.name,
    category: c.category,
    color: c.color,
  };
}

export function publicCommodityList(categories, commodities) {
  return {
    categories,
    commodities: commodities.map(publicCommodity),
  };
}

export function publicEngineResult(result) {
  return {
    commodity: publicCommodity(result.commodity),
    bounds: result.bounds,
    gridSize: result.gridSize,
    grid: result.grid,
    targets: result.targets.map((t) => ({
      id: t.id,
      rank: t.rank,
      lat: t.lat,
      lng: t.lng,
      confidence: t.confidence,
      radiusKm: t.radiusKm,
      tier: t.tier,
    })),
    generatedAt: result.generatedAt,
  };
}

export function publicAiResult(ai) {
  if (!ai) return null;
  return { summary: ai.final };
}
