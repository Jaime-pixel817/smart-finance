// Script de la ficha /market/[symbol]: cabecera (precio, Δ, chip), Price
// chart panel con rangos, stat tiles (rango del periodo, cambio 1M/3M/1A,
// 52 semanas) y las tres filas de "Relacionados". Tres peticiones como mucho:
// la cotización (/api/markets o /api/quotes), el 1D y el 1A de /api/history
// (1M y 3M se recortan del 1A; 5A se pide solo al tocar su pestaña).
import { fmtNum, fmtPct, arrow, dirClass, type Loc } from './format';
import { loadMarkets, loadQuotes, loadHistory, quoteFromMarkets, quoteFromQuotes, quoteFromHistory, changeOver, minMax, readLS, writeLS, type Quote, type SymbolRT, type Range } from './market-data';
import { paintAssetRow, setChip } from './rows';
import { mountPricePanel, type PanelStats } from './chart-panel';
import { montarBotones, alCambiar, leer as leerWatchlist } from './watchlist';

type Sym = SymbolRT & { href?: string };
const root = document.getElementById('asset');
if (root) boot(root);

function boot(root: HTMLElement) {
  const loc = (root.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const T = JSON.parse(root.dataset.strings || '{}') as Record<string, string>;
  const s = JSON.parse(root.dataset.symbol || '{}') as Sym;
  const related = JSON.parse(root.dataset.related || '[]') as Sym[];
  const $ = <E extends Element = HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<E>(sel);
  const rowOf = (id: string) => $(`[data-row="${id}"]`);
  const chipT = { loading: T.loading, unavailable: T.unavailable };

  // ---- Cabecera ----
  const LS = 'sf-asset-cache-v1:' + s.id;
  const cached = readLS<{ quote?: Quote; at?: number }>(LS);
  const priceEl = $('#asset-price'), chgEl = $('#asset-chg'), chip = $('#asset-chip');
  let quote: Quote | null = null;
  let headerPainted = false;

  function paintHeader(q: Quote, fromCache: boolean) {
    headerPainted = true;
    if (priceEl) { priceEl.textContent = fmtNum(q.price, loc, s.decimals); priceEl.classList.remove('skel'); }
    if (chgEl) {
      const pct = q.changePct;
      chgEl.classList.remove('skel', 'up', 'down', 'flat');
      if (pct != null) {
        chgEl.classList.add(dirClass(s.invert ? -pct : pct));
        const abs = q.change != null ? fmtNum(Math.abs(q.change), loc, s.decimals) + ' ' : '';
        const period = s.kind === 'crypto' ? '24 h' : T.today;
        chgEl.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${abs}(${fmtPct(pct, loc)}) <span class="faint">· ${period}</span>`;
        chgEl.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc) + ' ' + period);
      } else { chgEl.textContent = ''; }
    }
    setChip(chip, q.updatedAt ? new Date(q.updatedAt) : null, fromCache ? 'stale' : 'fresh', loc, chipT, q.refreshMinutes, q.source);
  }
  function headerError() {
    if (headerPainted) { setChip(chip, null, 'error', loc, chipT); return; }
    if (priceEl) { priceEl.textContent = '—'; priceEl.classList.remove('skel'); }
    if (chgEl) { chgEl.textContent = ''; chgEl.classList.remove('skel'); }
    setChip(chip, null, 'error', loc, chipT);
  }
  if (cached?.quote) paintHeader({ ...cached.quote, updatedAt: cached.quote.updatedAt ? new Date(cached.quote.updatedAt) : null }, true);

  // ---- Cotización propia y de los relacionados: una petición por endpoint ----
  const all = [s, ...related];
  const pMarkets = all.some((x) => x.feed === 'markets') ? loadMarkets() : Promise.resolve(null);
  const pQuotes = all.some((x) => x.feed === 'quotes') ? loadQuotes() : Promise.resolve(null);
  const quoteP: Promise<Quote | null> = (
    s.feed === 'markets' ? pMarkets.then((m) => (m ? quoteFromMarkets(s, m) : null))
    : s.feed === 'quotes' ? pQuotes.then((q) => (q ? quoteFromQuotes(s, q) : null))
    : Promise.resolve(null)
  ).catch(() => null);
  quoteP.then((q) => {
    if (q) { quote = q; paintHeader(q, false); writeLS(LS, { quote: q, at: Date.now() }); paintHighLow(); }
    else if (!cached?.quote && s.feed !== 'static') headerError();
  });
  const relMarkets = related.filter((r) => r.feed === 'markets'), relQuotes = related.filter((r) => r.feed === 'quotes');
  pMarkets.then((m) => { if (m) relMarkets.forEach((r) => paintAssetRow(rowOf(r.id), r, quoteFromMarkets(r, m), loc)); })
    .catch(() => relMarkets.forEach((r) => paintAssetRow(rowOf(r.id), r, null, loc)));
  pQuotes.then((q) => { if (q) relQuotes.forEach((r) => paintAssetRow(rowOf(r.id), r, quoteFromQuotes(r, q), loc)); })
    .catch(() => relQuotes.forEach((r) => paintAssetRow(rowOf(r.id), r, null, loc)));

  // ---- Stat tiles ----
  const RANGE_LABEL: Record<Range, string> = { '1D': T.r1D, '1M': T.r1M, '3M': T.r3M, '1Y': T.r1Y, '5Y': T.r5Y };
  function paintStat(key: string, text: string, cls = '') {
    const v = $(`[data-stat="${key}"] .stat-v`);
    if (!v) return;
    v.textContent = text;
    v.className = 'stat-v num' + (cls ? ' ' + cls : '');
  }
  function pctStat(key: string, pct: number | null) {
    if (pct == null) { paintStat(key, '—'); return; }
    const v = $(`[data-stat="${key}"] .stat-v`);
    if (!v) return;
    v.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`;
    v.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
    v.className = 'stat-v num ' + dirClass(s.invert ? -pct : pct);
  }
  function paintRangeStat(st: PanelStats) {
    const label = $('[data-stat-range-label]'); if (label) label.textContent = RANGE_LABEL[st.range] || st.range;
    paintStat('range', `${fmtNum(st.low, loc, s.decimals)} – ${fmtNum(st.high, loc, s.decimals)}`);
  }
  let yearLowHigh: { low: number; high: number } | null = null;
  function paintHighLow() {
    const hi = quote?.high52 ?? yearLowHigh?.high ?? null;
    const lo = quote?.low52 ?? yearLowHigh?.low ?? null;
    paintStat('high52', hi != null ? fmtNum(hi, loc, s.decimals) : '—');
    paintStat('low52', lo != null ? fmtNum(lo, loc, s.decimals) : '—');
  }

  // ---- Panel de gráfica ----
  const host = $('#asset-pp');
  if (host && s.history) {
    const pair = s.history;
    const panel = mountPricePanel(host, {
      locale: loc,
      strings: { closed: T.chartClosed, lastClose: T.lastClose, today: T.today, empty: T.empty, error: T.error, errorEmpty: T.errorEmpty, unavailable: T.unavailable, bars5: T.bars5, daily: T.daily, weekly: T.weekly },
      onData: (st) => {
        paintRangeStat(st);
        // Sin endpoint de cotización (o caído): la serie 1D hace de cabecera.
        if (!headerPainted && st.range === '1D') { const q = quoteFromHistory({ pair, range: '1D', points: st.points }, s.source); if (q) paintHeader(q, false); }
      },
      onError: () => { if (!headerPainted) headerError(); const v = $('[data-stat="range"] .stat-v'); if (v && v.classList.contains('skel')) paintStat('range', '—'); }
    });
    panel.setSource({
      key: s.id, decimals: s.decimals, axisDecimals: s.axisDecimals, invert: s.invert, session: s.session,
      load: async (r) => {
        // El cierre previo viene de la cotización: se espera a las dos para
        // que la línea base del 1D salga desde el primer pintado.
        const [h, q] = await Promise.all([loadHistory(pair, r), r === '1D' ? quoteP : Promise.resolve(null)]);
        return { points: h.points, prevClose: r === '1D' ? (q?.prevClose ?? null) : null };
      }
    });

    // Cambios 1M/3M/1A y 52 semanas, del 1A (una petición; 1M y 3M también salen de ahí).
    loadHistory(pair, '1Y').then((h) => {
      pctStat('chg1M', changeOver(h.points, 31));
      pctStat('chg3M', changeOver(h.points, 92));
      pctStat('chg1Y', changeOver(h.points, 370));
      yearLowHigh = minMax(h.points);
      paintHighLow();
    }).catch(() => { ['chg1M', 'chg3M', 'chg1Y'].forEach((k) => paintStat(k, '—')); paintHighLow(); });
  }

  // ---- Seguir (watchlist local) ----
  // El botón de la cabecera además cambia su texto visible; los de las filas de
  // "Relacionados" solo cambian de estado. Todo lo demás lo hace watchlist.ts.
  montarBotones(root);
  const follow = $('.asset-follow');
  const followText = $('.asset-follow-text');
  if (follow && followText) {
    const pintar = (ids: string[]) => { followText.textContent = ids.includes(s.id) ? T.unfollow : T.follow; };
    alCambiar(pintar);
    pintar(leerWatchlist());
  }
}
