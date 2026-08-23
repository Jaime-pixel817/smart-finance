// Caché COMPARTIDA de datos de mercado, encima del Redis de Upstash.
//
// EL PROBLEMA QUE RESUELVE
// -----------------------
// Hasta ahora cada endpoint (`markets`, `history`, `quotes`, `sparklines`,
// `world`) guardaba su caché en una variable del módulo. Eso es caché por
// INSTANCIA: cada arranque en frío de Vercel, cada región y cada lambda
// paralela empiezan con la caché vacía y vuelven a pedirle al proveedor. Con
// Twelve Data en 672 de 800 créditos diarios sobre el papel, el gasto real
// depende de cuántas instancias haya arrancado Vercel ese día — que es un
// número que no controlamos. Un día con tráfico se pasa del tope y el bloque
// de acciones de /market se queda sin datos.
//
// Aquí la caché vive en Redis, o sea FUERA de la instancia: todas comparten.
//
// LAS CUATRO PIEZAS
// -----------------
// 1. Dos copias por clave. La FRESCA vive lo que dure el TTL del endpoint
//    (15 min en markets/quotes/world, 60 s en history). La VIEJA (`stale`)
//    vive 48 h y solo se sirve cuando el proveedor falla, marcada
//    `stale: true` — el sitio prefiere decir "último dato conocido" a enseñar
//    un hueco. La UI ya sabe pintar eso.
// 2. Singleflight (`SET lock NX EX 20`): cuando la copia fresca caduca y
//    llegan diez visitas a la vez, UNA sola pide al proveedor y las otras
//    nueve esperan a que escriba (o se conforman con la copia vieja). Sin
//    esto, caducar la caché es un pico de diez llamadas.
// 3. Contadores de cuota por proveedor y día (`INCR quota:<prov>:<día>`).
//    Es la única forma de saber cuánto se está gastando de verdad, porque el
//    presupuesto escrito en api/markets.js supone una instancia y hay varias.
// 4. Degradación automática: si Twelve Data pasa de UMBRAL_TWELVE_DATA
//    créditos en el día, se deja de llamar y se usa el respaldo (Yahoo) hasta
//    la medianoche UTC. Queda anotado para que /api/markets?accion=health lo
//    diga.
//
// SI REDIS NO ESTÁ (o se cae)
// ---------------------------
// Nada revienta: se cae a la caché en memoria de siempre, que es exactamente
// el comportamiento anterior. Ninguna función de este módulo lanza por un
// fallo de Redis; como mucho lo escribe en los logs. La caché es una mejora,
// no una dependencia.
//
// LAS RESPUESTAS NO CAMBIAN DE FORMA. Este módulo guarda y devuelve el mismo
// objeto que el endpoint ya construía; el navegador no se entera de nada
// salvo de que dejó de fallar.

'use strict';

const redisReal = require('./redis.js');

// Prefijos. Van versionados: si algún día cambia la forma de lo que se guarda,
// se sube el número y las copias viejas se ignoran solas en vez de tener que
// vaciar la base a mano.
const P_FRESCO = 'sf:cache:v1:';
const P_VIEJO = 'sf:stale:v1:';
const P_LOCK = 'sf:lock:v1:';
const P_CUOTA = 'sf:quota:v1:';

const STALE_TTL = 48 * 60 * 60;        // 48 h de "último dato conocido"
const LOCK_TTL = 20;                   // segundos: más que cualquier fetch nuestro
const CUOTA_TTL = 3 * 24 * 60 * 60;    // el contador sobrevive 3 días: el informe enseña ayer

// Cuánto espera quien NO se llevó el candado a que el que sí lo tiene escriba.
const ESPERA_MS = 250;
const INTENTOS = 8;                    // 8 × 250 ms = 2 s como mucho

// Twelve Data: plan gratuito de 800 créditos al día. Se degrada en 700 y no en
// 799 para dejar margen a lo que ya esté en vuelo cuando se cruce la raya.
const UMBRAL_TWELVE_DATA = 700;

// ---------------------------------------------------------------------------
// Cliente inyectable. En producción es api/_lib/redis.js; las pruebas meten
// uno de mentira en memoria. Es la única forma de probar el singleflight y la
// copia vieja sin una base de datos de verdad.
let cliente = redisReal;
function _usarCliente(c) { cliente = c || redisReal; }

// Caché de instancia, delante de Redis. No sustituye a la compartida: evita
// una ida y vuelta a Upstash cuando la MISMA lambda atiende dos visitas
// seguidas, que es el caso común.
let memoria = new Map();
function _reiniciarMemoria() { memoria = new Map(); }

const ahora = () => Date.now();

/** Día en UTC (2026-08-23). Twelve Data cuenta su cuota por día UTC. */
function claveDia(t) {
  return new Date(t === undefined ? ahora() : t).toISOString().slice(0, 10);
}

// Todo lo que habla con Redis pasa por aquí: un fallo de red NUNCA sale de
// este módulo. Devuelve `caida` si algo va mal.
async function seguro(fn, caida, etiqueta) {
  try {
    return await fn();
  } catch (err) {
    // REDIS_NO_CONFIGURADO es lo normal en local y en las pruebas: no merece
    // un error en los logs cada vez.
    if (!err || err.code !== 'REDIS_NO_CONFIGURADO') {
      console.warn('cache: Redis falló en ' + (etiqueta || '?') + ':', err && err.message);
    }
    return caida;
  }
}

function parsear(crudo) {
  if (crudo === null || crudo === undefined) return null;
  if (typeof crudo === 'object') return crudo;   // Upstash a veces ya lo parsea
  try { return JSON.parse(crudo); } catch (e) { return null; }
}

// El sobre que se guarda: el valor del endpoint, CUÁNDO se guardó y con qué
// TTL. La edad se calcula al leer, así que sirve igual en la copia fresca y en
// la vieja. El TTL viaja dentro porque el endpoint lo repite en su cabecera
// Cache-Control y tiene que decir lo mismo aunque la respuesta salga de la
// caché y no del proveedor.
function sobre(valor, fuente, ttl) {
  return { valor, guardadoEn: new Date().toISOString(), fuente: fuente || null, ttl: ttl || null };
}

function edadMs(s) {
  const t = s && s.guardadoEn ? Date.parse(s.guardadoEn) : NaN;
  return isFinite(t) ? Math.max(0, ahora() - t) : null;
}

// ---------------------------------------------------------------------------
// API mínima pedida: leer / escribir.

/**
 * Lee una clave. Devuelve `null` si no hay nada, o
 * `{ valor, edadMs, stale, fuente }`. `stale: true` significa que la copia
 * fresca caducó y esto es lo último que se supo — el que llama decide si lo
 * sirve marcado o si prefiere reintentar.
 */
async function leer(clave) {
  const enMemoria = memoria.get(clave);
  if (enMemoria && enMemoria.expira > ahora()) {
    return { valor: enMemoria.sobre.valor, edadMs: edadMs(enMemoria.sobre), stale: false, fuente: enMemoria.sobre.fuente, ttl: enMemoria.sobre.ttl };
  }

  const [fresco, viejo] = await seguro(
    () => cliente.pipeline([['GET', P_FRESCO + clave], ['GET', P_VIEJO + clave]]),
    [null, null],
    'leer(' + clave + ')'
  );

  const sFresco = parsear(fresco);
  if (sFresco) return { valor: sFresco.valor, edadMs: edadMs(sFresco), stale: false, fuente: sFresco.fuente, ttl: sFresco.ttl };

  const sViejo = parsear(viejo);
  if (sViejo) return { valor: sViejo.valor, edadMs: edadMs(sViejo), stale: true, fuente: sViejo.fuente, ttl: sViejo.ttl };

  // Puede que en memoria haya algo caducado pero utilizable como último
  // recurso (Redis no configurado y el proveedor caído).
  if (enMemoria) {
    return { valor: enMemoria.sobre.valor, edadMs: edadMs(enMemoria.sobre), stale: true, fuente: enMemoria.sobre.fuente, ttl: enMemoria.sobre.ttl };
  }
  return null;
}

/**
 * Guarda las DOS copias de golpe: la fresca con el TTL del endpoint y la vieja
 * con 48 h. Escribir la vieja siempre (y no solo cuando algo falla) es lo que
 * garantiza que haya algo que servir el día que el proveedor se caiga.
 * `ttl` en segundos.
 */
async function escribir(clave, valor, ttl, fuente) {
  const s = sobre(valor, fuente, ttl);
  memoria.set(clave, { sobre: s, expira: ahora() + ttl * 1000 });
  await seguro(
    () => cliente.pipeline([
      ['SET', P_FRESCO + clave, JSON.stringify(s), 'EX', Math.max(1, Math.round(ttl))],
      ['SET', P_VIEJO + clave, JSON.stringify(s), 'EX', STALE_TTL]
    ]),
    null,
    'escribir(' + clave + ')'
  );
  return s;
}

// ---------------------------------------------------------------------------
// Contadores de cuota.

/** Suma `n` créditos al proveedor en el día de hoy (UTC). No lanza nunca. */
async function contarCuota(proveedor, n) {
  const creditos = Math.max(1, Math.round(n || 1));
  const clave = P_CUOTA + proveedor + ':' + claveDia();
  const [usado] = await seguro(
    () => cliente.pipeline([['INCRBY', clave, creditos], ['EXPIRE', clave, CUOTA_TTL]]),
    [null],
    'contarCuota(' + proveedor + ')'
  );
  const n2 = Number(usado);
  return isFinite(n2) ? n2 : null;
}

/** Créditos gastados hoy por un proveedor. `null` si no se pudo saber. */
async function cuotaUsada(proveedor, dia) {
  const clave = P_CUOTA + proveedor + ':' + (dia || claveDia());
  const crudo = await seguro(() => cliente.comando('GET', clave), null, 'cuotaUsada');
  const n = Number(crudo);
  return crudo === null || crudo === undefined || !isFinite(n) ? null : n;
}

/**
 * ¿Hay que dejar de llamar a este proveedor por hoy?
 *
 * Si Redis no contesta devuelve `false` a propósito: no saber cuánto se ha
 * gastado no es razón para apagar la fuente buena. El respaldo sigue estando
 * ahí si la llamada falla de verdad.
 */
async function cuotaSuperada(proveedor, umbral) {
  const usado = await cuotaUsada(proveedor);
  if (usado === null) return false;
  return usado >= (umbral || UMBRAL_TWELVE_DATA);
}

/** Deja anotado que hoy se degradó, y por qué. Lo lee el informe de salud. */
async function anotarDegradacion(proveedor, motivo) {
  const clave = P_CUOTA + proveedor + ':' + claveDia() + ':degradado';
  console.warn('cache: ' + proveedor + ' degradado (' + motivo + ')');
  await seguro(
    () => cliente.pipeline([
      ['SET', clave, JSON.stringify({ motivo, desde: new Date().toISOString() }), 'EX', CUOTA_TTL]
    ]),
    null,
    'anotarDegradacion'
  );
}

async function degradacionDeHoy(proveedor) {
  const crudo = await seguro(
    () => cliente.comando('GET', P_CUOTA + proveedor + ':' + claveDia() + ':degradado'),
    null,
    'degradacionDeHoy'
  );
  return parsear(crudo);
}

// ---------------------------------------------------------------------------
// Singleflight.

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Intenta quedarse con el candado. `true` = me toca pedir a mí. */
async function tomarCandado(clave) {
  const r = await seguro(
    () => cliente.comando('SET', P_LOCK + clave, String(process.pid) + ':' + ahora(), 'NX', 'EX', LOCK_TTL),
    // Sin Redis no hay coordinación posible: que pida quien llegue. Es el
    // comportamiento de antes, ni mejor ni peor.
    'OK',
    'tomarCandado'
  );
  return r === 'OK' || r === true;
}

async function soltarCandado(clave) {
  await seguro(() => cliente.comando('DEL', P_LOCK + clave), null, 'soltarCandado');
}

// ---------------------------------------------------------------------------
// La función que usan los endpoints.

/**
 * Sirve `clave` de la caché compartida, y si hace falta la calcula UNA vez
 * entre todas las instancias.
 *
 *   clave      identificador estable ('markets:v1', 'history:USDMXN:1D'…)
 *   ttl        segundos que la copia se considera fresca. Puede ser una
 *              función `(valor) => segundos` para los endpoints que cachean
 *              menos cuando la respuesta salió coja (markets y quotes ya lo
 *              hacían con su DEGRADED_TTL_MS)
 *   calcular   async () => valor  — la llamada al proveedor principal
 *   proveedor  { nombre, creditos, umbral } del principal, para la cuota.
 *              `umbral` activa la degradación automática.
 *   respaldo   opcional { nombre, creditos, calcular } — se usa si el
 *              principal falla O si su cuota se pasó del umbral
 *
 * Devuelve `{ valor, stale, edadMs, fuente, degradado }`. Solo lanza si no
 * hay NADA que servir: ni caché fresca, ni proveedor, ni respaldo, ni copia
 * vieja.
 */
async function conCache(opciones) {
  const { clave, ttl, calcular, proveedor, respaldo } = opciones;

  const enCache = await leer(clave);
  if (enCache && !enCache.stale) return Object.assign({ degradado: false }, enCache);

  const yaTengoViejo = enCache;   // puede ser null

  // ¿Me toca pedir a mí, o ya hay alguien pidiendo?
  const mio = await tomarCandado(clave);
  if (!mio) {
    // Otra instancia está hablando con el proveedor. Si tengo copia vieja la
    // sirvo YA: mejor un dato de hace un rato que 2 s de espera.
    if (yaTengoViejo) return Object.assign({ degradado: false }, yaTengoViejo);
    // Sin nada que servir, espero a que el otro escriba.
    for (let i = 0; i < INTENTOS; i++) {
      await dormir(ESPERA_MS);
      const r = await leer(clave);
      if (r && !r.stale) return Object.assign({ degradado: false }, r);
      if (r) return Object.assign({ degradado: false }, r);
    }
    // El otro tardó demasiado o se murió: sigo yo, sin candado.
  }

  let degradado = false;
  try {
    // ¿La cuota del principal ya se pasó hoy? Entonces ni se intenta.
    let saltarPrincipal = false;
    if (proveedor && proveedor.umbral && respaldo) {
      saltarPrincipal = await cuotaSuperada(proveedor.nombre, proveedor.umbral);
      if (saltarPrincipal) {
        degradado = true;
        await anotarDegradacion(proveedor.nombre, 'cuota diaria por encima de ' + proveedor.umbral);
      }
    }

    let valor = null;
    let fuente = proveedor ? proveedor.nombre : null;

    if (!saltarPrincipal) {
      try {
        if (proveedor && proveedor.creditos) await contarCuota(proveedor.nombre, proveedor.creditos);
        valor = await calcular();
      } catch (err) {
        console.warn('cache: ' + clave + ' — el proveedor falló:', err && err.message);
        if (!respaldo) throw err;
        degradado = true;
        valor = null;
      }
    }

    if (valor === null || valor === undefined) {
      if (!respaldo) throw new Error('cache: ' + clave + ' sin valor y sin respaldo');
      if (respaldo.creditos) await contarCuota(respaldo.nombre, respaldo.creditos);
      valor = await respaldo.calcular();
      fuente = respaldo.nombre;
    }

    const segundos = typeof ttl === 'function' ? ttl(valor) : ttl;
    await escribir(clave, valor, segundos, fuente);
    return { valor, stale: false, edadMs: 0, fuente, ttl: segundos, degradado };
  } catch (err) {
    // Todo falló. Aquí es donde la copia vieja gana su sueldo.
    const viejo = yaTengoViejo || (await leer(clave));
    if (viejo) {
      console.warn('cache: ' + clave + ' sirviendo copia vieja (' + Math.round((viejo.edadMs || 0) / 60000) + ' min)');
      return { valor: viejo.valor, stale: true, edadMs: viejo.edadMs, fuente: viejo.fuente, ttl: viejo.ttl, degradado: true };
    }
    throw err;
  } finally {
    if (mio) await soltarCandado(clave);
  }
}

// ---------------------------------------------------------------------------
// Informe de salud (lo pinta /api/markets?accion=health).

const PROVEEDORES = [
  { nombre: 'twelvedata', etiqueta: 'Twelve Data', tope: 800, umbral: UMBRAL_TWELVE_DATA },
  { nombre: 'yahoo', etiqueta: 'Yahoo Finance', tope: null, umbral: null },
  { nombre: 'coingecko', etiqueta: 'CoinGecko', tope: null, umbral: null }
];

/**
 * Recorre las copias VIEJAS (que existen aunque la fresca haya caducado) para
 * decir la edad de cada caché. Se usa SCAN y no KEYS: KEYS bloquea el servidor
 * y aquí no hace falta ser exhaustivo.
 */
async function edadesDeCache(maxVueltas) {
  const claves = [];
  let cursor = '0';
  for (let i = 0; i < (maxVueltas || 4); i++) {
    const r = await seguro(
      () => cliente.comando('SCAN', cursor, 'MATCH', P_VIEJO + '*', 'COUNT', '200'),
      null,
      'edadesDeCache'
    );
    if (!Array.isArray(r) || r.length < 2) break;
    cursor = String(r[0]);
    for (const k of r[1] || []) claves.push(String(k));
    if (cursor === '0') break;
  }
  if (!claves.length) return [];

  const valores = await seguro(() => cliente.pipeline(claves.map((k) => ['GET', k])), [], 'edadesDeCache/GET');
  return claves.map((k, i) => {
    const s = parsear(valores[i]);
    const ms = edadMs(s);
    return {
      clave: k.slice(P_VIEJO.length),
      fuente: s && s.fuente,
      guardadoEn: s && s.guardadoEn,
      edadMinutos: ms === null ? null : Math.round(ms / 60000)
    };
  }).sort((a, b) => (a.clave < b.clave ? -1 : 1));
}

/** El objeto que devuelve /api/markets?accion=health. */
async function informe() {
  const hoy = claveDia();
  const ayer = claveDia(ahora() - 24 * 60 * 60 * 1000);

  const cuotas = [];
  for (const p of PROVEEDORES) {
    const [usadoHoy, usadoAyer, degradado] = await Promise.all([
      cuotaUsada(p.nombre, hoy),
      cuotaUsada(p.nombre, ayer),
      degradacionDeHoy(p.nombre)
    ]);
    cuotas.push({
      proveedor: p.nombre,
      etiqueta: p.etiqueta,
      usadoHoy: usadoHoy === null ? 0 : usadoHoy,
      usadoAyer: usadoAyer === null ? 0 : usadoAyer,
      tope: p.tope,
      umbral: p.umbral,
      // Porcentaje del tope, para no tener que hacer la cuenta a ojo.
      porcentaje: p.tope && usadoHoy !== null ? Math.round((usadoHoy / p.tope) * 100) : null,
      degradado: degradado || null
    });
  }

  const caches = await edadesDeCache();
  const twelve = cuotas.find((c) => c.proveedor === 'twelvedata');

  return {
    generadoEn: new Date().toISOString(),
    dia: hoy,
    redis: redisReal.estadoConexion ? redisReal.estadoConexion() : { conectado: null },
    cuotas,
    caches,
    // Qué fuente está sirviendo las acciones de /market ahora mismo.
    fuenteAcciones: twelve && twelve.degradado ? 'Yahoo Finance (respaldo)' : 'Twelve Data',
    notas: [
      'usadoHoy son créditos contados por ESTE módulo; lo que no pase por la caché compartida no se cuenta.',
      'Twelve Data se degrada solo a Yahoo Finance al llegar a ' + UMBRAL_TWELVE_DATA + ' de ' + 800 + ' créditos (día UTC).',
      'edadMinutos sale de la copia de 48 h, así que existe aunque la copia fresca ya haya caducado.'
    ]
  };
}

module.exports = {
  leer,
  escribir,
  conCache,
  contarCuota,
  cuotaUsada,
  cuotaSuperada,
  anotarDegradacion,
  degradacionDeHoy,
  informe,
  edadesDeCache,
  claveDia,
  UMBRAL_TWELVE_DATA,
  STALE_TTL,
  LOCK_TTL,
  // Solo para las pruebas.
  _usarCliente,
  _reiniciarMemoria
};
