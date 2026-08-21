/* ¿Está cerrado el mercado? — una sola respuesta para el sitio y para el boletín.
 *
 * QUÉ PROBLEMA RESUELVE
 * ---------------------
 * /api/history NO está roto cuando devuelve datos del viernes en domingo: está
 * haciendo lo que se le pidió (ver RANGE_MAP en api/history.js, que pide 5 días
 * justamente para que el fin de semana no salga una gráfica vacía). Lo que
 * faltaba era DECIRLO. Un número del viernes presentado sin etiqueta un domingo
 * se lee como el número de hoy, y eso sí es mentir.
 *
 * CÓMO SE DECIDE, Y POR QUÉ ASÍ
 * -----------------------------
 * Comparando la hora del último dato contra la de ahora. Nada más. No hay lista
 * de feriados, no hay "si es sábado o domingo", no hay husos horarios: si el
 * mercado estuviera abierto habría llegado una barra hace menos de cinco
 * minutos, así que un hueco largo ES el mercado cerrado, sea sábado, sea el 16
 * de septiembre, sea Thanksgiving o sea que Yahoo se cayó. Los tres casos que
 * pidió el encargo (fin de semana, feriado, cualquier otro momento) salen del
 * mismo cálculo sin enumerarlos.
 *
 * EL HUECO SON 40 MINUTOS, y es a propósito que sobre tanto. Las barras del
 * rango 1D son de 5 minutos, así que en un mercado abierto el hueco real nunca
 * pasa de 5 más el retraso de Yahoo más el minuto que cachea /api/history. 40
 * son ocho barras perdidas seguidas: no lo alcanza ningún bache normal, y el
 * viernes por la tarde el aviso aparece 40 minutos después del cierre, que es
 * antes de que a nadie le importe. Un umbral apretado sería peor que no tener
 * aviso: un "mercado cerrado" parpadeando un martes a mediodía.
 *
 * SOLO SIRVE PARA SERIES INTRADÍA (el rango 1D). En 1M/3M/1Y los puntos son
 * cierres diarios y el último tiene horas de antigüedad SIEMPRE, también con el
 * mercado abierto: ahí este cálculo diría "cerrado" a las tres de la tarde de
 * un miércoles. Quien llame se encarga de no preguntar fuera de 1D; el pie de
 * esos rangos ya dice "cierres diarios", que es la advertencia que les toca.
 *
 * VIVE EN /assets Y TAMBIÉN SE REQUIERE DESDE /api. Es el mismo criterio en la
 * gráfica y en el correo, y tener dos copias significa que un día dirían cosas
 * distintas del mismo minuto. Por eso el archivo se exporta de las dos formas.
 */
(function (raiz, fabrica) {
  'use strict';
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (raiz) raiz.SmartMarketHours = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var HUECO_MS = 40 * 60 * 1000;

  var TEXTOS = {
    en: { aviso: 'Market closed', cierre: 'last close', hoy: 'today' },
    es: { aviso: 'Mercado cerrado', cierre: 'último cierre', hoy: 'hoy' }
  };

  function opciones(o) { return o || {}; }

  // Clave de día comparable (2026-08-07). 'en-CA' da el orden ISO en todos los
  // navegadores, así que sirve de clave sin tener que armar la fecha a mano.
  function claveDia(fecha, tz) {
    try {
      return fecha.toLocaleDateString('en-CA', tz ? { timeZone: tz } : undefined);
    } catch (e) {
      return fecha.getFullYear() + '-' + (fecha.getMonth() + 1) + '-' + fecha.getDate();
    }
  }

  /*
   * ultimoTs viene en SEGUNDOS, que es como lo entrega /api/history (formato de
   * Yahoo). Se recibe así a propósito, para que ni la gráfica ni el boletín
   * tengan que acordarse de multiplicar.
   *
   * o.ahora    milisegundos, para poder simular una fecha en las pruebas.
   * o.timeZone huso con el que se decide si el último dato es "de hoy". El
   *            sitio lo deja sin poner (el del aparato de quien lee); el
   *            boletín pasa America/Mexico_City, que es el huso con el que ya
   *            escribe su fecha de cabecera.
   */
  function estado(ultimoTs, o) {
    o = opciones(o);
    if (typeof ultimoTs !== 'number' || !isFinite(ultimoTs) || ultimoTs <= 0) {
      return { cerrado: false, ultimo: null, hoy: false };
    }
    var ahora = new Date(o.ahora != null ? o.ahora : Date.now());
    var ultimo = new Date(ultimoTs * 1000);
    // Un dato del futuro (reloj del aparato atrasado) no es mercado cerrado.
    var hueco = ahora.getTime() - ultimo.getTime();
    return {
      cerrado: hueco > HUECO_MS,
      ultimo: ultimo,
      hoy: claveDia(ultimo, o.timeZone) === claveDia(ahora, o.timeZone)
    };
  }

  /*
   * Cuándo fue ese último dato, ya escrito: "viernes 7 de agosto" | "hoy, 03:00 p.m."
   *
   * El día y el resto se piden por separado y se juntan a mano porque es-MX
   * mete una coma detrás del día de la semana ("viernes, 7 de agosto") y en
   * inglés esa coma sí va ("Friday, August 7"). Con un solo toLocaleDateString
   * habría que quitarle la coma al español con una expresión regular, que es
   * peor de leer y se rompe en cuanto un locale la ponga en otro sitio.
   */
  function cuando(est, o) {
    o = opciones(o);
    if (!est || !est.ultimo) return '';
    var es = !!o.es;
    var t = TEXTOS[es ? 'es' : 'en'];
    var loc = es ? 'es-MX' : 'en-US';
    var tz = o.timeZone ? { timeZone: o.timeZone } : {};

    if (est.hoy) {
      // hourCycle es relativamente nuevo; sin fijarlo algunos locales resuelven
      // a h11 y el mediodía sale como "00:05 p.m." (mismo motivo y mismo
      // respaldo que en assets/charts.js).
      var reloj = { hour: '2-digit', minute: '2-digit', hourCycle: 'h12' };
      var hora;
      try {
        hora = est.ultimo.toLocaleTimeString(loc, mezclar(reloj, tz));
      } catch (e) {
        delete reloj.hourCycle;
        hora = est.ultimo.toLocaleTimeString(loc, mezclar(reloj, tz));
      }
      return t.hoy + ', ' + hora;
    }

    var dia = est.ultimo.toLocaleDateString(loc, mezclar({ weekday: 'long' }, tz));
    var resto = est.ultimo.toLocaleDateString(loc, mezclar({ day: 'numeric', month: 'long' }, tz));
    return es ? dia + ' ' + resto : dia + ', ' + resto;
  }

  // "Mercado cerrado · último cierre: viernes 7 de agosto"
  function frase(est, o) {
    o = opciones(o);
    var t = TEXTOS[o.es ? 'es' : 'en'];
    var q = cuando(est, o);
    return q ? t.aviso + ' · ' + t.cierre + ': ' + q : t.aviso;
  }

  // "Último cierre · viernes 7 de agosto" — la versión del correo, donde el
  // título del bloque ya dice de qué mercado se habla.
  function pieCierre(est, o) {
    o = opciones(o);
    var t = TEXTOS[o.es ? 'es' : 'en'];
    var q = cuando(est, o);
    if (!q) return '';
    var etiqueta = o.es ? 'Último cierre' : 'Last close';
    return etiqueta + ' · ' + q;
  }

  // Object.assign no existe en navegadores viejos y el resto del sitio evita
  // ES6 en los archivos de /assets (son scripts clásicos, no módulos).
  function mezclar(a, b) {
    var r = {};
    for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) r[k] = a[k];
    for (var j in b) if (Object.prototype.hasOwnProperty.call(b, j)) r[j] = b[j];
    return r;
  }

  return {
    HUECO_MS: HUECO_MS,
    estado: estado,
    cuando: cuando,
    frase: frase,
    pieCierre: pieCierre
  };
});
