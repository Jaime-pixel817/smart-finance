// Los clips del CV narrativo: solo el que está A LA VISTA se mueve.
//
// Es la estrategia medida en la dirección creativa (docs/cv-historia): cuatro
// clips con póster y `preload="none"` pesan 57 KB; descargarlos y moverlos
// todos, 1 159 KB; descargar y mover SOLO el visible, 608 KB. Este módulo es
// la diferencia entre las dos últimas: observa los `<video data-en-vista>` y
// reproduce el que cruza el 60 % de visibilidad, pausando el que salió.
//
// Lo que este módulo NO hace, y es lo importante:
//   · No toca los vídeos sin `data-en-vista` (la entrevista de Raúl y el clip
//     del voluntariado llevan sonido y `controls`: los arranca una persona).
//   · No arranca nada con «menos movimiento» puesto: un vídeo en bucle es
//     movimiento, y la regla del sitio es que TODO se apaga.
//   · No esconde nada. Sin este módulo (o sin JavaScript) cada clip es un
//     <video controls> con su póster, que se reproduce a mano — medido en la
//     dirección: cero elementos invisibles sin JS.
//   · No quita los `controls`: un bucle que no se puede pausar rompe
//     WCAG 2.2.2, y el botón de pausa del navegador es la pausa.
//
// La página lleva DOS paneles (inglés y español) con los mismos clips: el
// observador cubre los de los dos, y como el panel escondido está en
// `display: none`, nunca interseca y nunca se reproduce.

const clips = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-en-vista]'));

if (clips.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) {
          // play() devuelve una promesa que puede rechazarse (p. ej. datos
          // que no llegan): un clip que no arranca se queda en póster, y eso
          // no es un error de la página.
          v.play().catch(() => { /* se queda el póster */ });
        } else if (!v.paused) {
          v.pause();
        }
      }
    },
    { threshold: 0.6 }
  );
  for (const v of clips) io.observe(v);
}
