// Pintores compartidos por /market y las fichas: una Asset row (precio, Δ,
// sparkline) y el chip de fuente/frescura. Los usa market.ts y asset.ts para
// que una fila se vea igual en la lista y en "Relacionados".
import { fmtNum, fmtPct, arrow, dirClass, fmtTime, sparkPath, type Loc } from './format';
import { setNum } from './num';
import { trazar } from './trazo';
import type { Quote, SymbolRT } from './market-data';

export function paintAssetRow(row: HTMLElement | null, s: SymbolRT, q: Quote | null, loc: Loc) {
  if (!row) return;
  const p = row.querySelector<HTMLElement>('.ar-price'), c = row.querySelector<HTMLElement>('.ar-chg'), svg = row.querySelector<SVGSVGElement>('svg.spark');
  if (!q) {
    // Error sin dato previo: "—" y se deja de parpadear. Si ya había algo
    // pintado (caché), se queda: último valor conocido.
    if (row.dataset.state === 'ready') return;
    if (p) { p.textContent = '—'; p.classList.remove('skel'); }
    if (c) { c.textContent = ''; c.classList.remove('skel'); }
    svg?.classList.remove('skel');
    row.dataset.state = 'error';
    return;
  }
  if (p) { setNum(p, fmtNum(q.price, loc, s.decimals)); p.classList.remove('skel'); }
  const pct = q.changePct;
  const dir = pct != null ? dirClass(s.invert ? -pct : pct) : 'flat';
  if (c) {
    c.classList.remove('skel', 'up', 'down', 'flat');
    if (pct != null) {
      c.classList.add(dir);
      // La clave lleva la flecha delante: fmtPct devuelve el valor ABSOLUTO
      // ("0.42 %"), así que sin ella un +0.42 % y un −0.42 % serían el mismo
      // texto y el cambio de signo pasaría sin que se moviera nada.
      setNum(c, arrow(pct) + fmtPct(pct, loc), `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`);
      c.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
    } else { setNum(c, '—'); c.removeAttribute('aria-label'); }
  }
  if (svg) {
    const { line } = sparkPath(q.series || [], 64, 24);
    svg.querySelector('.line')?.setAttribute('d', line);
    svg.setAttribute('class', 'spark trazo-destape ' + dir);
    // El trazado empieza cuando la fila se ve, no cuando llega el dato: en
    // /market hay treinta filas y la mayoría nacen fuera de la pantalla.
    if (line) trazar(svg);
  }
  row.dataset.state = 'ready';
}

export type ChipState = 'fresh' | 'stale' | 'error' | 'loading';
/** Punto verde ≤ cadencia + 2 min, ámbar ≤ 1 h, gris más; rojo si falló. */
export function setChip(chip: HTMLElement | null, when: Date | null, state: ChipState, loc: Loc, T: { loading: string; unavailable: string }, minutes = 15, source?: string) {
  if (!chip) return;
  const time = chip.querySelector<HTMLElement>('.sc-time');
  const src = chip.querySelector<HTMLElement>('.sc-source');
  if (source && src) src.textContent = source;
  if (state === 'error') { chip.dataset.fresh = 'error'; if (time) time.textContent = T.unavailable; return; }
  if (!when) { chip.dataset.fresh = 'loading'; if (time) time.textContent = T.loading; return; }
  const age = (Date.now() - when.getTime()) / 60000;
  chip.dataset.fresh = age <= minutes + 2 ? 'fresh' : age <= 60 ? 'stale' : 'old';
  if (time) time.textContent = fmtTime(when, loc);
}
