// Vercel serverless function: cotización de divisas y del VIX para la lista de
// /market y las fichas /market/[symbol]. Precio, cierre previo, cambio del día,
// máximo y mínimo de 52 semanas y una serie corta (24 h, 24 puntos) para la
// sparkline. Todo de Yahoo Finance, la misma fuente que /api/history y
// /api/sparklines.
//
// POR QUÉ EXISTE
// --------------
// /api/markets trae acciones (Twelve Data) y cripto (CoinGecko) y NO se le
// añaden símbolos: la cuota gratis de Twelve Data va contada (ver ese archivo).
// Las divisas vivían repartidas: cuatro pares en /api/sparklines (solo la forma,
// sin cierre previo) y EUR/MXN y CHF/MXN sin nada. La lista de /market necesita
// las seis con precio y cambio en UNA petición, y la ficha de cada par necesita
// el cierre previo para decir "hoy" con el mismo criterio que las acciones.
//
// CADENCIA: caché de 15 minutos en memoria y en el CDN (s-maxage=900), igual
// que /api/markets. Siete peticiones a Yahoo cada 15 minutos como mucho.

const SYMBOLS = {
  USDMXN: 'MXN=X',
  EURMXN: 'EURMXN=X',
  CHFMXN: 'CHFMXN=X',
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  VIX: '^VIX'
};

// Barras de 15 min: 96 cubren 24 h. Se reducen a 24 puntos porque la sparkline
// mide 64 px de ancho (mismo criterio que /api/sparklines).
const BARS_24H = 96;
const OUT_POINTS = 24;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 15 * 60 * 1000;
const DEGRADED_TTL_MS = 3 * 60 * 1000;
const cache = { expires: 0, body: null, cacheControl: '' };

function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return typeof n === 'number' && isFinite(n) ? n : null;
}

// Promedia por tramos en vez de tomar uno de cada N: con muestreo simple, un
// pico aislado puede desaparecer o dominar según dónde caiga el corte.
function downsample(values, target) {
  if (values.length <= target) return values;
  const out = [];
  const size = values.length / target;
  for (let i = 0; i < target; i++) {
    const slice = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (!slice.length) continue;
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

async function fetchQuote(pair, yahooSymbol) {
  // 5 días y no 1: el fin de semana el día "actual" de Yahoo viene vacío y la
  // sparkline se quedaría sin forma; con 5d se toman las últimas 96 barras
  // que existan, que el sábado son las del viernes (igual que /api/history).
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(yahooSymbol) + '?range=5d&interval=15m';

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error('yahoo responded ' + res.status);

  const json = await res.json();
  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error('unexpected shape');

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const closes =
    (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const bars = timestamps
    .map((t, i) => [t, closes[i]])
    .filter(([, c]) => typeof c === 'number' && !isNaN(c));
  if (bars.length < 4) throw new Error('too few points');

  const last = bars[bars.length - 1];
  // meta.regularMarketPrice es el último precio oficial; si falta, la última
  // barra. OJO: meta.previousClose (cierre de la sesión pasada) y NO
  // meta.chartPreviousClose, que con range=5d es el cierre anterior a TODA la
  // ventana (mismo error que ya se corrigió en /api/markets).
  const price = num(meta.regularMarketPrice) != null ? num(meta.regularMarketPrice) : last[1];
  const prevClose = num(meta.previousClose);
  const change = prevClose ? price - prevClose : null;
  const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : null;

  const recent = bars.slice(-BARS_24H).map((b) => b[1]);
  return {
    pair,
    symbol: yahooSymbol,
    currency: meta.currency || null,
    price,
    prevClose,
    change,
    changePct,
    // Hora del último precio (segundos, como /api/history): con ella el
    // navegador decide si el mercado está cerrado (assets/market-hours.js).
    lastTs: num(meta.regularMarketTime) || last[0],
    dayHigh: num(meta.regularMarketDayHigh),
    dayLow: num(meta.regularMarketDayLow),
    high52: num(meta.fiftyTwoWeekHigh),
    low52: num(meta.fiftyTwoWeekLow),
    series: downsample(recent, OUT_POINTS).map((v) => Number(v.toFixed(6)))
  };
}

module.exports = async function handler(req, res) {
  if (cache.body && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', cache.cacheControl);
    res.status(200).json(cache.body);
    return;
  }

  const keys = Object.keys(SYMBOLS);
  const settled = await Promise.allSettled(keys.map((k) => fetchQuote(k, SYMBOLS[k])));

  const items = {};
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') items[keys[i]] = r.value;
    else console.error('quote failed for', keys[i], r.reason && r.reason.message);
  });

  // Si absolutamente todo falla es un problema de la fuente: si hay algo viejo
  // en memoria es mejor que un error; si no, 502 y el navegador reintenta.
  if (!Object.keys(items).length) {
    if (cache.body) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(200).json(cache.body);
      return;
    }
    res.status(502).json({ error: 'upstream fetch failed' });
    return;
  }

  // Si faltó algún par se cachea menos: lo más probable es que el siguiente
  // intento lo traiga.
  const degraded = Object.keys(items).length < keys.length;
  const ttl = degraded ? DEGRADED_TTL_MS : CACHE_TTL_MS;
  const sMaxAge = Math.floor(ttl / 1000);
  const cacheControl = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`;

  const body = {
    updatedAt: new Date().toISOString(),
    refreshMinutes: Math.round(CACHE_TTL_MS / 60000),
    source: 'Yahoo Finance',
    items
  };

  cache.expires = Date.now() + ttl;
  cache.body = body;
  cache.cacheControl = cacheControl;

  res.setHeader('Cache-Control', cacheControl);
  res.status(200).json(body);
};
