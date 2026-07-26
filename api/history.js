// Vercel serverless function: proxies Yahoo Finance chart data server-side
// (the browser can't call Yahoo directly — no CORS headers on their API).
//
// Sirve a dos gráficas del sitio: la de tipo de cambio (6 pares) y la del VIX.

const SYMBOLS = {
  USDMXN: { yahoo: 'MXN=X', intradayPoints: 288 },
  EURMXN: { yahoo: 'EURMXN=X', intradayPoints: 288 },
  CHFMXN: { yahoo: 'CHFMXN=X', intradayPoints: 288 },
  EURUSD: { yahoo: 'EURUSD=X', intradayPoints: 288 },
  GBPUSD: { yahoo: 'GBPUSD=X', intradayPoints: 288 },
  USDJPY: { yahoo: 'JPY=X', intradayPoints: 288 },
  // El VIX solo cotiza en horario de Estados Unidos: ~156 barras de 5 minutos
  // por sesion, no 288 como el FX, que opera casi 24 h. Si le pidieramos 288 la
  // gráfica de "1D" mostraria casi dos dias.
  VIX: { yahoo: '^VIX', intradayPoints: 156 }
};

const RANGE_MAP = {
  // El mercado cierra el viernes por la tarde y no reabre hasta el domingo por
  // la noche. Si filtraramos por "ultimas 24h desde ahora", el fin de semana no
  // quedaria ningun punto y la grafica saldria vacia. En vez de eso pedimos 5
  // dias y nos quedamos con los ultimos N puntos (una sesion), asi el sabado se
  // ve la sesion del viernes.
  '1D': { range: '5d', interval: '5m', intraday: true },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' }
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 60 * 1000;
// Reused across warm invocations of the same lambda instance; the
// Cache-Control header below is what actually guarantees the 60s cache.
const cache = new Map();

module.exports = async function handler(req, res) {
  const pair = String(req.query.pair || '').toUpperCase();
  const range = String(req.query.range || '').toUpperCase();

  const symbolCfg = SYMBOLS[pair];
  const rangeCfg = RANGE_MAP[range];

  if (!symbolCfg || !rangeCfg) {
    res.status(400).json({ error: 'invalid pair or range' });
    return;
  }

  const cacheKey = pair + ':' + range;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json(cached.body);
    return;
  }

  try {
    const url =
      'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symbolCfg.yahoo) +
      '?range=' + rangeCfg.range + '&interval=' + rangeCfg.interval;

    const yahooRes = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
    });
    if (!yahooRes.ok) throw new Error('yahoo responded ' + yahooRes.status);

    const json = await yahooRes.json();
    const result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result) throw new Error('unexpected yahoo response shape');

    const timestamps = result.timestamp || [];
    const closes =
      (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];

    let points = timestamps
      .map((t, i) => [t, closes[i]])
      .filter(([, c]) => typeof c === 'number' && !isNaN(c));

    if (rangeCfg.intraday && points.length > symbolCfg.intradayPoints) {
      points = points.slice(-symbolCfg.intradayPoints);
    }

    if (!points.length) throw new Error('no data points');

    const body = {
      pair,
      symbol: symbolCfg.yahoo,
      range,
      currency: result.meta && result.meta.currency,
      points
    };

    cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, body });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json(body);
  } catch (err) {
    console.error('history fetch failed:', err);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};
