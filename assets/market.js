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

  function dirOf(pct, series) {
    if (typeof pct === 'number' && !isNaN(pct)) return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    if (Array.isArray(series) && series.length > 1) {
      var d = series[series.length - 1] - series[0];
      return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    }
    return 'flat';
  }

  function cardHTML(item) {
    var dir = dirOf(item.changePct, item.series);
    var pct = fmtPct(item.changePct);
    var arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
    return '<article class="mkt-card">' +
      '<div class="mkt-card-top">' +
        '<span class="mkt-sym">' + escapeHtml(item.sym) + '</span>' +
        '<span class="mkt-name">' + escapeHtml(item.name || '') + '</span>' +
        (item.note ? '<span class="mkt-note">' + escapeHtml(item.note) + '</span>' : '') +
      '</div>' +
      '<p class="mkt-price">' + fmtPrice(item.price) + '</p>' +
      '<p class="mkt-change ' + dir + '">' + (arrow ? '<span class="arrow" aria-hidden="true">' + arrow + '</span>' : '') +
        (pct || '&nbsp;') + '</p>' +
      sparkSVG(item.series, dir) +
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
  }

  function paintSources() {
    var s = document.querySelector('[data-src-stocks]');
    var c = document.querySelector('[data-src-crypto]');
    if (s) s.textContent = (data && data !== 'error' && data.stocks.source) || '—';
    if (c) c.textContent = (data && data !== 'error' && data.crypto.source) || '—';

    var stamp = document.querySelector('[data-updated]');
    if (stamp) {
      if (data && data !== 'error' && data.updatedAt) {
        var t = new Date(data.updatedAt);
        var hora = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        stamp.textContent = (es() ? 'Última actualización ' : 'Last updated ') + hora;
      } else {
        stamp.textContent = '';
      }
    }
  }

  function render() {
    paint('[data-market-stocks]', data && data !== 'error' ? data.stocks : null, 7);
    paint('[data-market-crypto]', data && data !== 'error' ? data.crypto : null, 5);
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
        pairLabelEl: document.getElementById('fxChartPair'),
        pairTabs: document.getElementById('fxTabs'),
        rangeTabs: document.getElementById('fxRangeTabs'),
        pair: 'USDMXN', range: '1D'
      });
    }

    if (window.SmartNews) window.SmartNews.init('[data-news]');

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

    // Al cambiar de idioma hay que repintar lo que genera el JS con su propio
    // texto (mensajes de error, "última actualización", mi lectura).
    document.addEventListener('smartfinance:lang', function () {
      render();
      if (window.SmartNews) window.SmartNews.render();
      if (window.__fxPanel) window.__fxPanel.repaintMeta();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
