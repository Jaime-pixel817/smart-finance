// risk-sphere.js
// Port del "Global Risk Map" (RiskSphere) de riskon.lat (Mauricio) a HTML/CSS/JS
// plano — sin React/Next, sin build step. Usa Three.js r128 cargado como global
// (window.THREE) desde CDN.
//
// ═══════════════════════════════════════════════════════════════════════════
// YA NO ES UN MAPA. Es una esfera de puntos, y nada más.
// ═══════════════════════════════════════════════════════════════════════════
//
// El original dibujaba tres capas encima de la nube de partículas: los
// continentes (por una máscara de tierra), las fronteras de los países (por
// líneas de verdad) y un semáforo de riesgo que teñía cinco países de verde,
// ámbar o rojo. Las tres se fueron. Lo que queda es puntos hueso sobre negro,
// con un halo blanco en el borde que le da volumen. Ni un color más.
//
// LO QUE SE LLEVÓ POR DELANTE, Y POR QUÉ NO SE ROMPIÓ NADA
// -------------------------------------------------------
// Antes de borrar se revisó quién usaba cada pieza. Resultado: NADIE fuera de
// este archivo. Ni el HTML, ni los otros scripts, ni las páginas en español
// llamaban a la API de países (setCountryScores, setCountries, countries,
// setHalo) — estaba publicada en window.riskSphere y sin un solo consumidor.
//
// Y con las tres capas fuera, el shader ya no lee la textura, así que se cayó
// TODA la cadena que la construía: la máscara de tierra, la de países, las
// aristas de frontera, el lienzo de 1440x720 que se pintaba píxel a píxel al
// arrancar (con etiquetado de componentes conexas para limpiar islas sueltas),
// y el import de ./geoMasks.js — 551 KB de base64 que el navegador se
// descargaba y parseaba en cada carga del home. La esfera nunca dependió de
// esos datos: sus posiciones salen de una espiral de Fibonacci, que se calcula
// aquí en tres líneas.
//
// El archivo assets/geoMasks.js se DEJA en el repo aunque ya no se importe: si
// algún día se quiere volver a un mapa, volver a generarlo cuesta bastante más
// que tenerlo ahí sin que nadie lo pida.

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



function latLonToDir(lat, lon) {
  const latR  = (lat * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -Math.cos(latR) * Math.cos(theta),
    y: Math.sin(latR),
    z: Math.cos(latR) * Math.sin(theta),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * EL SHADER DE LA ESFERA. Monocromo y nada más.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cada partícula es un punto hueso cuyo brillo depende solo de una cosa:
 * cuánto mira a la cámara. Ya no se muestrea ninguna textura, así que no hay
 * tierra ni océano ni países — la esfera no sabe qué es la geografía.
 *
 * TODAS las partículas se pintan, también las de la cara de atrás. Eso es lo
 * que le da la densidad: la mezcla aditiva de las dos capas es lo que se ve
 * como una nube sólida en vez de como una cáscara.
 */
const GLOBE_VERTEX_SHADER = /* glsl */ `
precision highp float;
attribute float jPhase;
uniform float uPixelsPerUnit;
uniform float uPixelRatio;
uniform float uSize;
uniform float uTime;
uniform vec3  uLightDir;
uniform float uUseViewFacing;
uniform float uBrightBase;
uniform float uBrightScale;
uniform float uShimmerSpeed;
uniform float uPlano;
varying vec3 vColor;

void main() {
  vec3 dir = normalize(position);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  vec3 viewNormal = normalize(normalMatrix * dir);
  vec3 viewDir    = normalize(-mvPosition.xyz);
  float vFacing = dot(viewNormal, viewDir);

  float facingLight = dot(dir, uLightDir);
  float facing = mix(facingLight, vFacing, uUseViewFacing);
  // El titileo es lo unico que se mueve dentro de la esfera. Sin el, la nube
  // se lee como una textura muerta pegada encima.
  float shimmer = 0.12 * sin(uTime * uShimmerSpeed + jPhase);
  float b = max(0.0, uBrightBase + (facing * 0.5 + 0.5) * uBrightScale + shimmer);

  /* ── Por qué la esfera salía oscura por dentro y con un aro brillante ──
   *
   * No era el degradado del texto ni la opacidad: es geometría. Las
   * partículas están repartidas por igual sobre la superficie de una esfera,
   * pero al proyectarla en pantalla esa superficie se comprime hacia el
   * borde: una franja de píxeles cerca del limbo recoge muchísimas más
   * partículas que la misma franja en el centro, porque ahí la superficie se
   * ve de canto. La densidad va como 1/|vFacing|, y con mezcla aditiva eso
   * es exactamente lo que se veía: un disco apagado con un anillo blanco.
   *
   * La corrección es la inversa: multiplicar el brillo por |vFacing|. El
   * producto de las dos queda constante y el disco se lee parejo, que es lo
   * que se pidió — una esfera blanca lisa. El volumen no se pierde: lo pone
   * el halo, que sigue en el borde.
   *
   * El suelo de 0.05 evita que el limbo se apague del todo y deje un canto
   * duro entre la nube y el halo. */
  b *= mix(1.0, max(0.05, abs(vFacing)), uPlano);

  vColor = vec3(b);

  gl_PointSize = uSize * uPixelsPerUnit * uPixelRatio / -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const GLOBE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D uDot;
uniform float uOpacity;
varying vec3 vColor;

void main() {
  vec4 dot = texture2D(uDot, gl_PointCoord);
  gl_FragColor = vec4(vColor, 1.0) * dot * uOpacity;
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

/* ───────────────────────── Color de las fronteras ─────────────────────────
 *
 * Dos variantes, para poder compararlas de verdad y no de memoria. Se cambia
 * en caliente con window.riskSphere.setBorderVariant('verde' | 'hueso').
 *
 * SOBRE EL VERDE Y LA MARCA. El verde de Smart Finance es #16C47F, que tira a
 * turquesa (matiz 157°). El de aquí es un verde fósforo de matiz 112°, o sea
 * 45° más hacia el amarillo: se leen como dos verdes distintos y no como el
 * mismo mal impreso. Aun así son dos verdes en la misma pantalla, que es lo
 * que había que vigilar — ver la nota del informe.
 *
 * Las alfas no son iguales porque el fondo no las trata igual: la mezcla es
 * aditiva sobre una esfera que ya es clara, así que un trazo blanco SUMA
 * blanco sobre blanco y se satura, mientras que uno de color desplaza el
 * matiz y se sigue distinguiendo con menos intensidad. */

// Cuánto tarda el halo en aparecer, una vez que la esfera está formada.
const HALO_FADE_S = 0.9;

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

  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 768;
  const cores   = navigator.hardwareConcurrency || 4;
  const lowEnd  = (navigator.deviceMemory != null && navigator.deviceMemory <= 4) || cores <= 4;

  // ---- Presupuesto de píxeles, no un DPR a ojo -------------------------
  // Lo que ahoga a la GPU de un teléfono aquí no es el número de partículas:
  // es el fill rate. Son THREE.Points con AdditiveBlending, y gl_PointSize va
  // multiplicado por uPixelRatio, así que subir el DPR encarece DOS veces —
  // más píxeles de lienzo Y sprites más grandes sobre cada uno.
  //
  // La escalera estaba invertida: en móvil se pedían 220 000 partículas con
  // tope de DPR 3.75, contra 160 000 y 2.5 en escritorio. En un teléfono de
  // 390 px con DPR 3 eso daba un lienzo de 1462x1275 (1.86 Mpx) para una caja
  // de 390x340 CSS. Medido con EXT_disjoint_timer_query, esa configuración
  // cuesta 2.28 ms de GPU por frame en una RTX 2080 SUPER — el equivalente en
  // una GPU de gama media de teléfono se va muy por encima de los 16.7 ms de
  // presupuesto, y el scroll se congela mientras el globo está en pantalla.
  //
  // Ahora el tope es de área de lienzo y el DPR sale de ahí, así que el costo
  // queda acotado sin importar qué DPR reporte el aparato. Escritorio se queda
  // como estaba: ahí nunca hubo problema.
  const MAX_CANVAS_PX = isSmall ? (lowEnd ? 380000 : 620000) : (lowEnd ? 1200000 : 2600000);
  const boxPx = Math.max(1, container.clientWidth * container.clientHeight);
  const dprCap = isSmall ? (lowEnd ? 1.5 : 2) : (lowEnd ? 2 : 2.5);
  let DPR = Math.min(
    (window.devicePixelRatio || 1) * (lowEnd ? 1 : 1.25),
    dprCap,
    Math.sqrt(MAX_CANVAS_PX / boxPx)
  );
  DPR = Math.max(1, DPR);

  // Las partículas se reparten sobre el lienzo real. 220 000 dentro de una caja
  // de 390x340 era más de una partícula por píxel CSS: densidad que no se
  // alcanza a ver y que sí se paga en cada frame.
  const N = Math.round(Math.min(
    lowEnd ? 72000 : (isSmall ? 110000 : 160000),
    Math.max(48000, boxPx * DPR * DPR * 0.16)
  ));

  /* ── El brillo, calculado en vez de puesto a ojo ───────────────────────
   *
   * EL PROBLEMA: el globo se veía bastante más brillante en un teléfono que en
   * un monitor. No era una impresión, y tampoco era el teléfono: N sale de
   * boxPx * DPR², así que un aparato con más densidad de píxeles recibe MÁS
   * partículas sobre la misma superficie en píxeles CSS. Con mezcla aditiva,
   * más partículas es más luz.
   *
   * LA CORRECCIÓN: dentro de un mismo punto de ruptura, ni el tamaño del punto
   * ni el de la esfera cambian, así que la única variable es N — y la luz va
   * con N. Basta dividir por N, normalizado contra un N de referencia medido
   * en ese punto de ruptura:
   *
   *   móvil, DPR 1 (este laboratorio)  N =  48 000  →  opacidad 1.30
   *   móvil, DPR 3 (un teléfono)       N =  97 300  →  opacidad 0.64
   *   escritorio                       N tope 160 000 →  opacidad 0.47
   *
   * SE INTENTÓ una sola fórmula para todas las pantallas, K/(N·uSize²),
   * razonando que el área del punto va con uSize² y que el alto de la caja se
   * cancela contra el tamaño de la esfera. Sobre el papel cuadra; medido, se
   * pasa por ocho — daba 0.14 en escritorio y el globo casi desaparecía. Así
   * que el número base de cada punto de ruptura va MEDIDO (igualando la media
   * del disco entre móvil y escritorio) y lo único que se calcula es la
   * corrección por N, que es la que sí se comprobó.
   *
   * Antes de todo esto era un 0.715 fijo para todos, y de ahí venía que el
   * mismo globo fuera dos cosas distintas según el aparato. */
  /* El tamaño del punto sube en escritorio de 0.016 a 0.024.
     POR QUÉ: N topa en 160 000 partículas, y en escritorio esas 160 000 se
     reparten sobre una esfera de casi 1000px. La separación entre puntos queda
     en unos 3px, del mismo orden que el propio punto — y ahí la espiral de
     Fibonacci empieza a batir contra la rejilla de píxeles y sale un moiré. No
     se veía antes porque el centro del disco estaba oscuro; al aplanarlo (ver
     uPlano) quedó a la vista. Con el punto más grande los vecinos se solapan y
     el campo se lee como una superficie continua.
     Cuesta relleno —el área va al cuadrado— pero el presupuesto de escritorio
     es el que nunca ha dado problemas. En móvil, que sí los dio, no se toca. */
  const uSize = isSmall ? (lowEnd ? 0.022 : 0.0145) : (lowEnd ? 0.020 : 0.019);
  const OPACIDAD_BASE = isSmall ? 1.30 : 0.47;
  const N_REF = isSmall ? 48000 : 160000;
  const opacidad = Math.max(0.15, Math.min(1.6, OPACIDAD_BASE * (N_REF / N)));

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
  // introActive se quitó: solo servía para saber cuándo encender el modo mapa,
  // que ya no existe. Lo que ahora marca "la esfera ya está" es morphT.
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
      uDot:           { value: tex },
      uOpacity:       { value: opacidad },
      uPixelsPerUnit: { value: 1 },
      uPixelRatio:    { value: DPR },
      uSize:          { value: uSize },
      uTime:          { value: 0 },
      uLightDir:      { value: new THREE.Vector3(0, 0, 0) },
      uUseViewFacing: { value: 1 },
      uBrightBase:    { value: 0.22 },
      uBrightScale:   { value: 0.72 },
      uShimmerSpeed:  { value: 1.8 },
      // 1 = disco completamente parejo. Se deja un pelo por debajo para que
      // quede un rastro de aro y la esfera no se lea como un círculo plano.
      uPlano:         { value: 0.92 },
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

  /* El halo del borde — la "capa de ozono" que le da volumen a la esfera.
     Era azul (0.45, 0.66, 1.0) porque venía del original, donde acompañaba a
     un océano azul. Sin océano, ese azul era el único color que quedaba en
     toda la pantalla, así que pasa a gris neutro. El efecto de volumen no
     depende del tono: lo hace el rim (pow de 1 menos el facing) más el
     respiro y la deriva, que se quedan igual. */
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 0 },
      uTime:      { value: 0 },
      uPulse:     { value: 0.9 },
      uColor: { value: new THREE.Color(0.86, 0.86, 0.86) },
    },
    vertexShader: ATMO_VERTEX_SHADER,
    fragmentShader: ATMO_FRAGMENT_SHADER,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 48), atmoMat);
  group.add(atmo);

  group.scale.set(groupScale, groupScale, groupScale);
  scene.add(group);

  let focusTarget = null;

  /* Lo que queda de la API pública. Todo lo demás —setHalo, setCountryScores,
     setCountries, countries, setBorderVariant— se fue con los países y las
     fronteras. Ninguna de esas la llamaba nadie.

     focusCountry se queda aunque ya no haya países: lo único que hace es
     apuntar una longitud hacia la cámara, y es la forma de dejar el globo en
     una posición concreta para revisarlo. select() también, que es lo que
     cambia entre las cinco formas (esfera, Thomas, Voronoi, átomo). */
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
  };
  window.riskSphere = api;

  // Fundido de lo que se suma a la esfera ya formada: fronteras, halo y
  // semáforo de riesgo. 0 mientras las partículas convergen, 1 después.
  let fadeExtras = 0;
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

    /* ── El halo entra cuando la esfera ya está ───────────────────────────
     *
     * Las partículas nacen dispersas y convergen (eso lo lleva morphT). El
     * halo no puede estar desde el primer frame: es un anillo en el radio
     * final, y mientras el polvo todavía anda suelto por la pantalla se vería
     * una burbuja flotando alrededor de nada. Aparece con un fundido de 0.9 s
     * en cuanto la esfera está casi cuajada, y remata la entrada.
     *
     * Antes este mismo fundido encendía también las fronteras y el semáforo de
     * riesgo; ya no existen, así que solo queda el halo. */
    const formada = morphT > 0.8 ? 1 : 0;
    const paso = dt / HALO_FADE_S;
    fadeExtras += (formada ? paso : -paso);
    fadeExtras = Math.max(0, Math.min(1, fadeExtras));
    // Suavizado en los extremos, para que no arranque ni pare en seco.
    const fade = fadeExtras * fadeExtras * (3 - 2 * fadeExtras);

    atmoMat.uniforms.uIntensity.value = fade;
    atmoMat.uniforms.uTime.value      = elapsed;

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
