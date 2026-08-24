// Formato de cifras del research (build y navegador comparten este módulo).
// Nada de esto interpreta los números: solo los escribe.

const TAG = { en: 'en-US', es: 'es-MX' };

/** Millones de dólares: 11 102.6 → "11,102.6" / "11 102.6". */
export function millions(n, loc = 'en', decimals = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/** Miles de millones con una decimal: 11102.6 → "11.1". */
export function billions(n, loc = 'en', decimals = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n / 1000);
}

/** Porcentaje en puntos: 24.38 → "24.4 %". */
export function pct(n, loc = 'en', decimals = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const s = new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  return s + ' %';
}

/** Precio en dólares: 312.4 → "$312.40". */
export function money(n, loc = 'en', decimals = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return '$' + new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

/** Múltiplo: 12.34 → "12.3x". */
export function times(n, loc = 'en', decimals = 1) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(TAG[loc] || TAG.en, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n) + 'x';
}

/** Fecha ISO a texto corto: "2026-02-01" → "1 feb 2026" / "1 Feb 2026". */
export function day(iso, loc = 'en') {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''));
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = new Intl.DateTimeFormat(TAG[loc] || TAG.en, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
  return s.replace(/\./g, '');
}

/**
 * Mes ISO a texto, con inicial mayúscula: "2026-12" → "December 2026" /
 * "Diciembre de 2026".
 *
 * Existe para lo que solo tiene mes publicado y no día —la premiación del
 * Reto Actinver—, para que ese texto salga del calendario del módulo y no
 * escrito a mano en la traducción, que es como se queda desfasado. La inicial
 * va en mayúscula porque en español `Intl` devuelve "diciembre de 2026" y el
 * texto empieza el renglón de la tabla.
 */
export function month(iso, loc = 'en') {
  if (!/^\d{4}-\d{2}$/.test(String(iso))) return '—';
  const d = new Date(iso + '-15T12:00:00Z');
  if (Number.isNaN(d.getTime())) return String(iso);
  const s = new Intl.DateTimeFormat(TAG[loc] || TAG.en, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Etiqueta de año fiscal con su cierre: FY2025 (cierre 1 feb 2026). */
export function fyLabel(fy) {
  return String(fy || '').replace(/^FY/, 'FY ');
}
