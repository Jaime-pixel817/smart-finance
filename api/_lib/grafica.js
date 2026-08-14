// La gráfica del dólar que va dentro del correo: se dibuja como PNG en el
// servidor, se guarda en Redis y se sirve desde /api/newsletter-chart.
//
// POR QUÉ SE DIBUJA AL ARMAR EL CORREO Y NO AL ABRIRLO
//
// Podría generarse cuando el cliente de correo pide la imagen, días después.
// Sería más simple y no habría que guardar nada. Pero entonces la gráfica
// enseñaría el mercado del momento en que alguien abre el correo, y los números
// que están escritos al lado serían los del momento del envío: dos versiones
// del mismo dato en el mismo bloque. Un lector que abra el boletín el domingo
// vería una curva que no cuadra con la cifra impresa debajo.
//
// Dibujar al armar el correo congela las dos cosas juntas. El precio es tener
// dónde dejar los bytes, y eso ya existe: el mismo Redis donde viven los
// suscriptores y el registro de corridas.
//
// POR QUÉ NO VA EN BASE64 DENTRO DEL CORREO
//
// Es la otra forma de no necesitar almacenamiento. Pero una imagen incrustada
// suma su peso —crecido un 33 % por la codificación— al cuerpo del mensaje, y
// Gmail corta el correo a los 102 KB con un "mensaje truncado". Además Outlook
// y Gmail directamente no pintan las imágenes en base64. Sería peso a cambio de
// nada.
//
// LA URL LLEVA LA HUELLA DEL CONTENIDO. El parámetro v es un resumen de los
// bytes del PNG: si la gráfica cambia, cambia la URL. Eso permite servirla con
// caché eterna sin miedo a que alguien vea la de ayer, y hace que todos los
// destinatarios compartan una sola URL, así que el proxy de imágenes de Gmail
// la descarga UNA vez para toda la lista.

const crypto = require('crypto');
const lienzo = require('./lienzo');
const redis = require('./redis');

// Medidas en píxeles CSS —lo que ocupa en el correo— y el doble de eso en
// píxeles reales, que es lo que hace que no se vea borrosa en pantallas de alta
// densidad. 552 es el ancho de la columna del correo (600 menos sus márgenes),
// o sea por debajo del máximo de 600 que admiten los clientes de escritorio.
const ANCHO_CSS = 552;
const ALTO_CSS = 144;
const ESCALA = 2;

const ANCHO = ANCHO_CSS * ESCALA;
const ALTO = ALTO_CSS * ESCALA;

// Márgenes internos, ya en píxeles reales. El de la derecha tiene que dejar
// sitio al halo del punto final, que sobresale 8.4 px del centro.
const MARGEN = { izq: 14, der: 14, arr: 16, aba: 14 };

const GROSOR = 3.6;      // 1.8 px CSS: fina pero visible en pantalla normal
const RADIO_PUNTO = 4.6;
const RADIO_HALO = 8.4;

const BLANCO = lienzo.color('#FFFFFF');
const VERDE = lienzo.color('#0F8A5F');
const ROJO = lienzo.color('#A32D2D');
// Gris de la línea de referencia. El mismo tono de los bordes del correo: es
// una guía, no un dato.
const GUIA = lienzo.color('#CBD2DA');

/*
 * Reduce la serie promediando por tramos, CONSERVANDO EL PRIMER Y EL ÚLTIMO
 * VALOR intactos.
 *
 * Los extremos no se tocan porque son datos, no forma: el primero es donde va
 * la línea de referencia y el último es donde va el punto, y los dos aparecen
 * además escritos en el texto del correo. Si el promedio se los comiera, la
 * gráfica y la cifra de al lado dirían cosas distintas.
 *
 * Lo de en medio sí se promedia. /api/history da 288 puntos y el dibujo mide
 * 1076 px de ancho: son cuatro píxeles por punto, más detalle del que se
 * distingue a este tamaño. Lo único que aporta ese exceso es un dentado que
 * hace la línea más difícil de leer y un PNG bastante más pesado, porque el
 * ruido es justo lo que un compresor no puede aplastar.
 */
const MAX_PUNTOS = 120;
function reducir(valores) {
  if (valores.length <= MAX_PUNTOS) return valores;

  const cuerpo = valores.slice(1, -1);
  const tramos = MAX_PUNTOS - 2;
  const tam = cuerpo.length / tramos;
  const salida = [valores[0]];

  for (let i = 0; i < tramos; i++) {
    const trozo = cuerpo.slice(Math.floor(i * tam), Math.floor((i + 1) * tam));
    if (!trozo.length) continue;
    salida.push(trozo.reduce((a, b) => a + b, 0) / trozo.length);
  }

  salida.push(valores[valores.length - 1]);
  return salida;
}

/*
 * Dibuja la serie y devuelve el PNG.
 *
 * `puntos` son los de /api/history: [[marcaDeTiempo, valor], ...].
 *
 * Sin ejes, sin cuadrícula y SIN TEXTO. Lo último no es minimalismo: el correo
 * tiene que leerse completo con las imágenes bloqueadas, así que ningún dato
 * puede vivir solo dentro de la imagen. Los números van en texto, al lado.
 */
function dibujar(puntos) {
  const serie = (puntos || []).filter(
    (p) => Array.isArray(p) && typeof p[1] === 'number' && isFinite(p[1])
  );
  if (serie.length < 2) return null;

  const valores = reducir(serie.map((p) => p[1]));
  const primero = valores[0];
  const ultimo = valores[valores.length - 1];
  const sube = ultimo >= primero;
  const tinta = sube ? VERDE : ROJO;
  // El relleno sale del color de la línea rebajado sobre blanco, no de una
  // constante aparte: así nunca se pueden desincronizar.
  const relleno = lienzo.mezclar(BLANCO, tinta, 0.1);

  let min = Math.min.apply(null, valores);
  let max = Math.max.apply(null, valores);
  // Una sesión plana (o un solo valor repetido) dejaría el rango en cero y
  // todas las divisiones en infinito. Se le inventa un rango mínimo alrededor
  // del valor para que la línea salga recta por el centro, que es la verdad.
  if (!(max > min)) {
    const margen = Math.abs(max) * 0.001 || 1;
    min -= margen;
    max += margen;
  }

  const x0 = MARGEN.izq;
  const x1 = ANCHO - MARGEN.der;
  const y0 = MARGEN.arr;
  const y1 = ALTO - MARGEN.aba;

  const aX = (i) => x0 + ((x1 - x0) * i) / (valores.length - 1);
  const aY = (v) => y1 - ((v - min) / (max - min)) * (y1 - y0);

  const trazado = valores.map((v, i) => [aX(i), aY(v)]);

  const l = lienzo.crear(ANCHO, ALTO, BLANCO);

  // 1. El área bajo la curva, hasta el borde inferior del dibujo.
  lienzo.areaBajoLinea(l, trazado, y1, relleno);

  // 2. La referencia: dónde estaba el dólar al empezar la sesión. Es la única
  //    forma de que la curva signifique algo sin poner ejes — la distancia a
  //    esta línea ES el cambio del día.
  const yApertura = aY(primero);
  for (let x = x0; x < x1; x += 18) {
    lienzo.trazo(l, [[x, yApertura], [Math.min(x + 10, x1), yApertura]], 2, GUIA);
  }

  // 3. La línea.
  lienzo.trazo(l, trazado, GROSOR, tinta);

  // 4. El punto de cierre, con halo blanco para que se despegue del relleno.
  const fin = trazado[trazado.length - 1];
  lienzo.circulo(l, fin[0], fin[1], RADIO_HALO, BLANCO);
  lienzo.circulo(l, fin[0], fin[1], RADIO_PUNTO, tinta);

  return lienzo.png(l);
}

// La fecha del correo en el huso de Ciudad de México, como AAAA-MM-DD. Es la
// misma referencia horaria con la que se fecha el boletín entero.
function claveDeFecha(fecha) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha);
}

function huella(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
}

function clave(dia, version) {
  return 'boletin:grafica:' + dia + ':' + version;
}

// 30 días. Un correo se abre casi siempre el mismo día, pero alguien puede
// volver a él semanas después y no tiene por qué encontrarse un hueco. Más allá
// de un mes son bytes pagados para nadie.
const VIDA_SEGUNDOS = 30 * 24 * 3600;

/*
 * Dibuja, guarda y devuelve la URL pública. Si algo falla devuelve null y el
 * correo sale sin gráfica: los números en texto siguen ahí, así que se pierde
 * el adorno y no la información. Un boletín sin imagen es infinitamente mejor
 * que un boletín sin enviar.
 */
async function publicar(puntos, fecha, sitio) {
  let bytes;
  try {
    bytes = dibujar(puntos);
  } catch (e) {
    console.error('boletín: falló el dibujo de la gráfica:', e.message);
    return null;
  }
  if (!bytes) {
    console.warn('boletín: sin puntos suficientes para la gráfica del dólar');
    return null;
  }

  const dia = claveDeFecha(fecha);
  const version = huella(bytes);

  try {
    await redis.comando('SET', clave(dia, version), bytes.toString('base64'), 'EX', VIDA_SEGUNDOS);
  } catch (e) {
    console.error('boletín: no se pudo guardar la gráfica en Redis:', e.message);
    return null;
  }

  return {
    url: sitio + '/api/newsletter-chart?d=' + dia + '&v=' + version,
    ancho: ANCHO_CSS,
    alto: ALTO_CSS,
    bytes: bytes.length
  };
}

module.exports = { dibujar, publicar, clave, claveDeFecha, ANCHO_CSS, ALTO_CSS };
