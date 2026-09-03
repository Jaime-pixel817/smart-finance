// Textos EN/ES del CV narrativo de /cv/<codigo> — "la historia". Van aquí y no
// en ui.ts por el mismo motivo que src/i18n/cartera.ts y src/i18n/research.ts:
// son párrafos, no rótulos de interfaz. Los rótulos del botón de /about sí
// están en ui.ts (claves `cv.*`).
//
// ═══════════════════════════════════════════════════════════════════════════
// LÍMITE DE AUTORÍA — LO MÁS IMPORTANTE DE ESTE ARCHIVO
// ═══════════════════════════════════════════════════════════════════════════
// Aquí hay TRES clases de texto, y cada una está marcada donde aparece:
//
// 1. LAS PALABRAS DE JAIME (`voz.*`). Frases que él dijo, con su ortografía y
//    puntuación pulidas SIN cambiar el sentido. Cada una lleva el comentario
//    «texto de Jaime, pendiente de su revisión final». Las versiones inglesas
//    de esas frases son TRADUCCIONES fieles, también pendientes de su
//    revisión: un comité canadiense lee inglés, y dejar su voz solo en español
//    dejaría el panel inglés sin la mitad de la página. La única excepción es
//    LA FRASE final (`frase.texto`): va VERBATIM, en español, en los dos
//    paneles — es su voz y no se toca; el panel inglés lleva debajo una
//    traducción pequeña, marcada como traducción.
//    LA FRASE DE APERTURA (`voz.apertura`) sí es de las pulidas: él la mandó
//    diciendo «algo así», así que se le arregló la ortografía y la puntuación
//    y nada más. Abre la página y es la tesis de todo lo demás.
//
// 2. HECHOS VERIFICADOS, cada uno con su fuente en el repo o en el propio
//    build (las cifras de la prueba se CUENTAN de los archivos reales en
//    Historia.astro, no se escriben aquí). Nombres de instituciones y
//    certificaciones: tal cual los publica su LinkedIn.
//
// 3. LO QUE SOLO ÉL PUEDE ESCRIBIR → sigue siendo un hueco (`huecos`/`suyo`),
//    como en la versión anterior de esta página. Cada cadena vacía de `suyo`
//    se pinta como hueco marcado (src/components/cv/Hueco.astro); en cuanto
//    Jaime escribe la frase, el hueco desaparece solo.
//
// `const es: typeof en` obliga a que las dos tablas tengan LAS MISMAS CLAVES:
// si se añade una clave en inglés y se olvida el español, TypeScript lo dice
// en el build.
import type { Locale } from './routes';

const en = {
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  // ---- Selector de idioma de la propia página ----
  lang: { en: 'English', es: 'Español', aria: 'Language of this page' },

  // ══════════════════════════════════════════════════════════════════════
  // LA MARCA DE UNA CIFRA SUYA (2026-08-29)
  // ══════════════════════════════════════════════════════════════════════
  // Este CV tiene DOS clases de número y no se pueden confundir: las que el
  // BUILD cuenta de los archivos del repo (pruebas, fuentes, glosario,
  // lecciones — `contarCifras` en Historia.astro) y las que solo puede
  // afirmar Jaime porque el build no las ve. Los inscritos al boletín viven
  // en Redis y la gente de la comunidad no vive en ningún archivo: las dos
  // entran como AFIRMACIÓN SUYA, con la fecha en que la dijo, y con esta
  // marca al lado. Sin ella, un número suyo puesto junto a tres contados se
  // lleva prestado el recibo de los otros tres.
  // LA FECHA VA COMPLETA, no solo el año: la regla de «solo el año» de Jaime
  // (brief 2026-08-28) es para fechas BIOGRÁFICAS. Esto es el sello de
  // frescura de una cifra, la misma clase que el `dataAsOf` del research, y
  // «mi cifra de 2026» no dice si tiene una semana o diez meses.
  cifraSuya: 'My figure, 29 August 2026. This page does not count it: it is my claim.',

  // ── Y ESTE ES EL MISMO RECIBO PARA LO QUE NO ES UNA CIFRA ────────────
  // `cifraSuya` se escribió para las DOS cifras del 29 de agosto (≈200 en la
  // comunidad, +100 en el boletín) y se estaba usando también debajo del
  // podcast de Rendón y Durán, que no es una cifra y no es del 29 de agosto:
  // esa afirmación es del 2026-09-02 (lo dice la cabecera de su propio bloque
  // aquí abajo y lo fecha ESTADO-NOCTURNO.md). O sea que el recibo mentía dos
  // veces —la fecha y la palabra «cifra»— en un documento cuya tesis es que
  // cada afirmación lleva el suyo.
  dichoSuyo: 'My word, 2 September 2026. This page does not verify it: it is my claim.',
  // Dos rótulos de traducción más (ola 4): la cinta de Rendón y de Majo es en
  // español, y las publicaciones de LinkedIn de Jaime son en inglés. Vacío =
  // no se pinta, como `aperturaTag`/`peTag`.
  cintaTag: 'Said in Spanish, on the recording. This is a translation; the original is in the Spanish panel.',
  postTag: '',

  // EL AÑO EN DISPUTA, EN PANTALLA. Mismo recibo que `cifraSuya` y por el
  // mismo motivo: 2025 es lo que dice Jaime («que la creé desde 2025 empecé»,
  // 2026-08-30; «el grupo estudiantil lo creó a finales de 2025», 2026-08-29)
  // y su LinkedIn publica otra cosa (MATERIAL.md, bloque C2: smartfinance.lat
  // como feb. 2026, el grupo como ene. 2026). Estaba anotado SOLO en los
  // comentarios de este archivo, o sea invisible para quien lee la página —
  // y la página aplicaba dos criterios: sus cifras llevaban recibo y un año
  // que su propio perfil público desmiente salía en seco, en la fila que un
  // comité escanea primero y a dos capítulos del enlace «Verlo en LinkedIn».
  // NO RECONCILIA LAS DOS FECHAS. Los dos años podrían ser ciertos (empezar
  // en 2025 y publicarlo en 2026), pero eso no lo ha dicho nadie, así que no
  // se escribe: se ponen las dos y se dice de quién es cada una.
  //
  // ── SON CINCO, NO DOS (2026-08-31) ────────────────────────────────────
  // El recibo nombraba dos filas y en la página hay CINCO fechas de 2025, y
  // las cinco son palabra suya. Son exactamente las cinco filas de `exp` que
  // dicen 2025 —ninguna otra fila de la tabla lo dice—, así que el recibo
  // puede señalarlas por su año sin marcar nada en la lista:
  //   1 · grupo estudiantil     · LinkedIn lo publica como «ene. 2026»
  //   2 · smartfinance.lat      · LinkedIn lo publica como «feb. 2026»
  //   3 · Jasa Motor            · NO aparece en su LinkedIn (MATERIAL.md C2)
  //   4 · asamblea de la AEM    · su publicación es de ~jun. 2026
  //   5 · sesión con Jon Maier  · su publicación es de ~abr. 2026
  // Las antigüedades salen de MATERIAL.md («hace ~2 meses» y «hace ~4
  // meses», cosechado el 2026-08-27), y por eso el recibo dice que LAS
  // PUBLICACIONES son de 2026 — no que los eventos lo fueran. Un evento de
  // 2025 se puede publicar en 2026 y las dos cosas serían ciertas; eso no lo
  // decide esta página. LO QUE NO SE HACE ES INVENTAR: donde no hay fuente
  // pública (Jasa Motor) el recibo dice que no hay con qué comparar, y no se
  // le pone un año de adorno ni se le quita el suyo.
  // ── Y SE IMPRIME UNA VEZ, NO TRES (2026-09-01) ─────────────────────────
  // El recibo de arriba salía ENTERO en los tres sitios donde se lee un
  // 2025: la tabla de experiencia, el lede del sitio y el bloque de Jasa
  // Motor. Son 78 palabras × 3 = 234, el 5 % de todo el texto del documento,
  // diciendo tres veces lo mismo — y las tres veces la lista completa de las
  // cinco fechas, aunque en dos de esos sitios sólo se lee UNA.
  // Se queda entero DONDE ESTÁN LAS CINCO, que es la tabla de experiencia;
  // en los otros dos va este renglón, que dice lo mismo que importa ahí —
  // este año es palabra mía— y manda al recibo POR EL TÍTULO del capítulo,
  // no por su número. Nada se esconde: lo que se quita es la repetición.

  // ---- Marca de hueco ----
  hueco: {
    tag: 'To write',
    note: 'I write this, in my own words. Nothing on this page is generated for me.'
  },
  // Marca de foto pendiente (FotoHueco.astro).
  fotoHueco: { tag: 'Photo to come' },
  // Marca de MATERIAL pendiente (HuecoMaterial.astro). Es otra cosa que un
  // hueco de texto: no falta una frase de Jaime, falta un archivo suyo — un
  // enlace, una foto, un cargo, un minuto. Por eso lleva la carpeta donde
  // dejarlo: rellenarlo tiene que ser cambiar un dato, no rehacer un capítulo.
  materialHueco: { tag: 'Material to come' },
  // Qué foto falta en cada sitio. Instrucciones del hueco, no contenido.
  // ══ LAS 13 FOTOS QUE JAIME MANDÓ POR CHAT EL 2026-08-30: COLOCADAS ════
  // YA ESTÁN EN DISCO, en cv-material/imagenes/nuevas/ con su MAPA.md. Este
  // comentario decía «esa carpeta NO EXISTE aún — se comprobó» y era FALSO:
  // la carpeta se creó 52 minutos antes del commit que lo afirmaba. Doce de
  // las trece están hoy publicadas; los originales viven en
  // public/assets/cv-fotos/ (`lote-*.jpg`, sin desplegar) y salen con huella
  // por el bloque LOTE de scripts/build-photos.mjs.
  //
  // EL MAPA QUE DIO ÉL, y dónde quedó cada una:
  //    1 · el profesor Lloyd      → bajo su carta (cap. 8)              ✔ puesta
  //    2 · la visita a Toronto    → junto a su cita sobre la U of T (1) ✔ puesta
  //    3 · recogiendo basura      → playa, 1ª (cap. 3)                  ✔ puesta
  //    4 · el montón recogido     → playa, 2ª (cap. 3)                  ✔ puesta
  //    5 · donando alimento       → cap. 3                              ✔ puesta
  //    6 · los perritos           → cap. 3                              ✔ puesta
  //    7 · Marg Franklin          → cap. 4, con la gente que conoció    ✔ puesta
  //    8 · entrevistando en su prepa → SUSTITUYE el cuadro del grupo (5) ✔ hecha
  //    9 · narrando sobre el grupo → cap. 5                             ✔ puesta
  //   10 · la playa con una compañera → playa, 3ª (cap. 3)              ✔ puesta
  //   11 · él con Sol             → `sol` (cap. 4)         ✖ NO se publica
  //   12 · explicándole a la NUS  → SUSTITUYE el fotograma girado       ✔ hecha
  //   13 · la marcha              → cap. 3                              ✔ puesta
  //
  // POR QUÉ LA 11 NO SE PUBLICA, y son dos motivos independientes:
  //   (a) el cartel que sostienen lleva un NÚMERO DE TELÉFONO legible, y esta
  //       página no publica teléfonos ni siquiera de terceros — es la misma
  //       regla por la que el de la carta de Lloyd George se quedó fuera;
  //   (b) el hueco que llenaría pide «un retrato de Sol», y en la foto hay dos
  //       mujeres sin que ninguna fuente diga cuál es Sol: ponerle pie sería
  //       adivinar el nombre de una persona.
  // Su hueco se queda y lo dice en pantalla. Necesita respuesta de Jaime.
  //
  // LA FOTO DE ANDY TOH: RESUELTA EL 2026-08-31, Y CON SU FUENTE.
  // El lote del 2026-08-30 no trae ninguna de Jaime con Andy Toh (son 13
  // archivos y ninguno es esa), y por eso aquí vivía un hueco. Pero el
  // MAPA.md que escribió Jaime lo dice sin ambigüedad: «la foto con Andy Toh
  // (el CEO) ya está en el repo (breakdown-andy-toh): va debajo de SU carta
  // de recomendación, igual que la de Lloyd debajo de la suya». O sea que la
  // instrucción es usar el cuadro de la entrevista, que YA sale en el
  // carrusel del capítulo 4.
  // SE REPITE UNA IMAGEN, Y ES LA PRIMERA VEZ. La regla del CV es que ninguna
  // se repite, y aquí la excepción está pedida por él y tiene sentido: las
  // dos cosas que esta página afirma de Andy Toh son la conversación y la
  // carta, y la foto es la prueba de la primera y el rostro de la segunda.
  // `cartaAndy` deja de usarse; se queda escrito por si algún día llega una
  // foto propia con él.
  fotosPend: {
    // `origen` se fue el 2026-08-31: no lo usaba nadie desde que se
    // colocaron las 12 fotos del lote. Texto muerto en las dos tablas.
    research: 'Me working: a screen, a notebook, something real.',
    actinver: 'The visit, the school, the team, the talks.',
    // EL HUECO DE SOL DICE POR QUÉ SIGUE VACÍO. Jaime mandó una foto suya en
    // el puesto de Callejeritos (la 11 del lote), y no se publica por dos
    // razones que van cada una por su lado: el cartel enseña un teléfono
    // legible, y en la foto hay dos mujeres sin que ninguna fuente diga cuál
    // es Sol. Las dos están escritas arriba, sobre el mapa del lote.
    /* OJO CON LA ÚLTIMA FRASE: decía «this page does not publish phone
       numbers», y desde que las dos cartas se publican enteras eso dejó de
       ser cierto (la de Lloyd George trae el suyo). La razón de fondo no
       cambia y es la que se escribe ahora: el del cartel es de un tercero que
       no me lo dio para publicarlo; el de la carta lo escribió quien la firma
       en un documento que me dio para entregarlo. */
    sol: 'A portrait of Sol, or a frame from the march videos. The one from the stand is not published here: a phone number is legible on the sign.',
    // La carpeta `pendiente/podcast-rendon-duran/fotos/` existe y está vacía.
    rendon: 'A frame from the recording with Miguel Ángel Rendón.',
    majo: 'A frame from the recording with María José Cortés.',
    duran: 'A frame from the recording with Manuel Durán.',
    // YA NO SE USA (2026-08-31): la ficha de su carta enseña el cuadro de la
    // entrevista, que es lo que pidió el MAPA.md. Ver la nota de arriba.
    cartaAndy: 'A photo of me with Andy Toh, the CEO who wrote this letter.',
  },
  // ── EL LOTE DEL 2026-08-30, YA COLOCADO ────────────────────────────────
  // Once fotos suyas que llegaron a disco y ocupan el sitio que su mapa
  // (cv-material/imagenes/nuevas/MAPA.md) les daba. `alt` describe LO QUE SE
  // VE —se miraron una por una, no se copió el nombre del archivo— y `pie` es
  // la línea en primera persona que él pidió, con el año y sin fecha
  // completa. Ninguna se recorta: van a su proporción (ver el bloque LOTE de
  // scripts/build-photos.mjs).
  lote: {
    cartaLloydAlt: 'Me holding a Singapore flag on its wooden pole, next to Lloyd George, in a white shirt, holding another pole, in a function room',
    cartaLloydPie: 'With Lloyd George in Singapore (2026).',
    // La MISMA foto del carrusel, con su `alt` reescrito en primera persona
    // (el del carrusel lo escribe ui.ts en tercera, porque ahí lo comparte
    // con el resto del sitio).
    cartaAndyAlt: 'Me interviewing Andy Toh, the two of us seated across a low table, during the programme in Singapore',
    cartaAndyPie: 'With Andy Toh in Singapore (2026).',
    torontoAlt: 'Me and a classmate in winter coats in front of the red TORONTO letters at Nathan Phillips Square, City Hall behind us',
    torontoPie: 'The day I visited Toronto (2026).',
    playa1Alt: 'Me picking up litter with a grabber and a red bucket at the edge of a path, a rubbish truck behind me and the sea past the trees',
    playa1Pie: 'Picking up litter, with the bucket and the grabber.',
    playa2Alt: 'The pile of driftwood, planks and coconuts we collected, on the grass beside the sand',
    playa2Pie: 'What we collected.',
    playa3Alt: 'Me and a classmate, from behind, pulling litter out of a hedge beside the sea, with cargo ships on the horizon',
    playa3Pie: 'By the sea, with a classmate.',
    donacionAlt: 'Me holding a bag of dog food and two sachets of cat food in front of the adoption stand’s awning',
    donacionPie: 'Handing over the food I donated.',
    perritosAlt: 'Dogs in a wire pen under the shelter’s awning, with a banner about respect and care for animals behind them',
    perritosPie: 'The dogs at the stand.',
    margAlt: 'Me next to Marg Franklin, who is wearing a light grey checked blazer, in front of a dark backdrop',
    margPie: 'With Marg Franklin at the signing (2026).',
    // La foto de Moris ya estaba en el repo (breakdown-moris-dieck): ahora
    // tiene pie propio porque sale del carrusel y va con su ficha.
    dieckPie: 'With Moris Dieck after his talk at Tec.',
    grupoEntrevistaAlt: 'Me holding a microphone, interviewing two students in front of the Smart Finance Prepa Tec stand poster',
    grupoEntrevistaPie: 'Interviewing at my school, for the student group.',
    grupoNarraAlt: 'Me talking to camera with a clip-on microphone, next to the Smart Finance Prepa Tec poster inviting students to join',
    grupoNarraPie: 'Talking to camera about the student group.',
    marchaAlt: 'Me holding a hand-made poster about Canelo, a dog up for adoption, at the march, with the Tlalnepantla arch and the fountain behind me',
    marchaPie: 'The march for street animals.'
  },
  // Marca de clip pendiente (los marcos de vídeo del capítulo 6).
  clip: {
    tag: 'Clip to come',
    pista: 'The clip will be served from this domain, never embedded. Until then, the poster and the link to the original.',
    ver: 'Watch on TikTok',
    // Un carrusel de fotos no es un vídeo: no hay archivo que servir, y el
    // rótulo lo dice en vez de dejar un hueco de clip que nunca se va a
    // llenar. TikTok los publica como láminas + audio, no como mp4.
    carrusel: 'Photo carousel'
  },

  // ---- Índice y meta de la portada ----
  // `resumen` es una PLANTILLA: {n} lo rellena Historia.astro con la MISMA
  // lista que numera las pantallas (capitulos.length), así que un capítulo
  // nuevo lo actualiza solo.
  // {min} YA NO EXISTE (2026-08-31): el rótulo decía «about 18 minutes» a un
  // lector que dispone de 4 a 9, y la cuenta sumaba `alt`, rótulos ARIA y
  // pistas de huecos — el 22.6 % de sus palabras en inglés. El porqué, con
  // los números, está en Historia.astro, encima de `resumenIndice`. Si
  // vuelve, se cuenta lo PINTADO, no este objeto.
  indice: {
    resumen: '{n} chapters',
    ver: 'See the index',
    aria: 'Chapters of this page'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LA FRANJA DE PRUEBAS (ola 2, 2026-08-31) — LOS PRIMEROS 90 SEGUNDOS
  // ═════════════════════════════════════════════════════════════════════════
  // Un lector voluntario de UBC dedica entre 4 y 9 minutos por perfil (su
  // convocatoria pide «10 to 15 applications/week (approximately 1 – 1.5
  // hours)»), y lo mejor de este CV vivía en el tercio final: los siete
  // certificados con número de credencial, las dos cartas firmadas por CEOs,
  // las cifras del sitio y el premio. Con 4 minutos, ese tercio final no
  // existe. Esta franja va DEBAJO de la cita de apertura y ARRIBA del índice,
  // sin una sola frase de prosa, y cada pieza enlaza a su capítulo.
  //
  // NINGUNA CIFRA DE ESTA FRANJA SE ESCRIBE AQUÍ. Las cuatro se CUENTAN en el
  // build: los certificados de `certs.filas.length`, las cartas de
  // `cartas.entregadas.length`, los premios de `premios.entregados.length` y
  // las cuatro del sitio de `contarCifras`/`contarPruebas` (los mismos
  // números que pinta el capítulo de los proyectos). Una franja de resumen
  // con números a mano es justo donde un CV se desincroniza de sí mismo.
  franja: {
    tag: 'Checkable, before you scroll',
    // 7 CERTIFICACIONES, 6 CON ID. El calificativo estaba escrito a mano y
    // decía «each with its credential ID»; la fila 4 (GREEN TECHNOLOGY
    // PROGRAMME, Bluesky Education) lleva `cred: ''` y su propia tarjeta
    // imprime «No credential ID published». O sea que la franja rotulada
    // «Checkable, before you scroll» — lo primero que ve un lector de cuatro
    // minutos — quedaba desmentida dos capítulos más abajo por la propia
    // página. Venía heredado del encargo (docs/cv-ola2/propuesta.md:65 dice
    // «7 certificaciones verificables con su ID») y se copió tal cual.
    // Ahora el segundo número TAMBIÉN se cuenta, como los otros cuatro de
    // esta franja: `{n}` lo rellena Historia.astro con las filas que de
    // verdad tienen `cred`. Si mañana llega el ID que falta, la frase pasa
    // sola a decir 7 de 7.
    // ── Y AHORA DICE QUÉ TRAE LA SÉPTIMA, NO SOLO QUE LE FALTA (2026-09-01)
    // Con «{n} of them with a credential ID» la franja era exacta y se leía
    // como una carencia: seis de siete, y la séptima ahí sin decir qué es.
    // Desde que su tarjeta publica lo que el certificado SÍ imprime —Shaw
    // Foundation Alumni House y el rango de fechas—, la franja lo dice
    // también, y las dos cifras suman las siete. NINGUNA de las dos está
    // escrita: `{n}` son las filas con `cred` y `{d}` las que tienen
    // `dondeCuando`, y Historia.astro tumba el build si entre las dos no
    // cubren todas las filas.
    certsQ: 'certifications: {n} with a credential ID, {d} with the venue and dates printed on the certificate',
    cartasQ: 'letters signed by CEOs in Singapore, with the contact each of them gave',
    sitioN: 'smartfinance.lat',
    sitioQ: 'a site I built: {p} automated tests · {l} bilingual lessons · {f} cited sources · {g} glossary terms',
    premiosQ: 'award — GreenTech Summit 2026, and its only source is a letter',
    // Sufijo del nombre accesible de cada pieza: son enlaces, y «7» a secas
    // no dice a dónde llevan.
    ir: 'Go to “{s}”'
  },

  // ---- Títulos de capítulo ────────────────────────────────────────────────
  // EL ORDEN LO PIDIÓ JAIME (mensaje del 2026-08-27) y es el de esta lista:
  // su frase de apertura primero, después experiencias y voluntariados,
  // después los proyectos ARRANCANDO por el grupo estudiantil, después el
  // canal de difusión, después el Reto Actinver y el private equity A LA PAR,
  // después las certificaciones, y al final la frase. Ver la cabecera de
  // Historia.astro para qué se movió de dónde.
  //
  // El PRIMERO lleva su nombre como titular (el título de aquí solo sale en
  // el índice) y el ÚLTIMO es la frase final.
  // JAIME PIDIÓ FUSIONAR (brief del 2026-08-28) los capítulos de las
  // conversaciones y del canal: primero las conversaciones, después el
  // teaching, en UN capítulo.
  //
  // ── LAS CLAVES SON NOMBRES, NO NÚMEROS (2026-09-01) ───────────────────
  // Eran `c1`…`c11`, o sea la POSICIÓN. Con eso, mover un capítulo dejaba
  // `c10` significando otra cosa en cinco sitios —el índice, la marca de
  // «esto lo firma un tercero», tres rótulos accesibles de la franja y la
  // fuente del premio— y ninguno se quejaba, porque `c10` seguía existiendo.
  // El orden vive AHORA en un solo sitio: la lista `capitulos` de
  // Historia.astro, con los bloques JSX en ese mismo orden. Aquí sólo viven
  // los títulos.
  // ── DE NUEVE A ONCE, Y UN CAPÍTULO SE MOVIÓ (ola 2, 2026-08-31) ────────
  // Entran DOS capítulos nuevos y ninguno inventa nada:
  //  · c3 «School, grades and English» — el CV no tenía UN SOLO dato
  //    académico (comprobado: ni promedio, ni cálculo, ni idioma en
  //    pantalla) y es la primera pregunta de cualquier solicitud. Lo que
  //    existe se publica; lo que no, es hueco marcado.
  //  · c9 «Awards» — Ivey evalúa los premios EN SECCIÓN APARTE. Había siete
  //    certificados (que son cursos) y cero competencias, y el único premio
  //    estaba enterrado en el capítulo de las cartas.
  //
  // ── Y LAS CARTAS Y LOS PREMIOS SUBEN AL 3 Y AL 4 (2026-09-01) ─────────
  // Estaban en el 10 y el 9: medido sobre la página pintada, la primera
  // carta firmada por un CEO empezaba en el 88.7 % del documento. Las cuatro
  // razones de por qué van justo ahí —y no antes de experiencia, ni después
  // de los proyectos— están en la cabecera de `capitulos` en Historia.astro,
  // con los números.
  //
  // Y «Everyone brings something» BAJA detrás de los proyectos.
  // Es el capítulo con DIEZ de los quince huecos de texto de la página, y
  // era la quinta pantalla. El orden que pidió Jaime el 2026-08-27 ponía su
  // canal DESPUÉS de los proyectos («luego mis proyectos y arrancas con el
  // grupo estudiantil, luego mi canal de difusión»); el brief del 2026-08-28
  // fusionó conversaciones y canal y dijo «primero la gente, después lo que
  // él enseña solo», que es el orden DENTRO del capítulo y se respeta igual.
  // ES REVERSIBLE EN UNA LÍNEA: el orden lo manda la lista `capitulos` de
  // Historia.astro y el orden de los bloques JSX. Si Jaime lo quiere arriba,
  // vuelve arriba.
  caps: {
    abro: 'I opened my eyes',
    grupo: 'I founded a student group, and I lead it',
    conversaciones: 'I got executives, professors and entrepreneurs to sit down with me',
    cartas: 'What two CEOs wrote about me',
    grupoHace: 'What I organize with the group',
    voluntariados: 'Serving',
    construi: 'What I built: smartfinance.lat, my channel, my family’s store',
    premios: 'Awards',
    expediente: 'School, English, certifications — and the whole list',
    frase: 'The sentence'
  },

  // ══════════════════════════════════════════════════════════════════════
  // EL MICRÓFONO DE PARTÍCULAS — la pieza que diseñó Jaime (2026-09-02)
  // ══════════════════════════════════════════════════════════════════════
  // Aquí van SOLO las palabras del módulo. Los nombres y los cargos NO se
  // repiten: la ficha de cada nodo los toma de `entrevistas.personas`, que es
  // donde ya viven con su fuente. Repetirlos sería tener dos sitios donde
  // corregir un cargo, y un cargo mal puesto en un CV que va a un comité es
  // un problema serio (son las palabras de PENDIENTE.md).
  //
  // LA LÍNEA QUE HACE HONESTO EL MÓDULO ES `lede`. De los once puntos, siete
  // son personas y cuatro son países, y NO prueban lo mismo: conseguir que un
  // ejecutivo de FX se siente delante de una cámara es liderazgo; grabar un
  // vídeo con datos de Japón es constancia y audiencia. Un lector de
  // admisiones lo nota en dos segundos. Dicho en una línea, deja de ser un
  // problema y pasa a ser la estructura de la pieza.
  mic: {
    eyebrow: 'Index and overture',
    h: 'What you can hear here',
    // `{n}` lo rellena el componente con NODOS.length: escrito a mano, el
    // número mentiría en cuanto entre el punto 12 (Rendón y Durán).
    piezas: '{n} pieces',
    // ── ERA UN CALCO DEL ESPAÑOL Y NO ERA UNA ORACIÓN (2026-09-02) ──────
    // Decía «The seven people are the leadership — who I got to sit down with
    // me», traducido palabra por palabra de «a quién conseguí sentar conmigo».
    // En español ese «a quién» abre una interrogativa indirecta y funciona; en
    // inglés queda una relativa sin antecedente, o sea media frase. Y es la
    // SEGUNDA que lee quien lo nomine para la Pearson.
    // ── TRES GRUPOS, Y MÉXICO YA NO SE DESMIENTE (ola 4) ──────────────────
    // Decía «what I say when nobody is asking» de los cuatro países, y la
    // primera fila de países decía «I was selected to represent Mexico»: la
    // línea que existía para no inflar los países desinflaba el único que
    // prueba liderazgo. Y entran Moris y Marg como EXPERIENCIAS (consejos que
    // pidió, no entrevistas), que es la palabra de Jaime: «episodio de podcast
    // o de experiencia de Moris Dieck o Marg».
    // ── «SOMETHING THAT EXISTS» NO ERA VERDAD PARA RENDÓN (ola 4) ────────
    // Su punto abre una ficha sin enlace (la grabación no está publicada), y
    // el lede prometía que cada punto abría algo existente. El nodo se queda
    // —es el índice de lo que hay—; el lede dice lo que abre de verdad: una
    // grabación, una publicación o la ficha que dice qué falta.
    lede: 'Every point opens a recording, a publication, or the note that says what is still missing. The people are the leadership: the ones I got to sit down with me. Two are advice I asked for, not interviews, and they say so. The countries are the voice: what I explain to camera — and Mexico is the one I was chosen to represent. They are not the same thing, and this page does not pretend they are.',
    // El pie del micrófono: es a la vez la entrega al documento y la promesa
    // de que arriba no se cuenta nada que abajo no esté entero.
    sigue: 'Everything below is the long version. Nothing up here replaces a chapter.',
    // `{n}` lo rellena el componente, como `piezas`: escrito a mano decía
    // «eleven» cuando ya eran catorce.
    indiceAria: 'What the microphone opens: {n} pieces',
    // Lo que se lee sin JavaScript, sin WebGL o con «menos movimiento»: la
    // lista de abajo ES el micrófono. No se pierde nada salvo el dibujo.
    sinLienzo: 'The drawing needs WebGL. The list is the same {n} pieces.',
    // Rótulos de los tres grupos del índice.
    grupoPersonas: 'People I recorded',
    grupoExperiencias: 'People I asked for advice',
    grupoPaises: 'Countries I explained',
    bajar: 'In the chapter',
    // Qué abre cada punto. Una línea, y ni una palabra que no esté ya probada
    // más abajo. Los cargos NO se repiten aquí.
    abre: {
      // ── DECÍA «THE FULL EPISODE» Y EL ENLACE ABRE LA EMISIÓN (ola 4) ──
      // El vídeo es la emisión de 30 min de ExprésaTec del 16 de abril de
      // 2026 y el podcast de Jaime es un segmento dentro cuyo minuto la
      // propia página declara desconocido. Si fuera su episodio completo no
      // faltaría el minuto; si falta el minuto, no es su episodio completo.
      podcast: 'The podcast I organized in the Financial Trading Room at Tec. It aired inside the school channel’s programme; the link opens that full broadcast.',
      // La cinta lo prueba: «gracias por la invitación» (parte 1, 00:00:21).
      // Sin enlace de TikTok todavía: el punto baja a su tarjeta.
      rendon: 'The episode I organized and hosted; he opens by thanking me for the invitation.',
      // ── DECÍA «Y ESTA ES LA QUE TIENE RECIBO», Y ERA FALSO (2026-09-02) ──
      // De las cuatro partes, TRES tienen id público: la 2
      // (7660806476172184852, además descargada en `cv-clips/` con su
      // `.info.json`, 69 s), la 3 (7663530569631911188, en
      // EVIDENCIA-LINKEDIN-TIKTOK.md) y esta, la 4. La única sin recibo es la
      // 1 — y eso es exactamente lo que dice el comentario interno del nodo en
      // `microfono.mjs`. La ficha generalizaba al revés Y en exclusiva, o sea
      // desmentía al fichero de evidencia del propio proyecto dentro del
      // módulo cuyo argumento entero es que cada punto abre algo comprobable.
      // Ni «cuatro» ni «la última» tienen recibo: con id público hay tres
      // (2, 3 y 4) y nadie ha mirado si hay una quinta. Se dice lo que hay.
      mauricio: 'Part 4 of the podcast I recorded with him. Parts 2 and 3 are on my TikTok too.',
      lloyd: 'The interview in Singapore with the man who signed one of my two letters.',
      andy: 'The interview with the other signatory, during the programme.',
      raul: 'The conversation with the president of Student Groups.',
      nus: 'The interview about what it takes to be at a top-8 university.',
      jesus: 'The interview at sunset, with the Marina Bay skyline behind us.',
      mexico: 'I was selected to represent Mexico and presented about it at NUS.',
      singapur: 'Why the world’s money lives there.',
      japon: 'Financial data from Japan.',
      canada: 'Why I chose this country for my future.',
      // ── LAS DOS EXPERIENCIAS: consejos que pidió, no entrevistas ───────
      // Y lo dicen en la misma línea. Moris: LI-21 («I hope to have the
      // opportunity to interview him in the future»). Marg: LI-20, sin cargo
      // (cfainstitute.org lista hoy a Tricia Rothschild como Interim CEO).
      dieck: 'His talk at Tec, organized by HSBC; I asked him for advice on my own podcast. The interview does not exist yet, and this point does not pretend it does.',
      marg: 'The day I asked her for advice about studying in Canada: my post and my photo with her. A question and her answer — not an interview.'
    },
    // El verbo del enlace, por tipo de pieza. NO todos son «episodio»: el de
    // Jesús Gutiérrez Parra es una EMISIÓN de media hora en YouTube (el
    // podcast va dentro), los demás son clips de un minuto en TikTok, y las
    // experiencias abren una publicación. Llamarlos igual sería inflarlos.
    // `ficha` es para los nodos que hoy abren la ficha DENTRO del CV porque
    // su enlace no ha llegado.
    ver: {
      episodio: 'Watch the broadcast',
      conversacion: 'Watch the conversation',
      video: 'Watch the video',
      experiencia: 'See the post',
      ficha: 'See the card'
    },
    // Nombres de los cuatro países. Los de las siete personas salen de
    // `entrevistas.personas`.
    paises: {
      mexico: 'Mexico',
      singapur: 'Singapore',
      japon: 'Japan',
      canada: 'Canada'
    },
    // ⚠️ EL ÚNICO DATO QUE FALTA DEL MÓDULO, Y VA COMO HUECO EN PANTALLA.
    // El enlace del podcast de la sala FTR resuelve (comprobado el 2026-09-02)
    // a la emisión del día del programa ExprésaTec del 16 de abril de 2026,
    // 30 minutos. El podcast de Jaime es un SEGMENTO dentro; no hay fuente
    // para el minuto en el que empieza, así que no se escribe.
    minutoQue: 'The minute of that broadcast where my podcast starts'
  },

  // ══════════════════════════════════════════════════════════════════════
  // LOS HUECOS DE MATERIAL, ESCRITOS PARA EL LECTOR (ola 4)
  // ══════════════════════════════════════════════════════════════════════
  // Ni preguntas ni rutas: solo QUÉ falta. La pregunta entera vive en
  // `cv-material/PENDIENTE.md`, fuera del repo.
  materialQue: {
    rendonLink: 'The link to this episode on TikTok',
    rendonFoto: 'A photo of the recording',
    duranCargo: 'Manuel Durán’s title, as he states it himself',
    duranVideo: 'The video of the episode with Manuel Durán',
    majoCargo: 'María José Cortés’s role, as she states it herself',
    majoClip: 'The clip of this conversation, when it is published'
  },

  // ---- Capítulo 1: portada ----
  // ══════════════════════════════════════════════════════════════════════
  // OLA 4 (2026-09-03): LOS EPISODIOS, EL TALLER Y LAS LÍNEAS DE CIERRE
  // ══════════════════════════════════════════════════════════════════════
  // Texto de cv-material/OLA4-CONTENIDO.md, pegado tal cual. Cada frase es
  // una de cuatro cosas: verbatim de una cinta (con archivo y minuto en ese
  // documento), palabra de Jaime con `dichoSuyo` debajo, un hueco, o una
  // traducción rotulada. Ni una frase inventada sobre Jaime.
  //
  // RENDÓN tiene cinta (≈29 min 37 s en dos partes, transcritas por whisper)
  // y por eso va SIN marca de «palabra suya»: su recibo es la propia
  // grabación, donde él abre con «gracias por la invitación» (parte 1,
  // 00:00:21). Los diez clips existen como ARCHIVOS; no se afirma que estén
  // publicados. DURÁN no tiene cinta: su línea vive en su tarjeta con
  // `dichoSuyo` y dos huecos (`materialQue.duranCargo`, `duranVideo`).
  podcasts: {
    h: 'Episodes I organized myself',
    rendon: 'I organized and hosted an episode with Miguel Ángel Rendón. The recording is done and transcribed, and ten clips have been cut from it.',
    rendonFuente: 'From the recording itself: he opens with “gracias por la invitación” — thank you for the invitation.',
    clipsH: 'The ten clips',
    clips: 'Ten clips are cut from the episode: my future self · LinkedIn without fear · the myth of starting a business · “too many finance graduates” · it is the person who shines · the welcome · a real day in finance · AI in finance · the hardest decision · myths, true or false.'
  },

  // LO QUE DIJERON ELLOS, verbatim de la cinta. Son palabras de un tercero:
  // van en <blockquote> con <cite>, como las cartas, y NUNCA en el hueco
  // «Lo que me llevé», que es de Jaime. En inglés son traducción y lo dice
  // `cintaTag`. Rendón: parte 1 · 00:08:43 → 00:09:05 y parte 2 · 00:13:05 →
  // 00:13:13 (las dos que hablan a un alumno de prepa; R2 y R4 quedan fuera).
  // Majo: IMG_4424 · 00:00:35 → 00:00:44 y 00:01:15 → 00:01:59; el «[…]» tapa
  // el tramo que salta.
  dijo: {
    el: 'What he said',
    ella: 'What she said',
    enCinta: 'on the recording',
    rendon: [
      '“I think the main one — the main one, the one that has helped me and the advice I always give students — is relationships. Building relationships, building a network. A student in the last year of high school must, without fail, start building their LinkedIn.”',
      '“Convince yourself that what you do now is out of love for your future self. That is: what you put away today, what you save today, what you invest today, your future self will enjoy.”'
    ],
    majo: [
      '“I would definitely be much more curious than I was, and that is what I can recommend to you. I would pay much more attention to what is happening in the world, what is happening around me.”',
      '“Don’t lose your way; don’t take the easy doors. […] Make the most of your time, because it is the resource we have least of as we grow up.”'
    ]
  },

  // EL TALLER DE FINANZAS PERSONALES. Recibos: `apertura-jaime.txt`
  // [00:00:00 → 00:00:17] («este taller lo organizamos»), `gustavo-apertura.txt`
  // [00:00:12 → 00:00:26], la diapositiva S.M.A.R.T. en `taller-4603.jpg`,
  // once testimonios grabados por Jaime a la salida (IMG_9408, 9397, 9395,
  // 9405, 9407, 9399, 9400 son los siete de aquí), y su LinkedIn, que lista
  // «personal finance workshops» en dos sitios. LO QUE NO SE ESCRIBE: cuántos
  // fueron, cuándo, en qué aula, el apellido y cargo de Gustavo, «flujo de
  // caja / gastos fijos» (solo en un LEEME que cita transcripciones que no
  // están), y ninguna frase de impacto que no digan ellos. Los testimonios
  // van SIN nombre: son compañeros menores de edad.
  taller: {
    h: 'The personal-finance workshop',
    que: 'My group organized a personal-finance workshop at my school. I opened it and introduced the speaker, Professor Gustavo, who told the room it was the first talk he had ever given at a high school.',
    queFuente: 'From the recordings of that day. My LinkedIn lists “personal finance workshops” among the group’s activities, in two places.',
    asistenciaQue: 'How many people came',
    aperturaH: 'How I opened it',
    apertura: '“First of all, thank you very much to everyone who came, to everyone interested in this workshop. We organized it with a lot of care; it will be something very simple, with activities, so that it is interactive and not boring for you, like just another class. So, first, let’s start with this, our speaker, with Professor Gustavo.”',
    aperturaTag: 'Said in Spanish, on the recording. This is a translation; the original is in the Spanish panel.',
    gustavo: '“The truth is, this is the first time I give a talk at a high school. I have always given them at the business school or at the chambers.”',
    gustavoQuien: 'Professor Gustavo, opening the workshop',
    gustavoQue: 'Professor Gustavo’s surname and title',
    temaH: 'What he taught',
    tema: 'Financial goals with the S.M.A.R.T. method, the 50-30-20 rule, CETES, and the small expenses that add up.',
    temaFuente: 'The S.M.A.R.T. slide is in the photos; the rest is what the attendees themselves said on camera.',
    testimoniosH: 'What they said on their way out',
    testimoniosLede: 'I recorded these myself at the door, with one question: what are you taking with you? Their words, untouched.',
    testimoniosTag: 'Said in Spanish. These are translations; the originals are in the Spanish panel.',
    testimonios: [
      { cita: '“Learning how CETES work, investments, the 50-30-20 rule and SMART goals, to manage my finances better.”', quien: 'a student who attended' },
      { cita: '“I am taking a lot of knowledge with me: to manage my money better, make smarter purchases and have a safe investment for the future.”', quien: 'a student who attended' },
      { cita: '“I am taking a lot of knowledge of the basics of finance, like the expenses you sometimes don’t notice, right? Small expenses that, at a certain point, are a lot of money, right?”', quien: 'a student who attended' },
      { cita: '“The drive to be better professionals, and to see from the inside what they can achieve.”', quien: 'a teacher who attended' },
      { cita: '“How to organize myself and control my expenses […] and learning about the 50, 30 and 20.”', quien: 'a student who attended' },
      { cita: '“Strategies.”', quien: 'a student who attended' },
      { cita: '“Learning, and strategies.”', quien: 'a student who attended' }
    ],
    fotosH: 'That day',
    // Las fotos pasan por build-photos.mjs (huella en el nombre); el orden es
    // el de la página: el tema, la sala, y una pregunta desde el fondo.
    fotos: [
      { id: 'cv-taller-4603.webp', alt: 'Professor Gustavo, in a brown blazer and light-blue shirt, speaking in front of the projected slide “Metas Financieras”, with the S.M.A.R.T. method spelled out and a savings example in pesos', pie: 'The S.M.A.R.T. slide.' },
      { id: 'cv-taller-4573.webp', alt: 'The speaker from behind, facing the rows of blue auditorium seats full of students; a classmate films with a phone on a gimbal', pie: 'The room, from the front.' },
      { id: 'cv-taller-4609.webp', alt: 'Wide view of the auditorium; at the back, a student raises a hand', pie: 'A question from the back.' }
    ]
  },

  // El capítulo «Lo que organizo con el grupo»: la entradilla, en la voz de
  // la página, dice qué dos cosas junta y con qué recibo cada una.
  grupoHace: {
    lede: 'What the group organizes, with its receipts: a personal-finance workshop — recordings, photos and the attendees’ own words — and the Reto Actinver, with its calendar from the source.'
  },

  // LOS RÓTULOS DE LOS PLEGADOS (OLA4 §6.3). Plegar es recortar sin borrar:
  // lo que va dentro sigue siendo prueba y se imprime abierto.
  // Los tres subtítulos del expediente (ola 4): eran capítulos.
  expedienteSub: { acad: 'School and English', certs: 'Certifications', exp: 'Experience — the whole list' },

  plegado: {
    masFotos: 'More photos',
    masDijeron: 'More of what they said',
    otrosDos: 'The other two',
    reto: 'The contest calendar and my portfolio',
    abrir: 'Open the photo at full size',
    pendiente: 'Still to come',
    cinta: 'The live tape: three prices from the site',
    verifica: 'What the letters verify, line by line',
    mas: 'More'
  },

  // LA LÍNEA DE CIERRE DE CADA CAPÍTULO (mono, una por capítulo): dice qué
  // queda probado y con qué. Es la regla 3 de la especificación de estructura.
  cierre: {
    grupo: 'Proven: founded and president — my LinkedIn, and Lloyd George’s letter.',
    conversaciones: 'Proven: every conversation above opens with its own link; the ones without one say so.',
    cartas: 'Proven: two signed letters, quoted untouched, with the contact each signatory gave.',
    grupoHace: 'Proven: one workshop with its recordings, its photos and the attendees’ own words; the contest calendar from its source.',
    voluntariados: 'Proven: my posts, my photos, the clip — and the beach clean-up signed by Lloyd George.',
    construi: 'Proven: a site loaded live inside this page; four figures counted by the build; a store you can open.',
    premios: 'Proven by one source only — a letter. The diploma is still to come.',
    expediente: 'Proven: seven certifications, six with a credential ID; one English exam still to sit.'
  },

  head: {
    eyebrow: 'Curriculum vitae',
    name: 'Jaime Sandoval Ricaño',
    // EL NOMBRE PARTIDO EN DOS, para la portada a sangre. No se parte con
    // JavaScript ni con un `<br>` dentro de la cadena: son dos claves, y las
    // dos juntas dicen exactamente lo mismo que `name`, que sigue siendo el
    // que leen el `<title>` y cualquier sitio donde el nombre va de una pieza.
    // Cada mitad es un `<span>` de bloque, así que si no cabe (320 px con el
    // texto al 200 %) parte por su cuenta como cualquier otro renglón.
    nameL1: 'Jaime Sandoval',
    nameL2: 'Ricaño',
    site: 'smartfinance.lat',
    // El señuelo de bajar, entre las dos mitades del nombre.
    senuelo: 'Scroll to read',
    // Su meta, dicha por él (texto de Jaime, pendiente de su revisión final):
    // programas de negocios en Canadá, entrada septiembre de 2027.
    // SOLO EL AÑO (decisión de Jaime, 2026-08-28): nada de meses en pantalla.
    meta: 'Business programs in Canada · 2027 entry',
    // ---- Su primera foto: el panel con micrófono (LA ELIGIÓ ÉL) ----
    // Del brief del 2026-08-28: él con micrófono en un panel en Singapur,
    // con los logos de Mitsubishi Heavy Industries y Forest City
    // International School detrás. Entra por build-photos.mjs con huella
    // (`cv-retrato-*`), como todas.
    fotoAlt: 'Me speaking into a microphone on a panel, with the logos of Mitsubishi Heavy Industries and Forest City International School on the screen behind me.',
    retratoPie: 'Singapore · on a panel, 2026',
    // ---- La foto de la portada ----
    // NO ES DE JAIME, y por eso lleva crédito. Jochem Raat (@jchmrt), Licencia
    // Unsplash: uso libre, también comercial, y la atribución NO es
    // obligatoria — se pone igual, porque es la línea que separa usar una
    // licencia de aprovecharse de ella y porque este sitio acredita todas sus
    // fuentes. La procedencia completa y la fecha de verificación están en
    // public/assets/portada/LICENCIA.md.
    // A COLOR desde el brief del 2026-08-28 (el B/N grabado se quitó).
    portadaAlt: 'The Toronto skyline seen from the water at dusk: the CN Tower lit over the downtown towers, and the lake in front of them.',
    portadaPie: 'Toronto · photograph by Jochem Raat, Unsplash',
    // El rótulo que dice de qué foto habla la descripción visible. Ver el
    // comentario de `.portada-alt` en Historia.astro: sin él, la descripción
    // de la portada se leía como el pie de la foto que va justo debajo.
    portadaAltRotulo: 'The cover',
    // ---- La Torre CN de Jaime, ya en el cuerpo ----
    // HECHO VERIFICADO, no una frase sobre Jaime: la foto es suya y la publicó
    // él. Sale de su TikTok del 20 de julio de 2026 (@smart.financee, vídeo
    // 7664460671727258900, «Canada is not just beautiful it's one of the
    // smartest places in the world»); aquí va el mismo encuadre sin el texto
    // que llevaba sobreimpreso. La fecha que se escribe es la de PUBLICACIÓN,
    // que es la que se puede comprobar abriendo el perfil — misma regla que
    // las fechas del arco de Singapur (`tiktok.arcoFuente`).
    // La Torre CN sí sigue en blanco y negro: SU original es B/N (así la
    // publicó él). Solo el año en el pie, como todo el CV.
    torreAlt: 'The CN Tower in Toronto seen from below, in black and white: the mast against an overcast sky, the observation deck, and two office buildings at the edges.',
    // ── EL PIE, CON SUS PALABRAS (mensaje del 2026-08-29) ──────────────
    // Textual suyo: «la tomé cuando fui a visitar los campus de Toronto,
    // esta foto me inspira diario a continuar creciendo ya que mi meta está
    // ahí». Pulido SOLO en ortografía y puntuación, sin tocar el sentido ni
    // el vocabulario — patrón voz.*, pendiente de su revisión final. Esta
    // versión inglesa es TRADUCCIÓN y lo dice `torrePieTag` (vacío en
    // español, que es donde está el original).
    torrePieVoz: '“I took it when I went to visit the Toronto campuses. It inspires me every day to keep growing: my goal is there.”',
    torrePieTag: 'My words, in Spanish. This is a translation; the original is in the Spanish panel.',
    // La procedencia NO se pierde con el pie nuevo: sigue diciendo que la
    // foto es suya y de cuándo (la fecha comprobable es la de publicación
    // en su TikTok, misma regla que el arco de Singapur).
    torrePie: 'Toronto · my photograph (2026)',
    // ── LA LÍNEA QUE SOLO EXISTE EN PAPEL (ola 2, 2026-08-31) ───────────
    // La vista impresa es un SUBCONJUNTO —experiencia, expediente,
    // certificaciones, premios, cartas y la frase—, porque el documento
    // entero salían veinticuatro hojas y nadie adjunta eso. Esta línea es
    // la que impide que el recorte sea un disimulo: la hoja dice, en su
    // primera línea, que hay más y dónde está. NO nombra la dirección: la
    // dirección del CV es su credencial y no se escribe en ninguna parte
    // (ver la regla de CV_SLUG en CLAUDE.md); quien tiene el papel lo
    // imprimió desde la página, y el pie del navegador ya la escribe si
    // quien imprime lo deja puesto.
    // SIN «and the two signed letters as files»: los PDF salieron de la página
    // el 2026-09-01 (ver el bloque de `cartas`), así que esa frase mandaba a un
    // nominador a buscar en la web dos archivos que ya no están — y en un
    // documento impreso, que es el que puede acabar adjunto a una nominación,
    // una promesa que no se cumple no se puede corregir después.
    impresionNota: 'Printed summary: experience, school record, certifications, awards, letters and the closing sentence. The full CV — the photographs, the clips, the conversations and the site — is on the page this was printed from.'
  },

  // ---- Capítulo 5: los proyectos ────────────────────────────────────────
  // ARRANCA POR EL GRUPO ESTUDIANTIL porque Jaime lo pidió así. El texto del
  // grupo es el hecho que ya publica /community (`community.desc` de ui.ts),
  // en primera persona: venía del capítulo "Servir", donde el grupo se leía
  // como un voluntariado más. Es un proyecto suyo — lo fundó y lo preside —,
  // así que encabeza los proyectos y en Servir se quedan los voluntariados.
  proyectos: {
    grupoH: 'The student group',
    grupo: 'The student group I founded and lead: trips to the Mexican stock exchange, finance talks and workshops, and volunteering for our community and the environment.',
    // Su cifra del 2026-08-29, con el mismo trato que la del boletín: el
    // build no puede contar a la gente de una comunidad, así que va como
    // afirmación suya y marcada.
    grupoCifra: 'There are almost 200 of us in the community.',
    grupoLink: 'The community, on the site',
    // La línea que manda del grupo a lo que organiza con él (ola 4). `{s}` es
    // el título del capítulo, de `caps`: si el capítulo se mueve, el texto no miente.
    grupoTaller: 'What the group organizes — the workshop, with its recordings, and the Reto Actinver — is in “{s}”.',
    grupoAlt: 'The Smart Finance student group, in front of the group’s banner',
    // El cuadro del vídeo de promo del grupo (2026, @smart.financee): qué es
    // y de dónde sale, como piden los pies de foto del brief.
    sitioH: 'smartfinance.lat',
    // ---- Jasa Motor (bloque nuevo, brief del 2026-08-28) ----
    // FRAMING APROBADO POR JAIME: es la refaccionaria DE SU FAMILIA y él
    // desarrolló la tienda en línea y lleva el marketing para apoyar a su
    // papá. NO se usa «CEO». Verificado que existe: jasamotor.com.mx y
    // tienda.jasamotor.com.mx (consultadas 2026-08-28). Los datos del
    // negocio (Cuautitlán, 20+ años) salen del propio sitio de la
    // refaccionaria. Pendiente de su revisión final, como todo voz.*.
    jasaH: 'Jasa Motor',
    // EL AÑO ES 2025 y lo corrigió Jaime (2026-08-29): la tienda la creó en
    // 2025, no en 2026 como decía la línea del capítulo de experiencias.
    jasa: 'My family’s auto-parts business in Cuautitlán, State of Mexico, with more than twenty years of history. I built its online store and I run its marketing.',
    jasaAlt: 'Home page of the Jasa Motor online store: the logo with a piston in the A, a search by make, model, year and engine, the “Refacciones para Motor” heading and the best-sellers grid with real prices.',
    jasaPie: 'The store I built — tienda.jasamotor.com.mx',
    // ── MERCADO LIBRE: SOLO LO QUE ELLOS PUBLICAN ─────────────────────────
    // Dos datos, los dos de su página de vendedor y los dos con fecha de
    // consulta. Lo que NO entra —«0 productos», que es un artefacto de leer
    // una página que pinta su catálogo con JavaScript, y una calificación que
    // es de un producto y no del vendedor— está escrito junto al marcado.
    ml: 'The business also sells on Mercado Libre. Mercado Libre publishes its seller page as REFACCIONES JASA MOTOR, with “+3,100 seguidores” — more than 3,100 followers.',
    mlFuente: 'Mercado Libre’s own seller page, read on 2 September 2026. The store name and the follower count are theirs, not mine.',
    mlLink: 'The store on Mercado Libre',
    jasaLink: 'tienda.jasamotor.com.mx'
  },

  // ---- Capítulo 5: la prueba (el bloque del sitio) ----
  prueba: {
    // Lo único que este capítulo afirma por su cuenta, y es comprobable:
    // la página corre sobre el mismo código que el sitio público.
    // ── MÁS CORTO, POR PETICIÓN DE JAIME (2026-08-29) ──────────────────
    // «no expliques tan completo»: el bloque ahora dice su OBJETIVO, el
    // BOLETÍN por correo y su cifra de inscritos, y deja de explicar la
    // arquitectura del sitio. Lo que se quitó era cierto pero era una
    // ficha técnica; la frase de que los precios se piden al abrir se
    // queda porque es la que sostiene la cinta que va justo debajo.
    // ── MÁS CORTO OTRA VEZ, Y CON EL AÑO (Jaime, 2026-08-30) ───────────
    // «pon una imagen del header padre y describe para qué la creé y que la
    // creé desde 2025 empecé, promociona más lo de lessons y pon un link, y
    // que tengo más de 100 suscritos, omite tanto texto».
    // El lede pasa de tres frases a dos: PARA QUÉ y DESDE CUÁNDO. Lo que se
    // fue es la enumeración de lo que hay dentro — la enseñan la captura del
    // header, las cifras y el bloque de lecciones, que están justo debajo.
    //
    // ⚠️ EL AÑO ESTÁ EN DISPUTA CON UNA FUENTE PÚBLICA SUYA, igual que el
    // del grupo estudiantil. Él dice 2025 («que la creé desde 2025 empecé»,
    // 2026-08-30); su LinkedIn publica el proyecto smartfinance.lat como
    // «feb. 2026». Aquí va 2025 porque es lo que él afirma y es su vida, no
    // la de este repositorio — y la fila de `exp` se cambió a 2025 con el
    // mismo criterio, para que la página no se contradiga a sí misma. Los
    // dos años podrían ser ciertos (empezar en 2025 y publicar en 2026),
    // pero eso no lo dijo nadie y no se escribe. NO borres esta nota sin su
    // respuesta. Desde el 2026-08-31 el recibo cubre las CINCO fechas de
    // 2025 de la página, no solo esta y la del grupo.
    // Y LA DISPUTA SE LEE EN PANTALLA, no solo aquí: justo debajo de este
    // lede va `anioDisputa`, el mismo recibo en mono que llevan sus cifras.
    // Estuvo anotada solo en este comentario —invisible para quien lee— y
    // eso era el doble criterio que este archivo no se permite.
    lede: 'I started smartfinance.lat to make finance easier to understand for any student. This is its home page.',
    // El pie de la captura del header. Dice QUÉ es y DE CUÁNDO: la imagen
    // lleva dentro precios y una hora, y sin fecha sería una lámina de
    // cifras sin edad justo encima de una cinta que sí pide precios de
    // verdad al abrir esta página.
    // ── LAS LECCIONES, PROMOVIDAS (Jaime, 2026-08-30) ──────────────────
    // «promociona más lo de lessons y pon un link». Dejan de ser un renglón
    // suelto detrás de las cifras y pasan a bloque propio con su enlace. El
    // enlace es INTERNO (`route('lessons', locale)`), o sea /lessons en el
    // panel inglés y /es/lecciones en el español: el mismo destino que
    // https://smartfinance.lat/lessons, y además cada panel en su idioma.
    leccionesH: 'The lessons',
    leccionesQue: 'The part I would show first: {n} lessons, each written in English and Spanish, each one citing its sources.',
    leccionesLink: 'Read the lessons',
    // ── LA CIFRA DEL BOLETÍN ES SUYA, NO CONTADA ───────────────────────
    // Las tres cifras grandes de al lado las CUENTA el build de los
    // archivos del repo. Esta no puede: los inscritos viven en Redis, o
    // sea fuera del build, así que entra como AFIRMACIÓN SUYA con su
    // fecha — el mismo trato que el A2 de francés. Escribirla al lado de
    // las contadas sin marcarla sería prestarle su recibo.
    boletin: 'More than 100 people are signed up to the newsletter.',
    boletinH: 'The newsletter',
    // Las cifras de al lado se CUENTAN en el build desde los archivos reales
    // del repo (Historia.astro); estos son solo sus rótulos.
    stats: {
      // Este ya NO es un rótulo de cifra grande: va en una frase, con el
      // número delante, porque un «10» al tamaño de un titular no se sostiene.
      // Rótulo del renglón que acompaña a las cifras grandes. Ya NO lleva la
      // promoción de las lecciones: esa se fue a su propio bloque, arriba.
      lecciones: 'lessons — the sources above are theirs.',
      // Los tres rótulos de las cifras grandes. Cortos a propósito: van
      // debajo de un número enorme y compiten con él si se alargan.
      pruebas: 'automated tests, run on every change',
      fuentes: 'primary sources cited in the lessons',
      glosario: 'glossary terms, bilingual',
      // El 403 de los borradores: la promesa ética del sitio, verificable.
      // Una frase, no dos (2026-08-30, «omite tanto texto»). Lo que no se
      // puede perder es el 403: es la promesa comprobable, no un eslogan.
      promesa: 'One promise you can test: no AI-written text is published without a person approving it — asking the public endpoint for unreviewed drafts answers 403, on purpose.'
    },
    abrir: 'Open the site'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EL CONTRATIEMPO. UNO, REAL, Y CON LA FUENTE ESCRITA EN LA PANTALLA
  // ═════════════════════════════════════════════════════════════════════════
  // Sustituye a los ocho huecos «si algo salió mal» que había uno por
  // capítulo (ver la nota de `huecos`, junto a `contraOtro`).
  //
  // DE DÓNDE SALE, PALABRA POR PALABRA. De `docs/context/lessons.md` de este
  // mismo repositorio, entrada «Una cifra que se publica se MIDE, y se dice
  // contra qué línea base»: el commit que limpió las fotos sin usar presumía
  // de borrar «1.2 MB desplegados» y el PR repetía la cifra; sumados pesaban
  // **320 692 B**, cuatro veces menos. Era una estimación a ojo publicada
  // como si fuera una medición, de algo que `git ls-tree -r -l` da exacto en
  // un segundo. De ahí salió la regla del proyecto.
  //
  // POR QUÉ ESTE Y NO OTRO. Cumple las dos mitades que exige el nivel 5 de
  // Queen's —el hecho Y qué cambió después— y cumple además la regla de esta
  // página, que es la más dura de las dos: TIENE FUENTE, y la fuente es
  // comprobable por cualquiera que abra el repositorio. Un contratiempo
  // inventado para rellenar una rúbrica es exactamente lo que este CV no
  // hace.
  //
  // POR QUÉ VA EN EL CAPÍTULO DE LOS PROYECTOS Y NO EN UNO PROPIO. Se pinta
  // pegado a las tres cifras que el build CUENTA de los archivos del repo.
  // Ahí la regla no es una moraleja: es la razón por la que esas tres cifras
  // se cuentan en vez de escribirse. El contratiempo y su consecuencia se
  // leen en la misma pantalla.
  //
  // SIN ÉPICA, y por eso el texto es corto y no lleva ni un adjetivo sobre
  // lo que se aprendió. Dice qué escribió, qué midió después, y qué regla
  // dejó. Quien lo lea saca su conclusión.
  leccionMedida: {
    tag: 'What went wrong',
    h: 'I published a figure I had not measured',
    // Las dos cifras son las del documento, no redondeadas ni adornadas.
    que: 'Cleaning unused photos out of the build, I wrote that it saved 1.2 MB. Then I measured the files: 320,692 bytes — four times less. It was an estimate published as if it were a measurement.',
    regla: 'Since then the project has a rule: a figure that gets published is measured, and it says what baseline it was measured against. The three numbers above are counted by the build from the repository’s own files.',
    fuente: 'Written down the day it happened, in docs/context/lessons.md of this repository.'
  },

  // ---- La cinta (dentro del capítulo 2; mismo mecanismo que siempre) ----
  tape: {
    lede: 'Three of the assets the site follows, asked for when this page opens.',
    // ── DOS FRASES DONDE HABÍA CINCO (2026-08-30, «omite tanto texto») ──
    // Lo que NO se puede perder de aquí es lo que impide que esto se lea
    // como un dato en vivo: de dónde viene, que va con retraso, que se pide
    // al abrir y no continuamente, y que si el endpoint falla salen guiones.
    // Todo eso sigue; lo que se fue es la explicación de la caché.
    // RECORTADO EL 2026-09-01: las dos frases decían tres veces «de dónde
    // salen». El chip que va justo encima ya nombra la fuente y el retraso,
    // así que aquí sólo queda lo que el chip no dice: cuándo se piden y qué
    // pasa si no contestan.
    note: 'Asked for when you open this page, not continuously.',
    fail: 'If the endpoint does not answer, the prices stay as dashes and the chip says so. No figure on this page is typed in by hand.',
    price: 'Price',
    change: 'Change today',
    pending: '—',
    open: 'Open the asset page'
  },

  // ---- Capítulo 7: el reto y el private equity, A LA PAR ────────────────
  // Jaime lo pidió con esas palabras: «lo del portafolio de actinver a la par
  // del de private equity». No es un capítulo detrás de otro: son dos
  // columnas en escritorio y dos bloques apilados en el teléfono, con el
  // orden que él nombró (Actinver primero). Los rótulos de cada mitad; los
  // textos de dentro siguen siendo los de `reto` y `research`.
  dos: {
    actinverH: 'Reto Actinver',
    peH: 'Private equity research'
  },

  // ---- Capítulo 7, mitad derecha: research ----
  research: {
    // Una frase (2026-08-30): qué es. El «por qué lo hago» lo dice él en
    // `voz.dedicacion`, que va justo encima y es verbatim.
    lede: 'Analyst-style reports, with every figure traced to the filing it came from.',
    link: 'Open the report',
    ticker: 'Ticker',
    dataAsOf: 'Data as of',
    version: 'Version',
    status: 'Status',
    years: 'Fiscal years verified',
    statusLabel: { draft: 'Draft', review: 'In review', published: 'Published', none: 'Not started' } as Record<string, string>
  },

  // ---- Capítulo 5: Reto Actinver ----
  reto: {
    lede: 'A student stock-market contest played with fictional money, run on the Mexican exchange. The dates below are the published calendar of the edition.',
    calH: 'The calendar',
    linkPhase: 'Where the challenge stands today',
    linkMine: 'My contest portfolio',
    cal: {
      inscripciones: 'Registration',
      practica: 'Practice week',
      reto: 'The contest itself',
      premiacion: 'Prize-giving'
    },
    // La cartera del concurso, leída del MISMO archivo que /actinver.
    empty: 'No contest positions published yet: the edition has not started. This block fills itself from the same file the public page reads.',
    snapshot: 'Figures at the close of {date}, from the snapshot written into the repository after each trading day.',
    source: 'Calendar taken from retoactinver.com on {d}. Smart Finance is not affiliated with Actinver.'
  },

  // ---- Capítulo 4, segunda mitad: el teaching (su canal) ----
  // FUSIONADO con las conversaciones por decisión de Jaime (2026-08-28):
  // primero la gente, después lo que él enseña solo. RECLASIFICADO con el
  // material cosechado: aquí van SOLO los vídeos donde él da la información
  // —consejos, datos, noticias—; las conversaciones cara a cara viven arriba
  // (la de «skills», que estaba aquí, es una ENTREVISTA a una estudiante de
  // la NUS y se movió al carrusel, con su clip).
  tiktok: {
    perfil: '@smart.financee, on TikTok',
    // La línea que conecta los clips con las lecciones del sitio.
    nota: 'The clips and the site’s lessons are the same work in two formats: the same sources, a different length.',
    ensenaH: 'Why I record',
    // La voz de la página: qué es este bloque y de dónde sale cada pieza.
    // ── LOS SEIS QUE ELIGIÓ JAIME (2026-08-29) ──────────────────────────
    // Su mandato fue «solo los siguientes», y estos son, en su orden. Los
    // clips de consejos que vivían aquí salieron de la sección; los tres que
    // ya eran enlaces de texto (`sinImagen`) se quedan como estaban.
    // ── SE RECORTÓ Y SE DESHIZO EL RECORTE (2026-09-01) ─────────────────
    // Durante unas horas esta línea perdió su oración de en medio —«Four are
    // videos served from this domain — with sound, and they only start when
    // you press play»— con el argumento de que eso se ve en el propio
    // control del vídeo. Se devuelve, y por dos cosas que el recorte rompía:
    //  · LA FRASE QUEDABA COJA. Lo que sobrevivía era «The last two are photo
    //    carousels on TikTok, SO THEY LINK OUT»: un «así que» sin premisa.
    //    Sin la mitad que dice que las otras cuatro se sirven DESDE AQUÍ, el
    //    lector no tiene contra qué contrastar «enlazan fuera» — de hecho las
    //    seis enlazan a TikTok, así que la frase suelta no distingue nada.
    //  · SE PERDÍA EL ÚNICO AVISO DE QUE CUATRO LLEVAN SONIDO. Eso NO lo dice
    //    el control del vídeo: se descubre reproduciendo. Es la advertencia
    //    que un lector con audio abierto necesita ANTES de pulsar.
    // Cuesta 17 palabras de 3 608. La regla del recorte era quitar
    // repetición, no quitar avisos.
    ensenaLede: 'Six pieces I recorded myself, in the order I would show them. Four are videos served from this domain — with sound, and they only start when you press play. The last two are photo carousels on TikTok, so they link out.',
    // Títulos de los vídeos, tal como los publicó (o descritos por lo que se
    // ve cuando el vídeo no trae título). El año va aparte, en pantalla.
    // ── LO ENTRECOMILLADO ES EL ORIGINAL, EN SU IDIOMA (2026-08-29) ──────
    // Bajo un lede que jura «titles are the ones he published», este panel
    // traducía los títulos españoles DENTRO de las comillas: comillas de cita
    // sobre palabras que él nunca publicó. Regla ahora — la misma de
    // peTag/torontoTag: el original verbatim entre comillas (español si así
    // lo publicó) y la traducción FUERA, marcada «in English:». Los títulos
    // que ya estaban en inglés no llevan gloss.
    videos: {
      // El título del 2026-08-27 llega TRUNCADO en su info.json («…about the
      // fin…»), así que se cita solo hasta donde el original se puede leer y
      // el corte lleva su «…» dentro de las comillas. Inventarle el final a
      // una cita es exactamente lo que este archivo no hace.
      jpmvisit: '“📍🇸🇬 Visiting J.P. Morgan in Singapore and learning more about the fin…” — the visit, told to camera',
      nus: '“Tuve la oportunidad de presentar sobre México a estudiantes de la National University of Singapore” (in English: I had the chance to present about Mexico to National University of Singapore students)',
      singapur: '“Ahora entendí por qué aquí vive el dinero del mundo” (in English: Now I understood why the world’s money lives here) — Singapore',
      japon: '“Datos financieros de Japón” (in English: Financial data from Japan)',
      tokio: '“Lo creerías?” (in English: Would you believe it?) — financial facts about Japan, from the Tokyo Tower',
      canada: '“Canada is not just beautiful it’s one of the smartest places in the w…” — five financial facts about Canada'
    },
    // El carrusel de Canadá lleva la foto que YA ESTÁ en el capítulo 1 (la
    // Torre CN que hizo él), y la regla de Jaime es que ninguna imagen se
    // repite: aquí va el enlace y esta línea diciendo dónde está la foto.
    canadaNota: 'Its photo is the CN Tower one that opens this CV — it is not repeated here.',
    // ── LO QUE HABÍA DEBAJO Y YA NO ESTÁ (Jaime, 2026-08-30) ─────────────
    // «abajo de eso hay más fechas con títulos, quítalos y pon de link a mi
    // perfil de TikTok para ver todo mi contenido, con un botón ese, y nos
    // ahorramos todos los textos con fechas».
    // Debajo de los dos carruseles vivían DOS listas de renglones con año:
    // los tres consejos sin imagen (`sinImagen`) y «El arco de Singapur»
    // (`arcoH` + `arco` + `arcoFuente`), siete renglones que decían «2026»
    // siete veces. Las dos se fueron enteras y en su sitio va UN botón al
    // perfil, que es donde vive todo eso y más.
    // LO QUE NO SE FUE ES LA FOTO. El cuadro rescatado de la presentación en
    // la NUS vivía dentro del arco, pero Jaime pidió quitar TEXTOS CON
    // FECHAS, no fotos —y su brief del 2026-08-28 pide justo lo contrario
    // con las imágenes—, así que la figura se queda, ahora suelta. Lo único
    // que pierde su pie es el «(2026)»: era una fecha más.
    verTodo: 'See all my content',
    arcoImgAlt: 'Me, a microphone clipped to my collar, speaking beside a laptop showing a “Finance facts of Mexico” slide, in a lecture room at NUS',
    arcoImgPie: 'The presentation about Mexico at NUS — a photo of mine'
  },

  // ---- Capítulo 7: la gente ----
  // CADA ROL LLEVA FUENTE Y EL QUE NO LA TIENE SE QUEDA VACÍO. `tipo` dice qué
  // fue el encuentro cuando llamarlo "entrevista" sería falso; vacío = una
  // conversación suya, que es lo que dice el material.
  // · Andy Toh, «CEO, Bluesky Education» — el título de su propia entrevista
  //   (`post.andytoh.title` en src/i18n/ui.ts) y /about (About.astro).
  // · Jon Maier — NO es una entrevista suya. Lo único que el sitio publica es
  //   «Takeaways from JPMorgan's Chief ETF Strategist» con la foto descrita
  //   como «Jaime con otros cuatro asistentes en el escenario, al terminar la
  //   sesión» (`post.jpmorgan.title` y `alt.jpmorgan`). Así que va con su
  //   `tipo` diciendo lo que fue: una sesión a la que asistió. El CARGO sí
  //   está respaldado — About.astro lo escribe tal cual.
  // · Moris Dieck — el sitio SOLO dice «A conversation with Moris Dieck»
  //   (`post.moris.title`). «Financial analyst and content creator» no salía
  //   de ninguna fuente: fuera. `rol` vacío y `tipo` con las palabras que el
  //   sitio ya publica.
  // · Raúl Irabién — «Presidente de Grupos Estudiantiles» es el título de su
  //   propio TikTok; ese vídeo NO menciona al Tec, así que el Tec no va.
  // · Prof. Lloyd — «CEO, TAQ Pte Ltd», la primera línea de su propia carta,
  //   que esta página publica en el capítulo 8. Llevaba «National University
  //   of Singapore», que la carta desmiente; la nota completa está junto a
  //   su entrada, abajo. ESTA LISTA ES LA QUE MANDA: un `rol` que no aparezca
  //   aquí con su fuente no debería estar lleno.
  // ═══════════════════════════════════════════════════════════════════════
  // LA GRAFÍA DE LA EMPRESA: «Bluesky Education», UNA PALABRA Y UNA SOLA
  // MAYÚSCULA. Cambiada el 2026-09-01 — CON FUENTE, Y PENDIENTE DE QUE JAIME
  // LA CONFIRME. Lo segundo es tan parte de esta nota como lo primero.
  // ═══════════════════════════════════════════════════════════════════════
  // ── ESTO REVIERTE UNA PETICIÓN EXPLÍCITA SUYA, Y SIGUE SIN SU SÍ ───────
  // El sitio llegó a escribirla de tres maneras a la vez —«Blue Sky» aquí,
  // «BlueSky» en src/i18n/ui.ts y «Bluesky» en About.astro—, y el 2026-08-27
  // Jaime pidió unificarlas en «BlueSky»; el 2026-08-28 lo repitió. Así
  // estuvo hasta hoy. Las dos notas del material lo dejan por escrito y las
  // dos dicen lo mismo sobre el estado de la decisión:
  //   · cv-clips/EVIDENCIA-LINKEDIN-TIKTOK.md: «El sitio usa BlueSky, que es
  //     lo que Jaime decidió el 2026-08-27 […] Sigue pendiente de que él
  //     confirme si prefiere la del dominio.»
  //   · cv-material/cartas/CARTAS.md: «Recomendación: usar “Bluesky
  //     Education” […] Requiere que Jaime lo confirme.»
  // O sea que esta rama ADELANTA una decisión que el propio material marca
  // como suya. Se escribe así, y no callado, por dos razones: porque la
  // regla de esta página es que sin fuente no hay frase —y aquí la fuente de
  // la preferencia era él—, y porque el cambio NO se queda en el CV: sale a
  // cuatro páginas públicas e indexadas (`/about`, `/es/acerca` y las dos
  // portadas, que llevan el rótulo de una publicación suya en `ui.ts`
  // `post.andytoh.title`). Una ola del CV que reescribe el sitio público
  // tiene que decirlo en voz alta. SI ÉL DICE QUE NO, se revierte en los
  // cuatro archivos y esta nota pasa a decir que la grafía publicada no
  // coincide con la de sus firmantes.
  //
  // LO QUE CAMBIÓ ES QUE APARECIÓ LA FUENTE. Las dos cartas firmadas (los
  // PDF, en cv-material/cartas/, transcritos en su CARTAS.md) escriben el
  // nombre de la empresa en el mismo documento y NINGUNA de las dos lo
  // escribe como lo pidió él:
  //   · Lloyd George firma «Bluesky Education», y su correo va al dominio
  //     bluesky-education.com.
  //   · Andy Toh lleva membrete «BLUE SKY EDUCATION PTE. LTD.» —el nombre
  //     LEGAL registrado— pero firma «Bluesky Education», y su correo es
  //     Andy.toh@bluesky-education.com, que esta misma página publica.
  //   · Y el CERTIFICADO del Green Technology Programme, que esta página
  //     también enseña, imprime «BLUESKY EDUCATION» (MATERIAL.md, bloque C1,
  //     nº 4): en versales, pero UNA palabra.
  // O sea: el nombre legal es «Blue Sky Education Pte. Ltd.» y la marca de
  // uso corriente, la que usan sus dos CEOs, la del certificado y la del
  // dominio, es «Bluesky Education». «BlueSky» no es ninguna de las dos.
  //
  // POR QUÉ MANDA LA FUENTE Y NO LA PREFERENCIA. Es el nombre de una empresa
  // AJENA, no de Jaime, y este CV ya tiene escrita su regla para marcas de
  // terceros (el logo del Reto Actinver: se usa como lo publica su dueño,
  // sin recolorear ni reencuadrar). Una grafía inventada para una empresa
  // que aparece cinco veces en la página, junto a un correo de su dominio
  // real escrito al lado, es la clase de detalle que un comité comprueba en
  // diez segundos y que hace dudar del resto.
  // Si Jaime prefiere volver a «BlueSky», es una decisión suya y se cambia
  // aquí y en los otros tres archivos (src/i18n/ui.ts, About.astro,
  // Historia.astro) — pero entonces esta nota tiene que decir que la grafía
  // NO coincide con la de sus firmantes, y hay que acordarse de que el
  // cambio vuelve a salir del CV a las cuatro páginas públicas de arriba.
  // EL DOMINIO Y LOS CORREOS NO SE TOCAN NUNCA: van tal cual los escribió
  // cada firmante.
  entrevistas: {
    verVideo: 'Watch the conversation on TikTok',
    // ── LO QUE IMPIDE QUE ESTE CAPÍTULO SE LEA COMO UNA LISTA DE AVALES ──
    // El capítulo tiene la forma del bloque de citas de ondo.finance —el
    // carrusel de tarjetas negras: retrato, nombre, cargo y una frase
    // grande—, y esa forma, sin esta línea, dice «estas personas me
    // respaldan». Ninguna lo hace: él las entrevistó, y eso es lo que dice el
    // material del repo. La frase va en la voz de la PÁGINA (como
    // `prueba.lede` o `tape.note`), no en la de Jaime: no afirma nada sobre
    // él, describe qué es lo que se está enseñando.
    aviso: 'These are conversations I sought out and recorded. Nobody here is endorsing me: what is set large is what I took from each conversation, in my own words.',
    // El carrusel: rótulos de las flechas y de la región desplazable.
    carruselAria: 'Conversations, one card per person. Horizontal list; it scrolls sideways.',
    prev: 'Previous conversation',
    next: 'Next conversation',
    // El rótulo que va encima de cada frase grande, para que ni leyendo por
    // encima se pueda confundir de quién es.
    llevo: 'What I took from it',
    // ── FUENTE DE CADA FICHA (2026-08-28, MATERIAL.md fuera del repo) ────
    // · Mauricio Mercenario Nieto — «FX Sales & Trading» es el titular de su
    //   propio LinkedIn (capturado en la evidencia); el podcast está en
    //   @smart.financee. Que fue su mentor lo dice JAIME en su publicación de
    //   la AEM, y por eso va como cita en `tipo`, con marca.
    //   ⚠️ SON CUATRO PARTES, NO DOS (corregido el 2026-08-31). Aquí ponía
    //   «dos» y era el único hecho comprobablemente falso de la página: la
    //   propia tarjeta enlaza al vídeo titulado «Parte 4», así que quien
    //   hiciera clic veía el número 4 debajo de la palabra «dos». Lo que hay
    //   documentado en el material cosechado, con su id de TikTok:
    //     · pt. 2 — 7660806476172184852, 2026-07-10 («pt. 2 de la entrevista
    //       a @mauriciomercenario», en la descripción del clip descargado)
    //     · pte. 3 — 7663530569631911188, 2026-07-17 (listado de la cosecha)
    //     · Parte 4 — 7671351658227469588, 2026-08-07 (descripción del clip
    //       descargado, y ES EL QUE ENLAZA ESTA TARJETA)
    //   La 1 no está en la cosecha: se deduce de que él numeró la 2. La 4 es
    //   la más alta publicada al 2026-08-31. Si sale una quinta, esto y las
    //   dos cadenas `tipo` cambian de palabra; el número no se estima.
    // · La estudiante de la NUS — sin nombre publicado, y no se inventa: la
    //   ficha la nombra por lo que es. Su entrevista es el clip de «skills»
    //   que ANTES estaba en el capítulo del canal: Jaime avisó que es una
    //   ENTREVISTA, no un monólogo, y por eso vive aquí.
    // · El creador de contenido de EE. UU. — la publicación de Jaime sobre el
    //   cierre de Singapur lo describe así («a Christian content creator from
    //   the United States»); el vídeo se titula «Jesus ✍️». Sin más nombre
    //   publicado, la ficha usa la descripción de su post.
    // · Jesús Gutiérrez Parra — nombre y «estudiante de finanzas» salen de la
    //   publicación de Jaime sobre el podcast de la sala FTR.
    // · Sol — «fundadora de Callejeritos», de la publicación de Jaime sobre
    //   la marcha. Sin imagen utilizable: hueco de foto, no un invento.
    // Las tres caras nuevas (Lloyd, el creador de EE. UU., Mauricio) llevan
    // su `alt` AQUÍ y no en ui.ts: son fotos que solo existen en el CV. El
    // alt describe la imagen real (verificada mirándola), no la ficha.
    personas: {
      andy: { nombre: 'Andy Toh', rol: 'CEO, Bluesky Education', tipo: '' },
      // ⚠️ EL ROL NO ES «National University of Singapore», y la fuente que
      // lo desmiente ya está PUBLICADA EN ESTA MISMA PÁGINA. Su carta
      // (capítulo 8) abre diciendo «I am the Chief Executive Officer of TAQ
      // Pte Ltd […] Through an educational consultancy with Bluesky
      // Education, I taught Jaime over two weeks on a Green Technology
      // programme in Singapore». La NUS no sale ni una vez en la carta: lo
      // único que dice de la NUS es que Jaime entrevistó a ESTUDIANTES de
      // Business Administration de ahí. La afiliación venía del título que
      // el propio Jaime le puso a su TikTok («Interviewing Professor Lloyd
      // of the NUS», MATERIAL.md #16) y de su post («my NUS professor»), y
      // se explica sola: el programa se impartió en el Shaw Foundation
      // Alumni House, que está DENTRO del campus de la NUS. Dar clase en un
      // campus no es ser de la casa. Y desde que la ficha de la carta dice
      // que el «Prof. Lloyd» y Lloyd George son la misma persona, la página
      // se contradecía a sí misma a dos capítulos de distancia.
      // Se pone el cargo que firma él, y `tipo` explica el «Prof.».
      lloyd: { nombre: 'Prof. Lloyd', rol: 'CEO, TAQ Pte Ltd', tipo: 'I call him “Prof. Lloyd” because he taught me for two weeks on the Green Technology programme in Singapore. He signs his letter — in “Recommendation letters” — as CEO of TAQ Pte Ltd.', alt: 'Me, in a green Mexico jersey, interviewing Prof. Lloyd beside the large NUS letters' },
      nus: {
        nombre: 'A student at NUS',
        rol: 'National University of Singapore',
        tipo: 'Her name is not published, so this page does not invent it. The interview: “Los skills que ocupas para estar en una universidad top 8 mundial” (in English: the skills you need for a top-8 university in the world).'
      },
      jesus: {
        nombre: 'A content creator from the U.S.',
        rol: '',
        tipo: 'A Christian content creator I interviewed in Singapore, as my own post about the programme describes him.',
        alt: 'Me interviewing the U.S. content creator at sunset, with the Marina Bay skyline behind us'
      },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'A session I attended, not an interview of mine — “Takeaways from JPMorgan’s Chief ETF Strategist”, as the site puts it.'
      },
      // ── MORIS DIECK ES UNA EXPERIENCIA, NO UNA ENTREVISTA (ola 4) ──────
      // Sale del carrusel (que promete «conversations I sought out and
      // recorded») y va al bloque «People I asked for advice» con la cita de
      // su propio post (LI-21). `tipoTag` solo se pinta en español, donde la
      // cita del post es traducción.
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: 'A conference at Tec, Estado de México, organized by HSBC. In my own post: “Although he had a tight schedule, I had the chance to briefly speak with him and ask for advice on my own finance podcast.” No interview yet.', tipoTag: '' },
      // ── MARG FRANKLIN, SIN CARGO, Y ES UN HALLAZGO (2026-09-02) ────────
      // cfainstitute.org/about/governance/leadership-team, leída ese día,
      // lista a Tricia Rothschild como «Interim President and CEO» —y es
      // quien firma el certificado Investment Foundations de Jaime—. Marg
      // Franklin no aparece ahí. Que fuera CEO el día del evento es plausible
      // y no está probado con fecha; que lo sea hoy es falso según su propia
      // institución. Va con las palabras de Jaime (LI-20), que no caducan.
      marg: { nombre: 'Marg Franklin', rol: '', tipo: 'At the signing of the CFA Institute × Tec de Monterrey global agreement, at Campus Estado de México. In my own post: I heard “her story as a woman leading one of the most important organizations in the financial world”, and at the end I asked her for advice about studying in Canada, since she is Canadian herself. A question and her answer — not an interview.', tipoTag: '' },
      mauricio: {
        nombre: 'Mauricio Mercenario Nieto',
        rol: 'FX Sales & Trading',
        tipo: 'A podcast in four parts — and, in my own words on LinkedIn, “his mentorship has played an important role in my development”.',
        alt: 'Mauricio Mercenario and me seated in armchairs around a low table, recording the podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Finance student',
        tipo: 'The podcast I organized in the Financial Trading Room at Tec.'
      },
      // ── MIGUEL ÁNGEL RENDÓN, CON EL CARGO COMO LO DICE ÉL EN LA CINTA ──
      // Parte 1 [00:00:25 → 00:00:46]: «mi nombre es Miguel Ángel Rendón,
      // soy doctor en Ciencias Financieras por la EGA de Business School y
      // actualmente soy el director regional del Departamento de Contabilidad
      // y Finanzas en el TEC de Monterrey para la región Ciudad de México,
      // Santa Fe, Ciudad de México, Toluca y el Estado de México.» ⚠️ whisper
      // escribió «EGA de»; el LEEME lo corrige a EGADE (la escuela de negocios
      // de posgrado del Tec). Es la única palabra del cargo que no está
      // literal en la cinta, y va en la lista de preguntas a Jaime. HASTA QUE
      // ÉL CONFIRME, EL DOCTORADO NO SE PUBLICA en ningún idioma (estaba en
      // `tipo` con «EGADE» escrito como si fuera literal); el `rol` sí, que
      // ese es palabra por palabra. Cuando confirme, vuelve a `tipo`, no a
      // `rol` (el rótulo corto). `alt` vacío: no hay foto de la grabación.
      rendon: {
        nombre: 'Miguel Ángel Rendón',
        rol: 'Regional director of the Department of Accounting and Finance, Tec de Monterrey',
        tipo: 'As he introduces himself on the recording: regional director for the Mexico City, Santa Fe, Toluca and State of Mexico region. An episode of my podcast that I organized and hosted myself; he opens by thanking me for the invitation.',
        alt: ''
      },
      // ── MARÍA JOSÉ CORTÉS («Majo», «la miss»): grabada, sin cargo ─────
      // Entrevista de 2:09 (IMG_4424.MOV, transcrita). En la cinta solo se
      // dice su nombre; el cargo NO se inventa y va como hueco de material.
      // Que la organizó Jaime es afirmación suya (2026-09-02). DÓNDE se grabó
      // no está ni en la cinta ni en OLA4 §8: decía «at my school» / «en mi
      // prepa» y era un adorno; fuera.
      majo: {
        nombre: 'María José Cortés',
        rol: '',
        tipo: 'A conversation I organized and recorded — two questions. Her role is not said on the recording, so this page does not guess it.',
        alt: 'María José Cortés, long dark hair and a cream jacket, seated beside a desk with an open laptop in a Tec classroom'
      },
      // MANUEL DURÁN (ola 4): palabra de Jaime del 2026-09-02, sin cinta, sin
      // enlace, sin foto y SIN CARGO («director de negocios» está en su nota de
      // trabajo, sin confirmar). La tarjeta lleva `dichoSuyo` y dos huecos.
      duran: {
        nombre: 'Manuel Durán',
        rol: '',
        tipo: 'An episode of my podcast that I organized. It is recorded; the video is not published yet.'
      },
      raul: { nombre: 'Raúl Irabién', rol: 'President of Student Groups', tipo: '' },
      sol: {
        nombre: 'Sol',
        rol: 'Founder of Callejeritos',
        tipo: 'Interviewed at the responsible-adoption march; the clip of that day is in “Serving”.'
      }
    }
  },


  // ══════════════════════════════════════════════════════════════════════
  // LOS SITIOS EN VIVO (SitioVivo.astro)
  // ══════════════════════════════════════════════════════════════════════
  // El rótulo de la tapa dice lo que va a pasar y no «Ver más»: al pulsarlo,
  // el teclado ENTRA en un documento ajeno. Eso se avisa.
  vivo: {
    abrir: 'Open {s} in a new tab',
    interactuar: 'Use the site here',
    pie: 'This is {s} itself, loaded live inside the page — not a screenshot. It only loads when you scroll this far.'
  },

  // ══════════════════════════════════════════════════════════════════════
  // DOCUMENTOS ACADÉMICOS — SEPARADOS DE LAS CERTIFICACIONES A PROPÓSITO
  // ══════════════════════════════════════════════════════════════════════
  // Jaime, 2026-09-02: «no hagas solo una sección». Y tiene razón, porque no
  // son la misma clase de cosa: una CERTIFICACIÓN es un curso que él eligió
  // hacer y aprobó (los siete de la tabla, con su folio); un DOCUMENTO
  // ACADÉMICO es lo que la escuela o el examinador emiten sobre él y que un
  // comité pide de oficio. Mezclarlos hace que un curso de Bloomberg y una
  // constancia de promedio se lean con el mismo peso, y no lo tienen.
  //
  // LOS DOS QUE FALTAN SON LOS DOS QUE MÁS PESAN, y por eso van con el hueco
  // a la vista: la constancia de promedio CIERRA el hueco académico que este
  // capítulo ya declara abierto, y el Duolingo es el segundo examen de inglés
  // que la propia página dice que le falta.
  acadDocs: {
    h: 'Academic documents',
    lede: 'These are not certifications: they are what my school and the examiner issue about me, and what a committee asks for as a matter of course. Neither is here yet.',
    promedioQue: 'Cumulative grade-point certificate',
    duolingoQue: 'Duolingo English Test'
  },

  // ---- Capítulo 3: servir (los voluntariados) ----
  // El grupo estudiantil se fue al capítulo de proyectos: aquí se quedan los
  // voluntariados, que es lo que Jaime pidió junto a las experiencias.
  servir: {
    // El clip del voluntariado con animales existe en su TikTok. SOLO EL AÑO
    // en pantalla (decisión de Jaime).
    animalesClip: 'The clip: the march with Callejeritos for responsible adoption — I also interviewed Sol, its founder (2026).',
    // La donación al stand de adopción: hecho de su publicación en LinkedIn.
    donacion: 'I also donated pet food to a local adoption stand and spent the day with the volunteers and the animals (2026).',
    // LA PLAYA FUE EN SINGAPUR — corrección del brief del 2026-08-28, con el
    // texto de su propia publicación: fue un voluntariado de su curso de
    // Green Technology and Sustainable Ecology.
    playa: 'The beach clean-up was in Singapore, a volunteer day from my Green Technology and Sustainable Ecology course (2026).',
    // ── Y ES EL MISMO PROGRAMA DEL CERTIFICADO ───────────────────────────
    // La publicación de la playa (LI-16) y el certificado 4 del capítulo de
    // certificaciones son LA MISMA COSA: el 2026 GREEN TECHNOLOGY PROGRAMME
    // de Bluesky Education, del 22 de junio al 11 de julio de 2026 en la
    // Shaw Foundation Alumni House (que está dentro de la NUS). Estaban
    // escritos como dos actividades sueltas, y no lo son: la limpieza es la
    // parte de servicio del programa que certifica el diploma. Decirlo hace
    // que el voluntariado deje de parecer un día suelto y el certificado
    // deje de parecer un curso sin práctica.
    playaPrograma: 'That day was part of the programme whose certificate is in “Certifications”: the 2026 Green Technology Programme, Bluesky Education, in Singapore. The clean-up is the service part of the same programme.',
    bloques: {
      animales: 'The animals',
      playas: 'Beach clean-up'
    },
    // ── AQUÍ VIVÍA «LO QUE VIENE», Y SE FUE POR NO TENER FUENTE (2026-09-02)
    // Decía: «Two more with the student group: a clothing drive, and one more
    // volunteering day.» El tiempo verbal estaba bien —futuro, porque no ha
    // pasado—, pero eso presupone que existan como plan declarado POR ÉL, y no
    // existen: `grep -rniE 'colecta de ropa|clothing drive'` sobre
    // `cv-material/`, `cv-clips/` y `ESTADO-NOCTURNO.md` da CERO. Ni MATERIAL,
    // ni NOTAS-DEL-BRIEF, ni PENDIENTE, ni CARTAS, ni EVIDENCIA, ni el registro
    // de sus decisiones del 2026-09-02. La única justificación era el mensaje
    // de un commit.
    // Y anunciar un compromiso que nadie declaró es peor que omitirlo: si en
    // octubre alguien pregunta por la colecta de ropa, no hay nada detrás.
    // SI EXISTEN, LAS ESCRIBE ÉL. La pregunta está en PENDIENTE.md.
  },

  // ---- Capítulo 2: experiencias (en seco) ----
  // FECHAS: SOLO EL AÑO (decisión de Jaime, 2026-08-28). Y con los años
  // REALES derivados del material cosechado: la sesión de ETFs con Jon Maier
  // es de 2025 — Jaime avisó que estaba mal como 2026, y su fila lo corrige.
  // Las publicaciones nuevas que suman (visita a U of T/Rotman, Concordia,
  // AEM, la firma CFA×Tec con Marg Franklin) entran con su año.
  exp: {
    // ── PROMETÍA UNA COLUMNA QUE LA TABLA NO TIENE (2026-09-02) ────────
    // Decía «What, where, when — years only». Contado sobre el HTML
    // construido: de los doce renglones, CINCO no llevan ninguna fecha (Jon
    // Maier, la comunidad estudiantil, la AEM, Jasa Motor y smartfinance.lat)
    // y siete llevan «2026». El commit 67302d9 quitó los años de arranque
    // —con razón, es la regla de fechas de Jaime— y no tocó la frase que los
    // anuncia, así que el capítulo que «un comité escanea» abría prometiendo
    // una columna que no cumple, y se ve sin desplegar nada.
    lede: 'What, where, and the year where the year says something. This chapter and the next are the ones a committee scans.',
    // ── PLEGADO DESDE EL 2026-08-30 ─────────────────────────────────────
    // Jaime: «experience consume mucho, mejor que sea una cosa que diga view
    // y ya se deslice toda mi experience». El rótulo es el suyo. `pista`
    // lleva `{n}` y lo rellena el componente con `filas.length`: escrito a
    // mano, el número mentiría en cuanto se añada una fila.
    // ── EL RÓTULO DEJÓ DE DECIR «VER» (2026-08-31) ─────────────────────
    // El plegable nace ABIERTO desde la ola 2 (ver Historia.astro), así que
    // «View my experience» con la lista ya desplegada debajo era una
    // instrucción para algo que ya pasó. Ahora el `<summary>` es el rótulo
    // de la sección y la flecha —que gira 180° con `[open]`— dice el estado.
    // La palabra de Jaime («una cosa que diga view») sigue teniendo sentido
    // el día que alguien lo cierre: el control es el mismo.
    ver: 'My experience',
    pista: '{n} entries',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      // ── AQUÍ VIVÍA EL JIUJITSU, Y SE FUE (2026-09-02) ─────────────────
      // Decía «Since I was 13 · Jiu-jitsu — five years training», y la nota
      // que lo acompañaba lo justificaba como «palabra suya». No lo es:
      // `grep -rniE 'jiu ?jitsu|jiu-jitsu'` sobre `cv-material/` (MATERIAL,
      // NOTAS-DEL-BRIEF, PENDIENTE, cartas/CARTAS), `cv-clips/` (EVIDENCIA) y
      // `ESTADO-NOCTURNO.md` da CERO coincidencias. La única fuente era el
      // mensaje de un commit, y el mensaje de un commit no es una fuente
      // sobre Jaime.
      // TRES COSAS A LA VEZ, y cualquiera bastaba: (1) es una afirmación sobre
      // él sin origen; (2) se pintaba SIN la marca de «palabra suya» que sí
      // lleva el podcast de Rendón, así que un comité la leía con el mismo
      // peso que «2024–2027 Tec de Monterrey»; (3) «cinco años» no es un dato
      // sino una resta (18 − 13) que además asume que no paró nunca.
      // Y «Desde los 13» ES un arranque biográfico, justo lo que el commit
      // anterior acababa de borrar de este mismo capítulo.
      // SI ENTRENA JIUJITSU, ENTRA CUANDO ÉL LO DIGA. Está en PENDIENTE.md.
      // Jon Maier va en su PROPIA fila y no en las conversaciones: la sesión
      // de J.P. Morgan fue algo a lo que Jaime ASISTIÓ. El año lo corrigió
      // él: es 2025, no 2026.
      // ⚠️ AÑO SUYO, Y HAY UNA FUENTE PÚBLICA CON OTRA FECHA. Su publicación
      // de LinkedIn sobre esta sesión es la MÁS ANTIGUA de su historial y
      // MATERIAL.md la fecha en «hace ~4 meses» sobre una cosecha del
      // 2026-08-27, o sea ~abril de 2026. Publicar en 2026 un evento de 2025
      // es posible y nadie lo ha desmentido: se pone el año que él afirma y
      // el recibo `anioDisputa` lo dice. Estaba SIN anotar hasta 2026-08-31.
      { cuando: '', que: 'Session with Jon Maier, Chief ETF Strategist at J.P. Morgan Asset Management, at Tec Santa Fe' },
      // ⚠️ EL AÑO DEL GRUPO ESTUDIANTIL ESTÁ EN DISPUTA Y NO LO RESUELVE
      // ESTA PÁGINA. Jaime dijo el 2026-08-29 que lo creó «a finales de
      // 2025»; su propio LinkedIn publica el grupo como «ene. 2026» y el
      // proyecto smartfinance.lat como «feb. 2026». Aquí va 2025 porque es
      // lo que él afirmó y es su vida, no la de este repositorio — pero es
      // una contradicción REAL con una fuente pública suya, y hasta que él
      // la aclare (corrigiendo el LinkedIn o corrigiendo esta línea) se
      // queda anotada aquí. No la borres sin su respuesta.
      { cuando: '', que: 'Founder and president of the Smart Finance student community — stock-exchange visits, talks, workshops, volunteering, and the Student Groups Fair at Tec' },
      // «One of his first», no «his first»: su post dice «one of my first
      // experiences attending a business conference» (MATERIAL.md LI-17).
      // Redondearlo a «la primera» inflaba el hecho — corregido 2026-08-29.
      // EL AÑO ES 2025, corregido por Jaime el 2026-08-29 (iba como 2026).
      // ⚠️ Misma situación que la fila de Jon Maier: su publicación de la AEM
      // está fechada «hace ~2 meses» en MATERIAL.md (cosecha del 2026-08-27),
      // o sea ~junio de 2026. Anotada desde el 2026-08-31 y recogida en
      // `anioDisputa`.
      { cuando: '', que: 'AEM General Assembly — one of my first business conferences and networking events' },
      // 2025 también, y también corregido por él: «esta la creé en 2025».
      // ⚠️ AQUÍ NO HAY FUENTE PÚBLICA NINGUNA: Jasa Motor no aparece en su
      // LinkedIn (MATERIAL.md, bloque C2, verbatim: «Jasa Motor no aparece en
      // ningún lado de su LinkedIn»). No es una contradicción, es un año sin
      // contraste — y el recibo lo dice con esas palabras en vez de callarlo.
      { cuando: '', que: 'Jasa Motor — online store and marketing for my family’s auto-parts business (in “My projects”)' },
      // ⚠️ 2025 Y NO 2026, y es la MISMA disputa que la del grupo estudiantil
      // dos filas más arriba. Jaime, 2026-08-30: «que la creé desde 2025
      // empecé». Su LinkedIn publica el proyecto como «feb. 2026». Se pone
      // lo que él afirma, y se anota que hay una fuente pública suya que
      // dice otra cosa. Está escrito igual en `prueba.lede`, que es el otro
      // sitio donde el año se LEE en pantalla; las dos tienen que decir lo
      // mismo. La anotación NO se queda en este comentario: `anioDisputa` la
      // pinta al pie de estas filas, dentro del mismo plegable, para que
      // quien ve el año vea también de quién es.
      { cuando: '', que: 'smartfinance.lat — bilingual financial-education site: lessons, market data, glossary, weekly newsletter' },
      { cuando: '2026', que: 'Visit to the University of Toronto and Rotman Commerce — the campus this application is aimed at' },
      { cuando: '2026', que: 'Singapore: summer programme (Green Technology and Sustainable Ecology), presentation about Mexico at NUS, beach clean-up, interviews' },
      { cuando: '2026', que: 'Visit to Concordia University, Montréal' },
      // SIN el cargo de Marg Franklin: su post capturado (MATERIAL.md LI-20)
      // no dice «CEO of CFA Institute» — dice que la escuchó «leading one of
      // the most important organizations in the financial world» y que le
      // pidió consejo sobre estudiar en Canadá. El cargo exacto era una
      // anotación externa sin fuente en el material: fuera (2026-08-29).
      { cuando: '2026', que: 'Signing of the CFA Institute × Tec de Monterrey global agreement — asked Marg Franklin for advice on studying in Canada' },
      { cuando: '2026', que: 'TikTok @smart.financee — short financial-education videos, and the conversations of “Everyone brings something”' },
      { cuando: '2026', que: 'Reto Actinver — the calendar and the contest portfolio are in “Reto Actinver and private equity”' }
    ]
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LA MISMA EXPERIENCIA, EN EL FORMATO QUE PIDEN LAS SOLICITUDES (ola 2)
  // ═════════════════════════════════════════════════════════════════════════
  // La lista seca de arriba es año + título, y las cuatro cosas que de verdad
  // hay que llenar piden lo mismo por actividad: ROL · ORGANIZACIÓN · PERIODO
  // · QUÉ HIZO ÉL · RESULTADO CON NÚMERO · QUIÉN LO CONFIRMA.
  //  · Schulich (Leadership Profile, plantilla Word): «Leadership Profiles
  //    with fewer than 3 experiences will not be evaluated» y «Leadership
  //    Profiles with missing or incomplete references will not be evaluated».
  //  · Ivey (método STAR publicado por ellos): «provide quantifiable evidence
  //    with numbers».
  //  · UBC: hasta 5 actividades y DOS referees, uno funcionario de la escuela
  //    y otro que pueda hablar de una actividad descrita; NINGUNO puede ser
  //    familiar, amigo ni agente pagado.
  //  · Y el nominador de Prepa Tec CEM: es exactamente lo que necesita para
  //    poder firmar.
  // Por eso son CINCO: es el máximo de Schulich y de UBC, y el mínimo de
  // Schulich son tres.
  //
  // ┌─ DOS AVISOS PARA JAIME, Y NO SE PINTAN EN PANTALLA ──────────────────┐
  // │ 1. JASA MOTOR NECESITA UN REFEREE QUE NO SEA SU PAPÁ. UBC prohíbe    │
  // │    expresamente que un referee sea familiar. Sirve un proveedor, el  │
  // │    contador, un cliente de mayoreo o quien haya trabajado en la      │
  // │    tienda — cualquiera que pueda confirmar qué construyó él.         │
  // │ 2. LAS CIFRAS QUE HOY TIENE SON DE VANIDAD Y NO SIRVEN COMO          │
  // │    RESULTADO: 497 impresiones, 473 contactos, 23 publicaciones.      │
  // │    Miden alcance de una red social, no lo que pasó por lo que él     │
  // │    hizo. Las que cuentan: cuántos miembros tiene el grupo, cuánta    │
  // │    gente fue a cada plática o taller, cuántos eventos organizó,      │
  // │    cuánto creció la tienda desde que la hizo.                        │
  // └──────────────────────────────────────────────────────────────────────┘
  //
  // `resultado` y `quien` VACÍOS son huecos marcados: el bloque pinta una
  // sola línea discontinua por fila diciendo qué campo falta, no uno por
  // campo — cinco filas con dos marcas cada una serían diez tropiezos en el
  // capítulo que un comité escanea primero. `pide` es la pregunta exacta para
  // Jaime y NO SE PINTA, igual que `huecos.*.pista`.
  expApp: {
    h: 'The same experience, in the format the applications ask for',
    lede: 'Role, organisation, period, what I did, result with a number, and who can confirm it. Five: the most Schulich and UBC accept, and more than the three Schulich requires.',
    campos: {
      rol: 'Role', org: 'Organisation', cuando: 'Period',
      accion: 'What I did', resultado: 'Result', quien: 'Who can confirm it'
    },
    // Rótulo de la línea de campos que faltan, y su unión.
    falta: 'Still missing',
    y: 'and',
    filas: [
      {
        id: 'grupo',
        hueco: 'expGrupo' as const,
        rol: 'Founder and president',
        org: 'Smart Finance student community, Prepa Tec CEM',
        cuando: 'Ongoing',
        accion: 'I founded it and I lead it: visits to the Mexican stock exchange, finance talks and workshops, volunteering for our community and the environment, and the Student Groups Fair at Tec.',
        resultado: '',
        quien: '',
        pide: '¿Cuántos miembros tiene hoy el grupo? ¿Cuánta gente fue a la última plática y al último taller? ¿Cuántos eventos organizaste en el ciclo? Y el referee: un funcionario de tu escuela (coordinador, director, tu mentor) con nombre, cargo, correo y qué relación tiene contigo — UBC pide que uno de los dos sea de la escuela.'
      },
      {
        id: 'sitio',
        hueco: 'expSitio' as const,
        rol: 'Author and developer',
        org: 'smartfinance.lat — my own project',
        cuando: 'Ongoing',
        accion: 'I write the bilingual lessons, I build the site and I send the weekly newsletter. The figures it publishes are counted from its own files on every build.',
        resultado: '',
        quien: '',
        pide: '¿Cuántas personas lo visitan al mes y de dónde sacas ese dato? Los inscritos al boletín ya están en la página como cifra tuya («más de 100»): si tienes el número exacto y la fecha, mejor. NO uses impresiones ni contactos de LinkedIn: eso no es un resultado. Y el referee: alguien que haya usado el sitio o que pueda hablar de él — un profesor, un mentor, alguien de la comunidad.'
      },
      {
        id: 'jasa',
        hueco: 'expJasa' as const,
        rol: 'Online store and marketing',
        org: 'Jasa Motor — my family’s auto-parts business, Cuautitlán, State of Mexico',
        cuando: 'Ongoing',
        accion: 'I built its online store (tienda.jasamotor.com.mx) and I run its marketing, for a business with more than twenty years of history.',
        resultado: '',
        quien: '',
        pide: '¿Qué cambió desde que hiciste la tienda? Pedidos al mes, ventas en línea, clientes nuevos, o el número que sí tengas — y desde qué fecha. Y OJO CON EL REFEREE: UBC prohíbe que sea familiar, así que TU PAPÁ NO PUEDE SER. Piensa en un proveedor, el contador, un cliente de mayoreo o alguien que haya trabajado en la refaccionaria.'
      },
      {
        id: 'tiktok',
        hueco: 'expTiktok' as const,
        rol: 'Creator and host',
        org: '@smart.financee — financial education, and the conversations of the chapter “Everyone brings something”',
        cuando: '2026 – today',
        accion: 'I record short financial-education videos, and I arrange and conduct the interviews myself: executives, entrepreneurs and university professors.',
        resultado: '',
        quien: 'Lloyd George, CEO of TAQ Pte Ltd, writes in his letter that I host a financial-education podcast in which I interview finance executives, entrepreneurs and university professors.',
        pide: '¿Qué número cuenta aquí? Personas alcanzadas no: eso es vanidad. Sirve, por ejemplo, cuántas entrevistas has hecho, cuántas se publicaron, o cuánta gente te ha escrito a raíz de un video (y cómo lo sabes).'
      },
      {
        id: 'singapur',
        hueco: null,
        rol: 'Participant, and speaker at NUS',
        org: 'Green Technology Programme, Bluesky Education — Singapore',
        cuando: '2026',
        // DECÍA «Two weeks of programme» Y ESA FILA HABLA DEL PROGRAMA DE
        // BLUESKY, que su propio CEO fecha en TRES semanas en el PDF que esta
        // misma página deja descargar («my three-week programme in Singapore»,
        // Andy Toh). Las dos semanas son las del CURSO de Lloyd George, que es
        // una parte del total — las dos cartas no se contradicen, pero la fila
        // atribuía la duración de una al programa de la otra. Un lector que
        // comprobara encontraba el CV diciendo dos y la carta descargable
        // diciendo tres para lo mismo: subestima, pero invita a la duda justo
        // en la única fila con resultado y con quién lo confirma.
        accion: 'Three weeks of programme, two of them in Lloyd George’s course; I presented about Mexico to students at the National University of Singapore, I joined the beach clean-up and I arranged and conducted the interviews myself.',
        resultado: 'An award at the GreenTech Summit 2026 with my teammates, competing against students from Taiwan and Russia (chapter “Awards”).',
        quien: 'Lloyd George, CEO of TAQ Pte Ltd, and Andy Toh, of Bluesky Education. Both letters are in “Recommendation letters”, each with the contact its signatory gave.',
        pide: 'Esta fila está completa: es la única con resultado y con quien lo confirma. Sirve de patrón para las otras cuatro. Lo único que le falta es el documento del premio — pídeselo a Lloyd George o a Bluesky Education.'
      }
    ]
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CAPÍTULO 3: EL RENGLÓN ACADÉMICO (ola 2, 2026-08-31)
  // ═════════════════════════════════════════════════════════════════════════
  // Este CV no tenía UN SOLO dato académico: ni promedio, ni cálculo, ni
  // idioma en pantalla (se comprobó buscando en este archivo). Es la primera
  // pregunta de cualquier solicitud, y el sitio donde el silencio se lee como
  // «no lo tiene».
  //
  // LO QUE SE PUBLICA AQUÍ EXISTE Y ESTÁ COMPROBADO:
  //  · La escuela y el plan salen de la misma fila que ya pinta `exp`.
  //  · El B2 First con su 163 sale de SU PROPIO CERTIFICADO (transcrito en
  //    cv-material/MATERIAL.md, bloque C1 nº 7: Grade C, Overall Score 163,
  //    Reading 168 · Use of English 147 · Writing 157 · Listening 168 ·
  //    Speaking 175, examen del 19 de noviembre de 2024). Hasta hoy ese 163
  //    vivía SOLO en el `alt` de la imagen del certificado, así que en
  //    pantalla el renglón del inglés parecía cerrado y no lo está.
  //  · Que le falta otro examen NO es una opinión: las dos universidades lo
  //    publican y las dos citas se comprobaron el 2026-08-31 en sus páginas
  //    oficiales (los URL están en `inglesFuentes`).
  //
  // NO SE INVENTA NI UNA CIFRA. Promedio, posición de clase y cálculo son
  // huecos marcados con su pregunta exacta en `huecos.acad*.pista`.
  acad: {
    lede: 'The first thing any application asks, and until today this page did not answer it. What is checkable is here; what is missing is marked as missing.',
    escuelaH: 'Where I study',
    escuela: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business.',
    escuelaCuando: '2024–2027',
    inglesH: 'English',
    ingles: 'B2 First Certificate, Cambridge English. Grade C, overall score 163: Reading 168 · Use of English 147 · Writing 157 · Listening 168 · Speaking 175. Examination 19 November 2024.',
    inglesTag: 'From my own certificate',
    // El hecho, en primera persona y sin dramatismo: es un paso pendiente.
    // RECORTADO EL 2026-09-01: sobraba la frase que explicaba que la página
    // lo dice, que es una frase sobre la página y no sobre el examen. Los
    // dos hechos y las dos cifras se quedan enteros.
    inglesFalta: 'It is not enough yet. The University of Toronto does not accept B2 First at any score; UBC does, but from 180, and I have 163. So I have one more exam to sit.',
    fuentesH: 'Checked on 1 September 2026',
    // ── EL RÓTULO DEL PLEGABLE DE REQUISITOS (2026-09-01) ────────────────
    // Debajo de esto van 119 palabras de UMBRALES DE OTRAS UNIVERSIDADES:
    // el 180 de Cambridge, los submínimos del TOEFL nuevo, el IELTS, el
    // Duolingo, el PTE. Es material de trabajo para Jaime, verdadero y con
    // su enlace, y no dice nada sobre él: lo que dice sobre él es el
    // renglón de arriba («me falta un examen»), que se queda a la vista.
    // Se pliega, no se borra: un comité que quiera comprobar el umbral lo
    // abre. Al imprimir sale abierto, como el de experiencia.
    fuentesVer: 'What the two universities publish',
    inglesFuentes: [
      {
        // EL TOEFL QUE ESTABA PUBLICADO AQUI ERA EL DEROGADO. U of T condiciona
        // el 89/22/22 a examenes ANTERIORES al 21 de enero de 2026, y Jaime
        // todavia no lo ha presentado (lo dice esta misma pagina: «So I have
        // one more exam to sit»), asi que el que le aplica es el nuevo. Bajo un
        // sello de «consultadas el…», un requisito caducado es peor que no
        // poner sello: es la unica fila de la pagina que dispara una accion con
        // fecha limite. Y a PTE y a Duolingo les faltaban sus submininimos por
        // apartado, que es justo donde se cae una solicitud.
        // TROCEADO POR LO MISMO QUE `nota`: en el panel espanol la cita
        // verbatim de U of T es INGLES dentro de prosa espanola y necesita
        // `lang="en"`. Los nombres de examen y de apartado (TOEFL iBT, IELTS
        // Academic, Writing, Speaking, Production) NO se marcan ni se
        // traducen: son nombres propios de la prueba, y traducirlos dejaria
        // al lector buscando un apartado que no existe en su boleta.
        que: [
          'University of Toronto — ',
          { en: '“Results from the B2 First exam are not accepted (regardless of the result achieved).”' },
          ' C1 Advanced or C2 Proficiency: 180 overall, at least 170 in each component. TOEFL iBT, for tests taken on or after 21 January 2026 — which is any test I sit now — 4.5 overall with 4.5 in Writing and 4.0 in Speaking; the old 89 with 22 in Speaking and Writing only counts for tests taken before that date. IELTS Academic 6.5 with no band below 6.0; Duolingo 120 overall with 120 in Production; PTE Academic 65 with no part below 60.'
        ],
        url: 'https://future.utoronto.ca/apply/english-language-requirements/'
      },
      {
        que: ['UBC Vancouver — Cambridge English Qualifications (B2 First, C1 Advanced, C2 Proficiency): 180 for undergraduate admission.'],
        url: 'https://vancouver.calendar.ubc.ca/admissions/english-language-admission-standard/english-language-proficiency-tests'
      }
    ],
    // Por qué los tres huecos de abajo están ahí. Una frase y su fuente: sin
    // esto, tres recuadros vacíos en el capítulo académico se leen como una
    // ausencia y no como un dato que falta por llegar.
    notaH: 'Why the boxes below are empty and not quietly missing',
    // TRES ESCUELAS, TRES FUENTES. Aqui habia UNA sola fuente pintada
    // —la pagina de Rotman Commerce— debajo de un parrafo que mete tambien a
    // Ivey y a Schulich. Comprobado en vivo el 2026-09-01: esa pagina NO
    // menciona ni a Ivey ni a Schulich. En un documento cuya tesis entera es
    // «cada cifra con su fuente», el enlace visible decia que un dato salia de
    // un sitio donde no esta, y un referee que lo abriera para comprobar el
    // 90 % de Ivey no lo encontraba.
    // Y AL VERIFICARLAS APARECIO UN ERROR QUE NADIE HABIA VISTO: «Schulich,
    // Calculus with at least 70%» es falso. El minimo del 70 % que publica
    // Schulich es de ENG4U y MHF4U (ingles y funciones avanzadas); el calculo
    // (MCV4U) entra como curso requerido entre los seis, o Data Management,
    // pero sin ese minimo. De paso se recuperan las dos acotaciones que el
    // encargo traia y el CV habia perdido: el «in your best Grade 12 courses»
    // de Ivey y el promedio competitivo de Schulich.
    // Y UN TERCER ERROR, ESTE TAMBIEN HEREDADO DEL ENCARGO: Ivey pide «a
    // mathematics course for university-bound students», que en Ontario es una
    // materia de ULTIMO ANO DE PREPA de nivel «U» (MHF4U, MCV4U o MDM4U) — o
    // sea, un curso PARA quien va a la universidad, no un curso UNIVERSITARIO.
    // propuesta.md:103 lo tradujo como «un curso de matematicas de nivel
    // universitario» y el CV lo copio como «a university-level maths course»:
    // eso convierte un requisito que Jaime puede cumplir en la prepa en uno que
    // parece exigirle creditos universitarios antes de aplicar.
    //
    // EL PARRAFO VA EN TROZOS Y NO EN UNA CADENA porque en el panel espanol
    // lleva dentro tres pedazos de INGLES —la cita de Rotman y las dos formas
    // de decir un promedio, «mid-high 80s» y «low 90%»— y sin `lang="en"` un
    // lector de pantalla los pronuncia con fonemas espanoles. Es la misma regla
    // que ya cumplian las citas de las cartas (cv.ts:1330) y que este capitulo,
    // nuevo en esta ola, se habia saltado.
    // Y OJO CON LA TENTACION DE TRADUCIRLOS: «mid-high 80s» NO es «entre 85 y
    // 89». La fuente publica un rango vago a proposito; ponerle numeros exactos
    // en el panel espanol inventa una precision que la universidad no da, que
    // es justo lo que este CV promete no hacer. Van marcados en ingles y
    // glosados en espanol, sin cifras que nadie publico.
    nota: [
      'Rotman Commerce publishes that ',
      { en: '“our students are generally in the top 5% of their class”' },
      ', asks Ontario applicants for a minimum overall average in the ',
      { en: 'mid-high 80s' },
      ', and pays close attention to two prerequisites: English and Calculus. Ivey asks for a ',
      { en: 'low 90%' },
      ' average in my best Grade 12 courses, including English, plus a mathematics course for university-bound students — a Grade 12 course, not a university one. Schulich requires ENG4U, MHF4U and either Calculus (MCV4U) or Data Management among my top six Grade 12 courses, with a minimum of 70% in ENG4U and MHF4U, and says a competitive average runs from the high 80s to the low 90s, with the cutoff in past years between 91% and 92%. Those are numbers only I can supply, so they are marked as missing rather than left out.'
    ],
    notaFuentes: [
      { que: 'rotmancommerce.utoronto.ca — What we look for', url: 'https://rotmancommerce.utoronto.ca/future-students/what-we-look-for/' },
      { que: 'ivey.uwo.ca — AEO, secondary school students', url: 'https://www.ivey.uwo.ca/hba/admissions/secondary-school-students/' },
      { que: 'schulich.yorku.ca — BBA admission requirements', url: 'https://schulich.yorku.ca/admissions/admissions-requirements/bba/' }
    ]
  },

  // ---- Capítulo 10: certificaciones ----
  // ═══════════════════════════════════════════════════════════════════════
  // LAS SIETE, CON SU IMAGEN Y SU ID (cosecha del 2026-08-29, bloque C1)
  // ═══════════════════════════════════════════════════════════════════════
  // Hasta esta cosecha, este bloque iba con la mano atada: el PDF que Jaime
  // había exportado de LinkedIn no traía ni el emisor ni la fecha de cada
  // certificado, así que dos filas salían SIN emisor, una SIN año y las seis
  // con un FotoHueco en vez de imagen. Ahora se entró a la sección de
  // certificaciones de su perfil (`/details/certifications/`) y están las
  // siete con su nombre exacto, su emisor, su fecha y su ID de credencial —
  // y seis con su imagen guardada. Ya no hace falta adivinar nada, así que
  // los rótulos de «emisor por verificar» y «año por verificar» se fueron
  // con lo que los necesitaba.
  //
  // TRES COSAS QUE CAMBIARON DE FONDO:
  //  1. EL A2 DE FRANCÉS YA NO ES UNA AFIRMACIÓN. Estaba aparte, en una
  //     tarjeta de borde discontinuo marcada «afirmación mía, pendiente de
  //     verificación», porque no aparecía en ninguna fuente. Sí está: es
  //     `DELF A2`, lo expide la Alliance Française de Paris y tiene ID.
  //     Entra como una de las siete, sin marca de duda.
  //  2. EL NOMBRE DEL DE BLOOMBERG ES «Bloomberg Finance Fundamentals»,
  //     confirmado leyendo el certificado. No es «Market Concepts» — la
  //     carta de Lloyd George lo llama así y la carta es la equivocada.
  //  3. «Cambridge English» YA NO ESTÁ INVENTADO. Antes se quitó por eso
  //     mismo; hoy es el emisor que declara su LinkedIn y lo imprime el
  //     propio certificado.
  //
  // SIN URL DE VERIFICACIÓN. Las siete tienen botón «Mostrar credencial» en
  // LinkedIn, pero LinkedIn envuelve el destino en `linkedin.com/safety/go/`
  // y esa dirección no se pudo leer. El ID en texto es suficiente para que un
  // comité lo compruebe, y el enlace de la tarjeta va a su perfil, que es
  // donde el certificado está publicado.
  //
  // AÑOS: solo el año, que es la regla de Jaime para fechas biográficas. Seis
  // son de 2026 y el B2 de Cambridge de 2024.
  certs: {
    // ── EL LEDE DICE LA CUENTA EXACTA, Y ESO ES LO QUE LO HACE UN RECIBO ──
    // Decía «nombre exacto, emisor, año e ID de credencial» en plural, para
    // los siete. Seis llevan ID; el séptimo no, y prometer siete y entregar
    // seis es la forma más barata de que un comité deje de creerse el resto.
    // Se dice la cuenta y se dice QUÉ trae el que no lo lleva, que resulta
    // ser más comprobable que un identificador: sede y fechas impresas.
    lede: 'The receipts, as my LinkedIn publishes them. Six of the seven carry a credential ID; the seventh prints its venue and its dates on the certificate itself.',
    verLinkedIn: 'See it on LinkedIn',
    // El escaneo se abre en una pestaña, a su tamaño natural (700 px de ancho),
    // que es donde un folio se lee. La miniatura de la fila mide 154 px: es la
    // señal de que el escaneo existe, no el escaneo.
    verEscaneo: 'Open the scan',
    credencial: 'Credential ID',
    // ═══════════════════════════════════════════════════════════════════
    // EL GREEN TECHNOLOGY PROGRAMME: SIN ID, PERO NO SIN RECIBO
    // ═══════════════════════════════════════════════════════════════════
    // Es el único de los siete que LinkedIn publica sin ID de credencial, y
    // Jaime no puede conseguir uno: Bluesky Education no lo emite. Esta
    // línea decía sólo «No credential ID published» — verdad, y nada más
    // que una carencia enseñada en la misma tipografía en la que las otras
    // seis enseñan su identificador.
    //
    // LO QUE SÍ HAY, Y ESTÁ TRANSCRITO DEL PROPIO CERTIFICADO
    // (cv-material/MATERIAL.md, bloque C1, detalle nº 4): el documento
    // imprime «2026 GREEN TECHNOLOGY PROGRAMME hosted at Shaw Foundation
    // Alumni House, from June 22 to July 11, 2026», y lo firma Zhang
    // Jinming, Academic Manager. Y NADA MÁS: el rótulo de este campo promete
    // que lo de al lado es lo que el papel imprime, así que ni la ciudad ni
    // la universidad del campus entran aunque sean ciertas (el porqué
    // completo va sobre `dondeCuando`, donde estuvieron unas horas).
    // NO SE INVENTA UN ID. Y estos datos no son un premio de consolación:
    // una sede con nombre y un rango de fechas de 20 días se comprueban
    // preguntando a la institución, que es más de lo que permite una cadena
    // de 24 caracteres que sólo su emisor sabe resolver.
    // `sinCred` ya no dice lo que falta, dice lo que hay; `dondeCuando` es
    // el campo que lo lleva, y se pinta EN EL SITIO DEL ID para que la
    // tarjeta no tenga un renglón menos que las otras seis.
    sinCred: 'Printed on the certificate instead of an ID',
    // Solo el DELF A2 llega hasta aquí: es el único sin imagen en ninguna
    // parte (ni certificado ni logotipo en su LinkedIn). Desde el 2026-08-30
    // su marco ya NO está vacío —lleva una insignia tipográfica—, así que
    // esta línea pasó de ser el contenido del hueco a ser el pie de la
    // insignia: sigue diciendo que el diploma de verdad no está.
    fotoPend: 'The diploma itself, when I scan it: it is the only one of the seven with no image on my LinkedIn.',
    // ── LA INSIGNIA DEL DELF A2 (Jaime, 2026-08-30) ─────────────────────
    // «pon el logo de la compañía o de DELF A2 para que no esté vacío».
    // Se eligió una insignia TIPOGRÁFICA y no un logotipo; la razón entera
    // está en Historia.astro, junto al marcado. El nombre grande y el emisor
    // salen de la propia fila, así que no se repiten aquí: lo único escrito
    // es el nivel del marco europeo, que es lo que se lee de un DELF.
    insigniaNivel: 'CEFR level A2',
    // El rótulo que impide que la insignia se lea como un escaneo del
    // diploma. Va DENTRO del marco, arriba, en mono, como todos los rótulos
    // de recibo del CV.
    insigniaTag: 'Designed by this page — not the diploma',
    // SIN « — » dentro de los nombres de las simulaciones: los certificados
    // publicados dicen «Vista Equity Partners - Demystifying Private Equity
    // Job Simulation» y «Bank of America - Investment Banking Job
    // Simulation», con el emisor delante. El nombre va EXACTO, guion
    // incluido, porque eso es lo que promete el lede.
    // El orden es el de LinkedIn: el más reciente primero.
    filas: [
      {
        que: 'Vista Equity Partners - Demystifying Private Equity Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a83e06078fe04cae6937a9e',
        dondeCuando: '',
        img: 'cv-cert-vista.webp', w: 700, h: 495,
        alt: 'Forage certificate of completion in the name of Jaime Sandoval Ricaño for the Vista Equity Partners Demystifying Private Equity job simulation, with the Vista and Forage logos.'
      },
      {
        que: 'Bank of America - Investment Banking Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a80869baa694bdf898c2581',
        dondeCuando: '',
        img: 'cv-cert-bofa.webp', w: 700, h: 495,
        alt: 'Forage certificate of completion in the name of Jaime Sandoval Ricaño for the Bank of America investment banking job simulation, with the Bank of America and Forage logos.'
      },
      {
        que: 'Investment Foundations® Certificate',
        de: 'CFA Institute', anio: '2026', cred: '191463283',
        dondeCuando: '',
        img: 'cv-cert-cfa.webp', w: 700, h: 541,
        alt: 'CFA Institute certificate awarding the Investment Foundations Certificate to Jaime Sandoval Ricano, with its date, certificate number and verification QR code.'
      },
      {
        que: 'GREEN TECHNOLOGY PROGRAMME',
        de: 'Bluesky Education', anio: '2026', cred: '',
        // LO QUE ESTE CERTIFICADO TRAE EN VEZ DE UN ID, transcrito de su
        // propia imagen (cv-material/MATERIAL.md, bloque C1, nº 4): «hosted
        // at Shaw Foundation Alumni House, from June 22 to July 11, 2026»,
        // firmado por Zhang Jinming, Academic Manager.
        // ── SE QUITÓ «NATIONAL UNIVERSITY OF SINGAPORE» (2026-09-01) ─────
        // Estuvo aquí unas horas, con el argumento de que la Shaw Foundation
        // Alumni House está en ese campus. Es cierto (MATERIAL.md lo anota
        // entre paréntesis, como nota de quien transcribió, no como texto
        // del documento) y aun así no puede ir: el rótulo de este campo es
        // «Printed on the certificate instead of an ID», o sea que promete
        // que lo de al lado es lo que el papel imprime. En cuanto se le
        // cuela un dato que el papel NO imprime, el rótulo deja de ser un
        // recibo y pasa a ser una etiqueta que cubre una inferencia — y esta
        // página tiene el nombre de una universidad grande dentro. La sede
        // se comprueba igual: «Shaw Foundation Alumni House» es un nombre
        // único, y quien pregunte por él llega al mismo sitio.
        dondeCuando: 'Shaw Foundation Alumni House · 22 June – 11 July 2026',
        img: 'cv-cert-green-tech.webp', w: 501, h: 700,
        alt: 'Bluesky Education certificate of completion for the 2026 Green Technology Programme, hosted at Shaw Foundation Alumni House in Singapore, in the name of Jaime Sandoval Ricaño.'
      },
      {
        que: 'Bloomberg Finance Fundamentals',
        de: 'Bloomberg', anio: '2026', cred: 'Xsgrm4LYnvGBWeskx8HpEut9',
        dondeCuando: '',
        img: 'cv-cert-bloomberg.webp', w: 700, h: 497,
        alt: 'Bloomberg for Education certificate of completion for the Bloomberg Finance Fundamentals course, on a black background with candlestick charts.'
      },
      {
        que: 'DELF A2',
        de: 'Alliance Française de Paris', anio: '2026', cred: '052535012100',
        dondeCuando: '',
        img: '', w: 0, h: 0, alt: ''
      },
      {
        que: 'B2 First Certificate',
        de: 'Cambridge English', anio: '2024', cred: '814072MSJ',
        dondeCuando: '',
        img: 'cv-cert-b2-cambridge.webp', w: 700, h: 662,
        alt: 'Cambridge English certificate stating that Jaime Sandoval Ricaño was awarded Grade C in the First Certificate in English, Council of Europe level B2, with an overall score of 163.'
      }
    ]
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CAPÍTULO 9: PREMIOS. SECCIÓN PROPIA (ola 2, 2026-08-31)
  // ═════════════════════════════════════════════════════════════════════════
  // Ivey evalúa los premios EN UNA SECCIÓN APARTE y admite explícitamente
  // premios no académicos («Awards like "Employee of the Month" and
  // recognition for community service are just as valuable»). En este CV esa
  // sección no existía: había siete certificados —que son CURSOS COMPLETADOS,
  // no competencias ganadas— y el único premio estaba enterrado en el
  // capítulo de las cartas, en un recuadro que gastaba 44 palabras en el
  // descargo y 19 en el hecho.
  //
  // EL DESCARGO SE QUEDA, LA PROPORCIÓN SE INVIERTE. Que la única fuente sea
  // una carta ajena es verdad y hay que decirlo, pero se dice UNA vez, en
  // mono, como todos los recibos de esta página — no en un párrafo que pesa
  // el doble que el premio. El hecho manda; la marca lo acompaña.
  //
  // NO SE INVENTA NINGÚN PREMIO. Hay uno, y el hueco dice que hay sitio para
  // más sin nombrar a nadie que no lo haya dado (misma regla que las cartas).
  premios: {
    lede: 'Awards are evaluated separately from courses, so they are separate here. Courses I have completed are in “Certifications”; this is what someone gave me for competing.',
    entregadosH: 'What I have',
    faltanH: 'Room for more',
    // DECÍA «who gives it» / «quién lo da» Y LA FICHA RELLENABA ESE CAMPO CON
    // EL NOMBRE DEL PROPIO EVENTO. La única fuente declarada —la carta de
    // Lloyd George— nombra el certamen y a los rivales, y NO dice quién
    // entregó el premio. Un rótulo que promete el otorgante y enseña el
    // evento es una cifra sin fuente disfrazada de ficha. El rótulo pasa a
    // decir lo que de verdad hay debajo.
    campos: 'Award · event · year · what for',
    slot: 'Space reserved for the next award.',
    tag: 'Award to come',
    // {s} es el título del capítulo de las cartas: se enlaza por TÍTULO y no
    // por número, como `cartas.fuenteCarta`.
    fuenteTag: 'Only source: Lloyd George’s letter, in “{s}”',
    // ── EL PREMIO TRAE SU FRAGMENTO VERBATIM (2026-09-01) ───────────────
    // Al mudarse a su propio capítulo, el premio se quedó siendo el ÚNICO
    // hecho verificado por una carta que no enseñaba la frase de la carta:
    // los seis de `cartas.verifica` traen la suya y su firmante, y los tres
    // más fuertes la traen entrecomillada en inglés. Mientras el PDF no se
    // sirve, un lector no tenía por dónde comprobar el más fuerte de todos.
    // Ahora lleva el mismo trato que `verifica`: la frase EXACTA de la carta
    // de Lloyd George, en inglés, con `lang="en"` en el panel español y las
    // comillas puestas por el panel. Es un fragmento y no la oración entera
    // porque la oración abre con «That same excellence», que apunta al
    // párrafo anterior y fuera de él no se entiende; el fragmento empieza
    // donde empieza el hecho. Misma regla que «entirely on his own steam».
    // `citaTag` sólo se pinta en español, donde la cita es inglés dentro de
    // un párrafo español y hay que avisarlo; en inglés va vacío.
    citaTag: '',
    entregados: [
      {
        // SIN «in Singapore»: la carta de Lloyd George —la ÚNICA fuente que
        // esta ficha declara— dice «an award at the GreenTech Summit 2026, in
        // competition against students from Taiwan and Russia» y no dice
        // dónde fue. La sede era una inferencia razonable desde la carta de
        // Andy Toh, que sitúa un «Green Tech Youth Summit» dentro del
        // programa en Singapur; pero esa carta no es la que se cita aquí, y
        // una ficha que promete una sola fuente no puede traer un dato de
        // otra sin decirlo.
        que: 'An award at the GreenTech Summit 2026, with my teammates, competing against students from Taiwan and Russia.',
        // VERBATIM de la carta de Lloyd George (20 de agosto de 2026, el PDF
        // está en cv-material/cartas/). La oración entera es «That same
        // excellence carried him and his teammates to an award at the
        // GreenTech Summit 2026, in competition against students from Taiwan
        // and Russia.»; se cita desde «an award» porque las cinco palabras de
        // antes apuntan al párrafo anterior. Ni una palabra cambiada.
        cita: 'an award at the GreenTech Summit 2026, in competition against students from Taiwan and Russia',
        // Sin el año dentro del nombre: la ficha ya lo pinta al lado y
        // salía «GreenTech Summit 2026 · 2026».
        de: 'GreenTech Summit',
        anio: '2026',
        nota: 'I never posted this — not on my LinkedIn, not on my TikTok. It is here because someone else wrote it down and signed it.'
      }
    ],
    // El documento no existe todavía: la única fuente es la carta. Se dice
    // dónde falta, sin adornarlo.
    docPend: 'The certificate or diploma itself, when Bluesky Education or Lloyd George sends it to me.'
  },

  // ---- Capítulo 8: cartas de recomendación ----
  // SECCIÓN NUEVA pedida por Jaime (2026-08-28). Nació vacía —tres recuadros
  // marcados, ninguna carta— y el 2026-08-29 llegaron LAS DOS PRIMERAS.
  //
  // LOS PDF SIGUEN SIN PUBLICARSE. Son documentos para un comité de
  // admisiones, que los recibe por su canal; colgarlos aquí publicaría el
  // documento entero de dos personas que no eligieron publicarlo. Aquí va la
  // FICHA (quién, cargo, empresa, relación, año), DOS frases entrecomilladas
  // y el contacto que el propio firmante ofreció.
  //
  // ── EL CORREO SÍ, EL TELÉFONO NO (Jaime, 2026-08-30) ────────────────────
  // Él pidió «sus contactos directos también que proporcionaron». Los dos
  // firmantes cierran su carta ofreciéndose a contestar preguntas sobre él,
  // así que el contacto es suyo y es para esto. Se publican los DOS CORREOS
  // —`Enquiries.TAQ@outlook.com` es el buzón de consultas de TAQ Pte Ltd y
  // `Andy.toh@bluesky-education.com` es una dirección de trabajo en el
  // dominio de la empresa— y NO el teléfono que la carta de Lloyd George
  // añade al lado del correo. La diferencia no es de grado: un correo de
  // empresa es un canal profesional que existe para recibir consultas; un
  // número personal en una página que se puede reenviar entera acaba en
  // manos que el firmante no eligió, y no hay forma de retirarlo después.
  // JAIME PUEDE REVERTIRLO: es una decisión suya, no una regla del sitio —
  // si quiere el teléfono, se añade un campo `tel` junto a `correo` y se
  // pinta igual. El número está en el PDF de la carta, en cv-material/cartas.
  //
  // ── ESTE COMENTARIO ESTUVO OBSOLETO Y HOY VUELVE A SER CIERTO ──────────
  // Entre el 2026-08-31 y el 2026-09-01 decía la verdad de la ficha y mentía
  // sobre la página: la fila de contacto enseñaba solo el correo —o sea, se
  // leía como «el resto se retuvo»— y dos renglones más abajo un enlace
  // entregaba el PDF entero con el móvil dentro. Retirado ese enlace, el
  // teléfono vuelve a estar retenido de verdad y la ficha vuelve a decir lo
  // que hace. Si el archivo vuelve, ESTE PÁRRAFO HAY QUE VOLVER A ESCRIBIRLO:
  // es la clase de nota que hace que el siguiente constructor crea que algo
  // sigue protegido cuando ya no lo está.
  //
  // ── POR QUÉ EL CORREO VA A PELO, SIN TRUCO ANTI-SCRAPING ────────────────
  // El repo no tiene ningún patrón de ofuscación de correos (se buscó), y
  // meter uno aquí sería peor que no tenerlo: cualquier truco que sirva de
  // algo necesita JavaScript, y este CV promete leerse ENTERO sin JavaScript
  // — un `mailto:` que solo funciona con JS deja al lector sin el contacto,
  // que es justo lo que Jaime pidió poner. La protección real de esta página
  // es otra y ya está puesta: dirección impredecible (`CV_SLUG`), `noindex`,
  // `no-referrer` y fuera del sitemap y del buscador. Un rastreador no llega
  // a esta página; si llegara, ningún `&#64;` lo pararía.
  //
  // LAS CITAS SON VERBATIM del PDF, en inglés, que es el idioma en que están
  // escritas las dos. En el panel español van TRADUCIDAS y marcadas como
  // traducción (`citaTag`), igual que las frases de `voz.*`.
  //
  // LOS HUECOS SIGUEN. Jaime dijo «todavía faltan varias, ahí vamos», así
  // que el recuadro de lo que falta se queda. Ya no hay hueco para el
  // programa de Singapur: las dos cartas que llegaron son de ahí.
  //
  // ── UN HUECO, Y SIN NOMBRAR A QUIEN NO HA ESCRITO (2026-08-31) ─────────
  // Aquí había DOS recuadros, y el primero decía «alguien que pueda
  // responder por el grupo estudiantil y la prepa». O sea: este documento,
  // cuyo objetivo declarado es que Prepa Tec CEM lo nomine, anunciaba por
  // escrito que Prepa Tec CEM todavía no le ha escrito una carta — y lo
  // anunciaba dos veces, en dos recuadros seguidos, justo antes de la frase
  // final. Las dos cartas que SÍ están ya demuestran la honestidad; esos dos
  // recuadros solo añadían una ausencia con destinatario.
  // La regla que queda: **un hueco puede reservar sitio; no puede decir
  // quién no lo ha llenado.** Por eso ahora es UNO, dice lo que es —espacio
  // reservado para la siguiente carta— y `campos` sigue enseñando qué trae
  // una carta cuando llega. No se inventa ninguna carta y no se disimula que
  // faltan: el rótulo en ámbar sigue ahí, como en todos los huecos.
  cartas: {
    /* ── EL LEDE, Y LA PREMISA QUE RESULTÓ SER FALSA (2026-09-01) ────────
       El 2026-08-31 Jaime pidió «sube en cada carta de recomendación el
       archivo de la carta» y el lede pasó a anunciar el PDF. Asumió una
       consecuencia concreta, escrita en NOTAS-DEL-BRIEF.md: «quien tenga el
       enlace del CV ve el teléfono de Lloyd George» — y el lede se apoyaba en
       que la dirección del CV es la credencial (`CV_SLUG`, `noindex`, fuera
       del sitemap).
       ESA PREMISA NO ERA CIERTA PARA LOS ARCHIVOS. El `noindex` protege la
       PÁGINA; los PDF se servían en `/assets/cv/…`, ruta fija que no pasa por
       `CV_SLUG`, y estaban commiteados en un repositorio PÚBLICO (descarga
       anónima comprobada: 200 y 374 826 bytes). Con un sitio estático servido
       desde el repo no hay manera de entregar un archivo solo a quien reciba
       la dirección: el permiso se dio sobre una protección que no existe, y
       lo expuesto son datos de terceros.
       Así que el archivo sale y el lede vuelve a decir la verdad: las cartas
       están aquí ENTERAS EN LO QUE DICEN —ficha, las dos citas verbatim, el
       contacto que cada firmante escribió y su foto— y el PDF no. Sigue en
       pie lo que no cambió: a una carta firmada no se le recorta un renglón,
       así que la alternativa nunca fue publicarla censurada.
       PENDIENTE DE JAIME, con el alcance real delante: repo privado,
       alojarla detrás de algo que sí autentique, o asumir que es pública. */
    /* RECORTADO EL 2026-09-01. Decía tres cosas y dos de ellas ya las dice
       cada ficha, debajo del rótulo «The letter itself»: dónde no está el
       archivo y por qué. Repetido arriba en 83 palabras, el capítulo abría
       explicando una ausencia en vez de presentando dos cartas. Lo que se
       queda es lo que sólo puede ir aquí: qué trae cada ficha, y la regla de
       que las citas van enteras. */
    lede: 'Two have arrived. The record, the two lines that carry the most weight in each one, and the contact each signatory gave. I quote them untouched: a line cut out of a signed letter makes it a different document.',
    entregadasH: 'Delivered',
    faltanH: 'Room for more',
    citaTag: 'The two lines that carry the most weight',
    // RÓTULO DEL CONTACTO. Dice DE DÓNDE sale: no es un correo que Jaime
    // haya buscado, es el que el propio firmante escribió en su carta
    // ofreciéndose a contestar preguntas sobre él.
    contactoTag: 'Contact he gave for enquiries about me',
    /* LA FILA DE LA CARTA. `pdfTag` es el rótulo y `pdfNo` lo que va debajo;
       `{n}` es el nombre de quien firma. Aquí había además `pdfVer`, `pdfMeta`
       y un `pdfKb` por ficha con el peso del archivo, que `cartas.test.mjs`
       comparaba con el disco. Se fueron con el enlace: sin archivo servido no
       hay peso que publicar ni que comprobar. */
    pdfTag: 'The letter itself',
    /* ── EL ARCHIVO SALIÓ DE LA PÁGINA EL 2026-09-01 ────────────────────
       No es un cambio de opinión sobre lo que Jaime pidió, es que lo que
       pidió no se puede construir tal y como está el sitio. Él autorizó
       publicar los PDF asumiendo que «quien tenga el enlace del CV» los
       vería, y el enlace del CV es la credencial. Pero los archivos se
       servían en `/assets/cv/…`, una ruta fija que no pasa por `CV_SLUG`, y
       vivían commiteados en un repositorio PÚBLICO: se bajaban con una
       petición anónima. El sitio es estático y Vercel sirve el repo, así que
       NO HAY forma de que esta página entregue un archivo solo a quien
       reciba la dirección.
       Y no son datos suyos: las dos cartas van dirigidas a un comité de
       admisiones y llevan el móvil personal de un firmante, los correos de
       los dos y la dirección registrada de una empresa. La propia página
       retiene una foto por menos que esto («en el cartel se lee un número de
       teléfono y nadie me lo dio para publicarlo»).
       LA FRASE NO INVENTA UNA POLÍTICA NUEVA: dice el hecho —no está aquí, y
       por qué— en primera persona y sin prometer nada que Jaime no haya
       dicho. Cuando él decida (repo privado, alojarlo detrás de otra cosa, o
       asumir que es público), vuelve el enlace y esta cadena se va. */
    /* ── SE PROBÓ A AÑADIR «SE LA MANDO A QUIEN ME LA PIDA», Y SE RETIRÓ
       (2026-09-01) ────────────────────────────────────────────────────────
       Durante unas horas esta cadena llevó una segunda oración: «La carta
       firmada se la mando a quien me la pida; mi LinkedIn está al final».
       Se retiró, y el motivo no es de estilo:
        · JAIME NO LA HA DICHO. En primera persona y en su CV, esa frase es
          un COMPROMISO SUYO, no una descripción del sitio. La regla de este
          archivo es que sin fuente no hay frase, y aquí la fuente sería él.
        · LO QUE COMPROMETE NO ES SUYO. Lo que se mandaría es el PDF entero:
          el móvil personal de Lloyd George, los dos correos y la dirección
          registrada de la empresa de Andy Toh. La propia página retiene una
          foto por menos que esto («en el cartel se lee un número de teléfono
          y nadie me lo dio para publicarlo»), y el archivo salió de la web
          justo por publicar datos de terceros.
        · LA DECISIÓN ESTÁ ABIERTA, POR ESCRITO. `cv-material/cartas/
          CARTAS.md` se encabeza con «HACE FALTA UNA DECISIÓN TUYA» y tres
          opciones sin respuesta (repo privado · dejarlos fuera · publicarlos
          sabiendo que los baja cualquiera). Publicar el canal por él cierra
          esa decisión desde la página.
       PARA PONERLA: que Jaime lo diga, y entonces vuelve la segunda oración
       —el canal ya existe, es el LinkedIn que esta página publica en su
       cierre— sin tocar nada más. Mientras tanto la ficha dice sólo dónde no
       está el archivo y por qué, que es lo que se puede sostener. */
    // Y es la cadena de `main` PALABRA POR PALABRA, incluido «the file
    // carries»: al retirar la promesa se había quedado en «it carries», y ese
    // «it» ya no tenía a qué apuntar más que a la propia página — o sea que
    // se leía como que la PÁGINA trae los datos de contacto.
    pdfNo: 'Not on this page while I decide where to keep it: the file carries {n}’s own contact details, and everything this page serves is public. The record above is what the letter says.',
    entregadas: [
      {
        nombre: 'Lloyd George',
        cargo: 'CEO, TAQ Pte Ltd',
        donde: 'Singapore — biotechnology, healthcare management and green technologies',
        relacion: 'He taught me for two weeks on the Green Technology programme in Singapore, through the educational consultancy Bluesky Education. He is the “Prof. Lloyd” I interviewed for my TikTok.',
        anio: '2026',
        // LAS DOS FRASES, VERBATIM del PDF. La primera es UNA sola idea que la
        // carta escribe en dos oraciones: cortarla por la mitad deja un
        // renglón que ni siquiera nombra a Jaime, así que va entera.
        citas: [
          'Two weeks is a short period, but it is long enough to tell apart the student who works from the student who merely attends. Jaime stood out from the first day.',
          'What he has already achieved without institutional support indicates clearly what he will achieve with it.'
        ],
        correo: 'Enquiries.TAQ@outlook.com',
        // EL PDF, ENTERO. Es el que trae el teléfono personal; ver la nota
        // del `lede`. No se recorta.
        // YA TIENE FOTO: la 1 del lote del 2026-08-30 —él con Lloyd George y
        // las banderas—. `foto` (la clave del hueco) queda en null y `lote`
        // dice qué imagen es.
        foto: null,
        lote: 'lloyd' as const
      },
      {
        nombre: 'Andy Toh',
        cargo: 'CEO, Bluesky Education',
        donde: 'Singapore — the educational consultancy that runs the programme',
        relacion: 'He observed me during my three-week programme in Singapore. He is the same Andy Toh I interviewed, and who is already on this site.',
        anio: '2026',
        citas: [
          'While many students spent their breaks socialising with their peers, Jaime actively approached and engaged with the educators, programme leaders, and industry professionals involved in the programme.',
          'His willingness to seek opportunities to learn and continually improve himself reflects a level of maturity and self-motivation that I believe will serve him extremely well at university.'
        ],
        correo: 'Andy.toh@bluesky-education.com',
        // SU FOTO YA ESTABA EN EL REPO Y EL HUECO SOBRABA. El MAPA.md del
        // lote lo dice con esas palabras: «la foto con Andy Toh (el CEO) ya
        // está en el repo (breakdown-andy-toh): va debajo de SU carta de
        // recomendación, igual que la de Lloyd debajo de la suya». Es la
        // misma foto de la entrevista que ya sale en el carrusel, y sale dos
        // veces a propósito: son las dos cosas que este CV afirma de esa
        // persona —la conversación y la carta— y la foto es la prueba de la
        // primera. El hueco `cartaAndy` deja de usarse.
        foto: null,
        lote: 'andy' as const
      }
    ],
    tag: 'Letter to come',
    campos: 'Name · role · relationship · contact',
    // UN solo hueco, y sin nombrar a nadie. Ver la nota larga arriba.
    slots: [
      'Space reserved for the next letter.'
    ],
    // ── LO QUE LAS CARTAS VERIFICAN ─────────────────────────────────────
    // Seis hechos que hasta el 2026-08-29 eran solo palabra de Jaime. Ahora
    // los firma un tercero, así que se pueden AFIRMAR citando la carta — y
    // en los sitios del CV donde ya estaban dichos con su voz, se les pone
    // `fuenteCarta` debajo. La marca dice de QUIÉN es la carta: «un tercero»
    // a secas no es una fuente, es un rumor con buena presentación.
    verificaH: 'What the letters confirm',
    verificaLede: 'Until these arrived, the facts below were my word. Now someone from outside my school and my family has written them down and signed them.',
    // EL RÓTULO SOLO EXISTE EN ESPAÑOL: en este panel las citas ya están en
    // el idioma de la página y no hay nada que avisar. Vacío = no se pinta.
    verificaCitaTag: '',
    // `cita` es la frase EXACTA de la carta, separada del renglón que la
    // presenta. Se separa para que el panel español pueda envolverla en
    // `lang="en"` — ahí son tres trozos de inglés dentro de un párrafo en
    // español, y sin esa marca un lector de pantalla los pronuncia con
    // fonemas españoles. Aquí no hace falta la marca, pero la forma se
    // mantiene igual en las dos tablas: `es` está tipado `typeof en`.
    // Las comillas NO van dentro de `cita`: las pone el componente, que sabe
    // en qué idioma está («» en español, “” en inglés).
    verifica: [
      { que: 'I founded the Smart Finance student organisation at my campus.', cita: '', quien: 'Lloyd George' },
      { que: 'I host a financial-education podcast in which I interview finance executives, entrepreneurs and university professors.', cita: '', quien: 'Lloyd George' },
      { que: 'In Singapore I arranged and conducted the interviews with business leaders and with Business Administration students from NUS myself —', cita: 'entirely on his own steam', quien: 'Lloyd George' },
      { que: 'I gave my time to community and environmental work in Singapore,', cita: 'including a beach cleaning project during his stay', quien: 'Lloyd George' },
      { que: 'I work in Spanish, English and French.', cita: '', quien: 'Lloyd George' },
      { que: 'At the Green Tech Youth Summit I developed a project and presented it, and', cita: 'performed particularly well in both his project and presentation', quien: 'Andy Toh' }
    ],
    // ── EL PREMIO SE MUDÓ A SU PROPIO CAPÍTULO (2026-08-31) ─────────────
    // Vivía aquí, en un recuadro de 44 palabras de descargo y 19 de hecho, al
    // final del capítulo de las cartas. Ivey evalúa los premios en sección
    // aparte, así que ahora tiene la suya (`premios`) y el descargo sigue
    // yendo con él, en mono y una sola vez. Lo que se queda aquí es la línea
    // de `verifica` que firma Andy Toh sobre el Green Tech Youth Summit: esa
    // no es el premio, es lo que una carta confirma de su trabajo.
    // Se pinta donde una afirmación de Jaime pasó a tener fuente de tercero.
    // {n} es quien firma la carta y {s} el título de este capítulo.
    fuenteCarta: 'Third-party source: {n}’s letter, in “{s}”.'
  },

  // ---- Capítulo 9: la frase ----
  frase: {
    // VERBATIM. Es la voz de Jaime y NO SE TOCA — ni ortografía ni puntuación.
    // En los dos paneles va en español (lang="es" en el marcado); el panel
    // inglés enseña debajo la traducción pequeña de aquí abajo, marcada.
    //
    // ── LA CAMBIÓ ÉL, EL 2026-08-30 ─────────────────────────────────────
    // Esta frase es NUEVA y sustituye a la que cerraba el CV desde el
    // 2026-08-27. Lo que cambia no es el estilo, es lo que dice: la anterior
    // terminaba explicando el fracaso («si no, es porque te pudieron haber
    // destruido a ti») y esta termina en lo que te queda («te quedarás con
    // que lo diste todo»). Es otra idea, así que no se «actualizó» la vieja:
    // se sustituyó entera. Lo único que se tocó de lo que él mandó es la
    // puntuación —la coma y los dos puntos finales—, que es lo que la regla
    // de este archivo permite. Queda anotada en
    // cv-clips/EVIDENCIA-LINKEDIN-TIKTOK.md, entrada del 2026-08-30.
    texto: 'Si la vida destruye tus planes, es porque tus planes te pudieron haber destruido a ti. Haz tu mejor esfuerzo y los resultados se darán, y si no, te quedarás con que lo diste todo.',
    // Traducción de la frase, solo para el panel inglés, marcada como tal.
    traduccion: '“If life destroys your plans, it is because your plans could have destroyed you. Do your best and the results will come — and if they don’t, you will be left knowing you gave it everything.”',
    traduccionTag: 'My words, in Spanish. In English:'
  },

  // ---- Contacto (bajo la frase) ----
  // El pie, como lo pidió Jaime (2026-08-28): sus dos redes y el sitio. El
  // enlace del código en GitHub se quitó.
  contacto: {
    h: 'Where to find me',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    site: 'smartfinance.lat'
  },

  // ---- Disclaimer ----
  disc: {
    h: 'Educational, not advice',
    p: 'Smart Finance is a student project. Everything on this page is published for educational purposes and is not financial, investment or tax advice, nor a recommendation to buy or sell anything. Market data is delayed and comes from third parties; check it at the source before deciding anything.'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LOS HUECOS. `que` es el rótulo del hueco y `pista` dice qué va dentro.
  // Ninguno de los dos es contenido del CV: son las instrucciones del hueco.
  // ═════════════════════════════════════════════════════════════════════════
  huecos: {
    // `aplicaA` («What I'm applying to») YA NO EXISTE: Jaime lo pidió fuera
    // en su brief del 2026-08-28 («está de más»). La meta de la portada
    // (`head.meta`) y la cita de su visita a la U of T dicen lo mismo mejor.
    // `linea` ya no existe: era el hueco de "la frase que resume quién eres",
    // y esa frase ya la escribió Jaime — es `voz.apertura`, que abre la
    // página. Un hueco pidiendo lo que está tres centímetros más arriba es
    // ruido, así que se retiró en vez de dejarlo puesto.
    quienSoy: {
      que: 'Where it started',
      pista: 'Three to five sentences: where that sentence comes from, and what happened exactly. The shortest thing on the page, and the one they remember.'
    },
    retoNota: {
      que: 'What I want out of the contest',
      pista: 'Why you entered and what you would count as having gone well — written before the result, so it is worth something afterwards.'
    },
    researchNota: {
      que: 'What building the report taught me',
      pista: 'The part that was harder than you expected, in one short paragraph.'
    },
    tiktokNota: {
      que: 'Why I record',
      pista: 'Two sentences. Why the camera, and who you picture watching.'
    },
    entrevistaAndy: {
      que: 'One thing I took from Andy Toh',
      pista: 'One line. Without it, this is a photo of a stranger.'
    },
    entrevistaMaier: {
      // No dice "de Jon Maier": Jaime estuvo en la sesión, no la condujo.
      que: 'One thing I took from that session',
      pista: 'One line. Without it, this is a photo of a stranger.'
    },
    entrevistaDieck: {
      que: 'One thing I took from Moris Dieck',
      pista: 'One line. Without it, this is a photo of a stranger.'
    },
    entrevistaPodcast: {
      que: 'One thing I took from the podcast',
      pista: 'One line about the Financial Trading Room conversation.'
    },
    entrevistaLloyd: {
      que: 'One thing I took from Prof. Lloyd',
      pista: 'One line about the NUS conversation.'
    },
    entrevistaNus: {
      que: 'One thing I took from that interview',
      pista: 'One line about the NUS-student conversation.'
    },
    entrevistaJesus: {
      que: 'One thing I took from that conversation',
      pista: 'One line about the Marina Bay interview.'
    },
    entrevistaMauricio: {
      que: 'One thing I took from Mauricio',
      pista: 'One line. The podcast, the AEM, or the mentorship — whichever mattered most.'
    },
    entrevistaSol: {
      que: 'One thing I took from Sol',
      pista: 'One line about the Callejeritos conversation.'
    },
    entrevistaRaul: {
      que: 'One thing I took from Raúl Irabién',
      pista: 'One line about the student-groups conversation.'
    },
    entrevistaRendon: {
      que: 'One thing I took from Miguel Ángel Rendón',
      pista: 'Una línea. Del episodio: el LinkedIn desde prepa, «el que brilla es la persona», o «por amor a tu yo futuro» — lo que más te haya servido.'
    },
    entrevistaMajo: {
      que: 'One thing I took from María José Cortés',
      pista: 'Una línea. De la cinta: «sería mucho más curiosa» o «aprovechen el tiempo» — lo que más te haya servido.'
    },
    entrevistaDuran: {
      que: 'One thing I took from Manuel Durán',
      pista: 'Una línea. Del episodio con Manuel Durán: lo que más te haya servido.'
    },
    consejoMarg: {
      que: 'One thing I took from her answer',
      pista: 'Una línea: qué te contestó sobre estudiar en Canadá y qué hiciste con eso.'
    },
    servirAnimales: {
      que: 'The animals, in my words',
      pista: 'One or two sentences. What you did, not what you felt.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LOS TRES DEL RENGLÓN ACADÉMICO (ola 2)
    // ═══════════════════════════════════════════════════════════════════════
    acadPromedio: {
      que: 'My average, and my class standing if I know it',
      pista: '¿Cuál es tu promedio general del bachillerato hasta hoy, y en qué escala está (Tec usa 0-100)? Si tu escuela publica tu posición en la clase o tu percentil, ponlo también; si no lo sabes, se pregunta en servicios escolares. Rotman dice que sus alumnos «están generalmente en el 5 % más alto de su clase», así que este número decide más que cualquier otra cosa de esta página.'
    },
    acadCalculo: {
      que: 'Calculus: whether my plan includes it, and my grade',
      pista: '¿Tu plan Multicultural 2024-2027 incluye cálculo? Si sí: en qué semestre lo llevas o lo llevaste y con qué calificación. Si no lo incluye, ¿qué materia de matemáticas es la más avanzada de tu plan? PREGÚNTALO EN LA ESCUELA ANTES DE OCTUBRE: Rotman exige que el expediente muestre que estás INSCRITO en los cursos requeridos para dar una oferta condicional, y Schulich pide cálculo (MCV4U) con al menos 70 %.'
    },
    acadIngles: {
      que: 'The English exam I still have to sit: which one, and when',
      pista: '¿Cuál vas a presentar y qué fecha tienes agendada? Los objetivos, de las páginas oficiales: C1 Advanced 180 con mínimo 170 por componente · TOEFL iBT 89 con 22 en Speaking y Writing · IELTS Academic 6.5 sin banda bajo 6.0 · Duolingo 120 · PTE Academic 65. El propio Road to College del Tec ofrece certificaciones de idiomas: es la vía institucional y es por donde conviene preguntarlo.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // UN CONTRATIEMPO, Y TIENE QUE SER REAL — POR QUÉ AQUÍ QUEDA UN SOLO HUECO
    // ═══════════════════════════════════════════════════════════════════════
    // Queen's publica su rúbrica de 5 niveles
    // (queensu.ca/admission/applying/supplementary-application-rubric,
    // consultada el 2026-08-31) y su nivel 5 exige, verbatim: «Handles
    // setbacks or complexity with clarity and purpose» y «Reflects
    // meaningfully on what they learned and how it shaped their perspective
    // or behavior going forward». Sauder pide «un problema o situación
    // desconocida — acciones, resultado, aprendizaje» y UBC evalúa «Personal
    // growth and resilience». Eso sigue siendo cierto y sigue mandando.
    //
    // ── LO QUE HABÍA AQUÍ, Y POR QUÉ SE FUE (2026-09-01) ─────────────────
    // Ocho huecos, uno por capítulo, uno para cada clase de fracaso. La ola
    // anterior ya los había corregido una vez, pasándolos de artículo
    // definido («El curso que dejé o reprobé») a condicional («Si dejé o
    // reprobé un curso»), porque en definido AFIRMABAN ocho fracasos sin una
    // sola fuente.
    // El condicional arregla la afirmación y no arregla lo otro: OCHO
    // recuadros vacíos seguidos, uno en cada capítulo, no se leen como ocho
    // preguntas abiertas — se leen como un documento sin terminar. Y el
    // conjunto sigue presuponiendo POR SU FORMA: ocho sitios reservados para
    // ocho fracasos distintos dicen que los ocho existen, aunque cada frase
    // suelta esté en condicional. Dos eran además comprobablemente vacíos
    // hoy: el del Reto presuponía operaciones y el Reto no arranca hasta el
    // 5 de octubre; el de las certificaciones presuponía un curso abandonado
    // que no aparece en ningún material.
    //
    // ── LO QUE HAY EN SU LUGAR: UNO SOLO, Y ESTÁ DOCUMENTADO ─────────────
    // El bloque `leccionMedida` de esta misma tabla. No es un hueco: es un
    // contratiempo REAL de este proyecto, con fuente escrita en el propio
    // repositorio (docs/context/lessons.md), y trae las dos mitades que pide
    // la rúbrica — qué salió mal y qué regla dejó. Se pinta en el capítulo
    // de los proyectos, pegado a las tres cifras que el build cuenta, que es
    // lo que esa regla parece una vez convertida en código.
    // Uno verdadero puntúa más que ocho reservados: la rúbrica pide
    // reflexión sobre algo que PASÓ, no una lista de casillas.
    //
    // Y QUEDA ESTE HUECO, UNO, por si Jaime quiere añadir el suyo. En
    // condicional, sin decir de qué capítulo es y sin presuponer que existe.
    contraOtro: {
      que: 'If there is another setback I want to tell — what it was, and what I changed',
      pista: 'Uno solo, y solo si de verdad lo hay: qué pasó y qué haces distinto desde entonces. Las dos mitades, que es lo que pide la rúbrica de Queen\'s — sin la segunda es una disculpa. Si no hay ninguno, este hueco se quita y la página se queda con el contratiempo medido de los proyectos, que ya cumple.'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LOS CINCO DEL BLOQUE DE EXPERIENCIA EN FORMATO DE SOLICITUD (ola 2)
    // ═══════════════════════════════════════════════════════════════════════
    // Uno por fila con campos vacíos. Se pinta UNO por fila, no uno por
    // campo: cinco filas con dos marcas cada una serían diez tropiezos en el
    // capítulo que un comité escanea primero. La pregunta exacta de cada uno
    // vive en `expApp.filas[].pide`, junto a la fila que la necesita.
    expGrupo: { que: 'Result and referee — the student community', pista: 'Ver expApp.filas → grupo.' },
    expSitio: { que: 'Result and referee — smartfinance.lat', pista: 'Ver expApp.filas → sitio.' },
    expJasa: { que: 'Result and referee — Jasa Motor', pista: 'Ver expApp.filas → jasa. OJO: el referee NO puede ser su papá (UBC prohíbe familiares).' },
    expTiktok: { que: 'Result — the channel and the interviews', pista: 'Ver expApp.filas → tiktok.' }
    // EL HUECO DE LAS PLAYAS SE FUE (2026-08-29): pedía «las playas, con mis
    // palabras» y sus palabras aparecieron — su publicación de LinkedIn
    // sobre el voluntariado, hoy citada en el bloque (`voz.playa`). Un hueco
    // que pide algo que ya está en la pantalla de al lado no es honesto, es
    // ruido.
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LO SUYO. Vacío hasta que Jaime lo escriba. Cada cadena vacía sale como el
  // hueco de arriba con su rótulo; cuando tenga texto, sale el texto.
  // ═════════════════════════════════════════════════════════════════════════
  suyo: {
    quienSoy: '',
    retoNota: '',
    researchNota: '',
    tiktokNota: '',
    entrevistaAndy: '',
    entrevistaMaier: '',
    entrevistaDieck: '',
    entrevistaPodcast: '',
    entrevistaLloyd: '',
    entrevistaNus: '',
    entrevistaJesus: '',
    entrevistaMauricio: '',
    entrevistaSol: '',
    entrevistaRaul: '',
    entrevistaRendon: '',
    entrevistaMajo: '',
    entrevistaDuran: '',
    consejoMarg: '',
    servirAnimales: '',
    // Los quince de la ola 2. Mismo mecanismo: en cuanto tienen texto, el
    // hueco desaparece solo. Si Jaime escribe solo el español, el hueco
    // inglés sigue puesto — que es lo honesto: una traducción que nadie ha
    // hecho no se inventa.
    acadPromedio: '',
    acadCalculo: '',
    acadIngles: '',
    expGrupo: '',
    expSitio: '',
    expJasa: '',
    expTiktok: '',
    // ── UN SOLO CONTRATIEMPO, Y ES EL DE VERDAD (2026-09-01) ──────────
    // Aquí vivían OCHO (`contraExp`, `contraAcad`, `contraServir`,
    // `contraProyectos`, `contraGente`, `contraReto`, `contraCerts`,
    // `contraPremios`), uno por capítulo. La razón entera de por qué se
    // fueron está en `huecos`, junto a `contraOtro`.
    contraOtro: ''
  },

  // ═════════════════════════════════════════════════════════════════════════
  // LA VOZ DE JAIME. Frases que él dijo, pulidas SOLO en ortografía y
  // puntuación. Las inglesas son traducciones fieles. TODO este bloque está
  // pendiente de su revisión final.
  // ═════════════════════════════════════════════════════════════════════════
  voz: {
    // ─── LA FRASE DE APERTURA ───────────────────────────────────────────
    // Es lo PRIMERO de la página, con el peso de una declaración: la pidió
    // así Jaime (mensaje del 2026-08-27, anotado en la ADENDA de
    // cv-clips/EVIDENCIA-LINKEDIN-TIKTOK.md). Sus palabras, tal cual las
    // escribió: «abri los ojos y vi todas la oportunidades posibles y hago lo
    // que puedo por aprovecharlas, mi objetivo es que todos tambien los
    // puedan abrir y ayudarlos». Él dijo «algo así», o sea que la ortografía
    // y la puntuación se pulen SIN tocar el sentido ni el vocabulario — la
    // misma regla que el resto de este bloque. Nada de florituras: las
    // palabras son las suyas y el orden también.
    // Esta versión inglesa es TRADUCCIÓN, y lo dice en pantalla
    // (`aperturaTag`, vacío en español porque ahí está el original).
    // texto de Jaime (traducción), pendiente de su revisión final
    apertura: '“I opened my eyes and saw every possible opportunity, and I do what I can to make the most of them. My goal is that everyone can open theirs too, and to help them.”',
    aperturaTag: 'My words, in Spanish. This is a translation; the original is in the Spanish panel.',
    // Palabras de Jaime, VERBATIM, de su publicación en LinkedIn sobre la
    // simulación de Vista Equity Partners (2026-08, urn 7495934696430764032).
    // En inglés en el original: aquí no hay traducción que revisar.
    //
    // LA CITA LLEGA HASTA DONDE TERMINA LA IDEA, Y TODO RECORTE SE VE. Antes
    // cortaba en «Rule of 40 framework.» con punto final, y ese punto no
    // estaba en el post: se leía como el final de su frase cuando el post
    // seguía. Ahora va la idea entera —del 10-K al resumen de méritos contra
    // riesgos— y lo ÚNICO que falta lleva su «[…]» dentro de las comillas:
    // la explicación de la Rule of 40 («one of the key benchmarks investors
    // use to assess whether a SaaS company is balancing growth and
    // profitability effectively. From there,»). El post completo está en
    // cv-material/MATERIAL.md (LI-01), así que la omisión es una elección de
    // longitud, marcada. El paréntesis «(alongside investor presentation
    // data)» es SUYO y va verbatim: se había caído sin marca (un segundo
    // recorte invisible dentro de una cita «verbatim») y se restauró el
    // 2026-08-29. Un recorte sin su marca convierte la cita en desmentible.
    // ── RECORTADA AL MÍNIMO (Jaime, 2026-08-30) ─────────────────────────
    // «no lo pongas tan extenso, solo pon de lo que es y por qué lo hago y
    // que me gusta mucho lo corporativo». Su publicación son cuatro frases
    // largas (el estado de resultados conforme a GAAP desde el 10-K, la Rule
    // of 40, el resumen de méritos frente a riesgos); aquí se queda LA
    // PRIMERA, que es la que dice QUÉ es. Sigue siendo verbatim y el «[…]»
    // marca lo que no se reproduce, igual que antes — recortar una cita se
    // puede, reescribirla no. El recibo de la simulación (el certificado de
    // Forage con Vista) está entero en el capítulo de certificaciones, así
    // que no se pierde nada comprobable.
    pe: '“This program put me in the shoes of a Private Equity Summer Analyst evaluating Workday as a potential investment. […]”',
    peFuente: 'From my LinkedIn post on the Vista Equity Partners job simulation (2026). The “[…]” marks a passage this page does not reproduce.',
    // Marca de traducción, VISIBLE, encima de la cita. Vacía en inglés: ahí la
    // cita es el original. Misma regla que la traducción de la frase final.
    peTag: '',
    // texto de Jaime (traducción), pendiente de su revisión final
    dedicacion: '“Private equity: I like the corporate side, and the research behind investing in companies. That is what I want to dedicate myself to.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    actinver: '“The Reto Actinver: I want to represent my school, Prepa Tec CEM; to learn from it, to visit Actinver, to bring people from Actinver to give us talks, and to help promote contests like this one so everyone joins in and learns.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    ensenar: '“I want to show myself as a student who wants to communicate finance and advice to everyone. I am a kid who wants to share the advice and the motivation of important people, and to help guide them toward knowing their vocation, to leave a little mark on everyone as much as I can.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    entrevistas: '“I like interviewing all kinds of people, because you can take something from everyone — they are small experiences and different points of view.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    servir: '“Helping my community, the animals, and cleaning up beaches.”',
    // ---- Jasa Motor ----
    // Palabras de Jaime (2026-08-28): «es de mi familia y yo implementé eso
    // porque quería apoyar a mi papá». Pulidas SIN cambiar el sentido; esta
    // versión inglesa es TRADUCCIÓN y lo dice en pantalla (`jasaTag`).
    // texto de Jaime (traducción), pendiente de su revisión final.
    // «Implementé eso» → “implemented that”: la traducción sigue sus
    // palabras («eso», no «lo»), igual que el original del panel español.
    jasa: '“It is my family’s, and I implemented that because I wanted to support my dad.”',
    jasaTag: 'My words, in Spanish. This is a translation; the original is in the Spanish panel.',
    // ---- La visita a la University of Toronto ----
    // VERBATIM de su publicación en LinkedIn sobre la visita (en inglés en el
    // original): es la línea que dice a dónde apunta este CV, y sustituye al
    // hueco «What I'm applying to» que Jaime pidió quitar.
    toronto: '“This visit reinforced something I had been thinking about for a long time: this is where I want to study Finance.”',
    torontoTag: '',
    torontoFuente: 'From my LinkedIn post on my visit to the University of Toronto and Rotman Commerce (2026).',
    // ---- La limpieza de playa en Singapur ----
    // VERBATIM de su publicación de LinkedIn sobre el voluntariado (LI-16, en
    // inglés en el original). Hasta el 2026-08-29 el CV no tenía este texto:
    // la publicación se daba por perdida y el bloque de la playa iba con una
    // sola frase escrita por la página. Está publicada, se volvió a
    // encontrar y se transcribió palabra por palabra.
    // DOS MARCAS, LAS DOS OBLIGATORIAS:
    //  · El «[…]» se come UNA frase suya («During my time in Singapore, I've
    //    also been learning a lot about its economy and how sustainability is
    //    deeply integrated into the country's long term vision»), que es la
    //    que da pie a la última. Se recorta por longitud y se marca, igual
    //    que en `pe`: un recorte sin marca convierte una cita verbatim en
    //    algo desmentible.
    //  · El punto y coma de «technology; it's» no está en el original, que va
    //    sin puntuación ahí. Es la misma regla de siempre: ortografía y
    //    puntuación se pulen, el sentido y las palabras no se tocan.
    playa: '“It was a rewarding experience that reminded me how meaningful small actions can be when a community works together toward a common goal. Taking care of the environment isn’t just about policies or technology; it’s also about people taking responsibility. […] Seeing how environmental initiatives and economic development go hand in hand has been one of the most interesting lessons of this experience.”',
    playaTag: '',
    playaFuente: 'From my LinkedIn post on the volunteer beach clean-up in Singapore (2026). The “[…]” marks a sentence this page does not reproduce.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ESTA TABLA VA EN PRIMERA PERSONA, IGUAL QUE LA INGLESA. Es SU CV: la voz es
// la suya, no la de alguien contando lo que hizo. El español lo pone fácil de
// romper porque el pretérito de «yo» y el de «él» solo se distinguen por el
// acento —doné/donó, entrevisté/entrevistó, pedí/pidió— y porque «su curso» y
// «mi curso» se escriben casi igual; se colaron seis y ninguna se veía en la
// tabla inglesa, que estaba bien. Antes de tocar una cadena de aquí: si la
// gemela inglesa dice «I», esta tiene que decir «yo».
// ÚNICA EXCEPCIÓN: los textos de `Hueco` hablan CON Jaime, no DE él, y por eso
// van en segunda persona («de dónde te viene esa frase»). Son instrucciones
// del hueco, no contenido del CV.
// ═══════════════════════════════════════════════════════════════════════════
const es: typeof en = {
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  cifraSuya: 'Mi cifra, del 29 de agosto de 2026. Esta página no la cuenta: es mi afirmación.',
  // Ver la nota del bloque inglés: el podcast no es una cifra ni es del 29.
  dichoSuyo: 'Palabra mía, del 2 de septiembre de 2026. Esta página no lo verifica: es mi afirmación.',
  cintaTag: '',
  postTag: 'De mi propia publicación en LinkedIn, escrita en inglés. Esto es una traducción; el original está en el panel en inglés.',

  // Ver la nota de la tabla inglesa.
  // Ver la nota de la tabla inglesa: son las CINCO filas de 2025.

  lang: { en: 'English', es: 'Español', aria: 'Idioma de esta página' },

  hueco: {
    tag: 'Falta escribirlo',
    note: 'Esto lo escribo yo, con mis palabras. Nada de esta página se genera en mi lugar.'
  },
  fotoHueco: { tag: 'Falta la foto' },
  materialHueco: { tag: 'Material pendiente' },
  fotosPend: {
    research: 'Yo trabajando: una pantalla, un cuaderno, algo real.',
    actinver: 'La visita, la prepa, el equipo, las pláticas.',
    // Ver la nota de la tabla inglesa.
    sol: 'Un retrato de Sol, o un cuadro de los vídeos de la marcha. La del puesto no se publica aquí: en el cartel se lee un número de teléfono.',
    rendon: 'Un cuadro de la grabación con Miguel Ángel Rendón.',
    majo: 'Un cuadro de la grabación con María José Cortés.',
    duran: 'Un cuadro de la grabación con Manuel Durán.',
    cartaAndy: 'Una foto mía con Andy Toh, el CEO que escribió esta carta.',
  },
  // Ver la nota de la tabla inglesa.
  lote: {
    cartaLloydAlt: 'Yo sosteniendo una bandera de Singapur en su asta de madera, junto a Lloyd George, de camisa blanca, que sostiene otra asta, en un salón',
    cartaLloydPie: 'Con Lloyd George en Singapur (2026).',
    cartaAndyAlt: 'Yo entrevistando a Andy Toh, los dos sentados frente a frente en una mesa baja, durante el programa en Singapur',
    cartaAndyPie: 'Con Andy Toh en Singapur (2026).',
    torontoAlt: 'Yo y una compañera, con abrigos de invierno, frente a las letras rojas de TORONTO en Nathan Phillips Square, con el ayuntamiento detrás',
    torontoPie: 'El día que visité Toronto (2026).',
    playa1Alt: 'Yo recogiendo basura con una pinza y una cubeta roja en la orilla de un sendero, con un camión de basura detrás y el mar pasando los árboles',
    playa1Pie: 'Recogiendo basura, con la cubeta y la pinza.',
    playa2Alt: 'El montón de madera, tablas y cocos que recogimos, sobre el pasto junto a la arena',
    playa2Pie: 'Lo que recogimos.',
    playa3Alt: 'Yo y una compañera, de espaldas, sacando basura de un seto junto al mar, con cargueros en el horizonte',
    playa3Pie: 'Junto al mar, con una compañera.',
    donacionAlt: 'Yo con una bolsa de alimento para perro y dos sobres de alimento para gato, frente a la carpa del stand de adopción',
    donacionPie: 'Entregando el alimento que doné.',
    perritosAlt: 'Perros en un corral de rejilla bajo la carpa del refugio, con una lona sobre el respeto y el cuidado de los animales detrás',
    perritosPie: 'Los perritos del stand.',
    margAlt: 'Yo junto a Marg Franklin, que lleva un saco gris claro de cuadros, frente a un fondo oscuro',
    margPie: 'Con Marg Franklin en la firma (2026).',
    dieckPie: 'Con Moris Dieck al terminar su conferencia en el Tec.',
    grupoEntrevistaAlt: 'Yo con un micrófono, entrevistando a dos estudiantes frente al cartel del stand de Smart Finance Prepa Tec',
    grupoEntrevistaPie: 'Entrevistando en mi prepa, para el grupo estudiantil.',
    grupoNarraAlt: 'Yo hablando a cámara con un micrófono de solapa, junto al cartel de Smart Finance Prepa Tec que invita a sumarse',
    grupoNarraPie: 'Hablando a cámara sobre el grupo estudiantil.',
    marchaAlt: 'Yo con un cartel hecho a mano sobre Canelo, un perro en adopción, en la marcha, con el arco y la fuente de Tlalnepantla detrás',
    marchaPie: 'La marcha por los animales callejeros.'
  },
  clip: {
    tag: 'Falta el clip',
    pista: 'El clip se servirá desde este dominio, nunca incrustado. Mientras tanto, el póster y el enlace al original.',
    ver: 'Ver en TikTok',
    carrusel: 'Carrusel de fotos'
  },

  // Ver la nota de la tabla inglesa: {min} se fue el 2026-08-31.
  indice: {
    resumen: '{n} capítulos',
    ver: 'Ver el índice',
    aria: 'Capítulos de esta página'
  },

  // Ver la nota larga de la tabla inglesa: ninguna cifra de la franja se
  // escribe, las cuatro se cuentan en el build.
  franja: {
    tag: 'Comprobable, antes de bajar',
    certsQ: 'certificaciones: {n} con ID de credencial, {d} con la sede y las fechas impresas en el certificado',
    cartasQ: 'cartas firmadas por CEOs en Singapur, con el contacto que dio cada uno',
    sitioN: 'smartfinance.lat',
    sitioQ: 'un sitio que construí: {p} pruebas automáticas · {l} lecciones bilingües · {f} fuentes citadas · {g} términos de glosario',
    premiosQ: 'premio — GreenTech Summit 2026, y su única fuente es una carta',
    ir: 'Ir a «{s}»'
  },

  // Ver la nota larga de la tabla inglesa: dos capítulos nuevos (c3 y c9) y
  // «Cada quien trae algo» baja del 4 al 6.
  caps: {
    abro: 'Abrí los ojos',
    grupo: 'Fundé un grupo estudiantil y lo presido',
    conversaciones: 'Conseguí que directivos, profesores y emprendedores se sentaran conmigo',
    cartas: 'Lo que dos CEOs escribieron de mí',
    grupoHace: 'Lo que organizo con el grupo',
    voluntariados: 'Servir',
    construi: 'Lo que construí: smartfinance.lat, mi canal, la tienda de mi familia',
    premios: 'Premios',
    expediente: 'Escuela, inglés, certificaciones — y la lista entera',
    frase: 'La frase'
  },

  // Paridad exacta con el panel inglés. Ver la nota grande de `mic` allí.
  mic: {
    eyebrow: 'Índice y obertura',
    h: 'Lo que suena aquí',
    piezas: '{n} piezas',
    lede: 'Cada punto abre una grabación, una publicación o la ficha que dice qué falta. Las personas son el liderazgo: a quién conseguí sentar conmigo. Dos son consejos que pedí, no entrevistas, y lo dicen. Los países son la voz: lo que explico a cámara — y México es el que me eligieron para representar. No son lo mismo, y esta página no finge que lo sean.',
    sigue: 'Todo lo de abajo es la versión larga. Nada de aquí arriba sustituye a un capítulo.',
    indiceAria: 'Lo que abre el micrófono: {n} piezas',
    sinLienzo: 'El dibujo necesita WebGL. La lista son las mismas {n} piezas.',
    grupoPersonas: 'Personas que grabé',
    grupoExperiencias: 'Gente a la que pedí consejo',
    grupoPaises: 'Países que expliqué',
    bajar: 'En el capítulo',
    abre: {
      podcast: 'El podcast que organicé en la sala Financial Trading Room del Tec. Salió dentro del programa del canal de la escuela; el enlace abre esa emisión completa.',
      rendon: 'El episodio que organicé y conduje; él abre dando las gracias por la invitación.',
      mauricio: 'La Parte 4 del podcast que grabé con él. Las partes 2 y 3 también están en mi TikTok.',
      lloyd: 'La entrevista en Singapur al hombre que después firmó una de mis dos cartas.',
      andy: 'La entrevista al otro firmante, durante el programa.',
      raul: 'La conversación con el presidente de Grupos Estudiantiles.',
      nus: 'La entrevista sobre qué hace falta para estar en una universidad top 8.',
      // «horizonte» y no «skyline»: cada panel 100 % en su idioma, y el alt
      // de la misma foto ya decía «horizonte».
      jesus: 'La entrevista al atardecer, con el horizonte de Marina Bay detrás.',
      mexico: 'Fui seleccionado para representar a México y presenté sobre él en la NUS.',
      singapur: 'Por qué aquí vive el dinero del mundo.',
      japon: 'Datos financieros de Japón.',
      canada: 'Por qué elegí este país para mi futuro.',
      dieck: 'Su conferencia en el Tec, organizada por HSBC; le pedí consejo para mi propio podcast. La entrevista todavía no existe, y este punto no finge que exista.',
      marg: 'El día que le pedí consejo sobre estudiar en Canadá: mi publicación y mi foto con ella. Una pregunta y su respuesta — no una entrevista.'
    },
    ver: {
      episodio: 'Ver la emisión',
      conversacion: 'Ver la conversación',
      video: 'Ver el video',
      experiencia: 'Ver la publicación',
      ficha: 'Ver la ficha'
    },
    paises: {
      mexico: 'México',
      singapur: 'Singapur',
      japon: 'Japón',
      canada: 'Canadá'
    },
    minutoQue: 'El minuto de esa emisión en el que empieza mi podcast'
  },

  materialQue: {
    rendonLink: 'El enlace de este episodio en TikTok',
    rendonFoto: 'Una foto de la grabación',
    duranCargo: 'El cargo de Manuel Durán, como lo diga él mismo',
    duranVideo: 'El video del episodio con Manuel Durán',
    majoCargo: 'El cargo de María José Cortés, como lo diga ella misma',
    majoClip: 'El clip de esta conversación, cuando se publique'
  },

  podcasts: {
    h: 'Episodios que organicé yo',
    rendon: 'Organicé y conduje un episodio con Miguel Ángel Rendón. La grabación está hecha y transcrita, y de ella hay diez clips cortados.',
    rendonFuente: 'De la propia grabación: él abre con «gracias por la invitación».',
    clipsH: 'Los diez clips',
    clips: 'Del episodio hay diez clips cortados: mi yo futuro · LinkedIn sin miedo · el mito de emprender · «muchos financieros» · brilla la persona · la bienvenida · un día real en finanzas · la IA en finanzas · la decisión difícil · mitos, verdadero o falso.'
  },

  // En español la cinta es el original: solo se pule la puntuación.
  dijo: {
    el: 'Lo que dijo él',
    ella: 'Lo que dijo ella',
    enCinta: 'en la grabación',
    rendon: [
      '«Creo que la principal, principal, y que me ha ayudado y que yo siempre doy el consejo a los estudiantes, es las relaciones. Crear relaciones, crear un networking. Un alumno que va en el último año de preparatoria sí o sí debe empezar a construir su LinkedIn.»',
      '«Convéncete de lo que hagas, de que lo que hagas ahorita es por amor a tu yo futuro. Es decir, lo que guardes hoy, lo que ahorres hoy, lo que inviertas hoy, lo va a gozar tu yo del futuro.»'
    ],
    majo: [
      '«Definitivamente sería mucho más curiosa de lo que fui, y es lo que les puedo recomendar. Estaría mucho más pendiente de qué pasa en el mundo, qué pasa alrededor.»',
      '«Que no se pierdan, que no se vayan por las puertas fáciles. […] Aprovechen mucho el tiempo, porque es el recurso que menos tenemos conforme vamos creciendo.»'
    ]
  },

  taller: {
    h: 'El taller de finanzas personales',
    que: 'Mi grupo organizó un taller de finanzas personales en mi prepa. Yo lo abrí y presenté al ponente, el profesor Gustavo, que le dijo al salón que era la primera plática que daba en una preparatoria.',
    queFuente: 'De las grabaciones de ese día. Mi LinkedIn lista «personal finance workshops» entre las actividades del grupo, en dos sitios.',
    asistenciaQue: 'Cuánta gente vino',
    aperturaH: 'Cómo lo abrí',
    apertura: '«Primero que nada, muchas gracias a todos los que vinieron, a todos los que están interesados en este taller. Lo organizamos con mucho cariño; va a ser algo muy sencillo y con actividades, para que sea algo interactivo y no sea aburrido para ustedes, como una clase más. Y pues bueno, primero vamos a empezar con este, nuestro orador, con el profesor Gustavo.»',
    aperturaTag: '',
    gustavo: '«La realidad es la primera vez que doy una plática en prepa. Siempre las he dado en la escuela de negocios o en las cámaras.»',
    gustavoQuien: 'el profesor Gustavo, al abrir el taller',
    gustavoQue: 'El apellido y el cargo del profesor Gustavo',
    temaH: 'Qué enseñó',
    tema: 'Metas financieras con el método S.M.A.R.T., la regla 50-30-20, los CETES, y los gastos pequeños que suman.',
    temaFuente: 'La diapositiva de S.M.A.R.T. está en las fotos; lo demás es lo que dijeron los asistentes a cámara.',
    testimoniosH: 'Lo que dijeron al salir',
    testimoniosLede: 'Los grabé yo mismo en la puerta, con una sola pregunta: ¿qué te llevas? Sus palabras, sin tocar.',
    testimoniosTag: '',
    testimonios: [
      { cita: '«Pues aprender cómo funcionan los CETES, las inversiones, la ley del 50-30-20 y los objetivos SMART para administrar mejor mis finanzas.»', quien: 'un estudiante que asistió' },
      { cita: '«Me llevo muchos conocimientos para poder administrar de mejor manera mi dinero, hacer compras más inteligentes y tener una inversión a futuro segura.»', quien: 'un estudiante que asistió' },
      { cita: '«Me llevo mucho conocimiento de los conocimientos básicos de finanzas, como los gastos que a veces no te das cuenta, ¿no? Que son como pequeños gastos que a cierto grado, pues es mucho dinero, ¿no?»', quien: 'un estudiante que asistió' },
      { cita: '«La inquietud de ser mejores profesionales y ver la perspectiva interna de lo que pueden lograr.»', quien: 'un profesor que asistió' },
      { cita: '«Cómo organizarme y controlar mis gastos […] y conocer sobre el 50, 30 y 20.»', quien: 'un estudiante que asistió' },
      { cita: '«Estrategias.»', quien: 'un estudiante que asistió' },
      { cita: '«Aprendizaje y estrategias.»', quien: 'un estudiante que asistió' }
    ],
    fotosH: 'Ese día',
    fotos: [
      { id: 'cv-taller-4603.webp', alt: 'El profesor Gustavo, con saco café y camisa azul claro, hablando frente a la diapositiva proyectada «Metas Financieras», con el método S.M.A.R.T. desglosado y un ejemplo de ahorro en pesos', pie: 'La diapositiva S.M.A.R.T.' },
      { id: 'cv-taller-4573.webp', alt: 'El ponente de espaldas, frente a las filas de butacas azules llenas de estudiantes; una compañera graba con un celular en un estabilizador', pie: 'El auditorio, desde el frente.' },
      { id: 'cv-taller-4609.webp', alt: 'Plano abierto del auditorio; al fondo, un estudiante levanta la mano', pie: 'Una pregunta desde el fondo.' }
    ]
  },

  grupoHace: {
    lede: 'Lo que organiza el grupo, con sus recibos: un taller de finanzas personales —grabaciones, fotos y las palabras de los asistentes— y el Reto Actinver, con su calendario desde la fuente.'
  },

  expedienteSub: { acad: 'Escuela e inglés', certs: 'Certificaciones', exp: 'Experiencia — la lista entera' },

  plegado: {
    masFotos: 'Más fotos',
    masDijeron: 'Más de lo que dijeron',
    otrosDos: 'Los otros dos',
    reto: 'El calendario del reto y mi cartera',
    abrir: 'Abrir la foto a su tamaño',
    pendiente: 'Lo que falta',
    cinta: 'La cinta en vivo: tres precios del sitio',
    verifica: 'Lo que las cartas verifican, renglón por renglón',
    mas: 'Más'
  },

  cierre: {
    grupo: 'Probado: fundador y presidente — mi LinkedIn, y la carta de Lloyd George.',
    conversaciones: 'Probado: cada conversación de arriba abre con su propio enlace; las que no lo tienen lo dicen.',
    cartas: 'Probado: dos cartas firmadas, citadas sin tocar, con el contacto que dio cada quien.',
    grupoHace: 'Probado: un taller con sus grabaciones, sus fotos y las palabras de los asistentes; el calendario del reto desde su fuente.',
    voluntariados: 'Probado: mis publicaciones, mis fotos, el clip — y la limpieza de playa firmada por Lloyd George.',
    construi: 'Probado: un sitio cargado en vivo dentro de esta página; cuatro cifras contadas por el build; una tienda que se puede abrir.',
    premios: 'Probado por una sola fuente — una carta. El diploma está por llegar.',
    expediente: 'Probado: siete certificaciones, seis con ID de credencial; un examen de inglés por presentar.'
  },

  head: {
    eyebrow: 'Currículum',
    name: 'Jaime Sandoval Ricaño',
    nameL1: 'Jaime Sandoval',
    nameL2: 'Ricaño',
    site: 'smartfinance.lat',
    senuelo: 'Baja para leer',
    // texto de Jaime, pendiente de su revisión final. SOLO EL AÑO.
    meta: 'Programas de negocios en Canadá · entrada 2027',
    fotoAlt: 'Yo hablando al micrófono en un panel, con los logos de Mitsubishi Heavy Industries y Forest City International School en la pantalla de atrás.',
    retratoPie: 'Singapur · en un panel, 2026',
    // Ver el bloque inglés: la de la portada NO es de Jaime (Jochem Raat,
    // Licencia Unsplash, acreditada aunque la licencia no lo exija) y la de la
    // Torre CN sí, con la fecha de publicación en su TikTok (20 de julio de
    // 2026), que es la comprobable.
    portadaAlt: 'El horizonte de Toronto visto desde el agua al anochecer: la Torre CN encendida sobre las torres del centro, y el lago delante de ellas.',
    portadaPie: 'Toronto · foto de Jochem Raat, Unsplash',
    portadaAltRotulo: 'La portada',
    torreAlt: 'La Torre CN de Toronto vista desde abajo, en blanco y negro: el mástil contra un cielo nublado, el mirador, y dos edificios de oficinas en los bordes.',
    // Sus palabras, pulidas solo en ortografía y puntuación (ver el bloque
    // inglés). Aquí va el original, así que `torrePieTag` está vacío.
    torrePieVoz: '«La tomé cuando fui a visitar los campus de Toronto. Me inspira todos los días a seguir creciendo: mi meta está ahí.»',
    torrePieTag: '',
    torrePie: 'Toronto · foto mía (2026)',
    // Ver la nota de la tabla inglesa: solo se pinta al imprimir.
    impresionNota: 'Resumen impreso: experiencia, expediente, certificaciones, premios, cartas y la frase final. El CV completo —las fotografías, los clips, las conversaciones y el sitio— está en la página desde la que se imprimió.'
  },

  proyectos: {
    grupoH: 'El grupo estudiantil',
    grupo: 'El grupo estudiantil que fundé y presido: visitas a la Bolsa Mexicana de Valores, pláticas y talleres de finanzas, y voluntariados por la comunidad y el medio ambiente.',
    grupoCifra: 'Somos casi 200 en la comunidad.',
    grupoLink: 'La comunidad, en el sitio',
    grupoTaller: 'Lo que organiza el grupo —el taller, con sus grabaciones, y el Reto Actinver— está en «{s}».',
    grupoAlt: 'El grupo estudiantil de Smart Finance, delante del cartel del grupo',
    sitioH: 'smartfinance.lat',
    jasaH: 'Jasa Motor',
    jasa: 'La refaccionaria de mi familia, en Cuautitlán, Estado de México, con más de veinte años de historia. Yo desarrollé su tienda en línea y llevo su marketing.',
    jasaAlt: 'Portada de la tienda en línea de Jasa Motor: el logotipo con un pistón en la A, el buscador por marca, modelo, año y motor, el título «Refacciones para Motor» y la rejilla de los más vendidos con precios reales.',
    jasaPie: 'La tienda que desarrollé — tienda.jasamotor.com.mx',
    ml: 'La refaccionaria también vende en Mercado Libre. Mercado Libre publica su página de vendedor como REFACCIONES JASA MOTOR, con «+3,100 seguidores».',
    mlFuente: 'La propia página de vendedor de Mercado Libre, consultada el 2 de septiembre de 2026. El nombre de la tienda y los seguidores son suyos, no míos.',
    mlLink: 'La tienda en Mercado Libre',
    jasaLink: 'tienda.jasamotor.com.mx'
  },

  prueba: {
    lede: 'Empecé smartfinance.lat para que las finanzas sean más fáciles de entender para cualquier estudiante. Esta es su portada.',
    leccionesH: 'Las lecciones',
    leccionesQue: 'Lo que enseñaría primero: {n} lecciones, cada una escrita en inglés y en español, y cada una citando sus fuentes.',
    leccionesLink: 'Leer las lecciones',
    boletin: 'Más de 100 personas están inscritas al boletín.',
    boletinH: 'El boletín',
    stats: {
      lecciones: 'lecciones — las fuentes de arriba son suyas.',
      pruebas: 'pruebas automáticas, en cada cambio',
      fuentes: 'fuentes primarias citadas en las lecciones',
      glosario: 'términos de glosario, bilingües',
      promesa: 'Una promesa que se puede comprobar: ningún texto escrito por IA se publica sin que una persona lo apruebe — pedirle al endpoint público los borradores sin revisar contesta 403, a propósito.'
    },
    abrir: 'Abrir el sitio'
  },

  // Ver la nota larga de la tabla inglesa: uno solo, real, con su fuente en
  // pantalla, y pegado a las tres cifras que el build cuenta.
  leccionMedida: {
    tag: 'Lo que salió mal',
    h: 'Publiqué una cifra que no había medido',
    que: 'Limpiando del build las fotos que no se usaban, escribí que se ahorraban 1.2 MB. Después medí los archivos: 320 692 bytes, cuatro veces menos. Era una estimación publicada como si fuera una medición.',
    regla: 'Desde entonces el proyecto tiene una regla: una cifra que se publica se mide, y dice contra qué línea base se midió. Las tres cifras de arriba las cuenta el build de los archivos del propio repositorio.',
    fuente: 'Anotado el mismo día en docs/context/lessons.md de este repositorio.'
  },

  tape: {
    lede: 'Tres de los activos que sigue el sitio, pedidos al abrir esta página.',
    note: 'Se piden al abrir esta página, no continuamente.',
    fail: 'Si el endpoint no contesta, los precios se quedan en rayas y el chip lo dice. Ninguna cifra de esta página está escrita a mano.',
    price: 'Precio',
    change: 'Cambio de hoy',
    pending: '—',
    open: 'Abrir la ficha del activo'
  },

  dos: {
    actinverH: 'Reto Actinver',
    // «Research de private equity» y no «Private equity research»: la pasada
    // de idioma del brief — el panel español no lleva rótulos en inglés
    // («research» y «private equity» son términos que el sitio ya usa así).
    peH: 'Research de private equity'
  },

  research: {
    lede: 'Reportes tipo analista, con cada cifra rastreada hasta el documento del que sale.',
    link: 'Abrir el reporte',
    ticker: 'Ticker',
    dataAsOf: 'Datos al',
    version: 'Versión',
    status: 'Estado',
    years: 'Años fiscales verificados',
    statusLabel: { draft: 'Borrador', review: 'En revisión', published: 'Publicado', none: 'Sin empezar' } as Record<string, string>
  },

  reto: {
    lede: 'Un concurso de bolsa para estudiantes que se juega con dinero ficticio, sobre la bolsa mexicana. Las fechas de abajo son el calendario publicado de la edición.',
    calH: 'El calendario',
    linkPhase: 'Cómo va el reto hoy',
    linkMine: 'Mi cartera del concurso',
    cal: {
      inscripciones: 'Inscripciones',
      practica: 'Semana de práctica',
      reto: 'El reto',
      premiacion: 'Premiación'
    },
    empty: 'Todavía no hay posiciones del concurso publicadas: la edición no ha empezado. Este bloque se llena solo desde el mismo archivo que lee la página pública.',
    snapshot: 'Cifras al cierre del {date}, de la foto que se escribe en el repositorio después de cada día hábil.',
    source: 'Calendario tomado de retoactinver.com el {d}. Smart Finance no está afiliado a Actinver.'
  },

  tiktok: {
    perfil: '@smart.financee, en TikTok',
    nota: 'Los clips y las lecciones del sitio son el mismo trabajo en dos formatos: las mismas fuentes, otra duración.',
    ensenaH: 'Por qué grabo',
    // La oración de en medio vuelve, igual que en el panel inglés: el porqué
    // entero está sobre la cadena inglesa.
    ensenaLede: 'Seis piezas que grabé yo, en el orden en que las enseñaría. Cuatro son vídeos servidos desde este dominio — con sonido, y solo arrancan si le das a reproducir. Las dos últimas son carruseles de fotos de TikTok, así que enlazan allá.',
    videos: {
      jpmvisit: '«📍🇸🇬 Visiting J.P. Morgan in Singapore and learning more about the fin…» (en español: visitando J.P. Morgan en Singapur y aprendiendo más sobre las fin…) — la visita, contada a cámara',
      nus: '«Tuve la oportunidad de presentar sobre México a estudiantes de la National University of Singapore»',
      singapur: '«Ahora entendí por qué aquí vive el dinero del mundo» — Singapur',
      japon: '«Datos financieros de Japón»',
      tokio: '«Lo creerías?» — datos financieros de Japón, desde la Torre de Tokio',
      canada: '«Canada is not just beautiful it’s one of the smartest places in the w…» (en español: Canadá no solo es bonito, es uno de los lugares más inteligentes del m…) — cinco datos financieros de Canadá'
    },
    canadaNota: 'Su foto es la de la Torre CN que abre este CV — aquí no se repite.',
    verTodo: 'Ver todo mi contenido',
    arcoImgAlt: 'Yo, con micrófono de solapa, hablando junto a una laptop con la lámina «Finance facts of Mexico», en un aula de la NUS',
    arcoImgPie: 'La presentación sobre México en la NUS — una foto mía'
  },

  entrevistas: {
    verVideo: 'Ver la conversación en TikTok',
    // Ver el bloque inglés: sin esta línea, la forma de las citas de Ondo
    // insinúa un aval que no existe.
    aviso: 'Son conversaciones que yo busqué y grabé. Nadie de aquí me está respaldando: lo que va en grande es lo que yo me llevé de cada conversación, con mis palabras.',
    carruselAria: 'Conversaciones, una tarjeta por persona. Lista horizontal; se desplaza de lado.',
    prev: 'Conversación anterior',
    next: 'Conversación siguiente',
    llevo: 'Lo que me llevé',
    personas: {
      andy: { nombre: 'Andy Toh', rol: 'CEO, Bluesky Education', tipo: '' },
      // Rol corregido: ver la nota larga en la tabla inglesa.
      lloyd: { nombre: 'Profesor Lloyd', rol: 'CEO, TAQ Pte Ltd', tipo: 'Le digo «profesor Lloyd» porque me dio clase dos semanas en el programa de Green Technology en Singapur. Su carta —en «Cartas de recomendación»— la firma como CEO de TAQ Pte Ltd.', alt: 'Yo, con la playera verde de México, entrevistando al profesor Lloyd junto a las letras grandes de la NUS' },
      nus: {
        nombre: 'Una estudiante de la NUS',
        rol: 'National University of Singapore',
        tipo: 'Su nombre no está publicado, y esta página no lo inventa. La entrevista: «Los skills que ocupas para estar en una universidad top 8 mundial».'
      },
      jesus: {
        nombre: 'Un creador de contenido de EE. UU.',
        rol: '',
        tipo: 'Un creador de contenido cristiano al que entrevisté en Singapur, como lo describe mi propia publicación sobre el programa.',
        alt: 'Yo entrevistando al creador de contenido de EE. UU. al atardecer, con el horizonte de Marina Bay detrás'
      },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'Una sesión a la que asistí, no una entrevista mía — «Lo que dejó el Chief ETF Strategist de J.P. Morgan», como lo publica el sitio.'
      },
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: 'Una conferencia en el Tec, Estado de México, organizada por HSBC. En mi propia publicación: «Aunque tenía la agenda apretada, pude hablar brevemente con él y pedirle consejo para mi propio podcast de finanzas.» Todavía no hay entrevista.', tipoTag: 'Mi publicación está en inglés. Lo entrecomillado es traducción.' },
      marg: { nombre: 'Marg Franklin', rol: '', tipo: 'En la firma del acuerdo global CFA Institute × Tec de Monterrey, en el Campus Estado de México. En mi propia publicación: escuché «su historia como mujer al frente de una de las organizaciones más importantes del mundo financiero», y al final le pedí consejo sobre estudiar en Canadá, porque ella es canadiense. Una pregunta y su respuesta — no una entrevista.', tipoTag: 'Mi publicación está en inglés. Lo entrecomillado es traducción.' },
      mauricio: {
        nombre: 'Mauricio Mercenario Nieto',
        rol: 'FX Sales & Trading',
        tipo: 'Un podcast en cuatro partes — y, con mis propias palabras en LinkedIn, «su mentoría ha jugado un papel importante en mi desarrollo».',
        alt: 'Mauricio Mercenario y yo sentados en sillones alrededor de una mesa baja, grabando el podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Estudiante de finanzas',
        tipo: 'El podcast que organicé en el Financial Trading Room del Tec.'
      },
      rendon: {
        nombre: 'Miguel Ángel Rendón',
        rol: 'Director regional del Departamento de Contabilidad y Finanzas, Tec de Monterrey',
        tipo: 'Como se presenta él en la grabación: director regional para la región Ciudad de México, Santa Fe, Toluca y Estado de México. Un episodio de mi podcast que organicé y conduje yo; él abre dando las gracias por la invitación.',
        alt: ''
      },
      majo: {
        nombre: 'María José Cortés',
        rol: '',
        tipo: 'Una conversación que organicé y grabé — dos preguntas. Su cargo no se dice en la grabación, así que esta página no lo adivina.',
        alt: 'María José Cortés, de pelo largo oscuro y saco crema, sentada junto a un escritorio con una laptop abierta en un salón del Tec'
      },
      duran: {
        nombre: 'Manuel Durán',
        rol: '',
        tipo: 'Un episodio de mi podcast que organicé. Ya se grabó; el video todavía no está publicado.'
      },
      raul: { nombre: 'Raúl Irabién', rol: 'Presidente de Grupos Estudiantiles', tipo: '' },
      sol: {
        nombre: 'Sol',
        rol: 'Fundadora de Callejeritos',
        tipo: 'Entrevistada en la marcha por la adopción responsable; el clip de ese día está en «Servir».'
      }
    }
  },


  vivo: {
    abrir: 'Abrir {s} en otra pestaña',
    interactuar: 'Usar el sitio aquí',
    pie: 'Esto es {s} de verdad, cargado en vivo dentro de la página — no una captura. Solo se carga si bajas hasta aquí.'
  },

  acadDocs: {
    h: 'Documentos académicos',
    lede: 'Esto no son certificaciones: es lo que mi escuela y el examinador emiten sobre mí, y lo que un comité pide de oficio. Ninguno de los dos está todavía.',
    promedioQue: 'Constancia de promedio acumulado',
    duolingoQue: 'Duolingo English Test'
  },

  servir: {
    animalesClip: 'El clip: la marcha con Callejeritos por la adopción responsable — también entrevisté a Sol, su fundadora (2026).',
    donacion: 'También doné alimento a un stand de adopción local y pasé el día con los voluntarios y los animalitos (2026).',
    playa: 'La limpieza de playa fue en Singapur, un día de voluntariado de mi curso de Green Technology and Sustainable Ecology (2026).',
    playaPrograma: 'Ese día es parte del programa cuyo certificado está en «Certificaciones»: el 2026 Green Technology Programme, de Bluesky Education, en Singapur. La limpieza es la parte de servicio de ese mismo programa.',
    bloques: {
      animales: 'Los animalitos',
      playas: 'Limpieza de playa'
    },
    // «Lo que viene» se fue: ver la nota larga en el bloque inglés.
  },

  exp: {
    // Ver la nota del bloque inglés: cinco de los doce renglones no llevan
    // fecha, así que «solo el año» prometía una columna que no está.
    lede: 'Qué, dónde, y el año donde el año dice algo. Este capítulo y el siguiente son los que un comité escanea.',
    // Ver la nota de la tabla inglesa: el plegable nace abierto.
    ver: 'Mi experiencia',
    pista: '{n} renglones',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      // El jiujitsu se fue: ver la nota larga en la tabla inglesa.
      { cuando: '', que: 'Sesión con Jon Maier, Chief ETF Strategist de J.P. Morgan Asset Management, en el Tec Santa Fe' },
      // ⚠️ Año en disputa: ver la nota larga en la tabla inglesa.
      { cuando: '', que: 'Fundador y presidente de la comunidad estudiantil de Smart Finance — visitas a la bolsa, pláticas, talleres, voluntariados, y la Feria de Grupos Estudiantiles del Tec' },
      { cuando: '', que: 'Asamblea General de la AEM — una de mis primeras conferencias de negocios y eventos de networking' },
      { cuando: '', que: 'Jasa Motor — tienda en línea y marketing de la refaccionaria de mi familia (en «Mis proyectos»)' },
      { cuando: '', que: 'smartfinance.lat — sitio bilingüe de educación financiera: lecciones, datos de mercado, glosario, boletín semanal' },
      { cuando: '2026', que: 'Visita a la University of Toronto y Rotman Commerce — el campus al que apunta esta solicitud' },
      { cuando: '2026', que: 'Singapur: programa de verano (Green Technology and Sustainable Ecology), presentación sobre México en la NUS, limpieza de playa, entrevistas' },
      { cuando: '2026', que: 'Visita a Concordia University, Montréal' },
      { cuando: '2026', que: 'Firma del acuerdo global CFA Institute × Tec de Monterrey — le pedí consejo a Marg Franklin sobre estudiar en Canadá' },
      { cuando: '2026', que: 'TikTok @smart.financee — videos cortos de educación financiera, y las conversaciones de «Cada quien trae algo»' },
      { cuando: '2026', que: 'Reto Actinver — el calendario y la cartera del concurso están en «Reto Actinver y private equity»' }
    ]
  },

  // Ver la nota larga de la tabla inglesa, incluidos LOS DOS AVISOS para
  // Jaime (el referee de Jasa Motor no puede ser su papá; las cifras de
  // vanidad no sirven como resultado).
  expApp: {
    h: 'La misma experiencia, en el formato que piden las solicitudes',
    lede: 'Rol, organización, periodo, qué hice, resultado con número y quién lo confirma. Cinco: el máximo que aceptan Schulich y UBC, y más que los tres que Schulich exige.',
    campos: {
      rol: 'Rol', org: 'Organización', cuando: 'Periodo',
      accion: 'Qué hice', resultado: 'Resultado', quien: 'Quién lo confirma'
    },
    falta: 'Todavía falta',
    y: 'y',
    filas: [
      {
        id: 'grupo',
        hueco: 'expGrupo' as const,
        rol: 'Fundador y presidente',
        org: 'Comunidad estudiantil Smart Finance, Prepa Tec CEM',
        cuando: 'En curso',
        accion: 'La fundé y la dirijo: visitas a la Bolsa Mexicana de Valores, pláticas y talleres de finanzas, voluntariados por la comunidad y el medio ambiente, y la Feria de Grupos Estudiantiles del Tec.',
        resultado: '',
        quien: '',
        pide: '¿Cuántos miembros tiene hoy el grupo? ¿Cuánta gente fue a la última plática y al último taller? ¿Cuántos eventos organizaste en el ciclo? Y el referee: un funcionario de tu escuela (coordinador, director, tu mentor) con nombre, cargo, correo y qué relación tiene contigo — UBC pide que uno de los dos sea de la escuela.'
      },
      {
        id: 'sitio',
        hueco: 'expSitio' as const,
        rol: 'Autor y desarrollador',
        org: 'smartfinance.lat — proyecto propio',
        cuando: 'En curso',
        accion: 'Escribo las lecciones bilingües, construyo el sitio y mando el boletín semanal. Las cifras que publica las cuenta él mismo de sus archivos en cada build.',
        resultado: '',
        quien: '',
        pide: '¿Cuántas personas lo visitan al mes y de dónde sacas ese dato? Los inscritos al boletín ya están en la página como cifra tuya («más de 100»): si tienes el número exacto y la fecha, mejor. NO uses impresiones ni contactos de LinkedIn: eso no es un resultado. Y el referee: alguien que haya usado el sitio o que pueda hablar de él — un profesor, un mentor, alguien de la comunidad.'
      },
      {
        id: 'jasa',
        hueco: 'expJasa' as const,
        rol: 'Tienda en línea y marketing',
        org: 'Jasa Motor — refaccionaria de mi familia, Cuautitlán, Estado de México',
        cuando: 'En curso',
        accion: 'Construí su tienda en línea (tienda.jasamotor.com.mx) y llevo su marketing, para un negocio con más de veinte años de historia.',
        resultado: '',
        quien: '',
        pide: '¿Qué cambió desde que hiciste la tienda? Pedidos al mes, ventas en línea, clientes nuevos, o el número que sí tengas — y desde qué fecha. Y OJO CON EL REFEREE: UBC prohíbe que sea familiar, así que TU PAPÁ NO PUEDE SER. Piensa en un proveedor, el contador, un cliente de mayoreo o alguien que haya trabajado en la refaccionaria.'
      },
      {
        id: 'tiktok',
        hueco: 'expTiktok' as const,
        rol: 'Creador y conductor',
        org: '@smart.financee — educación financiera, y las conversaciones del capítulo «Cada quien trae algo»',
        cuando: '2026 – hoy',
        accion: 'Grabo videos cortos de educación financiera, y consigo y conduzco yo mismo las entrevistas: directivos, emprendedores y profesores universitarios.',
        resultado: '',
        quien: 'Lloyd George, CEO de TAQ Pte Ltd, escribe en su carta que conduzco un podcast de educación financiera en el que entrevisto a directivos de finanzas, emprendedores y profesores universitarios.',
        pide: '¿Qué número cuenta aquí? Personas alcanzadas no: eso es vanidad. Sirve, por ejemplo, cuántas entrevistas has hecho, cuántas se publicaron, o cuánta gente te ha escrito a raíz de un video (y cómo lo sabes).'
      },
      {
        id: 'singapur',
        hueco: null,
        rol: 'Participante, y ponente en la NUS',
        org: 'Green Technology Programme, Bluesky Education — Singapur',
        cuando: '2026',
        accion: 'Tres semanas de programa, dos de ellas en el curso de Lloyd George; presenté sobre México a estudiantes de la National University of Singapore, participé en la limpieza de playa y conseguí y conduje yo mismo las entrevistas.',
        resultado: 'Un premio en el GreenTech Summit 2026 con mis compañeros de equipo, compitiendo contra estudiantes de Taiwán y Rusia (capítulo «Premios»).',
        quien: 'Lloyd George, CEO de TAQ Pte Ltd, y Andy Toh, de Bluesky Education. Las dos cartas están en «Cartas de recomendación», cada una con el contacto que dio quien la firma.',
        pide: 'Esta fila está completa: es la única con resultado y con quien lo confirma. Sirve de patrón para las otras cuatro. Lo único que le falta es el documento del premio — pídeselo a Lloyd George o a Bluesky Education.'
      }
    ]
  },

  // Ver la nota larga de la tabla inglesa. Las dos citas de requisitos van
  // EN INGLÉS también aquí (con `lang="en"` en el marcado): son verbatim de
  // páginas oficiales, y traducir una cita la deja de ser cita.
  acad: {
    lede: 'Lo primero que pregunta cualquier solicitud, y hasta hoy esta página no lo contestaba. Lo que se puede comprobar está aquí; lo que falta está marcado como que falta.',
    escuelaH: 'Dónde estudio',
    escuela: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business.',
    escuelaCuando: '2024–2027',
    inglesH: 'Inglés',
    ingles: 'B2 First Certificate, Cambridge English. Grade C, puntaje global 163: Reading 168 · Use of English 147 · Writing 157 · Listening 168 · Speaking 175. Examen del 19 de noviembre de 2024.',
    inglesTag: 'De mi propio certificado',
    inglesFalta: 'Todavía no alcanza. La University of Toronto no acepta el B2 First con ningún puntaje; UBC sí, pero desde 180, y yo tengo 163. O sea que me falta presentar otro examen.',
    fuentesH: 'Consultadas el 1 de septiembre de 2026',
    fuentesVer: 'Lo que publican las dos universidades',
    inglesFuentes: [
      {
        que: [
          'University of Toronto — ',
          { en: '«Results from the B2 First exam are not accepted (regardless of the result achieved).»' },
          ' C1 Advanced o C2 Proficiency: 180 global y mínimo 170 por componente. TOEFL iBT, para exámenes presentados desde el 21 de enero de 2026 —que es cualquiera que yo presente ahora—: 4.5 global con 4.5 en Writing y 4.0 en Speaking; el 89 con 22 en Speaking y Writing solo vale para exámenes anteriores a esa fecha. IELTS Academic 6.5 sin banda bajo 6.0; Duolingo 120 global con 120 en Production; PTE Academic 65 sin apartado bajo 60.'
        ],
        url: 'https://future.utoronto.ca/apply/english-language-requirements/'
      },
      {
        que: ['UBC Vancouver — Cambridge English Qualifications (B2 First, C1 Advanced, C2 Proficiency): 180 para admisión de licenciatura.'],
        url: 'https://vancouver.calendar.ubc.ca/admissions/english-language-admission-standard/english-language-proficiency-tests'
      }
    ],
    notaH: 'Por qué los recuadros de abajo están vacíos en vez de no estar',
    nota: [
      'Rotman Commerce publica que ',
      { en: '«our students are generally in the top 5% of their class»' },
      ', pide a quien aplica desde Ontario un promedio general mínimo que llama ',
      { en: 'mid-high 80s' },
      ' —de mediados a altos ochentas— y mira con lupa dos requisitos: inglés y cálculo. Ivey pide un promedio ',
      { en: 'low 90%' },
      ' —noventas bajos— en mis mejores materias de último año, incluida la de inglés, más un curso de matemáticas para estudiantes que van a la universidad: una materia de último año de prepa, no una universitaria. Schulich exige ENG4U, MHF4U y cálculo (MCV4U) o manejo de datos entre mis seis mejores materias de último año, con un mínimo de 70 % en ENG4U y MHF4U, y dice que un promedio competitivo va de los ochentas altos a los noventas bajos, con el corte de años anteriores entre 91 % y 92 %. Son números que solo puedo dar yo, así que están marcados como que faltan en vez de no aparecer.'
    ],
    // Los rótulos van en español y el título de la página original entre
    // comillas: el panel ES tenía tres enlaces rotulados en inglés («What we
    // look for»…), que es el único texto del panel que no estaba traducido.
    notaFuentes: [
      { que: 'rotmancommerce.utoronto.ca — qué buscan en quien aplica («What we look for»)', url: 'https://rotmancommerce.utoronto.ca/future-students/what-we-look-for/' },
      { que: 'ivey.uwo.ca — admisión anticipada (AEO) para estudiantes de preparatoria («AEO, secondary school students»)', url: 'https://www.ivey.uwo.ca/hba/admissions/secondary-school-students/' },
      { que: 'schulich.yorku.ca — requisitos de admisión al BBA («BBA admission requirements»)', url: 'https://schulich.yorku.ca/admissions/admissions-requirements/bba/' }
    ]
  },

  certs: {
    lede: 'Los recibos, tal como los publica mi LinkedIn. Seis de los siete llevan ID de credencial; el séptimo trae impresas en el propio certificado la sede y las fechas.',
    verLinkedIn: 'Verlo en LinkedIn',
    verEscaneo: 'Abrir el escaneo',
    credencial: 'ID de la credencial',
    sinCred: 'Impreso en el certificado en vez de un ID',
    fotoPend: 'El diploma mismo, cuando yo lo escanee: es el único de los siete sin imagen en mi LinkedIn.',
    insigniaNivel: 'Nivel A2 del marco europeo',
    insigniaTag: 'Diseñada por esta página — no es el diploma',
    // Los NOMBRES no se traducen: son el nombre propio del certificado, y es
    // lo que un comité va a buscar. Lo que sí va en español es todo lo demás.
    filas: [
      {
        que: 'Vista Equity Partners - Demystifying Private Equity Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a83e06078fe04cae6937a9e',
        dondeCuando: '',
        img: 'cv-cert-vista.webp', w: 700, h: 495,
        alt: 'Certificado de Forage a nombre de Jaime Sandoval Ricaño por la simulación de trabajo de private equity de Vista Equity Partners, con los logotipos de Vista y de Forage.'
      },
      {
        que: 'Bank of America - Investment Banking Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a80869baa694bdf898c2581',
        dondeCuando: '',
        img: 'cv-cert-bofa.webp', w: 700, h: 495,
        alt: 'Certificado de Forage a nombre de Jaime Sandoval Ricaño por la simulación de trabajo de banca de inversión de Bank of America, con los logotipos de Bank of America y de Forage.'
      },
      {
        que: 'Investment Foundations® Certificate',
        de: 'CFA Institute', anio: '2026', cred: '191463283',
        dondeCuando: '',
        img: 'cv-cert-cfa.webp', w: 700, h: 541,
        alt: 'Certificado del CFA Institute que otorga el Investment Foundations Certificate a Jaime Sandoval Ricano, con su fecha, su número de certificado y un código QR de verificación.'
      },
      {
        que: 'GREEN TECHNOLOGY PROGRAMME',
        de: 'Bluesky Education', anio: '2026', cred: '',
        // Sin «National University of Singapore»: el certificado no la
        // imprime. El porqué entero está sobre la cadena inglesa.
        dondeCuando: 'Shaw Foundation Alumni House · 22 de junio – 11 de julio de 2026',
        img: 'cv-cert-green-tech.webp', w: 501, h: 700,
        alt: 'Certificado de Bluesky Education por el 2026 Green Technology Programme, celebrado en la Shaw Foundation Alumni House de Singapur, a nombre de Jaime Sandoval Ricaño.'
      },
      {
        que: 'Bloomberg Finance Fundamentals',
        de: 'Bloomberg', anio: '2026', cred: 'Xsgrm4LYnvGBWeskx8HpEut9',
        dondeCuando: '',
        img: 'cv-cert-bloomberg.webp', w: 700, h: 497,
        alt: 'Certificado de Bloomberg for Education por el curso Bloomberg Finance Fundamentals, sobre fondo negro con gráficas de velas.'
      },
      {
        que: 'DELF A2',
        de: 'Alliance Française de Paris', anio: '2026', cred: '052535012100',
        dondeCuando: '',
        img: '', w: 0, h: 0, alt: ''
      },
      {
        que: 'B2 First Certificate',
        de: 'Cambridge English', anio: '2024', cred: '814072MSJ',
        dondeCuando: '',
        img: 'cv-cert-b2-cambridge.webp', w: 700, h: 662,
        alt: 'Certificado de Cambridge English que acredita que Jaime Sandoval Ricaño obtuvo Grade C en el First Certificate in English, nivel B2 del Consejo de Europa, con una puntuación global de 163.'
      }
    ]
  },

  // Ver la nota larga de la tabla inglesa: sección propia porque Ivey evalúa
  // los premios aparte, y el descargo se dice una vez y en mono.
  premios: {
    lede: 'Un premio no es un curso, así que va aparte. Los cursos que terminé están en «Certificaciones»; esto es lo que alguien me dio por competir.',
    entregadosH: 'Lo que tengo',
    faltanH: 'Espacio para más',
    campos: 'Premio · evento · año · por qué',
    slot: 'Espacio reservado para el siguiente premio.',
    tag: 'Premio por llegar',
    fuenteTag: 'Única fuente: la carta de Lloyd George, en «{s}»',
    // Aquí sí se pinta: la cita es inglés dentro de un párrafo en español,
    // igual que en `cartas.verificaCitaTag`.
    citaTag: 'Lo entrecomillado es la frase exacta de la carta, en inglés.',
    entregados: [
      {
        que: 'Un premio en el GreenTech Summit 2026, con mis compañeros de equipo, compitiendo contra estudiantes de Taiwán y Rusia.',
        // La MISMA cadena inglesa que el panel inglés: es la frase de la
        // carta y no se traduce, como las tres de `cartas.verifica`.
        cita: 'an award at the GreenTech Summit 2026, in competition against students from Taiwan and Russia',
        // Sin el año dentro del nombre: la ficha ya lo pinta al lado y
        // salía «GreenTech Summit 2026 · 2026».
        de: 'GreenTech Summit',
        anio: '2026',
        nota: 'Nunca lo publiqué — ni en mi LinkedIn ni en mi TikTok. Está aquí porque alguien más lo escribió y lo firmó.'
      }
    ],
    docPend: 'El certificado o diploma, cuando me lo manden Bluesky Education o Lloyd George.'
  },

  cartas: {
    lede: 'Ya llegaron dos. La ficha, las dos frases que más pesan de cada una y el contacto que cada quien dio. Las cito sin tocar: a una carta firmada, un renglón recortado la convierte en otro documento.',
    entregadasH: 'Entregadas',
    faltanH: 'Espacio para más',
    // Las dos cartas están escritas en inglés: en este panel las citas van
    // TRADUCIDAS, y la marca lo dice, como con las frases de `voz.*`.
    citaTag: 'Las dos frases que más pesan, traducidas del inglés',
    contactoTag: 'Contacto que dio para preguntar por mí',
    pdfTag: 'La carta, tal cual',
    // La segunda oración («se la mando a quien me la pida») se retiró el
    // 2026-09-01: el porqué entero está sobre la cadena inglesa. Y el sujeto
    // vuelve a ser «el archivo», como en `main`.
    pdfNo: 'No está en esta página mientras decido dónde guardarla: el archivo trae los datos de contacto de {n} y todo lo que esta página sirve es público. Lo de arriba es lo que dice la carta.',
    entregadas: [
      {
        nombre: 'Lloyd George',
        cargo: 'CEO, TAQ Pte Ltd',
        donde: 'Singapur — biotecnología, gestión sanitaria y tecnologías verdes',
        relacion: 'Me dio clase dos semanas en el programa de Green Technology en Singapur, a través de la consultoría educativa Bluesky Education. Es el «Prof. Lloyd» que entrevisté en mi TikTok.',
        anio: '2026',
        citas: [
          'Dos semanas son poco tiempo, pero bastan para distinguir al estudiante que trabaja del estudiante que solo asiste. Jaime destacó desde el primer día.',
          'Lo que ya ha logrado sin apoyo institucional indica con claridad lo que logrará con él.'
        ],
        correo: 'Enquiries.TAQ@outlook.com',
        // EL PDF, ENTERO. Es el que trae el teléfono personal; ver la nota
        // del `lede`. No se recorta.
        // YA TIENE FOTO: la 1 del lote del 2026-08-30 —él con Lloyd George y
        // las banderas—. `foto` (la clave del hueco) queda en null y `lote`
        // dice qué imagen es.
        foto: null,
        lote: 'lloyd' as const
      },
      {
        nombre: 'Andy Toh',
        cargo: 'CEO, Bluesky Education',
        donde: 'Singapur — la consultoría educativa que organiza el programa',
        relacion: 'Me observó durante mi programa de tres semanas en Singapur. Es el mismo Andy Toh que entrevisté y que ya aparece en este sitio.',
        anio: '2026',
        citas: [
          'Mientras muchos estudiantes pasaban los descansos conviviendo entre ellos, Jaime se acercaba y conversaba con los educadores, los responsables del programa y los profesionales de la industria que participaban en él.',
          'Su disposición a buscar oportunidades para aprender y mejorar continuamente refleja un grado de madurez y automotivación que, en mi opinión, le servirá extremadamente bien en la universidad.'
        ],
        correo: 'Andy.toh@bluesky-education.com',
        // SU FOTO YA ESTABA EN EL REPO Y EL HUECO SOBRABA. El MAPA.md del
        // lote lo dice con esas palabras: «la foto con Andy Toh (el CEO) ya
        // está en el repo (breakdown-andy-toh): va debajo de SU carta de
        // recomendación, igual que la de Lloyd debajo de la suya». Es la
        // misma foto de la entrevista que ya sale en el carrusel, y sale dos
        // veces a propósito: son las dos cosas que este CV afirma de esa
        // persona —la conversación y la carta— y la foto es la prueba de la
        // primera. El hueco `cartaAndy` deja de usarse.
        foto: null,
        lote: 'andy' as const
      }
    ],
    tag: 'Carta por llegar',
    campos: 'Nombre · cargo · relación · contacto',
    // Ver la nota de la tabla inglesa: UN hueco, y no dice quién no ha
    // escrito. «Falta la carta» pasó a «Carta por llegar» por lo mismo.
    slots: [
      'Espacio reservado para la siguiente carta.'
    ],
    verificaH: 'Lo que las cartas verifican',
    verificaLede: 'Hasta que llegaron, lo de abajo era palabra mía. Ahora lo escribe y lo firma alguien de fuera de mi escuela y de mi familia.',
    // Los entrecomillados son la frase EXACTA de la carta, en inglés; el
    // resto va traducido. Ahora van en su propio campo y el componente los
    // envuelve en `lang="en"`: eran tres trozos de inglés sueltos dentro de
    // un párrafo en español, sin marca de idioma y sin rótulo que dijera por
    // qué estaban en inglés — las cuatro citas largas de las cartas sí lo
    // llevan («traducidas del inglés»), así que el capítulo se contradecía.
    verificaCitaTag: 'Lo entrecomillado es la frase exacta de la carta, en inglés.',
    verifica: [
      { que: 'Fundé la organización estudiantil Smart Finance en mi campus.', cita: '', quien: 'Lloyd George' },
      { que: 'Conduzco un podcast de educación financiera en el que entrevisto a ejecutivos de finanzas, emprendedores y profesores universitarios.', cita: '', quien: 'Lloyd George' },
      { que: 'En Singapur organicé y conduje por mi cuenta las entrevistas con líderes de negocio y con estudiantes de Business Administration de la NUS —', cita: 'entirely on his own steam', quien: 'Lloyd George' },
      { que: 'Di mi tiempo a trabajo comunitario y ambiental en Singapur,', cita: 'including a beach cleaning project during his stay', quien: 'Lloyd George' },
      { que: 'Trabajo en español, inglés y francés.', cita: '', quien: 'Lloyd George' },
      { que: 'En el Green Tech Youth Summit desarrollé un proyecto y lo presenté, y', cita: 'performed particularly well in both his project and presentation', quien: 'Andy Toh' }
    ],
    // El premio se mudó a su propio capítulo (`premios`) el 2026-08-31: ver
    // la nota de la tabla inglesa.
    fuenteCarta: 'Fuente de tercero: la carta de {n}, en «{s}».'
  },

  frase: {
    texto: 'Si la vida destruye tus planes, es porque tus planes te pudieron haber destruido a ti. Haz tu mejor esfuerzo y los resultados se darán, y si no, te quedarás con que lo diste todo.',
    traduccion: '“If life destroys your plans, it is because your plans could have destroyed you. Do your best and the results will come — and if they don’t, you will be left knowing you gave it everything.”',
    // Esta clave solo se PINTA en el panel inglés (Historia mira el locale);
    // aquí existe porque `typeof en` exige las mismas llaves en las dos tablas.
    traduccionTag: 'His words, in Spanish. In English:'
  },

  contacto: {
    h: 'Dónde encontrarme',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    site: 'smartfinance.lat'
  },

  disc: {
    h: 'Educativo, no asesoría',
    p: 'Smart Finance es el proyecto de un estudiante. Todo lo de esta página se publica con fines educativos y no es asesoría financiera, de inversión ni fiscal, ni una recomendación de comprar o vender nada. Los datos de mercado llegan con retraso y vienen de terceros; verifícalos en la fuente antes de decidir cualquier cosa.'
  },

  huecos: {
    quienSoy: {
      que: 'Dónde empezó',
      pista: 'De tres a cinco frases: de dónde te viene esa frase, y qué pasó exactamente. Lo más corto de la página, y lo que más se recuerda.'
    },
    retoNota: {
      que: 'Qué quiero sacar del reto',
      pista: 'Por qué entraste y qué contarías como que salió bien — escrito antes del resultado, que es lo que hace que valga algo después.'
    },
    researchNota: {
      que: 'Qué aprendí haciendo el reporte',
      pista: 'La parte que costó más de lo que esperabas, en un párrafo corto.'
    },
    tiktokNota: {
      que: 'Por qué grabo',
      pista: 'Dos frases. Por qué la cámara, y a quién te imaginas viendo.'
    },
    entrevistaAndy: {
      que: 'Una cosa que me llevé de Andy Toh',
      pista: 'Una línea. Sin ella, esto es la foto de un desconocido.'
    },
    entrevistaMaier: {
      que: 'Una cosa que me llevé de esa sesión',
      pista: 'Una línea. Sin ella, esto es la foto de un desconocido.'
    },
    entrevistaDieck: {
      que: 'Una cosa que me llevé de Moris Dieck',
      pista: 'Una línea. Sin ella, esto es la foto de un desconocido.'
    },
    entrevistaPodcast: {
      que: 'Una cosa que me llevé del podcast',
      pista: 'Una línea sobre la conversación del Financial Trading Room.'
    },
    entrevistaLloyd: {
      que: 'Una cosa que me llevé del profesor Lloyd',
      pista: 'Una línea sobre la conversación en la NUS.'
    },
    entrevistaNus: {
      que: 'Una cosa que me llevé de esa entrevista',
      pista: 'Una línea sobre la conversación con la estudiante de la NUS.'
    },
    entrevistaJesus: {
      que: 'Una cosa que me llevé de esa conversación',
      pista: 'Una línea sobre la entrevista en Marina Bay.'
    },
    entrevistaMauricio: {
      que: 'Una cosa que me llevé de Mauricio',
      pista: 'Una línea. El podcast, la AEM o la mentoría — lo que más haya importado.'
    },
    entrevistaSol: {
      que: 'Una cosa que me llevé de Sol',
      pista: 'Una línea sobre la conversación de Callejeritos.'
    },
    entrevistaRaul: {
      que: 'Una cosa que me llevé de Raúl Irabién',
      pista: 'Una línea sobre la conversación de los grupos estudiantiles.'
    },
    entrevistaRendon: {
      que: 'Una cosa que me llevé de Miguel Ángel Rendón',
      pista: 'Una línea. Del episodio: el LinkedIn desde prepa, «el que brilla es la persona», o «por amor a tu yo futuro» — lo que más te haya servido.'
    },
    entrevistaMajo: {
      que: 'Una cosa que me llevé de María José Cortés',
      pista: 'Una línea. De la cinta: «sería mucho más curiosa» o «aprovechen el tiempo» — lo que más te haya servido.'
    },
    entrevistaDuran: {
      que: 'Una cosa que me llevé de Manuel Durán',
      pista: 'Una línea. Del episodio con Manuel Durán: lo que más te haya servido.'
    },
    consejoMarg: {
      que: 'Una cosa que me llevé de su respuesta',
      pista: 'Una línea: qué te contestó sobre estudiar en Canadá y qué hiciste con eso.'
    },
    servirAnimales: {
      que: 'Los animalitos, con mis palabras',
      pista: 'Una o dos frases. Qué hiciste, no qué sentiste.'
    },

    // ── LOS TRES DEL RENGLÓN ACADÉMICO (ola 2) ────────────────────────────
    acadPromedio: {
      que: 'Mi promedio, y mi posición en la clase si la sé',
      pista: '¿Cuál es tu promedio general del bachillerato hasta hoy, y en qué escala está (Tec usa 0-100)? Si tu escuela publica tu posición en la clase o tu percentil, ponlo también; si no lo sabes, se pregunta en servicios escolares. Rotman dice que sus alumnos «están generalmente en el 5 % más alto de su clase», así que este número decide más que cualquier otra cosa de esta página.'
    },
    acadCalculo: {
      que: 'Cálculo: si mi plan lo incluye, y con qué calificación',
      pista: '¿Tu plan Multicultural 2024-2027 incluye cálculo? Si sí: en qué semestre lo llevas o lo llevaste y con qué calificación. Si no lo incluye, ¿qué materia de matemáticas es la más avanzada de tu plan? PREGÚNTALO EN LA ESCUELA ANTES DE OCTUBRE: Rotman exige que el expediente muestre que estás INSCRITO en los cursos requeridos para dar una oferta condicional, y Schulich pide cálculo (MCV4U) con al menos 70 %.'
    },
    acadIngles: {
      que: 'El examen de inglés que me falta: cuál, y cuándo',
      pista: '¿Cuál vas a presentar y qué fecha tienes agendada? Los objetivos, de las páginas oficiales: C1 Advanced 180 con mínimo 170 por componente · TOEFL iBT 89 con 22 en Speaking y Writing · IELTS Academic 6.5 sin banda bajo 6.0 · Duolingo 120 · PTE Academic 65. El propio Road to College del Tec ofrece certificaciones de idiomas: es la vía institucional y es por donde conviene preguntarlo.'
    },

    // ── UN SOLO CONTRATIEMPO, Y ES REAL ──────────────────────────────────
    // Ver la nota larga de la tabla inglesa: los ocho huecos por capítulo se
    // fueron el 2026-09-01 y en su lugar está `leccionMedida`, que es un
    // contratiempo documentado en docs/context/lessons.md. Este hueco es el
    // único que queda, por si Jaime quiere añadir el suyo.
    contraOtro: {
      que: 'Si hay otro contratiempo que quiera contar: cuál fue y qué cambié',
      pista: 'Uno solo, y solo si de verdad lo hay: qué pasó y qué haces distinto desde entonces. Las dos mitades, que es lo que pide la rúbrica de Queen’s — sin la segunda es una disculpa. Si no hay ninguno, este hueco se quita y la página se queda con el contratiempo medido de los proyectos, que ya cumple.'
    },

    // ── LOS CUATRO DEL BLOQUE DE EXPERIENCIA EN FORMATO DE SOLICITUD ──────
    // La pregunta exacta de cada uno vive en `expApp.filas[].pide`.
    expGrupo: { que: 'Resultado y referee — la comunidad estudiantil', pista: 'Ver expApp.filas → grupo.' },
    expSitio: { que: 'Resultado y referee — smartfinance.lat', pista: 'Ver expApp.filas → sitio.' },
    expJasa: { que: 'Resultado y referee — Jasa Motor', pista: 'Ver expApp.filas → jasa. OJO: el referee NO puede ser su papá (UBC prohíbe familiares).' },
    expTiktok: { que: 'Resultado — el canal y las entrevistas', pista: 'Ver expApp.filas → tiktok.' }
  },

  suyo: {
    quienSoy: '',
    retoNota: '',
    researchNota: '',
    tiktokNota: '',
    entrevistaAndy: '',
    entrevistaMaier: '',
    entrevistaDieck: '',
    entrevistaPodcast: '',
    entrevistaLloyd: '',
    entrevistaNus: '',
    entrevistaJesus: '',
    entrevistaMauricio: '',
    entrevistaSol: '',
    entrevistaRaul: '',
    entrevistaRendon: '',
    entrevistaMajo: '',
    entrevistaDuran: '',
    consejoMarg: '',
    servirAnimales: '',
    // Los quince de la ola 2.
    acadPromedio: '',
    acadCalculo: '',
    acadIngles: '',
    expGrupo: '',
    expSitio: '',
    expJasa: '',
    expTiktok: '',
    // ── UN SOLO CONTRATIEMPO, Y ES EL DE VERDAD (2026-09-01) ──────────
    // Aquí vivían OCHO (`contraExp`, `contraAcad`, `contraServir`,
    // `contraProyectos`, `contraGente`, `contraReto`, `contraCerts`,
    // `contraPremios`), uno por capítulo. La razón entera de por qué se
    // fueron está en `huecos`, junto a `contraOtro`.
    contraOtro: ''
  },

  voz: {
    // ─── LA FRASE DE APERTURA ───────────────────────────────────────────
    // ORIGINAL de Jaime (mensaje del 2026-08-27), con su ortografía:
    //   «abri los ojos y vi todas la oportunidades posibles y hago lo que
    //    puedo por aprovecharlas, mi objetivo es que todos tambien los puedan
    //    abrir y ayudarlos»
    // Él dijo «algo así»: aquí van la ortografía y la puntuación pulidas y NI
    // UNA palabra suya cambiada ni añadida. Los «los» de «los puedan abrir»
    // son los ojos, y se quedan como él los escribió.
    // texto de Jaime, pendiente de su revisión final
    apertura: '«Abrí los ojos y vi todas las oportunidades posibles, y hago lo que puedo por aprovecharlas. Mi objetivo es que todos también los puedan abrir, y ayudarlos.»',
    // Vacío en español: aquí la cita es el original, no una traducción.
    aperturaTag: '',
    // Palabras de Jaime en LinkedIn, en inglés en el original. Esta versión es
    // TRADUCCIÓN para el panel español, pendiente de su revisión final — y
    // ahora lo DICE en pantalla (`peTag`), porque unas comillas atribuidas a
    // su post sin más se leen como sus palabras exactas y el post está en
    // inglés. El «[…]» marca el trozo que esta página no reproduce.
    pe: '«Este programa me puso en los zapatos de un analista de verano de private equity evaluando Workday como posible inversión. […]»',
    peFuente: 'De mi publicación en LinkedIn sobre la simulación de Vista Equity Partners (2026). El «[…]» marca un trozo que esta página no reproduce.',
    peTag: 'Mi publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
    // ⚠️ LAS CUATRO CITAS DE ABAJO SE RESTAURARON EL 2026-08-31.
    // La regla es «ortografía y puntuación se pueden pulir; el sentido no», y
    // se habían caído trozos de contenido SIN el «[…]» que esta misma página
    // usa para marcar un recorte (`voz.pe`, `voz.playa`). Cotejado con el
    // original de Jaime que transcribe cv-clips/EVIDENCIA-LINKEDIN-TIKTOK.md:
    //  · dedicación — faltaba «el private equity» al principio, que es de qué
    //    está hablando;
    //  · actinver — faltaban «yo ayudar a» (cambiaba su papel: de ayudar a
    //    promover, a promover) y «y aprender» al final; «aprender» volvió a
    //    ser «aprender de ello»;
    //  · enseñar — faltaban «y consejos» y, sobre todo, «de lo que pueda»,
    //    que convertía una frase modesta en una afirmación absoluta;
    //  · entrevistas — faltaba la oración de apertura entera, la que dice qué
    //    le gusta hacer: «me gusta entrevistar a todo tipo de personas».
    // Lo pulido sigue siendo solo ortografía y puntuación (quein→quien,
    // imoortante→importante, voacion→vocación, los acentos y las comas).
    // «ayudarlos a guiarlos» se queda como lo escribió él: es su construcción,
    // no una errata. Las inglesas son TRADUCCIÓN y van al día con estas.
    // texto de Jaime, pendiente de su revisión final
    dedicacion: '«El private equity: me gusta lo corporativo y la investigación para inversión en empresas. Es a lo que me quiero dedicar.»',
    // texto de Jaime, pendiente de su revisión final
    actinver: '«El Reto Actinver: quiero representar a mi prepa, el Tec CEM; aprender de ello, visitar Actinver, traer gente de Actinver a que nos dé pláticas, y yo ayudar a promover este tipo de retos para invitar a todos a sumarse y aprender.»',
    // texto de Jaime, pendiente de su revisión final
    ensenar: '«Quiero mostrarme como un estudiante que quiere comunicar a todos finanzas y consejos. Soy un niño que quiere compartir los consejos y la motivación de gente importante, y ayudarlos a guiarlos para saber su vocación, dejar una huellita en todos de lo que pueda.»',
    // texto de Jaime, pendiente de su revisión final
    entrevistas: '«Me gusta entrevistar a todo tipo de personas, ya que te puedes llevar algo de cada quien, porque son pequeñas experiencias y puntos de vista diferentes.»',
    // texto de Jaime, pendiente de su revisión final
    servir: '«Ayudar a mi comunidad, a los animalitos, y limpieza de playas.»',
    // ORIGINAL de Jaime (2026-08-28), con su ortografía: «es de mi familia y
    // yo implemente eso porque queria apoyar a mi papa». Pulido sin cambiar
    // el sentido — y SIN cambiar sus palabras: decía «lo implementé» y su
    // palabra es «implementé eso»; la regla es solo ortografía y puntuación,
    // así que «eso» se queda (restaurado 2026-08-29).
    // texto de Jaime, pendiente de su revisión final
    jasa: '«Es de mi familia, y yo implementé eso porque quería apoyar a mi papá.»',
    jasaTag: '',
    // Su publicación sobre la U of T está en inglés: esta versión es
    // TRADUCCIÓN para el panel español y lo dice en pantalla (`torontoTag`).
    // texto de Jaime (traducción), pendiente de su revisión final
    toronto: '«Esta visita reforzó algo que llevaba mucho tiempo pensando: aquí es donde quiero estudiar finanzas.»',
    torontoTag: 'Mi publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
    torontoFuente: 'De mi publicación en LinkedIn sobre mi visita a la University of Toronto y Rotman Commerce (2026).',
    // ── PRIMERA PERSONA TAMBIÉN EN LAS MARCAS (2026-08-30) ─────────────
    // Las marcas del panel español van en primera persona («Mi cifra, del
    // 29 de agosto…»), pero estas de aquí —peTag, peFuente, torontoTag,
    // torontoFuente— se habían quedado en tercera («Su publicación…»),
    // que es de antes de que el CV pasara a hablar en su voz. Corregidas
    // las cuatro al escribir las dos de la playa: una marca nueva en
    // tercera persona habría hecho crecer el desliz en vez de arreglarlo.
    // Mi publicación de la playa está en inglés: esta versión es TRADUCCIÓN
    // para el panel español y lo dice en pantalla (`playaTag`).
    // texto de Jaime (traducción), pendiente de su revisión final
    playa: '«Fue una experiencia gratificante que me recordó cuánto significan las acciones pequeñas cuando una comunidad trabaja junta hacia una meta común. Cuidar el medio ambiente no es solo cuestión de políticas o de tecnología; también es que la gente asuma su responsabilidad. […] Ver cómo las iniciativas ambientales y el desarrollo económico van de la mano ha sido una de las lecciones más interesantes de esta experiencia.»',
    playaTag: 'Mi publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
    playaFuente: 'De mi publicación en LinkedIn sobre la limpieza de playa voluntaria en Singapur (2026). El «[…]» marca una frase que esta página no reproduce.'
  }
};

export type CvCopy = typeof en;
/** Clave de un hueco: sirve para que <Hueco id="..."> no admita inventos. */
export type CvHueco = keyof CvCopy['huecos'] & keyof CvCopy['suyo'];

export const cv: Record<Locale, CvCopy> = { en, es };
export function useCv(locale: Locale): CvCopy { return cv[locale]; }
