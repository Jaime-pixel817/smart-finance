// Registro de rutas EN ↔ ES. Es la única fuente para canonical, hreflang,
// navegación y el sitemap (src/pages/sitemap.xml.ts). Si alguna página
// volviera a servirse desde public/ (HTML legacy) se marca legacy: true.
import { ASSETS } from '../data/symbols';
import { NEWS, newsRouteId, newsLastmod } from '../data/news';
import { NUMEROS, numeroRouteId, numerosLastmod } from '../data/newsletter';

export type Locale = 'en' | 'es';
export const LOCALES: Locale[] = ['en', 'es'];
export const DEFAULT_LOCALE: Locale = 'en';
export const SITE = 'https://smartfinance.lat';

export interface RouteEntry {
  id: string;
  en: string;
  es: string;
  /** true mientras la página se sirva desde public/ (HTML legacy). */
  legacy?: boolean;
  /** Sitemap: fecha real del último cambio de contenido (no se inventa). */
  lastmod?: string;
  changefreq?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  priority?: string;
  /** false = existe y necesita canonical/hreflang, pero no va al sitemap.
      Hoy solo la página de lectura de una noticia recién aprobada, que es
      transitoria y lleva noindex (ver src/pages/news-read.astro). */
  sitemap?: boolean;
}

// Lecciones: MDX en src/content/lessons (ya no legacy). lastmod = última edición real del contenido.
const LESSON_META = { lastmod: '2026-08-21', changefreq: 'monthly' as const, priority: '0.7' };
// Herramientas: mismo trato que las lecciones (contenido que cambia poco).
const TOOL_META = { lastmod: '2026-08-22', changefreq: 'monthly' as const, priority: '0.7' };
export const ROUTES: RouteEntry[] = [
  { id: 'home', en: '/', es: '/es', lastmod: '2026-08-21', changefreq: 'daily', priority: '1.0' },
  { id: 'market', en: '/market', es: '/es/mercado', lastmod: '2026-08-21', changefreq: 'hourly', priority: '0.9' },
  // Fichas de activo: una ruta por símbolo del registro (src/data/symbols.ts).
  ...ASSETS.map((s): RouteEntry => ({ id: 'asset.' + s.id, en: '/market/' + s.id, es: '/es/mercado/' + s.id, lastmod: '2026-08-21', changefreq: 'hourly', priority: '0.8' })),
  // Noticias explicadas. El índice se pinta en el navegador desde
  // /api/news?estado=aprobadas; cada noticia aprobada y sincronizada al repo
  // (src/data/news/*.json) tiene además su página estática.
  { id: 'news', en: '/news', es: '/es/noticias', lastmod: newsLastmod(), changefreq: 'daily', priority: '0.9' },
  ...NEWS.map((n): RouteEntry => ({
    id: newsRouteId(n.slug), en: '/news/' + n.slug, es: '/es/noticias/' + n.slug,
    lastmod: n.fecha.slice(0, 10), changefreq: 'monthly', priority: '0.6'
  })),
  // Lectura de una noticia aprobada que todavía no tiene página propia. No se
  // llega a ella por su URL: la sirve la reescritura de vercel.json cuando
  // /news/<slug> no existe como archivo.
  { id: 'news.read', en: '/news-read', es: '/es/noticias-leer', sitemap: false },
  // El boletín en la web: el índice de números y una página por número
  // enviado y sincronizado al repo (src/data/newsletter/*.json). Es el destino
  // del "ver en el navegador" de cada correo, y de paso convierte cada envío en
  // contenido indexable en vez de un correo que se pierde en la bandeja.
  { id: 'newsletter', en: '/newsletter', es: '/es/boletin', lastmod: numerosLastmod(), changefreq: 'weekly', priority: '0.7' },
  ...NUMEROS.map((n): RouteEntry => ({
    id: numeroRouteId(n.fecha), en: '/newsletter/' + n.fecha, es: '/es/boletin/' + n.fecha,
    lastmod: n.fecha, changefreq: 'monthly', priority: '0.5'
  })),
  // Lectura de un número que ya salió por correo pero todavía no está
  // commiteado. No se llega por su URL: la sirve la reescritura de vercel.json
  // cuando /newsletter/<fecha> no existe como archivo.
  { id: 'newsletter.read', en: '/newsletter-read', es: '/es/boletin-leer', sitemap: false },
  { id: 'lessons', en: '/lessons', es: '/es/lecciones', lastmod: '2026-08-21', changefreq: 'monthly', priority: '0.8' },
  { id: 'lesson.peso', en: '/lessons/peso-tipo-de-cambio', es: '/es/lecciones/peso-tipo-de-cambio', ...LESSON_META },
  { id: 'lesson.interes', en: '/lessons/interes-compuesto', es: '/es/lecciones/interes-compuesto', ...LESSON_META },
  { id: 'lesson.sp500', en: '/lessons/sp500', es: '/es/lecciones/sp500', ...LESSON_META },
  { id: 'lesson.presupuesto', en: '/lessons/presupuesto-50-30-20', es: '/es/lecciones/presupuesto-50-30-20', ...LESSON_META },
  { id: 'lesson.inflacion', en: '/lessons/inflacion', es: '/es/lecciones/inflacion', ...LESSON_META },
  { id: 'lesson.errores', en: '/lessons/errores-al-invertir', es: '/es/lecciones/errores-al-invertir', ...LESSON_META },
  { id: 'lesson.tarjeta', en: '/lessons/tarjeta-de-credito', es: '/es/lecciones/tarjeta-de-credito', ...LESSON_META, lastmod: '2026-08-23' },
  { id: 'lesson.accion', en: '/lessons/que-es-una-accion', es: '/es/lecciones/que-es-una-accion', ...LESSON_META, lastmod: '2026-08-23' },
  { id: 'lesson.bolsa', en: '/lessons/como-funciona-la-bolsa', es: '/es/lecciones/como-funciona-la-bolsa', ...LESSON_META, lastmod: '2026-08-23' },
  { id: 'lesson.etfs', en: '/lessons/etfs', es: '/es/lecciones/etfs', ...LESSON_META, lastmod: '2026-08-23' },
  { id: 'lessons.glossary', en: '/lessons/glossary', es: '/es/lecciones/glosario', lastmod: '2026-08-21', changefreq: 'monthly', priority: '0.6' },
  // Herramientas: el índice y una página por calculadora. El slug es el mismo
  // en los dos idiomas (igual que las lecciones), solo cambia el segmento.
  { id: 'tools', en: '/tools', es: '/es/herramientas', ...TOOL_META, priority: '0.8' },
  { id: 'tool.interes', en: '/tools/interes-compuesto', es: '/es/herramientas/interes-compuesto', ...TOOL_META },
  { id: 'tool.inflacion', en: '/tools/inflacion', es: '/es/herramientas/inflacion', ...TOOL_META },
  { id: 'tool.cetes', en: '/tools/cetes-vs-cuenta', es: '/es/herramientas/cetes-vs-cuenta', ...TOOL_META },
  { id: 'community', en: '/community', es: '/es/comunidad', lastmod: '2026-08-22', changefreq: 'monthly', priority: '0.6' },
  // Research: /research es marca y se usa igual en los dos idiomas (como
  // "Smart Finance Research"); lo que cambia es el idioma del contenido.
  { id: 'research', en: '/research', es: '/es/research', lastmod: '2026-08-22', changefreq: 'weekly', priority: '0.8' },
  { id: 'research.lululemon', en: '/research/lululemon', es: '/es/research/lululemon', lastmod: '2026-08-22', changefreq: 'monthly', priority: '0.7' },
  { id: 'about', en: '/about', es: '/es/acerca', lastmod: '2026-08-21', changefreq: 'monthly', priority: '0.5' },
  { id: 'methodology', en: '/methodology', es: '/es/metodologia', lastmod: '2026-08-21', changefreq: 'monthly', priority: '0.5' }
];

export function route(id: string, locale: Locale): string {
  const r = ROUTES.find((x) => x.id === id);
  if (!r) throw new Error('Ruta desconocida: ' + id);
  return r[locale];
}

/** Pares hreflang (en, es, x-default → en) para una página. */
export function alternates(id: string) {
  const r = ROUTES.find((x) => x.id === id);
  if (!r) throw new Error('Ruta desconocida: ' + id);
  return [
    { hreflang: 'en', href: SITE + r.en },
    { hreflang: 'es', href: SITE + r.es },
    { hreflang: 'x-default', href: SITE + r.en }
  ];
}

export function otherLocale(l: Locale): Locale { return l === 'en' ? 'es' : 'en'; }
