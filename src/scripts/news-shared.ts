// Piezas que comparten el índice de noticias y la página de lectura.
//
// Las dos pintan lo mismo en el navegador desde /api/news?estado=aprobadas: el
// índice en tarjetas compactas y la lectura completa. Tener el HTML en un solo
// sitio evita que una tarjeta y su noticia digan cosas distintas.
//
// Todo lo que viene del endpoint se escapa antes de entrar al HTML. Es texto
// nuestro y revisado por una persona, pero un almacén compartido no es un sitio
// donde confiar por costumbre.
import { fmtDay, fmtTime24, type Loc } from './format';
import type { ActivoUI } from './news-markets';

export interface TextoNoticia { titulo: string; que: string; porque: string; impacto: string }

/** Lo que devuelve /api/news?estado=aprobadas por noticia. */
export interface NoticiaAPI {
  id: string;
  slug: string;
  tema: string;
  fuente: { nombre: string; titular: string; url: string; publicado: string };
  simbolos: string[];
  principal: string | null;
  leccion: string | null;
  terminos: string[];
  autoria: 'ia-revisada' | 'humana';
  revisadoPor: string | null;
  revisadoEn: string | null;
  en: TextoNoticia;
  es: TextoNoticia;
}

export interface TerminoUI { term: string; def: string; pesos: string; href: string }
export interface LeccionUI { titulo: string; href: string }

export interface Contexto {
  loc: Loc;
  t: Record<string, string>;
  /** Activos del sitio, por id (src/data/symbols.ts). */
  activos: Record<string, ActivoUI>;
  /** Lecciones por id de ruta. Solo lo necesita la página de lectura. */
  lecciones?: Record<string, LeccionUI>;
  /** Glosario del idioma, por id. Solo lo necesita la página de lectura. */
  glosario?: Record<string, TerminoUI>;
  /** slug → URL de la noticia en el idioma de la página. */
  href: (slug: string) => string;
}

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function texto(n: NoticiaAPI, loc: Loc): TextoNoticia { return n[loc] || n.en; }

/** "Macro · Sáb 22 ago 13:00 · Bloomberg" */
export function kicker(n: NoticiaAPI, ctx: Contexto): string {
  const d = new Date(n.fuente.publicado);
  const cuando = isNaN(d.getTime()) ? '' : fmtDay(d, ctx.loc) + ' ' + fmtTime24(d, ctx.loc);
  return [ctx.t['tema.' + n.tema] || n.tema, cuando, n.fuente.nombre]
    .filter(Boolean)
    .map((p) => `<span>${esc(p)}</span>`)
    .join(' <span aria-hidden="true">·</span> ');
}

/** El chip de autoría: quién escribió esto y quién lo revisó. */
export function chipAutoria(n: NoticiaAPI, ctx: Contexto): string {
  const humana = n.autoria === 'humana';
  return `<span class="chip chip-ia" data-autoria="${esc(n.autoria)}">${esc(humana ? ctx.t.human : ctx.t.ai)}</span>`;
}

/** Chips de los activos que toca la noticia. El Δ lo rellena news-markets.ts. */
export function chipsActivos(n: NoticiaAPI, ctx: Contexto): string {
  return (n.simbolos || [])
    .map((id) => ctx.activos[id])
    .filter(Boolean)
    .map((a) => `<a class="chip chip-activo" href="${esc(a.href)}" data-activo="${esc(a.id)}" data-estado="cargando">` +
      `${esc(a.sym)} <span class="num"></span></a>`)
    .join('');
}

// ---- Tarjeta compacta del índice -----------------------------------------

export function tarjeta(n: NoticiaAPI, ctx: Contexto): HTMLElement {
  const t = texto(n, ctx.loc);
  const li = document.createElement('li');
  li.className = 'nw-card';
  li.dataset.tema = n.tema;
  li.innerHTML = [
    `<article class="card">`,
    `<p class="kicker eyebrow">${kicker(n, ctx)}</p>`,
    // h2 y no h3: debajo del h1 de la página no hay ningún nivel intermedio, y
    // saltarse uno es justo lo que Lighthouse marca como heading-order.
    `<h2 class="nw-title"><a href="${esc(ctx.href(n.slug))}">${esc(t.titulo)}</a></h2>`,
    `<p class="nw-que t-small muted">${esc(t.que)}</p>`,
    `<div class="nw-chips">${chipAutoria(n, ctx)}${chipsActivos(n, ctx)}</div>`,
    `</article>`
  ].join('');
  return li;
}

// ---- Noticia completa (página de lectura) --------------------------------

function bloque(etiqueta: string, cuerpo: string): string {
  return `<div class="nw-block"><p class="nw-label eyebrow">${esc(etiqueta)}</p><p class="nw-text">${esc(cuerpo)}</p></div>`;
}

/** Botón de glosario idéntico al que genera <Term> en el build. */
function termino(id: string, ctx: Contexto): string {
  const g = ctx.glosario && ctx.glosario[id];
  if (!g) return '';
  return `<button type="button" class="term" data-term="${esc(id)}" data-term-name="${esc(g.term)}" ` +
    `data-term-def="${esc(g.def)}" data-term-pesos="${esc(g.pesos)}" data-term-href="${esc(g.href)}" ` +
    `aria-haspopup="dialog">${esc(g.term)}</button>`;
}

export function historia(n: NoticiaAPI, ctx: Contexto): HTMLElement {
  const t = texto(n, ctx.loc);
  const d = new Date(n.fuente.publicado);
  const art = document.createElement('article');
  art.className = 'nw-story';

  const principal = n.principal && ctx.activos[n.principal];
  const leccion = n.leccion && ctx.lecciones && ctx.lecciones[n.leccion];
  const terminos = (n.terminos || []).map((id) => termino(id, ctx)).filter(Boolean);

  art.innerHTML = [
    `<p class="kicker eyebrow">${kicker(n, ctx)}</p>`,
    `<div class="nw-chips">${chipAutoria(n, ctx)}</div>`,
    `<h1 class="t-display nw-h1">${esc(t.titulo)}</h1>`,
    bloque(ctx.t.what, t.que),
    bloque(ctx.t.why, t.porque),
    `<section class="nw-impact" aria-label="${esc(ctx.t.impact)}">`,
    `<p class="nw-label eyebrow">${esc(ctx.t.impact)}</p>`,
    `<p class="nw-text">${esc(t.impacto)}</p>`,
    n.simbolos && n.simbolos.length ? `<div class="nw-chips">${chipsActivos(n, ctx)}</div>` : '',
    principal
      ? `<figure class="nw-spark"><svg class="spark skel" data-spark="${esc(principal.id)}" viewBox="0 0 240 64" ` +
        `preserveAspectRatio="none" role="img" aria-label="${esc(principal.sym + ' — ' + ctx.t.spark)}">` +
        `<path class="fill" d=""/><path class="line" d=""/></svg>` +
        `<figcaption class="t-caption faint">${esc(principal.sym)} <span aria-hidden="true">·</span> ${esc(ctx.t.sparkNote)}</figcaption></figure>`
      : '',
    `</section>`,
    leccion || terminos.length
      ? `<section class="nw-learn" aria-label="${esc(ctx.t.learn)}">` +
        `<p class="nw-label eyebrow">${esc(ctx.t.learn)}</p>` +
        (leccion ? `<a class="card card-link nw-lesson" href="${esc(leccion.href)}"><span class="t-small">${esc(leccion.titulo)}</span>` +
          `<span class="t-caption faint">${esc(ctx.t.lesson)} →</span></a>` : '') +
        (terminos.length ? `<p class="nw-terms t-small muted">${esc(ctx.t.terms)}: ${terminos.join(', ')}</p>` : '') +
        `</section>`
      : '',
    `<footer class="nw-foot">`,
    `<p class="t-small"><a href="${esc(n.fuente.url)}" target="_blank" rel="noopener">${esc(ctx.t.read)}: ${esc(n.fuente.titular)} ↗</a></p>`,
    `<p class="t-caption faint">${esc(ctx.t.source)}: ${esc(n.fuente.nombre)} <span aria-hidden="true">·</span> ` +
      `${esc(isNaN(d.getTime()) ? '' : fmtDay(d, ctx.loc) + ' ' + fmtTime24(d, ctx.loc))}` +
      (n.revisadoPor ? ` <span aria-hidden="true">·</span> ${esc(ctx.t.reviewed)} ${esc(n.revisadoPor)}` : '') + `</p>`,
    `<details class="ai-disclosure"><summary class="t-caption">${esc(ctx.t.howMade)}</summary>` +
      `<p class="t-caption muted">${esc(n.autoria === 'humana' ? ctx.t.humanDisclosure : ctx.t.aiDisclosure)}</p></details>`,
    `<p class="t-caption faint nw-disclaimer">${esc(ctx.t.disclaimer)}</p>`,
    `</footer>`
  ].join('');
  return art;
}
