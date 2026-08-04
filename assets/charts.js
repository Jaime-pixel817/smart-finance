// Gráficas de línea sobre /api/history — compartidas por el home y /market.
//
// El home tiene dos paneles (tipo de cambio y VIX) y /market vuelve a montar el
// de tipo de cambio. Los tres son la misma cosa: pedir una serie a
// /api/history, dibujarla con Chart.js y ofrecer pestañas de rango. Esto vivía
// dentro del <script> del home; se sacó aquí para que /market no lo copiara.
//
// Script clásico (no módulo) y expuesto en window.SmartCharts, porque el bloque
// grande del home tampoco es un módulo.

(function () {
  'use strict';

  var PAIRS = {
    USDMXN: { label: 'USD/MXN', decimals: 4 },
    EURMXN: { label: 'EUR/MXN', decimals: 4 },
    CHFMXN: { label: 'CHF/MXN', decimals: 4 },
    EURUSD: { label: 'EUR/USD', decimals: 4 },
    GBPUSD: { label: 'GBP/USD', decimals: 4 },
    USDJPY: { label: 'USD/JPY', decimals: 2 },
    VIX:    { label: 'VIX',     decimals: 2 },

    // Acciones e índices (solo /market). La etiqueta lleva el nombre que la
    // gente reconoce y no el ticker suelto: "S&P 500" dice más que "SPY" a
    // quien está empezando, que es justo el público de este sitio.
    SPY:    { label: 'S&P 500 (SPY)',    decimals: 2 },
    QQQ:    { label: 'Nasdaq 100 (QQQ)', decimals: 2 },
    DIA:    { label: 'Dow Jones (DIA)',  decimals: 2 },
    AAPL:   { label: 'Apple',            decimals: 2 },
    MSFT:   { label: 'Microsoft',        decimals: 2 },
    NVDA:   { label: 'Nvidia',           decimals: 2 },
    AMZN:   { label: 'Amazon',           decimals: 2 }
  };

  // Qué detalle de frescura le toca a cada rango. Las cadenas de texto NO están
  // aquí: viven en assets/source.js, que es el único lugar del sitio donde se
  // decide cómo se redacta la atribución de una fuente.
  var RANGE_DETAIL = { '1D': 'minute', '1M': 'daily', '3M': 'daily', '1Y': 'daily' };

  function fmtPrice(n, decimals) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatTimestamp(ts, range, full) {
    var d = new Date(ts * 1000);
    if (range === '1D') {
      return full
        ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: range === '1Y' ? 'numeric' : undefined });
  }

  // Línea punteada vertical siguiendo al cursor sobre la gráfica.
  var crosshairPlugin = {
    id: 'fxCrosshair',
    afterDraw: function (chart) {
      var active = chart.tooltip && chart.tooltip._active;
      if (!active || !active.length) return;
      var ctx = chart.ctx, chartArea = chart.chartArea;
      if (!chartArea) return;
      var x = active[0].element.x;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(245,245,242,0.35)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    }
  };
  var registered = false;
  function ensureRegistered() {
    if (!registered && typeof Chart !== 'undefined') { Chart.register(crosshairPlugin); registered = true; }
  }

  // Opciones compartidas: así las gráficas del home y las de /market se ven
  // exactamente iguales y no se desincronizan al tocar una.
  function lineChartOptions(callbacks) {
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111113', borderColor: '#1E1E22', borderWidth: 1,
          titleColor: '#F5F5F2', bodyColor: '#F5F5F2',
          titleFont: { family: 'JetBrains Mono', size: 11 }, bodyFont: { family: 'JetBrains Mono', size: 12 },
          padding: 10, displayColors: false,
          callbacks: callbacks
        }
      },
      scales: {
        x: { ticks: { color: '#8A8A8E', maxTicksLimit: 6, font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: '#1E1E22' } },
        y: { ticks: { color: '#8A8A8E', font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: '#1E1E22' } }
      }
    };
  }

  // Dataset con degradado, idéntico en todas las gráficas.
  function lineDataset(values, labels, rgb) {
    return {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: 'rgb(' + rgb + ')',
        backgroundColor: function (context) {
          var c = context.chart.ctx, area = context.chart.chartArea;
          if (!area) return null;
          var g = c.createLinearGradient(0, area.top, 0, area.bottom);
          g.addColorStop(0, 'rgba(' + rgb + ',0.28)');
          g.addColorStop(1, 'rgba(' + rgb + ',0)');
          return g;
        },
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: 'rgb(' + rgb + ')',
        fill: true, tension: 0.3
      }]
    };
  }

  function esNow() { return document.documentElement.lang === 'es'; }

  // ---- Panel de gráfica -------------------------------------------------
  // opts: { canvas, valueEl, changeEl, noteEl?, pairLabelEl?, pairTabs?,
  //         rangeTabs, pair, range, invert? }
  // invert = true pinta la SUBIDA en rojo. Es para el VIX: subir ahí significa
  // más miedo, al revés que en una gráfica de precio.
  function Panel(opts) {
    this.o = opts;
    this.pair = opts.pair;
    this.range = opts.range || '1D';
    this.chart = null;
    this.points = [];
    this.timer = null;
    this.failed = false;
    this.reqId = 0;   // ver Panel.prototype.load: descarta respuestas atrasadas
    ensureRegistered();
    this.wire();
    // Cada panel se suscribe solo al cambio de idioma: así su pie se traduce
    // sin que la página tenga que acordarse de llamarlo. Antes esto lo hacía
    // /market a mano y el home no, así que el pie de la gráfica del home se
    // quedaba en inglés al cambiar a español.
    var self = this;
    document.addEventListener('smartfinance:lang', function () { self.repaintMeta(); });
    this.setRange(this.range);
  }

  Panel.prototype.wire = function () {
    var self = this;
    if (this.o.pairTabs) {
      this.o.pairTabs.querySelectorAll('[data-pair]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.o.pairTabs.querySelectorAll('[data-pair]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          self.pair = btn.dataset.pair;
          self.load();
        });
      });
    }
    if (this.o.rangeTabs) {
      // Los selectores van acotados a ESTE contenedor: el VIX usa la misma
      // clase para verse igual, y sin acotar se marcarían las pestañas de las
      // dos gráficas al hacer clic en una.
      this.o.rangeTabs.querySelectorAll('[data-range]').forEach(function (btn) {
        btn.addEventListener('click', function () { self.setRange(btn.dataset.range); });
      });
    }
  };

  Panel.prototype.setRange = function (range) {
    var self = this;
    this.range = range;
    if (this.o.rangeTabs) {
      this.o.rangeTabs.querySelectorAll('[data-range]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.range === range);
      });
    }
    this.load();
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    // Solo "1D" se refresca solo: los otros rangos son cierres diarios y no
    // cambian dentro de la sesión.
    if (range === '1D') this.timer = setInterval(function () { self.load(); }, 60000);
  };

  Panel.prototype.load = function () {
    var self = this;
    var cfg = PAIRS[this.pair] || { label: this.pair, decimals: 2 };
    if (this.o.pairLabelEl) this.o.pairLabelEl.textContent = cfg.label;

    // Ficha de esta petición. Cambiar de símbolo y de rango seguido lanza
    // varias a la vez, y no tienen por qué contestar en el mismo orden: si la
    // vieja llegaba al final, pintaba SUS datos bajo la etiqueta de la nueva
    // (un "+20.04% (1D)" que en realidad era el año completo). Al volver, cada
    // respuesta comprueba que sigue siendo la última pedida; si no, se
    // descarta sin tocar la pantalla.
    var ficha = ++this.reqId;
    var pedido = { pair: this.pair, range: this.range };

    return fetch('/api/history?pair=' + encodeURIComponent(pedido.pair) + '&range=' + encodeURIComponent(pedido.range))
      .then(function (res) { if (!res.ok) throw new Error('history ' + res.status); return res.json(); })
      .then(function (data) {
        if (ficha !== self.reqId) return;
        var points = Array.isArray(data.points) ? data.points : [];
        if (!points.length) throw new Error('empty series');
        self.points = points;
        self.failed = false;

        var first = points[0][1], last = points[points.length - 1][1];
        var changePct = ((last - first) / first) * 100;
        var dir = changePct > 0 ? 'up' : changePct < 0 ? 'down' : '';
        // Normal: bajar es lo rojo. Invertido (VIX): subir es lo rojo, porque
        // ahí subir significa más miedo. Plano se queda en verde en los dos.
        var rgb = (self.o.invert ? changePct > 0 : changePct < 0) ? '163,45,45' : '15,138,95';

        if (self.o.valueEl) self.o.valueEl.textContent = fmtPrice(last, cfg.decimals);
        if (self.o.changeEl) {
          self.o.changeEl.textContent = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '% (' + self.range + ')';
          self.o.changeEl.className = self.o.changeClass + ' ' + dir;
        }
        self.repaintMeta();

        var canvas = self.o.canvas;
        if (!canvas || typeof Chart === 'undefined') return;
        var chartData = lineDataset(
          points.map(function (p) { return p[1]; }),
          points.map(function (p) { return formatTimestamp(p[0], self.range); }),
          rgb
        );
        var options = lineChartOptions({
          title: function (items) { return items.length ? formatTimestamp(self.points[items[0].dataIndex][0], self.range, true) : ''; },
          label: function (item) { return fmtPrice(item.parsed.y, cfg.decimals); }
        });
        if (self.chart) {
          self.chart.data = chartData;
          self.chart.options = options;
          self.chart.update();
        } else {
          self.chart = new Chart(canvas, { type: 'line', data: chartData, options: options, plugins: [crosshairPlugin] });
        }
      })
      .catch(function (e) {
        // Igual que arriba: un fallo de una petición ya superada no debe
        // borrar la gráfica que sí llegó bien después.
        if (ficha !== self.reqId) return;
        console.warn('chart fetch failed (' + pedido.pair + '):', e);
        self.points = [];
        self.failed = true;
        if (self.o.valueEl) self.o.valueEl.textContent = '—';
        if (self.o.changeEl) { self.o.changeEl.textContent = ''; self.o.changeEl.className = self.o.changeClass; }
        self.repaintMeta();
      });
  };

  // El pie del panel pasa por el componente compartido de atribución, así que
  // se ve idéntico al de las tarjetas de /market y al del bloque de tasas.
  // Se vuelve a llamar al cambiar de idioma: sin esto, un panel que falló se
  // anunciaría como fresco nada más por cambiar de idioma.
  Panel.prototype.repaintMeta = function () {
    if (!this.o.noteEl || !window.SmartSource) return;
    var key = this.failed ? 'unavailable' : (RANGE_DETAIL[this.range] || 'minute');
    window.SmartSource.paint(this.o.noteEl, 'Yahoo Finance', key);
  };

  window.SmartCharts = {
    PAIRS: PAIRS,
    fmtPrice: fmtPrice,
    formatTimestamp: formatTimestamp,
    lineChartOptions: lineChartOptions,
    lineDataset: lineDataset,
    crosshairPlugin: crosshairPlugin,
    panel: function (opts) { return new Panel(opts); }
  };
})();
