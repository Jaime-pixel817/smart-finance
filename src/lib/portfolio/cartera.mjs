// Cuentas de una cartera: valor, variación, mejor y peor posición, número de
// operaciones y la ruta SVG de la evolución.
//
// Módulo ESM puro, sin dependencias y sin nada del navegador: es la ÚNICA
// copia de estas fórmulas y la usan las tres superficies que enseñan la
// cartera —la página (src/components/portfolio/Cartera.astro), el script que
// la refresca con precios de /api/history (src/scripts/cartera.ts) y la foto
// diaria de GitHub Actions (scripts/snapshot-cartera.mjs)—. Los tests viven
// en cartera.test.mjs y se corren con `npm test`.
//
// CONVENCIONES
// - Los precios son números en la moneda de la cartera (`moneda`). Aquí NO se
//   convierten divisas: una cartera es de una sola moneda, y si algún día hay
//   posiciones en otra, esto se cambia con su prueba antes de mostrar nada.
// - Una posición se declara con `cantidad` (títulos) o con `peso` (fracción
//   del capital inicial). Con peso, la cantidad sale de capitalInicial × peso
//   ÷ precio de entrada: es la traducción, no una regla de negocio nueva.
// - Una posición cerrada se valora a su precio de SALIDA, no al de mercado.
// - Si a una posición abierta le falta el precio de mercado, el valor total
//   es `null` y no un número aproximado. Un total a medias en una página de
//   dinero es peor que un hueco que dice por qué está vacío.

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/** Títulos de una posición: los declarados, o los que salen de su peso. */
export function cantidadDe(pos, capitalInicial) {
  if (esNum(pos.cantidad)) return pos.cantidad;
  if (esNum(pos.peso)) {
    if (!esNum(capitalInicial)) {
      throw new Error(`cantidadDe: "${pos.ticker}" está declarada por peso y la cartera no tiene capitalInicial`);
    }
    if (!esNum(pos.entrada?.precio) || pos.entrada.precio <= 0) {
      throw new Error(`cantidadDe: "${pos.ticker}" no tiene precio de entrada válido`);
    }
    return (capitalInicial * pos.peso) / pos.entrada.precio;
  }
  throw new Error(`cantidadDe: "${pos.ticker}" no trae ni cantidad ni peso`);
}

/** Lo que costó abrirla: títulos × precio de entrada. */
export function costoDe(pos, capitalInicial) {
  return cantidadDe(pos, capitalInicial) * pos.entrada.precio;
}

/**
 * Precio con el que se valora hoy: el de salida si está cerrada, el de
 * mercado si sigue abierta. `precios` es { TICKER: número }.
 */
export function precioDe(pos, precios) {
  if (pos.estado === 'cerrada') return esNum(pos.salida?.precio) ? pos.salida.precio : null;
  const p = precios && precios[pos.ticker];
  return esNum(p) ? p : null;
}

/**
 * Una fila de la tabla: cantidad, costo, precio, valor, ganancia y %.
 * Con `valor: null` cuando falta el precio de mercado.
 */
export function resultadoDe(pos, precios, capitalInicial) {
  const cantidad = cantidadDe(pos, capitalInicial);
  const costo = cantidad * pos.entrada.precio;
  const precio = precioDe(pos, precios);
  const cerrada = pos.estado === 'cerrada';
  if (!esNum(precio)) {
    return { ticker: pos.ticker, cerrada, cantidad, costo, precio: null, valor: null, ganancia: null, pct: null };
  }
  const valor = cantidad * precio;
  return {
    ticker: pos.ticker, cerrada, cantidad, costo, precio, valor,
    ganancia: valor - costo,
    pct: costo ? ((valor - costo) / costo) * 100 : null
  };
}

/**
 * Todas las cuentas de la cartera de una vez.
 *
 * @param {{ capitalInicial?: number|null, posiciones: any[] }} cartera
 * @param {Record<string, number>} [precios] precio de mercado por ticker
 */
export function resumen(cartera, precios = {}) {
  const cap = esNum(cartera.capitalInicial) ? cartera.capitalInicial : null;
  const posiciones = Array.isArray(cartera.posiciones) ? cartera.posiciones : [];
  const filas = posiciones.map((p) => resultadoDe(p, precios, cap));

  const abiertas = filas.filter((f) => !f.cerrada);
  const cerradas = filas.filter((f) => f.cerrada);
  const faltantes = abiertas.filter((f) => f.valor === null).map((f) => f.ticker);
  const completo = faltantes.length === 0;

  const suma = (xs, k) => xs.reduce((a, f) => a + f[k], 0);
  const costoAbierto = suma(abiertas, 'costo');
  const costoCerrado = suma(cerradas, 'costo');
  const valorAbierto = completo ? suma(abiertas, 'valor') : null;

  // Efectivo del concurso: lo que queda del capital después de comprar todo y
  // de cobrar lo vendido. Sin capital declarado no hay efectivo que contar.
  const efectivo = cap === null ? null : cap - suma(filas, 'costo') + suma(cerradas, 'valor');

  // Valor total. Con capital: efectivo + posiciones abiertas (así incluye lo
  // realizado). Sin capital: solo lo que valen las abiertas.
  const valorTotal = valorAbierto === null ? null : cap === null ? valorAbierto : efectivo + valorAbierto;

  // Variación desde el inicio. Con capital, contra el capital inicial; sin
  // capital, contra lo que costaron las posiciones abiertas.
  const base = cap === null ? costoAbierto : cap;
  const variacion =
    valorTotal === null || !base
      ? null
      : { absoluta: valorTotal - base, pct: ((valorTotal - base) / base) * 100, base };

  const realizado = cerradas.length
    ? { absoluta: suma(cerradas, 'ganancia'), pct: costoCerrado ? (suma(cerradas, 'ganancia') / costoCerrado) * 100 : null }
    : null;

  const conPct = filas.filter((f) => esNum(f.pct));
  const mejor = conPct.length ? conPct.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  const peor = conPct.length ? conPct.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

  return {
    filas, abiertas, cerradas, faltantes, completo,
    capitalInicial: cap, efectivo,
    costoAbierto, costoCerrado, valorAbierto, valorTotal,
    variacion, realizado,
    // Con una sola posición valorada, mejor y peor son la misma fila: la
    // página enseña "mejor" y calla "peor" en vez de repetirla.
    mejor, peor, unaSola: conPct.length < 2,
    // Una compra por posición y una venta por posición cerrada.
    operaciones: posiciones.length + cerradas.length
  };
}

/**
 * Ruta SVG de la evolución del valor, para dibujarla en el build sin ninguna
 * librería. Devuelve null con menos de dos puntos: una línea de un punto es
 * una raya que miente sobre la tendencia.
 *
 * @param {{ fecha: string, valor: number }[]} puntos
 * @param {{ w?: number, h?: number, pad?: number, base?: number|null }} [op]
 */
export function grafica(puntos, op = {}) {
  const { w = 600, h = 180, pad = 6, base = null } = op;
  const validos = (puntos || []).filter((p) => esNum(p?.valor));
  if (validos.length < 2) return null;

  const valores = validos.map((p) => p.valor);
  let lo = Math.min(...valores);
  let hi = Math.max(...valores);
  if (esNum(base)) { lo = Math.min(lo, base); hi = Math.max(hi, base); }
  // Un respiro del 6 % arriba y abajo para que la línea no se pegue al borde.
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.06;
  hi += span * 0.06;

  const y = (v) => pad + (h - pad * 2) * (1 - (v - lo) / (hi - lo));
  const step = (w - pad * 2) / (valores.length - 1);
  const pts = valores.map((v, i) => [pad + i * step, y(v)]);
  const n = (x) => Number(x.toFixed(2));
  const line = pts.map((p, i) => (i ? 'L' : 'M') + n(p[0]) + ' ' + n(p[1])).join(' ');
  const area = `${line} L${n(pts[pts.length - 1][0])} ${h} L${n(pts[0][0])} ${h} Z`;

  const primero = valores[0];
  const ultimo = valores[valores.length - 1];
  return {
    line, area,
    baseY: esNum(base) ? n(y(base)) : null,
    puntos: validos,
    min: Math.min(...valores), max: Math.max(...valores),
    primero, ultimo,
    cambioPct: primero ? ((ultimo - primero) / primero) * 100 : null
  };
}

/** El punto más reciente del historial (o null si todavía no hay ninguno). */
export function ultimoPunto(historial) {
  const puntos = historial && Array.isArray(historial.puntos) ? historial.puntos : [];
  return puntos.length ? puntos[puntos.length - 1] : null;
}
