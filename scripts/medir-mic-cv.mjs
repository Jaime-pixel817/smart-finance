// scripts/medir-mic-cv.mjs — LAS MEDIDAS DEL MÓDULO DEL MICRÓFONO.
//
// POR QUÉ EXISTE. El defecto que este módulo vino a arreglar era un NÚMERO:
// «401 px vacíos bajo el micrófono» (AUDITORIA-2026-09-04.md, y la queja de
// Jaime: «en el micrófono abajo hay un espacio gigante en blanco»). Un defecto
// que se declara en píxeles se cierra en píxeles, no mirando una captura — en
// una captura 401 px de blanco y 0 px de blanco se parecen bastante cuando la
// imagen viene escalada.
//
// LO QUE MIDE, y lo único que importa de verdad es la penúltima columna:
//   · `hueco` — la distancia entre el fondo del LIENZO y el fondo de la
//     COLUMNA DE TARJETAS. Es el número que valía 401. Tiene que ser 0, y lo
//     es POR CONSTRUCCIÓN: las dos son cajas de 896 px escritos, no contenido
//     midiéndose solo. Si algún día vuelve a no ser 0, alguien cambió una de
//     las dos alturas por `auto` y hay que devolverla.
//   · las cajas: módulo 1280 · fila 1280×956 · lienzo 782×896 · pista 482×896
//     con 3 024 px de contenido · 10 tarjetas de 482×288 · 4 países de 308×385.
//   · el desborde horizontal y el alto del documento.
//   · el lienzo: tamaño CSS, tamaño de búfer, número de partículas y los dos
//     tiempos que ya publica el motor (`tc` construir la geometría, `t1` el
//     primer fotograma).
//
// SE RECORRE LA PÁGINA ENTERA ANTES DE MEDIR y se espera al motor: el
// micrófono no arranca hasta entrar en pantalla, y medir antes devuelve la
// caja reservada sin nada dentro. Y se anula `scroll-behavior`, que es la
// trampa que ya está escrita en CLAUDE.md.
//
// CÓMO SE CORRE (necesita Playwright suelto con los dos motores, como los
// demás guardianes del CV; no entra en CI):
//   CV_SLUG= npm run build && node scripts/medir-mic-cv.mjs dist chromium,webkit 1440,1920
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(process.argv[2] || 'dist');
const TIPOS = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.webm':'video/webm','.mp4':'video/mp4' };
const server = http.createServer((req, res) => {
  let f = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port;

const pw = await import('playwright');
const MOTORES = (process.argv[3] || 'chromium,webkit').split(',');
const ANCHOS = (process.argv[4] || '1440,1920').split(',').map(Number);
const ALTOS = { 1440: 900, 1920: 1080 };
const salida = [];

for (const nombre of MOTORES) {
  const br = await pw[nombre].launch();
  for (const w of ANCHOS) {
    const ctx = await br.newContext({ viewport: { width: w, height: ALTOS[w] }, deviceScaleFactor: 1 });
    const pag = await ctx.newPage();
    await pag.goto(base + '/cv/vista-previa.html', { waitUntil: 'load' });
    await pag.addStyleTag({ content: '*{scroll-behavior:auto !important}' });
    // Recorrer todo para que entren las fotos y el micrófono arranque.
    await pag.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 12));
      }
      window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
    });
    // Poner el micrófono a la vista y dejar que el motor pinte.
    await pag.evaluate(() => {
      const m = document.querySelector('.cv-pane:not([hidden]) .mic') || document.querySelector('.mic');
      m?.scrollIntoView({ block: 'start' });
    });
    await pag.waitForTimeout(1800);

    const m = await pag.evaluate(() => {
      const pane = [...document.querySelectorAll('.mic')].find((e) => e.getBoundingClientRect().width > 0);
      if (!pane) return { falta: true };
      const Y = window.scrollY;
      const caja = (sel, raiz = pane) => {
        const el = raiz.querySelector(sel); if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), x: +(r.left).toFixed(2), y: +(r.top + Y).toFixed(2) };
      };
      const stage = pane.querySelector('.mic-stage').getBoundingClientRect();
      const pista = pane.querySelector('.mic-pista').getBoundingClientRect();
      const cards = [...pane.querySelectorAll('.mic-t')].map((e) => {
        const r = e.getBoundingClientRect(); return [+r.width.toFixed(1), +r.height.toFixed(1)];
      });
      const paises = [...pane.querySelectorAll('.mic-pais')].map((e) => {
        const r = e.getBoundingClientRect(); return [+r.width.toFixed(1), +r.height.toFixed(1)];
      });
      // EL HUECO: distancia entre el fondo del lienzo y el fondo de la columna
      // de tarjetas. Es el número que valía 401 px.
      const hueco = +(Math.abs(stage.bottom - pista.bottom)).toFixed(2);
      const cv = pane.querySelector('canvas');
      return {
        modulo: caja('.mic', document), fila: caja('.mic-fila'),
        stage: { w: +stage.width.toFixed(2), h: +stage.height.toFixed(2) },
        pista: { w: +pista.width.toFixed(2), h: +pista.height.toFixed(2), contenido: pane.querySelector('.mic-pista').scrollHeight },
        nav: caja('.mic-nav'), paisesFila: caja('.mic-paises'),
        cards, paises, hueco,
        lienzo: cv ? { cssW: cv.clientWidth, cssH: cv.clientHeight, bufW: cv.width, bufH: cv.height, n: cv.dataset.n, tc: cv.dataset.tc, t1: cv.dataset.t1 } : null,
        nodos: pane.querySelectorAll('.mic-nodos .nodo').length,
        desborde: document.documentElement.scrollWidth - window.innerWidth,
        alto: document.documentElement.scrollHeight
      };
    });
    salida.push({ motor: nombre, ancho: w, ...m });
    await ctx.close();
  }
  await br.close();
}
server.close();
console.log(JSON.stringify(salida, null, 1));
