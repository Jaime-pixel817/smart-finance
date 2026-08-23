// Horario de mercado para el sitio nuevo (TypeScript). Dos preguntas:
//
//  1. ¿Está abierta la bolsa AHORA? (línea "Hoy" del home y de /market):
//     horario regular, lunes a viernes, sin feriados. Es una orientación, no
//     una promesa: cada dato trae su propio chip de frescura.
//
//  2. ¿Está cerrado el mercado según el ÚLTIMO DATO? (gráficas 1D): mismo
//     criterio que public/assets/market-hours.js, que también usa el boletín:
//     si el último punto tiene más de 40 minutos, el mercado está cerrado, sea
//     fin de semana, feriado o caída de la fuente. Solo vale para series
//     intradía; en cierres diarios el último punto siempre es viejo. Lo usa el
//     panel de gráfica para elegir entre "Hoy" y "Última sesión" en su línea
//     de sesión (src/scripts/chart-panel.ts).
import { sesionBMV } from '../lib/market/bmv.mjs';

export function sessionOpen(tz: string, h0: number, m0: number, h1: number, m1: number, now = new Date()): boolean {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value || '';
  const wd = get('weekday');
  if (wd === 'Sat' || wd === 'Sun') return false;
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  return mins >= h0 * 60 + m0 && mins < h1 * 60 + m1;
}
/** NYSE 9:30–16:00 ET, lunes a viernes. */
export const nyseOpen = (now = new Date()) => sessionOpen('America/New_York', 9, 30, 16, 0, now);
/**
 * BMV, lunes a viernes. El horario NO es fijo: la bolsa mexicana homologa su
 * sesión con Nueva York y México ya no cambia de hora, así que opera 7:30–14:00
 * mientras EE. UU. está en horario de verano y 8:30–15:00 el resto del año. El
 * par exacto lo calcula `sesiones()` en exchange-hours.ts restando el adelanto
 * real de Nueva York, para no depender de fechas que caducan cada año.
 */
export const bmvOpen = (now = new Date()) => {
  const [a, b] = sesionBMV(now);
  return sessionOpen('America/Mexico_City', Math.floor(a / 60), a % 60, Math.floor(b / 60), b % 60, now);
};

export const GAP_MS = 40 * 60 * 1000;

export interface MarketState { closed: boolean; last: Date | null; today: boolean }

/** lastTs en SEGUNDOS (como /api/history y /api/quotes). */
export function marketState(lastTs: number | null | undefined, now = Date.now()): MarketState {
  if (typeof lastTs !== 'number' || !isFinite(lastTs) || lastTs <= 0) return { closed: false, last: null, today: false };
  const last = new Date(lastTs * 1000);
  const gap = now - last.getTime();
  const key = (d: Date) => d.toLocaleDateString('en-CA');
  return { closed: gap > GAP_MS, last, today: key(last) === key(new Date(now)) };
}
