// scripts/check-contraste-cv.mjs — el contraste de la TAPA del CV, medido
// sobre la página pintada.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE ESTE ARCHIVO
// ═══════════════════════════════════════════════════════════════════════════
// La portada del CV es la única parte del sitio donde hay texto encima de una
// FOTO, y encima de una foto el contraste no se puede razonar: se mide. El
// comentario grande de `.cap-portada` en src/components/cv/Historia.astro dice
// «si se mueve el titular o se toca un velo, se vuelve a medir», y hasta ahora
// esa frase no tenía con qué cumplirse — las mediciones vivían en un guion
// suelto de la máquina de quien las hizo.
//
// Los dos fallos que encontró la última medición no los enseñaba NINGUNA
// captura, y ese es el argumento entero:
//   · el degradado de la portada anterior pasaba el mínimo por 0.01, y con el
//     texto del navegador al 200 % se hundía a 1.91:1;
//   · el borde de la pastilla de idioma apagada daba 2.99:1 contra los 3:1 que
//     pide WCAG 1.4.11.
//
// ═══════════════════════════════════════════════════════════════════════════
// LAS CUATRO COSAS QUE MIDE
// ═══════════════════════════════════════════════════════════════════════════
// 1. LA MATRIZ. Cada pieza de texto de las dos pantallas oscuras, en 5 anchuras
//    x 2 idiomas x 2 tallas de letra, con las DOS VARAS del repo:
//      caja  — el peor píxel del fondo dentro de la caja del texto
//      trazo — el peor píxel del fondo justo DEBAJO de las letras
//    Las dos salen de pintar el mismo recorte CON y SIN texto: los píxeles que
//    cambian son las letras, y el fondo se lee del recorte sin texto.
//
//    LA CAJA QUE SE MIDE ES LA DE CONTENIDO, NO LA DEL BORDE. Con la del borde,
//    las pastillas de idioma daban 1.74:1 — y lo que se estaba midiendo era su
//    propio borde blanco, que nunca puede caer debajo de una letra.
//
// 2. EL BORDE de las pastillas de idioma, que es otra regla (WCAG 1.4.11: lo
//    que identifica un control necesita 3:1 contra lo que tiene al lado). Se
//    lee el píxel del borde contra el de dentro y el de fuera.
//
// 3. LOS FOTOGRAMAS DE LA APERTURA. La apertura sube el brillo de la foto de
//    .34 a 1, y `brightness` es una multiplicación, así que el fondo de cada
//    fotograma es más oscuro que el del siguiente: con texto claro, el peor
//    fotograma tiene que ser el ÚLTIMO. Esto lo comprueba, porque el `scale`
//    de 1.05 cambia QUÉ píxel cae debajo de cada letra y podría romperlo.
//
// 4. LOS FOTOGRAMAS DEL EFECTO DE LA TARJETA (2026-08-29). El clavado dura lo
//    que mide la pista menos una pantalla, Y ESO SE LE PREGUNTA A LA PÁGINA
//    en vez de suponerlo: cuando la pista bajó de 200svh a 160svh, la cuenta
//    supuesta dejó el «75 %» y el «100 %» fuera del efecto (ver el bloque 4).
//    Se mide en 0/25/50/75/100 % de ese tramo, y en cada fotograma se
//    comprueban las TRES promesas del efecto:
//      a) LA DISOLUCIÓN NO DEJA TEXTO ILEGIBLE PUESTO. La tapa se funde
//         entera (velo y texto en una opacidad de grupo), así que su contraste
//         compuesto decae con la alfa — lo prohibido es que una pieza caiga
//         por debajo de su mínimo mientras el texto siga siendo texto. La
//         vara: con α > 0.5 (menos de medio disuelta) toda pieza pasa su
//         mínimo; medido, cruzan alrededor de α ≈ 0.25, ya casi idas.
//      b) LAS MITADES DE TINTA, YA ASENTADAS (α ≥ .95), pasan su mínimo sobre
//         el papel. Durante el cruce (26–70 %) son transicionales — el
//         doble-expuesto del fotograma 6 de la referencia — y no se les exige.
//      c) NUNCA HAY DOS FOTOS. Es el fallo que grabó Jaime: la portada
//         cortada por arriba, una banda blanca y la MISMA ciudad entrando de
//         nuevo por abajo. Cada FILA de la captura se clasifica por su
//         fracción de píxeles claros (≤ 40 % claros = foto, también con
//         glifos blancos encima; ≥ 60 % = papel, también con un renglón de
//         tinta encima; entre medias hereda, que es la histéresis que impide
//         que un trazo grueso parta un segmento). Dos segmentos de foto
//         separados por ≥ 8 px de papel son el fallo — 8 px para que el aro
//         (una línea de 1.5 px) no dispare la alarma. En 1280x800 la tarjeta
//         asentada ocupa el 29 % del ancho y sus filas leen como papel: cero
//         segmentos, que también pasa — lo prohibido es MÁS de uno. Además:
//         cero <img>/<picture> dentro de .portada-tarjeta (ahí vivía el
//         duplicado) y UN solo <picture> en la pista por panel.
//
// ═══════════════════════════════════════════════════════════════════════════
// DOS TRAMPAS QUE YA COSTARON UNA MEDICIÓN ENTERA, ESCRITAS AQUÍ
// ═══════════════════════════════════════════════════════════════════════════
// · La apertura NO lleva `animation-fill-mode`, así que en cuanto TERMINA el
//   navegador la retira de `getAnimations()` y `a.currentTime = 0` deja de
//   hacer nada, EN SILENCIO. Las piezas medidas después de la primera daban el
//   mismo número en los cinco fotogramas porque los cinco eran el estado final.
//   Por eso el paso 3 rearranca la animación antes de cada fotograma.
// · Y por eso el paso 1 apaga la apertura con CSS (`animation: none`) y no con
//   `a.finish()`: con `none` el elemento cae a su estilo base, que ES el estado
//   final —los keyframes solo declaran el `from`—, y eso no puede ser un no-op.
//
// CÓMO SE CORRE
//   npm run build && npm run check-contraste-cv
// Necesita Playwright suelto, igual que check-reflow:
//   npm i --no-save playwright && npx playwright install chromium
// No va en package.json ni corre en CI, y si falta lo dice en vez de fingir que
// midió. Sale con 1 si alguna medición no llega a su mínimo.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const arg = (n, d) => {
  const p = process.argv.find((a) => a.startsWith('--' + n + '='));
  return p ? p.slice(n.length + 3) : d;
};
const RAIZ = arg('dist', 'dist');
const RUTA = '/cv/vista-previa.html';

/* Las anchuras, con el alto de un aparato real de cada una. La forma importa
   tanto como el ancho: el recorte de la portada se elige por proporción de
   pantalla — y desde la ola 2b la COMPOSICIÓN también (`min-aspect-ratio:
   1/1`), así que una ventana apaisada y una vertical del mismo ancho ya no
   miden lo mismo.
   ── 1440x900 Y 1920x1080 SE AÑADIERON EN LA OLA 2b, Y NO ES UN EXTRA ──────
   De las cinco que pidió Jaime solo UNA era apaisada (1280x800), y desde que
   el escritorio es el objetivo principal —«la mayoría de inspectores lo verá
   en computadora, de hecho todas»— la tapa apaisada cambió de geometría
   entera: el nombre pasó de dos mitades a una línea centrada al 50 % del
   alto, el señuelo bajó al 92 % y el velo pasó de un degradado medido desde
   el final del texto a una capa plana de pantalla completa. Cada una de esas
   tres cosas mueve QUÉ PÍXEL DE LA FOTO cae debajo de cada letra, y eso aquí
   no se razona: se mide. Con estas dos, las apaisadas pasan de una de cinco
   a tres de siete. */
const VENTANAS = [[375, 812], [390, 844], [414, 896], [768, 1024], [1280, 800], [1440, 900], [1920, 1080]];
const IDIOMAS = ['en', 'es'];
/* 100 y 200 % del tamaño de texto del navegador. El 200 no es un extra: es lo
   que rompió la portada anterior, porque el titular no está en el 40 % de la
   pantalla sino donde lo deje su propia letra. */
const ESCALAS = [100, 200];

/* Cada pieza con el mínimo que le pide WCAG. 3 para el texto grande (el nombre
   y la frase de apertura pasan de 24 px en cualquier anchura), 4.5 para el
   resto. */
/* DESDE EL EFECTO DE LA TARJETA (2026-08-28), LA 2ª PANTALLA ES PAPEL: el
   manifiesto, el índice y el pie de foto ya no caen sobre la foto sino sobre
   blanco opaco, con la tinta del documento — su contraste es determinista y
   lo cubren axe y los tokens, no esta matriz. Lo que queda encima de la foto
   es la 1ª pantalla entera, que se sigue midiendo pieza a pieza. */
const PIEZAS = [
  ['1 · etiqueta',   '.portada-uno .etiqueta', 4.5],
  ['1 · idioma on',  '.portada-uno .cv-lang-a.on', 4.5],
  ['1 · idioma off', '.portada-uno .cv-lang-a:not(.on)', 4.5],
  ['1 · nombre 1',   '.portada-n1', 3],
  ['1 · señuelo',    '.portada-senuelo', 4.5],
  ['1 · nombre 2',   '.portada-n2', 3]
];
const MIN_BORDE = 3; // WCAG 1.4.11

let chromium, sharp;
try {
  ({ chromium } = await import('playwright'));
  sharp = (await import('sharp')).default;
} catch {
  console.error('[contraste] falta Playwright. Instálalo suelto y vuelve:');
  console.error('[contraste]   npm i --no-save playwright && npx playwright install chromium');
  console.error('[contraste] NO se ha medido nada.');
  process.exit(1);
}
if (!fs.existsSync(path.join(RAIZ, RUTA.slice(1)))) {
  console.error('[contraste] no está ' + path.join(RAIZ, RUTA.slice(1)) + '.');
  console.error('[contraste] Ese archivo solo se emite sin CV_SLUG: CV_SLUG= npm run build');
  process.exit(1);
}

// ---------------------------------------------------------------- utilidades
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const TIPO = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };

const { servidor, puerto } = await new Promise((res) => {
  const s = http.createServer((req, rp) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = path.join(RAIZ, u);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(RAIZ, u + '.html');
    if (!fs.existsSync(f)) { rp.writeHead(404); return rp.end('no'); }
    rp.writeHead(200, { 'content-type': TIPO[path.extname(f)] || 'application/octet-stream' });
    rp.end(fs.readFileSync(f));
  });
  s.listen(0, () => res({ servidor: s, puerto: s.address().port }));
});
const url = (idioma) => `http://localhost:${puerto}${RUTA}${idioma === 'es' ? '#es' : ''}`;
const SIN_TEXTO = '[data-sin-texto], [data-sin-texto] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; }';
const SIN_APERTURA = '.portada-foto { animation: none !important; }';

/** La caja de CONTENIDO: sin borde y sin relleno. Ver la cabecera. */
const CAJA_CONTENIDO = (e) => {
  const r = e.getBoundingClientRect(), c = getComputedStyle(e);
  const n = (v) => parseFloat(v) || 0;
  const t = n(c.borderTopWidth) + n(c.paddingTop), b = n(c.borderBottomWidth) + n(c.paddingBottom);
  const l = n(c.borderLeftWidth) + n(c.paddingLeft), d = n(c.borderRightWidth) + n(c.paddingRight);
  return { x: r.x + l, y: r.y + t, width: r.width - l - d, height: r.height - t - b };
};

/** Las dos varas sobre un recorte pintado con y sin texto. */
async function varas(con, sin, colorTexto) {
  const A = await sharp(con).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(sin).raw().toBuffer({ resolveWithObject: true });
  const ch = A.info.channels, n = A.info.width * A.info.height;
  const m = colorTexto.match(/[\d.]+/g).map(Number);
  const Lt = lum(m[0], m[1], m[2]);
  let Lcaja = -1, dmax = 0;
  const d = new Float32Array(n), Lb = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * ch;
    Lb[i] = lum(B.data[o], B.data[o + 1], B.data[o + 2]);
    if (Lb[i] > Lcaja) Lcaja = Lb[i];
    d[i] = Math.abs((A.data[o] + A.data[o + 1] + A.data[o + 2]) - (B.data[o] + B.data[o + 1] + B.data[o + 2])) / 3;
    if (d[i] > dmax) dmax = d[i];
  }
  // Un píxel es TRAZO cuando la letra lo cubre casi entero: así se mide el
  // fondo de debajo de la tinta y no el de las orillas suavizadas.
  let Ltrazo = -1;
  if (dmax > 20) for (let i = 0; i < n; i++) if (d[i] >= 0.85 * dmax && Lb[i] > Ltrazo) Ltrazo = Lb[i];
  if (Ltrazo < 0) Ltrazo = Lcaja;
  return { caja: ratio(Lt, Lcaja), trazo: ratio(Lt, Ltrazo) };
}

const nav = await chromium.launch();
const fallos = [];
const filas = [];

// ═══ 1) LA MATRIZ ═════════════════════════════════════════════════════════
for (const [w, h] of VENTANAS) {
  for (const idioma of IDIOMAS) {
    for (const esc of ESCALAS) {
      const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      // La misma palanca que check-reflow: es el «Tamaño de fuente» de Chrome,
      // no zoom — sube la letra y deja el viewport donde está.
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * esc / 100), fixed: Math.round(13 * esc / 100) } });
      await p.goto(url(idioma), { waitUntil: 'load' });
      await p.addStyleTag({ content: SIN_APERTURA });
      await p.addStyleTag({ content: SIN_TEXTO });
      const raiz = idioma === 'es' ? '.cv-es' : '.cv-en';
      for (const [nombre, sel, min] of PIEZAS) {
        const el = p.locator(`${raiz} ${sel}`).first();
        if (!(await el.count())) { fallos.push(`${nombre}: el selector ${sel} no encuentra nada`); continue; }
        await el.scrollIntoViewIfNeeded();
        await p.waitForTimeout(120);
        const caja = await el.evaluate(CAJA_CONTENIDO);
        const clip = { x: Math.max(0, caja.x), y: Math.max(0, caja.y),
                       width: Math.min(caja.width, w - Math.max(0, caja.x)),
                       height: Math.min(caja.height, h - Math.max(0, caja.y)) };
        if (clip.width < 2 || clip.height < 2) continue;
        const color = await el.evaluate((e) => getComputedStyle(e).color);
        const con = await p.screenshot({ clip });
        await el.evaluate((e) => e.setAttribute('data-sin-texto', ''));
        const sin = await p.screenshot({ clip });
        await el.evaluate((e) => e.removeAttribute('data-sin-texto'));
        const { caja: rc, trazo: rt } = await varas(con, sin, color);
        filas.push({ w, h, idioma, esc, nombre, min, rc, rt });
        if (rc < min || rt < min) {
          fallos.push(`${nombre} en ${w}x${h} ${idioma} al ${esc}%: caja ${rc.toFixed(2)}:1, trazo ${rt.toFixed(2)}:1 (mínimo ${min})`);
        }
      }
      await ctx.close();
    }
  }
}

console.log('\nLA MATRIZ — ' + filas.length + ' mediciones (' + PIEZAS.length + ' piezas x ' +
            VENTANAS.length + ' anchuras x ' + IDIOMAS.length + ' idiomas x ' + ESCALAS.length + ' tallas)');
console.log('pieza             peor caja   peor trazo   mínimo');
for (const [nombre, , min] of PIEZAS) {
  const f = filas.filter((x) => x.nombre === nombre);
  if (!f.length) continue;
  console.log(nombre.padEnd(17),
    Math.min(...f.map((x) => x.rc)).toFixed(2).padStart(8),
    Math.min(...f.map((x) => x.rt)).toFixed(2).padStart(12),
    String(min).padStart(8));
}

// ═══ 2) EL BORDE DE LAS PASTILLAS (WCAG 1.4.11) ═══════════════════════════
console.log('\nEL BORDE DE LAS PASTILLAS DE IDIOMA (mínimo ' + MIN_BORDE + ':1 contra lo de al lado)');
for (const [w, h] of VENTANAS) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(url('en'), { waitUntil: 'load' });
  await p.addStyleTag({ content: SIN_APERTURA });
  for (const sel of ['.cv-lang-a.on', '.cv-lang-a:not(.on)']) {
    const el = p.locator('.cv-en ' + sel).first();
    const r = await el.boundingBox();
    // Una banda de 9 px de ancho y 1 de alto, centrada en el borde IZQUIERDO.
    const clip = { x: Math.round(r.x) - 4, y: Math.round(r.y + r.height / 2), width: 9, height: 1 };
    const B = await sharp(await p.screenshot({ clip })).raw().toBuffer({ resolveWithObject: true });
    const L = [];
    for (let i = 0; i < B.info.width; i++) L.push(lum(B.data[i * B.info.channels], B.data[i * B.info.channels + 1], B.data[i * B.info.channels + 2]));
    const iMax = L.indexOf(Math.max(...L));       // el borde es lo más claro de la banda
    const fuera = L[Math.max(0, iMax - 2)], dentro = L[Math.min(L.length - 1, iMax + 2)];
    const peor = Math.min(ratio(L[iMax], fuera), ratio(L[iMax], dentro));
    console.log(`${(w + 'x' + h).padEnd(10)} ${sel.padEnd(24)} ${peor.toFixed(2)}:1`);
    if (peor < MIN_BORDE) fallos.push(`borde de ${sel} en ${w}x${h}: ${peor.toFixed(2)}:1 (mínimo ${MIN_BORDE})`);
  }
  await ctx.close();
}

// ═══ 3) LOS FOTOGRAMAS DE LA APERTURA ═════════════════════════════════════
// El peor fotograma tiene que ser el ÚLTIMO. Si alguno cae por debajo del
// final, la demostración de `cv-abrir` deja de ser cierta y hay que volver a
// medir la animación entera, no solo el estado estable.
const TIEMPOS = [0, 600, 1200, 1800, 2400];
const PIEZAS_APERTURA = PIEZAS.filter(([n]) => n.startsWith('1 · '));
console.log('\nLOS FOTOGRAMAS DE LA APERTURA (el peor tiene que ser el último)');
for (const [w, h, esc] of [[390, 844, 200], [1280, 800, 100], [375, 812, 200], [1440, 900, 100], [1920, 1080, 200]]) {
  console.log(`\n${w}x${h}, texto ${esc} %`);
  console.log('pieza            ' + TIEMPOS.map((t) => ('t' + t).padStart(8)).join(''));
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * esc / 100), fixed: Math.round(13 * esc / 100) } });
  await p.goto(url('en'), { waitUntil: 'load' });
  await p.addStyleTag({ content: SIN_TEXTO });
  for (const [nombre, sel, min] of PIEZAS_APERTURA) {
    const el = p.locator('.cv-en ' + sel).first();
    if (!(await el.count())) continue;
    const caja = await el.evaluate(CAJA_CONTENIDO);
    const clip = { x: Math.max(0, caja.x), y: Math.max(0, caja.y),
                   width: Math.min(caja.width, w - Math.max(0, caja.x)),
                   height: Math.min(caja.height, h - Math.max(0, caja.y)) };
    if (clip.width < 2 || clip.height < 2) continue;
    const color = await el.evaluate((e) => getComputedStyle(e).color);
    const m = color.match(/[\d.]+/g).map(Number);
    const Lt = lum(m[0], m[1], m[2]);
    const serie = [];
    for (const t of TIEMPOS) {
      // Rearrancar la animación ANTES de cada fotograma: ver la cabecera.
      await p.evaluate((ms) => document.querySelectorAll('.portada-foto').forEach((e) => {
        e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
        e.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
      }), t);
      await p.waitForTimeout(90);
      await el.evaluate((e) => e.setAttribute('data-sin-texto', ''));
      const sin = await p.screenshot({ clip });
      await el.evaluate((e) => e.removeAttribute('data-sin-texto'));
      const B = await sharp(sin).raw().toBuffer({ resolveWithObject: true });
      let L = -1;
      for (let i = 0; i < B.info.width * B.info.height; i++) {
        const o = i * B.info.channels;
        const l = lum(B.data[o], B.data[o + 1], B.data[o + 2]);
        if (l > L) L = l;
      }
      serie.push(ratio(Lt, L));
    }
    console.log(nombre.padEnd(17) + serie.map((x) => x.toFixed(2).padStart(8)).join(''));
    const fin = serie[serie.length - 1];
    for (let i = 0; i < serie.length - 1; i++) {
      if (serie[i] < fin - 0.01) {
        fallos.push(`la apertura empeora: ${nombre} en ${w}x${h} al ${esc}% da ${serie[i].toFixed(2)}:1 en t${TIEMPOS[i]} contra ${fin.toFixed(2)}:1 al final`);
      }
    }
    if (fin < min) fallos.push(`${nombre} en ${w}x${h} al ${esc}%: ${fin.toFixed(2)}:1 al final (mínimo ${min})`);
  }
  await ctx.close();
}

// ═══ 4) LOS FOTOGRAMAS DEL EFECTO DE LA TARJETA ═══════════════════════════
// EL CLAVADO SE MIDE, NO SE SUPONE. Aquí decía «dura exactamente una pantalla
// de scroll (la pista mide 200svh y el lienzo 100svh): scroll = svh x
// progreso», y era verdad mientras la pista midiera 200svh. El 2026-08-30 la
// pista bajó a 160svh —Jaime pidió que la transición terminara en UN
// deslizamiento— y el clavado pasó a 60svh. Con la cuenta vieja, el «75 %» y
// el «100 %» caían FUERA del efecto, ya en el cuerpo del capítulo 1, y el
// detector de «nunca hay dos fotos» encontraba allí la Torre CN: dos y tres
// segmentos de foto, o sea una alarma sobre algo que no es el efecto. El
// progreso se calcula ahora contra el clavado REAL (alto de la pista menos el
// alto de la ventana, que es exactamente el tramo `contain` de la línea de
// tiempo), así que «100 % del clavado» quiere decir eso mida lo que mida la
// pista. Ver la cabecera, punto 4.
// ── QUÉ MIDEN DE VERDAD ESTOS CINCO, PORQUE UN PR LO CONTÓ MAL ────────────
// El cuerpo del PR f12765c decía que esto «muestrea el recorrido cada ~287
// px». Es falso: son CINCO fotogramas repartidos por el clavado ENTERO, o sea
// uno cada 25 % de él. Medido, el clavado útil vale 276 px en 390x844 y
// 233–305 px en las cuatro ventanas de escritorio, así que el paso real entre
// fotograma y fotograma es de ~58 a ~76 px, no 287. 287 era el recorrido
// COMPLETO de una de las ventanas, contado como si fuera el paso.
const PROGRESOS = [0, 0.25, 0.5, 0.75, 1];
console.log('\nLOS FOTOGRAMAS DEL EFECTO (0/25/50/75/100 % del clavado)');
for (const [w, h, esc] of [[390, 844, 100], [390, 844, 200], [1280, 800, 100], [1440, 900, 100], [1920, 1080, 100]]) {
  console.log(`\n${w}x${h}, texto ${esc} %`);
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * esc / 100), fixed: Math.round(13 * esc / 100) } });
  await p.goto(url('en'), { waitUntil: 'load' });
  await p.addStyleTag({ content: SIN_APERTURA });
  await p.addStyleTag({ content: SIN_TEXTO });
  // Si el navegador de la medición no conduce el efecto, no hay fotogramas
  // que medir (la degradación es la portada de siempre, cubierta por 1–3).
  const conEfecto = await p.evaluate(() =>
    CSS.supports('animation-timeline: view()') &&
    getComputedStyle(document.querySelector('.cv-en .intro-pista')).height !== 'auto');
  if (!conEfecto) { console.log('  (sin scroll-driven animations aquí: nada que medir)'); await ctx.close(); continue; }

  // c) cero duplicados en el DOM, siempre.
  const dup = await p.evaluate(() => ({
    enTarjeta: document.querySelectorAll('.cv-en .portada-tarjeta img, .cv-en .portada-tarjeta picture').length,
    enPista: document.querySelectorAll('.cv-en .intro-pista picture').length
  }));
  if (dup.enTarjeta !== 0) fallos.push(`el manifiesto vuelve a llevar una imagen dentro (${dup.enTarjeta}): ahí vivía el duplicado`);
  if (dup.enPista !== 1) fallos.push(`la pista lleva ${dup.enPista} <picture> y tiene que llevar exactamente 1`);

  // El tramo que conduce el efecto: alto de la pista menos alto de la
  // ventana. Es la definición del rango `contain` de la view-timeline, así
  // que este número y el que usa el CSS son el mismo por construcción.
  const clavado = await p.evaluate(() =>
    Math.max(0, document.querySelector('.cv-en .intro-pista').offsetHeight - window.innerHeight));
  console.log(`  (clavado: ${clavado} px de scroll)`);

  for (const prog of PROGRESOS) {
    await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(clavado * prog));
    await p.waitForTimeout(160);

    // a) la disolución de la tapa: contraste compuesto contra su alfa.
    const alfa = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.cv-en .portada-uno')).opacity));
    const visible = await p.evaluate(() => getComputedStyle(document.querySelector('.cv-en .portada-uno')).visibility !== 'hidden');
    const detalle = [`  ${Math.round(prog * 100)}%`.padEnd(7) + `tapa α=${alfa.toFixed(2)}${visible ? '' : ' (hidden)'}`];
    if (visible && alfa > 0.05) {
      for (const [nombre, sel, min] of PIEZAS) {
        const el = p.locator('.cv-en ' + sel).first();
        if (!(await el.count())) continue;
        const caja = await el.evaluate(CAJA_CONTENIDO);
        const clip = { x: Math.max(0, caja.x), y: Math.max(0, caja.y),
                       width: Math.min(caja.width, w - Math.max(0, caja.x)),
                       height: Math.min(caja.height, h - Math.max(0, caja.y)) };
        if (clip.width < 2 || clip.height < 2) continue;
        const color = await el.evaluate((e) => getComputedStyle(e).color);
        const con = await p.screenshot({ clip });
        await el.evaluate((e) => e.setAttribute('data-sin-texto', ''));
        const sin = await p.screenshot({ clip });
        await el.evaluate((e) => e.removeAttribute('data-sin-texto'));
        const { caja: rc } = await varas(con, sin, color);
        if (rc < min && alfa > 0.5) {
          fallos.push(`efecto: ${nombre} cae a ${rc.toFixed(2)}:1 con la tapa a α=${alfa.toFixed(2)} (> .5) en ${w}x${h} al ${esc}%, ${Math.round(prog * 100)}%`);
        }
      }
    }

    // b) las mitades de tinta asentadas, sobre papel.
    for (const sel of ['.intro-n1', '.intro-n2']) {
      const st = await p.evaluate((s) => {
        const e = document.querySelector('.cv-en ' + s);
        if (!e) return null;
        const cs = getComputedStyle(e.parentElement); // la escena lleva la alfa
        return { alfa: parseFloat(cs.opacity), display: cs.display };
      }, sel);
      if (!st || st.display === 'none' || st.alfa < 0.95) continue;
      const el = p.locator('.cv-en ' + sel).first();
      const caja = await el.evaluate(CAJA_CONTENIDO);
      const clip = { x: Math.max(0, caja.x), y: Math.max(0, caja.y),
                     width: Math.min(caja.width, w - Math.max(0, caja.x)),
                     height: Math.min(caja.height, h - Math.max(0, caja.y)) };
      if (clip.width < 2 || clip.height < 2) continue;
      const color = await el.evaluate((e) => getComputedStyle(e).color);
      const con = await p.screenshot({ clip });
      await el.evaluate((e) => e.setAttribute('data-sin-texto', ''));
      const sin = await p.screenshot({ clip });
      await el.evaluate((e) => e.removeAttribute('data-sin-texto'));
      const { caja: rc, trazo: rt } = await varas(con, sin, color);
      detalle.push(`${sel} ${rc.toFixed(2)}/${rt.toFixed(2)}`);
      if (rc < 3 || rt < 3) fallos.push(`efecto: ${sel} asentada da caja ${rc.toFixed(2)}:1 / trazo ${rt.toFixed(2)}:1 en ${w}x${h} al ${esc}%, ${Math.round(prog * 100)}% (mínimo 3)`);
    }

    // c) nunca dos fotos: cada FILA entera clasificada por su fracción de
    //    píxeles claros. Una fila es FOTO si es mayormente oscura (≤ 40 % de
    //    claros: la ciudad de noche, también con glifos blancos encima) y
    //    PAPEL si es mayormente clara (≥ 60 %: papel, también con un renglón
    //    de tinta encima — la tinta nunca cubre el 60 % de una fila). Entre
    //    medias hereda la fila anterior (histéresis), que es lo que evita que
    //    un trazo grueso de letra parta un segmento — el primer detector iba
    //    por la columna del centro y contaba los glifos como fotos.
    const captura = await p.screenshot();
    const B = await sharp(captura).raw().toBuffer({ resolveWithObject: true });
    const ch = B.info.channels, W = B.info.width;
    const filasFoto = [];
    let previa = true; // la página nace en foto a sangre
    for (let y = 0; y < B.info.height; y++) {
      let claras = 0, muestras = 0;
      for (let x = 0; x < W; x += 3) {
        const o = (y * W + x) * ch;
        if (lum(B.data[o], B.data[o + 1], B.data[o + 2]) >= 0.8) claras++;
        muestras++;
      }
      const f = claras / muestras;
      const esFoto = f <= 0.4 ? true : f >= 0.6 ? false : previa;
      filasFoto.push(esFoto);
      previa = esFoto;
    }
    // Segmentos de foto separados por ≥ 8 px de papel (el aro es una línea
    // de 1.5 px y no puede disparar esto).
    let segmentos = 0, dentro = false, papelSeguido = Infinity;
    for (const esFoto of filasFoto) {
      if (esFoto) {
        if (!dentro && papelSeguido >= 8) segmentos++;
        dentro = true; papelSeguido = 0;
      } else {
        papelSeguido++;
        if (papelSeguido >= 8) dentro = false;
      }
    }
    if (segmentos > 1) fallos.push(`efecto: la foto sale PARTIDA EN ${segmentos} por una banda de papel en ${w}x${h} al ${esc}%, ${Math.round(prog * 100)}% — el fallo de la grabación`);
    detalle.push(`foto en ${segmentos} segmento${segmentos === 1 ? '' : 's'}`);
    console.log(detalle.join(' · '));
  }
  await ctx.close();
}

await nav.close();
servidor.close();

if (fallos.length) {
  console.error('\n[contraste] ' + fallos.length + ' medicion(es) por debajo del mínimo:');
  for (const f of fallos) console.error('  · ' + f);
  process.exit(1);
}
const peorCaja = Math.min(...filas.map((f) => f.rc));
const peorTrazo = Math.min(...filas.map((f) => f.rt));
console.log(`\n[contraste] ${filas.length} mediciones de la matriz: todas por encima de su mínimo.`);
console.log(`[contraste] peor caja ${peorCaja.toFixed(2)}:1 · peor trazo ${peorTrazo.toFixed(2)}:1`);
console.log('[contraste] el borde de las pastillas pasa 1.4.11 y la apertura no empeora ningún fotograma.');
