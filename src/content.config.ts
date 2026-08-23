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

// Quiz de comprensión del final de la lección. Son preguntas sobre lo que la
// lección acaba de explicar (no opiniones ni recomendaciones), y cada una trae
// escrito el PORQUÉ de la respuesta: sin esa línea el quiz solo califica, no
// enseña. Se responde en el navegador, sin backend (src/scripts/quiz.ts).
const quizItem = z.object({
  /** la pregunta, en segunda persona y sobre el contenido de la lección */
  q: z.string().min(8),
  /** 2 a 4 opciones; el orden es el que se pinta */
  options: z.array(z.string().min(1)).min(2).max(4),
  /** índice (0…n-1) de la opción correcta dentro de `options` */
  answer: z.number().int().min(0),
  /** por qué esa es la respuesta: se muestra al contestar, acierte o no */
  why: z.string().min(10)
}).refine((v) => v.answer < v.options.length, {
  message: 'quiz: answer apunta fuera de options',
  path: ['answer']
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
    /** exactamente tres preguntas de comprensión: si faltan, el build falla */
    quiz: z.array(quizItem).length(3),
    /** cifra destacada bajo la entradilla (opcional) */
    heroStat: z.object({ value: z.string(), label: z.string() }).optional()
  })
});

export const collections = { lessons };
