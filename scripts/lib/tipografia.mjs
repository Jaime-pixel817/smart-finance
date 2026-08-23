/*
 * Tipografía compartida por los generadores de imagen del repo.
 *
 * POR QUÉ EXISTE
 * --------------
 * Todo esto vivía dentro de scripts/build-og-pages.mjs. Cuando el generador de
 * las láminas del carrusel (scripts/derive/laminas.mjs) necesitó exactamente lo
 * mismo —descomprimir las woff2 del sitio, medir el ancho real de un renglón y
 * partir un titular en líneas parejas— la alternativa era copiar 180 líneas y
 * que las dos copias se separaran a la primera corrección. Aquí está la única
 * copia; los dos scripts la importan.
 *
 * LO DELICADO (no tocar sin leer esto)
 * ------------------------------------
 * librsvg no sabe leer woff2 ni @font-face: las fuentes se descomprimen a .ttf
 * en una carpeta temporal y se le pasan a fontconfig por FONTCONFIG_PATH. Esa
 * variable, y PANGOCAIRO_BACKEND=fc, se leen cuando la librería arranca, ANTES
 * de que un script pueda ponerlas desde dentro: por eso los scripts que dibujan
 * se relanzan a sí mismos con el entorno ya puesto (ver `relanzar`).
 *
 * PANGOCAIRO_BACKEND=fc es obligatoria en macOS: ahí pango usa el backend de
 * CoreText e IGNORA fontconfig, así que pide "Fraunces SemiBold", no la
 * encuentra instalada en el sistema y dibuja con una sans de respaldo SIN DAR
 * ERROR. En Linux (el build de Vercel) el backend ya es fontconfig y la
 * variable no cambia nada.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FUENTES = path.join(RAIZ, 'public', 'assets', 'fonts');
/** La carpeta de .ttf la comparten build-og.js, build-og-pages.mjs y las láminas. */
export const TMP = path.join(os.tmpdir(), 'smartfinance-og-fuentes');

/** Nombre de familia (el que se le pide a fontconfig) → archivo .ttf. */
export const FAMILIAS = {
  'Fraunces SemiBold': 'fraunces-600.ttf',
  'Geist': 'geist-sans-400.ttf',
  'Geist Medium': 'geist-sans-500.ttf',
  'Geist SemiBold': 'geist-sans-600.ttf',
  'Geist Mono': 'geist-mono-400.ttf',
  'Geist Mono Medium': 'geist-mono-500.ttf'
};

/*
 * Descomprime las woff2 del sitio a .ttf y deja un fonts.conf apuntando a esa
 * carpeta. La carpeta de caché tiene que EXISTIR: si no, fontconfig ni
 * siquiera escanea el directorio y todo sale con la fuente de respaldo.
 */
export async function prepararFuentes() {
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

/**
 * Relanza el script actual con FONTCONFIG_PATH y PANGOCAIRO_BACKEND puestos.
 * Devuelve el código de salida del hijo. `centinela` es la variable de entorno
 * que el propio script mira para saber que ya es el hijo y no volver a saltar.
 */
export function relanzar(archivoScript, centinela, args = []) {
  const r = spawnSync(process.execPath, [archivoScript, ...args], {
    stdio: 'inherit',
    env: { ...process.env, FONTCONFIG_PATH: TMP, PANGOCAIRO_BACKEND: 'fc', [centinela]: '1' }
  });
  return r.status === null ? 1 : r.status;
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

const M = {};
/** Glifos que la fuente pedida no tiene: los scripts los sacan como aviso. */
export const faltantes = new Set();

/** Carga las métricas de las seis familias. Hay que llamarla antes de medir. */
export function cargarMetricas() {
  for (const [fam, archivo] of Object.entries(FAMILIAS)) M[fam] = metricas(archivo);
  return M;
}

const adv = (m, g) => (g < m.adv.length ? m.adv[g] : m.adv[m.adv.length - 1]);

/**
 * Ancho de avance de un texto, en píxeles. No aplica kerning (GPOS), así que
 * sale un pelo MÁS ancho que lo que dibuja librsvg: para comprobar que algo
 * cabe, equivocarse de más es el lado bueno.
 */
export function ancho(txt, familia, tam, ls = 0) {
  const m = M[familia];
  if (!m) throw new Error('métricas sin cargar para "' + familia + '" (falta cargarMetricas())');
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

// ==================================================== partir texto en líneas

export function partir(texto, familia, tam, ls, maxAncho) {
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
export function partirEquilibrado(texto, familia, tam, ls, maxAncho) {
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

// ======================================================== dibujo

export const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renglon(txt, x, base, familia, tam, ls, color, anclaFin = false) {
  return '<text x="' + x + '" y="' + base + '" font-family="' + familia + '" font-size="' + tam + '"' +
    ' fill="' + color + '"' + (ls ? ' letter-spacing="' + ls + '"' : '') +
    (anclaFin ? ' text-anchor="end"' : '') + ' xml:space="preserve">' + escapar(txt) + '</text>';
}

/** -.01em, como .t-display en el sitio. */
export const lsTitular = (tam) => Math.round(-0.01 * tam * 100) / 100;
