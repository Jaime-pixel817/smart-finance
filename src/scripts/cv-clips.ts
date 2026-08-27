// Los clips del CV narrativo: solo el que está A LA VISTA se mueve, y NUNCA
// uno que la persona haya parado.
//
// Es la estrategia medida en la dirección creativa (docs/cv-historia): cuatro
// clips con póster y `preload="none"` no descargan vídeo hasta que se cruza su
// capítulo; descargarlos y moverlos todos, 1 159 KB; descargar y mover SOLO el
// visible, 608 KB. Este módulo es la diferencia entre las dos últimas: observa
// los `<video data-en-vista>` y reproduce el que cruza el 60 % de visibilidad,
// pausando el que salió.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA PAUSA DE LA PERSONA MANDA, Y ESO ES LA MITAD DE ESTE ARCHIVO
// ═══════════════════════════════════════════════════════════════════════════
// Los `controls` nativos no bastan por sí solos. Este módulo llamaba a
// `play()` en cada `isIntersecting` sin mirar quién había parado el clip, así
// que la pausa duraba hasta el siguiente scroll: pausabas el clip de Singapur,
// subías, volvías a bajar y estaba corriendo otra vez. Un bucle de 15 s que
// vuelve solo es movimiento indefinido SIN mecanismo de pausa efectivo, o sea
// WCAG 2.2.2 roto — el botón existía, la pausa no sobrevivía.
//
// Ahora se distingue quién pidió cada cosa. Los eventos `play`/`pause` del
// navegador son idénticos los pida un dedo o un `play()` nuestro (no hay
// `isTrusted` que valga: los dispara el agente de usuario en los dos casos),
// así que se marca la llamada ANTES de hacerla y el manejador consume la
// marca. Lo que queda sin marca lo pidió una persona:
//   · pausa sin marca  → el clip entra en `detenidos` y este módulo no lo
//     vuelve a arrancar mientras esté ahí. Ni al salir y volver a entrar.
//   · play sin marca   → la persona lo quiere de vuelta: sale de `detenidos`
//     y vuelve a comportarse como los demás.
// Las dos llamadas van con guardia (`if (v.paused)` / `if (!v.paused)`):
// pedirle al navegador algo que ya está hecho no emite evento, y sin guardia
// la marca se quedaría colgada esperando un evento que no llega.
//
// Lo que este módulo NO hace, y es lo importante:
//   · No toca los vídeos sin `data-en-vista` (la entrevista de Raúl y el clip
//     del voluntariado llevan sonido y `controls`: los arranca una persona).
//   · No arranca nada con «menos movimiento» puesto: un vídeo en bucle es
//     movimiento, y la regla del sitio es que TODO se apaga.
//   · No esconde nada. Sin este módulo (o sin JavaScript) cada clip es un
//     <video controls> con su póster, que se reproduce a mano — medido en la
//     dirección: cero elementos invisibles sin JS.
//   · No quita los `controls`: son el mecanismo de pausa, y lo de arriba es lo
//     que hace que esa pausa signifique algo.
//
// La página lleva DOS paneles (inglés y español) con los mismos clips: el
// observador cubre los de los dos, y como el panel escondido está en
// `display: none`, nunca interseca y nunca se reproduce.

const clips = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-en-vista]'));

if (clips.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  /** Clips que una persona paró a mano. No se vuelven a arrancar solos. */
  const detenidos = new WeakSet<HTMLVideoElement>();
  /** La pausa / el play que acabamos de pedir NOSOTROS, aún sin su evento. */
  const pausaNuestra = new WeakSet<HTMLVideoElement>();
  const playNuestro = new WeakSet<HTMLVideoElement>();

  const pausar = (v: HTMLVideoElement) => {
    if (v.paused) return;
    pausaNuestra.add(v);
    v.pause();
  };

  const reproducir = (v: HTMLVideoElement) => {
    if (!v.paused || detenidos.has(v)) return;
    playNuestro.add(v);
    // play() devuelve una promesa que puede rechazarse (p. ej. datos que no
    // llegan): un clip que no arranca se queda en póster, y eso no es un
    // error de la página. Si se rechaza no habrá evento `play`, así que la
    // marca se retira a mano o se comería el siguiente play de la persona.
    v.play().catch(() => { playNuestro.delete(v); });
  };

  for (const v of clips) {
    v.addEventListener('pause', () => {
      if (pausaNuestra.delete(v)) return;  // la pedimos nosotros
      detenidos.add(v);                    // la pidió una persona: manda ella
    });
    v.addEventListener('play', () => {
      if (playNuestro.delete(v)) return;   // lo pedimos nosotros
      detenidos.delete(v);                 // le dio al play: vuelve al automático
    });
  }

  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) reproducir(v);
        else pausar(v);
      }
    },
    { threshold: 0.6 }
  );
  for (const v of clips) io.observe(v);
}
