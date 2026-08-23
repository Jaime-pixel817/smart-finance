/*
 * Comparar dos o tres activos en la misma gráfica.
 *
 * EL PROBLEMA: el SPY vale ~600 dólares, el dólar ~18 pesos y bitcoin ~90,000.
 * Dibujarlos juntos con sus precios de verdad es una línea recta y dos rayas
 * pegadas al suelo. La salida fácil es un segundo eje, y el segundo eje MIENTE:
 * deja que quien dibuja elija qué línea parece que va ganando moviendo una
 * escala. Así que aquí no hay dos ejes: **todo se normaliza a 100 al principio
 * del rango**, y lo que se compara es el porcentaje que se movió cada uno.
 *
 * LA VENTANA COMÚN: cripto cotiza 24/7, la bolsa de lunes a viernes y el FX
 * cierra el viernes por la tarde. Si cada serie se rebasa sobre SU primer
 * punto, dos activos empiezan en días distintos y la comparación ya viene
 * torcida. Por eso primero se calcula la ventana que TODOS cubren (desde el
 * último de los primeros puntos hasta el primero de los últimos), se recorta
 * cada serie a esa ventana, y solo entonces se rebasa. Si un activo no tiene
 * dato en ese tramo, se queda fuera y se dice (`fuera`), no se rellena.
 *
 * Sin dependencias y sin DOM: esto se prueba solo (comparar.test.mjs) y lo usa
 * src/scripts/compare.ts para dibujar.
 */

/** @typedef {[number, number]} Punto  [timestamp en segundos, valor] */

const finito = (p) => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && isFinite(p[0]) && isFinite(p[1]);

/** Ordena, quita basura y quita timestamps repetidos (se queda con el último). */
export function limpiarSerie(puntos) {
  const buenos = (puntos || []).filter(finito).sort((a, b) => a[0] - b[0]);
  const salida = [];
  for (const p of buenos) {
    if (salida.length && salida[salida.length - 1][0] === p[0]) salida[salida.length - 1] = p;
    else salida.push([p[0], p[1]]);
  }
  return salida;
}

/**
 * La ventana que cubren TODAS las series: del último primer punto al primer
 * último punto. null si alguna viene vacía o si no se solapan.
 */
export function ventanaComun(series) {
  if (!series.length) return null;
  let desde = -Infinity, hasta = Infinity;
  for (const s of series) {
    if (!s.length) return null;
    desde = Math.max(desde, s[0][0]);
    hasta = Math.min(hasta, s[s.length - 1][0]);
  }
  return desde <= hasta ? { desde, hasta } : null;
}

/** Recorta una serie a [desde, hasta] (los dos extremos incluidos). */
export function recortar(puntos, desde, hasta) {
  return puntos.filter((p) => p[0] >= desde && p[0] <= hasta);
}

/**
 * Rebasa a 100 sobre el primer punto: lo que se ve es "cuánto se movió desde
 * el principio del rango", que es lo único comparable entre un ETF y una
 * divisa. Con base 0 no se puede dividir y se devuelve null.
 */
export function base100(puntos) {
  if (!puntos.length) return null;
  const base = puntos[0][1];
  if (!base) return null;
  return puntos.map(([t, v]) => [t, (v / base) * 100]);
}

/** Cambio porcentual entre el primer y el último punto de una serie ya rebasada. */
export function cambioPct(rebasada) {
  if (!rebasada || rebasada.length < 2) return null;
  return rebasada[rebasada.length - 1][1] - 100;
}

/**
 * Compara dos o tres activos.
 *
 * @param {{clave: string, puntos: Punto[]}[]} entradas
 * @returns {{
 *   desde: number, hasta: number,
 *   series: {clave: string, puntos: Punto[], cambioPct: number|null}[],
 *   fuera: {clave: string, razon: string}[]
 * } | null}  null si no queda nada que comparar.
 */
export function comparar(entradas) {
  const fuera = [];
  const limpias = [];
  for (const e of entradas || []) {
    const puntos = limpiarSerie(e && e.puntos);
    // Con un solo punto no hay movimiento que enseñar: una línea de un punto
    // en una comparación se lee como "no se movió", y eso no es lo que pasa.
    if (puntos.length < 2) { fuera.push({ clave: e && e.clave, razon: 'sin datos' }); continue; }
    limpias.push({ clave: e.clave, puntos });
  }
  if (!limpias.length) return null;

  let dentroDeVentana = limpias;
  let ventana = ventanaComun(limpias.map((s) => s.puntos));
  if (!ventana) {
    // No hay tramo que compartan todos (un activo listado el mes pasado contra
    // uno de hace cinco años). Se dibuja el que más cubre y el que no llega se
    // queda fuera CON SU RAZÓN: mejor una línea sola y explicada que dos líneas
    // que empiezan en sitios distintos.
    const masLargo = limpias.reduce((a, b) => (b.puntos.length > a.puntos.length ? b : a));
    for (const s of limpias) if (s !== masLargo) fuera.push({ clave: s.clave, razon: 'sin tramo en común' });
    dentroDeVentana = [masLargo];
    ventana = ventanaComun([masLargo.puntos]);
  }

  const series = [];
  for (const s of dentroDeVentana) {
    const dentro = recortar(s.puntos, ventana.desde, ventana.hasta);
    const rebasada = dentro.length >= 2 ? base100(dentro) : null;
    if (!rebasada) { fuera.push({ clave: s.clave, razon: 'sin datos en el tramo común' }); continue; }
    series.push({ clave: s.clave, puntos: rebasada, cambioPct: cambioPct(rebasada) });
  }
  if (!series.length) return null;
  return { desde: ventana.desde, hasta: ventana.hasta, series, fuera };
}
