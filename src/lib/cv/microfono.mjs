// LOS NODOS DEL MICRÓFONO — la estructura, no las palabras.
//
// Aquí vive lo que NO cambia con el idioma: qué nodo es, de qué tipo, a qué
// pieza abre y a qué capítulo baja. Los nombres, los cargos y la línea de qué
// pasó viven en `src/i18n/cv.ts`, porque son texto y el CV es bilingüe exacto.
// Con precisión, porque este archivo es al que vendrá quien añada el nodo 12
// (Rendón y Durán) y mandarlo a una clave que no existe es peor que no decir
// nada: la línea de QUÉ ABRE está en `mic.abre.<id>`; el nombre y el cargo NO
// están ahí, están en `entrevistas.personas.<id>` (personas) y en
// `mic.paises.<id>` (países). Es lo que hace `Microfono.astro`, y ahí está
// bien escrito. Aquí decía `mic.nodos.<id>`, que no existe.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA REGLA QUE DECIDE QUIÉN TIENE PUNTO — Y ES DE JAIME
// ═══════════════════════════════════════════════════════════════════════════
// Sus palabras (2026-09-02): «los puntos al darle click se abriera un episodio
// de podcast o de experiencia de Moris Dieck o Marg, o algún video dando info
// financiera de un país».
//
// O sea: UN PUNTO QUE NO ABRE NADA ROMPE SU PREMISA. Con ese filtro, de los 15
// nodos inventariados entran ONCE y se quedan fuera cuatro:
//
//  · Moris Dieck — su propia publicación (LI-21) dice que la entrevista TODAVÍA
//    NO EXISTE: «I hope to have the opportunity to interview him in the
//    future». Un punto que prometa un episodio suyo estaría mintiendo.
//  · Marg Franklin — hay foto del encuentro y cero audio. No hay pieza.
//  · Miguel Rendón y Manuel Durán — el episodio YA OCURRIÓ (palabra de Jaime,
//    2026-09-02) pero el material no ha llegado: sin enlace no hay punto.
//    Cuando llegue, comparten UN punto (es una grabación, no dos).
//  · Sol (Callejeritos) — su entrevista está DENTRO del clip del voluntariado,
//    no en un clip dedicado. Un punto suyo abriría otra cosa.
//
// Los cuatro SIGUEN EN EL CV, en su capítulo, con todo lo que tienen. Lo que no
// tienen es punto. El micrófono es el índice de lo que se puede oír.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ONCE Y NO TRECE
// ═══════════════════════════════════════════════════════════════════════════
// El techo físico medido de la silueta a 1440 son 12 destinos de 44 px sin que
// se toquen; a partir de 13 es nube de puntos y nada es pinchable. Once deja
// sitio para el punto 12 (Rendón y Durán) sin rehacer el reparto. La espiral
// áurea del casquete reparte sola: añadir un nodo no obliga a reajustar los
// otros a mano.
//
// ═══════════════════════════════════════════════════════════════════════════
// LAS DOS MITADES DICEN COSAS DISTINTAS, Y ESO SE ESCRIBE EN PANTALLA
// ═══════════════════════════════════════════════════════════════════════════
// Las PERSONAS son el liderazgo: a quién consiguió sentar delante de una
// cámara. Los PAÍSES son la voz: qué dice cuando nadie le pregunta. Tres de
// los cuatro países no prueban liderazgo de ninguna clase y un lector de
// admisiones lo nota. México es la excepción y la única con recibo: LI-12 y
// LI-15 dicen «I was selected to represent Mexico» — no se auto-asignó.
// Si el micrófono no dice esa diferencia en una línea, se lee como si
// grabar un video de datos de Japón fuera lo mismo que conseguir a un
// ejecutivo de FX. Lo dice el rótulo `mic.lede` — aquí ponía
// `mic.dosMitades`, que tampoco existe.

/** Vídeo de TikTok de Jaime, por id. Es la misma forma que usa Historia.astro. */
export const TIKTOK = 'https://www.tiktok.com/@smart.financee/video/';

// Los once nodos, en el orden en que se reparten sobre la figura.
//
// `tipo`   'persona' → hueco sobre la CANASTA (espiral áurea del casquete que
//                      mira a la cámara: separación pareja por construcción).
//          'pais'    → hueco sobre el CUERPO, en columna. Van al cuerpo por dos
//                      razones medidas en el prototipo: en la canasta, anclados
//                      por su lat/lon de verdad, Canadá y EE. UU. quedaban a
//                      5.6 px en un teléfono (con blancos de 44 px, o sea
//                      encimados) y Singapur (lon +104) caía en la cara de
//                      atrás, donde no se puede pinchar porque el micrófono no
//                      gira. La geografía de verdad no reparte nodos: los
//                      apelotona donde hay ciudades.
// `cap`    en qué capítulo VIVE la historia entera de ese nodo. Hoy los once
//          están en el 8; el campo se queda porque el día que una pieza se
//          mueva de capítulo, el rótulo lo tiene que saber.
//          ⚠️ NO ES EL DESTINO DEL ENLACE. El destino es la PIEZA, no el
//          capítulo: ver `ancla()` aquí abajo.
// `href`   la pieza que abre. SIEMPRE es una URL que existe y se comprobó.
// `verificado` false = palabra de Jaime sin recibo público (hoy: ninguno de
//          los once; los dos que lo tendrían, Rendón y Durán, no tienen punto).
export const NODOS = [
  // ── LAS SIETE PERSONAS (el liderazgo) ────────────────────────────────────
  {
    id: 'podcast', tipo: 'persona', cap: 8,
    // EL ÚNICO NODO CON VERBO DE ORGANIZACIÓN EN SU PROPIA FUENTE. LI-22,
    // verbatim: «I had the opportunity to ORGANIZE and participate in a
    // podcast about finance and personal finance in the FTR room at Tec, a
    // space that we were fortunately allowed to use to carry out this
    // initiative.» Él lo organizó, consiguió la sala institucional y consiguió
    // al invitado. Es la prueba de liderazgo que un comité busca, y por eso va
    // el primero del reparto.
    //
    // EL ENLACE, COMPROBADO HOY (2026-09-02). El acortador que él publicó,
    // `lnkd.in/emKzcux3`, resuelve a
    // `https://www.youtube.com/live/Y2Qmay5XdOg` — «ExprésaTec | jueves, 16 de
    // abril de 2026», del canal ExprésaTEC, 1 824 s, subido el 2026-04-17.
    // Se enlaza el destino final y no el acortador: un `lnkd.in` es una caja
    // negra que puede cambiar de destino sin avisar, y en un CV el enlace es
    // parte de la prueba.
    // ⚠️ LO QUE NO SE AFIRMA: que los 30 minutos sean suyos. Ese vídeo es la
    // emisión del día de un programa del Tec, y el podcast de Jaime es un
    // segmento dentro. No hay fuente para el minuto en el que empieza, así que
    // no se escribe: va como hueco en pantalla (`mic.minutoQue`) y la pregunta
    // entera está en `cv-material/PENDIENTE.md`, punto 5. La clave `micMinuto`
    // que ponía aquí no existe.
    href: 'https://www.youtube.com/live/Y2Qmay5XdOg',
    externo: 'YouTube · ExprésaTEC', verificado: true
  },
  {
    id: 'mauricio', tipo: 'persona', cap: 8,
    // Cuatro episodios sostenidos con un profesional del sector. El liderazgo
    // está en haber convertido UNA invitación (fue Mauricio quien lo invitó a
    // la Asamblea de la AEM, LI-17) en cuatro episodios — no en el primer
    // contacto. Se enlaza la Parte 4, que es la que está descargada y descrita.
    // ⚠️ LA PARTE 1 NO TIENE RECIBO EN NINGUNA PARTE: existe solo por deducción
    // de que él numeró la 2. No se enlaza y no se cuenta.
    href: TIKTOK + '7671351658227469588', externo: 'TikTok', verificado: true
  },
  {
    id: 'lloyd', tipo: 'persona', cap: 8,
    // Lo entrevistó en Singapur y un mes después ese mismo hombre le firmó una
    // carta. La carta dice que Jaime organizó y condujo las entrevistas
    // «entirely on his own steam» — o sea que el liderazgo aquí lo firma un
    // tercero. ⚠️ NO es «profesor de la NUS»: su carta abre como CEO de TAQ Pte
    // Ltd y solo dice que dio clase dos semanas en el Green Technology
    // Programme, vía Bluesky Education, en la Shaw Foundation Alumni House
    // —que está DENTRO del campus de la NUS—. Dar clase en un campus no es ser
    // de la casa.
    href: TIKTOK + '7666916220049870100', externo: 'TikTok', verificado: true
  },
  {
    id: 'andy', tipo: 'persona', cap: 8,
    // El otro firmante. Su carta describe, verbatim, cómo Jaime consigue sus
    // nodos: «While many students spent their breaks socialising with their
    // peers, Jaime actively approached and engaged with the educators,
    // programme leaders, and industry professionals involved in the programme.»
    href: TIKTOK + '7662781308988411156', externo: 'TikTok', verificado: true
  },
  {
    id: 'raul', tipo: 'persona', cap: 8,
    // El clip de persona MÁS VISTO de todo su TikTok. Siendo presidente de un
    // grupo estudiantil, consiguió al presidente del paraguas que agrupa a
    // todos. ⚠️ El cargo va SIN «del Tec»: ese vídeo no menciona al Tec y
    // añadirlo sería inventar (ya anotado en cv.ts).
    href: TIKTOK + '7673350797958155541', externo: 'TikTok', verificado: true
  },
  {
    id: 'nus', tipo: 'persona', cap: 8,
    // Es una ENTREVISTA, no un monólogo suyo (reclasificada por instrucción de
    // Jaime). Su nombre NO está publicado en ninguna fuente y no se inventa: la
    // ficha la nombra por lo que es.
    href: TIKTOK + '7657190267245563156', externo: 'TikTok', verificado: true
  },
  {
    id: 'jesus', tipo: 'persona', cap: 8,
    // Abordó a un desconocido en la calle y lo grabó. Como prueba de INICIATIVA
    // vale; como prueba de liderazgo sobre otros, no aporta, y la ficha no lo
    // insinúa. ⚠️ No confundir con Jesús Gutiérrez Parra: son dos personas
    // distintas, y por eso el reparto los separa (`podcast` es el primero de la
    // espiral y este el último de las personas: quedan en lados opuestos del
    // casquete).
    href: TIKTOK + '7656095688484211988', externo: 'TikTok', verificado: true
  },

  // ── LOS CUATRO PAÍSES (la voz) ───────────────────────────────────────────
  {
    id: 'mexico', tipo: 'pais', cap: 8,
    // EL ÚNICO NODO DE PAÍS CON LIDERAZGO REAL, y es el único que es país Y
    // conversación a la vez. No se auto-asignó: LI-12 y LI-15 dicen «I was
    // selected to represent Mexico».
    href: TIKTOK + '7658163945479408917', externo: 'TikTok', verificado: true
  },
  {
    id: 'singapur', tipo: 'pais', cap: 8,
    // Un punto, dos piezas: Gardens by the Bay y la visita a J.P. Morgan. No
    // dos puntos. Y es el país donde ocurren CUATRO de los siete nodos de
    // persona, así que carga más contexto del que dice su ficha.
    href: TIKTOK + '7655111359419387157', externo: 'TikTok', verificado: true
  },
  {
    id: 'japon', tipo: 'pais', cap: 8,
    // Dos piezas también: el vídeo «Datos financieros de Japón» (el que el CV
    // ya sirve desde este dominio, id 7653328531694439700) y el carrusel de
    // Tokio (7654312797160934676), que con 8 101 vistas es la pieza más vista
    // de todo su TikTok. Se enlaza el vídeo, que es el que la página sirve.
    href: TIKTOK + '7653328531694439700', externo: 'TikTok', verificado: true
  },
  {
    id: 'canada', tipo: 'pais', cap: 8,
    // El único donde explica, con su voz, POR QUÉ eligió Canadá — y quien lee
    // esta página es justo quien decide sobre eso. ⚠️ Es también el único de
    // los once SIN IMAGEN UTILIZABLE: su carrusel es la misma Torre CN que ya
    // es la portada del capítulo 1, y la regla de Jaime es que ninguna imagen
    // se repite. Por eso su ficha va sin miniatura, y no es un olvido.
    href: TIKTOK + '7664460671727258900', externo: 'TikTok', verificado: true
  }
];

/** Los que se quedan FUERA del micrófono, con el motivo. Se prueba que sigan
 *  fuera: el día que alguien añada a Moris Dieck sin que exista su entrevista,
 *  esto lo dice. */
export const SIN_PUNTO = {
  dieck: 'Su propia publicación dice que la entrevista aún no existe.',
  marg: 'Foto del encuentro, cero audio: no hay pieza que abrir.',
  rendon: 'El episodio ya ocurrió; el material no ha llegado. Comparte punto con Durán cuando llegue.',
  duran: 'Mismo episodio que Rendón: un punto, no dos.',
  sol: 'Su entrevista está dentro del clip del voluntariado, no en un clip dedicado.'
};

export const PERSONAS = NODOS.filter((n) => n.tipo === 'persona');
export const PAISES = NODOS.filter((n) => n.tipo === 'pais');

// ═══════════════════════════════════════════════════════════════════════════
// EL DESTINO DE «EN EL CAPÍTULO ↓» ES LA PIEZA, NO EL CAPÍTULO
// ═══════════════════════════════════════════════════════════════════════════
// Los once enlaces apuntaban todos a `#<lang>-cap-8`. Medido sobre `dist` a
// 1440×900 con el scroll instantáneo: el ancla del capítulo 8 cae en y = 23 232
// y las piezas NO están ahí. Las siete fichas de persona quedan 757 px por
// debajo, y los cuatro vídeos de país entre 3 165 y 4 620 px por debajo — de
// 3.5 a 5.1 pantallas. Un índice cuyas once entradas llevan al mismo sitio y
// aterrizan cinco pantallas antes de lo que prometen no ataca «se me hizo
// infinito»: lo confirma.
//
// Y las siete personas viven en un carrusel horizontal, así que además del
// alto importa el ANCHO: sin ancla propia, el enlace de Raúl Irabién deja al
// lector delante de la ficha de Andy Toh.
//
// El ancla la pinta el capítulo (`Historia.astro`) y la enlaza el micrófono
// (`Microfono.astro`), las dos con ESTA función, para que no puedan separarse.
// Hay un guardián que comprueba que los once ids tienen dónde aterrizar.
export const ancla = (lang, id) => `${lang}-pieza-${id}`;
