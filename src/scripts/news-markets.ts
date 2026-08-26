// Los chips de activos y la mini gráfica de las noticias.
//
// Una noticia dice qué activos toca (src/data/news/*.json → simbolos); aquí se
// les pone el cambio del día y al principal su sparkline. Los datos salen de
// los endpoints que YA existen — /api/markets (acciones y cripto) y /api/quotes
// (divisas y VIX) —, nunca de símbolos nuevos: la cuota de Twelve Data está
// contada (CLAUDE.md).
//
// Una sola petición por endpoint y por página, compartida por todas las
// tarjetas: si en /news hay diez noticias que mencionan el SPY, se pide una vez.
import { fmtPct, arrow, dirClass, sparkPath, type Loc } from './format';
import { trazar } from './trazo';

/** Lo que el HTML pasa en data-activos: un extracto de src/data/symbols.ts. */
export interface ActivoUI {
  id: string; sym: string; name: string;
  feed: 'markets' | 'quotes' | 'static'; feedKey: string;
  href: string;
}

type Cotizacion = { changePct: number; series?: number[] };

let promesa: Promise<Map<string, Cotizacion>> | null = null;

/** Cotizaciones de todo lo que el sitio sabe pedir, indexadas por id de activo. */
function cotizaciones(activos: ActivoUI[]): Promise<Map<string, Cotizacion>> {
  if (promesa) return promesa;
  const necesitaMarkets = activos.some((a) => a.feed === 'markets');
  const necesitaQuotes = activos.some((a) => a.feed === 'quotes');
  const pedir = (url: string) =>
    fetch(url, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

  promesa = Promise.all([
    necesitaMarkets ? pedir('/api/markets') : Promise.resolve(null),
    necesitaQuotes ? pedir('/api/quotes') : Promise.resolve(null)
  ]).then(([m, q]) => {
    const porClave = new Map<string, Cotizacion>();
    if (m) {
      for (const grupo of [m.stocks, m.crypto]) {
        for (const it of (grupo && grupo.items) || []) porClave.set('markets:' + it.sym, it);
      }
    }
    if (q && q.items) {
      for (const clave of Object.keys(q.items)) porClave.set('quotes:' + clave, q.items[clave]);
    }
    const porId = new Map<string, Cotizacion>();
    for (const a of activos) {
      const c = porClave.get(a.feed + ':' + a.feedKey);
      if (c && typeof c.changePct === 'number') porId.set(a.id, c);
    }
    return porId;
  });
  return promesa;
}

/**
 * Rellena los chips `[data-activo]` y las sparklines `[data-spark]` que haya
 * dentro de `raiz`. Se puede llamar varias veces (el índice la llama cada vez
 * que pinta tarjetas): la petición se hace una sola vez.
 *
 * Si un activo no llega, su chip se queda con el símbolo y sin cifra en vez de
 * enseñar un cero: es más honesto que inventar que no se movió.
 */
export function aplicarMercados(raiz: ParentNode, loc: Loc, activos: ActivoUI[]): void {
  const chips = Array.from(raiz.querySelectorAll<HTMLElement>('[data-activo]'));
  const sparks = Array.from(raiz.querySelectorAll<SVGSVGElement>('svg[data-spark]'));
  if (!chips.length && !sparks.length) return;

  cotizaciones(activos).then((datos) => {
    for (const chip of chips) {
      const c = datos.get(chip.dataset.activo!);
      const num = chip.querySelector<HTMLElement>('.num');
      if (!c || !num) { chip.dataset.estado = 'sin-dato'; continue; }
      num.innerHTML = `<span aria-hidden="true">${arrow(c.changePct)}</span> ${fmtPct(c.changePct, loc)}`;
      num.className = 'num ' + dirClass(c.changePct);
      num.setAttribute('aria-label', (c.changePct >= 0 ? '+' : '−') + fmtPct(c.changePct, loc));
      chip.dataset.estado = 'listo';
    }
    for (const svg of sparks) {
      const c = datos.get(svg.dataset.spark!);
      const linea = svg.querySelector('.line');
      const area = svg.querySelector('.fill');
      if (!c || !c.series || c.series.length < 2 || !linea) { svg.classList.remove('skel'); svg.setAttribute('hidden', ''); continue; }
      const { line, area: a } = sparkPath(c.series, 240, 64, 2);
      linea.setAttribute('d', line);
      if (area) area.setAttribute('d', a);
      svg.classList.remove('skel');
      svg.classList.add(dirClass(c.changePct));
      trazar(svg);
    }
  }).catch(() => {
    for (const chip of chips) chip.dataset.estado = 'sin-dato';
    for (const svg of sparks) { svg.classList.remove('skel'); svg.setAttribute('hidden', ''); }
  });
}
