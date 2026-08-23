// Cómo se escriben las cifras de una cartera. El build y el navegador comparten
// este módulo para que la página no cambie de formato al refrescarse: si el
// servidor pinta "$1,234.56" y el script lo repinta como "1234.56", el número
// parece otro.
//
// Nada de esto interpreta los números: solo los escribe.

const TAG = { en: 'en-US', es: 'es-MX' };
const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/**
 * Dinero con su moneda: en español "$1,234.56", en inglés "MX$1,234.56".
 * El código de moneda va explícito porque la cartera puede ser en pesos y el
 * lector estar en otro país: un "$" a secas es ambiguo.
 */
export function dinero(n, loc = 'en', moneda = 'MXN', decimales = 2) {
  if (!esNum(n)) return '—';
  try {
    return new Intl.NumberFormat(TAG[loc] || TAG.en, {
      style: 'currency', currency: moneda, currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: decimales, maximumFractionDigits: decimales
    }).format(n);
  } catch {
    return '$' + new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n);
  }
}

/** Dinero redondeado a la unidad, para los números grandes del resumen. */
export function dineroCorto(n, loc = 'en', moneda = 'MXN') {
  return dinero(n, loc, moneda, 0);
}

/** Porcentaje CON signo: 1.0 → "+1.00 %", −10 → "−10.00 %" (menos tipográfico). */
export function pctFirmado(n, loc = 'en', decimales = 2) {
  if (!esNum(n)) return '—';
  const s = new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(Math.abs(n));
  const signo = n > 0.00005 ? '+' : n < -0.00005 ? '−' : '';
  return signo + s + ' %';
}

/** Cantidad con signo en dinero: +$3,000.00 / −$2,000.00. */
export function dineroFirmado(n, loc = 'en', moneda = 'MXN', decimales = 2) {
  if (!esNum(n)) return '—';
  const signo = n > 0.005 ? '+' : n < -0.005 ? '−' : '';
  return signo + dinero(Math.abs(n), loc, moneda, decimales);
}

/** Títulos: enteros sin decimales, fracciones con hasta cuatro. */
export function titulos(n, loc = 'en') {
  if (!esNum(n)) return '—';
  const decimales = Number.isInteger(n) ? 0 : 4;
  return new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(n);
}

/** Clase de color: sube, baja o plano (los tokens del sitio). */
export function claseDir(n) {
  if (!esNum(n)) return 'flat';
  return n > 0.00005 ? 'up' : n < -0.00005 ? 'down' : 'flat';
}

/** Fecha ISO a texto corto: "2026-10-05" → "5 oct 2026" / "5 Oct 2026". */
export function dia(iso, loc = 'en') {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(TAG[loc] || TAG.en, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(d).replace(/\./g, '');
}

/** Sustituye {clave} por su valor en una frase de src/i18n/cartera.ts. */
export function frase(tpl, valores) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (valores[k] === undefined ? '{' + k + '}' : String(valores[k])));
}
