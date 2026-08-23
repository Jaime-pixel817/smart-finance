// scripts/build-photos.mjs — recorta las fotos por donde hay que recortarlas
// y les pone HUELLA DE CONTENIDO en el nombre.
//
// POR QUÉ NO VALE sharp.strategy.attention. Es lo que se usó la primera vez y
// por eso la miniatura de la entrevista con Andy Toh era UNA MESA DE CENTRO: la
// heurística de saliencia de libvips premia contraste y bordes, y en esa foto
// el terrazo blanco con manchas negras gana por goleada a dos caras a
// contraluz detrás de un cristal. Lo mismo, más suave, en Shibuya: los letreros
// de neón se llevaban el encuadre y a Jaime le cortaban la barbilla.
//
// Así que el punto focal de cada foto va ESCRITO, en fracciones de la imagen
// original, después de mirarlas una por una con una rejilla de porcentajes
// encima. Cada uno lleva anotado qué es lo que hay ahí. Es una tabla de seis
// filas que se revisa en diez segundos; la alternativa era una heurística que
// falla en silencio.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ CADA ARCHIVO LLEVA HUELLA (esto es lo importante)
// ═══════════════════════════════════════════════════════════════════════════
// vercel.json sirve las fotos con `cache-control: public, max-age=31536000,
// immutable`. `immutable` es una PROMESA: le dice al navegador que ese URL no
// va a cambiar nunca, así que ni siquiera pregunte durante un año.
//
// Mientras los archivos se llamaron `breakdown-andy-toh.webp` a secas, esa
// promesa era mentira. Se arregló el recorte de la entrevista, se desplegó, el
// servidor ya devolvía la foto buena... y el teléfono de Jaime siguió enseñando
// la mesa de centro, porque tenía el URL viejo guardado hasta 2027. Ni
// recargar ayuda: `immutable` se salta la revalidación.
//
// Con huella, el nombre CAMBIA cuando cambia el contenido
// (`breakdown-andy-toh.5f3a91c2.webp`), así que un cambio de foto es un URL
// nuevo que nadie tiene cacheado, y el viejo puede quedarse en la caché de
// quien sea sin hacer daño. La regla, en una línea:
//
//     lo que se sirve con `immutable` lleva huella; lo que no lleva huella no
//     se sirve con `immutable`.
//
// Las páginas NUNCA escriben la ruta a pelo: leen `src/generated/photos.json`
// (commiteado) con `foto()` de `src/lib/photos.ts`. Si falta una clave, el
// build se cae con el nombre de la que falta — que es lo que uno quiere: un
// `<img>` roto en producción no avisa.
//
// QUÉ ESCRIBE (todo en public/assets/fotos/, con huella)
//   breakdown-<id>.<huella>.webp   480x360 (4:3), el doble que antes para que
//                                  no se vean blandas en pantallas de densidad 2
//   jaime-96.<huella>.jpg          96x96, la cara centrada en el círculo del
//                                  avatar del home y de la firma de lecciones
//   jaime-160/-320.<huella>.webp   retrato para la ficha de /about
//   grupo.<huella>.webp, grupo-800.<huella>.webp, grupo.<huella>.jpg
//                                  la foto del grupo de /community
//   + src/generated/photos.json    el manifiesto: nombre lógico -> ruta final
//
// DE DÓNDE LEE (originales, NO se despliegan: están en .vercelignore)
//   public/assets/breakdowns/breakdown-<id>.jpg
//   public/assets/community/grupo-original.jpg
//   jaime.webp (raíz del repo, fuera de public/)
//
// Al terminar borra de public/assets/fotos/ todo lo que no esté en el
// manifiesto, así que cambiar una foto no deja huérfanas.
//
// CÓMO SE CORRE:  node scripts/build-photos.mjs   (después: commit de
// public/assets/fotos/ y de src/generated/photos.json JUNTOS)

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...x) => path.join(raiz, ...x);
const kb = (buf) => (buf.length / 1024).toFixed(1) + ' KB';

/* ── Publicar con huella ───────────────────────────────────────────────────
 * `nombre` es el nombre LÓGICO y estable (el que usan las páginas y la clave
 * del manifiesto): 'breakdown-japan.webp'. Lo que se escribe en disco lleva
 * ocho hex del sha256 del contenido metidos antes de la extensión. */
const SALIDA = p('public/assets/fotos');
const MANIFIESTO = p('src/generated/photos.json');
const manifiesto = {};
const escritos = new Set();

fs.mkdirSync(SALIDA, { recursive: true });

function publicar(nombre, buffer) {
  const punto = nombre.lastIndexOf('.');
  const huella = createHash('sha256').update(buffer).digest('hex').slice(0, 8);
  const archivo = nombre.slice(0, punto) + '.' + huella + nombre.slice(punto);
  fs.writeFileSync(path.join(SALIDA, archivo), buffer);
  manifiesto[nombre] = '/assets/fotos/' + archivo;
  escritos.add(archivo);
  return archivo;
}

/* ── Los seis breakdowns ───────────────────────────────────────────────────
 * fx, fy = punto focal en fracciones de la foto ORIGINAL. Lo que se recorta es
 * la caja 4:3 MÁS GRANDE que cabe, centrada en ese punto y pegada al borde si
 * se sale. */
const BREAKDOWNS = [
  // Shibuya de noche. La cara está justo a la mitad de la vertical; por debajo
  // solo hay acera y por encima, letreros. Centrar en ella deja las dos cosas.
  { id: 'japan', fx: 0.47, fy: 0.47 },
  // Entrevista con Andy Toh. La foto es VERTICAL (900x1582), así que el recorte
  // 4:3 se lleva la anchura entera y lo único que se decide es la BANDA de
  // altura. Medido con la rejilla: cabeza de Andy de 0.33 a 0.48 y la de Jaime
  // de 0.37 a 0.50 (caras en x = 0.19 y x = 0.71), los cuerpos hasta 0.70 y la
  // mesa de terrazo de 0.70 para abajo.
  //   Con fy = 0.44 la banda salía 0.23–0.65: media pantalla de cristalera
  //   vacía encima de las cabezas, las dos personas empujadas al borde de abajo
  //   y las piernas cortadas a media pierna. En la tarjeta de 160 px eso se lee
  //   como un local, no como una entrevista.
  //   Con 0.50 la banda es 0.29–0.71: las caras caen en el tercio superior
  //   (donde van en un retrato), entran los dos cuerpos enteros hasta las manos
  //   y el corte de abajo queda JUSTO encima de la mesa, que se queda fuera.
  { id: 'andy-toh', fx: 0.45, fy: 0.50 },
  // Marina Bay Sands detrás (su techo está en 0.44) y Jaime delante (cara en
  // 0.55). Con el foco en 0.52 entran el hotel entero y la cara.
  { id: 'singapore', fx: 0.54, fy: 0.52 },
  // Cinco personas de pie: las cinco caras están en la misma línea, en 0.25.
  // La foto es casi 4:3 ya, así que esto solo decide cuánto suelo se quita.
  { id: 'jpmorgan-etf', fx: 0.50, fy: 0.35 },
  // Jaime y Moris Dieck. Caras en 0.38 y 0.65, a la altura 0.41.
  { id: 'moris-dieck', fx: 0.51, fy: 0.42 },
  // Podcast: dos personas hablando, caras en 0.30 y 0.72, altura 0.33. La foto
  // es más ancha que 4:3, así que aquí lo que se recorta son los lados.
  { id: 'trading-room-podcast', fx: 0.51, fy: 0.38 }
];

const ASPECTO = 4 / 3;
const ANCHO = 480, ALTO = 360;

/** La caja 4:3 más grande dentro de W×H, centrada en (fx, fy) y sujeta al borde. */
function caja(W, H, fx, fy) {
  let w, h;
  if (W / H > ASPECTO) { h = H; w = Math.round(H * ASPECTO); }
  else { w = W; h = Math.round(W / ASPECTO); }
  const left = Math.max(0, Math.min(W - w, Math.round(fx * W - w / 2)));
  const top = Math.max(0, Math.min(H - h, Math.round(fy * H - h / 2)));
  return { left, top, width: w, height: h };
}

console.log('miniaturas de breakdowns (480x360, 4:3)');
for (const b of BREAKDOWNS) {
  const src = p('public/assets/breakdowns/breakdown-' + b.id + '.jpg');
  const m = await sharp(src).metadata();
  const c = caja(m.width, m.height, b.fx, b.fy);
  const buf = await sharp(src).extract(c).resize(ANCHO, ALTO).webp({ quality: 78 }).toBuffer();
  const archivo = publicar('breakdown-' + b.id + '.webp', buf);
  // Dónde queda el punto focal DENTRO del recorte, en % — es lo que hay que
  // poner en object-position por si alguna vez la caja del HTML no es 4:3.
  const oy = Math.round(((b.fy * m.height - c.top) / c.height) * 100);
  const ox = Math.round(((b.fx * m.width - c.left) / c.width) * 100);
  console.log('  ' + archivo.padEnd(40) + kb(buf).padStart(9) + '   object-position: ' + ox + '% ' + oy + '%');
}

/* ── Jaime ─────────────────────────────────────────────────────────────────
 * jaime.webp (520x463, en la raíz del repo) es el original. Medido con la
 * rejilla: la gorra empieza en y = 8 %, los ojos están en 33 %, la barbilla en
 * 50 %, y la cara está centrada en x = 50 %. O sea que la cabeza ocupa del 8 %
 * al 50 % — la mitad de arriba. Un recorte cuadrado "centrado" a secas, que es
 * lo que había, deja la cara pegada al borde de arriba: dentro de un círculo de
 * 48 px se le comía la gorra y se veía sobre todo chamarra roja. */
const JAIME = p('jaime.webp');
const caraX = 0.50, caraCentroY = (0.08 + 0.50) / 2;   // centro de la cabeza
const m = await sharp(JAIME).metadata();
const cx = caraX * m.width, cy = caraCentroY * m.height;

console.log('Jaime');
// Avatar: la cabeza ocupa el 65 % del alto del cuadro y su centro cae en el
// 46 % — dentro de un círculo eso deja la cara en el medio y aire por los dos
// lados. Es el mismo archivo que usan el avatar de 48 px del home y el de
// 24 px de la firma de las lecciones.
{
  const alturaCabeza = (0.50 - 0.08) * m.height;
  const lado = Math.round(Math.min(m.height, alturaCabeza / 0.65));
  const left = Math.max(0, Math.min(m.width - lado, Math.round(cx - lado / 2)));
  const top = Math.max(0, Math.min(m.height - lado, Math.round(cy - lado * 0.46)));
  const buf = await sharp(JAIME).extract({ left, top, width: lado, height: lado }).resize(96, 96).jpeg({ quality: 82 }).toBuffer();
  const archivo = publicar('jaime-96.jpg', buf);
  console.log('  ' + archivo.padEnd(40) + kb(buf).padStart(9) + '   recorte ' + lado + 'px desde (' + left + ',' + top + ')');
}
// /about: retrato de medio cuerpo, con la cabeza al 48 % del cuadro y el centro
// de la cabeza en el 35 % — la proporción de un retrato normal, no un primer
// plano. Cuadrado, que es como lo pinta .about-photo (160 px, esquinas
// redondeadas).
{
  const alturaCabeza = (0.50 - 0.08) * m.height;
  const lado = Math.round(Math.min(m.height, alturaCabeza / 0.48));
  const left = Math.max(0, Math.min(m.width - lado, Math.round(cx - lado / 2)));
  const top = Math.max(0, Math.min(m.height - lado, Math.round(cy - lado * 0.35)));
  for (const tam of [160, 320]) {
    const buf = await sharp(JAIME).extract({ left, top, width: lado, height: lado }).resize(tam, tam).webp({ quality: 82 }).toBuffer();
    const archivo = publicar('jaime-' + tam + '.webp', buf);
    console.log('  ' + archivo.padEnd(40) + kb(buf).padStart(9) + '   recorte ' + lado + 'px desde (' + left + ',' + top + ')');
  }
}

/* ── La foto del grupo (/community) ────────────────────────────────────────
 *
 * Original: public/assets/community/grupo-original.jpg (3797x2848, 4:3), ocho
 * personas de pie en fila delante del cartel de Smart Finance. NO se sirve
 * (está en .vercelignore): de aquí salen las tres versiones que sí.
 *
 * MEDIDO CON LA REJILLA DE PORCENTAJES (scripts/.tmp/grid.mjs en su día):
 *   - la cabeza más alta empieza en y = 8.3 %; por encima solo hay toldo y cielo
 *   - el zapato más bajo termina en y = 95 %; por debajo solo hay adoquín
 *   - la fila ocupa de x = 7 % a x = 93 %
 *   - el cartel "SMART FINANCE" va de y = 5 % a y = 30 %
 *
 * POR QUÉ NO SE RECORTA AQUÍ. La fila entera ocupa el 87 % del alto, y la caja
 * de escritorio (16:9) solo enseña el 75 %: cualquier recorte fijo tendría que
 * elegir por las dos cajas a la vez. Así que el archivo sale con el ENCUADRE
 * COMPLETO —las ocho personas de pies a cabeza, que es justo lo que pide la
 * caja 4:3 del teléfono— y quien decide qué se ve en escritorio es
 * object-position: 50 % 24 % (GroupPhoto.astro). Con ese valor la banda visible
 * en 16:9 va del 6 % al 81 %: entra el cartel, entran las ocho cabezas con aire
 * por encima y el corte cae por los tobillos. O sea, se recorta el SUELO, que
 * es lo que sobra, y no el cielo con el cartel.
 *
 * Si algún día se cambia la caja de escritorio a 3:2, la banda pasa a ser el
 * 89 % y con object-position: 50 % 45 % salen los ocho enteros también ahí.
 */
{
  const src = p('public/assets/community/grupo-original.jpg');
  if (!fs.existsSync(src)) {
    console.log('grupo: no está public/assets/community/grupo-original.jpg — me lo salto');
  } else {
    const g = await sharp(src).metadata();
    console.log('foto del grupo (' + g.width + 'x' + g.height + ', encuadre completo)');
    for (const [ancho, nombre] of [[1600, 'grupo.webp'], [800, 'grupo-800.webp']]) {
      const buf = await sharp(src).resize(ancho).webp({ quality: 80 }).toBuffer();
      const archivo = publicar(nombre, buf);
      console.log('  ' + archivo.padEnd(40) + kb(buf).padStart(9) + '   ' + ancho + 'x' + Math.round(ancho * g.height / g.width));
    }
    // Respaldo para navegadores sin webp (y para og:image si algún día se usa).
    const buf = await sharp(src).resize(1600).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const archivo = publicar('grupo.jpg', buf);
    console.log('  ' + archivo.padEnd(40) + kb(buf).padStart(9) + '   1600x' + Math.round(1600 * g.height / g.width));
  }
}

/* ── Huérfanas y manifiesto ────────────────────────────────────────────────
 * Con huella, cambiar una foto deja el archivo viejo en la carpeta para
 * siempre. Aquí se barre: lo que no se acaba de escribir, fuera. Si el script
 * se corriera a medias (una foto original que falta), esto NO borraría las
 * demás porque cada bloque escribe antes de llegar aquí. */
let borradas = 0;
for (const f of fs.readdirSync(SALIDA)) {
  if (escritos.has(f)) continue;
  fs.unlinkSync(path.join(SALIDA, f));
  console.log('  huérfana borrada: ' + f);
  borradas++;
}

const ordenado = {};
for (const k of Object.keys(manifiesto).sort()) ordenado[k] = manifiesto[k];
fs.writeFileSync(MANIFIESTO, JSON.stringify(ordenado, null, 2) + '\n');

console.log('\nmanifiesto: src/generated/photos.json (' + Object.keys(ordenado).length +
            ' fotos, ' + borradas + ' huérfanas borradas)');
console.log('commitea public/assets/fotos/ y src/generated/photos.json JUNTOS.');
