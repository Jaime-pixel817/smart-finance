// Content collections de Smart Finance 2.0.
//
// `lessons`: una lección por archivo MDX en src/content/lessons/<locale>/<slug>.mdx.
// El id de cada entrada es "<locale>/<slug>" (lo genera el loader glob desde la
// ruta), así que la misma lección existe dos veces, una por idioma, con el
// MISMO slug: /lessons/<slug> y /es/lecciones/<slug>. El frontmatter va tipado
// con Zod: si falta una fuente, una fecha o el camino de aprendizaje, el build
// falla en vez de publicar una lección coja.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const PATH_IDS = ['desde-cero', 'mercados', 'invertir'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const source = z.object({
  /** título de la página o del conjunto de datos, tal cual lo publica la fuente */
  title: z.string().min(3),
  url: z.string().url(),
  /** quién la publica: Banco de México, INEGI, FRED… */
  publisher: z.string().min(2),
  /** fecha de consulta (YYYY-MM-DD): las URLs se verificaron ese día */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string().min(3),
    /** meta description y texto de la tarjeta (1 línea) */
    description: z.string().min(20).max(200),
    /** entradilla bajo el título (2–3 líneas) */
    lede: z.string().min(20),
    /** ruta de aprendizaje a la que pertenece */
    path: z.enum(PATH_IDS),
    /** orden dentro de la ruta (1 = primera) */
    order: z.number().int().positive(),
    readingMinutes: z.number().int().positive(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    level: z.enum(LEVELS).default('beginner'),
    /** mínimo dos fuentes reales y verificadas por lección */
    sources: z.array(source).min(2),
    /** slugs de lecciones relacionadas */
    related: z.array(z.string()).default([]),
    /** ids de src/data/glossary.json que la lección usa */
    glossary: z.array(z.string()).default([]),
    /** cifra destacada bajo la entradilla (opcional) */
    heroStat: z.object({ value: z.string(), label: z.string() }).optional()
  })
});

export const collections = { lessons };
