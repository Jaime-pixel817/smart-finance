// Vercel serverless function: los ocho índices del "Globo de mercados" del home.
//
// Mismo proveedor y mismo patrón que api/history.js (Yahoo chart, server-side
// porque Yahoo no manda CORS), pero en UNA sola llamada para el cliente: el
// globo necesita los ocho a la vez y pedirlos uno por uno desde el navegador
// serían ocho peticiones por visita. No toca /api/markets (Twelve Data): la
// cuota de ahí ya va justa y estos datos son gratis por Yahoo.
//
// Respuesta:
//   { updatedAt, refreshMinutes: 15, items: [ { id, city, index, sym, lat, lon,
//     tz, price, changePct, asOf, source: "Yahoo Finance" } ] }
//
// changePct es el cambio del DÍA: último precio contra el cierre de la sesión
// anterior. Si un símbolo falla, su item sale con price:null y los demás
// siguen: un índice caído no deja el globo sin datos.
//
// Caché: 15 min en memoria (instancia caliente) + s-maxage=900 en el CDN de
// Vercel, con stale-while-revalidate de 30 min. Es lo que el chip de fuente
// promete ("se actualiza cada 15 minutos", clave `quarter` de source.js).

const history = require('./history.js');

const USER_AGENT = history.USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// lat/lon de la CIUDAD de la bolsa (no de la sede exacta: a la escala del
// globo da igual). tz es la zona IANA de la bolsa, la misma que usa
// assets/exchange-hours.js para decir si está abierta.
const EXCHANGES = [
  { id: 'nyc', city: 'New York',    index: 'S&P 500',    sym: '^GSPC',   lat: 40.71,  lon: -74.01,  tz: 'America/New_York' },
  { id: 'yto', city: 'Toronto',     index: 'S&P/TSX',    sym: '^GSPTSE', lat: 43.65,  lon: -79.38,  tz: 'America/Toronto' },
  { id: 'mex', city: 'Mexico City', index: 'IPC',        sym: '^MXX',    lat: 19.43,  lon: -99.13,  tz: 'America/Mexico_City' },
  { id: 'sao', city: 'São Paulo',   index: 'Bovespa',    sym: '^BVSP',   lat: -23.55, lon: -46.63,  tz: 'America/Sao_Paulo' },
  { id: 'lon', city: 'London',      index: 'FTSE 100',   sym: '^FTSE',   lat: 51.51,  lon: -0.13,   tz: 'Europe/London' },
  { id: 'fra', city: 'Frankfurt',   index: 'DAX',        sym: '^GDAXI',  lat: 50.11,  lon: 8.68,    tz: 'Europe/Berlin' },
  { id: 'tyo', city: 'Tokyo',       index: 'Nikkei 225', sym: '^N225',   lat: 35.68,  lon: 139.69,  tz: 'Asia/Tokyo' },
  { id: 'hkg', city: 'Hong Kong',   index: 'Hang Seng',  sym: '^HSI',    lat: 22.32,  lon: 114.17,  tz: 'Asia/Hong_Kong' }
];

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_CONTROL = 'public, s-maxage=900, stale-while-revalidate=1800';
let cache = null; // { expires, body }

// Clave de día (2026-08-21) de un instante en la zona de la bolsa. Sirve para
// saber si la última barra diaria es la sesión de HOY (entonces el cierre
// previo es la barra anterior) o la de ayer (entonces el previo es esa barra
// y el precio vigente es regularMarketPrice, que Yahoo sigue actualizando).
function claveDia(segundos, tz) {
  return new Date(segundos * 1000).toLocaleDateString('en-CA', { timeZone: tz });
}

async function fetchIndex(ex) {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(ex.sym) + '?range=5d&interval=1d';
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!r.ok) throw new Error('yahoo responded ' + r.status);
  const json = await r.json();
  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error('unexpected yahoo response shape');

  const meta = result.meta || {};
  const ts = result.timestamp || [];
  const closes =
    (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const bars = ts.map((t, i) => [t, closes[i]]).filter(([, c]) => typeof c === 'number' && !isNaN(c));
  if (!bars.length && typeof meta.regularMarketPrice !== 'number') throw new Error('no data');

  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : bars[bars.length - 1][1];
  const asOfSec = typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : bars[bars.length - 1][0];

  let prev = null;
  if (bars.length) {
    const ultima = bars[bars.length - 1];
    const esHoy = claveDia(ultima[0], ex.tz) === claveDia(asOfSec, ex.tz);
    if (esHoy) prev = bars.length > 1 ? bars[bars.length - 2][1] : (meta.chartPreviousClose || null);
    else prev = ultima[1];
  }
  if (prev === null && typeof meta.chartPreviousClose === 'number') prev = meta.chartPreviousClose;

  const changePct = (typeof prev === 'number' && prev > 0) ? ((price - prev) / prev) * 100 : null;

  return {
    price: Math.round(price * 100) / 100,
    changePct: changePct === null ? null : Math.round(changePct * 100) / 100,
    asOf: new Date(asOfSec * 1000).toISOString(),
    currency: meta.currency || null
  };
}

async function construir() {
  const resultados = await Promise.allSettled(EXCHANGES.map(fetchIndex));
  const items = EXCHANGES.map((ex, i) => {
    const r = resultados[i];
    const base = { id: ex.id, city: ex.city, index: ex.index, sym: ex.sym, lat: ex.lat, lon: ex.lon, tz: ex.tz };
    if (r.status === 'fulfilled') return Object.assign(base, r.value, { source: 'Yahoo Finance' });
    console.error('world: ' + ex.sym + ' failed:', r.reason && r.reason.message);
    return Object.assign(base, { price: null, changePct: null, asOf: null, currency: null, source: 'Yahoo Finance' });
  });
  return { updatedAt: new Date().toISOString(), refreshMinutes: 15, items };
}

module.exports = async function handler(req, res) {
  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.status(200).json(cache.body);
    return;
  }
  try {
    const body = await construir();
    // Solo se cachea si al menos un índice llegó: una respuesta toda vacía no
    // merece quedarse 15 minutos.
    if (body.items.some((it) => it.price !== null)) cache = { expires: Date.now() + CACHE_TTL_MS, body };
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.status(200).json(body);
  } catch (err) {
    console.error('world fetch failed:', err);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};

module.exports.EXCHANGES = EXCHANGES;
