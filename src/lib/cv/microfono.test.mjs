// LOS GUARDIANES DEL MICRÓFONO.
//
// La mayoría comprueban cosas que ya fallaron una vez y que NO AVISAN cuando
// fallan: un lienzo negro sin error en la consola, un punto que promete un
// episodio que no existe, una fila del índice que no tiene nodo, un bucle que
// no se para.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NODOS, SIN_PUNTO, PERSONAS, EXPERIENCIAS, PAISES, TIKTOK } from './microfono.mjs';

const RAIZ = path.resolve(import.meta.dirname, '../../..');
const MOTOR = fs.readFileSync(path.join(RAIZ, 'src/scripts/cv-microfono.ts'), 'utf8');
const CV = fs.readFileSync(path.join(RAIZ, 'src/i18n/cv.ts'), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// 1 · EL BUG QUE DEJA EL LIENZO NEGRO SIN LANZAR NADA
// ═══════════════════════════════════════════════════════════════════════════
// En WebGL 1, la precisión por defecto de un `float` es `highp` en el vertex
// shader y NO EXISTE por defecto en el fragment (hay que declararla). Un mismo
// uniform declarado en los dos con precisiones distintas **no enlaza**, y
// `gl.linkProgram` no lanza: devuelve un programa muerto y el lienzo se queda
// negro. Eso costó una tarde en el prototipo.
function uniformes(src) {
  const out = new Set();
  for (const m of src.matchAll(/uniform\s+(?:highp\s+|mediump\s+|lowp\s+)?\w+\s+([^;']+);/g)) {
    for (const n of m[1].split(',')) out.add(n.trim());
  }
  return out;
}
function bloque(nombre) {
  const i = MOTOR.indexOf(`export const ${nombre} = [`);
  assert.ok(i > 0, `no encuentro el shader ${nombre}`);
  const j = MOTOR.indexOf("].join('')", i);
  return MOTOR.slice(i, j);
}

test('mic: ningún uniform se declara en los dos shaders (el bug del lienzo negro)', () => {
  const enVS = uniformes(bloque('VS'));
  const enFS = uniformes(bloque('FS'));
  assert.ok(enVS.size >= 6, 'el vertex shader no declara uniforms: ¿cambió el formato?');
  assert.ok(enFS.size >= 2, 'el fragment shader no declara uniforms: ¿cambió el formato?');
  const compartidos = [...enVS].filter((u) => enFS.has(u));
  assert.deepEqual(compartidos, [],
    `uniform(s) declarados en los DOS shaders: ${compartidos.join(', ')}. Un mismo uniform con dos ` +
    'precisiones no enlaza y el lienzo se queda NEGRO sin lanzar ningún error.');
});

test('mic: el fragment shader declara su precisión', () => {
  assert.match(bloque('FS'), /precision\s+(mediump|highp)\s+float;/,
    'un fragment shader sin `precision float` no compila en algunos móviles');
});

test('mic: el enlace del programa se comprueba (LINK_STATUS)', () => {
  assert.match(MOTOR, /getProgramParameter\([^)]*LINK_STATUS\)/,
    'sin preguntar por LINK_STATUS, un programa que no enlaza deja el lienzo negro y no lanza nada');
  assert.match(MOTOR, /getShaderParameter\([^)]*COMPILE_STATUS\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · UN PUNTO QUE NO ABRE NADA ROMPE LA PREMISA DE JAIME
// ═══════════════════════════════════════════════════════════════════════════
test('mic: los catorce nodos abren una pieza que existe', () => {
  assert.equal(NODOS.length, 14);
  for (const n of NODOS) {
    // O una URL comprobada, o `null` = la ficha DENTRO del CV (Rendón, Moris,
    // Marg mientras no llegue su enlace). Ninguna otra cosa: una cadena vacía
    // o un acortador serían un punto que promete y no abre.
    if (n.href === null) {
      assert.equal(n.externo, '', `${n.id}: un nodo interno no tiene fuente externa`);
    } else {
      assert.ok(/^https:\/\//.test(n.href), `${n.id} sin enlace https`);
      assert.ok(n.externo, `${n.id} sin decir de dónde sale la pieza`);
    }
    assert.ok(Number.isInteger(n.cap), `${n.id} no baja a ningún capítulo`);
  }
  const ids = NODOS.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
});

test('mic: ocho personas, dos experiencias y cuatro países, y la diferencia se dice en pantalla', () => {
  assert.equal(PERSONAS.length, 8);
  assert.equal(EXPERIENCIAS.length, 2);
  assert.equal(PAISES.length, 4);
  // El lede tiene que seguir diciendo las tres cosas: que las personas son el
  // liderazgo, que dos son consejos y no entrevistas, y que México es el país
  // con recibo. Es lo único que impide que grabar un vídeo de datos de Japón
  // se lea como conseguir a un ejecutivo.
  // ── OLA 6 (INVENTARIO.md §4): el lede baja a DOS líneas de 24/28 ──────
  // Las 66 palabras que explicaban qué es un índice se fueron; lo que
  // decían —que dos son consejos y no entrevistas, que a México lo
  // representó él— lo dice CADA TARJETA en pantalla (`mic.abre.marg`,
  // `mic.abre.dieck`, `mic.abre.mexico`). Se comprueba ahí, no en el lede.
  for (const clave of [
    'The people I got to sit down with me', 'La gente que conseguí sentar conmigo',
    'not an interview', 'no una entrevista',
    'represent Mexico', 'representar a México'
  ]) {
    assert.ok(CV.includes(clave), `falta en cv.ts la línea que dice la diferencia en pantalla: «${clave}»`);
  }
  for (const lede of CV.matchAll(/^\s*lede: '([^']+)',/gm)) {
    if (/sit down with me|sentar conmigo/.test(lede[1])) {
      assert.ok(lede[1].length <= 110, `el lede del micrófono ya no cabe en dos líneas de 24/28: ${lede[1].length} caracteres`);
    }
  }
});

test('mic: los tres sin pieza siguen sin punto', () => {
  for (const id of Object.keys(SIN_PUNTO)) {
    assert.ok(!NODOS.some((n) => n.id === id),
      `«${id}» tiene punto en el micrófono y no debería: ${SIN_PUNTO[id]}`);
  }
  assert.ok(SIN_PUNTO.duran && SIN_PUNTO.majo && SIN_PUNTO.sol);
});

test('mic: los dos nodos internos son exactamente Moris y Marg (Rendón lo fue hasta el 2026-09-03)', () => {
  // El día que llegue un enlace, este test cambia: es el recibo de qué falta.
  // Cambió una vez: el enlace de Rendón llegó el 2026-09-03.
  assert.deepEqual(NODOS.filter((n) => n.href === null).map((n) => n.id), ['dieck', 'marg']);
});

test('mic: el podcast de la sala FTR enlaza al destino final, no al acortador', () => {
  const p = NODOS.find((n) => n.id === 'podcast');
  assert.ok(!p.href.includes('lnkd.in'),
    'un acortador puede cambiar de destino sin avisar, y en un CV el enlace es parte de la prueba');
  assert.match(p.href, /youtube\.com/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · CADA NODO TIENE SU TEXTO EN LOS DOS IDIOMAS
// ═══════════════════════════════════════════════════════════════════════════
test('mic: los catorce nodos tienen su línea «qué abre» en EN y en ES', () => {
  const bloques = [...CV.matchAll(/abre: \{([\s\S]*?)\n {4}\},/g)].map((m) => m[1]);
  assert.equal(bloques.length, 2, 'esperaba dos bloques abre (EN y ES), encontré ' + bloques.length);
  for (const b of bloques) {
    for (const n of NODOS) {
      assert.match(b, new RegExp(`\\b${n.id}:`), `falta \`abre.${n.id}\` en uno de los dos paneles`);
    }
  }
});

test('mic: los cuatro países tienen nombre en EN y en ES', () => {
  const bloques = [...CV.matchAll(/paises: \{([\s\S]*?)\n {4}\},/g)].map((m) => m[1]);
  assert.equal(bloques.length, 2);
  for (const b of bloques) for (const n of PAISES) assert.match(b, new RegExp(`\\b${n.id}:`));
});

test('mic: las personas y las experiencias tienen ficha en `entrevistas.personas` en EN y en ES', () => {
  const bloques = [...CV.matchAll(/personas: \{([\s\S]*?)\n {4}\}\n {2}\},/g)].map((m) => m[1]);
  assert.equal(bloques.length, 2, 'esperaba dos bloques personas (EN y ES), encontré ' + bloques.length);
  for (const b of bloques) {
    for (const n of [...PERSONAS, ...EXPERIENCIAS]) {
      assert.match(b, new RegExp(`\\b${n.id}: \\{`), `falta \`entrevistas.personas.${n.id}\` en uno de los dos paneles`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · LO QUE EL MICRÓFONO NO PUEDE HACER
// ═══════════════════════════════════════════════════════════════════════════
test('mic: el giro es la única animación, se para fuera de pantalla y tiene válvula', () => {
  // La regla de motion.css («nada en bucle infinito») tiene UNA excepción
  // declarada: una rotación lenta y continua del objeto cuenta como la única
  // animación de esa pantalla. Jaime la pidió con estas palabras: «dé la
  // vuelta siendo 3D». Lo que se vigila es lo que hace que sea aceptable:
  //  · gira despacio (0.22 rad/s: la velocidad ORIGINAL del globo),
  assert.match(MOTOR, /const GIRO = 0\.22;/, 'el giro tiene que ser el del globo (0.22 rad/s)');
  //  · el bucle SE PARA fuera de la pantalla (lo apaga el IntersectionObserver),
  assert.match(MOTOR, /if \(!visible\) return;/, 'el bucle tiene que pararse fuera de pantalla');
  //  · con «menos movimiento» pinta UN fotograma y no vuelve a pedir rAF,
  assert.match(MOTOR, /if \(reduce\.matches\) quieto\(\); else arrancaBucle\(\);/,
    'con prefers-reduced-motion el micrófono se pinta una vez y se queda quieto');
  //  · en reposo va a 30 fps y solo sube a 60 con la mano encima,
  assert.match(MOTOR, /FPS_REPOSO = 30, FPS_VIVO = 60/, 'faltan las dos marchas del tope de fotogramas');
  //  · y si la GPU no da 25 fps durante 3 s, se apaga y queda el dibujo estático.
  assert.match(MOTOR, /FPS_MIN\s*=\s*25/, 'falta el umbral de la válvula');
  assert.match(MOTOR, /VALVULA_MS\s*=\s*3000/, 'falta el tiempo de la válvula');
});

test('mic: el micrófono no puede ser el elemento LCP', () => {
  assert.match(MOTOR, /IntersectionObserver/,
    'el motor tiene que esperar a entrar en pantalla, o compite con la foto de portada por el LCP');
});

test('mic: ningún tamaño de letra del módulo depende de la ventana', () => {
  const comp = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Microfono.astro'), 'utf8');
  const malos = comp.split('\n').filter((l) => /font-size:[^;]*(clamp|[0-9.]+vw)/.test(l));
  assert.deepEqual(malos, [],
    'un `font-size` con `vw` o `clamp` es la causa mecánica de «todo súper grande»');
});

test('mic: el enlace de TikTok se arma con la constante, no a mano', () => {
  assert.equal(TIKTOK, 'https://www.tiktok.com/@smart.financee/video/');
  for (const n of NODOS.filter((x) => x.externo === 'TikTok')) {
    assert.ok(n.href.startsWith(TIKTOK), `${n.id} no usa la constante TIKTOK`);
  }
});

test('mic: el arrastre no bloquea el scroll vertical ni selecciona texto', () => {
  const comp = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Microfono.astro'), 'utf8');
  assert.match(comp, /\.mic-stage\s*\{[^}]*touch-action:\s*pan-y/, 'el lienzo tiene que dejar el scroll vertical al navegador');
  assert.match(comp, /\.nodo\[data-atras\]\)\s*\{[^}]*pointer-events:\s*none/, 'un nodo en la cara de atrás no se puede pinchar');
  assert.ok(!/preventDefault\(\)/.test(MOTOR.split('pointerdown')[1]?.split('\n')[0] || ''), 'nunca hay preventDefault en pointerdown');
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 · LOS CATORCE ENLACES TIENEN QUE ATERRIZAR EN SU PIEZA, NO EN EL CAPÍTULO
// ═══════════════════════════════════════════════════════════════════════════
const HIST = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Historia.astro'), 'utf8');
const MIC = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Microfono.astro'), 'utf8');

test('mic: los catorce nodos tienen ancla propia en el capítulo', () => {
  // Las fichas del carrusel anclan por la clave de `citas`; los vídeos de país
  // por el campo `pieza`; las experiencias por un `ancla(p, '<id>')` escrito.
  const claves = new Set();
  const arr = HIST.slice(HIST.indexOf('const citas = ['), HIST.indexOf('];', HIST.indexOf('const citas = [')));
  for (const m of arr.matchAll(/key:\s*'([^']+)'/g)) claves.add(m[1]);
  for (const m of HIST.matchAll(/pieza:\s*'([^']+)'/g)) claves.add(m[1]);
  for (const m of HIST.matchAll(/ancla\(p,\s*'([^']+)'\)/g)) claves.add(m[1]);
  // Las dos fichas de consejo (Moris, Marg) se pintan desde una lista con
  // `{ id: 'dieck', per: … }` y el ancla sale de `ancla(p, x.id)`.
  for (const m of HIST.matchAll(/\{ id: '([a-z]+)', per:/g)) claves.add(m[1]);

  const sinAncla = NODOS.filter((n) => !claves.has(n.id)).map((n) => n.id);
  assert.deepEqual(sinAncla, [], `nodos sin dónde aterrizar: ${sinAncla.join(', ')}`);
});

// ── LA PRUEBA CAMBIÓ DE FORMA EN LA OLA 5, NO DE INTENCIÓN ───────────────
// Antes exigía que el «En el capítulo ↓» usara `f.ancla`. Ese renglón ya no
// existe: el índice de texto de catorce fichas se convirtió en el carrusel de
// tarjetas negras (una ficha = una tarjeta), y los catorce «En el capítulo ↓»
// se fueron con él — el guardián del sistema los contaba como el rótulo
// repetido más caro del documento («In the chapter ↓» ×14).
// LO QUE LA PRUEBA PROTEGÍA SIGUE PROTEGIDO, y es lo que costó medirlo: los
// enlaces del módulo apuntaban todos a `#<idioma>-cap-8`, y sobre `dist` a
// 1440×900 eso dejaba las fichas de persona 757 px por debajo de su destino y
// los vídeos de país entre 3 165 y 4 620. Un índice que aterriza cinco
// pantallas antes de lo que promete confirma el «se me hizo infinito» en vez
// de atacarlo. Así que la regla que se comprueba es la de fondo, y ahora vale
// para CUALQUIER enlace del módulo: nunca al capítulo, siempre a la pieza.
test('mic: ningún enlace del módulo apunta a un capítulo; los internos van a la pieza', () => {
  assert.ok(!/#\$\{p\}-cap-/.test(MIC),
    'el micrófono volvió a apuntar al capítulo en vez de a la pieza');
  // El destino interno se arma UNA vez, en el mapeo de fichas, con `ancla()`
  // — la misma función con la que `Historia.astro` pinta el ancla, para que no
  // puedan separarse.
  assert.ok(MIC.includes("ancla(p, n.id)"), 'el destino interno ya no sale de `ancla()`');
  assert.ok(MIC.includes('href={f.href}'), 'la tarjeta ya no enlaza el `href` de la ficha');
});

test('mic: los enlaces internos viajan por el arreglo del índice, no como ancla nativa', () => {
  // Una navegación de ancla con `scroll-behavior: smooth` EN VUELO no
  // desplaza, y el micrófono es un índice en la segunda pantalla: el sitio
  // donde más se pulsan dos destinos seguidos. Tienen que estar en el
  // selector que intercepta el clic (ver la cabecera de Cv.astro): los «En el
  // capítulo ↓» y los NODOS internos del lienzo.
  const CV_LAYOUT = fs.readFileSync(path.join(RAIZ, 'src/layouts/Cv.astro'), 'utf8');
  assert.ok(CV_LAYOUT.includes('a.mic-fila-a[href^="#"]'),
    'los enlaces del micrófono no pasan por el interceptor de `Cv.astro`');
  assert.ok(CV_LAYOUT.includes('a.nodo[href^="#"]'),
    'los nodos internos del lienzo no pasan por el interceptor de `Cv.astro`');
});
