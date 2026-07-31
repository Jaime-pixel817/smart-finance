// Envío del boletín diario. La dispara el Cron de Vercel una vez al día.
//
// HORARIO (configurado en vercel.json, que no admite comentarios): la tarea
// corre a las "0 14 * * *", o sea 14:00 UTC = 8:00 AM en Ciudad de México.
// México dejó el horario de verano en 2022 y se quedó fijo en UTC-6, así que
// esta hora no hay que moverla dos veces al año.
//
// DURACIÓN: también en vercel.json se le sube maxDuration a 60s. El envío
// recorre la lista con una pausa entre correos por el límite de peticiones de
// Resend, y con el máximo por defecto no alcanzaría.
//
// PROTECCIÓN: Vercel Cron manda "Authorization: Bearer <CRON_SECRET>" en cada
// llamada cuando esa variable existe en el proyecto. Sin ese encabezado la
// función responde 401, así que la URL puede ser pública sin que nadie más
// pueda disparar un envío (ni gastarse la cuota de Resend).

const suscriptores = require('./_lib/suscriptores');
const resend = require('./_lib/resend');
const { construirContenido, renderizarCorreo, urlSitio } = require('./_lib/boletin');

// Margen para no morir a medio envío: Vercel corta la función y quedaría sin
// saberse a quién se le escribió. Al acercarse al límite se para y se reporta.
const PRESUPUESTO_MS = 50 * 1000;

function autorizado(req) {
  const secreto = process.env.CRON_SECRET;
  // Sin secreto configurado no se envía nada: es preferible no mandar el
  // boletín que dejar la URL abierta a cualquiera.
  if (!secreto) return false;

  const cabecera = String(req.headers.authorization || '');
  const esperado = 'Bearer ' + secreto;
  if (cabecera.length !== esperado.length) return false;

  // Comparación en tiempo constante, por si alguien intentara adivinar el
  // secreto midiendo tiempos de respuesta.
  const crypto = require('crypto');
  return crypto.timingSafeEqual(Buffer.from(cabecera), Buffer.from(esperado));
}

module.exports = async function handler(req, res) {
  if (!autorizado(req)) {
    console.warn('envío rechazado: falta el secreto o no coincide');
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (!resend.hayCredencial()) {
    console.error('envío abortado: RESEND_API_KEY no está configurada');
    res.status(500).json({ error: 'resend_no_configurado' });
    return;
  }

  const inicio = Date.now();
  // Ensayo: arma y responde el correo sin mandarlo. Sirve para revisar el
  // contenido del día sin gastar cuota ni escribirle a nadie.
  const soloEnsayo = String((req.query && req.query.dry) || '') === '1';

  try {
    const [contenido, lista] = await Promise.all([
      construirContenido(new Date()),
      suscriptores.listarConfirmados()
    ]);

    if (!contenido.noticias.length) {
      // Sin noticias el correo pierde su parte principal. Mejor no mandar y
      // reintentar mañana que mandar medio boletín.
      console.error('envío abortado: /api/news no devolvió titulares');
      res.status(502).json({ error: 'sin_contenido' });
      return;
    }

    const total = lista.length;
    const limite = resend.LIMITE_DIARIO_PLAN_GRATIS;
    const destinatarios = lista.slice(0, limite);

    if (total > limite) {
      console.warn(
        'AVISO DE CUOTA: hay ' + total + ' suscriptores confirmados y el plan gratis de Resend ' +
        'permite ' + limite + ' correos al día. Se envía a los primeros ' + limite + ' y quedan ' +
        (total - limite) + ' sin recibir el boletín de hoy. Hay que subir de plan en Resend.'
      );
    }

    if (soloEnsayo) {
      const muestra = renderizarCorreo({
        contenido,
        idioma: String((req.query && req.query.lang) || 'es'),
        urlBaja: urlSitio() + '/api/unsubscribe?token=EJEMPLO&email=ejemplo%40correo.com'
      });
      res.status(200).json({
        ensayo: true,
        // Qué par de variables de Redis se detectó. Va solo aquí, detrás del
        // secreto, porque sirve para depurar la conexión sin publicar nada:
        // muestra el prefijo y el host, nunca el token.
        redis: require('./_lib/redis').estadoConexion(),
        remitente: resend.remitente(),
        confirmados: total,
        seEnviariaA: destinatarios.length,
        asunto: muestra.asunto,
        tip: contenido.tip.es.titulo,
        mercado: contenido.mercado,
        titulares: contenido.noticias.map((n) => n.title),
        html: muestra.html
      });
      return;
    }

    // Cada correo se arma por separado: el idioma es el que eligió cada quien al
    // suscribirse, y el link de baja lleva SU token.
    const mensajes = destinatarios.map((s) => {
      const urlBaja = urlSitio() + '/api/unsubscribe?token=' + encodeURIComponent(s.tokenBaja) +
        '&email=' + encodeURIComponent(s.correo);
      const { html, texto, asunto } = renderizarCorreo({ contenido, idioma: s.idioma, urlBaja });
      return { para: s.correo, asunto, html, texto, listUnsubscribeUrl: urlBaja };
    });

    let enviados = 0;
    let fallidos = [];
    let cortadoPorTiempo = 0;
    let via = 'lote';

    // Camino normal: un solo envío por lote. Cabe de sobra en el tiempo de la
    // función incluso con la lista llena, cosa que uno por uno no logra.
    try {
      const r = await resend.enviarLote(mensajes);
      enviados = r.enviados;
    } catch (errLote) {
      // Si el lote se cae entero (por ejemplo, una dirección inválida que
      // invalida toda la petición), se reintenta uno por uno: así un correo
      // malo no deja sin boletín a los demás. Es más lento, y por eso es el
      // plan B y no el camino normal.
      console.error('el envío por lote falló, se reintenta uno por uno:', errLote && errLote.message ? errLote.message : errLote);
      via = 'uno-por-uno';
      enviados = 0;

      for (let i = 0; i < mensajes.length; i++) {
        if (Date.now() - inicio > PRESUPUESTO_MS) {
          cortadoPorTiempo = mensajes.length - i;
          console.warn('envío detenido por tiempo: quedaron ' + cortadoPorTiempo + ' sin enviar');
          break;
        }

        try {
          await resend.enviarCorreo(mensajes[i]);
          enviados++;
        } catch (err) {
          // Un correo que rebota no debe tumbar el resto del envío.
          fallidos.push({ correo: mensajes[i].para, error: err && err.message ? err.message : String(err) });
          console.error('falló el envío a un suscriptor:', err && err.message ? err.message : err);
        }

        // Respiro entre envíos por el límite de peticiones por segundo de Resend.
        if (i < mensajes.length - 1) await resend.dormir(resend.MS_ENTRE_ENVIOS);
      }
    }

    const resumen = {
      via,
      confirmados: total,
      enviados,
      fallidos: fallidos.length,
      pendientesPorCuota: Math.max(0, total - limite),
      pendientesPorTiempo: cortadoPorTiempo,
      segundos: Math.round((Date.now() - inicio) / 1000)
    };
    console.log('boletín enviado:', JSON.stringify(resumen));
    if (fallidos.length) console.error('destinatarios con error:', JSON.stringify(fallidos));

    res.status(200).json(resumen);
  } catch (err) {
    console.error('envío fallido:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'send_failed' });
  }
};
