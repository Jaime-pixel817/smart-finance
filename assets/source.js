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
    // /api/history cachea 60 s y el panel se repide cada 60 s en el rango 1D.
    minute:   { en: 'refreshed every minute',        es: 'se actualiza cada minuto' },
    // /api/markets y /api/sparklines cachean 15 min.
    quarter:  { en: 'refreshed every 15 minutes',    es: 'se actualiza cada 15 minutos' },
    // /api/news cachea 24 h; el cliente repregunta cada hora.
    hourly:   { en: 'refreshed hourly',              es: 'se actualiza cada hora' },
    // Rangos 1M/3M/1Y: son cierres diarios, no hay nada intradía que refrescar.
    daily:    { en: 'daily closes',                  es: 'cierres diarios' },
    session:  { en: 'latest session, 5-min bars',    es: 'última sesión, barras de 5 min' },
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
