// La puerta de CRON_SECRET, compartida por /api/send-newsletter y por
// /api/newsletter-log.
//
// Vivía dentro de send-newsletter.js. Salió de ahí en cuanto hubo un segundo
// endpoint que tenía que protegerse igual: dos copias de una comprobación de
// seguridad son dos sitios donde arreglar el mismo fallo, y el segundo siempre
// se olvida.
//
// Vercel Cron manda "Authorization: Bearer <CRON_SECRET>" en cada llamada
// cuando esa variable existe en el proyecto. Sin ese encabezado la función
// responde 401, así que las URLs pueden ser públicas sin que nadie más pueda
// dispararlas.

const crypto = require('crypto');

function autorizado(req) {
  const secreto = process.env.CRON_SECRET;
  // Sin secreto configurado no se autoriza nada: es preferible no mandar el
  // boletín que dejar la URL abierta a cualquiera.
  if (!secreto) return false;

  const cabecera = String((req.headers && req.headers.authorization) || '');
  const esperado = 'Bearer ' + secreto;
  if (cabecera.length !== esperado.length) return false;

  // Comparación en tiempo constante, por si alguien intentara adivinar el
  // secreto midiendo tiempos de respuesta.
  return crypto.timingSafeEqual(Buffer.from(cabecera), Buffer.from(esperado));
}

// Quién disparó esta llamada. Vercel Cron se identifica en el User-Agent, y
// esa distinción es justo la que faltaba para saber por qué el boletín dejó de
// llegar: con ella, el registro dice si el disparo AUTOMÁTICO ocurrió, y no
// solo si el envío funcionó cuando alguien le dio al botón.
function origen(req) {
  const ua = String((req.headers && req.headers['user-agent']) || '');
  return /vercel-cron/i.test(ua) ? 'cron' : 'manual';
}

module.exports = { autorizado, origen };
