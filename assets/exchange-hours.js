/* ¿Está abierta esta bolsa? — horario regular de las ocho bolsas del globo.
 *
 * Distinto de assets/market-hours.js a propósito: aquel decide "cerrado" mirando
 * la edad del último dato (sirve para una serie intradía). Aquí no hay serie:
 * el globo pinta ocho bolsas a la vez y tiene que decir a qué hora abre cada
 * una, así que lo que se mira es el RELOJ de la bolsa.
 *
 * SOLO HORARIO REGULAR, sin lista de festivos. Un feriado local saldrá como
 * "abierta" dentro de su horario; por eso la tarjeta dice "horario regular" y no
 * promete más. Mantener festivos de ocho países a mano es la clase de tabla que
 * se desactualiza en silencio.
 *
 * CÓMO SE CALCULA, sin aritmética de husos. Intl.DateTimeFormat con timeZone da
 * el día de la semana y la hora LOCAL de la bolsa ahora mismo. Con eso se sabe
 * en qué sesión va (o cuántos minutos faltan para la próxima), y el instante
 * de ese cambio se obtiene SUMANDO esos minutos al ahora: un Date normal, que
 * luego se formatea en la zona de quien lee. Si hay un cambio de horario de
 * verano entre medias se desvía una hora, lo que para "abre el lunes a las
 * 8:30" es aceptable.
 *
 * Sesiones en minutos locales desde medianoche, lunes a viernes (días 1-5).
 * Tokio y Hong Kong tienen dos tramos (pausa de comida).
 */
(function (raiz, fabrica) {
  'use strict';
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (raiz) raiz.SmartExchangeHours = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var m = function (h, mi) { return h * 60 + mi; };
  var SESIONES = {
    'America/New_York':    [[m(9, 30), m(16, 0)]],
    'America/Toronto':     [[m(9, 30), m(16, 0)]],
    'America/Mexico_City': [[m(8, 30), m(15, 0)]],
    'America/Sao_Paulo':   [[m(10, 0), m(17, 0)]],
    'Europe/London':       [[m(8, 0),  m(16, 30)]],
    'Europe/Berlin':       [[m(9, 0),  m(17, 30)]],
    'Asia/Tokyo':          [[m(9, 0),  m(11, 30)], [m(12, 30), m(15, 30)]],
    'Asia/Hong_Kong':      [[m(9, 30), m(12, 0)],  [m(13, 0),  m(16, 0)]]
  };
  var DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var fmts = {};

  // { dia: 0-6, min: minutos locales } de la bolsa, ahora.
  function reloj(tz, ahora) {
    var f = fmts[tz];
    if (!f) {
      f = fmts[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    }
    var dia = 1, h = 0, mi = 0;
    f.formatToParts(ahora).forEach(function (p) {
      if (p.type === 'weekday') dia = DIAS[p.value] != null ? DIAS[p.value] : 1;
      else if (p.type === 'hour') h = +p.value % 24;
      else if (p.type === 'minute') mi = +p.value;
    });
    return { dia: dia, min: h * 60 + mi };
  }

  /*
   * estado(tz, ahora?) →
   *   { abierta: true,  hasta: Date }   cierre de la sesión en curso
   *   { abierta: false, abre:  Date }   próxima apertura
   *   null                              zona desconocida
   */
  function estado(tz, ahora) {
    var ses = SESIONES[tz];
    if (!ses) return null;
    ahora = ahora || new Date();
    var r = reloj(tz, ahora);
    // Al minuto: las horas que se muestran no llevan segundos.
    var t = Math.floor(ahora.getTime() / 60000) * 60000;
    var esLaborable = r.dia >= 1 && r.dia <= 5;
    if (esLaborable) {
      for (var i = 0; i < ses.length; i++) {
        if (r.min >= ses[i][0] && r.min < ses[i][1]) {
          return { abierta: true, hasta: new Date(t + (ses[i][1] - r.min) * 60000) };
        }
        if (r.min < ses[i][0]) {
          return { abierta: false, abre: new Date(t + (ses[i][0] - r.min) * 60000) };
        }
      }
    }
    // Ya cerró hoy, o es fin de semana: primera sesión del próximo día hábil.
    var saltos = 1, dia = r.dia;
    while (true) {
      dia = (dia + 1) % 7;
      if (dia >= 1 && dia <= 5) break;
      saltos++;
    }
    return { abierta: false, abre: new Date(t + (saltos * 1440 - r.min + ses[0][0]) * 60000) };
  }

  // Hora corta en la zona de quien lee ("14:30" / "2:30 PM" según su
  // configuración). Si falta más de un día se antepone el día de la semana.
  function horaLocal(fecha, lang, ahora) {
    ahora = ahora || new Date();
    var opts = { hour: 'numeric', minute: '2-digit' };
    if (fecha.getTime() - ahora.getTime() > 20 * 3600000 || fecha.getDay() !== ahora.getDay()) opts.weekday = 'short';
    try { return fecha.toLocaleTimeString(lang || undefined, opts); }
    catch (e) { return fecha.toLocaleTimeString(); }
  }

  return { estado: estado, horaLocal: horaLocal, SESIONES: SESIONES };
});
