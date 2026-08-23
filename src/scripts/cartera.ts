// Refresco de precios de /actinver y /portfolio.
//
// El HTML llega del build con los precios de la ÚLTIMA FOTO del repositorio
// (src/data/<cartera>-history.json). Este script pide a /api/history el cierre
// más reciente de cada posición abierta y repinta. Si no llega nada, la página
// se queda con la foto —que es un precio real de un cierre real— y el chip lo
// dice; nunca se blanquea una cifra que ya estaba bien.
//
// Las cuentas NO están aquí: salen de src/lib/portfolio/cartera.mjs, el mismo
// módulo que usa el build y la tarea nocturna. Este archivo solo pide, formatea
// y mete texto en el DOM.
import { resumen } from '../lib/portfolio/cartera.mjs';
import { dinero, dineroFirmado, pctFirmado, pctSimple, claseDir, dia, frase } from '../lib/portfolio/formato.mjs';
import { getJSON, type History } from './market-data';
import { setChip } from './rows';
import type { Loc } from './format';

interface PosRT {
  ticker: string;
  historyPair: string | null;
  cantidad: number | null;
  peso: number | null;
  entrada: { fecha: string; precio: number };
  estado: 'abierta' | 'cerrada';
  salida: { fecha: string; precio: number } | null;
}
interface Runtime {
  moneda: string;
  capitalInicial: number | null;
  posiciones: PosRT[];
  retraso: number;
  fuente: string;
  fecha: string | null;
  preciosFoto: Record<string, number>;
  textos: Record<string, string>;
}

const raiz = document.querySelector<HTMLElement>('[data-cartera-raiz]');
const bloque = document.querySelector<HTMLScriptElement>('script[data-cartera-datos]');
if (raiz && bloque) {
  let rt: Runtime | null = null;
  try { rt = JSON.parse(bloque.textContent || 'null'); } catch { rt = null; }
  if (rt && rt.posiciones.length) montar(raiz, rt);
}

async function montar(raiz: HTMLElement, rt: Runtime) {
  const loc: Loc = document.documentElement.lang === 'es' ? 'es' : 'en';
  const chip = document.getElementById('cart-chip');
  const T = { loading: rt.textos.loading, unavailable: rt.textos.unavailable };
  const D = (n: number | null) => dinero(n, loc, rt.moneda);
  const DF = (n: number | null) => dineroFirmado(n, loc, rt.moneda);
  const P = (n: number | null) => pctFirmado(n, loc);

  // Una petición por par distinto: dos posiciones del mismo ticker no piden dos
  // veces, y /api/history ya trae 60 s de caché compartida por encima.
  const pares = Array.from(
    new Set(rt.posiciones.filter((p) => p.estado === 'abierta' && p.historyPair).map((p) => p.historyPair as string))
  );
  if (!pares.length) return;

  setChip(chip, null, 'loading', loc, T, rt.retraso, rt.fuente);

  const respuestas = await Promise.allSettled(
    pares.map((par) => getJSON<History>(`/api/history?pair=${encodeURIComponent(par)}&range=1D`))
  );

  const porPar: Record<string, number> = {};
  let ultimoTs = 0;
  respuestas.forEach((res, i) => {
    if (res.status !== 'fulfilled') return;
    const pts = res.value && res.value.points;
    if (!pts || !pts.length) return;
    const [ts, precio] = pts[pts.length - 1];
    if (typeof precio !== 'number' || !isFinite(precio)) return;
    porPar[pares[i]] = precio;
    if (ts > ultimoTs) ultimoTs = ts;
  });

  const frescos = Object.keys(porPar).length;
  if (!frescos) {
    // Ni un precio: la página se queda con la foto y el chip lo dice.
    setChip(chip, null, 'error', loc, T, rt.retraso, rt.fuente);
    return;
  }

  // La foto es el suelo y los precios frescos van encima: así una posición sin
  // dato de hoy conserva su último cierre conocido en vez de perder el número.
  const precios: Record<string, number> = { ...rt.preciosFoto };
  let deLaFoto = 0;
  for (const p of rt.posiciones) {
    if (p.estado !== 'abierta') continue;
    const vivo = p.historyPair ? porPar[p.historyPair] : undefined;
    if (typeof vivo === 'number') precios[p.ticker] = vivo;
    else if (typeof precios[p.ticker] === 'number') deLaFoto++;
  }

  const r = resumen({ capitalInicial: rt.capitalInicial, posiciones: rt.posiciones }, precios);

  // ---- Resumen ----
  poner(raiz, '[data-tile="total"]', D(r.valorTotal));
  const pct = raiz.querySelector<HTMLElement>('[data-tile="pct"]');
  if (pct) {
    pct.textContent = r.variacion ? P(r.variacion.pct) : '—';
    pct.className = 'tile-big num ' + claseDir(r.variacion ? r.variacion.pct : null);
  }
  poner(raiz, '[data-tile="pct-abs"]', r.variacion ? DF(r.variacion.absoluta) : '—');
  ponerExtremo(raiz, 'best', r.mejor, P);
  ponerExtremo(raiz, 'worst', r.peor, P);
  poner(raiz, '[data-tile="cash"]', r.efectivo === null ? '—' : D(r.efectivo));

  // ---- Posiciones ----
  for (const fila of r.filas) {
    const tarjeta = raiz.querySelector<HTMLElement>(`[data-pos="${cssEscape(fila.ticker)}"]`);
    if (!tarjeta) continue;
    poner(tarjeta, '[data-precio]', fila.precio === null ? '—' : D(fila.precio));
    poner(tarjeta, '[data-valor]', fila.valor === null ? '—' : D(fila.valor));
    const pl = tarjeta.querySelector<HTMLElement>('[data-pl]');
    if (pl) {
      pl.textContent = fila.pct === null ? '—' : P(fila.pct);
      pl.className = claseDir(fila.pct);
    }
    poner(tarjeta, '[data-pl-abs]', fila.ganancia === null ? '' : DF(fila.ganancia));
    const peso = fila.valor !== null && r.valorTotal ? (fila.valor / r.valorTotal) * 100 : null;
    poner(tarjeta, '[data-peso]', peso === null ? '—' : pctSimple(peso, loc));
  }

  // ---- Lo que falta ----
  const faltan = raiz.querySelector<HTMLElement>('[data-faltan]');
  if (faltan) {
    faltan.textContent = frase(rt.textos.missing, { tickers: r.faltantes.join(', ') });
    faltan.classList.toggle('oculto', r.faltantes.length === 0);
  }

  // ---- Cadencia y chip ----
  const cadencia = raiz.querySelector<HTMLElement>('[data-cadencia]');
  if (cadencia) {
    let texto = frase(rt.textos.live, { source: rt.fuente, delay: rt.retraso });
    // Mezcla honesta: si alguna posición sigue con el precio de la foto, se dice.
    if (deLaFoto && rt.fecha) texto += ' ' + frase(rt.textos.atClose, { date: dia(rt.fecha, loc) });
    cadencia.textContent = texto;
  }
  setChip(chip, ultimoTs ? new Date(ultimoTs * 1000) : null, 'fresh', loc, T, rt.retraso, rt.fuente);
}

function poner(raiz: ParentNode, sel: string, texto: string) {
  const el = raiz.querySelector<HTMLElement>(sel);
  if (el) el.textContent = texto;
}

function ponerExtremo(
  raiz: ParentNode,
  cual: 'best' | 'worst',
  fila: { ticker: string; pct: number | null } | null,
  P: (n: number | null) => string
) {
  poner(raiz, `[data-tile="${cual}"]`, fila ? fila.ticker : '—');
  const el = raiz.querySelector<HTMLElement>(`[data-tile="${cual}-pct"]`);
  if (!el) return;
  el.textContent = fila && fila.pct !== null ? P(fila.pct) : '';
  el.className = 't-caption num ' + claseDir(fila ? fila.pct : null);
}

/** Los tickers son [A-Z0-9&.-]; se escapan igual para no romper el selector. */
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
