// Atribución de fuente — UN solo formato para todo el sitio.
//
// Antes la misma información (de dónde sale el dato y qué tan fresco es) estaba
// escrita de cuatro formas distintas: "Yahoo Finance · live · latest trading
// session, 5-min bars", "Yahoo Finance · live", "Yahoo Finance" y "Source: —".
// Ahora todas pasan por aquí y salen como:
//
//     NOMBRE · detalle de frescura
//
// Regla del detalle: dice cada cuánto se refresca DE VERDAD, nunca "en vivo".
// Ninguna de las fuentes gratuitas que usamos es tick a tick, y prometer más
// frescura de la que hay es la única mentira que este componente puede contar.

(function () {
  'use strict';

  function es() { return document.documentElement.lang === 'es'; }

  // Detalles reutilizables, en los dos idiomas. Cada clave describe una cadencia
  // real, medida contra el caché del endpoint que la sirve.
  var DETAIL = {
    /*
     * Rango 1D de las gráficas.
     *
     * Antes esta clave se llamaba "minute" y decía "refreshed every minute",
     * porque se miró solo la mitad de la cadena: es verdad que /api/history
     * cachea 60 s y que el panel repregunta cada 60 s. Pero lo que se pide a
     * Yahoo en el rango 1D es interval=5m (ver RANGE_MAP en api/history.js),
     * o sea BARRAS DE CINCO MINUTOS. Preguntar cada minuto por una serie que
     * solo gana un punto cada cinco no la hace fresca cada minuto: cuatro de
     * cada cinco respuestas traen exactamente lo mismo.
     *
     * Así que el intervalo real del componente son 5 minutos, y eso es lo que
     * dice ahora. De paso deja de contradecir al resto de la página, que
     * promete 15 minutos para los precios (esos sí son /api/markets, que
     * cachea 15 min de verdad): ya no son dos promesas peleadas, son dos
     * cadencias distintas, cada una dicha con su número correcto.
     */
    session:  { en: 'latest session, 5-min bars',    es: 'última sesión, barras de 5 min' },
    // Las dos tarjetas de cripto del home preguntan a CoinGecko directamente
    // cada 60 s (index.html, fetchCrypto + REFRESH). Ojo: esta clave NO vale
    // para las gráficas, que aunque repregunten cada minuto traen barras de
    // cinco (ver "session").
    minute:   { en: 'refreshed every minute',        es: 'se actualiza cada minuto' },
    // /api/markets y /api/sparklines cachean 15 min.
    quarter:  { en: 'refreshed every 15 minutes',    es: 'se actualiza cada 15 minutos' },
    // /api/news cachea 24 h; el cliente repregunta cada hora.
    hourly:   { en: 'refreshed hourly',              es: 'se actualiza cada hora' },
    // Rangos 1M/3M/1Y: son cierres diarios, no hay nada intradía que refrescar.
    daily:    { en: 'daily closes',                  es: 'cierres diarios' },
    unavailable: { en: 'unavailable right now, retrying automatically',
                   es: 'no disponible por ahora, se reintenta solo' },
    loading:  { en: 'loading…',                      es: 'cargando…' }
  };

  function detail(key) {
    var d = DETAIL[key];
    if (!d) return key || '';
    return es() ? d.es : d.en;
  }

  // Devuelve el texto plano "NOMBRE · detalle". Si no hay nombre todavía (el
  // dato aún no llega), NO escribe "—": deja el detalle solo, porque un guion
  // suelto se lee como "esto está roto" y no como "esto viene en camino".
  function line(name, key) {
    var d = detail(key);
    if (!name) return d;
    return d ? name + ' · ' + d : name;
  }

  // Pinta dentro de un elemento con la estructura del componente, para que el
  // nombre y el detalle se puedan estilar por separado.
  function paint(el, name, key) {
    if (!el) return;
    var d = detail(key);
    el.classList.add('src-line');
    if (!name) {
      el.innerHTML = '<span class="src-detail"></span>';
      el.firstChild.textContent = d;
      return;
    }
    el.textContent = '';
    var n = document.createElement('span');
    n.className = 'src-name';
    n.textContent = name;
    el.appendChild(n);
    if (d) {
      var sep = document.createElement('span');
      sep.className = 'src-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '·';
      var det = document.createElement('span');
      det.className = 'src-detail';
      det.textContent = d;
      el.appendChild(sep);
      el.appendChild(det);
    }
  }

  window.SmartSource = { line: line, paint: paint, detail: detail, DETAIL: DETAIL };
})();
