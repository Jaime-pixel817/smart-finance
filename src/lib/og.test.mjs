// Que las og:image sobrevivan al despliegue.
//
// ESTA PRUEBA EXISTE POR UN DESPLIEGUE ROTO, no por precaución.
//
// `prebuild` corría `node scripts/build-og-pages.mjs` a secas. En esta máquina
// funciona; en Vercel el build se cayó entero con:
//
//     Error: Cannot find module '/vercel/path0/scripts/build-og-pages.mjs'
//     Error: Command "npm run build" exited with 1
//
// porque `.vercelignore` excluye `/scripts` — los generadores son herramientas
// internas y nunca han viajado al despliegue. O sea: un paso del build que
// depende de un archivo que el build de producción no tiene. Y el error llega
// con `npm ci` ya hecho, así que parece de otra cosa.
//
// De ahí las dos reglas que se comprueban aquí:
//
//   1. `prebuild` tiene que TOLERAR que el generador no esté. Sin scripts/ el
//      sitio se construye igual, porque las imágenes y el manifiesto están
//      commiteados — que es además cómo funcionan todos los demás generadores
//      del repo (build:og, build-email-icons, build-geo, build-photos).
//   2. Cada nombre del manifiesto tiene que tener su .jpg commiteado. Si no,
//      `src/lib/og.ts` mandaría a `<meta property="og:image">` a un 404 y la
//      tarjeta saldría en blanco justo al compartir la página.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const leer = (rel) => readFileSync(new URL(rel, RAIZ), 'utf8');

const pkg = JSON.parse(leer('package.json'));
const manifiesto = JSON.parse(leer('src/generated/og-pages.json'));

test('prebuild no tumba el build cuando scripts/ no viaja al despliegue', () => {
  const prebuild = pkg.scripts.prebuild || '';
  assert.ok(prebuild.includes('build-og-pages'), 'prebuild ya no genera las og:image');
  // Tiene que haber una salida: o comprueba que el archivo existe, o traga el
  // fallo. Sin ninguna de las dos, Vercel vuelve a caerse.
  assert.ok(
    /test -f|existsSync|\|\|/.test(prebuild),
    'prebuild debe tolerar que falte scripts/build-og-pages.mjs (.vercelignore excluye /scripts): ' + prebuild
  );
});

test('.vercelignore sigue excluyendo /scripts, que es de donde viene la trampa', () => {
  // Si algún día se deja de excluir, esta prueba lo dice y el comentario de
  // arriba deja de aplicar. No es un fallo: es un aviso de que el contexto
  // cambió.
  const lineas = leer('.vercelignore').split('\n').map((l) => l.trim());
  assert.ok(
    lineas.includes('/scripts'),
    '.vercelignore ya no excluye /scripts: revisa si prebuild puede simplificarse'
  );
});

test('cada og:image del manifiesto existe en public/og/', () => {
  assert.ok(Array.isArray(manifiesto) && manifiesto.length > 0, 'el manifiesto está vacío');
  const faltan = manifiesto.filter((n) => !existsSync(new URL('public/og/' + n + '.jpg', RAIZ)));
  assert.deepEqual(faltan, [], 'og:image en el manifiesto sin archivo commiteado');
});

test('cada página del manifiesto tiene sus dos idiomas', () => {
  const hay = new Set(manifiesto);
  const sinEs = [...hay].filter((n) => !n.endsWith('-es') && !hay.has(n + '-es'));
  assert.deepEqual(sinEs, [], 'estas tarjetas no tienen variante en español');
});
