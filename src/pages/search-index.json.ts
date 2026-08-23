// Índice de búsqueda estático (/search-index.json) generado en el build desde
// el registro de símbolos, la colección de lecciones, el glosario y las rutas.
// Mismo formato que lee src/components/SearchOverlay.astro:
// { t, name, sym?, keys?, href, lang }.
import type { APIRoute } from 'astro';
import { SYMBOLS, assetRouteId } from '../data/symbols';
import { getLessons } from '../data/lessons';
import { NEWS, newsRouteId } from '../data/news';
import glossary from '../data/glossary.json';
import { LOCALES, route, type Locale } from '../i18n/routes';
import { ui } from '../i18n/ui';
import { PAGED_REPORTS, loadReport } from '../lib/research/reports';

type Item = { t: 'asset' | 'news' | 'lesson' | 'term' | 'tool' | 'page'; name: string; sym?: string; keys?: string; href: string; lang: Locale };

export const GET: APIRoute = async () => {
  const items: Item[] = [];
  for (const lang of LOCALES) {
    const t = ui[lang];
    const other: Locale = lang === 'en' ? 'es' : 'en';
    for (const s of SYMBOLS) {
      const href = s.kind === 'rate' ? route('market', lang) + '#rate' : route(assetRouteId(s.id), lang);
      const keys = [s.name[other], s.sym.replace('/', ''), t[('kind.' + s.kind) as keyof typeof t], s.keys || ''].filter(Boolean).join(' ');
      items.push({ t: 'asset', name: s.name[lang], sym: s.sym, keys, href, lang });
    }
    const lessons = await getLessons(lang);
    for (const l of lessons) {
      items.push({ t: 'lesson', name: l.entry.data.title, keys: l.entry.data.description + ' ' + l.path.name[lang], href: l.href, lang });
    }
    // Noticias publicadas: solo las que tienen página propia. Las aprobadas que
    // todavía no están en el repo se leen en /news, que sí está en el índice.
    for (const n of NEWS) {
      items.push({
        t: 'news', name: n[lang].titulo,
        keys: n[lang].que.slice(0, 160) + ' ' + n.fuente.nombre + ' ' + t[('news.tema.' + n.tema) as keyof typeof t],
        href: route(newsRouteId(n.slug), lang), lang
      });
    }
    for (const g of glossary) {
      items.push({ t: 'term', name: g[lang].term, keys: g[other].term + ' ' + g[lang].def, href: route('lessons.glossary', lang) + '#term-' + g.id, lang });
    }
    items.push({ t: 'tool', name: t['tools.compound'], keys: t['tools.compound.desc'] + (lang === 'es' ? ' calculadora ahorro mensual aportes' : ' calculator monthly saving contributions'), href: route('tool.interes', lang), lang });
    items.push({ t: 'tool', name: t['tools.inflation'], keys: t['tools.inflation.desc'] + (lang === 'es' ? ' poder adquisitivo precios calculadora' : ' purchasing power prices calculator'), href: route('tool.inflacion', lang), lang });
    items.push({ t: 'tool', name: t['tools.cetes'], keys: t['tools.cetes.desc'] + (lang === 'es' ? ' cetes cuenta banco rendimiento real ahorro' : ' cetes bank account real return savings'), href: route('tool.cetes', lang), lang });
    items.push({ t: 'page', name: t['tools.h1'], keys: lang === 'es' ? 'herramientas calculadoras' : 'tools calculators', href: route('tools', lang), lang });
    items.push({ t: 'tool', name: t['reto.h1'], keys: t['reto.card.desc'] + (lang === 'es' ? ' reto diario juego quiz gráfica ciega adivinar mercado racha' : ' daily challenge game quiz blind chart guess market streak'), href: route('challenge', lang), lang });
    items.push({ t: 'page', name: t['nav.today'], keys: lang === 'es' ? 'inicio pulso historia home' : 'home pulse story', href: route('home', lang), lang });
    items.push({ t: 'page', name: t['mkt.title'], keys: lang === 'es' ? 'gráficas divisas cripto vix charts' : 'charts fx crypto vix', href: route('market', lang), lang });
    items.push({ t: 'tool', name: t['cmp.title'], keys: lang === 'es' ? 'comparar activos dos tres gráfica base 100 normalizar rendimiento' : 'compare assets two three chart base 100 normalise performance', href: route('market.compare', lang), lang });
    items.push({ t: 'page', name: t['news.h1'], keys: lang === 'es' ? 'noticias explicadas titulares hoy actualidad' : 'news explained headlines today', href: route('news', lang), lang });
    items.push({ t: 'page', name: t['learn.h1'], keys: lang === 'es' ? 'aprende lecciones rutas' : 'learn lessons paths', href: route('lessons', lang), lang });
    items.push({ t: 'page', name: t['glossary.h1'], keys: lang === 'es' ? 'glosario términos definiciones' : 'glossary terms definitions', href: route('lessons.glossary', lang), lang });
    items.push({ t: 'page', name: t['nav.about'], keys: lang === 'es' ? 'Jaime Sandoval quién hace esto contacto' : 'Jaime Sandoval who makes this contact', href: route('about', lang), lang });
    items.push({ t: 'page', name: t['footer.community'], keys: lang === 'es' ? 'comunidad estudiantil grupo bolsa mexicana de valores talleres voluntariado' : 'student community group mexican stock exchange workshops volunteering', href: route('community', lang), lang });
    items.push({ t: 'page', name: t['nav.methodology'], keys: lang === 'es' ? 'metodología fuentes datos IA correcciones' : 'methodology sources data AI corrections', href: route('methodology', lang), lang });
    items.push({ t: 'page', name: t['nav.newsletter'], keys: lang === 'es' ? 'suscribirme correo boletín números anteriores archivo semanal' : 'subscribe email weekly past issues archive', href: route('newsletter', lang), lang });
    items.push({ t: 'page', name: t['research.title'], keys: lang === 'es' ? 'research reportes acciones DCF valuación fuentes' : 'research reports equity DCF valuation sources', href: route('research', lang), lang });
    items.push({
      t: 'page', name: t['nav.portfolio'],
      keys: lang === 'es' ? 'portafolio posiciones tesis cartera personal acciones qué tengo' : 'portfolio positions thesis holdings what I own',
      href: route('portfolio', lang), lang
    });
    items.push({
      t: 'page', name: t['nav.actinver'],
      keys: lang === 'es' ? 'reto actinver concurso simulador bolsa estudiantes cartera dinero ficticio BMV' : 'actinver challenge contest simulator student stock market portfolio fictional money',
      href: route('actinver', lang), lang
    });
    for (const rep of PAGED_REPORTS) {
      const meta = loadReport(rep.slug).meta;
      items.push({ t: 'page', name: meta.name, sym: meta.ticker, keys: rep.ticker + ' ' + (lang === 'es' ? 'reporte equity research DCF valuación' : 'equity research report DCF valuation'), href: route(rep.routeId, lang), lang });
    }
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
