// Globo de mercados, la parte en HTML: la leyenda de ocho chips y la tarjeta
// al toque (src/components/home/WorldMarkets.astro).
//
// QUÉ HACE. Pide /api/world UNA vez (y cada 15 min, que es lo que cachea el
// endpoint), calcula si cada bolsa está abierta con exchange-hours.ts y:
//   - rellena los ocho chips (ciudad · ▲▼Δ % · punto abierto/cerrado). Son la
//     leyenda del globo y también el acceso sin WebGL y para lectores de
//     pantalla (lista semántica; el estado va en texto, no solo en el color);
//   - avisa al globo con el evento "world:data" (public/assets/risk-sphere.js
//     pinta los marcadores con el color del día y el halo abierto/cerrado) y
//     con "world:select" cuál está seleccionada;
//   - abre la tarjeta al tocar un chip o un marcador del globo (evento
//     "globe:marker" que manda risk-sphere.js).
//
// Los ocho chips vienen en el HTML con "—": la fila mide lo mismo antes y
// después de los datos (cero CLS). Último valor conocido en localStorage para
// pintar al instante, como el resto del home. Chip de fuente honesto ("Retraso
// 15 min · Yahoo Finance · HH:MM"), nunca "en vivo".
import { fmtNum, fmtPct, arrow, dirClass, fmtTime, type Loc } from './format';
import { exchangeState, localTime, type ExchangeState } from './exchange-hours';

interface WorldItem {
  id: string; city: string; index: string; tz: string; href: string;
  price: number | null; changePct: number | null; asOf: string | null;
  lat?: number; lon?: number; open: boolean; state: ExchangeState | null;
}
interface WorldResponse {
  updatedAt: string; refreshMinutes: number;
  items: Array<{ id: string; price: number | null; changePct: number | null; asOf: string | null; lat?: number; lon?: number }>;
}

const root = document.getElementById('world');
if (root) boot(root);

function boot(root: HTMLElement) {
  const loc: Loc = root.dataset.locale === 'es' ? 'es' : 'en';
  const T = JSON.parse(root.dataset.strings || '{}') as Record<string, string>;
  const sheet = document.getElementById('world-sheet');
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.wm-chip'));
  if (!sheet || !chips.length) return;
  const q = <E extends Element = HTMLElement>(sel: string, from: ParentNode = sheet) => from.querySelector<E>(sel);

  // Lo que se sabe de cada bolsa sale del HTML (ya traducido): id, índice,
  // zona y a dónde lleva "¿Qué es este índice?".
  const items: WorldItem[] = chips.map((b) => ({
    id: b.dataset.id || '', city: q('.wm-city', b)?.textContent?.trim() || b.dataset.id || '',
    index: b.dataset.index || '', tz: b.dataset.tz || '', href: b.dataset.href || '#',
    price: null, changePct: null, asOf: null, open: false, state: null
  }));
  const byId = new Map(items.map((it) => [it.id, it]));
  const chipOf = new Map(chips.map((b) => [b.dataset.id || '', b]));
  let updatedAt: Date | null = null;
  let failed = false;
  let openId: string | null = null, openedAt = 0, opener: HTMLElement | null = null;

  // Si el globo arranca después de los datos (carga diferida), lee esto.
  (window as any).SmartWorld = { get data() { return { items }; }, items };

  // ---- caché local: pinta el último valor conocido y luego refresca ----
  const LS = 'sf-world-cache-v1';
  function readCache(): WorldResponse | null { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } }
  function writeCache(j: WorldResponse) { try { localStorage.setItem(LS, JSON.stringify(j)); } catch {} }

  // ---- pintores ----
  function paintChange(el: HTMLElement, pct: number | null, base: string) {
    if (pct == null) { el.textContent = '—'; el.className = base; el.removeAttribute('aria-label'); return; }
    el.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`;
    el.className = base + ' ' + dirClass(pct);
    el.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
  }
  // Chip de fuente: el punto se colorea por la edad del dato (≤ 17 min verde,
  // ≤ 1 h ámbar, más gris; rojo si la fuente falló sin dato previo).
  function setChip(id: string, state: 'ok' | 'error') {
    const chip = document.getElementById(id); if (!chip) return;
    const time = chip.querySelector<HTMLElement>('.sc-time');
    if (state === 'error' || !updatedAt) {
      chip.dataset.fresh = state === 'error' ? 'error' : 'loading';
      if (time) time.textContent = state === 'error' ? T.unavailable : T.loading;
      return;
    }
    const age = (Date.now() - updatedAt.getTime()) / 60000;
    chip.dataset.fresh = age <= 17 ? 'fresh' : age <= 60 ? 'stale' : 'old';
    if (time) time.textContent = fmtTime(updatedAt, loc);
  }
  function paintChips() {
    items.forEach((it) => {
      const b = chipOf.get(it.id); if (!b) return;
      const chg = q('.wm-chg', b); if (chg) paintChange(chg, it.changePct, 'wm-chg num muted');
      b.classList.toggle('is-open', it.open);
      const sr = q('.wm-sr', b); if (sr) sr.textContent = ' · ' + it.index + ' · ' + (it.open ? T.openSr : T.closedSr);
    });
  }
  function paintSheet(id: string) {
    const it = byId.get(id); if (!it) return;
    q('[data-city]')!.textContent = it.city;
    q('[data-index]')!.textContent = it.index;
    q('[data-price]')!.textContent = it.price != null ? fmtNum(it.price, loc, 2) : '—';
    paintChange(q('[data-chg]')!, it.changePct, 'num ws-chg muted');
    const hours = q('[data-hours]')!;
    const st = it.state;
    hours.textContent = st
      ? (st.open ? `${T.open} ${localTime(st.until, loc)}` : `${T.closed} ${localTime(st.opens, loc)}`) + ` · ${T.regular}`
      : '—';
    hours.classList.toggle('is-open', !!(st && st.open));
    setChip('chip-world-sheet', failed ? 'error' : 'ok');
    q<HTMLAnchorElement>('[data-link]')!.href = it.href;
  }

  // ---- estado abierto/cerrado (cada minuto) y aviso al globo ----
  function refreshState() {
    items.forEach((it) => { const st = exchangeState(it.tz); it.state = st; it.open = !!(st && st.open); });
    paintChips();
    document.dispatchEvent(new CustomEvent('world:data', { detail: { items } }));
    if (openId) paintSheet(openId);
  }

  // ---- datos ----
  function apply(j: WorldResponse) {
    (j.items || []).forEach((src) => {
      const it = byId.get(src.id); if (!it) return;
      it.price = src.price; it.changePct = src.changePct; it.asOf = src.asOf;
      if (typeof src.lat === 'number') it.lat = src.lat;
      if (typeof src.lon === 'number') it.lon = src.lon;
    });
    updatedAt = j.updatedAt ? new Date(j.updatedAt) : null;
    failed = false;
    refreshState();
    setChip('chip-world', 'ok');
  }
  function load() {
    fetch('/api/world', { headers: { accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<WorldResponse>; })
      .then((j) => { apply(j); writeCache(j); })
      .catch(() => { if (!updatedAt) { failed = true; setChip('chip-world', 'error'); if (openId) paintSheet(openId); } });
  }

  // ---- tarjeta ----
  const closeBtn = q<HTMLButtonElement>('.world-sheet-close')!;
  function open(id: string, via: HTMLElement | null) {
    if (!byId.has(id)) return;
    paintSheet(id);
    openId = id; openedAt = Date.now(); opener = via;
    chips.forEach((b) => { const sel = b.dataset.id === id; b.classList.toggle('is-selected', sel); b.setAttribute('aria-expanded', String(sel)); });
    sheet.hidden = false;
    // Un frame después, para que la transición de entrada se vea.
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    document.dispatchEvent(new CustomEvent('world:select', { detail: { id } }));
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    if (!openId) return;
    openId = null;
    sheet.classList.remove('is-open');
    chips.forEach((b) => { b.classList.remove('is-selected'); b.setAttribute('aria-expanded', 'false'); });
    setTimeout(() => { if (!openId) sheet.hidden = true; }, 220);
    document.dispatchEvent(new CustomEvent('world:select', { detail: { id: null } }));
    if (opener) { opener.focus({ preventScroll: true }); opener = null; }
  }
  chips.forEach((b) => b.addEventListener('click', () => { const id = b.dataset.id || ''; if (openId === id) close(); else open(id, b); }));
  closeBtn.addEventListener('click', close);
  document.addEventListener('globe:marker', (e) => { const id = (e as CustomEvent<{ id?: string }>).detail?.id; if (id) open(id, null); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openId) close(); });
  // Toque fuera: cualquier pointerdown que no caiga en la tarjeta ni en un
  // chip, pasados 400 ms de abrirla (el mismo toque que la abre no la cierra).
  document.addEventListener('pointerdown', (e) => {
    if (!openId || Date.now() - openedAt < 400) return;
    const t = e.target as Element | null;
    if (!t || sheet.contains(t) || t.closest('.wm-chip')) return;
    close();
  });
  // Deslizar hacia abajo sobre la tarjeta la cierra.
  let y0: number | null = null;
  sheet.addEventListener('touchstart', (e) => { y0 = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchmove', (e) => { if (y0 !== null && e.touches[0].clientY - y0 > 60) { y0 = null; close(); } }, { passive: true });

  // ---- arranque ----
  const cached = readCache();
  if (cached) apply(cached); else refreshState();
  load();
  setInterval(refreshState, 60000);
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15 * 60000);
}
