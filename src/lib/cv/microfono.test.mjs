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
