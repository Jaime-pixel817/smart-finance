#!/usr/bin/env node
// Reflow (WCAG 1.4.10): que el sitio NO haga scroll horizontal cuando alguien
// sube el tamaño de texto del navegador.
//
// Por qué existe este fichero y no una revisión a ojo: el fallo no se ve
// mirando. Con el texto al 200 % el sitio arrastraba la página hasta 334 px de
// lado en 155 de las 400 combinaciones que mide esto, y ninguna captura a
// tamaño normal lo enseña. Es de la familia del «BMV abierta» y de la foto con
// `immutable`: verdad el día que se escribe, mentira después, y en silencio.
//
// Lo que se mide es `documentElement.scrollWidth` contra `clientWidth`, que es
// la definición operativa de «hay scroll horizontal», en cada cruce de ancho ×
// tamaño de texto. Y se mide en DOS varas, porque una sola engaña:
//   - las CAJAS (getBoundingClientRect), y
//   - el TEXTO PINTADO (Range.getClientRects), que es lo que descubrió que el
//     <h1> cabía en su caja y las letras se salían igual.
// Un elemento que cuelga de un ancestro con `overflow-x` recortado no cuenta:
// ese ya tiene su propio scroll y no arrastra la página.
//
// El tamaño de texto se sube con `Page.setFontSizes` de CDP, que es la misma
// palanca que la opción «Tamaño de fuente» de Chrome —no es zoom—: sube la
// letra y deja los `px` donde están, que es justo lo que rompe estos diseños.
//
// Uso:  npm run build && node scripts/check-reflow.mjs
// Sale 1 si alguna combinación desborda, y dice cuál y quién la empuja.
//
// Playwright NO es dependencia del repo (son ~80 MB de navegador y esto no
// corre ni en el build ni en CI). Si falta, lo dice y no finge que midió.

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = req('playwright')); } catch {
  console.error('[reflow] falta playwright, asi que NO he medido nada.');
  console.error('[reflow] instalalo suelto (no va en package.json a proposito):');
  console.error('[reflow]   npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=').pop();
const DIST = path.resolve(arg('dist', 'dist'));
const ANCHOS = arg('anchos', '320,360,375,390,414').split(',').map(Number);
const ESCALAS = arg('escalas', '100,175,200,225').split(',').map(Number);

// Lista escrita a mano, como las URL de lighthouserc.json: se miden las rutas
// que representan cada PLANTILLA del sitio, no las 101 páginas.
const RUTAS = [
  '/', '/market', '/market/spy', '/research', '/news', '/lessons/etfs',
  '/challenge', '/about', '/portfolio', '/actinver', '/tools', '/newsletter',
  '/es/', '/es/mercado', '/es/mercado/spy', '/es/research', '/es/noticias',
  '/es/lecciones/etfs', '/es/reto', '/es/acerca', '/es/portafolio', '/es/actinver',
];

if (!fs.existsSync(DIST)) {
  console.error(`[reflow] no encuentro ${DIST}. Corre antes: npm run build`);
  process.exit(1);
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.xml': 'application/xml' };

const servidor = http.createServer((r, res) => {
  const p = decodeURIComponent(new URL(r.url, 'http://x').pathname);
  let f = path.join(DIST, p);
  // OJO con el orden: `/market` es TAMBIÉN una carpeta (existe /market/spy).
  // Mirando primero si es directorio se servía dist/market/index.html, que no
  // existe, y el 404 resultante se medía como página buena —ancho cero, cero
  // desbordamiento, verde—. Diez rutas se «midieron» así y taparon dos causas.
  const cand = [];
  if (fs.existsSync(f) && fs.statSync(f).isFile()) cand.push(f);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) cand.push(path.join(f, 'index.html'));
  cand.push(f.replace(/\/$/, '') + '.html');
  f = cand.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!f) { res.writeHead(404).end('404'); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const SONDA = () => {
  const de = document.documentElement, cw = de.clientWidth, TOL = 0.5;
  const recortado = (el) => {
    for (let p = el.parentElement; p && p !== de; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };
  const marca = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).map(c => '.' + c).join('');
  const culpables = [];
  for (const el of de.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if ((r.width || r.height) && r.right > cw + TOL && !recortado(el))
      culpables.push({ sel: marca(el), exceso: +(r.right - cw).toFixed(1), via: 'caja' });
  }
  const it = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    const padre = n.parentElement;
    if (!n.nodeValue?.trim() || !padre || recortado(padre)) continue;
    const cs = getComputedStyle(padre);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const ra = document.createRange(); ra.selectNodeContents(n);
    for (const r of ra.getClientRects())
      if (r.width && r.right > cw + TOL)
        culpables.push({ sel: marca(padre), exceso: +(r.right - cw).toFixed(1), via: 'texto' });
  }
  const m = new Map();
  for (const c of culpables) if (!m.has(c.sel) || m.get(c.sel).exceso < c.exceso) m.set(c.sel, c);
  return { titulo: document.title, exceso: de.scrollWidth - cw,
    culpables: [...m.values()].sort((a, b) => b.exceso - a.exceso).slice(0, 5) };
};

await new Promise(r => servidor.listen(0, r));
const base = `http://localhost:${servidor.address().port}`;
const nav = await chromium.launch();
const malos = [];
let n = 0;

for (const ruta of RUTAS) {
  for (const ancho of ANCHOS) {
    const ctx = await nav.newContext({ viewport: { width: ancho, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    for (const esc of ESCALAS) {
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * esc / 100), fixed: Math.round(13 * esc / 100) } });
      await page.goto(base + ruta, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      const r = await page.evaluate(SONDA);
      n++;
      // Una página que llega sin <title> es un 404 servido, no un aprobado.
      if (!r.titulo) {
        console.error(`\n[reflow] ${ruta} llego sin <title>: es un 404, no una pagina. Arregla la ruta antes de fiarte de nada.`);
        await nav.close(); servidor.close(); process.exit(1);
      }
      if (r.exceso > 0) malos.push({ ruta, ancho, esc, ...r });
      process.stderr.write(r.exceso > 0 ? 'X' : '.');
    }
    await ctx.close();
  }
}
await nav.close(); servidor.close();
process.stderr.write('\n');

if (!malos.length) {
  console.log(`[reflow] ${n} combinaciones (${RUTAS.length} rutas x ${ANCHOS.length} anchos x ${ESCALAS.length} tamanos de texto): ninguna hace scroll horizontal.`);
  process.exit(0);
}
console.error(`[reflow] ${malos.length} de ${n} combinaciones hacen scroll horizontal. Peor: +${Math.max(...malos.map(m => m.exceso))} px.\n`);
for (const m of malos) {
  console.error(`  ${m.ruta.padEnd(22)} ${String(m.ancho).padStart(3)}px  texto ${String(m.esc).padStart(3)}%  +${m.exceso}px`);
  for (const c of m.culpables) console.error(`      +${String(c.exceso).padStart(6)}  ${c.sel}  (${c.via})`);
}
console.error('\n[reflow] Las valvulas van en `em`, no en `px`: en `em` la consulta mide el TEXTO.');
console.error('[reflow] El umbral tiene que quedarse por debajo de 20em, que es lo que mide un');
console.error('[reflow] telefono de 320 px al 100 %, o disparara a tamano normal. Ver Mesa.astro.');
process.exit(1);
