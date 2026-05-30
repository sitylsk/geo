const targets = [
  {
    id: 1,
    name: "Chifunabuli Structural Anomaly",
    province: "Luapula Province",
    lat: -11.35,
    lng: 29.15,
    color: "#ff4fa3",
    signature: "Magnetic quiet zone with possible arsenic-iron alteration halo",
    visualCue: "Linear magenta/pink anomaly and canopy breaks in dense Miombo forest",
    geology:
      "Interpreted basement splay target beneath laterite, vegetation, and soil cover.",
  },
  {
    id: 2,
    name: "Southern Kapiri Mposhi Kalahari Cover",
    province: "Central Province",
    lat: -14.45,
    lng: 28.8,
    color: "#fbbf24",
    signature: "Buried zig-zag structural intersection under Kalahari cover",
    visualCue: "Subtle circular pans or shallow depressions aligned northeast",
    geology:
      "Covered structural-jog target where ferricrete and waterlogging may mark buried faults.",
  },
  {
    id: 3,
    name: "Eastern Irumide Root Zone",
    province: "Eastern Province, west of Chipata",
    lat: -13.65,
    lng: 32.1,
    color: "#fb553c",
    signature: "Chaotic magnetic ridges with structural breaks in possible BIF hosts",
    visualCue: "Neon orange/red ridge-top gossan-style caps",
    geology:
      "High-grade metamorphic shear-zone target with sulphidic orogenic-gold style hypothesis.",
  },
  {
    id: 4,
    name: "Kabompo Dome Margin",
    province: "North-Western Province",
    lat: -11.65,
    lng: 24.5,
    color: "#38bdf8",
    signature: "Sharp gravity-gradient margin and bent magnetic contour target",
    visualCue: "Triangular rocky spurs with rust-red vegetation-free scars",
    geology:
      "Brittle-ductile dome-margin target where mineralization may become structurally controlled.",
  },
];

const map = L.map("map", {
  center: [-13.15, 28.6],
  zoom: 6,
  zoomControl: false,
  worldCopyJump: true,
});

L.control.zoom({ position: "bottomright" }).addTo(map);
map.createPane("targetCircles");
map.getPane("targetCircles").style.zIndex = 430;

const attribution =
  'Map data &copy; contributors. Imagery providers retain all rights.';

function esriSatelliteLayer() {
  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: `${attribution} Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS user community.`,
      maxZoom: 19,
      maxNativeZoom: 19,
    },
  );
}

function esriLabelLayer() {
  return L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Labels &copy; Esri",
      maxZoom: 19,
      maxNativeZoom: 19,
    },
  );
}

const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  attribution:
    'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style: &copy; OpenTopoMap',
  maxZoom: 17,
});

const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
});

const voyager = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    detectRetina: true,
    maxZoom: 20,
  },
);

const dark = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    detectRetina: true,
    maxZoom: 20,
  },
);

const satellite = esriSatelliteLayer();
const satelliteWithLabels = L.layerGroup([esriSatelliteLayer(), esriLabelLayer()]).addTo(map);

const targetLayer = L.layerGroup().addTo(map);
const circleLayer = L.layerGroup().addTo(map);
let bufferRadiusKm = 25;
const markerIndex = new Map();

const baseLayers = {
  "HD satellite + labels": satelliteWithLabels,
  "HD satellite only": satellite,
  "Google-like streets": voyager,
  "Topographic relief": topo,
  "OpenStreetMap": street,
  "Dark contrast": dark,
};

const overlays = {
  "Target markers": targetLayer,
  "Colored target circles": circleLayer,
};

L.control.layers(baseLayers, overlays, { collapsed: false, position: "topright" }).addTo(map);

const zambiaFocusBounds = L.latLngBounds([
  [-18.1, 21.7],
  [-8.0, 33.9],
]);

const focusFrame = L.rectangle(zambiaFocusBounds, {
  color: "#ffffff",
  dashArray: "8 12",
  fill: false,
  opacity: 0.36,
  weight: 1,
}).addTo(map);
focusFrame.bindTooltip("Zambia focus area", { sticky: true });

function popupForTarget(target) {
  return `
    <h3 class="popup-title">${target.id}. ${target.name}</h3>
    <p class="popup-detail"><strong>Province:</strong> ${target.province}</p>
    <p class="popup-detail"><strong>Signature:</strong> ${target.signature}</p>
    <p class="popup-detail"><strong>Satellite cue:</strong> ${target.visualCue}</p>
    <p class="popup-detail"><strong>Context:</strong> ${target.geology}</p>
    <span class="popup-coordinate">${formatCoord(target.lat, target.lng)}</span>
  `;
}

function formatCoord(lat, lng) {
  const ns = lat < 0 ? "S" : "N";
  const ew = lng < 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(4)} deg ${ns}, ${Math.abs(lng).toFixed(4)} deg ${ew}`;
}

function addTargetsToMap() {
  targetLayer.clearLayers();
  circleLayer.clearLayers();
  markerIndex.clear();

  targets.forEach((target) => {
    const latLng = [target.lat, target.lng];
    const marker = L.marker(latLng, {
      title: target.name,
      icon: L.divIcon({
        className: "",
        html: `<span class="target-marker" style="--target-color: ${target.color}">${target.id}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -12],
      }),
    }).bindPopup(popupForTarget(target), { maxWidth: 390 });

    const circle = L.circle(latLng, {
      pane: "targetCircles",
      radius: bufferRadiusKm * 1000,
      color: target.color,
      fillColor: target.color,
      fillOpacity: 0.14,
      opacity: 0.92,
      weight: 2,
    }).bindTooltip(`${target.name}: ${bufferRadiusKm} km planning circle`, {
      sticky: true,
    });

    marker.addTo(targetLayer);
    circle.addTo(circleLayer);
    markerIndex.set(target.id, marker);
  });
}

function renderCards() {
  const container = document.querySelector("#target-cards");
  container.innerHTML = targets
    .map(
      (target) => `
        <article class="target-card" style="--target-color: ${target.color}">
          <h3>${target.id}. ${target.name}</h3>
          <div class="meta">
            <span class="pill">${target.province}</span>
            <span class="pill">${formatCoord(target.lat, target.lng)}</span>
          </div>
          <p><strong>Signature:</strong> ${target.signature}</p>
          <p><strong>Circle cue:</strong> ${target.visualCue}</p>
          <button class="fly-button" type="button" data-target-id="${target.id}">
            Fly to target
          </button>
        </article>
      `,
    )
    .join("");

  container.querySelectorAll("[data-target-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.targetId);
      const target = targets.find((item) => item.id === id);
      const marker = markerIndex.get(id);
      map.flyTo([target.lat, target.lng], 12, { duration: 1.1 });
      setTimeout(() => marker.openPopup(), 700);
    });
  });
}

function fitAllTargets() {
  const bounds = L.latLngBounds(targets.map((target) => [target.lat, target.lng]));
  map.fitBounds(bounds.pad(0.28), { animate: true });
}

function updateRadius(radiusKm) {
  bufferRadiusKm = radiusKm;
  document.querySelector("#radius-label").textContent = `${radiusKm} km`;
  addTargetsToMap();
}

function buildGeoJson() {
  return {
    type: "FeatureCollection",
    name: "zambia_arsenopyrite_gold_frontier_targets",
    features: targets.map((target) => ({
      type: "Feature",
      properties: {
        id: target.id,
        name: target.name,
        province: target.province,
        signature: target.signature,
        satellite_cue: target.visualCue,
        geological_context: target.geology,
        planning_radius_km: bufferRadiusKm,
      },
      geometry: {
        type: "Point",
        coordinates: [target.lng, target.lat],
      },
    })),
  };
}

function downloadGeoJson() {
  const blob = new Blob([JSON.stringify(buildGeoJson(), null, 2)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "zambia-arsenopyrite-gold-targets.geojson";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#zoom-all").addEventListener("click", fitAllTargets);
document.querySelector("#download-geojson").addEventListener("click", downloadGeoJson);
document.querySelector("#buffer-radius").addEventListener("input", (event) => {
  updateRadius(Number(event.target.value));
});
document.querySelector("#toggle-fullscreen").addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
  setTimeout(() => map.invalidateSize(), 250);
});

map.on("mousemove", (event) => {
  document.querySelector("#cursor-position").textContent = `${event.latlng.lat.toFixed(
    5,
  )}, ${event.latlng.lng.toFixed(5)}`;
});

map.on("baselayerchange", () => {
  // Leaflet needs a resize pass after layer switches in fullscreen/mobile layouts.
  setTimeout(() => map.invalidateSize(), 100);
});

addTargetsToMap();
renderCards();
fitAllTargets();
