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



/* ═══════════════════════════════════════════════════════════════════════════
 * CONVENCIÓN lat/lon → xyz (espacio local del grupo, antes de girarlo)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La esfera no tiene geografía, pero SÍ orientación, y toda la capa de
 * mercados (marcadores de bolsas, día y noche) depende de que sea una sola:
 *
 *   - Eje polar = +Y. Polo norte arriba (lat +90 → y = +1). El giro del globo
 *     es group.rotation.y, o sea alrededor del eje polar, como la Tierra.
 *   - Meridiano 0 (Greenwich) = +X. Longitud este positiva hacia -Z.
 *
 *     x =  cos(lat) · cos(lon)
 *     y =  sin(lat)
 *     z = -cos(lat) · sin(lon)
 *
 *   Con rotation.y = 0 la cámara (en +Z) mira la longitud -90 (América).
 *
 * La fórmula de abajo es la original del port (theta = lon + 180) y da
 * exactamente estos valores; se deja así para no mover focusCountry. */
function latLonToDir(lat, lon) {
  const latR  = (lat * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -Math.cos(latR) * Math.cos(theta),
    y: Math.sin(latR),
    z: Math.cos(latR) * Math.sin(theta),
  };
}

/* Vector solar en el mismo espacio local: apunta desde el centro de la esfera
 * al punto subsolar (donde el sol está en el cenit). Declinación por fecha y
 * ángulo horario por la hora UTC, con la ecuación del tiempo para no errar el
 * mediodía por un cuarto de hora. Precisión de ~1°, de sobra para pintar una
 * mitad iluminada. Como el vector va en el espacio del grupo, gira con la
 * esfera y el terminador se queda donde le toca sobre los marcadores. */
function subsolarDir(date) {
  const d = date || new Date();
  const inicio = Date.UTC(d.getUTCFullYear(), 0, 0);
  const N = (d.getTime() - inicio) / 86400000;            // día del año, fraccional
  const g = (2 * Math.PI / 365) * (N - 1);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);   // radianes
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)); // minutos
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  // Mediodía solar en UTC → longitud subsolar: 0° a las 12:00 (menos la EoT),
  // y 15° hacia el oeste por cada hora que pasa.
  const lonSub = -(utcMin + eot - 720) / 4;
  return latLonToDir(decl * 180 / Math.PI, lonSub);
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
uniform vec3  uSunDir;
uniform float uNoche;
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

  /* Día y noche. uSunDir apunta al punto subsolar (ver subsolarDir). La cara
     que mira al sol sube un pelo, la opuesta baja bastante; el terminador es
     una franja suave de -0.15..0.25 en el coseno (~23°) para que no se lea
     como un corte. Casi todo el contraste va a la noche y no al día, a
     propósito: subir el día pelea con el titular que va encima del globo
     (ver .hero-grid::before en index.html), bajar la noche no. */
  float sol = dot(dir, uSunDir);
  b *= mix(1.0 - uNoche, 1.0 + uNoche * 0.15, smoothstep(-0.15, 0.25, sol));

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

/* ═══════════════════════════════════════════════════════════════════════════
 * REJILLA ESPACIAL — para no recorrer 97 000 partículas por cada frame
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El bucle de la simulación recorría TODAS las partículas en cada frame en el
 * que hubiera un puntero encima. Medido: 10.6 ms de hilo principal por frame
 * con 160 000 partículas, contra 0.04 ms con la esfera quieta. En escritorio
 * se aguanta; en un teléfono, con el presupuesto en 16.7 ms y una CPU tres o
 * cuatro veces más lenta, no — y por eso el efecto estaba apagado en móvil.
 *
 * Pero el trabajo de verdad es minúsculo: el dedo solo empuja lo que tiene
 * alrededor. Un casquete de radio 0.455 sobre una esfera de radio 1.8 es el
 * 1.6 % de la superficie. Todo lo demás es recorrer partículas para
 * comprobar que están lejos y no hacerles nada.
 *
 * Esta rejilla responde "¿qué partículas hay cerca de este punto?" sin mirar
 * las demás. Es una ordenación por cubos (counting sort):
 *
 *   inicio[c]              dónde empieza el cubo c dentro de items
 *   items[inicio[c]..]     los índices de partícula que caen en ese cubo
 *
 * Dos arrays de enteros y ni un objeto por partícula, que con 97 000 sería
 * basura para el recolector. Se construye UNA vez, al arrancar, porque las
 * posiciones de reposo de la esfera no cambian nunca.
 */
function construirRejilla(pos, n, radio, lado) {
  const min = -radio * 1.02;
  const tam = (radio * 2.04) / lado;          // arista de cada cubo
  const cubos = lado * lado * lado;
  const cubo = new Int32Array(n);
  const inicio = new Int32Array(cubos + 1);

  for (let i = 0; i < n; i++) {
    const ix = i * 3;
    let cx = ((pos[ix] - min) / tam) | 0;
    let cy = ((pos[ix + 1] - min) / tam) | 0;
    let cz = ((pos[ix + 2] - min) / tam) | 0;
    if (cx < 0) cx = 0; else if (cx >= lado) cx = lado - 1;
    if (cy < 0) cy = 0; else if (cy >= lado) cy = lado - 1;
    if (cz < 0) cz = 0; else if (cz >= lado) cz = lado - 1;
    const c = (cz * lado + cy) * lado + cx;
    cubo[i] = c;
    inicio[c + 1]++;
  }
  for (let c = 0; c < cubos; c++) inicio[c + 1] += inicio[c];

  const items = new Int32Array(n);
  const cursor = new Int32Array(cubos);
  for (let i = 0; i < n; i++) {
    const c = cubo[i];
    items[inicio[c] + cursor[c]] = i;
    cursor[c]++;
  }
  return { lado, min, tam, inicio, items };
}

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

// Si el sistema pide menos movimiento, el globo se pinta una vez y se queda
// quieto (ver el final de initRiskSphere). Se lee una sola vez al cargar.
const REDUCED_MOTION = typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* La rejilla se construye sobre las posiciones de reposo de la ESFERA, que
     es la forma en la que el globo vive siempre. Ocho cubos por lado dan una
     arista de 0.46, prácticamente el radio de acción del dedo (0.455): así el
     vecindario de 3x3x3 cubos cubre el casquete entero con margen de sobra
     para lo que las partículas se hayan desplazado. */
  const rejilla = construirRejilla(HOMES[GLOBE_IDX], N, R, 8);

  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const fovRad    = THREE.MathUtils.degToRad(camera.fov);
  const visibleHW = 2 * Math.tan(fovRad / 2) * camera.position.z;
  /* En el primer frame el contenedor puede medir 0 (el CSS del hero todavía
     no le da alto): 0/0 es NaN, los sigmas de abajo salían NaN y ese NaN
     acababa en computeBoundingSphere ("Computed radius is NaN" en consola).
     Respaldo 1 — onResize ajusta cámara y renderer cuando ya hay tamaño. */
  const aspect    = (container.clientWidth > 0 && container.clientHeight > 0)
    ? container.clientWidth / container.clientHeight
    : 1;
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

  /* ── El conjunto activo ────────────────────────────────────────────────
   *
   * La otra mitad del ahorro. La rejilla dice qué partículas toca el dedo AHORA;
   * esto se acuerda de las que ya lo tocó y todavía están volviendo a su sitio.
   * Sin ello habría que recorrer las N para ver quién sigue en movimiento, que
   * es justo lo que se quería evitar.
   *
   * activos    índices, sin orden
   * enActivos  0/1 por partícula, para no meter la misma dos veces
   *
   * Una partícula entra cuando el dedo la alcanza y sale cuando su
   * desplazamiento y su velocidad bajan del umbral: ahí se la clava en su
   * posición de reposo y deja de costar nada. */
  const activos = new Int32Array(N);
  const enActivos = new Uint8Array(N);
  let nActivos = 0;
  // Por debajo de esto el ojo no distingue la partícula de su sitio, así que
  // se da por vuelta. Al cuadrado para no tener que sacar raíces.
  const QUIETA2 = 1e-8;

  function activar(i) {
    if (enActivos[i]) return;
    enActivos[i] = 1;
    activos[nActivos++] = i;
  }

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
      uSunDir:        { value: new THREE.Vector3(1, 0, 0) },
      // 0.58: la noche queda al 42 % y el día al 109 % del brillo base.
      uNoche:         { value: 0.58 },
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

  /* ═══════════════════════════════════════════════════════════════════════
   * GLOBO DE MERCADOS: el sol y las bolsas
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Dos cosas encima de la nube, las dos ancladas a la convención lat/lon de
   * arriba:
   *
   *   1. EL SOL. uSunDir se recalcula al arrancar y cada 60 s (no cada frame:
   *      el sol se mueve un cuarto de grado por minuto). Ver subsolarDir.
   *   2. LAS BOLSAS. Un THREE.Points de ocho vértices a radio R·1.03 (un pelo
   *      por fuera de la nube para que no se hundan en ella), con un shader
   *      propio: punto + halo, color por el cambio del día (aColor), halo que
   *      respira si la bolsa está abierta (aOpen), y se apagan al pasar a la
   *      cara de atrás (vFacing). Los datos llegan del DOM: assets/
   *      world-markets.js pide /api/world, calcula abierto/cerrado y avisa
   *      con el evento "world:data"; aquí solo se pinta. Mientras no hay
   *      datos los ocho puntos están en su sitio en gris neutro, así que el
   *      globo ya enseña DÓNDE están las bolsas desde el primer frame.
   *
   * TODO (v2, no entró en esta tanda): arcos desde Ciudad de México a las
   * otras siete bolsas — curvas sobre R·1.05 (quadratic Bézier por el punto
   * medio elevado, ~40 segmentos cada una, UNA sola geometría LineSegments
   * con fundido por vFacing como el de los marcadores), encendidas solo con
   * el marcador de México seleccionado para no ensuciar el globo. Medir el
   * costo en el teléfono antes: son 280 segmentos más por frame.
   *
   * El toque/clic no usa raycast sobre sprites: se proyectan las ocho
   * posiciones a píxeles y se busca la más cercana al dedo dentro de 22 px
   * (área de 44 px, el mínimo táctil). Ocho puntos, cero coste. El resultado
   * sale como evento "globe:marker" {id} para que la tarjeta (HTML) lo pinte.
   */
  const MARK_R = R * 1.03;
  const MARK_PX = isSmall ? 26 : 24;      // diámetro del halo en px CSS
  const HIT_PX = 22;                       // radio de toque (44 px de área)
  const EXCHANGES_DEFAULT = [
    { id: "nyc", lat: 40.71,  lon: -74.01 },
    { id: "yto", lat: 43.65,  lon: -79.38 },
    { id: "mex", lat: 19.43,  lon: -99.13 },
    { id: "sao", lat: -23.55, lon: -46.63 },
    { id: "lon", lat: 51.51,  lon: -0.13 },
    { id: "fra", lat: 50.11,  lon: 8.68 },
    { id: "tyo", lat: 35.68,  lon: 139.69 },
    { id: "hkg", lat: 22.32,  lon: 114.17 },
  ];
  // Colores de --up / --down / neutro de assets/tokens.css, en lineal 0-1.
  const COL_UP = [0.086, 0.769, 0.498], COL_DOWN = [1.0, 0.302, 0.302], COL_FLAT = [0.72, 0.72, 0.74];
  let markers = EXCHANGES_DEFAULT.slice();
  const NM = markers.length;
  const mPos = new Float32Array(NM * 3), mCol = new Float32Array(NM * 3);
  const mOpen = new Float32Array(NM), mIdx = new Float32Array(NM);
  const setMarkerPos = () => {
    for (let i = 0; i < NM; i++) {
      const d = latLonToDir(markers[i].lat, markers[i].lon);
      mPos[i*3] = d.x * MARK_R; mPos[i*3+1] = d.y * MARK_R; mPos[i*3+2] = d.z * MARK_R;
      mCol[i*3] = COL_FLAT[0]; mCol[i*3+1] = COL_FLAT[1]; mCol[i*3+2] = COL_FLAT[2];
      mIdx[i] = i;
    }
  };
  setMarkerPos();
  const mGeom = new THREE.BufferGeometry();
  mGeom.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  mGeom.setAttribute("aColor",   new THREE.BufferAttribute(mCol, 3));
  mGeom.setAttribute("aOpen",    new THREE.BufferAttribute(mOpen, 1));
  mGeom.setAttribute("aIdx",     new THREE.BufferAttribute(mIdx, 1));
  const mMat = new THREE.ShaderMaterial({
    uniforms: {
      uPx:   { value: MARK_PX * DPR },
      uTime: { value: 0 },
      uSel:  { value: -1 },
      uFade: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aOpen; attribute float aIdx;
      uniform float uPx; uniform float uSel;
      varying vec3 vCol; varying float vOpen; varying float vFacing; varying float vSel;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFacing = dot(normalize(normalMatrix * normalize(position)), normalize(-mv.xyz));
        vCol = aColor; vOpen = aOpen; vSel = (abs(aIdx - uSel) < 0.5) ? 1.0 : 0.0;
        gl_PointSize = uPx * (1.0 + 0.35 * vSel);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime; uniform float uFade;
      varying vec3 vCol; varying float vOpen; varying float vFacing; varying float vSel;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float r = length(q) * 2.0;                 // 0 centro, 1 borde
        // Punto sólido con borde suave…
        float core = 1.0 - smoothstep(0.27, 0.40, r);
        // …y halo: un anillo que respira si la bolsa está abierta, fijo y
        // más tenue si está cerrada.
        float pulso = mix(0.0, 0.5 + 0.5 * sin(uTime * 2.2), vOpen);
        float rh = mix(0.55, 0.95, pulso);
        float halo = (1.0 - smoothstep(rh - 0.25, rh + 0.08, r)) * smoothstep(0.36, 0.55, r);
        halo *= mix(0.28, 0.55 - 0.3 * pulso, vOpen);
        float anillo = vSel * (1.0 - smoothstep(0.0, 0.12, abs(r - 0.9)));
        float a = max(max(core, halo), anillo);
        // Se apagan al girar a la cara de atrás.
        a *= smoothstep(-0.08, 0.22, vFacing) * uFade;
        vec3 col = mix(vCol, vec3(1.0), 0.55 * core + 0.4 * anillo);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, depthTest: false,
  });
  const mPoints = new THREE.Points(mGeom, mMat);
  mPoints.renderOrder = 2;
  group.add(mPoints);

  const sunDir = material.uniforms.uSunDir.value;
  const actualizarSol = () => { const d = subsolarDir(); sunDir.set(d.x, d.y, d.z); };
  actualizarSol();
  // Ganchos que rellenan el bucle de animación o el modo quieto.
  let repintar = null;

  function aplicarMercados(data) {
    if (!data || !Array.isArray(data.items)) return;
    const byId = new Map(data.items.map((it) => [it.id, it]));
    // Si el endpoint trae otras coordenadas (o más bolsas algún día) manda
    // él, dentro de los NM huecos que hay.
    for (let i = 0; i < NM; i++) {
      const it = byId.get(markers[i].id);
      if (!it) { mOpen[i] = 0; continue; }
      if (typeof it.lat === "number" && typeof it.lon === "number") { markers[i].lat = it.lat; markers[i].lon = it.lon; }
      const c = typeof it.changePct !== "number" ? COL_FLAT
        : it.changePct > 0.0001 ? COL_UP : it.changePct < -0.0001 ? COL_DOWN : COL_FLAT;
      mCol[i*3] = c[0]; mCol[i*3+1] = c[1]; mCol[i*3+2] = c[2];
      mOpen[i] = it.open ? 1 : 0;
    }
    setMarkerPosOnly();
    mGeom.attributes.position.needsUpdate = true;
    mGeom.attributes.aColor.needsUpdate = true;
    mGeom.attributes.aOpen.needsUpdate = true;
    if (repintar) repintar();
  }
  function setMarkerPosOnly() {
    for (let i = 0; i < NM; i++) {
      const d = latLonToDir(markers[i].lat, markers[i].lon);
      mPos[i*3] = d.x * MARK_R; mPos[i*3+1] = d.y * MARK_R; mPos[i*3+2] = d.z * MARK_R;
    }
  }
  document.addEventListener("world:data", (e) => aplicarMercados(e.detail));
  document.addEventListener("world:select", (e) => {
    const id = e.detail && e.detail.id;
    mMat.uniforms.uSel.value = markers.findIndex((m) => m.id === id);
    if (repintar) repintar();
  });
  if (window.SmartWorld && window.SmartWorld.data) aplicarMercados(window.SmartWorld.data);

  // Proyecta los marcadores y devuelve el id del más cercano al punto (px CSS
  // relativos al contenedor), o null si ninguno cae dentro de HIT_PX.
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();
  function marcadorEn(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    group.updateMatrixWorld(true);
    let mejor = null, mejorD = HIT_PX * HIT_PX;
    for (let i = 0; i < NM; i++) {
      _v.set(mPos[i*3], mPos[i*3+1], mPos[i*3+2]).applyMatrix4(group.matrixWorld);
      _n.copy(_v).normalize();
      _c.copy(camera.position).sub(_v).normalize();
      if (_n.dot(_c) < 0.02) continue;                 // cara de atrás
      _v.project(camera);
      const sx = (_v.x + 1) / 2 * rect.width, sy = (1 - _v.y) / 2 * rect.height;
      const d = (sx - px) * (sx - px) + (sy - py) * (sy - py);
      if (d < mejorD) { mejorD = d; mejor = markers[i].id; }
    }
    return mejor;
  }
  function avisarToque(clientX, clientY) {
    const id = marcadorEn(clientX, clientY);
    if (!id) return false;
    document.dispatchEvent(new CustomEvent("globe:marker", { detail: { id } }));
    return true;
  }

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
      // Cambiar de forma invalida las posiciones de reposo y la rejilla, que
      // está construida sobre la esfera. Se vuelve al camino completo hasta
      // que todo se asiente otra vez.
      asentadoUnaVez = false;
      for (let a = 0; a < nActivos; a++) enActivos[activos[a]] = 0;
      nActivos = 0;
    },
  };
  window.riskSphere = api;

  // Fundido de lo que se suma a la esfera ya formada: fronteras, halo y
  // semáforo de riesgo. 0 mientras las partículas convergen, 1 después.
  let fadeExtras = 0;
  // Se enciende cuando la entrada termina de asentarse y las posiciones de
  // reposo ya son definitivas. A partir de ahí el camino rápido puede confiar
  // en baseNow. Vuelve a cero si se cambia de forma con select().
  let asentadoUnaVez = false;
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
  // Estado del gesto táctil. Se declara aquí arriba porque onScroll lo mira.
  let gestoTactil = null;    // null sin decidir | "efecto" | "scroll"
  const onScroll = () => {
    lastScrollAt = performance.now();
    // Si la página se movió, esto era un scroll. Se suelta el efecto en el
    // acto, sin discutir. Ver el bloque táctil de más abajo.
    if (gestoTactil) { gestoTactil = "scroll"; mouseActive = false; }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  if (!isSmall) {
    // Clic (sin arrastre) sobre una bolsa → tarjeta. Cursor de mano al pasar
    // por encima de una, para que se note que se puede.
    let cx0 = 0, cy0 = 0;
    container.addEventListener("pointerdown", (e) => { cx0 = e.clientX; cy0 = e.clientY; });
    container.addEventListener("click", (e) => {
      const dx = e.clientX - cx0, dy = e.clientY - cy0;
      if (dx * dx + dy * dy <= 36) avisarToque(e.clientX, e.clientY);
    });
    let cursorEs = "";
    container.addEventListener("pointermove", (e) => {
      const c = marcadorEn(e.clientX, e.clientY) ? "pointer" : "";
      if (c !== cursorEs) { cursorEs = c; canvas.style.cursor = c; }
    });
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("pointerdown",   onPointerDown);
    container.addEventListener("pointerup",     onPointerLeave);
    container.addEventListener("pointercancel", onPointerLeave);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * EL DEDO, EN MÓVIL
   * ═══════════════════════════════════════════════════════════════════════
   *
   * El efecto estaba apagado en móvil por dos motivos, y hubo que resolver los
   * dos antes de encenderlo:
   *
   *   1. COSTABA DEMASIADO. Lo arregla la rejilla espacial de más arriba: en
   *      vez de recorrer las 48-97 mil partículas por frame, se tocan solo las
   *      del casquete que hay bajo el dedo.
   *   2. COMPETÍA CON EL SCROLL. Lo resuelve este bloque.
   *
   * LA REGLA DE ORO: aquí NO se llama nunca a preventDefault, y todos los
   * listeners son passive:true. O sea que el navegador conserva el control
   * absoluto del scroll — este código no puede bloquearlo ni aunque se
   * equivoque en todas las decisiones que toma abajo. Lo único que se decide
   * es si además se le pasa la posición del dedo a las partículas.
   *
   * Y ENCIMA SE RINDE SOLO. En cuanto llega un evento de scroll de verdad
   * (ver onScroll), el efecto se apaga y ese gesto queda descartado hasta que
   * el dedo se levante. Si el navegador decidió que era un scroll, se acabó.
   *
   * CÓMO DISTINGUE UNA CARICIA DE UN SCROLL. Un scroll empieza con un tirón
   * vertical y rápido. Una caricia es otra cosa: o va de lado, o empieza
   * despacio. Así que se activa si el movimiento es predominantemente
   * horizontal, o si el dedo estuvo quieto un momento antes de arrancar.
   * Mientras no haya decisión no se hace nada, así que un scroll normal no
   * llega a encender el efecto ni un frame.
   *
   * SOBRE LOS BOTONES, NADA. Un toque que empieza en un enlace o un botón se
   * descarta de entrada: ahí el dedo va a pulsar, no a jugar.
   */
  const UMBRAL_PX = 10;      // cuánto hay que moverse para que haya que decidir
  const QUIETO_MS = 110;     // quieto más de esto = no venías a hacer scroll
  const SESGO_H = 1.2;       // cuánto más horizontal que vertical para contar

  let tx0 = 0, ty0 = 0, tms0 = 0;

  function apuntarTacto(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    lastMoveAt = elapsed;
    mouseActive = true;
  }

  function soltarTacto() {
    gestoTactil = null;
    mouseActive = false;
  }

  if (isSmall) {
    // La zona es el hero entero, no solo el lienzo: se pidió que funcione
    // también pasando el dedo por encima del texto.
    const zona = container.closest(".hero") || container;

    zona.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { gestoTactil = "scroll"; return; }
      const t = e.touches[0];
      const sobre = t.target && t.target.closest
        ? t.target.closest("a, button, input, textarea, label, select")
        : null;
      if (sobre) { gestoTactil = "scroll"; return; }   // es un toque, no una caricia
      gestoTactil = null;
      tx0 = t.clientX; ty0 = t.clientY; tms0 = performance.now();
    }, { passive: true });

    zona.addEventListener("touchmove", (e) => {
      if (gestoTactil === "scroll" || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - tx0, dy = t.clientY - ty0;

      if (gestoTactil === null) {
        const lejos = (dx * dx + dy * dy) > UMBRAL_PX * UMBRAL_PX;
        const quieto = (performance.now() - tms0) > QUIETO_MS;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        /* Dos formas de ganarse el efecto:
             - el gesto va claramente de lado (ax > ay * 1.2), o
             - el dedo se entretuvo antes de arrancar Y no está bajando en
               vertical pura (ax > ay * 0.6).
           Esa segunda condición es la que evita el falso positivo obvio: un
           scroll lento también empieza con el dedo quieto, y sin ella se
           encendería el efecto justo antes de que la página se mueva. */
        if (!lejos) { if (!quieto) return; gestoTactil = "efecto"; }
        else if (ax > ay * SESGO_H) gestoTactil = "efecto";
        else if (quieto && ax > ay * 0.6) gestoTactil = "efecto";
        else gestoTactil = "scroll";
        if (gestoTactil !== "efecto") return;
      }
      apuntarTacto(t.clientX, t.clientY);
    }, { passive: true });

    zona.addEventListener("touchend", (e) => {
      /* Un TOQUE (no una caricia ni un scroll): el dedo no se movió más de
         UMBRAL_PX y se levantó antes de 350 ms. Solo entonces se mira si
         había una bolsa debajo. Mismo evento pasivo: el scroll no se toca. */
      const t = e.changedTouches && e.changedTouches[0];
      if (t && gestoTactil === null && performance.now() - tms0 < 350) {
        const dx = t.clientX - tx0, dy = t.clientY - ty0;
        if (dx * dx + dy * dy <= UMBRAL_PX * UMBRAL_PX) avisarToque(t.clientX, t.clientY);
      }
      soltarTacto();
    }, { passive: true });
    zona.addEventListener("touchcancel", soltarTacto, { passive: true });
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

  let ultimoSol = 0;
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
          mMat.uniforms.uPx.value = MARK_PX * DPR;
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
    mMat.uniforms.uFade.value = fade;
    mMat.uniforms.uTime.value = elapsed;
    if (ts - ultimoSol > 60000) { ultimoSol = ts; actualizarSol(); }

    if (mouseActive) {
      raycaster.setFromCamera(mouseNDC, camera);
      const rayLocal = raycaster.ray.clone().applyMatrix4(localMatrix.copy(group.matrixWorld).invert());
      if (rayLocal.intersectSphere(hitSphere, hitPoint)) {
        mouseLocal.copy(hitPoint);
      } else if (isSmall) {
        /* El rayo no dio en la esfera. En escritorio eso significaba "el ratón
           se salió del globo, apaga"; en móvil no sirve, porque se pidió que
           el efecto responda también sobre el TEXTO del hero, y buena parte
           del texto cae fuera del disco.
           Así que en vez de apagar, se proyecta: se busca el punto del rayo
           más cercano al centro y se lleva a la superficie. El dedo empuja
           entonces el borde de la esfera más cercano a donde está, que es lo
           que se espera al pasarlo por al lado. */
        rayLocal.closestPointToPoint(hitSphere.center, hitPoint);
        const d = hitPoint.length();
        if (d > 1e-5) mouseLocal.copy(hitPoint).multiplyScalar(R / d);
        else mouseActive = false;
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

    /* ── Dos caminos para la simulación ──────────────────────────────────
     *
     * RÁPIDO: la esfera ya está formada y quieta, y lo único que pasa es que
     * hay un dedo o un ratón encima. Solo se tocan las partículas que el
     * puntero alcanza (las encuentra la rejilla) más las que siguen volviendo
     * a su sitio (las recuerda el conjunto activo). Es el camino que hace
     * viable el efecto en un teléfono.
     *
     * COMPLETO: durante la entrada, durante un cambio de forma o mientras el
     * átomo gira, TODAS las partículas se mueven a la vez y no hay nada que
     * ahorrar. Es el bucle de siempre, intacto.
     */
    /* asentadoUnaVez, y no `settled`, porque el manejador del puntero pone
       settled en false en cuanto te acercas — y entonces el camino rápido no
       se usaría nunca, que es justo al revés de lo que se busca. Lo que hace
       falta saber aquí es otra cosa: si la entrada ya terminó de asentarse
       alguna vez, o sea si las posiciones de reposo son de fiar. */
    const puedeRapido = morphT >= 1 && currentIdx === GLOBE_IDX && asentadoUnaVez;

    if (puedeRapido) {
      if (mouseActive) {
        /* Vecindario de 3x3x3 cubos alrededor del dedo. Se marcan como
           activas; el bucle de abajo ya se encarga de empujarlas. */
        const g = rejilla;
        let cx = ((mouseLocal.x - g.min) / g.tam) | 0;
        let cy = ((mouseLocal.y - g.min) / g.tam) | 0;
        let cz = ((mouseLocal.z - g.min) / g.tam) | 0;
        for (let dz = -1; dz <= 1; dz++) {
          const z = cz + dz; if (z < 0 || z >= g.lado) continue;
          for (let dy = -1; dy <= 1; dy++) {
            const y = cy + dy; if (y < 0 || y >= g.lado) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const x = cx + dx; if (x < 0 || x >= g.lado) continue;
              const c = (z * g.lado + y) * g.lado + x;
              const fin = g.inicio[c + 1];
              for (let k = g.inicio[c]; k < fin; k++) activar(g.items[k]);
            }
          }
        }
      }

      if (nActivos) {
        let escribeMin = N, escribeMax = 0;
        let quedan = 0;
        for (let a = 0; a < nActivos; a++) {
          const i = activos[a];
          const ix = i * 3, iy = ix + 1, iz = ix + 2;
          const bx = baseNow[ix], by = baseNow[iy], bz = baseNow[iz];
          const px = bx + dispX[i], py = by + dispY[i], pz = bz + dispZ[i];

          let fx, fy, fz;
          let empujada = false;
          if (mouseActive) {
            const dx = mouseLocal.x - px, dy = mouseLocal.y - py, dz = mouseLocal.z - pz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < HOVER_RADIUS2 && d2 > 1e-8) {
              empujada = true;
              const d = Math.sqrt(d2);
              const falloff = 1 - d / HOVER_RADIUS;
              const invD = 1 / d;
              const rx = dx * invD, ry = dy * invD, rz = dz * invD;
              if (isAttract) {
                const tx = -ry, ty = rx, tz = 0;
                const radialAccel = (d - ORBIT_RADIUS) * RADIAL_K;
                const orbitAccel = falloff * attractAccel;
                fx = rx * radialAccel + tx * orbitAccel;
                fy = ry * radialAccel + ty * orbitAccel;
                fz = rz * radialAccel + tz * orbitAccel;
              } else {
                const accel = falloff * REPEL_ACCEL;
                fx = -rx * accel; fy = -ry * accel; fz = -rz * accel;
              }
            }
          }
          if (!empujada) {
            fx = -dispX[i] * SPRING_K;
            fy = -dispY[i] * SPRING_K;
            fz = -dispZ[i] * SPRING_K;
          }

          const vx = (velX[i] + fx * dt) * DAMPING;
          const vy = (velY[i] + fy * dt) * DAMPING;
          const vz = (velZ[i] + fz * dt) * DAMPING;
          const ndx = dispX[i] + vx * dt;
          const ndy = dispY[i] + vy * dt;
          const ndz = dispZ[i] + vz * dt;

          // ¿Ya volvió a su sitio? Entonces se clava y sale del conjunto.
          const quieta = !empujada &&
            (ndx * ndx + ndy * ndy + ndz * ndz) < QUIETA2 &&
            (vx * vx + vy * vy + vz * vz) < QUIETA2;

          if (quieta) {
            dispX[i] = 0; dispY[i] = 0; dispZ[i] = 0;
            velX[i] = 0; velY[i] = 0; velZ[i] = 0;
            effHome[ix] = bx; effHome[iy] = by; effHome[iz] = bz;
            enActivos[i] = 0;
          } else {
            velX[i] = vx; velY[i] = vy; velZ[i] = vz;
            dispX[i] = ndx; dispY[i] = ndy; dispZ[i] = ndz;
            effHome[ix] = bx + ndx; effHome[iy] = by + ndy; effHome[iz] = bz + ndz;
            activos[quedan++] = i;
          }
          if (i < escribeMin) escribeMin = i;
          if (i > escribeMax) escribeMax = i;
        }
        nActivos = quedan;

        /* Solo se sube a la GPU el tramo tocado, no el buffer entero.
           Las posiciones salen de una espiral de Fibonacci ordenada por
           latitud, así que un casquete alrededor del dedo cae dentro de una
           banda de latitudes — o sea, un rango CONTIGUO de índices. Con eso
           el envío baja de 1.2 MB por frame a una fracción. */
        posAttr.updateRange.offset = escribeMin * 3;
        posAttr.updateRange.count = (escribeMax - escribeMin + 1) * 3;
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
      return;
    }

    const needsSim = mouseActive || morphT < 1 || currentIdx === ATOM_IDX || !settled;
    if (needsSim) {
    // El camino completo vuelve a subir el buffer entero.
    posAttr.updateRange.offset = 0;
    posAttr.updateRange.count = -1;
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
        asentadoUnaVez = true;
      }
    } else settleFrames = 0;
    }

    renderer.render(scene, camera);
  }

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    const newScale = Math.min(BASE_SCALE, (visibleHW * camera.aspect * 0.85) / (2 * R));
    group.scale.set(newScale, newScale, newScale);
    updatePixelsPerUnit();
  };
  window.addEventListener("resize", onResize);

  /* ── prefers-reduced-motion ───────────────────────────────────────────
   *
   * Si el sistema pide menos movimiento, el globo NO se anima: ni la entrada
   * de partículas dispersas, ni el giro, ni el efecto del puntero. Se pinta
   * UN solo fotograma con la esfera ya formada (las partículas directamente
   * en su sitio, el halo encendido) y se deja quieto. Sigue siendo el mismo
   * globo, solo que inmóvil; al cambiar de tamaño se vuelve a pintar ese
   * mismo fotograma. No se arranca el bucle de requestAnimationFrame ni el
   * IntersectionObserver que lo pausa: no hay nada que pausar. */
  if (REDUCED_MOTION) {
    for (let i = 0; i < N * 3; i++) { baseNow[i] = currHome[i]; effHome[i] = currHome[i]; }
    posAttr.updateRange.offset = 0;
    posAttr.updateRange.count = -1;
    posAttr.needsUpdate = true;
    morphT = 1; settled = true; asentadoUnaVez = true; fadeExtras = 1;
    group.rotation.y = 0.6;
    material.uniforms.uTime.value = 0;
    atmoMat.uniforms.uIntensity.value = 1;
    mMat.uniforms.uFade.value = 1;
    const pintarQuieto = () => renderer.render(scene, camera);
    repintar = pintarQuieto;
    pintarQuieto();
    window.addEventListener("resize", pintarQuieto);
    // El sol sí se mueve aunque el globo no: un fotograma nuevo por minuto.
    setInterval(() => { actualizarSol(); pintarQuieto(); }, 60000);
    return;
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
}

function boot() {
  initRiskSphere().catch((err) => console.error("RiskSphere:", err));
}

/* ── Arranque diferido ──────────────────────────────────────────────────
 *
 * El globo es decoración: no tiene por qué competir con el titular, las
 * fuentes ni los datos de mercado por el primer pintado. Por eso ya no
 * arranca en DOMContentLoaded sino DESPUÉS del evento load de la ventana (con
 * todo lo demás ya descargado), y dentro de un requestIdleCallback para
 * colarse en el primer hueco libre del hilo principal. El tope de 1.5 s es
 * para que en una página que nunca queda ociosa (el ticker, las gráficas) el
 * globo aparezca de todos modos. three.js va con defer en index.html, así que
 * para entonces window.THREE ya existe; whenThree() sigue ahí de red.
 *
 * El contenedor .hero-globe-wrap tiene su tamaño fijado por CSS, así que el
 * lienzo aparece tarde pero no mueve nada: cero CLS. */
function arrancarDiferido() {
  const enHueco = () => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(boot, { timeout: 1500 });
    } else {
      setTimeout(boot, 0);
    }
  };
  if (document.readyState === "complete") {
    enHueco();
  } else {
    window.addEventListener("load", enHueco, { once: true });
  }
}

arrancarDiferido();
