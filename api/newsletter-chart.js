// Sirve la gráfica del dólar que lleva el boletín del día.
//
// La imagen NO se genera aquí: se genera cuando se arma el correo (ver
// _lib/grafica.js) y queda guardada en Redis. Esta función solo la saca y la
// entrega. Esa separación es a propósito — así la imagen que ve el lector es
// exactamente la del momento del envío, y no una nueva dibujada con los precios
// de cuando le dio por abrir el correo.
//
// ES PÚBLICA Y TIENE QUE SERLO: quien la pide es el cliente de correo del
// lector (o el proxy de imágenes de Gmail), que no lleva ninguna credencial
// nuestra. No expone nada: son los mismos precios que ya publica /api/history.
//
// La URL lleva la huella del contenido en `v`, así que una URL dada siempre
// devuelve los mismos bytes. Por eso se puede cachear para siempre.

const redis = require('./_lib/redis');
const grafica = require('./_lib/grafica');

module.exports = async function handler(req, res) {
  const dia = String((req.query && req.query.d) || '');
  const version = String((req.query && req.query.v) || '');

  // Los dos parámetros se validan por forma antes de tocar Redis: son parte de
  // una clave, y una clave construida con lo que llegue de fuera es una forma
  // de dejar que un desconocido lea cualquier otra cosa que haya guardada —
  // incluida la lista de suscriptores.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^[a-f0-9]{10}$/.test(version)) {
    res.status(400).json({ error: 'invalid parameters' });
    return;
  }

  let base64;
  try {
    base64 = await redis.comando('GET', grafica.clave(dia, version));
  } catch (e) {
    console.error('newsletter-chart: falló la lectura en Redis:', e.message);
    res.status(502).json({ error: 'storage unavailable' });
    return;
  }

  if (!base64) {
    // Caduca a los 30 días. Un correo muy viejo pierde la gráfica y conserva
    // todo lo demás, que sigue siendo texto.
    res.status(404).json({ error: 'not found' });
    return;
  }

  const bytes = Buffer.from(String(base64), 'base64');

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', String(bytes.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).end(bytes);
};
