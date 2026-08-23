import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fechaLocal, generador, barajar, planDelReto,
  cambioPct, mediana, movimientoTipico, umbralBonito, banda, puntosDeRonda,
  indexar, armarRonda, resumen, cuadricula, nuevaRacha,
  RONDAS, ESPERADO_AL_AZAR, BANDAS
} from './reto.mjs';

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `esperaba ${b}, obtuve ${a}`);

// ---------------------------------------------------------------------------
// Ronda calculada A MANO, paso por paso
// ---------------------------------------------------------------------------
// Serie de siete cierres, ventana de 3 visibles y 2 tapados.
//   cierres = [100, 101, 102, 103, 104, 105, 106]
// Con fraccion 0 el corte es el primer índice posible (ventana − 1 = 2):
//   visibles = [100, 101, 102]   ocultos = [103, 104]
//   cambio   = 104 / 102 − 1 = +1.9607843…%
// El umbral sale de la propia serie: movimientos de 2 pasos
//   100→102 = 2.0000 %   101→103 = 1.9802 %   102→104 = 1.9608 %
//   103→105 = 1.9417 %   104→106 = 1.9231 %
// ordenados: 1.9231, 1.9417, 1.9608, 1.9802, 2.0000 → mediana 1.9608 %,
// que redondeado a medios puntos da 2.0 %.
// Y como el cambio (1.96 %) se queda JUSTO por debajo del umbral (2 %), la
// banda correcta es "subió" (+1) y no "subió fuerte" (+2).
test('armarRonda: el ejemplo calculado a mano', () => {
  const cierres = [100, 101, 102, 103, 104, 105, 106];
  const fechas = cierres.map((_, i) => Date.UTC(2026, 0, 1 + i * 7));
  const r = armarRonda({ id: 'demo', cierres, fechas, fraccion: 0, ventana: 3, ocultas: 2 });
  assert.equal(r.corte, 2);
  assert.deepEqual(r.visibles, [100, 101, 102]);
  assert.deepEqual(r.ocultos, [103, 104]);
  cerca(r.cambio, 1.9607843137254832);
  assert.equal(r.umbral, 2);
  assert.equal(r.banda, 1);
  assert.equal(r.desde, fechas[0]);
  assert.equal(r.finVisible, fechas[2]);
  assert.equal(r.hasta, fechas[4]);
});

test('armarRonda: la fracción recorre la serie y nunca se sale', () => {
  const cierres = [100, 101, 102, 103, 104, 105, 106];
  const fechas = cierres.map((_, i) => Date.UTC(2026, 0, 1 + i * 7));
  const ultima = armarRonda({ id: 'demo', cierres, fechas, fraccion: 0.999, ventana: 3, ocultas: 2 });
  assert.equal(ultima.corte, 4); // el último corte posible: deja 2 tapados detrás
  assert.deepEqual(ultima.visibles, [102, 103, 104]);
  assert.deepEqual(ultima.ocultos, [105, 106]);
  for (let f = 0; f < 1; f += 0.01) {
    const r = armarRonda({ id: 'demo', cierres, fechas, fraccion: f, ventana: 3, ocultas: 2 });
    assert.equal(r.visibles.length, 3);
    assert.equal(r.ocultos.length, 2);
    assert.ok(r.corte >= 2 && r.corte <= 4, 'corte fuera de rango: ' + r.corte);
  }
});

test('armarRonda: falla ruidosamente con series cortas o fracciones imposibles', () => {
  const cierres = [100, 101, 102, 103];
  const fechas = cierres.map((_, i) => i);
  assert.throws(() => armarRonda({ id: 'x', cierres, fechas, fraccion: 0, ventana: 3, ocultas: 2 }), /al menos 5 puntos/);
  const largos = [100, 101, 102, 103, 104, 105, 106];
  const f2 = largos.map((_, i) => i);
  assert.throws(() => armarRonda({ id: 'x', cierres: largos, fechas: f2, fraccion: 1, ventana: 3, ocultas: 2 }), /fraccion/);
  assert.throws(() => armarRonda({ id: 'x', cierres: largos, fechas: [1, 2], fraccion: 0, ventana: 3, ocultas: 2 }), /mismo largo/);
});

// ---------------------------------------------------------------------------
// Umbral: se mide en el propio activo
// ---------------------------------------------------------------------------
test('movimientoTipico y umbralBonito: el umbral sale de la serie y se redondea legible', () => {
  // 100→110 = +10 %, 110→90 = −18.18 %, 90→99 = +10 % → mediana de |mov| = 10 %.
  cerca(movimientoTipico([100, 110, 90, 99], 1), 10);
  assert.equal(umbralBonito(10), 10);
  // Un activo tranquilo y uno nervioso NO comparten umbral.
  const tranquilo = [100, 100.5, 101, 100.8, 101.2, 101.5];
  const nervioso = [100, 130, 90, 140, 80, 150];
  assert.ok(umbralBonito(movimientoTipico(tranquilo, 1)) < umbralBonito(movimientoTipico(nervioso, 1)));
  // Escalones: medio punto hasta 5, un punto hasta 20, de cinco en cinco arriba.
  assert.equal(umbralBonito(2.3), 2.5);
  assert.equal(umbralBonito(7.4), 7);
  assert.equal(umbralBonito(23), 25);
  assert.equal(umbralBonito(0.01), 0.5); // nunca queda en 0
  assert.throws(() => umbralBonito(0), /mayor que 0/);
  assert.throws(() => movimientoTipico([1, 2], 8), /más de 8 puntos/);
});

test('mediana e indexar: piezas sueltas', () => {
  assert.equal(mediana([3, 1, 2]), 2);
  assert.equal(mediana([4, 1, 3, 2]), 2.5);
  const original = [3, 1, 2];
  mediana(original);
  assert.deepEqual(original, [3, 1, 2], 'mediana no debe reordenar la lista que recibe');
  assert.deepEqual(indexar([50, 75, 100], 50), [100, 150, 200]);
  assert.throws(() => mediana([]), /al menos un número/);
  assert.throws(() => cambioPct(0, 10), /no puede ser 0/);
});

// ---------------------------------------------------------------------------
// Bandas y puntos
// ---------------------------------------------------------------------------
test('banda: los cuatro cajones, con el umbral como frontera cerrada', () => {
  assert.equal(banda(-12, 10), -2);
  assert.equal(banda(-10, 10), -2); // justo en el umbral ya es "fuerte"
  assert.equal(banda(-9.9, 10), -1);
  assert.equal(banda(-0.01, 10), -1);
  assert.equal(banda(0, 10), 1);    // el 0 exacto cuenta como "subió"
  assert.equal(banda(9.9, 10), 1);
  assert.equal(banda(10, 10), 2);
  assert.throws(() => banda(5, 0), /mayor que 0/);
  assert.throws(() => banda(NaN, 5), /número/);
});

test('puntosDeRonda: 2 la banda exacta, 1 la dirección, 0 el error de dirección', () => {
  assert.equal(puntosDeRonda(2, 2), 2);
  assert.equal(puntosDeRonda(1, 2), 1);
  assert.equal(puntosDeRonda(-2, -1), 1);
  assert.equal(puntosDeRonda(-1, 2), 0);
  assert.equal(puntosDeRonda(2, -2), 0);
  assert.throws(() => puntosDeRonda(0, 2), /bandas inválidas/);
  // Y el valor esperado al azar, que es el número que se enseña al final:
  // sobre las 16 combinaciones de (elegida, real) equiprobables.
  let total = 0;
  for (const e of BANDAS) for (const r of BANDAS) total += puntosDeRonda(e, r);
  cerca(total / 16, ESPERADO_AL_AZAR / RONDAS);
  cerca(ESPERADO_AL_AZAR, 3.75);
});

test('resumen y cuadricula: la partida entera', () => {
  const respuestas = [
    { elegida: 2, real: 2 },   // 🟩
    { elegida: 1, real: 2 },   // 🟨
    { elegida: -1, real: 1 },  // ⬜
    { elegida: -2, real: -2 }, // 🟩
    { elegida: -1, real: -1 }  // 🟩
  ];
  const r = resumen(respuestas);
  assert.equal(r.puntos, 2 + 1 + 0 + 2 + 2);
  assert.equal(r.max, 10);
  assert.equal(r.exactas, 3);
  assert.equal(r.direccion, 4);
  cerca(r.azar, 3.75);
  assert.equal(cuadricula(respuestas), '🟩🟨⬜🟩🟩');
  assert.equal(resumen([]).puntos, 0);
  assert.equal(resumen([]).max, 0);
});

// ---------------------------------------------------------------------------
// El reto del día es el mismo para todo el mundo
// ---------------------------------------------------------------------------
test('planDelReto: mismo día, mismo reto; otro día, otro reto', () => {
  const catalogo = ['spy', 'qqq', 'aapl', 'msft', 'nvda', 'amzn', 'btc', 'eth', 'usdmxn', 'eurusd'];
  const a = planDelReto('2026-08-23', catalogo);
  const b = planDelReto('2026-08-23', catalogo);
  assert.deepEqual(a, b);
  assert.equal(a.activos.length, RONDAS);
  assert.equal(new Set(a.activos).size, RONDAS, 'los cinco activos deben ser distintos');
  for (const id of a.activos) assert.ok(catalogo.includes(id));
  for (const c of a.cortes) assert.ok(c >= 0 && c < 1, 'el corte debe estar en [0, 1)');
  const c = planDelReto('2026-08-24', catalogo);
  assert.notDeepEqual(a.activos.concat(a.cortes.map(String)), c.activos.concat(c.cortes.map(String)));
  assert.throws(() => planDelReto('23/08/2026', catalogo), /YYYY-MM-DD/);
  assert.throws(() => planDelReto('2026-08-23', ['spy', 'qqq']), /al menos 5/);
});

test('generador y barajar: reproducibles y sin perder elementos', () => {
  const r1 = generador('hola'), r2 = generador('hola'), r3 = generador('adios');
  const a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, [r3(), r3(), r3()]);
  for (const x of a) assert.ok(x >= 0 && x < 1);
  const lista = [1, 2, 3, 4, 5, 6, 7, 8];
  const mezclada = barajar(lista, generador('x'));
  assert.deepEqual(mezclada.slice().sort((p, q) => p - q), lista);
  assert.deepEqual(lista, [1, 2, 3, 4, 5, 6, 7, 8], 'barajar no debe tocar la lista original');
  assert.throws(() => generador(''), /no vacío/);
});

test('fechaLocal: el reto cambia a medianoche en Ciudad de México, no en UTC', () => {
  // 02:30 UTC del 24 son las 20:30 del 23 en México: sigue siendo el reto del 23.
  assert.equal(fechaLocal(new Date('2026-08-24T02:30:00Z')), '2026-08-23');
  assert.equal(fechaLocal(new Date('2026-08-24T06:30:00Z')), '2026-08-24');
  assert.equal(fechaLocal(new Date('2026-08-24T02:30:00Z'), 'UTC'), '2026-08-24');
  assert.throws(() => fechaLocal('2026-08-24'), /fecha válida/);
});

test('nuevaRacha: suma si jugaste ayer, se reinicia si te saltaste un día', () => {
  assert.equal(nuevaRacha({ ultimoDia: '2026-08-22', racha: 3 }, '2026-08-23'), 4);
  assert.equal(nuevaRacha({ ultimoDia: '2026-08-20', racha: 9 }, '2026-08-23'), 1);
  assert.equal(nuevaRacha({ ultimoDia: '2026-08-23', racha: 4 }, '2026-08-23'), 4);
  assert.equal(nuevaRacha(null, '2026-08-23'), 1);
  assert.equal(nuevaRacha({}, '2026-08-23'), 1);
  // Cambio de mes y de año.
  assert.equal(nuevaRacha({ ultimoDia: '2026-07-31', racha: 2 }, '2026-08-01'), 3);
  assert.equal(nuevaRacha({ ultimoDia: '2025-12-31', racha: 6 }, '2026-01-01'), 7);
});
