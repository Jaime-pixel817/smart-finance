// Price chart panel (sección C del documento de diseño): readout arriba
// (precio mono 32, Δ ▲▼ y la fecha bajo el dedo al arrastrar), línea de sesión
// ("Última sesión · viernes 21 de agosto · barras de 5 min"), pestañas de
// rango 1D·1M·3M·1A·5A, lienzo de 200/280/320 px con Lightweight Charts
// (TradingView, Apache-2.0: la atribución va junto al chip de fuente), línea
// de 2 px coloreada por dirección con área 12 %→0, línea punteada del cierre
// previo en 1D, marcas del máximo y del mínimo del periodo y estados de
// "sin datos" y de error.
//
// La librería se importa DINÁMICAMENTE cuando el panel entra en el viewport:
// el HTML llega con el readout y el esqueleto, y los datos se piden en
// paralelo a la carga del módulo. Si la librería no llega, el readout y los
// números siguen funcionando; solo falta el dibujo.
//
// ARRASTRE: el crosshair NO lo mueve Lightweight Charts. Encima del lienzo va
// una capa transparente (.pp-hit) que se queda con los eventos de puntero y
// llama a setCrosshairPosition(). La librería, en táctil, solo entra en su
// "tracking mode" tras mantener el dedo ~250 ms quieto: un barrido normal no
// movía nada y el lector se quedaba en el último precio — justo lo que hacía
// imposible recorrer la sesión con el dedo. Con la capa propia el primer píxel
// ya lee, con el mercado abierto o cerrado, y con ratón funciona igual al
// pasar por encima. `touch-action: pan-y` deja que el dedo siga desplazando la
// página en vertical.
//
// Tema: los colores se leen de los tokens CSS (--up, --down, --line, --ink-3)
// al montar y se vuelven a leer al evento sf:theme del ThemeToggle.
import { fmtNum, fmtPct, arrow, dirClass, fmtTime, fmtDay, type Loc } from './format';
import { marketState } from './hours';
import type { Range, Point } from './market-data';

// Solo lo que se usa de la librería, vía src/scripts/lwc.ts (re-exportación
// estática que Rollup sí recorta).
type LWC = typeof import('./lwc');
type IChartApi = import('lightweight-charts').IChartApi;
type ISeriesApi = import('lightweight-charts').ISeriesApi<'Area'>;
type IPriceLine = import('lightweight-charts').IPriceLine;
type UTCTimestamp = import('lightweight-charts').UTCTimestamp;
type SeriesMarker = import('lightweight-charts').SeriesMarker<UTCTimestamp>;
type MarkersApi = import('lightweight-charts').ISeriesMarkersPluginApi<UTCTimestamp>;

export interface SeriesData {
  points: Point[];
  prevClose?: number | null;
  /** true si /api sirvió la copia de 48 h porque el proveedor falló. */
  stale?: boolean;
  /** desfase del huso de la BOLSA en segundos (`tzOffset` de /api/history). */
  tzOffset?: number | null;
}
export interface PanelSource {
  /** clave del símbolo: sirve para descartar respuestas atrasadas al cambiar de activo */
  key: string;
  decimals: number;
  axisDecimals: number;
  invert?: boolean;
  session: 'us' | 'fx' | 'crypto' | 'none';
  load: (range: Range) => Promise<SeriesData>;
}
export interface PanelStats {
  key: string; range: Range; points: Point[]; first: number; last: number; low: number; high: number;
  base: number; changePct: number; prevClose: number | null; lastTs: number; closed: boolean;
  /** momento del máximo y del mínimo del periodo (los que van marcados en la gráfica) */
  highTs: number; lowTs: number;
}
export interface PanelStrings {
  empty: string; error: string; errorEmpty: string; unavailable: string;
  bars5: string; daily: string; weekly: string;
  /** "Hoy" · "Última sesión" · "Últimas 24 h" · "hasta el" · "caché de 48 h" */
  sessToday: string; sessLast: string; sess24h: string; sessUpto: string; cached: string;
}
/**
 * Los textos del panel llegan en el `data-strings` de la página (MarketList y
 * AssetPage los escriben con useT). Esto los recoge en un solo sitio para que
 * /market y la ficha no tengan que repetir la lista.
 */
export function panelStrings(T: Record<string, string>): PanelStrings {
  return {
    empty: T.empty, error: T.error, errorEmpty: T.errorEmpty, unavailable: T.unavailable,
    bars5: T.bars5, daily: T.daily, weekly: T.weekly, cached: T.cached,
    sessToday: T.sessToday, sessLast: T.sessLast, sess24h: T.sess24h, sessUpto: T.sessUpto
  };
}
export interface PanelOpts {
  locale: Loc;
  strings: PanelStrings;
  range?: Range;
  onData?: (s: PanelStats) => void;
  onError?: (key: string, range: Range) => void;
}
export interface PricePanel {
  setSource(src: PanelSource): void;
  setRange(range: Range): void;
  refresh(): void;
  readonly range: Range;
  destroy(): void;
}

const TAG: Record<Loc, string> = { en: 'en-US', es: 'es-MX' };
const DIA = 86400;
// Lightweight Charts pinta los tiempos en UTC: se desplaza cada timestamp al
// huso del visitante para que las etiquetas del eje sean su hora local, y se
// guarda el original para el readout.
const shift = (ts: number) => ts - new Date(ts * 1000).getTimezoneOffset() * 60;
/** "09:50 a. m." → "9:50am": el reloj compacto que usan el eje y las marcas. */
const squeezeAmPm = (s: string) => s.replace(/\s?[ap]\.?\s?m\.?/i, (m) => m.trim().replace(/\s|\./g, '').toLowerCase()).replace(/^0/, '');

interface Theme { up: string; down: string; flat: string; ink3: string; line: string; mono: string }
function readTheme(): Theme {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, fb: string) => (cs.getPropertyValue(n) || fb).trim();
  return {
    up: v('--up', '#16C47F'), down: v('--down', '#FF5A5F'), flat: v('--neutral', '#9BA3AF'),
    ink3: v('--ink-3', '#7E7E88'), line: v('--line', 'rgba(128,128,128,.2)'),
    mono: v('--font-mono', 'ui-monospace, monospace')
  };
}
function withAlpha(hex: string, a: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6 && m.length !== 3) return hex;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function mountPricePanel(root: HTMLElement, opts: PanelOpts): PricePanel {
  const loc = opts.locale;
  const T = opts.strings;
  const $ = <E extends Element = HTMLElement>(sel: string) => root.querySelector<E>(sel);
  const priceEl = $('.pp-price')!, chgEl = $('.pp-chg')!, whenEl = $('.pp-when')!, stateEl = $('.pp-state')!;
  const sessionEl = $('.pp-session');
  const host = $('.pp-canvas')!;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"][data-range]'));
  const srcNote = $('.pp-chip .sc-note');
  const srcTime = $('.pp-chip .sc-time');
  const chip = $('.pp-chip');

  let range: Range = (root.dataset.range as Range) || opts.range || '1D';
  let src: PanelSource | null = null;
  let reqId = 0;
  let data: SeriesData | null = null;   // última serie pintada
  let stats: PanelStats | null = null;
  let theme = readTheme();
  let dir: 'up' | 'down' | 'flat' = 'flat';
  let timer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;
  // Huso de la bolsa (segundos). Con él se sabe de qué DÍA DE MERCADO es cada
  // punto, que no tiene por qué ser el día del visitante: la sesión de divisas
  // del viernes empieza el jueves por la tarde en México.
  let tzOff = -new Date().getTimezoneOffset() * 60;
  /** Día de MERCADO de un timestamp (entero, para comparar y agrupar). */
  const mktDay = (ts: number) => Math.floor((ts + tzOff) / DIA);
  /** El mismo instante corrido al huso de la bolsa, para formatearlo en UTC. */
  const mktDate = (ts: number) => new Date((ts + tzOff) * 1000);

  // ---- Lightweight Charts, bajo demanda ----
  let lwc: LWC | null = null;
  let chart: IChartApi | null = null;
  let series: ISeriesApi | null = null;
  let markers: MarkersApi | null = null;
  let baseLine: IPriceLine | null = null;
  let loadingLib: Promise<void> | null = null;
  let hit: HTMLDivElement | null = null;
  let tags: HTMLDivElement | null = null;
  let tagFrame = 0;
  let shiftedToOrig = new Map<number, Point>();
  let rows: { time: UTCTimestamp; value: number }[] = [];

  function ensureLib(): Promise<void> {
    if (lwc) return Promise.resolve();
    if (!loadingLib) {
      loadingLib = import('./lwc').then((m) => { lwc = m; buildChart(); }).catch(() => { loadingLib = null; });
    }
    return loadingLib;
  }

  function colorFor(d: typeof dir): string { return d === 'up' ? theme.up : d === 'down' ? theme.down : theme.flat; }

  function tickFormatter(time: unknown, type: number): string {
    const ts = typeof time === 'number' ? time : 0;
    const d = new Date(ts * 1000);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(TAG[loc], { ...o, timeZone: 'UTC' }).format(d);
    // TickMarkType: 0 Year · 1 Month · 2 DayOfMonth · 3 Time · 4 TimeWithSeconds
    if (type === 0) return f({ year: 'numeric' });
    if (type === 1) return cap(f({ month: 'short' }).replace('.', ''));
    if (type === 2) return f({ day: 'numeric', month: 'short' }).replace('.', '');
    return squeezeAmPm(f({ hour: 'numeric', minute: '2-digit' }));
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  function chartOptions() {
    const L = lwc!;
    return {
      autoSize: true,
      layout: {
        background: { type: L.ColorType.Solid, color: 'transparent' },
        textColor: theme.ink3, fontFamily: theme.mono, fontSize: 11,
        attributionLogo: false
      },
      grid: { vertLines: { visible: false }, horzLines: { color: theme.line, style: L.LineStyle.Solid } },
      // Márgenes generosos arriba y abajo: las etiquetas del máximo y del
      // mínimo se dibujan fuera de la línea y con los de antes se cortaban.
      rightPriceScale: { borderVisible: false, ticksVisible: false, entireTextOnly: true, scaleMargins: { top: 0.18, bottom: 0.16 } },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false, timeVisible: range === '1D', secondsVisible: false,
        fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true, rightOffset: 0, allowBoldLabels: false,
        tickMarkFormatter: (t: unknown, type: number) => tickFormatter(t, type)
      },
      crosshair: {
        mode: L.CrosshairMode.Magnet,
        vertLine: { color: theme.ink3, width: 1 as const, style: L.LineStyle.Dotted, labelVisible: false },
        horzLine: { visible: false, labelVisible: false }
      },
      // El lienzo no se desplaza ni se escala: el dedo es un lector de la
      // sesión, no un navegador de la serie (.pp-hit, más abajo).
      handleScroll: false,
      handleScale: false,
      kineticScroll: { mouse: false, touch: false },
      localization: {
        locale: TAG[loc],
        priceFormatter: (p: number) => fmtNum(p, loc, src?.axisDecimals ?? 2)
      }
    };
  }

  function seriesOptions() {
    const c = colorFor(dir);
    const L = lwc!;
    const prev = data?.prevClose ?? null;
    return {
      lineColor: c, lineWidth: 2 as const, topColor: withAlpha(c, 0.12), bottomColor: withAlpha(c, 0),
      lineType: L.LineType.Simple, priceLineVisible: false, lastValueVisible: false,
      crosshairMarkerVisible: true, crosshairMarkerRadius: 4, crosshairMarkerBorderColor: c, crosshairMarkerBackgroundColor: c,
      priceFormat: { type: 'price' as const, precision: src?.axisDecimals ?? 2, minMove: Math.pow(10, -(src?.axisDecimals ?? 2)) },
      // El cierre previo entra en la escala aunque quede fuera de la serie,
      // para que su línea punteada siempre se vea.
      autoscaleInfoProvider: (orig: () => { priceRange: { minValue: number; maxValue: number } | null; margins?: unknown } | null) => {
        const r = orig();
        if (r && r.priceRange && prev != null && range === '1D') {
          r.priceRange = { minValue: Math.min(r.priceRange.minValue, prev), maxValue: Math.max(r.priceRange.maxValue, prev) };
        }
        return r;
      }
    };
  }

  function buildChart() {
    if (!lwc || chart || destroyed) return;
    host.innerHTML = '';
    chart = lwc.createChart(host, chartOptions() as Parameters<LWC['createChart']>[1]);
    series = chart.addSeries(lwc.AreaSeries, seriesOptions());
    markers = lwc.createSeriesMarkers(series, []) as MarkersApi;
    tags = document.createElement('div');
    tags.className = 'pp-tags';
    tags.setAttribute('aria-hidden', 'true');
    host.appendChild(tags);
    hit = document.createElement('div');
    hit.className = 'pp-hit';
    hit.setAttribute('aria-hidden', 'true');
    host.appendChild(hit);
    wireScrub(hit);
    // El lienzo se estira con la tarjeta (autoSize): las etiquetas del máximo
    // y del mínimo se recolocan con él.
    if ('ResizeObserver' in window) new ResizeObserver(() => queueTags()).observe(host);
    host.classList.remove('skel');
    root.dataset.chart = 'ready';
    if (data) draw();
  }

  // ---- Máximo y mínimo del periodo -----------------------------------------
  // Es lo que se lee de un vistazo: cuándo subió más y cuándo cayó más. La
  // etiqueta lleva la hora en 1D y el día en los rangos largos.
  function markerLabel(ts: number): string {
    const d = new Date(ts * 1000);
    // Misma forma que las marcas del eje justo debajo ("9:50am"), que ocupa la
    // mitad que "09:50 AM" y no obliga a leer dos relojes distintos.
    if (range === '1D') return squeezeAmPm(new Intl.DateTimeFormat(TAG[loc], { hour: 'numeric', minute: '2-digit' }).format(d));
    return new Intl.DateTimeFormat(TAG[loc], { day: 'numeric', month: 'short' }).format(d).replace(/\./g, '');
  }
  function paintMarkers() {
    if (!markers || !stats || !rows.length) { markers?.setMarkers([]); return; }
    if (stats.high === stats.low) { markers.setMarkers([]); return; }   // serie plana: no hay qué marcar
    const at = (ts: number) => rows.find((r) => (shiftedToOrig.get(r.time as number)?.[0] ?? -1) === ts);
    const hi = at(stats.highTs), lo = at(stats.lowTs);
    const list: SeriesMarker[] = [];
    // Solo el punto: el texto lo pone placeTags() en HTML. Con el `text` del
    // propio marcador, Lightweight Charts lo recorta contra el borde del panel
    // y en 1A salían "ago" y "23 a" en vez de "25 ago" y "23 ago".
    if (hi) list.push({ time: hi.time, position: 'inBar', shape: 'circle', size: 0.5, color: theme.up });
    if (lo) list.push({ time: lo.time, position: 'inBar', shape: 'circle', size: 0.5, color: theme.down });
    list.sort((a, b) => (a.time as number) - (b.time as number));
    markers.setMarkers(list);
    queueTags();
  }

  /** Etiqueta del máximo y del mínimo, en HTML y pegada dentro del lienzo. */
  function queueTags() {
    if (tagFrame) cancelAnimationFrame(tagFrame);
    tagFrame = requestAnimationFrame(() => { tagFrame = 0; placeTags(); });
  }
  function placeTags() {
    if (!tags) return;
    tags.textContent = '';
    if (!chart || !series || !stats || !rows.length || stats.high === stats.low) return;
    const ts = chart.timeScale();
    const ancho = ts.width();
    const poner = (kind: 'hi' | 'lo', at: number, value: number) => {
      const i = rows.findIndex((r) => (shiftedToOrig.get(r.time as number)?.[0] ?? -1) === at);
      if (i < 0) return;
      const x = ts.logicalToCoordinate(i as Parameters<typeof ts.logicalToCoordinate>[0]);
      const y = series!.priceToCoordinate(value);
      if (x == null || y == null) return;
      const el = document.createElement('span');
      el.className = 'pp-tag ' + kind;
      el.textContent = markerLabel(at);
      tags!.appendChild(el);
      const media = el.offsetWidth / 2;
      el.style.left = Math.round(Math.max(media + 2, Math.min(ancho - media - 2, x))) + 'px';
      el.style.top = Math.round(kind === 'hi' ? y - 17 : y + 7) + 'px';
    };
    poner('hi', stats.highTs, stats.high);
    poner('lo', stats.lowTs, stats.low);
  }

  function draw() {
    if (!chart || !series || !lwc || !data) return;
    const pts = data.points;
    shiftedToOrig = new Map();
    rows = [];
    let lastT = -Infinity;
    for (const p of pts) {
      const t = shift(p[0]);
      if (t <= lastT) { // tiempos repetidos o desordenados: se queda el último
        if (t === lastT && rows.length) { rows[rows.length - 1].value = p[1]; shiftedToOrig.set(t, p); }
        continue;
      }
      lastT = t;
      rows.push({ time: t as UTCTimestamp, value: p[1] });
      shiftedToOrig.set(t, p);
    }
    series.applyOptions(seriesOptions());
    chart.applyOptions({ timeScale: { timeVisible: range === '1D' }, localization: { priceFormatter: (p: number) => fmtNum(p, loc, src?.axisDecimals ?? 2) } });
    series.setData(rows);
    if (baseLine) { series.removePriceLine(baseLine); baseLine = null; }
    if (range === '1D' && data.prevClose != null) {
      baseLine = series.createPriceLine({ price: data.prevClose, color: theme.ink3, lineWidth: 1, lineStyle: lwc.LineStyle.Dotted, axisLabelVisible: false, title: '' });
    }
    paintMarkers();
    chart.timeScale().fitContent();
    queueTags();
  }

  function applyTheme() {
    theme = readTheme();
    if (!chart || !series || !lwc) return;
    chart.applyOptions({ layout: { textColor: theme.ink3, fontFamily: theme.mono }, grid: { horzLines: { color: theme.line } }, crosshair: { vertLine: { color: theme.ink3 } } });
    series.applyOptions(seriesOptions());
    if (baseLine) baseLine.applyOptions({ color: theme.ink3 });
    paintMarkers();
  }
  document.addEventListener('sf:theme', applyTheme);

  // ---- Readout ----
  function whenLabel(ts: number, withTime: boolean): string {
    // En 1D manda el reloj del visitante: está leyendo horas de una sesión que
    // ve en su propio huso. En cierres diarios y semanales manda el día de la
    // BOLSA, que es lo que el punto significa; con el huso local, la barra del
    // domingo de cripto salía fechada el sábado.
    if (range === '1D') {
      const d = new Date(ts * 1000);
      return withTime ? `${fmtDay(d, loc)} · ${fmtTime(d, loc)}` : fmtDay(d, loc);
    }
    const d = mktDate(ts);
    if (range === '1Y' || range === '5Y') {
      return new Intl.DateTimeFormat(TAG[loc], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d).replace(/\./g, '');
    }
    return new Intl.DateTimeFormat(TAG[loc], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d).replace(/\.,?/g, '').replace(/,/g, '');
  }
  function paintReadout(value: number, base: number, ts: number, scrub: boolean) {
    if (!src) return;
    priceEl.textContent = fmtNum(value, loc, src.decimals);
    priceEl.classList.remove('skel');
    const pct = base ? ((value - base) / base) * 100 : 0;
    const d = dirClass(src.invert ? -pct : pct) as 'up' | 'down' | 'flat';
    const abs = Math.abs(value - base);
    chgEl.className = 'pp-chg num ' + d;
    chgEl.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtNum(abs, loc, src.decimals)} (${fmtPct(pct, loc)})`;
    chgEl.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
    whenEl.textContent = scrub ? whenLabel(ts, range === '1D') : `${whenLabel(ts, range === '1D')} · ${rangeLabel(range)}`;
    whenEl.classList.remove('skel');
  }
  function rangeLabel(r: Range): string { return tabs.find((t) => t.dataset.range === r)?.textContent?.trim() || r; }

  // ---- Arrastre propio (ver el encabezado del archivo) ----------------------
  function pointAt(clientX: number): { row: { time: UTCTimestamp; value: number }; orig: Point } | null {
    if (!chart || !rows.length) return null;
    const x = clientX - host.getBoundingClientRect().left;
    const lg = chart.timeScale().coordinateToLogical(x);
    const i = Math.max(0, Math.min(rows.length - 1, lg == null ? rows.length - 1 : Math.round(lg)));
    const row = rows[i];
    const orig = shiftedToOrig.get(row.time as number);
    return orig ? { row, orig } : null;
  }
  function scrubTo(clientX: number) {
    if (!stats || !series || !chart) return;
    const p = pointAt(clientX);
    if (!p) return;
    chart.setCrosshairPosition(p.row.value, p.row.time, series);
    paintReadout(p.orig[1], stats.base, p.orig[0], true);
    root.dataset.scrub = 'on';
  }
  function endScrub() {
    chart?.clearCrosshairPosition();
    if (stats) paintReadout(stats.last, stats.base, stats.lastTs, false);
    root.dataset.scrub = 'off';
  }
  function wireScrub(el: HTMLElement) {
    let dragging = false;
    const stop = () => { if (!dragging) return; dragging = false; endScrub(); };
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* Safari viejo */ }
      scrubTo(e.clientX);
    });
    // Con ratón basta pasar por encima; con el dedo, desde el primer píxel del
    // arrastre (sin esperar a ninguna pulsación larga).
    el.addEventListener('pointermove', (e) => { if (dragging || e.pointerType === 'mouse') scrubTo(e.clientX); });
    el.addEventListener('pointerup', stop);
    // pointercancel llega cuando el navegador decide que el gesto es un scroll
    // vertical de la página: se suelta el lector y la página baja como siempre.
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !dragging) endScrub(); });
  }

  // ---- Estados y etiqueta de sesión ---------------------------------------
  function setState(kind: '' | 'empty' | 'error', text = '') {
    root.dataset.state = kind || 'ok';
    stateEl.hidden = !kind;
    stateEl.textContent = text;
  }
  const granularity = () => (range === '1D' ? T.bars5 : range === '5Y' ? T.weekly : T.daily);
  function longDay(d: Date): string {
    const wd = new Intl.DateTimeFormat(TAG[loc], { weekday: 'long', timeZone: 'UTC' }).format(d);
    const rest = new Intl.DateTimeFormat(TAG[loc], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
    return loc === 'es' ? `${wd} ${rest}` : `${wd}, ${rest}`;
  }
  function shortDay(d: Date): string {
    // El año solo donde hace falta: en 1M y 3M sobra, y en 1A sin él salía
    // "Aug 22 – Aug 21", que no dice nada.
    const o: Intl.DateTimeFormatOptions = range === '5Y'
      ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : range === '1Y'
        ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
        : { day: 'numeric', month: 'short', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(TAG[loc], o).format(d).replace(/\./g, '');
  }
  /**
   * "Última sesión · viernes 21 de agosto · barras de 5 min" — qué se está
   * viendo, sin decir "en vivo" y sin inventar. En 1D el primer trozo depende
   * de los datos: "Hoy" solo si el último punto es de hace menos de 40 min;
   * "Últimas 24 h" si la ventana abarca dos días de mercado (la sesión acaba
   * de abrir, o es cripto justo después de la medianoche).
   */
  function paintSession(pts: Point[], fresh: boolean) {
    if (!sessionEl) return;
    if (!pts.length) { sessionEl.textContent = ''; return; }
    const firstTs = pts[0][0], lastTs = pts[pts.length - 1][0];
    if (range !== '1D') {
      sessionEl.textContent = `${shortDay(mktDate(firstTs))} – ${shortDay(mktDate(lastTs))} · ${granularity()}`;
      return;
    }
    const dias = mktDay(lastTs) - mktDay(firstTs) + 1;
    const dia = longDay(mktDate(lastTs));
    const hoy = mktDay(Date.now() / 1000) === mktDay(lastTs);
    let txt: string;
    if (dias > 1) txt = hoy ? T.sess24h : `${T.sess24h} · ${T.sessUpto} ${dia}`;
    else if (fresh && hoy) txt = `${T.sessToday} · ${dia}`;
    else txt = `${T.sessLast} · ${dia}`;
    sessionEl.textContent = `${txt} · ${granularity()}`;
  }
  function paintSource(state: 'fresh' | 'stale' | 'error', lastTs: number | null) {
    if (chip) chip.dataset.fresh = state;
    // Cuando el último dato no es de hoy, la hora sola engaña ("14:00" un
    // domingo). Se le pone el día delante.
    if (srcNote) srcNote.textContent = granularity() + (state === 'stale' ? ` · ${T.cached}` : '');
    if (!srcTime) return;
    if (lastTs) {
      const d = new Date(lastTs * 1000);
      // En cierres diarios y semanales la hora del punto es la de apertura de
      // la barra: enseñarla haría creer que el dato es de esa hora. Solo el día.
      if (range !== '1D') { srcTime.textContent = whenLabel(lastTs, false); return; }
      const mismoDia = d.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
      srcTime.textContent = mismoDia ? fmtTime(d, loc) : `${fmtDay(d, loc)} · ${fmtTime(d, loc)}`;
    } else if (state === 'error') {
      srcTime.textContent = T.unavailable;
    }
  }

  // ---- Carga ----
  function load() {
    if (!src) return;
    const id = ++reqId;
    const mySrc = src, myRange = range;
    root.dataset.loading = '1';
    ensureLib();
    mySrc.load(myRange).then((d) => {
      if (id !== reqId || destroyed) return;
      delete root.dataset.loading;
      const pts = (d.points || []).filter((p) => typeof p[1] === 'number' && isFinite(p[1]));
      if (pts.length < 2) {
        data = null; stats = null;
        setState('empty', T.empty);
        if (sessionEl) sessionEl.textContent = '';
        if (series) series.setData([]);
        markers?.setMarkers([]);
        rows = [];
        return;
      }
      if (typeof d.tzOffset === 'number') tzOff = d.tzOffset;
      data = { points: pts, prevClose: d.prevClose ?? null, stale: d.stale, tzOffset: d.tzOffset };
      const first = pts[0][1], last = pts[pts.length - 1];
      let low = Infinity, high = -Infinity, lowTs = pts[0][0], highTs = pts[0][0];
      for (const p of pts) {
        if (p[1] < low) { low = p[1]; lowTs = p[0]; }
        if (p[1] > high) { high = p[1]; highTs = p[0]; }
      }
      const base = myRange === '1D' && data.prevClose ? data.prevClose : first;
      const changePct = base ? ((last[1] - base) / base) * 100 : 0;
      dir = dirClass(mySrc.invert ? -changePct : changePct) as typeof dir;
      // Con hueco de más de 40 min el último dato ya no es de la sesión en
      // curso, sea fin de semana, feriado o caída de la fuente.
      const st = marketState(last[0]);
      const closed = st.closed && mySrc.session !== 'crypto' && mySrc.session !== 'none';
      stats = { key: mySrc.key, range: myRange, points: pts, first, last: last[1], low, high, base, changePct, prevClose: data.prevClose ?? null, lastTs: last[0], closed, highTs, lowTs };
      paintReadout(last[1], base, last[0], false);
      root.dataset.dir = dir;
      setState('');
      paintSession(pts, !st.closed);
      paintSource(d.stale ? 'stale' : 'fresh', last[0]);
      draw();
      opts.onData?.(stats);
    }).catch(() => {
      if (id !== reqId || destroyed) return;
      delete root.dataset.loading;
      // Último valor conocido: lo que haya en pantalla se queda; solo se avisa.
      setState('error', stats ? T.error : T.errorEmpty);
      paintSource('error', stats?.lastTs ?? null);
      if (!stats) { priceEl.textContent = '—'; priceEl.classList.remove('skel'); chgEl.textContent = ''; whenEl.textContent = ''; whenEl.classList.remove('skel'); }
      opts.onError?.(mySrc.key, myRange);
    });
  }

  function schedule() {
    if (timer) { clearInterval(timer); timer = null; }
    // Solo 1D se refresca solo (barras de 5 min); los demás son cierres diarios.
    if (range === '1D') timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 5 * 60 * 1000);
  }

  // ---- Pestañas de rango (tablist con flechas) ----
  function paintTabs() {
    tabs.forEach((t) => {
      const on = t.dataset.range === range;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    root.dataset.range = range;
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setRange(t.dataset.range as Range));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[n].focus();
      setRange(tabs[n].dataset.range as Range);
    });
  });

  function setRange(r: Range) {
    if (!tabs.some((t) => t.dataset.range === r)) return;
    range = r;
    paintTabs();
    // Se suelta el crosshair pero NO se repinta el lector: los números que hay
    // en pantalla son todavía del rango anterior y quedarían con la etiqueta
    // del nuevo hasta que llegue la respuesta.
    chart?.clearCrosshairPosition();
    root.dataset.scrub = 'off';
    schedule();
    load();
  }

  function setSource(s: PanelSource) {
    src = s;
    data = null; stats = null; rows = [];
    setState('');
    if (sessionEl) sessionEl.textContent = '';
    root.dataset.key = s.key;
    if (series) series.setData([]);
    markers?.setMarkers([]);
    if (baseLine && series) { series.removePriceLine(baseLine); baseLine = null; }
    schedule();
    load();
  }

  // La librería se carga cuando el panel se acerca al viewport; los datos, desde ya.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); ensureLib(); } }, { rootMargin: '240px 0px' });
    io.observe(root);
  } else {
    ensureLib();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && range === '1D' && src) load(); });
  paintTabs();

  return {
    setSource, setRange, refresh: load,
    get range() { return range; },
    destroy() {
      destroyed = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('sf:theme', applyTheme);
      if (tagFrame) cancelAnimationFrame(tagFrame);
      hit?.remove(); hit = null;
      tags?.remove(); tags = null;
      chart?.remove(); chart = null; series = null; markers = null;
    }
  };
}
