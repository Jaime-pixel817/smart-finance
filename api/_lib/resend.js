// Envío de correo por la API REST de Resend.
//
// Se habla REST directo en vez de instalar el SDK: es una sola petición POST y
// así no se agrega una dependencia (ni su peso en el bundle de la función) para
// algo que cabe en veinte líneas.
//
// RESEND_API_KEY vive solo en process.env y nunca sale hacia el cliente.

const REMITENTE_POR_DEFECTO = 'Smart Finance <boletin@smartfinance.lat>';

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

async function enviarCorreo({ para, asunto, html, texto, listUnsubscribeUrl }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no está configurada');
  }

  const cuerpo = {
    from: remitente(),
    to: [para],
    subject: asunto,
    html
  };
  if (texto) cuerpo.text = texto;

  // Cabeceras de baja con un clic. Gmail y Outlook las usan para pintar su
  // propio botón de "cancelar suscripción", que es lo que esperan los filtros
  // de correo masivo y ayuda a no caer en spam.
  if (listUnsubscribeUrl) {
    cuerpo.headers = {
      'List-Unsubscribe': '<' + listUnsubscribeUrl + '>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

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

  const cuerpo = mensajes.map((m) => {
    const item = { from: remitente(), to: [m.para], subject: m.asunto, html: m.html };
    if (m.texto) item.text = m.texto;
    if (m.listUnsubscribeUrl) {
      item.headers = {
        'List-Unsubscribe': '<' + m.listUnsubscribeUrl + '>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }
    return item;
  });

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
  remitente,
  hayCredencial,
  dormir,
  LIMITE_DIARIO_PLAN_GRATIS,
  MS_ENTRE_ENVIOS
};
