#!/usr/bin/env node
/*
 * El FONDO de la og:image del reto del día: api/_lib/og-reto-base.js.
 *
 * POR QUÉ HAY UN FONDO PRE-DIBUJADO Y NO SE DIBUJA TODO EN EL SERVIDOR
 * -------------------------------------------------------------------
 * La tarjeta que se comparte tiene que enseñar la gráfica DE HOY, así que la
 * imagen no se puede generar en el build: mañana sería otra. Y la parte que sí
 * es fija —el titular en Fraunces, el rótulo, el pie— no se puede dibujar en la
 * función serverless: api/_lib/lienzo.js sabe hacer líneas, círculos y rellenos,
 * pero no sabe escribir, y meter un rasterizador de fuentes ahí es exactamente
 * lo que la cabecera de lienzo.js explica que no se va a hacer (sharp son ~30 MB
 * de binarios nativos y depende de las fuentes que haya en el contenedor).
 *
 * La salida es la de siempre en este repo: pre-dibujar en el build, commitear el
 * resultado y componer en caliente lo poco que cambia — igual que las máscaras
 * del globo (public/assets/geo/*.bin) o el manifiesto de las fotos.
 *
 *   este script  →  api/_lib/og-reto-base.js   (el fondo, con el texto ya puesto)
 *   api/_lib/og-reto.js  →  inflar el fondo + dibujar la gráfica del día + PNG
 *
 * VA EN UN .js Y NO EN UN .bin: .vercelignore excluye /scripts, pero api/_lib sí
 * se despliega, y un require() lo trae seguro al paquete de la función. Un
 * fs.readFileSync(__dirname + '/algo.bin') depende de que el rastreador de
 * Vercel lo adivine, y eso falla en silencio y en producción.
 *
 * CUÁNDO HAY QUE VOLVER A CORRERLO: solo si cambian los textos de la tarjeta
 * (los de aquí abajo) o el sistema visual de las og:image. No cambia solo: es
 * `npm run build:og-reto` y se commitea el resultado.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  prepararFuentes, relanzar, cargarMetricas, faltantes,
  ancho, partirEquilibrado, renglon, lsTitular
} from './lib/tipografia.mjs';

const require = createRequire(import.meta.url);
const ESTE = fileURLToPath(import.meta.url);
const RAIZ = path.join(path.dirname(ESTE), '..');
const DESTINO = path.join(RAIZ, 'api', '_lib', 'og-reto-base.js');

// ---- El sistema visual, el mismo que scripts/build-og-pages.mjs -------------
const ANCHO = 1200, ALTO = 630;
const FONDO = '#0A0A0A';
const TINTA = '#F5F5F2';
const SUAVE = '#B8B8BA';
const GRIS = '#8A8A8E';
const VERDE = '#16C47F';
const LINEA = '#1F1F1F';
const DISPLAY = 'Fraunces SemiBold';
const SANS = 'Geist';
const MONO = 'Geist Mono Medium';
const MARGEN = 80;
const DERECHA = ANCHO - MARGEN;
const GUION = { x: MARGEN, y: 136, w: 56, h: 4 };
const BASE_ETIQUETA = 186;
const DIVISORIA_Y = 537;
const BASE_PIE = 581;
const TAM_ETIQUETA = 19, LS_ETIQUETA = 1.6;
const TAM_PIE = 19, LS_PIE = 1;
const MARCA = 'smartfinance.lat';

/*
 * La diferencia con las demás tarjetas: la columna de texto mide 600 y no 1040,
 * porque a la derecha va la gráfica del día. Ese hueco es LA CAJA, y sus
 * coordenadas viajan al módulo generado para que api/_lib/og-reto.js dibuje
 * exactamente ahí y no tenga que adivinarlas.
 */
const COLUMNA = 600;
export const CAJA = { x: 720, y: 150, w: 400, h: 340 };

const TAMANOS_TITULAR = [76, 68, 60, 54, 48];
const TAM_BAJADA = 25, INTERLINEA_BAJADA = 36;
const CENTRO_BLOQUE = 330;

const TEXTOS = {
  en: {
    etiqueta: 'DAILY CHALLENGE',
    titular: 'What happened next?',
    bajada: 'A real chart with its last eight weeks covered. Today’s, the same one for everyone.',
    pie: 'TWO MINUTES · NO ACCOUNT · A NEW ONE EVERY DAY'
  },
  es: {
    etiqueta: 'RETO DEL DÍA',
    titular: '¿Y luego qué pasó?',
    bajada: 'Una gráfica real con sus últimas ocho semanas tapadas. La de hoy, la misma para todos.',
    pie: 'DOS MINUTOS · SIN CUENTA · UNO NUEVO CADA DÍA'
  }
};

const avisos = [];
const aviso = (m) => avisos.push(m);

function tarjeta({ etiqueta, titular, bajada, pie }, nombre) {
  // El titular baja de cuerpo hasta que cabe en dos líneas dentro de la columna.
  let tam = TAMANOS_TITULAR[0], lineasT = null;
  for (const t of TAMANOS_TITULAR) {
    const l = partirEquilibrado(titular, DISPLAY, t, lsTitular(t), COLUMNA);
    if (l.length <= 2) { tam = t; lineasT = l; break; }
    tam = t; lineasT = l;
  }
  const lineasB = partirEquilibrado(bajada, SANS, TAM_BAJADA, 0, COLUMNA).slice(0, 3);

  const avances = [];
  for (let i = 1; i < lineasT.length; i++) avances.push(Math.round(tam * 1.14));
  avances.push(Math.round(tam * 0.55) + 22);
  for (let i = 1; i < lineasB.length; i++) avances.push(INTERLINEA_BAJADA);
  const subida = tam * 0.82;
  const caida = TAM_BAJADA * 0.24;
  const salto = avances.reduce((a, b) => a + b, 0);
  let base = CENTRO_BLOQUE - (subida + salto + caida) / 2 + subida;

  const partes = ['<rect width="' + ANCHO + '" height="' + ALTO + '" fill="' + FONDO + '"/>'];
  partes.push('<rect x="' + GUION.x + '" y="' + GUION.y + '" width="' + GUION.w + '" height="' + GUION.h + '" fill="' + VERDE + '"/>');
  partes.push(renglon(etiqueta, MARGEN, BASE_ETIQUETA, MONO, TAM_ETIQUETA, LS_ETIQUETA, VERDE));
  lineasT.forEach((l, i) => {
    partes.push(renglon(l, MARGEN, Math.round(base), DISPLAY, tam, lsTitular(tam), TINTA));
    if (i < lineasT.length - 1) base += Math.round(tam * 1.14);
  });
  base += Math.round(tam * 0.55) + 22;
  lineasB.forEach((l, i) => {
    partes.push(renglon(l, MARGEN, Math.round(base), SANS, TAM_BAJADA, 0, SUAVE));
    if (i < lineasB.length - 1) base += INTERLINEA_BAJADA;
  });
  partes.push('<rect x="' + MARGEN + '" y="' + DIVISORIA_Y + '" width="' + (DERECHA - MARGEN) + '" height="1" fill="' + LINEA + '"/>');
  partes.push(renglon(pie, MARGEN, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS));
  partes.push(renglon(MARCA, DERECHA, BASE_PIE, MONO, TAM_PIE, LS_PIE, GRIS, true));

  // Que ningún renglón se meta en la caja de la gráfica.
  for (const l of lineasT) {
    const w = ancho(l, DISPLAY, tam, lsTitular(tam));
    if (MARGEN + w > CAJA.x - 24) aviso(nombre + ': el titular "' + l + '" llega a x ' + Math.round(MARGEN + w) + ' y la gráfica empieza en ' + CAJA.x);
  }
  for (const l of lineasB) {
    const w = ancho(l, SANS, TAM_BAJADA, 0);
    if (MARGEN + w > CAJA.x - 24) aviso(nombre + ': la bajada "' + l + '" llega a x ' + Math.round(MARGEN + w));
  }
  const anchoPie = ancho(pie, MONO, TAM_PIE, LS_PIE);
  if (MARGEN + anchoPie > DERECHA - ancho(MARCA, MONO, TAM_PIE, LS_PIE) - 40) aviso(nombre + ': el pie no cabe con la marca');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + ANCHO + '" height="' + ALTO + '">' + partes.join('') + '</svg>';
}

async function construir() {
  const sharp = require('sharp');
  cargarMetricas();

  const salida = {};
  for (const [loc, txt] of Object.entries(TEXTOS)) {
    const svg = tarjeta(txt, 'og-reto-' + loc);
    // RAW y no JPEG: el fondo se compone en el servidor píxel a píxel, así que
    // un JPEG obligaría a llevar un descodificador. Además el ruido del JPEG
    // haría que un fondo casi plano dejara de comprimirse.
    const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
    if (raw.length !== ANCHO * ALTO * 3) throw new Error(loc + ': el crudo mide ' + raw.length);
    const comprimido = zlib.deflateSync(raw, { level: 9 });
    salida[loc] = comprimido.toString('base64');
    console.log('  ' + loc + ': ' + Math.round(comprimido.length / 1024) + ' KB comprimidos (' +
      Math.round(raw.length / 1024) + ' KB en crudo)');
  }

  const cuerpo = [
    '// GENERADO por scripts/build-og-reto.mjs. No editar a mano.',
    '//',
    '// El fondo de la og:image del reto del día, con su texto ya dibujado en las',
    '// fuentes del sitio: ' + ANCHO + '×' + ALTO + ' en RGB, comprimido con deflate y en',
    '// base64. api/_lib/og-reto.js lo infla y le pinta encima la gráfica de hoy.',
    '// Para regenerarlo: npm run build:og-reto (y commitear).',
    'module.exports = {',
    '  ancho: ' + ANCHO + ',',
    '  alto: ' + ALTO + ',',
    '  caja: ' + JSON.stringify(CAJA) + ',',
    ...Object.entries(salida).map(([loc, b64]) => '  ' + loc + ': \'' + b64 + '\','),
    '};',
    ''
  ].join('\n');

  if (fs.existsSync(DESTINO) && fs.readFileSync(DESTINO, 'utf8') === cuerpo) {
    console.log('og:reto — el fondo no cambió');
  } else {
    fs.writeFileSync(DESTINO, cuerpo);
    console.log('og:reto — escrito ' + path.relative(RAIZ, DESTINO) + ' (' + Math.round(cuerpo.length / 1024) + ' KB)');
  }
  if (faltantes.size) aviso('glifos que la fuente no tiene: ' + [...faltantes].join(', '));
}

// ------------------------------------------------------------------- arranque
// Mismo baile que build-og-pages.mjs: FONTCONFIG_PATH y PANGOCAIRO_BACKEND se
// leen al cargar la librería, así que hay que relanzarse con ellas puestas.
if (!process.env.SMARTFINANCE_OGRETO_FUENTES) {
  await prepararFuentes();
  const codigo = relanzar(ESTE, 'SMARTFINANCE_OGRETO_FUENTES', process.argv.slice(2));
  process.exit(codigo);
} else {
  await construir();
  if (avisos.length) {
    console.warn('\n[og:reto] AVISOS (' + avisos.length + '):');
    for (const a of avisos) console.warn('  - ' + a);
    process.exit(1);
  }
}
