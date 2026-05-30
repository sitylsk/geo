// Open-Meteo — elevation, soil temperature at depth, climate.

const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ELEVATION = "https://api.open-meteo.com/v1/elevation";

export async function fetchOpenMeteo(lat, lng) {
  const [elevRes, forecastRes] = await Promise.all([
    fetch(`${ELEVATION}?latitude=${lat}&longitude=${lng}`, { signal: AbortSignal.timeout(8000) }),
    fetch(
      `${FORECAST}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm&timezone=auto`,
      { signal: AbortSignal.timeout(8000) },
    ),
  ]);
  let elevation = null;
  if (elevRes.ok) {
    const ed = await elevRes.json();
    elevation = ed.elevation?.[0] ?? null;
  }
  let climate = {};
  if (forecastRes.ok) {
    const fd = await forecastRes.json();
    climate = fd.current || {};
  }
  return {
    elevationM: elevation,
    airTempC: climate.temperature_2m,
    humidityPct: climate.relative_humidity_2m,
    precipitationMm: climate.precipitation,
    soilTemp: {
      surface0cm: climate.soil_temperature_0cm,
      shallow6cm: climate.soil_temperature_6cm,
      mid18cm: climate.soil_temperature_18cm,
      deep54cm: climate.soil_temperature_54cm,
    },
    source: "Open-Meteo",
  };
}
