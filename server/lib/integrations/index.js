// Regional intelligence orchestrator — aggregates all external data feeds for an AOI.

import { normaliseAoi } from "../engine.js";
import { fetchEarthquakes, fetchMrdsDeposits, fetchNwisNear } from "./usgs.js";
import { fetchEonet, fetchNeows } from "./nasa.js";
import { fetchOpenMeteo } from "./openmeteo.js";
import { fetchNoaaIgrf } from "./noaa.js";
import { fetchIrisSeismicity } from "./iris.js";
import { fetchCommodityPrices } from "./metals.js";
import { fetchTectonicContext } from "./tectonics.js";
import {
  fetchLithiumIntelligence,
  fetchBgsUk,
  fetchGlobalDeposits,
  fetchIeaDemand,
  fetchSupplyChainNote,
} from "./deposits.js";

export const INTEGRATION_CATALOG = [
  { id: "usgs-eq", emoji: "🌍", name: "USGS Earthquakes", provider: "USGS FDSN" },
  { id: "usgs-mrds", emoji: "🌍", name: "USGS MRDS Mineral Deposits", provider: "USGS WFS" },
  { id: "usgs-nwis", emoji: "🌍", name: "USGS NWIS Geochemical Sampling", provider: "USGS Water Services" },
  { id: "nasa-power", emoji: "🛰️", name: "NASA POWER Hydrothermal/Thermal", provider: "NASA LaRC" },
  { id: "nasa-eonet", emoji: "🛰️", name: "NASA EONET Environmental Events", provider: "NASA EONET" },
  { id: "nasa-neows", emoji: "🛰️", name: "NASA NeoWs", provider: "NASA JPL" },
  { id: "noaa-igrf", emoji: "📡", name: "NOAA IGRF / Declination", provider: "NOAA WMM-2025" },
  { id: "open-meteo", emoji: "🔥", name: "Open-Meteo Soil Temperature & Climate", provider: "Open-Meteo" },
  { id: "metals-live", emoji: "💰", name: "Commodity Prices", provider: "Metals.live / gold-api.com" },
  { id: "iris-fdsn", emoji: "🧭", name: "IRIS FDSN Seismicity", provider: "IRIS" },
  { id: "bird-plates", emoji: "🧭", name: "Tectonic Plate Context", provider: "Bird 2002" },
  { id: "iea-demand", emoji: "💰", name: "IEA Demand Forecast 2024→2040", provider: "IEA trends KB" },
  { id: "lithium-kb", emoji: "💰", name: "Lithium Brine Intelligence", provider: "Anthill KB (20 deposits)" },
  { id: "bgs-uk", emoji: "🌍", name: "BGS UK Mineral Occurrences", provider: "BGS curated KB" },
  { id: "global-deposits", emoji: "🌍", name: "Global Geological Survey Deposits", provider: "Aggregated KB" },
];

export async function gatherRegionalIntelligence({ aoi, commodityId, radiusKm = 300 }) {
  const bounds = normaliseAoi({ ...aoi, radiusKm: radiusKm || aoi.radiusKm || 300 });
  const lat = (bounds.minLat + bounds.maxLat) / 2;
  const lng = (bounds.minLng + bounds.maxLng) / 2;
  const r = Math.max((bounds.maxLat - bounds.minLat) * 111, 50);

  const [
    earthquakes,
    mrds,
    nwis,
    eonet,
    neows,
    openMeteo,
    iris,
    tectonics,
    prices,
  ] = await Promise.all([
    fetchEarthquakes(lat, lng, r, 12),
    fetchMrdsDeposits(bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat, 20),
    fetchNwisNear(lat, lng, 2),
    fetchEonet(6),
    fetchNeows(),
    fetchOpenMeteo(lat, lng),
    fetchIrisSeismicity(lat, lng, 5, 12),
    fetchTectonicContext(lat, lng),
    fetchCommodityPrices(),
  ]);

  const igrf = fetchNoaaIgrf(lat, lng);
  const lithium = fetchLithiumIntelligence(lat, lng, 8000);
  const bgs = fetchBgsUk(lat, lng, 800);
  const globalDeposits = fetchGlobalDeposits(lat, lng, r);
  const ieaDemand = commodityId ? fetchIeaDemand(commodityId) : null;
  const supplyChain = commodityId ? fetchSupplyChainNote(commodityId) : null;

  return {
    center: { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) },
    radiusKm: Number(r.toFixed(0)),
    generatedAt: new Date().toISOString(),
    usgs: {
      earthquakes,
      mineralDeposits: mrds,
      geochemicalSites: nwis,
    },
    nasa: {
      environmentalEvents: eonet,
      nearEarthObjects: neows,
      hydrothermalNote: openMeteo.soilTemp
        ? `Soil thermal gradient ${openMeteo.soilTemp.surface0cm}°C → ${openMeteo.soilTemp.deep54cm}°C (surface→54cm) supports hydrothermal screening.`
        : null,
    },
    noaa: { magnetic: igrf },
    openMeteo,
    seismic: {
      usgs: earthquakes,
      iris: iris,
    },
    tectonics,
    commodities: {
      spotPrices: prices,
      demandForecast: ieaDemand,
      supplyChain,
    },
    deposits: {
      mrdsNearby: mrds.deposits?.slice(0, 8) || [],
      lithiumIntelligence: lithium,
      bgsUk: bgs,
      globalSurvey: globalDeposits,
    },
    feedsUsed: INTEGRATION_CATALOG.map((c) => c.id),
  };
}

export function listIntegrations() {
  return INTEGRATION_CATALOG;
}
