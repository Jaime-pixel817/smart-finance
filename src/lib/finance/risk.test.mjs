import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPUESTOS, mezcla, generador, componer, percentil, simular } from './risk.mjs';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// Calculado a mano: 100 % CETES, 6.5 % anual, 10 años, empezando con $10,000.
//   1.065^2  = 1.134225
//   1.065^4  = 1.134225²      = 1.286466...
//   1.065^8  = 1.286466...²   = 1.654995...
//   1.065^10 = 1.065^8 · 1.065² = 1.877137...
//   10,000 · 1.877137 = 18,771.37
// Con σ = 0 los 200 caminos son idénticos, así que p10, p50 y p90 coinciden.
test('simular: sin acciones son puros CETES y el resultado se calcula a mano', () => {
  const r = simular({ pctAcciones: 0, anios: 10 });
  const esperado = 10000 * Math.pow(1.065, 10);
  cerca(esperado, 18771.374, 1e-3); // la cuenta de arriba, con más decimales
  cerca(r.finalP50, esperado, 1e-6);
  cerca(r.finalP10, esperado, 1e-6);
  cerca(r.finalP90, esperado, 1e-6);
  cerca(r.anualizadoP50Pct, 6.5, 1e-9);
  assert.equal(r.aniosEnRojo, 0);
  cerca(r.peorAnioPct, 6.5, 1e-9);
});

test('mezcla: interpola entre CETES y acciones, y el 50/50 cae justo en medio', () => {
  cerca(mezcla(0).mediaPct, SUPUESTOS.cetes.retornoPct);
  cerca(mezcla(0).desviacionPct, 0);
  cerca(mezcla(100).mediaPct, SUPUESTOS.acciones.retornoPct);
  cerca(mezcla(100).desviacionPct, SUPUESTOS.acciones.volatilidadPct);
  cerca(mezcla(50).mediaPct, (SUPUESTOS.acciones.retornoPct + SUPUESTOS.cetes.retornoPct) / 2);
  cerca(mezcla(50).desviacionPct, SUPUESTOS.acciones.volatilidadPct / 2);
  // La tasa de CETES se puede pasar: la verdad vive en src/data/home.ts, no aquí.
  cerca(mezcla(0, 9).mediaPct, 9);
  cerca(mezcla(50, 9).mediaPct, (SUPUESTOS.acciones.retornoPct + 9) / 2);
  assert.throws(() => mezcla(120), /0 a 100/);
  assert.throws(() => mezcla(null), /número/);
  assert.throws(() => mezcla(50, 'x'), /cetesPct/);
});

test('simular: la tasa de CETES que se pasa es la que se usa', () => {
  const r = simular({ pctAcciones: 0, anios: 5, cetesPct: 10 });
  cerca(r.finalP50, 10000 * Math.pow(1.1, 5), 1e-6);
  cerca(r.anualizadoP50Pct, 10, 1e-9);
});

test('componer y percentil: las dos piezas de aritmética, a mano', () => {
  // Subir 10 % y luego bajar 10 % NO te deja donde empezaste: 10,000 · 1.1 · 0.9 = 9,900.
  cerca(componer(10000, [10, -10]), 9900);
  cerca(componer(10000, []), 10000);
  // Percentil por interpolación sobre [0, 10, 20, 30, 40]: la posición de p25
  // es 0.25 · 4 = 1, o sea el segundo elemento exacto.
  cerca(percentil([0, 10, 20, 30, 40], 25), 10);
  cerca(percentil([0, 10, 20, 30, 40], 50), 20);
  cerca(percentil([0, 10, 20, 30, 40], 0), 0);
  cerca(percentil([0, 10, 20, 30, 40], 100), 40);
  cerca(percentil([0, 100], 10), 10); // 0.10 · 1 = 0.1 → 0 + (100 − 0) · 0.1
  assert.throws(() => percentil([], 50), /vacía/);
  assert.throws(() => percentil([1, 2], 101), /0 a 100/);
});

test('generador: la misma semilla da la misma secuencia y semillas distintas no', () => {
  const a = generador(7), b = generador(7), c = generador(8);
  const sa = [a(), a(), a(), a()];
  const sb = [b(), b(), b(), b()];
  const sc = [c(), c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const x of sa) assert.ok(x >= 0 && x < 1, `uniforme fuera de [0,1): ${x}`);
});

test('simular: es repetible con la misma semilla y cambia con otra', () => {
  const a = simular({ pctAcciones: 80, anios: 15 });
  const b = simular({ pctAcciones: 80, anios: 15 });
  const c = simular({ pctAcciones: 80, anios: 15, semilla: 99 });
  assert.deepEqual(a.p50, b.p50);
  assert.notDeepEqual(a.p50, c.p50);
});

test('simular: el abanico está ordenado, arranca en el monto inicial y se abre con los años', () => {
  const r = simular({ pctAcciones: 100, anios: 30 });
  assert.equal(r.p10.length, 31);
  assert.equal(r.p50.length, 31);
  assert.equal(r.p90.length, 31);
  for (const s of [r.p10, r.p50, r.p90]) cerca(s[0], 10000);
  for (let a = 0; a <= 30; a++) {
    assert.ok(r.p10[a] <= r.p50[a] + 1e-9, `año ${a}: p10 por encima de p50`);
    assert.ok(r.p50[a] <= r.p90[a] + 1e-9, `año ${a}: p50 por encima de p90`);
  }
  // El abanico se abre: la distancia p90 − p10 crece del año 1 al año 30.
  assert.ok(r.p90[30] - r.p10[30] > r.p90[1] - r.p10[1]);
  // Con 100 % acciones y 15 % de volatilidad tiene que haber años en rojo.
  assert.ok(r.aniosEnRojo > 0);
  assert.ok(r.peorAnioPct < 0);
});

test('simular: más acciones abren más el abanico que menos acciones', () => {
  const poco = simular({ pctAcciones: 20, anios: 20 });
  const mucho = simular({ pctAcciones: 100, anios: 20 });
  const ancho = (r) => (r.finalP90 - r.finalP10) / r.inicial;
  assert.ok(ancho(mucho) > ancho(poco));
  assert.ok(mucho.finalP50 > poco.finalP50);
});

test('simular: falla ruidosamente con entradas inválidas', () => {
  assert.throws(() => simular({ pctAcciones: 50, anios: 0 }), /anios/);
  assert.throws(() => simular({ pctAcciones: 50, anios: 2.5 }), /anios/);
  assert.throws(() => simular({ pctAcciones: 50, anios: 10, inicial: 0 }), /inicial/);
  assert.throws(() => simular({ pctAcciones: 50, anios: 10, caminos: 0 }), /caminos/);
  assert.throws(() => simular({ pctAcciones: -1, anios: 10 }), /0 a 100/);
  assert.throws(() => componer(10000, [1, 'x']), /números/);
});
