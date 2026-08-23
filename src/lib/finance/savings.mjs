// CETES vs cuenta de banco vs inflación. Módulo ESM puro, sin dependencias,
// con tests en savings.test.mjs. Construido encima de inflation.mjs: aquí no
// se repite ninguna fórmula, solo se comparan tres destinos del mismo dinero.
//
// Lo usa la herramienta /tools/cetes-vs-cuenta. Supuesto explícito: el dinero
// se reinvierte al mismo rendimiento durante todo el plazo (los CETES a 28
// días se renuevan; la tasa real cambia en cada subasta) y no se descuentan
// impuestos ni comisiones.

import { valorNominal, valorReal, tasaRealPct } from './inflation.mjs';

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * Un destino del dinero: cuánto tienes al final en pesos nominales y cuánto
 * compra ese dinero en pesos de hoy.
 * @typedef {{ id: string, tasaPct: number, nominal: number, real: number,
 *   tasaRealPct: number, gananciaReal: number }} Destino
 * @returns {Destino}
 */
function destino(id, monto, tasaPct, inflacionPct, anios) {
  const real = valorReal(monto, tasaPct, inflacionPct, anios);
  return {
    id,
    tasaPct,
    nominal: valorNominal(monto, tasaPct, anios),
    real,
    tasaRealPct: tasaRealPct(tasaPct, inflacionPct),
    gananciaReal: real - monto
  };
}

/**
 * Compara los tres destinos del mismo monto y dice cuál gana en poder de
 * compra (que es el único empate que importa).
 * @param {{ monto: number, anios: number, cetesPct: number, cuentaPct: number, inflacionPct: number }} v
 * @returns {{ cetes: Destino, cuenta: Destino, efectivo: Destino, ganador: string,
 *   brechaReal: number, cetesPierdeContraInflacion: boolean }}
 *   brechaReal: cuánto poder de compra separa a CETES de la cuenta.
 */
export function compararAhorro(v) {
  const { monto, anios, cetesPct, cuentaPct, inflacionPct } = v || {};
  for (const [k, x] of Object.entries({ monto, anios, cetesPct, cuentaPct, inflacionPct })) {
    if (!esNum(x)) throw new Error(`compararAhorro: ${k} debe ser un número`);
  }
  if (anios < 0) throw new Error('compararAhorro: anios no puede ser negativo');
  if (monto < 0) throw new Error('compararAhorro: monto no puede ser negativo');

  const cetes = destino('cetes', monto, cetesPct, inflacionPct, anios);
  const cuenta = destino('cuenta', monto, cuentaPct, inflacionPct, anios);
  // El efectivo bajo el colchón: 0 % nominal, y por eso el que más pierde.
  const efectivo = destino('efectivo', monto, 0, inflacionPct, anios);

  // Gana el que deja más poder de compra. Empate cuando los dos primeros no
  // se separan ni por un peso en todo el plazo (decir "gana CETES" por 40
  // centavos sería ruido).
  const orden = [cetes, cuenta, efectivo].sort((a, b) => b.real - a.real);
  const empate = Math.abs(orden[0].real - orden[1].real) < 1;

  return {
    cetes,
    cuenta,
    efectivo,
    ganador: empate ? 'empate' : orden[0].id,
    brechaReal: cetes.real - cuenta.real,
    cetesPierdeContraInflacion: cetes.real < monto
  };
}
