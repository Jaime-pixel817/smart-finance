// La og:image PROPIA de una página, si es que existe.
//
// scripts/build-og-pages.mjs dibuja una tarjeta 1200×630 por página en
// public/og/<nombre>.jpg (y <nombre>-es.jpg) y deja la lista de las que
// generó en src/generated/og-pages.json. Aquí solo se consulta esa lista.
//
// LA CAÍDA SEGURA ES EL PUNTO: si el nombre no está —una noticia recién
// sincronizada con `npm run news:sync` y todavía sin regenerar las imágenes,
// una lección nueva, un símbolo nuevo— esto devuelve undefined y Base.astro
// usa la og:image genérica del sitio. Nunca se publica un og:image roto.
//
// Se mira el manifiesto y no el disco con fs.existsSync porque el repo no
// declara @types/node y `astro check` falla en cuanto ve `node:fs` (la misma
// razón por la que src/lib/research/reports.ts lee con import.meta.glob). El
// manifiesto se regenera en cada `npm run build` (prebuild) y se commitea.
import type { Locale } from '../i18n/routes';
import { SITE } from '../i18n/routes';
import generadas from '../generated/og-pages.json';

const HAY = new Set<string>(generadas);

/**
 * @param nombre  nombre estable de la tarjeta, sin idioma ni extensión:
 *                'community', 'lesson-<slug>', 'news-<slug>', 'tool-<slug>',
 *                'market-<símbolo>', 'research-<empresa>'.
 */
export function ogPropia(nombre: string, locale: Locale): string | undefined {
  const archivo = locale === 'es' ? nombre + '-es' : nombre;
  return HAY.has(archivo) ? SITE + '/og/' + archivo + '.jpg' : undefined;
}
