// risk-sphere.js
// Port fiel del "Global Risk Map" (RiskSphere) de riskon.lat (Mauricio) a
// HTML/CSS/JS plano — sin React/Next, sin build step. Usa Three.js r128 cargado
// como global (window.THREE) desde CDN, y los datos geográficos reales de
// ./geoMasks.js (costas/fronteras en base64). Misma lógica y shaders que el
// original; solo se cambió el andamiaje de React por vanilla + un mount por id.

import * as geoMasks from "./geoMasks.js";

/* ============================================================
   quantForms.js — generadores de formas, shaders y helpers
   (portado tal cual desde reference/risk-on/quantForms.js)
   ============================================================ */

const eio = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

// Fibonacci sphere — cada partícula es una posible trayectoria futura bajo GBM.
function genSphere(n, r) {
  const pos = new Float32Array(n * 3);
  const ga  = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y   = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const th  = ga * i;
    pos[i*3]   = Math.cos(th) * rad * r;
    pos[i*3+1] = y * r;
    pos[i*3+2] = Math.sin(th) * rad * r;
  }
  return pos;
}

function genGlobe(n, r) {
  return genSphere(n, r);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function decodeBorderLatLon(m) {
  const { BORDER_POS_B64, BORDER_EDGES_B64 } = m;
  const ll    = new Int16Array(b64ToBytes(BORDER_POS_B64).buffer);
  const edges = new Uint16Array(b64ToBytes(BORDER_EDGES_B64).buffer);
  const n = ll.length / 2;
  const lats = new Float32Array(n), lons = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    lats[i] = ll[i*2]   / 182.0444;
    lons[i] = ll[i*2+1] / 91.0222;
  }
  return { lats, lons, edges };
}

let _geoCanvas = null;
function buildGeoCanvas(m) {
  const { LAND_COLS, LAND_ROWS, LAND_MASK_B64, COUNTRY_COLS, COUNTRY_ROWS, COUNTRY_MASK_B64 } = m;
  if (_geoCanvas) return _geoCanvas;
  const W = 1440, H = 720;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  const bytes = b64ToBytes(LAND_MASK_B64);

  const srcLand = new Uint8Array(LAND_COLS * LAND_ROWS);
  for (let i = 0; i < srcLand.length; i++) {
    srcLand[i] = (bytes[i >> 3] & (1 << (i & 7))) ? 1 : 0;
  }
  const MIN_COMPONENT = Math.round(4 * (LAND_COLS / 360) ** 2);
  const cleanLand = new Uint8Array(srcLand);
  const seen = new Uint8Array(srcLand.length);
  const stack = [];
  for (let start = 0; start < srcLand.length; start++) {
    if (!srcLand[start] || seen[start]) continue;
    const comp = [];
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const r = (i / LAND_COLS) | 0, c = i % LAND_COLS;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = r + dr;
        if (rr < 0 || rr >= LAND_ROWS) continue;
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const cc = ((c + dc) % LAND_COLS + LAND_COLS) % LAND_COLS;
          const j = rr * LAND_COLS + cc;
          if (srcLand[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
        }
      }
    }
    if (comp.length < MIN_COMPONENT) for (const i of comp) cleanLand[i] = 0;
  }

  const land = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = (y / H * LAND_ROWS) | 0;
    for (let x = 0; x < W; x++) {
      const col = (x / W * LAND_COLS) | 0;
      land[y * W + x] = cleanLand[row * LAND_COLS + col] ? 255 : 0;
    }
  }

  const countryBytes = b64ToBytes(COUNTRY_MASK_B64);
  const countryId = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = (y / H * COUNTRY_ROWS) | 0;
    for (let x = 0; x < W; x++) {
      const col = (x / W * COUNTRY_COLS) | 0;
      const i = row * COUNTRY_COLS + col;
      const byte = countryBytes[i >> 1];
      countryId[y * W + x] = (i % 2 === 0) ? (byte & 0x0f) : (byte >> 4);
    }
  }

  const COAST_R = 1;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const v = land[idx];
      let coast = 0;
      for (let dy = -COAST_R; dy <= COAST_R && !coast; dy++) {
        const yy = Math.max(0, Math.min(H - 1, y + dy));
        for (let dx = -COAST_R; dx <= COAST_R; dx++) {
          const xx = ((x + dx) % W + W) % W;
          if (land[yy * W + xx] !== v) { coast = 255; break; }
        }
      }
      const p = idx * 4;
      img.data[p] = v; img.data[p+1] = coast; img.data[p+2] = countryId[idx] * 17; img.data[p+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const { lats, lons, edges } = decodeBorderLatLon(m);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgb(0,255,0)";
  ctx.lineWidth = 2;
  for (let e = 0; e < edges.length; e += 2) {
    const a = edges[e], bI = edges[e+1];
    const ax = (lons[a]  + 180) / 360 * W, ay = (90 - lats[a])  / 180 * H;
    const bx = (lons[bI] + 180) / 360 * W, by = (90 - lats[bI]) / 180 * H;
    if (Math.abs(ax - bx) > W / 2) continue;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }

  _geoCanvas = c;
  return c;
}

async function makeGeoTexture(THREE, m) {
  const tex = new THREE.CanvasTexture(buildGeoCanvas(m));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.flipY = false;
  return tex;
}

const COUNTRY_UNIVERSE = [
  { id: "mx", maskId: 1,  name_es: "México",         name_en: "Mexico",        lat: 23.6,  lon: -102.5, score: 62, phase: 0.0 },
  { id: "us", maskId: 2,  name_es: "Estados Unidos", name_en: "United States", lat: 39.8,  lon: -98.6,  score: 48, phase: 1.3 },
  { id: "cn", maskId: 3,  name_es: "China",          name_en: "China",         lat: 35.0,  lon: 103.8,  score: 70, phase: 2.6 },
  { id: "br", maskId: 4,  name_es: "Brasil",         name_en: "Brazil",        lat: -10.3, lon: -53.2,  score: 65, phase: 3.9 },
  { id: "tr", maskId: 5,  name_es: "Turquía",        name_en: "Turkey",        lat: 38.9,  lon: 35.2,   score: 88, phase: 5.2 },
  { id: "jp", maskId: 6,  name_es: "Japón",          name_en: "Japan",         lat: 36.2,  lon: 138.3,  score: 40, phase: 0.7 },
  { id: "gb", maskId: 7,  name_es: "Reino Unido",    name_en: "UK",            lat: 54.0,  lon: -2.5,   score: 38, phase: 1.9 },
  { id: "de", maskId: 8,  name_es: "Alemania",       name_en: "Germany",       lat: 51.2,  lon: 10.4,   score: 36, phase: 3.2 },
  { id: "in", maskId: 9,  name_es: "India",          name_en: "India",         lat: 21.0,  lon: 78.0,   score: 45, phase: 4.5 },
  { id: "kr", maskId: 10, name_es: "Corea del Sur",  name_en: "South Korea",   lat: 36.5,  lon: 127.8,  score: 42, phase: 5.8 },
  { id: "za", maskId: 11, name_es: "Sudáfrica",      name_en: "South Africa",  lat: -29.0, lon: 24.7,   score: 55, phase: 0.4 },
  { id: "ar", maskId: 12, name_es: "Argentina",      name_en: "Argentina",     lat: -34.0, lon: -64.0,  score: 58, phase: 1.6 },
  { id: "cl", maskId: 13, name_es: "Chile",          name_en: "Chile",         lat: -35.7, lon: -71.5,  score: 44, phase: 2.9 },
  { id: "co", maskId: 14, name_es: "Colombia",       name_en: "Colombia",      lat: 4.6,   lon: -74.1,  score: 50, phase: 4.2 },
];

// 5 países a resaltar: MX y US fijos + Brasil, Argentina y China (relevantes
// para audiencia LatAm). Scores placeholder (los de COUNTRY_UNIVERSE) — se
// pueden actualizar en runtime con window.riskSphere.setCountryScores(...).
const SELECTED_IDS = ["mx", "us", "br", "ar", "cn"];
const RISK_COUNTRIES = SELECTED_IDS.map((id) => COUNTRY_UNIVERSE.find((c) => c.id === id));

function makeCountryDataUniform(THREE) {
  return RISK_COUNTRIES.map((c) => new THREE.Vector2(c.score / 100, c.phase));
}

function makeSelIdsUniform() {
  return RISK_COUNTRIES.map((c) => c.maskId);
}

function latLonToDir(lat, lon) {
  const latR  = (lat * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -Math.cos(latR) * Math.cos(theta),
    y: Math.sin(latR),
    z: Math.cos(latR) * Math.sin(theta),
  };
}

const GLOBE_VERTEX_SHADER = /* glsl */ `
precision highp float;
attribute float jPhase;
uniform sampler2D uMap;
uniform float uColorT;
uniform float uPixelsPerUnit;
uniform float uPixelRatio;
uniform float uSize;
uniform float uTime;
uniform vec3  uLightDir;
uniform float uUseViewFacing;
uniform float uBrightBase;
uniform float uBrightScale;
uniform float uShimmerSpeed;
varying vec3 vColor;
varying float vLand;
varying float vBorder;
varying float vCountryId;
varying float vFacing;

void main() {
  vec3 dir = normalize(position);
  float phi = acos(clamp(dir.y, -1.0, 1.0));
  float theta = atan(dir.z, -dir.x);
  if (theta < 0.0) theta += 6.283185307;
  vec2 uv = vec2(theta / 6.283185307, phi / 3.141592653);

  vec4 mapSample = texture2D(uMap, uv);
  vLand      = mapSample.r;
  vBorder    = mapSample.g;
  vCountryId = mapSample.b * 15.0;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  vec3 viewNormal = normalize(normalMatrix * dir);
  vec3 viewDir    = normalize(-mvPosition.xyz);
  vFacing = dot(viewNormal, viewDir);

  float facingLight = dot(dir, uLightDir);
  float facing = mix(facingLight, vFacing, uUseViewFacing);
  float shimmer = 0.12 * sin(uTime * uShimmerSpeed + jPhase) * (1.0 - uColorT);
  float b = max(0.0, uBrightBase + (facing * 0.5 + 0.5) * uBrightScale + shimmer);
  vColor = vec3(b);

  float size = uSize * (1.0 + vBorder * uColorT * 0.9);
  gl_PointSize = size * uPixelsPerUnit * uPixelRatio / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const GLOBE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D uDot;
uniform float uColorT;
uniform float uOpacity;
uniform float uTime;
uniform vec2 uCountryData[5];
uniform float uSelIds[5];
varying vec3 vColor;
varying float vLand;
varying float vBorder;
varying float vCountryId;
varying float vFacing;

void main() {
  float b = vColor.r;

  vec3 oceanColor  = vec3(0.10, 0.17, 0.27);
  vec3 landColor   = vec3(2.06, 1.99, 1.87);
  vec3 borderColor = vec3(0.0);
  vec3 riskGreen   = vec3(0.10, 0.72, 0.38);
  vec3 riskYellow  = vec3(0.98, 0.68, 0.12);
  vec3 riskRed     = vec3(1.00, 0.22, 0.16);

  vec3 geo = mix(oceanColor, landColor, vLand);
  geo = mix(geo, borderColor, vBorder);

  int cid = int(vCountryId + 0.5);
  bool selected = false;
  vec2 cd = vec2(0.0);
  for (int i = 0; i < 5; i++) {
    if (cid == int(uSelIds[i] + 0.5)) { cd = uCountryData[i]; selected = true; }
  }
  if (cid >= 1 && selected) {
    float score = cd.x;
    vec3 riskColor = score < 0.5
      ? mix(riskGreen, riskYellow, score * 2.0)
      : mix(riskYellow, riskRed, (score - 0.5) * 2.0);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.0 + score * 3.5) + cd.y);
    float amt = clamp((0.35 + 0.75 * score) * pulse * 1.4, 0.0, 1.0) * uColorT;
    geo = mix(geo, riskColor, amt * vLand);
  }

  vec3 finalColor = mix(vec3(b), geo * 0.5, uColorT);

  float frontVis = smoothstep(0.02, 0.14, vFacing);
  float visibility = mix(1.0, frontVis, uColorT);

  vec4 dot = texture2D(uDot, gl_PointCoord);
  gl_FragColor = vec4(finalColor, 1.0) * dot * uOpacity * visibility;
}
`;

const ATMO_VERTEX_SHADER = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal  = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const ATMO_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform float uIntensity;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 3.0);
  float breathe = 1.0 + 0.22 * sin(uTime * uPulse);
  float ang = atan(vNormal.y, vNormal.x);
  float drift = 1.0
    + 0.16 * sin(ang * 3.0 - uTime * 0.55)
    + 0.10 * sin(ang * 5.0 + uTime * 0.33 + 1.7);
  gl_FragColor = vec4(uColor, rim * uIntensity * 0.55 * breathe * drift);
}
`;

const BORDER_LINE_VERTEX_SHADER = /* glsl */ `
varying float vFacing;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  vFacing = dot(n, normalize(-mv.xyz));
  gl_Position = projectionMatrix * mv;
}
`;

const BORDER_LINE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform float uColorT;
uniform vec3 uColor;
varying float vFacing;
void main() {
  float frontVis = smoothstep(0.02, 0.14, vFacing);
  gl_FragColor = vec4(uColor, frontVis * uColorT * 0.38);
}
`;

async function makeBorderPositions(r, m) {
  const { lats, lons, edges } = decodeBorderLatLon(m);
  const out = new Float32Array(edges.length * 3);
  const D = Math.PI / 180;
  let w = 0;
  for (let e = 0; e < edges.length; e += 2) {
    const a = edges[e], b = edges[e + 1];
    if (Math.abs(lons[a] - lons[b]) > 180) continue;
    for (const i of [a, b]) {
      const lat = lats[i] * D, t = (lons[i] + 180) * D;
      const cl = Math.cos(lat);
      out[w++] = -cl * Math.cos(t) * r;
      out[w++] = Math.sin(lat) * r;
      out[w++] = cl * Math.sin(t) * r;
    }
  }
  return out.slice(0, w);
}

function genThomas(n) {
  const pos = new Float32Array(n * 3);
  const b = 0.19, dt = 0.02;
  let x = 1.1, y = 1.1, z = -0.01;
  for (let i = 0; i < 1000; i++) {
    const dx = (Math.sin(y) - b * x) * dt, dy = (Math.sin(z) - b * y) * dt, dz = (Math.sin(x) - b * z) * dt;
    x += dx; y += dy; z += dz;
  }
  for (let i = 0; i < n; i++) {
    pos[i*3]   = x * 0.4;
    pos[i*3+1] = y * 0.4;
    pos[i*3+2] = z * 0.4;
    const dx = (Math.sin(y) - b * x) * dt, dy = (Math.sin(z) - b * y) * dt, dz = (Math.sin(x) - b * z) * dt;
    x += dx; y += dy; z += dz;
  }
  return pos;
}

function genVoronoi(n, r) {
  const SEEDS = 80, K = 7;
  const seeds = [];
  while (seeds.length < SEEDS) {
    const x = (Math.random() - 0.5) * r * 2.2;
    const y = (Math.random() - 0.5) * r * 2.2;
    const z = (Math.random() - 0.5) * r * 2.2;
    if (x*x + y*y + z*z < r * r * 1.15) seeds.push([x, y, z]);
  }
  const edgeSet = new Set(), edges = [];
  for (let i = 0; i < SEEDS; i++) {
    const dists = seeds
      .map((s, j) => {
        if (i === j) return { j, d: Infinity };
        const dx = seeds[i][0]-s[0], dy = seeds[i][1]-s[1], dz = seeds[i][2]-s[2];
        return { j, d: Math.sqrt(dx*dx + dy*dy + dz*dz) };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, K);
    for (const { j } of dists) {
      const key = Math.min(i,j) + "_" + Math.max(i,j);
      if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([i, j]); }
    }
  }
  const lens = edges.map(([a, b]) => {
    const dx = seeds[a][0]-seeds[b][0], dy = seeds[a][1]-seeds[b][1], dz = seeds[a][2]-seeds[b][2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  });
  const totalLen = lens.reduce((a, b) => a + b, 0);
  const pos = new Float32Array(n * 3);
  let pi = 0;
  for (let e = 0; e < edges.length; e++) {
    const cnt = Math.round((lens[e] / totalLen) * n);
    const [a, b] = edges[e];
    for (let k = 0; k < cnt && pi < n; k++) {
      const t = cnt > 1 ? k / (cnt - 1) : 0.5;
      pos[pi*3]   = seeds[a][0] + (seeds[b][0] - seeds[a][0]) * t;
      pos[pi*3+1] = seeds[a][1] + (seeds[b][1] - seeds[a][1]) * t;
      pos[pi*3+2] = seeds[a][2] + (seeds[b][2] - seeds[a][2]) * t;
      pi++;
    }
  }
  while (pi < n) {
    const e = Math.floor(Math.random() * edges.length);
    const [a, b] = edges[e]; const t = Math.random();
    pos[pi*3]   = seeds[a][0] + (seeds[b][0] - seeds[a][0]) * t;
    pos[pi*3+1] = seeds[a][1] + (seeds[b][1] - seeds[a][1]) * t;
    pos[pi*3+2] = seeds[a][2] + (seeds[b][2] - seeds[a][2]) * t;
    pi++;
  }
  return pos;
}

function ringPos(a, b, rx, rz, phi, buf, i) {
  const lx = a * Math.cos(phi);
  const ly = b * Math.sin(phi);
  const cy = ly * Math.cos(rx), cz = ly * Math.sin(rx);
  buf[i*3]   = lx * Math.cos(rz) - cy * Math.sin(rz);
  buf[i*3+1] = lx * Math.sin(rz) + cy * Math.cos(rz);
  buf[i*3+2] = cz;
}

function atomRings(r) {
  const k = r / 2.4;
  return [
    { a: 2.2 * k, b: 2.2 * k, rx: 0,              rz: 0              },
    { a: 2.0 * k, b: 2.0 * k, rx: Math.PI / 3,    rz: 0              },
    { a: 2.1 * k, b: 2.1 * k, rx: -Math.PI / 4,   rz: Math.PI / 4    },
    { a: 1.8 * k, b: 1.8 * k, rx: Math.PI / 2,    rz: Math.PI / 6    },
  ];
}

function genAtom(n, r) {
  const rings    = atomRings(r);
  const nucleusN = Math.round(n * 0.06);
  const ringN    = n - nucleusN;
  const perRing  = Math.round(ringN / rings.length);
  const phases   = new Float32Array(n);
  const rIdx     = new Uint8Array(n).fill(255);
  const pos      = new Float32Array(n * 3);

  let pi = 0;
  for (let ri = 0; ri < rings.length; ri++) {
    const { a, b, rx, rz } = rings[ri];
    const cnt = ri < rings.length - 1 ? perRing : (ringN - perRing * (rings.length - 1));
    for (let k = 0; k < cnt && pi < n - nucleusN; k++) {
      const phi = (k / Math.max(1, cnt)) * Math.PI * 2;
      phases[pi] = phi;
      rIdx[pi]   = ri;
      ringPos(a, b, rx, rz, phi, pos, pi);
      pi++;
    }
  }
  for (; pi < n; pi++) {
    const r2 = 0.25 * (r / 2.4) * Math.cbrt(Math.random());
    const u  = Math.random(), v = Math.random();
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    pos[pi*3]   = r2 * Math.sin(ph) * Math.cos(th);
    pos[pi*3+1] = r2 * Math.cos(ph);
    pos[pi*3+2] = r2 * Math.sin(ph) * Math.sin(th);
  }
  return { pos, phases, rIdx };
}

function tickAtom(home, phases, rIdx, elapsed, n, r) {
  const rings = atomRings(r);
  const speed = 0.35;
  for (let i = 0; i < n; i++) {
    if (rIdx[i] === 255) continue;
    const { a, b, rx, rz } = rings[rIdx[i]];
    ringPos(a, b, rx, rz, phases[i] + elapsed * speed, home, i);
  }
}

function makeDotTexture(THREE) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0,   "rgba(255,255,255,1)");
  g.addColorStop(0.7, "rgba(255,255,255,0.9)");
  g.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// HERO_FORMS: el quantForms.js de referencia lo importaba pero no lo incluía en
// el extracto entregado. Se reconstruye a partir de los ids que consume el
// switch de HOMES en RiskSphere.jsx. El hero arranca en GLOBE; el resto queda
// disponible para window.riskSphere.select(idx) (mismo comportamiento morph).
const HERO_FORMS = [
  { id: "GLOBE" },
  { id: "SPHERE" },
  { id: "THOMAS" },
  { id: "VORONOI" },
  { id: "ATOM" },
];

/* ============================================================
   RiskSphere — port a vanilla del componente React
   ============================================================ */

const R = 1.8;
const FOCUS_LERP = 0.06;
const MORPH_S = 1.4;
const INTRO_MORPH_S = 1.0;
const BASE_SCALE = 1.3;
const GLOBE_IDX = HERO_FORMS.findIndex((f) => f.id === "GLOBE");
const ATOM_IDX  = HERO_FORMS.findIndex((f) => f.id === "ATOM");

const HOVER_RADIUS       = 0.455;
const HOVER_RADIUS2      = HOVER_RADIUS * HOVER_RADIUS;
const ORBIT_RADIUS       = HOVER_RADIUS * 0.65;
const RADIAL_K           = 12;
const IDLE_THRESHOLD     = 0.6;
const REPEL_ACCEL        = 14;
const ATTRACT_ACCEL_BASE = 6;
const ATTRACT_ACCEL_GROWTH = 18;
const ATTRACT_RAMP       = 1.5;
const SPRING_K           = 9;
const DAMPING            = 0.88;

function whenThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      if (window.THREE) return resolve(window.THREE);
      if (++tries > 600) return reject(new Error("THREE global no disponible"));
      requestAnimationFrame(check);
    };
    check();
  });
}

async function initRiskSphere() {
  const THREE = await whenThree();

  const container = document.getElementById("globalRiskGlobe");
  if (!container) return;

  const geoTex = await makeGeoTexture(THREE, geoMasks);
  const borderPos = await makeBorderPositions(R * 1.003, geoMasks);

  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 768;
  const cores   = navigator.hardwareConcurrency || 4;
  const lowEnd  = (navigator.deviceMemory != null && navigator.deviceMemory <= 4) || cores <= 4;
  const N   = isSmall ? (lowEnd ? 72000 : 220000) : (lowEnd ? 72000 : 160000);
  let DPR = Math.min((window.devicePixelRatio || 1) * (lowEnd ? 1 : 1.25),
                     isSmall ? (lowEnd ? 2 : 3.75) : (lowEnd ? 2 : 2.5));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 6.5;

  const renderer = new THREE.WebGLRenderer({ antialias: !isSmall, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  const canvas = renderer.domElement;
  canvas.dataset.dpr = String(DPR);
  canvas.dataset.n = String(N);
  canvas.style.touchAction = "pan-y";
  canvas.style.userSelect = "none";
  canvas.style.webkitUserSelect = "none";
  canvas.style.webkitTouchCallout = "none";
  canvas.style.webkitTapHighlightColor = "transparent";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const tex = makeDotTexture(THREE);

  const atom = genAtom(N, R);
  const HOMES = HERO_FORMS.map((f) => {
    switch (f.id) {
      case "GLOBE":   return genGlobe(N, R);
      case "SPHERE":  return genSphere(N, R);
      case "THOMAS":  return genThomas(N);
      case "VORONOI": return genVoronoi(N, R);
      case "ATOM":    return atom.pos;
      default:        return genGlobe(N, R);
    }
  });

  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const fovRad    = THREE.MathUtils.degToRad(camera.fov);
  const visibleHW = 2 * Math.tan(fovRad / 2) * camera.position.z;
  const aspect    = container.clientWidth / container.clientHeight;
  const groupScale = Math.min(BASE_SCALE, (visibleHW * aspect * 0.85) / (2 * R));
  const visibleH = visibleHW / groupScale;
  const visibleW = visibleH * aspect;
  const sigmaX = visibleW * 0.5;
  const sigmaY = visibleH * 0.5;
  const sigmaZ = 1.5;
  const scatter = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    scatter[i*3]   = gauss() * sigmaX;
    scatter[i*3+1] = gauss() * sigmaY;
    scatter[i*3+2] = gauss() * sigmaZ;
  }

  let currentIdx  = GLOBE_IDX;
  let prevHome    = scatter;
  let currHome    = HOMES[GLOBE_IDX];
  let morphT      = 0;
  let morphDur    = INTRO_MORPH_S;
  let introActive = true;
  const baseNow  = scatter.slice();
  const effHome  = scatter.slice();

  const dispX = new Float32Array(N), dispY = new Float32Array(N), dispZ = new Float32Array(N);
  const velX  = new Float32Array(N), velY  = new Float32Array(N), velZ  = new Float32Array(N);

  const jPhase  = new Float32Array(N);
  for (let i = 0; i < N; i++) jPhase[i] = Math.random() * Math.PI * 2;

  const geometry = new THREE.BufferGeometry();
  const posAttr  = new THREE.BufferAttribute(effHome, 3);
  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("jPhase",   new THREE.BufferAttribute(jPhase, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap:           { value: geoTex },
      uDot:           { value: tex },
      uColorT:        { value: 1 },
      uOpacity:       { value: 0.715 },
      uCountryData:   { value: makeCountryDataUniform(THREE) },
      uSelIds:        { value: makeSelIdsUniform() },
      uPixelsPerUnit: { value: 1 },
      uPixelRatio:    { value: DPR },
      uSize:          { value: isSmall ? (lowEnd ? 0.022 : 0.0145) : (lowEnd ? 0.019 : 0.016) },
      uTime:          { value: 0 },
      uLightDir:      { value: new THREE.Vector3(0, 0, 0) },
      uUseViewFacing: { value: 1 },
      uBrightBase:    { value: 0.22 },
      uBrightScale:   { value: 0.72 },
      uShimmerSpeed:  { value: 1.8 },
    },
    vertexShader: GLOBE_VERTEX_SHADER,
    fragmentShader: GLOBE_FRAGMENT_SHADER,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  const updatePixelsPerUnit = () => {
    const fr = THREE.MathUtils.degToRad(camera.fov);
    material.uniforms.uPixelsPerUnit.value = (container.clientHeight / 2) / Math.tan(fr / 2);
  };
  updatePixelsPerUnit();

  const group = new THREE.Group();
  group.add(new THREE.Points(geometry, material));

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 0 },
      uTime:      { value: 0 },
      uPulse:     { value: 0.9 },
      uColor: { value: new THREE.Color(0.45, 0.66, 1.0) },
    },
    vertexShader: ATMO_VERTEX_SHADER,
    fragmentShader: ATMO_FRAGMENT_SHADER,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), atmoMat);
  group.add(atmo);

  const borderGeo = new THREE.BufferGeometry();
  borderGeo.setAttribute("position", new THREE.BufferAttribute(borderPos, 3));
  const borderMat = new THREE.ShaderMaterial({
    uniforms: {
      uColorT: { value: 0 },
      uColor:  { value: new THREE.Color(0.78, 0.86, 1.0) },
    },
    vertexShader: BORDER_LINE_VERTEX_SHADER,
    fragmentShader: BORDER_LINE_FRAGMENT_SHADER,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const borderLines = new THREE.LineSegments(borderGeo, borderMat);
  group.add(borderLines);

  group.scale.set(groupScale, groupScale, groupScale);
  scene.add(group);

  let focusTarget = null;

  const api = {
    focusCountry: (lat, lon) => {
      const d = latLonToDir(lat, lon);
      focusTarget = -Math.atan2(d.x, d.z);
    },
    select: (idx) => {
      if (idx < 0 || idx >= HOMES.length || idx === currentIdx) return;
      prevHome   = baseNow.slice();
      currHome   = HOMES[idx];
      currentIdx = idx;
      morphT     = 0;
      morphDur   = MORPH_S;
    },
    setHalo: (hex, score = 50) => {
      atmoMat.uniforms.uColor.value.set(hex).lerp(new THREE.Color(1, 1, 1), 0.3);
      atmoMat.uniforms.uPulse.value = 0.7 + (1 - Math.max(0, Math.min(100, score)) / 100) * 0.9;
      return true;
    },
    setCountryScores: (map) => {
      const arr = material.uniforms.uCountryData.value;
      RISK_COUNTRIES.forEach((c, i) => {
        if (map?.[c.id] != null && arr[i]) arr[i].x = Math.max(0, Math.min(100, map[c.id])) / 100;
      });
    },
    setCountries: (list) => {
      const data = material.uniforms.uCountryData.value;
      list.slice(0, 5).forEach((c, i) => {
        if (!data[i]) return;
        data[i].x = Math.max(0, Math.min(100, c.score ?? 50)) / 100;
        data[i].y = c.phase ?? i * 1.3;
      });
      material.uniforms.uSelIds.value = list.slice(0, 5).map((c) => c.maskId ?? 0);
      return true;
    },
    countries: RISK_COUNTRIES,
  };
  window.riskSphere = api;

  let elapsed = 0, animId = 0, lastFrame = 0, nextFrameAt = 0;
  let lastScrollAt = -1e9;
  let mouseActive = false;
  let lastMoveAt  = 0;
  let settled = false, settleFrames = 0;
  let visible = true;
  let qFrames = 0, qSlow = 0, qDone = DPR <= 1.5;
  const mouseNDC    = new THREE.Vector2();
  const mouseLocal  = new THREE.Vector3();
  const raycaster   = new THREE.Raycaster();
  const hitSphere   = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R);
  const hitPoint    = new THREE.Vector3();
  const localMatrix = new THREE.Matrix4();

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (Math.abs(nx - mouseNDC.x) > 1e-4 || Math.abs(ny - mouseNDC.y) > 1e-4) {
      lastMoveAt = elapsed;
    }
    mouseNDC.x = nx; mouseNDC.y = ny;
    mouseActive = true;
    settled = false; settleFrames = 0;
  };
  const onPointerLeave = () => { mouseActive = false; };
  const onPointerDown  = (e) => { onPointerMove(e); lastMoveAt = elapsed; };
  const onScroll = () => { lastScrollAt = performance.now(); };
  window.addEventListener("scroll", onScroll, { passive: true });
  if (!isSmall) {
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerdown",   onPointerDown);
    container.addEventListener("pointerup",     onPointerLeave);
    container.addEventListener("pointercancel", onPointerLeave);
  }

  let gyroTilt = 0, gyroBase = null;
  const onGyro = (e) => {
    if (e.beta == null) return;
    if (gyroBase === null) gyroBase = e.beta;
    gyroTilt = Math.max(-0.09, Math.min(0.09, (e.beta - gyroBase) / 320));
  };
  const armGyro = async () => {
    try {
      if (typeof DeviceOrientationEvent?.requestPermission === "function") {
        if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return;
      }
      window.addEventListener("deviceorientation", onGyro);
    } catch {}
  };
  if (isSmall && typeof DeviceOrientationEvent !== "undefined") {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      container.addEventListener("touchend", armGyro, { once: true, passive: true });
    } else {
      window.addEventListener("deviceorientation", onGyro);
    }
  }

  function animate(ts = 0) {
    if (!visible) { animId = 0; return; }
    animId = requestAnimationFrame(animate);
    if (ts < nextFrameAt) return;
    nextFrameAt = Math.max(nextFrameAt + 1000 / 60, ts - 32);
    const rawDt = lastFrame ? ts - lastFrame : 1000 / 60;
    const dt = Math.min(rawDt / 1000, 0.05);
    lastFrame = ts; elapsed += dt;

    const simBusy = mouseActive || morphT < 1 || currentIdx === ATOM_IDX || !settled;
    if (!qDone && rawDt < 500 && !simBusy && ts - lastScrollAt > 300) {
      if (rawDt > 34) qSlow++;
      if (++qFrames >= 90) {
        if (qSlow > 30) {
          DPR = Math.max(1.5, DPR - 0.5);
          renderer.setPixelRatio(DPR);
          renderer.setSize(container.clientWidth, container.clientHeight);
          material.uniforms.uPixelRatio.value = DPR;
          canvas.dataset.dpr = String(DPR);
          if (DPR <= 1.5) qDone = true;
        } else {
          qDone = true;
        }
        qFrames = 0; qSlow = 0;
      }
    }

    if (focusTarget !== null) {
      let dyaw = (focusTarget - group.rotation.y) % (2 * Math.PI);
      if (dyaw > Math.PI) dyaw -= 2 * Math.PI;
      if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
      group.rotation.y += dyaw * FOCUS_LERP;
      group.rotation.x += (0 - group.rotation.x) * FOCUS_LERP;
      if (Math.abs(dyaw) < 0.003 && Math.abs(group.rotation.x) < 0.003) {
        group.rotation.y = focusTarget;
        group.rotation.x = 0;
        focusTarget = null;
      }
    } else {
      group.rotation.y += 0.216 * dt;
      group.rotation.x += (Math.sin(elapsed * 0.2) * 0.07 + gyroTilt - group.rotation.x) * 0.03;
    }

    material.uniforms.uTime.value = elapsed;

    const colorTarget = currentIdx === GLOBE_IDX && !introActive ? 1 : 0;
    material.uniforms.uColorT.value += (colorTarget - material.uniforms.uColorT.value) * 0.05;
    atmoMat.uniforms.uIntensity.value = material.uniforms.uColorT.value;
    atmoMat.uniforms.uTime.value      = elapsed;
    borderMat.uniforms.uColorT.value  = material.uniforms.uColorT.value;

    if (mouseActive) {
      raycaster.setFromCamera(mouseNDC, camera);
      const rayLocal = raycaster.ray.clone().applyMatrix4(localMatrix.copy(group.matrixWorld).invert());
      if (rayLocal.intersectSphere(hitSphere, hitPoint)) {
        mouseLocal.copy(hitPoint);
      } else {
        mouseActive = false;
      }
    }

    const idleTime = elapsed - lastMoveAt;
    if (mouseActive && idleTime > 6) mouseActive = false;
    const isAttract = mouseActive && idleTime >= IDLE_THRESHOLD;
    const attractAccel = isAttract
      ? ATTRACT_ACCEL_BASE + Math.min(idleTime - IDLE_THRESHOLD, ATTRACT_RAMP) * ATTRACT_ACCEL_GROWTH
      : 0;

    if (currentIdx === ATOM_IDX) {
      tickAtom(HOMES[ATOM_IDX], atom.phases, atom.rIdx, elapsed, N, R);
    }

    if (morphT < 1) morphT = Math.min(1, morphT + dt / morphDur);
    else introActive = false;

    const needsSim = mouseActive || morphT < 1 || currentIdx === ATOM_IDX || !settled;
    if (needsSim) {
    const mt = morphT < 1 ? eio(morphT) : 1;

    for (let i = 0; i < N; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      const bx = prevHome[ix] + (currHome[ix] - prevHome[ix]) * mt;
      const by = prevHome[iy] + (currHome[iy] - prevHome[iy]) * mt;
      const bz = prevHome[iz] + (currHome[iz] - prevHome[iz]) * mt;
      baseNow[ix] = bx; baseNow[iy] = by; baseNow[iz] = bz;
      const px = bx + dispX[i], py = by + dispY[i], pz = bz + dispZ[i];

      let fx, fy, fz;

      if (mouseActive) {
        const dx = mouseLocal.x - px, dy = mouseLocal.y - py, dz = mouseLocal.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < HOVER_RADIUS2 && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const falloff = 1 - d / HOVER_RADIUS;
          const invD = 1 / d;
          const rx = dx * invD, ry = dy * invD, rz = dz * invD;
          if (isAttract) {
            const tx = -ry, ty = rx, tz = 0;
            const radialErr   = d - ORBIT_RADIUS;
            const radialAccel = radialErr * RADIAL_K;
            const orbitAccel  = falloff * attractAccel;
            fx = rx * radialAccel + tx * orbitAccel;
            fy = ry * radialAccel + ty * orbitAccel;
            fz = rz * radialAccel + tz * orbitAccel;
          } else {
            const accel = falloff * REPEL_ACCEL;
            fx = -rx * accel;
            fy = -ry * accel;
            fz = -rz * accel;
          }
        } else {
          fx = -dispX[i] * SPRING_K;
          fy = -dispY[i] * SPRING_K;
          fz = -dispZ[i] * SPRING_K;
        }
      } else {
        fx = -dispX[i] * SPRING_K;
        fy = -dispY[i] * SPRING_K;
        fz = -dispZ[i] * SPRING_K;
      }

      const vx = (velX[i] + fx * dt) * DAMPING;
      const vy = (velY[i] + fy * dt) * DAMPING;
      const vz = (velZ[i] + fz * dt) * DAMPING;
      velX[i] = vx; velY[i] = vy; velZ[i] = vz;

      const ndx = dispX[i] + vx * dt;
      const ndy = dispY[i] + vy * dt;
      const ndz = dispZ[i] + vz * dt;
      dispX[i] = ndx; dispY[i] = ndy; dispZ[i] = ndz;

      effHome[ix] = bx + ndx;
      effHome[iy] = by + ndy;
      effHome[iz] = bz + ndz;
    }

    posAttr.needsUpdate = true;

    if (!mouseActive && morphT >= 1 && currentIdx !== ATOM_IDX) {
      if (++settleFrames > 90) {
        for (let i = 0; i < N; i++) {
          const ix = i * 3;
          dispX[i] = 0; dispY[i] = 0; dispZ[i] = 0;
          velX[i] = 0; velY[i] = 0; velZ[i] = 0;
          effHome[ix] = baseNow[ix]; effHome[ix + 1] = baseNow[ix + 1]; effHome[ix + 2] = baseNow[ix + 2];
        }
        posAttr.needsUpdate = true;
        settled = true;
      }
    } else settleFrames = 0;
    }

    renderer.render(scene, camera);
  }

  animate();

  const vio = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!visible) { visible = true; lastFrame = 0; nextFrameAt = 0; if (!animId) animate(); }
    } else {
      visible = false;
    }
  }, { threshold: 0.02 });
  vio.observe(container);

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    const newScale = Math.min(BASE_SCALE, (visibleHW * camera.aspect * 0.85) / (2 * R));
    group.scale.set(newScale, newScale, newScale);
    updatePixelsPerUnit();
  };
  window.addEventListener("resize", onResize);
}

function boot() {
  initRiskSphere().catch((err) => console.error("RiskSphere:", err));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
