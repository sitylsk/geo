// Real bedrock geology via Macrostrat (free, CC-BY, no key).
// Returns lithology + age at a point and across an AOI, and scores host-rock
// favorability per commodity. This is measured map geology, not generated text,
// and is a direct prospectivity input (a copper system needs the right host).

const MACRO = "https://macrostrat.org/api/v2/geologic_units/map";

export async function fetchGeologyAt(lat, lng) {
  try {
    const res = await fetch(`${MACRO}?lat=${lat}&lng=${lng}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.success?.data?.[0];
    if (!u) return null;
    return {
      lith: u.lith || "",
      name: u.name || u.strat_name || "",
      age: u.best_int_name || u.t_int_name || "",
      tAge: u.t_age ?? null,
      bAge: u.b_age ?? null,
    };
  } catch {
    return null;
  }
}

// Sample geology across the AOI (coarse, capped to keep calls light).
export async function fetchGeologyGrid(bounds, n = 3) {
  const pts = [];
  for (let j = 0; j < n; j++) {
    const lat = bounds.minLat + (j / (n - 1)) * (bounds.maxLat - bounds.minLat);
    for (let i = 0; i < n; i++) {
      const lng = bounds.minLng + (i / (n - 1)) * (bounds.maxLng - bounds.minLng);
      pts.push({ lat, lng });
    }
  }
  const units = await Promise.all(pts.map((p) => fetchGeologyAt(p.lat, p.lng)));
  const valid = units.filter(Boolean);
  // Dominant lithology / age summary.
  const lithCounts = {};
  const ageCounts = {};
  for (const u of valid) {
    if (u.lith) lithCounts[u.lith] = (lithCounts[u.lith] || 0) + 1;
    if (u.age) ageCounts[u.age] = (ageCounts[u.age] || 0) + 1;
  }
  const dominant = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return {
    samples: valid,
    coverage: valid.length,
    dominantLith: dominant(lithCounts),
    dominantAge: dominant(ageCounts),
    liths: Object.keys(lithCounts),
    ages: Object.keys(ageCounts),
  };
}

// Favorable host lithology keywords + age hints per commodity family.
const HOST_RULES = {
  "gold-orogenic": { lith: ["metamorph", "schist", "greenstone", "mafic", "volcanic", "iron formation", "gneiss", "slate"], ages: ["Archean", "Proterozoic"] },
  "copper-sediment": { lith: ["sedimentary", "volcanic-sedimentary", "argillite", "shale", "dolomit", "sandstone", "siltstone", "carbonate"], ages: ["Neoproterozoic", "Proterozoic"] },
  "copper-porphyry": { lith: ["intrusive", "granodiorite", "diorite", "porphyry", "volcanic", "andesite"], ages: ["Mesozoic", "Cenozoic", "Phanerozoic"] },
  "nickel-cobalt": { lith: ["ultramafic", "mafic", "peridotite", "komatiite", "dunite", "laterite"], ages: ["Archean", "Proterozoic"] },
  manganese: { lith: ["sedimentary", "shale", "carbonate", "chert", "iron formation"], ages: [] },
  diamond: { lith: ["kimberlite", "ultramafic", "craton"], ages: ["Archean"] },
  emerald: { lith: ["schist", "mafic", "ultramafic", "pegmatite", "metamorph"], ages: [] },
  "ruby-sapphire": { lith: ["marble", "gneiss", "amphibolite", "basalt", "metamorph"], ages: [] },
  "aquamarine-tourmaline": { lith: ["pegmatite", "granite", "schist"], ages: [] },
  amethyst: { lith: ["basalt", "volcanic", "silic", "vein"], ages: [] },
  lithium: { lith: ["pegmatite", "granite", "evaporite", "playa", "brine"], ages: [] },
  ree: { lith: ["carbonatite", "alkaline", "intrusive", "syenite"], ages: [] },
  uranium: { lith: ["sandstone", "granite", "calcrete", "unconformity"], ages: [] },
  "oil-gas": { lith: ["sandstone", "shale", "carbonate", "limestone", "sedimentary", "mudstone"], ages: ["Phanerozoic", "Mesozoic", "Cenozoic", "Paleozoic"] },
  geothermal: { lith: ["volcanic", "basalt", "andesite", "rhyolite", "intrusive"], ages: ["Cenozoic"] },
  groundwater: { lith: ["sandstone", "sedimentary", "alluvium", "fractured", "limestone", "basalt"], ages: [] },
};

export function geologyFavorability(commodityId, geology) {
  if (!geology || !geology.coverage) {
    return { score: 0.5, matched: [], note: "No bedrock map coverage; neutral host-rock weighting." };
  }
  const rule = HOST_RULES[commodityId] || HOST_RULES["copper-sediment"];
  const liths = (geology.liths || []).map((l) => l.toLowerCase());
  const ages = (geology.ages || []).map((a) => a.toLowerCase());
  const matchedLith = rule.lith.filter((k) => liths.some((l) => l.includes(k)));
  const matchedAge = rule.ages.filter((k) => ages.some((a) => a.includes(k.toLowerCase())));
  let score = 0.35;
  if (matchedLith.length) score += Math.min(0.45, matchedLith.length * 0.2);
  if (matchedAge.length) score += 0.2;
  score = Math.max(0, Math.min(1, score));
  const matched = [...matchedLith, ...matchedAge];
  const note = matched.length
    ? `Host rock favourable: ${geology.dominantLith || "mapped units"} (${geology.dominantAge || "age n/a"}) matches ${commodityId.replace(/-/g, " ")} model.`
    : `Host rock (${geology.dominantLith || "mapped units"}, ${geology.dominantAge || "age n/a"}) is a weak match for this deposit type.`;
  return { score: Number(score.toFixed(3)), matched, note, dominantLith: geology.dominantLith, dominantAge: geology.dominantAge };
}
