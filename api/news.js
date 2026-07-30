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

// Presupuesto de la llamada a Anthropic. Corto a propósito: si tarda más que
// esto preferimos devolver los titulares sin opinión antes que arriesgarnos a
// que Vercel corte la función entera y el visitante no vea nada.
const TAKES_TIMEOUT_MS = 8000;

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

function parseFeed(xml) {
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
    .slice(0, MAX_ITEMS);
}

// ---- Mi lectura de cada titular ----------------------------------------
// Una sola llamada para los cuatro titulares (más barato y más consistente en
// tono que cuatro llamadas sueltas). El esquema fuerza JSON válido, así que no
// hay que adivinar cómo vino la respuesta.

const TAKE_SYSTEM = [
  'You write one-sentence reactions to finance headlines for Smart Finance, a site by Jaime Sandoval.',
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
  'The Spanish is its own version in the same voice, not a literal translation.'
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
    }
  },
  required: ['takes'],
  additionalProperties: false
};

// Plan B por si la API rechaza output_config (campo relativamente nuevo; el SDK
// instalado todavía no lo tipa). Entonces el formato se pide en el prompt y el
// JSON se recorta a mano. Sin esto, un 400 por ese campo dejaría las opiniones
// apagadas para siempre sin que se note.
const JSON_ONLY_HINT = [
  '',
  'Reply with raw JSON only — no prose, no markdown fence. Exact shape:',
  '{"takes":[{"en":"...","es":"..."}]}'
].join('\n');

// El modelo a veces envuelve el JSON en ```json ... ```; con el esquema no pasa,
// sin el esquema sí. Se toma del primer { al último }.
function parseTakes(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  const parsed = JSON.parse(text.slice(start, end + 1));
  return Array.isArray(parsed.takes) ? parsed.takes : null;
}

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
        max_tokens: 2000,
        system: withSchema ? TAKE_SYSTEM : TAKE_SYSTEM + JSON_ONLY_HINT,
        messages: [
          {
            role: 'user',
            content: `Write one take for each of these ${items.length} headlines:\n\n${prompt}`
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
    return parseTakes(await ask(true));
  } catch (err) {
    // Solo se reintenta si la API rechazó la petición (400). Un timeout o un 429
    // se dejan pasar: reintentar ahí sería gastar el presupuesto de la función
    // dos veces para el mismo resultado.
    if (!err || err.status !== 400) throw err;
    console.warn('structured output rejected, retrying without schema:', err.message);
    return parseTakes(await ask(false));
  }
}

// Devuelve { items, degraded }. degraded = true significa que las tarjetas
// llevan el texto neutro y conviene reintentar pronto.
async function withTakes(items) {
  let takes = null;
  try {
    takes = await generateTakes(items);
  } catch (err) {
    // Cualquier cosa: sin credencial, timeout, 429, JSON raro. Las noticias
    // salen igual, solo sin opinión.
    console.error('take generation failed:', err && err.message ? err.message : err);
  }

  let degraded = false;
  const withTake = items.map((it, i) => {
    const take = takes && takes[i];
    if (isUsable(take)) {
      return Object.assign({}, it, { take: { en: take.en.trim(), es: take.es.trim() } });
    }
    degraded = true;
    return Object.assign({}, it, { take: neutralTake() });
  });

  return { items: withTake, degraded };
}

module.exports = async function handler(req, res) {
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
    const body = { source: 'Bloomberg', items: result.items };

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
