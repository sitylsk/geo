/* TerraShed Explorer — interactive AI discovery map */

const $ = (id) => document.getElementById(id);
const state = {
  commodities: [],
  current: null,
  lastResult: null,
  lastAi: null,
  heatOverlay: null,
  spectralOverlay: null,
  aoiRect: null,
  targetLayer: null,
};

/* ---------- Map setup ---------- */
const map = L.map("map", { center: [-13.15, 28.6], zoom: 7, zoomControl: false, worldCopyJump: true });
L.control.zoom({ position: "bottomright" }).addTo(map);
map.createPane("overlayPane2");
map.getPane("overlayPane2").style.zIndex = 410;

function esriSat() {
  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, maxNativeZoom: 19, attribution: "Tiles © Esri, Maxar, Earthstar Geographics" },
  );
}
function esriLabels() {
  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Labels © Esri" },
  );
}
const baseLayers = {
  sat: esriSat(),
  satlabel: L.layerGroup([esriSat(), esriLabels()]),
  topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenTopoMap, OSM" }),
  dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 20, attribution: "© CARTO, OSM" }),
  street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OSM" }),
};
let activeBase = baseLayers.satlabel.addTo(map);

$("basemap").addEventListener("change", (e) => {
  map.removeLayer(activeBase);
  activeBase = baseLayers[e.target.value].addTo(map);
  activeBase.bringToBack();
});

/* ---------- Color ramps ---------- */
const PROB_STOPS = [
  [11, 29, 58],
  [31, 111, 178],
  [46, 207, 111],
  [245, 197, 66],
  [255, 138, 61],
  [255, 46, 99],
];
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const seg = t * (stops.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function paletteRamp(palette, t) {
  return ramp(palette.map(hexToRgb), t);
}

/* Bilinear sample of a grid at (u,v) in 0..1 */
function sampleGrid(grid, u, v) {
  const n = grid.length;
  const x = u * (n - 1);
  const y = v * (n - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, n - 1);
  const y1 = Math.min(y0 + 1, n - 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = grid[y0][x0] * (1 - fx) + grid[y0][x1] * fx;
  const bot = grid[y1][x0] * (1 - fx) + grid[y1][x1] * fx;
  return top * (1 - fy) + bot * fy;
}

/* Render a smooth canvas overlay from a grid + colorizer */
function gridToCanvas(grid, colorize, alpha = 230, res = 360) {
  const cv = document.createElement("canvas");
  cv.width = res;
  cv.height = res;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(res, res);
  for (let py = 0; py < res; py++) {
    for (let px = 0; px < res; px++) {
      const v = sampleGrid(grid, px / (res - 1), py / (res - 1));
      const [r, g, b] = colorize(v);
      const idx = (py * res + px) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      // fade low-probability so satellite shows through
      img.data[idx + 3] = Math.round(alpha * (0.35 + 0.65 * v));
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

/* Procedural spectral texture: distort grid by recipe id so each band looks distinct */
function spectralGrid(grid, recipeId) {
  const n = grid.length;
  const out = [];
  const salt = Array.from(recipeId).reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let j = 0; j < n; j++) {
    const row = [];
    for (let i = 0; i < n; i++) {
      const base = grid[j][i];
      const mod = 0.5 + 0.5 * Math.sin((i * 0.7 + salt) * 0.9) * Math.cos((j * 0.6 + salt) * 0.8);
      row.push(Math.max(0, Math.min(1, base * 0.6 + mod * 0.4)));
    }
    out.push(row);
  }
  return out;
}

/* ---------- AOI ---------- */
function currentAoi() {
  return {
    lat: parseFloat($("lat").value),
    lng: parseFloat($("lng").value),
    radiusKm: parseInt($("radius").value, 10),
  };
}
function boundsToLatLng(b) {
  return [
    [b.minLat, b.minLng],
    [b.maxLat, b.maxLng],
  ];
}
function drawAoiPreview() {
  const a = currentAoi();
  const dLat = a.radiusKm / 111;
  const dLng = a.radiusKm / (111 * Math.cos((a.lat * Math.PI) / 180) || 1);
  const bounds = [
    [a.lat - dLat, a.lng - dLng],
    [a.lat + dLat, a.lng + dLng],
  ];
  if (state.aoiRect) map.removeLayer(state.aoiRect);
  state.aoiRect = L.rectangle(bounds, { color: "#34d6c8", weight: 1.5, dashArray: "6 6", fill: false }).addTo(map);
}

/* ---------- Overlays ---------- */
function clearOverlays() {
  if (state.heatOverlay) map.removeLayer(state.heatOverlay);
  if (state.spectralOverlay) map.removeLayer(state.spectralOverlay);
  state.heatOverlay = null;
  state.spectralOverlay = null;
}
function renderOverlays() {
  const r = state.lastResult;
  if (!r) return;
  const bounds = boundsToLatLng(r.bounds);
  const opacity = parseInt($("opacity").value, 10) / 100;
  clearOverlays();

  const spectralId = $("spectral-select").value;
  if (spectralId) {
    const recipe = state.current.spectral.find((s) => s.id === spectralId);
    const sg = spectralGrid(r.grid, spectralId);
    const url = gridToCanvas(sg, (v) => paletteRamp(recipe.palette, v), 235, 380);
    state.spectralOverlay = L.imageOverlay(url, bounds, { opacity, pane: "overlayPane2", interactive: false }).addTo(map);
  }
  if ($("toggle-heat").checked) {
    const url = gridToCanvas(r.grid, (v) => ramp(PROB_STOPS, v), 230, 380);
    state.heatOverlay = L.imageOverlay(url, bounds, { opacity: spectralId ? opacity * 0.6 : opacity, pane: "overlayPane2", interactive: false }).addTo(map);
  }
  $("legend").classList.toggle("hidden", !$("toggle-heat").checked);
}

function renderTargets() {
  if (state.targetLayer) map.removeLayer(state.targetLayer);
  state.targetLayer = L.layerGroup();
  if (!state.lastResult || !$("toggle-targets").checked) {
    state.targetLayer.addTo(map);
    return;
  }
  const color = state.current.color;
  state.lastResult.targets.forEach((t) => {
    const tierColor = t.tier === "A" ? "#ff2e63" : t.tier === "B" ? "#ff8a3d" : "#4fb0ff";
    L.circle([t.lat, t.lng], {
      radius: t.radiusKm * 1000,
      color: tierColor,
      weight: 2,
      fillColor: tierColor,
      fillOpacity: 0.12,
    }).addTo(state.targetLayer);
    const marker = L.circleMarker([t.lat, t.lng], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: tierColor,
      fillOpacity: 1,
    }).addTo(state.targetLayer);
    marker.bindPopup(targetPopup(t));
    marker.bindTooltip(`${t.id} · ${(t.confidence * 100).toFixed(0)}%`, { permanent: true, direction: "top", className: "tlabel", offset: [0, -8] });
  });
  state.targetLayer.addTo(map);
}

function targetPopup(t) {
  const ev = Object.entries(t.evidence).map(([k, v]) => `${k}: <b>${v}</b>`).join(" · ");
  return `<div class="tpop"><h4>${t.id} — Tier ${t.tier}</h4>
    <div class="pmeta">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)} · halo ~${t.radiusKm} km</div>
    <div class="pmeta" style="margin-top:6px">Confidence: <b>${(t.confidence * 100).toFixed(0)}%</b></div>
    <div class="pmeta" style="margin-top:6px">${t.anomaly}</div>
    <div class="pmeta" style="margin-top:6px">${ev}</div>
    <div class="pmeta" style="margin-top:6px"><b>Next:</b> ${t.recommendedAction}</div></div>`;
}

/* ---------- Status ---------- */
function setStatus(text, busy = false) {
  const el = $("status");
  if (!text) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = busy ? `<span class="spinner"></span>${text}` : text;
}

/* ---------- Results rendering ---------- */
function openResults() {
  document.querySelector(".explorer-shell").classList.add("results-open");
}
function closeResults() {
  document.querySelector(".explorer-shell").classList.remove("results-open");
}
$("results-close").addEventListener("click", closeResults);
$("results-toggle").addEventListener("click", openResults);

function renderResults(result, ai) {
  openResults();
  $("results-toggle").classList.remove("hidden");
  const body = $("results-body");
  const c = result.commodity;
  const tA = result.targets.filter((t) => t.tier === "A").length;

  let html = `<div class="summary-card">
    <div class="row"><span>Commodity</span><b style="color:${c.color}">${c.name}</b></div>
    <div class="row"><span>Targets found</span><b>${result.targets.length} (${tA} Tier-A)</b></div>
    <div class="row"><span>Pathfinders</span><b>${c.pathfinders.join(", ")}</b></div>
    <div class="row"><span>Grid</span><b>${result.gridSize}×${result.gridSize}</b></div>
  </div>`;

  html += `<div class="section-label">Ranked targets</div>`;
  result.targets.forEach((t) => {
    const evTags = Object.entries(t.evidence).map(([k, v]) => `<span class="et">${k}: ${v}</span>`).join("");
    html += `<div class="target-item" data-lat="${t.lat}" data-lng="${t.lng}">
      <div class="ti-head"><span class="tid">${t.id}</span><span class="tier ${t.tier}">Tier ${t.tier} · ${(t.confidence * 100).toFixed(0)}%</span></div>
      <div class="conf-bar"><i style="width:${t.confidence * 100}%"></i></div>
      <div class="meta">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)} · halo ~${t.radiusKm} km</div>
      <div class="anom">${t.anomaly}</div>
      <div class="evidence-tags">${evTags}</div>
    </div>`;
  });

  if (ai) {
    const prov = ai.providers;
    const simNote = ai.simulated
      ? `<span class="tag simulated">simulated</span>`
      : "";
    html += `<div class="section-label">Dual-AI fusion pipeline ${simNote}</div>`;
    html += `<div class="final-card">${escapeHtml(ai.final)}</div>`;
    html += `<div class="section-label">Pipeline stages</div>`;
    const stages = ai.stages;
    html += aiBlock("1 · Claude analysis", stages.analysisA, "claude");
    html += aiBlock("2 · GPT analysis", stages.analysisB, "gpt");
    html += aiBlock("3 · First synthesis", stages.synthesis1, "fused");
    html += aiBlock("4 · Claude re-analysis", stages.reAnalysisA, "claude");
    html += aiBlock("5 · GPT re-analysis", stages.reAnalysisB, "gpt");
    html += aiBlock("6 · Final fused brief", stages.finalAssessment, "fused");
    html += `<p class="disclaimer" style="margin-top:14px">Models — Claude: ${prov.anthropicModel} (${prov.anthropic ? "live" : "simulated"}); GPT: ${prov.openaiModel} (${prov.openai ? "live" : "simulated"}).</p>`;
  }

  body.innerHTML = html;
  body.querySelectorAll(".target-item").forEach((el) => {
    el.addEventListener("click", () => {
      map.flyTo([parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)], 12, { duration: 0.8 });
    });
  });
}

function aiBlock(title, stage, kind) {
  const tag = stage.simulated ? `<span class="tag simulated">sim</span>` : `<span class="tag ${kind}">${kind}</span>`;
  return `<details class="ai-block"><summary>${title}${tag}</summary><div class="body">${escapeHtml(stage.text)}</div></details>`;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

/* ---------- Actions ---------- */
async function runScan(withAi) {
  const aoi = currentAoi();
  if (Number.isNaN(aoi.lat) || Number.isNaN(aoi.lng)) {
    setStatus("Enter valid coordinates");
    return;
  }
  const payload = {
    commodityId: $("commodity").value,
    aoi,
    gridSize: parseInt($("grid").value, 10),
    maxTargets: parseInt($("maxTargets").value, 10),
    aoiLabel: `${aoi.lat.toFixed(3)}, ${aoi.lng.toFixed(3)} (r=${aoi.radiusKm}km)`,
  };
  try {
    setStatus(withAi ? "Running dual-AI deep analysis…" : "Computing prospectivity…", true);
    const res = await fetch(withAi ? "/api/analyze" : "/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const data = await res.json();
    const result = withAi ? data.engine : data;
    const ai = withAi ? data.ai : null;
    state.lastResult = result;
    state.lastAi = ai;
    map.fitBounds(boundsToLatLng(result.bounds), { padding: [40, 40] });
    renderOverlays();
    renderTargets();
    renderResults(result, ai);
    setStatus(`${result.targets.length} targets · top ${(result.targets[0]?.confidence * 100 || 0).toFixed(0)}% confidence`);
    setTimeout(() => setStatus(""), 4000);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

$("scan-btn").addEventListener("click", () => runScan(false));
$("analyze-btn").addEventListener("click", () => runScan(true));

/* ---------- Layer toggles ---------- */
$("toggle-heat").addEventListener("change", renderOverlays);
$("toggle-targets").addEventListener("change", renderTargets);
$("spectral-select").addEventListener("change", renderOverlays);
$("opacity").addEventListener("input", () => {
  $("opacity-val").textContent = $("opacity").value;
  if (state.heatOverlay || state.spectralOverlay) renderOverlays();
});
$("radius").addEventListener("input", () => {
  $("radius-val").textContent = $("radius").value;
  drawAoiPreview();
});
["lat", "lng"].forEach((id) => $(id).addEventListener("change", drawAoiPreview));

map.on("click", (e) => {
  $("lat").value = e.latlng.lat.toFixed(4);
  $("lng").value = e.latlng.lng.toFixed(4);
  drawAoiPreview();
});

/* ---------- Commodity dropdown ---------- */
function setCommodity(id) {
  state.current = state.commodities.find((c) => c.id === id) || state.commodities[0];
  $("commodity-model").textContent = state.current.depositModel;
  const sel = $("spectral-select");
  sel.innerHTML = `<option value="">None (true-colour satellite)</option>`;
  state.current.spectral.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.label;
    sel.appendChild(o);
  });
}

async function init() {
  // provider badge
  try {
    const h = await (await fetch("/api/health")).json();
    const badge = $("provider-badge");
    const live = h.providers.anthropic || h.providers.openai;
    badge.textContent = live
      ? `${h.providers.anthropic ? "Claude" : ""}${h.providers.anthropic && h.providers.openai ? " + " : ""}${h.providers.openai ? "GPT" : ""} live`
      : "Demo AI (no keys)";
    badge.classList.add(live ? "live" : "sim");
  } catch {
    $("provider-badge").textContent = "offline";
  }

  const data = await (await fetch("/api/commodities")).json();
  state.commodities = data.commodities;
  const sel = $("commodity");
  const byCat = {};
  data.categories.forEach((cat) => (byCat[cat.id] = { name: cat.name, items: [] }));
  data.commodities.forEach((c) => byCat[c.category]?.items.push(c));
  Object.values(byCat).forEach((g) => {
    if (!g.items.length) return;
    const og = document.createElement("optgroup");
    og.label = g.name;
    g.items.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });

  const params = new URLSearchParams(location.search);
  const pre = params.get("commodity");
  if (pre && data.commodities.some((c) => c.id === pre)) sel.value = pre;
  setCommodity(sel.value);
  sel.addEventListener("change", () => {
    setCommodity(sel.value);
    if (state.lastResult) runScan(false);
  });

  drawAoiPreview();
}

/* ---------- Export ---------- */
$("export-geojson").addEventListener("click", () => {
  if (!state.lastResult) return setStatus("Run a scan first");
  const r = state.lastResult;
  const fc = {
    type: "FeatureCollection",
    properties: { commodity: r.commodity.name, generatedAt: r.generatedAt },
    features: [
      {
        type: "Feature",
        properties: { kind: "aoi", commodity: r.commodity.name },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [r.bounds.minLng, r.bounds.minLat],
            [r.bounds.maxLng, r.bounds.minLat],
            [r.bounds.maxLng, r.bounds.maxLat],
            [r.bounds.minLng, r.bounds.maxLat],
            [r.bounds.minLng, r.bounds.minLat],
          ]],
        },
      },
      ...r.targets.map((t) => ({
        type: "Feature",
        properties: { id: t.id, tier: t.tier, confidence: t.confidence, radiusKm: t.radiusKm, anomaly: t.anomaly, action: t.recommendedAction },
        geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      })),
    ],
  };
  download(`terrashed_${r.commodity.id}.geojson`, JSON.stringify(fc, null, 2));
});

$("export-report").addEventListener("click", () => {
  if (!state.lastResult) return setStatus("Run a scan first");
  const r = state.lastResult;
  let txt = `TerraShed Explorer — Target Report\nCommodity: ${r.commodity.name}\nGenerated: ${r.generatedAt}\n\n`;
  txt += `Deposit model: ${r.commodity.depositModel}\nPathfinders: ${r.commodity.pathfinders.join(", ")}\n\nRANKED TARGETS\n`;
  r.targets.forEach((t) => {
    txt += `\n${t.id} [Tier ${t.tier}] ${(t.confidence * 100).toFixed(0)}%\n  ${t.lat}, ${t.lng} (halo ~${t.radiusKm} km)\n  ${t.anomaly}\n  Next: ${t.recommendedAction}\n`;
  });
  if (state.lastAi) {
    txt += `\n\n=== DUAL-AI FINAL BRIEF ===\n${state.lastAi.final}\n`;
  }
  download(`terrashed_${r.commodity.id}_report.txt`, txt);
});

function download(name, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

init();
