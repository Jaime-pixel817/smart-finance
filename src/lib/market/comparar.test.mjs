import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarSerie, ventanaComun, recortar, base100, cambioPct, comparar } from './comparar.mjs';

const cerca = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);
const D = 86400;
/** Serie diaria a partir del día `t0`, con los valores dados. */
const serie = (t0, valores) => valores.map((v, i) => [t0 + i * D, v]);

test('limpiarSerie ordena, tira basura y colapsa timestamps repetidos', () => {
  const s = limpiarSerie([[3, 30], [1, 10], [2, NaN], [1, 11], ['x', 1], [4, 40]]);
  assert.deepEqual(s, [[1, 11], [3, 30], [4, 40]]);
});

test('base100 pone el primer punto en 100 y respeta las proporciones', () => {
  const r = base100(serie(0, [50, 55, 45]));
  assert.deepEqual(r.map((p) => p[0]), [0, D, 2 * D]);
  [100, 110, 90].forEach((v, i) => cerca(r[i][1], v));
  assert.equal(base100([]), null);
  assert.equal(base100([[0, 0], [D, 5]]), null, 'con base cero no se puede dividir');
});

test('cambioPct es el porcentaje desde el principio del rango', () => {
  cerca(cambioPct(base100(serie(0, [50, 55]))), 10);
  cerca(cambioPct(base100(serie(0, [50, 45]))), -10);
  assert.equal(cambioPct(null), null);
});

test('la ventana común va del último primer punto al primer último punto', () => {
  const a = serie(0, [1, 2, 3, 4]);          // 0 … 3D
  const b = serie(D, [1, 2, 3, 4]);          // 1D … 4D
  assert.deepEqual(ventanaComun([a, b]), { desde: D, hasta: 3 * D });
  assert.equal(ventanaComun([a, serie(10 * D, [1, 2])]), null, 'sin solape no hay ventana');
  assert.equal(ventanaComun([]), null);
  assert.equal(ventanaComun([a, []]), null);
});

test('recortar deja los dos extremos dentro', () => {
  assert.deepEqual(recortar(serie(0, [1, 2, 3, 4]), D, 2 * D), [[D, 2], [2 * D, 3]]);
});

// El caso que motiva todo esto: dos activos con precios de escalas
// distintísimas (un ETF de ~600 y una divisa de ~18) tienen que salir
// comparables sin un segundo eje.
test('dos activos de escalas distintas empiezan los dos en 100', () => {
  const r = comparar([
    { clave: 'SPY', puntos: serie(0, [600, 606, 630]) },
    { clave: 'USDMXN', puntos: serie(0, [18, 18.9, 17.1]) }
  ]);
  assert.equal(r.series.length, 2);
  assert.equal(r.series[0].puntos[0][1], 100);
  assert.equal(r.series[1].puntos[0][1], 100);
  cerca(r.series[0].cambioPct, 5);     // 600 → 630
  cerca(r.series[1].cambioPct, -5);    // 18 → 17.1
  assert.deepEqual(r.fuera, []);
});

// Cripto cotiza 24/7 y la bolsa no: si cada uno se rebasara sobre su propio
// primer punto, empezarían en días distintos y la comparación vendría torcida.
test('cada serie se rebasa sobre la ventana COMÚN, no sobre su propio inicio', () => {
  const cripto = serie(0, [100, 200, 220, 242]);   // empieza un día antes
  const accion = serie(D, [50, 55, 60]);           // 1D … 3D
  const r = comparar([{ clave: 'BTC', puntos: cripto }, { clave: 'SPY', puntos: accion }]);
  assert.deepEqual({ desde: r.desde, hasta: r.hasta }, { desde: D, hasta: 3 * D });
  // BTC se rebasa sobre 200 (su valor en 1D), no sobre 100: +21 %, no +142 %.
  assert.equal(Math.round(r.series[0].cambioPct), 21);
  assert.equal(Math.round(r.series[1].cambioPct), 20);
  assert.equal(r.series[0].puntos.length, 3, 'el punto de antes de la ventana no se dibuja');
});

test('tres activos también, y el orden que entra es el que sale', () => {
  const r = comparar([
    { clave: 'a', puntos: serie(0, [10, 12]) },
    { clave: 'b', puntos: serie(0, [1, 1.5]) },
    { clave: 'c', puntos: serie(0, [500, 450]) }
  ]);
  assert.deepEqual(r.series.map((s) => s.clave), ['a', 'b', 'c']);
  assert.deepEqual(r.series.map((s) => Math.round(s.cambioPct)), [20, 50, -10]);
});

test('un activo sin datos se queda fuera con su razón, y el resto se compara igual', () => {
  const r = comparar([
    { clave: 'SPY', puntos: serie(0, [600, 630]) },
    { clave: 'ROTO', puntos: [] }
  ]);
  assert.deepEqual(r.series.map((s) => s.clave), ['SPY']);
  assert.deepEqual(r.fuera, [{ clave: 'ROTO', razon: 'sin datos' }]);
});

test('sin ningún tramo en común se dibuja el que más cubre y se dice quién no llegó', () => {
  const r = comparar([
    { clave: 'VIEJO', puntos: serie(0, [1, 2, 3]) },
    { clave: 'NUEVO', puntos: serie(100 * D, [1, 2]) }
  ]);
  assert.deepEqual(r.series.map((s) => s.clave), ['VIEJO']);
  assert.deepEqual(r.fuera, [{ clave: 'NUEVO', razon: 'sin tramo en común' }]);
});

test('sin nada que comparar devuelve null, no una gráfica vacía', () => {
  assert.equal(comparar([]), null);
  assert.equal(comparar([{ clave: 'a', puntos: [[0, 1]] }]), null, 'un solo punto no es una serie');
  assert.equal(comparar(null), null);
});
