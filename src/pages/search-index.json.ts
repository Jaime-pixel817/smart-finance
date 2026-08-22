// Índice de búsqueda estático (/search-index.json) generado en el build desde
// el registro de símbolos, las lecciones y las rutas: antes era un JSON a mano
// en public/ que había que recordar actualizar. Mismo formato que lee
// src/components/SearchOverlay.astro: { t, name, sym?, keys?, href, lang }.
import type { APIRoute } from 'astro';
import { SYMBOLS, assetRouteId } from '../data/symbols';
import { LESSONS } from '../data/home';
import { LOCALES, route, type Locale } from '../i18n/routes';
import { ui } from '../i18n/ui';

type Item = { t: 'asset' | 'lesson' | 'tool' | 'page'; name: string; sym?: string; keys?: string; href: string; lang: Locale };

export const GET: APIRoute = () => {
  const items: Item[] = [];
  for (const lang of LOCALES) {
    const t = ui[lang];
    const other: Locale = lang === 'en' ? 'es' : 'en';
    for (const s of SYMBOLS) {
      const href = s.kind === 'rate' ? route('market', lang) + '#rate' : route(assetRouteId(s.id), lang);
      const keys = [s.name[other], s.sym.replace('/', ''), t[('kind.' + s.kind) as keyof typeof t], s.keys || ''].filter(Boolean).join(' ');
      items.push({ t: 'asset', name: s.name[lang], sym: s.sym, keys, href, lang });
    }
    for (const l of LESSONS) {
      items.push({ t: 'lesson', name: t[l.titleKey], keys: t[l.descKey], href: route(l.id, lang), lang });
    }
    items.push({ t: 'tool', name: t['tools.compound'], keys: t['tools.compound.desc'], href: route('lesson.interes', lang), lang });
    items.push({ t: 'tool', name: t['tools.inflation'], keys: t['tools.inflation.desc'], href: route('lesson.inflacion', lang), lang });
    items.push({ t: 'page', name: t['nav.today'], keys: lang === 'es' ? 'inicio pulso historia home' : 'home pulse story', href: route('home', lang), lang });
    items.push({ t: 'page', name: t['mkt.title'], keys: lang === 'es' ? 'gráficas divisas cripto vix charts' : 'charts fx crypto vix', href: route('market', lang), lang });
    items.push({ t: 'page', name: t['learn.all'], keys: lang === 'es' ? 'aprende lecciones' : 'learn lessons', href: route('lessons', lang), lang });
    items.push({ t: 'page', name: t['nav.newsletter'], keys: lang === 'es' ? 'suscribirme correo boletín' : 'subscribe email', href: route('home', lang) + '#newsletter', lang });
    items.push({ t: 'page', name: t['research.title'], keys: 'LULU Lululemon equity report reporte', href: route('home', lang) + '#research', lang });
  }
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
