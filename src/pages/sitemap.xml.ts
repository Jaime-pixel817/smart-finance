// sitemap.xml generado en el build desde src/i18n/routes.ts: cada ruta sale
// dos veces (EN y ES) con sus xhtml:link recíprocos (en, es, x-default → en),
// como pide Google. Antes lo escribía scripts/build-es.js desde su lista de
// páginas legacy; al nacer las fichas de activo (una ruta por símbolo) la
// única lista completa es la de routes.ts.
//
// NO se incluyen a propósito: /newsletter/* (pantallas de estado con noindex)
// ni /articles/* (redirecciones 301 de vercel.json).
import type { APIRoute } from 'astro';
import { ROUTES, SITE } from '../i18n/routes';

export const GET: APIRoute = () => {
  const urls = ROUTES.map((r) => {
    const alts = [
      `    <xhtml:link rel="alternate" hreflang="en" href="${SITE + r.en}"/>`,
      `    <xhtml:link rel="alternate" hreflang="es" href="${SITE + r.es}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + r.en}"/>`
    ].join('\n');
    return [r.en, r.es].map((u) => [
      '  <url>',
      `    <loc>${SITE + u}</loc>`,
      r.lastmod ? `    <lastmod>${r.lastmod}</lastmod>` : '',
      r.changefreq ? `    <changefreq>${r.changefreq}</changefreq>` : '',
      r.priority ? `    <priority>${r.priority}</priority>` : '',
      alts,
      '  </url>'
    ].filter(Boolean).join('\n')).join('\n\n');
  }).join('\n\n');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generado en el build desde src/i18n/routes.ts: no se edita a mano. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '',
    urls,
    '',
    '</urlset>',
    ''
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
