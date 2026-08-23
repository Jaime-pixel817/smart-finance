// Pruebas del recorte a UNA sesión de /api/history (api/_lib/sesiones.js).
// Los casos son los cuatro husos reales que devuelve Yahoo para los símbolos
// del sitio, con el escenario que rompía antes: el lunes recién abierto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ultimaSesion, MIN_SESION } = require('./sesiones.js');

const DIA = 86400;
/** Serie de barras cada `paso` segundos, desde `desde`, con valor incremental. */
function barras(desde, n, paso = 300, base = 100) {
  return Array.from({ length: n }, (_, i) => [desde + i * paso, base + i]);
}

test('acciones (America/New_York): se queda la última sesión entera, no las últimas N barras', () => {
  const off = -4 * 3600;
  // Dos sesiones de 9:30 a 16:00 ET. 2026-08-20 y 2026-08-21.
  const jue = Date.UTC(2026, 7, 20, 13, 30) / 1000;
  const vie = Date.UTC(2026, 7, 21, 13, 30) / 1000;
  const puntos = [...barras(jue, 79, 300, 500), ...barras(vie, 79, 300, 700)];
  const { points, prevClose } = ultimaSesion(puntos, off, 79);
  assert.equal(points.length, 79);
  assert.equal(points[0][0], vie);
  assert.equal(points[points.length - 1][0], vie + 78 * 300);
  // El cierre previo es la última barra del jueves.
  assert.equal(prevClose, 500 + 78);
});

test('el lunes recién abierto NO mezcla dos días a medias: añade la sesión anterior entera', () => {
  const off = -4 * 3600;
  const vie = Date.UTC(2026, 7, 21, 13, 30) / 1000;
  const lun = Date.UTC(2026, 7, 24, 13, 30) / 1000;
  // Dos barras de hoy: por debajo de MIN_SESION.
  const puntos = [...barras(vie, 79, 300, 500), ...barras(lun, 2, 300, 700)];
  assert.ok(2 < MIN_SESION);
  const { points } = ultimaSesion(puntos, off, 79);
  // Con el tope de 79 barras entra el final del viernes y las dos de hoy,
  // así que la gráfica tiene forma en vez de ser una raya de dos puntos.
  assert.equal(points.length, 79);
  assert.equal(points[points.length - 1][0], lun + 300);
  const dias = new Set(points.map((p) => Math.floor((p[0] + off) / DIA)));
  assert.equal(dias.size, 2, 'la ventana abarca dos días y el cliente lo dirá así');
});

test('con la sesión ya avanzada solo sale el día de hoy', () => {
  const off = -4 * 3600;
  const vie = Date.UTC(2026, 7, 21, 13, 30) / 1000;
  const lun = Date.UTC(2026, 7, 24, 13, 30) / 1000;
  const puntos = [...barras(vie, 79, 300, 500), ...barras(lun, 20, 300, 700)];
  const { points, prevClose } = ultimaSesion(puntos, off, 79);
  assert.equal(points.length, 20);
  assert.equal(points[0][0], lun);
  assert.equal(prevClose, 500 + 78);
});

test('divisas (Europe/London): el día de bolsa empieza a medianoche de Londres, no a la del visitante', () => {
  const off = 3600;
  // Viernes de Londres = jueves 23:00 UTC → viernes 22:55 UTC.
  const jue23 = Date.UTC(2026, 7, 20, 23, 0) / 1000;
  const mie23 = jue23 - DIA;
  const puntos = [...barras(mie23, 288, 300, 10), ...barras(jue23, 288, 300, 50)];
  const { points } = ultimaSesion(puntos, off, 288);
  assert.equal(points.length, 288);
  assert.equal(points[0][0], jue23);
  assert.equal(points[points.length - 1][0], jue23 + 287 * 300);
});

test('cripto (UTC): la vista 1D va de la medianoche UTC al último dato', () => {
  const off = 0;
  const ayer = Date.UTC(2026, 7, 22, 0, 0) / 1000;
  const hoy = Date.UTC(2026, 7, 23, 0, 0) / 1000;
  const puntos = [...barras(ayer, 288, 300, 1000), ...barras(hoy, 210, 300, 2000)];
  const { points, prevClose } = ultimaSesion(puntos, off, 288);
  assert.equal(points.length, 210);
  assert.equal(points[0][0], hoy);
  assert.equal(prevClose, 1000 + 287);
});

test('sin día anterior en la serie, prevClose es null y no revienta', () => {
  const hoy = Date.UTC(2026, 7, 23, 0, 0) / 1000;
  const { points, prevClose } = ultimaSesion(barras(hoy, 30), 0, 288);
  assert.equal(points.length, 30);
  assert.equal(prevClose, null);
});

test('serie vacía: devuelve vacío sin lanzar', () => {
  const r = ultimaSesion([], 0, 288);
  assert.deepEqual(r.points, []);
  assert.equal(r.prevClose, null);
});

test('el tope recorta por el final (se queda lo más reciente)', () => {
  const hoy = Date.UTC(2026, 7, 23, 0, 0) / 1000;
  const { points } = ultimaSesion(barras(hoy, 288), 0, 100);
  assert.equal(points.length, 100);
  assert.equal(points[points.length - 1][0], hoy + 287 * 300);
});
