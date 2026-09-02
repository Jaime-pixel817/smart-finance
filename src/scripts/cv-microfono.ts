// EL MICRÓFONO DE PARTÍCULAS — motor propio, sin three.js.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA PIEZA LA DISEÑÓ JAIME (2026-09-02), TEXTUAL
// ═══════════════════════════════════════════════════════════════════════════
// «estaría increíble que fuera como el globo de smart finance, que en vez de un
//  mundo sea un micrófono igual formado por partículas y que los puntos al
//  darle click se abriera un episodio de podcast o de experiencia de Moris
//  Dieck o Marg, o algún video dando info financiera de un país, que ese sea el
//  elemento especial del CV, pero eso como extra poner en el principio sin
//  quitar ya lo que teníamos de los podcast y así y experiencias abajo, aún así
//  dejarlos, que sea un elemento más gráfico.»
//
// Sus tres condiciones, y dónde se cumple cada una:
//  1. Micrófono DE PARTÍCULAS, no un globo con otra textura → `construir()`.
//  2. Los puntos abren episodios / experiencias / vídeos de país → `abrir()`.
//  3. Va al principio Y los capítulos de abajo se quedan → cada nodo BAJA a su
//     capítulo (`Microfono.astro`), y ninguno cuenta arriba lo que cuenta
//     abajo. Si lo contara, el documento sería más largo — y su queja era
//     justo que se sentía infinito.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ MOTOR PROPIO Y NO three.js — EL NÚMERO QUE LO DECIDIÓ
// ═══════════════════════════════════════════════════════════════════════════
// Se prototiparon las dos. La de three.js dibuja un micrófono más bonito (es
// fotorrealista: rejilla, aro metálico, cuerpo cónico) y hace un morfo al globo
// que esta no hace. Y aun así pierde, por dos medidas:
//
//  · CACHÉ FRÍA. `vercel.json` sirve `/assets/*.js` con `max-age=3600`. Los
//    tres lectores del CV —quien lo nomine, el referee, el lector de admisiones—
//    abren `/cv/<codigo>` desde un correo y NUNCA pasaron por el home. Para
//    ellos three.js no está cacheado: son 104 137 B de script contra los 4 766
//    de este camino. 31 veces más.
//  · EL PRESUPUESTO DEL HOME. `lighthouserc.json` no avisa, FALLA el CI, y su
//    tope de script (187 392 B) aplica a `.*`, home incluido. El home va hoy en
//    185 033: margen 2 359 B. Sustituir `risk-sphere.js` por el motor grande le
//    metía entre +5 838 y +6 551 B al home. Rojo por ~3.5 KB.
//
// La idea que hace que esto sea chico: LA GEOMETRÍA NO SE DESCARGA, SE GENERA.
// Un micrófono es una superficie de revolución (canasta esférica + aro + cuerpo
// cónico + remate), o sea cuatro bucles y un seno. Lo que viaja es este
// archivo, no una malla.
//
// ═══════════════════════════════════════════════════════════════════════════
// LO QUE SE CORTÓ, Y NO ES UN OLVIDO: EL MORFO AL GLOBO
// ═══════════════════════════════════════════════════════════════════════════
// La propuesta era que al elegir un país las partículas se rearmaran en el
// globo del home. Se construyó y funciona. Se corta igual, y la razón es de
// bytes: el morfo es lo único que justifica three.js (84 654 B brotli) más
// 48 644 B de geografía, y ese es exactamente el coste que no se puede pagar en
// la única página cuyos lectores están garantizadamente en frío. Un nodo de
// país abre su vídeo directamente, sin el rodeo por el globo.
// Esto corta la propuesta del socio, NO la de Jaime: sus tres condiciones
// quedan intactas.
//
// ═══════════════════════════════════════════════════════════════════════════
// EL CV ES BLANCO SIEMPRE — Y ESO CAMBIA EL DIBUJO ENTERO
// ═══════════════════════════════════════════════════════════════════════════
// El globo del home vive sobre negro y suma luces (`blendFunc(SRC_ALPHA, ONE)`):
// cada partícula ILUMINA. Aquí el papel es #FFFFFF y no hay modo oscuro, así
// que la mezcla aditiva es invisible por construcción — sumar luz sobre blanco
// no hace nada. Este motor pinta AL REVÉS, como un grabado: cada partícula es
// TINTA que TAPA (`SRC_ALPHA, ONE_MINUS_SRC_ALPHA`), y lo que decide cuánta
// tinta lleva es la luz INVERTIDA: donde da la luz hay menos tinta, en la
// sombra hay más, y el contorno (rim) es lo más oscuro, que es como se dibuja
// un objeto a plumilla. El resultado es un objeto con volumen sobre papel, no
// una mancha gris.
import { NODOS } from '../lib/cv/microfono.mjs';

// ═══ LA FORMA ══════════════════════════════════════════════════════════════
// Proporciones de un micrófono de bola. La canasta manda y el cuerpo es fino y
// largo; con el cuerpo gordo se lee «champiñón» (y con la canasta demasiado
// ancha respecto del cuerpo, también). El aro tiene que MORDER la canasta: con
// hueco entre los dos, el cuerpo se lee como un objeto aparte flotando debajo
// de una bola.
// ── LA MEDIDA QUE DECIDE SI SE LEE «MICRÓFONO» O «CHAMPIÑÓN» ────────────
// No son las proporciones: un SM58 de verdad tiene la canasta al DOBLE de
// ancha que el cuerpo, y aun así nadie lo confunde con una seta. Lo que lo
// decide es EL COLLAR — el aro metálico donde la bola se apoya. Sin él, una
// esfera sobre un tubo es un champiñón; con él, la silueta tiene un ESCALÓN y
// el ojo lee dos piezas ensambladas.
// El primer intento lo tenía y NO SE VEÍA: el aro estaba en y = 0.098 y el
// fondo de la bola en y = -0.079, o sea el collar iba ENTERRADO DENTRO de la
// canasta. Aquí va justo por debajo, y es más ancho que el cuerpo y más
// estrecho que la bola, que es lo que dibuja el escalón.
const HEAD_Y = 0.46, HEAD_R = 0.42, HEAD_SY = 1.06;   // bola: fondo en y = 0.015
const HEAD_CUT = -0.80;              // se queda con el 90 % de la esfera
const RING_R = 0.235;                // > cuerpo (0.205) y < bola (0.42)
const RING_Y0 = 0.020, RING_DY = 0.030, RING_N = 4;   // el collar, 4 anillos
// EL CUERPO SE ESTRECHA DE VERDAD (0.212 → 0.132, un 38 %). Con la conicidad
// del primer intento (0.205 → 0.175, un 15 %) la silueta era casi un tubo
// recto y, con el fondo abierto en elipse por la perspectiva, se leía como un
// VASO. Un SM58 se estrecha claramente hacia la mano; ese estrechamiento es lo
// que dice «esto se agarra».
const BODY_TOP = -0.085, BODY_BOT = -0.90, BODY_RT = 0.212, BODY_RB = 0.132;
// El objeto no es simétrico en Y (la bola arriba, el remate abajo): se centra
// a mano para que no quede colgando en su caja.
const CENTRO_Y = -0.06;
// ── POR QUÉ EL CUERPO VA MÁS OSCURO QUE LA CANASTA ─────────────────────
// Porque lo es. La canasta de un micrófono es una MALLA: se ve a través. El
// cuerpo es un tubo de metal macizo. Dibujados con la misma tinta, la canasta
// —que además lleva la rejilla de meridianos— salía cargada y el cuerpo
// translúcido, y esa era la causa real de que se leyera como un champiñón:
// una cabeza sólida sobre un tallo de humo. `kind` es lo que separa los tres
// materiales: 0 = malla · METAL = tubo · 1 = línea de dibujo (rejilla y
// collar, que son lo que dice «micrófono» y van a tinta plena).
const METAL = 0.46;

export interface Geometria {
  pos: Float32Array; nrm: Float32Array; meta: Float32Array; n: number;
}

/** Genera el micrófono: posición, normal y metadatos (semilla, tipo) por punto.
 *  La NORMAL es lo que convierte una nube de puntos en un OBJETO: da luz
 *  difusa (la bola se sombrea como bola), da contorno encendido (el borde se
 *  dibuja solo) y permite apagar la cara de atrás, que es lo que quitaba el
 *  barro de ver el frente y el dorso del cilindro superpuestos. */
export function construir(N: number): Geometria {
  const pos = new Float32Array(N * 3), nrm = new Float32Array(N * 3);
  const meta = new Float32Array(N * 2);
  const GA = Math.PI * (3 - Math.sqrt(5));
  let i = 0;

  // Reparto: canasta 27 % · rejilla 15 % · collar 10 % · cuerpo 36 % · remate 12 %.
  // El cuerpo se lleva MÁS que la canasta a propósito. Con el reparto de la
  // primera versión (32/19 arriba contra 32/10 abajo) la bola salía cargada de
  // tinta y el cuerpo translúcido, y entonces sí se leía como un champiñón:
  // una cabeza sólida sobre un tallo. La proporción estaba bien; lo que estaba
  // mal era el CONTRASTE entre las dos mitades.
  const nHead = (N * 0.27) | 0, nGrid = (N * 0.15) | 0, nRing = (N * 0.10) | 0;
  const nBody = (N * 0.36) | 0, nCap = N - nHead - nGrid - nRing - nBody;

  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, kind: number) => {
    pos[i * 3] = x; pos[i * 3 + 1] = y + CENTRO_Y; pos[i * 3 + 2] = z;
    const L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nrm[i * 3] = nx / L; nrm[i * 3 + 1] = ny / L; nrm[i * 3 + 2] = nz / L;
    meta[i * 2] = Math.random(); meta[i * 2 + 1] = kind;
    i++;
  };
  const head = (dx: number, dy: number, dz: number, kind: number) =>
    put(dx * HEAD_R, HEAD_Y + dy * HEAD_R * HEAD_SY, dz * HEAD_R, dx, dy, dz, kind);

  // 1 · CANASTA — Fibonacci sobre la esfera, quedándose con el casquete.
  const hd: number[][] = [];
  for (let j = 0; hd.length < nHead && j < nHead * 6; j++) {
    const y = 1 - (j / (nHead * 1.30)) * 2; if (y < HEAD_CUT) continue;
    const r = Math.sqrt(Math.max(0, 1 - y * y)), th = GA * j;
    hd.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  for (let j = 0; j < nHead; j++) { const d = hd[j % hd.length]; head(d[0], d[1], d[2], 0); }

  // 2 · REJILLA — paralelos y meridianos. Esto es lo que lo vuelve un
  //     MICRÓFONO y no una paleta: la canasta de un micro de verdad ES una
  //     malla de lat/lon. Y es, punto por punto, un globo de alambre — que es
  //     exactamente lo que Jaime pidió («como el globo… que en vez de un mundo
  //     sea un micrófono»).
  const LAT = 6, LON = 18, per = (nGrid / (LAT + LON)) | 0;
  for (let k = 0; k < LAT; k++) {
    const la = HEAD_CUT + (k + 0.55) / LAT * (0.97 - HEAD_CUT);
    const r = Math.sqrt(Math.max(0, 1 - la * la));
    for (let j = 0; j < per; j++) { const th = j / per * Math.PI * 2; head(Math.cos(th) * r, la, Math.sin(th) * r, 1); }
  }
  for (let k = 0; k < LON; k++) {
    const a = k / LON * Math.PI * 2;
    for (let j = 0; j < per; j++) {
      const t = HEAD_CUT + j / per * (0.995 - HEAD_CUT), r = Math.sqrt(Math.max(0, 1 - t * t));
      head(Math.cos(a) * r, t, Math.sin(a) * r, 1);
    }
  }

  // 3 · EL COLLAR — cuatro anillos apretados justo DEBAJO de la bola. Es la
  //     pieza que separa «micrófono» de «champiñón», y por eso se lleva el
  //     10 % de los puntos con solo el 4 % de la altura: tiene que verse.
  //     Van con `kind = 1` (tinta plena), como la rejilla.
  for (let j = 0; j < nRing; j++) {
    const th = (j * GA) % (Math.PI * 2), k = j % RING_N;
    put(Math.cos(th) * RING_R, RING_Y0 - k * RING_DY, Math.sin(th) * RING_R,
      Math.cos(th), 0.10, Math.sin(th), 1);
  }

  // 4 · CUERPO — cono truncado hueco. La pendiente entra en la normal.
  const slope = (BODY_RT - BODY_RB) / (BODY_TOP - BODY_BOT);
  for (let j = 0; j < nBody; j++) {
    const u = j / nBody, th = (j * GA) % (Math.PI * 2);
    const y = BODY_TOP + u * (BODY_BOT - BODY_TOP), r = BODY_RT + u * (BODY_RB - BODY_RT);
    put(Math.cos(th) * r, y, Math.sin(th) * r, Math.cos(th), slope, Math.sin(th), 0);
  }

  // 5 · REMATE — casquete redondeado que CIERRA el cuerpo. Con una falda que se
  //     abre, el micrófono parece estar de pie sobre un platillo.
  for (let j = 0; j < nCap; j++) {
    const u = j / nCap, th = (j * GA) % (Math.PI * 2);
    const ph = Math.sqrt(u) * Math.PI * 0.5;            // 0 = borde · π/2 = punta
    const r = BODY_RB * Math.cos(ph), y = BODY_BOT - BODY_RB * 0.95 * Math.sin(ph);
    put(Math.cos(th) * r, y, Math.sin(th) * r,
      Math.cos(th) * Math.cos(ph), -Math.sin(ph) * 1.4, Math.sin(th) * Math.cos(ph), METAL);
  }
  while (i < N) put(0, 0, 0, 0, 1, 0, 0);
  return { pos, nrm, meta, n: N };
}

// ═══ LOS HUECOS DE LOS NODOS ═══════════════════════════════════════════════
// LA IDEA BONITA QUE NO SOBREVIVIÓ A LA MEDICIÓN: anclar cada nodo de país en
// su lat/lon DE VERDAD sobre la canasta. Medido con 13 nodos, Canadá y EE. UU.
// quedaban a 5.6 px en un teléfono y Singapur (lon +104) caía en la cara de
// atrás, donde no se puede pinchar porque el micrófono no gira. La geografía de
// verdad no reparte nodos: los apelotona donde hay ciudades. Así que los huecos
// se reparten a propósito, con una espiral áurea sobre el casquete que mira a
// la cámara: separación pareja por construcción, sin relajación iterativa y sin
// tabla escrita a mano que haya que reajustar al añadir el nodo 12.
type V3 = [number, number, number];

/** La dirección local que mira a la cámara = rotación inversa de (0,0,1). */
function haciaCamara(rotY: number, rotX: number): V3 {
  const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
  return [-cx * sy, sx, cx * cy];
}
/** Base ortonormal con `w` como tercer eje. */
function base(w: V3): [V3, V3, V3] {
  const up: V3 = Math.abs(w[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u: V3 = [up[1] * w[2] - up[2] * w[1], up[2] * w[0] - up[0] * w[2], up[0] * w[1] - up[1] * w[0]];
  const L = Math.hypot(u[0], u[1], u[2]); u = [u[0] / L, u[1] / L, u[2] / L];
  const v: V3 = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
  return [u, v, w];
}
/** n direcciones repartidas por el casquete de medio ángulo `cap` (radianes). */
export function huecosCasquete(n: number, cap: number, rotY: number, rotX: number): V3[] {
  const f = base(haciaCamara(rotY, rotX)), GA = Math.PI * (3 - Math.sqrt(5)), out: V3[] = [];
  const cmin = Math.cos(cap);
  for (let i = 0; i < n; i++) {
    const z = 1 - ((i + 0.5) / n) * (1 - cmin);
    const r = Math.sqrt(Math.max(0, 1 - z * z)), a = i * GA;
    const cu = Math.cos(a) * r, cv = Math.sin(a) * r;
    out.push([f[0][0] * cu + f[1][0] * cv + f[2][0] * z,
    f[0][1] * cu + f[1][1] * cv + f[2][1] * z,
    f[0][2] * cu + f[1][2] * cv + f[2][2] * z]);
  }
  return out;
}
export const enCanasta = (d: V3): V3 => [d[0] * HEAD_R, HEAD_Y + CENTRO_Y + d[1] * HEAD_R * HEAD_SY, d[2] * HEAD_R];
/** Un punto del CUERPO por su altura relativa (0 arriba, 1 abajo). El azimut es
 *  el que mira a la cámara, así que un nodo del cuerpo NUNCA cae detrás. */
export function enCuerpo(u: number, rotY: number, rotX: number): V3 {
  const w = haciaCamara(rotY, rotX), a = Math.atan2(w[2], w[0]);
  const y = BODY_TOP + u * (BODY_BOT - BODY_TOP), r = BODY_RT + u * (BODY_RB - BODY_RT);
  return [Math.cos(a) * r, y + CENTRO_Y, Math.sin(a) * r];
}

// ═══ LOS SHADERS ═══════════════════════════════════════════════════════════
// ⚠️ REGLA QUE UN GUARDIÁN COMPRUEBA (src/lib/cv/microfono.test.mjs):
// un mismo uniform declarado con DOS PRECISIONES distintas (highp en el vertex,
// que es el defecto, y mediump en el fragment) NO ENLAZA — y el lienzo se queda
// NEGRO sin lanzar ningún error. Eso costó una tarde en el prototipo. Por eso
// aquí no hay ni un uniform compartido entre los dos shaders, y hay una prueba
// que lo comprueba leyendo este archivo.
export const VS = [
  'attribute vec3 aP;attribute vec3 aN;attribute vec2 aI;',
  'uniform float uIn,uCz,uFo,uPx;uniform vec2 uRy,uRx,uSc;',
  'varying float vT;varying float vK;varying float vA;',
  'void main(){float s=aI.x;',
  // entrada: polvo lejano → objeto. Escalonada por semilla, como el globo.
  'float e=clamp(uIn*1.30-s*0.30,0.0,1.0);e=e*e*(3.0-2.0*e);',
  'vec3 p=aP*mix(2.9,1.0,e);',
  // rotación Y y luego X, a mano: sin mat4, sin librería
  'vec3 q=vec3(p.x*uRy.x+p.z*uRy.y,p.y,-p.x*uRy.y+p.z*uRy.x);',
  'q=vec3(q.x,q.y*uRx.x-q.z*uRx.y,q.y*uRx.y+q.z*uRx.x);',
  'vec3 n=vec3(aN.x*uRy.x+aN.z*uRy.y,aN.y,-aN.x*uRy.y+aN.z*uRy.x);',
  'n=vec3(n.x,n.y*uRx.x-n.z*uRx.y,n.y*uRx.y+n.z*uRx.x);',
  'float w=uCz-q.z;float k=uFo/w;',
  'gl_Position=vec4(q.x*k*uSc.x,q.y*k*uSc.y,0.0,1.0);',
  'gl_PointSize=uPx*k*(1.0+aI.y*0.30)*mix(0.62,1.0,e);',
  // ── LA LUZ, INVERTIDA: ESTO ES UN GRABADO, NO UNA FOTO ──────────────────
  // Sobre papel blanco, «más luz» es MENOS TINTA. Donde da la luz el objeto se
  // aclara (menos alfa), en la sombra se carga, y el contorno es lo más oscuro
  // —que es como se dibuja un objeto a plumilla—. Con la luz sin invertir
  // (que es lo que hace el globo del home sobre negro) el cuerpo desaparecía
  // contra el papel: se veía un grabado tenue y no un micrófono.
  'vec3 L=normalize(vec3(-0.42,0.52,0.74));',
  'float dif=max(dot(n,L),0.0);',
  'float face=n.z;',
  'float rim=pow(1.0-abs(face),3.0);',
  'float tinta=0.34+0.68*(1.0-dif)+0.66*rim*smoothstep(-0.22,0.16,face);',
  // el dorso deja rastro pero no compite con el frente: sin esto se ven las dos
  // caras del cilindro superpuestas y el objeto se lee como barro.
  'float back=smoothstep(-0.32,0.06,face);',
  'vT=tinta;vA=mix(0.10,1.0,back);vK=aI.y;}'
].join('');

export const FS = [
  'precision mediump float;',
  'uniform vec3 uTinta,uTinta2;uniform float uA;',
  'varying float vT;varying float vK;varying float vA;',
  'void main(){vec2 d=gl_PointCoord-0.5;float r2=dot(d,d);',
  'if(r2>0.25)discard;',
  'float a=1.0-r2*4.0;a*=a;',
  'float t=clamp(vT,0.0,1.4);',
  // la rejilla y el aro (vK=1) van con la tinta plena: son las líneas que
  // dicen «micrófono». La canasta y el cuerpo modulan entre las dos tintas.
  'vec3 c=mix(uTinta2,uTinta,clamp(t*0.62+vK*0.55,0.0,1.0));',
  'gl_FragColor=vec4(c,a*uA*vA*clamp(t,0.16,1.30)*mix(0.92,1.30,vK));}'
].join('');

// ═══ EL MOTOR ══════════════════════════════════════════════════════════════
export interface Motor {
  gl: WebGLRenderingContext; n: number; tConstruir: number;
  intro: number; rotY: number; rotX: number; dpr: number; w: number; h: number; fit: number;
  frames: number;
  resize(cssW: number, cssH: number, dprCap?: number): void;
  proyectar(p: V3): { x: number; y: number; z: number };
  dibujar(): void;
}

function compilar(gl: WebGLRenderingContext, tipo: number, src: string): WebGLShader {
  const s = gl.createShader(tipo);
  if (!s) throw new Error('sin shader');
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('compile: ' + gl.getShaderInfoLog(s));
  return s;
}

/** Lee un color del tema (`--cvh-tinta`, …) y lo pasa a 0..1. Los colores NO se
 *  escriben aquí: salen del documento, para que el micrófono no pueda
 *  desincronizarse de la tinta del CV. */
function tema(el: Element, prop: string, porDefecto: [number, number, number]): [number, number, number] {
  const v = getComputedStyle(el).getPropertyValue(prop).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return porDefecto;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function crearMotor(canvas: HTMLCanvasElement, n: number): Motor {
  const gl = (canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, powerPreference: 'low-power'
  }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) throw new Error('sin WebGL');

  const t0 = performance.now();
  const g = construir(n);
  const tConstruir = performance.now() - t0;

  const pr = gl.createProgram();
  if (!pr) throw new Error('sin programa');
  gl.attachShader(pr, compilar(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, compilar(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  // Un programa que no enlaza deja el lienzo en NEGRO sin lanzar nada: hay que
  // preguntarlo. Lanzar aquí enciende el respaldo estático, que es lo correcto
  // — un CV con un hueco negro arriba es peor que sin dibujo.
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(pr));
  gl.useProgram(pr);

  const buf = (data: Float32Array, nombre: string, size: number) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(pr, nombre); gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  };
  buf(g.pos, 'aP', 3); buf(g.nrm, 'aN', 3); buf(g.meta, 'aI', 2);

  const U: Record<string, WebGLUniformLocation | null> = {};
  ['uIn', 'uCz', 'uFo', 'uPx', 'uRy', 'uRx', 'uSc', 'uTinta', 'uTinta2', 'uA']
    .forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  // TINTA QUE TAPA, no luz que suma: el papel es blanco.
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const m: Motor = {
    gl, n, tConstruir,
    intro: 0, rotY: -0.34, rotX: 0.15, dpr: 1, w: 0, h: 0, fit: 1, frames: 0,

    resize(cssW, cssH, dprCap) {
      // Presupuesto de PÍXELES, no un DPR a ojo. Misma lección que el globo del
      // home: lo que ahoga a una GPU integrada es el fill rate, y `gl_PointSize`
      // va multiplicado por el DPR, así que subirlo encarece dos veces.
      const MAXPX = cssW < 700 ? 620000 : 2000000;
      let d = Math.min(window.devicePixelRatio || 1, dprCap || 2,
        Math.sqrt(MAXPX / Math.max(1, cssW * cssH)));
      d = Math.max(1, d);
      m.dpr = d; m.w = cssW; m.h = cssH;
      canvas.width = Math.round(cssW * d); canvas.height = Math.round(cssH * d);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);

      // ── QUE EL MICRÓFONO LLENE SU CAJA, SEA CUAL SEA LA CAJA ────────────
      // Sin esto el dibujo salía al 55 % de una caja de 420×620 y el resto era
      // papel en blanco — que es exactamente el «hueco muerto» que hay que
      // quitar. La escala no se pone a ojo: se calcula de la caja envolvente
      // del objeto (medio alto 0.92, medio ancho 0.44 en unidades de mundo) y
      // del factor de perspectiva a media profundidad, y se queda con el eje
      // que se agote antes. `MARGEN` es cuánto del lienzo se le deja, y no
      // llega a 1 a propósito: un objeto tocando el borde de su caja se lee
      // como recortado.
      const MARGEN = 0.94, MEDIO_ALTO = 0.92, MEDIO_ANCHO = 0.44, K_MEDIA = 2.85 / 3.4;
      const asp = cssW / cssH;
      const sxB = asp > 1 ? 1 / asp : 1, syB = asp > 1 ? 1 : asp;
      m.fit = Math.min(MARGEN / (MEDIO_ALTO * K_MEDIA * syB), MARGEN / (MEDIO_ANCHO * K_MEDIA * sxB));
    },

    // Proyección a mano — sin mat4, sin librería. Es la MISMA cuenta que el
    // shader, y por eso los nodos del DOM caen exactamente donde cae el píxel.
    proyectar(p) {
      const cy = Math.cos(m.rotY), sy = Math.sin(m.rotY);
      const cx = Math.cos(m.rotX), sx = Math.sin(m.rotX);
      const qx = p[0] * cy + p[2] * sy, qy = p[1], qz = -p[0] * sy + p[2] * cy;
      const ry = qy * cx - qz * sx, rz = qy * sx + qz * cx;
      const w = 3.4 - rz, k = 2.85 / w;
      const asp = m.w / m.h, sc = asp > 1 ? [1 / asp, 1] : [1, asp];
      return { x: (qx * k * sc[0] * m.fit * 0.5 + 0.5) * m.w, y: (0.5 - ry * k * sc[1] * m.fit * 0.5) * m.h, z: rz };
    },

    dibujar() {
      const asp = m.w / m.h;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uIn, m.intro);
      gl.uniform1f(U.uCz, 3.4); gl.uniform1f(U.uFo, 2.85);
      gl.uniform1f(U.uPx, (m.h / 340) * 2.05 * m.fit * m.dpr);
      gl.uniform2f(U.uRy, Math.cos(m.rotY), Math.sin(m.rotY));
      gl.uniform2f(U.uRx, Math.cos(m.rotX), Math.sin(m.rotX));
      gl.uniform2f(U.uSc, (asp > 1 ? 1 / asp : 1) * m.fit, (asp > 1 ? 1 : asp) * m.fit);
      const t1 = tema(canvas, '--cvh-tinta', [0.039, 0.039, 0.039]);
      const t2 = tema(canvas, '--cvh-tinta-2', [0.353, 0.353, 0.353]);
      gl.uniform3f(U.uTinta, t1[0], t1[1], t1[2]);
      gl.uniform3f(U.uTinta2, t2[0], t2[1], t2[2]);
      gl.uniform1f(U.uA, 0.95);
      gl.drawArrays(gl.POINTS, 0, n);
      m.frames++;
    }
  };
  return m;
}

// ═══ EL PEGAMENTO ══════════════════════════════════════════════════════════
const REPOSO_Y = -0.34, REPOSO_X = 0.15;
const INTRO_MS = 1200;
// LA VÁLVULA. Si la GPU no da 25 fps durante 3 s seguidos, se apaga el lienzo y
// se enseña el respaldo estático. Ninguno de los dos prototipos la tenía y hace
// falta: el CV se abre en máquinas que nadie va a ver, y un micrófono a 8 fps
// es peor que un dibujo quieto.
const FPS_MIN = 25, VALVULA_MS = 3000;

function arrancaUno(raiz: HTMLElement): void {
  const stage = raiz.querySelector<HTMLElement>('[data-mic-stage]');
  const canvas = raiz.querySelector<HTMLCanvasElement>('[data-mic-canvas]');
  const capa = raiz.querySelector<HTMLUListElement>('[data-mic-nodos]');
  if (!stage || !canvas || !capa) return;

  const fallar = (motivo: string) => {
    stage.setAttribute('data-mic-fallo', motivo);
    capa.hidden = true;
  };

  // ── ¿HAY PUNTERO FINO? Si no, LOS NODOS DEL LIENZO SON DECORACIÓN ────────
  // En táctil la silueta es alta y flaca y los blancos bajan a ~25 px: pasa
  // WCAG 2.5.8 (24×24) por 1.8 px, o sea que pasa por los pelos. La salida no
  // es ensanchar el micrófono: es que en táctil la INTERFAZ SEA EL ÍNDICE DE
  // TEXTO, que es lo que Jaime pidió que fuera («índice y obertura»), y el
  // lienzo sea el dibujo. Así el suelo de 24 px sale del camino crítico y en el
  // teléfono se toca una lista con renglones de 44 px, que es mejor de todos
  // modos.
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && window.innerWidth >= 940;

  let motor: Motor;
  try {
    motor = crearMotor(canvas, 16000);
  } catch (e) {
    fallar('webgl');
    return;
  }

  // El reparto: las personas sobre la CANASTA (espiral áurea del casquete),
  // los países en columna sobre el CUERPO.
  const personas = NODOS.filter((x) => x.tipo === 'persona');
  const paises = NODOS.filter((x) => x.tipo === 'pais');
  const casq = huecosCasquete(personas.length, 1.02, REPOSO_Y, REPOSO_X);
  let vi = 0, pi = 0;
  const anclas: V3[] = NODOS.map((nd) => {
    if (nd.tipo === 'pais') { const u = (pi + 0.5) / paises.length; pi++; return enCuerpo(0.12 + u * 0.76, REPOSO_Y, REPOSO_X); }
    return enCanasta(casq[vi++]);
  });

  // ── LOS NODOS SON ENLACES, Y ESO ES LITERAL DE JAIME ────────────────────
  // «los puntos al darle click se abriera un episodio de podcast o de
  // experiencia […] o algún video dando info financiera de un país». UN clic,
  // la pieza. No un panel que después haya que volver a pulsar: eso serían dos
  // clics para lo que él pidió que fuera uno.
  // Y por eso son `<a href>` y no `<button>`: lo que hacen es ir a un sitio.
  // El nombre accesible, la dirección y el texto salen todos del ÍNDICE que ya
  // está escrito en el HTML del servidor — bilingüe exacto sin que este guion
  // sepa ni una palabra, y sin que ninguna frase viaje dos veces por la red.
  const filas = new Map<string, HTMLElement>();
  raiz.querySelectorAll<HTMLElement>('[data-mic-fila]').forEach((el) => {
    filas.set(el.dataset.micFila || '', el);
  });
  const enlaces: HTMLAnchorElement[] = [];
  capa.hidden = false;
  NODOS.forEach((nd) => {
    const fila = filas.get(nd.id);
    if (!fila) return;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'nodo';
    a.href = nd.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('data-nodo', nd.id);
    if (nd.tipo === 'pais') a.setAttribute('data-pais', '');
    const et = document.createElement('span');
    et.className = 'nodo-et';
    et.setAttribute('aria-hidden', 'true');
    et.textContent = fila.dataset.nombre || '';
    a.appendChild(et);
    if (fino) {
      a.setAttribute('aria-label', fila.dataset.aria || '');
      // Señalar la fila del índice al pasar por el nodo es lo que hace que el
      // dibujo y la lista se lean como UNA cosa y no como dos.
      const marca = (on: boolean) => fila.toggleAttribute('data-activo', on);
      a.addEventListener('pointerenter', () => marca(true));
      a.addEventListener('pointerleave', () => marca(false));
      a.addEventListener('focus', () => marca(true));
      a.addEventListener('blur', () => marca(false));
    } else {
      // Decoración: ni foco, ni nombre accesible, ni puntero.
      a.setAttribute('aria-hidden', 'true');
      a.setAttribute('tabindex', '-1');
    }
    li.appendChild(a);
    capa.appendChild(li);
    enlaces.push(a);
  });
  if (!fino) capa.setAttribute('aria-hidden', 'true');
  const botones = enlaces;

  const situar = () => {
    for (let i = 0; i < botones.length; i++) {
      const p = motor.proyectar(anclas[i]);
      botones[i].style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      // Un nodo de la cara de atrás no se puede pinchar NI tabular.
      if (p.z > -0.12) botones[i].removeAttribute('hidden');
      else botones[i].setAttribute('hidden', '');
    }
  };

  // El blanco se dimensiona con la separación MEDIDA, no con una constante: se
  // proyectan los anclas y se mira el par más cercano de verdad. Nunca menos de
  // 24 px (WCAG 2.5.8) ni más que la separación, para que dos blancos no puedan
  // encimarse. ⚠️ El valor por defecto vive en el PADRE (`.mic-nodos`), no en
  // `.nodo`: una custom property declarada en el propio elemento TAPA la
  // heredada, y con `--blanco` dentro de `.nodo` este ajuste no llegaba nunca
  // —los blancos seguían midiendo 44 px encimados y `getBoundingClientRect`
  // decía «44» tan tranquilo—.
  const ajustarBlanco = () => {
    if (!botones.length) return;
    const pts = anclas.map((a) => motor.proyectar(a));
    let min = 1e9;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].z < -0.12 || pts[j].z < -0.12) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < min) min = d;
    }
    capa.style.setProperty('--blanco', Math.max(24, Math.min(44, Math.floor(min))) + 'px');
  };

  const medir = () => {
    motor.resize(stage.clientWidth, stage.clientHeight, 2);
    ajustarBlanco();
  };
  medir();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Con «menos movimiento» NO se cae al SVG: el motor pinta UN fotograma con el
  // micrófono ya formado y no vuelve a dibujar. Se ve el objeto de verdad, con
  // sus nodos, y no se mueve nada — que es lo que pide la preferencia. Caer al
  // dibujo plano sería dar menos por pedir menos.
  const quieto = () => { motor.intro = 1; motor.dibujar(); situar(); stage.setAttribute('data-mic-listo', '1'); };

  let raf = 0, t0 = 0, lentoDesde = 0, previo = 0;
  const bucle = (now: number) => {
    if (!t0) t0 = now;
    if (previo) {
      const dt = now - previo;
      if (dt > 1000 / FPS_MIN) { if (!lentoDesde) lentoDesde = now; }
      else lentoDesde = 0;
      if (lentoDesde && now - lentoDesde > VALVULA_MS) { cancelAnimationFrame(raf); fallar('lento'); return; }
    }
    previo = now;
    const e = Math.min(1, (now - t0) / INTRO_MS);
    motor.intro = e * e * (3 - 2 * e);
    motor.dibujar(); situar();
    // NADA EN BUCLE INFINITO (regla del repo). Se arma, se asienta y SE PARA.
    if (e < 1) raf = requestAnimationFrame(bucle);
    else { raf = 0; stage.setAttribute('data-mic-listo', '1'); }
  };

  // El micrófono NO puede ser el elemento LCP: se arranca cuando entra en
  // pantalla, no al cargar. Hasta entonces la caja ya está reservada por CSS y
  // dentro se ve el respaldo estático — CLS 0 por construcción.
  let arrancado = false;
  const arranca = () => {
    if (arrancado) return; arrancado = true;
    if (reduce.matches) quieto(); else raf = requestAnimationFrame(bucle);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      if (ents.some((x) => x.isIntersecting)) { io.disconnect(); arranca(); }
    }, { rootMargin: '200px' });
    io.observe(stage);
  } else arranca();

  let pend = 0;
  new ResizeObserver(() => {
    window.clearTimeout(pend);
    pend = window.setTimeout(() => {
      medir();
      if (!raf && arrancado) { motor.dibujar(); situar(); }
    }, 80);
  }).observe(stage);
}

document.querySelectorAll<HTMLElement>('[data-mic]').forEach(arrancaUno);
