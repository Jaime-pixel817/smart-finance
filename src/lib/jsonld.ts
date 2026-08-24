// Los nodos de schema.org que comparten TODAS las páginas: la organización, la
// persona que firma y las migas de pan.
//
// POR QUÉ EXISTE
// --------------
// Cuarenta páginas ya decían `publisher: { '@id': 'https://smartfinance.lat/#organization' }`
// y ese nodo NO estaba definido en ningún sitio: era una referencia colgando.
// Para Google eso es un publisher sin nombre, sin logo y sin redes — es decir,
// ningún publisher. Aquí se define UNA vez y Base.astro lo mete en el `@graph`
// de cada página, así que la referencia por `@id` de cualquier página resuelve
// contra un nodo real que está en el mismo documento.
//
// SIN DUPLICAR NADA
// -----------------
// Las páginas siguen escribiendo su propio nodo (Article, Report, WebPage…) y
// no saben de esto. Base.astro envuelve ese nodo con los compartidos:
//   { '@context': …, '@graph': [ nodoDeLaPágina, Organization, Person, Breadcrumb ] }
// Un solo <script type="application/ld+json"> por página, como antes.
import type { Locale } from '../i18n/routes';
import { SITE, route } from '../i18n/routes';
import { useT } from '../i18n/ui';

export const LINKEDIN = 'https://www.linkedin.com/in/jaime-sandoval-ricano-23b3a4401';
export const TIKTOK = 'https://www.tiktok.com/@smart.financee';
export const GITHUB = 'https://github.com/Jaime-pixel817/smart-finance';

export const ORG_ID = SITE + '/#organization';
export const PERSON_ID = SITE + '/#jaime';

/** Smart Finance como organización: el publisher al que apuntan los Article. */
export function organizacion(locale: Locale): Record<string, unknown> {
  const t = useT(locale);
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Smart Finance',
    alternateName: 'SmartFinance.lat',
    url: SITE + '/',
    description: t('site.desc'),
    // El logo del publisher tiene que ser un archivo real y cuadrado o casi:
    // Google lo enseña junto al resultado. public/logo-512.png, 512×512.
    logo: { '@type': 'ImageObject', url: SITE + '/logo-512.png', width: 512, height: 512, caption: 'Smart Finance' },
    image: SITE + '/logo-512.png',
    // Las MISMAS redes que enlaza el pie del sitio. sameAs sirve para que
    // Google una el sitio con los perfiles; si aquí sale una cuenta que no es,
    // no une nada.
    sameAs: [LINKEDIN, TIKTOK, GITHUB],
    founder: { '@id': PERSON_ID },
    foundingDate: '2025',
    knowsLanguage: ['es-MX', 'en'],
    areaServed: ['MX', 'CA'],
    publishingPrinciples: SITE + route('methodology', locale)
  };
}

/** Jaime: autor de todo lo que se firma y fundador de la organización. */
export function persona(locale: Locale): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Jaime Sandoval Ricaño',
    url: SITE + route('about', locale),
    sameAs: [LINKEDIN, TIKTOK],
    worksFor: { '@id': ORG_ID }
  };
}

/**
 * De qué sección cuelga cada ruta anidada. La clave es el id de
 * src/i18n/routes.ts; los ids con punto (asset.spy, lesson.etfs, news.<slug>,
 * newsletter.<fecha>, research.<empresa>, tool.<slug>) se resuelven por prefijo.
 */
const PADRE_EXACTO: Record<string, string> = {
  'market.compare': 'market',
  'lessons.glossary': 'lessons'
};
const PADRE_PREFIJO: Array<[string, string]> = [
  ['asset.', 'market'],
  ['lesson.', 'lessons'],
  ['news.', 'news'],
  ['newsletter.', 'newsletter'],
  ['research.', 'research'],
  ['tool.', 'tools']
];

/** Etiqueta de la sección padre, con los textos del nav (nunca sueltos aquí). */
function etiquetaSeccion(locale: Locale, id: string): string {
  const t = useT(locale);
  const mapa: Record<string, Parameters<typeof t>[0]> = {
    market: 'nav.markets',
    lessons: 'nav.learn',
    news: 'nav.news',
    newsletter: 'nav.newsletter',
    // El id de ruta sigue siendo 'research' (la URL no cambió); el rótulo que
    // lee la miga es el nuevo, 'nav.projects'.
    research: 'nav.projects',
    tools: 'nav.tools'
  };
  return t(mapa[id] ?? 'nav.today');
}

/**
 * BreadcrumbList de una ruta anidada, o null si la ruta cuelga de la raíz (una
 * miga de un solo escalón no le dice nada a nadie y Google la ignora).
 *
 * @param titulo  <title> de la página; se le quita el sufijo de marca porque la
 *                última miga es el nombre de ESTA página, no el del sitio.
 */
export function migas(locale: Locale, routeId: string, titulo: string): Record<string, unknown> | null {
  const padre = PADRE_EXACTO[routeId] ?? PADRE_PREFIJO.find(([p]) => routeId.startsWith(p))?.[1];
  if (!padre) return null;
  const t = useT(locale);
  const hoja = titulo.split(' — Smart Finance')[0].split(' | Smart Finance')[0].trim() || titulo;
  const pasos = [
    { name: t('seo.home'), item: SITE + route('home', locale) },
    { name: etiquetaSeccion(locale, padre), item: SITE + route(padre, locale) },
    { name: hoja, item: SITE + route(routeId, locale) }
  ];
  return {
    '@type': 'BreadcrumbList',
    '@id': SITE + route(routeId, locale) + '#breadcrumb',
    itemListElement: pasos.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, name: p.name, item: p.item
    }))
  };
}

/**
 * El documento JSON-LD completo de una página: su nodo + los compartidos.
 * Se le quita el '@context' al nodo de la página porque en un `@graph` el
 * contexto va una sola vez, arriba.
 */
export function grafo(locale: Locale, routeId: string, titulo: string, nodoPagina: Record<string, unknown>) {
  const { '@context': _contexto, ...pagina } = nodoPagina;
  const miga = migas(locale, routeId, titulo);
  return {
    '@context': 'https://schema.org',
    '@graph': [pagina, organizacion(locale), persona(locale), ...(miga ? [miga] : [])]
  };
}
