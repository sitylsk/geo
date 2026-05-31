import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = (id) => document.getElementById(id);

const data = JSON.parse(sessionStorage.getItem("anthill_result") || "null");
if (!data || !data.xrayStack?.depthSlices) {
  $("empty").classList.remove("hidden");
  $("panel").style.display = "none";
}

const PROB_STOPS = [
  [11, 29, 58], [31, 111, 178], [46, 207, 111], [245, 197, 66], [255, 138, 61], [255, 46, 99],
];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  const seg = t * (PROB_STOPS.length - 1);
  const i = Math.floor(seg), f = seg - i;
  const a = PROB_STOPS[i], b = PROB_STOPS[Math.min(i + 1, PROB_STOPS.length - 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f].map((x) => x / 255);
}

function gridTexture(grid) {
  const n = grid.length;
  const cv = document.createElement("canvas");
  cv.width = n; cv.height = n;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(n, n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = grid[j][i];
      const [r, g, b] = ramp(v);
      const idx = (j * n + i) * 4;
      img.data[idx] = r * 255; img.data[idx + 1] = g * 255; img.data[idx + 2] = b * 255;
      img.data[idx + 3] = 80 + 175 * v;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function init() {
  if (!data || !data.xrayStack?.depthSlices) return;
  const c = $("c");
  const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080f);
  scene.fog = new THREE.FogExp2(0x05080f, 0.012);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(28, 26, 34);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, -8, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(20, 40, 20);
  scene.add(dir);

  const SIZE = 24;
  const slices = data.xrayStack.depthSlices;
  const order = ["shallow", "mid", "deep", "basement"];
  const planes = {};
  const zStep = -7;
  let z = 0;
  const sliceMeta = [];

  order.forEach((key, idx) => {
    const s = slices[key];
    if (!s?.grid) return;
    const tex = gridTexture(s.grid);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false });
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = z;
    scene.add(mesh);
    planes[key] = mesh;
    sliceMeta.push({ key, label: s.label, y: z });
    z += zStep;
    idx;
  });

  // Grid edges for depth context
  for (const m of sliceMeta) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(SIZE, SIZE)),
      new THREE.LineBasicMaterial({ color: 0x33506e, transparent: true, opacity: 0.5 }),
    );
    edges.rotation.x = -Math.PI / 2;
    edges.position.y = m.y;
    scene.add(edges);
  }

  // Place ranked targets as vertical pins at estimated depth.
  const bounds = data.bounds;
  const toXZ = (lat, lng) => {
    const fx = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1);
    const fy = (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1);
    return [(fx - 0.5) * SIZE, -(fy - 0.5) * SIZE];
  };
  const depthMean = data.magnetics?.depthToSource?.mean_km;
  const totalDepth = Math.abs(zStep) * (sliceMeta.length - 1);
  (data.targets || []).forEach((t) => {
    const [x, zc] = toXZ(t.lat, t.lng);
    const tierColor = t.tier === "A" ? 0xff2e63 : t.tier === "B" ? 0xff8a3d : 0x4fb0ff;
    const depthFrac = Math.min(1, (depthMean || 5) / 25);
    const yBottom = -totalDepth * (0.4 + 0.6 * depthFrac);
    const geo = new THREE.CylinderGeometry(0.12, 0.12, Math.abs(yBottom), 8);
    const mat = new THREE.MeshBasicMaterial({ color: tierColor });
    const pin = new THREE.Mesh(geo, mat);
    pin.position.set(x, yBottom / 2, zc);
    scene.add(pin);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5 + t.confidence, 16, 16), new THREE.MeshBasicMaterial({ color: tierColor }));
    head.position.set(x, 0.5, zc);
    scene.add(head);
  });

  // UI
  $("v-title").textContent = `${data.commodity.name} - 3D Depth Model`;
  $("v-sub").textContent = data.magnetics ? `Magnetics: ${data.magnetics.source}` : "X-ray subsurface stack";
  let stats = "";
  if (data.magnetics?.depthToSource) {
    const d = data.magnetics.depthToSource;
    stats += `<div class="v-row"><span>Depth to source</span><b>${d.min_km?.toFixed(1)}-${d.max_km?.toFixed(1)} km</b></div>`;
    stats += `<div class="v-row"><span>Mean source depth</span><b>${d.mean_km?.toFixed(1)} km</b></div>`;
  }
  stats += `<div class="v-row"><span>Targets</span><b>${(data.targets || []).length}</b></div>`;
  $("v-stats").innerHTML = stats;
  $("v-slices").innerHTML = sliceMeta
    .map((m) => `<label class="v-slice"><input type="checkbox" checked data-key="${m.key}" /> ${m.label}</label>`)
    .join("");
  $("v-slices").querySelectorAll("input").forEach((inp) =>
    inp.addEventListener("change", () => {
      const mesh = planes[inp.dataset.key];
      if (mesh) mesh.visible = inp.checked;
    }),
  );

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

init();
