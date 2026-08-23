// Pruebas de la caché compartida (api/_lib/cache.js) con un Redis de mentira
// en memoria.
//
// Lo que se comprueba aquí es justo lo que NO se ve mirando la página y solo se
// nota el día que se rompe: que dos visitas a la vez peguen UNA sola llamada al
// proveedor, que cuando el proveedor se cae se sirva el último dato conocido en
// vez de un hueco, que los créditos se cuenten de verdad, que al pasarse de la
// cuota se cambie de fuente sola, y que el informe de salud no se pueda mirar
// sin el CRON_SECRET.
//
// El Redis falso implementa solo los comandos que usa cache.js (GET, SET con
// NX/EX, DEL, INCRBY, EXPIRE, SCAN). No pretende ser Redis: pretende ser lo
// bastante Redis como para que estas pruebas signifiquen algo.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cache = require('./cache.js');

// ---------------------------------------------------------------- Redis falso

function redisFalso() {
  const datos = new Map();   // clave -> { v, exp }  (exp en ms, o null)
  const contador = { comandos: 0 };

  const vivo = (e) => e && (e.exp === null || e.exp > Date.now());
  const get = (k) => { const e = datos.get(k); return vivo(e) ? e.v : null; };

  function uno(args) {
    contador.comandos++;
    const cmd = String(args[0]).toUpperCase();
    const k = args[1];

    if (cmd === 'GET') return get(k);

    if (cmd === 'SET') {
      const opciones = args.slice(3).map((a) => String(a).toUpperCase());
      const iNX = opciones.indexOf('NX');
      if (iNX !== -1 && get(k) !== null) return null;     // ya existe: no se toca
      const iEX = opciones.indexOf('EX');
      const exp = iEX === -1 ? null : Date.now() + Number(args[3 + iEX + 1]) * 1000;
      datos.set(k, { v: String(args[2]), exp });
      return 'OK';
    }

    if (cmd === 'DEL') { const habia = datos.delete(k); return habia ? 1 : 0; }

    if (cmd === 'INCRBY' || cmd === 'INCR') {
      const paso = cmd === 'INCR' ? 1 : Number(args[2]);
      const previo = Number(get(k) || 0);
      const nuevo = previo + paso;
      const e = datos.get(k);
      datos.set(k, { v: String(nuevo), exp: vivo(e) ? e.exp : null });
      return nuevo;
    }

    if (cmd === 'EXPIRE') {
      const e = datos.get(k);
      if (!vivo(e)) return 0;
      e.exp = Date.now() + Number(args[2]) * 1000;
      return 1;
    }

    if (cmd === 'SCAN') {
      // Cursor de una sola vuelta: devuelve todo lo que casa y termina en '0'.
      const iM = args.map((a) => String(a).toUpperCase()).indexOf('MATCH');
      const patron = iM === -1 ? '*' : String(args[iM + 1]);
      const re = new RegExp('^' + patron.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
      const claves = [...datos.keys()].filter((c) => re.test(c) && vivo(datos.get(c)));
      return ['0', claves];
    }

    throw new Error('el Redis falso no sabe hacer ' + cmd);
  }

  return {
    async comando(...args) { return uno(args); },
    async pipeline(cmds) { return cmds.map(uno); },
    // Ayudas de prueba, no son parte de la interfaz de redis.js.
    _datos: datos,
    _contador: contador,
    /** Caduca SOLO la copia fresca, dejando viva la de 48 h. */
    _caducarFresca(clave) { datos.delete('sf:cache:v1:' + clave); }
  };
}

let falso;
beforeEach(() => {
  falso = redisFalso();
  cache._usarCliente(falso);
  cache._reiniciarMemoria();
});

const hoy = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ lo básico

test('escribir y leer devuelven el mismo valor, fresco', async () => {
  await cache.escribir('prueba', { a: 1 }, 60, 'Fuente X');
  const r = await cache.leer('prueba');
  assert.deepEqual(r.valor, { a: 1 });
  assert.equal(r.stale, false);
  assert.equal(r.fuente, 'Fuente X');
  assert.ok(r.edadMs !== null && r.edadMs < 5000);
});

test('leer una clave que no existe devuelve null', async () => {
  assert.equal(await cache.leer('no-existe'), null);
});

test('escribir deja SIEMPRE la copia de 48 h, no solo cuando algo falla', async () => {
  await cache.escribir('prueba', { a: 1 }, 60);
  assert.ok(falso._datos.has('sf:stale:v1:prueba'), 'falta la copia vieja');
  const e = falso._datos.get('sf:stale:v1:prueba');
  const horas = (e.exp - Date.now()) / 3600000;
  assert.ok(horas > 47 && horas <= 48, 'la copia vieja debería durar 48 h, dura ' + horas);
});

// -------------------------------------------------------------- singleflight

test('dos llamadas SEGUIDAS solo pegan una vez al proveedor', async () => {
  let veces = 0;
  const calcular = async () => { veces++; return { n: veces }; };

  const a = await cache.conCache({ clave: 'k', ttl: 60, calcular });
  const b = await cache.conCache({ clave: 'k', ttl: 60, calcular });

  assert.equal(veces, 1, 'el proveedor se llamó ' + veces + ' veces');
  assert.deepEqual(a.valor, { n: 1 });
  assert.deepEqual(b.valor, { n: 1 });
  assert.equal(b.stale, false);
});

test('dos llamadas A LA VEZ tampoco: el candado deja pasar a una', async () => {
  // Este es el caso que la caché por instancia nunca resolvió: caduca la copia
  // y llegan varias visitas juntas. Sin candado son N llamadas al proveedor.
  let veces = 0;
  const calcular = async () => {
    veces++;
    await new Promise((r) => setTimeout(r, 60));
    return { n: veces };
  };

  // Sin la caché de instancia de por medio, para que se vea el candado y no el
  // Map local: se lanzan sobre claves iguales desde el mismo módulo, que es lo
  // que hace Vercel con dos peticiones simultáneas a la misma lambda fría.
  const [a, b] = await Promise.all([
    cache.conCache({ clave: 'k', ttl: 60, calcular }),
    cache.conCache({ clave: 'k', ttl: 60, calcular })
  ]);

  assert.equal(veces, 1, 'el proveedor se llamó ' + veces + ' veces, debía ser 1');
  assert.deepEqual(a.valor, { n: 1 });
  assert.deepEqual(b.valor, { n: 1 });
});

test('el candado se suelta al terminar: la siguiente ventana puede pedir', async () => {
  await cache.conCache({ clave: 'k', ttl: 60, calcular: async () => ({ n: 1 }) });
  assert.equal(falso._datos.has('sf:lock:v1:k'), false, 'el candado se quedó puesto');
});

test('el candado se suelta también cuando el proveedor revienta', async () => {
  await assert.rejects(
    cache.conCache({ clave: 'k', ttl: 60, calcular: async () => { throw new Error('boom'); } })
  );
  assert.equal(falso._datos.has('sf:lock:v1:k'), false, 'el candado se quedó puesto tras un fallo');
});

// ---------------------------------------------------------- copia vieja (stale)

test('si el proveedor falla se sirve el último dato conocido, marcado stale', async () => {
  await cache.conCache({ clave: 'k', ttl: 60, calcular: async () => ({ precio: 18.5 }) });

  // Pasan los 60 s: caduca la copia fresca, sobrevive la de 48 h. Se vacía
  // también la caché de instancia, que es lo que pasa en un arranque en frío.
  falso._caducarFresca('k');
  cache._reiniciarMemoria();

  const r = await cache.conCache({
    clave: 'k',
    ttl: 60,
    calcular: async () => { throw new Error('yahoo 503'); }
  });

  assert.equal(r.stale, true, 'debería venir marcado como copia vieja');
  assert.deepEqual(r.valor, { precio: 18.5 }, 'debería ser el último dato conocido');
});

test('sin copia vieja y con el proveedor caído, sí se lanza (no se inventa nada)', async () => {
  await assert.rejects(
    cache.conCache({ clave: 'vacia', ttl: 60, calcular: async () => { throw new Error('caído'); } }),
    /caído/
  );
});

test('servir la copia vieja NO la borra: el siguiente también la encuentra', async () => {
  await cache.conCache({ clave: 'k', ttl: 60, calcular: async () => ({ v: 1 }) });
  falso._caducarFresca('k');
  cache._reiniciarMemoria();

  const fallar = async () => { throw new Error('nope'); };
  const a = await cache.conCache({ clave: 'k', ttl: 60, calcular: fallar });
  cache._reiniciarMemoria();
  const b = await cache.conCache({ clave: 'k', ttl: 60, calcular: fallar });

  assert.deepEqual(a.valor, { v: 1 });
  assert.deepEqual(b.valor, { v: 1 });
  assert.equal(b.stale, true);
});

// ------------------------------------------------------------------- cuota

test('el contador de créditos sube por proveedor y por día', async () => {
  await cache.conCache({
    clave: 'k1', ttl: 60,
    proveedor: { nombre: 'twelvedata', creditos: 7 },
    calcular: async () => ({ ok: 1 })
  });
  assert.equal(await cache.cuotaUsada('twelvedata'), 7);

  await cache.conCache({
    clave: 'k2', ttl: 60,
    proveedor: { nombre: 'twelvedata', creditos: 7 },
    calcular: async () => ({ ok: 2 })
  });
  assert.equal(await cache.cuotaUsada('twelvedata'), 14);

  // Otro proveedor lleva su propia cuenta.
  assert.equal(await cache.cuotaUsada('yahoo'), null);

  // Y la clave del día es la de hoy en UTC.
  assert.ok(falso._datos.has('sf:quota:v1:twelvedata:' + hoy()));
});

test('lo que se sirve de la caché NO gasta créditos', async () => {
  const opciones = {
    clave: 'k', ttl: 60,
    proveedor: { nombre: 'twelvedata', creditos: 7 },
    calcular: async () => ({ ok: 1 })
  };
  await cache.conCache(opciones);
  await cache.conCache(opciones);
  await cache.conCache(opciones);
  assert.equal(await cache.cuotaUsada('twelvedata'), 7, 'tres visitas gastaron más de un refresco');
});

test('el contador caduca solo: no se queda ahí para siempre', async () => {
  await cache.contarCuota('twelvedata', 1);
  const e = falso._datos.get('sf:quota:v1:twelvedata:' + hoy());
  assert.ok(e.exp !== null && e.exp > Date.now(), 'el contador quedó sin EXPIRE');
});

test('cuotaSuperada dice que sí solo al pasar del umbral', async () => {
  assert.equal(await cache.cuotaSuperada('twelvedata', 700), false);
  await cache.contarCuota('twelvedata', 699);
  assert.equal(await cache.cuotaSuperada('twelvedata', 700), false);
  await cache.contarCuota('twelvedata', 1);
  assert.equal(await cache.cuotaSuperada('twelvedata', 700), true);
});

test('sin Redis, cuotaSuperada devuelve false: no saber no es razón para apagar la fuente buena', async () => {
  cache._usarCliente({
    async comando() { const e = new Error('sin redis'); e.code = 'REDIS_NO_CONFIGURADO'; throw e; },
    async pipeline() { const e = new Error('sin redis'); e.code = 'REDIS_NO_CONFIGURADO'; throw e; }
  });
  assert.equal(await cache.cuotaSuperada('twelvedata', 700), false);
});

// -------------------------------------------------------------- degradación

test('pasado el umbral se cambia al respaldo sin llamar al principal, y queda anotado', async () => {
  await cache.contarCuota('twelvedata', 700);

  let principal = 0;
  let respaldo = 0;
  const r = await cache.conCache({
    clave: 'markets', ttl: 60,
    proveedor: { nombre: 'twelvedata', creditos: 7, umbral: 700 },
    respaldo: {
      nombre: 'yahoo', creditos: 7,
      calcular: async () => { respaldo++; return { source: 'Yahoo Finance' }; }
    },
    calcular: async () => { principal++; return { source: 'Twelve Data' }; }
  });

  assert.equal(principal, 0, 'se le siguió llamando a Twelve Data con la cuota pasada');
  assert.equal(respaldo, 1);
  assert.equal(r.degradado, true);
  assert.deepEqual(r.valor, { source: 'Yahoo Finance' });
  assert.equal(await cache.cuotaUsada('twelvedata'), 700, 'la degradación gastó créditos del principal');
  assert.equal(await cache.cuotaUsada('yahoo'), 7);

  const nota = await cache.degradacionDeHoy('twelvedata');
  assert.ok(nota && /700/.test(nota.motivo), 'no quedó anotada la degradación');
});

test('si el principal falla (no por cuota) también entra el respaldo', async () => {
  const r = await cache.conCache({
    clave: 'markets', ttl: 60,
    proveedor: { nombre: 'twelvedata', creditos: 7, umbral: 700 },
    respaldo: { nombre: 'yahoo', creditos: 7, calcular: async () => ({ source: 'Yahoo Finance' }) },
    calcular: async () => { throw new Error('twelvedata: run out of API credits'); }
  });
  assert.deepEqual(r.valor, { source: 'Yahoo Finance' });
  assert.equal(r.degradado, true);
});

// ----------------------------------------------------------------- informe

test('el informe cuenta la cuota, la edad de cada caché y la fuente activa', async () => {
  await cache.conCache({
    clave: 'markets:v1', ttl: 900,
    proveedor: { nombre: 'twelvedata', creditos: 7 },
    calcular: async () => ({ ok: 1 })
  });
  await cache.conCache({
    clave: 'world:v1', ttl: 900,
    proveedor: { nombre: 'yahoo', creditos: 8 },
    calcular: async () => ({ ok: 2 })
  });

  const inf = await cache.informe();

  const td = inf.cuotas.find((c) => c.proveedor === 'twelvedata');
  assert.equal(td.usadoHoy, 7);
  assert.equal(td.tope, 800);
  assert.equal(td.porcentaje, 1);
  assert.equal(inf.fuenteAcciones, 'Twelve Data');

  const claves = inf.caches.map((c) => c.clave);
  assert.ok(claves.includes('markets:v1'), 'el informe no vio markets:v1');
  assert.ok(claves.includes('world:v1'), 'el informe no vio world:v1');
  assert.equal(inf.caches.find((c) => c.clave === 'world:v1').edadMinutos, 0);
  assert.equal(inf.caches.find((c) => c.clave === 'markets:v1').fuente, 'twelvedata');
});

test('el informe dice cuando la fuente de acciones está degradada', async () => {
  await cache.anotarDegradacion('twelvedata', 'cuota diaria por encima de 700');
  const inf = await cache.informe();
  assert.equal(inf.fuenteAcciones, 'Yahoo Finance (respaldo)');
  assert.ok(inf.cuotas.find((c) => c.proveedor === 'twelvedata').degradado);
});

// ------------------------------------------- la puerta del informe de salud

test('/api/markets?accion=health devuelve 401 sin el secreto', async () => {
  const antes = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'secreto-de-prueba';

  const handler = require('../markets.js');
  const respuestas = [];
  const res = {
    setHeader() {},
    status(c) { this._c = c; return this; },
    json(b) { respuestas.push({ codigo: this._c, cuerpo: b }); }
  };

  await handler({ query: { accion: 'health' }, headers: {} }, res);
  assert.equal(respuestas[0].codigo, 401);

  await handler({ query: { accion: 'health' }, headers: { authorization: 'Bearer otra-cosa-larga' } }, res);
  assert.equal(respuestas[1].codigo, 401);

  if (antes === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = antes;
});

test('con el secreto correcto, el informe sale y NO toca a ningún proveedor', async () => {
  const antes = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'secreto-de-prueba';

  // Si el informe llamara a Twelve Data o a Yahoo, esto lo cazaría.
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('el informe de salud no debe pedir datos a nadie'); };

  try {
    const handler = require('../markets.js');
    let salida = null;
    const res = { setHeader() {}, status(c) { this._c = c; return this; }, json(b) { salida = { codigo: this._c, cuerpo: b }; } };

    await handler(
      { query: { accion: 'health' }, headers: { authorization: 'Bearer secreto-de-prueba' } },
      res
    );

    assert.equal(salida.codigo, 200);
    assert.ok(Array.isArray(salida.cuerpo.cuotas), 'el informe no trae cuotas');
    assert.ok(Array.isArray(salida.cuerpo.caches), 'el informe no trae edades de caché');
    assert.ok(salida.cuerpo.fuenteAcciones, 'el informe no dice qué fuente está activa');
    assert.equal(salida.cuerpo.dia, hoy());
  } finally {
    globalThis.fetch = fetchReal;
    if (antes === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = antes;
  }
});

// ------------------------------- la degradación tal y como la usa /api/markets

test('/api/markets no le habla a Twelve Data cuando la cuota del día se pasó', async () => {
  const markets = require('../markets.js');
  await cache.contarCuota('twelvedata', 705);

  const pedidas = [];
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (url) => {
    pedidas.push(String(url));
    // Yahoo, con lo mínimo para que buildFromBars saque una tarjeta: dos días
    // de barras, cierre previo y precio vigente.
    const ayer = Math.floor(Date.UTC(2026, 7, 21, 20, 0) / 1000);
    const hoyTs = Math.floor(Date.UTC(2026, 7, 22, 20, 0) / 1000);
    return {
      ok: true,
      async json() {
        return {
          chart: {
            result: [{
              timestamp: [ayer, ayer + 1800, hoyTs, hoyTs + 1800],
              indicators: { quote: [{ close: [100, 101, 102, 103] }] },
              meta: { previousClose: 101, regularMarketPrice: 103, currency: 'USD' }
            }]
          }
        };
      }
    };
  };

  try {
    const stocks = await markets.fetchStocks();
    assert.equal(stocks.source, 'Yahoo Finance', 'debería haber degradado a Yahoo');
    assert.equal(
      pedidas.some((u) => /twelvedata/.test(u)), false,
      'se le habló a Twelve Data con la cuota pasada: ' + pedidas.find((u) => /twelvedata/.test(u))
    );
    assert.ok(pedidas.every((u) => /finance\.yahoo\.com/.test(u)));
    const nota = await cache.degradacionDeHoy('twelvedata');
    assert.ok(nota, 'la degradación no quedó anotada para el informe de salud');
  } finally {
    globalThis.fetch = fetchReal;
  }
});
