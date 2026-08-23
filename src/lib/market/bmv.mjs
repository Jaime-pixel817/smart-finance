// Horario de la Bolsa Mexicana de Valores, que NO es fijo.
//
// México dejó de cambiar de hora en 2022, pero la BMV (y BIVA) mantienen su
// sesión pegada a la de Nueva York para operar en paralelo. Resultado: el
// horario local se mueve dos veces al año.
//
//   EE. UU. en horario de verano  →  7:30 – 14:00 hora de la Ciudad de México
//   el resto del año              →  8:30 – 15:00
//
// En 2026 la propia BMV lo anunció como "del 9 de marzo al 30 de octubre",
// que son el primer y el último día hábil del horario de verano estadounidense
// (8 de marzo – 1 de noviembre). Es la misma regla contada en días de mercado.
//
// Por qué NO una tabla de fechas: caduca cada año y falla en silencio — el
// sitio diría "BMV abierta" una hora después del cierre real, que es justo lo
// que pasaba. En vez de eso se mide el ADELANTO real del reloj de Nueva York
// sobre el de la Ciudad de México (120 min en verano, 60 en invierno) y se le
// resta a la sesión de la NYSE. Se corrige solo mientras las dos bolsas sigan
// homologadas, y si algún día dejan de estarlo, el respaldo es el horario de
// invierno, que es el histórico.
//
// Fuentes: avisos de cambio de horario de operación 2026 (casas de bolsa
// mexicanas, marzo 2026) y horario oficial de la BMV. Verificado 22-ago-2026.

/** Sesión de la NYSE en minutos locales desde medianoche. */
export const NYSE = [570, 960]; // 9:30 – 16:00 ET

/** Horario de invierno de la BMV: el respaldo si algo no cuadra. */
export const BMV_INVIERNO = [510, 900]; // 8:30 – 15:00

/** Minutos locales desde medianoche en `tz`, en el instante `now`. */
export function minutosLocales(tz, now) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  let h = 0, mi = 0;
  for (const p of f.formatToParts(now)) {
    if (p.type === 'hour') h = +p.value % 24;
    else if (p.type === 'minute') mi = +p.value;
  }
  return h * 60 + mi;
}

/** Minutos que el reloj de `a` va por delante del de `b`. Siempre 0–1439. */
export function adelanto(a, b, now) {
  return ((minutosLocales(a, now) - minutosLocales(b, now)) % 1440 + 1440) % 1440;
}

/**
 * Sesión de la BMV en el instante `now`, en minutos locales de la CDMX.
 * @returns {[number, number]} [apertura, cierre]
 */
export function sesionBMV(now = new Date()) {
  const d = adelanto('America/New_York', 'America/Mexico_City', now);
  if (d !== 60 && d !== 120) return [...BMV_INVIERNO];
  return [NYSE[0] - d, NYSE[1] - d];
}
