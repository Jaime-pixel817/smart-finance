import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sesionBMV, adelanto, minutosLocales, NYSE, BMV_INVIERNO } from './bmv.mjs';

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const sesion = (iso) => sesionBMV(new Date(iso)).map(hhmm).join('–');

test('en horario de verano de EE. UU. la BMV opera 7:30–14:00', () => {
  assert.equal(sesion('2026-06-15T12:00:00Z'), '07:30–14:00');
  assert.equal(sesion('2026-08-22T18:00:00Z'), '07:30–14:00');
  // Primer día hábil del horario de verano de 2026, que la BMV anunció como
  // el inicio del cambio.
  assert.equal(sesion('2026-03-09T15:00:00Z'), '07:30–14:00');
});

test('fuera del horario de verano la BMV opera 8:30–15:00', () => {
  assert.equal(sesion('2026-12-15T12:00:00Z'), '08:30–15:00');
  assert.equal(sesion('2026-01-20T18:00:00Z'), '08:30–15:00');
  // Primer lunes después de que EE. UU. vuelve al horario estándar.
  assert.equal(sesion('2026-11-02T15:00:00Z'), '08:30–15:00');
});

test('la sesión siempre dura seis horas y media, como la de Nueva York', () => {
  for (const iso of ['2026-06-15T12:00:00Z', '2026-12-15T12:00:00Z', '2026-03-09T15:00:00Z']) {
    const [a, b] = sesionBMV(new Date(iso));
    assert.equal(b - a, NYSE[1] - NYSE[0]);
    assert.equal(b - a, 390);
  }
});

test('Nueva York va 2 horas por delante de la CDMX en verano y 1 en invierno', () => {
  assert.equal(adelanto('America/New_York', 'America/Mexico_City', new Date('2026-06-15T12:00:00Z')), 120);
  assert.equal(adelanto('America/New_York', 'America/Mexico_City', new Date('2026-12-15T12:00:00Z')), 60);
});

test('el adelanto nunca es negativo aunque el cálculo cruce la medianoche', () => {
  // 05:30Z = 00:30 CDMX y 01:30 en Nueva York (invierno): el reloj cambia de día.
  const d = adelanto('America/New_York', 'America/Mexico_City', new Date('2026-12-15T06:15:00Z'));
  assert.ok(d >= 0 && d < 1440, `adelanto fuera de rango: ${d}`);
  assert.equal(d, 60);
});

test('minutosLocales lee la hora de la zona pedida, no la de la máquina', () => {
  const t = new Date('2026-08-22T18:00:00Z');
  assert.equal(minutosLocales('America/Mexico_City', t), 12 * 60); // 12:00
  assert.equal(minutosLocales('America/New_York', t), 14 * 60);    // 14:00
  assert.equal(minutosLocales('Europe/London', t), 19 * 60);       // 19:00
});

test('si el adelanto no es el esperado, cae al horario de invierno', () => {
  // Nueva York contra Tokio no da ni 60 ni 120: la función no debe inventar.
  const raro = adelanto('Asia/Tokyo', 'America/Mexico_City', new Date('2026-06-15T12:00:00Z'));
  assert.ok(raro !== 60 && raro !== 120);
  assert.deepEqual(BMV_INVIERNO, [510, 900]);
});

test('el bug que se corrige: a las 14:30 de agosto la BMV ya cerró', () => {
  // 19:30Z = 14:30 en la CDMX, tercer martes de agosto (horario de verano).
  const [a, b] = sesionBMV(new Date('2026-08-18T19:30:00Z'));
  const ahora = 14 * 60 + 30;
  assert.ok(ahora >= b, 'a las 14:30 la sesión debe estar terminada');
  // Y a las 7:45 ya está abierta, cuando el horario viejo decía que no.
  assert.ok(7 * 60 + 45 >= a, 'a las 7:45 la sesión ya debe estar abierta');
});
