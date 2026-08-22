// JSON-LD Article de una lección (mismo bloque para EN y ES): headline y
// description coinciden con <title> y meta description a propósito, las fechas
// salen del frontmatter, el publisher lleva logo (ImageObject) y las fuentes
// van como citation. Se usa en src/pages/lessons/[slug].astro y su par /es.
import type { Locale } from '../i18n/routes';
import { SITE, route } from '../i18n/routes';
import type { Lesson } from './lessons';

export function lessonJsonLd(locale: Locale, lesson: Lesson): Record<string, unknown> {
  const d = lesson.entry.data;
  const url = SITE + lesson.href;
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.title,
    description: d.description,
    inLanguage: locale === 'es' ? 'es-MX' : 'en',
    datePublished: iso(d.publishedAt),
    dateModified: iso(d.updatedAt),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: SITE + (locale === 'es' ? '/og-image-es.jpg' : '/og-image.jpg'),
    timeRequired: 'PT' + d.readingMinutes + 'M',
    keywords: d.glossary.join(', '),
    author: { '@type': 'Person', name: 'Jaime Sandoval Ricaño', url: SITE + route('about', locale), sameAs: ['https://www.linkedin.com/in/jaime-sandoval-ricano-23b3a4401', 'https://www.tiktok.com/@smart.financee'] },
    publisher: {
      '@type': 'Organization', name: 'Smart Finance', url: SITE + '/', '@id': SITE + '/#organization',
      logo: { '@type': 'ImageObject', url: SITE + '/logo-512.png', width: 512, height: 512 }
    },
    isPartOf: { '@type': 'CollectionPage', name: locale === 'es' ? 'Aprende' : 'Learn', url: SITE + route('lessons', locale) },
    citation: d.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url, publisher: { '@type': 'Organization', name: s.publisher } }))
  };
}
