// Vercel serverless function: series cortas de 24 h para las mini-gráficas
// (sparklines) de los chips del ticker.
//
// Va por separado de /api/history a proposito: el ticker necesita SEIS series a
// la vez y solo la forma, no el detalle. Hacerlo aqui deja al navegador con una
// sola peticion en vez de seis, y el servidor cachea el paquete completo para
// todos los visitantes.

const SERIES = {
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  'USD/MXN': 'MXN=X',
  'EUR/USD': 'EURUSD=X',
  'USD/JPY': 'JPY=X',
  'GBP/USD': 'GBPUSD=X'
};

// Barras de 15 min: 96 cubren 24 h. Se reducen a 24 valores porque la sparkline
// mide ~54 px de ancho — mas puntos no se distinguen y solo pesan.
const BARS_24H = 96;
const OUT_POINTS = 24;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = { expires: 0, body: null };

// Promedia por tramos en vez de tomar uno de cada N: con muestreo simple, un
// pico aislado puede desaparecer o dominar segun donde caiga el corte.
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

async function fetchSeries(yahooSymbol) {
  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(yahooSymbol) + '?range=2d&interval=15m';

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error('yahoo responded ' + res.status);

  const json = await res.json();
  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result) throw new Error('unexpected shape');

  const closes =
    (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  const clean = closes.filter((c) => typeof c === 'number' && !isNaN(c));
  if (clean.length < 4) throw new Error('too few points');

  // Igual que en /api/history: los ultimos N puntos disponibles, no "las
  // ultimas 24 h desde ahora", para que el fin de semana siga habiendo forma.
  const values = clean.slice(-BARS_24H);
  return downsample(values, OUT_POINTS).map((v) => Number(v.toFixed(6)));
}

module.exports = async function handler(req, res) {
  if (cache.body && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    res.status(200).json(cache.body);
    return;
  }

  const keys = Object.keys(SERIES);
  const settled = await Promise.allSettled(keys.map((k) => fetchSeries(SERIES[k])));

  const series = {};
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') series[keys[i]] = r.value;
    else console.error('sparkline failed for', keys[i], r.reason && r.reason.message);
  });

  // Si absolutamente todo falla es un problema de la fuente, no una respuesta
  // vacia valida. Con que sobreviva una serie, se manda lo que haya: el chip sin
  // sparkline simplemente se ve como antes.
  if (!Object.keys(series).length) {
    res.status(502).json({ error: 'upstream fetch failed' });
    return;
  }

  const body = { series, points: OUT_POINTS };
  cache.expires = Date.now() + CACHE_TTL_MS;
  cache.body = body;

  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
  res.status(200).json(body);
};
