// Envío de correo por la API REST de Resend.
//
// Se habla REST directo en vez de instalar el SDK: es una sola petición POST y
// así no se agrega una dependencia (ni su peso en el bundle de la función) para
// algo que cabe en veinte líneas.
//
// RESEND_API_KEY vive solo en process.env y nunca sale hacia el cliente.

// El nombre que se lee en la bandeja, antes que el asunto. Va la persona
// primero y la marca después: quien se suscribió lo hizo por Jaime, y un
// remitente con nombre propio se reconoce (y se marca menos como spam) mejor
// que uno que solo dice la marca.
//
// Sin comillas a propósito. "Jaime Sandoval - Smart Finance" es una frase
// válida sin entrecomillar según el RFC 5322 —el guion y los espacios están
// permitidos ahí—, y así ningún cliente corre el riesgo de pintar las comillas
// como parte del nombre. Si algún día el nombre lleva una coma o un punto
// suelto, entonces SÍ hay que entrecomillarlo o el correo se parte en dos
// destinatarios.
const REMITENTE_POR_DEFECTO = 'Jaime Sandoval - Smart Finance <boletin@smartfinance.lat>';

// A dónde van las respuestas. Vacío = no se manda la cabecera y las respuestas
// caen en boletin@smartfinance.lat, que HOY NO RECIBE NADA: el dominio no tiene
// registro MX, así que quien conteste el boletín recibe un rebote y nosotros no
// nos enteramos. Se configura con NEWSLETTER_REPLY_TO en Vercel apuntando a un
// buzón que se lea de verdad.
function respuestaA() {
  return String(process.env.NEWSLETTER_REPLY_TO || '').trim();
}

// El plan gratis de Resend permite 100 correos al día. El envío se corta ahí y
// lo avisa en los logs en vez de fallar a medias o gastar de más.
const LIMITE_DIARIO_PLAN_GRATIS = 100;

// Resend limita a ~2 peticiones por segundo en el plan gratis. Se deja este
// respiro entre envíos para no comerse un 429 a la mitad de la lista.
const MS_ENTRE_ENVIOS = 550;

function remitente() {
  return process.env.NEWSLETTER_FROM || REMITENTE_POR_DEFECTO;
}

function hayCredencial() {
  return !!process.env.RESEND_API_KEY;
}

/*
 * Un correo listo para la API de Resend. Lo arman IGUAL el envío suelto y el
 * envío por lote: antes cada uno montaba su objeto por su cuenta y las
 * cabeceras estaban escritas dos veces, que es justo la clase de duplicado que
 * termina en un boletín donde la baja con un clic funciona por un camino y por
 * el otro no.
 *
 * Cabeceras de baja con un clic (RFC 8058). Gmail y Yahoo las EXIGEN desde
 * febrero de 2024 a quien manda correo masivo: sin ellas el correo se filtra
 * más, y con ellas los clientes pintan su propio botón de "cancelar
 * suscripción" en vez de que la gente use el de "esto es spam", que es lo que
 * de verdad hunde la reputación del dominio.
 *
 * No se agrega la variante mailto: de List-Unsubscribe a propósito. El RFC la
 * admite, pero apuntaría a una dirección de smartfinance.lat, y el dominio no
 * tiene MX: sería un botón de baja que rebota, peor que no ofrecerlo.
 */
function armarMensaje({ para, asunto, html, texto, listUnsubscribeUrl }) {
  const item = { from: remitente(), to: [para], subject: asunto, html };
  if (texto) item.text = texto;

  // Reply-To en TODOS los correos, no solo en el boletín: la confirmación del
  // alta es el primer correo que recibe alguien y es donde más probable es que
  // conteste con una duda.
  const responder = respuestaA();
  if (responder) item.reply_to = responder;

  if (listUnsubscribeUrl) {
    item.headers = {
      'List-Unsubscribe': '<' + listUnsubscribeUrl + '>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  return item;
}

async function enviarCorreo(mensaje) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurada');
  }

  const cuerpo = armarMensaje(mensaje);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo)
  });

  const texto_ = await res.text();
  let json = null;
  try { json = JSON.parse(texto_); } catch (e) { /* respuesta sin JSON */ }

  if (!res.ok) {
    const detalle = (json && (json.message || json.error)) || texto_.slice(0, 160);
    const err = new Error('Resend respondió ' + res.status + ': ' + detalle);
    err.status = res.status;
    throw err;
  }

  return json;
}

// Envío por lotes: hasta 100 correos DISTINTOS en una sola petición.
//
// Por qué existe además del envío uno por uno: mandando de a uno hay que dejar
// medio segundo entre correos por el límite de peticiones de Resend, y a eso se
// le suma la latencia de cada llamada. Con la lista llena (100, el tope del
// plan gratis) eso pasa del minuto que dura como máximo una función de Vercel,
// y el envío se cortaría a la mitad. En lote es una sola petición.
//
// Cada elemento del lote es un correo completo y distinto, así que cada quien
// recibe su propio link de baja.
async function enviarLote(mensajes) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no está configurada');
  if (!mensajes.length) return { enviados: 0 };
  if (mensajes.length > 100) throw new Error('el lote de Resend admite 100 correos como máximo');

  const cuerpo = mensajes.map((m) => armarMensaje(m));

  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo)
  });

  const bruto = await res.text();
  let json = null;
  try { json = JSON.parse(bruto); } catch (e) { /* respuesta sin JSON */ }

  if (!res.ok) {
    const detalle = (json && (json.message || json.error)) || bruto.slice(0, 200);
    const err = new Error('Resend (lote) respondió ' + res.status + ': ' + detalle);
    err.status = res.status;
    throw err;
  }

  return { enviados: (json && Array.isArray(json.data) ? json.data.length : mensajes.length), respuesta: json };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  enviarCorreo,
  enviarLote,
  armarMensaje,
  remitente,
  respuestaA,
  hayCredencial,
  dormir,
  LIMITE_DIARIO_PLAN_GRATIS,
  MS_ENTRE_ENVIOS
};
