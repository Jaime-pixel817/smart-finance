// La cinta de "La mesa" (/cv/<codigo>): precio, cambio del día y sparkline de
// tres activos, pedidos a /api/history al abrir la página.
//
// POR QUÉ EXISTE Y NO SE REUSA market.ts. Aquel pinta las filas de /market
// desde /api/markets y /api/quotes, con watchlist, secciones y caché en
// localStorage. Aquí hacen falta tres precios y una raya, y lo que importa es
// lo que pasa cuando NO llegan. Lo que sí se reutiliza es todo lo que sabe
// algo: la capa de datos (market-data.ts, con su memoria de 60 s), el chip de
// frescura (rows.ts), el formateo (format.ts) y el trazado (trazo.ts).
//
// LO QUE ESTE MÓDULO NO HACE, Y ES LO IMPORTANTE:
//
//   · No escribe una cifra si no llegó. El HTML nace con una raya en cada
//     precio —no con un esqueleto, que sin JavaScript late para siempre— y si
//     el endpoint falla, la raya se queda y el chip pasa a "sin datos". Nunca
//     se blanquea un número que ya estaba bien.
//   · No dice "en vivo". El chip lleva el retraso real y la hora del dato.
//   · No pide dos veces lo mismo. La página lleva DOS cintas (inglés y
//     español, el mismo documento), así que los pares se juntan primero y cada
//     uno se pide UNA vez para las dos.
//   · No mete idioma en el JavaScript: los dos textos del chip vienen en el
//     `data-strings` de cada cinta, escritos por Astro con useT().
import { getJSON, type History } from './market-data';
import { setChip } from './rows';
import { fmtNum, fmtPct, arrow, dirClass, sparkPath, type Loc } from './format';
import { trazar } from './trazo';

interface Textos { loading: string; unavailable: string }
interface Fila { el: HTMLElement; loc: Loc }

/** Lo que dice el chip: el proveedor de /api/history y su retraso. */
const FUENTE = 'Yahoo Finance';
const RETRASO = 15;

const raices = Array.from(document.querySelectorAll<HTMLElement>('[data-cinta]'));
if (raices.length) pintar(raices);

async function pintar(raices: HTMLElement[]) {
  // Un par puede salir en las dos cintas: se piden UNA vez y se pintan todas.
  const porPar = new Map<string, Fila[]>();
  for (const raiz of raices) {
    const loc: Loc = raiz.dataset.loc === 'es' ? 'es' : 'en';
    for (const el of Array.from(raiz.querySelectorAll<HTMLElement>('[data-cinta-fila]'))) {
      const par = el.dataset.pair;
      if (!par) continue;
      porPar.set(par, [...(porPar.get(par) || []), { el, loc }]);
    }
  }
  if (!porPar.size) return;

  for (const raiz of raices) chip(raiz, null, 'loading');

  const pares = Array.from(porPar.keys());
  const res = await Promise.allSettled(
    pares.map((par) => getJSON<History>(`/api/history?pair=${encodeURIComponent(par)}&range=1D`))
  );

  let ultimoTs = 0;
  let conDato = 0;
  res.forEach((r, i) => {
    const filas = porPar.get(pares[i]) || [];
    const puntos = r.status === 'fulfilled' ? r.value?.points || [] : [];
    if (!puntos.length) return;   // la fila se queda con su raya

    const ultimo = puntos[puntos.length - 1];
    const precio = ultimo[1];
    if (typeof precio !== 'number' || !isFinite(precio)) return;

    // La base del "cambio de hoy" es el cierre anterior cuando el endpoint lo
    // manda (es lo que compara todo el mundo); si no, el primer punto de la
    // serie. Sin base no hay porcentaje, y entonces no se enseña ninguno: un
    // cambio calculado contra otra cosa no es el mismo número.
    const prev = r.status === 'fulfilled' ? r.value?.prevClose : null;
    const base = typeof prev === 'number' && isFinite(prev) && prev !== 0 ? prev : puntos[0][1];
    const pct = typeof base === 'number' && base ? ((precio - base) / base) * 100 : null;
    const serie = puntos.map((p) => p[1]);

    conDato++;
    if (ultimo[0] > ultimoTs) ultimoTs = ultimo[0];
    for (const f of filas) fila(f, precio, pct, serie);
  });

  const estado = conDato ? 'fresh' : 'error';
  const cuando = ultimoTs ? new Date(ultimoTs * 1000) : null;
  for (const raiz of raices) chip(raiz, cuando, estado);
}

function fila({ el, loc }: Fila, precio: number, pct: number | null, serie: number[]) {
  const dec = Number(el.dataset.dec);
  const p = el.querySelector<HTMLElement>('[data-precio]');
  if (p) p.textContent = fmtNum(precio, loc, isFinite(dec) ? dec : 2);

  const c = el.querySelector<HTMLElement>('[data-cambio]');
  if (c) {
    c.classList.remove('up', 'down', 'flat');
    if (pct === null) {
      c.textContent = '';
      c.removeAttribute('aria-label');
    } else {
      const dir = dirClass(pct);
      c.classList.add(dir);
      // La flecha va oculta al lector de pantalla y el signo va en el
      // aria-label: "▲ 0.42 %" leído en voz alta no dice si sube o baja.
      c.innerHTML = `<span aria-hidden="true">${arrow(pct)}</span> ${fmtPct(pct, loc)}`;
      c.setAttribute('aria-label', (pct >= 0 ? '+' : '−') + fmtPct(pct, loc));
    }
  }

  const svg = el.querySelector<SVGSVGElement>('svg.spark');
  if (svg) {
    const { line } = sparkPath(serie, 64, 24);
    if (line) {
      svg.querySelector('.line')?.setAttribute('d', line);
      svg.setAttribute('class', 'spark trazo-destape ' + (pct === null ? 'flat' : dirClass(pct)));
      trazar(svg);
    }
  }
}

function chip(raiz: HTMLElement, cuando: Date | null, estado: 'fresh' | 'error' | 'loading') {
  const el = raiz.querySelector<HTMLElement>('.cinta-chip');
  if (!el) return;
  const loc: Loc = raiz.dataset.loc === 'es' ? 'es' : 'en';
  let T: Textos = { loading: '…', unavailable: '—' };
  try { T = { ...T, ...JSON.parse(raiz.dataset.strings || '{}') }; } catch { /* los de arriba */ }
  setChip(el, cuando, estado, loc, T, RETRASO, FUENTE);
}
