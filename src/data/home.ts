// Datos estáticos del home: tiles del pulso, tasas verificadas a mano,
// breakdowns. Lo que cambia con el mercado llega por /api.
import type { UIKey } from '../i18n/ui';
import { foto } from '../lib/photos';

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

// Las lecciones ya no se listan aquí: viven en src/content/lessons (MDX) y se
// leen con getLessons() de src/data/lessons.ts.

/**
 * Una publicación de TikTok o LinkedIn con su miniatura.
 *
 * `focus` es el object-position de ESA foto: dónde está lo que no se puede
 * cortar (las caras). Las miniaturas ya salen recortadas en 4:3 por
 * scripts/build-photos.mjs, que es el mismo sitio de donde salen estos
 * valores, así que hoy coinciden con la caja del HTML y no se nota; está aquí
 * para el día en que la tarjeta cambie de proporción — sin esto, ese día las
 * caras se recortan otra vez y nadie se entera.
 */
export interface Breakdown { id: string; titleKey: UIKey; altKey: UIKey; href: string; net: 'tiktok' | 'linkedin'; img: string; w: number; h: number; focus: string }
export const BREAKDOWNS: Breakdown[] = [
  { id: 'japan', titleKey: 'post.japan.title', altKey: 'alt.japan', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7653328531694439700', img: foto('breakdown-japan.webp'), w: 480, h: 360, focus: '47% 50%' },
  { id: 'andytoh', titleKey: 'post.andytoh.title', altKey: 'alt.andytoh', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7662781308988411156', img: foto('breakdown-andy-toh.webp'), w: 480, h: 360, focus: '45% 50%' },
  { id: 'singapore', titleKey: 'post.singapore.title', altKey: 'alt.singapore', net: 'tiktok', href: 'https://www.tiktok.com/@smart.financee/video/7655111359419387157', img: foto('breakdown-singapore.webp'), w: 480, h: 360, focus: '54% 50%' },
  { id: 'jpmorgan', titleKey: 'post.jpmorgan.title', altKey: 'alt.jpmorgan', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_great-experience-attending-an-insightful-activity-7450005569882738689-rTcJ', img: foto('breakdown-jpmorgan-etf.webp'), w: 480, h: 360, focus: '50% 38%' },
  { id: 'moris', titleKey: 'post.moris.title', altKey: 'alt.moris', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_i-had-the-opportunity-to-attend-a-conference-activity-7455446269097033728-Z8sn', img: foto('breakdown-moris-dieck.webp'), w: 480, h: 360, focus: '51% 50%' },
  { id: 'tradingroom', titleKey: 'post.tradingroom.title', altKey: 'alt.tradingroom', net: 'linkedin', href: 'https://www.linkedin.com/posts/jaime-sandoval-ricano-23b3a4401_i-had-the-opportunity-to-organize-and-participate-activity-7450679158118076417-OPK7', img: foto('breakdown-trading-room-podcast.webp'), w: 480, h: 360, focus: '50% 38%' }
];

export function ratesFresh(now = new Date()): boolean {
  const v = new Date(RATES.verificado + 'T12:00:00Z').getTime();
  return (now.getTime() - v) / 86400000 <= RATES.maxDias;
}
