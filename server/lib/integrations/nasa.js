// NASA - EONET natural events, NeoWs near-earth objects, POWER thermal (via geophysical).

const EONET = "https://eonet.gsfc.nasa.gov/api/v3/events";
const NEOWS = "https://api.nasa.gov/NeoWs/rest/feed";

export async function fetchEonet(limit = 8) {
  const res = await fetch(`${EONET}?status=open&limit=${limit}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return { count: 0, events: [] };
  const data = await res.json();
  const events = (data.events || []).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.categories?.[0]?.title,
    sources: e.sources?.length || 0,
  }));
  return { count: events.length, events };
}

export async function fetchNeows() {
  const key = process.env.NASA_API_KEY || "DEMO_KEY";
  const res = await fetch(`${NEOWS}?start_date=2026-05-01&end_date=2026-05-30&api_key=${key}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return { count: 0, objects: [] };
  const data = await res.json();
  const days = data.near_earth_objects || {};
  const objects = Object.values(days)
    .flat()
    .slice(0, 5)
    .map((o) => ({
      name: o.name,
      hazardous: o.is_potentially_hazardous_asteroid,
      diameterM: o.estimated_diameter?.meters?.estimated_diameter_max,
    }));
  return { count: objects.length, objects };
}

export const NASA_POWER = {
  id: "nasa-power",
  name: "NASA POWER",
  use: "Soil temperature, thermal, hydrothermal proxy",
  integrated: true,
};
