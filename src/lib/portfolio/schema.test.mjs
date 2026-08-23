// Pruebas del esquema de las carteras (src/lib/portfolio/schema.mjs).
//
// Lo que se comprueba aquí es lo que NO puede pasar nunca en una página de
// dinero: una posición cerrada sin precio de salida, una compra anterior al
// inicio del reto, títulos y peso a la vez, una clave mal escrita que se cuele
// en silencio. Cada uno de estos casos tiene que tumbar el build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { posicionSchema, carteraSchema, historialSchema, leer } from './schema.mjs';

const POS = {
  ticker: 'WALMEX',
  nombre: 'Wal-Mart de México',
  mercado: 'BMV',
  historyPair: 'WALMEX',
  entrada: { fecha: '2026-10-05', precio: 60 },
  cantidad: 1000,
  peso: null,
  tesis: { es: 'La compré porque tal cosa y tal otra.', en: 'I bought it because of this and that.' },
  riesgo: { es: 'Lo que más puede salir mal es esto otro.', en: 'The main thing that can go wrong is this.' },
  estado: 'abierta',
  salida: null
};

const CARTERA = {
  _lee_esto: 'Cartera de prueba con su nota para Jaime, suficientemente larga.',
  _comoAnadirUnaPosicion: ['Primer paso del instructivo.', 'Segundo paso del instructivo.', 'Tercer paso del instructivo.'],
  version: 1,
  tipo: 'actinver',
  moneda: 'MXN',
  capitalInicial: 100000,
  inicio: '2026-10-05',
  fin: '2026-11-13',
  practica: { inicio: '2026-09-28', fin: '2026-10-02' },
  actualizado: '2026-08-23',
  posiciones: [POS],
  _ejemplo: POS
};

const malla = (schema, valor) => schema.safeParse(valor);
const mensajes = (r) => r.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join(' | ');

test('una posición bien escrita pasa', () => {
  assert.equal(malla(posicionSchema, POS).success, true);
});

test('el inglés es opcional: sin él, la posición sigue siendo válida', () => {
  const p = { ...POS, tesis: { es: POS.tesis.es }, riesgo: { es: POS.riesgo.es } };
  assert.equal(malla(posicionSchema, p).success, true);
});

test('una posición cerrada sin precio de salida no pasa', () => {
  const r = malla(posicionSchema, { ...POS, estado: 'cerrada' });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /salida/);
});

test('una posición abierta con salida no pasa', () => {
  const r = malla(posicionSchema, { ...POS, salida: { fecha: '2026-10-12', precio: 62 } });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /abierta/);
});

test('vender antes de comprar no pasa', () => {
  const r = malla(posicionSchema, { ...POS, estado: 'cerrada', salida: { fecha: '2026-10-01', precio: 62 } });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /anterior a la compra/);
});

test('títulos y peso a la vez, o ninguno de los dos, no pasa', () => {
  assert.equal(malla(posicionSchema, { ...POS, peso: 0.2 }).success, false);
  assert.equal(malla(posicionSchema, { ...POS, cantidad: null, peso: null }).success, false);
});

test('un precio negativo o un cero no pasan', () => {
  assert.equal(malla(posicionSchema, { ...POS, entrada: { fecha: '2026-10-05', precio: 0 } }).success, false);
  assert.equal(malla(posicionSchema, { ...POS, cantidad: -10 }).success, false);
});

test('una clave mal escrita no se cuela en silencio', () => {
  const r = malla(posicionSchema, { ...POS, tickr: 'WALMEX' });
  assert.equal(r.success, false);
});

test('una tesis de dos palabras no cuenta como tesis', () => {
  const r = malla(posicionSchema, { ...POS, tesis: { es: 'porque sí' } });
  assert.equal(r.success, false);
});

test('el ticker va sin el sufijo del mercado', () => {
  assert.equal(malla(posicionSchema, { ...POS, ticker: 'WALMEX.MX' }).success, true, 'el punto se permite (PE&OLES, LIVEPOLC-1)');
  assert.equal(malla(posicionSchema, { ...POS, ticker: 'walmex' }).success, false);
});

test('una cartera completa pasa, y la del repo también', () => {
  assert.equal(malla(carteraSchema, CARTERA).success, true);
});

test('comprar antes de que empiece el reto no pasa', () => {
  const r = malla(carteraSchema, { ...CARTERA, posiciones: [{ ...POS, entrada: { fecha: '2026-09-30', precio: 60 } }] });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /anterior al inicio/);
});

test('una posición por peso sin capital inicial no pasa', () => {
  const r = malla(carteraSchema, {
    ...CARTERA, capitalInicial: null,
    posiciones: [{ ...POS, cantidad: null, peso: 0.2 }]
  });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /capitalInicial/);
});

test('los pesos no pueden sumar más del 100 % del capital', () => {
  const r = malla(carteraSchema, {
    ...CARTERA,
    posiciones: [
      { ...POS, cantidad: null, peso: 0.7 },
      { ...POS, ticker: 'GMEXICOB', cantidad: null, peso: 0.5 }
    ]
  });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /suman/);
});

test('una posición en otra moneda no pasa: aquí no se convierten divisas', () => {
  const r = malla(carteraSchema, { ...CARTERA, posiciones: [{ ...POS, moneda: 'USD' }] });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /divisas/);
});

test('una acción de Nueva York no cabe en una cartera en pesos', () => {
  const r = malla(carteraSchema, { ...CARTERA, posiciones: [{ ...POS, ticker: 'SPY', mercado: 'US' }] });
  assert.equal(r.success, false);
  assert.match(mensajes(r), /divisas/);
  // En una cartera en dólares, la misma posición pasa.
  assert.equal(
    malla(carteraSchema, { ...CARTERA, moneda: 'USD', posiciones: [{ ...POS, ticker: 'SPY', mercado: 'US' }] }).success,
    true
  );
});

test('una fecha inventada no pasa', () => {
  assert.equal(malla(carteraSchema, { ...CARTERA, actualizado: '2026-13-45' }).success, false);
  assert.equal(malla(carteraSchema, { ...CARTERA, actualizado: '23/08/2026' }).success, false);
});

test('el historial va en orden y sin fechas repetidas', () => {
  const base = {
    _lee_esto: 'Foto diaria escrita por el workflow; no se edita a mano.',
    version: 1, moneda: 'MXN', puntos: []
  };
  const punto = (fecha, valor) => ({ fecha, valor, efectivo: 0, posiciones: valor, precios: { WALMEX: 60 } });
  assert.equal(malla(historialSchema, base).success, true);
  assert.equal(malla(historialSchema, { ...base, puntos: [punto('2026-10-05', 1), punto('2026-10-06', 2)] }).success, true);
  assert.equal(malla(historialSchema, { ...base, puntos: [punto('2026-10-06', 2), punto('2026-10-05', 1)] }).success, false);
  assert.equal(malla(historialSchema, { ...base, puntos: [punto('2026-10-05', 1), punto('2026-10-05', 1)] }).success, false);
});

test('leer(): el error dice el archivo y el campo, no "invalid input"', () => {
  try {
    leer(carteraSchema, { ...CARTERA, posiciones: [{ ...POS, estado: 'cerrada' }] }, 'src/data/actinver.json');
    assert.fail('tenía que lanzar');
  } catch (e) {
    assert.match(e.message, /src\/data\/actinver\.json/);
    assert.match(e.message, /posiciones\.0\.salida/);
  }
});
