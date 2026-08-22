// Interés compuesto: valor futuro de una serie de aportes mensuales.
// Módulo ESM puro, sin dependencias, con tests en compound.test.mjs.
//
// Es la ÚNICA copia de la fórmula: la usan la calculadora de la lección
// "Interés simple vs. compuesto" y la herramienta /tools/interes-compuesto
// (ambas a través de src/scripts/compound.ts). Si algún día cambia el
// supuesto de capitalización, se cambia aquí y en ningún otro lado.
//
// Convenciones: tasas en puntos porcentuales anuales (8 = 8 % anual), montos
// en pesos, plazo en meses. Capitalización mensual y anualidad ordinaria (el
// aporte entra al FINAL de cada mes), igual que la calculadora original.

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * Valor futuro de `meses` aportes mensuales iguales.
 *   VF = aporte · ((1 + i)^n − 1) / i,  con i = tasa anual / 12.
 * Con tasa 0 se reduce a aporte · n (el límite de la fórmula).
 * @param {number} aporte aporte mensual en pesos
 * @param {number} tasaAnualPct tasa anual en puntos (8 = 8 %)
 * @param {number} meses número de aportes
 * @returns {number} valor futuro en pesos
 */
export function valorFuturo(aporte, tasaAnualPct, meses) {
  if (!esNum(aporte) || !esNum(tasaAnualPct) || !esNum(meses)) {
    throw new Error('valorFuturo: aporte, tasaAnualPct y meses deben ser números');
  }
  if (meses < 0) throw new Error('valorFuturo: meses no puede ser negativo');
  const i = tasaAnualPct / 100 / 12;
  if (i === 0) return aporte * meses;
  return aporte * (Math.pow(1 + i, meses) - 1) / i;
}

/** Lo que pusiste tú: aporte × meses, sin rendimiento. */
export function totalAportado(aporte, meses) {
  if (!esNum(aporte) || !esNum(meses)) throw new Error('totalAportado: aporte y meses deben ser números');
  return aporte * meses;
}

/** Los intereses solos: valor futuro menos lo aportado. */
export function interesGanado(aporte, tasaAnualPct, meses) {
  return valorFuturo(aporte, tasaAnualPct, meses) - totalAportado(aporte, meses);
}

/**
 * Serie año por año para la gráfica: índice 0 = hoy (ambas en 0), índice a =
 * fin del año a. `compuesto` va redondeado a pesos porque es lo que se pinta.
 * @param {{ aporte: number, tasaAnualPct: number, anios: number }} v
 * @returns {{ aportes: number[], compuesto: number[] }}
 */
export function seriesAnuales(v) {
  const { aporte, tasaAnualPct, anios } = v || {};
  if (!esNum(anios) || anios < 0) throw new Error('seriesAnuales: anios debe ser un número ≥ 0');
  const aportes = [];
  const compuesto = [];
  for (let a = 0; a <= anios; a++) {
    aportes.push(totalAportado(aporte, a * 12));
    compuesto.push(Math.round(valorFuturo(aporte, tasaAnualPct, a * 12)));
  }
  return { aportes, compuesto };
}
