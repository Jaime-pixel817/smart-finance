// Lo público del boletín: la gráfica del dólar de cada envío y el contenido de
// cada número, para su versión web.
//
// DOS COSAS EN UN ENDPOINT, Y NO POR PEREZA: el plan de Vercel admite 12
// funciones por despliegue y el sitio está justo en 12, así que un archivo más
// en api/ tumba el despliegue entero (mismo motivo por el que /api/news es un
// router; ver CLAUDE.md). Las dos cosas que sirve son además la misma cosa —lo
// que un correo ya enviado necesita poder enseñar sin credenciales— y salen del
// mismo sitio, así que tampoco desentonan juntas.
//
//   GET /api/newsletter-chart?d=<AAAA-MM-DD>&v=<huella>   → el PNG de la gráfica
//   GET /api/newsletter-chart?issue=<AAAA-MM-DD>          → el número, en JSON
//   GET /api/newsletter-chart?issues=1                    → las fechas archivadas
//
// ---------------------------------------------------------------------------
// LA GRÁFICA
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
const archivo = require('./_lib/archivo');

/*
 * EL NÚMERO EN JSON: lo que pinta /newsletter/<fecha> mientras esa página
 * todavía no existe en el build (ver src/pages/newsletter-read.astro).
 *
 * ES PÚBLICO Y TIENE QUE SERLO: es exactamente el correo que ya se mandó a
 * noventa personas, o sea texto que una persona aprobó y precios que /api
 * publica de todas formas. No hay nada aquí que no estuviera ya en una bandeja
 * de entrada.
 *
 * La fecha se valida por forma antes de tocar Redis: es parte de una clave, y
 * una clave construida con lo que llegue de fuera es una forma de dejar que un
 * desconocido lea cualquier otra cosa que haya guardada — incluida la lista de
 * suscriptores.
 */
async function servirNumero(res, fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    res.status(400).json({ error: 'invalid parameters' });
    return;
  }

  const numero = await archivo.leer(fecha);
  if (!numero) {
    // Puede ser que ese domingo no saliera boletín, o que el número ya caducara
    // del archivo de Redis. En los dos casos la página estática es la que
    // manda, y esta respuesta solo dice que aquí no está.
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(404).json({ error: 'not found' });
    return;
  }

  // Un número enviado no cambia nunca. Se puede cachear con ganas, y así una
  // ráfaga de aperturas del correo del domingo no se convierte en una ráfaga
  // de lecturas de Redis.
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json(numero);
}

module.exports = async function handler(req, res) {
  // El índice del archivo: solo fechas. Lo usa `npm run newsletter:sync` para
  // saber qué bajar al repo, y es público por el mismo motivo que los números:
  // son las URL de páginas que ya existen.
  if (String((req.query && req.query.issues) || '') === '1') {
    try {
      const fechas = await archivo.listarFechas();
      res.setHeader('Cache-Control', 'public, s-maxage=300');
      res.status(200).json({ fechas });
    } catch (e) {
      console.error('newsletter-chart: falló el índice del archivo:', e.message);
      res.status(502).json({ error: 'storage unavailable' });
    }
    return;
  }

  const pedido = String((req.query && req.query.issue) || '').trim();
  if (pedido) {
    try {
      await servirNumero(res, pedido);
    } catch (e) {
      console.error('newsletter-chart: falló la lectura del número:', e.message);
      res.status(502).json({ error: 'storage unavailable' });
    }
    return;
  }

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
