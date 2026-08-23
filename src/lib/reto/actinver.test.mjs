import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RETO_2026, FASES, fase, diasEntre, fechaLocal, inscripcionesAbiertas } from './actinver.mjs';

test('el calendario es el que publica retoactinver.com', () => {
  assert.equal(RETO_2026.inscripciones.desde, '2026-07-27');
  assert.equal(RETO_2026.inscripciones.hasta, '2026-10-04');
  assert.equal(RETO_2026.practica.desde, '2026-09-28');
  assert.equal(RETO_2026.practica.hasta, '2026-10-02');
  assert.equal(RETO_2026.reto.desde, '2026-10-05');
  assert.equal(RETO_2026.reto.hasta, '2026-11-13');
  assert.equal(RETO_2026.premiacion.mes, '2026-12');
  assert.equal(RETO_2026.capitalVirtual, 1000000);
  // Sin fuente y sin fecha de consulta la página no podría citar de dónde salen.
  assert.match(RETO_2026.fuente.url, /^https:\/\/www\.retoactinver\.com/);
  assert.match(RETO_2026.fuente.consultada, /^\d{4}-\d{2}-\d{2}$/);
});

test('el 23 de agosto de 2026 estamos en INSCRIPCIONES, no en prácticas', () => {
  // La razón de que este módulo exista. El día en que se escribió la página,
  // decir "estamos en la semana de práctica" habría sido falso por 36 días.
  const f = fase('2026-08-23');
  assert.equal(f.id, 'inscripciones');
  assert.equal(f.siguiente, 'practica');
  assert.equal(f.siguienteFecha, '2026-09-28');
  assert.equal(f.faltan, 36);
  assert.equal(f.inscripciones, true);
});

test('cada fase empieza y termina donde dice el calendario', () => {
  const id = (d) => fase(d).id;
  assert.equal(id('2026-07-26'), 'antes');        // víspera de las inscripciones
  assert.equal(id('2026-07-27'), 'inscripciones'); // primer día
  assert.equal(id('2026-09-27'), 'inscripciones'); // último antes de la práctica
  assert.equal(id('2026-09-28'), 'practica');      // primer día de práctica
  assert.equal(id('2026-10-02'), 'practica');      // último día de práctica
  assert.equal(id('2026-10-03'), 'vispera');       // ya no es práctica y el reto no arranca
  assert.equal(id('2026-10-04'), 'vispera');
  assert.equal(id('2026-10-05'), 'reto');          // arranca el reto
  assert.equal(id('2026-11-13'), 'reto');          // cierre: todavía cuenta
  assert.equal(id('2026-11-14'), 'resultados');
  assert.equal(id('2027-03-01'), 'resultados');    // y se queda ahí, no vuelve a empezar
});

test('los dos días entre la práctica y el arranque no se llaman "práctica"', () => {
  // Redondear el 3 y el 4 de octubre hacia la semana de práctica sería la
  // manera más fácil de que la página dijera algo falso dos días al año.
  for (const d of ['2026-10-03', '2026-10-04']) {
    assert.notEqual(fase(d).id, 'practica');
    assert.equal(fase(d).siguiente, 'reto');
  }
});

test('las inscripciones siguen abiertas durante la semana de práctica', () => {
  // Se solapan: práctica del 28-sep al 2-oct, inscripciones hasta el 4-oct.
  assert.equal(fase('2026-09-30').inscripciones, true);
  assert.equal(fase('2026-10-04').inscripciones, true);
  assert.equal(fase('2026-10-05').inscripciones, false);
  assert.equal(fase('2026-07-26').inscripciones, false);
  assert.equal(inscripcionesAbiertas('2026-08-23'), true);
});

test('la cuenta atrás apunta siempre al hito que viene', () => {
  assert.deepEqual(
    ['2026-07-01', '2026-09-27', '2026-09-28', '2026-10-04', '2026-10-05'].map((d) => {
      const f = fase(d);
      return [f.siguiente, f.faltan];
    }),
    [['inscripciones', 26], ['practica', 1], ['reto', 7], ['reto', 1], ['cierre', 39]]
  );
  // El día del hito la cuenta es 0, no 1 ni −1.
  assert.equal(fase('2026-09-28').faltan > 0, true);
  assert.equal(fase('2026-11-13').faltan, 0);
});

test('cuando el reto termina no hay cuenta atrás inventada', () => {
  // La premiación solo tiene mes publicado ("diciembre de 2026"), no día. Sin
  // día no hay días que faltan, y la página no se saca uno de la manga.
  const f = fase('2026-11-20');
  assert.equal(f.id, 'resultados');
  assert.equal(f.siguiente, null);
  assert.equal(f.siguienteFecha, null);
  assert.equal(f.faltan, null);
});

test('la fase se calcula con el día en México, no en UTC', () => {
  // 2026-09-28T02:00:00Z son las 20:00 del 27 de septiembre en la CDMX: en UTC
  // ya sería el primer día de práctica, en México todavía no.
  assert.equal(fechaLocal(new Date('2026-09-28T02:00:00Z')), '2026-09-27');
  assert.equal(fase(fechaLocal(new Date('2026-09-28T02:00:00Z'))).id, 'inscripciones');
  // 2026-09-28T12:00:00Z = 06:00 del 28 en la CDMX: ahí sí.
  assert.equal(fase(fechaLocal(new Date('2026-09-28T12:00:00Z'))).id, 'practica');
});

test('diasEntre cuenta días enteros y no se marea con el horario de verano', () => {
  // Del 25 de octubre al 2 de noviembre de 2026 EE. UU. vuelve al horario
  // estándar. Contando en UTC eso da igual; contando con relojes locales, no.
  assert.equal(diasEntre('2026-10-25', '2026-11-02'), 8);
  assert.equal(diasEntre('2026-08-23', '2026-09-28'), 36);
  assert.equal(diasEntre('2026-08-23', '2026-08-23'), 0);
  assert.equal(diasEntre('2026-08-24', '2026-08-23'), -1);
});

test('una fecha mal escrita se cae en vez de enseñar la fase equivocada', () => {
  assert.throws(() => fase('23/08/2026'), /AAAA-MM-DD/);
  assert.throws(() => fase(undefined), /AAAA-MM-DD/);
  assert.throws(() => diasEntre('2026-08-23', 'mañana'), /AAAA-MM-DD/);
  assert.throws(() => fechaLocal(new Date('nada')), /fecha válida/);
});

test('FASES lista todas las fases que puede devolver fase()', () => {
  const vistas = new Set(
    ['2026-01-01', '2026-08-23', '2026-09-30', '2026-10-03', '2026-10-20', '2026-12-01'].map((d) => fase(d).id)
  );
  assert.deepEqual([...vistas].sort(), [...FASES].sort());
});
