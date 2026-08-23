// scripts/build-geo.mjs — los datos geográficos del globo, en binario y ligeros.
//
// POR QUÉ EXISTE. public/assets/geoMasks.js son 551 KB de base64 que el
// navegador tendría que descargar Y parsear como JavaScript en cada visita al
// home. Base64 pesa un tercio de más que los bytes que representa y encima
// obliga a que el dato pase por el parser de JS. Aquí se decodifica UNA vez, en
// el build, y se escriben binarios que el globo pide con fetch + ArrayBuffer
// dentro de su arranque diferido (después de `load`, en tiempo ocioso), así que
// no tocan el LCP.
//
// QUÉ ESCRIBE (public/assets/geo/)
//
//   land.bin         1440x720, UN BIT por píxel (129 600 B). Sale tal cual de
//                    LAND_MASK_B64. Fila 0 = lat +90, columna 0 = lon -180.
//   country.bin      720x360, id de país por píxel, comprimido con RLE
//                    (valor uint8 + repeticiones uint16). El océano es el 76 %
//                    del planeta y son carreras larguísimas: el RLE lo deja en
//                    una fracción de los 259 200 B en crudo.
//   country-ids.json qué id es cada país (para depurar y para el paso 3).
//   border-pos.bin   vértices de las fronteras, Int16 (lon*91.02, lat*182.04).
//   border-edges.bin pares de índices Uint16 para THREE.LineSegments.
//   ../../src/generated/globe-fallback.svg  globo estático del primer pintado.
//
// DE DÓNDE SALE CADA COSA, Y POR QUÉ NO TODO DE geoMasks.js
//
//   - La MÁSCARA DE TIERRA sí sale de geoMasks.js (LAND_MASK_B64): decodifica
//     limpio, es la de más resolución que hay (1440x720) y se comprobó contra
//     una veintena de coordenadas conocidas.
//   - La MÁSCARA DE PAÍSES y las FRONTERAS se regeneran desde world-atlas
//     (dependencia que ya estaba en package.json) por dos motivos concretos:
//       1. COUNTRY_MASK_B64 son 4 bits por píxel, o sea 15 países como mucho.
//          Se decodificó y se comprobó: están México, EE. UU., China, Brasil,
//          Turquía, Japón, Reino Unido, Alemania, India, Sudáfrica, Argentina y
//          Colombia... y CANADÁ NO ESTÁ. Toronto es una de las ocho bolsas del
//          globo, así que esa máscara no sirve para lo que se le pide.
//       2. BORDER_POS_B64 no vuelve a un mapa del mundo reconocible bajo
//          ninguna de las interpretaciones evidentes de su Int16 (equirect en
//          grados, en radianes, píxeles del lienzo): la nube de puntos deja
//          fuera todo lo que está al este de los 70° y al oeste de los -110°.
//          Se probó y se descartó.
//     world-atlas trae los 177 países con nombre e ISO, así que la máscara sale
//     completa y las fronteras son la malla de topojson, que es exactamente el
//     dato que quiere un THREE.LineSegments.
//
// CÓMO SE CORRE:  node scripts/build-geo.mjs
// (no está en `npm run build`: los binarios se commitean, como las og:images)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature, mesh } from 'topojson-client';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'public/assets/geo');
fs.mkdirSync(salida, { recursive: true });
fs.mkdirSync(path.join(raiz, 'src/generated'), { recursive: true });

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const escribir = (nombre, buf) => {
  fs.writeFileSync(path.join(salida, nombre), buf);
  console.log('  ' + nombre.padEnd(18) + kb(buf.length));
  return buf.length;
};

/* ══════════════════════════════════════════════════════════════════════════
   1. TIERRA — LAND_MASK_B64 de geoMasks.js, bit por píxel
   ════════════════════════════════════════════════════════════════════════ */
const LAND_COLS = 1440, LAND_ROWS = 720;
const geoMasks = fs.readFileSync(path.join(raiz, 'public/assets/geoMasks.js'), 'utf8');
const b64 = (nombre) => {
  const m = geoMasks.match(new RegExp(nombre + '\\s*=\\s*"([^"]*)"'));
  if (!m) throw new Error('no se encontró ' + nombre + ' en geoMasks.js');
  return Buffer.from(m[1], 'base64');
};
const land = b64('LAND_MASK_B64');
if (land.length !== (LAND_COLS * LAND_ROWS) / 8) throw new Error('land.bin: tamaño inesperado ' + land.length);
const landAt = (col, row) => (land[(row * LAND_COLS + col) >> 3] >> (7 - ((row * LAND_COLS + col) & 7))) & 1;

console.log('geo →');
let total = escribir('land.bin', land);

/* ══════════════════════════════════════════════════════════════════════════
   2. PAÍSES — rasterizado de world-atlas a 720x360, comprimido con RLE
   ════════════════════════════════════════════════════════════════════════ */
const CTY_COLS = 720, CTY_ROWS = 360;
const topo = JSON.parse(fs.readFileSync(path.join(raiz, 'node_modules/world-atlas/countries-50m.json'), 'utf8'));
const paises = feature(topo, topo.objects.countries).features
  .filter((f) => f.properties && f.properties.name)
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
if (paises.length > 255) throw new Error('más de 255 países: el id no cabe en un byte');

const mask = new Uint8Array(CTY_COLS * CTY_ROWS);
const ids = {};

// Relleno por barrido: para cada fila de píxeles se cortan TODOS los anillos
// del polígono (exterior y agujeros) y se pintan los tramos con la regla
// par-impar, que es la que respeta los huecos (Lesoto dentro de Sudáfrica).
function pintarPoligono(anillos, id) {
  let latMin = 90, latMax = -90, lonMin = 180, lonMax = -180;
  for (const anillo of anillos) for (const [lon, lat] of anillo) {
    if (lat < latMin) latMin = lat; if (lat > latMax) latMax = lat;
    if (lon < lonMin) lonMin = lon; if (lon > lonMax) lonMax = lon;
  }
  // Un polígono que cruza el antimeridiano saldría como una banda que da la
  // vuelta al mundo. world-atlas ya los parte, pero por si acaso se descarta.
  if (lonMax - lonMin > 350) return;
  const filaDe = (lat) => Math.floor(((90 - lat) / 180) * CTY_ROWS);
  const y0 = Math.max(0, filaDe(latMax) - 1), y1 = Math.min(CTY_ROWS - 1, filaDe(latMin) + 1);
  const cortes = [];
  for (let y = y0; y <= y1; y++) {
    const lat = 90 - ((y + 0.5) / CTY_ROWS) * 180;
    cortes.length = 0;
    for (const anillo of anillos) {
      for (let i = 0, n = anillo.length; i < n; i++) {
        const [x1, y1p] = anillo[i], [x2, y2p] = anillo[(i + 1) % n];
        if ((y1p > lat) === (y2p > lat)) continue;
        cortes.push(x1 + ((lat - y1p) / (y2p - y1p)) * (x2 - x1));
      }
    }
    if (cortes.length < 2) continue;
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(((cortes[k] + 180) / 360) * CTY_COLS - 0.5));
      const c1 = Math.min(CTY_COLS - 1, Math.floor(((cortes[k + 1] + 180) / 360) * CTY_COLS - 0.5));
      for (let x = c0; x <= c1; x++) mask[y * CTY_COLS + x] = id;
    }
  }
}

paises.forEach((f, i) => {
  const id = i + 1;
  ids[id] = f.properties.name;
  const g = f.geometry;
  if (!g) return;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const p of polys) pintarPoligono(p, id);
});

// Un país minúsculo (Singapur, Hong Kong dentro de China) puede no dejar NI UN
// píxel a 0.5° por caer entre dos centros de celda. Se rescata pintando la
// celda del centroide de su polígono más grande, para que ningún id se pierda.
paises.forEach((f, i) => {
  const id = i + 1;
  if (mask.includes(id)) return;
  const g = f.geometry; if (!g) return;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  if (!polys.length) return;
  const anillo = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
  let lon = 0, lat = 0;
  for (const [a, b] of anillo) { lon += a; lat += b; }
  lon /= anillo.length; lat /= anillo.length;
  const x = Math.min(CTY_COLS - 1, Math.max(0, Math.floor(((lon + 180) / 360) * CTY_COLS)));
  const y = Math.min(CTY_ROWS - 1, Math.max(0, Math.floor(((90 - lat) / 180) * CTY_ROWS)));
  mask[y * CTY_COLS + x] = id;
});

// RLE: [valor uint8][repeticiones uint16 LE]. Las carreras más largas que
// 65535 se parten en varias, que a este tamaño no pasa nunca.
function rle(arr) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    const v = arr[i];
    let n = 1;
    while (i + n < arr.length && arr[i + n] === v && n < 65535) n++;
    out.push([v, n]);
    i += n;
  }
  const buf = Buffer.alloc(out.length * 3);
  out.forEach(([v, n], k) => { buf[k * 3] = v; buf.writeUInt16LE(n, k * 3 + 1); });
  return buf;
}
total += escribir('country.bin', rle(mask));
// El índice id→nombre NO se despliega: el cliente solo compara ids, y los ocho
// nombres que se enseñan van traducidos en src/data/world.ts. Se guarda para
// poder depurar la máscara y para el paso 5.
fs.writeFileSync(path.join(raiz, 'src/generated/country-ids.json'), JSON.stringify(ids, null, 0) + '\n');

/* ══════════════════════════════════════════════════════════════════════════
   3. FRONTERAS — la malla de topojson, cuantizada a Int16
   ════════════════════════════════════════════════════════════════════════ */
// 110m y no 50m: el globo mide 340 px de ancho en un teléfono, así que una
// frontera de 50m son cuatro vértices por píxel que nadie ve y 200 KB de más.
// Se dibujan TODOS los límites (incluidas las costas, que son el límite entre
// un país y el mar): sin la costa, las líneas interiores flotan sin referencia.
const topo110 = JSON.parse(fs.readFileSync(path.join(raiz, 'node_modules/world-atlas/countries-110m.json'), 'utf8'));
const malla = mesh(topo110, topo110.objects.countries);

const LON_Q = 32767 / 360, LAT_Q = 32767 / 180;
const pos = [], edges = [];
for (const linea of malla.coordinates) {
  const base = pos.length / 2;
  let n = 0;
  let prevLon = null;
  for (const [lon, lat] of linea) {
    // Un salto de antimeridiano dentro de una línea dibujaría una cuerda que
    // atraviesa el globo. Se corta la polilínea ahí.
    if (prevLon !== null && Math.abs(lon - prevLon) > 180) break;
    prevLon = lon;
    pos.push(Math.round(lon * LON_Q), Math.round(lat * LAT_Q));
    n++;
  }
  for (let k = 0; k + 1 < n; k++) edges.push(base + k, base + k + 1);
}
if (pos.length / 2 > 65535) throw new Error('más de 65535 vértices de frontera: los índices no caben en Uint16');
total += escribir('border-pos.bin', Buffer.from(new Int16Array(pos).buffer));
total += escribir('border-edges.bin', Buffer.from(new Uint16Array(edges).buffer));
console.log('  ' + 'TOTAL'.padEnd(18) + kb(total) + '  (' + (pos.length / 2) + ' vértices, ' + (edges.length / 2) + ' segmentos)');

/* ══════════════════════════════════════════════════════════════════════════
   4. GLOBO ESTÁTICO DEL PRIMER PINTADO (SVG inline en el hero)
   ════════════════════════════════════════════════════════════════════════ */
// Mientras three.js y el lienzo WebGL llegan, el hero enseña ESTE svg en el
// mismo sitio y del mismo tamaño: ni hueco negro ni salto de layout. Es la
// misma máscara de tierra en proyección ortográfica, dibujada como trazos
// horizontales punteados (stroke-dasharray) para que se lea como la nube de
// partículas y no como un mapa plano pegado encima.
const VIEW = 400, CENTRO = VIEW / 2, RADIO = VIEW / 2 - 2;
const LON0 = -64;            // mismo meridiano que el fotograma sin movimiento
const FILAS = 66;            // una línea cada ~2.7° de latitud
const partes = [];
for (let f = 0; f < FILAS; f++) {
  const lat = 90 - ((f + 0.5) / FILAS) * 180;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const y = Math.round(CENTRO - Math.sin((lat * Math.PI) / 180) * RADIO);
  const fila = Math.min(LAND_ROWS - 1, Math.floor(((90 - lat) / 180) * LAND_ROWS));
  // Se recorre el hemisferio visible en pasos de longitud y se agrupan las
  // celdas de tierra contiguas en un solo trazo horizontal.
  const PASOS = 200;
  let ini = null, prevX = 0;
  const cerrar = (x) => {
    if (ini === null) return;
    if (x - ini >= 1) partes.push(`M${ini} ${y}H${x}`);
    ini = null;
  };
  for (let s = 0; s <= PASOS; s++) {
    const dLon = -90 + (s / PASOS) * 180;                  // hemisferio visible
    const lon = ((LON0 + dLon + 540) % 360) - 180;
    const col = Math.min(LAND_COLS - 1, Math.max(0, Math.floor(((lon + 180) / 360) * LAND_COLS)));
    const x = Math.round(CENTRO + Math.sin((dLon * Math.PI) / 180) * cosLat * RADIO);
    const esTierra = s < PASOS && landAt(col, fila) === 1;
    if (esTierra && ini === null) ini = x;
    if (!esTierra) cerrar(prevX);
    prevX = x;
  }
  cerrar(prevX);
}
const svg =
`<svg class="globe-svg" viewBox="0 0 ${VIEW} ${VIEW}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
<defs><radialGradient id="gsky" cx="42%" cy="36%" r="74%"><stop offset="0" stop-color="#26262C"/><stop offset="1" stop-color="#0A0A0D"/></radialGradient></defs>
<circle cx="${CENTRO}" cy="${CENTRO}" r="${RADIO}" fill="url(#gsky)"/>
<g stroke="#CFCFC8" stroke-width="2.6" stroke-linecap="round" stroke-dasharray=".1 4.4" opacity=".78"><path d="${partes.join('')}"/></g>
<circle cx="${CENTRO}" cy="${CENTRO}" r="${RADIO}" fill="none" stroke="#E4E4DC" stroke-width="1.5" opacity=".2"/>
</svg>
`;
const destinoSvg = path.join(raiz, 'src/generated/globe-fallback.svg');
fs.writeFileSync(destinoSvg, svg);
console.log('  globe-fallback.svg'.padEnd(20) + kb(Buffer.byteLength(svg)));

/* ══════════════════════════════════════════════════════════════════════════
   5. EL PAÍS DE CADA BOLSA — leído de la máscara, no de una tabla
   ════════════════════════════════════════════════════════════════════════ */
// Las coordenadas son las mismas que manda api/world.js. Varias bolsas están en
// la costa (Nueva York, Hong Kong, Tokio) y a 0.5° por celda la ciudad puede
// caer en el mar, así que se busca en espiral la celda con país más cercana.
const BOLSAS = [
  ['nyc', 40.71, -74.01], ['yto', 43.65, -79.38], ['mex', 19.43, -99.13], ['sao', -23.55, -46.63],
  ['lon', 51.51, -0.13], ['fra', 50.11, 8.68], ['tyo', 35.68, 139.69], ['hkg', 22.32, 114.17]
];
// No se lee UNA celda sino la que MANDA en un cuadro de ±2°: así una bolsa
// costera no cae en el mar, y Hong Kong —que a 0.5° por celda es un punto—
// devuelve China, que es el país que de verdad se ve iluminado en el globo.
const enMask = (lat, lon) => {
  const x = Math.min(CTY_COLS - 1, Math.max(0, Math.floor(((lon + 180) / 360) * CTY_COLS)));
  const y = Math.min(CTY_ROWS - 1, Math.max(0, Math.floor(((90 - lat) / 180) * CTY_ROWS)));
  return mask[y * CTY_COLS + x];
};
console.log('bolsa → país (leído de country.bin, id que manda en ±2°)');
const filas = [];
for (const [id, lat, lon] of BOLSAS) {
  const votos = new Map();
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const v = enMask(lat + dy * 0.5, lon + dx * 0.5);
    if (v) votos.set(v, (votos.get(v) || 0) + 1);
  }
  const cid = [...votos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  filas.push([id, cid, ids[cid] || '—']);
  console.log('  ' + id + '  id=' + String(cid).padStart(3) + '  ' + (ids[cid] || '—'));
}
console.log('  → copiar countryId a src/data/world.ts:');
console.log('    ' + filas.map(([id, cid]) => id + ':' + cid).join('  '));
