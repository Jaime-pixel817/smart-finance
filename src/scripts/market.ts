// Script de /market: línea de estado, filas por sección, chips de filtro,
// tasas verificadas a mano y, en escritorio, el panel de gráfica del activo
// seleccionado. Una petición por superficie (/api/markets y /api/quotes),
// último valor conocido en localStorage y chips de frescura honestos.
import { fmtTime, fmtDay, type Loc } from './format';
import { nyseOpen, bmvOpen } from './hours';
import { loadMarkets, loadQuotes, loadHistory, quoteFromMarkets, quoteFromQuotes, readLS, writeLS, type Markets, type Quotes, type Quote, type SymbolRT } from './market-data';
import { paintAssetRow, setChip } from './rows';
import { mountPricePanel, type PricePanel } from './chart-panel';

type Sym = SymbolRT & { href: string; name: string };
const root = document.getElementById('market-page');
if (root) boot(root);

function boot(root: HTMLElement) {
  const loc = (root.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const T = JSON.parse(root.dataset.strings || '{}') as Record<string, string>;
  const symbols = JSON.parse(root.dataset.symbols || '[]') as Sym[];
  const $ = <E extends Element = HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<E>(sel);
  const $$ = <E extends Element = HTMLElement>(sel: string, from: ParentNode = root) => Array.from(from.querySelectorAll<E>(sel));
  const rowOf = (id: string) => $(`[data-row="${id}"]`);

  const LS = 'sf-market-cache-v1';
  type Cache = { markets?: Markets; quotes?: Quotes; at?: number };
  const cache = readLS<Cache>(LS) || {};
  const quotes = new Map<string, Quote>();
  let lastUpdated: Date | null = null;

  // ---- Línea de estado: fecha · NYSE · BMV · actualizado hh:mm · cada 15 min ----
  function paintStatus() {
    const el = $('#mkt-status');
    if (!el) return;
    const st = (b: boolean) => `<span class="${b ? 'st-open' : 'st-closed'}">${b ? T.open : T.closed}</span>`;
    let html = `<span>${fmtDay(new Date(), loc)}</span> <span aria-hidden="true">·</span> NYSE ${st(nyseOpen())} <span aria-hidden="true">·</span> BMV ${st(bmvOpen())}`;
    if (lastUpdated) html += ` <span aria-hidden="true">·</span> ${T.updated} ${fmtTime(lastUpdated, loc)} <span aria-hidden="true">·</span> ${T.every}`;
    el.innerHTML = html;
  }
  paintStatus();
  const bump = (when: Date | null) => { if (when && (!lastUpdated || when > lastUpdated)) { lastUpdated = when; paintStatus(); } };

  // ---- Filas ----
  const viaMarkets = symbols.filter((s) => s.feed === 'markets');
  const viaQuotes = symbols.filter((s) => s.feed === 'quotes');
  const chipT = { loading: T.loading, unavailable: T.unavailable };

  function applyMarkets(m: Markets, fromCache: boolean) {
    viaMarkets.forEach((s) => { const q = quoteFromMarkets(s, m); if (q) { quotes.set(s.id, q); paintAssetRow(rowOf(s.id), s, q, loc); } });
    const when = m.updatedAt ? new Date(m.updatedAt) : null;
    const state = fromCache ? 'stale' : 'fresh';
    const stockSrc = m.stocks?.source || undefined;
    setChip($('#chip-stock'), when, state, loc, chipT, m.refreshMinutes, stockSrc);
    // El chip de Índices cubre a los tres ETF (Twelve Data) y al VIX (Yahoo).
    setChip($('#chip-index'), when, state, loc, chipT, m.refreshMinutes, stockSrc ? (stockSrc.includes('Yahoo') ? stockSrc : stockSrc + ' · Yahoo Finance') : undefined);
    setChip($('#chip-crypto'), when, state, loc, chipT, m.refreshMinutes, m.crypto?.source || undefined);
    bump(when);
    maybeRefreshPanel();
  }
  function applyQuotes(q: Quotes, fromCache: boolean) {
    viaQuotes.forEach((s) => { const x = quoteFromQuotes(s, q); if (x) { quotes.set(s.id, x); paintAssetRow(rowOf(s.id), s, x, loc); } });
    const when = q.updatedAt ? new Date(q.updatedAt) : null;
    setChip($('#chip-fx'), when, fromCache ? 'stale' : 'fresh', loc, chipT, q.refreshMinutes, q.source || undefined);
    bump(when);
    maybeRefreshPanel();
  }

  if (cache.markets) applyMarkets(cache.markets, true);
  if (cache.quotes) applyQuotes(cache.quotes, true);

  function fetchAll() {
    loadMarkets()
      .then((m) => { applyMarkets(m, false); writeLS(LS, { ...(readLS<Cache>(LS) || {}), markets: m, at: Date.now() }); })
      .catch(() => { if (!cache.markets) { viaMarkets.forEach((s) => paintAssetRow(rowOf(s.id), s, null, loc)); ['index', 'stock', 'crypto'].forEach((k) => setChip($('#chip-' + k), null, 'error', loc, chipT)); } });
    loadQuotes()
      .then((q) => { applyQuotes(q, false); writeLS(LS, { ...(readLS<Cache>(LS) || {}), quotes: q, at: Date.now() }); })
      .catch(() => { if (!cache.quotes) { viaQuotes.forEach((s) => paintAssetRow(rowOf(s.id), s, null, loc)); setChip($('#chip-fx'), null, 'error', loc, chipT); } });
  }
  fetchAll();
  setInterval(() => { if (document.visibilityState === 'visible') { fetchAll(); paintStatus(); } }, 15 * 60 * 1000);

  // ---- Tasas: verificadas a mano; si la verificación envejece, se esconden ----
  const verified = root.dataset.ratesVerified;
  const rateSec = $('[data-section="rate"]');
  const rateFilter = $('[data-filter="rate"]');
  if (verified && rateSec) {
    const d = new Date(verified + 'T12:00:00Z');
    const ageDays = (Date.now() - d.getTime()) / 86400000;
    if (ageDays > Number(root.dataset.ratesMaxDays || 60)) {
      rateSec.dataset.expired = '1'; rateSec.hidden = true; if (rateFilter) rateFilter.hidden = true;
    } else {
      const chip = $('#chip-rate'); if (chip) { chip.dataset.fresh = 'fresh'; const t = $('.sc-time', chip); if (t) t.textContent = fmtDay(d, loc); }
    }
  }

  // ---- Chips de filtro: Todo · Índices · Acciones · Divisas · Cripto · Tasas ----
  const filters = $$<HTMLButtonElement>('[data-filter]');
  const sections = $$('[data-section]');
  function applyFilter(f: string) {
    filters.forEach((b) => b.setAttribute('aria-pressed', b.dataset.filter === f ? 'true' : 'false'));
    sections.forEach((sec) => { sec.hidden = sec.dataset.expired === '1' || (f !== 'all' && sec.dataset.section !== f); });
  }
  filters.forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.filter || 'all';
    applyFilter(f);
    history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
  }));
  const hash = location.hash.slice(1);
  if (hash && filters.some((b) => b.dataset.filter === hash && !b.hidden)) applyFilter(hash);

  // ---- Panel de escritorio (≥ 960 px): la fila selecciona; "Abrir ficha" navega ----
  const panelSec = $('.mkt-panel');
  const desk = matchMedia('(min-width: 960px)');
  let panel: PricePanel | null = null;
  let selected: Sym | null = null;
  let pendingPrev = false;

  function selectSym(s: Sym, push = true) {
    if (!panelSec || !s.history) return;
    selected = s;
    $$('[data-row]').forEach((r) => { if (r.dataset.row === s.id) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });
    const name = $('.mkt-panel-name', panelSec), sym = $('.mkt-panel-sym', panelSec), open = $<HTMLAnchorElement>('.mkt-panel-open', panelSec);
    if (name) name.textContent = s.name;
    if (sym) sym.textContent = s.sym;
    if (open) open.href = s.href;
    panelSec.dataset.panelFor = s.id;
    if (!panel) {
      const host = $('#mkt-pp');
      if (!host) return;
      panel = mountPricePanel(host, { locale: loc, strings: { closed: T.chartClosed, lastClose: T.lastClose, today: T.today, empty: T.empty, error: T.error, errorEmpty: T.errorEmpty, unavailable: T.unavailable, bars5: T.bars5, daily: T.daily, weekly: T.weekly } });
    }
    const pair = s.history;
    panel.setSource({
      key: s.id, decimals: s.decimals, axisDecimals: s.axisDecimals, invert: s.invert, session: s.session,
      load: async (r) => {
        const h = await loadHistory(pair, r);
        const q = quotes.get(s.id);
        // Sin cotización todavía no hay cierre previo: se marca para repintar
        // el 1D cuando llegue (maybeRefreshPanel).
        if (r === '1D' && !q) pendingPrev = true;
        return { points: h.points, prevClose: r === '1D' ? (q?.prevClose ?? null) : null };
      }
    });
    if (push) history.replaceState(null, '', '#' + s.id);
  }
  function maybeRefreshPanel() {
    if (panel && selected && pendingPrev && panel.range === '1D' && quotes.has(selected.id)) { pendingPrev = false; panel.refresh(); }
  }
  function wireDesktop() {
    if (!panelSec || !desk.matches || panelSec.dataset.wired) return;
    panelSec.dataset.wired = '1';
    $$<HTMLAnchorElement>('[data-row] a').forEach((a) => a.addEventListener('click', (e) => {
      if (!desk.matches) return;
      const id = (a.closest('[data-row]') as HTMLElement | null)?.dataset.row;
      const s = symbols.find((x) => x.id === id);
      if (!s || !s.history) return;     // tasas: la fila lleva a la lección
      e.preventDefault();
      selectSym(s);
    }));
    const fromHash = symbols.find((x) => x.id === hash && x.history);
    selectSym(fromHash || symbols.find((x) => !!x.history)!, false);
  }
  wireDesktop();
  desk.addEventListener('change', wireDesktop);
}
