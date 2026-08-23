import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  factor, precioFuturo, poderAdquisitivo, poderPerdidoPct,
  valorNominal, valorReal, tasaRealPct, resumenInflacion
} from './inflation.mjs';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// Ejemplo calculado a mano: tacos y refresco a $100, inflación 10 %, 2 años.
//   Factor = 1.10² = 1.21
//   Lo mismo costará 100 × 1.21 = $121
//   Tus $100 de hoy comprarán 100 / 1.21 = $82.6446… en pesos de hoy
//   Poder perdido = 1 − 1/1.21 = 17.3553…%
test('precioFuturo y poderAdquisitivo: el ejemplo de $100 al 10 % en 2 años', () => {
  cerca(factor(10, 2), 1.21);
  cerca(precioFuturo(100, 10, 2), 121);
  cerca(poderAdquisitivo(100, 10, 2), 100 / 1.21);
  cerca(poderPerdidoPct(10, 2), (1 - 1 / 1.21) * 100);
});

test('sin inflación nada se mueve, y precioFuturo y poderAdquisitivo son inversos', () => {
  cerca(precioFuturo(100, 0, 30), 100);
  cerca(poderAdquisitivo(100, 0, 30), 100);
  cerca(poderPerdidoPct(0, 30), 0);
  const p = precioFuturo(4500, 6, 12);
  cerca(poderAdquisitivo(p, 6, 12), 4500);
});

test('tasaRealPct: Fisher exacto, no la resta', () => {
  cerca(tasaRealPct(10, 10), 0);                       // empatar con la inflación es rendimiento real 0
  cerca(tasaRealPct(4, 5), (1.04 / 1.05 - 1) * 100);   // ≈ −0.952 %, no −1 %
  assert.ok(tasaRealPct(4, 5) < 0);
  assert.ok(tasaRealPct(7, 4) > 0);
  assert.ok(Math.abs(tasaRealPct(4, 5) - -1) > 1e-3, 'la resta simple no debe coincidir con Fisher');
});

test('valorNominal y valorReal: el número crece y lo que compra se encoge', () => {
  cerca(valorNominal(10000, 10, 2), 12100);
  cerca(valorReal(10000, 10, 10, 2), 10000);           // misma tasa que la inflación: empate
  cerca(valorReal(10000, 0, 10, 2), 10000 / 1.21);     // dinero parado
  assert.ok(valorReal(10000, 4, 5, 3) < 10000);        // 4 % con inflación 5 % pierde
});

test('resumenInflacion: junta todo y falla ruidosamente con entradas inválidas', () => {
  const r = resumenInflacion({ precio: 100, inflacionPct: 10, anios: 2, tasaPct: 10 });
  cerca(r.precioFuturo, 121);
  cerca(r.parado.real, 100 / 1.21);
  cerca(r.invertido.nominal, 121);
  cerca(r.invertido.real, 100);                        // invertido al 10 % con inflación 10 %: se conserva
  cerca(r.tasaRealPct, 0);
  assert.ok(r.invertido.real > r.parado.real);
  assert.throws(() => resumenInflacion({ precio: 'cien', inflacionPct: 5, anios: 2 }), /números/);
  assert.throws(() => factor(5, -1), /negativo/);
});
