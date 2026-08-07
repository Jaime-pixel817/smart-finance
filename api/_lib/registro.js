// Registro PERSISTENTE de cada corrida de /api/send-newsletter.
//
// POR QUÉ EXISTE
// --------------
// El boletín se mandó solo tres días seguidos y después dejó de llegar. Cuando
// fuimos a mirar qué había pasado ya no había nada que mirar: los logs del
// plan gratis de Vercel duran unos 30 minutos, así que para cuando alguien se
// da cuenta de que "hoy no llegó el correo" la evidencia lleva horas borrada.
// Es imposible distinguir el caso "el cron no se disparó" del caso "se disparó
// y el envío falló", que piden arreglos completamente distintos.
//
// Esto lo arregla escribiendo una línea por corrida en Redis, que es la misma
// base donde ya viven los suscriptores y que no caduca. Sobrevive a los
// despliegues, a los días y a los meses.
//
// LO QUE DE VERDAD IMPORTA DE CADA LÍNEA es el campo `disparo`:
//   cron   → lo llamó Vercel Cron. El disparo automático SÍ ocurrió.
//   manual → lo llamó una persona (el panel de Vercel, un curl).
// Un hueco de días sin ninguna línea `cron` significa que el problema está en
// Vercel y no en este código. Líneas `cron` con ok:false significan lo
// contrario. Sin ese dato, las dos averías se ven igual desde fuera.
//
// POR QUÉ UNA LISTA Y NO UNA CLAVE POR DÍA
// ----------------------------------------
// LPUSH + LTRIM deja las corridas en orden, la más reciente primero, con un
// tope fijo de líneas. Leer las últimas 30 es un solo LRANGE, en vez de
// adivinar 30 nombres de clave y pedirlos uno por uno. Y el tope hace que el
// registro no pueda crecer sin límite aunque nadie lo mire nunca.

const redis = require('./redis');

const CLAVE = 'boletin:corridas';

// Con un envío al día son unos seis meses de historia. De sobra para ver un
// hueco, y lo bastante poco para que la lista siga siendo diminuta.
const MAXIMO = 180;

// Fecha legible en la hora de Ciudad de México, junto al ISO. El ISO es para
// ordenar y comparar; esta es para que al abrir el endpoint se entienda de un
// vistazo si la última corrida fue "hoy a las 8:00" o "hace cuatro días".
function enMexico(iso) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return null;
  }
}

/*
 * Anota una corrida. NUNCA lanza.
 *
 * Que el registro falle no puede impedir un envío: el registro está aquí para
 * contar lo que pasó, no para decidir si pasa. Si Redis no contesta se avisa
 * en los logs (que durarán 30 minutos, pero es lo que hay) y el envío sigue.
 */
async function anotar(datos) {
  const fila = Object.assign({ cuando: new Date().toISOString() }, datos);
  try {
    await redis.pipeline([
      ['LPUSH', CLAVE, JSON.stringify(fila)],
      ['LTRIM', CLAVE, 0, MAXIMO - 1]
    ]);
    return true;
  } catch (err) {
    console.error('registro: no se pudo anotar la corrida:', err && err.message ? err.message : err);
    return false;
  }
}

function parsear(crudo) {
  if (crudo && typeof crudo === 'object') return crudo;   // Upstash a veces ya lo devuelve parseado
  try { return JSON.parse(crudo); } catch (e) { return null; }
}

// Las últimas `limite` corridas, la más reciente primero.
async function leer(limite = 30) {
  const n = Math.min(Math.max(1, Number(limite) || 30), MAXIMO);
  const filas = await redis.comando('LRANGE', CLAVE, 0, n - 1);
  return (Array.isArray(filas) ? filas : [])
    .map(parsear)
    .filter(Boolean)
    .map((f) => Object.assign({}, f, { cuandoMexico: enMexico(f.cuando) }));
}

/*
 * El resumen: las tres preguntas que uno se hace de verdad al abrir esto.
 *
 *   ¿Cuándo corrió por última vez?           → ultima
 *   ¿Cuándo se disparó SOLA por última vez?  → ultimaAutomatica
 *   ¿Cuándo funcionó por última vez?         → ultimoExito
 *
 * Las tres por separado porque la diferencia entre ellas es el diagnóstico. Si
 * `ultima` es de hoy pero `ultimaAutomatica` es de hace una semana, el cron
 * lleva una semana sin dispararse y lo de hoy fue alguien dándole al botón —
 * que es exactamente lo que pasó la primera vez y no pudimos demostrar.
 */
function resumir(corridas) {
  const buscar = (fn) => corridas.find(fn) || null;
  const soloFecha = (c) => (c
    ? { cuando: c.cuando, cuandoMexico: c.cuandoMexico, enviados: c.enviados, disparo: c.disparo, ok: c.ok, ensayo: !!c.ensayo }
    : null);

  // Los ensayos (?dry=1) quedan fuera de todo lo que responde "¿funcionó?".
  // Un ensayo termina en 200 sin escribirle a nadie, así que contarlo como
  // envío con éxito taparía exactamente la avería que hay que ver: cuatro días
  // sin que salga un solo correo, con un tic verde encima porque alguien probó
  // el contenido. Salen en `ultima` y en el listado, marcados, porque saber que
  // alguien estuvo probando también es información.
  const reales = corridas.filter((c) => !c.ensayo);

  return {
    total: corridas.length,
    ultima: soloFecha(corridas[0]),
    ultimaAutomatica: soloFecha(buscar((c) => c.disparo === 'cron' && !c.ensayo)),
    ultimoExito: soloFecha(reales.find((c) => c.ok) || null),
    fallosSeguidos: (() => {
      let n = 0;
      for (const c of reales) { if (c.ok) break; n++; }
      return n;
    })()
  };
}

module.exports = { anotar, leer, resumir, CLAVE, MAXIMO };
