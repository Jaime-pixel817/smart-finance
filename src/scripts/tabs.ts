// La marca de selección de un grupo de pestañas o de chips: UNA sola, que se
// desliza de una a otra.
//
// Antes cada pestaña pintaba su propio fondo y la marca desaparecía de un sitio
// y aparecía en otro. Se lee distinto: si la marca viaja, el ojo la sigue y sabe
// de dónde vino; si salta, hay que volver a buscarla.
//
// GENÉRICO A PROPÓSITO: no sabe qué grupos hay. Cualquier contenedor con
// `data-slide` cuyo hijo seleccionado se marque con `aria-selected="true"` o
// `aria-pressed="true"` funciona. Este archivo solo MIDE y escribe cuatro
// variables (--tab-x/-y/-w/-h); la forma, el color y la curva están en
// src/styles/motion.css, con el resto del movimiento.
//
// SIN GUION SE VE COMO SIEMPRE: la marca nace con `--tab-w: 0`, o sea sin
// pintar, y cada componente conserva el color de texto de su pestaña activa.
//
// El primer posicionamiento NO se desliza (`data-slide-init`): una marca que
// entrara volando desde la izquierda al cargar la página sería justo el tipo de
// animación de bienvenida que este sistema no quiere.

const SEL = '[aria-selected="true"], [aria-pressed="true"]';

function medir(g: HTMLElement) {
  const sel = g.querySelector<HTMLElement>(SEL);
  if (!sel || sel.hidden) { g.style.setProperty('--tab-w', '0'); return; }
  g.style.setProperty('--tab-x', sel.offsetLeft + 'px');
  g.style.setProperty('--tab-y', sel.offsetTop + 'px');
  g.style.setProperty('--tab-w', sel.offsetWidth + 'px');
  g.style.setProperty('--tab-h', sel.offsetHeight + 'px');
}

function montar(g: HTMLElement) {
  g.setAttribute('data-slide-init', '');
  medir(g);
  // Dos fotogramas: el primero pinta la marca ya colocada, el segundo le
  // devuelve la transición. Con uno solo, Chrome todavía no ha pintado y el
  // primer movimiento de verdad sale sin animar.
  requestAnimationFrame(() => requestAnimationFrame(() => g.removeAttribute('data-slide-init')));

  // Quién la mueve: el componente, cambiando aria-selected / aria-pressed.
  // No hace falta que nadie avise.
  new MutationObserver(() => medir(g)).observe(g, {
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-selected', 'aria-pressed', 'hidden']
  });
  // Y el ancho de una pestaña cambia cuando cambia el ancho de la ventana o
  // cuando por fin llega la tipografía buena.
  if ('ResizeObserver' in window) new ResizeObserver(() => medir(g)).observe(g);
  document.fonts?.ready.then(() => medir(g)).catch(() => {});
}

document.querySelectorAll<HTMLElement>('[data-slide]').forEach(montar);
