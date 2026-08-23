// Script de /market/compare (y /es/mercado/comparar).
//
// Dos o tres activos en la misma gráfica, todos rebasados a 100 al principio
// del rango. El cálculo NO está aquí: está en src/lib/market/comparar.mjs, que
// se prueba solo. Aquí solo se pide el historial, se dibuja y se escribe la
// leyenda.
//
// LA URL ES EL ESTADO. ?a=SPY&b=USDMXN es lo que se comparte y lo que se pega
// en un chat, así que se acepta tanto el id de la ficha (spy) como el símbolo
// visible (SPY, USD/MXN) sin importar mayúsculas ni la barra. Cada cambio de
// selector reescribe la URL con replaceState: se puede copiar en cualquier
// momento y el botón "Copiar enlace" no tiene que inventar nada.
//
// SIN DOBLE EJE Y SIN VERDE/ROJO: los colores son los acentos de datos del
// sitio (--s1 azul, --s2 ámbar, --s3 teal). El verde y el rojo aquí serían
// mentira: no significan "sube" y "baja", significarían "es la primera línea".
import { fmtNum, fmtDay, fmtTime, type Loc } from './format';
import { loadHistory, RANGES, type Range, type Point, type SymbolRT } from './market-data';
import { comparar } from '../lib/market/comparar.mjs';

type LWC = typeof import('./lwc');
type IChartApi = import('lightweight-charts').IChartApi;
type ISeriesApi = import('lightweight-charts').ISeriesApi<'Line'>;
type UTCTimestamp = import('lightweight-charts').UTCTimestamp;
type MouseEventParams = import('lightweight-charts').MouseEventParams;

type Sym = SymbolRT & { name: string; href: string };
type Serie = { clave: string; puntos: Point[]; cambioPct: number | null };
type Resultado = { desde: number; hasta: number; series: Serie[]; fuera: { clave: string; razon: string }[] } | null;

const TAG: Record<Loc, string> = { en: 'en-US', es: 'es-MX' };
const RANURAS = ['a', 'b', 'c'] as const;
/** Los tres primeros acentos de datos, en el orden fijo de los tokens. */
const ACENTOS = ['--s1', '--s2', '--s3'];
// Lightweight Charts pinta en UTC: se desplaza cada timestamp al huso del
// visitante para que el eje diga su hora local (igual que chart-panel.ts).
const shift = (ts: number) => ts - new Date(ts * 1000).getTimezoneOffset() * 60;

const root = document.getElementById('compare');
if (root) boot(root);

function boot(root: HTMLElement) {
  const loc = (root.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const T = JSON.parse(root.dataset.strings || '{}') as Record<string, string>;
  const symbols = JSON.parse(root.dataset.symbols || '[]') as Sym[];
  const base = root.dataset.base || '/market/compare';
  const $ = <E extends Element = HTMLElement>(sel: string) => root.querySelector<E>(sel);
  const $$ = <E extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<E>(sel));

  const selects = $$<HTMLSelectElement>('[data-slot]');
  const tabs = $$<HTMLButtonElement>('[role="tab"][data-range]');
  const legend = $('#cmp-legend')!;
  const estado = $('#cmp-state')!;
  const host = $('#cmp-canvas')!;
  const chip = $('#cmp-chip');

  let range: Range = '1Y';
  let elegidos: (string | null)[] = [null, null, null];
  let ultimo: Resultado = null;
  let reqId = 0;

  // ---- de un parámetro de URL a un id del registro -------------------------
  // Se acepta "spy", "SPY", "USDMXN" y "USD/MXN": lo que alguien escribiría.
  const normal = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const porClave = new Map<string, string>();
  for (const s of symbols) {
    porClave.set(normal(s.id), s.id);
    porClave.set(normal(s.sym), s.id);
  }
  const resolver = (v: string | null) => (v ? porClave.get(normal(v)) ?? null : null);
  const symOf = (id: string | null) => symbols.find((s) => s.id === id) || null;

  function leerURL(): (string | null)[] {
    const q = new URLSearchParams(location.search);
    const ids = RANURAS.map((r) => resolver(q.get(r)));
    // Sin parámetros, un par que se entiende de un vistazo por acá: el S&P 500
    // y el dólar. Es la comparación que la gente hace en la cabeza igual.
    if (ids.every((x) => !x)) return [resolver('spy'), resolver('usdmxn'), null];
    // Un mismo activo dos veces son dos líneas encimadas: se queda una.
    const vistos = new Set<string>();
    return ids.map((id) => (id && !vistos.has(id) ? (vistos.add(id), id) : null));
  }

  function escribirURL() {
    const q = RANURAS.map((r, i) => (elegidos[i] ? r + '=' + encodeURIComponent(elegidos[i]!) : null)).filter(Boolean).join('&');
    history.replaceState(null, '', q ? base + '?' + q : base);
  }

  // ---- Lightweight Charts, bajo demanda -----------------------------------
  let lwc: LWC | null = null;
  let chart: IChartApi | null = null;
  let cargando: Promise<void> | null = null;
  const dibujadas: ISeriesApi[] = [];
  let deShift = new Map<number, number>();

  function tema() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string, fb: string) => (cs.getPropertyValue(n) || fb).trim();
    return {
      colores: ACENTOS.map((n, i) => v(n, ['#3D8BEF', '#C98500', '#1FA7B0'][i])),
      ink3: v('--ink-3', '#7E7E88'), line: v('--line', 'rgba(128,128,128,.2)'), mono: v('--font-mono', 'ui-monospace, monospace')
    };
  }

  function ensureLib(): Promise<void> {
    if (lwc) return Promise.resolve();
    if (!cargando) cargando = import('./lwc').then((m) => { lwc = m; construir(); }).catch(() => { cargando = null; });
    return cargando;
  }

  function construir() {
    if (!lwc || chart) return;
    const th = tema();
    host.innerHTML = '';
    chart = lwc.createChart(host, {
      autoSize: true,
      layout: { background: { type: lwc.ColorType.Solid, color: 'transparent' }, textColor: th.ink3, fontFamily: th.mono, fontSize: 11, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: th.line, style: lwc.LineStyle.Solid } },
      rightPriceScale: { borderVisible: false, ticksVisible: false, entireTextOnly: true, scaleMargins: { top: 0.12, bottom: 0.1 } },
      leftPriceScale: { visible: false },
      timeScale: { borderVisible: false, timeVisible: range === '1D', secondsVisible: false, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true, rightOffset: 0, allowBoldLabels: false, tickMarkFormatter: tickMark },
      crosshair: {
        mode: lwc.CrosshairMode.Magnet,
        vertLine: { color: th.ink3, width: 1 as const, style: lwc.LineStyle.Dotted, labelVisible: false },
        horzLine: { visible: false, labelVisible: false }
      },
      handleScroll: false, handleScale: false, kineticScroll: { mouse: false, touch: false },
      trackingMode: { exitMode: lwc.TrackingModeExitMode.OnTouchEnd },
      // Todo está rebasado a 100: un decimal es exactamente lo que se necesita
      // para ver la diferencia y no una cifra que aparenta precisión.
      localization: { locale: TAG[loc], priceFormatter: (p: number) => fmtNum(p, loc, 1) }
    } as Parameters<LWC['createChart']>[1]);
    chart.subscribeCrosshairMove(alPasar);
    host.classList.remove('skel');
    if (ultimo) dibujar(ultimo);
  }

  function tickMark(time: unknown, tipo: number): string {
    const d = new Date((typeof time === 'number' ? time : 0) * 1000);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(TAG[loc], { ...o, timeZone: 'UTC' }).format(d);
    if (tipo === 0) return f({ year: 'numeric' });
    if (tipo === 1) { const s = f({ month: 'short' }).replace('.', ''); return s.charAt(0).toUpperCase() + s.slice(1); }
    if (tipo === 2) return f({ day: 'numeric', month: 'short' }).replace('.', '');
    return f({ hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]\.?\s?m\.?/i, (m) => m.trim().replace(/\s|\./g, '').toLowerCase());
  }

  function limpiarSeries() {
    if (!chart) return;
    for (const s of dibujadas) chart.removeSeries(s);
    dibujadas.length = 0;
  }

  function dibujar(r: Resultado) {
    if (!chart || !lwc || !r) return;
    limpiarSeries();
    const th = tema();
    deShift = new Map();
    r.series.forEach((serie, i) => {
      const s = symOf(serie.clave);
      const filas: { time: UTCTimestamp; value: number }[] = [];
      let ultimoT = -Infinity;
      for (const p of serie.puntos) {
        const t = shift(p[0]);
        if (t <= ultimoT) continue;
        ultimoT = t;
        filas.push({ time: t as UTCTimestamp, value: p[1] });
        deShift.set(t, p[0]);
      }
      const linea = chart!.addSeries(lwc!.LineSeries, {
        color: th.colores[i % th.colores.length], lineWidth: 2 as const, lineType: lwc!.LineType.Simple,
        // El nombre pegado al final de la línea: leyenda directa, sin tener que
        // acordarse de qué color era cada uno.
        title: s ? s.sym : serie.clave, lastValueVisible: true, priceLineVisible: false,
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        priceFormat: { type: 'price' as const, precision: 1, minMove: 0.1 }
      });
      linea.setData(filas);
      dibujadas.push(linea);
      // La línea del 100 va una sola vez: es la base de todos.
      if (i === 0) linea.createPriceLine({ price: 100, color: th.ink3, lineWidth: 1, lineStyle: lwc!.LineStyle.Dotted, axisLabelVisible: false, title: '' });
    });
    chart.applyOptions({ timeScale: { timeVisible: range === '1D' } });
    chart.timeScale().fitContent();
  }

  document.addEventListener('sf:theme', () => { if (chart && lwc) { const th = tema(); chart.applyOptions({ layout: { textColor: th.ink3, fontFamily: th.mono }, grid: { horzLines: { color: th.line } }, crosshair: { vertLine: { color: th.ink3 } } }); if (ultimo) dibujar(ultimo); } });

  // ---- Leyenda -------------------------------------------------------------

  function signo(n: number | null): string {
    if (n == null) return '—';
    const s = fmtNum(Math.abs(n), loc, 2) + ' %';
    return (n > 0.005 ? '+' : n < -0.005 ? '−' : '') + s;
  }

  function pintarLeyenda(r: Resultado, enFecha?: { ts: number; valores: (number | null)[] }) {
    legend.innerHTML = '';
    if (!r) return;
    const th = tema();
    r.series.forEach((serie, i) => {
      const s = symOf(serie.clave);
      const valor = enFecha ? enFecha.valores[i] : null;
      const cambio = valor != null ? valor - 100 : serie.cambioPct;
      const li = document.createElement('li');
      li.innerHTML =
        `<span class="cmp-swatch" style="background:${th.colores[i % th.colores.length]}" aria-hidden="true"></span>` +
        `<a class="cmp-sym" href="${s ? s.href : '#'}">${s ? s.sym : serie.clave}</a>` +
        `<span class="cmp-name t-caption faint">${s ? s.name : ''}</span>` +
        `<span class="cmp-chg">${signo(cambio)}</span>`;
      const chg = li.querySelector('.cmp-chg')!;
      chg.setAttribute('aria-label', (s ? s.sym : serie.clave) + ' ' + signo(cambio) + ' ' + T.since);
      legend.appendChild(li);
    });
    if (r.fuera.length) {
      const razones: Record<string, string> = { 'sin datos': T.dNone, 'sin tramo en común': T.dWindow, 'sin datos en el tramo común': T.dRange };
      const li = document.createElement('li');
      li.className = 't-caption faint';
      li.textContent = T.dropped + ' ' + r.fuera.map((f) => {
        const s = symOf(f.clave);
        return (s ? s.sym : f.clave) + ' (' + (razones[f.razon] || f.razon) + ')';
      }).join(' · ');
      legend.appendChild(li);
    }
  }

  function alPasar(param: MouseEventParams) {
    if (!ultimo) return;
    const t = param.time as number | undefined;
    if (t == null || !param.point) { pintarLeyenda(ultimo); mostrarFecha(null); return; }
    const valores = dibujadas.map((s) => {
      const d = param.seriesData.get(s) as { value?: number } | undefined;
      return d && typeof d.value === 'number' ? d.value : null;
    });
    pintarLeyenda(ultimo, { ts: t, valores });
    mostrarFecha(deShift.get(t) ?? null);
  }

  function mostrarFecha(ts: number | null) {
    if (ts == null) { estado.textContent = pieDeRango(); return; }
    const d = new Date(ts * 1000);
    estado.textContent = range === '1D' ? fmtDay(d, loc) + ' · ' + fmtTime(d, loc) : fmtDay(d, loc);
  }

  function pieDeRango(): string {
    if (!ultimo) return '';
    const a = new Date(ultimo.desde * 1000), b = new Date(ultimo.hasta * 1000);
    const f = (d: Date) => new Intl.DateTimeFormat(TAG[loc], { day: 'numeric', month: 'short', year: 'numeric' }).format(d).replace(/\./g, '');
    return f(a) + ' → ' + f(b);
  }

  // ---- Carga ---------------------------------------------------------------

  async function cargar() {
    const ids = elegidos.filter(Boolean) as string[];
    root.dataset.state = '';
    if (ids.length < 2) {
      ultimo = null;
      limpiarSeries();
      legend.innerHTML = '';
      estado.textContent = T.empty;
      return;
    }
    const id = ++reqId;
    root.dataset.loading = '1';
    ensureLib();
    const peticiones = ids.map(async (x) => {
      const s = symOf(x);
      if (!s || !s.history) return { clave: x, puntos: [] as Point[] };
      try {
        const h = await loadHistory(s.history, range);
        return { clave: x, puntos: h.points || [] };
      } catch {
        return { clave: x, puntos: [] as Point[] };
      }
    });
    const entradas = await Promise.all(peticiones);
    if (id !== reqId) return;
    delete root.dataset.loading;

    ultimo = comparar(entradas) as Resultado;
    if (!ultimo) {
      limpiarSeries();
      legend.innerHTML = '';
      root.dataset.state = 'error';
      estado.textContent = T.nodata;
      if (chip) chip.dataset.fresh = 'error';
      return;
    }
    if (chip) {
      chip.dataset.fresh = 'fresh';
      const nota = chip.querySelector('.sc-note');
      const hora = chip.querySelector('.sc-time');
      if (nota) nota.textContent = range === '1D' ? T.bars5 : range === '5Y' ? T.weekly : T.daily;
      if (hora) hora.textContent = fmtTime(new Date(ultimo.hasta * 1000), loc);
    }
    pintarLeyenda(ultimo);
    estado.textContent = pieDeRango();
    dibujar(ultimo);
  }

  // ---- Selectores, rangos y enlace -----------------------------------------

  function aplicarSelects() {
    selects.forEach((sel, i) => { sel.value = elegidos[i] || ''; });
  }

  selects.forEach((sel, i) => sel.addEventListener('change', () => {
    const valor = sel.value || null;
    // El mismo activo en dos ranuras son dos líneas encimadas: la otra se vacía.
    if (valor) elegidos = elegidos.map((x, j) => (j !== i && x === valor ? null : x));
    elegidos[i] = valor;
    aplicarSelects();
    escribirURL();
    cargar();
  }));

  function ponerRango(r: Range) {
    if (!RANGES.includes(r)) return;
    range = r;
    tabs.forEach((t) => {
      const on = t.dataset.range === r;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    cargar();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => ponerRango(t.dataset.range as Range));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[n].focus();
      ponerRango(tabs[n].dataset.range as Range);
    });
  });

  const compartir = $<HTMLButtonElement>('#cmp-share');
  if (compartir) compartir.addEventListener('click', async () => {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); } catch { /* sin permiso: la URL ya está en la barra */ }
    const antes = compartir.textContent;
    compartir.textContent = T.shared;
    setTimeout(() => { compartir.textContent = antes; }, 2000);
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); ensureLib(); } }, { rootMargin: '240px 0px' });
    io.observe(root);
  } else ensureLib();

  elegidos = leerURL();
  aplicarSelects();
  escribirURL();
  ponerRango('1Y');
}
