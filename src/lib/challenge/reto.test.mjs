import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fechaLocal, generador, barajar, planDelReto, planLibre, planDesdeSemilla,
  cambioPct, mediana, movimientoTipico, umbralBonito, banda, puntosDeRonda,
  indexar, armarRonda, resumen, cuadricula, nuevaRacha,
  percentilDeMovimiento, tendencia,
  RONDAS, ESPERADO_AL_AZAR, BANDAS, OCULTAS
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

const CATALOGO = ['spy', 'qqq', 'aapl', 'msft', 'nvda', 'amzn', 'btc', 'eth', 'usdmxn', 'eurusd'];

test('planDelReto: un año entero de días distintos, sin repetir el reto', () => {
  // La promesa que se le hace a quien juega todos los días: el reto de hoy no es
  // el de ninguno de los últimos 365. Se comprueba con la huella completa
  // (activos + cortes), que es lo que define la partida.
  const huellas = new Set();
  const d = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 365; i++) {
    const fecha = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
    const p = planDelReto(fecha, CATALOGO);
    huellas.add(p.activos.join(',') + '|' + p.cortes.map((c) => c.toFixed(6)).join(','));
  }
  assert.equal(huellas.size, 365, 'dos días distintos no pueden dar el mismo reto');
});

test('planDelReto: la hora, la zona y el idioma no entran en la semilla', () => {
  // Dos teléfonos, uno en México y otro en Tokio, a horas distintas del mismo
  // día mexicano: el mismo reto. Es lo que permite hablar de "el reto de hoy".
  const enMexico = fechaLocal(new Date('2026-08-23T14:05:00Z'));
  const enTokio = fechaLocal(new Date('2026-08-24T04:59:00Z'));
  assert.equal(enMexico, enTokio);
  assert.deepEqual(planDelReto(enMexico, CATALOGO), planDelReto(enTokio, CATALOGO));
  // Y el reto de ayer se puede reconstruir con solo la fecha, sin guardar nada.
  assert.deepEqual(planDelReto('2026-08-22', CATALOGO), planDelReto('2026-08-22', CATALOGO.slice()));
});

test('planLibre: misma ficha mismo reto, y admite catálogos más chicos que las rondas', () => {
  const a = planLibre('abc123', CATALOGO);
  assert.deepEqual(a, planLibre('abc123', CATALOGO));
  assert.notDeepEqual(a.activos.concat(a.cortes.map(String)), planLibre('abc124', CATALOGO).activos.concat(planLibre('abc124', CATALOGO).cortes.map(String)));
  // Filtrando por tipo quedan tres índices y las rondas son cinco: se repiten
  // con otro corte, pero solo después de que hayan salido todos.
  const tres = planLibre('solo-indices', ['spy', 'qqq', 'dia']);
  assert.equal(tres.activos.length, RONDAS);
  assert.equal(new Set(tres.activos.slice(0, 3)).size, 3, 'los tres salen antes de que se repita ninguno');
  assert.equal(new Set(tres.cortes).size, RONDAS, 'un activo repetido lleva otro corte');
  // El reto del día NUNCA repite: ahí el catálogo corto es un error.
  assert.throws(() => planDelReto('2026-08-23', ['spy', 'qqq']), /al menos 5/);
  assert.throws(() => planLibre('MAYÚSCULAS', CATALOGO), /minúsculas/);
  assert.throws(() => planDesdeSemilla('', CATALOGO), /no vacío/);
  assert.throws(() => planDesdeSemilla('x', []), /vacío/);
});

// ---------------------------------------------------------------------------
// Lo que se le cuenta al jugador al revelar: sale de los precios y de nada más
// ---------------------------------------------------------------------------
test('percentilDeMovimiento: dice si el movimiento fue de los raros o de los de siempre', () => {
  // Movimientos de un paso: +10 %, −18.18 %, +10 %.
  const s = [100, 110, 90, 99];
  // Un cambio de 0 % es más chico que los tres → percentil 0.
  cerca(percentilDeMovimiento(s, 0, 1), 0);
  // Uno de 50 % es más grande que los tres → percentil 100.
  cerca(percentilDeMovimiento(s, 50, 1), 100);
  // Uno de 15 % deja debajo a los dos de 10 % → dos de tres.
  cerca(percentilDeMovimiento(s, 15, 1), (2 / 3) * 100);
  // El signo no importa: lo que se compara es el TAMAÑO del movimiento.
  cerca(percentilDeMovimiento(s, -15, 1), percentilDeMovimiento(s, 15, 1));
  assert.throws(() => percentilDeMovimiento([1, 2], 5, 8), /más de 8 puntos/);
});

test('tendencia: hacia dónde venía la parte visible, sin decir por qué', () => {
  assert.equal(tendencia([100, 101, 102, 103], 2), 1);
  assert.equal(tendencia([103, 102, 101, 100], 2), -1);
  assert.equal(tendencia([100, 100, 80, 100], 2), 0); // dos barras después, en el mismo sitio
  assert.throws(() => tendencia([100, 101], 8), /más de 8 puntos/);
});

test('armarRonda: trae el percentil y si la tendencia siguió o se dio la vuelta', () => {
  // Sube 10 semanas seguidas y sigue subiendo: la tendencia continúa.
  const sube = Array.from({ length: 20 }, (_, i) => 100 + i);
  const fechas = sube.map((_, i) => Date.UTC(2026, 0, 1 + i * 7));
  const r = armarRonda({ id: 'x', cierres: sube, fechas, fraccion: 0, ventana: 10, ocultas: 4 });
  assert.equal(r.tendencia, 1);
  assert.equal(r.siguio, true);
  assert.ok(r.percentil >= 0 && r.percentil <= 100);
  // Ahora una que venía subiendo y se da la vuelta justo en el corte.
  const gira = [...Array.from({ length: 12 }, (_, i) => 100 + i), ...Array.from({ length: 8 }, (_, i) => 111 - i * 3)];
  const f2 = gira.map((_, i) => Date.UTC(2026, 0, 1 + i * 7));
  const g = armarRonda({ id: 'x', cierres: gira, fechas: f2, fraccion: 0, ventana: 10, ocultas: 4 });
  assert.equal(g.tendencia, 1);
  assert.equal(g.siguio, false, 'venía subiendo y bajó');
});

// ---------------------------------------------------------------------------
// Por qué NO hay filtro de dificultad
// ---------------------------------------------------------------------------
test('el umbral parte cada activo por la mitad: no hay activos “fáciles”', () => {
  // El umbral de cada ronda es la MEDIANA del |movimiento| de 8 semanas del
  // propio activo. Por definición de mediana, la mitad de sus periodos se pasan
  // de ahí y la otra mitad no: la probabilidad de que la respuesta sea "fuerte"
  // es ~50 % en TODOS los activos, tranquilos o nerviosos. Por eso un filtro de
  // "fácil / difícil" por activo prometería algo que no existe.
  const rnd = generador('prueba-dificultad');
  const serie = (vol) => {
    const out = [100];
    for (let i = 1; i < 300; i++) out.push(Math.max(1, out[i - 1] * (1 + (rnd() - 0.5) * vol)));
    return out;
  };
  for (const vol of [0.01, 0.4]) {
    const s = serie(vol);
    const med = movimientoTipico(s, OCULTAS);
    let fuertes = 0, total = 0;
    for (let i = 0; i + OCULTAS < s.length; i++) {
      total++;
      if (Math.abs(cambioPct(s[i], s[i + OCULTAS])) >= med) fuertes++;
    }
    cerca(fuertes / total, 0.5, 0.01);
    // Con el umbral ya redondeado a una cifra legible el reparto se mueve un
    // poco, pero nunca hasta convertir un activo en “el fácil”.
    const u = umbralBonito(med);
    let fuertesU = 0;
    for (let i = 0; i + OCULTAS < s.length; i++) if (Math.abs(cambioPct(s[i], s[i + OCULTAS])) >= u) fuertesU++;
    assert.ok(fuertesU / total > 0.3 && fuertesU / total < 0.7, 'reparto con umbral redondeado: ' + fuertesU / total);
  }
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
