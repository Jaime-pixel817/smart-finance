// El catálogo del reto DIARIO: la lista que entra en el sorteo.
//
// Vive aquí y no dentro de Challenge.astro porque la lee GENTE DISTINTA que
// tiene que ver exactamente lo mismo:
//   · src/components/challenge/Challenge.astro   (la página que se juega)
//   · api/_lib/og-reto.js                        (la og:image del día)
// Si cada uno tuviera su copia, un día alguien añadiría un activo en una y la
// tarjeta que se comparte en WhatsApp enseñaría una gráfica que no es la del
// reto — y nadie se enteraría, porque las dos seguirían funcionando.
//
// EL ORDEN ES PARTE DE LA SEMILLA. El sorteo baraja esta lista, así que mover
// un id de sitio cambia el reto de todos los días, pasados y futuros. Añadir
// uno también. Si algún día hay que tocarla, se sube el prefijo de versión de
// la semilla (PREFIJO_DIARIO en reto.mjs) para no reescribir el pasado.
//
// Fuera el VIX (sube cuando todo baja: la intuición de "subir es bueno" se
// rompe y el reto dejaría de enseñar lo que quiere enseñar) y fuera los cruces
// sin peso en México (USD/JPY, GBP/USD, EUR/USD), que sí salen en el reto libre.

export const POOL_DIARIO = [
  'spy', 'qqq', 'dia', 'aapl', 'msft', 'nvda', 'amzn', 'usdmxn', 'eurmxn', 'btc', 'eth', 'sol'
];

/** Los que solo salen en el reto libre, donde la variedad no le debe nada a la racha. */
export const EXTRA_LIBRE = ['chfmxn', 'eurusd', 'gbpusd', 'usdjpy', 'xrp'];

/**
 * La clave de /api/history de un activo del pool.
 *
 * Para los doce del sorteo diario coincide con el id en mayúsculas (SPY,
 * USDMXN, BTC…) y Challenge.astro lo COMPRUEBA contra src/data/symbols.ts en
 * cada build: si algún día un activo deja de cumplirlo, el build se cae en vez
 * de dejar que la og:image dibuje otra serie que la del juego.
 */
export function parDeHistorial(id) {
  return String(id).toUpperCase();
}
