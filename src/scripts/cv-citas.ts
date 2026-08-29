// Las flechas del carrusel de citas del CV (‹ ›): scrollBy sobre la lista con
// scroll-snap horizontal. Deliberadamente diminuto — el carrusel FUNCIONA sin
// esto (dedo, rueda, teclado con la lista enfocada): los botones son un
// atajo, no el mecanismo, y por eso sin JavaScript se esconden (la regla vive
// en el <noscript> de Cv.astro) en vez de quedarse muertos en pantalla.
//
// `data-inerte` y no `disabled` en los extremos: deshabilitar un botón que
// tiene el foco lo suelta al body, y quien recorre con teclado pierde el
// sitio. El botón inerte sigue enfocable y su clic simplemente no tiene ya
// nada que desplazar.
//
// La página lleva DOS paneles (inglés y español) con el mismo carrusel: se
// enganchan los dos; el escondido está en display:none y no estorba.

const RED = matchMedia('(prefers-reduced-motion: reduce)');

for (const marco of document.querySelectorAll<HTMLElement>('[data-citas]')) {
  const lista = marco.querySelector<HTMLElement>('.citas');
  const prev = marco.querySelector<HTMLButtonElement>('[data-citas-prev]');
  const next = marco.querySelector<HTMLButtonElement>('[data-citas-next]');
  if (!lista || !prev || !next) continue;

  // Un paso = una tarjeta con su hueco. Se mide al pulsar y no al cargar:
  // el ancho de la tarjeta es fluido (min(86%, 340px)).
  const paso = (): number => {
    const tarjeta = lista.querySelector<HTMLElement>('.cita');
    const hueco = parseFloat(getComputedStyle(lista).columnGap) || 16;
    return tarjeta ? tarjeta.getBoundingClientRect().width + hueco : lista.clientWidth * 0.9;
  };
  const mover = (dir: 1 | -1) =>
    lista.scrollBy({ left: dir * paso(), behavior: RED.matches ? 'auto' : 'smooth' });

  prev.addEventListener('click', () => mover(-1));
  next.addEventListener('click', () => mover(1));

  const estado = () => {
    const max = lista.scrollWidth - lista.clientWidth - 1;
    prev.toggleAttribute('data-inerte', lista.scrollLeft <= 0);
    next.toggleAttribute('data-inerte', lista.scrollLeft >= max);
  };
  lista.addEventListener('scroll', estado, { passive: true });
  estado();
}
