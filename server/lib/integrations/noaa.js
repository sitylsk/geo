// NOAA — IGRF/WMM magnetic field (Swarm-calibrated global model).

import geomagnetism from "geomagnetism";

export function fetchNoaaIgrf(lat, lng) {
  const model = geomagnetism.model();
  const m = model.point([lng, lat]);
  return {
    source: "NOAA WMM-2025 / IGRF-class (Swarm-calibrated)",
    totalFieldN: Math.round(m.f),
    horizontalN: Math.round(m.h),
    verticalN: Math.round(m.z),
    inclinationDeg: Number(m.incl.toFixed(2)),
    declinationDeg: Number(m.decl.toFixed(2)),
    note: "Main geomagnetic field — regional anomaly grids (EMAG2) planned for next release.",
  };
}
