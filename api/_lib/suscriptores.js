// Modelo de datos de la lista de correo, encima de Redis.
//
// Dos estructuras y nada más:
//   suscriptor:<correo>     -> JSON con estado, tokens, idioma y fechas
//   boletin:confirmados     -> SET con los correos que ya confirmaron
//
// El SET existe para no tener que recorrer todas las claves al enviar: SMEMBERS
// de un set es una operación; un SCAN de toda la base, muchas y con paginado.
// El JSON por suscriptor guarda el detalle, el SET solo el índice de a quién
// toca escribirle.

const crypto = require('crypto');
const redis = require('./redis');

const CLAVE_CONFIRMADOS = 'boletin:confirmados';

const ESTADOS = { PENDIENTE: 'pending', CONFIRMADO: 'confirmed', BAJA: 'unsubscribed' };

// Los correos se normalizan para que Correo@X.com y correo@x.com sean el mismo
// suscriptor y no se le mande dos veces.
function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

// Validación deliberadamente simple: un solo @, algo antes, un punto después, y
// sin espacios. Las regex "completas" de RFC rechazan correos válidos y aceptan
// basura; lo que de verdad valida el correo es el doble opt-in.
function correoValido(correo) {
  if (typeof correo !== 'string') return false;
  if (correo.length < 6 || correo.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(correo);
}

function claveSuscriptor(correo) {
  return 'suscriptor:' + normalizarCorreo(correo);
}

function nuevoToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Comparación en tiempo constante: evita que se pueda ir adivinando el token
// midiendo cuánto tarda en responder.
function tokenCoincide(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function obtener(correo) {
  return redis.obtenerJSON(claveSuscriptor(correo));
}

// Alta o re-alta. Devuelve el registro guardado, con tokens nuevos si hacía
// falta. Si ya estaba confirmado no se toca nada: se avisa con yaConfirmado
// para que la API no le vuelva a mandar el correo de confirmación.
async function registrarPendiente(correo, idioma) {
  const normalizado = normalizarCorreo(correo);
  const existente = await obtener(normalizado);

  if (existente && existente.estado === ESTADOS.CONFIRMADO) {
    return { registro: existente, yaConfirmado: true };
  }

  const registro = {
    correo: normalizado,
    estado: ESTADOS.PENDIENTE,
    // Token de confirmación nuevo en cada alta: si alguien pidió el alta hace
    // meses y vuelve a pedirla, el link viejo deja de servir.
    tokenConfirmacion: nuevoToken(),
    // El de baja se conserva si ya existía, para que los links de "darse de
    // baja" de correos anteriores sigan funcionando.
    tokenBaja: (existente && existente.tokenBaja) || nuevoToken(),
    idioma: idioma === 'es' ? 'es' : 'en',
    creadoEn: (existente && existente.creadoEn) || new Date().toISOString(),
    confirmadoEn: null,
    bajaEn: null
  };

  await redis.guardarJSON(claveSuscriptor(normalizado), registro);
  // Por si venía de una baja previa: mientras no confirme, fuera del set.
  await redis.comando('SREM', CLAVE_CONFIRMADOS, normalizado);

  return { registro, yaConfirmado: false };
}

// Devuelve 'ok' | 'ya-confirmado' | 'token-invalido' | 'no-existe'
async function confirmar(correo, token) {
  const normalizado = normalizarCorreo(correo);
  const registro = await obtener(normalizado);
  if (!registro) return { resultado: 'no-existe' };
  if (registro.estado === ESTADOS.CONFIRMADO) return { resultado: 'ya-confirmado', registro };
  if (!tokenCoincide(registro.tokenConfirmacion || '', String(token || ''))) {
    return { resultado: 'token-invalido' };
  }

  registro.estado = ESTADOS.CONFIRMADO;
  registro.confirmadoEn = new Date().toISOString();
  registro.bajaEn = null;
  if (!registro.tokenBaja) registro.tokenBaja = nuevoToken();

  await redis.guardarJSON(claveSuscriptor(normalizado), registro);
  await redis.comando('SADD', CLAVE_CONFIRMADOS, normalizado);

  return { resultado: 'ok', registro };
}

// La baja marca en vez de borrar: así queda constancia de que esa persona pidió
// no recibir más, y un alta accidental posterior no la resucita en silencio.
// Devuelve 'ok' | 'token-invalido' | 'no-existe'
async function darDeBaja(correo, token) {
  const normalizado = normalizarCorreo(correo);
  const registro = await obtener(normalizado);
  if (!registro) return { resultado: 'no-existe' };
  if (!tokenCoincide(registro.tokenBaja || '', String(token || ''))) {
    return { resultado: 'token-invalido' };
  }

  registro.estado = ESTADOS.BAJA;
  registro.bajaEn = new Date().toISOString();

  await redis.guardarJSON(claveSuscriptor(normalizado), registro);
  await redis.comando('SREM', CLAVE_CONFIRMADOS, normalizado);

  return { resultado: 'ok', registro };
}

// Lista de confirmados con su idioma y token de baja, que es lo que necesita el
// envío. Se piden los JSON en un solo pipeline en vez de uno por uno.
async function listarConfirmados() {
  const correos = (await redis.comando('SMEMBERS', CLAVE_CONFIRMADOS)) || [];
  if (!correos.length) return [];

  const registros = await redis.pipeline(correos.map((c) => ['GET', claveSuscriptor(c)]));

  return registros
    .map((crudo) => {
      if (!crudo) return null;
      try { return typeof crudo === 'object' ? crudo : JSON.parse(crudo); } catch (e) { return null; }
    })
    // Si el JSON se perdió pero el correo seguía en el set, no se le escribe:
    // sin token de baja no se le puede ofrecer el link obligatorio.
    .filter((r) => r && r.estado === ESTADOS.CONFIRMADO && r.tokenBaja);
}

// Freno básico de abuso: N altas por IP por hora. No sustituye a un CAPTCHA,
// pero corta el goteo automatizado sin molestar a nadie real.
async function dentroDelLimite(ip, maximoPorHora = 10) {
  if (!ip) return true;
  const clave = 'limite:alta:' + ip;
  const usos = await redis.comando('INCR', clave);
  if (usos === 1) await redis.comando('EXPIRE', clave, 3600);
  return usos <= maximoPorHora;
}

module.exports = {
  ESTADOS,
  normalizarCorreo,
  correoValido,
  nuevoToken,
  obtener,
  registrarPendiente,
  confirmar,
  darDeBaja,
  listarConfirmados,
  dentroDelLimite
};
