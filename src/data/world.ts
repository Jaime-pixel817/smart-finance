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
  /**
   * Id del país en public/assets/geo/country.bin — el que el globo enciende al
   * seleccionar esta bolsa. NO es una tabla escrita a mano: sale de LEER la
   * máscara en las coordenadas del marcador (el id que manda en un cuadro de
   * ±2°, para que una bolsa costera no caiga en el mar). Lo imprime
   * `node scripts/build-geo.mjs` al final; si se regenera la máscara, los ids
   * cambian y hay que volver a copiarlos de ahí.
   */
  countryId: number;
  /** Nombre del país encendido, para la tarjeta. */
  country: { en: string; es: string };
}

export const EXCHANGES: Exchange[] = [
  { id: 'nyc', cityKey: 'world.city.nyc', index: 'S&P 500',    tz: 'America/New_York',    asset: 'spy', countryId: 230, country: { en: 'United States', es: 'Estados Unidos' } },
  { id: 'yto', cityKey: 'world.city.yto', index: 'S&P/TSX',    tz: 'America/Toronto',                   countryId: 41,  country: { en: 'Canada',        es: 'Canadá' } },
  { id: 'mex', cityKey: 'world.city.mex', index: 'IPC',        tz: 'America/Mexico_City',               countryId: 137, country: { en: 'Mexico',        es: 'México' } },
  { id: 'sao', cityKey: 'world.city.sao', index: 'Bovespa',    tz: 'America/Sao_Paulo',                 countryId: 32,  country: { en: 'Brazil',        es: 'Brasil' } },
  { id: 'lon', cityKey: 'world.city.lon', index: 'FTSE 100',   tz: 'Europe/London',                     countryId: 229, country: { en: 'United Kingdom', es: 'Reino Unido' } },
  { id: 'fra', cityKey: 'world.city.fra', index: 'DAX',        tz: 'Europe/Berlin',                     countryId: 81,  country: { en: 'Germany',       es: 'Alemania' } },
  { id: 'tyo', cityKey: 'world.city.tyo', index: 'Nikkei 225', tz: 'Asia/Tokyo',                        countryId: 108, country: { en: 'Japan',         es: 'Japón' } },
  // Hong Kong es una región de China y a 0.5° por celda es un punto: lo que se
  // enciende —y lo que dice la tarjeta— es China, que es lo que de verdad se ve.
  { id: 'hkg', cityKey: 'world.city.hkg', index: 'Hang Seng',  tz: 'Asia/Hong_Kong',                    countryId: 46,  country: { en: 'China',         es: 'China' } }
];
