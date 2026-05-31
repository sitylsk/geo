// Public-facing serializers - strip internal methodology before anything
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

function publicLayerGrid(layer) {
  if (!layer?.grid) return null;
  return { grid: layer.grid };
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
      realEvidence: t.realEvidence || null,
    })),
    dataDriven: Boolean(result.dataDriven),
    dataConfidence: result.dataConfidence || null,
    hostRock: result.hostRock ? { score: result.hostRock.score, note: result.hostRock.note, lith: result.hostRock.dominantLith, age: result.hostRock.dominantAge } : null,
    alteration: result.alteration ? { scene: result.alteration.scene, cloud: result.alteration.cloud, source: result.alteration.source } : null,
    validation: result.validation || null,
    spatialValidation: result.spatialValidation || null,
    generatedAt: result.generatedAt,
  };

  if (result.deepScan?.active) {
    out.deepScan = {
      active: true,
      penetration: result.deepScan.penetration,
      lbandCoverage: result.deepScan.lbandCoverage,
      palsarScenes: result.deepScan.palsarScenes,
      xray: Boolean(result.deepScan.xray),
    };
    if (result.subsurfaceGrid) out.subsurfaceGrid = result.subsurfaceGrid;
  }

  if (result.xrayScan && result.geophysicalStack) {
    const gs = result.geophysicalStack;
    out.xrayStack = {
      active: true,
      layers: Object.fromEntries(
        Object.entries(gs.layers).map(([k, v]) => [k, publicLayerGrid(v)]),
      ),
      depthSlices: Object.fromEntries(
        Object.entries(gs.depthSlices || {}).map(([k, v]) => [k, { label: v.label, grid: v.grid }]),
      ),
    };
  }

  return out;
}

export function publicAiResult(ai) {
  if (!ai) return null;
  return {
    summary: ai.final,
    sections: ai.sections || null,
    grounded: Boolean(ai.grounded),
    simulated: Boolean(ai.simulated),
    citations: ai.citations || [],
    model: ai.providers?.openaiModel || null,
    webSearch: Boolean(ai.providers?.webSearch),
  };
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
    extras: coverage.extras || null,
    note: coverage.penetrationNote || coverage.stackNote,
  };
}
