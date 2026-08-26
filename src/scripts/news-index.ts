// El índice /news y /es/noticias.
//
// El sitio es estático, así que estas tarjetas no salen del build: se piden a
// /api/news?estado=aprobadas y se pintan aquí. Es lo que permite que una
// noticia aprobada desde el teléfono a las 8:00 esté en la página a las 8:01
// sin desplegar nada.
//
// Sin salto de contenido: el HTML ya trae tres tarjetas esqueleto de la misma
// altura que las de verdad, y lo último conocido se guarda en localStorage para
// pintar al instante en la siguiente visita (mismo patrón que el home).
import { tarjeta, texto, esc, type NoticiaAPI, type Contexto } from './news-shared';
import { aplicarMercados, type ActivoUI } from './news-markets';
import type { Loc } from './format';
import './tabs'; // marca deslizante de los chips/pestañas de esta página

const raiz = document.getElementById('news-page');
if (raiz) arrancar(raiz);

function arrancar(raiz: HTMLElement) {
  const loc = (raiz.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const t = JSON.parse(raiz.dataset.strings || '{}') as Record<string, string>;
  const listaActivos = JSON.parse(raiz.dataset.activos || '[]') as ActivoUI[];
  const base = raiz.dataset.base || '/news/';

  const ctx: Contexto = {
    loc, t,
    activos: Object.fromEntries(listaActivos.map((a) => [a.id, a])),
    href: (slug) => base + slug
  };

  const lista = raiz.querySelector<HTMLElement>('#nw-list')!;
  const vacio = raiz.querySelector<HTMLElement>('#nw-empty')!;
  const vacioFiltro = raiz.querySelector<HTMLElement>('#nw-empty-filter')!;
  const error = raiz.querySelector<HTMLElement>('#nw-error')!;
  const semana = raiz.querySelector<HTMLElement>('#nw-week');
  const chipFuente = raiz.querySelector<HTMLElement>('#chip-news');

  let noticias: NoticiaAPI[] = [];
  let filtro = 'all';

  // ---- Caché local: pinta lo último conocido y luego refresca --------------
  const LS = 'sf-news-cache-v1';
  const leerCache = (): NoticiaAPI[] | null => {
    try {
      const d = JSON.parse(localStorage.getItem(LS) || 'null');
      return d && Array.isArray(d.items) && d.loc === loc ? d.items : null;
    } catch { return null; }
  };
  const guardarCache = (items: NoticiaAPI[]) => {
    try { localStorage.setItem(LS, JSON.stringify({ items, loc, at: Date.now() })); } catch { /* modo privado */ }
  };

  // ---- Pintado ------------------------------------------------------------
  function pintar(items: NoticiaAPI[], deCache: boolean) {
    noticias = items;
    lista.innerHTML = '';
    for (const n of items) lista.appendChild(tarjeta(n, ctx));
    lista.dataset.estado = 'listo';
    error.hidden = true;
    vacio.hidden = items.length > 0;
    aplicarFiltro();
    pintarSemana();
    aplicarMercados(lista, loc, listaActivos);
    if (chipFuente) {
      chipFuente.dataset.fresh = deCache ? 'stale' : 'fresh';
      const hora = chipFuente.querySelector('.sc-time');
      if (hora) hora.textContent = items.length ? String(items.length) + ' ' + t.count : t.none;
    }
    // Estas tarjetas no existen hasta aquí: son las que traen los chips de
    // activo, y hay un aviso contextual que solo tiene sentido cuando están
    // puestas (src/lib/avisos/avisos.mjs). Se avisa en vez de que el motor
    // ande sondeando el DOM.
    document.dispatchEvent(new CustomEvent('sf:avisos'));
  }

  function aplicarFiltro() {
    let visibles = 0;
    for (const li of Array.from(lista.children) as HTMLElement[]) {
      const ok = filtro === 'all' || li.dataset.tema === filtro;
      li.hidden = !ok;
      if (ok) visibles++;
    }
    vacioFiltro.hidden = !(noticias.length > 0 && visibles === 0);
  }

  for (const boton of Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-filter]'))) {
    boton.addEventListener('click', () => {
      filtro = boton.dataset.filter!;
      for (const b of Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-filter]'))) {
        b.setAttribute('aria-pressed', String(b === boton));
      }
      aplicarFiltro();
    });
  }

  // ---- "La semana en 5 puntos" -------------------------------------------
  // Solo el fin de semana, y solo si de verdad hubo semana: con una noticia
  // suelta el resumen sobra y además miente sobre cuánto se publicó.
  function pintarSemana() {
    if (!semana) return;
    const dia = new Date().getDay();
    const finDeSemana = dia === 0 || dia === 6;
    const hace7 = Date.now() - 7 * 86400000;
    const dela = noticias.filter((n) => new Date(n.fuente.publicado).getTime() >= hace7).slice(0, 5);
    if (!finDeSemana || dela.length < 2) { semana.hidden = true; return; }
    const ol = semana.querySelector('ol')!;
    ol.innerHTML = dela
      .map((n) => `<li><a href="${esc(ctx.href(n.slug))}">${esc(texto(n, loc).titulo)}</a></li>`)
      .join('');
    semana.hidden = false;
  }

  // ---- Datos --------------------------------------------------------------
  const cache = leerCache();
  if (cache && cache.length) pintar(cache, true);

  fetch('/api/news?estado=aprobadas', { headers: { accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((d) => {
      const items = (d && Array.isArray(d.items) ? d.items : []) as NoticiaAPI[];
      pintar(items, false);
      guardarCache(items);
    })
    .catch(() => {
      if (cache && cache.length) return;   // ya hay algo en pantalla
      lista.innerHTML = '';
      lista.dataset.estado = 'error';
      vacio.hidden = true;
      error.hidden = false;
      if (chipFuente) {
        chipFuente.dataset.fresh = 'error';
        const hora = chipFuente.querySelector('.sc-time');
        if (hora) hora.textContent = t.unavailable;
      }
    });
}
