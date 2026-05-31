// Catalog of space-based and non-invasive sensing methods relevant to finding
// resources without breaking ground. Flags which Anthill already uses and which
// are available to add. All listed data sources are free / open access.

export const REMOTE_METHODS = [
  {
    id: "lband-sar",
    name: "L-band SAR (ALOS PALSAR)",
    penetrates: "Vegetation canopy + shallow dry soil (cm to a few m)",
    finds: "Subsurface structure, soil moisture contrast, fault traces under cover",
    source: "JAXA ALOS PALSAR via Microsoft Planetary Computer",
    free: true,
    status: "active",
  },
  {
    id: "insar",
    name: "InSAR ground deformation (Sentinel-1)",
    penetrates: "Surface deformation proxy for subsurface mass/fluid change",
    finds: "Active faults, fluid withdrawal/recharge, salt/karst, geothermal inflation",
    source: "ESA Copernicus Sentinel-1 (free)",
    free: true,
    status: "available",
  },
  {
    id: "satellite-gravity",
    name: "Satellite gravimetry (GRACE-FO / GOCE)",
    penetrates: "Whole-crust density to mantle",
    finds: "Deep density anomalies, dense sulphide/intrusive bodies, basin architecture",
    source: "NASA/DLR GRACE-FO, ESA GOCE (free)",
    free: true,
    status: "active",
  },
  {
    id: "magnetic-anomaly",
    name: "Magnetic field & anomaly (Swarm / WMM / EMAG2)",
    penetrates: "Full crustal column",
    finds: "Magnetite-bearing intrusions, demagnetised alteration shears, BIF",
    source: "ESA Swarm, NOAA WMM, EMAG2 (free)",
    free: true,
    status: "active",
  },
  {
    id: "hyperspectral-emit",
    name: "Hyperspectral mineral mapping (EMIT / EnMAP)",
    penetrates: "Surface mineralogy (direct mineral identification)",
    finds: "Specific alteration minerals: kaolinite, alunite, sericite, iron oxides, carbonates",
    source: "NASA EMIT (ISS), DLR EnMAP (open tiers)",
    free: true,
    status: "available",
  },
  {
    id: "thermal-inertia",
    name: "Thermal inertia & day-night LST (MODIS / ECOSTRESS / Landsat TIRS)",
    penetrates: "Near-surface thermal properties",
    finds: "Buried structures, moisture, geothermal flux, lithology contrast",
    source: "NASA MODIS, ECOSTRESS, USGS Landsat (free)",
    free: true,
    status: "active",
  },
  {
    id: "gedi-lidar",
    name: "Spaceborne lidar canopy/terrain (GEDI / ICESat-2)",
    penetrates: "Through-canopy ground elevation",
    finds: "Bare-earth micro-topography, scarps, paleochannels, pans under forest",
    source: "NASA GEDI, ICESat-2 (free)",
    free: true,
    status: "available",
  },
  {
    id: "radiometric",
    name: "Gamma-ray radiometrics (K/U/Th)",
    penetrates: "Top ~30-50 cm of soil/rock",
    finds: "Potassic alteration, U/Th in REE & uranium systems, lithology mapping",
    source: "Airborne surveys + satellite-assisted priors",
    free: true,
    status: "modelled",
  },
  {
    id: "gnss-reflectometry",
    name: "GNSS reflectometry soil moisture",
    penetrates: "Root-zone soil moisture",
    finds: "Subsurface moisture barriers (ferricrete pans over buried faults)",
    source: "NASA CYGNSS (free)",
    free: true,
    status: "available",
  },
  {
    id: "magnetotelluric",
    name: "Magnetotelluric / electrical conductivity priors",
    penetrates: "Crust to upper mantle (conductivity)",
    finds: "Conductive graphite/sulphide bodies, fluid pathways, brine",
    source: "Global MT compilations (open research data)",
    free: true,
    status: "roadmap",
  },
  {
    id: "geobotanical-ndvi",
    name: "Geobotanical stress mapping (Sentinel-2 NDVI/red-edge)",
    penetrates: "Plant response to root-zone geochemistry",
    finds: "Indicator-species stress over acidic/metalliferous soils (biogeochemical halo)",
    source: "ESA Sentinel-2 (free)",
    free: true,
    status: "active",
  },
  {
    id: "soil-moisture-smap",
    name: "L-band radiometer soil moisture (SMAP)",
    penetrates: "Top ~5 cm with L-band physics",
    finds: "Moisture anomalies, hydrothermal/groundwater pathways",
    source: "NASA SMAP (free)",
    free: true,
    status: "available",
  },
];

export function listRemoteMethods() {
  return REMOTE_METHODS;
}

export function activeMethods() {
  return REMOTE_METHODS.filter((m) => m.status === "active");
}

export function availableToAdd() {
  return REMOTE_METHODS.filter((m) => m.status === "available" || m.status === "roadmap");
}
