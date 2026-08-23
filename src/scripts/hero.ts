// El hero del home: la barra que se vuelve sólida, el globo que aterriza en
// ella y las pastillas de cambio del día pegadas a los marcadores.
//
// TRES COSAS Y NINGUNA LIBRERÍA
//
// 1. LA BARRA. Un IntersectionObserver sobre un testigo de 1 px arriba del
//    hero. Mientras se ve, la barra está encima del globo y va transparente;
//    en cuanto se sale, se pone sólida. Cero listeners de scroll.
//
// 2. EL ATERRIZAJE. Lo hace el CSS con scroll-timeline (Hero.astro), que corre
//    en el compositor y no toca el hilo principal. Donde no lo hay, aquí se
//    calcula el MISMO transform con un scroll pasivo leído dentro de un rAF.
//    En los dos casos, un segundo IntersectionObserver avisa cuando el globo
//    ya aterrizó: entonces se esconde y se manda "globe:visible" para que
//    risk-sphere.js pare el bucle. Sin eso, el lienzo seguiría pintando a 60
//    fps detrás de una página que ya no lo enseña — es position:fixed y su
//    propio IntersectionObserver nunca lo daría por fuera de pantalla.
//
// 3. LAS PASTILLAS. Nueva York, Ciudad de México y la bolsa que más se mueva
//    llevan pegado su cambio del día. La posición la manda el globo por
//    "globe:pins" (ver risk-sphere.js) porque es el único que sabe dónde está
//    cada marcador ahora mismo; aquí solo se mueve un div con transform. Van
//    con aria-hidden: el mismo dato en texto está en la leyenda de ocho chips.
import { fmtPct, arrow, dirClass, type Loc } from './format';

const hero = document.querySelector<HTMLElement>('.hero');
const globo = document.getElementById('hero-globe');
if (hero && globo) boot(hero, globo);

type Item = { id: string; city: string; changePct: number | null };
type Pin = { id: string; x: number; y: number; on: boolean };

// Abreviaturas de ciudad, iguales en los dos idiomas: en una pastilla de 11 px
// "Ciudad de México" no cabe, y traducir tres letras no aporta nada.
const CORTO: Record<string, string> = {
  nyc: 'NY', yto: 'TOR', mex: 'CDMX', sao: 'SÃO', lon: 'LDN', fra: 'FRA', tyo: 'TYO', hkg: 'HK'
};

function boot(hero: HTMLElement, globo: HTMLElement) {
  const loc: Loc = document.documentElement.lang === 'es' ? 'es' : 'en';
  const topbar = document.querySelector<HTMLElement>('.topbar');
  const menos = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- 1. La barra sólida --------------------------------------------------
  const testigoTop = hero.querySelector('.hero-mark-top');
  if (topbar && testigoTop && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => topbar.classList.toggle('is-solid', !e.isIntersecting),
      { threshold: 0 }
    ).observe(testigoTop);
  }

  // ---- 2. El aterrizaje ----------------------------------------------------
  const testigoFin = hero.querySelector('.hero-mark-end');
  if (testigoFin && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const aterrizado = !e.isIntersecting && e.boundingClientRect.top < 0;
      globo.classList.toggle('is-parked', aterrizado);
      topbar?.classList.toggle('is-parked', aterrizado);
      document.dispatchEvent(new CustomEvent('globe:visible', { detail: { on: !aterrizado } }));
    }, { threshold: 0 }).observe(testigoFin);
  }

  // El respaldo del transform, solo donde no hay scroll-timeline y solo si no
  // se pidió menos movimiento (ahí el globo ni se mueve: se va con la página).
  const conTimeline = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && CSS.supports('animation-timeline', 'scroll()');
  if (!conTimeline && !menos.matches) {
    let pedido = false;
    const pintar = () => {
      pedido = false;
      const h = globo.offsetHeight || 1;
      // El recorrido es el alto del HERO (no el de la banda del globo, que
      // desde que el hero ocupa la primera pantalla entera son dos cosas
      // distintas), igual que animation-range en Hero.astro.
      const recorrido = (hero.offsetHeight || h) * 0.8;
      const t = Math.min(1, Math.max(0, window.scrollY / recorrido));
      // Mismos números que @keyframes hero-park, para que las dos rutas se
      // vean igual: centro del globo al hueco del ícono (28, 26) y escala 7.5 %.
      // El centro está en --globe-top + alto/2, y por eso hay que leer el top.
      const arriba = parseFloat(getComputedStyle(globo).top) || 0;
      const tx = t * (28 - window.innerWidth / 2);
      const ty = t * (26 - arriba - h / 2);
      const s = 1 + t * (0.075 - 1);
      globo.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      globo.style.opacity = String(t <= 0.7 ? 1 - 0.15 * (t / 0.7) : Math.max(0, 0.85 * (1 - (t - 0.7) / 0.3)));
    };
    addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(pintar); } }, { passive: true });
    addEventListener('resize', pintar);
    pintar();
  }

  // ---- Tocar una ciudad devuelve el globo ---------------------------------
  // La leyenda de ocho chips vive más abajo, y para cuando se llega a ella el
  // globo ya aterrizó en la barra. Encender el país de Canadá en un globo que
  // no se ve no sirve de nada: al seleccionar una bolsa la página vuelve
  // arriba. La tarjeta es position: fixed, así que no se pierde de vista
  // mientras sube. Con menos movimiento el salto es seco, sin deslizamiento.
  document.addEventListener('world:select', (e) => {
    const id = (e as CustomEvent<{ id?: string | null }>).detail?.id;
    if (!id || window.scrollY < 8) return;
    window.scrollTo({ top: 0, behavior: menos.matches ? 'auto' : 'smooth' });
  });

  // ---- El lienzo ya pinta: se apaga el SVG estático ------------------------
  //
  // EL ORDEN ES LO IMPORTANTE. risk-sphere.js manda "globe:ready" cuando ya
  // tiene el lienzo montado y va a empezar la entrada de partículas, y espera
  // --still-out ms antes de arrancarla. Así el SVG estático se va PRIMERO y la
  // entrada empieza sobre un fondo limpio: si se solaparan, lo que se vería es
  // el globo estático deshaciéndose en polvo, que es justo lo que no se quiere.
  // El MutationObserver se queda como respaldo por si el evento no llega (una
  // versión vieja del script en caché, por ejemplo).
  const host = document.getElementById('globalRiskGlobe');
  const encender = () => globo.classList.add('is-live');
  document.addEventListener('globe:ready', encender, { once: true });
  if (host) {
    if (host.querySelector('canvas')) encender();
    else if (typeof MutationObserver === 'function') {
      const mo = new MutationObserver(() => {
        if (!host.querySelector('canvas')) return;
        mo.disconnect();
        // Un par de frames de margen para que el primer render ya esté hecho
        // cuando el SVG empiece a irse: si no, se ve el hueco negro un instante.
        requestAnimationFrame(() => requestAnimationFrame(encender));
      });
      mo.observe(host, { childList: true });
    }
  }

  // ---- 3. Las pastillas ----------------------------------------------------
  const capa = document.getElementById('hero-pins');
  if (!capa) return;
  const pins = new Map<string, HTMLElement>();
  let elegidas: string[] = [];

  function elegir(items: Item[]): string[] {
    // Nueva York y Ciudad de México siempre (el lector está en México o en
    // Canadá y mira a Wall Street), más la que más se mueva de las demás.
    const fijas = ['nyc', 'mex'].filter((id) => items.some((it) => it.id === id));
    const resto = items
      .filter((it) => !fijas.includes(it.id) && typeof it.changePct === 'number')
      .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!));
    return resto.length ? [...fijas, resto[0].id] : fijas;
  }

  function pintarPins(items: Item[]) {
    const ids = elegir(items);
    if (ids.join() !== elegidas.join()) {
      elegidas = ids;
      capa!.textContent = '';
      pins.clear();
      for (const id of ids) {
        const el = document.createElement('span');
        el.className = 'pin';
        capa!.appendChild(el);
        pins.set(id, el);
      }
      // El globo se carga DIFERIDO: cuando llegan los datos puede que aún no
      // exista nadie escuchando "world:pins". Se deja también en un global,
      // igual que window.SmartWorld con los datos, y risk-sphere.js lo lee al
      // arrancar. Sin esto las pastillas se creaban y no se movían nunca.
      (window as any).SmartWorldPins = ids;
      document.dispatchEvent(new CustomEvent('world:pins', { detail: { ids } }));
    }
    for (const it of items) {
      const el = pins.get(it.id);
      if (!el) continue;
      const chg = it.changePct == null
        ? '<span class="flat">—</span>'
        : `<span class="${dirClass(it.changePct)}">${arrow(it.changePct)} ${fmtPct(it.changePct, loc)}</span>`;
      el.innerHTML = `<b>${CORTO[it.id] || it.id.toUpperCase()}</b> ${chg}`;
    }
  }

  document.addEventListener('world:data', (e) => {
    const items = (e as CustomEvent<{ items?: Item[] }>).detail?.items;
    if (items && items.length) pintarPins(items);
  });

  document.addEventListener('globe:pins', (e) => {
    const d = (e as CustomEvent<{ pins?: Pin[]; w?: number }>).detail;
    if (!d?.pins) return;
    const ancho = d.w || capa!.clientWidth;
    for (const p of d.pins) {
      const el = pins.get(p.id);
      if (!el) continue;
      // Se sujeta a los bordes para que la pastilla no se salga del lienzo, y
      // sube 16 px: la etiqueta va encima del punto, no tapándolo. Si arriba
      // no cabe —Toronto y Nueva York quedan bajo la barra superior— se pone
      // debajo del punto en vez de meterse detrás de la barra.
      const x = Math.min(Math.max(p.x, 52), ancho - 52);
      const barra = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 52;
      const arriba = p.y - 16 - 26 > barra + 6;
      el.style.transform = arriba
        ? `translate(${x.toFixed(1)}px, ${(p.y - 16).toFixed(1)}px) translate(-50%, -100%)`
        : `translate(${x.toFixed(1)}px, ${(p.y + 16).toFixed(1)}px) translate(-50%, 0)`;
      el.classList.toggle('on', p.on);
    }
  });
}
