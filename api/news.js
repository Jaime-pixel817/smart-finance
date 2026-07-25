// Vercel serverless function: lee el RSS de Bloomberg del lado del servidor.
//
// El navegador no puede pedirlo directo (el feed no manda cabeceras CORS), que
// era la razón de usar rss2json. Al hacerlo aquí nos quitamos ese intermediario
// y su API key, que antes viajaba en el HTML público.

const FEED_URL = 'https://feeds.bloomberg.com/markets/news.rss';
const MAX_ITEMS = 3;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 15 * 60 * 1000;
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

// Miniatura: este feed no suele traerla, pero otros de Bloomberg sí.
function pickThumbnail(block) {
  const m =
    block.match(/<media:(?:content|thumbnail)[^>]*\surl="([^"]+)"/i) ||
    block.match(/<enclosure[^>]*\surl="([^"]+)"[^>]*type="image/i);
  return m ? decodeEntities(m[1]) : '';
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

module.exports = async function handler(req, res) {
  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
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

    const body = { source: 'Bloomberg', items };
    cache = { expires: Date.now() + CACHE_TTL_MS, body };

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
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
