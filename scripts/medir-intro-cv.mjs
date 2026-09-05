// MEDIR LA INTRO DEL CV EN LOS DOS MOTORES: la tabla que Jaime pidió ver.
//
// POR QUÉ EXISTE. El 2026-09-04 Jaime dijo «en Safari no funciona el header la
// transición». La auditoría lo midió: `CSS.supports('animation-timeline:
// view())` es `false` en WebKit y toda la secuencia de la portada vivía dentro
// de ese `@supports` sin respaldo. Este guion es el recibo del arreglo: la
// misma tabla, en los dos motores, y la comparación entre ellos.
//
// LAS TRAMPAS QUE ESTE GUION EVITA, TODAS DOCUMENTADAS EN CLAUDE.md:
//
//  1. SE SIRVE `dist` POR HTTP. Con `file://` el `<link href="/_astro/…">`
//     apunta a la raíz del disco, la hoja no carga y todo lo medido miente.
//  2. SE MUEVE LA RUEDA DE VERDAD (`mouse.wheel`), no `window.scrollTo`. Es
//     lo que hace el lector, y es lo que le pasa al respaldo por JS: un
//     `scrollTo` con `scroll-behavior: smooth` deja el scroll en vuelo y se
//     mide un fotograma intermedio. Además se anula `scroll-behavior` y se
//     espera a que `scrollY` deje de cambiar antes de leer nada.
//  3. SE MIDEN PÍXELES PINTADOS ADEMÁS DEL ESTILO CALCULADO. Bajo animaciones
//     conducidas por scroll, `getComputedStyle` devuelve valores rancios en el
//     hilo principal (Chromium llega a dar `opacity: 0` en cosas que se ven).
//     La caja de la tarjeta se saca de la captura: se busca el rectángulo
//     oscuro más grande de la pantalla contando píxeles.
//  4. SE ESPERA A LA APERTURA. `.portada-foto` tiene una animación de entrada
//     de 2 400 ms; medir antes es medir otro fotograma.
//
// Uso: node scripts/medir-intro-cv.mjs [--capturas=/ruta] [--ruta=/cv/vista-previa]
import { chromium, webkit } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const raiz = path.resolve('dist');
if (!fs.existsSync(raiz)) {
  console.error('[medir-intro] falta dist/. Construye primero: CV_SLUG= npm run build');
  process.exit(1);
}
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const RUTA = arg('ruta', '/cv/vista-previa');
const CAPTURAS = arg('capturas', '');
if (CAPTURAS) fs.mkdirSync(CAPTURAS, { recursive: true });

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

const VENTANAS = [[1440, 900], [1920, 1080]];
// Las cuatro de la auditoría. `--paradas=0,60,120,…` barre el recorrido fino,
// que es donde se ve si los dos motores van por el MISMO fotograma: a 300 px
// el efecto ya está al 98 % en 1440 y comparar solo ahí no prueba gran cosa.
const PARADAS = (arg('paradas', '0,300,600,1200')).split(',').map(Number);
const MOTORES = [['chromium', chromium], ['webkit', webkit]];

// ── RED DE SEGURIDAD: NI UN NAVEGADOR SUELTO ──────────────────────────────
// Un intento anterior de este paso murió por inactividad. La causa clásica es
// un `evaluate` que lanza a mitad del barrido: el `await navegador.close()` de
// más abajo ya no se alcanza, el proceso se queda con Chromium/WebKit y el
// servidor vivos, y no termina nunca. Esto los apunta según se abren y los
// cierra pase lo que pase.
const abiertos = new Set();
async function cerrarTodo() {
  for (const b of abiertos) { try { await b.close(); } catch {} }
  abiertos.clear();
  try { server.close(); } catch {}
}
process.on('unhandledRejection', async (e) => { console.error(e); await cerrarTodo(); process.exit(1); });
process.on('uncaughtException', async (e) => { console.error(e); await cerrarTodo(); process.exit(1); });

const filas = [];
for (const [nombre, motor] of MOTORES) {
  const navegador = await motor.launch();
  abiertos.add(navegador);
  for (const [w, h] of VENTANAS) {
    const ctx = await navegador.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' }).catch(() => {});
    await page.goto(base + RUTA, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    await page.waitForTimeout(2600); // la apertura de la portada dura 2 400 ms
    const soporte = await page.evaluate(() => ({
      scroll: CSS.supports('animation-timeline', 'scroll()'),
      view: CSS.supports('animation-timeline', 'view()'),
      via: document.documentElement.dataset.intro || '(sin marca)'
    }));
    let y = 0;
    for (const parada of PARADAS) {
      if (parada > y) { await page.mouse.wheel(0, parada - y); y = parada; }
      // esperar a que el scroll se asiente de verdad
      let prev = -1, ahora = -2, vueltas = 0;
      while (prev !== ahora && vueltas++ < 40) {
        prev = ahora;
        await page.waitForTimeout(60);
        ahora = await page.evaluate(() => Math.round(window.scrollY));
      }
      const m = await page.evaluate(() => {
        const cs = (el, p) => (el ? getComputedStyle(el)[p] : '—');
        const r = (el) => {
          if (!el) return '—';
          const b = el.getBoundingClientRect();
          return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)}`;
        };
        const q = (s) => document.querySelector(s);
        const barra = q('.portada-barra');
        const tapa = q('.portada-uno');
        const marco = q('.portada-marco');
        const zoom = q('.portada-zoom');
        const escena = q('.intro-escena');
        const pista = q('.intro-pista');
        const tarjeta = q('.portada-tarjeta');
        const cierre = q('.portada-papel-cierre');
        const portada = q('.cap-portada');
        const mic = q('.mic');
        // La ventana REAL de la foto: el rectángulo que deja el clip-path,
        // calculado sobre la caja del marco y su `clip-path` pintado.
        const cp = cs(marco, 'clipPath');
        return {
          scrollY: Math.round(window.scrollY),
          barra: `${Math.round(barra?.getBoundingClientRect().height || 0)} / ${cs(barra, 'opacity')} / ${cs(barra, 'visibility')}`,
          tapaOp: `${cs(tapa, 'opacity')} / ${cs(tapa, 'visibility')}`,
          clip: cp,
          zoom: cs(zoom, 'transform'),
          escena: `${r(escena)} op ${cs(escena, 'opacity')} (${cs(escena, 'display')})`,
          pista: Math.round(pista?.getBoundingClientRect().height || 0),
          tarjetaY: tarjeta ? Math.round(tarjeta.getBoundingClientRect().top + window.scrollY) : null,
          tarjetaH: tarjeta ? Math.round(tarjeta.getBoundingClientRect().height) : null,
          cierreY: cierre ? Math.round(cierre.getBoundingClientRect().top + window.scrollY) : null,
          cierreH: cierre ? Math.round(cierre.getBoundingClientRect().height) : null,
          portadaH: portada ? Math.round(portada.getBoundingClientRect().height) : null,
          micY: mic ? Math.round(mic.getBoundingClientRect().top + window.scrollY) : null,
          p: getComputedStyle(document.documentElement).getPropertyValue('--intro-p').trim() || '—'
        };
      });
      // LA CAJA OSCURA PINTADA: se mide sobre la captura, no sobre el CSS.
      const buf = await page.screenshot({ type: 'png' });
      const caja = await page.evaluate(async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
        for (let py = 0; py < c.height; py += 2) {
          for (let px = 0; px < c.width; px += 2) {
            const i = (py * c.width + px) * 4;
            const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            if (l < 70) { n++; if (px < x0) x0 = px; if (py < y0) y0 = py; if (px > x1) x1 = px; if (py > y1) y1 = py; }
          }
        }
        return n ? `${x0},${y0} ${x1 - x0 + 1}×${y1 - y0 + 1}` : '—';
      }, `data:image/png;base64,${buf.toString('base64')}`);
      if (CAPTURAS) fs.writeFileSync(path.join(CAPTURAS, `intro-${nombre}-${w}-y${parada}.png`), buf);
      filas.push({ motor: nombre, w, h, parada, soporte, caja, ...m });
    }
    await ctx.close();
  }
  await navegador.close();
  abiertos.delete(navegador);
}

// ── LOS DOS CAMINOS QUE NO SON «UN NAVEGADOR NORMAL» ───────────────────────
// «Menos movimiento» y «sin JavaScript» tienen la MISMA exigencia: la tapa se
// ve entera y legible, y la pista NO reserva ni un píxel que nadie vaya a
// conducir. Se mide la pista contra la ventana: `alto − ventana` es el
// recorrido del efecto, y ahí tiene que ser 0.
const caminos = [];
for (const [nombre, motor] of MOTORES) {
  const navegador = await motor.launch();
  abiertos.add(navegador);
  for (const [modo, opciones] of [
    ['normal', {}],
    ['menos movimiento', { reducedMotion: 'reduce' }],
    ['sin JavaScript', { javaScriptEnabled: false }]
  ]) {
    const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opciones });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(base + RUTA, { waitUntil: 'load' });
    await page.waitForTimeout(modo === 'sin JavaScript' ? 400 : 2600);
    caminos.push({
      motor: nombre, modo,
      ...await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const alto = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
        const pista = alto(q('.intro-pista'));
        const h1 = q('.portada-h1');
        const cs = h1 ? getComputedStyle(h1) : null;
        return {
          via: document.documentElement.dataset.intro || '(sin marca)',
          pista,
          sobra: pista === null ? null : Math.max(0, pista - window.innerHeight),
          tapa: `${getComputedStyle(q('.portada-uno')).opacity} / ${getComputedStyle(q('.portada-uno')).visibility}`,
          nombre: cs ? `op ${cs.opacity}` : '—',
          portadaH: alto(q('.cap-portada')),
          tarjetaH: alto(q('.portada-tarjeta'))
        };
      })
    });
    await ctx.close();
  }
  await navegador.close();
  abiertos.delete(navegador);
}
// ── EL PAPEL: LA TRAMPA QUE ABRE EL GATE NUEVO ────────────────────────────
// El bloque del efecto pasó de `@supports (animation-timeline: view())` —que
// NO suma especificidad— a `html[data-intro] …`, que suma un selector de
// atributo. El bloque de `@media print` desmonta el efecto con reglas de UNA
// clase, y su comentario dice que gana «por orden, con la misma
// especificidad». Eso dejó de ser cierto en el momento de cambiar el gate:
// (0,2,0) le gana a (0,1,0) esté donde esté en la hoja. Lo único que sostiene
// el print es que el gate va envuelto en `@media screen`.
//
// O sea que hay un cable a la vista: quitar ese `@media screen` —que parece
// redundante, porque «el efecto es de pantalla, obvio»— devuelve la pista
// larga al PDF, la foto recortada en tarjeta y EL NOMBRE REPETIDO, que es
// justo lo que el bloque de print dice que no puede pasar. Esto lo comprueba
// en vez de suponerlo, en los dos motores.
const papel = [];
for (const [nombre, motor] of MOTORES) {
  const navegador = await motor.launch();
  abiertos.add(navegador);
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base + RUTA, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  papel.push({
    motor: nombre,
    ...await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const g = (s, p) => { const e = q(s); return e ? getComputedStyle(e)[p] : '—'; };
      return {
        marca: document.documentElement.dataset.intro || '(sin marca)',
        pista: g('.intro-pista', 'height'),
        lienzo: g('.portada-lienzo', 'position'),
        clip: g('.portada-marco', 'clipPath'),
        anim: g('.portada-marco', 'animationName'),
        uno: `${g('.portada-uno', 'position')} / ${g('.portada-uno', 'marginTop')} / ${g('.portada-uno', 'animationName')}`,
        escena: g('.intro-escena', 'display'),
        aro: g('.intro-aro', 'display'),
        tarjeta: g('.portada-tarjeta', 'marginTop')
      };
    })
  });
  await ctx.close();
  await navegador.close();
  abiertos.delete(navegador);
}
server.close();

// ── El peso del JavaScript del CV ──────────────────────────────────────────
const html = fs.readFileSync(path.join(raiz, 'cv', 'vista-previa.html'), 'utf8');
const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const vistos = new Set();
let bruto = 0, gz = 0;
const cola = [...srcs];
while (cola.length) {
  const s = cola.shift();
  if (vistos.has(s) || !s.startsWith('/')) continue;
  vistos.add(s);
  const f = path.join(raiz, s.replace(/^\//, ''));
  if (!fs.existsSync(f)) continue;
  const b = fs.readFileSync(f);
  bruto += b.length; gz += zlib.gzipSync(b).length;
  for (const m of String(b).matchAll(/from"(\.[^"]+)"|import"(\.[^"]+)"/g)) {
    const rel = m[1] || m[2];
    cola.push(path.posix.normalize(path.posix.join(path.posix.dirname(s), rel)));
  }
}
const enLinea = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .reduce((a, m) => a + Buffer.byteLength(m[1]), 0);

const t = (v) => String(v ?? '—');
console.log('# La intro del CV, motor por motor\n');
for (const [nombre] of MOTORES) {
  for (const [w] of VENTANAS) {
    const g = filas.filter((f) => f.motor === nombre && f.w === w);
    if (!g.length) continue;
    const s = g[0].soporte;
    console.log(`## ${nombre} ${w}×${g[0].h} — \`animation-timeline: view()\` = **${s.view}** · vía = **${s.via}**\n`);
    console.log('| rueda | scrollY | --intro-p | barra alto/op/vis | tapa op/vis | clip-path del marco | zoom | caja oscura pintada | escena | pista | tarjeta y/alto | cierre y/alto | cap-portada | micrófono y |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const f of g) {
      console.log(`| ${f.parada} | ${f.scrollY} | ${t(f.p)} | ${f.barra} | ${f.tapaOp} | ${f.clip} | ${f.zoom} | ${f.caja} | ${f.escena} | ${f.pista} | ${f.tarjetaY} / ${f.tarjetaH} | ${f.cierreY} / ${f.cierreH} | ${f.portadaH} | ${f.micY} |`);
    }
    console.log('');
  }
}
console.log('## Los dos caminos sin conductor (1440×900)\n');
console.log('| motor | modo | vía | pista | recorrido reservado | tapa op/vis | nombre | .portada-tarjeta | .cap-portada |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const c of caminos) {
  console.log(`| ${c.motor} | ${c.modo} | ${c.via} | ${c.pista} | **${c.sobra}** | ${c.tapa} | ${c.nombre} | ${c.tarjetaH} | ${c.portadaH} |`);
}
console.log('\n## Al imprimir: el gate NO puede llegar al papel\n');
console.log('| motor | marca | .intro-pista | lienzo | clip del marco | animación | .portada-uno pos/margen/anim | escena | aro | tarjeta |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const c of papel) {
  console.log(`| ${c.motor} | ${c.marca} | ${c.pista} | ${c.lienzo} | ${c.clip} | ${c.anim} | ${c.uno} | ${c.escena} | ${c.aro} | ${c.tarjeta} |`);
}
const malPapel = papel.filter((c) => c.clip !== 'none' || c.anim !== 'none' || c.escena !== 'none' || c.aro !== 'none' || c.lienzo !== 'static' || c.tarjeta !== '0px');
console.log(malPapel.length
  ? `\n**El gate se está colando en el papel** en: ${malPapel.map((c) => c.motor).join(', ')}. Mira si sigue el \`@media screen\` alrededor del bloque del efecto.`
  : '\nEl `@media screen` sostiene: al imprimir no queda ni pista larga, ni recorte, ni nombre repetido.');

console.log(`\n## Peso del JavaScript del CV\n`);
console.log(`- módulos: **${bruto.toLocaleString('es-MX')} B** en bruto · **${gz.toLocaleString('es-MX')} B** gzip (${vistos.size} archivos)`);
console.log(`- en línea en el HTML: **${enLinea.toLocaleString('es-MX')} B**`);
console.log(`- tope de check-lh: 187 392 B`);
