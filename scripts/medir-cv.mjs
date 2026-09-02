// MEDIR EL CV: palabras visibles, alto en pantallas, minutos y en qué punto
// del documento cae cada capítulo. `node scripts/medir-cv.mjs` sobre `dist`.
//
// Existe porque la ola de recorte del 2026-09-01 tenía un objetivo en MINUTOS
// («≤ 7 ojeando») y no había con qué medirlos. Una cifra de tiempo de lectura
// escrita a mano es exactamente lo que este repo no publica.
//
// TRES COSAS QUE SE HACEN AQUÍ Y QUE NO SON OPCIONALES:
//
//  1. SE SIRVE `dist` POR HTTP. Con `file://`, el `<link href="/_astro/…">`
//     es una ruta absoluta que apunta a la raíz del disco, no carga, y sin la
//     hoja los DOS paneles de idioma salen visibles: el documento mide 84 938
//     px en vez de 42 464 y TODAS las medidas mienten al doble. Medido.
//  2. SE RECORRE LA PÁGINA ENTERA, DOS VECES, ANTES DE MEDIR. La entrada por
//     scroll de `.recuerdo img` deja el documento un ~14 % más corto si se
//     lee `scrollHeight` antes de que el medio entre en pantalla (trampa
//     documentada en CLAUDE.md). Y no se navega por anclas: `scroll-behavior:
//     smooth` en vuelo deja muerta a la siguiente navegación.
//  3. SE MIDE EL PANEL, NO EL DOCUMENTO. El % de un capítulo se da contra el
//     alto de SU panel de idioma: es lo que recorre el lector, y es lo que
//     hace comparable el inglés con el español.
//
// LAS DOS VELOCIDADES, Y POR QUÉ SON DOS. `min-lectura` va a 238 palabras por
// minuto, la mediana de lectura silenciosa en pantalla de prosa no técnica
// (Brysbaert 2019, meta-análisis de 190 estudios). `min-ojeada` va a 420, que
// es la velocidad con la que se OJEA un documento buscando de qué va — y es
// la misma con la que está escrito el objetivo de esta ola. Se dan las dos
// porque un comité de admisiones hace las dos cosas: ojea el documento entero
// y lee de verdad dos o tres bloques.
//
// PALABRAS «A LA VISTA» Y PALABRAS «PLEGADAS», Y SE DAN LAS DOS. Lo que vive
// dentro de un `<details>` cerrado sigue en el DOM y con caja —no basta con
// mirar `display`, hay que preguntar por el `open` del ancestro—, pero un
// lector que ojea no lo abre. Contarlo como si se leyera infla el minutaje;
// no contarlo y callarlo convierte plegar en un truco para que baje una
// cifra. Así que la cuenta que manda es la de A LA VISTA, y al lado va
// siempre cuánto hay detrás de un clic. El `<summary>` cuenta como visible,
// porque se lee siempre.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve('dist');
if (!fs.existsSync(raiz)) {
  console.error('[medir-cv] falta dist/. Construye primero: CV_SLUG= npm run build');
  process.exit(1);
}
const TIPOS = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webm': 'video/webm',
  '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml'
};
const server = http.createServer((req, res) => {
  let f = path.join(raiz, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(raiz)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const RUTA = process.argv[2] || '/cv/vista-previa';
const ANCHOS = [[1280, 800], [1440, 900], [1536, 864], [1920, 1080], [390, 844]];
const PPM_LECTURA = 238;
const PPM_OJEADA = 420;

const navegador = await chromium.launch();
const salida = { ruta: RUTA, ppmLectura: PPM_LECTURA, ppmOjeada: PPM_OJEADA, medidas: {} };

for (const [w, h] of ANCHOS) {
  for (const idioma of ['en', 'es']) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(base + RUTA + (idioma === 'es' ? '#es' : ''), { waitUntil: 'load' });
    await page.waitForTimeout(400);

    for (let pasada = 0; pasada < 2; pasada++) {
      await page.evaluate(async (vh) => {
        const paso = Math.round(vh * 0.8);
        for (let y = 0; y < document.documentElement.scrollHeight + vh; y += paso) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 25));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 120));
      }, h);
    }
    await page.waitForTimeout(300);

    const m = await page.evaluate((lang) => {
      const panel = document.querySelector(lang === 'es' ? '.cv-es' : '.cv-en');
      const alto = panel.offsetHeight;
      const arriba = panel.getBoundingClientRect().top + window.scrollY;

      const seVe = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
      };
      // ¿Está este texto dentro de un `<details>` CERRADO? Un `<details>`
      // plegado sigue teniendo su contenido en el DOM y con caja: no vale
      // preguntar por `display`. Se pregunta por el `open` del ancestro.
      // NO se descarta el `<summary>`, que sí se lee siempre.
      const plegado = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const d = n.parentElement;
          if (d && d.tagName === 'DETAILS' && !d.open && n.tagName !== 'SUMMARY') return true;
        }
        return false;
      };
      // Devuelve [palabras a la vista, palabras plegadas].
      const palabras = (nodo) => {
        let vistas = 0, dobladas = 0;
        const it = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
        let x;
        while ((x = it.nextNode())) {
          const p = x.parentElement;
          if (!p) continue;
          if (p.closest('script,style,noscript,template,[hidden],.visually-hidden')) continue;
          if (!seVe(p)) continue;
          const t = x.textContent.trim();
          if (!t) continue;
          const n = t.split(/\s+/).filter(Boolean).length;
          if (plegado(p)) dobladas += n; else vistas += n;
        }
        return [vistas, dobladas];
      };

      const hitos = {};
      const pon = (nombre, el) => {
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - arriba;
        hitos[nombre] = { y: Math.round(y), pct: +((y / alto) * 100).toFixed(1) };
      };
      let n = 0;
      for (const sec of panel.querySelectorAll('header.cap, section.cap')) {
        const t = sec.querySelector('h1, h2');
        pon(`cap${String(++n).padStart(2, '0')} ${t ? t.textContent.trim().replace(/\s+/g, ' ').slice(0, 34) : ''}`, sec);
      }
      pon('· primera carta', panel.querySelector('.cartas .carta'));
      pon('· premio', panel.querySelector('.premio'));
      pon('· certificaciones', panel.querySelector('.certs'));
      pon('· contratiempo', panel.querySelector('.leccion-medida'));

      const [vistas, plegadas] = palabras(panel);
      return { alto, palabras: vistas, plegadas, hitos };
    }, idioma);

    salida.medidas[`${w}x${h} ${idioma}`] = {
      altoPx: m.alto,
      pantallas: +(m.alto / h).toFixed(1),
      palabras: m.palabras,
      plegadas: m.plegadas,
      minLectura: +(m.palabras / PPM_LECTURA).toFixed(1),
      minOjeada: +(m.palabras / PPM_OJEADA).toFixed(1),
      hitos: m.hitos
    };
    await ctx.close();
  }
}

await navegador.close();
server.close();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(salida, null, 2));
} else {
  console.log(`CV ${RUTA} — ${PPM_LECTURA} ppm leyendo · ${PPM_OJEADA} ppm ojeando\n`);
  for (const [k, v] of Object.entries(salida.medidas)) {
    console.log(`${k.padEnd(14)} ${String(v.altoPx).padStart(6)} px = ${String(v.pantallas).padStart(5)} pantallas · ` +
      `${String(v.palabras).padStart(5)} palabras a la vista (+${String(v.plegadas).padStart(4)} plegadas) · ` +
      `${v.minLectura} min leyendo · ${v.minOjeada} min ojeando`);
  }
  const ref = salida.medidas['1440x900 en'];
  console.log('\nDónde cae cada cosa (1440x900, inglés):');
  for (const [k, v] of Object.entries(ref.hitos)) {
    console.log(`  ${String(v.pct).padStart(5)} %  ${k}`);
  }
}
