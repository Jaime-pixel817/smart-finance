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
      en: 'Your first budget, why money that grows on money matters, and why the same $100 buy less every year.',
      es: 'Tu primer presupuesto, por qué importa el dinero que crece sobre el dinero y por qué los mismos $100 compran menos cada año.'
    }
  },
  {
    id: 'mercados',
    name: { en: 'How markets work', es: 'Cómo funcionan los mercados' },
    blurb: {
      en: 'The two numbers in every headline: the dollar in pesos and the S&P 500. Who moves them and why.',
      es: 'Los dos números de todos los titulares: el dólar en pesos y el S&P 500. Quién los mueve y por qué.'
    }
  },
  {
    id: 'invertir',
    name: { en: 'Invest with a clear head', es: 'Invertir con cabeza' },
    blurb: {
      en: 'The order that works before you buy anything, and the traps almost everyone falls into the first time.',
      es: 'El orden que sí funciona antes de comprar nada, y las trampas en las que casi todos caen la primera vez.'
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
  'errores-al-invertir': 'lesson.errores'
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
  /** posición global (1…6) en el orden del catálogo */
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
