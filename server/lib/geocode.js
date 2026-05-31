// Free geocoding via Open-Meteo (no API key). Resolves a place name to
// coordinates and a label, and offers reverse lookups for context.

const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";

export async function geocodePlace(name) {
  if (!name || !name.trim()) return null;
  const url = `${GEOCODE}?name=${encodeURIComponent(name.trim())}&count=1&language=en&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) return null;
  const data = await res.json();
  const r = (data.results || [])[0];
  if (!r) return null;
  const parts = [r.name, r.admin1, r.country].filter(Boolean);
  return {
    name: r.name,
    label: parts.join(", "),
    country: r.country || null,
    lat: r.latitude,
    lng: r.longitude,
    elevation: r.elevation ?? null,
    population: r.population ?? null,
  };
}
