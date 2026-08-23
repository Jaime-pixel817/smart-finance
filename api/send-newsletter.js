// Envío del boletín SEMANAL. La dispara el Cron de Vercel una vez por semana.
//
// HORARIO (configurado en vercel.json, que no admite comentarios): la tarea
// corre a las "0 14 * * 0", o sea los DOMINGOS a las 14:00 UTC = 8:00 AM en
// Ciudad de México. México dejó el horario de verano en 2022 y se quedó fijo en
// UTC-6, así que esta hora no hay que moverla dos veces al año.
//
// POR QUÉ SEMANAL: el plan gratuito de Resend da 100 correos al DÍA y esos 100
// son los mismos que usan las confirmaciones de alta. Con ~90 suscriptores, el
// envío diario dejaba menos de diez correos libres para que alguien pudiera
// darse de alta — o sea que el sistema se rompía solo con crecer, y en
// silencio. El detalle está en el encabezado de _lib/boletin.js.
//
// DURACIÓN: también en vercel.json se le sube maxDuration a 60s. El envío
// recorre la lista con una pausa entre correos por el límite de peticiones de
// Resend, y con el máximo por defecto no alcanzaría.
//
// PROTECCIÓN: la puerta de CRON_SECRET vive en _lib/secreto.js, compartida con
// /api/newsletter-log.
//
// REGISTRO: cada corrida deja una línea en Redis (_lib/registro.js) con la
// fecha, quién la disparó, si funcionó y cuántos correos salieron. Los logs de
// Vercel duran 30 minutos y por eso no supimos por qué el boletín dejó de
// llegar; esto no caduca. Se consulta en /api/newsletter-log.

const suscriptores = require('./_lib/suscriptores');
const resend = require('./_lib/resend');
const registro = require('./_lib/registro');
const { autorizado, origen } = require('./_lib/secreto');
const { construirContenido, renderizarCorreo, urlSitio } = require('./_lib/boletin');

// Margen para no morir a medio envío: Vercel corta la función y quedaría sin
// saberse a quién se le escribió. Al acercarse al límite se para y se reporta.
const PRESUPUESTO_MS = 50 * 1000;

module.exports = async function handler(req, res) {
  if (!autorizado(req)) {
    console.warn('envío rechazado: falta el secreto o no coincide');
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const disparo = origen(req);
  const inicio = Date.now();
  // Ensayo: arma y responde el correo sin mandarlo. Sirve para revisar el
  // contenido del día sin gastar cuota ni escribirle a nadie.
  const soloEnsayo = String((req.query && req.query.dry) || '') === '1';

  // Toda salida de esta función pasa por aquí, para que no exista ningún camino
  // que responda sin dejar rastro. El registro se anota ANTES de responder pero
  // su fallo nunca cambia la respuesta: anotar() no lanza.
  async function responder(codigo, cuerpo, extra) {
    await registro.anotar(Object.assign({
      disparo,
      ensayo: soloEnsayo,
      ok: codigo === 200 && !cuerpo.error,
      codigo,
      segundos: Math.round((Date.now() - inicio) / 1000)
    }, extra || {}));
    res.status(codigo).json(cuerpo);
  }

  if (!resend.hayCredencial()) {
    console.error('envío abortado: RESEND_API_KEY no está configurada');
    await responder(500, { error: 'resend_no_configurado' }, { enviados: 0, motivo: 'resend_no_configurado' });
    return;
  }

  try {
    const [contenido, lista] = await Promise.all([
      construirContenido(new Date()),
      suscriptores.listarConfirmados()
    ]);

    /*
     * ¿HAY CORREO QUE MANDAR?
     *
     * Antes bastaba con que faltara la noticia para abortar. Con el boletín
     * semanal esa regla es demasiado dura por dos motivos: la noticia viene de
     * /news y solo existe si una persona aprobó alguna esa semana —no hacerlo
     * no debería cancelar el correo—, y el resto del boletín (la semana del
     * mercado, la lección, el research) es contenido de verdad por sí solo.
     *
     * Lo que sí cancela el envío es no tener NADA: ni noticia aprobada ni un
     * solo dato de mercado. Eso ya no es un boletín flojo, es un boletín vacío,
     * y mandarlo gastaría cuota de Resend para no decir nada.
     */
    const hayMercado = !!(contenido.mercado && (contenido.mercado.usdmxn || contenido.mercado.vix));
    if (!contenido.noticia && !hayMercado) {
      console.error('envío abortado: ni noticia aprobada ni datos de mercado');
      await responder(502, { error: 'sin_contenido' }, { enviados: 0, motivo: 'sin_contenido' });
      return;
    }
    if (!contenido.noticia) {
      // No es un fallo: es la promesa del sitio funcionando. Queda en el
      // registro para que se note si pasan varias semanas seguidas.
      console.warn('boletín: esta semana no hay ninguna noticia aprobada; el correo sale sin ese bloque');
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
      await responder(200, {
        ensayo: true,
        // Qué par de variables de Redis se detectó. Va solo aquí, detrás del
        // secreto, porque sirve para depurar la conexión sin publicar nada:
        // muestra el prefijo y el host, nunca el token.
        redis: require('./_lib/redis').estadoConexion(),
        remitente: resend.remitente(),
        // Vacío significa que NEWSLETTER_REPLY_TO no está puesta y las
        // respuestas caen en una dirección sin buzón. Se enseña aquí porque es
        // invisible desde fuera: no se nota hasta que alguien contesta.
        respuestaA: resend.respuestaA(),
        cabeceras: resend.armarMensaje({
          para: 'ejemplo@correo.com', asunto: muestra.asunto, html: '',
          listUnsubscribeUrl: urlSitio() + '/api/unsubscribe?token=EJEMPLO&email=ejemplo%40correo.com'
        }).headers,
        confirmados: total,
        seEnviariaA: destinatarios.length,
        asunto: muestra.asunto,
        tip: contenido.tip.es.titulo,
        mercado: contenido.mercado,
        // Qué reporte de research entra esta semana, o null si no hubo
        // novedad. Va en el ensayo porque es la única sección condicional del
        // correo: sin esto no habría forma de saber si NO salió porque no tocaba
        // o porque /research-latest.json no contestó.
        research: contenido.research,
        // La gráfica del día: su URL pública y lo que pesa. Va en el ensayo
        // porque es lo único del correo que vive fuera del correo — si Redis
        // no contestó esto sale en null, y esa es la única señal de que la
        // imagen no va a aparecer. En el HTML no se notaría: el bloque
        // simplemente no se pinta.
        grafica: contenido.grafica,
        // La noticia aprobada de la semana, o null si esta semana no hubo
        // ninguna. Que salga null es información, no un fallo.
        titular: contenido.noticia ? contenido.noticia.es.titulo : null,
        autoriaNoticia: contenido.noticia ? contenido.noticia.autoria : null,
        html: muestra.html
      }, { enviados: 0, confirmados: total, motivo: 'ensayo' });
      return;
    }

    /*
     * ENVÍO DE PRUEBA: ?prueba=alguien@correo.com
     *
     * Manda el boletín REAL —el mismo HTML, la misma gráfica, el mismo asunto—
     * a una sola dirección y a nadie más. Existe porque el ensayo (?dry=1)
     * devuelve el HTML pero no prueba lo único que no se puede comprobar
     * mirándolo: cómo lo pinta Gmail, si Outlook bloquea las imágenes, si la
     * gráfica se descarga desde su URL. Eso solo se ve en una bandeja de
     * entrada de verdad.
     *
     * Va detrás del mismo CRON_SECRET que el resto, y NO toca la lista: los
     * suscriptores ni se consultan para esto. El link de baja lleva un token de
     * ejemplo, así que darle no da de baja a nadie.
     */
    const destinoPrueba = String((req.query && req.query.prueba) || '').trim();
    if (destinoPrueba) {
      if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(destinoPrueba)) {
        await responder(400, { error: 'correo_invalido' }, { enviados: 0, motivo: 'prueba_correo_invalido' });
        return;
      }

      const urlBaja = urlSitio() + '/api/unsubscribe?token=EJEMPLO&email=' + encodeURIComponent(destinoPrueba);
      const { html, texto, asunto } = renderizarCorreo({
        contenido,
        idioma: String((req.query && req.query.lang) || 'es'),
        urlBaja
      });

      await resend.enviarCorreo({ para: destinoPrueba, asunto, html, texto, listUnsubscribeUrl: urlBaja });

      // Se anota como ensayo aunque haya salido un correo de verdad: el
      // registro sirve para saber si la LISTA recibió el boletín del día, y una
      // prueba a una dirección suelta no es eso. Contarla como envío bueno
      // taparía justo el fallo que el registro viene a destapar.
      await responder(200, {
        prueba: true,
        enviadoA: destinoPrueba,
        asunto,
        grafica: contenido.grafica,
        pesoHtml: Buffer.byteLength(html),
        pesoTexto: Buffer.byteLength(texto)
      }, { ensayo: true, enviados: 0, motivo: 'prueba' });
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

    // Un envío en el que NADIE recibió nada no se cuenta como bueno aunque la
    // función responda 200: si mañana el registro dice "ok" con enviados 0, la
    // avería queda escondida detrás de un tic verde, que es justo lo contrario
    // de lo que este registro viene a resolver.
    await responder(200, resumen, {
      ok: enviados > 0,
      via,
      confirmados: total,
      enviados,
      fallidos: fallidos.length,
      pendientesPorCuota: resumen.pendientesPorCuota,
      pendientesPorTiempo: cortadoPorTiempo
    });
  } catch (err) {
    const mensaje = err && err.message ? err.message : String(err);
    console.error('envío fallido:', mensaje);
    await responder(500, { error: 'send_failed' }, { enviados: 0, motivo: 'excepcion', error: mensaje.slice(0, 200) });
  }
};
