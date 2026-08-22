// Panel de tasas de referencia: el único bloque del sitio que se actualiza a
// mano. Antes anunciaba como "próxima" una reunión que ya había pasado, porque
// las dos fechas estaban escritas a pelo en el HTML.
//
// Ahora las fechas de reunión viven en un calendario y "la próxima" se calcula
// contra la fecha de hoy, así que no puede quedarse en el pasado. Las TASAS
// siguen a mano (cambian pocas veces al año), pero con dos redes de seguridad:
// el spread se calcula solo, y si la verificación manual envejece más de
// MAX_DIAS el panel entero se esconde. Mejor no decir nada que decir algo viejo.

(function () {
  'use strict';

  // ---- LO QUE SE ACTUALIZA A MANO ---------------------------------------
  // Al tocar cualquiera de estos números, mueve TAMBIÉN verificado a la fecha
  // de hoy. Si no, el panel se apagará solo a los 60 días.
  var TASAS = {
    verificado: '2026-08-03',      // AAAA-MM-DD
    fedMin: 3.50,                  // rango objetivo de fed funds, %
    fedMax: 3.75,
    banxico: 6.50,                 // tasa objetivo de Banxico, %
    // Qué hizo cada banco en su última reunión, para el pie del panel.
    fedUltima: { fecha: '2026-06-17', accion: { en: 'held', es: 'sin cambio' } },
    banxicoUltima: { fecha: '2026-06-25', accion: { en: 'cut', es: 'recorte' } }
  };

  // Si la verificación de arriba tiene más de esto, el panel no se pinta.
  var MAX_DIAS = 60;
  // Antes de esconderlo, avisa que ya toca revisarlo.
  var DIAS_AVISO = 45;

  // ---- CALENDARIOS OFICIALES --------------------------------------------
  // FOMC: calendario publicado por la Reserva Federal (federalreserve.gov,
  // "FOMC Meetings"). Son reuniones de dos días; la fecha que cuenta para
  // "ya pasó" es la del segundo día.
  var FOMC = [
    ['2026-01-27', '2026-01-28'], ['2026-03-17', '2026-03-18'],
    ['2026-04-28', '2026-04-29'], ['2026-06-16', '2026-06-17'],
    ['2026-07-28', '2026-07-29'], ['2026-09-15', '2026-09-16'],
    ['2026-10-27', '2026-10-28'], ['2026-12-08', '2026-12-09'],
    ['2027-01-26', '2027-01-27'], ['2027-03-16', '2027-03-17'],
    ['2027-04-27', '2027-04-28'], ['2027-06-08', '2027-06-09'],
    ['2027-07-27', '2027-07-28'], ['2027-09-14', '2027-09-15'],
    ['2027-10-26', '2027-10-27'], ['2027-12-07', '2027-12-08']
  ];

  // Banxico: las ocho fechas de 2026, todas jueves, del calendario anual de
  // anuncios de política monetaria. NO hay 2027 aquí a propósito: al momento de
  // escribir esto Banxico todavía no publicaba ese calendario, y una fecha
  // inventada es peor que ninguna. Cuando salga, se agrega y ya. Mientras
  // tanto, al acabarse 2026 la fila se esconde sola en vez de mentir.
  var BANXICO = [
    ['2026-02-05'], ['2026-03-26'], ['2026-05-07'], ['2026-06-25'],
    ['2026-08-06'], ['2026-09-24'], ['2026-11-05'], ['2026-12-17']
  ];

  // ---- Utilidades de fecha ----------------------------------------------
  // Se parsean a mediodía UTC para que el desfase de zona horaria no corra un
  // día entero la fecha (new Date('2026-08-06') es medianoche UTC, que en
  // México todavía es el 5).
  function d(iso) {
    var p = iso.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
  }

  function hoy() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), 12));
  }

  function dias(desdeIso) {
    return Math.floor((hoy() - d(desdeIso)) / 86400000);
  }

  // La próxima reunión que no haya terminado. Si una reunión es hoy, sigue
  // contando como la próxima: todavía no hay anuncio.
  function proxima(cal) {
    var t = hoy().getTime();
    for (var i = 0; i < cal.length; i++) {
      var fin = cal[i][cal[i].length - 1];
      if (d(fin).getTime() >= t) return cal[i];
    }
    return null;      // se acabó el calendario: quien llame decide qué hacer
  }

  var MES = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  };

  function es() { return document.documentElement.lang === 'es'; }

  function fmtDia(iso) {
    var f = d(iso);
    var m = MES[es() ? 'es' : 'en'][f.getUTCMonth()];
    return es() ? (f.getUTCDate() + ' ' + m) : (m + ' ' + f.getUTCDate());
  }

  // "Sep 15–16" en inglés y "15–16 sep" en español: el mes va donde toca en
  // cada idioma, no pegado al primer día. Si la reunión cruzara de mes se
  // escriben las dos fechas completas ("Apr 29 – May 1").
  function fmtRango(rango) {
    if (rango.length === 1) return fmtDia(rango[0]);
    var a = d(rango[0]), b = d(rango[1]);
    if (a.getUTCMonth() !== b.getUTCMonth()) return fmtDia(rango[0]) + ' – ' + fmtDia(rango[1]);
    var mes = MES[es() ? 'es' : 'en'][a.getUTCMonth()];
    return es()
      ? a.getUTCDate() + '–' + b.getUTCDate() + ' ' + mes
      : mes + ' ' + a.getUTCDate() + '–' + b.getUTCDate();
  }

  function fmtFechaLarga(iso) {
    var f = d(iso);
    var m = MES[es() ? 'es' : 'en'][f.getUTCMonth()];
    return es()
      ? (f.getUTCDate() + ' de ' + m + ' de ' + f.getUTCFullYear())
      : (m + ' ' + f.getUTCDate() + ', ' + f.getUTCFullYear());
  }

  // ---- Pintado -----------------------------------------------------------
  function fila(etiqueta, valor) {
    return '<div class="rate-row"><span class="rate-label">' + etiqueta +
           '</span><span class="rate-value">' + valor + '</span></div>';
  }

  function render() {
    var panel = document.getElementById('ratesPanel');
    if (!panel) return;

    var antiguedad = dias(TASAS.verificado);
    var E = es();

    // Demasiado viejo: se esconde el panel completo y se dice por qué. No se
    // deja el número a medias ni un "quizá": o el dato es defendible o no está.
    if (antiguedad > MAX_DIAS) {
      panel.hidden = false;
      panel.innerHTML =
        '<h4>' + (E ? 'Tasas de referencia' : 'Reference rates') + '</h4>' +
        '<p class="rate-stale">' + (E
          ? 'Estos números se revisan a mano y llevan ' + antiguedad + ' días sin actualizarse, así que se ocultaron. Vuelven en cuanto los verifique.'
          : 'These are checked by hand and are ' + antiguedad + ' days out of date, so they are hidden. They come back as soon as I verify them.') +
        '</p>';
      panel.classList.add('is-stale');
      return;
    }
    panel.classList.remove('is-stale');
    panel.hidden = false;

    // El spread sale de las otras dos, no escrito aparte: así no se pueden
    // desincronizar al mover una tasa y olvidar la otra. Se mide contra el
    // punto medio del rango de la Fed, que es lo que se compara normalmente.
    var fedMedio = (TASAS.fedMin + TASAS.fedMax) / 2;
    var spread = TASAS.banxico - fedMedio;

    var pFomc = proxima(FOMC);
    var pBanxico = proxima(BANXICO);

    var html = '<h4>' + (E ? 'Tasas de referencia' : 'Reference rates') + '</h4>';

    html += fila(E ? 'Objetivo de fondos federales' : 'Fed Funds Target',
                 TASAS.fedMin.toFixed(2) + '–' + TASAS.fedMax.toFixed(2) + '%');
    html += fila(E ? 'Tasa objetivo de Banxico' : 'Banxico Reference Rate',
                 TASAS.banxico.toFixed(2) + '%');
    html += fila(E ? 'Diferencial MX–EE. UU.' : 'MX–US Spread',
                 '≈' + spread.toFixed(2) + ' pp');

    // Cada fila de "próxima" solo existe si de verdad queda una fecha futura.
    if (pFomc) html += fila(E ? 'Próxima reunión de la Fed' : 'Next FOMC', fmtRango(pFomc));
    if (pBanxico) html += fila(E ? 'Próxima de Banxico' : 'Next Banxico', fmtRango(pBanxico));

    // Pie: de dónde salen y qué tan viejos son. Mismo formato de atribución que
    // el resto del sitio, con la fuente "a mano" en vez de una API.
    var pie = (E ? 'Revisado a mano' : 'Checked by hand') + ' · ' +
              (E ? 'verificado el ' : 'verified ') + fmtFechaLarga(TASAS.verificado);
    if (antiguedad > DIAS_AVISO) {
      pie += ' · ' + (E ? 'pendiente de revisión' : 'due for review');
    }
    html += '<p class="src-line rate-src' + (antiguedad > DIAS_AVISO ? ' is-warn' : '') + '">' + pie + '</p>';

    // Qué hizo cada banco la última vez, para que el número tenga contexto.
    var ult = (E ? 'Fed: ' : 'Fed: ') + (E ? TASAS.fedUltima.accion.es : TASAS.fedUltima.accion.en) +
              ' ' + fmtDia(TASAS.fedUltima.fecha) + ' · Banxico: ' +
              (E ? TASAS.banxicoUltima.accion.es : TASAS.banxicoUltima.accion.en) +
              ' ' + fmtDia(TASAS.banxicoUltima.fecha);
    html += '<p class="rate-last">' + ult + '</p>';

    panel.innerHTML = html;
    // Las tasas entran deslizándose desde abajo, una detrás de otra. Van con
    // selector y no con la lista de nodos porque este panel se rehace entero
    // al cambiar de idioma.
    if (window.SmartMotion) window.SmartMotion.numeros(panel, '.rate-value');
  }

  window.SmartMacro = { render: render, FOMC: FOMC, BANXICO: BANXICO, TASAS: TASAS, proxima: proxima };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  document.addEventListener('smartfinance:lang', render);
})();
