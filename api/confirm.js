// Segundo paso del doble opt-in: el link que trae el correo de confirmación.
//
// Verifica el token, marca "confirmed" y manda al visitante a una página del
// sitio. El resultado viaja en ?estado= para que la página sepa qué mensaje
// mostrar sin exponer el token en la barra de direcciones.

const suscriptores = require('./_lib/suscriptores');
const { urlSitio } = require('./_lib/boletin');

const PAGINA = '/newsletter/confirmado';

module.exports = async function handler(req, res) {
  const token = String((req.query && req.query.token) || '');
  const correo = String((req.query && req.query.email) || '');
  const destino = (estado) => urlSitio() + PAGINA + '?estado=' + estado;

  if (!token || !suscriptores.correoValido(correo)) {
    res.writeHead(302, { Location: destino('invalido') });
    res.end();
    return;
  }

  try {
    const { resultado } = await suscriptores.confirmar(correo, token);

    // "ya-confirmado" se trata como éxito: alguien que abre dos veces el mismo
    // link no debería ver un error.
    const estado = (resultado === 'ok' || resultado === 'ya-confirmado') ? 'ok' : 'invalido';
    res.writeHead(302, { Location: destino(estado) });
    res.end();
  } catch (err) {
    console.error('confirmación fallida:', err && err.message ? err.message : err);
    res.writeHead(302, { Location: destino('error') });
    res.end();
  }
};
