import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valorFuturo, totalAportado, interesGanado, seriesAnuales } from './compound.mjs';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// Ejemplo calculado a mano: $1,000 al mes, 12 % anual (1 % mensual), 2 meses.
//   Primer aporte: entra al final del mes 1 y gana un mes → 1000 × 1.01 = 1010
//   Segundo aporte: entra al final del mes 2 y no gana nada → 1000
//   Total = 2010. Con la fórmula: 1000 × ((1.01² − 1) / 0.01) = 1000 × 2.01.
test('valorFuturo: dos meses al 12 % calculados a mano', () => {
  cerca(valorFuturo(1000, 12, 2), 2010);
});

// El ejemplo que se muestra en la lección y en la herramienta:
// $1,000 al mes, 8 % anual, 20 años (240 meses) → $589,020 redondeado.
test('valorFuturo: el ejemplo de la lección (1,000 · 8 % · 20 años) da 589,020', () => {
  assert.equal(Math.round(valorFuturo(1000, 8, 240)), 589020);
});

test('valorFuturo: con tasa 0 es la suma de los aportes y crece con la tasa', () => {
  cerca(valorFuturo(1000, 0, 240), 240000);
  cerca(valorFuturo(500, 0, 12), 6000);
  assert.ok(valorFuturo(1000, 12, 240) > valorFuturo(1000, 8, 240));
  cerca(valorFuturo(1000, 8, 0), 0);
});

test('totalAportado e interesGanado se reparten el valor futuro', () => {
  const [aporte, tasa, meses] = [1500, 9, 180];
  cerca(totalAportado(aporte, meses), 270000);
  cerca(totalAportado(aporte, meses) + interesGanado(aporte, tasa, meses), valorFuturo(aporte, tasa, meses));
  cerca(interesGanado(1000, 0, 240), 0); // sin tasa no hay interés
});

test('valorFuturo: falla ruidosamente con entradas inválidas', () => {
  assert.throws(() => valorFuturo(null, 8, 12), /números/);
  assert.throws(() => valorFuturo(1000, 8, NaN), /números/);
  assert.throws(() => valorFuturo(1000, 8, -1), /negativo/);
  assert.throws(() => seriesAnuales({ aporte: 1000, tasaAnualPct: 8, anios: -3 }), /anios/);
});

test('seriesAnuales: empieza en cero, tiene anios + 1 puntos y el compuesto nunca va por debajo de los aportes', () => {
  const { aportes, compuesto } = seriesAnuales({ aporte: 1000, tasaAnualPct: 8, anios: 20 });
  assert.equal(aportes.length, 21);
  assert.equal(compuesto.length, 21);
  assert.equal(aportes[0], 0);
  assert.equal(compuesto[0], 0);
  assert.equal(aportes[20], 240000);
  assert.equal(compuesto[20], 589020);
  for (let a = 0; a <= 20; a++) assert.ok(compuesto[a] >= aportes[a], `año ${a}: el compuesto quedó por debajo de los aportes`);
});
