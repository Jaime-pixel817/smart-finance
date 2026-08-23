// La línea de Jaime: el hueco fijo del boletín donde habla una persona.
//
// POR QUÉ ES UN HUECO Y NO UN CAMPO OBLIGATORIO
// ---------------------------------------------
// Todo lo demás del correo lo arma el código: los precios, la lección de la
// semana, la noticia que ya estaba aprobada. Eso es honesto y es constante,
// pero también es exactamente lo que se lee como "esto lo mandó un robot". Un
// boletín firmado por una persona necesita al menos una frase que solo pueda
// haber escrito esa persona.
//
// Y tiene que poder estar VACÍO. Un campo obligatorio en un correo automático
// se convierte, la tercera semana con exámenes, en una frase de relleno escrita
// a las 7:55 de la mañana — o en un boletín que no sale. Si no hay nota, el
// bloque no existe y el correo sale igual de completo.
//
// CADUCA SOLA, y esto no es un detalle. La nota se guarda con la fecha en que
// se escribió y solo entra en el correo si se escribió en los siete días
// anteriores al envío. Sin eso, una nota de hace dos meses seguiría apareciendo
// como si fuera de esta semana: sería el único texto del correo capaz de
// mentir, precisamente el que va firmado.
//
// CÓMO SE ESCRIBE (con el mismo CRON_SECRET del boletín):
//
//   curl -X POST https://smartfinance.lat/api/newsletter-log \
//     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
//     -d '{"accion":"nota","texto":"Esta semana abrí mi primera cuenta de casa de bolsa. Cuento cómo me fue."}'
//
//   curl -X POST ... -d '{"accion":"nota","texto":""}'     # borrarla
//   curl -H "Authorization: Bearer $CRON_SECRET" https://smartfinance.lat/api/newsletter-log   # verla
//
// No pasa por ninguna IA ni por ningún proveedor: es texto de Jaime guardado
// tal cual, y por eso es lo único del correo que no lleva etiqueta de autoría.

const redis = require('./redis');

const CLAVE = 'boletin:nota:v1';

// Dos líneas en el correo. El tope no es un capricho de diseño: es lo que hace
// que la nota se lea como una voz y no como un segundo artículo.
const MAX = 300;
const MIN = 10;

// Siete días: la nota es para el boletín de ESTA semana. Se guarda con catorce
// de vida en Redis (VIDA_SEGUNDOS) para que una nota escrita el lunes siga ahí
// el domingo aunque el reloj de Redis y el nuestro no coincidan al minuto; la
// que decide de verdad es esta ventana.
const VIGENCIA_DIAS = 7;
const VIDA_SEGUNDOS = 14 * 24 * 3600;

function limpiar(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Guarda (o borra, con texto vacío) la nota de la semana.
 * Devuelve { guardada, texto } o lanza si el texto no cabe.
 */
async function guardar(texto, fecha = new Date()) {
  const limpio = limpiar(texto);

  if (!limpio) {
    await redis.comando('DEL', CLAVE);
    return { guardada: false, texto: null };
  }
  if (limpio.length < MIN) {
    const e = new Error('la nota es demasiado corta (mínimo ' + MIN + ' caracteres)');
    e.code = 'NOTA_CORTA';
    throw e;
  }
  if (limpio.length > MAX) {
    const e = new Error('la nota mide ' + limpio.length + ' caracteres y el tope son ' + MAX);
    e.code = 'NOTA_LARGA';
    throw e;
  }

  await redis.comando(
    'SET', CLAVE,
    JSON.stringify({ texto: limpio, escritoEn: fecha.toISOString() }),
    'EX', VIDA_SEGUNDOS
  );
  return { guardada: true, texto: limpio };
}

/**
 * La nota que le toca al boletín de `fecha`, o null.
 *
 * NUNCA LANZA. Si Redis no contesta, el correo sale sin este bloque: es lo
 * accesorio del boletín, y no puede ser lo que impida mandarlo.
 */
async function leer(fecha = new Date()) {
  let guardada;
  try {
    guardada = await redis.obtenerJSON(CLAVE);
  } catch (e) {
    console.error('boletín: no se pudo leer la nota de Jaime:', e.message);
    return null;
  }

  if (!guardada || !guardada.texto) return null;

  const escrita = Date.parse(guardada.escritoEn || '');
  if (!isFinite(escrita)) return null;

  const dias = (fecha.getTime() - escrita) / 86400000;
  // dias < -1 = escrita "en el futuro" por más de un día: el reloj de alguien
  // está mal y esto no se publica.
  if (dias > VIGENCIA_DIAS || dias < -1) {
    console.warn('boletín: la nota guardada es de hace ' + Math.round(dias) + ' días; no entra en este número');
    return null;
  }

  return { texto: limpiar(guardada.texto), escritoEn: guardada.escritoEn };
}

module.exports = { leer, guardar, limpiar, CLAVE, MAX, MIN, VIGENCIA_DIAS };
