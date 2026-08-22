// Datos estáticos del home: tiles del pulso, tasas verificadas a mano,
// lecciones y breakdowns. Lo que cambia con el mercado llega por /api.
import type { UIKey } from '../i18n/ui';

export interface PulseTile {
  id: string;            // clave para el script (coincide con data-tile)
  sym: string;           // lo que se muestra en mono 12
  nameKey?: UIKey;       // nombre traducido (tasas)
  name?: string;         // nombre fijo (activos)
  kind: 'fx' | 'stock' | 'crypto' | 'rate';
  source: string;        // proveedor para el chip
  routeId: string;       // a dónde lleva el toque: ficha del activo (asset.<id>) o lección
  decimals: number;
}

export const PULSE: PulseTile[] = [
  { id: 'USDMXN', sym: 'USD/MXN', name: 'Peso mexicano', kind: 'fx', source: 'Yahoo Finance', routeId: 'asset.usdmxn', decimals: 2 },
  { id: 'SPY', sym: 'S&P 500', name: 'ETF SPY', kind: 'stock', source: 'Yahoo Finance', routeId: 'asset.spy', decimals: 2 },
  { id: 'BTC', sym: 'BTC', name: 'Bitcoin', kind: 'crypto', source: 'CoinGecko', routeId: 'asset.btc', decimals: 0 },
  { id: 'BANXICO', sym: 'Banxico', nameKey: 'pulse.rate', kind: 'rate', source: 'Banxico', routeId: 'lesson.inflacion', decimals: 2 },
  { id: 'QQQ', sym: 'Nasdaq 100', name: 'ETF QQQ', kind: 'stock', source: 'Yahoo Finance', routeId: 'asset.qqq', decimals: 2 },
  { id: 'ETH', sym: 'ETH', name: 'Ethereum', kind: 'crypto', source: 'CoinGecko', routeId: 'asset.eth', decimals: 0 },
  { id: 'DIA', sym: 'Dow Jones', name: 'ETF DIA', kind: 'stock', source: 'Yahoo Finance', routeId: 'asset.dia', decimals: 2 },
  { id: 'FED', sym: 'Fed', nameKey: 'pulse.fed', kind: 'rate', source: 'Federal Reserve', routeId: 'lesson.inflacion', decimals: 2 }
];

// Tasas de referencia: las mismas que public/assets/macro.js, verificadas a
// mano. Si `verificado` envejece más de 60 días, los tiles se esconden
// (mejor no decir nada que decir algo viejo).
export const RATES = {
  verificado: '2026-08-03',
  banxico: 6.50,
  fedMin: 3.50,
  fedMax: 3.75,
  maxDias: 60
};

export interface LessonMeta { id: string; titleKey: UIKey; descKey: UIKey; minutes: number; n: number }
export const LESSONS: LessonMeta[] = [
  { id: 'lesson.peso', titleKey: 'lesson.peso.title', descKey: 'lesson.peso.desc', minutes: 5, n: 1 },
  { id: 'lesson.interes', titleKey: 'lesson.interes.title', descKey: 'lesson.interes.desc', minutes: 6, n: 2 },
  { id: 'lesson.sp500', titleKey: 'lesson.sp500.title', descKey: 'lesson.sp500.desc', minutes: 5, n: 3 },
  { id: 'lesson.presupuesto', titleKey: 'lesson.presupuesto.title', descKey: 'lesson.presupuesto.desc', minutes: 4, n: 4 },
  { id: 'lesson.inflacion', titleKey: 'lesson.inflacion.title', descKey: 'lesson.inflacion.desc', minutes: 5, n: 5 },
  { id: 'lesson.errores', titleKey: 'lesson.errores.title', descKey: 'lesson.errores.desc', minutes: 4, n: 6 }
];

export interface Breakdown { id: string; titleKey: UIKey; altKey: UIKey; href: string; net: 'tiktok' | 'linkedin'; img: string; w: number; h: number }
export const BREAKDOWNS: Breakdown[] = [
  { id: 'japan', titleKey: 'post.japan.title', altKey: 'alt.japan', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7653328531694439700', img: '/assets/breakdowns/thumbs/breakdown-japan.webp', w: 320, h: 240 },
  { id: 'andytoh', titleKey: 'post.andytoh.title', altKey: 'alt.andytoh', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7662781308988411156', img: '/assets/breakdowns/thumbs/breakdown-andy-toh.webp', w: 320, h: 240 },
  { id: 'singapore', titleKey: 'post.singapore.title', altKey: 'alt.singapore', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7655111359419387157', img: '/assets/breakdowns/thumbs/breakdown-singapore.webp', w: 320, h: 240 },
  { id: 'jpmorgan', titleKey: 'post.jpmorgan.title', altKey: 'alt.jpmorgan', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_great-experience-attending-an-insightful-activity-7450005569882738689-rTcJ', img: '/assets/breakdowns/thumbs/breakdown-jpmorgan-etf.webp', w: 320, h: 240 },
  { id: 'moris', titleKey: 'post.moris.title', altKey: 'alt.moris', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_i-had-the-opportunity-to-attend-a-conference-activity-7455446269097033728-Z8sn', img: '/assets/breakdowns/thumbs/breakdown-moris-dieck.webp', w: 320, h: 240 },
  { id: 'tradingroom', titleKey: 'post.tradingroom.title', altKey: 'alt.tradingroom', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_i-had-the-opportunity-to-organize-and-participate-activity-7450679158118076417-OPK7', img: '/assets/breakdowns/thumbs/breakdown-trading-room-podcast.webp', w: 320, h: 240 }
];

export function ratesFresh(now = new Date()): boolean {
  const v = new Date(RATES.verificado + 'T12:00:00Z').getTime();
  return (now.getTime() - v) / 86400000 <= RATES.maxDias;
}
