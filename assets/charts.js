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
  var RANGE_DETAIL = { '1D': 'session', '1M': 'daily', '3M': 'daily', '1Y': 'daily' };

  /*
   * El aviso de mercado cerrado sale SOLO en 1D.
   *
   * No es que en los otros rangos no importe: es que ahí no se puede calcular
   * con este método. El aviso mira el hueco entre el último dato y ahora (ver
   * assets/market-hours.js), y en 1M/3M/1Y los puntos son cierres diarios, así
   * que ese hueco es de horas también con el mercado abierto de par en par: el
   * aviso saldría un miércoles a mediodía. Esos rangos ya llevan "cierres
   * diarios" en su pie, que es exactamente la advertencia que les toca, y
   * además nadie lee una gráfica de un año como el precio de este segundo.
   *
   * Cripto no aparece por ningún lado de este archivo (ver PAIRS): ese mercado
   * opera 24/7 y no lleva aviso. Sus tarjetas las pinta assets/market.js.
   */
  var RANGO_CON_AVISO = '1D';

  function fmtPrice(n, decimals) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /*
   * Fechas y horas de la gráfica.
   *
   * EL BUG QUE ARREGLA: los tres formateadores recibían [] como locale, que
   * significa "usa el del dispositivo". En un teléfono configurado en español
   * leyendo la página en INGLÉS, el tooltip salía "3 ago, 10:25 a. m." —
   * español dentro de una página en inglés. El locale tiene que salir del
   * IDIOMA DE LA PÁGINA, que es el mismo criterio que ya usaba
   * assets/market.js para la hora de "última actualización".
   *
   * hourCycle fijo en h12 por la misma razón que allá: sin fijarlo, algunos
   * locales resuelven a h11 y el mediodía sale como "00:05 p.m.".
   */
  function locale() { return esNow() ? 'es-MX' : 'en-US'; }

  function formatTimestamp(ts, range, full) {
    var d = new Date(ts * 1000);
    var loc = locale();
    try {
      if (range === '1D') {
        return full
          ? d.toLocaleString(loc, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h12' })
          : d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hourCycle: 'h12' });
      }
      return d.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: range === '1Y' ? 'numeric' : undefined });
    } catch (e) {
      // hourCycle es relativamente nuevo; si el navegador lo rechaza, se cae a
      // la versión sin él antes que quedarse sin etiqueta.
      if (range === '1D') {
        return full
          ? d.toLocaleString(loc, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
    }
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
  /* ---- La línea se dibuja al aparecer -----------------------------------
   *
   * Un recorte que crece de izquierda a derecha. El dibujo de Chart.js no se
   * toca: se le recorta el lienzo antes de pintar los datos y se le devuelve
   * después, así que la línea, su relleno y sus puntos aparecen a la vez y en
   * orden, como si se estuvieran trazando.
   *
   * POR QUÉ ASÍ Y NO CON LA ANIMACIÓN DE CHART.JS
   * ---------------------------------------------
   * Chart.js sabe animar punto por punto, pero eso anima TODA actualización:
   * el refresco de cada minuto y cada cambio de par o de rango volverían a
   * dibujar la línea desde cero, que es justo lo que no se quiere. Aquí la
   * animación no vive en las opciones de la gráfica sino en una propiedad
   * suelta ($trazo) que solo se toca una vez. Las opciones llevan
   * animation:false, así que un update() repinta y punto.
   *
   * El recorte solo existe mientras $trazo está entre 0 y 1. Cuando termina se
   * BORRA la propiedad, y a partir de ahí el plugin sale en la primera línea
   * sin tocar el contexto: cero coste en todos los repintados siguientes.
   *
   * VA EN EL <canvas>, NO EN LA GRÁFICA. new Chart() pinta durante su propio
   * constructor, o sea antes de que exista la variable donde guardarla: con la
   * marca en el objeto Chart habría un frame con la línea entera a la vista
   * justo antes de esconderla. En el elemento se puede dejar puesta desde que
   * se construye el panel, mucho antes de que llegue el primer dato.
   */
  var trazoPlugin = {
    id: 'trazoEntrada',
    beforeDatasetsDraw: function (chart) {
      var p = chart.canvas && chart.canvas.$trazo;
      if (p === undefined || p >= 1) return;
      var a = chart.chartArea;
      if (!a) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      // 2px de más a la izquierda y arriba/abajo para no cortar el grosor de
      // la línea ni el punto del primer dato.
      ctx.rect(a.left - 2, a.top - 2, (a.right - a.left) * p + 2, a.bottom - a.top + 4);
      ctx.clip();
    },
    afterDatasetsDraw: function (chart) {
      var p = chart.canvas && chart.canvas.$trazo;
      if (p === undefined || p >= 1) return;
      chart.ctx.restore();
    }
  };

  var registered = false;
  function ensureRegistered() {
    if (!registered && typeof Chart !== 'undefined') {
      Chart.register(crosshairPlugin);
      Chart.register(trazoPlugin);
      registered = true;
    }
  }

  // Opciones compartidas: así las gráficas del home y las de /market se ven
  // exactamente iguales y no se desincronizan al tocar una.
  function lineChartOptions(callbacks) {
    return {
      responsive: true, maintainAspectRatio: false,
      // Sin animación propia: la de entrada la lleva trazoPlugin y corre una
      // sola vez. Con la de Chart.js encendida, cada refresco de datos y cada
      // cambio de par o de rango volvería a animar la línea entera.
      animation: false,
      animations: { colors: false, x: false, y: false },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0A0A0C', borderColor: '#1D1D1D', borderWidth: 1,
          titleColor: '#F5F5F2', bodyColor: '#F5F5F2',
          titleFont: { family: 'Geist Mono', size: 11 }, bodyFont: { family: 'Geist Mono', size: 12 },
          padding: 10, displayColors: false,
          callbacks: callbacks
        }
      },
      scales: {
        x: { ticks: { color: '#8A8A8E', maxTicksLimit: 6, font: { family: 'Geist Mono', size: 10 } }, grid: { color: '#1D1D1D' } },
        y: { ticks: { color: '#8A8A8E', font: { family: 'Geist Mono', size: 10 } }, grid: { color: '#1D1D1D' } }
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
  // opts: { canvas, valueEl, changeEl, noteEl?, closedEl?, pairLabelEl?,
  //         pairTabs?, rangeTabs, pair, range, invert? }
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
    // Marca de tiempo del último punto (para el aviso de cierre) y de QUÉ serie
    // salió. Lo segundo importa: al cambiar de par o de rango, la marca vieja
    // sigue guardada hasta que conteste la petición nueva, y un USD/MXN de las
    // 23:00 —el FX opera casi 24 h— haría que el VIX se anunciara como abierto
    // durante ese medio segundo. Se compara la clave y, si no cuadra, no se
    // dibuja aviso ninguno. No vale con borrar la marca en cada load(): el
    // rango 1D se repide cada minuto y el aviso parpadearía en cada refresco.
    this.ultimoTs = null;
    this.ultimoClave = '';
    this.reqId = 0;   // ver Panel.prototype.load: descarta respuestas atrasadas
    // Estado del trazado de entrada. trazado=true significa "ya pasó (o no va
    // a pasar)", y a partir de ahí la gráfica se repinta sin recorte ninguno.
    this.trazado = false;
    this.animando = false;
    this.enPantalla = false;
    ensureRegistered();
    this.observarEntrada();
    this.wire();
    // Cada panel se suscribe solo al cambio de idioma: así su pie se traduce
    // sin que la página tenga que acordarse de llamarlo. Antes esto lo hacía
    // /market a mano y el home no, así que el pie de la gráfica del home se
    // quedaba en inglés al cambiar a español.
    var self = this;
    document.addEventListener('smartfinance:lang', function () { self.repaintMeta(); });
    this.setRange(this.range);
  }

  /*
   * El trazado de entrada, en tres piezas que pueden llegar en cualquier orden:
   * que el lienzo entre en pantalla y que la gráfica exista. Cada una llama a
   * arrancarTrazo(), que solo hace algo cuando ya están las dos.
   *
   * Si no se puede animar (sin IntersectionObserver o con
   * prefers-reduced-motion), esto marca trazado=true de entrada y NADIE llega
   * a poner $trazo: la gráfica se pinta completa desde el primer frame, como
   * antes de todo esto.
   */
  Panel.prototype.observarEntrada = function () {
    var self = this;
    var M = window.SmartMotion;
    if (!this.o.canvas || !M || !M.puedeAnimar()) { this.trazado = true; return; }
    // Escondida desde ya, antes de que exista la gráfica.
    this.o.canvas.$trazo = 0;
    M.alPrimerVistazo(this.o.canvas, function (animar) {
      self.enPantalla = true;
      if (!animar) { self.terminarTrazo(); return; }
      self.arrancarTrazo();
    }, { threshold: 0.25 });
  };

  /*
   * El valor grande y el porcentaje del encabezado entran deslizándose desde
   * abajo, con el segundo un escalón por detrás del primero.
   *
   * El contenedor que se observa es el propio valor y no el panel entero: el
   * panel mide 300px de alto y en un teléfono entra en pantalla mucho antes
   * que su encabezado, así que la animación habría pasado con los números
   * todavía fuera de la vista.
   */
  Panel.prototype.animarCifras = function () {
    if (!window.SmartMotion || !this.o.valueEl) return;
    var lista = this.o.changeEl ? [this.o.valueEl, this.o.changeEl] : [this.o.valueEl];
    window.SmartMotion.numeros(this.o.valueEl, lista);
  };

  Panel.prototype.terminarTrazo = function () {
    this.trazado = true;
    this.animando = false;
    if (this.o.canvas) delete this.o.canvas.$trazo;
    if (this.chart) this.chart.draw();
  };

  Panel.prototype.arrancarTrazo = function () {
    var self = this;
    if (this.trazado || this.animando || !this.chart || !this.enPantalla) return;
    this.animando = true;
    var dur = (window.SmartMotion && window.SmartMotion.DUR_TRAZO) || 1000;
    var t0 = 0;
    function paso(ts) {
      if (!self.chart) { self.animando = false; return; }
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      /* Cúbica de ENTRADA Y SALIDA — el equivalente en JavaScript de
       * cubic-bezier(.65,0,.35,1), que es la curva de trazado que define
       * assets/motion.js. Era una cúbica de salida a secas; se cambió porque
       * con 1.7 s por delante una curva de salida deja la punta cruzando media
       * gráfica en el primer tercio y arrastrándose el resto. Esta arranca
       * suave, avanza parejo por el medio y se posa: es lo que parece un trazo
       * y no un barrido. */
      self.o.canvas.$trazo = p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;
      self.chart.draw();
      if (p < 1) requestAnimationFrame(paso);
      else self.terminarTrazo();
    }
    requestAnimationFrame(paso);
  };

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

    // El aviso se revisa ya, antes de pedir nada: si esta llamada viene de un
    // cambio de par o de rango, la clave guardada deja de cuadrar y el aviso de
    // la serie anterior se va en el acto en vez de quedarse el medio segundo
    // que tarda la respuesta. En un refresco normal la clave sigue siendo la
    // misma y esto no cambia nada de lo que hay en pantalla.
    this.repaintClosed();

    return fetch('/api/history?pair=' + encodeURIComponent(pedido.pair) + '&range=' + encodeURIComponent(pedido.range))
      .then(function (res) { if (!res.ok) throw new Error('history ' + res.status); return res.json(); })
      .then(function (data) {
        if (ficha !== self.reqId) return;
        var points = Array.isArray(data.points) ? data.points : [];
        if (!points.length) throw new Error('empty series');
        self.points = points;
        self.failed = false;
        self.ultimoTs = points[points.length - 1][0];
        self.ultimoClave = pedido.pair + ':' + pedido.range;

        var first = points[0][1], last = points[points.length - 1][1];
        var changePct = ((last - first) / first) * 100;
        var dir = changePct > 0 ? 'up' : changePct < 0 ? 'down' : '';
        // Normal: bajar es lo rojo. Invertido (VIX): subir es lo rojo, porque
        // ahí subir significa más miedo. Plano se queda en verde en los dos.
        // Mismos --up/--down de assets/tokens.css. Van a mano porque Chart.js
        // pinta sobre un canvas y ahí no llega una var() de CSS.
        var rgb = (self.o.invert ? changePct > 0 : changePct < 0) ? '255,77,77' : '22,196,127';

        if (self.o.valueEl) self.o.valueEl.textContent = fmtPrice(last, cfg.decimals);
        if (self.o.changeEl) {
          self.o.changeEl.textContent = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '% (' + self.range + ')';
          self.o.changeEl.className = self.o.changeClass + ' ' + dir;
        }
        self.repaintMeta();
        self.animarCifras();

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
          // update('none'): repinta con los datos nuevos SIN animar. Es lo que
          // pide el encargo — al refrescarse los datos o al cambiar de par o
          // de rango, la línea se actualiza, no se vuelve a dibujar desde el
          // principio. El recorte de entrada tampoco se reinicia: $trazo no se
          // toca aquí.
          self.chart.update('none');
        } else {
          // El recorte de entrada ya está puesto en el <canvas> desde
          // observarEntrada, así que esta primera pintada nace escondida.
          self.chart = new Chart(canvas, { type: 'line', data: chartData, options: options, plugins: [crosshairPlugin] });
        }
        self.arrancarTrazo();
      })
      .catch(function (e) {
        // Igual que arriba: un fallo de una petición ya superada no debe
        // borrar la gráfica que sí llegó bien después.
        if (ficha !== self.reqId) return;
        console.warn('chart fetch failed (' + pedido.pair + '):', e);
        self.points = [];
        self.failed = true;
        self.ultimoTs = null;
        self.ultimoClave = '';
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
    if (this.o.noteEl && window.SmartSource) {
      var key = this.failed ? 'unavailable' : (RANGE_DETAIL[this.range] || 'session');
      window.SmartSource.paint(this.o.noteEl, 'Yahoo Finance', key);
    }
    this.repaintClosed();
  };

  /*
   * "Mercado cerrado · último cierre: viernes 7 de agosto".
   *
   * Se recalcula en cada carga y en cada cambio de idioma. También hace falta
   * que se pueda APAGAR: al volver el mercado el refresco de cada minuto trae
   * un punto fresco y el aviso tiene que desaparecer solo, sin recargar la
   * página. Por eso esto siempre decide entre poner texto y esconder, nunca
   * "poner y olvidarse".
   */
  Panel.prototype.repaintClosed = function () {
    var el = this.o.closedEl;
    if (!el) return;
    var MH = window.SmartMarketHours;
    var alDia = this.ultimoClave === this.pair + ':' + this.range;
    var est = (MH && alDia && !this.failed && this.range === RANGO_CON_AVISO)
      ? MH.estado(this.ultimoTs)
      : null;
    if (!est || !est.cerrado) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.textContent = MH.frase(est, { es: esNow() });
    el.hidden = false;
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
