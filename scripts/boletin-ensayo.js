// Ensayo LOCAL del boletín: arma el correo de esta semana y lo deja en disco
// para poder MIRARLO antes de que salga.
//
//   npm run boletin:ensayo                    -> tmp/boletin/boletin-es.html
//   npm run boletin:ensayo -- --lang=en
//   npm run boletin:ensayo -- --salida=/tmp/x --fecha=2026-08-23
//
// POR QUÉ EXISTE
// --------------
// `?dry=1` en producción ya devuelve el HTML, pero para verlo hay que tener el
// CRON_SECRET a mano, pegar la respuesta en un archivo y quitarle el JSON de
// alrededor. Eso hace que en la práctica nadie mire el correo antes de mandarlo,
// y un boletín que no se mira es un boletín que se degrada.
//
// Este script llama al MISMO handler de api/send-newsletter.js con req/res
// falsos, así que no prueba una copia del correo: prueba el correo. Los datos de
// mercado y la noticia aprobada salen del sitio de verdad (SITE_URL, por
// defecto https://smartfinance.lat), así que lo que se ve es lo que saldría.
//
// EL ÚNICO POSTIZO ES REDIS, y a propósito: en local no hay credenciales, y sin
// almacenamiento la gráfica del dólar no se dibujaría (grafica.publicar()
// devuelve null cuando no puede guardar) — o sea que el ensayo enseñaría un
// correo SIN la imagen, que es justo lo que hay que revisar. Con un Redis en
// memoria la gráfica se dibuja de verdad, se guarda como PNG al lado del HTML y
// se le reescribe el src para poder abrir el archivo y verla.
//
// NO MANDA NADA. El handler recibe ?dry=1: nunca llama a Resend, nunca lee la
// lista de suscriptores real (el Redis de mentira está vacío) y nunca escribe
// en el registro de corridas de producción.

const path = require('path');
const fs = require('fs');
const Module = require('module');

const RAIZ = path.join(__dirname, '..');

// ---- argumentos ------------------------------------------------------------
const args = {};
for (const a of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  if (m) args[m[1]] = m[2] === undefined ? '1' : m[2];
}
const LANG = args.lang === 'en' ? 'en' : 'es';
const SALIDA = path.resolve(args.salida || path.join(RAIZ, 'tmp/boletin'));
const FECHA = args.fecha || null;

process.env.SITE_URL = process.env.SITE_URL || 'https://smartfinance.lat';
// Las dos credenciales que el handler exige antes de armar nada. Son de
// mentira y no se usan para nada: con ?dry=1 no se llama a Resend.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_ENSAYO_LOCAL';
process.env.CRON_SECRET = process.env.CRON_SECRET || 'ensayo-local';

// ---- Redis en memoria ------------------------------------------------------
// Solo los comandos que usa el boletín. Cualquier otro devuelve null, que es lo
// que devolvería una clave que no existe: nada se rompe por no conocerlo.
const cadenas = new Map();
const conjuntos = new Map();
const listas = new Map();

const redisEnMemoria = {
  RedisNoConfigurado: class RedisNoConfigurado extends Error {},
  estadoConexion: () => ({ conectado: true, prefijo: 'ENSAYO', host: 'memoria.local' }),
  async comando(...a) {
    const cmd = String(a[0]).toUpperCase();
    const k = String(a[1]);
    if (cmd === 'SET') { cadenas.set(k, String(a[2])); return 'OK'; }
    if (cmd === 'GET') { return cadenas.has(k) ? cadenas.get(k) : null; }
    if (cmd === 'DEL') { cadenas.delete(k); return 1; }
    if (cmd === 'SADD') { (conjuntos.get(k) || conjuntos.set(k, new Set()).get(k)).add(String(a[2])); return 1; }
    if (cmd === 'SREM') { const s = conjuntos.get(k); if (s) s.delete(String(a[2])); return 1; }
    if (cmd === 'SMEMBERS') { return Array.from(conjuntos.get(k) || []); }
    if (cmd === 'LPUSH') { const l = listas.get(k) || []; l.unshift(String(a[2])); listas.set(k, l); return l.length; }
    if (cmd === 'LRANGE') { return (listas.get(k) || []).slice(Number(a[2]), Number(a[3]) + 1); }
    if (cmd === 'LTRIM' || cmd === 'EXPIRE') return 'OK';
    if (cmd === 'INCR' || cmd === 'INCRBY') return 1;
    return null;
  },
  async pipeline(comandos) {
    const salida = [];
    for (const c of comandos) salida.push(await redisEnMemoria.comando(...c));
    return salida;
  },
  async obtenerJSON(k) {
    const crudo = await redisEnMemoria.comando('GET', k);
    if (crudo === null || crudo === undefined) return null;
    try { return JSON.parse(crudo); } catch (e) { return null; }
  },
  async guardarJSON(k, v) { return redisEnMemoria.comando('SET', k, JSON.stringify(v)); }
};

// Se intercepta el require de api/_lib/redis.js — y solo ese — antes de cargar
// el handler. Es la única forma de no tener que ensuciar el código de
// producción con un modo de prueba.
const cargarOriginal = Module._load;
const RUTA_REDIS = path.join(RAIZ, 'api/_lib/redis.js');
Module._load = function (peticion, padre, esPrincipal) {
  if (padre && /[\\/]api[\\/]/.test(padre.filename) && /redis(\.js)?$/.test(peticion)) {
    try {
      if (require.resolve(path.resolve(path.dirname(padre.filename), peticion)) === RUTA_REDIS) {
        return redisEnMemoria;
      }
    } catch (e) { /* no era ese: sigue el camino normal */ }
  }
  return cargarOriginal.apply(this, arguments);
};

// ---- req / res falsos ------------------------------------------------------
const handler = require(path.join(RAIZ, 'api/send-newsletter.js'));

const req = {
  method: 'GET',
  query: Object.assign({ dry: '1', lang: LANG }, FECHA ? { fecha: FECHA } : {}),
  headers: {
    authorization: 'Bearer ' + process.env.CRON_SECRET,
    'user-agent': 'boletin-ensayo-local'
  }
};

let codigo = 0;
let cuerpo = null;
const res = {
  status(c) { codigo = c; return this; },
  json(o) { cuerpo = o; return this; },
  send(o) { cuerpo = o; return this; },
  setHeader() { return this; },
  end() { return this; }
};

(async () => {
  await handler(req, res);

  if (codigo !== 200 || !cuerpo || !cuerpo.html) {
    console.error('\nEl ensayo no devolvió correo. Código ' + codigo + ':');
    console.error(JSON.stringify(cuerpo, null, 2).slice(0, 1500));
    process.exit(1);
  }

  fs.mkdirSync(SALIDA, { recursive: true });
  let html = cuerpo.html;

  // La gráfica está en el Redis de memoria: se saca a un PNG de al lado y se le
  // reescribe el src, así el HTML guardado se abre y se ve entero sin servidor.
  for (const [clave, valor] of cadenas) {
    if (!clave.startsWith('boletin:grafica:')) continue;
    const png = Buffer.from(valor, 'base64');
    fs.writeFileSync(path.join(SALIDA, 'grafica.png'), png);
    html = html.replace(/https?:\/\/[^"']*\/api\/newsletter-chart\?[^"']*/g, 'grafica.png');
    console.log('gráfica         ' + png.length + ' bytes → grafica.png');
  }

  const archivoHtml = path.join(SALIDA, 'boletin-' + LANG + '.html');
  fs.writeFileSync(archivoHtml, html);
  fs.writeFileSync(path.join(SALIDA, 'boletin-' + LANG + '.txt'), cuerpo.texto || '');
  fs.writeFileSync(
    path.join(SALIDA, 'ensayo-' + LANG + '.json'),
    JSON.stringify(Object.assign({}, cuerpo, { html: undefined, texto: undefined }), null, 2)
  );

  const linea = (etiqueta, valor) => console.log(etiqueta.padEnd(16) + valor);
  console.log('');
  linea('asunto', cuerpo.asunto);
  linea('noticia', cuerpo.titular || '— esta semana no hay ninguna aprobada');
  linea('lección', cuerpo.tip);
  linea('nota de Jaime', cuerpo.nota ? '«' + cuerpo.nota + '»' : '— vacía (el correo sale sin ese bloque)');
  linea('research', cuerpo.research ? cuerpo.research.name : '— sin novedad');
  linea('se movieron', (cuerpo.movimientos || []).map((m) => m.sym).join(' ') || '—');
  linea('peso HTML', Buffer.byteLength(html) + ' bytes' +
    (Buffer.byteLength(html) > 102000 ? '  ⚠ Gmail corta a los 102 KB' : ''));
  console.log('');
  console.log('  ' + archivoHtml);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
