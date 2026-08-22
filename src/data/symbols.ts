// Registro de símbolos del sitio: la única lista de activos que conocen
// /market, las fichas /market/[symbol], el home, la búsqueda y el sitemap.
//
// Cada entrada dice de dónde sale su dato (feed + clave), qué par pide a
// /api/history para la gráfica 1D–5A, con cuántos decimales se muestra, en qué
// sesión opera (para el aviso de cerrado) y qué lección lo explica. Las páginas
// /market/[symbol] se generan estáticamente desde aquí (getStaticPaths).
//
// REGLA DE /api (CLAUDE.md): no se añaden símbolos a /api/markets (Twelve
// Data, cuota contada). Lo que no está ahí va por /api/quotes (divisas y VIX,
// Yahoo, caché 15 min) o es estático (tasas, verificadas a mano).
import type { Locale } from '../i18n/routes';

export type Kind = 'index' | 'stock' | 'vol' | 'fx' | 'crypto' | 'rate';
/** us = NYSE/Nasdaq 9:30–16:00 ET · fx = 24 h lunes–viernes · crypto = 24/7 · none = no cotiza */
export type Session = 'us' | 'fx' | 'crypto' | 'none';
/** markets = /api/markets (acciones Twelve Data, cripto CoinGecko) · quotes = /api/quotes (Yahoo) · static = dato a mano */
export type Feed = 'markets' | 'quotes' | 'static';

export interface SymbolEntry {
  /** slug de la URL: /market/<id> */
  id: string;
  /** ticker visible: SPY, USD/MXN, BTC */
  sym: string;
  name: Record<Locale, string>;
  /** apostilla corta junto al nombre (ETF SPY) */
  note?: Record<Locale, string>;
  kind: Kind;
  /** moneda en la que se cotiza */
  currency: string;
  session: Session;
  /** proveedor para el chip (el endpoint puede corregirlo en tiempo real) */
  source: string;
  /** minutos de cadencia real del dato que se muestra (caché del endpoint) */
  delay: number;
  /** decimales del precio en pantalla y en el eje de la gráfica */
  decimals: number;
  axisDecimals: number;
  feed: Feed;
  /** clave dentro del endpoint: sym en /api/markets, par en /api/quotes */
  feedKey: string;
  /** par para /api/history (1D–5A). Sin él no hay gráfica (tasas). */
  history?: string;
  /** VIX: subir es más miedo y se pinta en rojo */
  invert?: boolean;
  /** id de ruta de la lección relacionada (src/i18n/routes.ts) */
  lesson: string;
  /** "¿Qué es?" en 1–2 líneas */
  what: Record<Locale, string>;
}

const us = (id: string, sym: string, name: string, what: Record<Locale, string>, extra: Partial<SymbolEntry> = {}): SymbolEntry => ({
  id, sym, name: { en: name, es: name }, kind: 'stock', currency: 'USD', session: 'us',
  source: 'Twelve Data', delay: 15, decimals: 2, axisDecimals: 0,
  feed: 'markets', feedKey: sym, history: sym, lesson: 'lesson.sp500', what, ...extra
});

const fx = (id: string, sym: string, name: Record<Locale, string>, currency: string, what: Record<Locale, string>, decimals = 4): SymbolEntry => ({
  id, sym, name, kind: 'fx', currency, session: 'fx',
  source: 'Yahoo Finance', delay: 15, decimals, axisDecimals: 2,
  feed: 'quotes', feedKey: id.toUpperCase(), history: id.toUpperCase(), lesson: 'lesson.peso', what
});

const crypto = (id: string, sym: string, name: string, what: Record<Locale, string>, decimals = 0): SymbolEntry => ({
  id, sym, name: { en: name, es: name }, kind: 'crypto', currency: 'USD', session: 'crypto',
  source: 'CoinGecko', delay: 15, decimals, axisDecimals: Math.min(decimals, 2),
  feed: 'markets', feedKey: sym, history: sym, lesson: 'lesson.errores', what
});

export const SYMBOLS: SymbolEntry[] = [
  // ---- Índices (los ETF que los siguen: es lo que se puede cotizar gratis) ----
  us('spy', 'SPY', 'S&P 500', {
    en: 'An ETF that tracks the S&P 500: the 500 largest US companies in one price. When someone says “the market went up”, they usually mean this.',
    es: 'Un ETF que sigue al S&P 500: las 500 empresas más grandes de EE. UU. en un solo precio. Cuando dicen “el mercado subió”, casi siempre hablan de esto.'
  }, { kind: 'index', note: { en: 'ETF SPY', es: 'ETF SPY' } }),
  us('qqq', 'QQQ', 'Nasdaq 100', {
    en: 'An ETF that tracks the Nasdaq 100: the 100 largest non-financial companies on the Nasdaq, heavy on tech like Apple, Microsoft and Nvidia.',
    es: 'Un ETF que sigue al Nasdaq 100: las 100 empresas no financieras más grandes del Nasdaq, con mucho peso en tecnología (Apple, Microsoft, Nvidia).'
  }, { kind: 'index', note: { en: 'ETF QQQ', es: 'ETF QQQ' } }),
  us('dia', 'DIA', 'Dow Jones', {
    en: 'An ETF that tracks the Dow Jones Industrial Average: 30 large, established US companies. Older and narrower than the S&P 500, but still in every headline.',
    es: 'Un ETF que sigue al Dow Jones: 30 empresas grandes y veteranas de EE. UU. Más viejo y más estrecho que el S&P 500, pero sale en todos los titulares.'
  }, { kind: 'index', note: { en: 'ETF DIA', es: 'ETF DIA' } }),
  {
    id: 'vix', sym: 'VIX', name: { en: 'Fear index', es: 'Índice del miedo' }, kind: 'vol', currency: 'USD', session: 'us',
    source: 'Yahoo Finance', delay: 15, decimals: 2, axisDecimals: 0,
    feed: 'quotes', feedKey: 'VIX', history: 'VIX', invert: true, lesson: 'lesson.sp500',
    what: {
      en: 'How much fear there is in the market: the size of the swing traders expect in the S&P 500 over the next 30 days. Under 20 is calm; over 30, people are nervous.',
      es: 'Qué tanto miedo hay en el mercado: el tamaño del movimiento que los operadores esperan en el S&P 500 en los próximos 30 días. Debajo de 20 es calma; arriba de 30, nervios.'
    }
  },

  // ---- Acciones ----
  us('aapl', 'AAPL', 'Apple', {
    en: 'iPhone, Mac and services. One of the most valuable companies in the world and the largest weight in the S&P 500, so when it moves, the index moves.',
    es: 'iPhone, Mac y servicios. Una de las empresas más valiosas del mundo y el mayor peso del S&P 500, así que cuando se mueve, mueve al índice.'
  }),
  us('msft', 'MSFT', 'Microsoft', {
    en: 'Windows, Office, the Azure cloud and a big stake in OpenAI. A bet on software that businesses pay for every month.',
    es: 'Windows, Office, la nube Azure y una participación grande en OpenAI. Una apuesta por software que las empresas pagan cada mes.'
  }),
  us('nvda', 'NVDA', 'Nvidia', {
    en: 'Designs the chips that train and run AI models. Its price reacts to every AI headline, which is why it moves more than the other giants.',
    es: 'Diseña los chips con los que se entrenan y corren los modelos de IA. Su precio reacciona a cada titular de IA; por eso se mueve más que los otros gigantes.'
  }),
  us('amzn', 'AMZN', 'Amazon', {
    en: 'Online retail, Prime and AWS, the cloud unit that makes most of the profit. A read on both consumers and the internet’s plumbing.',
    es: 'Tienda en línea, Prime y AWS, la nube que deja la mayor parte de la ganancia. Una lectura del consumidor y de la tubería de internet a la vez.'
  }),

  // ---- Divisas (Yahoo vía /api/quotes y /api/history) ----
  fx('usdmxn', 'USD/MXN', { en: 'US dollar in pesos', es: 'Dólar en pesos' }, 'MXN', {
    en: 'How many pesos one US dollar costs. Up means the peso weakened; down, it strengthened. It touches imported phones, trips and scholarships in dollars.',
    es: 'Cuántos pesos cuesta un dólar. Si sube, el peso se depreció; si baja, se apreció. Toca el celular importado, el viaje y la beca en dólares.'
  }),
  fx('eurmxn', 'EUR/MXN', { en: 'Euro in pesos', es: 'Euro en pesos' }, 'MXN', {
    en: 'How many pesos one euro costs. Matters if you study, travel or buy from Europe; it moves with both the peso and the euro.',
    es: 'Cuántos pesos cuesta un euro. Importa si estudias, viajas o compras en Europa; se mueve con el peso y con el euro a la vez.'
  }),
  fx('chfmxn', 'CHF/MXN', { en: 'Swiss franc in pesos', es: 'Franco suizo en pesos' }, 'MXN', {
    en: 'How many pesos one Swiss franc costs. The franc is a classic “safe haven”: it tends to rise when markets get scared.',
    es: 'Cuántos pesos cuesta un franco suizo. El franco es un “refugio” clásico: suele subir cuando los mercados se asustan.'
  }),
  fx('eurusd', 'EUR/USD', { en: 'Euro in dollars', es: 'Euro en dólares' }, 'USD', {
    en: 'How many dollars one euro costs: the most traded currency pair in the world and a quick read on Europe versus the US.',
    es: 'Cuántos dólares cuesta un euro: el par de divisas más operado del mundo y una lectura rápida de Europa frente a EE. UU.'
  }),
  fx('gbpusd', 'GBP/USD', { en: 'British pound in dollars', es: 'Libra en dólares' }, 'USD', {
    en: 'How many dollars one British pound costs. Traders call it “cable”; it reacts to UK inflation, rates and politics.',
    es: 'Cuántos dólares cuesta una libra esterlina. Los operadores le dicen “cable”; reacciona a la inflación, las tasas y la política del Reino Unido.'
  }),
  fx('usdjpy', 'USD/JPY', { en: 'US dollar in yen', es: 'Dólar en yenes' }, 'JPY', {
    en: 'How many yen one US dollar costs. Japan kept rates near zero for decades, so this pair moves a lot on US rates and on what the Bank of Japan does.',
    es: 'Cuántos yenes cuesta un dólar. Japón tuvo tasas casi en cero por décadas, así que este par se mueve mucho con las tasas de EE. UU. y con lo que haga el Banco de Japón.'
  }, 2),

  // ---- Cripto (CoinGecko vía /api/markets; historial Yahoo) ----
  crypto('btc', 'BTC', 'Bitcoin', {
    en: 'The first and largest cryptocurrency: a digital asset with a fixed supply of 21 million, traded 24/7. Very volatile; the price here is in US dollars.',
    es: 'La primera y más grande criptomoneda: un activo digital con oferta fija de 21 millones que se opera 24/7. Muy volátil; el precio aquí es en dólares.'
  }),
  crypto('eth', 'ETH', 'Ethereum', {
    en: 'The coin of the Ethereum network, where apps, tokens and smart contracts run. Second-largest crypto; it moves with Bitcoin but swings harder.',
    es: 'La moneda de la red Ethereum, donde corren apps, tokens y contratos inteligentes. Segunda cripto más grande; se mueve con Bitcoin pero brinca más.'
  }),
  crypto('xrp', 'XRP', 'XRP', {
    en: 'The token of the XRP Ledger, built for fast, cheap cross-border payments. Its price has long been tied to Ripple’s legal fights with US regulators.',
    es: 'El token del XRP Ledger, pensado para pagos internacionales rápidos y baratos. Su precio ha dependido de las batallas legales de Ripple con los reguladores de EE. UU.'
  }, 4),
  crypto('sol', 'SOL', 'Solana', {
    en: 'The coin of the Solana network, known for fast and cheap transactions. High growth, high risk: it has had huge rallies and huge crashes.',
    es: 'La moneda de la red Solana, conocida por transacciones rápidas y baratas. Mucho crecimiento y mucho riesgo: ha tenido subidas y caídas enormes.'
  }, 2),

  // ---- Tasas (verificadas a mano en src/data/home.ts; sin ficha ni gráfica) ----
  {
    id: 'banxico', sym: 'Banxico', name: { en: 'Banxico target rate', es: 'Tasa objetivo Banxico' }, kind: 'rate', currency: '%', session: 'none',
    source: 'Banxico', delay: 0, decimals: 2, axisDecimals: 2, feed: 'static', feedKey: 'BANXICO', lesson: 'lesson.inflacion',
    what: {
      en: 'Banco de México’s target rate: the reference for what banks charge and pay in pesos. Higher means pricier credit and better yields on savings.',
      es: 'La tasa objetivo del Banco de México: la referencia de lo que los bancos cobran y pagan en pesos. Más alta, crédito más caro y mejor rendimiento al ahorro.'
    }
  },
  {
    id: 'fed', sym: 'Fed', name: { en: 'Fed funds range', es: 'Rango de la Fed' }, kind: 'rate', currency: '%', session: 'none',
    source: 'Federal Reserve', delay: 0, decimals: 2, axisDecimals: 2, feed: 'static', feedKey: 'FED', lesson: 'lesson.inflacion',
    what: {
      en: 'The US Federal Reserve’s target range for overnight lending between banks. The most watched interest rate in the world; it moves the dollar and the peso.',
      es: 'El rango objetivo de la Reserva Federal de EE. UU. para préstamos entre bancos de un día. La tasa más vigilada del mundo; mueve al dólar y al peso.'
    }
  }
];

/** Orden de las secciones de /market y de los chips de filtro. */
export const KINDS: Kind[] = ['index', 'stock', 'fx', 'crypto', 'rate'];
/** El VIX se lista dentro de Índices (es la volatilidad esperada del S&P 500). */
export function sectionOf(s: SymbolEntry): Kind { return s.kind === 'vol' ? 'index' : s.kind; }

/** Activos con ficha propia (todo menos las tasas). */
export const ASSETS: SymbolEntry[] = SYMBOLS.filter((s) => s.kind !== 'rate');

export function bySymbolId(id: string): SymbolEntry | undefined {
  return SYMBOLS.find((s) => s.id === id);
}

/** id de ruta en src/i18n/routes.ts para la ficha de un activo. */
export function assetRouteId(id: string): string { return 'asset.' + id; }

/** Tres activos relacionados: primero los de la misma sección, luego el resto. */
export function relatedTo(s: SymbolEntry, n = 3): SymbolEntry[] {
  const same = ASSETS.filter((x) => x.id !== s.id && sectionOf(x) === sectionOf(s));
  const rest = ASSETS.filter((x) => x.id !== s.id && sectionOf(x) !== sectionOf(s));
  return [...same, ...rest].slice(0, n);
}

/** Lo que el script del navegador necesita de cada símbolo (va en un data-*). */
export interface SymbolRuntime {
  id: string; sym: string; kind: Kind; session: Session; feed: Feed; feedKey: string;
  history?: string; decimals: number; axisDecimals: number; invert?: boolean; source: string; delay: number;
}
export function runtimeOf(s: SymbolEntry): SymbolRuntime {
  return {
    id: s.id, sym: s.sym, kind: s.kind, session: s.session, feed: s.feed, feedKey: s.feedKey,
    history: s.history, decimals: s.decimals, axisDecimals: s.axisDecimals, invert: s.invert, source: s.source, delay: s.delay
  };
}
