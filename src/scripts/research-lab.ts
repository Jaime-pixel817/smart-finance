// Laboratorio de DCF de las páginas de research (src/components/research/DcfLab.astro).
//
// La página ya llega con los números calculados en el build; este script solo
// vuelve a calcular cuando alguien mueve un control. Importa el MISMO motor
// que usó el build (src/lib/finance/dcf.mjs): aquí no hay ni una fórmula
// financiera, solo pegamento con el DOM.
import { runDCF, sensitivity, sanityChecks, defaultRanges } from '../lib/finance/dcf.mjs';
import { modelWith, decodeControls, encodeControls } from '../lib/research/lab.mjs';
import { footballField } from '../lib/research/charts.mjs';
import { millions, money, pct, times } from '../lib/research/format.mjs';

type Controls = Record<string, number | string>;
interface Payload {
  locale: 'en' | 'es';
  model: any;
  start: Controls;
  author: Controls | null;
  initial: Controls;
  limits: Record<string, { min: number; max: number; step: number }>;
  history: string;
  t: {
    price: string;
    ff: { lab: string; comps: string; mark: string; empty: string; aria: string };
    scen: { bear: string; base: string; bull: string };
    copied: string; copy: string; alertsOk: string; vsMarket: string; unavailable: string;
    alerts: Record<string, string>;
  };
}

const UNIT: Record<string, string> = { g1: '%', g2: '%', m: '%', w: '%', g: '%', da: '%', capex: '%', nwc: '%', tax: '%', x: 'x' };

function mount(root: HTMLElement) {
  const dataTag = root.querySelector<HTMLScriptElement>('[data-lab-data]');
  if (!dataTag) return;
  let p: Payload;
  try { p = JSON.parse(dataTag.textContent || '{}'); } catch { return; }
  const loc = p.locale;

  const q = <T extends Element>(s: string, r: ParentNode = root) => r.querySelector<T>(s);
  const qa = <T extends Element>(s: string, r: ParentNode = root) => Array.from(r.querySelectorAll<T>(s));

  const inputs = qa<HTMLInputElement | HTMLSelectElement>('[data-ctl]');
  const outs = new Map(qa<HTMLElement>('[data-out]').map((el) => [el.dataset.out as string, el]));
  const priceEl = q<HTMLElement>('[data-out-price]');
  const vsEl = q<HTMLElement>('[data-out-vs]');
  const evEl = q<HTMLElement>('[data-out-ev]');
  const eqEl = q<HTMLElement>('[data-out-equity]');
  const tvEl = q<HTMLElement>('[data-out-tv]');
  const exitEl = q<HTMLElement>('[data-out-exit]');
  const alertsBox = q<HTMLElement>('[data-lab-alerts]');
  const sensTable = q<HTMLTableElement>('[data-sens]');
  const ffBox = q<HTMLElement>('[data-ff]');
  const xWrap = q<HTMLElement>('[data-x-wrap]');

  let controls: Controls = decodeControls(location.search, p.initial, p.limits);
  let market: number | null = null;
  let scenario: string = 'lab';

  function readControls(): Controls {
    const c: Controls = { ...controls };
    for (const el of inputs) {
      const k = (el as HTMLElement).dataset.ctl as string;
      c[k] = el.tagName === 'SELECT' ? el.value : Number((el as HTMLInputElement).value);
    }
    return c;
  }

  function writeControls(c: Controls) {
    for (const el of inputs) {
      const k = (el as HTMLElement).dataset.ctl as string;
      if (c[k] === undefined) continue;
      el.value = String(c[k]);
    }
    syncOutputs(c);
  }

  function syncOutputs(c: Controls) {
    for (const [k, el] of outs) {
      if (c[k] === undefined || typeof c[k] !== 'number') continue;
      el.textContent = millions(c[k] as number, loc, 1) + (UNIT[k] || '');
    }
    if (xWrap) xWrap.hidden = c.t !== 'exit-multiple';
  }

  /** Misma traducción que en el build (src/i18n/research.ts -> alertText). */
  function alertText(a: { code: string; level: string; message: string; params?: string[] }) {
    const key = a.code === 'MARGIN_ABOVE_RECORD' && a.level === 'error' ? 'MARGIN_ABOVE_RECORD_NOREASON' : a.code;
    const tpl = p.t.alerts[key];
    if (!tpl) return a.message;
    return tpl.replace(/\{(\d+)\}/g, (_m, i) => (a.params || [])[Number(i)] ?? '');
  }

  function paintAlerts(list: { level: string; code: string; message: string; params?: string[] }[]) {
    if (!alertsBox) return;
    const ul = alertsBox.querySelector('ul');
    const empty = alertsBox.querySelector('p.t-small');
    if (ul) {
      ul.innerHTML = list.map((a) => `<li class="al al-${a.level}"><span class="al-dot" aria-hidden="true"></span><span class="t-small">${escapeHtml(alertText(a))}</span></li>`).join('');
    }
    if (empty) empty.textContent = list.length ? '' : p.t.alertsOk;
    if (empty) (empty as HTMLElement).hidden = list.length > 0;
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function paintSens(sens: any, c: Controls) {
    if (!sensTable) return;
    const head = sensTable.querySelector('thead tr');
    const body = sensTable.querySelector('tbody');
    if (!head || !body) return;
    const first = head.firstElementChild?.outerHTML || '<th scope="col"></th>';
    head.innerHTML = first + sens.gPcts.map((g: number) => `<th scope="col" class="num">${millions(g, loc, 2)}%</th>`).join('');
    body.innerHTML = sens.prices.map((row: (number | null)[], i: number) => {
      const w = sens.waccPcts[i];
      const cells = row.map((v, j) => {
        const on = Math.abs(w - (c.w as number)) < 1e-9 && Math.abs(sens.gPcts[j] - (c.g as number)) < 1e-9;
        return `<td class="num${on ? ' is-on' : ''}">${v === null ? '—' : money(v, loc, 0)}</td>`;
      }).join('');
      return `<tr><th scope="row" class="num">${millions(w, loc, 1)}%</th>${cells}</tr>`;
    }).join('');
  }

  function scenarioRange(name: 'bear' | 'base' | 'bull') {
    const s = p.model.scenarios?.[name];
    if (!s || !s.overrides || !Object.keys(s.overrides).length) return { low: NaN, high: NaN, mid: NaN };
    try {
      const res = runDCF(modelWith(p.model, controls), s.overrides);
      return { low: res.impliedPrice, high: res.impliedPrice, mid: res.impliedPrice };
    } catch { return { low: NaN, high: NaN, mid: NaN }; }
  }

  function paintFF(res: any, sens: any) {
    if (!ffBox) return;
    const flat = sens.prices.flat().filter((x: number | null) => typeof x === 'number') as number[];
    const rows: any[] = [{ label: p.t.ff.lab, low: Math.min(...flat), high: Math.max(...flat), mid: res.impliedPrice, color: 'var(--s1)' }];
    for (const name of ['bear', 'base', 'bull'] as const) {
      const r = scenarioRange(name);
      rows.push({ label: p.t.scen[name], low: r.low, high: r.high, mid: r.mid, color: 'var(--s4)', empty: p.t.ff.empty });
    }
    rows.push({ label: p.t.ff.comps, low: NaN, high: NaN, color: 'var(--s3)', empty: p.t.ff.empty });
    ffBox.innerHTML = footballField({
      rows,
      mark: market !== null ? { value: market, label: p.t.ff.mark } : null,
      fmt: (v: number) => money(v, loc, 0),
      ariaLabel: `${p.t.ff.aria}: ${p.t.ff.lab} ${money(Math.min(...flat), loc, 0)}–${money(Math.max(...flat), loc, 0)}`
    });
  }

  function render() {
    controls = readControls();
    syncOutputs(controls);
    let res: any;
    const live = modelWith(p.model, controls);
    try { res = runDCF(live); } catch (e) {
      paintAlerts([{ level: 'error', code: 'ENGINE_ERROR', message: String((e as Error).message || e) }]);
      return;
    }
    const ranges = defaultRanges(controls.w as number, controls.g as number);
    const sens = sensitivity(live, ranges.waccRange, ranges.gRange);

    if (priceEl) priceEl.textContent = money(res.impliedPrice, loc, 2);
    if (evEl) evEl.textContent = millions(res.ev, loc, 0);
    if (eqEl) eqEl.textContent = millions(res.equity, loc, 0);
    if (tvEl) tvEl.textContent = pct(res.tvShareOfEVPct, loc, 1);
    if (exitEl) exitEl.textContent = times(res.impliedExitMultiple, loc, 1);
    if (vsEl && market !== null && typeof res.impliedPrice === 'number') {
      const d = ((res.impliedPrice / market) - 1) * 100;
      vsEl.hidden = false;
      vsEl.textContent = `${p.t.vsMarket} ${money(market, loc, 2)}: ${d >= 0 ? '+' : '−'}${millions(Math.abs(d), loc, 1)}%`;
    }
    paintAlerts(sanityChecks(live, { ...res, sensitivity: sens }).filter((a: any) => a.code !== 'RATIONALE_PENDING'));
    paintSens(sens, controls);
    paintFF(res, sens);
  }

  let raf = 0;
  const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; render(); }); };

  for (const el of inputs) {
    el.addEventListener('input', schedule);
    el.addEventListener('change', () => { schedule(); syncUrl(); });
  }

  function syncUrl() {
    const qs = encodeControls(controls, p.start);
    const url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    history.replaceState(null, '', url);
  }

  q<HTMLButtonElement>('[data-lab-start]')?.addEventListener('click', () => { writeControls(p.start); render(); syncUrl(); });
  const authorBtn = q<HTMLButtonElement>('[data-lab-author]');
  if (authorBtn && p.author) authorBtn.addEventListener('click', () => { writeControls(p.author as Controls); render(); syncUrl(); });

  const copyBtn = q<HTMLButtonElement>('[data-lab-copy]');
  copyBtn?.addEventListener('click', async () => {
    syncUrl();
    const url = location.href;
    try { await navigator.clipboard.writeText(url); } catch {
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* nada que hacer */ }
      ta.remove();
    }
    copyBtn.textContent = p.t.copied;
    setTimeout(() => { copyBtn.textContent = p.t.copy; }, 2200);
  });

  // Escenarios: cargan los overrides que escriba Jaime; "lab" vuelve a los controles.
  const tabs = qa<HTMLButtonElement>('[data-scen]');
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const name = tab.dataset.scen as string;
      scenario = name;
      for (const t2 of tabs) { t2.setAttribute('aria-pressed', String(t2 === tab)); t2.classList.toggle('is-on', t2 === tab); }
      if (name !== 'lab') {
        const ov = p.model.scenarios?.[name]?.overrides;
        if (ov && Object.keys(ov).length) {
          const c: Controls = { ...controls };
          if (Array.isArray(ov.revenueGrowthPct)) { c.g1 = ov.revenueGrowthPct[0]; c.g2 = ov.revenueGrowthPct[ov.revenueGrowthPct.length - 1]; }
          if (Array.isArray(ov.ebitdaMarginPct)) c.m = ov.ebitdaMarginPct[0];
          if (ov.wacc?.wacc !== undefined) c.w = ov.wacc.wacc;
          if (ov.terminal?.g !== undefined) c.g = ov.terminal.g;
          if (ov.daPctRevenue !== undefined) c.da = ov.daPctRevenue;
          if (ov.capexPctRevenue !== undefined) c.capex = ov.capexPctRevenue;
          if (ov.nwcPctDeltaRevenue !== undefined) c.nwc = ov.nwcPctDeltaRevenue;
          if (ov.taxRatePct !== undefined) c.tax = ov.taxRatePct;
          writeControls(c);
        }
      }
      render();
      syncUrl();
    });
  }

  // Precio de mercado: mismo endpoint que las gráficas del sitio (Yahoo, caché
  // de 60 s). Si falla, la página se queda sin la marca y no pasa nada.
  fetch('/api/history?pair=' + encodeURIComponent(p.history) + '&range=1M')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const pts = j && Array.isArray(j.points) ? j.points : null;
      if (!pts || !pts.length) { marketUnavailable(); return; }
      const lastPoint = pts[pts.length - 1];
      market = Number(lastPoint[1]);
      if (!Number.isFinite(market)) { market = null; marketUnavailable(); return; }
      for (const el of document.querySelectorAll<HTMLElement>('[data-market-price]')) {
        el.textContent = money(market, loc, 2);
        el.classList.remove('skel');
      }
      for (const el of document.querySelectorAll<HTMLElement>('[data-market-date]')) {
        const d = new Date(Number(lastPoint[0]) * 1000);
        el.textContent = new Intl.DateTimeFormat(loc === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
        el.classList.remove('skel');
      }
      for (const wrap of document.querySelectorAll<HTMLElement>('[data-market-chip]')) {
        const chip = wrap.classList.contains('src-chip') ? wrap : wrap.querySelector<HTMLElement>('.src-chip');
        if (!chip) continue;
        chip.dataset.fresh = 'stale';
        const time = chip.querySelector('.sc-time');
        if (time) time.textContent = new Intl.DateTimeFormat(loc === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(Number(lastPoint[0]) * 1000));
      }
      render();
    })
    .catch(marketUnavailable);

  function marketUnavailable() {
    for (const wrap of document.querySelectorAll<HTMLElement>('[data-market-chip]')) {
      const chip = wrap.classList.contains('src-chip') ? wrap : wrap.querySelector<HTMLElement>('.src-chip');
      if (!chip) continue;
      chip.dataset.fresh = 'error';
      const time = chip.querySelector('.sc-time');
      if (time) time.textContent = p.t.unavailable;
    }
  }

  // Estado inicial desde la URL (?w=…&g=…): pinta y recalcula.
  writeControls(controls);
  if (location.search) render();
  void scenario;
}

/** Tabla de comparables: ordenar por cualquier columna con datos. */
function mountComps(table: HTMLTableElement) {
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]'));
  let active = -1, dir = 1;
  for (const [i, th] of heads.entries()) {
    const btn = th.querySelector('button');
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const col = Number(th.dataset.col);
      dir = active === i ? -dir : 1;
      active = i;
      for (const h of heads) h.setAttribute('aria-sort', 'none');
      th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
      const rows = Array.from(tbody.rows);
      rows.sort((a, b) => {
        const av = a.cells[col]?.dataset.v, bv = b.cells[col]?.dataset.v;
        const an = av === undefined || av === '' ? null : Number(av);
        const bn = bv === undefined || bv === '' ? null : Number(bv);
        if (an === null && bn === null) return 0;
        if (an === null) return 1;   // los pendientes siempre al final
        if (bn === null) return -1;
        if (Number.isNaN(an) || Number.isNaN(bn)) return String(av).localeCompare(String(bv)) * dir;
        return (an - bn) * dir;
      });
      for (const r of rows) tbody.appendChild(r);
    });
  }
}

function boot() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-lab]')) mount(el);
  for (const el of document.querySelectorAll<HTMLTableElement>('[data-comps]')) mountComps(el);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
