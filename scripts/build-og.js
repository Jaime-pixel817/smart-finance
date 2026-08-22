#!/usr/bin/env node
/*
 * Genera las og:image en español: og-image-es.jpg, og-market-es.jpg y
 * og-lessons-es.jpg.
 *
 * POR QUÉ EXISTE
 * --------------
 * Las tres imágenes que se ven al compartir el sitio en WhatsApp, LinkedIn o
 * X estaban en inglés, y las páginas /es servían esas mismas. O sea: alguien
 * comparte la versión en español y la tarjeta que aparece dice "Finance that
 * actually clicks." y "MARKETS / LESSONS / DAILY NEWSLETTER".
 *
 * QUÉ HACE, Y POR QUÉ ASÍ
 * -----------------------
 * NO redibuja la imagen: parte del JPG en inglés, borra ÚNICAMENTE los
 * renglones de texto que cambian y vuelve a escribirlos en español encima.
 * La foto, el aro verde, el guion, la línea divisoria, el nombre y el
 * @smart.financee salen intactos, byte por byte, porque nunca se tocan.
 *
 * Reconstruir la imagen entera habría sido adivinar el recorte de la foto, el
 * grosor del aro y el degradado; así la versión en español no PUEDE separarse
 * de la inglesa en nada que no sea el texto. El fondo bajo el texto es plano
 * (#0A0A0A en toda la columna izquierda, comprobado píxel a píxel), que es lo
 * que hace posible borrar con un rectángulo.
 *
 * DÓNDE VA CADA RENGLÓN
 * ---------------------
 * No hay coordenadas escritas a mano. Para cada renglón se dibuja PRIMERO el
 * texto en inglés y se busca en qué posición encaja mejor contra el JPG
 * original (`alinear`); esa posición es la pluma —el origen de la línea base—
 * y ahí mismo se escribe el español. Si un día se rehace el diseño y el texto
 * se mueve, el script lo vuelve a encontrar solo.
 *
 * LAS FUENTES
 * -----------
 * Son las del sitio: assets/fonts/*.woff2. librsvg no sabe leer woff2 ni
 * @font-face, así que se descomprimen a .ttf en una carpeta temporal y se le
 * pasa a fontconfig por FONTCONFIG_PATH. Esa variable se lee cuando la
 * librería arranca, antes de que este archivo pueda tocarla, así que el
 * script se relanza a sí mismo una vez con el entorno ya puesto.
 *
 * Los tamaños y el tracking (abajo, en TIPOGRAFÍA) se sacaron midiendo el JPG
 * en inglés: son los que reproducen su ancho con menos de 2 px de diferencia.
 *
 * CÓMO SE USA
 * -----------
 *   npm run build:og
 *
 * Se corre a mano y el resultado se commitea, igual que build-email-icons.
 * Solo hay que volver a correrlo si cambian las imágenes en inglés o su copia.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// El sitio legacy (fuentes, og:images) vive en public/ desde la migración a Astro.
const RAIZ = path.join(__dirname, '..', 'public');
const FUENTES = path.join(RAIZ, 'assets', 'fonts');
const TMP = path.join(os.tmpdir(), 'smartfinance-og-fuentes');

// ------------------------------------------------------------------ tipografía
const DISPLAY = 'Fraunces SemiBold';
const SANS = 'Geist';
const MONO = 'Geist Mono Medium';

const FONDO = '#0A0A0A';        // el negro de la lona, medido del propio JPG
const TINTA = '#F5F5F2';        // --ink
const SUAVE = '#B8B8BA';        // el gris del subtítulo
const PIE = '#8A8A8E';          // --muted, el gris del renglón de abajo

// Los tres pies usan la misma caja tipográfica (19 px con 1 px de tracking);
// se comprobó contra las tres imágenes y las tres cuadran al píxel.
const CAJA_PIE = { familia: MONO, tam: 19, ls: 1, color: PIE };
const CAJA_SUB = { familia: SANS, tam: 26, ls: 0, color: SUAVE };

/*
 * Las páginas.
 *
 * `en` es el texto que hay HOY en el JPG en inglés: se usa para encontrar el
 * renglón, así que tiene que decir exactamente lo que dice la imagen.
 * `es` es lo que se escribe encima. Cuando son varios renglones, el corte de
 * línea se elige aquí: la caja mide unos 610 px de ancho antes de llegar a la
 * foto, y el español es más largo que el inglés casi siempre.
 */
const IMAGENES = [
  {
    origen: 'og-image.jpg', destino: 'og-image-es.jpg',
    bloques: [
      { caja: { familia: SANS, tam: 26, ls: 0, color: SUAVE },
        borrar: { y0: 316, y1: 362 },
        en: ['Finance that actually clicks.'],
        es: ['Finanzas que sí se entienden.'] },
      { caja: CAJA_PIE,
        borrar: { y0: 558, y1: 592 },
        en: ['MARKETS  /  LESSONS  /  DAILY NEWSLETTER'],
        es: ['MERCADO  /  LECCIONES  /  BOLETÍN DIARIO'] }
    ]
  },
  {
    origen: 'og-market.jpg', destino: 'og-market-es.jpg',
    bloques: [
      { caja: { familia: DISPLAY, tam: 73, ls: 0, color: TINTA },
        borrar: { y0: 168, y1: 258 },
        en: ['Markets'],
        es: ['Mercados'] },
      { caja: CAJA_SUB, interlinea: 38,
        borrar: { y0: 282, y1: 398 },
        en: ['Stocks, currencies and', 'crypto — each with its own', 'trend chart.'],
        es: ['Acciones, divisas y cripto,', 'cada cosa con su propia', 'gráfica de tendencia.'] },
      { caja: CAJA_PIE,
        borrar: { y0: 558, y1: 592 },
        en: ['UPDATED EVERY 15 MINUTES  /  NOT A TRADING FEED'],
        // "SE ACTUALIZA CADA 15 MINUTOS / NO ES PARA OPERAR" se salía por la
        // derecha (el aviso de `comprobarAncho` lo cazó a 697 px, pegado a la
        // foto). Esta dice lo mismo y cabe.
        es: ['CADA 15 MINUTOS  /  NO ES UN FEED PARA OPERAR'] }
    ]
  },
  {
    origen: 'og-lessons.jpg', destino: 'og-lessons-es.jpg',
    bloques: [
      { caja: { familia: DISPLAY, tam: 72, ls: 0, color: TINTA },
        borrar: { y0: 168, y1: 258 },
        en: ['Lessons'],
        es: ['Lecciones'] },
      { caja: CAJA_SUB, interlinea: 38,
        borrar: { y0: 282, y1: 398 },
        en: ['Finance from zero, in plain', 'words. Six lessons, five', 'minutes each.'],
        es: ['Finanzas desde cero, en', 'palabras normales. Seis', 'lecciones de cinco minutos.'] },
      { caja: CAJA_PIE,
        borrar: { y0: 558, y1: 592 },
        en: ['THE PESO  /  COMPOUND INTEREST  /  INFLATION'],
        es: ['EL PESO  /  INTERÉS COMPUESTO  /  INFLACIÓN'] }
    ]
  }
];

// El rectángulo que se borra llega hasta aquí por la derecha. La foto empieza
// en x≈708 (su resplandor incluido), así que 700 es el último punto seguro:
// más allá se estaría pintando encima del aro verde.
const BORRAR_X0 = 68;
const BORRAR_X1 = 700;

const ANCHO = 1200, ALTO = 630;

// ------------------------------------------------------------------- fuentes

/*
 * Descomprime las woff2 del sitio a .ttf y deja un fonts.conf apuntando a esa
 * carpeta. La carpeta de caché tiene que EXISTIR: si no, fontconfig ni
 * siquiera escanea el directorio y todo sale con la fuente de respaldo (una
 * serif monoespaciada que no se parece en nada). No da error: simplemente
 * dibuja con otra letra, y por eso conviene saberlo.
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

// --------------------------------------------------------------------- dibujo

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/*
 * Un renglón (o varios) sobre lona del color del fondo, del tamaño de la
 * imagen entera. Se dibuja a tamaño completo a propósito: así las coordenadas
 * del render y las del JPG son las mismas y comparar es restar.
 */
function lona(lineas, caja, x, base, interlinea) {
  const textos = lineas.map((linea, i) =>
    '<text x="' + x + '" y="' + (base + i * (interlinea || 0)) + '" ' +
    'font-family="' + caja.familia + '" font-size="' + caja.tam + '" ' +
    'fill="' + caja.color + '"' + (caja.ls ? ' letter-spacing="' + caja.ls + '"' : '') +
    ' xml:space="preserve">' + escapar(linea) + '</text>').join('');
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + ANCHO + '" height="' + ALTO + '">' +
    '<rect width="' + ANCHO + '" height="' + ALTO + '" fill="' + FONDO + '"/>' + textos + '</svg>');
}

// Píxeles en crudo de un buffer de imagen, en gris.
async function gris(sharp, buf) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data: data, w: info.width, h: info.height };
}

/*
 * De dónde arranca la búsqueda: la esquina de arriba a la izquierda de la
 * tinta que ya hay en esa franja del JPG. La línea base va un poco más abajo
 * que esa primera fila —cosa de tres cuartos del cuerpo—, que es suficiente
 * para caer dentro del margen de ±14 px que barre `alinear`.
 */
async function puntoDePartida(sharp, original, bloque) {
  const g = await gris(sharp, original);
  let primeraY = null, primeraX = null;
  for (let y = bloque.borrar.y0; y <= bloque.borrar.y1 && primeraY === null; y++) {
    for (let x = BORRAR_X0; x <= BORRAR_X1; x++) {
      if (g.data[y * g.w + x] > 26) { primeraY = y; break; }
    }
  }
  for (let x = BORRAR_X0; x <= BORRAR_X1 && primeraX === null; x++) {
    for (let y = bloque.borrar.y0; y <= bloque.borrar.y1; y++) {
      if (g.data[y * g.w + x] > 26) { primeraX = x; break; }
    }
  }
  if (primeraY === null) throw new Error('no hay texto en la franja ' + bloque.borrar.y0 + '-' + bloque.borrar.y1);
  return { x: primeraX, base: Math.round(primeraY + bloque.caja.tam * 0.78) };
}

/*
 * Encuentra la pluma real del renglón.
 *
 * Se dibuja el texto EN INGLÉS en una posición de prueba y se desliza sobre el
 * original buscando dónde se parecen más. La medida es la suma de diferencias
 * absolutas dentro de la franja del renglón: cuanto más chica, mejor encaje.
 *
 * Se busca en ±14 px, que sobra: la posición de prueba ya sale del propio
 * diseño y el ajuste real acaba siendo de pocos píxeles.
 */
async function alinear(sharp, original, bloque, pruebaX, pruebaBase) {
  const franja = { y0: bloque.borrar.y0, y1: bloque.borrar.y1 };
  const orig = await gris(sharp, original);
  const render = await gris(sharp, await sharp(lona(bloque.en, bloque.caja, pruebaX, pruebaBase, bloque.interlinea)).png().toBuffer());

  let mejor = null;
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      let suma = 0;
      for (let y = franja.y0; y <= franja.y1; y += 2) {
        const yr = y - dy;
        if (yr < 0 || yr >= orig.h) { suma += 1e6; break; }
        for (let x = BORRAR_X0; x <= BORRAR_X1; x += 2) {
          const xr = x - dx;
          if (xr < 0 || xr >= orig.w) continue;
          suma += Math.abs(orig.data[y * orig.w + x] - render.data[yr * render.w + xr]);
        }
      }
      if (!mejor || suma < mejor.suma) mejor = { suma: suma, dx: dx, dy: dy };
    }
  }
  return { x: pruebaX + mejor.dx, base: pruebaBase + mejor.dy };
}

// El renglón en español, ya recortado a su franja para poder pegarlo sin
// tapar nada de arriba ni de abajo.
async function parche(sharp, bloque, pluma) {
  const alto = bloque.borrar.y1 - bloque.borrar.y0 + 1;
  const png = await sharp(lona(bloque.es, bloque.caja, pluma.x, pluma.base, bloque.interlinea))
    .extract({ left: BORRAR_X0, top: bloque.borrar.y0, width: BORRAR_X1 - BORRAR_X0 + 1, height: alto })
    .png().toBuffer();
  return { input: png, left: BORRAR_X0, top: bloque.borrar.y0 };
}

// Avisa si el español se sale de la columna y se mete debajo de la foto.
async function comprobarAncho(sharp, bloque, pluma, avisos, archivo) {
  const png = await sharp(lona(bloque.es, bloque.caja, pluma.x, pluma.base, bloque.interlinea)).png().toBuffer();
  const g = await gris(sharp, png);
  let maxX = 0;
  for (let y = bloque.borrar.y0; y <= bloque.borrar.y1; y++) {
    for (let x = g.w - 1; x > maxX; x--) if (g.data[y * g.w + x] > 26) { maxX = x; break; }
  }
  if (maxX > BORRAR_X1 - 10) {
    avisos.push(archivo + ': "' + bloque.es[0] + '" llega a x=' + maxX + ', demasiado cerca de la foto');
  }
  return maxX;
}

// ---------------------------------------------------------------------- salida

async function construir() {
  const sharp = require('sharp');
  const avisos = [];

  for (const img of IMAGENES) {
    const original = fs.readFileSync(path.join(RAIZ, img.origen));
    const parches = [];

    for (const bloque of img.bloques) {
      const arranque = await puntoDePartida(sharp, original, bloque);
      const pluma = await alinear(sharp, original, bloque, arranque.x, arranque.base);
      await comprobarAncho(sharp, bloque, pluma, avisos, img.destino);
      parches.push(await parche(sharp, bloque, pluma));
      console.log('  ' + img.destino.padEnd(20) + '"' + bloque.es[0].slice(0, 30) + '"' +
        '  pluma x=' + pluma.x + ' base=' + pluma.base);
    }

    // Se borra y se pega en una sola pasada: el parche ya trae el fondo.
    const salida = await sharp(original).composite(parches)
      .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(path.join(RAIZ, img.destino), salida);
    console.log(img.destino + ' — ' + Math.round(salida.length / 1024) + ' KB');
  }

  return avisos;
}

// Relanzarse con FONTCONFIG_PATH puesto: fontconfig lo lee al cargar la
// librería, así que ponerlo desde dentro del propio proceso llega tarde.
if (require.main === module) {
  if (!process.env.SMARTFINANCE_OG_FUENTES) {
    prepararFuentes().then(() => {
      const { spawnSync } = require('child_process');
      const r = spawnSync(process.execPath, [__filename], {
        stdio: 'inherit',
        env: Object.assign({}, process.env, {
          FONTCONFIG_PATH: TMP,
          SMARTFINANCE_OG_FUENTES: '1'
        })
      });
      process.exit(r.status === null ? 1 : r.status);
    }).catch((e) => { console.error(e); process.exit(1); });
  } else {
    construir().then((avisos) => {
      if (avisos.length) {
        console.log('\nAVISOS (' + avisos.length + '):');
        avisos.forEach((a) => console.log('  - ' + a));
        process.exit(1);
      }
      console.log('\nlisto: tres og:image en español');
    }).catch((e) => { console.error(e); process.exit(1); });
  }
}

module.exports = { IMAGENES };
