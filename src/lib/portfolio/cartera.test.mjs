// Pruebas de las cuentas de la cartera (src/lib/portfolio/cartera.mjs).
// `npm test` las corre con node --test.
//
// El caso principal está hecho a mano con números redondos para poder
// comprobarlo con una calculadora: capital de 100 000, una posición abierta
// que sube 5 % y una cerrada que perdió 10 %.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cantidadDe, costoDe, precioDe, resultadoDe, resumen, grafica, ultimoPunto } from './cartera.mjs';

const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);

/** Cartera de concurso: 100 000 de capital ficticio, dos operaciones. */
const CARTERA = {
  capitalInicial: 100000,
  posiciones: [
    {
      ticker: 'WALMEX', estado: 'abierta',
      entrada: { fecha: '2026-10-05', precio: 60 }, cantidad: 1000
    },
    {
      ticker: 'CEMEXCPO', estado: 'cerrada',
      entrada: { fecha: '2026-10-05', precio: 10 }, cantidad: 2000,
      salida: { fecha: '2026-10-12', precio: 9 }
    }
  ]
};
const PRECIOS = { WALMEX: 63 };

test('cantidadDe: títulos declarados y títulos por peso', () => {
  assert.equal(cantidadDe({ ticker: 'A', cantidad: 150, entrada: { precio: 10 } }, 100000), 150);
  // 20 % de 50 000 = 10 000 ÷ 25 = 400 títulos.
  assert.equal(cantidadDe({ ticker: 'B', peso: 0.2, entrada: { precio: 25 } }, 50000), 400);
});

test('cantidadDe: por peso sin capital inicial es un error, no un cero', () => {
  assert.throws(() => cantidadDe({ ticker: 'B', peso: 0.2, entrada: { precio: 25 } }, null), /capitalInicial/);
});

test('cantidadDe: sin cantidad ni peso avisa con el ticker', () => {
  assert.throws(() => cantidadDe({ ticker: 'ZZZ', entrada: { precio: 10 } }, 1000), /ZZZ/);
});

test('costoDe: títulos por precio de entrada', () => {
  assert.equal(costoDe(CARTERA.posiciones[0], 100000), 60000);
  assert.equal(costoDe(CARTERA.posiciones[1], 100000), 20000);
});

test('precioDe: una posición cerrada se valora a su precio de salida', () => {
  assert.equal(precioDe(CARTERA.posiciones[1], { CEMEXCPO: 11 }), 9);
  assert.equal(precioDe(CARTERA.posiciones[0], PRECIOS), 63);
  assert.equal(precioDe(CARTERA.posiciones[0], {}), null);
});

test('resultadoDe: la fila de una posición que subió 5 %', () => {
  const f = resultadoDe(CARTERA.posiciones[0], PRECIOS, 100000);
  assert.equal(f.costo, 60000);
  assert.equal(f.valor, 63000);
  assert.equal(f.ganancia, 3000);
  cerca(f.pct, 5);
  assert.equal(f.cerrada, false);
});

test('resumen: el caso hecho a mano cuadra hasta el peso', () => {
  const r = resumen(CARTERA, PRECIOS);
  // Efectivo = 100 000 − (60 000 + 20 000) + 18 000 de la venta.
  assert.equal(r.efectivo, 38000);
  assert.equal(r.valorAbierto, 63000);
  assert.equal(r.valorTotal, 101000);
  assert.equal(r.variacion.absoluta, 1000);
  cerca(r.variacion.pct, 1);
  assert.equal(r.variacion.base, 100000);
  assert.equal(r.mejor.ticker, 'WALMEX');
  cerca(r.mejor.pct, 5);
  assert.equal(r.peor.ticker, 'CEMEXCPO');
  cerca(r.peor.pct, -10);
  // Dos compras y una venta.
  assert.equal(r.operaciones, 3);
  assert.equal(r.abiertas.length, 1);
  assert.equal(r.cerradas.length, 1);
  assert.equal(r.realizado.absoluta, -2000);
  cerca(r.realizado.pct, -10);
  assert.equal(r.completo, true);
  assert.deepEqual(r.faltantes, []);
});

test('resumen: sin el precio de una abierta, el total es null y dice cuál falta', () => {
  const r = resumen(CARTERA, {});
  assert.equal(r.completo, false);
  assert.deepEqual(r.faltantes, ['WALMEX']);
  assert.equal(r.valorAbierto, null);
  assert.equal(r.valorTotal, null);
  assert.equal(r.variacion, null);
  // Lo cerrado sí se sabe: no depende de ningún precio de mercado.
  assert.equal(r.realizado.absoluta, -2000);
});

test('resumen: cartera sin capital declarado se mide contra su costo', () => {
  const r = resumen({
    capitalInicial: null,
    posiciones: [
      { ticker: 'A', estado: 'abierta', entrada: { fecha: '2026-01-02', precio: 100 }, cantidad: 10 },
      { ticker: 'B', estado: 'abierta', entrada: { fecha: '2026-01-02', precio: 200 }, cantidad: 5 }
    ]
  }, { A: 110, B: 190 });
  assert.equal(r.efectivo, null);
  assert.equal(r.costoAbierto, 2000);
  // A: 10 × 110 = 1 100 (+10 %) · B: 5 × 190 = 950 (−5 %) → 2 050.
  assert.equal(r.valorTotal, 2050);
  assert.equal(r.variacion.absoluta, 50);
  cerca(r.variacion.pct, 2.5);
  assert.equal(r.mejor.ticker, 'A');
  assert.equal(r.peor.ticker, 'B');
  assert.equal(r.realizado, null);
  assert.equal(r.operaciones, 2);
});

test('resumen: cartera vacía no revienta ni inventa un total', () => {
  const r = resumen({ capitalInicial: 100000, posiciones: [] }, {});
  assert.equal(r.efectivo, 100000);
  assert.equal(r.valorTotal, 100000);
  assert.equal(r.variacion.absoluta, 0);
  assert.equal(r.mejor, null);
  assert.equal(r.peor, null);
  assert.equal(r.operaciones, 0);
  assert.equal(r.completo, true);
});

test('resumen: con una sola posición valorada avisa de que mejor y peor son la misma', () => {
  const r = resumen({ capitalInicial: 10000, posiciones: [CARTERA.posiciones[0]] }, PRECIOS);
  assert.equal(r.unaSola, true);
  assert.equal(r.mejor.ticker, r.peor.ticker);
});

test('resumen: una posición por peso entra en el total con su cantidad derivada', () => {
  const r = resumen({
    capitalInicial: 50000,
    posiciones: [{ ticker: 'B', estado: 'abierta', entrada: { fecha: '2026-10-05', precio: 25 }, peso: 0.2 }]
  }, { B: 30 });
  assert.equal(r.filas[0].cantidad, 400);
  assert.equal(r.costoAbierto, 10000);
  assert.equal(r.valorAbierto, 12000);
  // 40 000 de efectivo + 12 000 de la posición.
  assert.equal(r.valorTotal, 52000);
});

test('grafica: con menos de dos puntos no dibuja nada', () => {
  assert.equal(grafica([]), null);
  assert.equal(grafica([{ fecha: '2026-10-05', valor: 100000 }]), null);
});

test('grafica: la ruta empieza a la izquierda, termina a la derecha y cabe en el lienzo', () => {
  const g = grafica(
    [
      { fecha: '2026-10-05', valor: 100000 },
      { fecha: '2026-10-06', valor: 101000 },
      { fecha: '2026-10-07', valor: 99000 }
    ],
    { w: 600, h: 180, pad: 6, base: 100000 }
  );
  assert.ok(g.line.startsWith('M6 '));
  assert.ok(g.line.includes('L594 '));
  assert.equal(g.min, 99000);
  assert.equal(g.max, 101000);
  assert.equal(g.primero, 100000);
  assert.equal(g.ultimo, 99000);
  cerca(g.cambioPct, -1);
  // Todas las coordenadas dentro del lienzo.
  for (const n of g.line.match(/-?\d+(\.\d+)?/g).map(Number)) assert.ok(n >= 0 && n <= 600);
  assert.ok(g.baseY > 0 && g.baseY < 180);
  assert.ok(g.area.endsWith('Z'));
});

test('ultimoPunto: el más reciente, o null si el historial está vacío', () => {
  assert.equal(ultimoPunto({ puntos: [] }), null);
  assert.equal(ultimoPunto(null), null);
  assert.equal(ultimoPunto({ puntos: [{ fecha: '2026-10-05', valor: 1 }, { fecha: '2026-10-06', valor: 2 }] }).valor, 2);
});
