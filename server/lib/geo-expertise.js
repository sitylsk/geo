// Expert geologist knowledge: the mineral-systems framework and the practical
// vectoring rules ("tricks") that experienced explorers apply. This encodes how
// trusted geologists actually think so the scorer and the brief reason the same
// way they would.
//
// Mineral systems framework (Wyborn/McCuaig/Hronsky lineage):
//   1. Source        - fertile source of metals and fluids
//   2. Pathway        - structures that transport fluids (the plumbing)
//   3. Trap/Throttle  - where physiochemical change drops metals out of solution
//   4. Preservation   - whether the deposit survived erosion/cover
//   5. Detection      - the mappable footprint we can actually sense
//
// Each commodity maps these components onto criteria the engine can score.

export const MINERAL_SYSTEMS = {
  "gold-orogenic": {
    source: "Devolatilising metasediments / mafic rocks at greenschist-amphibolite transition release Au-As-bearing fluids.",
    pathway: "Crustal-scale shear zones and their second/third-order splays; the deposit sits off the main structure, not on it.",
    trap: "Dilational jogs, fold hinges, competency contrasts (BIF, dolerite dykes) where pressure drops and Au precipitates.",
    preservation: "Mid-crustal lodes preserved under modest cover; deep weathering can upgrade near surface.",
    detection: "As-Sb-W-Bi-Te halo wider than Au; demagnetised shear; subtle gravity high on sulphide; arsenopyrite gossan.",
    vectoringRules: [
      "Follow the arsenic halo - it is larger than the gold core and easier to hit in soils.",
      "Target the splay, not the master shear; ore localises in second-order structures.",
      "Look for competency contrasts (BIF, dykes) crossing the structure - classic trap sites.",
      "Demagnetised (magnetic low) corridors inside magnetic terrain flag fluid alteration.",
    ],
  },
  "copper-sediment": {
    source: "Oxidised basinal brines leach Cu from red-bed sequences.",
    pathway: "Basin-margin growth faults and permeable aquifer units; basement dome flanks focus flow.",
    trap: "Redox front where oxidised Cu-bearing brine meets reduced (pyritic/organic) host - the metal drops out at the colour change.",
    preservation: "Stratabound horizons preserved in fold belts; supergene enrichment near surface.",
    detection: "Cu-Co-Ag-Zn-Pb-U geochem; malachite/azurite staining; clay alteration; cobalt and silver flag Copperbelt style.",
    vectoringRules: [
      "Map the redox boundary - mineralisation hugs the reduced/oxidised contact.",
      "Cobalt and silver in soils discriminate Copperbelt-style systems from barren Cu.",
      "Basement dome margins focus brine - prioritise the flanks, not the crest.",
    ],
  },
  "copper-porphyry": {
    source: "Hydrous, oxidised, fertile arc magmas (high Sr/Y, V/Sc) exsolve metal-rich fluids.",
    pathway: "Apophyses and stockwork fracture networks above a cooling pluton.",
    trap: "Cooling and boiling in the potassic core; concentric alteration zoning records the fluid path.",
    preservation: "Shallow systems easily eroded; leached caps and supergene blankets are good news.",
    detection: "Concentric potassic-phyllic-argillic-propylitic zoning; Cu-Mo-Au core, Pb-Zn-As distal; K-radiometric high.",
    vectoringRules: [
      "Alteration zoning vectors inward - argillic/phyllic clays point toward the potassic core.",
      "A leached cap with hematite-goethite boxwork sits above enriched ore - drill beneath it.",
      "Fertile-arc geochemistry (high Sr/Y) separates productive intrusions from barren ones.",
    ],
  },
  diamond: {
    source: "Diamond-stable cratonic mantle keel (>150 km, old cold lithosphere).",
    pathway: "Deep trans-lithospheric faults that let kimberlite magma ascend fast enough to preserve diamond.",
    trap: "Kimberlite/lamproite pipe emplacement near surface.",
    preservation: "Crater facies preserved in basins; indicator minerals survive in drainage.",
    detection: "Indicator minerals (Cr-pyrope, Cr-diopside, picroilmenite, chromite) in stream sediments; circular magnetic/gravity bullseye; vegetation rings.",
    vectoringRules: [
      "Trace indicator-mineral trains up-drainage to the pipe - the classic diamond search.",
      "Target craton interiors cut by deep lineaments, not craton edges, for diamond preservation.",
      "Circular magnetic anomalies plus a topographic saucer/pan flag a weathered pipe.",
    ],
  },
  emerald: {
    source: "Beryllium from granites/pegmatites must meet chromium/vanadium from mafic-ultramafic rocks.",
    pathway: "Shear zones and fluid channels at the granite/ultramafic contact.",
    trap: "The chemical collision point - Be-bearing fluid reacts with Cr-rich host (phlogopite reaction selvedge).",
    preservation: "Schist-hosted; resistant to weathering, often worked by artisanal pits.",
    detection: "Be-Cr-V geochem; phlogopite/biotite reaction rims; talc-chlorite schist contacts; artisanal pit clusters.",
    vectoringRules: [
      "Hunt the contact, not the granite or the schist alone - emeralds need the collision zone.",
      "Phlogopite reaction selvedges are the single best field vector.",
      "Map artisanal pit alignments - they trace the productive contact for free.",
    ],
  },
  lithium: {
    source: "Highly fractionated granite producing the last, most-evolved LCT pegmatite melt; or Li leached into closed-basin brine.",
    pathway: "Pegmatite dyke swarms zoned outward from the parental granite; basin inflow for brine.",
    trap: "Spodumene/petalite crystallisation in zoned pegmatite; evaporative concentration in arid salars.",
    preservation: "Resistant pegmatite ridges; brine in active closed basins.",
    detection: "Li-Cs-Ta-Rb-Be-Sn geochem; K/U/Th radiometric high; bright leucocratic outcrops; salar evaporite crusts.",
    vectoringRules: [
      "Zonation rule: Li-rich pegmatites sit at the distal end of the K-Rb-Cs fractionation trend from the granite.",
      "Tantalum and cesium rising in soils means you are approaching the fertile core of the field.",
      "For brine, target closed arid basins with no outflow and high evaporation.",
    ],
  },
  ree: {
    source: "Mantle-derived alkaline/carbonatite magmas along deep lithospheric structures.",
    pathway: "Rift faults and lineament intersections guiding alkaline magmatism.",
    trap: "Carbonatite ring complex emplacement; lateritic weathering upgrades REE at surface.",
    preservation: "Resistant carbonatite cores; laterite caps concentrate REE.",
    detection: "Very strong Th/U radiometric bullseye; circular gravity high; fenite alteration halo; radial drainage.",
    vectoringRules: [
      "The Th/U radiometric bullseye is the fastest carbonatite finder.",
      "Look for circular drainage and a fenitised (alkali-altered) halo around the complex.",
      "Laterite over carbonatite is the prize - it upgrades the REE grade.",
    ],
  },
  uranium: {
    source: "Granitic/volcanic U leached by oxidised groundwater.",
    pathway: "Permeable sandstone aquifers, paleochannels, and basement unconformities.",
    trap: "Redox roll-front where oxidised U-bearing water meets a reductant (organic/pyrite) and U precipitates.",
    preservation: "Buried roll-fronts and calcrete valley fills preserve U.",
    detection: "Discrete eU radiometric highs; Se-bearing indicator flora; redox colour change in sandstone; calcrete.",
    vectoringRules: [
      "Map the redox front in the sandstone - U sits at the oxidised/reduced colour boundary.",
      "Selenium-accumulating plants (Astragalus) flag the front at surface.",
      "Calcrete in arid valley fills is a cheap surface U trap to sample.",
    ],
  },
  "oil-gas": {
    source: "Mature organic-rich source rock in the oil/gas window.",
    pathway: "Carrier beds and faults migrating hydrocarbons updip.",
    trap: "Structural (anticline/fault) or stratigraphic closure with a seal.",
    preservation: "Intact seal; not breached by later faulting.",
    detection: "Microseepage: ethane/propane soil gas, carbonate cementation, near-surface radiometric lows, bleaching.",
    vectoringRules: [
      "Surface microseepage haloes (radiometric lows, clay bleaching) sit over leaking traps.",
      "Map four-way dip closure on anticlines as first-order targets.",
    ],
  },
  geothermal: {
    source: "Magmatic or deep-circulation heat along active faults.",
    pathway: "Permeable fault damage zones and fractures.",
    trap: "Reservoir beneath a clay cap (smectite/illite) that retains heat and fluid.",
    preservation: "Active system with surface manifestations.",
    detection: "Thermal anomalies, hot springs, silica sinter, argillic clay caps, B-Li-As-SiO2 in fluids.",
    vectoringRules: [
      "Fault step-overs and intersections host the highest permeability upflow zones.",
      "A resistive reservoir beneath a conductive clay cap is the MT signature to chase.",
    ],
  },
  groundwater: {
    source: "Recharge zones (highlands, rivers).",
    pathway: "Fracture networks, weathered regolith, paleochannels.",
    trap: "Storage in fracture intersections, thick regolith, and buried channels.",
    preservation: "Sustained by recharge; protected from evaporation.",
    detection: "Lineament intersections, dry-season green vegetation, moisture/conductivity contrasts, dambo margins.",
    vectoringRules: [
      "Drill fracture intersections - two crossing lineaments beat a single one.",
      "Dry-season vegetation that stays green marks a shallow water table.",
    ],
  },
};

// Universal field/desktop heuristics trusted across the profession.
export const UNIVERSAL_HEURISTICS = [
  "Coincidence beats any single anomaly: a target backed by geochemistry AND structure AND geophysics outranks a strong single-layer hit.",
  "Structure is king: most economic deposits sit on or beside a fault, shear, or contact. Map structures first.",
  "Follow the halo, not the core: pathfinder haloes (As for Au, Cs/Ta for Li) are bigger targets than the ore itself.",
  "Gossans and colour anomalies (red/orange iron caps) are the oldest and still one of the best surface guides to buried sulphides.",
  "Use the drainage: stream sediments and indicator minerals integrate a whole catchment - cheap reconnaissance.",
  "Alteration zoning vectors toward the source - read the clays and iron oxides like a compass.",
  "Edge-of-craton and trans-lithospheric structures localise a disproportionate share of giant deposits.",
  "Cover is opportunity: under-explored ground beneath sand/laterite/canopy is where the remaining giants hide.",
  "Every drill hole, including a miss, is data - it tells you where the ore is not.",
];

export function mineralSystemFor(commodityId) {
  if (MINERAL_SYSTEMS[commodityId]) return MINERAL_SYSTEMS[commodityId];
  if (commodityId.startsWith("gold")) return MINERAL_SYSTEMS["gold-orogenic"];
  if (commodityId.startsWith("copper-porphyry")) return MINERAL_SYSTEMS["copper-porphyry"];
  if (commodityId.startsWith("copper")) return MINERAL_SYSTEMS["copper-sediment"];
  if (commodityId.includes("tourmaline") || commodityId.includes("aquamarine")) return MINERAL_SYSTEMS.lithium;
  return null;
}
