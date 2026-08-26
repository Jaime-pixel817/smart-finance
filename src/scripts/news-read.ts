// Pinta una noticia aprobada que todavía no tiene página estática.
//
// El slug sale de la URL, no de un parámetro: la reescritura de vercel.json
// mantiene /news/<slug> en la barra del navegador, así que compartir el enlace
// funciona igual antes y después del despliegue que genera la página de verdad.
import { historia, texto, type NoticiaAPI, type Contexto, type LeccionUI, type TerminoUI } from './news-shared';
import { aplicarMercados, type ActivoUI } from './news-markets';
import type { Loc } from './format';

const raiz = document.getElementById('news-read');
if (raiz) arrancar(raiz);

function arrancar(raiz: HTMLElement) {
  const loc = (raiz.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const base = raiz.dataset.base || '/news/';
  const listaActivos = JSON.parse(raiz.dataset.activos || '[]') as ActivoUI[];

  const ctx: Contexto = {
    loc,
    t: JSON.parse(raiz.dataset.strings || '{}') as Record<string, string>,
    activos: Object.fromEntries(listaActivos.map((a) => [a.id, a])),
    lecciones: JSON.parse(raiz.dataset.lecciones || '{}') as Record<string, LeccionUI>,
    glosario: JSON.parse(raiz.dataset.glosario || '{}') as Record<string, TerminoUI>,
    href: (slug) => base + slug
  };

  const esqueleto = document.getElementById('nw-read-skel')!;
  const salida = document.getElementById('nw-read-out')!;
  const noEsta = document.getElementById('nw-read-404')!;
  const error = document.getElementById('nw-read-error')!;
  const mostrar = (el: HTMLElement) => {
    esqueleto.hidden = true;
    for (const otro of [salida, noEsta, error]) otro.hidden = otro !== el;
  };

  // /news/mi-slug → "mi-slug". Se ignora todo lo que no sea el último tramo.
  const slug = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop() || '');

  fetch('/api/news?estado=aprobadas', { headers: { accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((d) => {
      const items = (d && Array.isArray(d.items) ? d.items : []) as NoticiaAPI[];
      const n = items.find((x) => x.slug === slug);
      if (!n) { mostrar(noEsta); return; }

      const art = historia(n, ctx);
      const volver = document.createElement('a');
      volver.className = 'btn btn-ghost btn-sm nw-back';
      volver.href = raiz.dataset.index || '/news';
      volver.textContent = '← ' + (ctx.t.all || 'News');
      art.appendChild(volver);

      salida.innerHTML = '';
      salida.appendChild(art);
      mostrar(salida);

      // Ya se sabe QUÉ noticia se pintó: la selección de texto ("Explícame
      // esto", src/scripts/ia.ts) necesita el id para pedirle al servidor los
      // datos de ESTA noticia y no de otra.
      salida.dataset.iaId = n.slug;
      salida.dataset.iaSobre = texto(n, loc).titulo;

      // La pestaña y el enlace canónico pasan a ser los de esta noticia: la
      // URL ya es la definitiva, solo faltaba que el <head> lo dijera.
      const titulo = texto(n, loc).titulo;
      document.title = titulo + ' — Smart Finance';
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical) canonical.href = location.origin + location.pathname;
      const alterna = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="' + loc + '"]');
      if (alterna) alterna.href = location.origin + location.pathname;

      aplicarMercados(art, loc, listaActivos);
    })
    .catch(() => mostrar(error));
}
