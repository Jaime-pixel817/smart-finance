// Vercel serverless function: proxies Yahoo Finance chart data server-side
// (the browser can't call Yahoo directly — no CORS headers on their API).
//
// Sirve a las gráficas del sitio: divisas, VIX, acciones e índices y cripto
// (la ficha de cada activo en /market/[symbol] y el panel de /market).

// `intradayPoints` es el TOPE de barras de la vista 1D, no el recorte: el
// recorte lo hace _lib/sesiones.js agrupando por dia de la bolsa. El tope solo
// entra cuando la sesion acaba de abrir y hay que dibujar tambien la anterior.
const SYMBOLS = {
  USDMXN: { yahoo: 'MXN=X', intradayPoints: 288 },
  EURMXN: { yahoo: 'EURMXN=X', intradayPoints: 288 },
  CHFMXN: { yahoo: 'CHFMXN=X', intradayPoints: 288 },
  EURUSD: { yahoo: 'EURUSD=X', intradayPoints: 288 },
  GBPUSD: { yahoo: 'GBPUSD=X', intradayPoints: 288 },
  USDJPY: { yahoo: 'JPY=X', intradayPoints: 288 },
  // El VIX solo cotiza en horario de Estados Unidos, pero con sesion larga: su
  // dia de bolsa (America/Chicago) trae ~160 barras de 5 minutos, no 288 como
  // el FX, que opera casi 24 h.
  VIX: { yahoo: '^VIX', intradayPoints: 176 },

  // Acciones e indices. Los tres primeros son los ETF que siguen a cada indice:
  // es lo que se puede cotizar de verdad, y el dato del indice en si es de pago
  // (mismo criterio que en api/markets.js). Yahoo los toma con el ticker tal
  // cual, sin sufijo.
  //
  // 79 barras: la sesion regular de EE. UU. va de 9:30 a 16:00 ET, o sea 6.5 h,
  // que en barras de 5 minutos son 78 mas la de cierre.
  SPY:  { yahoo: 'SPY',  intradayPoints: 79 },
  QQQ:  { yahoo: 'QQQ',  intradayPoints: 79 },
  DIA:  { yahoo: 'DIA',  intradayPoints: 79 },
  AAPL: { yahoo: 'AAPL', intradayPoints: 79 },
  MSFT: { yahoo: 'MSFT', intradayPoints: 79 },
  NVDA: { yahoo: 'NVDA', intradayPoints: 79 },
  AMZN: { yahoo: 'AMZN', intradayPoints: 79 },
  // Empresas cubiertas por /research: solo historial para la marca de
  // "precio de mercado" del reporte. NO van en /api/markets (cuota de
  // Twelve Data contada) ni en el registro de simbolos del sitio.
  LULU: { yahoo: 'LULU', intradayPoints: 79 },

  // ---- Bolsa Mexicana de Valores ----------------------------------------
  // Las emisoras del Reto Actinver y del portafolio personal (/actinver y
  // /portfolio, desde src/data/*.json). NO están en /api/markets ni en el
  // registro de símbolos del sitio: no tienen ficha propia, solo hace falta su
  // último precio para valuar una posición. Esta es la vía que manda CLAUDE.md
  // para datos nuevos: Yahoo, gratis y con la caché compartida de 60 s.
  //
  // POR QUÉ UNA LISTA Y NO "lo que pida el navegador": sin lista, /api/history
  // sería un proxy abierto a Yahoo con nuestros contadores de cuota. Añadir una
  // emisora es una línea aquí, y el JSON de la cartera la nombra con la clave de
  // la IZQUIERDA (historyPair: "WALMEX"). La clave no lleva sufijo ni signos
  // raros porque viaja en la query: PE&OLES rompería la URL y por eso es
  // PENOLES, y LIVEPOLC-1 es LIVEPOLC1.
  //
  // 78 barras de 5 minutos: la BMV homologa su sesión con Nueva York (ver
  // src/lib/market/bmv.mjs), así que son las mismas 6.5 h.
  MXX:        { yahoo: '^MXX', intradayPoints: 78 },              // S&P/BMV IPC
  NAFTRAC:    { yahoo: 'NAFTRACISHRS.MX', intradayPoints: 78 },   // ETF del IPC
  WALMEX:     { yahoo: 'WALMEX.MX', intradayPoints: 78 },
  AMXB:       { yahoo: 'AMXB.MX', intradayPoints: 78 },
  GFNORTEO:   { yahoo: 'GFNORTEO.MX', intradayPoints: 78 },
  FEMSAUBD:   { yahoo: 'FEMSAUBD.MX', intradayPoints: 78 },
  GMEXICOB:   { yahoo: 'GMEXICOB.MX', intradayPoints: 78 },
  CEMEXCPO:   { yahoo: 'CEMEXCPO.MX', intradayPoints: 78 },
  BIMBOA:     { yahoo: 'BIMBOA.MX', intradayPoints: 78 },
  TLEVISACPO: { yahoo: 'TLEVISACPO.MX', intradayPoints: 78 },
  KOFUBL:     { yahoo: 'KOFUBL.MX', intradayPoints: 78 },
  ORBIA:      { yahoo: 'ORBIA.MX', intradayPoints: 78 },
  GAPB:       { yahoo: 'GAPB.MX', intradayPoints: 78 },
  ASURB:      { yahoo: 'ASURB.MX', intradayPoints: 78 },
  OMAB:       { yahoo: 'OMAB.MX', intradayPoints: 78 },
  ALSEA:      { yahoo: 'ALSEA.MX', intradayPoints: 78 },
  CHDRAUIB:   { yahoo: 'CHDRAUIB.MX', intradayPoints: 78 },
  VESTA:      { yahoo: 'VESTA.MX', intradayPoints: 78 },
  GCARSOA1:   { yahoo: 'GCARSOA1.MX', intradayPoints: 78 },
  LIVEPOLC1:  { yahoo: 'LIVEPOLC-1.MX', intradayPoints: 78 },
  PENOLES:    { yahoo: 'PE&OLES.MX', intradayPoints: 78 },
  BBAJIOO:    { yahoo: 'BBAJIOO.MX', intradayPoints: 78 },
  QUALITAS:   { yahoo: 'Q.MX', intradayPoints: 78 },
  GRUMAB:     { yahoo: 'GRUMAB.MX', intradayPoints: 78 },
  AC:         { yahoo: 'AC.MX', intradayPoints: 78 },
  GENTERA:    { yahoo: 'GENTERA.MX', intradayPoints: 78 },
  PINFRA:     { yahoo: 'PINFRA.MX', intradayPoints: 78 },
  MEGACPO:    { yahoo: 'MEGACPO.MX', intradayPoints: 78 },
  GFINBURO:   { yahoo: 'GFINBURO.MX', intradayPoints: 78 },
  CUERVO:     { yahoo: 'CUERVO.MX', intradayPoints: 78 },
  LABB:       { yahoo: 'LABB.MX', intradayPoints: 78 },
  RA:         { yahoo: 'RA.MX', intradayPoints: 78 },          // Regional
  VOLARA:     { yahoo: 'VOLARA.MX', intradayPoints: 78 },
  GCC:        { yahoo: 'GCC.MX', intradayPoints: 78 },
  KIMBERA:    { yahoo: 'KIMBERA.MX', intradayPoints: 78 },
  BOLSAA:     { yahoo: 'BOLSAA.MX', intradayPoints: 78 },
  AGUA:       { yahoo: 'AGUA.MX', intradayPoints: 78 },        // Rotoplas

  // Cripto (fichas /market/[symbol]). El precio y el cambio de 24 h siguen
  // saliendo de CoinGecko vía /api/markets; aquí solo va el HISTORIAL 1D–5A,
  // que CoinGecko no da gratis con esta granularidad. Opera 24/7 y su "dia" es
  // el dia UTC: 288 barras de 5 minutos son uno entero, como el FX.
  BTC: { yahoo: 'BTC-USD', intradayPoints: 288 },
  ETH: { yahoo: 'ETH-USD', intradayPoints: 288 },
  XRP: { yahoo: 'XRP-USD', intradayPoints: 288 },
  SOL: { yahoo: 'SOL-USD', intradayPoints: 288 }
};

const RANGE_MAP = {
  // El mercado cierra el viernes por la tarde y no reabre hasta el domingo por
  // la noche. Si filtraramos por "ultimas 24h desde ahora", el fin de semana no
  // quedaria ningun punto y la grafica saldria vacia. En vez de eso pedimos 5
  // dias y nos quedamos con la ULTIMA SESION (ver ultimaSesion), asi el sabado
  // y el domingo se ve entera la sesion del viernes.
  '1D': { range: '5d', interval: '5m', intraday: true },
  // Una semana en barras de una hora: ~120 puntos en divisas (operan casi 24 h)
  // y ~35 en el VIX. Lo pide el boletín SEMANAL, que resume lo que hizo el
  // mercado de lunes a viernes; con barras diarias serían cinco puntos y la
  // curva del correo saldría como una escalera.
  //
  // No lleva `intraday`: quedarse con la última sesión se comería justo los
  // días de atrás que esta vista existe para enseñar.
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
// instancia. Aquí importa más que en el resto: hay decenas de símbolos por seis
// rangos —solo la BMV añadió 36 emisoras para las carteras— y cada instancia
// nueva de Vercel empezaba con todas las combinaciones vacías. La clave lleva
// el par y el rango porque cada combinación es un dato distinto. Lo que NO
// crece es el gasto: un símbolo solo se le pide a Yahoo cuando alguien abre una
// página que lo enseña, y esa respuesta vale 60 s para todo el mundo.
const cache = require('./_lib/cache.js');
// Recorte de la vista intradía a UNA sesión (con pruebas en _lib/sesiones.test.mjs).
const { ultimaSesion } = require('./_lib/sesiones.js');

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

  if (!points.length) throw new Error('no data points');

  // El huso de la BOLSA, no el del servidor: con el lo agrupamos por sesion y
  // con el el navegador dice de que dia es lo que esta viendo sin inventar.
  const gmtOffset = result.meta && typeof result.meta.gmtoffset === 'number' ? result.meta.gmtoffset : 0;
  let prevClose = null;

  if (rangeCfg.intraday) {
    const corte = ultimaSesion(points, gmtOffset, symbolCfg.intradayPoints);
    points = corte.points;
    prevClose = corte.prevClose;
  }

  return {
    pair,
    symbol: symbolCfg.yahoo,
    range,
    currency: result.meta && result.meta.currency,
    // Campos AÑADIDOS (el consumidor viejo sigue leyendo `points` igual):
    // `tzOffset` es el desfase del huso de la bolsa en segundos y `prevClose`
    // el cierre del dia habil anterior en las vistas intradia.
    tzOffset: gmtOffset,
    tz: (result.meta && result.meta.exchangeTimezoneName) || null,
    prevClose,
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
