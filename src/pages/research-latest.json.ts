// /research-latest.json — la ficha corta de cada reporte de research, generada
// en el BUILD desde content/research/<slug>/meta.yaml.
//
// POR QUÉ EXISTE
// --------------
// El boletín semanal incluye un bloque de research "si hay novedad", y para
// saber si la hay necesita una fecha. Los meta.yaml viven en `content/`, que el
// BUILD sí lee (import.meta.glob) pero una función serverless no: Vercel solo
// empaqueta con la función los ficheros que traza desde su código, y leer
// content/ con node:fs en tiempo de ejecución acabaría en ENOENT en producción
// y en un bloque que no aparece nunca, en silencio.
//
// Esto es una página estática de Astro, igual que /sitemap.xml y
// /search-index.json: se escribe en dist/ durante el build y la sirve el CDN.
// NO es una función serverless — importa, porque el plan de Vercel admite 12 y
// el sitio está exactamente en 12 (ver CLAUDE.md).
//
// Todo lo que sale aquí ya es público en /research. No se expone nada nuevo:
// es la misma cabecera del reporte, en JSON.
import type { APIRoute } from 'astro';
import { REPORTS, loadReport } from '../lib/research/reports';
import { route, SITE, LOCALES } from '../i18n/routes';

export const GET: APIRoute = async () => {
  const reportes = REPORTS.map((entry) => {
    const meta = loadReport(entry.slug).meta;
    // "Actualizado" es la fecha más reciente entre el día del análisis y el
    // corte de los datos. Un reporte cuyos números se refrescaron ayer es
    // novedad aunque la tesis se escribiera hace un mes.
    const fechas = [meta.analysisDate, meta.dataAsOf].filter((d): d is string => typeof d === 'string' && !!d);
    const actualizado = fechas.sort().pop() || null;
    const enlaces: Record<string, string> = {};
    if (entry.page && entry.routeId) {
      for (const lang of LOCALES) enlaces[lang] = SITE + route(entry.routeId, lang);
    }
    return {
      slug: entry.slug,
      ticker: meta.ticker,
      name: meta.name,
      exchange: meta.exchange || null,
      status: meta.status || 'draft',
      version: meta.version || null,
      analysisDate: meta.analysisDate || null,
      dataAsOf: meta.dataAsOf || null,
      actualizado,
      // Sin página propia todavía: el hub lo lista como "qué viene", así que el
      // boletín no debe enlazarlo.
      tienePagina: !!entry.page,
      enlaces
    };
  }).sort((a, b) => String(b.actualizado || '').localeCompare(String(a.actualizado || '')));

  return new Response(JSON.stringify({ generadoEn: new Date().toISOString(), reportes }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
    }
  });
};
