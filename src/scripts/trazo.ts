// El trazado de las gráficas: la línea se dibuja de izquierda a derecha
// cuando la gráfica APARECE, una sola vez por carga.
//
// Este archivo no dibuja nada. Solo lleva el estado (`data-trazo` en la raíz
// de cada gráfica) y decide CUÁNDO empieza; el movimiento entero vive en
// src/styles/trazo.css, que es lo barato: `stroke-dashoffset` en las gráficas
// de SVG propio y un destape con `clip-path` sobre el lienzo de Lightweight
// Charts, que al ser un <canvas> no tiene línea que alargar.
//
// Tres estados y ya:
//   espera → la línea está escondida (guion completo), esperando a verse
//   va     → la transición corre; el relleno entra detrás, con su retraso
//   fin    → dibujada, sin reglas encima
//
// Reglas que este archivo hace cumplir:
//   · UNA vez por carga. Subir y bajar la página no vuelve a trazar nada.
//   · Solo si la gráfica está a la vista (IntersectionObserver compartido:
//     una lista de precios tiene treinta sparklines y no hacen falta treinta
//     observadores).
//   · Con `prefers-reduced-motion` no hay trazado: la gráfica aparece
//     dibujada. El estado ni se pone, y el CSS tampoco esconde nada (la regla
//     que esconde vive dentro de `prefers-reduced-motion: no-preference`).
//   · Al cambiar de rango se repite, pero más rápido: es la respuesta a un
//     toque, no una entrada.

/** La entrada: aparecer trazándose. */
export const ENTRADA = 600;
/** La respuesta a un toque (cambiar de rango). Más corta a propósito. */
export const TOQUE = 300;

export function menosMovimiento(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---- Un solo IntersectionObserver para todo el sitio ------------------------
const enCola = new WeakMap<Element, () => void>();
let observador: IntersectionObserver | null = null;

/**
 * Sobre QUÉ se observa.
 *
 * Un elemento al que se le está aplicando `clip-path` NUNCA intersecta: el
 * navegador cuenta el recorte al calcular el área visible, así que una gráfica
 * escondida con el destape sale con `intersectionRatio: 0` estando en mitad de
 * la pantalla — y como el trazado esperaba a verla, se quedaba escondida para
 * siempre. Se vio en /market: dieciocho sparklines a la vista, todas en
 * `espera` a los tres segundos. Por eso lo que se observa es el PADRE de la
 * gráfica destapada, que no lleva recorte. Las que se trazan con guion no
 * tienen este problema y se observan ellas mismas (observar al padre de un
 * panel entero sería casi siempre "a la vista", que es lo contrario de lo que
 * se quiere).
 */
function objetivo(el: Element): Element {
  return el.classList.contains('trazo-destape') && el.parentElement ? el.parentElement : el;
}

/** Llama a `fn` la primera vez que `el` se ve. Sin IO, llama y ya. */
export function alVerse(nodo: Element, fn: () => void): void {
  if (typeof IntersectionObserver === 'undefined') { fn(); return; }
  const el = objetivo(nodo);
  if (!observador) {
    observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        observador!.unobserve(e.target);
        const cb = enCola.get(e.target);
        enCola.delete(e.target);
        cb?.();
      }
    }, { threshold: 0.15 });
  }
  enCola.set(el, fn);
  observador.observe(el);
}

/** Deja de esperar a que `el` se vea (se destruyó, o el trazo ya no toca). */
export function olvidar(nodo: Element): void {
  const el = objetivo(nodo);
  enCola.delete(el);
  observador?.unobserve(el);
}

// ---- El estado -------------------------------------------------------------
const yaTrazadas = new WeakSet<Element>();
const relojes = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/** ¿Cuánto dura el trazado entero, línea + relleno? Para saber cuándo limpiar. */
const largo = (ms: number) => ms + 320;

function acabar(raiz: HTMLElement | SVGElement) {
  const t = relojes.get(raiz);
  if (t) { clearTimeout(t); relojes.delete(raiz); }
  raiz.dataset.trazo = 'fin';
}

function arrancar(raiz: HTMLElement | SVGElement, ms: number) {
  raiz.dataset.trazo = 'va';
  relojes.set(raiz, setTimeout(() => acabar(raiz), largo(ms)));
}

/**
 * Marca una gráfica para que se trace. `raiz` es el elemento que lleva
 * `data-trazo`: el propio <svg> en las sparklines, el <div> del panel de
 * precio. Lo que se mueve lo eligen las clases (`trazo-linea` la línea que se
 * dibuja, `trazo-luego` lo que entra detrás, `trazo-destape` lo que se
 * descubre de izquierda a derecha) y las reglas están en trazo.css.
 *
 * `rapido` es el cambio de rango: se repite el trazado, más corto, y sin
 * esperar a nada — quien tocó la pestaña está mirando la gráfica.
 * `alArrancar` avisa en el instante en que empieza, para lo que no puede ir
 * en CSS (el relleno del lienzo de Lightweight Charts).
 */
export function trazar(
  raiz: Element | null | undefined,
  opciones: { rapido?: boolean; alArrancar?: () => void } = {}
): void {
  if (!raiz) return;
  const el = raiz as HTMLElement | SVGElement;
  if (menosMovimiento()) { delete el.dataset.trazo; return; }
  const rapido = !!opciones.rapido;
  if (!rapido && yaTrazadas.has(el)) return;
  yaTrazadas.add(el);

  // El guion se mide sobre `pathLength="1"`, así que el largo de la línea no
  // se le pregunta al navegador (getTotalLength() es una lectura de layout por
  // gráfica, y aquí hay treinta). Las gráficas del build ya lo traen escrito;
  // esto es el cinturón para las que pinta el navegador.
  el.querySelectorAll('.trazo-linea').forEach((p) => {
    if (!p.hasAttribute('pathLength')) p.setAttribute('pathLength', '1');
  });

  const ms = rapido ? TOQUE : ENTRADA;
  el.style.setProperty('--trazo-dur', ms + 'ms');
  const t = relojes.get(el);
  if (t) clearTimeout(t);
  el.dataset.trazo = 'espera';

  const empezar = () => {
    if (el.dataset.trazo !== 'espera') return;   // lo cortaron mientras esperaba
    arrancar(el, ms);
    opciones.alArrancar?.();
  };
  if (rapido) {
    olvidar(el);   // si la entrada seguía esperando a verse, ya no toca
    // Dos fotogramas: el navegador tiene que haber calculado el estado
    // escondido antes de cambiarlo, o la transición no existe.
    requestAnimationFrame(() => requestAnimationFrame(empezar));
    return;
  }
  alVerse(el, empezar);
}

/** Corta el trazado y deja la gráfica dibujada (el usuario tiene prisa). */
export function cortar(raiz: Element | null | undefined): void {
  if (!raiz) return;
  const el = raiz as HTMLElement | SVGElement;
  if (!el.dataset.trazo || el.dataset.trazo === 'fin') return;
  olvidar(el);
  acabar(el);
}
