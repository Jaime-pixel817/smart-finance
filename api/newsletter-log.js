// "¿Cuándo fue la última vez que corrió el boletín, y funcionó?"
//
// Esa pregunta no se podía contestar: los logs del plan gratis de Vercel duran
// unos 30 minutos, así que cuando uno se da cuenta de que hoy no llegó el
// correo ya no queda nada que leer. Este endpoint lee el registro persistente
// que /api/send-newsletter escribe en Redis (ver _lib/registro.js), que no
// caduca, y contesta en cualquier momento aunque hayan pasado semanas.
//
// CÓMO SE USA
//   curl -H "Authorization: Bearer $CRON_SECRET" https://smartfinance.lat/api/newsletter-log
//   ...?limite=90   para ver más corridas (tope 180, el largo de la lista)
//   ...?formato=texto   para leerlo de un vistazo en la terminal
//
// Va detrás del MISMO CRON_SECRET que el envío: el registro dice a cuánta
// gente se le escribe cada día, y eso no tiene por qué ser público.
//
// CÓMO SE LEE EL RESULTADO
//   ultimaAutomatica de hoy      → el cron se está disparando. Si además falla,
//                                  el problema está en este código.
//   ultimaAutomatica de hace días → el cron NO se está disparando. El problema
//                                  está en Vercel (registro del cron, plan,
//                                  proyecto pausado), no en el código. Fue este
//                                  el caso que no pudimos demostrar la primera vez.

const registro = require('./_lib/registro');
const { autorizado } = require('./_lib/secreto');

function comoTexto(resumen, corridas) {
  const linea = (c) => [
    c.cuandoMexico || c.cuando,
    c.ok ? 'OK    ' : 'FALLÓ ',
    (c.disparo || '?').padEnd(6),
    String(c.enviados === undefined ? '-' : c.enviados).padStart(3) + ' enviados',
    c.motivo || c.error || ''
  ].join('  ').trimEnd();

  const encabezado = [
    'BOLETÍN — REGISTRO DE CORRIDAS',
    '',
    'Última corrida:      ' + (resumen.ultima ? resumen.ultima.cuandoMexico : 'nunca'),
    'Última automática:   ' + (resumen.ultimaAutomatica ? resumen.ultimaAutomatica.cuandoMexico : 'nunca'),
    'Último envío con éxito: ' + (resumen.ultimoExito ? resumen.ultimoExito.cuandoMexico : 'nunca'),
    'Fallos seguidos:     ' + resumen.fallosSeguidos,
    '',
    '─'.repeat(72)
  ];

  return encabezado.concat(corridas.map(linea)).join('\n') + '\n';
}

module.exports = async function handler(req, res) {
  if (!autorizado(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // Un registro es historia, no una página: servirlo cacheado sería contestar
  // con el estado de hace una hora justo cuando se consulta por una urgencia.
  res.setHeader('Cache-Control', 'no-store');

  try {
    const corridas = await registro.leer((req.query && req.query.limite) || 30);
    const resumen = registro.resumir(corridas);

    if (String((req.query && req.query.formato) || '') === 'texto') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(comoTexto(resumen, corridas));
      return;
    }

    res.status(200).json({ resumen, corridas });
  } catch (err) {
    // Distingue "Redis no está configurado" de "Redis contestó mal": el primero
    // se arregla en las variables del proyecto y el segundo no.
    const noConfigurado = err && err.code === 'REDIS_NO_CONFIGURADO';
    console.error('registro: no se pudo leer:', err && err.message ? err.message : err);
    res.status(noConfigurado ? 500 : 502).json({
      error: noConfigurado ? 'redis_no_configurado' : 'registro_ilegible',
      detalle: err && err.message ? err.message : String(err)
    });
  }
};
