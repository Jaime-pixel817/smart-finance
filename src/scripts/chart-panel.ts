// Price chart panel (sección C del documento de diseño): readout arriba
// (precio mono 32, Δ ▲▼ y la fecha bajo el dedo al arrastrar), pestañas de
// rango 1D·1M·3M·1A·5A, lienzo de 200/280/320 px con Lightweight Charts
// (TradingView, Apache-2.0: la atribución va junto al chip de fuente), línea
// de 2 px coloreada por dirección con área 12 %→0, línea punteada del cierre
// previo en 1D, crosshair táctil y estados cerrado · vacío · error.
//
// La librería se importa DINÁMICAMENTE cuando el panel entra en el viewport:
// el HTML llega con el readout y el esqueleto, y los datos se piden en
// paralelo a la carga del módulo. Si la librería no llega, el readout y los
// números siguen funcionando; solo falta el dibujo.
//
// Tema: los colores se leen de los tokens CSS (--up, --down, --line, --ink-3)
// al montar y se vuelven a leer al evento sf:theme del ThemeToggle.
import { fmtNum, fmtPct, arrow, dirClass, fmtTime, fmtDay, type Loc } from './format';
import { marketState, closedPhrase } from './hours';
import type { Range, Point } from './market-data';

type LWC = typeof import('lightweight-charts');
type IChartApi = import('lightweight-charts').IChartApi;
type ISeriesApi = import('lightweight-charts').ISeriesApi<'Area'>;
type IPriceLine = import('lightweight-charts').IPriceLine;
type UTCTimestamp = import('lightweight-charts').UTCTimestamp;
type MouseEventParams = import('lightweight-charts').MouseEventParams;

export interface SeriesData { points: Point[]; prevClose?: number | null }
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
}
export interface PanelStrings {
  closed: string; lastClose: string; today: string; empty: string; error: string; bars5: string; daily: string; weekly: string;
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
// Lightweight Charts pinta los tiempos en UTC: se desplaza cada timestamp al
// huso del visitante para que las etiquetas del eje sean su hora local, y se
// guarda el original para el readout.
const shift = (ts: number) => ts - new Date(ts * 1000).getTimezoneOffset() * 60;

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

  // ---- Lightweight Charts, bajo demanda ----
  let lwc: LWC | null = null;
  let chart: IChartApi | null = null;
  let series: ISeriesApi | null = null;
  let baseLine: IPriceLine | null = null;
  let loadingLib: Promise<void> | null = null;
  let shiftedToOrig = new Map<number, Point>();

  function ensureLib(): Promise<void> {
    if (lwc) return Promise.resolve();
    if (!loadingLib) {
      loadingLib = import('lightweight-charts').then((m) => { lwc = m; buildChart(); }).catch(() => { loadingLib = null; });
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
    return f({ hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]\.?\s?m\.?/i, (m) => m.trim().replace(/\s|\./g, '').toLowerCase());
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
      rightPriceScale: { borderVisible: false, ticksVisible: false, entireTextOnly: true, scaleMargins: { top: 0.12, bottom: 0.06 } },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false, timeVisible: range === '1D', secondsVisible: false,
        fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true, rightOffset: 0,
        tickMarkFormatter: (t: unknown, type: number) => tickFormatter(t, type)
      },
      crosshair: {
        mode: L.CrosshairMode.Magnet,
        vertLine: { color: theme.ink3, width: 1 as const, style: L.LineStyle.Dotted, labelVisible: false },
        horzLine: { visible: false, labelVisible: false }
      },
      handleScroll: false,
      handleScale: false,
      kineticScroll: { mouse: false, touch: false },
      trackingMode: { exitMode: L.TrackingModeExitMode.OnTouchEnd },
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
    chart.subscribeCrosshairMove(onCrosshair);
    host.classList.remove('skel');
    root.dataset.chart = 'ready';
    if (data) draw();
  }

  function draw() {
    if (!chart || !series || !lwc || !data) return;
    const pts = data.points;
    shiftedToOrig = new Map();
    const rows: { time: UTCTimestamp; value: number }[] = [];
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
    chart.timeScale().fitContent();
  }

  function applyTheme() {
    theme = readTheme();
    if (!chart || !series || !lwc) return;
    chart.applyOptions({ layout: { textColor: theme.ink3, fontFamily: theme.mono }, grid: { horzLines: { color: theme.line } }, crosshair: { vertLine: { color: theme.ink3 } } });
    series.applyOptions(seriesOptions());
    if (baseLine) baseLine.applyOptions({ color: theme.ink3 });
  }
  document.addEventListener('sf:theme', applyTheme);

  // ---- Readout ----
  function whenLabel(ts: number, withTime: boolean): string {
    const d = new Date(ts * 1000);
    const day = range === '1Y' || range === '5Y'
      ? new Intl.DateTimeFormat(TAG[loc], { day: 'numeric', month: 'short', year: 'numeric' }).format(d).replace(/\./g, '')
      : fmtDay(d, loc);
    return withTime ? `${day} · ${fmtTime(d, loc)}` : day;
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

  function onCrosshair(param: MouseEventParams) {
    if (!data || !stats) return;
    const t = param.time as number | undefined;
    if (t == null || !param.point) { paintReadout(stats.last, stats.base, stats.lastTs, false); root.dataset.scrub = 'off'; return; }
    const orig = shiftedToOrig.get(t);
    if (!orig) return;
    paintReadout(orig[1], stats.base, orig[0], true);
    root.dataset.scrub = 'on';
  }

  // ---- Estados ----
  function setState(kind: '' | 'closed' | 'empty' | 'error', text = '') {
    root.dataset.state = kind || 'ok';
    stateEl.hidden = !kind;
    stateEl.textContent = text;
  }
  function paintSource(failed: boolean, lastTs: number | null) {
    if (chip) chip.dataset.fresh = failed ? 'error' : 'fresh';
    if (srcNote) srcNote.textContent = range === '1D' ? T.bars5 : range === '5Y' ? T.weekly : T.daily;
    if (srcTime && lastTs) srcTime.textContent = fmtTime(new Date(lastTs * 1000), loc);
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
      if (pts.length < 2) { data = null; stats = null; setState('empty', T.empty); if (series) series.setData([]); return; }
      data = { points: pts, prevClose: d.prevClose ?? null };
      const first = pts[0][1], last = pts[pts.length - 1];
      let low = Infinity, high = -Infinity;
      for (const p of pts) { if (p[1] < low) low = p[1]; if (p[1] > high) high = p[1]; }
      const base = myRange === '1D' && data.prevClose ? data.prevClose : first;
      const changePct = base ? ((last[1] - base) / base) * 100 : 0;
      dir = dirClass(mySrc.invert ? -changePct : changePct) as typeof dir;
      const st = myRange === '1D' && mySrc.session !== 'crypto' && mySrc.session !== 'none' ? marketState(last[0]) : null;
      const closed = !!(st && st.closed);
      stats = { key: mySrc.key, range: myRange, points: pts, first, last: last[1], low, high, base, changePct, prevClose: data.prevClose ?? null, lastTs: last[0], closed };
      paintReadout(last[1], base, last[0], false);
      root.dataset.dir = dir;
      if (closed && st) setState('closed', closedPhrase(st, loc, T)); else setState('');
      paintSource(false, last[0]);
      draw();
      opts.onData?.(stats);
    }).catch(() => {
      if (id !== reqId || destroyed) return;
      delete root.dataset.loading;
      // Último valor conocido: lo que haya en pantalla se queda; solo se avisa.
      setState('error', T.error);
      paintSource(true, stats?.lastTs ?? null);
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
    schedule();
    load();
  }

  function setSource(s: PanelSource) {
    src = s;
    data = null; stats = null;
    setState('');
    root.dataset.key = s.key;
    if (series) series.setData([]);
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
    destroy() { destroyed = true; if (timer) clearInterval(timer); document.removeEventListener('sf:theme', applyTheme); chart?.remove(); chart = null; series = null; }
  };
}
