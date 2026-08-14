// Un lienzo en memoria y un codificador PNG, sin dependencias.
//
// POR QUÉ ESTO EXISTE Y NO SE USA UNA LIBRERÍA
//
// El correo necesita una imagen de verdad: los clientes de correo no ejecutan
// JavaScript, así que la gráfica del dólar no puede dibujarse en el navegador
// como la del sitio — tiene que llegar ya rasterizada. Y no puede generarse
// cuando el lector abre el correo, sino cuando el correo se arma: si no, la
// gráfica y los números de al lado acabarían contando dos sesiones distintas.
//
// La ruta habitual para eso es escribir un SVG y convertirlo con sharp, que ya
// está en el proyecto. Se descartó por tres motivos:
//
//   1. sharp está como dependencia de DESARROLLO. Usarlo aquí obliga a moverlo
//      a dependencias normales, y con él viajan ~30 MB de binarios nativos al
//      paquete de la función. Justo a la función del envío, que es la que ya
//      corre con el reloj encima (60 s de tope) y la que falla en silencio: si
//      un arranque en frío se alarga, nadie se entera hasta que alguien nota
//      que el boletín lleva días sin llegar.
//   2. sharp rasteriza SVG con librosvg, que para el texto depende de las
//      fuentes que haya DENTRO del contenedor de Vercel. Eso es exactamente la
//      clase de cosa que se ve bien en esta máquina y sale con otra tipografía
//      —o en blanco— en producción, donde ya no se mira.
//   3. La gráfica no lleva texto por diseño (la información va en el texto del
//      correo, al lado, para que se lea con las imágenes bloqueadas). Sin texto
//      no hace falta un motor de SVG: hacen falta una polilínea, un relleno y
//      un punto. Eso cabe aquí.
//
// sharp sigue en su sitio y hace lo que sabe hacer: los íconos estáticos, en
// scripts/build-email-icons.js, en tiempo de construcción y no de envío.
//
// El antialias sale de medir la DISTANCIA de cada píxel al trazo en vez de
// dibujar y luego suavizar: la cobertura de un píxel es cuánto le falta al
// borde para alcanzarlo. Sale gratis y trae las uniones y los remates redondos
// de regalo, que es lo que hace que una línea fina no se vea escalonada.

const zlib = require('zlib');

// RGB sin canal alfa: la gráfica se compone siempre sobre un fondo opaco, así
// que el cuarto canal serían 1.1 MB de bytes en 255 y un PNG más gordo.
const CANALES = 3;

function color(hex) {
  const h = String(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Mezcla dos colores. Sirve para sacar el tinte del relleno a partir del color
// de la línea, en vez de tener dos constantes que alguien puede desincronizar.
function mezclar(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function crear(ancho, alto, fondo) {
  const px = new Uint8Array(ancho * alto * CANALES);
  for (let i = 0; i < px.length; i += CANALES) {
    px[i] = fondo[0]; px[i + 1] = fondo[1]; px[i + 2] = fondo[2];
  }
  return { ancho, alto, px };
}

function pintar(l, x, y, col, alfa) {
  if (alfa <= 0) return;
  const a = alfa > 1 ? 1 : alfa;
  const i = (y * l.ancho + x) * CANALES;
  const px = l.px;
  px[i] = Math.round(px[i] + (col[0] - px[i]) * a);
  px[i + 1] = Math.round(px[i + 1] + (col[1] - px[i + 1]) * a);
  px[i + 2] = Math.round(px[i + 2] + (col[2] - px[i + 2]) * a);
}

// Distancia de un punto al segmento AB. Es el núcleo del antialias: todo el
// trazo se dibuja preguntando "¿a qué distancia está el centro de este píxel?".
function distanciaASegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  let t = largo2 ? ((px - ax) * dx + (py - ay) * dy) / largo2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

/*
 * Una polilínea de grosor `grosor`, con uniones y remates redondos.
 *
 * La cobertura se acumula en un buffer aparte y con MÁXIMO, no sumando: dos
 * segmentos que se tocan en un vértice pisan los mismos píxeles, y sumar ahí
 * dejaría un nudo más oscuro en cada codo de la gráfica.
 */
function trazo(l, puntos, grosor, col) {
  if (!puntos || puntos.length < 2) return;

  const radio = grosor / 2;
  const margen = radio + 1;
  const cobertura = new Float32Array(l.ancho * l.alto);
  let minXt = Infinity, minYt = Infinity, maxXt = -Infinity, maxYt = -Infinity;

  for (let s = 0; s < puntos.length - 1; s++) {
    const ax = puntos[s][0], ay = puntos[s][1];
    const bx = puntos[s + 1][0], by = puntos[s + 1][1];

    // Solo los píxeles que el segmento puede llegar a tocar. Sin este recorte
    // el coste sería ancho × alto × número de segmentos, que con 180 puntos ya
    // son decenas de millones de raíces cuadradas.
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - margen));
    const maxX = Math.min(l.ancho - 1, Math.ceil(Math.max(ax, bx) + margen));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - margen));
    const maxY = Math.min(l.alto - 1, Math.ceil(Math.max(ay, by) + margen));
    if (minX > maxX || minY > maxY) continue;

    if (minX < minXt) minXt = minX;
    if (maxX > maxXt) maxXt = maxX;
    if (minY < minYt) minYt = minY;
    if (maxY > maxYt) maxYt = maxY;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = distanciaASegmento(x + 0.5, y + 0.5, ax, ay, bx, by);
        // +0.5 porque el borde del trazo cae a media distancia del centro del
        // píxel: es el medio píxel de transición que hace el suavizado.
        const c = radio + 0.5 - d;
        if (c <= 0) continue;
        const i = y * l.ancho + x;
        const v = c > 1 ? 1 : c;
        if (v > cobertura[i]) cobertura[i] = v;
      }
    }
  }

  if (minXt > maxXt) return;
  for (let y = minYt; y <= maxYt; y++) {
    for (let x = minXt; x <= maxXt; x++) {
      pintar(l, x, y, col, cobertura[y * l.ancho + x]);
    }
  }
}

function circulo(l, cx, cy, radio, col) {
  const minX = Math.max(0, Math.floor(cx - radio - 1));
  const maxX = Math.min(l.ancho - 1, Math.ceil(cx + radio + 1));
  const minY = Math.max(0, Math.floor(cy - radio - 1));
  const maxY = Math.min(l.alto - 1, Math.ceil(cy + radio + 1));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      pintar(l, x, y, col, radio + 0.5 - Math.sqrt(dx * dx + dy * dy));
    }
  }
}

/*
 * El relleno bajo la línea, hasta la altura `base`.
 *
 * Se puede resolver por columnas y no como un polígono general porque la
 * gráfica es una función del tiempo: para cada x hay una sola y. Eso convierte
 * el relleno en "de dónde a dónde va la tinta en esta columna", que se calcula
 * exacto, sin recorrer aristas ni ordenar cruces.
 *
 * Cada columna de píxeles se mira en SUBCOLUMNAS: con una sola muestra por
 * píxel, los tramos verticales de la línea dejan escalones a la vista.
 */
const SUBCOLUMNAS = 4;
function areaBajoLinea(l, puntos, base, col) {
  if (!puntos || puntos.length < 2) return;

  const primero = puntos[0][0];
  const ultimo = puntos[puntos.length - 1][0];

  // Altura de la línea en una x cualquiera. El cursor avanza junto con x —los
  // puntos vienen ordenados— así que el recorrido completo es lineal.
  let cursor = 0;
  const alturaEn = (x) => {
    if (x < primero || x > ultimo) return null;
    while (cursor < puntos.length - 2 && puntos[cursor + 1][0] < x) cursor++;
    while (cursor > 0 && puntos[cursor][0] > x) cursor--;
    const ax = puntos[cursor][0], ay = puntos[cursor][1];
    const bx = puntos[cursor + 1][0], by = puntos[cursor + 1][1];
    if (bx === ax) return by;
    return ay + ((by - ay) * (x - ax)) / (bx - ax);
  };

  const desde = Math.max(0, Math.floor(primero));
  const hasta = Math.min(l.ancho - 1, Math.ceil(ultimo));

  for (let x = desde; x <= hasta; x++) {
    const techos = [];
    let techoMin = Infinity;
    for (let s = 0; s < SUBCOLUMNAS; s++) {
      const y = alturaEn(x + (s + 0.5) / SUBCOLUMNAS);
      if (y === null) continue;
      techos.push(y);
      if (y < techoMin) techoMin = y;
    }
    if (!techos.length) continue;

    const filaDesde = Math.max(0, Math.floor(techoMin));
    const filaHasta = Math.min(l.alto - 1, Math.ceil(base));

    for (let y = filaDesde; y <= filaHasta; y++) {
      let suma = 0;
      for (let s = 0; s < techos.length; s++) {
        const arriba = Math.max(techos[s], y);
        const abajo = Math.min(base, y + 1);
        if (abajo > arriba) suma += abajo - arriba;
      }
      pintar(l, x, y, col, suma / SUBCOLUMNAS);
    }
  }
}

// ---- Codificación PNG ------------------------------------------------------

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/*
 * Filtrado adaptativo, que es de donde sale casi toda la compresión.
 *
 * El PNG deja elegir un filtro por FILA: cada píxel se guarda como su
 * diferencia con el de la izquierda, el de arriba, o una combinación. En una
 * gráfica —bandas planas de color con una línea fina cruzándolas— eso convierte
 * la mayoría de los bytes en ceros, y los ceros los aplasta el deflate.
 *
 * Se prueban los cuatro filtros útiles y se elige el de menor suma de valores
 * absolutos, que es la heurística que recomienda la propia especificación.
 */
function filtrarFilas(px, ancho, alto) {
  const bytesFila = ancho * CANALES;
  const salida = Buffer.alloc((bytesFila + 1) * alto);
  const candidato = Buffer.alloc(bytesFila);
  const mejor = Buffer.alloc(bytesFila);

  for (let y = 0; y < alto; y++) {
    const fila = y * bytesFila;
    const anterior = (y - 1) * bytesFila;
    let mejorTipo = 0;
    let mejorCoste = Infinity;

    for (let tipo = 0; tipo < 5; tipo++) {
      if (tipo === 3) continue; // "Average": rara vez gana y cuesta lo mismo probarla
      let coste = 0;
      for (let i = 0; i < bytesFila; i++) {
        const actual = px[fila + i];
        const izq = i >= CANALES ? px[fila + i - CANALES] : 0;
        const arr = y > 0 ? px[anterior + i] : 0;
        const diag = y > 0 && i >= CANALES ? px[anterior + i - CANALES] : 0;
        let v;
        if (tipo === 0) v = actual;
        else if (tipo === 1) v = actual - izq;
        else if (tipo === 2) v = actual - arr;
        else v = actual - paeth(izq, arr, diag);
        v &= 0xff;
        candidato[i] = v;
        coste += v < 128 ? v : 256 - v;
      }
      if (coste < mejorCoste) {
        mejorCoste = coste;
        mejorTipo = tipo;
        candidato.copy(mejor);
      }
    }

    salida[(bytesFila + 1) * y] = mejorTipo;
    mejor.copy(salida, (bytesFila + 1) * y + 1);
  }

  return salida;
}

function png(l) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(l.ancho, 0);
  ihdr.writeUInt32BE(l.alto, 4);
  ihdr[8] = 8;   // 8 bits por canal
  ihdr[9] = 2;   // color verdadero, sin alfa
  ihdr[10] = 0;  // compresión deflate
  ihdr[11] = 0;  // filtrado estándar
  ihdr[12] = 0;  // sin entrelazado

  const datos = zlib.deflateSync(filtrarFilas(l.px, l.ancho, l.alto), { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', datos),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

module.exports = { crear, color, mezclar, trazo, circulo, areaBajoLinea, png };
