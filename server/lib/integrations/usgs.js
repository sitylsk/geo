// USGS - earthquakes, MRDS mineral deposits (WFS), NWIS water/geochem stations.

const USGS_EQ = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const MRDS_WFS = "https://mrdata.usgs.gov/services/mrds";
const NWIS = "https://waterservices.usgs.gov/nwis/iv/";

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchEarthquakes(lat, lng, radiusKm = 300, limit = 15) {
  const params = new URLSearchParams({
    format: "geojson",
    latitude: String(lat),
    longitude: String(lng),
    maxradiuskm: String(radiusKm),
    limit: String(limit),
    orderby: "time",
  });
  const res = await fetch(`${USGS_EQ}?${params}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return { count: 0, events: [] };
  const data = await res.json();
  const events = (data.features || []).map((f) => ({
    id: f.id,
    mag: f.properties?.mag,
    place: f.properties?.place,
    time: f.properties?.time,
    lat: f.geometry?.coordinates?.[1],
    lng: f.geometry?.coordinates?.[0],
    depthKm: f.geometry?.coordinates?.[2],
    distanceKm: haversineKm(lat, lng, f.geometry?.coordinates?.[1], f.geometry?.coordinates?.[0]),
  }));
  return { count: events.length, events };
}

/** Parse MRDS WFS GML for deposit points in bbox. */
export async function fetchMrdsDeposits(minLng, minLat, maxLng, maxLat, limit = 25) {
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typeName: "mrds-high,mrds-low",
    outputFormat: "GML3",
    bbox,
    maxFeatures: String(limit),
  });
  try {
    const res = await fetch(`${MRDS_WFS}?${params}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { count: 0, deposits: [] };
    const xml = await res.text();
    const deposits = [];
    const blocks = xml.split("<gml:featureMember>").slice(1);
    for (const block of blocks) {
      const name = block.match(/<(?:\w+:)?site_name>([^<]*)<\/(?:\w+:)?site_name>/)?.[1] || block.match(/<(?:\w+:)?dep_name>([^<]*)<\/(?:\w+:)?dep_name>/)?.[1];
      const commodity = (block.match(/<(?:\w+:)?code_list>([^<]*)<\/(?:\w+:)?code_list>/)?.[1] || block.match(/<(?:\w+:)?commod>([^<]*)<\/(?:\w+:)?commod>/)?.[1] || "").trim();
      const status = block.match(/<(?:\w+:)?dev_stat>([^<]*)<\/(?:\w+:)?dev_stat>/)?.[1];
      const pos = block.match(/<gml:pos[^>]*>([^<]+)<\/gml:pos>/)?.[1];
      if (!pos) continue;
      const [plat, plng] = pos.trim().split(/\s+/).map(Number);
      if (Number.isNaN(plat)) continue;
      deposits.push({
        name: name || "Unknown deposit",
        commodity: commodity || "Unknown",
        status: status || "Unknown",
        lat: plat,
        lng: plng,
        distanceKm: haversineKm((minLat + maxLat) / 2, (minLng + maxLng) / 2, plat, plng),
      });
    }
    deposits.sort((a, b) => a.distanceKm - b.distanceKm);
    return { count: deposits.length, deposits: deposits.slice(0, limit) };
  } catch {
    return { count: 0, deposits: [] };
  }
}

export async function fetchNwisNear(lat, lng, radiusDeg = 1.5) {
  const minLat = lat - radiusDeg;
  const maxLat = lat + radiusDeg;
  const minLng = lng - radiusDeg;
  const maxLng = lng + radiusDeg;
  const params = new URLSearchParams({
    format: "json",
    bBox: `${minLng},${minLat},${maxLng},${maxLat}`,
    parameterCd: "00095,00400,70331",
    siteStatus: "active",
  });
  try {
    const res = await fetch(`${NWIS}?${params}`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { count: 0, sites: [] };
    const data = await res.json();
    const ts = data?.value?.timeSeries || [];
    const sites = ts.slice(0, 10).map((s) => ({
      name: s.sourceInfo?.siteName,
      lat: s.sourceInfo?.geoLocation?.geogLocation?.latitude,
      lng: s.sourceInfo?.geoLocation?.geogLocation?.longitude,
      parameter: s.variable?.variableDescription,
    }));
    return { count: sites.length, sites };
  } catch {
    return { count: 0, sites: [] };
  }
}

export { haversineKm };
