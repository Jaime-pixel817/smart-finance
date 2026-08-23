// Inflación y poder adquisitivo. Módulo ESM puro, sin dependencias, con
// tests en inflation.test.mjs.
//
// Lo usan la herramienta "¿Cuánto me come la inflación?"
// (/tools/inflacion) y, encima, savings.mjs para la comparación
// CETES vs cuenta vs inflación. La UI no repite ninguna de estas cuentas.
//
// Convenciones: tasas en puntos porcentuales ANUALES (5 = 5 % anual), montos
// en pesos, plazo en años (admite fracciones), capitalización anual.

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

function valida(nombre, ...valores) {
  for (const v of valores) if (!esNum(v)) throw new Error(`${nombre}: todos los argumentos deben ser números`);
}

/** Factor acumulado (1 + tasa)^años. Con tasa 0 vale 1. */
export function factor(tasaPct, anios) {
  valida('factor', tasaPct, anios);
  if (anios < 0) throw new Error('factor: anios no puede ser negativo');
  return Math.pow(1 + tasaPct / 100, anios);
}

/**
 * Lo que costará dentro de `anios` lo que hoy cuesta `precio`.
 * "Para comprar lo mismo necesitarías $X".
 */
export function precioFuturo(precio, inflacionPct, anios) {
  valida('precioFuturo', precio, inflacionPct, anios);
  return precio * factor(inflacionPct, anios);
}

/**
 * Poder adquisitivo: qué compra dentro de `anios` un monto de HOY, medido en
 * pesos de hoy. Es la división inversa de precioFuturo.
 */
export function poderAdquisitivo(monto, inflacionPct, anios) {
  valida('poderAdquisitivo', monto, inflacionPct, anios);
  return monto / factor(inflacionPct, anios);
}

/** Porcentaje del poder de compra que se pierde en el plazo (0–100). */
export function poderPerdidoPct(inflacionPct, anios) {
  return (1 - 1 / factor(inflacionPct, anios)) * 100;
}

/** Crecer un monto a una tasa nominal (capitalización anual). */
export function valorNominal(monto, tasaPct, anios) {
  valida('valorNominal', monto, tasaPct, anios);
  return monto * factor(tasaPct, anios);
}

/** El mismo monto crecido a `tasaPct`, pero medido en pesos de hoy. */
export function valorReal(monto, tasaPct, inflacionPct, anios) {
  return valorNominal(monto, tasaPct, anios) / factor(inflacionPct, anios);
}

/**
 * Rendimiento real (Fisher exacto): ((1 + r) / (1 + π) − 1) · 100.
 * No es la resta r − π; con tasas de dos dígitos la diferencia se nota.
 */
export function tasaRealPct(tasaPct, inflacionPct) {
  valida('tasaRealPct', tasaPct, inflacionPct);
  return ((1 + tasaPct / 100) / (1 + inflacionPct / 100) - 1) * 100;
}

/**
 * Resumen de la herramienta de inflación.
 * @param {{ precio: number, inflacionPct: number, anios: number, tasaPct?: number }} v
 *   tasaPct: la tasa a la que compararías el dinero parado (CETES/Banxico).
 * @returns {{ precioFuturo: number, poder: number, perdidoPct: number,
 *   parado: { nominal: number, real: number }, invertido: { nominal: number, real: number },
 *   tasaRealPct: number }}
 */
export function resumenInflacion(v) {
  const { precio, inflacionPct, anios, tasaPct = 0 } = v || {};
  valida('resumenInflacion', precio, inflacionPct, anios, tasaPct);
  return {
    precioFuturo: precioFuturo(precio, inflacionPct, anios),
    poder: poderAdquisitivo(precio, inflacionPct, anios),
    perdidoPct: poderPerdidoPct(inflacionPct, anios),
    parado: { nominal: precio, real: poderAdquisitivo(precio, inflacionPct, anios) },
    invertido: {
      nominal: valorNominal(precio, tasaPct, anios),
      real: valorReal(precio, tasaPct, inflacionPct, anios)
    },
    tasaRealPct: tasaRealPct(tasaPct, inflacionPct)
  };
}
