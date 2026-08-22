// Registro de rutas EN ↔ ES. Es la única fuente para canonical, hreflang,
// navegación y (más adelante) el sitemap. Las rutas legacy que siguen en
// public/ también se listan para que el nav y el hreflang apunten bien.
import { ASSETS } from '../data/symbols';

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
}

export const ROUTES: RouteEntry[] = [
  { id: 'home', en: '/', es: '/es' },
  { id: 'market', en: '/market', es: '/es/mercado' },
  // Fichas de activo: una ruta por símbolo del registro (src/data/symbols.ts).
  ...ASSETS.map((s) => ({ id: 'asset.' + s.id, en: '/market/' + s.id, es: '/es/mercado/' + s.id })),
  { id: 'lessons', en: '/lessons', es: '/es/lecciones', legacy: true },
  { id: 'lesson.peso', en: '/lessons/peso-tipo-de-cambio', es: '/es/lecciones/peso-tipo-de-cambio', legacy: true },
  { id: 'lesson.interes', en: '/lessons/interes-compuesto', es: '/es/lecciones/interes-compuesto', legacy: true },
  { id: 'lesson.sp500', en: '/lessons/sp500', es: '/es/lecciones/sp500', legacy: true },
  { id: 'lesson.presupuesto', en: '/lessons/presupuesto-50-30-20', es: '/es/lecciones/presupuesto-50-30-20', legacy: true },
  { id: 'lesson.inflacion', en: '/lessons/inflacion', es: '/es/lecciones/inflacion', legacy: true },
  { id: 'lesson.errores', en: '/lessons/errores-al-invertir', es: '/es/lecciones/errores-al-invertir', legacy: true }
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
