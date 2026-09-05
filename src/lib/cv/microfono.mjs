// LOS NODOS DEL MICRÓFONO — la estructura, no las palabras.
//
// Aquí vive lo que NO cambia con el idioma: qué nodo es, de qué tipo, a qué
// pieza abre y en qué capítulo vive. Los nombres, los cargos y la línea de qué
// pasó viven en `src/i18n/cv.ts`, porque son texto y el CV es bilingüe exacto:
// la línea de QUÉ ABRE está en `mic.abre.<id>`; el nombre y el cargo NO están
// ahí, están en `entrevistas.personas.<id>` (personas y experiencias) y en
// `mic.paises.<id>` (países). Es lo que hace `Microfono.astro`.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA REGLA QUE DECIDE QUIÉN TIENE PUNTO — Y ES DE JAIME
// ═══════════════════════════════════════════════════════════════════════════
// Sus palabras (2026-09-02): «los puntos al darle click se abriera un episodio
// de podcast o de EXPERIENCIA de Moris Dieck o Marg, o algún video dando info
// financiera de un país».
//
// O sea: UN PUNTO QUE NO ABRE NADA ROMPE SU PREMISA. Y «experiencia» está en
// su frase: un revisor sacó a Moris y a Marg porque «no hay episodio», y leyó
// mal — él no pidió episodio, pidió la EXPERIENCIA. Lo que existe de cada uno
// es su publicación y su foto, y eso es lo que el punto abre, diciéndolo.
//
// Con ese filtro entran CATORCE y se quedan fuera tres:
//
//  · Manuel Durán — el episodio está grabado (palabra de Jaime, 2026-09-02) y
//    el video NO está publicado. Sin video no hay pieza que abrir. Es un
//    episodio DISTINTO del de Rendón (son dos grabaciones, no una; el de
//    Rendón ya está publicado en TikTok, ver su nodo): cuando llegue su
//    video, entra con su propio punto y el mismo molde.
//  · María José Cortés («Majo») — grabada (2:09, transcrita), sin clip
//    publicado todavía. Mismo caso: tarjeta en el capítulo, punto cuando haya
//    enlace.
//  · Sol (Callejeritos) — su entrevista está DENTRO del clip del voluntariado,
//    no en un clip dedicado. Un punto suyo abriría otra cosa.
//
// Los tres SIGUEN EN EL CV, en su capítulo, con todo lo que tienen. Lo que no
// tienen es punto. El micrófono es el índice de lo que se puede abrir.
//
// ═══════════════════════════════════════════════════════════════════════════
// CATORCE, Y EL TECHO ESTÁ MEDIDO
// ═══════════════════════════════════════════════════════════════════════════
// El motor v2 (src/scripts/cv-microfono.ts) reparte las personas y las
// experiencias en espiral áurea sobre la BANDA de la bola, y los países en
// columna helicoidal sobre el cuerpo; el objeto GIRA, así que la separación
// que importa es la de los nodos que están delante en cada momento. Medido en
// una vuelta entera a 1440: con 14 nodos (10 en la bola + 4 en el cuerpo) la
// separación mínima entre nodos delanteros es 52.8 px (con 11 era 55), y el
// blanco clicable se queda en 44 px en los dos casos. El punto 15 entra sin
// rehacer el reparto: la espiral reparte sola.
//
// ═══════════════════════════════════════════════════════════════════════════
// LAS TRES CLASES DICEN COSAS DISTINTAS, Y ESO SE ESCRIBE EN PANTALLA
// ═══════════════════════════════════════════════════════════════════════════
// Las PERSONAS son el liderazgo: a quién consiguió sentar delante de una
// cámara o de un micrófono. Las EXPERIENCIAS son consejos que pidió —no
// entrevistas, y el punto lo dice—. Los PAÍSES son la voz: lo que explica a
// cámara; México es la excepción y la única con recibo de liderazgo (LI-12 y
// LI-15: «I was selected to represent Mexico»). Lo dice el rótulo `mic.lede`.

/** Vídeo de TikTok de Jaime, por id. Es la misma forma que usa Historia.astro. */
export const TIKTOK = 'https://www.tiktok.com/@smart.financee/video/';

// Los catorce nodos, en el orden en que se reparten sobre la figura.
//
// `tipo`   'persona'     → hueco sobre la BOLA (espiral áurea sobre la banda).
//          'experiencia' → también sobre la bola, con marca de forma propia
//                          (un aro): se distingue por FORMA, no solo por color.
//          'pais'        → hueco sobre el CUERPO, en columna helicoidal. Van al
//                          cuerpo por dos razones medidas en el prototipo: en
//                          la bola, anclados por su lat/lon de verdad, Canadá y
//                          EE. UU. quedaban a 5.6 px en un teléfono, y Singapur
//                          (lon +104) caía en la cara de atrás. La geografía de
//                          verdad no reparte nodos: los apelotona.
// `cap`    en qué capítulo VIVE la historia entera de ese nodo, con el orden
//          de la ola 4 (la tapa es el 1): las conversaciones y las experiencias en el 3, los
//          países en el 7 («Lo que construí»), que es donde viven sus clips.
//          ⚠️ NO ES EL DESTINO DEL ENLACE. El destino es la PIEZA: `ancla()`.
// `href`   la pieza que abre. O una URL que existe y se comprobó, o `null`:
//          `null` significa que la pieza está DENTRO del CV —la ficha del
//          capítulo, `#<idioma>-pieza-<id>`— y el nodo la abre sin salir. Es
//          el estado de Moris y Marg mientras no llegue su enlace: el
//          punto sigue abriendo algo que existe (la experiencia tal como la
//          cuenta el CV, con su foto), y el día que llegue la URL se cambia un
//          dato aquí y nada más. Rendón fue ese caso hasta el 2026-09-03: llegó
//          su id de TikTok y se cambió ese dato, y nada más.
// `externo` de dónde sale la pieza (rótulo mono). Vacío cuando es interna.
export const NODOS = [
  // ── LAS OCHO PERSONAS (el liderazgo) ─────────────────────────────────────
  {
    id: 'podcast', tipo: 'persona', cap: 3,
    // EL PRIMER NODO CON VERBO DE ORGANIZACIÓN EN SU PROPIA FUENTE. LI-22,
    // verbatim: «I had the opportunity to ORGANIZE and participate in a
    // podcast about finance and personal finance in the FTR room at Tec, a
    // space that we were fortunately allowed to use to carry out this
    // initiative.» Él lo organizó, consiguió la sala institucional y consiguió
    // al invitado. Por eso va el primero del reparto.
    //
    // EL ENLACE, COMPROBADO EL 2026-09-02. El acortador que él publicó,
    // `lnkd.in/emKzcux3`, resuelve a `https://www.youtube.com/live/Y2Qmay5XdOg`
    // — «ExprésaTec | jueves, 16 de abril de 2026», canal ExprésaTEC, 1 824 s,
    // subido el 2026-04-17. Se enlaza el destino final y no el acortador: un
    // `lnkd.in` es una caja negra que puede cambiar de destino sin avisar.
    // ⚠️ LO QUE NO SE AFIRMA: que los 30 minutos sean suyos. Ese vídeo es la
    // emisión del día de un programa del Tec y el podcast de Jaime es un
    // segmento dentro; no hay fuente para el minuto en el que empieza, así
    // que no se escribe: va como hueco (`mic.minutoQue`) junto a su ficha, y
    // la pregunta está en `cv-material/PENDIENTE.md`, punto 5. El rótulo del
    // enlace dice «la emisión», no «el episodio completo».
    href: 'https://www.youtube.com/live/Y2Qmay5XdOg',
    externo: 'YouTube · ExprésaTEC', verificado: true
  },
  {
    id: 'rendon', tipo: 'persona', cap: 3,
    // EL SEGUNDO CON VERBO DE ORGANIZACIÓN, Y LO PRUEBA LA CINTA: Rendón,
    // parte 1 [00:00:21 → 00:00:25]: «Sí, con mucho gusto, Jaime. Pues primero
    // que nada, gracias por la invitación.» Y Jaime cierra la parte 2
    // [00:15:31]: «muchísimas gracias por aceptar la invitación y por
    // acompañarnos en este episodio de Smart Finance.» Dos transcripciones
    // (≈29 min 37 s) y diez clips cortados existen en
    // cv-material/pendiente/podcast-rendon-duran/.
    // EL ENLACE LLEGÓ EL 2026-09-03 (lo mandó Jaime). Comprobado por oEmbed:
    // autor `smart.financee`, y la descripción del video lo presenta con su
    // doctorado y su cargo: «Nos acompaña el Dr. Miguel Ángel Rendón: doctor
    // en Ciencias Financieras por EGADE Business School y director regional
    // de Contabilidad y Finanzas del Tec de Monterrey para CDMX, Santa Fe,
    // Toluca y Estado de México.» Hasta ese día el punto abría su ficha del
    // capítulo, con el hueco del enlace; ahora abre el episodio publicado.
    href: TIKTOK + '7680977307850378512', externo: 'TikTok', verificado: true
  },
  {
    id: 'mauricio', tipo: 'persona', cap: 3,
    // Cuatro partes numeradas por él con un profesional del sector. Se enlaza
    // la Parte 4, que es la que está descargada y descrita. ⚠️ Las partes 2 y
    // 3 también tienen id público (7660806476172184852 y 7663530569631911188);
    // LA PARTE 1 NO TIENE RECIBO EN NINGUNA PARTE y no se cuenta. Que la 4 sea
    // «la última» tampoco lo dice nadie: la ficha ya no lo dice.
    href: TIKTOK + '7671351658227469588', externo: 'TikTok', verificado: true
  },
  {
    id: 'lloyd', tipo: 'persona', cap: 3,
    // Lo entrevistó en Singapur y un mes después ese mismo hombre le firmó una
    // carta. ⚠️ NO es «profesor de la NUS»: su carta abre como CEO de TAQ Pte
    // Ltd y solo dice que dio clase dos semanas en el Green Technology
    // Programme, en la Shaw Foundation Alumni House.
    href: TIKTOK + '7666916220049870100', externo: 'TikTok', verificado: true
  },
  {
    id: 'andy', tipo: 'persona', cap: 3,
    // El otro firmante. Su carta describe, verbatim, cómo Jaime consigue sus
    // nodos: «While many students spent their breaks socialising with their
    // peers, Jaime actively approached and engaged with the educators,
    // programme leaders, and industry professionals involved in the programme.»
    href: TIKTOK + '7662781308988411156', externo: 'TikTok', verificado: true
  },
  {
    id: 'raul', tipo: 'persona', cap: 3,
    // Siendo presidente de un grupo estudiantil, consiguió al presidente del
    // paraguas que agrupa a todos. ⚠️ El cargo va SIN «del Tec»: ese vídeo no
    // menciona al Tec.
    href: TIKTOK + '7673350797958155541', externo: 'TikTok', verificado: true
  },
  {
    id: 'nus', tipo: 'persona', cap: 3,
    // Es una ENTREVISTA, no un monólogo suyo. Su nombre NO está publicado en
    // ninguna fuente y no se inventa: la ficha la nombra por lo que es.
    href: TIKTOK + '7657190267245563156', externo: 'TikTok', verificado: true
  },
  {
    id: 'jesus', tipo: 'persona', cap: 3,
    // Abordó a un desconocido y lo grabó. Iniciativa, no liderazgo sobre
    // otros, y la ficha no lo insinúa. ⚠️ No confundir con Jesús Gutiérrez
    // Parra (`podcast`): son dos personas distintas.
    href: TIKTOK + '7656095688484211988', externo: 'TikTok', verificado: true
  },

  // ── LAS DOS EXPERIENCIAS (consejos que pidió, no entrevistas) ────────────
  {
    id: 'dieck', tipo: 'experiencia', cap: 3,
    // LI-21, verbatim: «Although he had a tight schedule, I had the chance to
    // briefly speak with him and ask for advice on my own finance podcast.
    // […] I hope to have the opportunity to interview him in the future.» Lo
    // que existe es la conferencia (Tec Estado de México, organizada por HSBC)
    // y el consejo que le pidió; la foto está en el repo. La URL del post no
    // está cosechada (MATERIAL.md solo guardó urn de LI-01…05): hasta que
    // Jaime la mande, el punto abre la ficha del CV.
    href: null, externo: '', verificado: true
  },
  {
    id: 'marg', tipo: 'experiencia', cap: 3,
    // LI-20: la firma del acuerdo global CFA Institute × Tec de Monterrey,
    // Campus Estado de México; «At the end, I had the opportunity to ask her
    // for advice about studying in Canada, since she is Canadian herself».
    // Segunda fuente: la cinta de Rendón, parte 2 [00:03:53]: «eso es lo que
    // pude platicar con Mar[g] Franklin, justamente con esta duda de mi
    // elección». SIN CARGO: cfainstitute.org (leída el 2026-09-02) lista a
    // Tricia Rothschild como Interim President and CEO; la ficha va con las
    // palabras del post de Jaime. Sin URL del post: abre la ficha del CV.
    href: null, externo: '', verificado: true
  },

  // ── LOS CUATRO PAÍSES (la voz) ───────────────────────────────────────────
  //
  // ═══ `clip`/`poster`/`w`/`h` (ola 5) ═══════════════════════════════════
  // Jaime, 2026-09-04: «abajo de eso, los videos de que yo estoy en diferentes
  // países explicando temas». Esos vídeos pasan a verse DENTRO del módulo, en
  // la fila de cuatro tarjetas de 308 × 385, y para eso hace falta saber qué
  // archivo sirve cada país. Va AQUÍ y no en `Historia.astro` por la misma
  // razón por la que el enlace del podcast vive aquí: el capítulo 7 ya pinta
  // esos mismos cuatro clips y, con la ruta escrita en los dos sitios, el día
  // que se recorte un clip habría dos verdades. Ahora el capítulo LEE de aquí.
  //  · `w`/`h` son las dimensiones REALES del archivo, no las de la caja: el
  //    de México se publicó girado y el clip servido va enderezado (640×360),
  //    los otros dos son verticales (360×640).
  //  · Canadá va con `clip: null` A PROPÓSITO y no es un descuido: su pieza es
  //    un CARRUSEL DE FOTOS de TikTok, no un vídeo — no hay mp4 que servir, y
  //    su lámina es la Torre CN, que ya sale en el capítulo 1 (la regla de
  //    «ninguna imagen dos veces»). Su tarjeta lo dice con el rótulo que ya
  //    existe (`clip.carrusel`) en vez de dejar un hueco que nunca se llena.
  {
    id: 'mexico', tipo: 'pais', cap: 7,
    clip: '/assets/cv/cv-clip-nus.mp4', poster: '/assets/cv/cv-poster-nus.jpg', w: 640, h: 360,
    // EL ÚNICO NODO DE PAÍS CON LIDERAZGO REAL: no se auto-asignó, LI-12 y
    // LI-15 dicen «I was selected to represent Mexico».
    href: TIKTOK + '7658163945479408917', externo: 'TikTok', verificado: true
  },
  {
    id: 'singapur', tipo: 'pais', cap: 7,
    clip: '/assets/cv/cv-clip-singapur.mp4', poster: '/assets/cv/cv-poster-singapur.jpg', w: 360, h: 640,
    href: TIKTOK + '7655111359419387157', externo: 'TikTok', verificado: true
  },
  {
    id: 'japon', tipo: 'pais', cap: 7,
    clip: '/assets/cv/cv-clip-japon.mp4', poster: '/assets/cv/cv-poster-japon.jpg', w: 360, h: 640,
    // Se enlaza el vídeo «Datos financieros de Japón» (el que la página sirve
    // desde este dominio), no el carrusel de Tokio.
    href: TIKTOK + '7653328531694439700', externo: 'TikTok', verificado: true
  },
  {
    id: 'canada', tipo: 'pais', cap: 7,
    clip: null, poster: null, w: 0, h: 0,
    // El único donde explica, con su voz, POR QUÉ eligió Canadá — y quien lee
    // esta página es justo quien decide sobre eso.
    href: TIKTOK + '7664460671727258900', externo: 'TikTok', verificado: true
  }
];

/** Los que se quedan FUERA del micrófono, con el motivo. Se prueba que sigan
 *  fuera: el día que alguien añada a Durán sin que exista su video, esto lo
 *  dice. */
export const SIN_PUNTO = {
  duran: 'Episodio distinto del de Rendón: sin video publicado no hay pieza que abrir.',
  majo: 'Grabada y transcrita; sin clip publicado no hay pieza que abrir.',
  sol: 'Su entrevista está dentro del clip del voluntariado, no en un clip dedicado.'
};

export const PERSONAS = NODOS.filter((n) => n.tipo === 'persona');
export const EXPERIENCIAS = NODOS.filter((n) => n.tipo === 'experiencia');
export const PAISES = NODOS.filter((n) => n.tipo === 'pais');

// ═══════════════════════════════════════════════════════════════════════════
// EL DESTINO DE «EN EL CAPÍTULO ↓» ES LA PIEZA, NO EL CAPÍTULO
// ═══════════════════════════════════════════════════════════════════════════
// Los once enlaces apuntaban todos a `#<lang>-cap-8`. Medido sobre `dist` a
// 1440×900 con el scroll instantáneo: las siete fichas de persona quedaban
// 757 px por debajo del ancla del capítulo y los cuatro vídeos de país entre
// 3 165 y 4 620 px por debajo. Un índice cuyas entradas aterrizan cinco
// pantallas antes de lo que prometen no ataca «se me hizo infinito»: lo
// confirma. El ancla la pinta el capítulo (`Historia.astro`) y la enlaza el
// micrófono (`Microfono.astro`), las dos con ESTA función, para que no puedan
// separarse. Hay un guardián que comprueba que los catorce ids tienen dónde
// aterrizar.
export const ancla = (lang, id) => `${lang}-pieza-${id}`;

// ═══════════════════════════════════════════════════════════════════════════
// EL ARCHIVO DE CADA PAÍS, EN UN SOLO SITIO
// ═══════════════════════════════════════════════════════════════════════════
// Lo leen los DOS componentes que pintan esos cuatro clips: el módulo del
// micrófono (la fila de países) y el capítulo 7 (`ensena`). Antes las rutas
// estaban escritas a mano en `Historia.astro`; con dos copias, recortar un
// clip deja una de las dos apuntando a un archivo que ya no existe — y un
// `<video>` roto en producción no avisa de nada.
/** @type {Record<string, {clip: string|null, poster: string|null, w: number, h: number}>} */
export const CLIP_PAIS = Object.fromEntries(
  PAISES.map((n) => [n.id, { clip: n.clip, poster: n.poster, w: n.w, h: n.h }])
);
