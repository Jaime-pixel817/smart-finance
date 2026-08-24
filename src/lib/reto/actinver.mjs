// El calendario del Reto Actinver 2026 y la FASE en la que está hoy.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTO ES UN MÓDULO Y NO UNA FRASE ESCRITA EN LA PÁGINA
// ═══════════════════════════════════════════════════════════════════════════
// El sitio es estático: lo que diga una página lo decide el día del BUILD, no
// el día en que alguien la lee. Una frase escrita a mano —"estamos en la
// semana de práctica"— es verdad la tarde en que se escribe y mentira el resto
// del año, sin que nada avise. Es el mismo error del horario de la BMV, que
// tuvo al sitio diciendo "BMV abierta" una hora después del cierre real
// (src/lib/market/bmv.mjs).
//
// Así que la fase NO se escribe: se calcula con la fecha, a partir del
// calendario publicado por Actinver. La página pinta las cinco fases y enseña
// la que toca; src/scripts/reto-fase.ts la vuelve a calcular en el navegador
// con el reloj de quien lee, así que aunque el sitio lleve meses sin
// desplegarse la página sigue diciendo la verdad.
//
// ═══════════════════════════════════════════════════════════════════════════
// DE DÓNDE SALEN LAS FECHAS
// ═══════════════════════════════════════════════════════════════════════════
// De https://www.retoactinver.com, sección "Preguntas frecuentes" → "¿Cuáles
// son las fechas importantes?", consultada el 23 de agosto de 2026. Copiadas
// literales:
//
//     ● Registro: 15 de abril de 2026
//     ● Inscripciones: del 27 de julio al 04 de octubre de 2026
//     ● Semana de práctica: del 28 de septiembre al 02 de octubre de 2026
//     ● Inicio del Reto Actinver 2026: lunes 05 de octubre de 2026
//     ● Cierre del Reto Actinver 2026: viernes 13 de noviembre de 2026
//     ● Premiación: diciembre de 2026 en el PH de la Bolsa Mexicana de Valores
//
// Y del mismo sitio, la descripción del simulador: "Un simulador con 1 millón
// de pesos virtuales para aprender a invertir en la Bolsa Mexicana de Valores
// en tiempo real."
//
// OJO, el sitio de Actinver se contradice a sí mismo: el banner de portada
// dice "Último día para inscribirte: 2 de octubre de 2026" mientras que las
// preguntas frecuentes dicen 4 de octubre. Aquí manda el calendario de las
// preguntas frecuentes, que es la lista oficial de fechas, y la página enseña
// la fuente y el día en que se consultó para que cualquiera lo compruebe.
//
// Smart Finance no está afiliado a Actinver ni al Reto Actinver: esto es el
// calendario de un evento de terceros, copiado de su sitio.

import { month } from '../research/format.mjs';

/** Calendario 2026, tal como lo publica retoactinver.com. Fechas civiles en México. */
export const RETO_2026 = {
  edicion: 2026,
  /** Millón de "actipesos" virtuales del simulador. */
  capitalVirtual: 1000000,
  moneda: 'MXN',
  registro: '2026-04-15',
  inscripciones: { desde: '2026-07-27', hasta: '2026-10-04' },
  practica: { desde: '2026-09-28', hasta: '2026-10-02' },
  reto: { desde: '2026-10-05', hasta: '2026-11-13' },
  /** La premiación no tiene día publicado, solo mes y lugar. No se inventa uno. */
  premiacion: { mes: '2026-12' },
  sitio: 'https://www.retoactinver.com',
  fuente: { url: 'https://www.retoactinver.com', consultada: '2026-08-23' }
};

/** Las fases, en orden. El id es la clave de los textos en src/i18n/research.ts. */
export const FASES = ['antes', 'inscripciones', 'practica', 'vispera', 'reto', 'resultados'];

/**
 * Rellena los dos huecos que los textos del reto dejan a propósito:
 * `{y}` la edición y `{mes}` el mes de la premiación, ya escrito en su idioma.
 *
 * Es la misma regla que la fase, un escalón más abajo: la edición y el mes
 * son DATOS del calendario, así que si se escriben en src/i18n/research.ts
 * hay que acordarse de cambiarlos en cuatro cadenas y dos idiomas el día que
 * cambie el calendario — y nadie se acuerda. Aquí solo hay un sitio.
 *
 * @param {string} txt texto con `{y}` y/o `{mes}`
 * @param {'en'|'es'} loc
 * @param {typeof RETO_2026} cal
 */
export function conDatos(txt, loc = 'en', cal = RETO_2026) {
  return String(txt)
    .replaceAll('{y}', String(cal.edicion))
    .replaceAll('{mes}', month(cal.premiacion.mes, loc));
}

/**
 * Fecha civil (YYYY-MM-DD) en una zona horaria.
 *
 * Va en México, no en UTC: desde las 18:00 hora de la CDMX el UTC ya es
 * "mañana", así que con UTC la página adelantaría el cambio de fase media
 * tarde. Es la misma razón que en src/lib/challenge/reto.mjs.
 * @param {Date} d
 * @param {string} zona zona IANA
 * @returns {string} 'AAAA-MM-DD'
 */
export function fechaLocal(d = new Date(), zona = 'America/Mexico_City') {
  if (!(d instanceof Date) || isNaN(d.getTime())) throw new Error('fechaLocal: hace falta una fecha válida');
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Los cuatro renglones del calendario, en el orden en que se pintan. */
export const HITOS = ['inscripciones', 'practica', 'reto', 'premiacion'];

/**
 * Cómo va cada renglón del calendario ese día: 'pasado' | 'ahora' | 'futuro'.
 *
 * Va por FECHAS y no por la fase, a propósito: el 3 y el 4 de octubre la fase
 * es 'vispera' (ni práctica ni reto) pero las inscripciones SIGUEN abiertas, y
 * ese renglón tiene que decir "ahora". Con un mapa fase → renglón, esos dos
 * días el calendario se quedaría sin nada marcado o marcaría el renglón
 * equivocado.
 *
 * @param {string} hoy 'AAAA-MM-DD'
 * @returns {Record<string, 'pasado'|'ahora'|'futuro'>}
 */
export function estadoHitos(hoy, cal = RETO_2026) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hoy))) throw new Error('estadoHitos: hace falta una fecha AAAA-MM-DD, llegó ' + hoy);
  const tramo = ({ desde, hasta }) => (hoy < desde ? 'futuro' : hoy > hasta ? 'pasado' : 'ahora');
  return {
    inscripciones: tramo(cal.inscripciones),
    practica: tramo(cal.practica),
    reto: tramo(cal.reto),
    // La premiación solo tiene mes publicado: es "ahora" el mes entero y nunca
    // pasa a "pasado", porque no hay día de cierre que se pueda comprobar.
    premiacion: hoy.slice(0, 7) < cal.premiacion.mes ? 'futuro' : 'ahora'
  };
}

/** Días enteros de `desde` a `hasta`, las dos 'AAAA-MM-DD'. Negativo si `hasta` ya pasó. */
export function diasEntre(desde, hasta) {
  const a = Date.parse(desde + 'T00:00:00Z');
  const b = Date.parse(hasta + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) throw new Error('diasEntre: fechas AAAA-MM-DD, llegaron ' + desde + ' y ' + hasta);
  return Math.round((b - a) / 86400000);
}

/** ¿Siguen abiertas las inscripciones ese día? (se solapan con la práctica). */
export function inscripcionesAbiertas(hoy, cal = RETO_2026) {
  return hoy >= cal.inscripciones.desde && hoy <= cal.inscripciones.hasta;
}

/**
 * La fase del reto en la fecha `hoy` ('AAAA-MM-DD').
 *
 * Las fases NO son los cinco renglones del calendario: las inscripciones y la
 * semana de práctica SE SOLAPAN (inscripciones hasta el 4 de octubre, práctica
 * del 28 de septiembre al 2), y entre el fin de la práctica y el arranque del
 * reto quedan dos días sueltos. Meter esos dos días dentro de "semana de
 * práctica" sería decir algo falso, así que tienen su propia fase ('vispera').
 *
 * @param {string} hoy 'AAAA-MM-DD'
 * @param {typeof RETO_2026} cal
 * @returns {{id: string, siguiente: string|null, siguienteFecha: string|null, faltan: number|null, inscripciones: boolean}}
 *   `siguiente` es el hito que viene y `faltan` los días enteros que quedan
 *   para él (0 = es hoy). En la última fase no hay hito con día publicado —la
 *   premiación solo tiene mes—, así que los dos van a null y la página no
 *   enseña ninguna cuenta atrás inventada.
 */
export function fase(hoy, cal = RETO_2026) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hoy))) throw new Error('fase: hace falta una fecha AAAA-MM-DD, llegó ' + hoy);

  /** @type {[string, string|null, string|null]} id de fase, hito que viene, su fecha */
  let tramo;
  if (hoy < cal.inscripciones.desde) tramo = ['antes', 'inscripciones', cal.inscripciones.desde];
  else if (hoy < cal.practica.desde) tramo = ['inscripciones', 'practica', cal.practica.desde];
  else if (hoy <= cal.practica.hasta) tramo = ['practica', 'reto', cal.reto.desde];
  else if (hoy < cal.reto.desde) tramo = ['vispera', 'reto', cal.reto.desde];
  else if (hoy <= cal.reto.hasta) tramo = ['reto', 'cierre', cal.reto.hasta];
  else tramo = ['resultados', null, null];

  const [id, siguiente, siguienteFecha] = tramo;
  return {
    id,
    siguiente,
    siguienteFecha,
    faltan: siguienteFecha ? diasEntre(hoy, siguienteFecha) : null,
    inscripciones: inscripcionesAbiertas(hoy, cal)
  };
}
