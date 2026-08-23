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
// CADENCIA: caché de 15 minutos COMPARTIDA en Redis (api/_lib/cache.js) y en
// el CDN (s-maxage=900), igual que /api/markets. Siete peticiones a Yahoo cada
// 15 minutos como mucho, ahora sí de verdad: la caché de antes vivía en una
// variable del módulo, o sea siete peticiones por CADA instancia de Vercel que
// arrancara en frío.

const cache = require('./_lib/cache.js');

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
const CLAVE = 'quotes:v1';

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

async function construir() {
  const keys = Object.keys(SYMBOLS);
  const settled = await Promise.allSettled(keys.map((k) => fetchQuote(k, SYMBOLS[k])));

  const items = {};
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') items[keys[i]] = r.value;
    else console.error('quote failed for', keys[i], r.reason && r.reason.message);
  });

  // Si absolutamente todo falla es un problema de la fuente, no una respuesta
  // vacía válida: se trata como error para que la caché compartida sirva la
  // copia anterior en vez de una lista sin precios.
  if (!Object.keys(items).length) throw new Error('quotes: ningún par llegó');

  return {
    updatedAt: new Date().toISOString(),
    refreshMinutes: Math.round(CACHE_TTL_MS / 60000),
    source: 'Yahoo Finance',
    items
  };
}

module.exports = async function handler(req, res) {
  try {
    const r = await cache.conCache({
      clave: CLAVE,
      // Si faltó algún par se cachea menos: lo más probable es que el
      // siguiente intento lo traiga.
      ttl: (body) =>
        (Object.keys(body.items).length < Object.keys(SYMBOLS).length ? DEGRADED_TTL_MS : CACHE_TTL_MS) / 1000,
      proveedor: { nombre: 'yahoo', creditos: Object.keys(SYMBOLS).length },
      calcular: construir
    });

    const sMaxAge = Math.floor(r.ttl || CACHE_TTL_MS / 1000);
    res.setHeader('Cache-Control', `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`);
    // `stale` es un campo AÑADIDO: `items`, `source` y `updatedAt` no cambian.
    // `updatedAt` sigue siendo el del dato, no el de ahora — que es justo lo
    // que hace honesto al chip de fuente cuando se sirve la copia vieja.
    res.status(200).json(r.stale ? Object.assign({}, r.valor, { stale: true }) : r.valor);
  } catch (err) {
    console.error('quotes fetch failed:', err && err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};
