// scripts/check-sistema-cv.mjs — EL GUARDIÁN DEL SISTEMA DE APPLE.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// El 2026-09-04 Jaime dijo, textual: «Toda la estructura de la página está mal.
// Hay un montón de espacios blancos… no tiene sintonía, no tiene armonía, no
// tiene estructura… los recuadros negros todos deberían de tener el mismo
// tamaño». La auditoría del mismo día puso números a esa frase, medidos sobre
// lo publicado, en WebKit y en Chromium:
//
//   · 24 126 px de documento = 26.8 pantallas
//   · 52 % de las filas de la prosa SIN TINTA
//   · 8 756 px vacíos de lado a lado, repartidos en diez huecos de 433 a 1 426
//   · 15 tamaños de texto en el cuerpo
//   · 12 tarjetas oscuras con 10 alturas distintas (329 a 567)
//   · 29 de 39 imágenes a 154 px de ancho; Toronto al 0.32× de su natural
//   · 227 bloques de nota = 2 137 palabras = el 50.6 % del cuerpo
//   · rótulos repetidos: «TO WRITE» ×17, «In the chapter ↓» ×14, «Proven…» ×8
//
// El problema de fondo NO es que alguien maquetara mal un capítulo: es que no
// había ninguna regla que dijera cuándo un capítulo está mal. Cada vez que se
// añade material, el documento se vuelve a descomponer por el mismo sitio.
// Jaime lo dijo con todas las letras: «que se analice cada elemento, ya que
// constantemente iré añadiendo cosas».
//
// Este archivo ES esa regla. Construye el CV, lo recorre en los DOS motores y
// en los DOS anchos de escritorio, y falla nombrando qué elemento y qué valor
// se salió del sistema. No opina: mide.
//
// El sistema que vigila está escrito y medido en
//   cv-material/ola5/SISTEMA-REFERENCIA.md   (Apple Newsroom / Apple Stories)
// y declarado en CSS en
//   src/styles/cv.css   (bloque «EL SISTEMA», tokens --sf-*)
//
// ═══════════════════════════════════════════════════════════════════════════
// LAS OCHO PRUEBAS (§5 del documento de referencia)
// ═══════════════════════════════════════════════════════════════════════════
//  1 TAMAÑOS   todo texto del cuerpo mide uno de los OCHO: 56 40 24 21 19 17 14 12
//  2 TARJETAS  toda tarjeta oscura mide 482 × 288. Una sola talla, como pidió él.
//  3 FOTOS     todo img/video/canvas del cuerpo tiene un ancho del sistema y
//              NINGUNA baja de 308 px (el piso absoluto; Apple no baja de 480)
//  4 PASOS     el aire entre bloques es 16 · 44 · 72 · 80; dentro, 8 · 20
//  5 HUECOS    ninguna franja de más de 160 px sin un píxel de tinta
//  6 DESBORDE  scrollWidth === innerWidth en los dos motores y los dos anchos
//  7 NOTAS     ≤ 59 notas y ≤ el tope de huecos «TO WRITE» declarado abajo
//  8 REPES     ningún rótulo repetido 8 veces o más (un rótulo que sale 8
//              veces no informa de nada), y ningún bloque que se quede en
//              opacity: 0 después de recorrer la página — que es el fallo que
//              la Mac de Jaime (Safari 16.6, sin `animation-timeline`) VE y
//              que ninguna captura de Chrome enseña.
//
// ═══════════════════════════════════════════════════════════════════════════
// LOS TOPES, Y POR QUÉ NO SON CERO HOY
// ═══════════════════════════════════════════════════════════════════════════
// El sistema entra por fases: primero las reglas (esta ola), después los
// capítulos (la siguiente). Si el guardián exigiera cero desde el primer día
// solo se podría hacer una cosa con él: apagarlo. Así que cada prueba lleva un
// TOPE declarado aquí arriba, con el número medido el día que se escribió, y
// falla cuando lo SUPERA. La deuda no puede crecer, y cada ola baja los topes
// a mano hasta que todos sean 0 — llegar a 0 es el criterio de «terminado».
//
// Un tope no es un permiso: es el número que Jaime lee para saber cuánto
// queda. Se imprime siempre, se pase o se falle.
//
// ═══════════════════════════════════════════════════════════════════════════
// CÓMO SE CORRE
// ═══════════════════════════════════════════════════════════════════════════
//   CV_SLUG= npm run build && npm run check-sistema-cv
//
// Necesita Playwright suelto con los dos motores, igual que check-reflow y
// check-contraste-cv (y por lo mismo: no entra en el CI de Vercel):
//   npm i --no-save playwright && npx playwright install chromium webkit
// Si falta, LO DICE y sale con 1 en vez de fingir que midió.
//
// Banderas:
//   --dist=dist         la carpeta construida
//   --motores=chromium,webkit
//   --anchos=1440,1920
//   --idiomas=en,es
//   --json=RUTA         vuelca todas las infracciones a un JSON
//   --lista=N           cuántas infracciones se imprimen por prueba (20)
//   --sin-topes         imprime y NO falla (para medir una línea base nueva)

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

// ═══════════════════════════════════════════════════════════════════════════
// EL SISTEMA, EN NÚMEROS. Todos salen de SISTEMA-REFERENCIA.md; ninguno se
// inventa aquí. Si uno cambia, cambia en el documento primero.
// ═══════════════════════════════════════════════════════════════════════════
const TAMANOS = [56, 40, 24, 21, 19, 17, 14, 12];          // §3.1
const PASOS_ENTRE = [16, 44, 72, 80];                       // §3.1 aire
const PASOS_DENTRO = [0, 8, 16, 20];                        // §3.1 aire interior
const TARJETA = { w: 482, h: 288 };                         // §3.4 (iv)
const ANCHOS_FOTO = [1920, 1440, 1280, 980, 782, 653, 482, 316, 308, 171]; // §4
const PISO_FOTO = 308;                                      // §4, piso absoluto
const HUECO_MAX = 160;                                      // §5.5
const NOTAS_MAX = 59;                                       // §3.4 (x): 227 → 59
const TOL = 1;                                              // ±1 px

// ── LOS TOPES ─────────────────────────────────────────────────────────────
//    Medidos el 2026-09-04 sobre `origin/main` (4f7696b) con este mismo
//    guardián y `--sin-topes`, en los 8 combos (2 motores × 2 anchos × 2
//    idiomas). La cuenta que manda es la del PEOR combo, nunca la suma: medir
//    dos idiomas no puede duplicar la deuda de un mismo defecto.
//    Bajan; no suben. Cada ola los baja a mano.
//
//    UNA HONESTIDAD SOBRE LOS HUECOS. La auditoría publicó 8 756 px en diez
//    franjas. Este guardián mide 3 036 en trece, y la diferencia NO es que una
//    de las dos se equivoque: son dos varas. La auditoría midió también el
//    ancho vacío (el 36 % del marco de lado a lado); esta mide solo el ALTO
//    sin tinta dentro de la columna útil. La vara de aquí es la que se puede
//    volver a correr en un segundo y comparar con la de ayer, y es la que
//    baja cuando el documento mejora — que es para lo que sirve un guardián.
// ── LOS TOPES SE BAJARON AL CERRAR LA OLA 5 · PASO 1 (2026-09-04) ──────────
// Un tope que se queda arriba después de que la ola lo haya batido no vigila
// nada: deja sitio para devolver en silencio lo que se acaba de ganar. Los
// cinco que este paso bajó, con el número de antes al lado:
//   tamanos  7 → 1     (los tokens de la escala: 44·38·28·20·16·13·11 fuera)
//   pasos  213 → 132   (los cuatro pasos 16·44·72·80 en `--cv-v1…v4`)
//   huecos  13 → 5     (la rejilla del capítulo 2 y el aire del sistema)
//   huecoPx 3036 → 1200
//   apagados  — → 0    (ya era 0; ahora además hay una prueba que lo cazó)
// Los que NO bajaron son la deuda declarada de la ola siguiente, que es la de
// los CAPÍTULOS: las 12 tarjetas oscuras, las 42 fotos fuera de medida, las 39
// por debajo del piso, las 50 notas, los 24 huecos y los 9 rótulos repetidos.
const TOPES = {
  tamanos: 1,      // el único que queda: un h2 `visually-hidden` a 25.5 px
  tarjetas: 12,    // las 12 tarjetas oscuras: 880 de ancho y 10 alturas
  parejas: 0,      // .sf-par mal formada — nace en cero y se queda en cero
  fotos: 42,       // imágenes con un ancho que no es del sistema
  pisos: 39,       // imágenes por debajo de 308 px (la moda es 154)
  pasos: 132,      // distancias que no son un paso del sistema
  huecos: 5,       // franjas de más de 160 px sin tinta en la columna útil
  // 1 200 y no los 1 120 medidos hoy: es la ÚNICA cuenta que se mueve entre
  // corridas, porque sale de barrer el documento en filas de 4 px buscando
  // tinta y las fotos no siempre llegan en el mismo fotograma. Medido 1 140 ·
  // 1 140 · 1 120 en tres corridas. El margen es de UNA franja corta, no de
  // una holgura cómoda: 1 200 sigue siendo el 40 % de los 3 036 de la ola 4.
  huecoPx: 1200,   // suma de esas franjas, en px
  desborde: 0,     // scrollWidth > innerWidth — esto ya está limpio, y sigue
  notas: 50,       // bloques de nota a la vista (el sistema admite 59)
  pendientes: 24,  // huecos «TO WRITE» declarados
  repes: 9,        // rótulos que salen 8 veces o más («↓» ×18, «To write» ×16)
  apagados: 0      // bloques que nunca llegan a verse — el fallo de Safari 16.6
};
// ═══════════════════════════════════════════════════════════════════════════
const arg = (n, d) => {
  const p = process.argv.find((a) => a.startsWith('--' + n + '='));
  return p ? p.slice(n.length + 3) : d;
};
const bandera = (n) => process.argv.includes('--' + n);

const RAIZ = arg('dist', 'dist');
const RUTA = '/cv/vista-previa.html';
const MOTORES = arg('motores', 'chromium,webkit').split(',').filter(Boolean);
const ANCHOS = arg('anchos', '1440,1920').split(',').filter(Boolean).map(Number);
const IDIOMAS = arg('idiomas', 'en,es').split(',').filter(Boolean);
const LISTA = Number(arg('lista', '20'));
const JSON_SALIDA = arg('json', '');
const SIN_TOPES = bandera('sin-topes');
const ALTOS = { 1440: 900, 1920: 1080, 1280: 800, 1536: 864 };

let pw;
try {
  pw = await import('playwright');
} catch {
  console.error('[sistema] falta Playwright. Instálalo suelto y vuelve:');
  console.error('[sistema]   npm i --no-save playwright && npx playwright install chromium webkit');
  console.error('[sistema] NO se ha medido nada.');
  process.exit(1);
}
if (!fs.existsSync(path.join(RAIZ, RUTA.slice(1)))) {
  console.error('[sistema] no está ' + path.join(RAIZ, RUTA.slice(1)) + '.');
  console.error('[sistema] Ese archivo solo se emite sin CV_SLUG: CV_SLUG= npm run build');
  process.exit(1);
}

const TIPO = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webm': 'video/webm',
  '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml'
};
const raizAbs = path.resolve(RAIZ);
const servidor = http.createServer((req, res) => {
  let f = path.join(raizAbs, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(raizAbs)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TIPO[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${servidor.address().port}`;

// ═══════════════════════════════════════════════════════════════════════════
// LA SONDA. Todo lo que se mide sale de UNA pasada dentro de la página, para
// que ningún número se lea de un estado distinto que otro.
//
// TRES TRAMPAS, escritas aquí porque cada una costó una medición entera:
//  · `getComputedStyle` bajo animaciones por scroll da valores rancios; se leen
//    CAJAS (`getBoundingClientRect`) y, para el tamaño de letra, el estilo del
//    PADRE del nodo de texto, que no lo anima nadie.
//  · La aparición por scroll deja el documento ~14 % corto si no se recorre
//    antes; por eso el recorrido va DOS veces y con `loading="eager"` forzado.
//  · Con `file://` la hoja no carga y salen los dos paneles de idioma: se sirve
//    por HTTP, como ya hace medir-cv.mjs.
// ═══════════════════════════════════════════════════════════════════════════
const SONDA = (lang) => {
  const raiz = document.querySelector(lang === 'es' ? '.cv-es' : '.cv-en');
  if (!raiz) return { error: 'no encuentro el panel de idioma .cv-' + lang };
  const Y = window.scrollY;
  const abs = (r) => ({ t: r.top + Y, b: r.bottom + Y, l: r.left, r: r.right, w: r.width, h: r.height });

  const sel = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    const t = el.tagName.toLowerCase();
    const id = el.id ? '#' + el.id : '';
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return t + id + (cls.length ? '.' + cls.join('.') : '');
  };
  const cadena = (el) => {
    const p = [];
    for (let n = el; n && n !== raiz && p.length < 4; n = n.parentElement) p.unshift(sel(n));
    return p.join(' > ');
  };
  const seVe = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // ¿Está dentro de un <details> cerrado? El contenido sigue en el DOM y con
  // caja: hay que preguntar por el `open` del ancestro, no por `display`.
  // Regla del sistema §3.4 (x): lo plegado NO cuenta como tinta a la vista.
  const plegado = (el) => {
    for (let n = el; n && n !== raiz; n = n.parentElement) {
      const d = n.parentElement;
      if (d && d.tagName === 'DETAILS' && !d.open && n.tagName !== 'SUMMARY') return true;
    }
    return false;
  };
  // La TAPA está fuera del sistema por decisión escrita: es una portada a
  // sangre con su propia tipografía de cartel, medida aparte por
  // check-contraste-cv.mjs. El sistema empieza en el capítulo 2.
  const enTapa = (el) => !!el.closest('.cap-portada, .portada-uno, .portada-dos');

  const fuera = (el) => plegado(el) || enTapa(el) || !seVe(el);

  const out = {
    tamanos: [], tarjetas: [], fotos: [], pasos: [], huecos: [], parejas: [],
    notas: 0, pendientes: 0, repes: [], apagados: [], texto: [],
    alto: 0, desborde: 0, tinta: 0, filas: 0
  };

  // ── 1 · TAMAÑOS DE TEXTO ────────────────────────────────────────────────
  // Un nodo de texto con contenido; el tamaño se lee de su elemento padre.
  const vistos = new Map();
  const it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const rotulos = new Map();
  for (let n = it.nextNode(); n; n = it.nextNode()) {
    const txt = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || fuera(el)) continue;
    const fs = Math.round(parseFloat(getComputedStyle(el).fontSize) * 2) / 2;
    if (!vistos.has(fs)) vistos.set(fs, { px: fs, n: 0, donde: cadena(el), muestra: txt.slice(0, 40) });
    vistos.get(fs).n++;
    // ── 8 · REPETICIONES. Un rótulo corto que sale 8 veces o más no informa
    //    de nada (§3.4 x). Solo cuentan los cortos: un párrafo repetido es
    //    otro problema, y la prosa larga no se repite por accidente.
    if (txt.length <= 90) {
      const k = txt.toLowerCase();
      if (!rotulos.has(k)) rotulos.set(k, { texto: txt.slice(0, 60), n: 0, donde: cadena(el) });
      rotulos.get(k).n++;
    }
  }
  out.tamanos = [...vistos.values()].sort((a, b) => b.px - a.px);
  out.repes = [...rotulos.values()].filter((r) => r.n >= 8).sort((a, b) => b.n - a.n);

  // ── 2 · TARJETAS OSCURAS ────────────────────────────────────────────────
  // Se reconocen por clase declarada (.sf-tarjeta, la del sistema) y por las
  // que hoy hacen ese papel en el documento (.cita, .tile). Si mañana nace
  // otra, se añade aquí — o mejor, se le pone .sf-tarjeta.
  for (const el of raiz.querySelectorAll('.sf-tarjeta, li.cita, .tarjeta')) {
    if (fuera(el)) continue;
    const r = abs(el.getBoundingClientRect());
    out.tarjetas.push({ donde: cadena(el), w: Math.round(r.w), h: Math.round(r.h), y: Math.round(r.t) });
  }

  // ── 2b · LA PAREJA CON UN NÚMERO DE HIJOS QUE NO ES DOS ─────────────────
  // §3.3 regla 2: una fila de dos columnas contiene EXACTAMENTE dos hijos.
  // Los huecos del CV salen de filas con tres bloques a un lado y uno al otro.
  // Esto NO se marca en rojo en el CSS a propósito (lo abriría un comité de
  // admisiones); se cuenta aquí, que corre antes del PR.
  for (const el of raiz.querySelectorAll('.sf-par')) {
    if (fuera(el)) continue;
    const n = [...el.children].length;
    if (n !== 2 && n !== 1) out.parejas.push({ donde: cadena(el), n });
  }

  // ── 3 · FOTOS ───────────────────────────────────────────────────────────
  for (const el of raiz.querySelectorAll('img, video, canvas')) {
    if (fuera(el)) continue;
    const r = el.getBoundingClientRect();
    out.fotos.push({
      donde: cadena(el),
      w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + Y),
      alt: (el.getAttribute('alt') || el.getAttribute('aria-label') || '').slice(0, 48)
    });
  }

  // ── 4 · PASOS DE AIRE ───────────────────────────────────────────────────
  // Entre HERMANOS consecutivos. «Entre bloques» = hijos directos de una
  // `section.cap`; lo demás es «dentro». Los solapes (negativos) y lo que
  // está en la misma línea (mismo `top`) no son aire y no se cuentan.
  const secciones = [...raiz.querySelectorAll('section.cap, .sf-doc, .sf-util')];
  const bloques = new Set(secciones);
  const contenedores = new Set([raiz, ...raiz.querySelectorAll('*')]);
  for (const cont of contenedores) {
    const hijos = [...cont.children].filter((e) => !fuera(e));
    for (let i = 1; i < hijos.length; i++) {
      const a = hijos[i - 1].getBoundingClientRect(), b = hijos[i].getBoundingClientRect();
      if (b.top <= a.bottom) continue;                    // solape o misma fila
      const d = Math.round(b.top - a.bottom);
      if (d === 0) continue;
      out.pasos.push({
        entre: bloques.has(cont), d,
        donde: sel(cont) + ' : ' + sel(hijos[i - 1]) + ' → ' + sel(hijos[i]),
        y: Math.round(a.bottom + Y)
      });
    }
  }

  // ── 5 · LA MÁSCARA DE TINTA ─────────────────────────────────────────────
  // No se lee de una captura: se arma con las cajas de todo lo que PINTA
  // —nodos de texto, imágenes, vídeos, lienzos, y cualquier elemento con
  // fondo o borde visible—, en filas de 4 px. Es la vara de la auditoría.
  //
  // Y SOLO CUENTA LO QUE CAE DENTRO DE LA COLUMNA ÚTIL (980 px centrados en la
  // ventana), que es lo que la hace parecerse a leer. Con la ventana entera,
  // una fila donde solo pinta una miniatura arrinconada en el margen derecho
  // cuenta como llena, y esa fila es justo la queja de Jaime: «hay un montón
  // de espacios blancos… a la derecha hay mucho texto». La auditoría midió
  // así los 8 756 px vacíos de lado a lado; con la ventana entera salen 1 680.
  const alto = Math.max(document.documentElement.scrollHeight, raiz.getBoundingClientRect().height + Y);
  const UTIL = 980;
  const colI = Math.max(0, (window.innerWidth - UTIL) / 2), colF = colI + UTIL;
  const FILA = 4;
  const filas = Math.ceil(alto / FILA);
  const mapa = new Uint8Array(filas);
  const marca = (r) => {
    if (r.width <= 0 || r.height <= 0) return;
    if (r.right <= colI || r.left >= colF) return;   // fuera de la columna útil
    const t = Math.floor((r.top + Y) / FILA), b = Math.ceil((r.bottom + Y) / FILA);
    for (let i = Math.max(0, t); i < Math.min(filas, b); i++) mapa[i] = 1;
  };
  const it2 = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const rango = document.createRange();
  for (let n = it2.nextNode(); n; n = it2.nextNode()) {
    if (!(n.nodeValue || '').trim()) continue;
    const el = n.parentElement;
    if (!el || plegado(el) || !seVe(el)) continue;
    rango.selectNodeContents(n);
    for (const r of rango.getClientRects()) marca(r);
  }
  for (const el of raiz.querySelectorAll('img, video, canvas, svg, hr, picture, iframe')) {
    if (plegado(el) || !seVe(el)) continue;
    marca(el.getBoundingClientRect());
  }
  for (const el of raiz.querySelectorAll('*')) {
    if (plegado(el) || !seVe(el)) continue;
    const cs = getComputedStyle(el);
    const fondo = cs.backgroundColor && !/rgba?\((?:0, 0, 0, 0|0,0,0,0)\)/.test(cs.backgroundColor)
      && cs.backgroundColor !== 'transparent';
    const img = cs.backgroundImage && cs.backgroundImage !== 'none';
    const borde = ['Top', 'Right', 'Bottom', 'Left'].some((l) =>
      parseFloat(cs['border' + l + 'Width']) > 0 && cs['border' + l + 'Style'] !== 'none');
    if (fondo || img || borde) marca(el.getBoundingClientRect());
  }
  let tinta = 0;
  for (let i = 0; i < filas; i++) if (mapa[i]) tinta++;
  out.tinta = tinta; out.filas = filas; out.alto = Math.round(alto);
  // Las franjas: rachas de filas vacías. Se ignora lo que hay debajo del
  // último píxel de tinta (el pie del documento no es un hueco).
  let ultima = 0;
  for (let i = filas - 1; i >= 0; i--) if (mapa[i]) { ultima = i; break; }
  let ini = -1;
  for (let i = 0; i <= ultima; i++) {
    if (!mapa[i]) { if (ini < 0) ini = i; continue; }
    if (ini >= 0) {
      const px = (i - ini) * FILA;
      if (px > 160) out.huecos.push({ y: ini * FILA, px, pct: +((ini * FILA / alto) * 100).toFixed(1) });
      ini = -1;
    }
  }

  // ── 6 · DESBORDE HORIZONTAL ─────────────────────────────────────────────
  out.desborde = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

  // ── 7 · NOTAS Y HUECOS PENDIENTES ───────────────────────────────────────
  const esNota = (el) => !plegado(el) && seVe(el);
  out.notas = [...raiz.querySelectorAll('.meta-mono, .sf-nota, .nota, .fuente, .pie-fuente')]
    .filter(esNota).length;
  out.pendientes = [...raiz.querySelectorAll('.hueco, .hueco-mat, .foto-hueco, .sf-pendiente, .pendiente')]
    .filter(esNota).length;

  // ── 8b · LO QUE SE QUEDA APAGADO ────────────────────────────────────────
  // WebKit 16.6 no tiene `animation-timeline`. Un bloque cuyo estado final
  // dependa de un scroll-timeline se queda en opacity: 0 PARA SIEMPRE en la
  // Mac de Jaime, y ninguna captura de Chrome lo enseña.
  //
  // NO SE PUEDE MEDIR ESTO CON EL BLOQUE FUERA DE PANTALLA, y esa trampa costó
  // la primera corrida: en Chromium una animación `view()` pone opacity 0 a
  // TODO lo que está lejos del pliegue —es su estado correcto, no un fallo—,
  // así que la primera medición acusó a los ocho titulares de un defecto que
  // no tienen. Lo que se pregunta es otra cosa: ¿llegó este bloque a VERSE
  // alguna vez mientras pasaba por la pantalla? La opacidad máxima de cada
  // candidato se apunta durante el segundo recorrido (`window.__sfVistos`), y
  // aquí solo se lee. Un bloque que nunca pasó de 0.01 estando a la vista es
  // el fallo que ve la Mac de Jaime.
  const apuntados = window.__sfVistos || new Map();
  for (const el of raiz.querySelectorAll('section.cap, section.cap > *, .sf-doc > *')) {
    if (plegado(el) || enTapa(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const max = apuntados.get(el);
    if (max === undefined) continue;          // nunca cruzó la pantalla: no se juzga
    if (max <= 0.01) out.apagados.push({ donde: cadena(el), y: Math.round(r.top + Y), opacidad: max });
  }
  out.soporta = {
    scroll: !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')),
    subgrid: !!(window.CSS && CSS.supports && CSS.supports('grid-template-rows: subgrid'))
  };
  return out;
};

// ═══════════════════════════════════════════════════════════════════════════
// EL RECORRIDO
// ═══════════════════════════════════════════════════════════════════════════
const combos = [];
for (const motor of MOTORES) for (const w of ANCHOS) for (const idioma of IDIOMAS) combos.push({ motor, w, idioma });

const medidas = [];
for (const motor of MOTORES) {
  let nav;
  try {
    nav = await pw[motor].launch();
  } catch (e) {
    console.error(`[sistema] no arranca ${motor}: ${e.message.split('\n')[0]}`);
    console.error(`[sistema]   npx playwright install ${motor}`);
    console.error('[sistema] NO se ha medido nada con ese motor, y eso NO es un aprobado.');
    await new Promise((r) => servidor.close(r));
    process.exit(1);
  }
  for (const c of combos.filter((x) => x.motor === motor)) {
    const alto = ALTOS[c.w] || 900;
    const ctx = await nav.newContext({ viewport: { width: c.w, height: alto }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    // `scroll-behavior: smooth` convierte cada salto del recorrido en una
    // animación y el recorrido deja de recorrer. Se anula nada más cargar.
    await page.goto(BASE + RUTA + (c.idioma === 'es' ? '#es' : ''), { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html,body,*{scroll-behavior:auto !important}' });
    await page.evaluate(() => {
      for (const i of document.querySelectorAll('img,iframe')) i.setAttribute('loading', 'eager');
    });
    for (let pasada = 0; pasada < 2; pasada++) {
      // El SEGUNDO recorrido, además de despertar la aparición por scroll,
      // apunta la opacidad MÁXIMA de cada bloque mientras cruza la pantalla:
      // es el único momento en que esa cifra significa algo (ver 8b).
      await page.evaluate(async ({ vh, apuntar }) => {
        if (apuntar) window.__sfVistos = new Map();
        const candidatos = apuntar
          ? [...document.querySelectorAll('section.cap, section.cap > *, .sf-doc > *')]
          : [];
        const paso = Math.round(vh * 0.8);
        const mirar = () => {
          for (const el of candidatos) {
            const r = el.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh || r.width <= 0 || r.height <= 0) continue;
            const o = parseFloat(getComputedStyle(el).opacity);
            const p = window.__sfVistos.get(el);
            if (p === undefined || o > p) window.__sfVistos.set(el, o);
          }
        };
        for (let y = 0; y < document.documentElement.scrollHeight + vh; y += paso) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 25));
          if (apuntar) { mirar(); await new Promise((r) => setTimeout(r, 40)); mirar(); }
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 120));
        if (apuntar) mirar();
      }, { vh: alto, apuntar: pasada === 1 });
    }
    await page.waitForTimeout(300);
    const m = await page.evaluate(SONDA, c.idioma);
    if (m.error) { console.error('[sistema] ' + m.error); process.exit(1); }
    medidas.push({ ...c, ...m });
    await ctx.close();
    process.stderr.write(`[sistema] medido ${motor} ${c.w} ${c.idioma}: ${m.alto} px\n`);
  }
  await nav.close();
}
await new Promise((r) => servidor.close(r));

// ═══════════════════════════════════════════════════════════════════════════
// EL VEREDICTO
// ═══════════════════════════════════════════════════════════════════════════
const cerca = (v, lista, tol = TOL) => lista.some((x) => Math.abs(v - x) <= tol);
const etq = (m) => `${m.motor} ${m.w} ${m.idioma}`;
const infra = { tamanos: [], tarjetas: [], parejas: [], fotos: [], pisos: [], pasos: [], huecos: [], desborde: [], notas: [], pendientes: [], repes: [], apagados: [] };

// ── `combo` Y `donde` SON DOS COSAS, Y LLEGARON A SER UNA ──────────────────
// La sonda devuelve cada infracción con un `donde` que es SU SELECTOR. El
// motor y el ancho se añaden aquí. Escrito `{ donde: etq(m), ...t }` el spread
// pisa la etiqueta con el selector y el informe pierde en qué motor y a qué
// ancho pasó — que es justo lo que se mira, porque «solo en webkit» y «en los
// dos» son dos problemas distintos: el primero lo ve Jaime en su Mac y no lo
// enseña ninguna captura de Chrome. Va en una clave PROPIA.
for (const m of medidas) {
  for (const t of m.tamanos) if (!cerca(t.px, TAMANOS, 0.5)) infra.tamanos.push({ combo: etq(m), px: t.px, n: t.n, sel: t.donde, muestra: t.muestra });
  for (const t of m.tarjetas) if (Math.abs(t.w - TARJETA.w) > 0.5 || Math.abs(t.h - TARJETA.h) > 0.5) infra.tarjetas.push({ ...t, combo: etq(m) });
  for (const p of m.parejas || []) infra.parejas.push({ ...p, combo: etq(m) });
  for (const f of m.fotos) {
    if (!cerca(f.w, ANCHOS_FOTO)) infra.fotos.push({ ...f, combo: etq(m) });
    if (f.w < PISO_FOTO) infra.pisos.push({ ...f, combo: etq(m) });
  }
  for (const p of m.pasos) {
    const ok = p.entre ? cerca(p.d, PASOS_ENTRE) : cerca(p.d, [...PASOS_DENTRO, ...PASOS_ENTRE]);
    if (!ok) infra.pasos.push({ ...p, combo: etq(m) });
  }
  for (const h of m.huecos) infra.huecos.push({ ...h, combo: etq(m) });
  if (m.desborde > 0) infra.desborde.push({ combo: etq(m), px: m.desborde });
  if (m.notas > NOTAS_MAX) infra.notas.push({ combo: etq(m), n: m.notas });
  infra.pendientes.push({ combo: etq(m), n: m.pendientes });
  for (const r of m.repes) infra.repes.push({ ...r, combo: etq(m) });
  for (const a of m.apagados) infra.apagados.push({ ...a, combo: etq(m) });
}

// Las cuentas que mandan: el PEOR de los combos, no la suma (medir dos idiomas
// no puede duplicar la deuda de un mismo defecto).
const peor = (fn) => Math.max(0, ...medidas.map(fn));
const cuenta = {
  tamanos: peor((m) => m.tamanos.filter((t) => !cerca(t.px, TAMANOS, 0.5)).length),
  tarjetas: peor((m) => m.tarjetas.filter((t) => Math.abs(t.w - TARJETA.w) > 0.5 || Math.abs(t.h - TARJETA.h) > 0.5).length),
  parejas: peor((m) => (m.parejas || []).length),
  fotos: peor((m) => m.fotos.filter((f) => !cerca(f.w, ANCHOS_FOTO)).length),
  pisos: peor((m) => m.fotos.filter((f) => f.w < PISO_FOTO).length),
  pasos: peor((m) => m.pasos.filter((p) => !(p.entre ? cerca(p.d, PASOS_ENTRE) : cerca(p.d, [...PASOS_DENTRO, ...PASOS_ENTRE]))).length),
  huecos: peor((m) => m.huecos.length),
  huecoPx: peor((m) => m.huecos.reduce((s, h) => s + h.px, 0)),
  desborde: peor((m) => m.desborde),
  notas: peor((m) => m.notas),
  pendientes: peor((m) => m.pendientes),
  repes: peor((m) => m.repes.length),
  apagados: peor((m) => m.apagados.length)
};

const NOMBRE = {
  tamanos: '1 · TAMAÑOS fuera de los ocho (56 40 24 21 19 17 14 12)',
  tarjetas: '2a · TARJETAS oscuras que no miden 482 × 288',
  parejas: '2b · PAREJAS (.sf-par) con un número de hijos que no es dos',
  fotos: '3a · FOTOS con un ancho que no es del sistema',
  pisos: '3b · FOTOS por debajo del piso de 308 px',
  pasos: '4 · AIRE que no es un paso (entre 16·44·72·80 · dentro 8·20)',
  huecos: '5a · FRANJAS de más de 160 px sin tinta',
  huecoPx: '5b · PÍXELES vacíos, sumados',
  desborde: '6 · DESBORDE horizontal (scrollWidth > innerWidth)',
  notas: '7a · NOTAS a la vista (tope del sistema: 59)',
  pendientes: '7b · HUECOS «TO WRITE» declarados',
  repes: '8a · RÓTULOS repetidos 8 veces o más',
  apagados: '8b · BLOQUES apagados (opacity 0) tras recorrer — el fallo de Safari'
};

const L = [];
L.push('');
L.push('══════════════════════════════════════════════════════════════════════');
L.push('  EL GUARDIÁN DEL SISTEMA — CV de Jaime Sandoval Ricaño');
L.push('  Sistema: Apple Newsroom / Stories · cv-material/ola5/SISTEMA-REFERENCIA.md');
L.push('══════════════════════════════════════════════════════════════════════');
for (const m of medidas) {
  const sinTinta = m.filas ? (100 - (m.tinta / m.filas) * 100).toFixed(0) : '?';
  L.push(`  ${etq(m).padEnd(20)} ${String(m.alto).padStart(6)} px · ${(m.alto / (ALTOS[m.w] || 900)).toFixed(1)} pantallas · ${sinTinta}% de filas sin tinta` +
    (m.soporta && !m.soporta.scroll ? '  · sin animation-timeline' : ''));
}
L.push('');

let fallos = 0;
const linea = (k) => {
  const n = cuenta[k], tope = TOPES[k] ?? 0;
  const mal = n > tope;
  if (mal) fallos++;
  L.push(`${mal ? '✗' : '·'} ${NOMBRE[k]}`);
  L.push(`   ${String(n).padStart(6)}   tope ${tope}${mal ? '   ← SUPERADO' : (n ? '   (deuda dentro del tope)' : '   limpio')}`);
  return mal;
};

for (const k of ['tamanos', 'tarjetas', 'parejas', 'fotos', 'pisos', 'pasos', 'huecos', 'huecoPx', 'desborde', 'notas', 'pendientes', 'repes', 'apagados']) {
  linea(k);
  const lista = k === 'huecoPx' ? infra.huecos : infra[k];
  if (!lista || !lista.length) { L.push(''); continue; }
  // Se imprime UNA vez por infracción distinta, no una por combo — pero SE
  // DICE EN CUÁLES SALIÓ. «solo en webkit 1920» y «en los cuatro» piden cosas
  // distintas: lo primero es un defecto de motor que ninguna captura de Chrome
  // enseña (y que la Mac de Jaime SÍ ve), lo segundo es del documento.
  const clave = (x) => JSON.stringify([x.sel || x.donde || x.texto || x.alt || '', x.px, x.d, x.w, x.h, x.y, x.n]);
  const juntos = new Map();
  for (const x of lista) {
    const c = clave(x);
    if (!juntos.has(c)) juntos.set(c, { x, combos: new Set() });
    juntos.get(c).combos.add(x.combo);
  }
  const unicos = [...juntos.values()];
  const donde = ({ combos }) =>
    combos.size >= medidas.length ? `[los ${combos.size} combos]` : `[${[...combos].join(' · ')}]`;
  for (const u of unicos.slice(0, LISTA)) {
    const x = u.x;
    if (k === 'tamanos') L.push(`     ${String(x.px).padStart(6)} px · ${x.n} nodos · ${x.sel}  «${x.muestra}»  ${donde(u)}`);
    else if (k === 'tarjetas') L.push(`     ${x.w}×${x.h} en y=${x.y} ${x.w !== TARJETA.w ? '(ancho)' : ''}${x.h !== TARJETA.h ? '(alto)' : ''}  ${x.donde}  ${donde(u)}`);
    else if (k === 'fotos' || k === 'pisos') L.push(`     ${String(x.w).padStart(5)}×${String(x.h).padEnd(5)} en y=${x.y}  «${x.alt}»  ${donde(u)}`);
    else if (k === 'pasos') L.push(`     ${String(x.d).padStart(5)} px ${x.entre ? 'entre' : 'dentro'} en y=${x.y}  ${x.donde}  ${donde(u)}`);
    else if (k === 'huecos' || k === 'huecoPx') L.push(`     ${String(x.px).padStart(5)} px vacíos desde y=${x.y}  (${x.pct}% del documento)  ${donde(u)}`);
    else if (k === 'desborde') L.push(`     ${x.px} px de más  ${donde(u)}`);
    else if (k === 'parejas') L.push(`     ${x.n} hijos  ${x.donde}  ${donde(u)}`);
    else if (k === 'repes') L.push(`     ×${String(x.n).padStart(3)}  «${x.texto}»  ${donde(u)}`);
    else if (k === 'apagados') L.push(`     opacity ${x.opacidad} en y=${x.y}  ${x.donde}  ${donde(u)}`);
    else if (k === 'notas' || k === 'pendientes') L.push(`     ${x.n}  ${donde(u)}`);
  }
  if (unicos.length > LISTA) L.push(`     … y ${unicos.length - LISTA} más`);
  L.push('');
}

L.push('──────────────────────────────────────────────────────────────────────');
if (SIN_TOPES) {
  L.push('  --sin-topes: se ha medido y NO se falla. Copia las cuentas a TOPES.');
  L.push('  TOPES = ' + JSON.stringify(cuenta));
} else if (fallos) {
  L.push(`  ✗ ${fallos} prueba(s) por encima de su tope. El sistema se ha roto por ahí.`);
} else {
  L.push('  ✓ Ninguna prueba supera su tope. La deuda no ha crecido.');
  L.push('  Bajar los topes es el trabajo; llegar a 0 en todos es «terminado».');
}
L.push('──────────────────────────────────────────────────────────────────────');
console.log(L.join('\n'));

if (JSON_SALIDA) {
  fs.writeFileSync(JSON_SALIDA, JSON.stringify({ cuenta, topes: TOPES, infra, medidas: medidas.map((m) => ({ motor: m.motor, w: m.w, idioma: m.idioma, alto: m.alto, tinta: m.tinta, filas: m.filas, soporta: m.soporta })) }, null, 2));
  console.log('[sistema] JSON en ' + JSON_SALIDA);
}
process.exit(SIN_TOPES ? 0 : (fallos ? 1 : 0));
