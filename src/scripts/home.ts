// Script del home "Hoy": línea de fecha/estado, pulso, historia del día,
// mercados en 60 s y boletín. Vanilla, sin islas: una petición por superficie,
// último valor conocido en localStorage para pintar al instante, y chips de
// frescura honestos (nunca "en vivo").
import { fmtNum, fmtPct, arrow, dirClass, fmtTime, fmtDay, sparkPath, type Loc } from './format';
import { nyseOpen, bmvOpen } from './hours';

const root = document.getElementById('home') as HTMLElement | null;
if (root) boot(root);

type MarketItem = { sym: string; name: string; price: number; change?: number; changePct: number; series?: number[] };
type Markets = { updatedAt: string; refreshMinutes: number; stocks: { source: string; items: MarketItem[] }; crypto: { source: string; items: MarketItem[] } };
type Sparks = { series: Record<string, number[]>; points: number };
type NewsItem = { title: string; link: string; description: string; pubDate: string; take?: { en: string; es: string } };
type News = { source: string; items: NewsItem[] };

function boot(root: HTMLElement) {
  const loc = (root.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const T = JSON.parse(root.dataset.strings || '{}') as Record<string, string>;
  const $ = <E extends Element = HTMLElement>(sel: string, from: ParentNode = root) => from.querySelector<E>(sel);
  const $$ = <E extends Element = HTMLElement>(sel: string, from: ParentNode = root) => Array.from(from.querySelectorAll<E>(sel));

  // ---- caché local: pinta el último valor conocido y luego refresca ----
  const LS = 'sf-home-cache-v1';
  function readCache(): { markets?: Markets; sparks?: Sparks; news?: News; at?: number } {
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; }
  }
  function writeCache(patch: Record<string, unknown>) {
    try { localStorage.setItem(LS, JSON.stringify({ ...readCache(), ...patch, at: Date.now() })); } catch {}
  }

  // ---- 1. Línea "Hoy" ------------------------------------------------------
  function paintToday() {
    const now = new Date();
    const el = $('#today-line');
    if (!el) return;
    const day = fmtDay(now, loc);
    // Horario regular, sin feriados (src/scripts/hours.ts). Es una orientación,
    // no una promesa: el dato de cada tile trae su propio chip de frescura.
    const nyse = nyseOpen(now);
    const bmv = bmvOpen(now);
    const st = (b: boolean) => `<span class="${b ? 'st-open' : 'st-closed'}">${b ? T.open : T.closed}</span>`;
    el.innerHTML = `<span class="today-day">${day}</span> <span aria-hidden="true">·</span> NYSE ${st(nyse)} <span aria-hidden="true">·</span> BMV ${st(bmv)}`;
    el.classList.remove('skel');
  }
  paintToday();

  // Frase de bienvenida, solo la primera visita.
  const intro = $('#today-intro');
  if (intro) {
    // Si ya la vio, el script inline del <head> puso html.intro-seen antes de pintar (sin CLS).
    $('#today-intro-x')?.addEventListener('click', () => { intro.hidden = true; try { localStorage.setItem('sf-intro-seen', '1'); } catch {} });
  }

  // ---- chips de fuente ----
  function setChip(id: string, when: Date | null, state: 'fresh' | 'stale' | 'error' | 'loading', minutes?: number) {
    const chip = $('#' + id);
    if (!chip) return;
    const time = $('.sc-time', chip);
    if (state === 'error') { chip.dataset.fresh = 'error'; if (time) time.textContent = T.unavailable; return; }
    if (!when) { chip.dataset.fresh = 'loading'; if (time) time.textContent = T.loading; return; }
    const age = (Date.now() - when.getTime()) / 60000;
    const limit = minutes ?? 15;
    chip.dataset.fresh = age <= limit + 2 ? 'fresh' : age <= 60 ? 'stale' : 'old';
    if (time) time.textContent = fmtTime(when, loc);
  }

  // ---- 2. Pulso ------------------------------------------------------------
  const tiles = $$('[data-tile]');
  function paintTile(id: string, price: number | null, pct: number | null, series: number[] | null, decimals: number, opts: { closed?: boolean; text?: string } = {}) {
    const tile = tiles.find((t) => t.dataset.tile === id);
    if (!tile) return;
    const p = $('.tile-price', tile), c = $('.tile-chg', tile), s = $<SVGSVGElement>('svg.spark', tile);
    if (p) {
      p.textContent = opts.text ?? (price != null ? fmtNum(price, loc, decimals) : '—');
      p.classList.remove('skel');
    }
    if (c) {
      c.classList.remove('skel', 'up', 'down', 'flat');
      if (pct != null) {
        c.classList.add(dirClass(pct));
        c.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`;
        c.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
      } else if (opts.closed) {
        c.classList.add('flat');
        c.textContent = T.closed;
      } else { c.textContent = ''; }
    }
    if (s) {
      const { line, area } = series ? sparkPath(series, 56, 24) : { line: '', area: '' };
      const lp = s.querySelector('.line'), ap = s.querySelector('.fill');
      if (lp) lp.setAttribute('d', line);
      if (ap) ap.setAttribute('d', area);
      s.classList.remove('skel');
      s.classList.remove('up', 'down', 'flat');
      if (pct != null) s.classList.add(dirClass(pct));
    }
    tile.dataset.state = 'ready';
  }

  function applyMarkets(m: Markets, fromCache: boolean) {
    const byId = new Map<string, MarketItem>();
    m.stocks?.items?.forEach((i) => byId.set(i.sym, i));
    m.crypto?.items?.forEach((i) => byId.set(i.sym, i));
    for (const id of ['SPY', 'QQQ', 'DIA']) { const i = byId.get(id); if (i) paintTile(id, i.price, i.changePct, i.series || null, 2); }
    for (const id of ['BTC', 'ETH']) { const i = byId.get(id); if (i) paintTile(id, i.price, i.changePct, i.series || null, i.price < 100 ? 2 : 0); }
    // Chips de impacto en la historia
    $$('[data-impact]').forEach((chip) => {
      const i = byId.get(chip.dataset.impact!);
      if (!i) return;
      const v = $('.num', chip);
      if (v) { v.innerHTML = `<span aria-hidden="true">${arrow(i.changePct)}</span> ${fmtPct(i.changePct, loc)}`; v.className = 'num ' + dirClass(i.changePct); }
      chip.hidden = false;
    });
    paintMarkets60(m);
    const when = m.updatedAt ? new Date(m.updatedAt) : null;
    setChip('chip-pulse', when, fromCache ? 'stale' : 'fresh', m.refreshMinutes || 15);
    setChip('chip-m60', when, fromCache ? 'stale' : 'fresh', m.refreshMinutes || 15);
  }
  function applySparks(s: Sparks, fromCache: boolean) {
    const fx = s.series?.['USD/MXN'];
    if (fx && fx.length > 1) {
      const last = fx[fx.length - 1], first = fx[0];
      const pct = ((last - first) / first) * 100;
      paintTile('USDMXN', last, pct, fx, 2);
      const chip = $('[data-impact="USDMXN"]');
      if (chip) {
        const v = $('.num', chip);
        if (v) { v.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`; v.className = 'num ' + dirClass(pct); }
        chip.hidden = false;
      }
    }
    void fromCache;
  }
  function paintRates() {
    // Valores estáticos verificados a mano (src/data/home.ts → data-*).
    const v = root.dataset.ratesVerified;
    if (!v) return;
    const ageDays = (Date.now() - new Date(v + 'T12:00:00Z').getTime()) / 86400000;
    const maxDias = Number(root.dataset.ratesMaxDays || 60);
    if (ageDays > maxDias) { ['BANXICO', 'FED'].forEach((id) => { const t = tiles.find((x) => x.dataset.tile === id); if (t) t.hidden = true; }); return; }
    const bx = Number(root.dataset.banxico), fmin = Number(root.dataset.fedMin), fmax = Number(root.dataset.fedMax);
    paintTile('BANXICO', null, null, null, 2, { text: fmtNum(bx, loc, 2) + ' %' });
    paintTile('FED', null, null, null, 2, { text: fmtNum(fmin, loc, 2) + '–' + fmtNum(fmax, loc, 2) });
    const d = new Date(v + 'T12:00:00Z');
    const chip = $('#chip-rates'); if (chip) { chip.dataset.fresh = 'fresh'; const t = $('.sc-time', chip); if (t) t.textContent = fmtDay(d, loc); }
  }
  paintRates();

  // ---- 3. Mercados en 60 s -------------------------------------------------
  function paintMarkets60(m: Markets) {
    const list = $('#m60-list');
    if (!list) return;
    const all: MarketItem[] = [...(m.stocks?.items || []), ...(m.crypto?.items || [])];
    // Mayores movimientos del día, con tope de 2 cripto para que la lista no
    // sea solo monedas (se mueven más que todo lo demás casi siempre).
    const cryptoSyms = new Set((m.crypto?.items || []).map((i) => i.sym));
    const sorted = all.filter((i) => typeof i.changePct === 'number').sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    const top: MarketItem[] = []; let nCrypto = 0;
    for (const i of sorted) { if (cryptoSyms.has(i.sym)) { if (nCrypto >= 2) continue; nCrypto++; } top.push(i); if (top.length === 5) break; }
    const rows = $$('.m60-row', list);
    const hrefs = JSON.parse(root.dataset.assetHrefs || '{}') as Record<string, string>;
    top.forEach((i, k) => {
      const row = rows[k]; if (!row) return;
      const a = row.querySelector('a'); if (a && hrefs[i.sym]) a.href = hrefs[i.sym];
      const dec = i.price < 100 ? 2 : i.price < 10000 ? 2 : 0;
      const sy = $('.m60-sym', row)!; sy.textContent = i.sym; sy.classList.remove('skel');
      const nm = $('.m60-name', row)!; nm.textContent = i.name || ''; nm.classList.remove('skel');
      const pr = $('.m60-price', row)!; pr.textContent = fmtNum(i.price, loc, dec); pr.classList.remove('skel');
      const ch = $('.m60-chg', row)!; ch.className = 'm60-chg num ' + dirClass(i.changePct); ch.innerHTML = `<span aria-hidden="true">${arrow(i.changePct)}</span> ${fmtPct(i.changePct, loc)}`;
      const s = $<SVGSVGElement>('svg.spark', row);
      if (s) { const { line } = sparkPath(i.series || [], 64, 24); s.querySelector('.line')?.setAttribute('d', line); s.classList.remove('skel'); s.setAttribute('class', 'spark ' + dirClass(i.changePct)); }
      row.classList.remove('is-loading');
      (row as HTMLElement).dataset.state = 'ready';
    });
  }

  // ---- 4. La historia de hoy ----------------------------------------------
  function applyNews(n: News, fromCache: boolean) {
    const it = n.items?.[0];
    const box = $('#story');
    if (!box || !it) { setChip('chip-story', null, 'error'); return; }
    const title = $('#story-title'); if (title) { title.textContent = it.title; title.classList.remove('skel'); }
    const what = $('#story-what'); if (what) { what.textContent = it.description || ''; what.classList.remove('skel'); }
    const why = $('#story-why');
    const take = it.take?.[loc] || it.take?.en || '';
    if (why) { why.textContent = take; why.classList.remove('skel'); if (!take) why.closest('.story-block')?.setAttribute('hidden', ''); }
    const link = $<HTMLAnchorElement>('#story-link'); if (link) { link.href = it.link; link.hidden = false; }
    const when = it.pubDate ? new Date(it.pubDate) : null;
    const kt = $('#story-time'); if (kt && when) kt.textContent = fmtDay(when, loc) + ' · ' + fmtTime(when, loc);
    setChip('chip-story', when, fromCache ? 'stale' : 'fresh', 60);
    const chip = $('#chip-story'); if (chip) chip.dataset.fresh = 'fresh';
    box.dataset.state = 'ready';
  }

  // ---- Pintar caché, luego pedir ----
  const cache = readCache();
  if (cache.markets) applyMarkets(cache.markets, true);
  if (cache.sparks) applySparks(cache.sparks, true);
  if (cache.news) applyNews(cache.news, true);

  const ctrl = new AbortController();
  const get = <T,>(url: string) => fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<T>; });

  get<Markets>('/api/markets').then((m) => { applyMarkets(m, false); writeCache({ markets: m }); }).catch(() => { if (!cache.markets) { setChip('chip-pulse', null, 'error'); setChip('chip-m60', null, 'error'); tiles.forEach((t) => { if (['SPY','QQQ','DIA','BTC','ETH'].includes(t.dataset.tile!)) paintTile(t.dataset.tile!, null, null, null, 2, { text: '—' }); }); } });
  get<Sparks>('/api/sparklines').then((s) => { applySparks(s, false); writeCache({ sparks: s }); }).catch(() => { if (!cache.sparks) paintTile('USDMXN', null, null, null, 2, { text: '—' }); });
  get<News>('/api/news').then((n) => { applyNews(n, false); writeCache({ news: n }); }).catch(() => { if (!cache.news) { const s = $('#story'); if (s) { s.dataset.state = 'error'; const e = $('#story-error'); if (e) e.hidden = false; } setChip('chip-story', null, 'error'); } });

  // Refresco suave cada 15 min mientras la pestaña esté visible.
  setInterval(() => { if (document.visibilityState === 'visible') { get<Markets>('/api/markets').then((m) => { applyMarkets(m, false); writeCache({ markets: m }); }).catch(() => {}); paintToday(); } }, 15 * 60 * 1000);

  // ---- 5. Boletín ----------------------------------------------------------
  const form = $<HTMLFormElement>('#newsletterForm');
  if (form) {
    const email = $<HTMLInputElement>('#newsletterEmail', form)!, consent = $<HTMLInputElement>('#newsletterConsent', form)!, trap = $<HTMLInputElement>('#newsletterWebsite', form)!, out = $('#newsletterEstado', form)!, btn = $<HTMLButtonElement>('button[type="submit"]', form)!;
    const show = (msg: string, cls: string) => { out.textContent = msg; out.className = 'nl-status' + (cls ? ' ' + cls : ''); };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(v)) { show(T.nlBadEmail, 'error'); email.focus(); return; }
      if (!consent.checked) { show(T.nlNoConsent, 'error'); consent.focus(); return; }
      const label = btn.textContent; btn.disabled = true; btn.textContent = T.nlSending; show('', '');
      try {
        const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, consent: true, website: trap.value, lang: loc }) });
        if (res.ok) { show(T.nlOk, 'ok'); form.reset(); }
        else { const d = await res.json().catch(() => ({})); const map: Record<string, string> = { invalid_email: T.nlBadEmail, consent_required: T.nlNoConsent, rate_limited: T.nlLimit }; show(map[d.error] || T.nlError, 'error'); }
      } catch { show(T.nlError, 'error'); }
      finally { btn.disabled = false; btn.textContent = label; }
    });
  }

  // ---- 6. Globo (diferido, respeta reduced-motion) -------------------------
  const globe = document.getElementById('globalRiskGlobe');
  if (globe && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    let loaded = false;
    const load = () => {
      if (loaded) return; loaded = true;
      const s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s1.async = true;
      s1.onload = () => { const s2 = document.createElement('script'); s2.type = 'module'; s2.src = '/assets/risk-sphere.js'; document.body.appendChild(s2); };
      document.body.appendChild(s1);
    };
    const io = new IntersectionObserver((entries) => { if (entries.some((en) => en.isIntersecting)) { io.disconnect(); const idle = (window as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 600)); idle(load); } }, { rootMargin: '200px 0px' });
    // Espera al evento load para no competir con el primer pintado.
    if (document.readyState === 'complete') io.observe(globe); else window.addEventListener('load', () => io.observe(globe), { once: true });
  } else if (globe) {
    globe.classList.add('globe-static');
  }
}
