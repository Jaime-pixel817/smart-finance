// Vercel serverless function: proxies Yahoo Finance chart data server-side
// (the browser can't call Yahoo directly — no CORS headers on their API).
//
// Sirve a las gráficas del sitio: divisas, VIX, acciones e índices y cripto
// (la ficha de cada activo en /market/[symbol] y el panel de /market).

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
  VIX: { yahoo: '^VIX', intradayPoints: 156 },

  // Acciones e indices. Los tres primeros son los ETF que siguen a cada indice:
  // es lo que se puede cotizar de verdad, y el dato del indice en si es de pago
  // (mismo criterio que en api/markets.js). Yahoo los toma con el ticker tal
  // cual, sin sufijo.
  //
  // 78 barras: la sesion regular de EE. UU. va de 9:30 a 16:00 ET, o sea 6.5 h,
  // que en barras de 5 minutos son 78. Con el 156 del VIX saldrian dos sesiones
  // en la vista de "1D".
  SPY:  { yahoo: 'SPY',  intradayPoints: 78 },
  QQQ:  { yahoo: 'QQQ',  intradayPoints: 78 },
  DIA:  { yahoo: 'DIA',  intradayPoints: 78 },
  AAPL: { yahoo: 'AAPL', intradayPoints: 78 },
  MSFT: { yahoo: 'MSFT', intradayPoints: 78 },
  NVDA: { yahoo: 'NVDA', intradayPoints: 78 },
  AMZN: { yahoo: 'AMZN', intradayPoints: 78 },
  // Empresas cubiertas por /research: solo historial para la marca de
  // "precio de mercado" del reporte. NO van en /api/markets (cuota de
  // Twelve Data contada) ni en el registro de simbolos del sitio.
  LULU: { yahoo: 'LULU', intradayPoints: 78 },

  // Cripto (fichas /market/[symbol]). El precio y el cambio de 24 h siguen
  // saliendo de CoinGecko vía /api/markets; aquí solo va el HISTORIAL 1D–5A,
  // que CoinGecko no da gratis con esta granularidad. Opera 24/7: 288 barras
  // de 5 minutos son un día entero, como el FX.
  BTC: { yahoo: 'BTC-USD', intradayPoints: 288 },
  ETH: { yahoo: 'ETH-USD', intradayPoints: 288 },
  XRP: { yahoo: 'XRP-USD', intradayPoints: 288 },
  SOL: { yahoo: 'SOL-USD', intradayPoints: 288 }
};

const RANGE_MAP = {
  // El mercado cierra el viernes por la tarde y no reabre hasta el domingo por
  // la noche. Si filtraramos por "ultimas 24h desde ahora", el fin de semana no
  // quedaria ningun punto y la grafica saldria vacia. En vez de eso pedimos 5
  // dias y nos quedamos con los ultimos N puntos (una sesion), asi el sabado se
  // ve la sesion del viernes.
  '1D': { range: '5d', interval: '5m', intraday: true },
  // Una semana en barras de una hora: ~120 puntos en divisas (operan casi 24 h)
  // y ~35 en el VIX. Lo pide el boletín SEMANAL, que resume lo que hizo el
  // mercado de lunes a viernes; con barras diarias serían cinco puntos y la
  // curva del correo saldría como una escalera.
  //
  // No lleva `intraday`: recortar a `intradayPoints` (78 o 288, pensados para
  // UNA sesión) se comería justo los días de atrás que esta vista existe para
  // enseñar.
  '1W': { range: '5d', interval: '1h' },
  '1M': { range: '1mo', interval: '1d' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' },
  // Cinco años en barras semanales: ~260 puntos, suficiente para la forma y
  // liviano para el teléfono (en diarias serían ~1 250).
  '5Y': { range: '5y', interval: '1wk' }
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 60 * 1000;
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=120';

// La caché es COMPARTIDA (api/_lib/cache.js, Redis) y ya no un Map por
// instancia. Aquí importa más que en el resto: hay 21 símbolos × 5 rangos, o
// sea 105 combinaciones, y cada instancia nueva de Vercel empezaba con las 105
// vacías. La clave lleva el par y el rango porque cada combinación es un dato
// distinto.
const cache = require('./_lib/cache.js');

async function pedirAYahoo(pair, symbolCfg, range, rangeCfg) {
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

  return {
    pair,
    symbol: symbolCfg.yahoo,
    range,
    currency: result.meta && result.meta.currency,
    points
  };
}

module.exports = async function handler(req, res) {
  const pair = String(req.query.pair || '').toUpperCase();
  const range = String(req.query.range || '').toUpperCase();

  const symbolCfg = SYMBOLS[pair];
  const rangeCfg = RANGE_MAP[range];

  if (!symbolCfg || !rangeCfg) {
    res.status(400).json({ error: 'invalid pair or range' });
    return;
  }

  try {
    const r = await cache.conCache({
      clave: 'history:v1:' + pair + ':' + range,
      ttl: CACHE_TTL_MS / 1000,
      proveedor: { nombre: 'yahoo', creditos: 1 },
      calcular: () => pedirAYahoo(pair, symbolCfg, range, rangeCfg)
    });
    res.setHeader('Cache-Control', CACHE_CONTROL);
    // `stale` es un campo AÑADIDO: la gráfica sigue leyendo `points` igual, y
    // con esto puede decir "último dato conocido" en vez de quedarse vacía.
    res.status(200).json(r.stale ? Object.assign({}, r.valor, { stale: true }) : r.valor);
  } catch (err) {
    console.error('history fetch failed:', err && err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};

// El User-Agent se comparte con api/world.js (mismo proveedor, misma cabecera).
module.exports.USER_AGENT = USER_AGENT;
