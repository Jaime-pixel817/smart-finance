// ¿Está abierta esta bolsa? Horario regular de las ocho bolsas del globo.
//
// Distinto de hours.ts a propósito: aquel responde "¿está abierta NYSE/BMV
// ahora?" (línea Hoy) y "¿está cerrado el mercado según el último dato?"
// (gráficas). Aquí no hay serie: el globo pinta ocho bolsas a la vez y tiene
// que decir a qué hora ABRE o CIERRA cada una, en la hora de quien lee. Lo que
// se mira es el RELOJ de la bolsa.
//
// SOLO HORARIO REGULAR, sin lista de festivos. Un feriado local saldrá como
// "abierta" dentro de su horario; por eso la tarjeta dice "horario regular" y
// no promete más. Mantener festivos de ocho países a mano es la clase de tabla
// que se desactualiza en silencio.
//
// CÓMO SE CALCULA, sin aritmética de husos. Intl.DateTimeFormat con timeZone da
// el día de la semana y la hora LOCAL de la bolsa ahora mismo. Con eso se sabe
// en qué sesión va (o cuántos minutos faltan para la próxima), y el instante de
// ese cambio se obtiene SUMANDO esos minutos al ahora: un Date normal, que
// luego se formatea en la zona de quien lee. Si hay un cambio de horario de
// verano entre medias se desvía una hora, lo que para "abre el lunes a las
// 8:30" es aceptable.
//
// Sesiones en minutos locales desde medianoche, lunes a viernes (días 1-5).
// Tokio y Hong Kong tienen dos tramos (pausa de comida). Es el port a
// TypeScript de assets/exchange-hours.js (PR #5, sitio legacy).
import type { Loc } from './format';
import { sesionBMV } from '../lib/market/bmv.mjs';

const m = (h: number, mi: number) => h * 60 + mi;
export const SESSIONS: Record<string, [number, number][]> = {
  'America/New_York':    [[m(9, 30), m(16, 0)]],
  'America/Toronto':     [[m(9, 30), m(16, 0)]],
  // Ojo: este par NO es fijo. La BMV homologa su sesión con Nueva York y
  // México ya no cambia de hora, así que el horario local se mueve solo dos
  // veces al año: 7:30–14:00 mientras EE. UU. está en horario de verano y
  // 8:30–15:00 el resto del año. Lo resuelve sesiones(), abajo; este par es
  // el de invierno y queda como respaldo si algo falla.
  'America/Mexico_City': [[m(8, 30), m(15, 0)]],
  'America/Sao_Paulo':   [[m(10, 0), m(17, 0)]],
  'Europe/London':       [[m(8, 0),  m(16, 30)]],
  'Europe/Berlin':       [[m(9, 0),  m(17, 30)]],
  'Asia/Tokyo':          [[m(9, 0),  m(11, 30)], [m(12, 30), m(15, 30)]],
  'Asia/Hong_Kong':      [[m(9, 30), m(12, 0)],  [m(13, 0),  m(16, 0)]]
};
const DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmts: Record<string, Intl.DateTimeFormat> = {};

/** { day: 0-6, min: minutos locales } de la bolsa, ahora. */
function clock(tz: string, now: Date): { day: number; min: number } {
  const f = (fmts[tz] ||= new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
  let day = 1, h = 0, mi = 0;
  for (const p of f.formatToParts(now)) {
    if (p.type === 'weekday') day = DAYS[p.value] ?? 1;
    else if (p.type === 'hour') h = +p.value % 24;
    else if (p.type === 'minute') mi = +p.value;
  }
  return { day, min: h * 60 + mi };
}

/**
 * Sesiones de la bolsa AHORA. Igual que SESSIONS salvo la BMV, cuyo horario se
 * mueve dos veces al año porque sigue al de Nueva York: lo calcula
 * `sesionBMV()` (src/lib/market/bmv.mjs, con sus pruebas), que es la única
 * fuente de ese dato en el sitio.
 */
export function sesiones(tz: string, now: Date): [number, number][] | undefined {
  if (tz !== 'America/Mexico_City') return SESSIONS[tz];
  return [sesionBMV(now)];
}

/** abierta → cierre de la sesión en curso; cerrada → próxima apertura. */
export type ExchangeState = { open: true; until: Date } | { open: false; opens: Date };

/** Estado de la bolsa cuya zona IANA es `tz`, ahora. null si la zona no está en la tabla. */
export function exchangeState(tz: string, now = new Date()): ExchangeState | null {
  const ses = sesiones(tz, now);
  if (!ses) return null;
  const r = clock(tz, now);
  // Al minuto: las horas que se muestran no llevan segundos.
  const t = Math.floor(now.getTime() / 60000) * 60000;
  if (r.day >= 1 && r.day <= 5) {
    for (const [a, b] of ses) {
      if (r.min >= a && r.min < b) return { open: true, until: new Date(t + (b - r.min) * 60000) };
      if (r.min < a) return { open: false, opens: new Date(t + (a - r.min) * 60000) };
    }
  }
  // Ya cerró hoy, o es fin de semana: primera sesión del próximo día hábil.
  let jumps = 1, day = r.day;
  for (;;) { day = (day + 1) % 7; if (day >= 1 && day <= 5) break; jumps++; }
  return { open: false, opens: new Date(t + (jumps * 1440 - r.min + ses[0][0]) * 60000) };
}

/** Hora corta en la zona de quien lee ("14:30" / "2:30 PM" según idioma). Si cae otro día se antepone el día de la semana. */
export function localTime(date: Date, loc: Loc, now = new Date()): string {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (date.getTime() - now.getTime() > 20 * 3600000 || date.getDay() !== now.getDay()) opts.weekday = 'short';
  return new Intl.DateTimeFormat(loc === 'es' ? 'es-MX' : 'en-US', opts).format(date);
}
