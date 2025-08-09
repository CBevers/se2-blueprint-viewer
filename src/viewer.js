import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SAMPLE_A, SAMPLE_B, SAMPLE_C, SAMPLE_D, SAMPLE_E } from './samples.js';

// DOM refs
const fileInput = document.getElementById('fileInput');
const sizeInput = document.getElementById('sizeInput');
const autosizeToggle = document.getElementById('autosizeToggle');
const shadowsToggle = document.getElementById('shadowsToggle');
const colorMode = document.getElementById('colorMode');
const statsEl   = document.getElementById('stats');
const fitBtn    = document.getElementById('fitBtn');
const resetBtn  = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const starsToggle = document.getElementById('starsToggle');
const gridToggle  = document.getElementById('gridToggle');
const unlitToggle = document.getElementById('unlitToggle');
const dropzone = document.getElementById('dropzone');
const demoBtnA  = document.getElementById('demoBtnA');
const demoBtnB  = document.getElementById('demoBtnB');
const demoBtnC  = document.getElementById('demoBtnC');
const demoBtnD  = document.getElementById('demoBtnD');
const demoBtnE  = document.getElementById('demoBtnE');

const azimuth = document.getElementById('azimuth');
const elevation = document.getElementById('elevation');
const lightDist = document.getElementById('lightDist');
const lightSpin = document.getElementById('lightSpin');
const updateLightBtn = document.getElementById('updateLight');
const lightInf = document.getElementById('lightInf');

const selectNoneBtn = document.getElementById('selectNone');
const selectAllBtn = document.getElementById('selectAll');
const invertSelBtn = document.getElementById('invertSel');
const pickColor = document.getElementById('pickColor');
const pickTol = document.getElementById('pickTol');
const selectByColorBtn = document.getElementById('selectByColor');

const paintMode = document.getElementById('paintMode');
const colA = document.getElementById('colA');
const colB = document.getElementById('colB');
const axisSel = document.getElementById('axis');
const noiseScale = document.getElementById('noiseScale');
const noiseOct = document.getElementById('noiseOct');
const noiseAmt = document.getElementById('noiseAmt');
const noiseReroll = document.getElementById('noiseReroll');
const imgPlane = document.getElementById('imgPlane');
const imgInput = document.getElementById('imgInput');
const applyPaint = document.getElementById('applyPaint');

// Three basics
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(40, 30, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.00015;
scene.add(keyLight);
scene.add(keyLight.target);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
fillLight.position.set(-60, -40, -30);
scene.add(fillLight);

// Track light distance for shadow fit
let lastLightDistance = 150;
function updateShadowCamera(){
  const r = Math.max(10, (modelRadius||10) * 2);
  const d = lastLightDistance || 150;
  const cam = keyLight.shadow.camera;
  cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
  cam.near = Math.max(0.5, d - r*1.5);
  cam.far = d + r*1.5;
  cam.updateProjectionMatrix();
}

// Axes
const axes = new THREE.AxesHelper(5);
axes.visible = false;
scene.add(axes);

// Starfield
let stars = null;
function makeStars() {
  if (stars) { scene.remove(stars); stars.geometry.dispose(); stars.material.dispose(); stars = null; }
  const starCount = 4000;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const rMin = 200, rMax = 1200;
  for (let i = 0; i < starCount; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i*3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3 + 1] = r * Math.cos(phi);
    positions[i*3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 1, sizeAttenuation: true });
  stars = new THREE.Points(geom, mat);
  stars.visible = starsToggle.checked;
  scene.add(stars);
}
makeStars();

// State
let instancedMeshes = [];
let modelCenter = new THREE.Vector3();
let modelRadius = 5;
let originalCamera = camera.position.clone();
let originalTarget = controls.target.clone();

let srcPositions = [];
let srcColors = [];
let srcHSV = [];
let srcSizes = [];

const selected = new Set();
let workingJSON = null;
let colorRefs = [];

function clearModel() {
  if (instancedMeshes.length) {
    for (const m of instancedMeshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.material && m.material.dispose) m.material.dispose();
    }
    instancedMeshes = [];
  }
  selected.clear();
  colorRefs = [];
  workingJSON = null;
}

function fitView(pad = 1.25) {
  const fov = camera.fov * Math.PI / 180;
  const dist = (modelRadius * pad) / Math.sin(fov / 2);
  const dir = new THREE.Vector3(1, 0.6, 1).normalize();
  camera.position.copy(modelCenter).addScaledVector(dir, dist);
  controls.target.copy(modelCenter);
  controls.update();
}

function resetCamera() {
  camera.position.copy(originalCamera);
  controls.target.copy(originalTarget);
  controls.update();
}

function updateStats(count, min, max, sizeCounts = null) {
  const dims = max.clone().sub(min);
  let line = `Blocks: <b>${count.toLocaleString()}</b> · Size (x,y,z): <b>${dims.x.toFixed(2)}</b>, <b>${dims.y.toFixed(2)}</b>, <b>${dims.z.toFixed(2)}</b> · Selected: <b>${selected.size}</b>`;
  if (sizeCounts) {
    const parts = [];
    for (const [k,v] of Object.entries(sizeCounts)) parts.push(`${k}m: <b>${v}</b>`);
    if (parts.length) line += ` · Classified: ${parts.join(' · ')}`;
  }
  statsEl.innerHTML = line;
}

// Color helpers
function hsvToRgb(h, s, v) {
  h = ((h % 1) + 1) % 1;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r=0,g=0,b=0;
  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    case 5: r=v; g=p; b=q; break;
  }
  return [r,g,b];
}
function rgbToHsv(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const d = max - min;
  let h = 0, s = max === 0 ? 0 : d / max, v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v];
}
const toLinear = (hex) => { const c = new THREE.Color(hex); return c.convertSRGBToLinear(); };

function refreshInstanceColors() {
  for (const mesh of instancedMeshes) {
    const idxMap = mesh.__indices || [];
    for (let j = 0; j < idxMap.length; j++) {
      const i = idxMap[j];
      let base = srcColors[i];
      if (!base || !base.isColor) base = new THREE.Color(1,1,1);
      const disp = selected.has(i) ? base.clone().lerp(new THREE.Color(1,1,1), 0.35) : base;
      mesh.setColorAt(j, disp);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

function setShadowsEnabled(on) {
  renderer.shadowMap.enabled = on && !unlitToggle.checked;
  for (const m of instancedMeshes) { m.castShadow = on && !unlitToggle.checked; m.receiveShadow = on && !unlitToggle.checked; }
  keyLight.castShadow = on && !unlitToggle.checked;
}

// Size auto-detection
function classifySizeForPositions(positions) {
  const key = (a,b) => `${a}|${b}`;
  const map_yz = new Map();
  const map_xz = new Map();
  const map_xy = new Map();
  const round5 = v => Math.round(v * 1e5) / 1e5;
  for (const [x,y,z] of positions.map(v=>[v.x,v.y,v.z])) {
    const ky = key(round5(y), round5(z));
    const kx = key(round5(x), round5(z));
    const kz = key(round5(x), round5(y));
    (map_yz.get(ky) || map_yz.set(ky, []).get(ky)).push(x);
    (map_xz.get(kx) || map_xz.set(kx, []).get(kx)).push(y);
    (map_xy.get(kz) || map_xy.set(kz, []).get(kz)).push(z);
  }
  for (const m of [map_yz, map_xz, map_xy]) for (const arr of m.values()) arr.sort((a,b)=>a-b);
  function nearestGap(list, v) {
    let lo=0, hi=list.length-1; while (lo<=hi) { const mid=(lo+hi)>>1; if (list[mid]<v) lo=mid+1; else hi=mid-1; }
    const gaps=[]; if (lo<list.length) gaps.push(Math.abs(list[lo]-v)); if (lo-1>=0) gaps.push(Math.abs(v-list[lo-1]));
    return Math.min(...gaps.filter(g=>g>1e-6).concat([Infinity]));
  }
  const preferred = [2.5, 0.5, 0.25];
  const sizes = new Array(positions.length).fill(parseFloat(sizeInput.value)||2.49);
  const counts = {"2.5":0, "0.5":0, "0.25":0, "fallback":0};
  const tol = 0.13;
  positions.forEach((p, i) => {
    const gy = nearestGap(map_yz.get(key(round5(p.y), round5(p.z)))||[p.x], p.x);
    const gx = nearestGap(map_xz.get(key(round5(p.x), round5(p.z)))||[p.y], p.y);
    const gz = nearestGap(map_xy.get(key(round5(p.x), round5(p.y)))||[p.z], p.z);
    const g = Math.min(gx, gy, gz);
    let picked = null, tag = 'fallback';
    if (isFinite(g)) {
      let best = Infinity, bestV = null;
      for (const v of preferred) { const d = Math.abs(g - v); if (d < best) { best = d; bestV = v; } }
      if (best <= tol) { picked = bestV; tag = String(bestV); }
    }
    sizes[i] = picked ?? (parseFloat(sizeInput.value)||2.49);
    counts[tag]++;
  });
  return {sizes, counts};
}

function buildInstanced(positions, colors) {
  for (const m of instancedMeshes) { scene.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material && m.material.dispose) m.material.dispose(); }
  instancedMeshes = [];
  if (!positions.length) return;

  // Cache
  srcPositions = positions.map(v => v.clone());
  srcColors    = colors.map(c => (c && c.isColor) ? c.clone() : new THREE.Color(1,1,1));
  srcHSV = srcColors.map(c => { const sRGB = c.clone().convertLinearToSRGB(); return rgbToHsv(sRGB.r, sRGB.g, sRGB.b); });

  const { sizes, counts } = autosizeToggle.checked ? classifySizeForPositions(positions) : { sizes: positions.map(()=>parseFloat(sizeInput.value)||2.49), counts: null };
  srcSizes = sizes.slice();

  // Bounds
  const min = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const v of positions) { min.min(v); max.max(v); }
  modelCenter.copy(min).add(max).multiplyScalar(0.5);
  modelRadius = 0; for (const v of positions) modelRadius = Math.max(modelRadius, v.distanceTo(modelCenter));

  updateStats(positions.length, min, max, counts);
  updateShadowCamera();

  // Buckets by size
  const buckets = new Map();
  sizes.forEach((s, i) => { const k = s.toFixed(2); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); });

  function makeGeomForSize(s) {
    const shrink = 0.01;
    const g = new THREE.BoxGeometry(s - shrink, s - shrink, s - shrink);
    const verts = g.getAttribute('position').count;
    const white = new Float32Array(verts * 3);
    for (let i=0;i<white.length;i++) white[i] = 1;
    g.setAttribute('color', new THREE.BufferAttribute(white, 3));
    return g;
  }

  for (const [k, indices] of buckets.entries()) {
    const s = parseFloat(k);
    const geom = makeGeomForSize(s);
    const mat = unlitToggle.checked
      ? new THREE.MeshBasicMaterial({ vertexColors: true })
      : new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.8 });
    const mesh = new THREE.InstancedMesh(geom, mat, indices.length);
    mesh.castShadow = shadowsToggle.checked && !unlitToggle.checked;
    mesh.receiveShadow = shadowsToggle.checked && !unlitToggle.checked;

    const m = new THREE.Matrix4();
    for (let j = 0; j < indices.length; j++) {
      const i = indices[j];
      const pos = positions[i];
      m.makeTranslation(pos.x - modelCenter.x, pos.y - modelCenter.y, pos.z - modelCenter.z);
      mesh.setMatrixAt(j, m);
      const c = (srcColors[i] && srcColors[i].isColor) ? srcColors[i] : new THREE.Color(1,1,1);
      mesh.setColorAt(j, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    mesh.__indices = indices;
    instancedMeshes.push(mesh);
    scene.add(mesh);
  }

  setShadowsEnabled(shadowsToggle.checked);
  updateKeyLight();
  refreshInstanceColors();
  fitView();
}

function rebuild() {
  if (!srcPositions.length) return;
  buildInstanced(srcPositions, srcColors);
  refreshInstanceColors();
}

function handleJSON(json) {
  try { workingJSON = (typeof structuredClone === 'function') ? structuredClone(json) : JSON.parse(JSON.stringify(json)); }
  catch { workingJSON = JSON.parse(JSON.stringify(json)); }
  const parsed = parseSE2(json);
  buildInstanced(parsed.positions, parsed.colors);
  colorRefs = parsed.colorRefs;
  refreshInstanceColors();
}

function parseSE2(json) {
  const out = { positions: [], colors: [], colorRefs: [] };
  try {
    const rootBuilder = json?.$Value?.Builders?.[0];
    if (!rootBuilder) throw new Error('No root builder');
    const rootObjs = rootBuilder.ObjectBuilders || [];
    const rootHierarchy = rootObjs.find(o => o?.Value?.$Type?.endsWith('HierarchyComponentObjectBuilder'))?.Value;
    if (!rootHierarchy) throw new Error('No hierarchy');
    const children = rootHierarchy.Children || [];
    for (const c of children) {
      const val = c?.Value; if (!val) continue;
      const obs = val.ObjectBuilders || [];
      let ct = null, cb = null;
      for (const ob of obs) {
        const v = ob?.Value; if (!v) continue;
        const t = v.$Type || '';
        if (t.endsWith('ChildTransformComponentObjectBuilder')) ct = v;
        else if (t.endsWith('CubeBlockObjectBuilder')) cb = v;
      }
      if (!ct || !cb) continue;
      const p = ct?.TransformWithEulerHint?.Transform?.Position;
      const colObj = cb?.Color?.Values;
      if (!p || !colObj) continue;
      out.positions.push(new THREE.Vector3(p.X || 0, p.Y || 0, p.Z || 0));
      const col = colorFromValues(colObj);
      out.colors.push((col && col.isColor) ? col : new THREE.Color(1,1,1));
      out.colorRefs.push(colObj);
    }
    return out;
  } catch (e) {
    console.error('Parse error', e);
    alert('Failed to parse grid.json: ' + e.message);
    return out;
  }
}

// File loading
function loadFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try { const json = JSON.parse(e.target.result); handleJSON(json); }
    catch (err) { console.error(err); alert('Not a valid JSON file.'); }
  };
  reader.readAsText(file);
}
fileInput.addEventListener('change', (e) => { const file = e.target.files?.[0]; if (file) loadFile(file); });

// Drag & drop
window.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.display = 'flex'; });
window.addEventListener('dragleave', () => { dropzone.style.display = 'none'; });
window.addEventListener('drop', (e) => { e.preventDefault(); dropzone.style.display = 'none'; const file = e.dataTransfer.files?.[0]; if (file) loadFile(file); });

// Controls
sizeInput.addEventListener('change', rebuild);
autosizeToggle.addEventListener('change', rebuild);
colorMode.addEventListener('change', () => { handleJSON(workingJSON || buildFromCurrent()); });
starsToggle.addEventListener('change', () => { if (stars) stars.visible = starsToggle.checked; });
gridToggle.addEventListener('change', () => { axes.visible = gridToggle.checked; });
unlitToggle.addEventListener('change', () => { rebuild(); setShadowsEnabled(shadowsToggle.checked); });
shadowsToggle.addEventListener('change', () => setShadowsEnabled(shadowsToggle.checked));

fitBtn.addEventListener('click', () => fitView());
resetBtn.addEventListener('click', () => resetCamera());

exportBtn.addEventListener('click', () => {
  if (!workingJSON) { alert('Nothing to export yet. Load a JSON first.'); return; }
  for (let i=0;i<srcColors.length;i++) {
    const col = srcColors[i];
    if (!col || !col.isColor) continue;
    const sRGB = col.clone().convertLinearToSRGB();
    const [h,s,v] = rgbToHsv(sRGB.r, sRGB.g, sRGB.b);
    const ref = colorRefs[i];
    if (ref) { ref.X = h; ref.Y = s; ref.Z = v; }
  }
  const blob = new Blob([JSON.stringify(workingJSON)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'grid_edited.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// Light controls
function updateKeyLight() {
  const az = THREE.MathUtils.degToRad(parseFloat(azimuth.value)||0);
  const el = THREE.MathUtils.degToRad(parseFloat(elevation.value)||0);
  const baseD  = parseFloat(lightDist.value)||150;
  const d = lightInf.checked ? Math.max(150, (modelRadius||10) * 3) : baseD;
  lightDist.disabled = !!lightInf.checked;
  lastLightDistance = d;
  keyLight.position.set(
    modelCenter.x + d * Math.cos(el) * Math.cos(az),
    modelCenter.y + d * Math.sin(el),
    modelCenter.z + d * Math.cos(el) * Math.sin(az)
  );
  if (keyLight.target && keyLight.target.position && keyLight.target.position.copy) {
    keyLight.target.position.copy(modelCenter);
  } else {
    keyLight.lookAt(modelCenter);
  }
  updateShadowCamera();
}
document.getElementById('updateLight').addEventListener('click', updateKeyLight);
lightInf.addEventListener('change', updateKeyLight);

// Selection
selectNoneBtn.addEventListener('click', () => { selected.clear(); refreshInstanceColors(); });
selectAllBtn.addEventListener('click', () => { selected.clear(); for (let i=0;i<srcPositions.length;i++) selected.add(i); refreshInstanceColors(); });
invertSelBtn.addEventListener('click', () => { const all=new Set(); for (let i=0;i<srcPositions.length;i++) all.add(i); for (const i of all) { if (selected.has(i)) selected.delete(i); else selected.add(i);} refreshInstanceColors(); });

function colorDistanceHSV(a, b) {
  const dh = Math.min(Math.abs(a[0]-b[0]), 1-Math.abs(a[0]-b[0]));
  const ds = Math.abs(a[1]-b[1]);
  const dv = Math.abs(a[2]-b[2]);
  return (dh + ds + dv) / 3;
}

selectByColorBtn.addEventListener('click', () => {
  const c = toLinear(pickColor.value).clone().convertLinearToSRGB();
  const target = rgbToHsv(c.r, c.g, c.b);
  const tol = parseFloat(pickTol.value)||0.15;
  selected.clear();
  for (let i=0;i<srcHSV.length;i++) if (colorDistanceHSV(srcHSV[i], target) <= tol) selected.add(i);
  refreshInstanceColors();
});

// Raycast picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('click', (e) => {
  if (!instancedMeshes.length) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(instancedMeshes, true);
  if (intersects.length) {
    const hit = intersects[0];
    const mesh = hit.object; const j = hit.instanceId; if (j==null) return;
    const i = (mesh.__indices && mesh.__indices[j] != null) ? mesh.__indices[j] : null;
    if (i == null) return;
    if (e.altKey) {
      const sRGB = srcColors[i].clone().convertLinearToSRGB();
      const target = rgbToHsv(sRGB.r, sRGB.g, sRGB.b);
      const tol = parseFloat(pickTol.value)||0.15;
      selected.clear();
      for (let k=0;k<srcHSV.length;k++) if (colorDistanceHSV(srcHSV[k], target) <= tol) selected.add(k);
    } else {
      if (selected.has(i)) selected.delete(i); else selected.add(i);
    }
    refreshInstanceColors();
  }
});

// Painting
function applySolid(colorHex) {
  const lin = toLinear(colorHex);
  for (const i of selected) srcColors[i] = lin.clone();
}
function range01(v, min, max) { return (v - min) / Math.max(1e-9, (max - min)); }
function applyLinearGradient(hexA, hexB, axis) {
  const a = toLinear(hexA), b = toLinear(hexB);
  let min=+Infinity, max=-Infinity; const comp = axis==='x'?0:axis==='y'?1:2;
  for (const v of srcPositions) { const val = comp===0?v.x:comp===1?v.y:v.z; if (val<min)min=val; if (val>max)max=val; }
  for (const i of selected) {
    const v = srcPositions[i]; const val = comp===0?v.x:comp===1?v.y:v.z;
    const t = THREE.MathUtils.clamp(range01(val, min, max), 0, 1);
    srcColors[i] = a.clone().lerp(b, t);
  }
}
function applyRadialGradient(hexA, hexB) {
  const a = toLinear(hexA), b = toLinear(hexB);
  for (const i of selected) {
    const d = srcPositions[i].distanceTo(modelCenter);
    const t = THREE.MathUtils.clamp(d / (modelRadius || 1), 0, 1);
    srcColors[i] = a.clone().lerp(b, t);
  }
}
function applyCylindricalGradient(hexA, hexB, axis){
  const a=toLinear(hexA), b=toLinear(hexB);
  const cx=modelCenter.x, cy=modelCenter.y, cz=modelCenter.z;
  let maxR=0; 
  for(const v of srcPositions){
    let d=0;
    if(axis==='x') d=Math.hypot(v.y-cy, v.z-cz);
    else if(axis==='y') d=Math.hypot(v.x-cx, v.z-cz);
    else d=Math.hypot(v.x-cx, v.y-cy);
    if(d>maxR) maxR=d;
  }
  maxR=Math.max(maxR,1e-6);
  for(const i of selected){
    const p=srcPositions[i];
    let d=0;
    if(axis==='x') d=Math.hypot(p.y-cy, p.z-cz);
    else if(axis==='y') d=Math.hypot(p.x-cx, p.z-cz);
    else d=Math.hypot(p.x-cx, p.y-cy);
    const t=THREE.MathUtils.clamp(d/maxR,0,1);
    srcColors[i]=a.clone().lerp(b,t);
  }
}
// Perlin fBm
const p = new Uint8Array(512); (function(){
  const perm = new Uint8Array(256); for (let i=0;i<256;i++) perm[i]=i; for (let i=255;i>0;i--){ const j=(Math.random()*(i+1))|0; const t=perm[i]; perm[i]=perm[j]; perm[j]=t; }
  for (let i=0;i<512;i++) p[i]=perm[i&255];
})();
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
function fade(t){return t*t*t*(t*(t*6-15)+10);} function lerp(a,b,t){return a+(b-a)*t;}
function noise3(x,y,z){
  let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
  const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
  function dot(gx,gy,gz,x,y,z){return gx*x+gy*y+gz*z;}
  function g(hash){const q=grad3[p[hash] % 12];return q;}
  const x1 = lerp(dot(...g(AA), x, y, z), dot(...g(BA), x-1, y, z), u);
  const x2 = lerp(dot(...g(AB), x, y-1, z), dot(...g(BB), x-1, y-1, z), u);
  const y1 = lerp(x1, x2, v);
  const x3 = lerp(dot(...g(AA+1), x, y, z-1), dot(...g(BA+1), x-1, y, z-1), u);
  const x4 = lerp(dot(...g(AB+1), x, y-1, z-1), dot(...g(BB+1), x-1, y-1, z-1), u);
  const y2 = lerp(x3, x4, v);
  return (lerp(y1, y2, w))*0.5 + 0.5;
}
function fbm3(x,y,z, oct=4){ let v=0, a=0.5, f=1, sum=0; for(let o=0;o<oct;o++){ v += noise3(x*f,y*f,z*f)*a; sum+=a; a*=0.5; f*=2.0; } return v/sum; }
let noiseSeed = 1337;
function applyPerlin(hexA, hexB, scale) {
  const a = toLinear(hexA), b = toLinear(hexB);
  const s = Math.max(0.01, parseFloat(scale)||2);
  const oct = Math.max(1, parseInt(noiseOct.value)||4);
  for (const i of selected) {
    const v = srcPositions[i];
    const n = fbm3((v.x+noiseSeed)/s, (v.y-noiseSeed)/s, (v.z+noiseSeed*0.5)/s, oct);
    srcColors[i] = a.clone().lerp(b, n);
  }
}
function applyGradientNoise(hexA, hexB, axis, scale, amt){
  const a=toLinear(hexA), b=toLinear(hexB);
  const s=Math.max(0.01, parseFloat(scale)||2); const oct=Math.max(1, parseInt(noiseOct.value)||4); const amount=Math.max(0, parseFloat(amt)||0.35);
  let min=+Infinity, max=-Infinity; const comp = axis==='x'?0:axis==='y'?1:2;
  for(const v of srcPositions){ const val = comp===0?v.x:comp===1?v.y:v.z; if(val<min)min=val; if(val>max)max=val; }
  for(const i of selected){ const p=srcPositions[i]; const base = THREE.MathUtils.clamp(( (comp===0?p.x:comp===1?p.y:p.z) - min) / Math.max(1e-9,(max-min)), 0, 1);
    const n = fbm3((p.x+noiseSeed)/s, (p.y-noiseSeed)/s, (p.z+noiseSeed*0.5)/s, oct) - 0.5;
    const t = THREE.MathUtils.clamp(base + n*amount, 0, 1);
    srcColors[i] = a.clone().lerp(b, t);
  }
}
noiseReroll.addEventListener('click', ()=>{ noiseSeed = Math.random()*10000; });

// Image mapping
let imgBitmap = null; let imgCanvas=null, imgCtx=null;
imgInput.addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return; imgBitmap = await createImageBitmap(f); imgCanvas=document.createElement('canvas'); imgCanvas.width=imgBitmap.width; imgCanvas.height=imgBitmap.height; imgCtx=imgCanvas.getContext('2d'); imgCtx.drawImage(imgBitmap,0,0); });
function sampleImage(u,v){ if(!imgCtx) return new THREE.Color(1,1,1); u=THREE.MathUtils.clamp(u,0,1); v=THREE.MathUtils.clamp(v,0,1); const x=Math.floor(u*(imgCanvas.width-1)), y=Math.floor((1-v)*(imgCanvas.height-1)); const d=imgCtx.getImageData(x,y,1,1).data; const c=new THREE.Color(d[0]/255,d[1]/255,d[2]/255); return c.convertSRGBToLinear(); }
function applyImageMap(plane){
  let minX=+Infinity,minY=+Infinity,minZ=+Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const v of srcPositions){ if(v.x<minX)minX=v.x; if(v.y<minY)minY=v.y; if(v.z<minZ)minZ=v.z; if(v.x>maxX)maxX=v.x; if(v.y>maxY)maxY=v.y; if(v.z>maxZ)maxZ=v.z; }
  for(const i of selected){
    const v=srcPositions[i];
    let u=0,w=0;
    if(plane==='xy'){ u=range01(v.x,minX,maxX); w=range01(v.y,minY,maxY); }
    else if(plane==='xz'){ u=range01(v.x,minX,maxX); w=range01(v.z,minZ,maxZ); }
    else { u=range01(v.y,minY,maxY); w=range01(v.z,minZ,maxZ); }
    srcColors[i]=sampleImage(u,w);
  }
}

// Apply paint dispatcher
applyPaint.addEventListener('click', ()=>{
  if (!selected.size) { alert('Select some blocks first.'); return; }
  const mode = paintMode.value;
  if (mode==='solid') applySolid(colA.value);
  else if (mode==='linear') applyLinearGradient(colA.value, colB.value, axisSel.value);
  else if (mode==='radial') applyRadialGradient(colA.value, colB.value);
  else if (mode==='cyl') applyCylindricalGradient(colA.value, colB.value, axisSel.value);
  else if (mode==='gnoise') applyGradientNoise(colA.value, colB.value, axisSel.value, noiseScale.value, noiseAmt.value);
  else if (mode==='perlin') applyPerlin(colA.value, colB.value, noiseScale.value);
  else if (mode==='image') { if(!imgCtx){ alert('Load an image first.'); return; } applyImageMap(imgPlane.value); }
  srcHSV = srcColors.map(c => { const sRGB = c.clone().convertLinearToSRGB(); return rgbToHsv(sRGB.r, sRGB.g, sRGB.b); });
  refreshInstanceColors();
});

// Samples (tests)
function loadSample(sample) { clearModel(); handleJSON(sample); }
demoBtnA.addEventListener('click', () => loadSample(SAMPLE_A));
demoBtnB.addEventListener('click', () => loadSample(SAMPLE_B));
demoBtnC.addEventListener('click', () => loadSample(SAMPLE_C));
demoBtnD.addEventListener('click', () => loadSample(SAMPLE_D));
demoBtnE.addEventListener('click', () => loadSample(SAMPLE_E));

// Render loop
function animate() {
  requestAnimationFrame(animate);
  if (lightSpin.checked) { azimuth.value = (parseFloat(azimuth.value)||0) + 0.3; updateKeyLight(); }
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// Rebuild current view into JSON (for colorMode toggle w/o workingJSON)
function buildFromCurrent(){
  const children=[]; for(let i=0;i<srcPositions.length;i++){ const p=srcPositions[i]; const sRGB=srcColors[i]?.clone().convertLinearToSRGB(); const [h,s,v]= sRGB ? rgbToHsv(sRGB.r,sRGB.g,sRGB.b) : [0,0,1]; children.push({"Value":{"ObjectBuilders":[
    {"Value":{"$Type":"Sandbox.ChildTransformComponentObjectBuilder","TransformWithEulerHint":{"Transform":{"Position":{"X":p.x,"Y":p.y,"Z":p.z}}}}},
    {"Value":{"$Type":"Sandbox.CubeBlockObjectBuilder","Color":{"Values":{"X":h,"Y":s,"Z":v,"W":1}}}}
  ]}}); }
  return {"$Value":{"Builders":[{"ObjectBuilders":[{"Value":{"$Type":"Sandbox.HierarchyComponentObjectBuilder","Children":children}}]}]}};
}

// Convert JSON color -> linear THREE.Color
function colorFromValues(vals) {
  let x = vals?.X ?? 1, y = vals?.Y ?? 1, z = vals?.Z ?? 1;
  let r,g,b;
  if (colorMode.value === 'hsv') {
    let h = x, s = y, v = z;
    if (h > 3) h = h / 360;
    if (h > 1 && h <= 3) h = h / 255;
    if (s > 1) s = s / 255;
    if (v > 1) v = v / 255;
    h = ((h % 1) + 1) % 1; s = THREE.MathUtils.clamp(s,0,1); v = THREE.MathUtils.clamp(v,0,1);
    [r,g,b] = hsvToRgb(h, s, v);
  } else {
    r = x; g = y; b = z;
    if (r > 1 || g > 1 || b > 1) { r/=255; g/=255; b/=255; }
    r = THREE.MathUtils.clamp(r,0,1); g = THREE.MathUtils.clamp(g,0,1); b = THREE.MathUtils.clamp(b,0,1);
  }
  const c = new THREE.Color(r, g, b);
  c.convertSRGBToLinear();
  return c;
}

// Kick things off
updateKeyLight();
