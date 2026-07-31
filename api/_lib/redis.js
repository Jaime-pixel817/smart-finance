// Cliente mínimo para el Redis de Upstash, hablándole por su API REST.
//
// POR QUÉ NO SE FIJA EL NOMBRE DE LAS VARIABLES: la integración de Vercel
// Storage crea el par url+token con un prefijo que cambia según cómo se haya
// conectado la base (KV_*, UPSTASH_REDIS_*, STORAGE_*, o uno propio si se le
// puso un nombre a la integración). En vez de adivinar, aquí se buscan POR
// FORMA: sirve cualquier par <PREFIJO>_REST_API_URL + <PREFIJO>_REST_API_TOKEN.
// Así funciona con el nombre que sea, y si no encuentra ninguno lo dice claro
// en los logs en vez de fallar con un "undefined" a medio camino.
//
// Se habla REST y no el protocolo Redis normal a propósito: no necesita
// dependencias ni sockets persistentes, que es justo lo que conviene en una
// función serverless que vive unos segundos.

// Prefijos conocidos, en orden de preferencia. Si hay varios configurados se
// toma el primero de esta lista para que el comportamiento sea predecible.
const PREFIJOS_CONOCIDOS = ['KV', 'UPSTASH_REDIS', 'STORAGE', 'REDIS'];

function resolverCredenciales() {
  const env = process.env;

  for (const prefijo of PREFIJOS_CONOCIDOS) {
    const url = env[prefijo + '_REST_API_URL'];
    const token = env[prefijo + '_REST_API_TOKEN'];
    if (url && token) return { url, token, prefijo };
  }

  // Prefijo desconocido: se busca cualquier variable que termine en
  // _REST_API_URL y tenga su _REST_API_TOKEN correspondiente.
  for (const clave of Object.keys(env)) {
    const m = /^(.+)_REST_API_URL$/.exec(clave);
    if (m && env[m[1] + '_REST_API_TOKEN'] && env[clave]) {
      return { url: env[clave], token: env[m[1] + '_REST_API_TOKEN'], prefijo: m[1] };
    }
  }

  return null;
}

let credenciales;
function credencialesEnCache() {
  if (credenciales === undefined) credenciales = resolverCredenciales();
  return credenciales;
}

// Para diagnóstico: qué prefijo se está usando, sin revelar el token.
function estadoConexion() {
  const c = credencialesEnCache();
  if (!c) {
    return {
      conectado: false,
      prefijo: null,
      // Ayuda a depurar sin exponer valores: solo los nombres de variables que
      // se parecen a las que busca.
      candidatasEnEntorno: Object.keys(process.env).filter((k) => /REST_API_(URL|TOKEN)$/.test(k))
    };
  }
  return { conectado: true, prefijo: c.prefijo, host: (() => { try { return new URL(c.url).host; } catch (e) { return null; } })() };
}

class RedisNoConfigurado extends Error {
  constructor() {
    super('Redis no configurado: no se encontró ningún par <PREFIJO>_REST_API_URL + _REST_API_TOKEN en las variables de entorno');
    this.code = 'REDIS_NO_CONFIGURADO';
  }
}

async function pedir(ruta, cuerpo) {
  const c = credencialesEnCache();
  if (!c) throw new RedisNoConfigurado();

  const res = await fetch(c.url.replace(/\/$/, '') + ruta, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + c.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cuerpo)
  });

  const texto = await res.text();
  let json;
  try { json = JSON.parse(texto); } catch (e) {
    throw new Error('respuesta no-JSON de Redis (' + res.status + '): ' + texto.slice(0, 120));
  }
  if (!res.ok) throw new Error('Redis respondió ' + res.status + ': ' + (json.error || texto.slice(0, 120)));
  return json;
}

// Un comando suelto: comando('SET', 'clave', 'valor')
async function comando(...args) {
  const json = await pedir('', args.map(String));
  if (json.error) throw new Error('Redis: ' + json.error);
  return json.result;
}

// Varios comandos en un solo viaje: pipeline([['GET','a'], ['GET','b']])
async function pipeline(comandos) {
  if (!comandos.length) return [];
  const json = await pedir('/pipeline', comandos.map((c) => c.map(String)));
  return json.map((r) => {
    if (r.error) throw new Error('Redis: ' + r.error);
    return r.result;
  });
}

// ---- Azúcar para JSON, que es como se guardan los suscriptores -------------

async function obtenerJSON(clave) {
  const crudo = await comando('GET', clave);
  if (crudo === null || crudo === undefined) return null;
  if (typeof crudo === 'object') return crudo;      // Upstash a veces ya lo devuelve parseado
  try { return JSON.parse(crudo); } catch (e) { return null; }
}

async function guardarJSON(clave, valor) {
  return comando('SET', clave, JSON.stringify(valor));
}

module.exports = { comando, pipeline, obtenerJSON, guardarJSON, estadoConexion, RedisNoConfigurado };
