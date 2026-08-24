// La racha y el progreso del reto del día, en localStorage y en ningún otro
// sitio (/challenge y /es/reto).
//
// Módulo ESM puro, sin dependencias ni DOM, con pruebas en progreso.test.mjs.
// src/scripts/challenge.ts lee y escribe la cadena de localStorage y todo lo
// demás pasa por aquí, que es donde están las reglas y donde se prueban.
//
// SIN CUENTA Y SIN SERVIDOR, Y NO ES UNA LIMITACIÓN
// -------------------------------------------------
// No hay dónde guardarlo (las 12 funciones de Vercel están ocupadas, CLAUDE.md)
// pero además no queremos: una racha es un dato de conducta y no hace falta que
// salga del teléfono para que funcione. El precio honesto es que cambiar de
// navegador empieza de cero, y la propia página lo dice con esas palabras, junto
// al botón de borrarlo todo.
//
// FORMA DE LO GUARDADO (clave `sf:reto:v2`)
//
//   {
//     v: 2,
//     ultimoDia: '2026-08-23',       // último día DIARIO jugado
//     racha: 4,                      // días seguidos hasta ultimoDia
//     mejorRacha: 9,
//     dias: { '2026-08-23': { p: 7, e: 2, m: 10 } }   // puntos, exactas, máximo
//   }
//
// El reto libre NO entra aquí: no gasta el día, no suma racha y no pinta el
// calendario. Si contara, la racha dejaría de significar "vine todos los días".
//
// SOLO CUENTA EL PRIMER RESULTADO DEL DÍA. Volver a jugar el mismo reto está
// permitido (es educativo verlo otra vez) pero no reescribe la puntuación: si la
// segunda vuelta contara, el marcador diría cuánto aguantas repitiendo, no
// cuánto le atinaste, y el número dejaría de poder compararse con el azar.

import { nuevaRacha } from './reto.mjs';

/** Clave de localStorage. La v1 era `sf:reto:v1` y se migra sola. */
export const LLAVE = 'sf:reto:v2';
export const LLAVE_V1 = 'sf:reto:v1';

/**
 * Cuántos días se guardan como mucho. Trece meses: el calendario enseña un mes y
 * el resumen son totales, así que más historia no se ve por ningún lado y sí
 * ocuparía sitio en un almacenamiento que es de 5 MB para TODO el dominio.
 */
export const MAX_DIAS = 400;

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);
const esFecha = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** El día anterior a una fecha ISO, con su cambio de mes y de año. */
export function diaAnterior(fecha) {
  if (!esFecha(fecha)) throw new Error('diaAnterior: fecha debe ser YYYY-MM-DD');
  // Mediodía UTC para que ningún horario de verano mueva el día al restar.
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Un progreso recién estrenado. */
export function progresoVacio() {
  return { v: 2, ultimoDia: null, racha: 0, mejorRacha: 0, dias: {} };
}

/**
 * Lee lo guardado y devuelve SIEMPRE un progreso válido.
 *
 * Nada de esto viene de nuestro servidor: es una cadena que cualquiera puede
 * editar desde las herramientas del navegador, y una versión vieja del sitio
 * pudo dejar otra forma. Así que se valida campo por campo y lo que no cuadre se
 * tira en silencio — un progreso a medias vale más que una página en blanco.
 *
 * @param {string|object|null} bruto lo que salga de localStorage
 * @param {string|object|null} [brutoV1] lo que hubiera en la clave vieja
 */
export function leerProgreso(bruto, brutoV1 = null) {
  const obj = parsear(bruto);
  if (obj && obj.v === 2) return normalizar(obj);
  // Migración desde `sf:reto:v1` = { ultimoDia, racha, puntos }. De ahí solo se
  // puede rescatar el último día y la racha: las exactas no se guardaban.
  const viejo = obj && !obj.v ? obj : parsear(brutoV1);
  const p = progresoVacio();
  if (viejo && esFecha(viejo.ultimoDia)) {
    p.ultimoDia = viejo.ultimoDia;
    p.racha = esNum(viejo.racha) && viejo.racha > 0 ? Math.floor(viejo.racha) : 1;
    p.mejorRacha = p.racha;
    if (esNum(viejo.puntos)) p.dias[viejo.ultimoDia] = { p: Math.max(0, Math.floor(viejo.puntos)), e: 0, m: 10 };
  }
  return p;
}

function parsear(bruto) {
  if (!bruto) return null;
  if (typeof bruto === 'object') return bruto;
  if (typeof bruto !== 'string') return null;
  try {
    const x = JSON.parse(bruto);
    return x && typeof x === 'object' && !Array.isArray(x) ? x : null;
  } catch {
    return null;
  }
}

function normalizar(obj) {
  const p = progresoVacio();
  if (esFecha(obj.ultimoDia)) p.ultimoDia = obj.ultimoDia;
  if (esNum(obj.racha) && obj.racha > 0) p.racha = Math.floor(obj.racha);
  if (esNum(obj.mejorRacha) && obj.mejorRacha > 0) p.mejorRacha = Math.floor(obj.mejorRacha);
  const dias = obj.dias && typeof obj.dias === 'object' ? obj.dias : {};
  for (const [fecha, d] of Object.entries(dias)) {
    if (!esFecha(fecha) || !d || typeof d !== 'object') continue;
    if (!esNum(d.p) || !esNum(d.m) || d.m <= 0 || d.p < 0 || d.p > d.m) continue;
    p.dias[fecha] = { p: Math.floor(d.p), e: esNum(d.e) && d.e >= 0 ? Math.floor(d.e) : 0, m: Math.floor(d.m) };
  }
  p.mejorRacha = Math.max(p.mejorRacha, p.racha);
  return podar(p);
}

/** Deja solo los MAX_DIAS días más recientes. Las fechas ISO ordenan como texto. */
function podar(p) {
  const claves = Object.keys(p.dias).sort();
  if (claves.length <= MAX_DIAS) return p;
  for (const k of claves.slice(0, claves.length - MAX_DIAS)) delete p.dias[k];
  return p;
}

/** ¿Ya se jugó el reto diario de ese día en este dispositivo? */
export function yaJugado(prog, fecha) {
  return Boolean(prog && prog.dias && Object.prototype.hasOwnProperty.call(prog.dias, fecha));
}

/**
 * Apunta el resultado del reto DIARIO de un día. Devuelve un progreso nuevo (no
 * toca el que recibe). Si ese día ya estaba apuntado, no cambia nada: cuenta el
 * primer intento, ver arriba.
 *
 * @param {object} prog
 * @param {{ fecha: string, puntos: number, max: number, exactas?: number }} partida
 */
export function registrarDia(prog, partida) {
  const p = leerProgreso(prog);
  const { fecha, puntos, max } = partida || {};
  if (!esFecha(fecha)) throw new Error('registrarDia: fecha debe ser YYYY-MM-DD');
  if (!esNum(puntos) || !esNum(max) || max <= 0 || puntos < 0 || puntos > max) {
    throw new Error('registrarDia: puntos debe estar entre 0 y max');
  }
  if (yaJugado(p, fecha)) return p;

  const exactas = esNum(partida.exactas) && partida.exactas >= 0 ? Math.floor(partida.exactas) : 0;
  p.dias[fecha] = { p: Math.floor(puntos), e: exactas, m: Math.floor(max) };
  // La racha solo avanza hacia adelante: si alguien vuelve a un día anterior
  // (con el reloj del sistema movido, o cargando un reto viejo por enlace) el
  // día queda apuntado en el calendario pero la racha no se toca.
  if (!p.ultimoDia || fecha > p.ultimoDia) {
    p.racha = nuevaRacha({ ultimoDia: p.ultimoDia, racha: p.racha }, fecha);
    p.ultimoDia = fecha;
    p.mejorRacha = Math.max(p.mejorRacha, p.racha);
  }
  return podar(p);
}

/**
 * La racha que se puede ENSEÑAR hoy. `prog.racha` es la que había el último día
 * jugado; si ese día no fue hoy ni ayer, la racha ya está rota y enseñarla sería
 * mentir. Con `ultimoDia === ayer` sigue viva: todavía se está a tiempo.
 */
export function rachaVigente(prog, hoy) {
  const p = leerProgreso(prog);
  if (!esFecha(hoy)) throw new Error('rachaVigente: hoy debe ser YYYY-MM-DD');
  if (!p.ultimoDia) return 0;
  if (p.ultimoDia === hoy || p.ultimoDia === diaAnterior(hoy)) return p.racha;
  return 0;
}

/**
 * Los totales del marcador: días jugados, puntos, máximo posible, rondas
 * clavadas y mejor racha. El acierto se cuenta como ronda EXACTA (la banda
 * correcta), que es lo que la gente entiende por "le atiné".
 */
export function totales(prog) {
  const p = leerProgreso(prog);
  const fechas = Object.keys(p.dias);
  let puntos = 0, max = 0, exactas = 0;
  for (const f of fechas) {
    puntos += p.dias[f].p;
    max += p.dias[f].m;
    exactas += p.dias[f].e;
  }
  return {
    dias: fechas.length,
    puntos,
    max,
    exactas,
    mejorRacha: p.mejorRacha,
    /** Puntos por partida, o null sin partidas (nunca un 0 que parezca un dato). */
    media: fechas.length ? puntos / fechas.length : null
  };
}

/**
 * El calendario de un mes: filas de siete celdas empezando en lunes.
 *
 * @param {object} prog
 * @param {number} ano
 * @param {number} mes  1–12
 * @param {string} hoy  YYYY-MM-DD, para marcar el día y no colorear el futuro
 * @returns {{ ano: number, mes: number, semanas: (null|{
 *   fecha: string, dia: number, puntos: number|null, max: number|null,
 *   jugado: boolean, hoy: boolean, futuro: boolean
 * })[][] }}
 */
export function calendario(prog, ano, mes, hoy) {
  const p = leerProgreso(prog);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error('calendario: ano y mes (1–12) deben ser enteros');
  }
  if (!esFecha(hoy)) throw new Error('calendario: hoy debe ser YYYY-MM-DD');
  const primero = new Date(Date.UTC(ano, mes - 1, 1));
  // getUTCDay: 0 es domingo. La semana empieza en lunes, como los calendarios
  // de México, así que se corre uno.
  const hueco = (primero.getUTCDay() + 6) % 7;
  const largo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

  const celdas = [];
  for (let i = 0; i < hueco; i++) celdas.push(null);
  for (let d = 1; d <= largo; d++) {
    const fecha = ano + '-' + String(mes).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const g = p.dias[fecha];
    celdas.push({
      fecha,
      dia: d,
      puntos: g ? g.p : null,
      max: g ? g.m : null,
      jugado: Boolean(g),
      hoy: fecha === hoy,
      futuro: fecha > hoy
    });
  }
  while (celdas.length % 7) celdas.push(null);

  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return { ano, mes, semanas };
}
