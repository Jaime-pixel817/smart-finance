// Las ocho bolsas del globo de mercados del home: id (el mismo que usan
// api/world.js y public/assets/risk-sphere.js), ciudad (clave i18n), índice,
// zona IANA (la que mira src/scripts/exchange-hours.ts) y, si el índice tiene
// ficha en el registro (src/data/symbols.ts), el id del activo para el enlace
// "¿Qué es este índice?". Las coordenadas y los símbolos de Yahoo viven en
// api/world.js: el cliente no los necesita (el endpoint manda lat/lon).
import type { UIKey } from '../i18n/ui';

export interface Exchange {
  id: string;
  cityKey: UIKey;
  index: string;
  tz: string;
  /** id en src/data/symbols.ts cuya ficha explica el índice (S&P 500 → spy) */
  asset?: string;
}

export const EXCHANGES: Exchange[] = [
  { id: 'nyc', cityKey: 'world.city.nyc', index: 'S&P 500',    tz: 'America/New_York',    asset: 'spy' },
  { id: 'yto', cityKey: 'world.city.yto', index: 'S&P/TSX',    tz: 'America/Toronto' },
  { id: 'mex', cityKey: 'world.city.mex', index: 'IPC',        tz: 'America/Mexico_City' },
  { id: 'sao', cityKey: 'world.city.sao', index: 'Bovespa',    tz: 'America/Sao_Paulo' },
  { id: 'lon', cityKey: 'world.city.lon', index: 'FTSE 100',   tz: 'Europe/London' },
  { id: 'fra', cityKey: 'world.city.fra', index: 'DAX',        tz: 'Europe/Berlin' },
  { id: 'tyo', cityKey: 'world.city.tyo', index: 'Nikkei 225', tz: 'Asia/Tokyo' },
  { id: 'hkg', cityKey: 'world.city.hkg', index: 'Hang Seng',  tz: 'Asia/Hong_Kong' }
];
