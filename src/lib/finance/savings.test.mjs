import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compararAhorro } from './savings.mjs';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// Ejemplo calculado a mano: $10,000, 2 años, CETES 10 %, cuenta 0 %, inflación 10 %.
//   CETES:    nominal 10,000 × 1.10² = 12,100 ; real 12,100 / 1.21 = 10,000 (empata con la inflación)
//   Cuenta:   nominal 10,000        ; real 10,000 / 1.21 = 8,264.46 (pierde 1,735.54 de poder)
//   Efectivo: igual que la cuenta al 0 %
test('compararAhorro: el ejemplo calculado a mano', () => {
  const r = compararAhorro({ monto: 10000, anios: 2, cetesPct: 10, cuentaPct: 0, inflacionPct: 10 });
  cerca(r.cetes.nominal, 12100);
  cerca(r.cetes.real, 10000);
  cerca(r.cetes.tasaRealPct, 0);
  cerca(r.cuenta.nominal, 10000);
  cerca(r.cuenta.real, 10000 / 1.21);
  cerca(r.cuenta.gananciaReal, 10000 / 1.21 - 10000);
  cerca(r.brechaReal, 10000 - 10000 / 1.21);
  assert.equal(r.ganador, 'cetes');
  assert.equal(r.cetesPierdeContraInflacion, false);
});

test('compararAhorro: el efectivo es la cuenta al 0 % y siempre es el peor con inflación positiva', () => {
  const r = compararAhorro({ monto: 25000, anios: 5, cetesPct: 6.5, cuentaPct: 2, inflacionPct: 4 });
  cerca(r.efectivo.nominal, 25000);
  assert.ok(r.efectivo.real < r.cuenta.real);
  assert.ok(r.cuenta.real < r.cetes.real);
  assert.equal(r.ganador, 'cetes');
  assert.ok(r.cetes.gananciaReal > 0 && r.cuenta.gananciaReal < 0);
});

test('compararAhorro: CETES por debajo de la inflación también pierden, aunque el número crezca', () => {
  const r = compararAhorro({ monto: 10000, anios: 10, cetesPct: 3, cuentaPct: 1, inflacionPct: 6 });
  assert.ok(r.cetes.nominal > 10000, 'el número nominal sí crece');
  assert.ok(r.cetes.real < 10000, 'y aun así compra menos');
  assert.equal(r.cetesPierdeContraInflacion, true);
  assert.ok(r.cetes.tasaRealPct < 0);
  assert.equal(r.ganador, 'cetes'); // sigue siendo el que menos pierde
});

test('compararAhorro: plazo 0 y tasas iguales dan empate', () => {
  const cero = compararAhorro({ monto: 8000, anios: 0, cetesPct: 9, cuentaPct: 1, inflacionPct: 5 });
  cerca(cero.cetes.real, 8000);
  cerca(cero.cuenta.real, 8000);
  assert.equal(cero.ganador, 'empate');
  const iguales = compararAhorro({ monto: 8000, anios: 4, cetesPct: 5, cuentaPct: 5, inflacionPct: 5 });
  cerca(iguales.brechaReal, 0);
  cerca(iguales.cetes.real, 8000);
  assert.equal(iguales.ganador, 'empate'); // aunque el efectivo, al 0 %, sí pierda
  assert.ok(iguales.efectivo.real < 8000);
});

test('compararAhorro: falla ruidosamente con entradas inválidas', () => {
  assert.throws(() => compararAhorro({ monto: 1000, anios: 2, cetesPct: 7, cuentaPct: 1 }), /inflacionPct/);
  assert.throws(() => compararAhorro({ monto: NaN, anios: 2, cetesPct: 7, cuentaPct: 1, inflacionPct: 4 }), /monto/);
  assert.throws(() => compararAhorro({ monto: 1000, anios: -2, cetesPct: 7, cuentaPct: 1, inflacionPct: 4 }), /negativo/);
});
