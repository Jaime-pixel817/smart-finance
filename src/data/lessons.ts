// Rutas de aprendizaje y acceso tipado a la colección de lecciones.
//
// La verdad sobre cada lección (título, descripción, ruta, orden, minutos,
// fechas, fuentes) vive en el frontmatter de su MDX (src/content/lessons).
// Aquí solo están las tres rutas de aprendizaje, el mapa slug → id de ruta de
// src/i18n/routes.ts y los helpers que usan el índice, el home, las fichas de
// activo y el buscador. Nada de esto duplica texto de las lecciones.
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/routes';
import { route } from '../i18n/routes';

export type PathId = 'desde-cero' | 'mercados' | 'invertir';

export interface LearningPath {
  id: PathId;
  name: Record<Locale, string>;
  blurb: Record<Locale, string>;
}

/** Orden fijo: es el orden en que se muestran en /lessons y en el home. */
export const PATHS: LearningPath[] = [
  {
    id: 'desde-cero',
    name: { en: 'From zero', es: 'Desde cero' },
    blurb: {
      en: 'Your first budget, why money that grows on money matters, why the same $100 buy less every year, and your first credit card.',
      es: 'Tu primer presupuesto, por qué importa el dinero que crece sobre el dinero, por qué los mismos $100 compran menos cada año y tu primera tarjeta de crédito.'
    }
  },
  {
    id: 'mercados',
    name: { en: 'How markets work', es: 'Cómo funcionan los mercados' },
    blurb: {
      en: 'The dollar in pesos, what a share actually is, what happens inside an exchange, and what the S&P 500 measures.',
      es: 'El dólar en pesos, qué es de verdad una acción, qué pasa dentro de una bolsa y qué mide el S&P 500.'
    }
  },
  {
    id: 'invertir',
    name: { en: 'Invest with a clear head', es: 'Invertir con cabeza' },
    blurb: {
      en: 'The order that works before you buy anything, the traps almost everyone falls into, and what an ETF really gets you.',
      es: 'El orden que sí funciona antes de comprar nada, las trampas en las que casi todos caen y qué te da de verdad un ETF.'
    }
  }
];

/** slug del MDX → id de ruta en src/i18n/routes.ts (conserva las URLs de siempre). */
export const LESSON_ROUTE: Record<string, string> = {
  'peso-tipo-de-cambio': 'lesson.peso',
  'interes-compuesto': 'lesson.interes',
  'sp500': 'lesson.sp500',
  'presupuesto-50-30-20': 'lesson.presupuesto',
  'inflacion': 'lesson.inflacion',
  'errores-al-invertir': 'lesson.errores',
  'tarjeta-de-credito': 'lesson.tarjeta',
  'que-es-una-accion': 'lesson.accion',
  'como-funciona-la-bolsa': 'lesson.bolsa',
  'etfs': 'lesson.etfs'
};

export type LessonEntry = CollectionEntry<'lessons'>;

export interface Lesson {
  slug: string;
  locale: Locale;
  routeId: string;
  href: string;
  entry: LessonEntry;
  path: LearningPath;
  /** posición dentro de su ruta (1…n) y tamaño de la ruta */
  pathIndex: number;
  pathTotal: number;
  /** posición global (1…n) en el orden del catálogo */
  n: number;
}

export function splitId(id: string): { locale: Locale; slug: string } {
  const [locale, ...rest] = id.split('/');
  return { locale: locale as Locale, slug: rest.join('/') };
}

export function pathOf(id: PathId): LearningPath {
  return PATHS.find((p) => p.id === id)!;
}

/** Todas las lecciones de un idioma, ordenadas por ruta y luego por orden. */
export async function getLessons(locale: Locale): Promise<Lesson[]> {
  const entries = await getCollection('lessons', (e) => splitId(e.id).locale === locale);
  const pathOrder = PATHS.map((p) => p.id);
  const sorted = entries.slice().sort((a, b) => {
    const pa = pathOrder.indexOf(a.data.path), pb = pathOrder.indexOf(b.data.path);
    return pa !== pb ? pa - pb : a.data.order - b.data.order;
  });
  return sorted.map((entry, i) => {
    const { slug } = splitId(entry.id);
    const routeId = LESSON_ROUTE[slug];
    if (!routeId) throw new Error('Lección sin ruta registrada en src/data/lessons.ts: ' + slug);
    const siblings = sorted.filter((e) => e.data.path === entry.data.path);
    return {
      slug, locale, routeId, href: route(routeId, locale), entry,
      path: pathOf(entry.data.path),
      pathIndex: siblings.findIndex((e) => e.id === entry.id) + 1,
      pathTotal: siblings.length,
      n: i + 1
    };
  });
}

export async function getLesson(locale: Locale, slug: string): Promise<Lesson | undefined> {
  return (await getLessons(locale)).find((l) => l.slug === slug);
}

export async function getLessonByRoute(locale: Locale, routeId: string): Promise<Lesson | undefined> {
  return (await getLessons(locale)).find((l) => l.routeId === routeId);
}

/** Anterior y siguiente dentro de la misma ruta de aprendizaje. */
export function prevNext(all: Lesson[], current: Lesson): { prev?: Lesson; next?: Lesson } {
  const inPath = all.filter((l) => l.path.id === current.path.id);
  const i = inPath.findIndex((l) => l.slug === current.slug);
  return { prev: i > 0 ? inPath[i - 1] : undefined, next: i < inPath.length - 1 ? inPath[i + 1] : undefined };
}

/** Slug de la lección sin el idioma, para localStorage y data-*. */
export const PROGRESS_KEY = 'sf-lessons-read';
