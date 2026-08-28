// Los clips del CV narrativo: solo el que está A LA VISTA se mueve, y NUNCA
// uno que la persona haya parado.
//
// Es la estrategia medida en la dirección creativa (docs/cv-historia): cuatro
// clips con póster y `preload="none"` no descargan NI UN BYTE DE VÍDEO hasta
// que se cruza su capítulo; descargarlos y moverlos todos, 1 159 KB;
// descargar y mover SOLO el visible, 608 KB. Este módulo es la diferencia
// entre las dos últimas: observa los `<video data-en-vista>` y reproduce el
// que cruza el 60 % de visibilidad, pausando el que salió.
//
// YA NO SE PAGA NADA AL ABRIR, Y ESTA CABECERA HA DICHO DOS COSAS FALSAS
// SOBRE ESO. Primero dijo que los pósteres "pesan 57 KB"; medido de verdad
// sobre `dist` eran 108 090 B en cuatro peticiones —cv-poster-singapur.jpg
// 17 090, cv-poster-skills.jpg 20 284, cv-poster-raul.jpg 29 817,
// cv-poster-animales.jpg 40 899—, casi el doble. Después dijo que eso era
// inevitable, porque el atributo `poster` de un `<video>` no tiene
// `loading="lazy"` y no lo frena `preload="none"`. Lo primero sigue siendo
// verdad; lo segundo era una conclusión, no un hecho: el póster no tiene por
// qué estar EN el atributo mientras nadie lo mire.
//
// Así que hoy no lo está: el marcado trae `data-poster`, que es texto y no
// pide nada, y este módulo lo pasa al atributo de verdad cuando el clip se
// acerca al pliegue. Medido igual que antes, sobre `dist`, con
// `performance.getEntriesByType('resource')` y 9 corridas: la primera carga a
// 375 px pasa de 301 759 B a 192 746 B de mediana — 109 013 B menos, el 36 %.
//
// Sin JavaScript no cambia nada, y eso NO lo hace este archivo: cada clip
// lleva un gemelo con su `poster=` escrito dentro de un <noscript> (ver
// Historia.astro), y el <noscript> del <head> de Cv.astro esconde al vivo.
// El truco que parecía más limpio —el póster en una variable CSS y una regla
// que la sustituye— está descartado con una prueba: un <video> con `controls`
// y sin póster no enseña su fondo, Chromium le pinta encima un negro opaco.
//
// Lo que ya era cierto sigue igual: los ocho `<video>` de los dos paneles se
// quedan en `readyState 0` hasta que su capítulo entra en pantalla.
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
//   · No esconde nada. Sin este módulo (o sin JavaScript) cada clip sigue
//     siendo un <video controls> con su póster —lo pinta la regla del
//     <noscript> de Cv.astro, no este archivo—, que se reproduce a mano;
//     medido en la dirección: cero elementos invisibles sin JS.
//   · No quita los `controls`: son el mecanismo de pausa, y lo de arriba es lo
//     que hace que esa pausa signifique algo.
//
// La página lleva DOS paneles (inglés y español) con los mismos clips: el
// observador cubre los de los dos, y como el panel escondido está en
// `display: none`, nunca interseca y nunca se reproduce.

// ═══════════════════════════════════════════════════════════════════════════
// LOS PÓSTERES: SU OBSERVADOR ES OTRO, Y ESO ES A PROPÓSITO
// ═══════════════════════════════════════════════════════════════════════════
// Tentador reusar el observador de abajo. No vale, por dos razones que van en
// direcciones distintas:
//   · «MENOS MOVIMIENTO» APAGA EL DE ABAJO, Y NO PUEDE APAGAR ESTE. Un póster
//     es una imagen quieta: si colgara del mismo `if`, quien pide menos
//     movimiento se quedaría con cuatro rectángulos negros para siempre. Eso
//     no es respetar la preferencia, es castigarla.
//   · LOS UMBRALES SON OTROS. Reproducir quiere el 60 % del clip a la vista
//     (que se vea entero antes de moverse). Una imagen quiere lo contrario:
//     llegar ANTES de que se la mire, de ahí los 400 px de `rootMargin` —
//     media pantalla de teléfono, con los clips cinco pantallas más abajo, o
//     sea ni cerca de dispararse al abrir. Y `unobserve` en cuanto se pone:
//     esto pasa UNA vez por vídeo y no tiene nada que hacer al salir.
// Cubre los CUATRO pósteres, no solo los dos clips en bucle: los de Raúl y el
// voluntariado son `<video controls>` que arranca una persona, y su póster se
// pedía igual de pronto que los otros.
const conPoster = Array.from(document.querySelectorAll<HTMLVideoElement>('video[data-poster]'));

if (conPoster.length) {
  const ponerPoster = (v: HTMLVideoElement) => {
    const url = v.dataset.poster;
    if (!url) return;
    v.poster = url;
    // Fuera el `data-*`: deja de casar el selector, así que esto es
    // idempotente si el módulo llegara a evaluarse dos veces.
    v.removeAttribute('data-poster');
  };

  if (!('IntersectionObserver' in window)) {
    // Sin observador no hay «al acercarse», y un póster que no llega nunca es
    // peor que uno que llega pronto: se ponen los cuatro y se acabó.
    for (const v of conPoster) ponerPoster(v);
  } else {
    const ioPoster = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          ponerPoster(e.target as HTMLVideoElement);
          ioPoster.unobserve(e.target);
        }
      },
      { rootMargin: '400px 0px' }
    );
    for (const v of conPoster) ioPoster.observe(v);
  }
}

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
