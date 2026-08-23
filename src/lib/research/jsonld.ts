// JSON-LD de un reporte de research: schema.org Report (subtipo de Article),
// con la empresa analizada en `about`, el autor, el estado del borrador y las
// fuentes primarias como `citation`. Nada que no esté también en la página.
import type { Locale } from '../../i18n/routes';
import { SITE } from '../../i18n/routes';
import type { Report } from './reports';

export function reportJsonLd(locale: Locale, report: Report, url: string, description: string) {
  const m = report.meta;
  const citations = report.sources
    .filter((s) => !!s.url)
    .map((s) => ({
      '@type': 'CreativeWork',
      name: s.title,
      url: s.url,
      ...(s.filed ? { datePublished: s.filed } : {})
    }));
  const modified = '2026-08-22';
  return {
    '@context': 'https://schema.org',
    '@type': 'Report',
    headline: `${m.name} (${m.ticker}) — equity research`,
    name: `${m.name} (${m.ticker}) — equity research`,
    description,
    url,
    inLanguage: locale === 'es' ? 'es-MX' : 'en',
    datePublished: modified,
    dateModified: modified,
    version: m.version,
    creativeWorkStatus: m.status === 'published' ? 'Published' : 'Draft',
    isAccessibleForFree: true,
    about: {
      '@type': 'Corporation',
      name: m.name,
      tickerSymbol: m.ticker,
      ...(m.cik ? { identifier: { '@type': 'PropertyValue', propertyID: 'SEC CIK', value: m.cik } } : {})
    },
    author: { '@type': 'Person', name: 'Jaime Sandoval Ricaño', url: SITE + '/about' },
    publisher: { '@type': 'Organization', name: 'Smart Finance', '@id': SITE + '/#organization' },
    isPartOf: { '@type': 'CollectionPage', name: 'Smart Finance Research', url: SITE + (locale === 'es' ? '/es/research' : '/research') },
    citation: citations,
    disclaimer: locale === 'es'
      ? 'Contenido educativo. No es asesoría de inversión ni una recomendación de compra o venta.'
      : 'Educational content. Not investment advice and not a recommendation to buy or sell.'
  };
}
