// De una serie intradía de varios días a UNA sesión: la última con datos.
//
// Antes /api/history recortaba "las últimas N barras" (78 en acciones, 288 en
// FX y cripto, 156 en el VIX). Eso funciona con el mercado cerrado, pero en
// cuanto abre la sesión nueva mezcla dos días: el lunes a las 9:40 ET,
// `slice(-78)` devuelve la tarde del viernes pegada a los diez minutos de hoy,
// y cualquier etiqueta que diga de qué día es la gráfica sale mintiendo.
//
// Aquí se agrupa por DÍA DE LA BOLSA. El huso lo dice Yahoo en
// `meta.gmtoffset` (segundos), que ya viene en la misma respuesta, así que no
// hay tabla de horarios que caduque:
//
//   SPY    · America/New_York · 9:30–16:00 ET      → 78–79 barras
//   MXN=X  · Europe/London    · día completo de FX → 288 barras
//   BTC-USD· UTC              · de medianoche a ahora
//   ^VIX   · America/Chicago  · su sesión larga    → ~160 barras
//
// Si el último día trae menos de MIN_SESION barras (la sesión acaba de abrir),
// se le pega el día hábil anterior entero: con dos puntos la gráfica sale
// plana y no se puede leer nada. El navegador nota solo que la ventana abarca
// dos días y lo dice en su etiqueta ("Últimas 24 h" en vez de "Última sesión").

const MIN_SESION = 6;

/**
 * @param {[number, number][]} points  pares [timestamp en segundos, valor]
 * @param {number} gmtOffset           desfase del huso de la bolsa, en segundos
 * @param {number} [tope]              máximo de barras a devolver (red de seguridad)
 * @returns {{ points: [number, number][], prevClose: number|null }}
 */
function ultimaSesion(points, gmtOffset, tope) {
  if (!points || !points.length) return { points: points || [], prevClose: null };
  const off = typeof gmtOffset === 'number' && isFinite(gmtOffset) ? gmtOffset : 0;
  const dia = (t) => Math.floor((t + off) / 86400);

  const ultimo = dia(points[points.length - 1][0]);
  let sesion = points.filter((p) => dia(p[0]) === ultimo);

  if (sesion.length < MIN_SESION) {
    const previos = points.filter((p) => dia(p[0]) < ultimo);
    if (previos.length) {
      const anterior = dia(previos[previos.length - 1][0]);
      sesion = points.filter((p) => dia(p[0]) >= anterior);
    }
  }
  if (tope && sesion.length > tope) sesion = sesion.slice(-tope);

  // Cierre del día hábil anterior al primero que se dibuja: es la base contra
  // la que el lector mide "cuánto subió" en 1D y la línea punteada de la
  // gráfica. Sale de la misma serie, así que la ficha ya la tiene aunque
  // /api/quotes o /api/markets no hayan contestado todavía.
  const corte = dia(sesion[0][0]);
  const anteriores = points.filter((p) => dia(p[0]) < corte);
  const prevClose = anteriores.length ? anteriores[anteriores.length - 1][1] : null;

  return { points: sesion, prevClose };
}

module.exports = { ultimaSesion, MIN_SESION };
