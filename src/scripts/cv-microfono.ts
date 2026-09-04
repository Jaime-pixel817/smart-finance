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
// Y el mismo día, sobre la primera versión (que era un grabado QUIETO):
// «haz que el micrófono SE MUEVAN SUS PARTÍCULAS COMO EL DEL GLOBO y DÉ LA
//  VUELTA SIENDO 3D».
//
// Sus condiciones, y dónde se cumple cada una:
//  1. Micrófono DE PARTÍCULAS, no un globo con otra textura → `construir()`.
//  2. Los puntos abren episodios / experiencias / vídeos de país → los nodos
//     son `<a href>` (`construirNodos`).
//  3. Va al principio Y los capítulos de abajo se quedan → cada nodo BAJA a su
//     capítulo (`Microfono.astro`).
//  4. Las partículas SE MUEVEN COMO LAS DEL GLOBO → los shaders, con los
//     números del globo (abajo, «LO QUE HACE EL GLOBO Y CÓMO SE TRASLADA»).
//  5. DA LA VUELTA EN 3D → `GIRO`, el arrastre con inercia y los nodos que
//     siguen la rotación (`situar`).
//
// ═══════════════════════════════════════════════════════════════════════════
// LO QUE HACE EL GLOBO (public/assets/risk-sphere.js) Y CÓMO SE TRASLADA
// ═══════════════════════════════════════════════════════════════════════════
//  · Gira solo: 0.075 rad/s (una vuelta cada 84 s). ESE número se bajó desde
//    0.216 para que se pudieran leer las pastillas del hero encima del globo.
//    Aquí no hay texto encima y a 84 s por vuelta quien mira cinco segundos no
//    ve girar nada → `GIRO = 0.22` (una vuelta cada 28.6 s, la velocidad
//    original del globo).
//  · Se ladea: `rotation.x += (sin(t·0.2)·0.07 − rotation.x)·0.03` → igual,
//    amplitud 0.05 sobre el reposo (`vaiven`).
//  · Titileo por partícula: `0.12·sin(t·1.8 + fase)` sobre el brillo → igual,
//    sobre la TINTA (aquí brillo es tinta: ver «EL CV ES BLANCO»).
//  · Cara de atrás: `smoothstep(−0.30, 0.02, facing)` y, en modo claro, alfa
//    0.22 detrás → aquí 0.10 detrás, porque la canasta es una malla y se ve a
//    través, pero el cuerpo no y el dorso a 0.22 embarraba el tubo.
//  · Marcadores: se apagan con `smoothstep(−0.08, 0.22, facing)` y los pines
//    entran con `facing > 0.16` → los nodos hacen lo mismo (`situar`): se
//    atenúan por facing, y por debajo de 0.12 no se pueden pinchar. SIGUEN en
//    el orden de tabulación: enfocarlos GIRA el micrófono hasta traerlos al
//    frente, con el `FOCUS_LERP = 0.06` del globo.
//  · Ratón: repulsión (`REPEL_ACCEL 14`, radio 0.455 R) con muelle (K 9) y
//    amortiguación 0.88, en la CPU sobre una rejilla espacial. Eso son ~30 KB
//    de código y N escrituras de buffer por frame. Aquí el empujón va en el
//    vertex shader, sin estado: un campo radial en pantalla alrededor del
//    puntero SUAVIZADO desde JS (el puntero de verdad se persigue con un
//    retardo exponencial y la fuerza sube y baja en ~0.2 s). El muelle de
//    vuelta que en el globo es física aquí es ese retardo: cuando el puntero
//    se va, el campo se apaga y las partículas vuelven solas a su sitio.
//  · Entrada: polvo lejano → objeto, escalonada por semilla → igual (`uIn`).
//  · Tope 60 fps, `dt ≤ 0.05`, se PARA fuera de la pantalla (IntersectionObserver
//    con umbral 0.02) y se degrada el DPR si 30 de 90 frames pasan de 34 ms →
//    igual, y encima la válvula de antes (25 fps durante 3 s → dibujo quieto).
//  · `prefers-reduced-motion`: un fotograma, nada gira → igual; el arrastre
//    sigue funcionando (es la mano, no una animación) pero sin inercia.
//  · Lo que el globo NO tiene y aquí sí: ARRASTRE para girarlo (Jaime lo
//    pidió: «dé la vuelta»). `ARRASTRE` rad/px, inercia que se apaga en ~1 s.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA REGLA DE motion.css Y ESTE BUCLE
// ═══════════════════════════════════════════════════════════════════════════
// «Nada en bucle infinito» tiene UNA excepción declarada: una rotación lenta y
// continua del objeto cuenta como LA ÚNICA animación de esta pantalla. Por eso
// aquí no hay entrada por scroll ni nada más que se mueva solo, el bucle SE
// PARA fuera de la pantalla, y con «menos movimiento» no arranca.
//
// ═══════════════════════════════════════════════════════════════════════════
// LO QUE CUESTA — MEDIDO, NO ESTIMADO (2026-09-02, esta Mac, macOS 13)
// ═══════════════════════════════════════════════════════════════════════════
// Chrome en cabeza (GPU de verdad), 1440×900, DPR 2, pestaña visible, ratón
// fuera, 8 s por medida, CPU de TODOS los procesos del navegador sumados:
//  · Página vacía                                     3.3 %
//  · Este módulo, girando solo (30 fps)              10.3 · 16.4 · 8.5 %  (media 11.7)
//  · El mismo, con reposo a 60 fps                   18.5 · 16.6 · 15.5 %  (media 16.9)
//  · Con el puntero encima (60 fps + campo del ratón) 17.1 %
//  · Fuera de la pantalla (bucle parado)              0.6 %
//  · La versión anterior de este bucle, que escribía
//    los 11 transforms + 11 opacidades CADA frame     25.1 %
//  · El globo del home, con el mismo método           33.4 %
// De ahí las dos decisiones de abajo: los nodos solo tocan el DOM cuando se
// mueven (`situar`) y el reposo va a 30 fps (`FPS_REPOSO`). `will-change:
// transform` en los nodos se probó y no ayuda (17.4 %): no se pone.
//  · Primer fotograma desde `arranca()` (t1): 110 ms en frío, 52–76 ms con
//    el proceso de GPU caliente. Generar los 8 000 puntos (tc): 12–14 ms.
//  · 60.2 fps sostenidos con la mano encima; el bucle da 0 dibujos/s fuera
//    de la pantalla (medido contando drawArrays).
//  · 13 438 B minificado → 5 936 B gzip. Tope acordado: 10 KB gzip.
//  · Con 14 nodos (10 personas + 4 países), separación mínima entre nodos
//    delanteros en una vuelta entera: 52.8 px (con 11: 55 px); el blanco
//    clicable se queda en 44 px en los dos casos.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ MOTOR PROPIO Y NO three.js — EL NÚMERO QUE LO DECIDIÓ
// ═══════════════════════════════════════════════════════════════════════════
//  · CACHÉ FRÍA. Los lectores del CV abren `/cv/<codigo>` desde un correo y
//    nunca pasaron por el home: three.js son 104 137 B contra ~7 KB de esto.
//  · EL PRESUPUESTO DEL HOME (187 392 B) aplica a `.*`, home incluido, y va en
//    185 033. La geometría NO SE DESCARGA, SE GENERA: cuatro bucles y un seno.
//
// ═══════════════════════════════════════════════════════════════════════════
// EL CV ES BLANCO SIEMPRE — Y ESO CAMBIA EL DIBUJO ENTERO
// ═══════════════════════════════════════════════════════════════════════════
// El globo vive sobre negro y SUMA luz: sobre #FFFFFF sumar luz no hace nada.
// Este motor pinta el NEGATIVO del globo: cada partícula es TINTA (mezcla
// premultiplicada `ONE, ONE_MINUS_SRC_ALPHA`), donde el globo aclara aquí se
// oscurece, y donde en el globo se acumulan luces aquí se acumula tinta —que
// es exactamente lo que pasa en el limbo y da la silueta—. Se decidió tinta y
// no un panel oscuro propio porque (a) el CV es papel por decisión repetida en
// todo `Historia.astro`, (b) un bloque negro de 420×620 arriba del documento
// competiría con la portada y (c) el negativo de una nube de luces ES una
// nube de puntos: se ve como partículas igual.
import { NODOS } from '../lib/cv/microfono.mjs';

// ═══ LA FORMA ══════════════════════════════════════════════════════════════
// Proporciones de un micrófono de bola. La canasta manda y el cuerpo es fino y
// largo. LO QUE DECIDE SI SE LEE «MICRÓFONO» O «CHAMPIÑÓN» ES EL COLLAR: el aro
// donde la bola se apoya. Va justo por debajo de la bola, más ancho que el
// cuerpo y más estrecho que la bola, y la bola BAJA hasta morderlo por 0.011.
const HEAD_Y = 0.38, HEAD_R = 0.42, HEAD_SY = 1.06;
const HEAD_CUT = -0.80;              // se queda con el 90 % de la esfera
const RING_R = 0.235;                // < corte de la bola (0.252) y > cuerpo (0.180)
const RING_Y0 = 0.035, RING_DY = 0.030, RING_N = 4;   // el collar, 4 anillos
// El cuerpo arranca donde acaba el collar (−0.055) y se estrecha un 27 %: un
// SM58 es casi un tubo, claramente más fino que la bola (43 % de su ancho).
const BODY_TOP = -0.055, BODY_BOT = -0.96, BODY_RT = 0.180, BODY_RB = 0.132;
// El objeto se centra CALCULANDO sus extremos, no con una constante escrita:
// la que había tenía el signo al revés y dejaba el remate fuera del lienzo.
const ALTO_MAX = HEAD_Y + HEAD_R * HEAD_SY;          // la cima de la bola
const BAJO_MIN = BODY_BOT - BODY_RB * 0.95;          // la punta del remate
const CENTRO_Y = -(ALTO_MAX + BAJO_MIN) / 2;
// `kind`: 0 = malla (canasta) · METAL = tubo · 1 = línea de dibujo (collar).
const METAL = 0.46;

export interface Geometria {
  pos: Float32Array; nrm: Float32Array; meta: Float32Array; n: number;
}

/** Genera el micrófono: posición, normal y metadatos (semilla, tipo) por punto.
 *  La NORMAL es lo que convierte una nube de puntos en un OBJETO: luz difusa,
 *  contorno y cara de atrás apagada. */
export function construir(N: number): Geometria {
  const pos = new Float32Array(N * 3), nrm = new Float32Array(N * 3);
  const meta = new Float32Array(N * 2);
  const GA = Math.PI * (3 - Math.sqrt(5));
  let i = 0;

  // Reparto: canasta 46 % · collar 9 % · cuerpo 35 % · remate 10 %. La malla
  // de un micro no es una retícula: es textura fina y pareja, que es lo que da
  // la espiral de Fibonacci (por eso no hay rejilla de lat/lon: eso era un
  // globo de alambre, y la frase es «que EN VEZ DE UN MUNDO sea un micrófono»).
  // Con 8 000 puntos (antes 16 000, que se leían como grano de un sólido) el
  // remate a 14 % era una mancha negra: baja a 10 %, y la canasta sube.
  const nHead = (N * 0.46) | 0, nRing = (N * 0.09) | 0;
  const nBody = (N * 0.35) | 0, nCap = N - nHead - nRing - nBody;

  // ── UN PELO DE AZAR EN CADA PUNTO ────────────────────────────────────────
  // La espiral de Fibonacci vista desde su polo dibuja pétalos (moiré), y con
  // el polo de la bola mirando a la cámara se veía una flor. ±0.006 (un cuarto
  // de la separación entre vecinos, 0.023) rompe la retícula sin perder la
  // uniformidad. El globo no lo necesita: tiene 160 000 puntos.
  const J = 0.006;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, kind: number) => {
    pos[i * 3] = x + (Math.random() - 0.5) * J; pos[i * 3 + 1] = y + CENTRO_Y + (Math.random() - 0.5) * J; pos[i * 3 + 2] = z + (Math.random() - 0.5) * J;
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

  // 2 · EL COLLAR — cuatro anillos apretados justo DEBAJO de la bola, a tinta
  //     plena (kind 1): es la única línea de dibujo y la que dice «dos piezas».
  for (let j = 0; j < nRing; j++) {
    const th = (j * GA) % (Math.PI * 2), k = j % RING_N;
    put(Math.cos(th) * RING_R, RING_Y0 - k * RING_DY, Math.sin(th) * RING_R,
      Math.cos(th), 0.10, Math.sin(th), 1);
  }

  // 3 · CUERPO — cono truncado hueco, material METAL (tubo macizo, más tinta
  //     que la malla: con la misma tinta se leía «champiñón»).
  const slope = (BODY_RT - BODY_RB) / (BODY_TOP - BODY_BOT);
  for (let j = 0; j < nBody; j++) {
    const u = j / nBody, th = (j * GA) % (Math.PI * 2);
    const y = BODY_TOP + u * (BODY_BOT - BODY_TOP), r = BODY_RT + u * (BODY_RB - BODY_RT);
    put(Math.cos(th) * r, y, Math.sin(th) * r, Math.cos(th), slope, Math.sin(th), METAL);
  }

  // 4 · REMATE — casquete redondeado que CIERRA el cuerpo.
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
// Antes los nodos se repartían sobre el casquete QUE MIRA A LA CÁMARA, porque
// el micrófono no giraba. Ahora gira, así que van ANCLADOS AL OBJETO, en
// coordenadas del objeto, y dan la vuelta con él: la mitad está delante en
// cada momento y la otra mitad vuelve en menos de 15 s (o antes, si se enfoca
// o se arrastra).
//  · Las PERSONAS, en espiral áurea sobre la BANDA de la bola (y de 0.80 a
//    −0.55: ni el polo de arriba, que es silueta, ni el corte de abajo).
//    Separación pareja por construcción; el nodo 12 no obliga a retocar nada.
//  · Los PAÍSES, en columna helicoidal sobre el cuerpo: cuatro alturas y cuatro
//    azimuts a 90°, así siempre hay dos delante.
type V3 = [number, number, number];
export interface Ancla { p: V3; n: V3 }
export function anclas(): Ancla[] {
  // Sobre la BOLA va todo lo que no es país: las personas grabadas Y las dos
  // experiencias (Moris, Marg). Contarlas aparte dejaba la banda repartida
  // para ocho y las dos últimas cayendo fuera de la espiral.
  const per = NODOS.filter((x) => x.tipo !== 'pais').length;
  const pai = NODOS.length - per;
  const GA = Math.PI * (3 - Math.sqrt(5));
  let vi = 0, pi = 0;
  return NODOS.map((nd) => {
    if (nd.tipo === 'pais') {
      const u = 0.14 + (pi / Math.max(1, pai - 1)) * 0.62, a = pi * Math.PI * 0.5 + 0.9; pi++;
      const y = BODY_TOP + u * (BODY_BOT - BODY_TOP), r = BODY_RT + u * (BODY_RB - BODY_RT);
      return { p: [Math.cos(a) * r * 1.02, y + CENTRO_Y, Math.sin(a) * r * 1.02], n: [Math.cos(a), 0.1, Math.sin(a)] };
    }
    const z = 0.80 - (vi / Math.max(1, per - 1)) * 1.35, r = Math.sqrt(Math.max(0, 1 - z * z)), a = vi * GA + 0.4; vi++;
    const n: V3 = [Math.cos(a) * r, z, Math.sin(a) * r];
    return { p: [n[0] * HEAD_R * 1.03, HEAD_Y + CENTRO_Y + n[1] * HEAD_R * HEAD_SY * 1.03, n[2] * HEAD_R * 1.03], n };
  });
}

// ═══ LOS SHADERS ═══════════════════════════════════════════════════════════
// ⚠️ REGLA QUE UN GUARDIÁN COMPRUEBA (src/lib/cv/microfono.test.mjs): un mismo
// uniform declarado con DOS PRECISIONES (highp en el vertex, mediump en el
// fragment) NO ENLAZA y el lienzo se queda NEGRO sin error. Ningún uniform se
// comparte entre los dos shaders.
export const VS = [
  'attribute vec3 aP;attribute vec3 aN;attribute vec2 aI;',
  'uniform float uIn,uCz,uFo,uPx,uT,uMs;uniform vec2 uRy,uRx,uSc,uM,uAs;',
  'varying float vT;varying float vK;varying float vA;',
  'void main(){float s=aI.x;float ph=s*6.2832;',
  // entrada: polvo lejano → objeto, escalonada por semilla, como el globo.
  'float e=clamp(uIn*1.30-s*0.30,0.0,1.0);e=e*e*(3.0-2.0*e);',
  // deriva: cada partícula respira por su normal (±0.006, ~9 s por ciclo). Es
  // lo que hace que la malla no se lea como una textura muerta pegada encima.
  'vec3 p=aP*mix(2.9,1.0,e)+aN*(0.006*sin(uT*0.7+ph*3.0));',
  // rotación Y y luego X, a mano: sin mat4, sin librería
  'vec3 q=vec3(p.x*uRy.x+p.z*uRy.y,p.y,-p.x*uRy.y+p.z*uRy.x);',
  'q=vec3(q.x,q.y*uRx.x-q.z*uRx.y,q.y*uRx.y+q.z*uRx.x);',
  'vec3 n=vec3(aN.x*uRy.x+aN.z*uRy.y,aN.y,-aN.x*uRy.y+aN.z*uRy.x);',
  'n=vec3(n.x,n.y*uRx.x-n.z*uRx.y,n.y*uRx.y+n.z*uRx.x);',
  'float w=uCz-q.z;float k=uFo/w;',
  'vec2 c=vec2(q.x*k*uSc.x,q.y*k*uSc.y);',
  'float face=n.z;float back=smoothstep(-0.32,0.06,face);',
  // ── EL PUNTERO EMPUJA, COMO EN EL GLOBO, PERO SIN ESTADO ────────────────
  // Campo radial en pantalla (uAs corrige el aspecto para que sea circular),
  // radio 0.30 medios-altos, caída cuadrática, solo sobre la cara de delante.
  // uM y uMs vienen SUAVIZADOS desde JS: ese retardo es el «muelle».
  'vec2 d=(c-uM)*uAs;float r=length(d);',
  'float emp=uMs*smoothstep(-0.2,0.2,face)*pow(max(0.0,1.0-r/0.30),2.0);',
  'c+=d/max(r,1e-3)*emp*0.09/uAs;',
  'gl_Position=vec4(c,0.0,1.0);',
  // ── LA LUZ, INVERTIDA: SOBRE PAPEL «MÁS LUZ» ES MENOS TINTA ────────────
  'vec3 L=normalize(vec3(-0.42,0.52,0.74));',
  'float dif=max(dot(n,L),0.0);',
  'float rim=pow(1.0-abs(face),3.0);',
  // titileo del globo: 0.12·sin(t·1.8+fase), aquí sobre la tinta y el tamaño
  'float tw=sin(uT*1.8+ph);',
  'float tinta=0.40+0.55*(1.0-dif)+0.50*rim*back+0.12*tw;',
  // tamaño: perspectiva (k) · variación por semilla (0.72–1.28) · el collar
  // más gordo · más chico mientras llega · más chico detrás · titileo ±6 %
  'gl_PointSize=uPx*k*(0.72+0.56*fract(s*7.31))*(1.0+aI.y*0.25)*mix(0.62,1.0,e)*mix(0.65,1.0,back)*(1.0+0.06*tw);',
  'vT=tinta;vA=mix(0.10,1.0,back)*mix(0.70,1.0,fract(s*3.7));vK=aI.y;}'
].join('');

export const FS = [
  'precision mediump float;',
  'uniform vec3 uTinta,uTinta2;uniform float uA;',
  'varying float vT;varying float vK;varying float vA;',
  'void main(){vec2 d=gl_PointCoord-0.5;float r2=dot(d,d);',
  'if(r2>0.25)discard;',
  // Disco con borde suave de ~1 px: una PARTÍCULA, no una mancha gaussiana.
  'float a=1.0-smoothstep(0.10,0.25,r2);',
  'float t=clamp(vT,0.0,1.4);',
  'vec3 c=mix(uTinta2,uTinta,clamp(t*0.62+vK*0.55,0.0,1.0));',
  'a*=uA*vA*clamp(t,0.16,1.30)*mix(0.92,1.30,vK);',
  // alfa PREMULTIPLICADO: es lo que el navegador asume al componer el lienzo
  // sobre la página; sin esto el gris salía más claro de lo pedido.
  'gl_FragColor=vec4(c*a,a);}'
].join('');

// ═══ EL MOTOR ══════════════════════════════════════════════════════════════
export interface Motor {
  gl: WebGLRenderingContext; n: number; tConstruir: number;
  intro: number; t: number; rotY: number; rotX: number;
  mx: number; my: number; ms: number;
  dpr: number; w: number; h: number; fit: number; frames: number;
  resize(cssW: number, cssH: number, dprCap?: number): void;
  proyectar(p: V3): { x: number; y: number; z: number };
  cara(n: V3): number;
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
 *  escriben aquí: salen del documento. */
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
  // preguntarlo. Lanzar aquí enciende el respaldo estático.
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(pr));
  gl.useProgram(pr);

  const buf = (data: Float32Array, nombre: string, size: number) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(pr, nombre); gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  };
  buf(g.pos, 'aP', 3); buf(g.nrm, 'aN', 3); buf(g.meta, 'aI', 2);
  const pos = g.pos;

  const U: Record<string, WebGLUniformLocation | null> = {};
  ['uIn', 'uCz', 'uFo', 'uPx', 'uT', 'uMs', 'uRy', 'uRx', 'uSc', 'uM', 'uAs', 'uTinta', 'uTinta2', 'uA']
    .forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  // TINTA QUE TAPA, no luz que suma: el papel es blanco. Premultiplicado.
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // Los colores del tema se leen UNA vez (getComputedStyle por frame es un
  // recálculo de estilo por frame); el CV no tiene modo oscuro que los cambie.
  const t1 = tema(canvas, '--cvh-tinta', [0.039, 0.039, 0.039]);
  const t2 = tema(canvas, '--cvh-tinta-2', [0.353, 0.353, 0.353]);
  gl.uniform3f(U.uTinta, t1[0], t1[1], t1[2]);
  gl.uniform3f(U.uTinta2, t2[0], t2[1], t2[2]);
  gl.uniform1f(U.uA, 0.92);
  gl.uniform1f(U.uCz, 3.4); gl.uniform1f(U.uFo, 2.85);

  const m: Motor = {
    gl, n, tConstruir,
    intro: 0, t: 0, rotY: -0.34, rotX: 0.15, mx: 9, my: 9, ms: 0,
    dpr: 1, w: 0, h: 0, fit: 1, frames: 0,

    resize(cssW, cssH, dprCap) {
      // Presupuesto de PÍXELES, no un DPR a ojo: lo que ahoga a una GPU
      // integrada es el fill rate, y `gl_PointSize` va multiplicado por el DPR.
      const MAXPX = cssW < 700 ? 620000 : 2000000;
      let d = Math.min(window.devicePixelRatio || 1, dprCap || 2,
        Math.sqrt(MAXPX / Math.max(1, cssW * cssH)));
      d = Math.max(1, d);
      m.dpr = d; m.w = cssW; m.h = cssH;
      canvas.width = Math.round(cssW * d); canvas.height = Math.round(cssH * d);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);

      // ── LA CAJA NO SE ESCRIBE A MANO: SE PROYECTA ────────────────────────
      // Se proyectan los PUNTOS DE VERDAD en el reposo (la proyección es lineal
      // en `fit`) y se toma el que más lejos llega. Como ahora el objeto GIRA,
      // se mide en la vuelta entera: 12 azimuts, y el vaivén de X en su tope.
      // `MARGEN` no llega a 1 a propósito: tocando el borde se lee recortado.
      const MARGEN = 0.94;
      const asp = cssW / cssH;
      const sc0 = asp > 1 ? 1 / asp : 1, sc1 = asp > 1 ? 1 : asp;
      let ext = 1e-6;
      for (let a = 0; a < 12; a++) {
        const cy = Math.cos(a * Math.PI / 6), sy = Math.sin(a * Math.PI / 6);
        const cx = Math.cos(0.22), sx = Math.sin(0.22);
        for (let k = 0; k < n; k += 3) {
          const px = pos[k * 3], py = pos[k * 3 + 1], pz = pos[k * 3 + 2];
          const qx = px * cy + pz * sy, qz = -px * sy + pz * cy;
          const ry = py * cx - qz * sx, rz = py * sx + qz * cx;
          const kk = 2.85 / (3.4 - rz);
          const nx = Math.abs(qx * kk * sc0), ny = Math.abs(ry * kk * sc1);
          if (nx > ext) ext = nx;
          if (ny > ext) ext = ny;
        }
      }
      m.fit = MARGEN / ext;
    },

    // Proyección a mano: la MISMA cuenta que el shader, y por eso los nodos
    // del DOM caen exactamente donde cae el píxel. `z` es la profundidad
    // (positiva hacia la cámara).
    proyectar(p) {
      const cy = Math.cos(m.rotY), sy = Math.sin(m.rotY);
      const cx = Math.cos(m.rotX), sx = Math.sin(m.rotX);
      const qx = p[0] * cy + p[2] * sy, qy = p[1], qz = -p[0] * sy + p[2] * cy;
      const ry = qy * cx - qz * sx, rz = qy * sx + qz * cx;
      const w = 3.4 - rz, k = 2.85 / w;
      const asp = m.w / m.h, sc = asp > 1 ? [1 / asp, 1] : [1, asp];
      return { x: (qx * k * sc[0] * m.fit * 0.5 + 0.5) * m.w, y: (0.5 - ry * k * sc[1] * m.fit * 0.5) * m.h, z: rz };
    },
    /** Cuánto mira a la cámara una normal del objeto: 1 de frente, −1 detrás. */
    cara(nn) {
      const cy = Math.cos(m.rotY), sy = Math.sin(m.rotY);
      const cx = Math.cos(m.rotX), sx = Math.sin(m.rotX);
      const qy = nn[1], qz = -nn[0] * sy + nn[2] * cy;
      return qy * sx + qz * cx;
    },

    dibujar() {
      const asp = m.w / m.h;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uIn, m.intro);
      gl.uniform1f(U.uT, m.t);
      gl.uniform1f(U.uPx, (m.h / 340) * 2.05 * m.fit * m.dpr);
      gl.uniform2f(U.uRy, Math.cos(m.rotY), Math.sin(m.rotY));
      gl.uniform2f(U.uRx, Math.cos(m.rotX), Math.sin(m.rotX));
      gl.uniform2f(U.uSc, (asp > 1 ? 1 / asp : 1) * m.fit, (asp > 1 ? 1 : asp) * m.fit);
      gl.uniform2f(U.uM, m.mx, m.my);
      gl.uniform1f(U.uMs, m.ms);
      gl.uniform2f(U.uAs, asp, 1);
      gl.drawArrays(gl.POINTS, 0, n);
      m.frames++;
    }
  };
  return m;
}

// ═══ EL PEGAMENTO ══════════════════════════════════════════════════════════
const REPOSO_Y = -0.34, REPOSO_X = 0.15;
const INTRO_MS = 1200;
// EL GIRO: 0.22 rad/s = una vuelta cada 28.6 s. Es la velocidad ORIGINAL del
// globo (0.216), antes de bajarla a 0.075 para leer las pastillas del hero.
const GIRO = 0.22;
// Radianes por píxel de arrastre: ~1 rad por 135 px, una vuelta en un barrido
// de pantalla y media. Con menos se siente pesado; con más, se escapa.
const ARRASTRE = 0.0074;
// El foco del globo: 6 % del camino por frame (a 60 fps).
const FOCUS_LERP = 0.06;
// LA VÁLVULA. Si la GPU no da 25 fps durante 3 s seguidos, se apaga el lienzo y
// se enseña el respaldo estático: un micrófono a 8 fps es peor que un dibujo
// quieto. Antes de rendirse se prueba a bajar el DPR (lo que hace el globo).
const FPS_MIN = 25, VALVULA_MS = 3000;
// EL TOPE DE FOTOGRAMAS, EN DOS MARCHAS. El globo se limita a 60 con
// `nextFrameAt`; aquí el mismo mecanismo con dos objetivos: 30 fps mientras
// gira solo (0.22 rad/s son 0.4 px por frame en el limbo a 60 fps: a 30 sigue
// siendo menos de un píxel) y 60 en cuanto hay mano —puntero encima, arrastre,
// inercia, foco girando— o mientras dura la entrada. Los números están en la
// cabecera («LO QUE CUESTA»).
const FPS_REPOSO = 30, FPS_VIVO = 60;
const N_PARTICULAS = 8000;

function arrancaUno(raiz: HTMLElement): void {
  const stage = raiz.querySelector<HTMLElement>('[data-mic-stage]');
  const canvas = raiz.querySelector<HTMLCanvasElement>('[data-mic-canvas]');
  const capa = raiz.querySelector<HTMLUListElement>('[data-mic-nodos]');
  if (!stage || !canvas || !capa) return;

  const fallar = (motivo: string) => {
    stage.setAttribute('data-mic-fallo', motivo);
    stage.removeAttribute('data-mic-listo');
    capa.hidden = true;
  };

  // ── ¿HAY PUNTERO FINO? Si no, LOS NODOS DEL LIENZO SON DECORACIÓN ────────
  // En táctil los blancos bajan a ~25 px y la interfaz es el ÍNDICE de texto
  // (renglones de 44 px). El lienzo sigue girando y se puede arrastrar.
  const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    && window.innerWidth >= 940;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ── EL MOTOR SE CREA AL ENTRAR EN PANTALLA, NO AL CARGAR ─────────────────
  // `document.querySelectorAll('[data-mic]')` casa con los DOS paneles de
  // idioma; el escondido (`display:none`) no interseca nunca y no construye.
  let motor: Motor;
  const AN = anclas();

  // ── EL ESTADO DEL GIRO ───────────────────────────────────────────────────
  let dprTope = 2;
  let raf = 0, t0 = 0, previo = 0, lentoDesde = 0;
  let visible = false, arrancado = false, listo = false;
  let auto = 1;                 // 1 gira sola · 0 quieta (puntero, arrastre, foco)
  let velY = 0;                 // inercia del arrastre, rad/s
  let objetivoY: number | null = null;   // foco: adónde girar
  let sobre = false, sobreNodo = false, enfocado = false, arrastrando = false;
  let mxObj = 9, myObj = 9;     // el puntero de verdad, en NDC (9 = lejos)
  let tArr = 0;                 // cuándo arrancó, para medir el primer fotograma

  // ── LOS NODOS SON ENLACES, Y ESO ES LITERAL DE JAIME ────────────────────
  // UN clic, la pieza. El nombre accesible, la dirección y el texto salen del
  // ÍNDICE que ya está en el HTML: bilingüe exacto sin que este guion sepa una
  // palabra.
  const filas = new Map<string, HTMLElement>();
  raiz.querySelectorAll<HTMLElement>('[data-mic-fila]').forEach((el) => {
    filas.set(el.dataset.micFila || '', el);
  });
  const botones: HTMLAnchorElement[] = [];
  const construirNodos = () => {
    capa.hidden = false;
    NODOS.forEach((nd) => {
      const fila = filas.get(nd.id);
      if (!fila) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'nodo';
      // EL DESTINO SE LEE DEL ÍNDICE, NO DE `nd.href`. Tres nodos (Rendón,
      // Moris, Marg) abren hoy la ficha DENTRO del CV —`#<idioma>-pieza-<id>`—
      // mientras no llegue su enlace, y ese ancla lleva el idioma delante:
      // solo el índice de cada panel sabe cuál. Los externos salen iguales.
      const enlace = fila.querySelector<HTMLAnchorElement>('.mic-fila-a');
      a.href = enlace ? enlace.getAttribute('href') || nd.href || '#' : nd.href || '#';
      if (enlace && enlace.target) { a.target = enlace.target; a.rel = 'noopener'; }
      a.setAttribute('data-nodo', nd.id);
      if (nd.tipo === 'pais') a.setAttribute('data-pais', '');
      if (nd.tipo === 'experiencia') a.setAttribute('data-exp', '');
      const et = document.createElement('span');
      et.className = 'nodo-et';
      et.setAttribute('aria-hidden', 'true');
      et.textContent = fila.dataset.nombre || '';
      a.appendChild(et);
      if (fino) {
        a.setAttribute('aria-label', fila.dataset.aria || '');
        // Señalar la fila del índice al pasar por el nodo: dibujo y lista son UNA cosa.
        const marca = (on: boolean) => fila.toggleAttribute('data-activo', on);
        a.addEventListener('pointerenter', () => { marca(true); sobreNodo = true; });
        a.addEventListener('pointerleave', () => { marca(false); sobreNodo = false; });
        a.addEventListener('focus', () => marca(true));
        a.addEventListener('blur', () => marca(false));
      } else {
        a.setAttribute('aria-hidden', 'true');
        a.setAttribute('tabindex', '-1');
      }
      li.appendChild(a);
      capa.appendChild(li);
      botones.push(a);
    });
    if (!fino) capa.setAttribute('aria-hidden', 'true');
  };

  // ── LOS NODOS SIGUEN LA ROTACIÓN ─────────────────────────────────────────
  // Se proyectan cada frame (once puntos: nada). Se atenúan con el facing como
  // los marcadores del globo, y por debajo de 0.12 no se pueden pinchar. NO se
  // esconden: siguen en el orden de tabulación, y enfocarlos gira el micrófono.
  // ── Y SOLO SE ESCRIBEN CUANDO CAMBIAN ────────────────────────────────────
  // Medido en esta Mac (Chrome en cabeza, DPR 2, pestaña visible): escribir 11
  // transforms + 11 opacidades cada frame, ENCIMA del lienzo, disparaba la CPU
  // del navegador entero; sin las escrituras al DOM el mismo bucle costaba una
  // tercera parte. Se redondea a 0.5 px y 0.02 de opacidad y se compara con
  // la cadena anterior: un nodo cerca del eje se mueve menos de eso por frame
  // y no toca el DOM; en el limbo (~22 px/s a 60 fps) escribe uno de cada dos.
  let blanco = 0;
  const tfPrev: string[] = [], opPrev: string[] = [];
  const situar = () => {
    let min = 1e9;
    const px: number[] = [], py: number[] = [];
    for (let i = 0; i < botones.length; i++) {
      const p = motor.proyectar(AN[i].p), f = motor.cara(AN[i].n);
      const b = botones[i];
      const tf = `translate3d(${Math.round(p.x * 2) / 2}px,${Math.round(p.y * 2) / 2}px,0)`;
      if (tf !== tfPrev[i]) { tfPrev[i] = tf; b.style.transform = tf; }
      // smoothstep(−0.08, 0.22): el mismo apagado que los marcadores del globo.
      const v = Math.max(0, Math.min(1, (f + 0.08) / 0.30));
      const op = (Math.round(v * v * (3 - 2 * v) * 50) / 50).toFixed(2);
      if (op !== opPrev[i]) { opPrev[i] = op; b.style.opacity = op; }
      const atras = f < 0.12;
      if (atras !== b.hasAttribute('data-atras')) b.toggleAttribute('data-atras', atras);
      if (!atras) { px.push(p.x); py.push(p.y); }
    }
    // El blanco clicable se dimensiona con la separación MEDIDA entre los nodos
    // que están delante, nunca menos de 24 px (WCAG 2.5.8) ni más de 44.
    for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) {
      const d = Math.hypot(px[i] - px[j], py[i] - py[j]);
      if (d < min) min = d;
    }
    const nb = Math.max(24, Math.min(44, Math.floor(min)));
    if (nb !== blanco) { blanco = nb; capa.style.setProperty('--blanco', nb + 'px'); }
  };

  const medir = () => { motor.resize(stage.clientWidth, stage.clientHeight, dprTope); };

  /** Gira hasta poner de frente la normal `n` del objeto: rotY = atan2(−x, z)
   *  maximiza la z rotada. Con «menos movimiento», de golpe. */
  const enfocar = (i: number) => {
    const n = AN[i].n;
    objetivoY = Math.atan2(-n[0], n[2]);
    if (reduce.matches) { motor.rotY = objetivoY; objetivoY = null; motor.dibujar(); situar(); }
  };

  const paso = (dt: number) => {
    const m = motor;
    m.t += dt;
    // La rotación se detiene al posar el puntero sobre un nodo, al arrastrar y
    // con un nodo enfocado; sobre el lienzo baja a un cuarto (un blanco que se
    // mueve a 5 px/s se pincha igual y el giro no se pierde).
    const quiere = (arrastrando || enfocado || sobreNodo) ? 0 : (sobre && fino ? 0.25 : 1);
    auto += (quiere - auto) * (1 - Math.exp(-4 * dt));
    if (objetivoY !== null) {
      let d = (objetivoY - m.rotY) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
      m.rotY += d * Math.min(1, FOCUS_LERP * dt * 60);
      if (Math.abs(d) < 0.004) { m.rotY = objetivoY; objetivoY = null; }
    } else if (!arrastrando) {
      m.rotY += (GIRO * auto + velY) * dt;
      velY *= Math.exp(-3 * dt);
    }
    // El vaivén del globo: sin(t·0.2)·0.07 con lerp 0.03; aquí 0.05 sobre el reposo.
    if (!arrastrando) m.rotX += (REPOSO_X + Math.sin(m.t * 0.2) * 0.05 - m.rotX) * (1 - Math.exp(-1.8 * dt));
    // El puntero suavizado: persigue al de verdad (~0.1 s) y su fuerza sube y
    // baja en ~0.2 s. Ese retardo es el «muelle» de las partículas.
    const k = 1 - Math.exp(-10 * dt);
    m.mx += (mxObj - m.mx) * k; m.my += (myObj - m.my) * k;
    m.ms += (((sobre && fino) ? 1 : 0) - m.ms) * (1 - Math.exp(-6 * dt));
  };

  let siguiente = 0;
  const bucle = (now: number) => {
    raf = 0;
    if (!visible) return;
    if (!t0) t0 = now;
    // ¿Toca dibujar? Vivo = hay mano o algo que responde a ella; si no, reposo.
    const vivo = arrastrando || (sobre && fino) || enfocado || objetivoY !== null
      || Math.abs(velY) > 0.02 || now - t0 < INTRO_MS + 200;
    const paso_ms = 1000 / (vivo ? FPS_VIVO : FPS_REPOSO);
    if (now < siguiente) { raf = requestAnimationFrame(bucle); return; }
    siguiente = Math.max(siguiente + paso_ms, now - 32);
    const dtRaw = previo ? now - previo : 16;
    previo = now;
    // ── LA VÁLVULA. Un frame de > 500 ms es una pestaña que volvió, no lentitud.
    // «Lento» se mide contra lo que se PIDIÓ: en reposo se piden 33 ms, y un
    // tick de rAF que cae justo antes del tope deja frames de 50 ms sin que
    // nada vaya mal.
    if (dtRaw < 500) {
      if (dtRaw > Math.max(1000 / FPS_MIN, paso_ms + 20)) { if (!lentoDesde) lentoDesde = now; }
      else lentoDesde = 0;
      if (lentoDesde && now - lentoDesde > VALVULA_MS / 2 && dprTope > 1) {
        // Primero se baja el DPR, como el globo; solo si eso no basta se rinde.
        dprTope = 1; medir(); lentoDesde = 0;
      } else if (lentoDesde && now - lentoDesde > VALVULA_MS) { fallar('lento'); return; }
    }
    const e = Math.min(1, (now - t0) / INTRO_MS);
    motor.intro = e * e * (3 - 2 * e);
    paso(Math.min(0.05, dtRaw / 1000));
    motor.dibujar(); situar();
    if (!listo) { listo = true; stage.setAttribute('data-mic-listo', '1'); canvas.dataset.t1 = String(Math.round(performance.now() - tArr)); }
    // SE PARA fuera de la pantalla (`visible` lo pone el observador) y no
    // arranca con «menos movimiento». Es la única animación de esta pantalla.
    raf = requestAnimationFrame(bucle);
  };
  const arrancaBucle = () => { if (!raf && visible && !reduce.matches && !stage.hasAttribute('data-mic-fallo')) { previo = 0; siguiente = 0; raf = requestAnimationFrame(bucle); } };

  // Con «menos movimiento» NO se cae al SVG: el motor pinta UN fotograma con el
  // micrófono ya formado y no vuelve a dibujar (salvo que lo arrastren).
  const quieto = () => {
    motor.intro = 1; motor.dibujar(); situar();
    stage.setAttribute('data-mic-listo', '1'); canvas.dataset.t1 = String(Math.round(performance.now() - tArr));
  };

  // ── LA MANO: ARRASTRAR PARA GIRARLO ──────────────────────────────────────
  // Sin `setPointerCapture`: con captura, el clic de un nodo se dispara en el
  // elemento que captura y los enlaces dejan de abrir. Los oyentes van en
  // `window` mientras dura el gesto. Un arrastre de más de 6 px cancela el
  // clic que llegaría al soltar sobre un nodo. `touch-action: pan-y` (CSS)
  // deja el scroll vertical al navegador: aquí nunca hay preventDefault.
  let x0 = 0, y0 = 0, lx = 0, ly = 0, lt = 0, movido = false;
  const mover = (e: PointerEvent) => {
    const dx = e.clientX - lx, dy = e.clientY - ly, now = performance.now();
    lx = e.clientX; ly = e.clientY;
    motor.rotY += dx * ARRASTRE;
    motor.rotX = Math.max(-0.45, Math.min(0.65, motor.rotX + dy * ARRASTRE * 0.6));
    const dts = Math.max(8, now - lt) / 1000; lt = now;
    velY = velY * 0.5 + (dx * ARRASTRE / dts) * 0.5;
    if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 6) movido = true;
    if (reduce.matches) { motor.dibujar(); situar(); }
  };
  const soltar = () => {
    arrastrando = false;
    stage.removeAttribute('data-mic-arrastre');
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    window.removeEventListener('pointercancel', soltar);
    velY = reduce.matches ? 0 : Math.max(-5, Math.min(5, velY));
  };
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !arrancado) return;
    arrastrando = true; movido = false; velY = 0; objetivoY = null;
    x0 = lx = e.clientX; y0 = ly = e.clientY; lt = performance.now();
    stage.setAttribute('data-mic-arrastre', '');
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  });
  stage.addEventListener('click', (e) => { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);
  // El puntero sobre el lienzo: empuja las partículas (fino) y frena el giro.
  const puntero = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    mxObj = ((e.clientX - r.left) / r.width) * 2 - 1;
    myObj = 1 - ((e.clientY - r.top) / r.height) * 2;
  };
  stage.addEventListener('pointerenter', (e) => { sobre = true; puntero(e); });
  stage.addEventListener('pointermove', puntero);
  stage.addEventListener('pointerleave', () => { sobre = false; sobreNodo = false; });
  // El foco por teclado: un nodo enfocado que está detrás GIRA hasta el frente,
  // y mientras algo del lienzo tiene el foco, el giro se detiene.
  stage.addEventListener('focusin', (e) => {
    enfocado = true;
    const i = botones.indexOf(e.target as HTMLAnchorElement);
    if (i >= 0 && motor.cara(AN[i].n) < 0.35) enfocar(i);
  });
  stage.addEventListener('focusout', () => { setTimeout(() => { enfocado = stage.contains(document.activeElement); }, 0); });

  // El micrófono NO puede ser el elemento LCP: se arranca cuando entra en
  // pantalla, no al cargar. Hasta entonces la caja ya está reservada por CSS y
  // dentro se ve el respaldo estático — CLS 0 por construcción.
  const arranca = () => {
    if (arrancado) return; arrancado = true;
    tArr = performance.now();
    try {
      motor = crearMotor(canvas, N_PARTICULAS);
    } catch (e) {
      fallar('webgl');
      return;
    }
    canvas.dataset.n = String(N_PARTICULAS); canvas.dataset.tc = String(Math.round(motor.tConstruir));
    construirNodos();
    medir();
    let pend = 0;
    new ResizeObserver(() => {
      window.clearTimeout(pend);
      pend = window.setTimeout(() => { medir(); if (!raf) { motor.dibujar(); situar(); } }, 80);
    }).observe(stage);
    if (reduce.matches) quieto(); else arrancaBucle();
  };
  if ('IntersectionObserver' in window) {
    // Un solo observador para las dos cosas: arrancar la primera vez que se
    // acerca (200 px antes) y PARAR el bucle cada vez que sale de pantalla.
    new IntersectionObserver((ents) => {
      const v = ents.some((x) => x.isIntersecting);
      visible = v;
      if (v) { arranca(); arrancaBucle(); }
    }, { rootMargin: '200px', threshold: 0.02 }).observe(stage);
  } else { visible = true; arranca(); }
}

document.querySelectorAll<HTMLElement>('[data-mic]').forEach(arrancaUno);
