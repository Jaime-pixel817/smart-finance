// Los ONCE eventos que mide el sitio. Nada más.
//
// QUÉ ES ESTO
// -----------
// Vercel Web Analytics, que no pone cookies ni identificadores: cuenta visitas
// por página y deja mandar eventos con nombre. El cargador está en
// src/layouts/Base.astro y respeta Global Privacy Control y Do Not Track — si
// el navegador dice que no, ni siquiera se descarga el script.
//
// POR QUÉ TAN POCOS
// -----------------
// El plan gratis da 50 000 eventos al mes y, más importante, un panel con
// treinta métricas no se lee: se ignora. La pregunta que hay que poder
// contestar cada mes es una sola — ¿qué del sitio se usa de verdad? — y para
// eso bastan once. Cada evento de aquí abajo tiene su renglón en
// docs/kpis/README.md diciendo qué decisión cambia si sube o baja; el que no
// cambie ninguna decisión sobra y se quita.
//
// QUÉ NO SE MIDE, A PROPÓSITO
// ---------------------------
// Ni correos, ni el texto que alguien escribe en una calculadora, ni la lista
// de activos que sigue, ni de dónde es, ni nada que identifique a una persona.
// Los valores que viajan son etiquetas cerradas (slugs del propio repo,
// números pequeños), y `limpiar()` de más abajo TIRA cualquier valor que no
// tenga esa forma: no es una recomendación, es el filtro. Está documentado en
// /methodology y en /es/metodologia.

export type Evento =
  /** El reto del día: alguien contestó su primera ronda. */
  | 'reto_empezado'
  /** Llegó a la pantalla de resultado. Datos: { puntos, aciertos }. */
  | 'reto_terminado'
  /** Una lección marcada como leída (a mano o al llegar al final). Datos: { leccion }. */
  | 'leccion_terminada'
  /** Una pregunta del quiz contestada. Datos: { leccion, acierto }. */
  | 'quiz_respondido'
  /** Una calculadora con la que alguien de verdad jugó. Datos: { herramienta }. */
  | 'herramienta_usada'
  /** Botón de seguir/dejar de seguir. Datos: { activo, sigue }. */
  | 'activo_seguido'
  /** El comparador dibujó una comparación válida. Datos: { activos, n }. */
  | 'comparacion_hecha'
  /** Glosario al tacto: alguien tocó un término para que se lo expliquen. Datos: { termino }. */
  | 'explicame'
  /** Alta al boletín aceptada por el servidor. Datos: { desde }. */
  | 'boletin_alta'
  /** Se abrió un reporte de research. Datos: { reporte }. */
  | 'research_abierto'
  /** Hasta dónde se leyó ese reporte: 25, 50, 75 o 100. Datos: { reporte, hasta }. */
  | 'research_leido';

type Valor = string | number | boolean;
export type Datos = Record<string, Valor>;

/**
 * Etiquetas, no texto libre: minúsculas, dígitos, punto, guion y guion bajo,
 * hasta 40 caracteres. Un correo, una frase o un número con decimales no pasan.
 */
const ETIQUETA = /^[a-z0-9._-]{1,40}$/;

function limpiar(datos: Datos): Datos {
  const salida: Datos = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (!ETIQUETA.test(clave)) continue;
    if (typeof valor === 'boolean') { salida[clave] = valor; continue; }
    // Números: solo enteros y pequeños. Un decimal es una medición, y una
    // medición identifica más de lo que parece.
    if (typeof valor === 'number') {
      if (Number.isInteger(valor) && Math.abs(valor) <= 10000) salida[clave] = valor;
      continue;
    }
    if (typeof valor === 'string' && ETIQUETA.test(valor)) salida[clave] = valor;
  }
  return salida;
}

interface ConVa { va?: (evento: string, carga: { name: string; data?: Datos }) => void }

/**
 * Manda un evento. Si Vercel Analytics no está —en local, en un navegador con
 * GPC o Do Not Track, con un bloqueador— no pasa nada y no se rompe nada: el
 * sitio nunca depende de esto para funcionar.
 */
export function medir(evento: Evento, datos?: Datos): void {
  try {
    const va = (window as unknown as ConVa).va;
    if (typeof va !== 'function') return;
    const carga = datos ? limpiar(datos) : undefined;
    va('event', carga && Object.keys(carga).length ? { name: evento, data: carga } : { name: evento });
  } catch { /* la analítica nunca tumba una página */ }
}

/**
 * Manda el evento UNA vez por carga de página. Lo piden "reto_empezado" (que
 * si no se dispararía en cada ronda) y los tramos de lectura del research.
 */
const yaMandados = new Set<string>();
export function medirUnaVez(evento: Evento, datos?: Datos): void {
  const clave = evento + ':' + JSON.stringify(datos ?? {});
  if (yaMandados.has(clave)) return;
  yaMandados.add(clave);
  medir(evento, datos);
}
