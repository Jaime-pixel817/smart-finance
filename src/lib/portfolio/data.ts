// Carga de las dos carteras del sitio. El esquema y sus pruebas viven en
// schema.mjs; aquí solo se leen los JSON del repositorio y se validan, de forma
// que un archivo mal editado tumbe el build en vez de publicar una cifra mal.
import { z } from 'astro/zod';
import { carteraSchema, historialSchema, posicionSchema, leer } from './schema.mjs';
import actinverJson from '../../data/actinver.json';
import portfolioJson from '../../data/portfolio.json';
import actinverHistJson from '../../data/actinver-history.json';
import portfolioHistJson from '../../data/portfolio-history.json';

export { carteraSchema, historialSchema, posicionSchema, MERCADOS } from './schema.mjs';

export type Posicion = z.infer<typeof posicionSchema>;
export type Cartera = z.infer<typeof carteraSchema>;
export type Historial = z.infer<typeof historialSchema>;
export type PuntoHistorial = Historial['puntos'][number];

export const ACTINVER = leer(carteraSchema, actinverJson, 'src/data/actinver.json');
export const PORTFOLIO = leer(carteraSchema, portfolioJson, 'src/data/portfolio.json');
export const ACTINVER_HISTORIAL = leer(historialSchema, actinverHistJson, 'src/data/actinver-history.json');
export const PORTFOLIO_HISTORIAL = leer(historialSchema, portfolioHistJson, 'src/data/portfolio-history.json');

export type CarteraId = 'actinver' | 'portfolio';

export interface CarteraCompleta {
  id: CarteraId;
  cartera: Cartera;
  historial: Historial;
  /** id de ruta en src/i18n/routes.ts */
  routeId: string;
}

export const CARTERAS: Record<CarteraId, CarteraCompleta> = {
  actinver: { id: 'actinver', cartera: ACTINVER, historial: ACTINVER_HISTORIAL, routeId: 'actinver' },
  portfolio: { id: 'portfolio', cartera: PORTFOLIO, historial: PORTFOLIO_HISTORIAL, routeId: 'portfolio' }
};

/** ¿Hay algo que enseñar? Lo usa el home para no anunciar una página vacía. */
export function tienePosiciones(id: CarteraId): boolean {
  return CARTERAS[id].cartera.posiciones.length > 0;
}

/**
 * Lo que necesita el navegador para repintar la cartera con precios frescos.
 * Va en un <script type="application/json">: sin tesis ni textos, solo números.
 */
export function runtimeDe(c: Cartera) {
  return {
    moneda: c.moneda,
    capitalInicial: c.capitalInicial,
    posiciones: c.posiciones.map((p) => ({
      ticker: p.ticker,
      historyPair: p.historyPair ?? null,
      cantidad: p.cantidad ?? null,
      peso: p.peso ?? null,
      entrada: { fecha: p.entrada.fecha, precio: p.entrada.precio },
      estado: p.estado,
      salida: p.salida ? { fecha: p.salida.fecha, precio: p.salida.precio } : null
    }))
  };
}
