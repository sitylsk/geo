// Deep geological knowledge base.
// Encodes classic (pre-instrument) and modern indicators used to find each
// commodity: geobotanical indicator species, pathfinder element haloes,
// pressure-temperature (metamorphic facies) windows, structural settings,
// surface and weathering expressions, and the regional context signals that
// raise or lower prospectivity. This is the domain expertise the analysis
// engine reasons over so a no-key run still produces a complete brief.

export const GEOBOTANICAL_INDICATORS = {
  copper: [
    { species: "Becium homblei", common: "copper flower", note: "Classic Central African copper indicator; tolerates high soil Cu." },
    { species: "Haumaniastrum katangense", common: "copper plant", note: "Katangan Copperbelt cuprophyte." },
    { species: "Gypsophila patrinii", common: "copper pink", note: "Cu-tolerant on mineralised soils." },
    { species: "Mielichhoferia (copper moss)", common: "copper moss", note: "Grows on Cu-rich substrate." },
  ],
  zinc: [
    { species: "Viola calaminaria", common: "zinc violet", note: "Calamine flora over Zn-Pb gossans." },
    { species: "Thlaspi caerulescens", common: "alpine pennycress", note: "Zn/Cd hyperaccumulator." },
  ],
  nickel: [
    { species: "Berkheya coddii", common: "nickel daisy", note: "Hyperaccumulates Ni on serpentine/ultramafics." },
    { species: "Alyssum (Odontarrhena)", common: "madwort", note: "Serpentine Ni hyperaccumulator." },
  ],
  uranium: [
    { species: "Astragalus (milkvetch)", common: "locoweed", note: "Selenium/U indicator; Se tracks roll-front U." },
    { species: "Stanleya pinnata", common: "prince's plume", note: "Selenium accumulator over U/Se ground." },
  ],
  gold: [
    { species: "Eucalyptus (deep roots)", common: "gum tree", note: "Roots translocate Au particles to leaves over buried lodes (Au in laterite/leaf)." },
    { species: "Equisetum", common: "horsetail", note: "Historically reputed Au accumulator near placers." },
  ],
  selenium: [
    { species: "Astragalus bisulcatus", common: "two-grooved milkvetch", note: "Strong Se accumulator." },
  ],
  acidStress: [
    { species: "Stunted / chlorotic canopy", common: "vegetation stress", note: "Acidic sulphide soils suppress and yellow vegetation - visible as NDVI lows." },
  ],
};

// Pressure-Temperature windows (metamorphic facies) and depth regimes.
export const PT_REGIMES = {
  "gold-orogenic": {
    facies: "Greenschist to lower amphibolite",
    depthKm: "5-15 km (mid-crustal)",
    tempC: "250-450",
    note: "Orogenic gold precipitates where fluids cross the greenschist-amphibolite transition along crustal-scale shears.",
  },
  diamond: {
    facies: "Cratonic mantle (eclogite/peridotite)",
    depthKm: "150-200 km (diamond stability field)",
    tempC: "900-1300",
    note: "Diamonds require thick, cold cratonic keels; kimberlites must sample below the graphite-diamond transition (>~150 km).",
  },
  emerald: {
    facies: "Greenschist-amphibolite contact",
    depthKm: "Mid-crust contact zones",
    tempC: "300-600",
    note: "Beryllium (granitic/pegmatitic) must meet chromium/vanadium (mafic-ultramafic) - a chemical collision point.",
  },
  "copper-porphyry": {
    facies: "Shallow sub-volcanic",
    depthKm: "1-5 km emplacement",
    tempC: "300-700 (magmatic-hydrothermal)",
    note: "Concentric potassic-phyllic-argillic-propylitic zoning around a cooling intrusion.",
  },
  ree: {
    facies: "Alkaline / carbonatite",
    depthKm: "Deep mantle-derived melts",
    tempC: "High-temperature carbonatite",
    note: "Mantle-sourced alkaline magmatism along deep lithospheric structures and rift margins.",
  },
  lithium: {
    facies: "Highly evolved pegmatite / evaporitic brine",
    depthKm: "Shallow pegmatite cupolas / closed basins",
    tempC: "Low-T fractionated melt or surface brine",
    note: "LCT pegmatites are the last, most-fractionated melt; brines need closed arid basins.",
  },
  geothermal: {
    facies: "Active volcanic / rift",
    depthKm: "2-5 km reservoir",
    tempC: ">150 reservoir",
    note: "High heat flow along active faults and rift segments with surface hot springs / sinter.",
  },
};

// Structural and tectonic settings that focus mineralising fluids.
export const STRUCTURAL_SETTINGS = {
  "gold-orogenic": "Second/third-order splays off crustal-scale shear zones; dilational jogs, fold hinges, BIF-shear intersections.",
  "copper-sediment": "Reduced-oxidised redox fronts at basin margins; basement dome flanks; growth faults.",
  "copper-porphyry": "Magmatic arcs above subduction; intrusive cupolas; radial/concentric fracture sets.",
  diamond: "Craton interiors cut by deep trans-lithospheric faults that guide kimberlite ascent.",
  emerald: "Granite/pegmatite contacts against Cr-bearing ultramafic schists; thrust contacts.",
  lithium: "Pegmatite fields zoned outward from parental granite; closed evaporitic basins for brine.",
  ree: "Carbonatite ring complexes along rift/lineament intersections.",
  uranium: "Sandstone redox roll-fronts; unconformity contacts; paleochannels.",
  "oil-gas": "Anticlinal/structural and stratigraphic traps; basin depocentres; salt structures.",
  geothermal: "Rift faults, caldera margins, transtensional step-overs with high heat flow.",
  groundwater: "Fracture intersections, weathered basement, paleochannels, dambo margins.",
};

// Surface / weathering expressions (the classic prospector's eye).
export const SURFACE_EXPRESSIONS = {
  gossan: "Iron-stained, boxwork 'iron hat' over weathered sulphides (red/orange/brown caps).",
  malachiteAzurite: "Green (malachite) and blue (azurite) copper carbonate staining on outcrop.",
  silcrete: "Resistant silicified ridges marking quartz veins / silicified faults.",
  calcrete: "Carbonate hardpan that traps uranium in arid valley fills.",
  ferricrete: "Iron-cemented pan over buried sulphide / fault.",
  springTufa: "Travertine / sinter deposits flagging geothermal or carbonate-rich fluids.",
  saltCrust: "Evaporite crusts over Li/B/Na-rich closed-basin brines.",
};

// Geophysical / geochemical pathfinder signatures (concise, per commodity).
export const PATHFINDER_HALOES = {
  "gold-orogenic": "As-Sb-W-Bi-Te-Ag halo wider than the Au core; arsenopyrite is the key vector.",
  "copper-sediment": "Cu-Co-Ag-Zn-Pb-U; cobalt and silver flag Copperbelt-style systems.",
  "copper-porphyry": "Cu-Mo-Au-Re core; Pb-Zn-As-Sb distal halo; K-radiometric high in potassic core.",
  diamond: "Kimberlite indicator minerals: Cr-pyrope garnet, Cr-diopside, picroilmenite, chromite.",
  emerald: "Be-Cr-V-Li-Cs-Ta; phlogopite reaction selvedges at the contact.",
  lithium: "Li-Cs-Ta-Rb-Be-Sn; K/U/Th radiometric high over fractionated pegmatite.",
  ree: "La-Ce-Nd-Y-Nb-P-Th-Sr; very strong Th/U radiometric bullseye.",
  uranium: "U-V-Se-Mo-Ra; discrete eU radiometric anomalies and Se-bearing flora.",
  "oil-gas": "Microseepage: ethane/propane soil gas, carbonate cement, near-surface radiometric lows.",
  geothermal: "B-Li-As-SiO2-Cl-He in springs; argillic clay caps.",
  groundwater: "Conductivity / TDS contrasts; moisture and chlorophyll persistence in dry season.",
};

export function commodityFamilyKey(commodityId) {
  if (commodityId.startsWith("gold")) return { geobotany: "gold", pt: "gold-orogenic", path: "gold-orogenic", struct: "gold-orogenic" };
  if (commodityId.startsWith("copper-porphyry")) return { geobotany: "copper", pt: "copper-porphyry", path: "copper-porphyry", struct: "copper-porphyry" };
  if (commodityId.startsWith("copper")) return { geobotany: "copper", pt: null, path: "copper-sediment", struct: "copper-sediment" };
  if (commodityId.startsWith("nickel")) return { geobotany: "nickel", pt: null, path: null, struct: null };
  if (commodityId === "diamond") return { geobotany: null, pt: "diamond", path: "diamond", struct: "diamond" };
  if (commodityId === "emerald") return { geobotany: null, pt: "emerald", path: "emerald", struct: "emerald" };
  if (commodityId === "lithium" || commodityId.includes("tourmaline")) return { geobotany: null, pt: "lithium", path: "lithium", struct: "lithium" };
  if (commodityId === "ree") return { geobotany: null, pt: "ree", path: "ree", struct: "ree" };
  if (commodityId === "uranium") return { geobotany: "uranium", pt: null, path: "uranium", struct: "uranium" };
  if (commodityId === "oil-gas") return { geobotany: null, pt: null, path: "oil-gas", struct: "oil-gas" };
  if (commodityId === "geothermal") return { geobotany: null, pt: "geothermal", path: "geothermal", struct: "geothermal" };
  if (commodityId === "groundwater") return { geobotany: null, pt: null, path: "groundwater", struct: "groundwater" };
  return { geobotany: null, pt: null, path: null, struct: null };
}

export function knowledgeFor(commodityId) {
  const key = commodityFamilyKey(commodityId);
  return {
    geobotany: key.geobotany ? GEOBOTANICAL_INDICATORS[key.geobotany] : null,
    acidStress: GEOBOTANICAL_INDICATORS.acidStress,
    pt: key.pt ? PT_REGIMES[key.pt] : null,
    pathfinders: key.path ? PATHFINDER_HALOES[key.path] : null,
    structure: key.struct ? STRUCTURAL_SETTINGS[key.struct] : null,
    surfaceExpressions: SURFACE_EXPRESSIONS,
  };
}
