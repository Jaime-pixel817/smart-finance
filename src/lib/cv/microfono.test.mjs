// LOS GUARDIANES DEL MICRÓFONO.
//
// Tres de los cuatro comprueban cosas que ya fallaron una vez y que NO AVISAN
// cuando fallan: un lienzo negro sin error en la consola, un punto que promete
// un episodio que no existe, y una fila del índice que no tiene nodo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NODOS, SIN_PUNTO, PERSONAS, PAISES, TIKTOK } from './microfono.mjs';

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
//
// La cura es estructural y esto la vigila: NINGÚN uniform se declara en los dos
// shaders. Si alguien añade uno compartido, esta prueba lo dice antes de que
// nadie mire una pantalla negra.
function uniformes(src) {
  const out = new Set();
  for (const m of src.matchAll(/uniform\s+(?:highp\s+|mediump\s+|lowp\s+)?\w+\s+([^;']+);/g)) {
    for (const n of m[1].split(',')) out.add(n.trim());
  }
  return out;
}
function bloque(nombre) {
  // Los shaders viven como arrays de cadenas en el motor: se recorta el bloque
  // por su nombre y se lee tal cual, sin ejecutar TypeScript.
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
    'precisiones no enlaza y el lienzo se queda NEGRO sin lanzar ningún error. O se declara la misma ' +
    'precisión a mano en los dos, o —mejor— se pasa por un varying.');
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
test('mic: los once nodos abren una pieza que existe', () => {
  assert.equal(NODOS.length, 11);
  for (const n of NODOS) {
    assert.ok(n.href && /^https:\/\//.test(n.href), `${n.id} sin enlace https`);
    assert.ok(n.externo, `${n.id} sin decir de dónde sale la pieza`);
    assert.ok(Number.isInteger(n.cap), `${n.id} no baja a ningún capítulo`);
  }
  const ids = NODOS.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
});

test('mic: siete personas y cuatro países, y la mitad se dice en pantalla', () => {
  assert.equal(PERSONAS.length, 7);
  assert.equal(PAISES.length, 4);
  // El lede tiene que seguir diciendo la diferencia. Es lo único que impide que
  // grabar un vídeo de datos de Japón se lea como conseguir a un ejecutivo.
  for (const clave of ['seven people are the leadership', 'siete personas son el liderazgo']) {
    assert.ok(CV.includes(clave), `falta en cv.ts la línea que separa las dos mitades: «${clave}»`);
  }
});

test('mic: los cuatro sin pieza siguen sin punto', () => {
  // Moris Dieck y Marg Franklin son los dos que más tientan: hay foto y hay
  // encuentro. Lo que no hay es nada que un clic pueda abrir.
  for (const id of Object.keys(SIN_PUNTO)) {
    assert.ok(!NODOS.some((n) => n.id === id),
      `«${id}» tiene punto en el micrófono y no debería: ${SIN_PUNTO[id]}`);
  }
  assert.ok(SIN_PUNTO.dieck && SIN_PUNTO.marg && SIN_PUNTO.rendon && SIN_PUNTO.duran);
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
// La paridad EN/ES del CV es exacta. Un nodo con ficha en inglés y sin ficha en
// español son dos documentos distintos, y el panel español pintaría `undefined`.
test('mic: los once nodos tienen su línea «qué abre» en EN y en ES', () => {
  const bloques = [...CV.matchAll(/abre: \{([\s\S]*?)\n {4}\},/g)].map((m) => m[1]);
  assert.equal(bloques.length, 2, "esperaba dos bloques abre (EN y ES), encontre " + bloques.length);
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

// ═══════════════════════════════════════════════════════════════════════════
// 4 · LO QUE EL MICRÓFONO NO PUEDE HACER
// ═══════════════════════════════════════════════════════════════════════════
test('mic: nada en bucle infinito y la válvula existe', () => {
  // La regla del repo: nada se mueve solo para siempre. El micrófono se arma,
  // se asienta y PARA — el `requestAnimationFrame` solo se vuelve a pedir
  // mientras dura la entrada.
  assert.match(MOTOR, /if \(e < 1\) raf = requestAnimationFrame\(bucle\);/,
    'el bucle del micrófono tiene que pararse al terminar la entrada');
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

// ═══════════════════════════════════════════════════════════════════════════
// 5 · LOS ONCE ENLACES TIENEN QUE ATERRIZAR EN SU PIEZA, NO EN EL CAPÍTULO
// ═══════════════════════════════════════════════════════════════════════════
// Los once «En el capítulo ↓» apuntaban todos a `#<lang>-cap-8`. Medido sobre
// `dist` a 1440×900: el ancla del capítulo cae en y = 23 232 y las piezas no
// están ahí — las siete fichas de persona 757 px por debajo y los cuatro
// vídeos de país entre 3 165 y 4 620 px, o sea de 3.5 a 5.1 pantallas. Ahora
// cada nodo baja a SU pieza, y esto vigila que cada uno tenga dónde caer: un
// ancla que no existe no da error en ninguna parte, solo no desplaza.
const HIST = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Historia.astro'), 'utf8');
const MIC = fs.readFileSync(path.join(RAIZ, 'src/components/cv/Microfono.astro'), 'utf8');

test('mic: los once nodos tienen ancla propia en el capítulo', () => {
  // Las fichas de persona anclan por la clave de `citas`; los vídeos de país
  // por el campo `pieza` que se les escribió al lado del id de TikTok.
  const claves = new Set();
  const arr = HIST.slice(HIST.indexOf('const citas = ['), HIST.indexOf('];', HIST.indexOf('const citas = [')));
  for (const m of arr.matchAll(/key:\s*'([^']+)'/g)) claves.add(m[1]);
  for (const m of HIST.matchAll(/pieza:\s*'([^']+)'/g)) claves.add(m[1]);

  const sinAncla = NODOS.filter((n) => !claves.has(n.id)).map((n) => n.id);
  assert.deepEqual(sinAncla, [], `nodos sin dónde aterrizar: ${sinAncla.join(', ')}`);
});

test('mic: el enlace de bajada usa el ancla de la pieza y no el del capítulo', () => {
  assert.ok(!/mic-baja"\s+href=\{`#\$\{p\}-cap-/.test(MIC),
    'el micrófono volvió a apuntar al capítulo en vez de a la pieza');
  assert.ok(MIC.includes('href={`#${f.ancla}`}'), 'el enlace de bajada no usa `f.ancla`');
});

test('mic: los once enlaces viajan por el arreglo del índice, no como ancla nativa', () => {
  // Una navegación de ancla con `scroll-behavior: smooth` EN VUELO no
  // desplaza, y el micrófono es un índice en la segunda pantalla: el sitio
  // donde más se pulsan dos destinos seguidos. Tiene que estar en el selector
  // que intercepta el clic (ver la cabecera de Cv.astro).
  const CV_LAYOUT = fs.readFileSync(path.join(RAIZ, 'src/layouts/Cv.astro'), 'utf8');
  assert.ok(CV_LAYOUT.includes('a.mic-baja[href^="#"]'),
    'los enlaces del micrófono no pasan por el interceptor de `Cv.astro`');
});
