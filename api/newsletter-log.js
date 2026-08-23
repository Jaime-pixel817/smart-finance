// "¿Cuándo fue la última vez que corrió el boletín, y funcionó?"
//
// Esa pregunta no se podía contestar: los logs del plan gratis de Vercel duran
// unos 30 minutos, así que cuando uno se da cuenta de que hoy no llegó el
// correo ya no queda nada que leer. Este endpoint lee el registro persistente
// que /api/send-newsletter escribe en Redis (ver _lib/registro.js), que no
// caduca, y contesta en cualquier momento aunque hayan pasado semanas.
//
// AQUÍ SE ESCRIBE TAMBIÉN LA LÍNEA DE JAIME, la frase suya que abre el boletín
// de la semana (ver _lib/nota.js). Va en este endpoint y no en uno propio
// porque el plan de Vercel admite 12 funciones y el sitio está justo en 12 —
// mismo motivo por el que /api/news es un router (ver CLAUDE.md). Encaja bien:
// los dos son el panel de control del boletín, los dos van detrás del mismo
// CRON_SECRET y ninguno de los dos es público.
//
//   curl -X POST https://smartfinance.lat/api/newsletter-log \
//     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
//     -d '{"accion":"nota","texto":"Esta semana abrí mi primera cuenta de casa de bolsa."}'
//   curl -X POST ... -d '{"accion":"nota","texto":""}'    # borrarla
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
const nota = require('./_lib/nota');
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

  /*
   * POST {accion:'nota', texto} — la línea de Jaime del próximo boletín.
   *
   * Se guarda con la fecha de hoy y solo entra en el correo si el envío cae
   * dentro de los siete días siguientes (_lib/nota.js). Con texto vacío se
   * borra. No pasa por ninguna IA: es texto suyo, guardado tal cual.
   */
  if (req.method === 'POST') {
    const cuerpo = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch (e) { return {}; } })() : (req.body || {});
    if (cuerpo.accion !== 'nota') {
      res.status(400).json({ error: 'accion_desconocida', acciones: ['nota'] });
      return;
    }
    try {
      const r = await nota.guardar(cuerpo.texto, cuerpo.textoEn);
      res.status(200).json(Object.assign({ ok: true }, r));
    } catch (err) {
      // NOTA_CORTA / NOTA_LARGA son culpa de quien escribe, no del servidor: se
      // contestan con 400 y con el motivo exacto, para poder corregir sin
      // adivinar cuánto sobraba.
      const suyo = err && (err.code === 'NOTA_CORTA' || err.code === 'NOTA_LARGA');
      if (!suyo) console.error('nota: no se pudo guardar:', err && err.message ? err.message : err);
      res.status(suyo ? 400 : 502).json({ error: suyo ? err.code.toLowerCase() : 'nota_no_guardada', detalle: err && err.message ? err.message : String(err) });
    }
    return;
  }

  try {
    const corridas = await registro.leer((req.query && req.query.limite) || 30);
    const resumen = registro.resumir(corridas);

    if (String((req.query && req.query.formato) || '') === 'texto') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(200).send(comoTexto(resumen, corridas));
      return;
    }

    // La nota vigente va en la misma respuesta: es el otro estado del boletín
    // que no se ve desde ningún sitio, y saber que hay una escrita —o que la
    // que se escribió ya caducó— es justo lo que hace falta antes del domingo.
    res.status(200).json({ resumen, corridas, nota: await nota.leer() });
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
