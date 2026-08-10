// Lógica de /market: pinta las tarjetas de acciones y de cripto a partir de
// /api/markets, y monta la gráfica de divisas reusando assets/charts.js.
//
// Las mini-gráficas son SVG hecho a mano, no Chart.js: doce paneles de Chart.js
// en una sola página son doce canvas con su propio bucle de dibujo, y esta
// página también se abre en teléfono.

(function () {
  'use strict';

  var API = '/api/markets';
  var REFRESH_MS = 15 * 60 * 1000;

  var data = null;   // { stocks, crypto } | 'error' | null

  function es() { return document.documentElement.lang === 'es'; }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  // ---- La hora de "última actualización" --------------------------------
  //
  // Antes esto era un toLocaleTimeString(  [], {hour,minute}  ) y daba pie a
  // que a las 11:50 de la mañana se leyera "11:49 p.m.". El formateador nunca
  // estuvo mal: el problema es que la marca puede venir VIEJA y solo se
  // pintaba "hh:mm", sin fecha que lo delatara. Cuando las dos fuentes
  // fallan, api/markets.js sirve el último cuerpo que tenga en memoria con su
  // updatedAt original (ver el bloque `if (!stocks && !crypto)`), y un lambda
  // caliente puede guardarlo horas. Una marca de anoche pintada como "11:49"
  // se lee igual que un error de AM/PM.
  //
  // Tres cambios, entonces:
  //
  // 1. El idioma sale de la PÁGINA, no del dispositivo. Con [] el navegador
  //    usaba su propio locale, así que un teléfono mexicano en la versión en
  //    inglés mostraba "Last updated 11:49 p. m." — mitad y mitad.
  // 2. hourCycle fijo en h12. Sin fijarlo, algunos locales resuelven a h11 y
  //    el mediodía sale como "00:05 p.m.".
  // 3. Si la marca NO es de hoy, se muestra también el día. Así una marca
  //    vieja se ve vieja, en vez de parecer una hora mal puesta.
  //
  // La zona horaria se escribe siempre: la hora se convierte a la del
  // dispositivo, y sin la etiqueta no hay forma de saber respecto a qué son
  // esos "15 minutos".
  function formatoActualizacion(t) {
    if (isNaN(t.getTime())) return '';
    var loc = es() ? 'es-MX' : 'en-US';
    var ahora = new Date();
    var mismoDia = t.getFullYear() === ahora.getFullYear() &&
      t.getMonth() === ahora.getMonth() &&
      t.getDate() === ahora.getDate();

    var opciones = { hour: 'numeric', minute: '2-digit', hourCycle: 'h12', timeZoneName: 'short' };
    if (!mismoDia) { opciones.day = 'numeric'; opciones.month = 'short'; }

    try {
      return t.toLocaleString(loc, opciones);
    } catch (e) {
      // hourCycle es relativamente nuevo; si el navegador lo rechaza, se cae a
      // la versión de siempre antes que quedarse sin hora.
      return t.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
    }
  }

  // Los precios se muestran con los decimales que el número pide: 62 790 dólares
  // no necesita centavos, 1.07 sí, y 0.4821 más todavía.
  function decimalsFor(n) {
    var a = Math.abs(n);
    if (a >= 1000) return 0;
    if (a >= 100) return 2;
    if (a >= 1) return 2;
    if (a >= 0.01) return 4;
    return 6;
  }

  function fmtPrice(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var d = decimalsFor(n);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return null;
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  // ---- Mini-gráfica -----------------------------------------------------
  // Solo la forma: sin ejes, sin números, sin tooltip. aria-hidden porque el
  // precio y el porcentaje de al lado ya dicen lo mismo.
  function sparkSVG(values, dir) {
    if (!Array.isArray(values) || values.length < 3) return '';
    var W = 100, H = 40, PAD = 3;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = max - min;
    var pts = values.map(function (v, i) {
      var x = (i / (values.length - 1)) * W;
      // Serie plana: línea al centro en vez de dividir entre cero.
      var y = span === 0 ? H / 2 : PAD + (1 - (v - min) / span) * (H - PAD * 2);
      return [x, y];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    return '<svg class="mkt-spark ' + dir + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/></svg>';
  }

  // Dirección del PORCENTAJE: manda el dato de 24 h. Un 0.00% se queda en
  // 'flat' —gris y sin flecha—, que es exactamente lo que dice el número.
  function dirOf(pct, series) {
    if (typeof pct === 'number' && !isNaN(pct)) return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    return dirSerie(series);
  }

  function dirSerie(series) {
    if (Array.isArray(series) && series.length > 1) {
      var d = series[series.length - 1] - series[0];
      return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    }
    return 'flat';
  }

  // Dirección de la MINI-GRÁFICA, que NO es la misma pregunta.
  //
  // El porcentaje habla de 24 h; la línea dibuja 48 h. Antes las dos usaban
  // dirOf, así que un cambio de exactamente 0 dejaba la línea gris y plana
  // aunque la serie que se estaba dibujando subiera y bajara. Eso es lo que se
  // veía en BNB y parecía un dato que no llegó.
  //
  // No es eso: CoinGecko SÍ manda price_change_percentage_24h para BNB
  // (comprobado contra el endpoint). Lo que pasa es que ese campo llega con
  // poca precisión y a veces cae en 0 clavado — ese día le tocó a BNB, otro
  // día le toca a otra. Es general, no del símbolo.
  //
  // Con el porcentaje en 0, entonces, el color de la línea lo decide su propia
  // pendiente: si la forma se mueve, se ve de qué color se mueve.
  function dirSpark(pct, series) {
    if (typeof pct === 'number' && !isNaN(pct) && pct !== 0) return pct > 0 ? 'up' : 'down';
    return dirSerie(series);
  }

  /* ---- Las mini-gráficas se trazan al aparecer ---------------------------
   *
   * SOLO LA PRIMERA VEZ. paint() rehace el innerHTML entero cada 15 minutos y
   * cada vez que se cambia de idioma, así que los <path> son nodos NUEVOS en
   * cada vuelta y "ya se animó" no se puede guardar en el nodo. Se guarda por
   * símbolo, que es lo que sobrevive al repintado.
   *
   * Se marca cuando la animación ARRANCA, no cuando se programa: si llega un
   * refresco mientras la tarjeta todavía está esperando a entrar en pantalla,
   * la tarjeta nueva vuelve a quedarse esperando, que es lo correcto.
   */
  var trazadas = {};

  function animarSparks(cont) {
    var M = window.SmartMotion;
    if (!M || !M.puedeAnimar()) return;   // sin esconder nada
    Array.prototype.forEach.call(cont.querySelectorAll('.mkt-card[data-sym]'), function (card) {
      var sym = card.getAttribute('data-sym');
      var linea = card.querySelector('.mkt-spark path.line');
      var area = card.querySelector('.mkt-spark path.area');
      if (!linea || trazadas[sym]) return;
      if (!M.prepararTrazo(linea)) return;  // path sin largo medible: se deja
      if (area) area.style.opacity = '0';
      M.alPrimerVistazo(card, function (animar) {
        trazadas[sym] = true;
        if (!animar) {
          linea.style.strokeDasharray = '';
          linea.style.strokeDashoffset = '';
          if (area) area.style.opacity = '';
          return;
        }
        M.trazar(linea, M.DUR_SPARK);
        if (area) {
          // El relleno no se puede "trazar": entra desvanecido detrás de la
          // línea, un poco más lento para que la línea vaya por delante.
          void area.getBoundingClientRect();
          area.style.transition = 'opacity ' + Math.round(M.DUR_SPARK * 1.15) + 'ms ' + M.CURVA;
          area.style.opacity = '1';
          M.limpiarAlTerminar(area, Math.round(M.DUR_SPARK * 1.15), function () {
            area.style.transition = '';
            area.style.opacity = '';
          });
        }
      }, { threshold: 0.3 });
    });
  }

  function cardHTML(item) {
    var dir = dirOf(item.changePct, item.series);
    var pct = fmtPct(item.changePct);
    var arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
    return '<article class="mkt-card" data-sym="' + escapeHtml(item.sym) + '">' +
      '<div class="mkt-card-top">' +
        '<span class="mkt-sym">' + escapeHtml(item.sym) + '</span>' +
        '<span class="mkt-name">' + escapeHtml(item.name || '') + '</span>' +
        (item.note ? '<span class="mkt-note">' + escapeHtml(item.note) + '</span>' : '') +
      '</div>' +
      '<p class="mkt-price">' + fmtPrice(item.price) + '</p>' +
      '<p class="mkt-change ' + dir + '">' + (arrow ? '<span class="arrow" aria-hidden="true">' + arrow + '</span>' : '') +
        (pct || '&nbsp;') + '</p>' +
      sparkSVG(item.series, dirSpark(item.changePct, item.series)) +
    '</article>';
  }

  function skeletonHTML(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<article class="mkt-card">' +
        '<div class="mkt-card-top"><span class="mkt-sym skel sm">ABC</span></div>' +
        '<p class="mkt-price"><span class="skel">$000.00</span></p>' +
        '<p class="mkt-change"><span class="skel sm">+0.00%</span></p>' +
      '</article>';
    }
    return out;
  }

  function paint(sel, block, expected) {
    var el = document.querySelector(sel);
    if (!el) return;
    if (data === null) { el.innerHTML = skeletonHTML(expected); return; }
    if (data === 'error' || !block || !block.items || !block.items.length) {
      el.innerHTML = '<div class="mkt-error">' + (es()
        ? 'Estos datos no están disponibles ahora mismo. Se reintenta solo.'
        : 'This data is unavailable right now. It will retry automatically.') + '</div>';
      return;
    }
    el.innerHTML = block.items.map(cardHTML).join('');
    animarSparks(el);
    // El precio y el porcentaje de cada tarjeta entran deslizándose desde
    // abajo, escalonados entre tarjetas. Se llama en cada pintado porque el
    // primero es de esqueletos; motion.js se engancha solo cuando ya hay
    // números de verdad, y una sola vez.
    if (window.SmartMotion) window.SmartMotion.numeros(el, '.mkt-price, .mkt-change');
  }

  // Atribución de fuente por el componente compartido (assets/source.js), el
  // mismo que usan las gráficas y el bloque de tasas.
  //
  // Antes esto escribía literalmente "Source: —" mientras no había datos: un
  // guion suelto que se leía como "esto está roto". Ahora, sin datos todavía,
  // se muestra solo el estado ("cargando…" o el aviso de reintento) y el nombre
  // de la fuente aparece cuando de verdad se sabe cuál fue.
  function paintSources() {
    var vacio = !data;
    var err = data === 'error';
    var estado = vacio ? 'loading' : (err ? 'unavailable' : 'quarter');

    // Ya no hay pie de fuente para acciones: ese bloque dejó de leer
    // /api/markets y ahora es una gráfica sobre /api/history, que escribe su
    // propio pie desde assets/charts.js.
    var c = document.querySelector('[data-src-crypto]');
    if (c && window.SmartSource) {
      window.SmartSource.paint(c, (!vacio && !err && data.crypto.source) || '',
        (!vacio && !err && data.crypto.items.length) ? 'quarter' : estado);
    }

    var stamp = document.querySelector('[data-updated]');
    if (stamp) {
      if (!vacio && !err && data.updatedAt) {
        stamp.textContent = (es() ? 'Última actualización ' : 'Last updated ') +
          formatoActualizacion(new Date(data.updatedAt));
      } else {
        stamp.textContent = '';
      }
    }
  }

  // Cuántas criptos se muestran EN ESTA PÁGINA. /api/markets sigue devolviendo
  // cinco (el home usa dos de ellas), así que el recorte es solo de vista: no
  // se toca el endpoint ni se deja de pedir nada.
  //
  // Se quitó BNB, no una de las otras. Las cuatro que quedan —BTC, ETH, XRP y
  // SOL— son monedas de su propia red; BNB es el token de un exchange, así que
  // su valor cuelga del negocio de una sola empresa. Para alguien que apenas
  // está entendiendo qué es una cripto, esa distinción es justo la que peor se
  // explica en una tarjeta de tres líneas.
  var CRIPTO_EN_ESTA_PAGINA = 4;
  var CRIPTO_FUERA = ['BNB'];

  function criptoVisible(bloque) {
    if (!bloque || !Array.isArray(bloque.items)) return bloque;
    return Object.assign({}, bloque, {
      items: bloque.items
        .filter(function (it) { return CRIPTO_FUERA.indexOf(it.sym) === -1; })
        .slice(0, CRIPTO_EN_ESTA_PAGINA)
    });
  }

  function render() {
    paint('[data-market-crypto]',
      data && data !== 'error' ? criptoVisible(data.crypto) : null,
      CRIPTO_EN_ESTA_PAGINA);
    paintSources();
  }

  function load() {
    return fetch(API)
      .then(function (r) { if (!r.ok) throw new Error('markets ' + r.status); return r.json(); })
      .then(function (j) { data = j; })
      .catch(function (e) { console.warn('markets fetch failed:', e); if (!data || data === 'error') data = 'error'; })
      .then(render);
  }

  function boot() {
    render();          // esqueletos primero
    load();

    // La gráfica de divisas es el MISMO panel del home: mismo módulo, mismo
    // /api/history, mismos pares. Aquí solo se le pasan los elementos.
    if (window.SmartCharts) {
      window.__fxPanel = window.SmartCharts.panel({
        canvas: document.getElementById('fxChartCanvas'),
        valueEl: document.getElementById('fxChartValue'),
        changeEl: document.getElementById('fxChartChange'),
        changeClass: 'fx-chart-change',
        noteEl: document.getElementById('fxChartNote'),
        closedEl: document.getElementById('fxChartClosed'),
        pairLabelEl: document.getElementById('fxChartPair'),
        pairTabs: document.getElementById('fxTabs'),
        rangeTabs: document.getElementById('fxRangeTabs'),
        pair: 'USDMXN', range: '1D'
      });

      // Acciones: el mismo componente otra vez. Antes esto eran siete tarjetas
      // pintadas a mano desde /api/markets; ahora es una gráfica sobre
      // /api/history, así que lo único propio de este bloque son los ids y con
      // qué símbolo abre.
      window.__stockPanel = window.SmartCharts.panel({
        canvas: document.getElementById('stockChartCanvas'),
        valueEl: document.getElementById('stockChartValue'),
        changeEl: document.getElementById('stockChartChange'),
        changeClass: 'fx-chart-change',
        noteEl: document.getElementById('stockChartNote'),
        closedEl: document.getElementById('stockChartClosed'),
        pairLabelEl: document.getElementById('stockChartPair'),
        pairTabs: document.getElementById('stockTabs'),
        rangeTabs: document.getElementById('stockRangeTabs'),
        pair: 'SPY', range: '1D'
      });

      // VIX: igual, con el símbolo fijo (no hay pestañas de símbolo) y invert
      // en true, porque aquí subir significa más miedo y se pinta en rojo.
      window.__vixPanel = window.SmartCharts.panel({
        canvas: document.getElementById('vixChartCanvas'),
        valueEl: document.getElementById('vixChartValue'),
        changeEl: document.getElementById('vixChartChange'),
        changeClass: 'fx-chart-change',
        noteEl: document.getElementById('vixChartNote'),
        closedEl: document.getElementById('vixChartClosed'),
        rangeTabs: document.getElementById('vixRangeTabs'),
        pair: 'VIX', range: '1D', invert: true
      });
    }

    // Refresco pausado en segundo plano: con la pestaña oculta no tiene sentido
    // seguir pidiendo, y el intervalo va igualado al caché del endpoint (15 min):
    // preguntar más seguido solo devuelve la misma respuesta cacheada.
    var timer = null;
    function start() { stop(); timer = setInterval(load, REFRESH_MS); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else { load(); start(); }
    });
    if (!document.hidden) start();

    // Al cambiar de idioma se repinta lo que genera ESTE módulo. El carrusel de
    // noticias y el panel de la gráfica ya se suscriben solos al mismo evento,
    // así que aquí no hay que acordarse de llamarlos.
    document.addEventListener('smartfinance:lang', function () {
      render();
      if (window.__fxPanel) window.__fxPanel.repaintMeta();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
