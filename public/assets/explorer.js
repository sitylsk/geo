/* Anthill Explorer */

const $ = (id) => document.getElementById(id);
const state = {
  commodities: [],
  current: null,
  lastResult: null,
  lastAi: null,
  documents: [],
  lastDiscovery: null,
  heatOverlay: null,
  aoiRect: null,
  targetLayer: null,
};

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

const LAYER_RAMPS = {
  magnetic: [[8,12,28],[20,40,100],[60,100,200],[140,180,255],[220,230,255]],
  gravity: [[12,10,8],[40,35,25],[80,65,45],[130,100,60],[200,170,100]],
  geochem: [[10,20,8],[40,90,30],[120,180,50],[200,140,40],[255,220,80]],
  thermal: [[8,8,40],[40,20,120],[180,40,40],[255,120,40],[255,220,120]],
  moisture: [[20,30,60],[30,80,140],[40,160,200],[80,220,220],[200,255,255]],
  xray: [[5,0,20],[40,0,80],[120,0,160],[220,60,40],[255,220,80]],
};

const SUBSURFACE_STOPS = [
  [10, 8, 32],
  [42, 24, 96],
  [106, 58, 209],
  [176, 111, 255],
  [232, 208, 255],
];

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
      img.data[idx + 3] = Math.round(alpha * (0.35 + 0.65 * v));
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

function currentAoi() {
  return {
    lat: parseFloat($("lat").value),
    lng: parseFloat($("lng").value),
    radiusKm: parseInt($("radius").value, 10),
  };
}
function boundsToLatLng(b) {
  return [[b.minLat, b.minLng], [b.maxLat, b.maxLng]];
}
function drawAoiPreview() {
  const a = currentAoi();
  const dLat = a.radiusKm / 111;
  const dLng = a.radiusKm / (111 * Math.cos((a.lat * Math.PI) / 180) || 1);
  const bounds = [[a.lat - dLat, a.lng - dLng], [a.lat + dLat, a.lng + dLng]];
  if (state.aoiRect) map.removeLayer(state.aoiRect);
  state.aoiRect = L.rectangle(bounds, { color: "#34d6c8", weight: 1.5, dashArray: "6 6", fill: false }).addTo(map);
}

function getActiveGrid(result) {
  const view = $("layer-view")?.value || "target";
  if (view === "target") return { grid: result.grid, ramp: PROB_STOPS };
  if (view === "subsurface" && result.subsurfaceGrid) return { grid: result.subsurfaceGrid, ramp: SUBSURFACE_STOPS };
  const xs = result.xrayStack;
  if (!xs?.active) return { grid: result.grid, ramp: PROB_STOPS };
  const map = {
    magnetic: xs.layers?.magnetic?.grid,
    gravity: xs.layers?.gravity?.grid,
    geochem: xs.layers?.geochem?.grid,
    thermal: xs.layers?.thermal?.grid,
    moisture: xs.layers?.moisture?.grid,
    xray: xs.layers?.xray?.grid,
    "depth-shallow": xs.depthSlices?.shallow?.grid,
    "depth-mid": xs.depthSlices?.mid?.grid,
    "depth-deep": xs.depthSlices?.deep?.grid,
    "depth-basement": xs.depthSlices?.basement?.grid,
  };
  const layerKey = view.startsWith("depth-") ? view : view;
  const grid = map[layerKey] || map[view.replace("depth-", "")] || result.grid;
  const ramp = LAYER_RAMPS[view] || LAYER_RAMPS.xray || PROB_STOPS;
  return { grid: grid || result.grid, ramp };
}

function clearOverlays() {
  if (state.heatOverlay) map.removeLayer(state.heatOverlay);
  state.heatOverlay = null;
}
function renderOverlays() {
  const r = state.lastResult;
  if (!r) return;
  const bounds = boundsToLatLng(r.bounds);
  const opacity = parseInt($("opacity").value, 10) / 100;
  clearOverlays();
  if ($("toggle-heat").checked) {
    const { grid, ramp: activeRamp } = getActiveGrid(r);
    const url = gridToCanvas(grid, (v) => ramp(activeRamp, v), 230, 380);
    state.heatOverlay = L.imageOverlay(url, bounds, { opacity, pane: "overlayPane2", interactive: false }).addTo(map);
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
  return `<div class="tpop"><h4>${t.id} - Priority ${t.tier}</h4>
    <div class="pmeta">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)} · search halo ~${t.radiusKm} km</div>
    <div class="pmeta" style="margin-top:6px">Confidence: <b>${(t.confidence * 100).toFixed(0)}%</b></div></div>`;
}

function setStatus(text, busy = false) {
  const el = $("status");
  if (!text) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.innerHTML = busy ? `<span class="spinner"></span>${text}` : text;
}

function openResults() { document.querySelector(".explorer-shell").classList.add("results-open"); }
function closeResults() { document.querySelector(".explorer-shell").classList.remove("results-open"); }
$("results-close").addEventListener("click", closeResults);
$("results-toggle").addEventListener("click", openResults);

function renderResults(result, ai) {
  openResults();
  $("results-toggle").classList.remove("hidden");
  const body = $("results-body");
  const c = result.commodity;
  const tA = result.targets.filter((t) => t.tier === "A").length;

  let html = `<div class="summary-card">
    <div class="row"><span>Resource</span><b style="color:${c.color}">${c.name}</b></div>
    <div class="row"><span>Targets</span><b>${result.targets.length} (${tA} priority A)</b></div>
  </div>`;
  if (result.xrayStack?.active) {
    html += `<div class="coverage-badge">X-ray stack active - magnetics, gravity, geochem, thermal, L-band fused with depth slices</div>`;
  } else if (result.deepScan?.active) {
    html += `<div class="coverage-badge">L-band deep scan · ${result.deepScan.palsarScenes} PALSAR scene(s) · ${result.deepScan.penetration}</div>`;
  }
  if (result.dataDriven) {
    const dc = result.dataConfidence || {};
    html += `<div class="coverage-badge data-badge">Data-driven model · DEM ${dc.dem ? "live" : "n/a"} · geology ${dc.geology || 0} pts · ${dc.knownDeposits || 0} known deposits · ${dc.seismic || 0} seismic${dc.drillHits ? ` · ${dc.drillHits} drill hit(s)` : ""}</div>`;
  }
  if (result.hostRock) {
    html += `<div class="hostrock-card"><div class="hr-top"><span>Host rock (real geology)</span><b>${Math.round(result.hostRock.score * 100)}% match</b></div><div class="hr-meta">${escapeHtml(result.hostRock.lith || "")}${result.hostRock.age ? " &middot; " + escapeHtml(result.hostRock.age) : ""}</div><div class="hr-note">${escapeHtml(result.hostRock.note || "")}</div></div>`;
  }
  if (result.validation?.available) {
    const v = result.validation;
    html += `<div class="validation-card"><div class="vrow"><span>Model validation (known deposits)</span><b>AUC ${v.auc}</b></div>`;
    html += `<div class="vbar"><i style="width:${Math.round(v.auc * 100)}%"></i></div>`;
    html += `<div class="vmeta">Captures ${Math.round((v.captureEfficiency.top10pct || 0) * 100)}% of known deposits in top 10% of ranked ground (${v.knownDeposits} positives).</div>`;
    if (result.spatialValidation?.available) {
      html += `<div class="vmeta" style="margin-top:6px">Spatial hold-out AUC <b>${result.spatialValidation.spatialAuc}</b> across ${result.spatialValidation.folds} blocks (more honest than in-sample).</div>`;
    }
    if (v.caveat) html += `<div class="vcaveat">${v.caveat}</div>`;
    html += `</div>`;
  } else if (result.validation) {
    html += `<div class="coverage-badge">Validation: ${result.validation.reason}</div>`;
  }

  html += `<div class="section-label">Ranked targets</div>`;
  result.targets.forEach((t) => {
    html += `<div class="target-item" data-lat="${t.lat}" data-lng="${t.lng}">
      <div class="ti-head"><span class="tid">${t.id}</span><span class="tier ${t.tier}">Priority ${t.tier} · ${(t.confidence * 100).toFixed(0)}%</span></div>
      <div class="conf-bar"><i style="width:${t.confidence * 100}%"></i></div>
      <div class="meta">${t.lat.toFixed(4)}, ${t.lng.toFixed(4)} · halo ~${t.radiusKm} km</div>
      ${t.realEvidence ? `<div class="ev-chips">${Object.entries(t.realEvidence).map(([k, val]) => `<span class="ev-chip" title="${k}">${labelEv(k)}: ${val}</span>`).join("")}</div>` : ""}
    </div>`;
  });

  if (ai?.summary) {
    const note = ai.simulated
      ? `<div class="brief-note">Grounded analysis from live free data feeds and the geological knowledge base. Add an AI key for an additional model-fusion pass.</div>`
      : `<div class="brief-note">AI-fused analysis by ${ai.model || "GPT-5"}${ai.webSearch ? " with live web search" : ""}, grounded on the data feeds and geological knowledge base.</div>`;
    html += `<div class="section-label">Intelligence brief</div>`;
    html += note;
    html += `<div class="final-card">${renderBrief(ai.summary)}</div>`;
    if (ai.citations && ai.citations.length) {
      html += `<div class="section-label">Sources (web search)</div>`;
      html += `<div class="cite-list">${ai.citations.slice(0, 12).map((c) => `<a href="${c.url}" target="_blank" rel="noopener" class="cite">${escapeHtml(c.title || c.url)}</a>`).join("")}</div>`;
    }
  }

  body.innerHTML = html;
  body.querySelectorAll(".target-item").forEach((el) => {
    el.addEventListener("click", () => {
      map.flyTo([parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)], 12, { duration: 0.8 });
    });
  });
}

function renderBrief(md) {
  const safe = escapeHtml(md);
  const lines = safe.split("\n");
  let out = "";
  let inList = false;
  for (let raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^# /.test(line)) { if (inList) { out += "</ul>"; inList = false; } out += `<h3 class="brief-h1">${line.slice(2)}</h3>`; }
    else if (/^## /.test(line)) { if (inList) { out += "</ul>"; inList = false; } out += `<h4 class="brief-h2">${line.slice(3)}</h4>`; }
    else if (/^- /.test(line)) { if (!inList) { out += "<ul class=\"brief-ul\">"; inList = true; } out += `<li>${line.slice(2)}</li>`; }
    else if (/\|/.test(line) && line.split("|").length >= 3) {
      if (inList) { out += "</ul>"; inList = false; }
      const cells = line.split("|").map((c) => c.trim());
      out += `<div class="brief-trow">${cells.map((c) => `<span>${c}</span>`).join("")}</div>`;
    }
    else if (line.trim() === "") { if (inList) { out += "</ul>"; inList = false; } }
    else { if (inList) { out += "</ul>"; inList = false; } out += `<p>${line}</p>`; }
  }
  if (inList) out += "</ul>";
  return out;
}

function labelEv(k) {
  return ({ structuralComplexity: "Structure", knownDepositProximity: "Nearby deposits", seismicPlumbing: "Seismic", tectonicSetting: "Tectonic" })[k] || k;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}



/* ---- Operator document upload (read client-side, free) ---- */
const TEXT_EXT = /\.(txt|csv|tsv|json|md|log|geojson)$/i;
function renderDocList() {
  const el = $("doc-list");
  if (!el) return;
  if (!state.documents.length) { el.innerHTML = ""; return; }
  el.innerHTML = state.documents
    .map((d, i) => `<div class="doc-item"><span>${d.name}</span><button data-i="${i}" class="doc-rm">x</button></div>`)
    .join("");
  el.querySelectorAll(".doc-rm").forEach((b) =>
    b.addEventListener("click", () => {
      state.documents.splice(parseInt(b.dataset.i, 10), 1);
      renderDocList();
    }),
  );
}
const docInput = $("doc-input");
if (docInput) {
  docInput.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      if (state.documents.length >= 12) break;
      let text = "";
      if (TEXT_EXT.test(f.name) && f.size < 2_000_000) {
        try { text = await f.text(); } catch { text = ""; }
      }
      state.documents.push({ name: f.name, type: f.type || "text", text });
    }
    renderDocList();
    e.target.value = "";
  });
}


/* ---- "What is here" multi-resource discovery ---- */
let discoverMarkers = null;

const CAT_COLORS = { precious: "#f5c542", base: "#4fb0ff", gemstone: "#ff6fd8", critical: "#9b8cff", energy: "#ff8a3d", water: "#34d6c8" };

async function runDiscover() {
  const place = $("discover-place").value.trim();
  if (!place) { setStatus("Type a place first"); return; }
  setStatus(`Discovering what is at ${place} (web search, up to ~1 min)...`, true);
  try {
    const res = await fetch("/api/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ place }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Discovery failed");
    state.lastDiscovery = d;
    $("lat").value = d.location.lat.toFixed(4);
    $("lng").value = d.location.lng.toFixed(4);
    drawAoiPreview();
    map.flyTo([d.location.lat, d.location.lng], 8, { duration: 0.8 });
    plotDiscovery(d);
    renderDiscovery(d);
    setStatus(`${d.topResources.length || d.ranked.length} resources assessed at ${d.location.label}`);
    setTimeout(() => setStatus(""), 4000);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

function plotDiscovery(d) {
  if (discoverMarkers) map.removeLayer(discoverMarkers);
  discoverMarkers = L.layerGroup();
  (d.ranked || []).filter((r) => r.confidence >= 0.5).slice(0, 8).forEach((r) => {
    const color = CAT_COLORS[r.category] || r.color || "#34d6c8";
    L.circleMarker([r.point.lat, r.point.lng], {
      radius: 6 + r.confidence * 8,
      color: "#fff", weight: 1.5, fillColor: color, fillOpacity: 0.85,
    }).addTo(discoverMarkers)
      .bindTooltip(`${r.name} ${(r.confidence * 100).toFixed(0)}%`, { permanent: false, direction: "top" });
  });
  discoverMarkers.addTo(map);
}

function renderDiscovery(d) {
  openResults();
  $("results-toggle").classList.remove("hidden");
  const body = $("results-body");
  let html = `<div class="summary-card">
    <div class="row"><span>Location</span><b>${escapeHtml(d.location.label)}</b></div>
    <div class="row"><span>Coordinates</span><b>${d.location.lat.toFixed(4)}, ${d.location.lng.toFixed(4)}</b></div>
    <div class="row"><span>Known occurrences</span><b>${d.knownDeposits.length}</b></div>
  </div>`;

  html += `<div class="section-label">What is most likely here</div>`;
  (d.ranked || []).slice(0, 8).forEach((r) => {
    const color = CAT_COLORS[r.category] || r.color;
    html += `<div class="disc-item" data-lat="${r.point.lat}" data-lng="${r.point.lng}">
      <div class="disc-head"><span class="disc-dot" style="background:${color}"></span><span class="disc-name">${r.name}</span><span class="disc-pct">${(r.confidence * 100).toFixed(0)}%</span></div>
      <div class="conf-bar"><i style="width:${r.confidence * 100}%;background:${color}"></i></div>
      <div class="meta">${r.point.lat.toFixed(4)}, ${r.point.lng.toFixed(4)}${r.documentedOccurrences ? ` &middot; ${r.documentedOccurrences} documented` : ""}</div>
      <div class="disc-why">${escapeHtml(r.rationale)}</div>
    </div>`;
  });

  if (d.knownDeposits && d.knownDeposits.length) {
    html += `<div class="section-label">Documented occurrences nearby</div>`;
    html += `<div class="cite-list">${d.knownDeposits.slice(0, 8).map((x) => `<div class="known-row">${escapeHtml(x.name || "Occurrence")} <span>${escapeHtml(x.commodity || "")} &middot; ${x.distanceKm} km</span></div>`).join("")}</div>`;
  }

  if (d.narrative) {
    html += `<div class="section-label">Geological brief${d.model ? " &middot; " + d.model : ""}</div>`;
    html += `<div class="final-card">${renderBrief(d.narrative)}</div>`;
    if (d.citations && d.citations.length) {
      html += `<div class="cite-list">${d.citations.slice(0, 10).map((c) => `<a href="${c.url}" target="_blank" rel="noopener" class="cite">${escapeHtml(c.title || c.url)}</a>`).join("")}</div>`;
    }
  }

  body.innerHTML = html;
  body.querySelectorAll(".disc-item").forEach((el) => {
    el.addEventListener("click", () => map.flyTo([parseFloat(el.dataset.lat), parseFloat(el.dataset.lng)], 11, { duration: 0.8 }));
  });
}

async function fetchIntelligence(aoi, commodityId) {
  try {
    const res = await fetch("/api/intelligence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aoi, commodityId, radiusKm: aoi.radiusKm }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function renderIntelligence(intel) {
  if (!intel) return "";
  const eq = intel.seismic?.iris?.events?.slice(0, 3) || [];
  const mrds = intel.deposits?.mrdsNearby?.slice(0, 5) || [];
  const prices = intel.commodities?.spotPrices?.prices?.slice(0, 4) || [];
  const demand = intel.commodities?.demandForecast?.demandIndex;
  let html = `<div class="section-label">Regional intelligence</div>`;
  html += `<div class="intel-grid">`;
  html += `<div class="intel-card"><h4>🌍 USGS MRDS</h4><p>${intel.usgs?.mineralDeposits?.count || 0} known deposits in search area</p>`;
  mrds.forEach((d) => { html += `<div class="intel-row">${d.name} · ${d.commodity} · ${d.distanceKm} km</div>`; });
  html += `</div>`;
  html += `<div class="intel-card"><h4>🧭 Seismicity</h4><p>IRIS: ${intel.seismic?.iris?.count || 0} events · USGS: ${intel.usgs?.earthquakes?.count || 0}</p>`;
  eq.forEach((e) => { html += `<div class="intel-row">M${e.magnitude} · ${e.location || "regional"}</div>`; });
  html += `</div>`;
  html += `<div class="intel-card"><h4>📡 Magnetics</h4><p>${intel.noaa?.magnetic?.totalFieldN} nT · decl ${intel.noaa?.magnetic?.declinationDeg}°</p></div>`;
  html += `<div class="intel-card"><h4>🔥 Climate / soil</h4><p>Elev ${intel.openMeteo?.elevationM} m · soil ${intel.openMeteo?.soilTemp?.surface0cm}°C → ${intel.openMeteo?.soilTemp?.deep54cm}°C</p></div>`;
  html += `<div class="intel-card"><h4>🧭 Tectonics</h4><p>${intel.tectonics?.nearestBoundary?.plateBoundary || " - "} boundary · ${intel.tectonics?.nearestBoundary?.distanceKm || " - "} km</p></div>`;
  html += `<div class="intel-card"><h4>💰 Commodity prices</h4><p>${intel.commodities?.spotPrices?.source}</p>`;
  prices.forEach((p) => { html += `<div class="intel-row">${p.name || p.metal}: $${typeof p.usd === "number" ? p.usd.toFixed(2) : p.usd}</div>`; });
  html += `</div>`;
  if (demand) {
    html += `<div class="intel-card"><h4>📈 IEA demand index</h4><p>2024→2040: ${demand["2024"]} → ${demand["2040"]}</p><p class="intel-note">${intel.commodities?.supplyChain || ""}</p></div>`;
  }
  const li = intel.deposits?.lithiumIntelligence?.nearby?.slice(0, 3) || [];
  if (li.length) {
    html += `<div class="intel-card"><h4>🔋 Lithium KB</h4>`;
    li.forEach((d) => { html += `<div class="intel-row">${d.name} · ${d.distanceKm} km</div>`; });
    html += `</div>`;
  }
  const eonet = intel.nasa?.environmentalEvents?.events?.slice(0, 3) || [];
  if (eonet.length) {
    html += `<div class="intel-card"><h4>🛰️ NASA EONET</h4>`;
    eonet.forEach((e) => { html += `<div class="intel-row">${e.title}</div>`; });
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

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
    aoiLabel: `${aoi.lat.toFixed(3)}, ${aoi.lng.toFixed(3)}`,
    deepScan: $("deep-scan").checked || $("xray-scan").checked,
    xrayScan: $("xray-scan").checked,
    documents: withAi ? state.documents : undefined,
  };
  try {
    setStatus(withAi ? "Generating deep AI analysis (web search, up to ~2 min)…" : "Scanning…", true);
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
    const subToggle = $("toggle-subsurface");
    if (result.xrayStack?.active || (result.deepScan?.active && result.subsurfaceGrid)) {
      subToggle.disabled = false;
      subToggle.checked = true;
    } else if (!$("deep-scan").checked) {
      subToggle.disabled = true;
      subToggle.checked = false;
    }
    map.fitBounds(boundsToLatLng(result.bounds), { padding: [40, 40] });
    renderOverlays();
    renderTargets();
    renderResults(result, ai);
    let intel = withAi ? data.intel : null;
    if (!intel) {
      setStatus("Loading regional intelligence…", true);
      intel = await fetchIntelligence(aoi, $("commodity").value);
    }
    if (intel) {
      $("results-body").insertAdjacentHTML("beforeend", renderIntelligence(intel));
    }
    setStatus(`${result.targets.length} targets found`);
    setTimeout(() => setStatus(""), 3500);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  }
}

$("discover-btn").addEventListener("click", runDiscover);
$("discover-place").addEventListener("keydown", (e) => { if (e.key === "Enter") runDiscover(); });
$("scan-btn").addEventListener("click", () => runScan(false));
$("analyze-btn").addEventListener("click", () => runScan(true));

$("deep-scan").addEventListener("change", () => {
  const sub = $("toggle-subsurface");
  sub.disabled = !$("deep-scan").checked;
  if (!$("deep-scan").checked) sub.checked = false;
});
$("layer-view").addEventListener("change", renderOverlays);
$("toggle-subsurface").addEventListener("change", renderOverlays);
$("toggle-heat").addEventListener("change", renderOverlays);
$("toggle-targets").addEventListener("change", renderTargets);
$("opacity").addEventListener("input", () => {
  $("opacity-val").textContent = $("opacity").value;
  if (state.heatOverlay) renderOverlays();
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

function setCommodity(id) {
  state.current = state.commodities.find((c) => c.id === id) || state.commodities[0];
}

async function init() {
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

$("export-geojson").addEventListener("click", () => {
  if (!state.lastResult) return setStatus("Run a scan first");
  const r = state.lastResult;
  const fc = {
    type: "FeatureCollection",
    properties: { resource: r.commodity.name, generatedAt: r.generatedAt },
    features: [
      {
        type: "Feature",
        properties: { kind: "search-area", resource: r.commodity.name },
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
        properties: { id: t.id, tier: t.tier, confidence: t.confidence, radiusKm: t.radiusKm },
        geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      })),
    ],
  };
  download(`anthill_${r.commodity.id}.geojson`, JSON.stringify(fc, null, 2));
});

$("export-report").addEventListener("click", () => {
  if (!state.lastResult) return setStatus("Run a scan first");
  const r = state.lastResult;
  let txt = `Anthill - Target Report\nResource: ${r.commodity.name}\nGenerated: ${r.generatedAt}\n\nRANKED TARGETS\n`;
  r.targets.forEach((t) => {
    txt += `\n${t.id} [Priority ${t.tier}] ${(t.confidence * 100).toFixed(0)}%\n  ${t.lat}, ${t.lng} (halo ~${t.radiusKm} km)\n`;
  });
  if (state.lastAi?.summary) {
    txt += `\n\n=== INTELLIGENCE BRIEF ===\n${state.lastAi.summary}\n`;
  }
  download(`anthill_${r.commodity.id}_report.txt`, txt);
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
