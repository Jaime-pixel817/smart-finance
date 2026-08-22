// Capa de datos de /market y de las fichas: qué endpoint se pide, cómo se
// normaliza cada activo a una "cotización" común y cómo se reparte el
// historial por rangos. Una petición por superficie: /api/markets (acciones e
// índices + cripto), /api/quotes (divisas + VIX) y /api/history por par y
// rango. 1M y 3M se recortan del 1A ya pedido (misma granularidad diaria):
// cambiar de pestaña no vuelve a pedir nada.
import type { Feed, Session } from '../data/symbols';

export type Range = '1D' | '1M' | '3M' | '1Y' | '5Y';
export const RANGES: Range[] = ['1D', '1M', '3M', '1Y', '5Y'];
/** [timestamp en segundos, valor] — el formato de /api/history. */
export type Point = [number, number];

export interface SymbolRT {
  id: string; sym: string; kind: string; session: Session; feed: Feed; feedKey: string;
  history?: string; decimals: number; axisDecimals: number; invert?: boolean; source: string; delay: number;
}

export type MarketItem = { sym: string; name: string; note?: string; price: number; change?: number; changePct: number | null; series?: number[] };
export type Markets = { updatedAt: string; refreshMinutes: number; stocks: { source: string | null; items: MarketItem[] }; crypto: { source: string | null; items: MarketItem[] } };
export type QuoteItem = { pair: string; price: number; prevClose: number | null; change: number | null; changePct: number | null; lastTs: number; high52: number | null; low52: number | null; dayHigh: number | null; dayLow: number | null; series: number[]; currency?: string | null };
export type Quotes = { updatedAt: string; refreshMinutes: number; source: string; items: Record<string, QuoteItem> };
export type History = { pair: string; range: string; currency?: string; points: Point[] };

/** Cotización normalizada: lo que pintan las filas y la cabecera de la ficha. */
export interface Quote {
  price: number; change: number | null; changePct: number | null; series: number[];
  prevClose: number | null; lastTs: number | null; high52: number | null; low52: number | null;
  source: string; updatedAt: Date | null; refreshMinutes: number;
}

// ---- fetch con memoria corta: dos superficies de la misma página no piden
// dos veces la misma URL en el mismo minuto. ----
const inflight = new Map<string, { at: number; p: Promise<unknown> }>();
const MEMO_MS = 60 * 1000;
export function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const hit = inflight.get(url);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.p as Promise<T>;
  const p = fetch(url, { signal, headers: { accept: 'application/json' } }).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<T>;
  });
  p.catch(() => inflight.delete(url));
  inflight.set(url, { at: Date.now(), p });
  return p;
}

export const loadMarkets = (signal?: AbortSignal) => getJSON<Markets>('/api/markets', signal);
export const loadQuotes = (signal?: AbortSignal) => getJSON<Quotes>('/api/quotes', signal);

// ---- último valor conocido (localStorage) ----
export function readLS<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---- historial por rango ----
const DAYS: Partial<Record<Range, number>> = { '1M': 31, '3M': 92 };
export async function loadHistory(pair: string, range: Range, signal?: AbortSignal): Promise<History> {
  const days = DAYS[range];
  if (!days) return getJSON<History>(`/api/history?pair=${encodeURIComponent(pair)}&range=${range}`, signal);
  // 1M y 3M salen del 1A: mismos cierres diarios, una petición menos.
  const year = await getJSON<History>(`/api/history?pair=${encodeURIComponent(pair)}&range=1Y`, signal);
  return { ...year, range, points: sliceDays(year.points, days) };
}

/** Últimos N días (contados desde el último punto, no desde "ahora"). */
export function sliceDays(points: Point[], days: number): Point[] {
  if (!points.length) return points;
  const from = points[points.length - 1][0] - days * 86400;
  return points.filter((p) => p[0] >= from);
}

/** Cambio % entre el último punto y el primero con ≥ N días de antigüedad. */
export function changeOver(points: Point[], days: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const from = last[0] - days * 86400;
  const base = points.find((p) => p[0] >= from);
  if (!base || !base[1]) return null;
  return ((last[1] - base[1]) / base[1]) * 100;
}

export function minMax(points: Point[]): { low: number; high: number } | null {
  if (!points.length) return null;
  let low = Infinity, high = -Infinity;
  for (const [, v] of points) { if (v < low) low = v; if (v > high) high = v; }
  return { low, high };
}

// ---- de respuesta de endpoint a cotización común ----
export function quoteFromMarkets(s: SymbolRT, m: Markets): Quote | null {
  const items = s.kind === 'crypto' ? m.crypto?.items : m.stocks?.items;
  const it = items?.find((i) => i.sym === s.feedKey);
  if (!it || typeof it.price !== 'number') return null;
  const pct = typeof it.changePct === 'number' ? it.changePct : null;
  const prev = pct != null && pct !== -100 ? it.price / (1 + pct / 100) : null;
  return {
    price: it.price, change: typeof it.change === 'number' ? it.change : prev != null ? it.price - prev : null, changePct: pct,
    series: it.series || [], prevClose: prev, lastTs: m.updatedAt ? Math.floor(new Date(m.updatedAt).getTime() / 1000) : null,
    high52: null, low52: null,
    source: (s.kind === 'crypto' ? m.crypto?.source : m.stocks?.source) || s.source,
    updatedAt: m.updatedAt ? new Date(m.updatedAt) : null, refreshMinutes: m.refreshMinutes || 15
  };
}
export function quoteFromQuotes(s: SymbolRT, q: Quotes): Quote | null {
  const it = q.items?.[s.feedKey];
  if (!it || typeof it.price !== 'number') return null;
  return {
    price: it.price, change: it.change, changePct: it.changePct, series: it.series || [],
    prevClose: it.prevClose, lastTs: it.lastTs, high52: it.high52, low52: it.low52,
    source: q.source || s.source, updatedAt: q.updatedAt ? new Date(q.updatedAt) : null, refreshMinutes: q.refreshMinutes || 15
  };
}
/** Sin endpoint de cotización (cripto sin CoinGecko, etc.): la serie 1D hace de cotización. */
export function quoteFromHistory(h: History, source: string): Quote | null {
  const pts = h.points;
  if (!pts || pts.length < 2) return null;
  const first = pts[0][1], last = pts[pts.length - 1];
  return {
    price: last[1], change: last[1] - first, changePct: first ? ((last[1] - first) / first) * 100 : null,
    series: pts.map((p) => p[1]), prevClose: null, lastTs: last[0], high52: null, low52: null,
    source, updatedAt: new Date(last[0] * 1000), refreshMinutes: 5
  };
}
