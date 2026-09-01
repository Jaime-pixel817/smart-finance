// Las cartas de recomendación: que el ARCHIVO exista y que su PESO ESCRITO
// sea el peso de verdad.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTA PRUEBA EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Desde el 2026-08-31 el CV publica los dos PDF firmados enteros (Jaime:
// «sube en cada carta de recomendación el archivo de la carta»), y la ficha
// de cada carta enseña su peso al lado del enlace: «PDF · 366 KB». Ese
// número es la única cifra del capítulo que NO se puede contar en el momento
// de pintar la página: el componente no puede leer el disco —el repo no
// declara @types/node y `astro check` se cae en cuanto un componente ve
// `node:fs`, que es la misma razón por la que las og:image van por un
// manifiesto—, así que está escrito a mano en `src/i18n/cv.ts`.
//
// Una cifra a mano en un CV que le presume verificabilidad a un comité de
// admisiones se desincroniza en silencio: alguien sustituye una carta por su
// versión firmada de verdad, el archivo pasa de 366 a 402 KB, la página sigue
// diciendo 366 y no se cae nada. Esto lo convierte en un fallo ruidoso.
//
// LO QUE COMPRUEBA, y por qué cada cosa:
//  1. Que el archivo que nombra `pdf` EXISTE en public/assets/cv/. Un enlace
//     roto en un CV privado no lo descubre nadie hasta que un referee lo
//     pulsa.
//  2. Que `pdfKb` es Math.round(bytes / 1024) del archivo real.
//  3. Que los DOS paneles (inglés y español) nombran el mismo archivo y el
//     mismo peso para la misma carta. La regla del CV es paridad exacta
//     EN/ES, y aquí un descuadre publicaría dos pesos distintos del mismo
//     documento.
//  4. Que el archivo servido es BYTE A BYTE el que Jaime entregó, si su
//     carpeta original está a mano. No lo está en CI (vive fuera del repo, en
//     cv-material/), así que esa comprobación se salta con un aviso en vez de
//     fallar: lo que no se puede comprobar no se da por bueno ni se da por
//     malo, se dice.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SERVIDO = join(raiz, 'public', 'assets', 'cv');
// La carpeta de trabajo de Jaime, fuera del repo. Puede no estar.
const ORIGINAL = join(raiz, '..', 'cv-material', 'cartas');

/** Saca las fichas de `cartas.entregadas` de los dos paneles de cv.ts. */
function cartasDe(panel) {
  const fuente = readFileSync(join(raiz, 'src', 'i18n', 'cv.ts'), 'utf8');
  // Los dos paneles van en orden: el inglés primero, el español después.
  const trozos = fuente.split(/^  cartas: \{$/m);
  assert.equal(trozos.length, 3, 'cv.ts tiene que traer exactamente dos bloques `cartas:`');
  const cuerpo = trozos[panel === 'en' ? 1 : 2];
  const fichas = [];
  const re = /nombre: '([^']+)',[\s\S]*?pdf: '([^']+)',\s*\n\s*pdfKb: (\d+),/g;
  let m;
  while ((m = re.exec(cuerpo)) !== null) fichas.push({ nombre: m[1], pdf: m[2], kb: Number(m[3]) });
  return fichas;
}

test('las dos cartas nombran un PDF que existe y su peso escrito es el real', () => {
  for (const panel of ['en', 'es']) {
    const fichas = cartasDe(panel);
    assert.equal(fichas.length, 2, `el panel ${panel} tiene que traer dos cartas con PDF`);
    for (const f of fichas) {
      const ruta = join(SERVIDO, f.pdf);
      assert.ok(existsSync(ruta), `falta ${f.pdf} en public/assets/cv/ (lo nombra la carta de ${f.nombre}, panel ${panel})`);
      const kb = Math.round(statSync(ruta).size / 1024);
      assert.equal(f.kb, kb,
        `la carta de ${f.nombre} (panel ${panel}) dice ${f.kb} KB y el archivo mide ${kb} KB`);
    }
  }
});

test('los dos paneles publican el mismo archivo y el mismo peso', () => {
  const en = cartasDe('en');
  const es = cartasDe('es');
  assert.equal(en.length, es.length);
  for (let i = 0; i < en.length; i++) {
    assert.equal(en[i].pdf, es[i].pdf, 'los dos paneles tienen que enlazar el mismo archivo');
    assert.equal(en[i].kb, es[i].kb, 'los dos paneles tienen que decir el mismo peso');
  }
});

test('el PDF servido es byte a byte el que entregó Jaime (si su carpeta está)', () => {
  if (!existsSync(ORIGINAL)) {
    console.log('  (cv-material/cartas/ no está aquí — no se compara el hash; en CI es lo normal)');
    return;
  }
  for (const f of cartasDe('en')) {
    const a = join(ORIGINAL, f.pdf);
    if (!existsSync(a)) {
      console.log('  (no está el original de ' + f.pdf + ' — no se compara)');
      continue;
    }
    const h = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
    assert.equal(h(join(SERVIDO, f.pdf)), h(a),
      `${f.pdf} NO es el archivo original. Estas cartas se publican SIN ALTERAR: recortarle un renglón a un documento firmado lo convierte en otro documento.`);
  }
});
