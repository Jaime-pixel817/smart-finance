// Baja del boletín. Su link va en TODOS los correos que se mandan: es
// obligatorio por ley (CAN-SPAM, GDPR) y además lo exige Resend.
//
// Atiende dos caminos:
//   GET  — la persona hizo clic en el link del correo; se le redirige a una
//          página que confirma la baja.
//   POST — el botón de "cancelar suscripción" que pintan Gmail y Outlook a
//          partir de la cabecera List-Unsubscribe-Post. Ese flujo espera un
//          200 a secas, sin redirección ni página.

const suscriptores = require('./_lib/suscriptores');
const { urlSitio } = require('./_lib/boletin');

const PAGINA = '/newsletter/baja';

module.exports = async function handler(req, res) {
  // En el POST de un clic los datos pueden venir por query igual que en el GET,
  // que es como se arma el link de la cabecera List-Unsubscribe.
  const token = String((req.query && req.query.token) || (req.body && req.body.token) || '');
  const correo = String((req.query && req.query.email) || (req.body && req.body.email) || '');
  const esUnClic = req.method === 'POST';
  const destino = (estado) => urlSitio() + PAGINA + '?estado=' + estado;

  const responder = (estado, codigo) => {
    if (esUnClic) {
      // Al cliente de correo solo le importa el código de estado.
      res.status(codigo).json({ ok: estado === 'ok' });
      return;
    }
    res.writeHead(302, { Location: destino(estado) });
    res.end();
  };

  if (!token || !suscriptores.correoValido(correo)) {
    responder('invalido', 400);
    return;
  }

  try {
    const { resultado } = await suscriptores.darDeBaja(correo, token);

    // "no-existe" se muestra como baja hecha: el objetivo de quien llega aquí
    // es dejar de recibir correos, y si no está en la lista, ya lo consiguió.
    const estado = (resultado === 'ok' || resultado === 'no-existe') ? 'ok' : 'invalido';
    responder(estado, estado === 'ok' ? 200 : 400);
  } catch (err) {
    console.error('baja fallida:', err && err.message ? err.message : err);
    responder('error', 500);
  }
};
