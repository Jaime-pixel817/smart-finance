// Formato de números y fechas por idioma (Intl). Sin dependencias.
export type Loc = 'en' | 'es';
const LOCALE_TAG: Record<Loc, string> = { en: 'en-US', es: 'es-MX' };

export function fmtNum(n: number, loc: Loc, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE_TAG[loc], { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}
export function fmtPct(n: number, loc: Loc): string {
  const s = new Intl.NumberFormat(LOCALE_TAG[loc], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  return s + ' %';
}
export function arrow(n: number): string { return n > 0.0001 ? '▲' : n < -0.0001 ? '▼' : '·'; }
export function dirClass(n: number): string { return n > 0.0001 ? 'up' : n < -0.0001 ? 'down' : 'flat'; }
export function fmtTime(d: Date, loc: Loc): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[loc], { hour: '2-digit', minute: '2-digit' }).format(d);
}
export function fmtDay(d: Date, loc: Loc): string {
  const s = new Intl.DateTimeFormat(LOCALE_TAG[loc], { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  return s.replace(/\.,?/g, '').replace(/,/g, '');
}
/** Ruta de polilínea para un sparkline en un viewBox w×h. */
export function sparkPath(series: number[], w = 56, h = 24, pad = 1): { line: string; area: string } {
  const v = series.filter((x) => typeof x === 'number' && isFinite(x));
  if (v.length < 2) return { line: '', area: '' };
  const min = Math.min(...v), max = Math.max(...v);
  const span = max - min || 1;
  const step = (w - pad * 2) / (v.length - 1);
  const pts = v.map((y, i) => [pad + i * step, pad + (h - pad * 2) * (1 - (y - min) / span)] as const);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
  const area = line + ` L${pts[pts.length - 1][0].toFixed(2)} ${h} L${pts[0][0].toFixed(2)} ${h} Z`;
  return { line, area };
}
