#!/usr/bin/env node
/*
 * Guardia de SEO sobre el HTML YA CONSTRUIDO. Corre en el CI después del build
 * y falla de verdad (código 1); no avisa, no sugiere.
 *
 * POR QUÉ SOBRE dist/ Y NO SOBRE src/
 * -----------------------------------
 * Lo que ve Google es el HTML que sale del build, con las páginas de public/
 * mezcladas dentro. Un canonical que se pierde en un layout, una descripción
 * repetida entre dos rutas o una página nueva que nadie registró en
 * src/i18n/routes.ts solo se notan aquí. Es el mismo motivo por el que el
 * lychee del CI corre contra dist/ y no contra el repo.
 *
 * LAS SEIS COSAS QUE COMPRUEBA, Y EL BUG QUE CADA UNA HABRÍA ATRAPADO
 * ------------------------------------------------------------------
 * 1. Cabeza completa: title y <html lang> en toda página; description,
 *    canonical y og:image en las indexables (en una con noindex no pintan
 *    nada, y /review.html —la consola de revisión— es justo eso).
 * 2. Sin duplicados entre páginas indexables. Dos páginas con el mismo título
 *    compiten entre ellas y Google elige una.
 * 3. hreflang en/es/x-default en toda página indexable.
 * 4. El sitemap y el HTML dicen lo mismo: ni una página indexable fuera del
 *    sitemap, ni una URL del sitemap sin archivo (un 404 anunciado).
 * 5. JSON-LD que parsea y sin referencias @id colgando. Cuarenta páginas
 *    apuntaban a '#organization' y ese nodo no existía en ningún documento:
 *    para Google eso es un publisher sin nombre ni logo. Esta regla es la que
 *    impide que vuelva a pasar en silencio.
 * 6. robots.txt no tapa nada del sitemap. `Disallow: /newsletter/` bloqueaba
 *    el archivo del boletín, que está en el sitemap: un Disallow gana, así que
 *    Google no habría rastreado ni un número — y ni siquiera habría podido
 *    leer el noindex de las dos pantallas que sí quedaban tapadas.
 *
 * Y de paso el tope duro del plan de Vercel: api/*.js sigue en 12 (hay además
 * una prueba de node --test; aquí se repite porque este script es el que corre
 * justo antes de desplegar y el mensaje es más claro que un test que falla).
 *
 *   node scripts/check-seo.mjs            (sobre dist/)
 *   node scripts/check-seo.mjs otra-carpeta
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.argv[2] || 'dist';
const SITE = 'https://smartfinance.lat';
const FUNCIONES_VERCEL = 12;

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const avisa = (m) => avisos.push(m);

// ------------------------------------------------------------------ 1. leer
function recorrer(dir, salida = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) recorrer(p, salida);
    else if (e.endsWith('.html')) salida.push(p);
  }
  return salida;
}

if (!existsSync(DIST)) {
  console.error('check-seo: no existe ' + DIST + '. Corre `npm run build` antes.');
  process.exit(1);
}

const uno = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

const paginas = recorrer(DIST).sort().map((f) => {
  const html = readFileSync(f, 'utf8');
  const rel = relative(DIST, f).replace(/\.html$/, '');
  return {
    archivo: relative(DIST, f),
    url: rel === 'index' ? '/' : '/' + rel,
    title: uno(html, /<title>([\s\S]*?)<\/title>/),
    desc: uno(html, /<meta name="description" content="([^"]*)"/),
    canonical: uno(html, /<link rel="canonical" href="([^"]*)"/),
    ogImage: uno(html, /<meta property="og:image" content="([^"]*)"/),
    lang: uno(html, /<html lang="([^"]*)"/),
    robots: uno(html, /<meta name="robots" content="([^"]*)"/) || '',
    hreflang: [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]),
    ld: [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  };
});

const indexable = (p) => !/noindex/i.test(p.robots);
const indexables = paginas.filter(indexable);

if (!paginas.length) err('no hay ni un .html en ' + DIST);

// --------------------------------------------------- 2. cabeza completa
for (const p of paginas) {
  const falta = [
    !p.title && 'title',
    indexable(p) && !p.desc && 'meta description',
    !p.lang && '<html lang>',
    indexable(p) && !p.canonical && 'canonical',
    indexable(p) && !p.ogImage && 'og:image'
  ].filter(Boolean);
  if (falta.length) err(p.url + ' → le falta ' + falta.join(', '));
  if (p.canonical && !p.canonical.startsWith(SITE)) err(p.url + ' → canonical fuera del sitio: ' + p.canonical);
}

// ------------------------------------------------------- 3. sin duplicados
function duplicados(clave, nombre) {
  const mapa = new Map();
  for (const p of indexables) {
    const v = p[clave];
    if (!v) continue;
    mapa.set(v, [...(mapa.get(v) || []), p.url]);
  }
  for (const [valor, urls] of mapa) {
    if (urls.length > 1) err(nombre + ' repetido en ' + urls.join(' y ') + ': ' + JSON.stringify(valor.slice(0, 70)));
  }
}
duplicados('title', 'title');
duplicados('desc', 'meta description');

// ------------------------------------------------------------ 4. hreflang
for (const p of indexables) {
  const h = new Set(p.hreflang);
  const falta = ['en', 'es', 'x-default'].filter((x) => !h.has(x));
  if (falta.length) err(p.url + ' → sin hreflang ' + falta.join(', '));
}

// ------------------------------------------------------------- 5. sitemap
const sitemap = join(DIST, 'sitemap.xml');
if (!existsSync(sitemap)) err('no hay sitemap.xml en ' + DIST);
else {
  const xml = readFileSync(sitemap, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const rutas = new Set(locs.map((u) => u.replace(SITE, '') || '/'));
  const enDisco = new Set(paginas.map((p) => p.url));

  for (const p of indexables) {
    if (!rutas.has(p.url)) err(p.url + ' → indexable pero no está en el sitemap (regístrala en src/i18n/routes.ts o ponle noindex)');
  }
  for (const u of rutas) {
    if (!enDisco.has(u)) err('sitemap → ' + u + ' no existe como archivo: es un 404 anunciado');
  }
  for (const p of paginas) {
    if (!indexable(p) && rutas.has(p.url)) err(p.url + ' → lleva noindex Y está en el sitemap: decide una');
  }
  const dup = locs.filter((u, i) => locs.indexOf(u) !== i);
  if (dup.length) err('sitemap → URLs repetidas: ' + [...new Set(dup)].join(', '));
}

// -------------------------------------------------- 6. JSON-LD sin cabos sueltos
for (const p of paginas) {
  for (const crudo of p.ld) {
    let doc;
    try { doc = JSON.parse(crudo); } catch (e) { err(p.url + ' → JSON-LD que no parsea: ' + e.message); continue; }
    const nodos = Array.isArray(doc['@graph']) ? doc['@graph'] : [doc];
    const definidos = new Set();
    const referidos = new Set();
    // Un @id acompañado de @type o name DEFINE el nodo; un objeto que solo
    // lleva @id lo REFERENCIA. Es la distinción que separa un publisher de
    // verdad de una referencia a la nada.
    const mirar = (v) => {
      if (Array.isArray(v)) return v.forEach(mirar);
      if (!v || typeof v !== 'object') return;
      if (typeof v['@id'] === 'string') {
        const soloId = Object.keys(v).filter((k) => k !== '@id').length === 0;
        (soloId ? referidos : definidos).add(v['@id']);
      }
      for (const x of Object.values(v)) mirar(x);
    };
    nodos.forEach(mirar);
    for (const id of referidos) {
      if (!definidos.has(id)) err(p.url + ' → JSON-LD con @id colgando: ' + id + ' se referencia pero no se define en la página');
    }
  }
}

// ---------------------------------------------- 7. robots.txt vs sitemap
const robots = join(DIST, 'robots.txt');
if (!existsSync(robots)) err('no hay robots.txt en ' + DIST);
else {
  const txt = readFileSync(robots, 'utf8');
  if (!txt.includes('Sitemap:')) err('robots.txt sin línea Sitemap:');
  const reglas = [...txt.matchAll(/^\s*Disallow:\s*(\S+)\s*$/gim)].map((m) => m[1]);
  const xml = existsSync(sitemap) ? readFileSync(sitemap, 'utf8') : '';
  const rutas = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '') || '/');
  for (const regla of reglas) {
    const tapadas = rutas.filter((u) => u.startsWith(regla));
    if (tapadas.length) {
      err('robots.txt → "Disallow: ' + regla + '" tapa ' + tapadas.length + ' URL del sitemap (' +
        tapadas.slice(0, 3).join(', ') + (tapadas.length > 3 ? '…' : '') + '). Un Disallow gana sobre un sitemap');
    }
  }
}

// ------------------------------------- 8. el tope duro del plan de Vercel
if (existsSync('api')) {
  const funciones = readdirSync('api').filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  if (funciones.length !== FUNCIONES_VERCEL) {
    err('api/ tiene ' + funciones.length + ' funciones y el plan admite ' + FUNCIONES_VERCEL +
      '. Con 13 el despliegue entero se cae con exceeded_serverless_functions_per_deployment, ' +
      'con el build ya terminado. Lo que necesite servidor va como acción dentro de un endpoint que ya exista.');
  }
}

// ----------------------------------------------------------- 9. avisos
// Longitudes: no tumban el CI (Google no las castiga, solo las recorta) pero
// se listan para que quien abra el PR decida.
for (const p of indexables) {
  if (p.title && p.title.length > 70) avisa('title de ' + p.title.length + ' caracteres, Google recorta ~60: ' + p.url);
  if (p.desc && p.desc.length > 165) avisa('description de ' + p.desc.length + ' caracteres, Google recorta ~160: ' + p.url);
}

// ------------------------------------------------------------- resultado
console.log('check-seo: ' + paginas.length + ' páginas (' + indexables.length + ' indexables, ' +
  (paginas.length - indexables.length) + ' con noindex)');
if (avisos.length) {
  console.log('\navisos (' + avisos.length + ', no tumban el CI):');
  for (const a of avisos.slice(0, 25)) console.log('  · ' + a);
  if (avisos.length > 25) console.log('  · … y ' + (avisos.length - 25) + ' más');
}
if (errores.length) {
  console.error('\nERRORES (' + errores.length + '):');
  for (const e of errores) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\nsin errores.');
