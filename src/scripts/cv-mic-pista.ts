// LA PISTA DE TARJETAS DEL MICRÓFONO — los mandos, y la rueda que se libera.
//
// El carrusel de conversaciones son diez tarjetas de 482 × 288 en una columna
// de 896 px: tres a la vista, 3 024 px de contenido. Este guion hace DOS cosas
// y ninguna de las dos es «el mecanismo»:
//
//  1. LIBERA LA RUEDA. Le pone `data-mic-pag` al carrusel y el CSS pasa la
//     pista a `overflow-y: hidden`. Sin esto, un scroller vertical de 896 px
//     metido en medio de un documento de 24 000 se come ~20 golpes de rueda de
//     quien solo quería seguir bajando, y el objetivo declarado de esta ola es
//     ORDENADOR. `overflow: hidden` no la vuelve inalcanzable: `scrollTop`
//     sigue funcionando, así que la mueven los botones, el tabulador (el
//     navegador desplaza la pista solo al enfocar una tarjeta de más abajo) y
//     los nodos del propio micrófono.
//     ⚠️ EL ORDEN IMPORTA: la marca se pone SOLO si se encontraron la pista y
//     los dos botones. Poniéndola antes, un marcado a medias dejaría una pista
//     con la rueda apagada y sin botones que la muevan — o sea nueve tarjetas
//     inalcanzables con ratón. Sin JavaScript no se pone nunca, y la pista se
//     desplaza sola con `overflow-y: auto`, que es lo que dice el CSS.
//
//  2. MUEVE LOS BOTONES Y PINTA LOS PUNTOS. Una parada = TRES tarjetas. La
//     última se recorta contra el final (`scrollTop` máximo), y eso es
//     deliberado: con páginas de tres exactas, diez tarjetas dejan una última
//     página con una tarjeta y dos huecos de 288 px — el vacío que este paso
//     viene a matar. Con el tope, la última parada enseña las tarjetas 8, 9 y
//     10 llenas.
//
// UN SOLO ESTADO. Todo sale de `scrollTop` (o de `scrollLeft` cuando la pista
// se pone horizontal por debajo de 1312 px): los puntos y los extremos se
// calculan al vuelo del evento `scroll`, nunca de un contador propio. Dos
// estados que hay que mantener a mano es como los puntos acaban señalando una
// tarjeta que no es la que se ve.
//
// `data-inerte` y no `disabled` en los extremos: deshabilitar un botón que
// tiene el foco lo suelta al body, y quien recorre con teclado pierde el sitio.
//
// La página lleva DOS paneles (inglés y español) con el mismo módulo: se
// enganchan los dos; el escondido está en `display: none`, sus medidas salen 0
// y no estorba — al mostrarse, el primer `scroll` recalcula.

const MENOS_MOV = matchMedia('(prefers-reduced-motion: reduce)');
const VISIBLES = 3;

for (const marco of document.querySelectorAll<HTMLElement>('[data-mic-carrusel]')) {
  const pista = marco.querySelector<HTMLElement>('[data-mic-pista]');
  const prev = marco.parentElement?.querySelector<HTMLButtonElement>('[data-mic-prev]');
  const next = marco.parentElement?.querySelector<HTMLButtonElement>('[data-mic-next]');
  const puntos = [...(marco.parentElement?.querySelectorAll<HTMLElement>('.mic-punto') ?? [])];
  if (!pista || !prev || !next) continue;

  // Solo AHORA se apaga la rueda: con los tres mandos encontrados.
  marco.setAttribute('data-mic-pag', '');

  /** La pista es vertical en escritorio y horizontal por debajo de 1312 px. */
  const vertical = () => getComputedStyle(pista).flexDirection === 'column';
  /** Un paso = una tarjeta con su canal. Se mide al pulsar, no al cargar: la
   *  tarjeta es de 482 × 288 clavados en escritorio, pero por debajo de 514 px
   *  de ventana se encoge para no desbordar. */
  const paso = () => {
    const t = pista.querySelector<HTMLElement>('.mic-t');
    const cs = getComputedStyle(pista);
    const hueco = parseFloat(vertical() ? cs.rowGap : cs.columnGap) || 16;
    if (!t) return (vertical() ? pista.clientHeight : pista.clientWidth) || 1;
    const r = t.getBoundingClientRect();
    return (vertical() ? r.height : r.width) + hueco;
  };
  const tope = () => (vertical()
    ? pista.scrollHeight - pista.clientHeight
    : pista.scrollWidth - pista.clientWidth);
  const donde = () => (vertical() ? pista.scrollTop : pista.scrollLeft);

  /** La última parada. Diez tarjetas de tres en tres son cuatro paradas, y la
   *  cuarta va recortada contra el final de la pista. */
  const ultima = () => Math.max(0, Math.ceil(pista.querySelectorAll('.mic-t').length / VISIBLES) - 1);
  /** EN QUÉ PARADA ESTAMOS. Una sola función, y la usan LOS DOS —los botones y
   *  los puntos—: si cada uno hiciera su cuenta acabarían discrepando justo en
   *  el sitio donde es más fácil equivocarse, que es el final.
   *  El final es especial y por eso se pregunta primero: la última parada no
   *  cae en `n · salto` sino en el tope del scroll (2 128 y no 2 736), así que
   *  redondear ahí devolvía 2 — y el botón «anterior» saltaba de la parada 4 a
   *  la 2, dejándose una por el camino. Medido en chromium y en webkit. */
  const pagina = () => {
    const salto = paso() * VISIBLES, max = tope(), pos = donde();
    if (max > 0 && pos >= max - 1) return ultima();
    return salto > 0 ? Math.max(0, Math.min(ultima(), Math.round(pos / salto))) : 0;
  };

  const ir = (dir: 1 | -1) => {
    const salto = paso() * VISIBLES;
    if (salto <= 0) return;
    const p = Math.max(0, Math.min(ultima(), pagina() + dir));
    const y = Math.max(0, Math.min(tope(), p * salto));
    const modo: ScrollBehavior = MENOS_MOV.matches ? 'auto' : 'smooth';
    pista.scrollTo(vertical() ? { top: y, behavior: modo } : { left: y, behavior: modo });
  };
  prev.addEventListener('click', () => ir(-1));
  next.addEventListener('click', () => ir(1));

  const estado = () => {
    const max = tope(), pos = donde();
    prev.toggleAttribute('data-inerte', pos <= 1);
    next.toggleAttribute('data-inerte', pos >= max - 1);
    if (!puntos.length) return;
    const i = pagina();
    puntos.forEach((d, k) => {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  };
  pista.addEventListener('scroll', estado, { passive: true });
  estado();
}
