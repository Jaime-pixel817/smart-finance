// Los números del boletín que ya se enviaron y están commiteados.
//
// La verdad de cada número vive en src/data/newsletter/<fecha>.json, que
// escribe `npm run newsletter:sync` desde Redis después de un envío. Aquí solo
// están los tipos, el orden y los helpers que usan /newsletter, la página de
// cada número y el sitemap. Ningún texto se escribe aquí.
//
// POR QUÉ HAY DOS CAMINOS PARA EL MISMO NÚMERO
//   /newsletter/<fecha> se genera en el build desde estos JSON, así cada número
//   tiene HTML de verdad para Google y para cuando alguien lo comparte.
//   Entre que sale el correo y que alguien commitea el archivo, esa misma URL
//   la sirve src/pages/newsletter-read.astro (reescritura en vercel.json), que
//   pinta el número desde /api/newsletter-chart?issue=<fecha>.
// Es el mismo reparto que las noticias, y por el mismo motivo: el correo del
// domingo no puede depender de que alguien despliegue para que su enlace de
// "ver en el navegador" funcione.
import type { Locale } from '../i18n/routes';

/** Lo que resume un activo en el bloque del dólar. */
export interface ResumenActivo {
  valor: number;
  cambio: number;
  cambioPct: number;
  ultimoTs: number;
}

export interface MovimientoActivo {
  id: string;
  sym: string;
  en: string;
  es: string;
  valor: number;
  cambioPct: number;
  ultimoTs: number;
}

export interface TextoNoticiaBoletin {
  titulo: string;
  take: string;
  link: string;
}

export interface Numero {
  version: number;
  /** AAAA-MM-DD en hora de Ciudad de México. Es la URL: /newsletter/<fecha>. */
  fecha: string;
  /** ISO del momento del envío. */
  enviadoEn: string;
  /** Nº de edición, contado desde el primer domingo del boletín semanal. */
  numero: number;
  rango: Record<Locale, string>;
  gancho: Record<Locale, string>;
  resumen: Record<Locale, string>;
  /**
   * La línea de Jaime, en los dos idiomas. `en` puede venir en null si solo la
   * escribió en español: entonces la página en inglés sale sin ese bloque, en
   * vez de enseñar español suelto (ver api/_lib/nota.js).
   */
  nota: { es: string; en: string | null } | null;
  noticia: {
    slug: string;
    autoria: 'ia-revisada' | 'humana';
    fuente: string | null;
    en: TextoNoticiaBoletin;
    es: TextoNoticiaBoletin;
  } | null;
  mercado: { usdmxn: ResumenActivo | null; vix: ResumenActivo | null } | null;
  movimientos: {
    suben: MovimientoActivo[];
    bajan: MovimientoActivo[];
    asOf: number | null;
    consultados: number;
  } | null;
  /** La serie del dólar de esa semana: [marcaDeTiempo, valor]. Dibuja la gráfica. */
  serieFx: [number, number][] | null;
  tip: {
    slug: string;
    minutos: number;
    url: string;
    urlEs: string;
    en: { titulo: string; resumen: string };
    es: { titulo: string; resumen: string };
  } | null;
  research: {
    ticker: string;
    name: string;
    actualizado: string;
    en: { link: string };
    es: { link: string };
  } | null;
}

// eager: el build necesita la lista completa para getStaticPaths y el sitemap.
const archivos = import.meta.glob<Numero>('./newsletter/*.json', { eager: true, import: 'default' });

/** Todos los números publicados, el más reciente primero. */
export const NUMEROS: Numero[] = Object.values(archivos)
  .filter((n): n is Numero => !!n && typeof n.fecha === 'string')
  .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

/** id de ruta de un número, para src/i18n/routes.ts. */
export function numeroRouteId(fecha: string): string {
  return 'newsletter.' + fecha;
}

/**
 * lastmod del índice: la fecha del número más reciente.
 *
 * Sin números todavía —que es el estado hasta el primer envío archivado— vale
 * la fecha en que se creó la página. Inventar "hoy" haría que el sitemap
 * dijera que /newsletter cambia todos los días sin que cambie nada.
 */
export function numerosLastmod(): string {
  return NUMEROS.length ? NUMEROS[0].fecha : '2026-08-23';
}

/** El texto de un número en el idioma pedido. */
export function textoDe(n: Numero, locale: Locale) {
  return {
    rango: n.rango[locale],
    gancho: n.gancho[locale],
    resumen: n.resumen[locale]
  };
}
