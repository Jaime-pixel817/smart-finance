// Riesgo y retorno: simulación de una cartera repartida entre acciones y
// CETES. Módulo ESM puro, sin dependencias, con tests en risk.test.mjs.
//
// Lo usa el módulo interactivo de la lección "3 errores comunes al empezar a
// invertir" (src/components/tools/RiskReturn.astro, pintado por
// src/scripts/tools/risk.ts). La UI no repite ninguna de estas cuentas: pide
// `simular()` y dibuja lo que le devuelve.
//
// QUÉ MODELA Y QUÉ NO
// -------------------
// Cada año se sortea un rendimiento de una normal con la media y la
// desviación de la mezcla elegida, y se van componiendo. Es el modelo más
// simple que enseña lo único que hay que aprender aquí: el promedio no es lo
// que vives, el abanico de resultados se abre con el tiempo, y más acciones
// significa a la vez más arriba y más abajo.
//
// Lo que NO hace, y por eso no sirve para planear dinero real: los
// rendimientos de verdad no son normales (las caídas grandes pasan más
// seguido que lo que dice la campana), no son independientes año con año, la
// tasa de CETES cambia, y aquí no hay impuestos, comisiones ni inflación.
//
// SUPUESTOS (los mismos que la lección escribe en pantalla, con su fuente):
//   - Acciones: 10.9 % anual nominal en dólares. Es el rendimiento anualizado
//     del ETF SPY (S&P 500) desde su nacimiento en enero de 1993, publicado
//     por State Street con datos a julio de 2026.
//   - Volatilidad de las acciones: 15 % anual, la desviación estándar típica
//     de un año del S&P 500 — redondeada a propósito, porque el punto es el
//     tamaño del vaivén, no el decimal.
//   - CETES: 6.50 % anual y sin vaivén dentro del año. Es la tasa objetivo de
//     Banxico verificada a mano en src/data/home.ts (RATES.banxico).
// Si alguno cambia, se cambia AQUÍ y en el texto de los supuestos, en ningún
// otro lado.

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/** Supuestos por clase de activo, en puntos porcentuales anuales. */
export const SUPUESTOS = {
  acciones: { retornoPct: 10.9, volatilidadPct: 15 },
  cetes: { retornoPct: 6.5, volatilidadPct: 0 }
};

/**
 * Media y desviación anual de una mezcla acciones/CETES.
 * La media es lineal. La desviación también lo es aquí porque los CETES no
 * tienen vaivén dentro del año (σ = 0): con dos activos volátiles habría que
 * meter la correlación, y no la hay que meter.
 * @param {number} pctAcciones 0…100; el resto va a CETES
 */
export function mezcla(pctAcciones) {
  if (!esNum(pctAcciones)) throw new Error('mezcla: pctAcciones debe ser un número');
  if (pctAcciones < 0 || pctAcciones > 100) throw new Error('mezcla: pctAcciones va de 0 a 100');
  const w = pctAcciones / 100;
  return {
    mediaPct: w * SUPUESTOS.acciones.retornoPct + (1 - w) * SUPUESTOS.cetes.retornoPct,
    desviacionPct: w * SUPUESTOS.acciones.volatilidadPct + (1 - w) * SUPUESTOS.cetes.volatilidadPct
  };
}

/**
 * Generador pseudoaleatorio mulberry32: 32 bits de estado, uniforme en [0,1).
 * Se usa uno propio y no Math.random porque la simulación tiene que ser
 * REPETIBLE: la misma semilla dibuja el mismo abanico, en cualquier navegador
 * y en los tests. El botón "simular otra vez" solo cambia la semilla.
 * @param {number} semilla entero
 */
export function generador(semilla) {
  if (!esNum(semilla)) throw new Error('generador: semilla debe ser un número');
  let a = semilla >>> 0;
  return function siguiente() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar por Box-Muller a partir de un uniforme. */
export function normal(rnd) {
  // log(0) es -Infinity: se empuja el uniforme fuera del cero.
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Compone un monto por una lista de rendimientos anuales en puntos (8 = 8 %). */
export function componer(inicial, retornosPct) {
  if (!esNum(inicial)) throw new Error('componer: inicial debe ser un número');
  let v = inicial;
  for (const r of retornosPct) {
    if (!esNum(r)) throw new Error('componer: todos los rendimientos deben ser números');
    v *= 1 + r / 100;
  }
  return v;
}

/**
 * Percentil por interpolación lineal sobre una lista YA ordenada de menor a
 * mayor. p va de 0 a 100.
 */
export function percentil(ordenados, p) {
  if (!Array.isArray(ordenados) || ordenados.length === 0) throw new Error('percentil: la lista viene vacía');
  if (!esNum(p) || p < 0 || p > 100) throw new Error('percentil: p va de 0 a 100');
  if (ordenados.length === 1) return ordenados[0];
  const pos = (p / 100) * (ordenados.length - 1);
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (bajo === alto) return ordenados[bajo];
  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (pos - bajo);
}

/**
 * Simula `caminos` trayectorias de la cartera durante `anios` años.
 *
 * @param {{ pctAcciones: number, anios: number, inicial?: number,
 *   caminos?: number, semilla?: number }} v
 * @returns {{
 *   anios: number, caminos: number, inicial: number, semilla: number,
 *   mezcla: { mediaPct: number, desviacionPct: number },
 *   p10: number[], p50: number[], p90: number[],
 *   finalP10: number, finalP50: number, finalP90: number,
 *   anualizadoP50Pct: number, peorAnioPct: number, aniosEnRojo: number
 * }}
 *   p10/p50/p90 traen anios + 1 puntos: el índice 0 es hoy (los tres valen
 *   `inicial`) y el índice a es el fin del año a.
 */
export function simular(v) {
  const { pctAcciones, anios, inicial = 10000, caminos = 200, semilla = 20260823 } = v || {};
  if (!esNum(anios) || anios < 1 || !Number.isInteger(anios)) throw new Error('simular: anios debe ser un entero ≥ 1');
  if (!esNum(caminos) || caminos < 1) throw new Error('simular: caminos debe ser ≥ 1');
  if (!esNum(inicial) || inicial <= 0) throw new Error('simular: inicial debe ser > 0');
  const m = mezcla(pctAcciones);
  const rnd = generador(semilla);

  // valores[a][k] = valor del camino k al final del año a.
  const valores = Array.from({ length: anios + 1 }, () => new Array(caminos).fill(inicial));
  let peorAnioPct = Infinity;
  let aniosEnRojo = 0;

  for (let k = 0; k < caminos; k++) {
    let valor = inicial;
    for (let a = 1; a <= anios; a++) {
      const r = m.mediaPct + m.desviacionPct * normal(rnd);
      if (r < peorAnioPct) peorAnioPct = r;
      if (r < 0) aniosEnRojo++;
      valor *= 1 + r / 100;
      valores[a][k] = valor;
    }
  }

  const p10 = [], p50 = [], p90 = [];
  for (let a = 0; a <= anios; a++) {
    const fila = valores[a].slice().sort((x, y) => x - y);
    p10.push(percentil(fila, 10));
    p50.push(percentil(fila, 50));
    p90.push(percentil(fila, 90));
  }

  const finalP50 = p50[anios];
  return {
    anios, caminos, inicial, semilla, mezcla: m,
    p10, p50, p90,
    finalP10: p10[anios], finalP50, finalP90: p90[anios],
    anualizadoP50Pct: (Math.pow(finalP50 / inicial, 1 / anios) - 1) * 100,
    peorAnioPct: peorAnioPct === Infinity ? 0 : peorAnioPct,
    aniosEnRojo
  };
}
