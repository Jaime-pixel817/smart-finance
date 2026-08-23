#!/usr/bin/env node
/*
 * Las láminas del carrusel de Instagram: 1080×1350 PNG, con el mismo lenguaje
 * visual que las og:image del sitio.
 *
 *   node scripts/derive/laminas.mjs <ruta a carousel.json>
 *
 * NO REINVENTA LA TIPOGRAFÍA. Las fuentes, las métricas y el partido de líneas
 * salen de scripts/lib/tipografia.mjs, que es exactamente lo que usa
 * scripts/build-og-pages.mjs: mismas woff2 del sitio descomprimidas a .ttf,
 * mismo fontconfig, mismo medir-antes-de-dibujar. Por eso una lámina y una
 * og:image se ven de la misma familia.
 *
 * OJO EN MAC: pango usa el backend de CoreText e IGNORA fontconfig, así que sin
 * PANGOCAIRO_BACKEND=fc todo sale en una sans genérica SIN DAR ERROR. Esa
 * variable y FONTCONFIG_PATH se leen al arrancar la librería, así que el script
 * se relanza a sí mismo una vez con el entorno ya puesto (igual que el de og).
 *
 * SI ESTO FALLA, NO SE PIERDE NADA: los textos del carrusel ya están en
 * carousel.json y son lo que hay que revisar. Las imágenes son el envoltorio.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  prepararFuentes, relanzar, cargarMetricas, faltantes,
  ancho, partirEquilibrado, renglon, lsTitular
} from '../lib/tipografia.mjs';

const require = createRequire(import.meta.url);
const ESTE = fileURLToPath(import.meta.url);

// ------------------------------------------------------- 1. sistema visual

const ANCHO = 1080, ALTO = 1350;

// Los mismos que la familia de og:image (medidos, no inventados: ver el
// encabezado de scripts/build-og-pages.mjs).
const FONDO = '#0A0A0A';
const TINTA = '#F5F5F2';
const SUAVE = '#B8B8BA';
const GRIS = '#8A8A8E';
const VERDE = '#16C47F';   // --brand-fill de src/styles/tokens.css
const LINEA = '#1F1F1F';

const DISPLAY = 'Fraunces SemiBold';
const SANS = 'Geist';
const MONO = 'Geist Mono Medium';

const MARGEN = 88;
const DERECHA = ANCHO - MARGEN;      // 992
const CAJA = DERECHA - MARGEN;       // 904

const BARRA_ALTO = 6;                // el progreso del carrusel, arriba del todo
const GUION = { x: MARGEN, y: 158, w: 72, h: 5 };
const BASE_KICKER = 216;
const TAM_KICKER = 26, LS_KICKER = 2.2;

// El bloque de texto se ANCLA ABAJO, no se centra: en un carrusel se pasa una
// lámina tras otra y, centrado, el titular bailaba de altura entre una de dos
// líneas y una de cinco. Anclado, la última línea cae siempre en el mismo sitio
// y lo único que crece es hacia arriba.
const SUELO_BLOQUE = 1058;
const TOPE_ARRIBA = 290;

const TAMANOS_TITULAR = [92, 84, 76, 68, 60, 54, 48, 44, 40, 36];
const MAX_LINEAS_TITULAR = 6;
const TAMANOS_TEXTO = [36, 33, 30, 27];
const MAX_LINEAS_TEXTO = 7;
const INTERLINEA_TEXTO = (t) => Math.round(t * 1.45);

const BASE_FUENTE = 1150;            // el rótulo de fuente, pegado sobre la divisoria
const TAM_FUENTE = 24;
const DIVISORIA_Y = 1196;
const BASE_PIE = 1258;
const TAM_PIE = 26, LS_PIE = 1;

const MARCA = 'smartfinance.lat';

const avisos = [];
const aviso = (m) => avisos.push(m);
const MAY = (s) => String(s).toLocaleUpperCase('es-MX');

// ------------------------------------------------------- 2. componer y dibujar

/** Cuerpo y cortes de línea hasta que titular + texto caben en la franja. */
function componer(titular, texto, { titularMax = TAMANOS_TITULAR[0] } = {}) {
  let ultimo = null;
  for (const tam of TAMANOS_TITULAR) {
    if (tam > titularMax) continue;
    const ls = lsTitular(tam);
    const lineasT = partirEquilibrado(titular, DISPLAY, tam, ls, CAJA);
    if (lineasT.length > MAX_LINEAS_TITULAR) continue;

    let lineasX = [], tamX = TAMANOS_TEXTO[0];
    if (texto) {
      let ok = false;
      for (const tx of TAMANOS_TEXTO) {
        const c = partirEquilibrado(texto, SANS, tx, 0, CAJA);
        if (c.length <= MAX_LINEAS_TEXTO) { lineasX = c; tamX = tx; ok = true; break; }
      }
      if (!ok) {
        tamX = TAMANOS_TEXTO.at(-1);
        lineasX = partirEquilibrado(texto, SANS, tamX, 0, CAJA).slice(0, MAX_LINEAS_TEXTO);
      }
    }

    const avances = [];
    for (let i = 1; i < lineasT.length; i++) avances.push(Math.round(tam * 1.16));
    if (lineasX.length) {
      avances.push(Math.round(tam * 0.5) + 34);
      for (let i = 1; i < lineasX.length; i++) avances.push(INTERLINEA_TEXTO(tamX));
    }
    // 0.82 em cubre las mayúsculas con acento de Fraunces; 0.24 em, las colas.
    const subida = tam * 0.82;
    const caida = (lineasX.length ? tamX : tam) * 0.24;
    const salto = avances.reduce((a, b) => a + b, 0);
    const primera = SUELO_BLOQUE - caida - salto;
    ultimo = { tam, ls, lineasT, lineasX, tamX, primera, tope: primera - subida, fondo: SUELO_BLOQUE };
    if (ultimo.tope >= TOPE_ARRIBA) return ultimo;
  }
  return ultimo;
}

function lamina(l, total, nombre) {
  const esPortada = l.tipo === 'portada';
  const c = componer(l.titulo, l.texto, { titularMax: esPortada ? TAMANOS_TITULAR[0] : 76 });
  if (!c) throw new Error(nombre + ': no se pudo componer el titular');
  if (c.tope < TOPE_ARRIBA) aviso(nombre + ': el bloque sube hasta y=' + Math.round(c.tope) + ' (tope ' + TOPE_ARRIBA + ')');

  const p = [];
  p.push('<rect width="' + ANCHO + '" height="' + ALTO + '" fill="' + FONDO + '"/>');
  // Progreso del carrusel: sin números, una barra que avanza.
  p.push('<rect x="0" y="0" width="' + ANCHO + '" height="' + BARRA_ALTO + '" fill="' + LINEA + '"/>');
  p.push('<rect x="0" y="0" width="' + Math.round(ANCHO * (l.lamina / total)) + '" height="' + BARRA_ALTO + '" fill="' + VERDE + '"/>');
  p.push('<rect x="' + GUION.x + '" y="' + GUION.y + '" width="' + GUION.w + '" height="' + GUION.h + '" fill="' + VERDE + '"/>');
  p.push(renglon(MAY(l.kicker || ''), MARGEN, BASE_KICKER, MONO, TAM_KICKER, LS_KICKER, VERDE));

  let base = c.primera;
  c.lineasT.forEach((linea, i) => {
    p.push(renglon(linea, MARGEN, Math.round(base), DISPLAY, c.tam, c.ls, TINTA));
    if (i < c.lineasT.length - 1) base += Math.round(c.tam * 1.16);
  });
  if (c.lineasX.length) {
    base += Math.round(c.tam * 0.5) + 34;
    c.lineasX.forEach((linea, i) => {
      p.push(renglon(linea, MARGEN, Math.round(base), SANS, c.tamX, 0, SUAVE));
      if (i < c.lineasX.length - 1) base += INTERLINEA_TEXTO(c.tamX);
    });
  }

  if (l.fuente) {
    const cabe = partirEquilibrado(l.fuente, MONO, TAM_FUENTE, 0, CAJA);
    if (cabe.length > 1) aviso(nombre + ': el rótulo de fuente no cabe en una línea');
    p.push(renglon(cabe[0], MARGEN, BASE_FUENTE, MONO, TAM_FUENTE, 0, GRIS));
  }

  p.push('<rect x="' + MARGEN + '" y="' + DIVISORIA_Y + '" width="' + CAJA + '" height="1" fill="' + LINEA + '"/>');
  p.push(renglon(MAY(l.pie || ''), MARGEN, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS));
  p.push(renglon(MARCA, DERECHA, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS, true));

  for (const linea of c.lineasT) {
    const w = ancho(linea, DISPLAY, c.tam, c.ls);
    if (w > CAJA + 1) aviso(nombre + ': "' + linea + '" mide ' + Math.round(w) + ' px (caja ' + CAJA + ')');
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + ANCHO + '" height="' + ALTO + '">' + p.join('') + '</svg>';
}

// ------------------------------------------------------- 3. de carousel.json a PNG

async function construir(rutaJson) {
  const sharp = require('sharp');
  cargarMetricas();

  const carrusel = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));
  const dir = path.join(path.dirname(rutaJson), 'laminas');
  fs.mkdirSync(dir, { recursive: true });
  const total = carrusel.laminas.length;
  const pieDefecto = carrusel.enlace ? carrusel.enlace.replace(/^https?:\/\//, '').split('/')[0] : MARCA;

  const escritas = [];
  for (const l of carrusel.laminas) {
    const nombre = String(l.lamina).padStart(2, '0') + '.png';
    const svg = lamina({ ...l, pie: l.tipo === 'cierre' ? (l.fuente || pieDefecto) : (carrusel.pieza || '') }, total, nombre);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
    const destino = path.join(dir, nombre);
    if (!fs.existsSync(destino) || !fs.readFileSync(destino).equals(png)) fs.writeFileSync(destino, png);
    escritas.push({ nombre, kb: Math.round(png.length / 1024) });
  }

  // Láminas huérfanas de una tirada anterior más larga.
  const vivas = new Set(escritas.map((e) => e.nombre));
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.png') && !vivas.has(f)) fs.unlinkSync(path.join(dir, f));

  if (faltantes.size) aviso('glifos que la fuente no tiene: ' + [...faltantes].join(', '));
  const kb = escritas.reduce((a, e) => a + e.kb, 0);
  console.log('  láminas: ' + escritas.length + ' PNG de ' + ANCHO + '×' + ALTO + ' (' + kb + ' KB en total) → ' + path.relative(process.cwd(), dir));
  const pesada = escritas.find((e) => e.kb > 200);
  if (pesada) aviso('la lámina ' + pesada.nombre + ' pesa ' + pesada.kb + ' KB');
}

// ------------------------------------------------------------------ arranque

const rutaJson = process.argv[2];
if (!rutaJson) {
  console.error('uso: node scripts/derive/laminas.mjs <ruta a carousel.json>');
  process.exit(2);
}

if (!process.env.SMARTFINANCE_LAMINAS_FUENTES) {
  try {
    await prepararFuentes();
    const codigo = relanzar(ESTE, 'SMARTFINANCE_LAMINAS_FUENTES', process.argv.slice(2));
    process.exit(codigo);
  } catch (e) {
    console.warn('  [láminas] no pude preparar las fuentes: ' + e.message);
    console.warn('  [láminas] los textos del carrusel ya están en carousel.json; faltan solo las imágenes.');
    process.exit(1);
  }
} else {
  try {
    await construir(rutaJson);
    if (avisos.length) {
      console.warn('  [láminas] avisos (' + avisos.length + '):');
      for (const a of avisos) console.warn('    - ' + a);
    }
  } catch (e) {
    console.warn('  [láminas] falló: ' + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
}
