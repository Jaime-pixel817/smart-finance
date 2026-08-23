// Almacén de las noticias explicadas: borradores, aprobación y lectura.
//
// POR QUÉ EXISTE
// --------------
// El sitio es estático y las noticias no pueden publicarse solas. El trato es:
// la IA escribe BORRADORES a partir de un titular real, y una persona (Jaime)
// los aprueba, edita o rechaza antes de que aparezcan en smartfinance.lat. Este
// módulo es la única puerta a ese estado compartido, para que el router de
// /api/news, _lib/borradores.js, _lib/revision.js y scripts/news-sync.js no
// tengan cuatro versiones distintas de "qué es una noticia aprobada".
//
// POR QUÉ REDIS Y NO EL REPOSITORIO
// ---------------------------------
// Aprobar tiene que verse en el sitio en el momento, y un sitio estático solo
// cambia cuando se vuelve a construir. Redis es el estado vivo (lo lee
// /api/news?estado=aprobadas y lo pinta el navegador); el repositorio es el
// archivo permanente (scripts/news-sync.js baja las aprobadas a
// src/data/news/*.json y el build genera /news/<slug>). Ver CLAUDE.md.
//
// FORMA DE LAS CLAVES
//   noticias:<id>      → la noticia completa en JSON
//   noticias:indice    → LISTA de ids, la más reciente primero (tope MAXIMO)
//   noticias:cuota:<YYYY-MM-DD> → cuántos borradores se generaron ese día
// Una sola clave por noticia: el estado vive DENTRO del JSON, así que aprobar
// es reescribir un campo y nunca puede quedar un id en dos listas a la vez.

const redis = require('./redis');

const ESTADOS = ['borrador', 'aprobada', 'rechazada'];

// Los temas de los filtros de /news. Se quedan cortos a propósito: seis chips
// que caben en una fila de teléfono son útiles, veinte no.
const TEMAS = ['peso', 'tasas', 'acciones', 'cripto', 'macro'];

// Activos que el sitio sabe pintar. TIENE QUE COINCIDIR con los id de
// src/data/symbols.ts (lo comprueba src/data/news.test.mjs): si el modelo
// devuelve un símbolo que no está aquí, se descarta en vez de dejar una ficha
// rota. No se añaden símbolos nuevos por aquí — la regla de CLAUDE.md sobre la
// cuota de /api/markets sigue mandando.
const SIMBOLOS = [
  'spy', 'qqq', 'dia', 'vix', 'aapl', 'msft', 'nvda', 'amzn',
  'usdmxn', 'eurmxn', 'chfmxn', 'eurusd', 'gbpusd', 'usdjpy',
  'btc', 'eth', 'xrp', 'sol'
];

// Lecciones publicadas (id de ruta en src/i18n/routes.ts).
const LECCIONES = [
  'lesson.peso', 'lesson.interes', 'lesson.sp500',
  'lesson.presupuesto', 'lesson.inflacion', 'lesson.errores'
];

// El glosario vive en el front (src/data/glossary.json) y aquí solo se usa para
// no dejar pasar un término inventado. Si por lo que sea no se pudiera leer, la
// validación de términos se salta en vez de tumbar el endpoint: el que sí lo
// comprueba siempre es scripts/news-sync.js, que corre antes del build.
let GLOSARIO = [];
try {
  GLOSARIO = require('../../src/data/glossary.json').map((g) => g.id);
} catch (e) {
  console.warn('noticias: glosario no disponible en la función:', e && e.message);
}

const CLAVE_INDICE = 'noticias:indice';
const clave = (id) => 'noticias:' + id;
const claveCuota = (dia) => 'noticias:cuota:' + dia;

// Tope del índice: con tres noticias al día son unos dos meses de historia.
const MAXIMO = 200;
// Las noticias caducan: una nota de hace medio año ya no explica nada de hoy, y
// las que valen la pena viven para siempre en el repositorio (src/data/news).
const TTL_DIAS = 90;

/** Día en México (YYYY-MM-DD). El sitio se escribe para lectores de allá. */
function diaMexico(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha);
}

/** Título → slug de URL: minúsculas, sin acentos, sin palabras de relleno. */
function slugify(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 7)
    .join('-')
    .slice(0, 60);
}

/** id = día + slug. Único por día y legible en la propia clave de Redis. */
function nuevoId(slug, fecha = new Date()) {
  return diaMexico(fecha) + '-' + slug;
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const palabras = (v) => texto(v).split(/\s+/).filter(Boolean).length;

/**
 * Comprueba que una noticia tenga todo lo que la página necesita. Devuelve la
 * lista de problemas (vacía = correcta). Se usa antes de guardar un borrador y
 * otra vez antes de aprobarlo: un texto editado a mano también tiene que pasar.
 */
function validar(n) {
  const errores = [];
  if (!n || typeof n !== 'object') return ['la noticia no es un objeto'];
  if (!texto(n.slug)) errores.push('falta slug');
  if (!ESTADOS.includes(n.estado)) errores.push('estado desconocido: ' + n.estado);
  if (!TEMAS.includes(n.tema)) errores.push('tema desconocido: ' + n.tema);
  if (!n.fuente || !/^https?:\/\//i.test(texto(n.fuente.url))) errores.push('la fuente necesita una URL http(s)');
  if (!n.fuente || !texto(n.fuente.nombre)) errores.push('falta el nombre de la fuente');
  if (!n.fuente || !texto(n.fuente.publicado)) errores.push('falta la hora de publicación de la fuente');

  for (const loc of ['en', 'es']) {
    const t = n[loc];
    if (!t || typeof t !== 'object') { errores.push('falta el texto en ' + loc); continue; }
    if (palabras(t.titulo) < 3) errores.push(`${loc}: el título es demasiado corto`);
    if (palabras(t.que) < 15) errores.push(`${loc}: "qué pasó" es demasiado corto`);
    if (palabras(t.porque) < 15) errores.push(`${loc}: "por qué importa" es demasiado corto`);
    if (!texto(t.impacto)) errores.push(`${loc}: falta "impacto en mercados"`);
    // 120–180 palabras es el largo de una noticia explicada; se deja holgura
    // por arriba para que un texto editado a mano no se rechace por diez
    // palabras, pero un muro de texto sí.
    const total = palabras(t.que) + palabras(t.porque) + palabras(t.impacto);
    if (total > 260) errores.push(`${loc}: el texto se pasa de largo (${total} palabras)`);
  }

  if (!Array.isArray(n.simbolos)) errores.push('simbolos tiene que ser una lista');
  else for (const s of n.simbolos) if (!SIMBOLOS.includes(s)) errores.push('símbolo desconocido: ' + s);
  if (n.principal && !SIMBOLOS.includes(n.principal)) errores.push('símbolo principal desconocido: ' + n.principal);
  if (n.leccion && !LECCIONES.includes(n.leccion)) errores.push('lección desconocida: ' + n.leccion);
  if (!Array.isArray(n.terminos)) errores.push('terminos tiene que ser una lista');
  else if (GLOSARIO.length) for (const t of n.terminos) if (!GLOSARIO.includes(t)) errores.push('término fuera del glosario: ' + t);

  return errores;
}

/** Quita lo que solo importa por dentro; esto es lo que ve el navegador. */
function publica(n) {
  return {
    id: n.id,
    slug: n.slug,
    tema: n.tema,
    fuente: n.fuente,
    simbolos: Array.isArray(n.simbolos) ? n.simbolos : [],
    principal: n.principal || null,
    leccion: n.leccion || null,
    terminos: Array.isArray(n.terminos) ? n.terminos : [],
    // Cómo se etiqueta la nota: si una persona reescribió el texto deja de ser
    // un resumen de IA y pasa a estar escrita por ella.
    autoria: n.editadoPorHumano ? 'humana' : 'ia-revisada',
    revisadoPor: n.revisadoPor || null,
    revisadoEn: n.revisadoEn || null,
    en: n.en,
    es: n.es
  };
}

// ---- Redis ---------------------------------------------------------------

async function guardar(n) {
  const yaEstaba = await redis.comando('EXISTS', clave(n.id));
  await redis.comando('SET', clave(n.id), JSON.stringify(n), 'EX', TTL_DIAS * 86400);
  if (!yaEstaba) {
    await redis.comando('LPUSH', CLAVE_INDICE, n.id);
    await redis.comando('LTRIM', CLAVE_INDICE, 0, MAXIMO - 1);
  }
  return n;
}

async function leer(id) {
  return redis.obtenerJSON(clave(id));
}

/**
 * Noticias del índice, la más reciente primero.
 * @param {{estado?: string, limite?: number}} opciones estado omitido = todas.
 */
async function listar({ estado, limite = 20 } = {}) {
  const tope = Math.min(Math.max(Number(limite) || 20, 1), MAXIMO);
  // Se leen más ids de los que se van a devolver porque el filtro por estado
  // ocurre después: si se pidieran solo 20 y las 20 más recientes fueran
  // borradores, /news saldría vacío teniendo aprobadas más abajo.
  const ids = await redis.comando('LRANGE', CLAVE_INDICE, 0, MAXIMO - 1);
  if (!Array.isArray(ids) || !ids.length) return [];
  const crudos = await redis.pipeline(ids.map((id) => ['GET', clave(id)]));
  const out = [];
  for (const crudo of crudos) {
    if (!crudo) continue;                       // caducada: el id sigue en el índice
    let n;
    try { n = typeof crudo === 'object' ? crudo : JSON.parse(crudo); } catch (e) { continue; }
    if (estado && n.estado !== estado) continue;
    out.push(n);
    if (out.length >= tope) break;
  }
  return out;
}

/** Cambia estado/texto de una noticia. Devuelve null si el id no existe. */
async function actualizar(id, cambios) {
  const n = await leer(id);
  if (!n) return null;
  const actualizada = Object.assign({}, n, cambios);
  await guardar(actualizada);
  return actualizada;
}

/**
 * Cuota de generación del día: cuántos borradores se han pedido hoy.
 * Es el freno de gasto — sin él, un bucle de peticiones a la generación de
 * borradores gastaría la cuenta de Anthropic sin que nadie se entere.
 */
async function cuotaDelDia(fecha = new Date()) {
  const n = await redis.comando('GET', claveCuota(diaMexico(fecha)));
  return Number(n) || 0;
}

async function sumarCuota(cuantas, fecha = new Date()) {
  const k = claveCuota(diaMexico(fecha));
  const total = await redis.comando('INCRBY', k, cuantas);
  await redis.comando('EXPIRE', k, 3 * 86400);
  return Number(total) || 0;
}

/** Normaliza el valor de ?estado= (acepta plural y singular). */
function estadoPedido(valor) {
  const v = String(valor || '').toLowerCase();
  if (!v) return null;
  if (v === 'aprobadas' || v === 'aprobada') return 'aprobada';
  if (v === 'borradores' || v === 'borrador') return 'borrador';
  if (v === 'rechazadas' || v === 'rechazada') return 'rechazada';
  return undefined;   // undefined = valor inválido; null = no se pidió ninguno
}

module.exports = {
  ESTADOS, TEMAS, SIMBOLOS, LECCIONES, MAXIMO, TTL_DIAS,
  diaMexico, slugify, nuevoId, validar, publica,
  guardar, leer, listar, actualizar, cuotaDelDia, sumarCuota, estadoPedido
};
