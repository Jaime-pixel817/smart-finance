// Vercel serverless function: lee el RSS de Bloomberg del lado del servidor y
// le agrega "mi lectura" de cada titular, generada con la API de Anthropic.
//
// El navegador no puede pedir el feed directo (no manda cabeceras CORS), que
// era la razón de usar rss2json. Al hacerlo aquí nos quitamos ese intermediario
// y su API key, que antes viajaba en el HTML público.
//
// ANTHROPIC_API_KEY vive solo aquí (process.env, configurada en Vercel) y nunca
// se expone al cliente. Si la llamada falla, la respuesta sigue saliendo con los
// titulares y un texto neutro en lugar de la opinión: las noticias no dependen
// de que Anthropic conteste.

const AnthropicSDK = require('@anthropic-ai/sdk');
// El paquete cambió de forma de exportar entre versiones; esto sirve para las
// tres variantes y evita un TypeError en frío al desplegar.
const Anthropic = AnthropicSDK.Anthropic || AnthropicSDK.default || AnthropicSDK;

const FEED_URL = 'https://feeds.bloomberg.com/markets/news.rss';
const MAX_ITEMS = 4;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Las opiniones se generan una vez al día, así que el caché va a 24 h.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Si las opiniones no se pudieron generar, se cachea mucho menos: no tiene
// sentido servir el placeholder neutro por un día entero cuando lo más probable
// es que el siguiente intento sí funcione.
const DEGRADED_TTL_MS = 30 * 60 * 1000;

// Presupuesto de la llamada a Anthropic.
//
// Estuvo en 8 s mientras la llamada solo escribía las cuatro opiniones. Al
// sumarle el consejo del inicio (dos idiomas más) la generación se pasó de ese
// límite y empezó a fallar ENTERA: no se perdía solo el consejo, se perdían
// también las cuatro opiniones, que caían al texto neutro.
//
// Subirlo es seguro porque casi nadie espera esta llamada: el Cache-Control de
// abajo lleva stale-while-revalidate, así que a partir de la primera respuesta
// del día el visitante recibe la copia cacheada al instante y la regeneración
// ocurre detrás. Solo paga la espera quien llega con el caché frío.
const TAKES_TIMEOUT_MS = 20000;

const MODEL = 'claude-haiku-4-5';

// Igual que en history.js: se reutiliza entre invocaciones tibias del mismo
// lambda; el Cache-Control es lo que de verdad garantiza el caché.
let cache = null;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
};

function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ENTITIES[n]);
}

// Saca el contenido de <tag>...</tag>, desenvolviendo el CDATA si lo hay.
function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
}

// Miniatura: este feed no suele traerla, pero otros de Bloomberg sí. Cuando no
// hay, el front pinta un fondo por tema — nunca una foto inventada.
function pickThumbnail(block) {
  const candidates = [
    /<media:(?:content|thumbnail)[^>]*\surl="([^"]+)"/i,
    /<enclosure[^>]*\stype="image[^"]*"[^>]*\surl="([^"]+)"/i,
    /<enclosure[^>]*\surl="([^"]+)"[^>]*\stype="image/i
  ];
  for (const re of candidates) {
    const m = block.match(re);
    // Solo http(s): una URL rara en el feed no debe acabar como src en el HTML.
    if (m && /^https?:\/\//i.test(m[1])) return decodeEntities(m[1]);
  }
  return '';
}

// max: cuántos items devolver. El carrusel del home usa los 4 más recientes;
// la generación de borradores pide más para poder descartar los videos del fin
// antes de gastar tokens en ellos.
function parseFeed(xml, max = MAX_ITEMS) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks
    .map((block) => ({
      title: pickTag(block, 'title'),
      link: pickTag(block, 'link'),
      description: pickTag(block, 'description'),
      pubDate: pickTag(block, 'pubDate'),
      thumbnail: pickThumbnail(block)
    }))
    // Sin título o sin link la tarjeta no sirve de nada.
    .filter((it) => it.title && /^https?:\/\//i.test(it.link))
    .slice(0, max);
}

// ---- Mi lectura de cada titular ----------------------------------------
// Una sola llamada para los cuatro titulares (más barato y más consistente en
// tono que cuatro llamadas sueltas). El esquema fuerza JSON válido, así que no
// hay que adivinar cómo vino la respuesta.

const TAKE_SYSTEM = [
  'You write one-sentence reactions to finance headlines for Smart Finance, a site by Jaime Sandoval.',
  'The same call also writes three things the daily newsletter needs. They are described at the end.',
  '',
  'Voice: a finance student and content creator explaining the news to someone who is just',
  'getting started. Close and conversational, but clearly informed. Never robotic, never corporate.',
  '',
  'Rules for every take:',
  '- 1 to 2 short lines. Under 220 characters.',
  '- Add the context a beginner is missing, or say why the headline matters. Do not restate it.',
  '- Plain words. If you must use a technical term, explain it in the same breath.',
  '- No investment advice, no price predictions, no "you should buy/sell".',
  '- No hype, no emoji, no exclamation marks, no opening filler like "This is interesting".',
  '- Only use what the headline and summary say. Never invent numbers, dates or quotes.',
  '',
  'Return one take per headline, in the same order, in English (en) and Mexican Spanish (es).',
  'The Spanish is its own version in the same voice, not a literal translation.',
  '',
  'SEPARATELY, also write one short motivational line for the top of the newsletter ("impulso").',
  'This one is NOT about the news. Rules:',
  '- Speak to someone 18 to 25 who is just starting with money: first job, first savings, first',
  '  investment. Same close voice as the takes.',
  '- 2 to 3 short lines. Under 240 characters.',
  '- It has to push toward an action they can take now: save something, learn something, start',
  '  early. Encouraging, never scolding, never guilt.',
  '- Not a statistic, not a market fact, not a headline. No specific numbers, tickers or returns.',
  '- No investment advice, no promises of getting rich, no emoji, no exclamation marks.',
  '- Change the angle every day so it never reads like the same sentence twice.',
  '',
  'ALSO pick "principal": the index (0-based) of the ONE headline the newsletter will lead with.',
  'The criterion, in this order:',
  '  1. How much it moves the money of an ordinary person in Mexico — the peso against the dollar,',
  '     interest rates, inflation, fuel and food prices, jobs, remittances, trade with the US.',
  '  2. Failing that, how broad its reach is: something that moves the whole market or a whole',
  '     sector beats something that moves one company.',
  '  3. Failing that, how understandable it is to someone who is new to finance.',
  'A single company\'s earnings, an executive change, or a niche corporate deal loses to any of',
  'the above. If two are close, pick the more recent one.',
  '',
  'ALSO write "gancho": the subject line of today\'s newsletter.',
  'The reader sees this in their inbox, so it is what decides whether the email gets opened.',
  'The email they are about to read contains, in this order: a short motivational line, the one',
  'headline you picked with your take on it, today\'s USD/MXN and VIX, and the lesson of the day',
  '(its title is given to you in the user message). Rules:',
  '',
  '- IT IS ABOUT THE HEADLINE YOU PICKED IN "principal". That headline is what the email opens',
  '  with, so the subject has to be about it and nothing else first. Do not lead with the lesson,',
  '  with the market numbers, or with the motivational line. A reader who opens expecting the',
  '  lesson and lands on the news was told the wrong thing.',
  '- The lesson is optional garnish, not a second half. Mention it only if the whole line still',
  '  fits under the limit, and always after the news. If in doubt, leave it out — a subject that',
  '  is only about the news is the correct default, not a compromise.',
  '- One line, under 65 characters, so the inbox does not cut it off. This is a hard limit: past it',
  '  the server keeps only the text before the first comma or dash. That is why the news goes first',
  '  and the lesson last: what gets cut is whatever trails.',
  '- Say what the news MEANS for the reader, not just what happened. Concrete over clever.',
  '- Write it as natural language, the way a person would say it out loud. Not a wire slug and not',
  '  headline shorthand: no "+" or "&" joining two topics, no dropped articles, no stacked nouns.',
  '  "Soybean tariffs squeeze farmers + budget rule" is wrong (shorthand, and it staples on the',
  '  lesson). "What the soybean tariffs mean for your grocery bill" is right.',
  '- Different every day. Never a fixed formula, never "Smart Finance daily" or the date.',
  '- No clickbait, no invented numbers, no emoji, no exclamation marks, no ALL CAPS.',
  // El asunto es el texto que más pesa en un filtro de spam, y el vocabulario
  // de la estafa financiera es justo el que estos filtros tienen memorizado.
  // Describir la noticia nunca necesita esas palabras: son de promesa, no de
  // reporte. La lista es de FORMA, no de tema — hablar de un rendimiento o de
  // una ganancia que la noticia reporta está bien; prometérsela al lector no.
  '- Never the vocabulary of financial spam, in either language: no "guaranteed", "risk-free",',
  '  "free", "urgent", "act now", "don\'t miss out", "make money", "get rich", "double your",',
  '  "garantizado", "sin riesgo", "gratis", "urgente", "no te lo pierdas", "gana dinero",',
  '  "multiplica tu dinero", "oportunidad única". No "$$$", no "100%", no promise of a return.',
  '  You are reporting what happened, not selling anything. If a line sounds like an ad, rewrite it.'
].join('\n');

const TAKES_SCHEMA = {
  type: 'object',
  properties: {
    takes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          en: { type: 'string' },
          es: { type: 'string' }
        },
        required: ['en', 'es'],
        additionalProperties: false
      }
    },
    impulso: {
      type: 'object',
      properties: {
        en: { type: 'string' },
        es: { type: 'string' }
      },
      required: ['en', 'es'],
      additionalProperties: false
    },
    gancho: {
      type: 'object',
      properties: {
        en: { type: 'string' },
        es: { type: 'string' }
      },
      required: ['en', 'es'],
      additionalProperties: false
    },
    // Sin minimum/maximum a propósito: los esquemas de salida estructurada no
    // admiten restricciones numéricas, así que el rango se comprueba abajo, en
    // withTakes, donde además hace falta el respaldo si viene fuera de sitio.
    principal: { type: 'integer' }
  },
  required: ['takes', 'impulso', 'gancho', 'principal'],
  additionalProperties: false
};

// Plan B por si la API rechaza output_config (campo relativamente nuevo; el SDK
// instalado todavía no lo tipa). Entonces el formato se pide en el prompt y el
// JSON se recorta a mano. Sin esto, un 400 por ese campo dejaría las opiniones
// apagadas para siempre sin que se note.
const JSON_ONLY_HINT = [
  '',
  'Reply with raw JSON only — no prose, no markdown fence. Exact shape:',
  '{"takes":[{"en":"...","es":"..."}],"impulso":{"en":"...","es":"..."},' +
    '"gancho":{"en":"...","es":"..."},"principal":0}'
].join('\n');

// El modelo a veces envuelve el JSON en ```json ... ```; con el esquema no pasa,
// sin el esquema sí. Se toma del primer { al último }.
function parseRespuesta(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return { takes: null, impulso: null, gancho: null, principal: null };
  const parsed = JSON.parse(text.slice(start, end + 1));
  return {
    takes: Array.isArray(parsed.takes) ? parsed.takes : null,
    impulso: parsed.impulso || null,
    gancho: parsed.gancho || null,
    principal: Number.isInteger(parsed.principal) ? parsed.principal : null
  };
}

// Los respaldos del consejo y del gancho viven en _lib/boletin.js, que es quien
// tiene que garantizar que esas dos secciones nunca salgan vacías. Se importan
// en vez de copiarse para que no haya dos versiones que se desincronicen.
const { IMPULSO_RESPALDO, GANCHO_RESPALDO } = require('./_lib/boletin');
// La lección del día entra en el prompt para que el gancho pueda anunciarla:
// es la misma rotación por día del año que usa el correo, sin estado que
// guardar, así que las dos partes siempre hablan de la misma lección.
const { tipDelDia } = require('./_lib/tips');

// pending marca la opinión como "todavía no generada" para que el front la
// pinte en gris y en cursiva, y no como si fuera algo que yo escribí.
function neutralTake() {
  return {
    en: 'Context on this one is coming shortly.',
    es: 'El contexto de esta nota va en camino.',
    pending: true
  };
}

function isUsable(take) {
  return take && typeof take.en === 'string' && typeof take.es === 'string' &&
    take.en.trim() && take.es.trim();
}

async function generateTakes(items) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — serving headlines without takes');
    return null;
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TAKES_TIMEOUT_MS,
    maxRetries: 0
  });

  const leccion = tipDelDia(new Date());

  const prompt = items
    .map((it, i) => {
      // El resumen del feed trae HTML; el modelo no lo necesita.
      const summary = (it.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return `${i + 1}. ${it.title}${summary ? `\n   Summary: ${summary.slice(0, 400)}` : ''}`;
    })
    .join('\n\n');

  const ask = async (withSchema) => {
    const res = await client.messages.create(Object.assign(
      {
        model: MODEL,
        // Sube de 2000 al agregar el consejo del inicio: son ~240 caracteres más
        // en dos idiomas. Holgura de sobra para que la respuesta no se corte a
        // media frase, que es como se vería el fallo.
        max_tokens: 2400,
        system: withSchema ? TAKE_SYSTEM : TAKE_SYSTEM + JSON_ONLY_HINT,
        messages: [
          {
            role: 'user',
            content:
              `Write one take for each of these ${items.length} headlines ` +
              '(they are numbered from 1, but "principal" is 0-based: the first headline is 0):\n\n' +
              prompt +
              // Se le da el título de la lección solo como contexto de qué más
              // trae el correo. Decía "for the gancho", que era una invitación
              // a usarlo, y algún día salía un asunto que hablaba de la lección
              // mientras el correo abría con la noticia.
              `\n\nAlso in today's email, after the news: the lesson "${leccion.en.titulo}".`
          }
        ]
      },
      withSchema
        ? { output_config: { format: { type: 'json_schema', schema: TAKES_SCHEMA } } }
        : null
    ));
    return (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  };

  try {
    return parseRespuesta(await ask(true));
  } catch (err) {
    // Solo se reintenta si la API rechazó la petición (400). Un timeout o un 429
    // se dejan pasar: reintentar ahí sería gastar el presupuesto de la función
    // dos veces para el mismo resultado.
    if (!err || err.status !== 400) throw err;
    console.warn('structured output rejected, retrying without schema:', err.message);
    return parseRespuesta(await ask(false));
  }
}

// Devuelve { items, impulso, gancho, principal, degraded }. degraded = true
// significa que algo del texto generado salió con respaldo y conviene
// reintentar pronto.
async function withTakes(items) {
  let generado = { takes: null, impulso: null, gancho: null, principal: null };
  try {
    generado = (await generateTakes(items)) || generado;
  } catch (err) {
    // Cualquier cosa: sin credencial, timeout, 429, JSON raro. Las noticias
    // salen igual, solo sin opinión.
    console.error('take generation failed:', err && err.message ? err.message : err);
  }

  let degraded = false;
  const withTake = items.map((it, i) => {
    const take = generado.takes && generado.takes[i];
    if (isUsable(take)) {
      return Object.assign({}, it, { take: { en: take.en.trim(), es: take.es.trim() } });
    }
    degraded = true;
    return Object.assign({}, it, { take: neutralTake() });
  });

  // El consejo del inicio va por separado: viene de la misma llamada, pero si
  // solo él falla no tiene por qué apagar las opiniones (ni al revés).
  let impulso;
  if (isUsable(generado.impulso)) {
    impulso = { en: generado.impulso.en.trim(), es: generado.impulso.es.trim() };
  } else {
    impulso = Object.assign({ fallback: true }, IMPULSO_RESPALDO);
    degraded = true;
  }

  // El gancho, igual: si falla solo él, el correo sale con un asunto genérico
  // en vez de no salir.
  let gancho;
  if (isUsable(generado.gancho)) {
    gancho = { en: generado.gancho.en.trim(), es: generado.gancho.es.trim() };
  } else {
    gancho = Object.assign({ fallback: true }, GANCHO_RESPALDO);
    degraded = true;
  }

  // La noticia principal. Un índice fuera de rango o ausente cae al 0, que es
  // el titular más reciente del feed: el criterio de respaldo razonable si la
  // elección no llegó. No cuenta como degradado — hay una noticia válida y
  // reintentar en 30 minutos no daría una mejor.
  const principal = Number.isInteger(generado.principal) &&
    generado.principal >= 0 && generado.principal < withTake.length
    ? generado.principal
    : 0;

  return { items: withTake, impulso, gancho, principal, degraded };
}

// ---- Noticias explicadas y REVISADAS (/api/news?estado=aprobadas) --------
//
// Es la otra mitad de este endpoint, y no comparte nada con la de arriba: no
// llama a Anthropic ni lee el feed, solo devuelve lo que una persona ya aprobó
// con ?accion=revision. El sitio es estático, así que esta es la vía por la que
// una noticia aprobada a las 8:00 se ve a las 8:01 sin volver a construir.
//
// SOLO SE SIRVEN LAS APROBADAS. Pedir borradores por aquí devuelve 403 a
// propósito: un borrador es texto de IA que nadie ha leído todavía, y la
// promesa del sitio es que eso no se publica. Para verlos está
// /api/news?accion=revision, detrás de CRON_SECRET.
const noticias = require('./_lib/noticias');
const { autorizado } = require('./_lib/secreto');

async function servirRevisadas(req, res, pedido) {
  if (pedido !== 'aprobada') {
    res.setHeader('Cache-Control', 'no-store');
    res.status(403).json({
      error: 'solo_aprobadas',
      detalle: 'Los borradores no son públicos. Se leen en /api/news?accion=revision con CRON_SECRET.'
    });
    return;
  }

  try {
    const items = await noticias.listar({ estado: 'aprobada', limite: (req.query && req.query.limite) || 20 });
    // Un minuto de caché: lo bastante corto para que aprobar se note casi al
    // instante, lo bastante largo para que un día de tráfico no sean miles de
    // lecturas a Redis.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      fuente: 'revisadas',
      actualizadoEn: new Date().toISOString(),
      items: items.map(noticias.publica)
    });
  } catch (err) {
    const noConfigurado = err && err.code === 'REDIS_NO_CONFIGURADO';
    console.error('news: no se pudieron leer las aprobadas:', err && err.message ? err.message : err);
    res.setHeader('Cache-Control', 'no-store');
    res.status(noConfigurado ? 500 : 502).json({
      error: noConfigurado ? 'redis_no_configurado' : 'noticias_ilegibles'
    });
  }
}

// ---- Lo privado: generar borradores y revisarlos -------------------------
//
// Vive AQUÍ y no en dos endpoints propios porque el plan de Vercel
// admite 12 funciones por despliegue y el sitio ya estaba justo en 12: los dos
// endpoints nuevos tumbaban el despliegue entero con
// "exceeded_serverless_functions_per_deployment", con el build ya terminado.
// Los archivos de api/_lib no cuentan (Vercel no enruta lo que empieza por
// guion bajo), así que la lógica está en _lib/borradores.js y _lib/revision.js
// y este archivo es el router de todo lo que tiene que ver con noticias.
//
//   GET  /api/news                          titulares del día con su opinión
//   GET  /api/news?estado=aprobadas         noticias revisadas y publicadas
//   GET  /api/news?accion=revision          la cola de revisión      (secreto)
//   POST /api/news {accion:'generar'}       escribe los borradores   (secreto)
//   POST /api/news {accion:'decidir',...}   aprueba/edita/rechaza    (secreto)

function leerCuerpo(req) {
  // Vercel ya parsea el JSON en req.body; en una prueba con req/res falsos
  // puede llegar como cadena.
  const b = req.body;
  if (b === undefined || b === null || b === '') return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch (e) { return null; } }
  return b;
}

function fallo(res, err, contexto) {
  const noConfigurado = err && (err.code === 'REDIS_NO_CONFIGURADO' || err.code === 'ANTHROPIC_NO_CONFIGURADO');
  console.error(contexto + ' falló:', err && err.message ? err.message : err);
  res.status(noConfigurado ? 500 : 502).json({
    error: noConfigurado ? String(err.code).toLowerCase() : contexto + '_fallido',
    detalle: err && err.message ? err.message : String(err)
  });
}

async function servirPrivado(req, res, accion) {
  if (!autorizado(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  // Una mesa de revisión cacheada contestaría con los borradores de hace una
  // hora justo cuando se está decidiendo qué publicar.
  res.setHeader('Cache-Control', 'no-store');

  const revision = require('./_lib/revision');

  if (accion === 'revision') {
    try {
      const r = await revision.cola(req.query || {});
      if (r.texto !== undefined) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(r.codigo).send(r.texto);
        return;
      }
      res.status(r.codigo).json(r.cuerpo);
    } catch (err) { fallo(res, err, 'revision'); }
    return;
  }

  const cuerpo = leerCuerpo(req);
  if (!cuerpo) { res.status(400).json({ error: 'json_invalido' }); return; }

  if (accion === 'generar') {
    try {
      res.status(200).json(await require('./_lib/borradores').generar({ seco: cuerpo.seco === true }));
    } catch (err) { fallo(res, err, 'draft'); }
    return;
  }

  if (accion === 'decidir') {
    try {
      const r = await revision.decidir(cuerpo);
      res.status(r.codigo).json(r.cuerpo);
    } catch (err) { fallo(res, err, 'revision'); }
    return;
  }

  res.status(400).json({ error: 'accion_desconocida', valores: ['generar', 'decidir', 'revision'] });
}

const ACCIONES_PRIVADAS = ['generar', 'decidir', 'revision'];

module.exports = async function handler(req, res) {
  const metodo = String(req.method || 'GET').toUpperCase();

  // POST siempre es una acción privada; en GET la acción va en la query.
  if (metodo === 'POST') {
    const cuerpo = leerCuerpo(req);
    const accion = String((cuerpo && cuerpo.accion) || (req.query && req.query.accion) || '').toLowerCase();
    return servirPrivado(req, res, accion);
  }
  if (metodo !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'metodo_no_permitido' });
    return;
  }
  const accionGet = String((req.query && req.query.accion) || '').toLowerCase();
  if (accionGet) {
    // Generar y decidir cambian cosas: por GET no, ni con el secreto.
    if (accionGet !== 'revision') {
      res.setHeader('Cache-Control', 'no-store');
      res.status(ACCIONES_PRIVADAS.includes(accionGet) ? 405 : 400)
        .json({ error: ACCIONES_PRIVADAS.includes(accionGet) ? 'usa_post' : 'accion_desconocida' });
      return;
    }
    return servirPrivado(req, res, 'revision');
  }

  const pedido = noticias.estadoPedido(req.query && req.query.estado);
  if (pedido === undefined) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(400).json({ error: 'estado_desconocido', valores: ['aprobadas'] });
    return;
  }
  if (pedido !== null) return servirRevisadas(req, res, pedido);

  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', cache.cacheControl);
    res.status(200).json(cache.body);
    return;
  }

  try {
    const feedRes = await fetch(FEED_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' }
    });
    if (!feedRes.ok) throw new Error('bloomberg responded ' + feedRes.status);

    const items = parseFeed(await feedRes.text());
    if (!items.length) throw new Error('no items parsed from feed');

    const result = await withTakes(items);
    // gancho y principal los usa solo el boletín; el carrusel del sitio lee
    // items y nada más. Van aquí porque salen de la MISMA llamada a Anthropic
    // que ya se cachea: pedirlos aparte sería una segunda llamada al día.
    const body = {
      source: 'Bloomberg',
      items: result.items,
      impulso: result.impulso,
      gancho: result.gancho,
      principal: result.principal
    };

    // El caché guarda titulares + imágenes + opiniones juntos, así que la
    // llamada a Anthropic ocurre una vez por ventana, no una por visita.
    const ttl = result.degraded ? DEGRADED_TTL_MS : CACHE_TTL_MS;
    const sMaxAge = Math.floor(ttl / 1000);
    const cacheControl = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`;
    cache = { expires: Date.now() + ttl, body, cacheControl };

    res.setHeader('Cache-Control', cacheControl);
    res.status(200).json(body);
  } catch (err) {
    console.error('news fetch failed:', err);
    // Si el feed falla pero tenemos algo viejo en memoria, es mejor que nada.
    if (cache) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(200).json(cache.body);
      return;
    }
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};

module.exports.parseFeed = parseFeed;
