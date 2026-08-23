#!/usr/bin/env node
/*
 * Genera la og:image PROPIA de cada página de contenido: public/og/<nombre>.jpg
 * y su variante <nombre>-es.jpg.
 *
 * POR QUÉ EXISTE
 * --------------
 * El sitio tenía tres og:image (portada, mercado, lecciones) y todo lo demás
 * caía en la genérica. Compartir una lección, un reporte de research, una
 * noticia o una calculadora enseñaba siempre la misma tarjeta con la foto de
 * Jaime: en un chat de WhatsApp seis lecciones distintas se veían idénticas.
 * Aquí cada página tiene su tarjeta, con su titular y su etiqueta.
 *
 * EN QUÉ SE DIFERENCIA DE scripts/build-og.js
 * -------------------------------------------
 * build-og.js NO redibuja: parte del JPG en inglés y reescribe renglones
 * encima. Sigue siendo el dueño de og-image{-es}.jpg, og-market{-es}.jpg y
 * og-lessons{-es}.jpg — las tres con foto. Este script es lo contrario: dibuja
 * desde cero, sin foto, y solo escribe dentro de public/og/.
 *
 * EL LENGUAJE VISUAL SALE DE MEDIR LAS TRES QUE YA EXISTEN
 * -------------------------------------------------------
 * Fondo #0A0A0A, margen izquierdo en x=80, guion verde de 56×4 en y=136,
 * línea divisoria de 1 px (#1F1F1F) en y=537 de 80 a 1120, y el renglón mono
 * del pie con la línea base en y=581. Todo eso está medido píxel a píxel sobre
 * public/og-market.jpg, no inventado: por eso las nuevas se ven de la misma
 * familia aunque no lleven foto. El verde sí es el de los tokens del sitio
 * (--brand-fill #16C47F, src/styles/tokens.css); el de las tres viejas es más
 * apagado porque son anteriores a los tokens.
 *
 * LAS FUENTES (esta es la parte que se rompe sola)
 * -----------------------------------------------
 * Son las del sitio: public/assets/fonts/*.woff2. librsvg no sabe leer woff2
 * ni @font-face, así que se descomprimen a .ttf en una carpeta temporal y se
 * le pasan a fontconfig por FONTCONFIG_PATH — igual que en build-og.js, misma
 * carpeta y mismo fonts.conf. Esa variable se lee cuando la librería arranca,
 * antes de que este archivo pueda tocarla, así que el script se relanza a sí
 * mismo una vez con el entorno ya puesto.
 *
 * Y hace falta una segunda variable: PANGOCAIRO_BACKEND=fc. En macOS pango se
 * compila con el backend de CoreText y entonces IGNORA fontconfig: pide
 * "Fraunces SemiBold", no la encuentra instalada en el sistema y dibuja con la
 * de respaldo sin decir nada. En Linux (el build de Vercel) el backend ya es
 * fontconfig y la variable no cambia nada. Sin ella, en un Mac, todo sale en
 * una sans genérica y el fallo es silencioso.
 *
 * DÓNDE ESTÁ EL TEXTO
 * -------------------
 * Nada se escribe dos veces. Los titulares salen de donde ya viven:
 *   lecciones  → frontmatter de src/content/lessons/{en,es}/<slug>.mdx
 *   noticias   → src/data/news/*.json
 *   activos    → src/data/symbols.ts
 *   research   → content/research/<slug>/meta.yaml
 * Solo las etiquetas de las páginas fijas (/tools, /community, /market, /news)
 * están aquí abajo, en TARJETAS_FIJAS.
 *
 * QUE NO SE SALGA EL TEXTO
 * ------------------------
 * El español es más largo que el inglés casi siempre, así que no hay
 * coordenadas escritas a mano: se mide el ancho real de cada renglón leyendo
 * las tablas hmtx/cmap del .ttf (el mismo que va a dibujar librsvg), se parten
 * los titulares en líneas equilibradas y se baja el cuerpo hasta que el bloque
 * cabe. Al final se comprueba la tinta del JPG ya renderizado contra los
 * márgenes; si algo se sale, avisa.
 *
 * CÓMO SE USA
 * -----------
 *   node scripts/build-og-pages.mjs           (y npm lo corre solo en prebuild)
 *   node scripts/build-og-pages.mjs --strict  (sale con error si hay avisos)
 *
 * Las imágenes se commitean. En el build de Vercel el script se vuelve a
 * correr y, si algo falla, AVISA Y SIGUE con código 0: las páginas ya apuntan
 * a las imágenes commiteadas y, si alguna faltara, caen a la genérica. Un
 * despliegue no se cae por una tarjeta.
 *
 * QUIÉN SABE QUÉ IMÁGENES EXISTEN
 * -------------------------------
 * src/generated/og-pages.json, que escribe este script. Las páginas lo leen
 * por src/lib/og.ts y, si su nombre no está, dejan que Base.astro caiga a la
 * og:image genérica. Se hace así y no con fs.existsSync porque el repo no
 * tiene @types/node y `astro check` falla al ver `node:fs` (misma razón por la
 * que src/lib/research/reports.ts lee con import.meta.glob).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ESTE = fileURLToPath(import.meta.url);
const RAIZ = path.join(path.dirname(ESTE), '..');
const PUBLICO = path.join(RAIZ, 'public');
const SALIDA = path.join(PUBLICO, 'og');
const FUENTES = path.join(PUBLICO, 'assets', 'fonts');
const MANIFIESTO = path.join(RAIZ, 'src', 'generated', 'og-pages.json');
// La misma carpeta que build-og.js: los .ttf descomprimidos se comparten.
const TMP = path.join(os.tmpdir(), 'smartfinance-og-fuentes');

const ESTRICTO = process.argv.includes('--strict');
const avisos = [];
const aviso = (m) => { avisos.push(m); };

// ============================================================ 1. sistema visual

const ANCHO = 1200, ALTO = 630;

const FONDO = '#0A0A0A';   // medido en las tres og:image que ya existen
const TINTA = '#F5F5F2';   // --ink
const SUAVE = '#B8B8BA';   // el gris de los subtítulos de la familia
const GRIS = '#8A8A8E';    // --muted, el renglón del pie
const VERDE = '#16C47F';   // --brand-fill (src/styles/tokens.css)
const LINEA = '#1F1F1F';   // la divisoria, medida en og-market.jpg

const DISPLAY = 'Fraunces SemiBold';
const SANS = 'Geist';
const MONO = 'Geist Mono Medium';

const MARGEN = 80;                 // margen izquierdo de toda la familia
const DERECHA = ANCHO - MARGEN;    // 1120: donde termina la divisoria
const CAJA = DERECHA - MARGEN;     // 1040 de ancho útil

const GUION = { x: MARGEN, y: 136, w: 56, h: 4 };
const BASE_ETIQUETA = 186;         // línea base del eyebrow
const DIVISORIA_Y = 537;
const BASE_PIE = 581;

// El bloque de texto (titular + bajada) se CENTRA en la franja que queda entre
// el eyebrow y la divisoria. Anclarlo arriba o abajo dejaba un hueco enorme del
// otro lado en las tarjetas de una o dos líneas; centrado, un titular corto y
// uno de tres líneas con bajada se ven igual de intencionados.
const CENTRO_BLOQUE = 362;
const TOPE_ARRIBA = 226;           // no puede subir más: ahí está el eyebrow
const TOPE_ABAJO = 508;            // ni bajar más: ahí está la divisoria

const TAM_ETIQUETA = 19, LS_ETIQUETA = 1.6;
const TAM_PIE = 19, LS_PIE = 1;
const TAMANOS_TITULAR = [78, 72, 66, 60, 55, 50, 46, 42, 38];
const MAX_LINEAS_TITULAR = 3;
const TAMANOS_BAJADA = [27, 25, 23];
const MAX_LINEAS_BAJADA = 2;
const CAJA_BAJADA = 960;           // la bajada mide un poco menos que el titular
const INTERLINEA_BAJADA = 38;      // la de la familia

const MARCA = 'smartfinance.lat';

// ================================================================= 2. fuentes

/*
 * Descomprime las woff2 del sitio a .ttf y deja un fonts.conf apuntando a esa
 * carpeta. La carpeta de caché tiene que EXISTIR: si no, fontconfig ni
 * siquiera escanea el directorio y todo sale con la fuente de respaldo.
 */
async function prepararFuentes() {
  const woff2 = require('wawoff2');
  const cache = path.join(TMP, 'cache');
  fs.mkdirSync(cache, { recursive: true });
  for (const archivo of fs.readdirSync(FUENTES)) {
    if (!archivo.endsWith('.woff2')) continue;
    const destino = path.join(TMP, archivo.replace(/\.woff2$/, '.ttf'));
    if (fs.existsSync(destino)) continue;
    const ttf = await woff2.decompress(fs.readFileSync(path.join(FUENTES, archivo)));
    fs.writeFileSync(destino, Buffer.from(ttf));
  }
  fs.writeFileSync(path.join(TMP, 'fonts.conf'),
    '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
    '  <dir>' + TMP.replace(/\\/g, '/') + '</dir>\n' +
    '  <cachedir>' + cache.replace(/\\/g, '/') + '</cachedir>\n</fontconfig>\n');
}

// ---- métricas: las mismas tablas del .ttf que va a usar librsvg -------------

/** Directorio de tablas de un .ttf/.otf. */
function tablas(b) {
  const n = b.readUInt16BE(4), t = {};
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    t[b.toString('ascii', o, o + 4)] = { off: b.readUInt32BE(o + 8), len: b.readUInt32BE(o + 12) };
  }
  return t;
}

/** cmap → Map(codePoint → glyphId). Formatos 4 (BMP) y 12 (completo). */
function leerCmap(b, t) {
  const o = t.cmap.off, n = b.readUInt16BE(o + 2);
  let mejor = null;
  for (let i = 0; i < n; i++) {
    const r = o + 4 + i * 8, pid = b.readUInt16BE(r), eid = b.readUInt16BE(r + 2), off = b.readUInt32BE(r + 4);
    const puntos = (pid === 3 && eid === 10) ? 4 : (pid === 3 && eid === 1) ? 3 : (pid === 0) ? 2 : 0;
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { puntos, sub: o + off };
  }
  if (!mejor) throw new Error('cmap sin subtabla Unicode');
  const m = new Map(), sub = mejor.sub, fmt = b.readUInt16BE(sub);
  if (fmt === 4) {
    const segX2 = b.readUInt16BE(sub + 6), seg = segX2 / 2;
    const finO = sub + 14, iniO = finO + segX2 + 2, deltaO = iniO + segX2, rangoO = deltaO + segX2;
    for (let i = 0; i < seg; i++) {
      const fin = b.readUInt16BE(finO + i * 2), ini = b.readUInt16BE(iniO + i * 2);
      const delta = b.readInt16BE(deltaO + i * 2), ro = b.readUInt16BE(rangoO + i * 2);
      if (ini === 0xffff) continue;
      for (let c = ini; c <= fin; c++) {
        let g;
        if (ro === 0) g = (c + delta) & 0xffff;
        else {
          const gi = rangoO + i * 2 + ro + (c - ini) * 2;
          if (gi + 1 >= b.length) continue;
          g = b.readUInt16BE(gi);
          if (g) g = (g + delta) & 0xffff;
        }
        if (g) m.set(c, g);
      }
    }
  } else if (fmt === 12) {
    const ng = b.readUInt32BE(sub + 12);
    for (let i = 0; i < ng; i++) {
      const r = sub + 16 + i * 12, a = b.readUInt32BE(r), z = b.readUInt32BE(r + 4), g = b.readUInt32BE(r + 8);
      for (let c = a; c <= z; c++) m.set(c, g + (c - a));
    }
  } else throw new Error('cmap en formato ' + fmt + ', no soportado');
  return m;
}

function metricas(archivo) {
  const b = fs.readFileSync(path.join(TMP, archivo));
  const t = tablas(b);
  const upem = b.readUInt16BE(t.head.off + 18);
  const nh = b.readUInt16BE(t.hhea.off + 34);
  const adv = new Array(nh);
  for (let i = 0; i < nh; i++) adv[i] = b.readUInt16BE(t.hmtx.off + i * 4);
  return { upem, adv, cmap: leerCmap(b, t) };
}

/** Nombre de familia (el que se le pide a fontconfig) → archivo .ttf. */
const FAMILIAS = {
  'Fraunces SemiBold': 'fraunces-600.ttf',
  'Geist': 'geist-sans-400.ttf',
  'Geist Medium': 'geist-sans-500.ttf',
  'Geist SemiBold': 'geist-sans-600.ttf',
  'Geist Mono': 'geist-mono-400.ttf',
  'Geist Mono Medium': 'geist-mono-500.ttf'
};
let M = {};
const faltantes = new Set();

/**
 * Ancho de avance de un texto, en píxeles. No aplica kerning (GPOS), así que
 * sale un pelo MÁS ancho que lo que dibuja librsvg: para comprobar que algo
 * cabe, equivocarse de más es el lado bueno.
 */
function ancho(txt, familia, tam, ls = 0) {
  const m = M[familia];
  let u = 0, n = 0;
  for (const ch of txt) {
    const cp = ch.codePointAt(0);
    const g = m.cmap.get(cp);
    if (g === undefined) faltantes.add(familia + ' ' + JSON.stringify(ch));
    const i = g === undefined ? 0 : g;
    u += adv(m, i);
    n++;
  }
  return u / m.upem * tam + ls * Math.max(0, n - 1);
}
const adv = (m, g) => (g < m.adv.length ? m.adv[g] : m.adv[m.adv.length - 1]);

// ==================================================== 3. partir texto en líneas

function partir(texto, familia, tam, ls, maxAncho) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (actual && ancho(prueba, familia, tam, ls) > maxAncho) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Igual que partir(), pero probando cajas cada vez más estrechas y quedándose
 * con la que deja las líneas más parejas SIN añadir ninguna. Es la diferencia
 * entre un titular con una última línea de dos palabras y uno que se lee como
 * un bloque.
 */
function partirEquilibrado(texto, familia, tam, ls, maxAncho) {
  const base = partir(texto, familia, tam, ls, maxAncho);
  if (base.length < 2) return base;
  const desnivel = (ln) => {
    const w = ln.map((l) => ancho(l, familia, tam, ls));
    return Math.max(...w) - Math.min(...w);
  };
  let mejor = base, mejorD = desnivel(base);
  for (let f = 0.98; f >= 0.6; f -= 0.02) {
    const cand = partir(texto, familia, tam, ls, maxAncho * f);
    if (cand.length !== base.length) continue;
    const d = desnivel(cand);
    if (d < mejorD - 0.5) { mejor = cand; mejorD = d; }
  }
  return mejor;
}

// ======================================================== 4. dibujo de una tarjeta

const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renglon(txt, x, base, familia, tam, ls, color, anclaFin = false) {
  return '<text x="' + x + '" y="' + base + '" font-family="' + familia + '" font-size="' + tam + '"' +
    ' fill="' + color + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') +
    (anclaFin ? ' text-anchor="end"' : '') + ' xml:space="preserve">' + escapar(txt) + '</text>';
}

const lsTitular = (tam) => Math.round(-0.01 * tam * 100) / 100;   // -.01em, como .t-display

/**
 * Elige cuerpo y cortes de línea del titular (y de la bajada) hasta que el
 * bloque entero cabe entre el eyebrow y la divisoria.
 */
function componer(titular, bajada) {
  let ultimo = null;
  for (const tam of TAMANOS_TITULAR) {
    const ls = lsTitular(tam);
    const lineasT = partirEquilibrado(titular, DISPLAY, tam, ls, CAJA);
    if (lineasT.length > MAX_LINEAS_TITULAR) continue;

    let lineasB = [], tamB = TAMANOS_BAJADA[0];
    if (bajada) {
      let ok = false;
      for (const tb of TAMANOS_BAJADA) {
        const c = partirEquilibrado(bajada, SANS, tb, 0, CAJA_BAJADA);
        if (c.length <= MAX_LINEAS_BAJADA) { lineasB = c; tamB = tb; ok = true; break; }
      }
      if (!ok) { lineasB = partirEquilibrado(bajada, SANS, TAMANOS_BAJADA.at(-1), 0, CAJA_BAJADA).slice(0, MAX_LINEAS_BAJADA); tamB = TAMANOS_BAJADA.at(-1); }
    }

    // Distancias entre líneas base, de arriba abajo.
    const avances = [];
    for (let i = 1; i < lineasT.length; i++) avances.push(Math.round(tam * 1.14));
    if (lineasB.length) {
      avances.push(Math.round(tam * 0.55) + 22);
      for (let i = 1; i < lineasB.length; i++) avances.push(INTERLINEA_BAJADA);
    }
    // 0.82 em cubre las mayúsculas con acento de Fraunces (Í, Á, ¿ alto);
    // 0.24 em, la cola de las minúsculas de la última línea.
    const subida = tam * 0.82;
    const caida = (lineasB.length ? tamB : tam) * 0.24;
    const salto = avances.reduce((a, b) => a + b, 0);
    const alto = subida + salto + caida;
    const primera = CENTRO_BLOQUE - alto / 2 + subida;
    const tope = primera - subida;
    const fondo = primera + salto + caida;
    ultimo = { tam, ls, lineasT, lineasB, tamB, primera, tope, fondo };
    if (tope >= TOPE_ARRIBA && fondo <= TOPE_ABAJO) return ultimo;
  }
  return ultimo;
}

function tarjeta({ etiqueta, titular, bajada, pie, nombre }) {
  const c = componer(titular, bajada);
  if (!c) throw new Error(nombre + ': no se pudo componer el titular');
  if (c.tope < TOPE_ARRIBA) aviso(nombre + ': el bloque sube hasta y=' + Math.round(c.tope) + ' (tope ' + TOPE_ARRIBA + ')');
  if (c.fondo > TOPE_ABAJO) aviso(nombre + ': el bloque baja hasta y=' + Math.round(c.fondo) + ' (tope ' + TOPE_ABAJO + ')');

  const partes = [];
  partes.push('<rect width="' + ANCHO + '" height="' + ALTO + '" fill="' + FONDO + '"/>');
  partes.push('<rect x="' + GUION.x + '" y="' + GUION.y + '" width="' + GUION.w + '" height="' + GUION.h + '" fill="' + VERDE + '"/>');
  partes.push(renglon(etiqueta, MARGEN, BASE_ETIQUETA, MONO, TAM_ETIQUETA, LS_ETIQUETA, VERDE));

  let base = c.primera;
  c.lineasT.forEach((l, i) => {
    partes.push(renglon(l, MARGEN, Math.round(base), DISPLAY, c.tam, c.ls, TINTA));
    if (i < c.lineasT.length - 1) base += Math.round(c.tam * 1.14);
  });
  if (c.lineasB.length) {
    base += Math.round(c.tam * 0.55) + 22;
    c.lineasB.forEach((l, i) => {
      partes.push(renglon(l, MARGEN, Math.round(base), SANS, c.tamB, 0, SUAVE));
      if (i < c.lineasB.length - 1) base += INTERLINEA_BAJADA;
    });
  }

  partes.push('<rect x="' + MARGEN + '" y="' + DIVISORIA_Y + '" width="' + CAJA + '" height="1" fill="' + LINEA + '"/>');
  partes.push(renglon(pie, MARGEN, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS));
  partes.push(renglon(MARCA, DERECHA, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS, true));

  // Comprobaciones de ancho ANTES de rasterizar, que dicen qué renglón sobra.
  const anchoEtiqueta = ancho(etiqueta, MONO, TAM_ETIQUETA, LS_ETIQUETA);
  if (anchoEtiqueta > CAJA) aviso(nombre + ': la etiqueta "' + etiqueta + '" mide ' + Math.round(anchoEtiqueta) + ' px');
  const anchoPie = ancho(pie, MONO, TAM_PIE, LS_PIE);
  const sitioPie = CAJA - ancho(MARCA, MONO, TAM_PIE, LS_PIE) - 40;
  if (anchoPie > sitioPie) aviso(nombre + ': el pie "' + pie + '" mide ' + Math.round(anchoPie) + ' px y solo caben ' + Math.round(sitioPie));
  for (const l of c.lineasT) {
    const w = ancho(l, DISPLAY, c.tam, c.ls);
    if (w > CAJA + 1) aviso(nombre + ': "' + l + '" mide ' + Math.round(w) + ' px (caja ' + CAJA + ')');
  }

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + ANCHO + '" height="' + ALTO + '">' + partes.join('') + '</svg>';
}

// ============================================================ 5. de dónde sale el texto

const MAY = (s) => String(s).toLocaleUpperCase('es-MX');

/** Frontmatter de un MDX: solo los escalares simples que necesita la tarjeta. */
function frontmatter(texto) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texto);
  if (!m) return {};
  const datos = {};
  for (const linea of m[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z][\w]*):\s*(.*)$/.exec(linea);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"')) {
      const s = /^"((?:[^"\\]|\\.)*)"/.exec(v);
      v = s ? s[1].replace(/\\(.)/g, '$1') : v;
    } else if (v.startsWith("'")) {
      const s = /^'((?:[^']|'')*)'/.exec(v);
      v = s ? s[1].replace(/''/g, "'") : v;
    }
    datos[kv[1]] = v;
  }
  return datos;
}

/** Nombres de las rutas de aprendizaje, leídos de src/data/lessons.ts. */
function rutasDeAprendizaje() {
  const RESPALDO = {
    'desde-cero': { en: 'From zero', es: 'Desde cero' },
    'mercados': { en: 'How markets work', es: 'Cómo funcionan los mercados' },
    'invertir': { en: 'Invest with a clear head', es: 'Invertir con cabeza' }
  };
  try {
    const src = fs.readFileSync(path.join(RAIZ, 'src', 'data', 'lessons.ts'), 'utf8');
    const re = /id:\s*'([a-z0-9-]+)',\s*\r?\n\s*name:\s*\{\s*en:\s*'([^']*)',\s*es:\s*'([^']*)'\s*\}/g;
    const out = {};
    let m;
    while ((m = re.exec(src))) out[m[1]] = { en: m[2], es: m[3] };
    if (Object.keys(out).length) return out;
  } catch { /* cae al respaldo */ }
  aviso('no pude leer PATHS de src/data/lessons.ts: uso los nombres de respaldo');
  return RESPALDO;
}

/** Las seis (o las que haya) lecciones, con su ruta y su posición dentro de ella. */
function lecciones() {
  const rutas = rutasDeAprendizaje();
  const orden = Object.keys(rutas);
  const base = path.join(RAIZ, 'src', 'content', 'lessons');
  const porIdioma = {};
  for (const loc of ['en', 'es']) {
    const dir = path.join(base, loc);
    if (!fs.existsSync(dir)) { porIdioma[loc] = []; continue; }
    porIdioma[loc] = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx')).sort().map((f) => {
      const d = frontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { slug: f.replace(/\.mdx$/, ''), locale: loc, ...d, order: Number(d.order), readingMinutes: Number(d.readingMinutes) };
    });
  }
  const salida = [];
  for (const loc of ['en', 'es']) {
    const lista = porIdioma[loc].slice().sort((a, b) => {
      const pa = orden.indexOf(a.path), pb = orden.indexOf(b.path);
      return pa !== pb ? pa - pb : a.order - b.order;
    });
    for (const l of lista) {
      const hermanas = lista.filter((x) => x.path === l.path);
      const ruta = rutas[l.path];
      if (!ruta) { aviso('lección ' + l.slug + ': ruta de aprendizaje desconocida "' + l.path + '"'); continue; }
      salida.push({
        nombre: 'lesson-' + l.slug,
        locale: loc,
        etiqueta: MAY((loc === 'es' ? 'Lección · ' : 'Lesson · ') + ruta[loc]),
        titular: l.title,
        bajada: null,
        pie: MAY(loc === 'es'
          ? 'Lección ' + (hermanas.indexOf(l) + 1) + ' de ' + hermanas.length + ' · ' + l.readingMinutes + ' min de lectura'
          : 'Lesson ' + (hermanas.indexOf(l) + 1) + ' of ' + hermanas.length + ' · ' + l.readingMinutes + ' min read')
      });
    }
  }
  return salida;
}

const MESES = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
};
/** Fecha en UTC a propósito: así la imagen no depende del huso de quien compila. */
function fechaCorta(iso, loc) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.getUTCDate() + ' ' + MESES[loc][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

// Los cinco temas de src/data/news.ts, con la etiqueta de src/i18n/ui.ts.
const TEMAS = {
  peso: { en: 'Peso', es: 'Peso' },
  tasas: { en: 'Fed/Banxico', es: 'Fed/Banxico' },
  acciones: { en: 'Stocks', es: 'Acciones' },
  cripto: { en: 'Crypto', es: 'Cripto' },
  macro: { en: 'Macro', es: 'Macro' }
};

function noticias() {
  const dir = path.join(RAIZ, 'src', 'data', 'news');
  if (!fs.existsSync(dir)) return [];
  const salida = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const n = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const tema = TEMAS[n.tema];
    if (!tema) aviso('noticia ' + n.slug + ': tema desconocido "' + n.tema + '"');
    for (const loc of ['en', 'es']) {
      salida.push({
        nombre: 'news-' + n.slug,
        locale: loc,
        etiqueta: MAY((loc === 'es' ? 'Noticia · ' : 'News · ') + (tema ? tema[loc] : n.tema)),
        titular: n[loc].titulo,
        bajada: null,
        pie: MAY(n.fuente.nombre + ' · ' + fechaCorta(n.fecha, loc))
      });
    }
  }
  return salida;
}

const CLASES = {
  index: { en: 'Index', es: 'Índice' },
  stock: { en: 'Stock', es: 'Acción' },
  vol: { en: 'Volatility', es: 'Volatilidad' },
  fx: { en: 'Currency', es: 'Divisa' },
  crypto: { en: 'Crypto', es: 'Cripto' }
};

/**
 * Los activos de /market/<símbolo>. src/data/symbols.ts es TypeScript, así que
 * se copia a un .mts temporal y se importa: Node le quita los tipos solo (>=
 * 22.18). Si esa versión de Node no puede, se avisa y las fichas se quedan sin
 * tarjeta propia — las que ya están commiteadas siguen sirviendo.
 */
async function activos() {
  const origen = path.join(RAIZ, 'src', 'data', 'symbols.ts');
  // Fuera de TMP a propósito: fontconfig escanea esa carpeta buscando fuentes.
  const copia = path.join(os.tmpdir(), 'smartfinance-og-symbols.mts');
  let ASSETS;
  try {
    fs.writeFileSync(copia, fs.readFileSync(origen, 'utf8'));
    ({ ASSETS } = await import(pathToFileURL(copia).href + '?v=' + Date.now()));
  } catch (e) {
    aviso('no pude leer src/data/symbols.ts (' + e.message.split('\n')[0] + '): las fichas de /market se quedan con la og:image de /market');
    return null;
  }
  const salida = [];
  for (const s of ASSETS) {
    const clase = CLASES[s.kind] || { en: s.kind, es: s.kind };
    for (const loc of ['en', 'es']) {
      // Solo la primera frase del "¿qué es?": la segunda no cabe y no hace falta.
      const primera = String(s.what[loc]).split(/(?<=\.)\s+/)[0];
      salida.push({
        nombre: 'market-' + s.id,
        locale: loc,
        etiqueta: MAY((loc === 'es' ? 'Mercado · ' : 'Markets · ') + clase[loc]),
        titular: s.name[loc],
        bajada: primera,
        pie: MAY(s.sym + (loc === 'es' ? ' · Datos con retraso · Solo educativo' : ' · Delayed data · Educational only'))
      });
    }
  }
  return salida;
}

/** Los reportes de research que tienen meta.yaml (los que tienen página propia). */
async function research() {
  const dir = path.join(RAIZ, 'content', 'research');
  if (!fs.existsSync(dir)) return [];
  const { parseYaml } = await import(pathToFileURL(path.join(RAIZ, 'src', 'lib', 'research', 'yaml.mjs')).href);
  const salida = [];
  for (const slug of fs.readdirSync(dir).sort()) {
    const meta = path.join(dir, slug, 'meta.yaml');
    if (!fs.existsSync(meta)) continue;
    const m = parseYaml(fs.readFileSync(meta, 'utf8'));
    const bolsa = m.exchange ? m.exchange + ': ' + m.ticker : m.ticker;
    for (const loc of ['en', 'es']) {
      salida.push({
        nombre: 'research-' + slug,
        locale: loc,
        etiqueta: MAY((loc === 'es' ? 'Research de acciones · ' : 'Equity research · ') + bolsa),
        titular: m.name,
        bajada: loc === 'es'
          ? 'Siete años fiscales bajados de los reportes a la SEC, un DCF que puedes mover y todas las fuentes citadas.'
          : 'Seven fiscal years pulled from SEC filings, a DCF you can move in your browser, and every source listed.',
        pie: MAY((m.status === 'draft' ? (loc === 'es' ? 'Borrador' : 'Draft') : (loc === 'es' ? 'Reporte' : 'Report')) +
          ' · ' + (m.author || 'Jaime Sandoval'))
      });
    }
  }
  return salida;
}

/*
 * Las páginas que no tienen datos detrás: aquí sí se escribe el texto, porque
 * no vive en ningún otro sitio. Va emparejado EN/ES a la fuerza para que no se
 * pueda añadir una tarjeta a medias.
 */
const TARJETAS_FIJAS = [
  {
    nombre: 'news',
    en: { etiqueta: 'News, explained', titular: 'What happened, and why it matters to you',
      bajada: 'Market and economy news in plain words, for students in Mexico and Canada.',
      pie: 'Every story is read by a person before it goes up' },
    es: { etiqueta: 'Noticias explicadas', titular: 'Qué pasó y por qué te importa',
      bajada: 'Las noticias de mercados y economía en palabras normales, para estudiantes en México y Canadá.',
      pie: 'Cada nota la lee una persona antes de publicarse' }
  },
  {
    nombre: 'tools',
    en: { etiqueta: 'Tools', titular: 'Three calculators with your own numbers',
      bajada: 'Move a slider, read the number, keep the link. Nothing is stored and nothing is sent anywhere.',
      pie: 'Compound interest · Inflation · CETES' },
    es: { etiqueta: 'Herramientas', titular: 'Tres calculadoras con tus propios números',
      bajada: 'Mueve un control, lee el número, guarda el enlace. No se guarda nada ni se manda a ningún lado.',
      pie: 'Interés compuesto · Inflación · CETES' }
  },
  {
    nombre: 'tool-interes-compuesto',
    en: { etiqueta: 'Tool', titular: 'Compound interest',
      bajada: 'A monthly contribution, a rate and the years: your money alone against the same money earning on itself.',
      pie: 'Free calculator · Nothing is stored' },
    es: { etiqueta: 'Herramienta', titular: 'Interés compuesto',
      bajada: 'Un aporte mensual, una tasa y los años: tu dinero solo contra el mismo dinero ganando sobre sí mismo.',
      pie: 'Calculadora gratis · No se guarda nada' }
  },
  {
    nombre: 'tool-inflacion',
    en: { etiqueta: 'Tool', titular: 'How much does inflation eat?',
      bajada: 'Start with something you actually buy and see what the same thing costs later.',
      pie: 'Free calculator · Nothing is stored' },
    es: { etiqueta: 'Herramienta', titular: '¿Cuánto me come la inflación?',
      bajada: 'Empieza con algo que de verdad compras y mira cuánto costará lo mismo después.',
      pie: 'Calculadora gratis · No se guarda nada' }
  },
  {
    nombre: 'tool-cetes-vs-cuenta',
    en: { etiqueta: 'Tool', titular: 'CETES vs account vs inflation',
      bajada: 'The same money in three places for the same years, in pesos and in what those pesos still buy.',
      pie: 'Free calculator · Nothing is stored' },
    es: { etiqueta: 'Herramienta', titular: 'CETES vs cuenta vs inflación',
      bajada: 'El mismo dinero en tres lugares durante los mismos años, en pesos y en lo que esos pesos compran.',
      pie: 'Calculadora gratis · No se guarda nada' }
  },
  {
    nombre: 'community',
    en: { etiqueta: 'Student community', titular: 'The Smart Finance student community',
      bajada: 'The student group Jaime founded and leads, open to high school and university students.',
      pie: 'Stock exchange visits · Talks · Volunteering' },
    es: { etiqueta: 'Comunidad estudiantil', titular: 'La comunidad estudiantil Smart Finance',
      bajada: 'El grupo estudiantil que fundó y preside Jaime, para estudiantes de prepa y universidad.',
      pie: 'Visitas a la BMV · Pláticas · Voluntariados' }
  },
  {
    nombre: 'market',
    en: { etiqueta: 'Markets', titular: 'Indexes, stocks, currencies and crypto',
      bajada: 'Each one with its own touch chart, its key numbers and what it is in plain words.',
      pie: 'Updated every 15 minutes · Not a trading feed' },
    es: { etiqueta: 'Mercado', titular: 'Índices, acciones, divisas y cripto',
      bajada: 'Cada cosa con su gráfica táctil, sus números clave y qué es en palabras normales.',
      pie: 'Cada 15 minutos · No es un feed para operar' }
  }
];

function fijas() {
  const salida = [];
  for (const t of TARJETAS_FIJAS) {
    for (const loc of ['en', 'es']) {
      salida.push({ nombre: t.nombre, locale: loc, ...t[loc], etiqueta: MAY(t[loc].etiqueta), pie: MAY(t[loc].pie) });
    }
  }
  return salida;
}

// ================================================================== 6. salida

const archivoDe = (nombre, locale) => nombre + (locale === 'es' ? '-es' : '') + '.jpg';

/** Caja de tinta del JPG ya renderizado: la última palabra sobre si algo se sale. */
async function comprobarTinta(sharp, buf, nombre) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  let x0 = null, x1 = 0, y0 = null, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] > 40) {
        if (x0 === null || x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y0 === null) y0 = y;
        y1 = y;
      }
    }
  }
  if (x0 === null) { aviso(nombre + ': la imagen salió vacía'); return; }
  if (x0 < MARGEN - 6 || x1 > DERECHA + 6) aviso(nombre + ': la tinta llega a x ' + x0 + '..' + x1 + ' (margen ' + MARGEN + '..' + DERECHA + ')');
  if (y0 < 60 || y1 > ALTO - 30) aviso(nombre + ': la tinta llega a y ' + y0 + '..' + y1);
}

async function construir() {
  const sharp = require('sharp');
  for (const [fam, archivo] of Object.entries(FAMILIAS)) M[fam] = metricas(archivo);

  const lista = [...fijas(), ...lecciones(), ...noticias(), ...(await research())];
  const act = await activos();
  const completo = act !== null;
  if (act) lista.push(...act);

  fs.mkdirSync(SALIDA, { recursive: true });
  const escritos = [];
  let nuevas = 0, iguales = 0;

  for (const t of lista) {
    const archivo = archivoDe(t.nombre, t.locale);
    const svg = tarjeta({ ...t, nombre: archivo });
    const jpg = await sharp(Buffer.from(svg))
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toBuffer();
    await comprobarTinta(sharp, jpg, archivo);
    const destino = path.join(SALIDA, archivo);
    // Escribir solo si cambia: correr esto dos veces no debe tocar el repo.
    if (fs.existsSync(destino) && fs.readFileSync(destino).equals(jpg)) iguales++;
    else { fs.writeFileSync(destino, jpg); nuevas++; }
    escritos.push(archivo.replace(/\.jpg$/, ''));
  }

  // Huérfanas: solo si la lista salió completa, para no borrar por un fallo.
  if (completo) {
    const vivas = new Set(escritos.map((n) => n + '.jpg'));
    for (const f of fs.readdirSync(SALIDA)) {
      if (f.endsWith('.jpg') && !vivas.has(f)) {
        fs.unlinkSync(path.join(SALIDA, f));
        console.log('  borrada (ya no la usa ninguna página): og/' + f);
      }
    }
  }

  escritos.sort();
  const manifiesto = JSON.stringify(escritos, null, 0) + '\n';
  fs.mkdirSync(path.dirname(MANIFIESTO), { recursive: true });
  if (!fs.existsSync(MANIFIESTO) || fs.readFileSync(MANIFIESTO, 'utf8') !== manifiesto) {
    fs.writeFileSync(MANIFIESTO, manifiesto);
  }

  if (faltantes.size) aviso('glifos que la fuente no tiene: ' + [...faltantes].join(', '));
  const kb = escritos.reduce((a, n) => a + fs.statSync(path.join(SALIDA, n + '.jpg')).size, 0) / 1024;
  console.log('og:image por página — ' + escritos.length + ' imágenes (' +
    nuevas + ' escritas, ' + iguales + ' sin cambios), ' + Math.round(kb) + ' KB en total');
}

// ------------------------------------------------------------------- arranque

/*
 * Relanzarse con FONTCONFIG_PATH y PANGOCAIRO_BACKEND puestos: las dos se leen
 * al cargar la librería, así que ponerlas desde dentro del propio proceso
 * llega tarde.
 */
if (!process.env.SMARTFINANCE_OGP_FUENTES) {
  try {
    await prepararFuentes();
    const r = spawnSync(process.execPath, [ESTE, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, FONTCONFIG_PATH: TMP, PANGOCAIRO_BACKEND: 'fc', SMARTFINANCE_OGP_FUENTES: '1' }
    });
    if (r.status !== 0) {
      console.warn('\n[og:pages] el generador no terminó bien. El build sigue: las páginas caen a la og:image genérica.');
      process.exit(ESTRICTO ? 1 : 0);
    }
  } catch (e) {
    console.warn('\n[og:pages] no pude preparar las fuentes: ' + e.message);
    console.warn('[og:pages] el build sigue: las páginas caen a la og:image genérica.');
    process.exit(ESTRICTO ? 1 : 0);
  }
} else {
  try {
    await construir();
    if (avisos.length) {
      console.warn('\n[og:pages] AVISOS (' + avisos.length + '):');
      for (const a of avisos) console.warn('  - ' + a);
      if (ESTRICTO) process.exit(1);
    }
  } catch (e) {
    console.warn('\n[og:pages] falló: ' + (e && e.stack ? e.stack : e));
    console.warn('[og:pages] el build sigue: las páginas caen a la og:image genérica.');
    process.exit(ESTRICTO ? 1 : 0);
  }
}
