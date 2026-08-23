// El archivo del boletín: cada número queda guardado para poder leerlo en el
// navegador.
//
// PARA QUÉ
// --------
//   1. "Ver en el navegador" desde el correo. Es lo que salva a quien tiene las
//      imágenes bloqueadas, a quien lo reenvía y a quien usa un cliente que
//      destroza el HTML.
//   2. Un número del boletín deja de ser un correo que se pierde en la bandeja
//      y pasa a ser una página con URL propia: se puede compartir, se puede
//      enlazar y Google la puede leer. Escribir algo cada semana y que no quede
//      nada indexable es tirar el trabajo a la basura.
//
// DÓNDE VIVE, Y POR QUÉ EN DOS SITIOS
// -----------------------------------
// Aquí (Redis) al momento del envío, y en el repo (src/data/newsletter/*.json,
// con `npm run newsletter:sync`) cuando a Jaime le da por bajarlo. Es el mismo
// reparto que ya usan las noticias, y por el mismo motivo: la página estática
// de Astro solo existe después de un despliegue, así que entre el domingo y el
// commit la URL la sirve /newsletter-read leyendo de aquí. Nunca hay enlace
// roto y nunca se depende de desplegar para que el correo del día funcione.
//
// SE GUARDA EL CONTENIDO, NO EL HTML DEL CORREO. Un correo es una tabla de 600
// px con estilos en línea; una página web es otra cosa. Guardando los datos, la
// página se pinta como página —tipografía del sitio, modo oscuro, enlaces— y el
// archivo pesa 4 KB en vez de 40.
//
// NUNCA TUMBA UN ENVÍO: si Redis no contesta, se anota en los logs y el correo
// sale igual. El archivo es la copia, no el original.

const redis = require('./redis');

const PREFIJO = 'boletin:numero:v1:';
const INDICE = 'boletin:indice:v1';

// Dos años. Un número viejo tiene sentido mientras alguien pueda llegar a él
// desde un enlace; pasado eso, lo que importa ya está commiteado en el repo,
// que es donde vive de verdad el archivo.
const VIDA_SEGUNDOS = 730 * 24 * 3600;

// Cuántas fechas se conservan en el índice. Con una a la semana son más de dos
// años, o sea lo mismo que dura cada número.
const MAX_INDICE = 120;

function clave(fecha) {
  return PREFIJO + fecha;
}

/** AAAA-MM-DD en hora de Ciudad de México: la misma con la que se fecha todo el correo. */
function claveDeFecha(fecha) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha);
}

/**
 * Guarda un número. Devuelve la fecha guardada, o null si no se pudo.
 * No lanza nunca.
 */
async function guardar(numero) {
  if (!numero || !numero.fecha) return null;

  try {
    await redis.comando('SET', clave(numero.fecha), JSON.stringify(numero), 'EX', VIDA_SEGUNDOS);
    // El índice se reescribe entero en vez de empujar: así reenviar el mismo
    // domingo (una prueba, un reintento) no deja la fecha dos veces en la
    // lista, que es como se ven dos números repetidos en /newsletter.
    const fechas = await listarFechas();
    const nuevas = [numero.fecha].concat(fechas.filter((f) => f !== numero.fecha)).slice(0, MAX_INDICE);
    await redis.comando('SET', INDICE, JSON.stringify(nuevas), 'EX', VIDA_SEGUNDOS);
    return numero.fecha;
  } catch (e) {
    console.error('boletín: no se pudo archivar el número:', e.message);
    return null;
  }
}

/** Las fechas archivadas, la más reciente primero. Nunca lanza. */
async function listarFechas() {
  try {
    const lista = await redis.obtenerJSON(INDICE);
    return Array.isArray(lista) ? lista.filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)) : [];
  } catch (e) {
    console.error('boletín: no se pudo leer el índice del archivo:', e.message);
    return [];
  }
}

/** Un número por su fecha, o null. Nunca lanza. */
async function leer(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) return null;
  try {
    return await redis.obtenerJSON(clave(fecha));
  } catch (e) {
    console.error('boletín: no se pudo leer el número ' + fecha + ':', e.message);
    return null;
  }
}

module.exports = { guardar, leer, listarFechas, claveDeFecha, clave, PREFIJO, INDICE };
