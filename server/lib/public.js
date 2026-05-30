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
  const out = {
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
  if (result.deepScan?.active) {
    out.deepScan = {
      active: true,
      penetration: result.deepScan.penetration,
      lbandCoverage: result.deepScan.lbandCoverage,
      palsarScenes: result.deepScan.palsarScenes,
    };
    if (result.subsurfaceGrid) out.subsurfaceGrid = result.subsurfaceGrid;
  }
  return out;
}

export function publicAiResult(ai) {
  if (!ai) return null;
  return { summary: ai.final };
}

export function publicCoverage(coverage) {
  if (!coverage) return null;
  return {
    palsar: {
      sensor: coverage.palsar.sensor,
      band: coverage.palsar.band,
      scenes: coverage.palsar.scenes,
      covered: coverage.palsar.covered,
    },
    note: coverage.penetrationNote,
  };
}
