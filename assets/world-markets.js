/* Globo de mercados — la parte en HTML: leyenda de chips y tarjeta al toque.
 *
 * QUÉ HACE. Pide /api/world UNA vez (y cada 15 min, que es lo que cachea),
 * calcula si cada bolsa está abierta con assets/exchange-hours.js, y:
 *   - pinta la fila de ocho chips bajo el titular (#worldChips): ciudad,
 *     ▲▼Δ% y punto abierto/cerrado. Es la leyenda del globo y también el
 *     acceso sin WebGL y para lectores de pantalla (lista semántica);
 *   - avisa al globo con el evento "world:data" (assets/risk-sphere.js pinta
 *     los marcadores con el color del día y el halo abierto/cerrado);
 *   - abre la tarjeta inferior (#worldSheet) al tocar un chip o un marcador del
 *     globo (evento "globe:marker" que manda risk-sphere.js).
 *
 * Los ocho chips se pintan de entrada con "—" para que la fila mida lo mismo
 * antes y después de que lleguen los datos: cero CLS. Sin datos (red caída) la
 * fila se queda así y la tarjeta dice que la fuente no está disponible.
 *
 * Cadencia, en el chip de fuente: "Yahoo Finance · se actualiza cada 15
 * minutos · HH:MM" vía SmartSource (nunca "en vivo").
 */
(function () {
  'use strict';
  var chips = document.getElementById('worldChips');
  var sheet = document.getElementById('worldSheet');
  if (!chips || !sheet) return;

  var es = document.documentElement.lang === 'es';
  var lang = es ? 'es' : 'en';
  var T = es ? {
    open: 'Abierta hasta ', closed: 'Cerrada · abre ', regular: 'horario regular',
    openSr: 'abierta', closedSr: 'cerrada', na: 'sin dato', unavailable: 'Fuente no disponible por ahora',
    lessons: '/es/lecciones', sp500: '/es/lecciones/sp500'
  } : {
    open: 'Open until ', closed: 'Closed · opens ', regular: 'regular hours',
    openSr: 'open', closedSr: 'closed', na: 'no data', unavailable: 'Source unavailable right now',
    lessons: '/lessons', sp500: '/lessons/sp500'
  };
  // Mismo orden e ids que api/world.js y que EXCHANGES_DEFAULT en risk-sphere.js.
  var BASE = [
    { id: 'nyc', city: es ? 'Nueva York' : 'New York', index: 'S&P 500', tz: 'America/New_York' },
    { id: 'yto', city: 'Toronto', index: 'S&P/TSX', tz: 'America/Toronto' },
    { id: 'mex', city: es ? 'Ciudad de México' : 'Mexico City', index: 'IPC', tz: 'America/Mexico_City' },
    { id: 'sao', city: 'São Paulo', index: 'Bovespa', tz: 'America/Sao_Paulo' },
    { id: 'lon', city: es ? 'Londres' : 'London', index: 'FTSE 100', tz: 'Europe/London' },
    { id: 'fra', city: es ? 'Fráncfort' : 'Frankfurt', index: 'DAX', tz: 'Europe/Berlin' },
    { id: 'tyo', city: es ? 'Tokio' : 'Tokyo', index: 'Nikkei 225', tz: 'Asia/Tokyo' },
    { id: 'hkg', city: 'Hong Kong', index: 'Hang Seng', tz: 'Asia/Hong_Kong' }
  ];
  var items = BASE.map(function (b) { return Object.assign({ price: null, changePct: null, asOf: null, open: false }, b); });
  var byId = {};
  items.forEach(function (it) { byId[it.id] = it; });
  var data = null, abierto = null, abiertoDesde = 0;
  window.SmartWorld = { get data() { return data; }, items: items };

  function horas() { return window.SmartExchangeHours; }
  function fmtPct(p) {
    if (typeof p !== 'number') return '—';
    var flecha = p > 0.0001 ? '▲' : p < -0.0001 ? '▼' : '■';
    return flecha + ' ' + Math.abs(p).toFixed(2) + '%';
  }
  function clasePct(p) { return typeof p !== 'number' ? '' : p > 0.0001 ? 'up' : p < -0.0001 ? 'down' : ''; }
  function fmtPrecio(p) {
    if (typeof p !== 'number') return '—';
    try { return p.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch (e) { return p.toFixed(2); }
  }
  function fmtHora(iso) {
    var d = new Date(iso), ahora = new Date();
    var o = { hour: 'numeric', minute: '2-digit' };
    if (d.toDateString() !== ahora.toDateString()) o.weekday = 'short';
    try { return d.toLocaleTimeString(lang, o); } catch (e) { return d.toLocaleTimeString(); }
  }

  // ── Leyenda ─────────────────────────────────────────────────────────────
  var chipEls = {};
  items.forEach(function (it) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'wm-chip'; b.dataset.id = it.id;
    b.innerHTML = '<span class="wm-dot" aria-hidden="true"></span>' +
      '<span class="wm-city"></span><span class="wm-chg num">—</span><span class="sr-only wm-sr"></span>';
    b.querySelector('.wm-city').textContent = it.city;
    b.addEventListener('click', function () { abrir(it.id); });
    li.appendChild(b); chips.appendChild(li);
    chipEls[it.id] = b;
  });

  function pintarChips() {
    items.forEach(function (it) {
      var b = chipEls[it.id];
      var chg = b.querySelector('.wm-chg');
      chg.textContent = fmtPct(it.changePct);
      chg.className = 'wm-chg num ' + clasePct(it.changePct);
      b.classList.toggle('is-open', !!it.open);
      b.querySelector('.wm-sr').textContent = ' · ' + it.index + ' · ' + (it.open ? T.openSr : T.closedSr);
    });
  }

  // ── Estado abierto/cerrado (cada minuto) y aviso al globo ───────────────
  function refrescarEstado() {
    var h = horas();
    items.forEach(function (it) {
      var st = h ? h.estado(it.tz) : null;
      it.open = !!(st && st.abierta);
      it.estado = st;
    });
    pintarChips();
    document.dispatchEvent(new CustomEvent('world:data', { detail: { items: items } }));
    if (abierto) pintarTarjeta(abierto);
  }

  // ── Datos ───────────────────────────────────────────────────────────────
  function cargar() {
    fetch('/api/world').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (json) {
        data = json;
        (json.items || []).forEach(function (src) {
          var it = byId[src.id];
          if (!it) return;
          it.price = src.price; it.changePct = src.changePct; it.asOf = src.asOf;
          it.lat = src.lat; it.lon = src.lon; it.source = src.source;
        });
        refrescarEstado();
      })
      .catch(function () { refrescarEstado(); });
  }

  // ── Tarjeta ─────────────────────────────────────────────────────────────
  var q = function (sel) { return sheet.querySelector(sel); };
  function pintarTarjeta(id) {
    var it = byId[id]; if (!it) return;
    q('[data-city]').textContent = it.city;
    q('[data-index]').textContent = it.index;
    q('[data-price]').textContent = fmtPrecio(it.price);
    var chg = q('[data-chg]');
    chg.textContent = fmtPct(it.changePct);
    chg.className = 'world-sheet-chg num ' + clasePct(it.changePct);
    var h = horas(), st = it.estado, txt = '—';
    if (st && h) {
      txt = st.abierta ? T.open + h.horaLocal(st.hasta, lang) : T.closed + h.horaLocal(st.abre, lang);
      txt += ' · ' + T.regular;
    }
    var hEl = q('[data-hours]');
    hEl.textContent = txt;
    hEl.classList.toggle('is-open', !!(st && st.abierta));
    var src = q('[data-src]');
    if (it.price !== null && window.SmartSource) {
      var linea = window.SmartSource.line(it.source || 'Yahoo Finance', 'quarter');
      src.textContent = linea + (it.asOf ? ' · ' + fmtHora(it.asOf) : '');
    } else if (it.price !== null) {
      src.textContent = it.source || 'Yahoo Finance';
    } else {
      src.textContent = T.unavailable;
    }
    q('[data-link]').setAttribute('href', id === 'nyc' ? T.sp500 : T.lessons);
  }

  function abrir(id) {
    pintarTarjeta(id);
    abierto = id; abiertoDesde = Date.now();
    sheet.hidden = false;
    // Un frame después, para que la transición de entrada se vea.
    requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    document.dispatchEvent(new CustomEvent('world:select', { detail: { id: id } }));
  }
  function cerrar() {
    if (!abierto) return;
    abierto = null;
    sheet.classList.remove('is-open');
    setTimeout(function () { if (!abierto) sheet.hidden = true; }, 220);
    document.dispatchEvent(new CustomEvent('world:select', { detail: { id: null } }));
  }

  q('.world-sheet-close').addEventListener('click', cerrar);
  document.addEventListener('globe:marker', function (e) { if (e.detail && e.detail.id) abrir(e.detail.id); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  // Toque fuera: cualquier pointerdown que no caiga en la tarjeta ni en un chip,
  // pasados 400 ms de abrirla (el mismo toque que la abre no la cierra).
  document.addEventListener('pointerdown', function (e) {
    if (!abierto || Date.now() - abiertoDesde < 400) return;
    if (sheet.contains(e.target) || (e.target.closest && e.target.closest('.wm-chip'))) return;
    cerrar();
  });
  // Deslizar hacia abajo sobre la tarjeta la cierra.
  var sy0 = null;
  sheet.addEventListener('touchstart', function (e) { sy0 = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchmove', function (e) {
    if (sy0 === null) return;
    if (e.touches[0].clientY - sy0 > 60) { sy0 = null; cerrar(); }
  }, { passive: true });

  refrescarEstado();
  cargar();
  setInterval(refrescarEstado, 60000);
  setInterval(cargar, 15 * 60000);
})();
