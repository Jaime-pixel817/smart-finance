import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RETO_2026, FASES, HITOS, fase, estadoHitos, diasEntre, fechaLocal, inscripcionesAbiertas, conDatos } from './actinver.mjs';

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

test('el calendario marca el renglón que está corriendo hoy', () => {
  assert.deepEqual(estadoHitos('2026-08-23'),
    { inscripciones: 'ahora', practica: 'futuro', reto: 'futuro', premiacion: 'futuro' });
  assert.deepEqual(estadoHitos('2026-09-30'),
    { inscripciones: 'ahora', practica: 'ahora', reto: 'futuro', premiacion: 'futuro' });
  assert.deepEqual(estadoHitos('2026-10-20'),
    { inscripciones: 'pasado', practica: 'pasado', reto: 'ahora', premiacion: 'futuro' });
  assert.deepEqual(estadoHitos('2026-12-10'),
    { inscripciones: 'pasado', practica: 'pasado', reto: 'pasado', premiacion: 'ahora' });
});

test('el 3 y el 4 de octubre el calendario sigue marcando las inscripciones', () => {
  // La razón de que estadoHitos vaya por fechas y no por fase: esos dos días
  // la fase es 'vispera' pero las inscripciones siguen abiertas hasta el 4.
  for (const d of ['2026-10-03', '2026-10-04']) {
    assert.equal(fase(d).id, 'vispera');
    assert.equal(estadoHitos(d).inscripciones, 'ahora');
    assert.equal(estadoHitos(d).practica, 'pasado');
    assert.equal(estadoHitos(d).reto, 'futuro');
  }
  // El 5 ya no.
  assert.equal(estadoHitos('2026-10-05').inscripciones, 'pasado');
});

test('estadoHitos devuelve exactamente los renglones de HITOS', () => {
  assert.deepEqual(Object.keys(estadoHitos('2026-08-23')).sort(), [...HITOS].sort());
  assert.throws(() => estadoHitos('agosto'), /AAAA-MM-DD/);
});

test('FASES lista todas las fases que puede devolver fase()', () => {
  const vistas = new Set(
    ['2026-01-01', '2026-08-23', '2026-09-30', '2026-10-03', '2026-10-20', '2026-12-01'].map((d) => fase(d).id)
  );
  assert.deepEqual([...vistas].sort(), [...FASES].sort());
});

test('conDatos rellena la edición y el mes de la premiación, en su idioma', () => {
  assert.equal(conDatos('Edición {y}', 'es'), 'Edición 2026');
  assert.equal(conDatos('{y} edition', 'en'), '2026 edition');
  assert.equal(conDatos('{mes}, en la BMV', 'es'), 'Diciembre de 2026, en la BMV');
  assert.equal(conDatos('{mes}, at the BMV', 'en'), 'December 2026, at the BMV');
  // Un texto sin huecos sale igual, y el mes se lee del calendario que se pase.
  assert.equal(conDatos('sin huecos', 'es'), 'sin huecos');
  assert.equal(
    conDatos('{y}: {mes}', 'en', { ...RETO_2026, edicion: 2027, premiacion: { mes: '2027-01' } }),
    '2027: January 2027'
  );
});

test('ninguna cadena del reto escribe la edición ni el mes de la premiación', () => {
  // La razón de que exista conDatos(). El comentario de src/i18n/research.ts
  // ya juraba que ninguna fecha se repetía a mano y cuatro cadenas la
  // repetían ("2026 edition", "December 2026" y sus versiones en español):
  // el día que el calendario pase a 2027 habrían seguido diciendo 2026, en
  // los dos idiomas, sin que nada falle. Se lee el fichero como texto porque
  // es TypeScript y `node --test` no lo puede importar.
  const src = readFileSync(new URL('../../i18n/research.ts', import.meta.url), 'utf8');
  const bloques = [...src.matchAll(/\n  retoH:[\s\S]*?\n  retoSourceP:.*\n/g)].map((m) => m[0]);
  assert.equal(bloques.length, 2, 'tiene que haber un bloque de textos del reto por idioma');
  for (const b of bloques) {
    assert.ok(!b.includes(String(RETO_2026.edicion)), 'la edición va en {y}, no escrita: ' + String(RETO_2026.edicion));
    for (const mes of ['December', 'Diciembre', 'diciembre']) {
      assert.ok(!b.includes(mes), 'el mes de la premiación va en {mes}, no escrito: ' + mes);
    }
  }
  // Y los huecos están de verdad puestos, no es que se hayan borrado.
  assert.equal(bloques.filter((b) => b.includes('{y}') && b.includes('{mes}')).length, 2);
});
