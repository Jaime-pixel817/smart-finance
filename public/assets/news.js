// "In the headlines" — carrusel de titulares, compartido por el home y /market.
//
// UNA sola fuente de datos: las dos páginas montan este módulo, que pide
// /api/news una vez y repinta cada montaje. Antes esta lógica vivía dentro del
// <script> del home; se sacó aquí para que /market no la copiara.
//
// Se carga como script clásico y se expone en window.SmartNews, porque el
// bloque grande del home no es un módulo y necesita llamar a render() cuando
// cambia el idioma.

(function () {
  'use strict';

  var API = '/api/news';
  var MAX = 4;

  var data = null;          // array de items | 'error' | null (cargando)
  var mounts = [];          // [{ el, rail }]
  var pending = null;

  // ---- Categoría visual del titular -------------------------------------
  // Etiqueta de color + icono para que la tarjeta no sea puro texto. Se deduce
  // del titular que ya llega del feed: NO cambia de dónde vienen los datos ni
  // qué se muestra, solo cómo se presenta. Si nada coincide, cae en "economy".
  var CATEGORIES = [
    { key: 'rates', en: 'Rates', es: 'Tasas',
      words: ['fed', 'fomc', 'banxico', 'central bank', 'interest rate', 'rate cut', 'rate hike', 'ecb', 'bond', 'yield', 'treasury', 'powell'],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><line x1="3" y1="21" x2="21" y2="21"/><path d="M4 21V10l8-6 8 6v11"/><line x1="9" y1="21" x2="9" y2="14"/><line x1="15" y1="21" x2="15" y2="14"/></svg>' },
    { key: 'crypto', en: 'Crypto', es: 'Cripto',
      words: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'stablecoin', 'token'],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 8h4.5a2.5 2.5 0 010 5H9zm0 5h5a2.5 2.5 0 010 5H9zm0-5V6m0 12v-2m3-10V6m0 12v-2"/></svg>' },
    { key: 'companies', en: 'Companies', es: 'Empresas',
      words: ['earnings', 'shares', 'stock', 'ceo', 'merger', 'acquisition', 'ipo', 'profit', 'revenue', 'layoff', 'apple', 'tesla', 'nvidia', 'amazon', 'microsoft', 'google'],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>' },
    { key: 'markets', en: 'Markets', es: 'Mercados',
      words: ['market', 'rally', 'selloff', 'index', 'investors', 's&p', 'nasdaq', 'dow', 'oil', 'gold', 'copper', 'dollar', 'peso', 'currency', 'trading', 'commodit'],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' },
    { key: 'policy', en: 'Policy', es: 'Política',
      words: ['tariff', 'trade', 'sanction', 'president', 'prime minister', 'government', 'election', 'parliament', 'congress', 'trump', 'sheinbaum', 'regulat', 'lawmaker', 'summit', 'treaty'],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 4.5v3H3v-3z"/><line x1="6" y1="10" x2="6" y2="17"/><line x1="12" y1="10" x2="12" y2="17"/><line x1="18" y1="10" x2="18" y2="17"/><line x1="3" y1="21" x2="21" y2="21"/></svg>' },
    { key: 'economy', en: 'Economy', es: 'Economía', words: [],
      icon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>' }
  ];

  function categoryFor(title) {
    var t = (title || '').toLowerCase();
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      for (var j = 0; j < c.words.length; j++) if (t.indexOf(c.words[j]) !== -1) return c;
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function esNow() { return document.documentElement.lang === 'es'; }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str == null ? '' : str;
    return d.innerHTML;
  }

  // Solo http(s): así una URL con javascript: en el feed no se vuelve un link vivo.
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? escapeHtml(u) : ''; }

  // "hace 2 h" / "2h ago" a partir del pubDate del feed.
  function relativeTime(dateStr) {
    var t = Date.parse(dateStr || '');
    if (isNaN(t)) return '';
    var mins = Math.round((Date.now() - t) / 60000);
    var es = esNow();
    if (mins < 1) return es ? 'ahora' : 'just now';
    if (mins < 60) return es ? 'hace ' + mins + ' min' : mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return es ? 'hace ' + hrs + ' h' : hrs + 'h ago';
    var days = Math.round(hrs / 24);
    return es ? 'hace ' + days + ' d' : days + 'd ago';
  }

  function cardHTML(item) {
    var es = esNow();
    // Se prefiere la foto del feed cuando existe. Este feed de Bloomberg no
    // manda ninguna (comprobado), así que en la práctica siempre cae al arte
    // por tema; el camino de la foto se queda listo por si el feed cambia.
    var img = safeUrl(item.thumbnail || (item.enclosure && item.enclosure.link));
    var link = safeUrl(item.link);
    var when = relativeTime(item.pubDate);
    var cat = categoryFor(item.title);
    var take = item.take || {};
    var pendingTake = !!take.pending || !(es ? take.es : take.en);
    var takeText = pendingTake
      ? (es ? 'El contexto de esta nota va en camino.' : 'Context on this one is coming shortly.')
      : escapeHtml(es ? take.es : take.en);

    // El alt describe QUÉ es la imagen, sin repetir el titular: el <h3> va
    // justo debajo y un lector de pantalla lo leería dos veces seguidas.
    // El arte por tema sí va aria-hidden: es decoración, y la categoría ya
    // aparece escrita en la etiqueta de al lado.
    // onerror quita solo la foto: si no carga queda el fondo del tema en lugar
    // de un hueco roto.
    var altTxt = es ? 'Imagen de la nota de Bloomberg' : 'Photo from the Bloomberg story';
    var thumbInner = img
      ? '<img src="' + img + '" alt="' + altTxt + '" loading="lazy" decoding="async" onerror="this.remove();this.parentNode.classList.add(\'is-art\')">'
      : '<span class="news-thumb-art" aria-hidden="true">' + cat.icon + '</span>';

    return '<article class="news-card">' +
      '<div class="news-source-bar">' +
        '<span class="news-outlet">Bloomberg</span>' +
        (when ? '<span class="news-when">' + escapeHtml(when) + '</span>' : '') +
      '</div>' +
      '<div class="news-thumb ' + (img ? '' : 'is-art ') + cat.key + '">' +
        thumbInner +
        '<span class="news-cat ' + cat.key + '">' + cat.icon + escapeHtml(es ? cat.es : cat.en) + '</span>' +
      '</div>' +
      '<div class="news-body">' +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
      '</div>' +
      '<div class="news-take' + (pendingTake ? ' is-placeholder' : '') + '">' +
        '<span class="news-take-label">' + (es ? 'Mi lectura' : 'My take') + '</span>' + takeText +
      '</div>' +
      (link
        ? '<a class="news-link" href="' + link + '" target="_blank" rel="noopener">' + (es ? 'Leer más' : 'Read more') +
          '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>'
        : '') +
    '</article>';
  }

  /*
   * Pinta la pista.
   *
   * TRES ESTADOS, NO DOS. Antes había uno solo para "todavía no hay datos" y
   * para "falló la petición", y como mount() llama a render() de inmediato, lo
   * PRIMERO que se veía al abrir la página era "titulares no disponibles" —un
   * error, antes de haber intentado nada— hasta que llegaba la respuesta.
   *
   * Ahora, mientras data es null, no se toca la pista: se queda el esqueleto
   * que el HTML ya trae escrito (ver index.html). Ese esqueleto es el estado
   * de carga, y no hay que duplicarlo aquí.
   */
  function render() {
    mounts.forEach(function (m) {
      var rail = m.rail;
      if (!rail) return;
      if (!data) { updateArrows(m); return; }          // cargando: no se toca
      rail.removeAttribute('aria-busy');
      if (data === 'error') {
        rail.innerHTML = '<div class="news-empty">' + (esNow()
          ? 'Titulares no disponibles por el momento. Se reintenta solo.'
          : 'Live headlines are temporarily unavailable. It will retry automatically.') + '</div>';
        updateArrows(m);
        return;
      }
      rail.innerHTML = data.map(function (it) {
        return '<div class="news-slide">' + cardHTML(it) + '</div>';
      }).join('');
      updateArrows(m);
    });
  }

  // ---- Flechas y arrastre (escritorio) ----------------------------------
  // En táctil no se engancha nada: el overflow-x nativo ya da el swipe con la
  // inercia del sistema, que se siente mejor que cualquier JS.
  function updateArrows(m) {
    if (!m.prev || !m.next) return;
    var r = m.rail;
    var max = r.scrollWidth - r.clientWidth;
    m.prev.disabled = r.scrollLeft <= 2;
    m.next.disabled = r.scrollLeft >= max - 2;
    var hide = max <= 2;
    if (m.arrows) m.arrows.style.visibility = hide ? 'hidden' : '';
  }

  function step(m, dir) {
    var first = m.rail.querySelector('.news-slide');
    var w = first ? first.getBoundingClientRect().width : m.rail.clientWidth * 0.8;
    var gap = parseFloat(getComputedStyle(m.rail).columnGap || '24') || 24;
    m.rail.scrollBy({ left: dir * (w + gap), behavior: 'smooth' });
  }

  function wireDrag(m) {
    var down = false, startX = 0, startScroll = 0, moved = 0;
    m.rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;      // el táctil ya scrollea solo
      down = true; moved = 0;
      startX = e.clientX; startScroll = m.rail.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = Math.abs(dx);
        m.rail.classList.add('is-dragging');
        m.rail.scrollLeft = startScroll - dx;
      }
    });
    window.addEventListener('pointerup', function (e) {
      if (!down) return;
      down = false;
      m.rail.classList.remove('is-dragging');
      // Un arrastre no debe abrir el enlace que quedó debajo del cursor.
      if (moved > 6) {
        var kill = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        m.rail.addEventListener('click', kill, { capture: true, once: true });
        setTimeout(function () { m.rail.removeEventListener('click', kill, true); }, 0);
      }
    });
  }

  function mount(root) {
    var rail = root.querySelector('[data-news-rail]');
    if (!rail) return;
    var m = {
      el: root, rail: rail,
      arrows: root.querySelector('[data-news-arrows]'),
      prev: root.querySelector('[data-news-prev]'),
      next: root.querySelector('[data-news-next]')
    };
    mounts.push(m);
    if (m.prev) m.prev.addEventListener('click', function () { step(m, -1); });
    if (m.next) m.next.addEventListener('click', function () { step(m, 1); });
    rail.addEventListener('scroll', function () { updateArrows(m); }, { passive: true });
    window.addEventListener('resize', function () { updateArrows(m); });
    wireDrag(m);
    render();
  }

  function fetchNews() {
    if (pending) return pending;
    pending = fetch(API)
      .then(function (res) {
        if (!res.ok) throw new Error('news ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json.items || !json.items.length) throw new Error('bad feed response');
        data = json.items.slice(0, MAX);
      })
      .catch(function (e) {
        console.warn('News fetch failed:', e);
        if (!Array.isArray(data)) data = 'error';
      })
      .then(function () { pending = null; render(); });
    return pending;
  }

  // Se suscribe solo al cambio de idioma: así cualquier página que monte este
  // módulo repinta las tarjetas sin tener que acordarse de llamarlo.
  document.addEventListener('smartfinance:lang', render);

  window.SmartNews = {
    mount: mount,
    render: render,
    refresh: fetchNews,
    init: function (selector) {
      var roots = document.querySelectorAll(selector || '[data-news]');
      Array.prototype.forEach.call(roots, mount);
      if (roots.length) fetchNews();
    }
  };
})();
