// Las noticias explicadas que YA están aprobadas y publicadas.
//
// La verdad de cada noticia vive en src/data/news/<slug>.json, que escribe
// `npm run news:sync` desde Redis después de que una persona la aprueba en
// /review.html. Aquí solo están los tipos, el orden y los helpers que usan la
// página de índice, la de cada noticia y el sitemap. Ningún texto se escribe
// aquí: si hay que corregir una noticia se corrige en el JSON.
//
// POR QUÉ HAY DOS CAMINOS PARA LA MISMA NOTICIA
//   /news (índice) se pinta en el navegador desde /api/news?estado=aprobadas,
//   así una aprobación se ve en un minuto sin desplegar.
//   /news/<slug> se genera en el build desde estos JSON, así cada noticia tiene
//   HTML de verdad para Google y para cuando alguien la comparte.
// Entre aprobar y desplegar, /news/<slug> lo sirve src/pages/news-read.astro
// (reescritura en vercel.json), que pinta la misma noticia desde el endpoint.
import type { Locale } from '../i18n/routes';

/** Los cinco temas de los filtros. Mismo orden que los chips de /news. */
export const TEMAS = ['peso', 'tasas', 'acciones', 'cripto', 'macro'] as const;
export type Tema = (typeof TEMAS)[number];

export interface NewsText {
  /** Titular reescrito en lenguaje claro (Fraunces en la página). */
  titulo: string;
  /** Qué pasó: 2–3 frases con la cifra, la fecha y quién, si la fuente las da. */
  que: string;
  /** Por qué importa para un estudiante en México o Canadá. */
  porque: string;
  /** Impacto en mercados. "Todavía no se sabe" es una respuesta válida. */
  impacto: string;
}

export interface NewsSource {
  nombre: string;
  /** Titular original, tal cual lo publicó la fuente. */
  titular: string;
  url: string;
  /** ISO: cuándo lo publicó la fuente. */
  publicado: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  tema: Tema;
  /** ISO de la noticia (la de la fuente): por esto se ordena. */
  fecha: string;
  fuente: NewsSource;
  /** id de src/data/symbols.ts de los activos que toca (0–3). */
  simbolos: string[];
  /** El activo del que más habla, para la mini gráfica. */
  principal: string | null;
  /** id de ruta de la lección relacionada (src/i18n/routes.ts). */
  leccion: string | null;
  /** ids de src/data/glossary.json (1–2). */
  terminos: string[];
  /** ia-revisada = la escribió Claude y la revisó una persona. humana = la reescribió ella. */
  autoria: 'ia-revisada' | 'humana';
  revisadoPor: string | null;
  revisadoEn: string | null;
  en: NewsText;
  es: NewsText;
}

// eager: el build necesita la lista completa para getStaticPaths y para el
// sitemap, así que no hay nada que cargar en diferido.
const archivos = import.meta.glob<NewsItem>('./news/*.json', { eager: true, import: 'default' });

/** Todas las noticias publicadas, la más reciente primero. */
export const NEWS: NewsItem[] = Object.values(archivos)
  .slice()
  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

/** id de ruta en src/i18n/routes.ts para una noticia. */
export function newsRouteId(slug: string): string { return 'news.' + slug; }

export function bySlug(slug: string): NewsItem | undefined {
  return NEWS.find((n) => n.slug === slug);
}

/** Fecha del sitemap para el índice: la de la noticia más reciente. */
export function newsLastmod(): string | undefined {
  return NEWS.length ? NEWS[0].fecha.slice(0, 10) : undefined;
}

/** Texto de la noticia en un idioma. */
export function textoDe(n: NewsItem, locale: Locale): NewsText { return n[locale]; }
