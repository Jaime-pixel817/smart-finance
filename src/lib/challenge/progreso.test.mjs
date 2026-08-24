import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progresoVacio, leerProgreso, registrarDia, yaJugado, rachaVigente,
  totales, calendario, diaAnterior, MAX_DIAS
} from './progreso.mjs';

const dia = (fecha, puntos, exactas = 0, max = 10) => ({ fecha, puntos, max, exactas });

// ---------------------------------------------------------------------------
// La racha
// ---------------------------------------------------------------------------
test('racha: tres días seguidos suman tres', () => {
  let p = progresoVacio();
  p = registrarDia(p, dia('2026-08-21', 6, 2));
  assert.equal(p.racha, 1);
  p = registrarDia(p, dia('2026-08-22', 4, 1));
  assert.equal(p.racha, 2);
  p = registrarDia(p, dia('2026-08-23', 8, 3));
  assert.equal(p.racha, 3);
  assert.equal(p.mejorRacha, 3);
  assert.equal(p.ultimoDia, '2026-08-23');
});

test('racha: saltarse un día la reinicia, y la mejor se queda guardada', () => {
  let p = progresoVacio();
  for (const f of ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21']) p = registrarDia(p, dia(f, 5));
  assert.equal(p.racha, 4);
  // 22 sin jugar. El 23 vuelve: la racha empieza de nuevo…
  p = registrarDia(p, dia('2026-08-23', 5));
  assert.equal(p.racha, 1, 'saltarse un día reinicia la racha');
  // …pero la mejor marca no se pierde, y los días jugados siguen ahí.
  assert.equal(p.mejorRacha, 4);
  assert.equal(totales(p).dias, 5);
  assert.equal(yaJugado(p, '2026-08-22'), false);
});

test('rachaVigente: la racha se enseña solo si sigue viva', () => {
  const p = registrarDia(progresoVacio(), dia('2026-08-22', 7));
  // El mismo día y el día siguiente, viva: todavía se está a tiempo.
  assert.equal(rachaVigente(p, '2026-08-22'), 1);
  assert.equal(rachaVigente(p, '2026-08-23'), 1);
  // Dos días después ya está rota, y enseñar "racha: 1" sería mentir.
  assert.equal(rachaVigente(p, '2026-08-24'), 0);
  assert.equal(rachaVigente(progresoVacio(), '2026-08-24'), 0);
  assert.throws(() => rachaVigente(p, '24/08/2026'), /YYYY-MM-DD/);
});

test('racha: cambio de mes y de año', () => {
  let p = registrarDia(progresoVacio(), dia('2025-12-31', 5));
  p = registrarDia(p, dia('2026-01-01', 6));
  assert.equal(p.racha, 2);
  assert.equal(diaAnterior('2026-03-01'), '2026-02-28');
  assert.equal(diaAnterior('2028-03-01'), '2028-02-29', 'año bisiesto');
  assert.equal(diaAnterior('2026-01-01'), '2025-12-31');
});

// ---------------------------------------------------------------------------
// Solo cuenta el primer intento del día
// ---------------------------------------------------------------------------
test('registrarDia: repetir el mismo día no reescribe la puntuación', () => {
  let p = registrarDia(progresoVacio(), dia('2026-08-23', 4, 1));
  p = registrarDia(p, dia('2026-08-23', 10, 5));
  assert.equal(p.dias['2026-08-23'].p, 4, 'se queda el primer resultado');
  assert.equal(totales(p).dias, 1);
  assert.equal(totales(p).puntos, 4);
  assert.equal(p.racha, 1);
});

test('registrarDia: no muta lo que recibe y valida lo imposible', () => {
  const antes = registrarDia(progresoVacio(), dia('2026-08-23', 4));
  const copia = JSON.parse(JSON.stringify(antes));
  registrarDia(antes, dia('2026-08-24', 6));
  assert.deepEqual(antes, copia, 'registrarDia devuelve uno nuevo, no toca el original');
  assert.throws(() => registrarDia(progresoVacio(), dia('23/08/2026', 4)), /YYYY-MM-DD/);
  assert.throws(() => registrarDia(progresoVacio(), dia('2026-08-23', 11)), /entre 0 y max/);
  assert.throws(() => registrarDia(progresoVacio(), dia('2026-08-23', -1)), /entre 0 y max/);
});

test('registrarDia: un día anterior se apunta pero no toca la racha', () => {
  let p = registrarDia(progresoVacio(), dia('2026-08-23', 6));
  p = registrarDia(p, dia('2026-08-10', 8));
  assert.equal(p.ultimoDia, '2026-08-23');
  assert.equal(p.racha, 1, 'un día viejo no puede inflar la racha');
  assert.equal(yaJugado(p, '2026-08-10'), true);
});

// ---------------------------------------------------------------------------
// Lo guardado: se valida, se migra y no crece sin fin
// ---------------------------------------------------------------------------
test('leerProgreso: aguanta basura sin romperse', () => {
  assert.deepEqual(leerProgreso(null), progresoVacio());
  assert.deepEqual(leerProgreso('{no es json'), progresoVacio());
  assert.deepEqual(leerProgreso('[]'), progresoVacio());
  assert.deepEqual(leerProgreso('"hola"'), progresoVacio());
  const sucio = leerProgreso(JSON.stringify({
    v: 2, ultimoDia: 'ayer', racha: -3, mejorRacha: 'ocho',
    dias: { '2026-08-23': { p: 7, e: 2, m: 10 }, 'mañana': { p: 1, m: 2 }, '2026-08-24': { p: 99, m: 10 } }
  }));
  assert.equal(sucio.ultimoDia, null);
  assert.equal(sucio.racha, 0);
  assert.deepEqual(Object.keys(sucio.dias), ['2026-08-23'], 'se tira la fecha inválida y la puntuación imposible');
});

test('leerProgreso: migra la clave vieja sf:reto:v1', () => {
  const p = leerProgreso(null, JSON.stringify({ ultimoDia: '2026-08-22', racha: 5, puntos: 7 }));
  assert.equal(p.racha, 5);
  assert.equal(p.mejorRacha, 5);
  assert.equal(p.ultimoDia, '2026-08-22');
  assert.equal(p.dias['2026-08-22'].p, 7);
  // Y desde ahí la racha sigue contando como si nada.
  assert.equal(registrarDia(p, dia('2026-08-23', 6)).racha, 6);
});

test('leerProgreso: no guarda más de MAX_DIAS días', () => {
  const dias = {};
  const base = new Date(Date.UTC(2024, 0, 1));
  for (let i = 0; i < MAX_DIAS + 30; i++) {
    const d = new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10);
    dias[d] = { p: 5, e: 1, m: 10 };
  }
  const p = leerProgreso(JSON.stringify({ v: 2, ultimoDia: null, racha: 0, mejorRacha: 0, dias }));
  const claves = Object.keys(p.dias).sort();
  assert.equal(claves.length, MAX_DIAS);
  assert.equal(claves[claves.length - 1], new Date(base.getTime() + (MAX_DIAS + 29) * 86400000).toISOString().slice(0, 10),
    'se tiran los días viejos, no los recientes');
});

// ---------------------------------------------------------------------------
// Totales y calendario
// ---------------------------------------------------------------------------
test('totales: días, puntos, exactas y media', () => {
  assert.deepEqual(totales(progresoVacio()), { dias: 0, puntos: 0, max: 0, exactas: 0, mejorRacha: 0, media: null });
  let p = registrarDia(progresoVacio(), dia('2026-08-22', 6, 2));
  p = registrarDia(p, dia('2026-08-23', 8, 3));
  const t = totales(p);
  assert.equal(t.dias, 2);
  assert.equal(t.puntos, 14);
  assert.equal(t.max, 20);
  assert.equal(t.exactas, 5);
  assert.equal(t.media, 7);
});

test('calendario: agosto de 2026 empieza en sábado y cabe en seis semanas', () => {
  let p = registrarDia(progresoVacio(), dia('2026-08-23', 8, 3));
  p = registrarDia(p, dia('2026-08-01', 2, 0));
  const c = calendario(p, 2026, 8, '2026-08-23');
  // 5 huecos + 31 días = 36 celdas: seis filas.
  assert.equal(c.semanas.length, 6);
  for (const s of c.semanas) assert.equal(s.length, 7, 'todas las filas son de siete');
  // El 1 de agosto de 2026 es sábado: cinco huecos antes (lunes a viernes).
  assert.deepEqual(c.semanas[0].slice(0, 5), [null, null, null, null, null]);
  assert.equal(c.semanas[0][5].dia, 1);
  assert.equal(c.semanas[0][5].puntos, 2);
  // Los 31 días están, ninguno repetido.
  const dias = c.semanas.flat().filter(Boolean);
  assert.equal(dias.length, 31);
  const hoy = dias.find((d) => d.fecha === '2026-08-23');
  assert.equal(hoy.hoy, true);
  assert.equal(hoy.puntos, 8);
  assert.equal(dias.find((d) => d.fecha === '2026-08-24').futuro, true);
  assert.equal(dias.find((d) => d.fecha === '2026-08-22').jugado, false);
  assert.equal(dias.find((d) => d.fecha === '2026-08-22').futuro, false);
});

test('calendario: febrero bisiesto, meses que empiezan en lunes y validación', () => {
  const feb = calendario(progresoVacio(), 2028, 2, '2028-02-15');
  assert.equal(feb.semanas.flat().filter(Boolean).length, 29);
  // Junio de 2026 empieza en lunes: la primera fila no lleva huecos.
  const jun = calendario(progresoVacio(), 2026, 6, '2026-06-10');
  assert.equal(jun.semanas[0][0].dia, 1);
  assert.throws(() => calendario(progresoVacio(), 2026, 13, '2026-08-23'), /1–12/);
  assert.throws(() => calendario(progresoVacio(), 2026, 8, 'hoy'), /YYYY-MM-DD/);
});
