// EL RAÍL SIGUE AL LECTOR — y es lo más barato de la página a propósito.
//
// Corre todo el rato (mientras se hace scroll por 33 000 px), así que no puede
// costar nada: `IntersectionObserver` puro, CERO `requestAnimationFrame` y
// CERO lecturas de layout. docs.stripe mide 0 px de movimiento de su cromo con
// `scrollTop = 1200`; aquí el raíl tampoco se mueve: solo cambian sus marcas.
//
// DOS COSAS QUE HACE Y QUE NO SE VEN:
//  · ENCIENDE EL RAÍL cuando la tapa sale de pantalla. Sobre la portada —que
//    es a sangre y oscura— un raíl de tinta negra no se leería, y encima
//    competiría con el índice que ya está ahí escrito.
//  · MARCA EL ÚLTIMO CAPÍTULO QUE CRUZÓ EL TERCIO SUPERIOR, no «el que más se
//    ve». Con capítulos de alturas muy distintas, «el que más se ve» salta
//    hacia atrás cuando uno corto entra debajo de uno largo.
// HAY DOS RAÍLES EN EL DOCUMENTO, uno por idioma, igual que hay dos paneles.
// `querySelector` a secas solo cableaba el inglés y el panel español se
// quedaba sin raíl — el mismo tropiezo que `CLAUDE.md` ya tiene apuntado para
// las mediciones («`querySelectorAll('.cap')` devuelve 22»).
document.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
  const enlaces = new Map<string, HTMLElement>();
  rail.querySelectorAll<HTMLElement>('[data-rail-a]').forEach((a) => {
    enlaces.set(a.dataset.railA || '', a);
  });

  // El panel visible es el del idioma activo; el otro está escondido y sus
  // anclas no cruzan nada, así que no hay que filtrarlo a mano.
  const anclas: HTMLElement[] = [];
  enlaces.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) anclas.push(el);
  });

  let actual = '';
  const marca = (id: string) => {
    if (id === actual) return;
    if (actual) enlaces.get(actual)?.removeAttribute('aria-current');
    actual = id;
    enlaces.get(id)?.setAttribute('aria-current', 'true');
  };

  // `rootMargin` recorta la ventana al tercio superior: lo que cruza esa
  // banda es «donde va leyendo», no lo que asoma por abajo.
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) marca(e.target.id);
  }, { rootMargin: '0px 0px -67% 0px', threshold: 0 });
  anclas.forEach((a) => io.observe(a));

  // ── ENCENDER Y APAGAR CON LA TAPA ─────────────────────────────────────
  // EL CENTINELA ES LA TAPA, no el ancla del capítulo 2, y la diferencia no
  // es de estilo: `IntersectionObserver` solo avisa cuando CAMBIA el estado
  // de intersección. Con el ancla del capítulo 2 de centinela, un salto de
  // scroll la lleva de «debajo de la pantalla, sin intersecar» a «encima de
  // la pantalla, sin intersecar» —que NO es un cambio— y el raíl no se
  // encendía nunca. Medido: `data-rail-on` seguía en `false` a 14 000 px de
  // scroll, con el resaltado del capítulo actual funcionando perfectamente al
  // lado. Es un bug que no se ve mirando el código: hay que mirar la página.
  // La TAPA sí intersecta al cargar, así que su salida SÍ es un cambio.
  const tapa = rail.parentElement?.querySelector('.cap-portada');
  if (tapa) {
    new IntersectionObserver((ents) => {
      for (const e of ents) rail.toggleAttribute('data-rail-on', !e.isIntersecting);
      rail.hidden = !rail.hasAttribute('data-rail-on');
    }, { threshold: 0 }).observe(tapa);
  }
});
