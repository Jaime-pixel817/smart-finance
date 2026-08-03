// Vercel serverless function: los datos de la página /market.
//
// Tres bloques en una sola petición del navegador:
//   - acciones e índices, vía Twelve Data (con Yahoo como respaldo)
//   - cripto, vía CoinGecko
// Las divisas NO van aquí: la gráfica de tipo de cambio de /market reusa
// /api/history, que ya sirve a la del home. Duplicar esa lógica sería tener dos
// fuentes del mismo dato que se pueden desincronizar.
//
// PRESUPUESTO DE CRÉDITOS DE TWELVE DATA (plan gratuito: 800 al día).
// Se hace UNA sola petición time_series con los siete símbolos en lote. Twelve
// Data cobra un crédito POR SÍMBOLO, no por petición: 7 créditos por refresco.
// Con caché de 15 minutos son 4 refrescos por hora × 24 h = 96 al día:
//        96 × 7 = 672 créditos/día  (queda 16 % por debajo del tope)
// Por eso NO se llama también a /quote, que costaría otros 7 por refresco y
// pondría el total en 1 344, muy por encima del límite: el precio y el cambio
// se derivan de la misma serie que alimenta la mini-gráfica.

const STOCKS = [
  // Los tres primeros son los ETF que siguen a cada índice: es lo que se puede
  // cotizar de verdad, y el plan gratuito no da los índices en sí.
  { sym: 'SPY',  name: 'S&P 500',    note: 'ETF SPY' },
  { sym: 'QQQ',  name: 'Nasdaq 100', note: 'ETF QQQ' },
  { sym: 'DIA',  name: 'Dow Jones',  note: 'ETF DIA' },
  { sym: 'AAPL', name: 'Apple',      note: '' },
  { sym: 'MSFT', name: 'Microsoft',  note: '' },
  { sym: 'NVDA', name: 'Nvidia',     note: '' },
  { sym: 'AMZN', name: 'Amazon',     note: '' }
];

const COINS = [
  { id: 'bitcoin',     sym: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum',    sym: 'ETH', name: 'Ethereum' },
  { id: 'ripple',      sym: 'XRP', name: 'XRP' },
  { id: 'binancecoin', sym: 'BNB', name: 'BNB' },
  { id: 'solana',      sym: 'SOL', name: 'Solana' }
];

const INTERVAL = '30min';
const OUTPUTSIZE = 60;          // ~30 h de barras: la sesión actual y la anterior
const SPARK_POINTS = 28;        // puntos que se mandan al navegador por serie

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 15 * 60 * 1000;
// Si una fuente falló, se cachea mucho menos: no tiene sentido servir un bloque
// vacío 15 minutos cuando lo más probable es que el siguiente intento funcione.
const DEGRADED_TTL_MS = 3 * 60 * 1000;

let cache = null;

function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return typeof n === 'number' && isFinite(n) ? n : null;
}

// Reduce una serie a N puntos promediando por tramos. Igual que en
// /api/sparklines: con muestreo simple un pico puede desaparecer o dominar
// según dónde caiga el corte.
function downsample(values, target) {
  if (values.length <= target) return values;
  const out = [];
  const size = values.length / target;
  for (let i = 0; i < target; i++) {
    const slice = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (slice.length) out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

function round(values) {
  return values.map((v) => Number(v.toFixed(4)));
}

// ---------------------------------------------------------------- acciones
// Convierte las barras de un símbolo (más viejas primero) en la tarjeta.
// El cambio se mide contra el cierre de la sesión ANTERIOR, que es lo que
// significa "+1.2% hoy" en cualquier otro lado; medirlo contra la apertura
// daría un número distinto al que ve la gente en su bróker.
function buildFromBars(bars) {
  if (!bars || bars.length < 2) return null;
  const dayOf = (b) => String(b.t).slice(0, 10);
  const lastDay = dayOf(bars[bars.length - 1]);
  const session = bars.filter((b) => dayOf(b) === lastDay);
  const previous = bars.filter((b) => dayOf(b) !== lastDay);

  const price = bars[bars.length - 1].c;
  const prevClose = previous.length ? previous[previous.length - 1].c : session[0].c;
  if (price === null || prevClose === null || !prevClose) return null;

  // Si la sesión apenas abrió y hay dos o tres barras, la mini-gráfica se ve
  // como un palo; en ese caso se dibuja también la sesión anterior.
  const forChart = session.length >= 6 ? session : bars;
  return {
    price,
    change: price - prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    series: round(downsample(forChart.map((b) => b.c), SPARK_POINTS))
  };
}

async function fetchTwelveData() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error('TWELVE_DATA_API_KEY not set');

  const url = 'https://api.twelvedata.com/time_series' +
    '?symbol=' + STOCKS.map((s) => s.sym).join(',') +
    '&interval=' + INTERVAL +
    '&outputsize=' + OUTPUTSIZE +
    '&apikey=' + encodeURIComponent(key);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('twelvedata responded ' + res.status);
  const json = await res.json();
  // En error la API contesta 200 con {status:'error'}, así que no basta el res.ok.
  if (json && json.status === 'error') throw new Error('twelvedata: ' + json.message);

  const items = [];
  for (const s of STOCKS) {
    // Con un solo símbolo la respuesta viene plana; con varios, indexada por símbolo.
    const node = STOCKS.length === 1 ? json : json[s.sym];
    const values = node && Array.isArray(node.values) ? node.values : null;
    if (!values || !values.length) continue;
    // Twelve Data manda la más reciente primero: aquí se quiere al revés.
    const bars = values
      .map((v) => ({ t: v.datetime, c: num(v.close) }))
      .filter((b) => b.c !== null)
      .reverse();
    const built = buildFromBars(bars);
    if (built) items.push(Object.assign({ sym: s.sym, name: s.name, note: s.note }, built));
  }
  if (!items.length) throw new Error('twelvedata: no usable series');
  return { source: 'Twelve Data', items };
}

// Respaldo: el mismo Yahoo que ya usan /api/history y /api/sparklines. Sirve
// para que el bloque de acciones no quede vacío si la credencial de Twelve Data
// falta, caduca o se acaban los créditos del día.
async function fetchYahooStocks() {
  const one = async (s) => {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(s.sym) + '?range=5d&interval=30m';
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error('yahoo ' + res.status);
    const json = await res.json();
    const r = json && json.chart && json.chart.result && json.chart.result[0];
    if (!r) throw new Error('shape');
    const ts = r.timestamp || [];
    const closes = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
    const bars = ts
      .map((t, i) => ({ t: new Date(t * 1000).toISOString(), c: num(closes[i]) }))
      .filter((b) => b.c !== null);
    const built = buildFromBars(bars);
    if (!built) throw new Error('no bars');

    // OJO CON EL CAMPO: es meta.previousClose (cierre oficial de la sesión
    // pasada), NO meta.chartPreviousClose, que con range=5d es el cierre
    // anterior a TODA la ventana de cinco días. Usar el equivocado daba
    // +21 % en MSFT y +17 % en AMZN.
    // Se prefiere al valor deducido de las barras porque la barra de las 20:00
    // UTC no cierra exactamente donde cierra el mercado: para AMZN daba 236.03
    // contra los 235.50 oficiales.
    const prevClose = num(r.meta && r.meta.previousClose);
    const price = num(r.meta && r.meta.regularMarketPrice);
    if (price !== null) built.price = price;
    if (prevClose) {
      built.change = built.price - prevClose;
      built.changePct = ((built.price - prevClose) / prevClose) * 100;
    }
    return Object.assign({ sym: s.sym, name: s.name, note: s.note }, built);
  };

  const settled = await Promise.allSettled(STOCKS.map(one));
  const items = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!items.length) throw new Error('yahoo: nothing usable');
  return { source: 'Yahoo Finance', items };
}

// ------------------------------------------------------------------ cripto
async function fetchCrypto() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets' +
    '?vs_currency=usd&ids=' + COINS.map((c) => c.id).join(',') +
    '&sparkline=true&price_change_percentage=24h';

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('coingecko responded ' + res.status);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('coingecko: unexpected shape');

  const byId = new Map(json.map((c) => [c.id, c]));
  const items = [];
  for (const c of COINS) {
    const row = byId.get(c.id);
    if (!row) continue;
    const price = num(row.current_price);
    if (price === null) continue;
    // sparkline_in_7d son 168 puntos por hora; se recortan a las últimas ~48 h,
    // que es la ventana que acompaña a un cambio de 24 h.
    const full = (row.sparkline_in_7d && Array.isArray(row.sparkline_in_7d.price))
      ? row.sparkline_in_7d.price.filter((v) => typeof v === 'number' && isFinite(v))
      : [];
    const recent = full.slice(-48);
    items.push({
      sym: c.sym,
      name: c.name,
      price,
      changePct: num(row.price_change_percentage_24h),
      series: recent.length >= 4 ? round(downsample(recent, SPARK_POINTS)) : []
    });
  }
  if (!items.length) throw new Error('coingecko: no usable coins');
  return { source: 'CoinGecko', items };
}

module.exports = async function handler(req, res) {
  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', cache.cacheControl);
    res.status(200).json(cache.body);
    return;
  }

  // Los dos bloques van en paralelo y fallan por separado: que CoinGecko esté
  // caído no debe dejar sin acciones a la página, ni al revés.
  const [stocksRes, cryptoRes] = await Promise.allSettled([
    fetchTwelveData().catch(async (err) => {
      console.warn('twelve data failed, falling back to yahoo:', err && err.message);
      return fetchYahooStocks();
    }),
    fetchCrypto()
  ]);

  const stocks = stocksRes.status === 'fulfilled' ? stocksRes.value : null;
  const crypto = cryptoRes.status === 'fulfilled' ? cryptoRes.value : null;
  if (stocksRes.status === 'rejected') console.error('stocks failed:', stocksRes.reason && stocksRes.reason.message);
  if (cryptoRes.status === 'rejected') console.error('crypto failed:', cryptoRes.reason && cryptoRes.reason.message);

  if (!stocks && !crypto) {
    // Nada que servir: si hay algo viejo en memoria es mejor que un error.
    if (cache) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(200).json(cache.body);
      return;
    }
    res.status(502).json({ error: 'upstream fetch failed' });
    return;
  }

  const degraded = !stocks || !crypto ||
    stocks.items.length < STOCKS.length || crypto.items.length < COINS.length;
  const ttl = degraded ? DEGRADED_TTL_MS : CACHE_TTL_MS;
  const sMaxAge = Math.floor(ttl / 1000);
  const cacheControl = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`;

  const body = {
    updatedAt: new Date().toISOString(),
    refreshMinutes: Math.round(CACHE_TTL_MS / 60000),
    stocks: stocks || { source: null, items: [] },
    crypto: crypto || { source: null, items: [] }
  };

  cache = { expires: Date.now() + ttl, body, cacheControl };
  res.setHeader('Cache-Control', cacheControl);
  res.status(200).json(body);
};
