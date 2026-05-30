// IRIS FDSN - seismicity events near AOI.

const IRIS = "https://service.iris.edu/fdsnws/event/1/query";

function parseIrisText(text) {
  const lines = text.trim().split("\n").filter((l) => l && !l.startsWith("#"));
  return lines.map((line) => {
    const p = line.split("|").map((s) => s.trim());
    return {
      id: p[0],
      time: p[1],
      lat: parseFloat(p[2]),
      lng: parseFloat(p[3]),
      depthKm: parseFloat(p[4]),
      magnitude: parseFloat(p[9]),
      location: p[12] || "",
    };
  });
}

export async function fetchIrisSeismicity(lat, lng, maxRadiusDeg = 5, limit = 15) {
  const params = new URLSearchParams({
    format: "text",
    lat: String(lat),
    lon: String(lng),
    maxradius: String(maxRadiusDeg),
    limit: String(limit),
    orderby: "time",
  });
  try {
    const res = await fetch(`${IRIS}?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { count: 0, events: [] };
    const text = await res.text();
    const events = parseIrisText(text);
    return { count: events.length, events };
  } catch {
    return { count: 0, events: [] };
  }
}
