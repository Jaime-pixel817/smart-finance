import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POOL_DIARIO, EXTRA_LIBRE, parDeHistorial } from './pool.mjs';
import { planDelReto, RONDAS } from './reto.mjs';

// El orden de esta lista ES la semilla: barajarla es lo que elige el reto de
// cada día. Si alguien reordena, añade o quita un id, TODOS los retos —los de
// ayer y los de mañana— cambian, y la tarjeta que alguien compartió deja de
// llevar al mismo reto. Esta prueba lo hace ruidoso: si falla, el cambio es a
// propósito y toca subir el prefijo de versión de la semilla (PREFIJO_DIARIO).
test('el catálogo diario está clavado: cambiarlo cambia el reto de todos los días', () => {
  assert.deepEqual(POOL_DIARIO, [
    'spy', 'qqq', 'dia', 'aapl', 'msft', 'nvda', 'amzn', 'usdmxn', 'eurmxn', 'btc', 'eth', 'sol'
  ]);
  assert.equal(new Set(POOL_DIARIO).size, POOL_DIARIO.length, 'sin repetidos');
  assert.ok(POOL_DIARIO.length >= RONDAS, 'tiene que haber al menos una ronda por activo');
  // Y con él, el reto de un día concreto no puede moverse sin que esto falle.
  assert.deepEqual(planDelReto('2026-08-23', POOL_DIARIO).activos,
    ['eth', 'amzn', 'aapl', 'btc', 'nvda']);
});

test('el reto libre añade activos y no pisa a los del diario', () => {
  assert.equal(EXTRA_LIBRE.some((id) => POOL_DIARIO.includes(id)), false);
  assert.equal(new Set(EXTRA_LIBRE).size, EXTRA_LIBRE.length);
});

// api/_lib/og-reto.js no puede leer src/data/symbols.ts (es TypeScript y la
// función es CommonJS), así que deduce la clave de /api/history del id. Que
// coincida con symbols.ts lo comprueba el build de Challenge.astro; que la
// regla sea la que es, esto.
test('parDeHistorial: la clave de /api/history es el id en mayúsculas', () => {
  assert.equal(parDeHistorial('usdmxn'), 'USDMXN');
  assert.equal(parDeHistorial('spy'), 'SPY');
  assert.equal(parDeHistorial('btc'), 'BTC');
});
