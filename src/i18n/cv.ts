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

  // ---- Marca de hueco ----
  hueco: {
    tag: 'To write',
    note: 'Jaime writes this, in his own words. Nothing on this page is generated for him.'
  },
  // Marca de foto pendiente (FotoHueco.astro).
  fotoHueco: { tag: 'Photo to come' },
  // Qué foto falta en cada sitio. Instrucciones del hueco, no contenido.
  fotosPend: {
    origen: 'From when it started. Even blurry ones count.',
    research: 'Jaime working: a screen, a notebook, something real.',
    actinver: 'The visit, the school, the team, the talks.',
    sol: 'A portrait of Sol — or a frame from the march videos.',
    playas: 'The beach clean-up in Singapore — the photos are on his LinkedIn.',
    jasa: 'The shop or the online store: a real photo or a capture.'
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
  // `resumen` es una PLANTILLA: {n} y {min} los rellena Historia.astro con
  // la MISMA lista que numera las pantallas (capitulos.length) y con las
  // palabras contadas de la copia real del panel. Antes decía «9 chapters ·
  // about 7 minutes» escrito a mano, con ~2 650 palabras visibles en el
  // panel (unos 13 minutos): una cifra inventada al lado de una numeración
  // contada (2026-08-29).
  indice: {
    resumen: '{n} chapters · about {min} minutes',
    ver: 'See the index',
    aria: 'Chapters of this page'
  },

  // ---- Títulos de capítulo ────────────────────────────────────────────────
  // EL ORDEN LO PIDIÓ JAIME (mensaje del 2026-08-27) y es el de esta lista:
  // su frase de apertura primero, después experiencias y voluntariados,
  // después los proyectos ARRANCANDO por el grupo estudiantil, después el
  // canal de difusión, después el Reto Actinver y el private equity A LA PAR,
  // después las certificaciones, y al final la frase. Ver la cabecera de
  // Historia.astro para qué se movió de dónde.
  //
  // El 1 lleva su nombre como titular (el título de aquí solo sale en el
  // índice) y el 9 es la frase final.
  // JAIME PIDIÓ FUSIONAR (brief del 2026-08-28) los capítulos de las
  // conversaciones y del canal: primero las conversaciones, después el
  // teaching, en UN capítulo (c4). El hueco que deja lo ocupa la sección
  // nueva de cartas de recomendación (c8), después de las certificaciones.
  caps: {
    c1: 'I opened my eyes',
    c2: 'Experience',
    c3: 'Serving',
    c4: 'Everyone brings something',
    c5: 'My projects',
    c6: 'Reto Actinver and private equity',
    c7: 'Certifications',
    c8: 'Recommendation letters',
    c9: 'The sentence'
  },

  // ---- Capítulo 1: portada ----
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
    fotoAlt: 'Jaime speaking into a microphone on a panel, with the logos of Mitsubishi Heavy Industries and Forest City International School on the screen behind him.',
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
    torrePie: 'Toronto · his photograph (2026)'
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
    grupoLink: 'The community, on the site',
    grupoAlt: 'The Smart Finance student group, in front of the group’s banner',
    // El cuadro del vídeo de promo del grupo (2026, @smart.financee): qué es
    // y de dónde sale, como piden los pies de foto del brief.
    grupoTecPie: 'The group’s promo at Tec, from his TikTok (2026)',
    grupoTecAlt: 'Two students talking in front of a Mexican stock-exchange poster at Tec',
    sitioH: 'smartfinance.lat',
    // ---- Jasa Motor (bloque nuevo, brief del 2026-08-28) ----
    // FRAMING APROBADO POR JAIME: es la refaccionaria DE SU FAMILIA y él
    // desarrolló la tienda en línea y lleva el marketing para apoyar a su
    // papá. NO se usa «CEO». Verificado que existe: jasamotor.com.mx y
    // tienda.jasamotor.com.mx (consultadas 2026-08-28). Los datos del
    // negocio (Cuautitlán, 20+ años) salen del propio sitio de la
    // refaccionaria. Pendiente de su revisión final, como todo voz.*.
    jasaH: 'Jasa Motor',
    jasa: 'His family’s auto-parts business in Cuautitlán, State of Mexico, with more than twenty years of history. Jaime built its online store and runs its marketing.',
    jasaLink: 'tienda.jasamotor.com.mx'
  },

  // ---- Capítulo 5: la prueba (el bloque del sitio) ----
  prueba: {
    // Lo único que este capítulo afirma por su cuenta, y es comprobable:
    // la página corre sobre el mismo código que el sitio público.
    lede: 'smartfinance.lat is a bilingual financial-education site, and this page runs on its same code: the same endpoints, the same source chips, the same delays. The prices below are asked for when you open this page. Nothing here is a screenshot.',
    // Las cifras de al lado se CUENTAN en el build desde los archivos reales
    // del repo (Historia.astro); estos son solo sus rótulos.
    stats: {
      // Este ya NO es un rótulo de cifra grande: va en una frase, con el
      // número delante, porque un «10» al tamaño de un titular no se sostiene.
      lecciones: 'lessons, each written in English and Spanish — the sources above are theirs.',
      // Los tres rótulos de las cifras grandes. Cortos a propósito: van
      // debajo de un número enorme y compiten con él si se alargan.
      pruebas: 'automated tests, run on every change',
      fuentes: 'primary sources cited in the lessons',
      glosario: 'glossary terms, bilingual',
      // El 403 de los borradores: la promesa ética del sitio, verificable.
      promesa: 'And one promise you can test: no AI-written text is published without a person approving it. Asking the public endpoint for unreviewed drafts answers 403, on purpose.'
    },
    abrir: 'Open the site'
  },

  // ---- La cinta (dentro del capítulo 2; mismo mecanismo que siempre) ----
  tape: {
    lede: 'Three of the assets the site follows, asked for when this page opens.',
    note: 'Prices come from the site’s own endpoint, which reads Yahoo Finance and caches it. They are delayed, and the chip says by how much. They update when you open or reload this page, not continuously.',
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
    lede: 'Analyst-style reports with every figure traced to the filing it came from. The published one is below, with the state it is actually in.',
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
    canadaNota: 'Its photo is the CN Tower one that opens this CV, in chapter 1 — it is not repeated here.',
    // Los tres consejos sin imagen utilizable: fila seca con su enlace.
    sinImagen: [
      { id: '7654447626644933909', que: '“Your first investment should be in yourself”' },
      { id: '7659438690179026196', que: '“Most people are waiting for the perfect moment. It doesn’t exist” — 4 habits' },
      { id: '7661209936906521876', que: '“Most people wait until they feel ready. Start now”' }
    ],
    // El arco de Singapur. SOLO EL AÑO en pantalla (decisión de Jaime,
    // 2026-08-28); las fechas exactas de cada vídeo están en su perfil.
    arcoH: 'The Singapore arc',
    arco: [
      { cuando: '2026', que: 'Summer programme in Singapore' },
      { cuando: '2026', que: 'Financial-data videos: Japan and Singapore' },
      { cuando: '2026', que: 'Presentation about Mexico to National University of Singapore students' },
      { cuando: '2026', que: 'Interviews: Andy Toh (CEO, BlueSky Education) and Prof. Lloyd (NUS)' }
    ],
    arcoFuente: 'The whole arc is from 2026; each video, with its exact date, is on @smart.financee.',
    // El cuadro del arco: el fotograma RESCATADO de la presentación en la
    // NUS (vídeo 7658163945479408917) — venía girado 90° con el subtítulo
    // quemado; el enderezado y el recorte que deja fuera el rótulo están
    // explicados en build-photos.mjs (2026-08-29). El alt describe la
    // imagen real, mirada, incluida la lámina que se lee en ella.
    arcoImgAlt: 'Jaime, a microphone clipped to his collar, speaking beside a laptop showing a “Finance facts of Mexico” slide, in a lecture room at NUS',
    arcoImgPie: 'The presentation about Mexico at NUS, a frame from his TikTok (2026)'
  },

  // ---- Capítulo 7: la gente ----
  // CADA ROL LLEVA FUENTE Y EL QUE NO LA TIENE SE QUEDA VACÍO. `tipo` dice qué
  // fue el encuentro cuando llamarlo "entrevista" sería falso; vacío = una
  // conversación suya, que es lo que dice el material.
  // · Andy Toh, «CEO, BlueSky Education» — el título de su propia entrevista
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
  // LA GRAFÍA ES «BlueSky Education», UNA PALABRA, Y LA DECIDIÓ JAIME
  // (2026-08-27). El sitio la escribía de tres maneras a la vez —«Blue Sky»
  // aquí, «BlueSky» en src/i18n/ui.ts y «Bluesky» en About.astro—, o sea tres
  // grafías para el nombre de una empresa ajena, en las tres páginas donde
  // aparece. Ya están las tres unificadas. Si vuelve a aparecer una cuarta,
  // el sitio que manda es este comentario: BlueSky, con la S mayúscula y sin
  // espacio.
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
    aviso: 'These are conversations he sought out and recorded. Nobody here is endorsing him: what is set large is what he took from each conversation, in his own words.',
    // El carrusel: rótulos de las flechas y de la región desplazable.
    carruselAria: 'Conversations, one card per person. Horizontal list; it scrolls sideways.',
    prev: 'Previous conversation',
    next: 'Next conversation',
    // El rótulo que va encima de cada frase grande, para que ni leyendo por
    // encima se pueda confundir de quién es.
    llevo: 'What I took from it',
    // ── FUENTE DE CADA FICHA (2026-08-28, MATERIAL.md fuera del repo) ────
    // · Mauricio Mercenario Nieto — «FX Sales & Trading» es el titular de su
    //   propio LinkedIn (capturado en la evidencia); el podcast en dos partes
    //   está en @smart.financee. Que fue su mentor lo dice JAIME en su
    //   publicación de la AEM, y por eso va como cita en `tipo`, con marca.
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
      andy: { nombre: 'Andy Toh', rol: 'CEO, BlueSky Education', tipo: '' },
      lloyd: { nombre: 'Prof. Lloyd', rol: 'National University of Singapore', tipo: '', alt: 'Jaime, in a green Mexico jersey, interviewing Prof. Lloyd beside the large NUS letters' },
      nus: {
        nombre: 'A student at NUS',
        rol: 'National University of Singapore',
        tipo: 'Her name is not published, so this page does not invent it. The interview: “Los skills que ocupas para estar en una universidad top 8 mundial” (in English: the skills you need for a top-8 university in the world).'
      },
      jesus: {
        nombre: 'A content creator from the U.S.',
        rol: '',
        tipo: 'A Christian content creator he interviewed in Singapore, as his own post about the programme describes him.',
        alt: 'Jaime interviewing the U.S. content creator at sunset, with the Marina Bay skyline behind them'
      },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'A session I attended, not an interview of mine — “Takeaways from JPMorgan’s Chief ETF Strategist”, as the site puts it.'
      },
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: '“A conversation with Moris Dieck”, in the site’s own words.' },
      mauricio: {
        nombre: 'Mauricio Mercenario Nieto',
        rol: 'FX Sales & Trading',
        tipo: 'A podcast in two parts — and, in Jaime’s words on LinkedIn, “his mentorship has played an important role in my development”.',
        alt: 'Jaime and Mauricio Mercenario seated in armchairs around a low table, recording the podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Finance student',
        tipo: 'The podcast Jaime organized in the Financial Trading Room at Tec.'
      },
      raul: { nombre: 'Raúl Irabién', rol: 'President of Student Groups', tipo: '' },
      sol: {
        nombre: 'Sol',
        rol: 'Founder of Callejeritos',
        tipo: 'Interviewed at the responsible-adoption march; the clip of that day is in “Serving”.'
      }
    }
  },

  // ---- Capítulo 3: servir (los voluntariados) ----
  // El grupo estudiantil se fue al capítulo de proyectos: aquí se quedan los
  // voluntariados, que es lo que Jaime pidió junto a las experiencias.
  servir: {
    // El clip del voluntariado con animales existe en su TikTok. SOLO EL AÑO
    // en pantalla (decisión de Jaime).
    animalesClip: 'The clip: the march with Callejeritos for responsible adoption — he also interviewed Sol, its founder (2026).',
    // La donación al stand de adopción: hecho de su publicación en LinkedIn.
    donacion: 'He also donated pet food to a local adoption stand and spent the day with the volunteers and the animals (2026).',
    // LA PLAYA FUE EN SINGAPUR — corrección del brief del 2026-08-28, con el
    // texto de su propia publicación: fue un voluntariado de su curso de
    // Green Technology and Sustainable Ecology.
    playa: 'The beach clean-up was in Singapore, a volunteer day from his Green Technology and Sustainable Ecology course (2026).',
    bloques: {
      animales: 'The animals',
      playas: 'Beach clean-up'
    }
  },

  // ---- Capítulo 2: experiencias (en seco) ----
  // FECHAS: SOLO EL AÑO (decisión de Jaime, 2026-08-28). Y con los años
  // REALES derivados del material cosechado: la sesión de ETFs con Jon Maier
  // es de 2025 — Jaime avisó que estaba mal como 2026, y su fila lo corrige.
  // Las publicaciones nuevas que suman (visita a U of T/Rotman, Concordia,
  // AEM, la firma CFA×Tec con Marg Franklin) entran con su año.
  exp: {
    lede: 'What, where, when — years only. This chapter and the next are the ones a committee scans.',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      // Jon Maier va en su PROPIA fila y no en las conversaciones: la sesión
      // de J.P. Morgan fue algo a lo que Jaime ASISTIÓ. El año lo corrigió
      // él: es 2025, no 2026.
      { cuando: '2025', que: 'Session with Jon Maier, Chief ETF Strategist at J.P. Morgan Asset Management, at Tec Santa Fe' },
      { cuando: '2026', que: 'smartfinance.lat — bilingual financial-education site: lessons, market data, glossary, weekly newsletter' },
      { cuando: '2026', que: 'Founder and president of the Smart Finance student community — stock-exchange visits, talks, workshops, volunteering, and the Student Groups Fair at Tec' },
      { cuando: '2026', que: 'Visit to the University of Toronto and Rotman Commerce — the campus this application is aimed at' },
      { cuando: '2026', que: 'Singapore: summer programme (Green Technology and Sustainable Ecology), presentation about Mexico at NUS, beach clean-up, interviews' },
      { cuando: '2026', que: 'Visit to Concordia University, Montréal' },
      // «One of his first», no «his first»: su post dice «one of my first
      // experiences attending a business conference» (MATERIAL.md LI-17).
      // Redondearlo a «la primera» inflaba el hecho — corregido 2026-08-29.
      { cuando: '2026', que: 'AEM General Assembly — one of his first business conferences and networking events' },
      // SIN el cargo de Marg Franklin: su post capturado (MATERIAL.md LI-20)
      // no dice «CEO of CFA Institute» — dice que la escuchó «leading one of
      // the most important organizations in the financial world» y que le
      // pidió consejo sobre estudiar en Canadá. El cargo exacto era una
      // anotación externa sin fuente en el material: fuera (2026-08-29).
      { cuando: '2026', que: 'Signing of the CFA Institute × Tec de Monterrey global agreement — asked Marg Franklin for advice on studying in Canada' },
      { cuando: '2026', que: 'Jasa Motor — online store and marketing for his family’s auto-parts business (chapter 5)' },
      { cuando: '2026', que: 'TikTok @smart.financee — short financial-education videos, and the conversations of chapter 4' },
      { cuando: '2026', que: 'Reto Actinver — the calendar and the contest portfolio are in chapter 6' }
    ]
  },

  // ---- Capítulo 10: certificaciones ----
  certs: {
    // El lede promete lo MISMO que el español (emisor Y año con fuente): los
    // dos paneles hacen la misma promesa o uno de los dos miente (2026-08-29).
    lede: 'The receipts. The exact name, as LinkedIn publishes it; the issuer and the year only where a source says so.',
    // Nombres tal cual los publica su LinkedIn (el PDF que Jaime exportó).
    // ─────────────────────────────────────────────────────────────────────
    // EL PDF NO TRAE LA INSTITUCIÓN DE CADA CERTIFICADO, NI SU FECHA.
    // Así que `de` solo lleva emisor donde hay una fuente que lo diga:
    //   · Investment Foundations® — CFA Institute: su propia publicación de
    //     LinkedIn lo dice ("CFA Institute Investment Foundations Certificate").
    //   · Vista Equity Partners / Bank of America, en Forage: sus dos
    //     publicaciones de LinkedIn sobre las simulaciones.
    //   · Bloomberg Finance Fundamentals — Bloomberg: su publicación lo dice
    //     con esas palabras («…program from Bloomberg», MATERIAL.md LI-19).
    //     La fuente es ese «from Bloomberg», NO que el nombre empiece por la
    //     marca — eso solo no bastaría. (Recibo actualizado el 2026-08-29:
    //     antes aquí decía que Bloomberg iba sin emisor, y la fila ya lo
    //     llevaba con fuente.)
    // Las otras DOS (Green Technology, B2) van SIN emisor a propósito.
    // "Cambridge English" para el B2 estaba inventado: el PDF no lo dice en
    // ninguna parte, y un CV que adivina quién expide un certificado es un
    // CV que se puede desmentir.
    // Cuando falta el emisor, la columna de la derecha también lo pide.
    // ── TARJETAS DISEÑADAS, NO CAPTURAS (brief 2026-08-28) ───────────────
    // Los recortes de los certificados de LinkedIn NO se pudieron guardar en
    // la cosecha (limitación del entorno, anotada en MATERIAL.md): cada
    // tarjeta lleva su FotoHueco para cuando Jaime entregue las imágenes.
    // AÑOS: solo el año, y solo donde hay fuente — las publicaciones de
    // LinkedIn de 2026 (CFA, Vista, BofA, Bloomberg) y el curso de Singapur
    // (Green Technology, 2026). El B2 no tiene fecha publicada: se pide.
    // EMISORES: solo donde una fuente lo diga (la regla de siempre).
    // El enlace de cada tarjeta va al PERFIL de Jaime, que es donde el
    // certificado está publicado y donde un comité puede comprobarlo.
    verLinkedIn: 'See it on LinkedIn',
    fotoPend: 'The certificate image, when Jaime captures it from LinkedIn.',
    sinEmisor: 'Issuer to verify',
    sinAnio: 'year to verify',
    // SIN « — » dentro de los nombres de las simulaciones: los certificados
    // publicados dicen «Demystifying Private Equity Job Simulation» e
    // «Investment Banking Job Simulation» (MATERIAL.md LI-01 y LI-02), y un
    // guion insertado contradice el «the exact name» del lede (2026-08-29).
    filas: [
      { que: 'Investment Foundations® Certificate', de: 'CFA Institute', anio: '2026' },
      { que: 'Demystifying Private Equity Job Simulation', de: 'Vista Equity Partners, on Forage', anio: '2026' },
      { que: 'Investment Banking Job Simulation', de: 'Bank of America, on Forage', anio: '2026' },
      { que: 'Bloomberg Finance Fundamentals', de: 'Bloomberg', anio: '2026' },
      { que: 'Green Technology Programme', de: '', anio: '2026' },
      { que: 'B2 First Certificate', de: '', anio: '' }
    ],
    // ── FRANCÉS A2: AFIRMACIÓN SUYA, MARCADA COMO TAL ────────────────────
    // No hay certificado publicado en su actividad (verificado en la
    // cosecha). Entra porque él lo pidió, como afirmación suya pendiente de
    // verificación — sin emisor, sin imagen y con la marca en pantalla. Que
    // estudia francés sí tiene fuente: su publicación sobre Concordia.
    frances: {
      que: 'French — A2',
      tag: 'His claim, pending verification',
      nota: 'No certificate is published on his LinkedIn. What is sourced: his Concordia post (2026) says he has been studying French.'
    }
  },

  // ---- Capítulo 8: cartas de recomendación ----
  // SECCIÓN NUEVA pedida por Jaime (2026-08-28), después de certificaciones.
  // Hoy NO hay ninguna carta entregada, y esta sección no finge lo contrario:
  // nace con el patrón de hueco honesto del CV — recuadros marcados con lo
  // que falta (nombre, cargo, relación, contacto), listos para recibir cada
  // carta cuando exista. NUNCA se inventa una carta ni un nombre. El formato
  // de los campos es el que piden los programas canadienses que trabajan con
  // referencias contactables.
  cartas: {
    lede: 'Recommendation letters, in the format committees can verify: name, role, relationship, and a way to reach the person. None has been delivered yet — these slots are waiting, and nothing here will ever be invented.',
    tag: 'Letter to come',
    campos: 'Name · role · relationship · contact',
    slots: [
      'Someone who can answer for the student group and the school.',
      'Someone who can answer for the summer programme in Singapore.',
      'Someone who can answer for his financial-education work.'
    ]
  },

  // ---- Capítulo 9: la frase ----
  frase: {
    // VERBATIM. Es la voz de Jaime y NO SE TOCA — ni ortografía ni puntuación.
    // En los dos paneles va en español (lang="es" en el marcado); el panel
    // inglés enseña debajo la traducción pequeña de aquí abajo, marcada.
    texto: 'Si la vida destruye tus planes, es porque tus planes te pueden destruir a ti. Haz tu mejor esfuerzo siempre, y los resultados se darán, y si no, es porque te pudieron haber destruido a ti.',
    // Traducción de la frase, solo para el panel inglés, marcada como tal.
    traduccion: '“If life destroys your plans, it is because your plans could destroy you. Always do your best, and the results will come — and if they don’t, it is because they could have destroyed you.”',
    traduccionTag: 'His words, in Spanish. In English:'
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
    servirAnimales: {
      que: 'The animals, in my words',
      pista: 'One or two sentences. What you did, not what you felt.'
    },
    servirPlayas: {
      que: 'The beach clean-ups, in my words',
      pista: 'One or two sentences. What you did, not what you felt.'
    }
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
    servirAnimales: '',
    servirPlayas: ''
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
    aperturaTag: 'His words, in Spanish. This is a translation; the original is in the Spanish panel.',
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
    pe: '“This program put me in the shoes of a Private Equity Summer Analyst evaluating Workday as a potential investment. I built a GAAP-compliant income statement from Workday’s 10-K using Vista’s modeling standards, then applied the Rule of 40 framework […] I synthesized my findings (alongside investor presentation data) into an Investment Merits vs. Risks & Considerations summary, just like I’d present to a deal team ahead of a full diligence decision.”',
    peFuente: 'From his LinkedIn post on the Vista Equity Partners job simulation (2026). The “[…]” marks a passage this page does not reproduce.',
    // Marca de traducción, VISIBLE, encima de la cita. Vacía en inglés: ahí la
    // cita es el original. Misma regla que la traducción de la frase final.
    peTag: '',
    // texto de Jaime (traducción), pendiente de su revisión final
    dedicacion: '“I like the corporate side, and the research behind investing in companies. That is what I want to dedicate myself to.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    actinver: '“I want to represent my school, Prepa Tec CEM; to learn, to visit Actinver, to bring people from Actinver to give us talks, and to promote contests like this one so everyone joins in.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    ensenar: '“I want to show myself as a student who wants to communicate finance to everyone. I am a kid who wants to share the advice and the motivation of important people, help guide others toward their vocation, and leave a little mark on everyone.”',
    // texto de Jaime (traducción), pendiente de su revisión final
    entrevistas: '“You can take something from everyone, because they are small experiences and different points of view.”',
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
    jasaTag: 'His words, in Spanish. This is a translation; the original is in the Spanish panel.',
    // ---- La visita a la University of Toronto ----
    // VERBATIM de su publicación en LinkedIn sobre la visita (en inglés en el
    // original): es la línea que dice a dónde apunta este CV, y sustituye al
    // hueco «What I'm applying to» que Jaime pidió quitar.
    toronto: '“This visit reinforced something I had been thinking about for a long time: this is where I want to study Finance.”',
    torontoTag: '',
    torontoFuente: 'From his LinkedIn post on his visit to the University of Toronto and Rotman Commerce (2026).'
  }
};

const es: typeof en = {
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  lang: { en: 'English', es: 'Español', aria: 'Idioma de esta página' },

  hueco: {
    tag: 'Falta escribirlo',
    note: 'Esto lo escribe Jaime, con sus palabras. Nada de esta página se genera en su lugar.'
  },
  fotoHueco: { tag: 'Falta la foto' },
  fotosPend: {
    origen: 'De cuando empezó. Aunque estén movidas, cuentan.',
    research: 'Jaime trabajando: una pantalla, un cuaderno, algo real.',
    actinver: 'La visita, la prepa, el equipo, las pláticas.',
    sol: 'Un retrato de Sol — o un cuadro de los vídeos de la marcha.',
    playas: 'La limpieza de playa en Singapur — las fotos están en su LinkedIn.',
    jasa: 'La refaccionaria o la tienda en línea: una foto real o una captura.'
  },
  clip: {
    tag: 'Falta el clip',
    pista: 'El clip se servirá desde este dominio, nunca incrustado. Mientras tanto, el póster y el enlace al original.',
    ver: 'Ver en TikTok',
    carrusel: 'Carrusel de fotos'
  },

  indice: {
    resumen: '{n} capítulos · unos {min} minutos',
    ver: 'Ver el índice',
    aria: 'Capítulos de esta página'
  },

  caps: {
    c1: 'Abrí los ojos',
    c2: 'Experiencias',
    c3: 'Servir',
    c4: 'Cada quien trae algo',
    c5: 'Mis proyectos',
    c6: 'Reto Actinver y private equity',
    c7: 'Certificaciones',
    c8: 'Cartas de recomendación',
    c9: 'La frase'
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
    fotoAlt: 'Jaime hablando al micrófono en un panel, con los logos de Mitsubishi Heavy Industries y Forest City International School en la pantalla de atrás.',
    retratoPie: 'Singapur · en un panel, 2026',
    // Ver el bloque inglés: la de la portada NO es de Jaime (Jochem Raat,
    // Licencia Unsplash, acreditada aunque la licencia no lo exija) y la de la
    // Torre CN sí, con la fecha de publicación en su TikTok (20 de julio de
    // 2026), que es la comprobable.
    portadaAlt: 'El horizonte de Toronto visto desde el agua al anochecer: la Torre CN encendida sobre las torres del centro, y el lago delante de ellas.',
    portadaPie: 'Toronto · foto de Jochem Raat, Unsplash',
    portadaAltRotulo: 'La portada',
    torreAlt: 'La Torre CN de Toronto vista desde abajo, en blanco y negro: el mástil contra un cielo nublado, el mirador, y dos edificios de oficinas en los bordes.',
    torrePie: 'Toronto · foto suya (2026)'
  },

  proyectos: {
    grupoH: 'El grupo estudiantil',
    grupo: 'El grupo estudiantil que fundé y presido: visitas a la Bolsa Mexicana de Valores, pláticas y talleres de finanzas, y voluntariados por la comunidad y el medio ambiente.',
    grupoLink: 'La comunidad, en el sitio',
    grupoAlt: 'El grupo estudiantil de Smart Finance, delante del cartel del grupo',
    grupoTecPie: 'La promo del grupo en el Tec, de su TikTok (2026)',
    grupoTecAlt: 'Dos estudiantes conversando delante de un cartel de la Bolsa Mexicana de Valores en el Tec',
    sitioH: 'smartfinance.lat',
    jasaH: 'Jasa Motor',
    jasa: 'La refaccionaria de su familia, en Cuautitlán, Estado de México, con más de veinte años de historia. Jaime desarrolló su tienda en línea y lleva su marketing.',
    jasaLink: 'tienda.jasamotor.com.mx'
  },

  prueba: {
    lede: 'smartfinance.lat es un sitio bilingüe de educación financiera, y esta página corre sobre su mismo código: los mismos endpoints, los mismos chips de fuente, los mismos retrasos. Los precios de abajo se piden al abrir esta página. Nada de lo que hay aquí es una captura.',
    stats: {
      lecciones: 'lecciones, cada una escrita en inglés y en español — las fuentes de arriba son suyas.',
      pruebas: 'pruebas automáticas, en cada cambio',
      fuentes: 'fuentes primarias citadas en las lecciones',
      glosario: 'términos de glosario, bilingües',
      promesa: 'Y una promesa que se puede comprobar: ningún texto escrito por IA se publica sin que una persona lo apruebe. Pedirle al endpoint público los borradores sin revisar contesta 403, a propósito.'
    },
    abrir: 'Abrir el sitio'
  },

  tape: {
    lede: 'Tres de los activos que sigue el sitio, pedidos al abrir esta página.',
    note: 'Los precios salen del endpoint del propio sitio, que lee Yahoo Finance y lo cachea. Llegan con retraso, y el chip dice cuánto. Se actualizan al abrir o recargar esta página, no continuamente.',
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
    lede: 'Reportes tipo analista con cada cifra rastreada hasta el documento del que sale. El publicado está abajo, con el estado en el que de verdad está.',
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
    ensenaLede: 'Seis piezas que grabé yo, en el orden en que las enseñaría. Cuatro son vídeos servidos desde este dominio — con sonido, y solo arrancan si le das a reproducir. Las dos últimas son carruseles de fotos de TikTok, así que enlazan allá.',
    videos: {
      jpmvisit: '«📍🇸🇬 Visiting J.P. Morgan in Singapore and learning more about the fin…» (en español: visitando J.P. Morgan en Singapur y aprendiendo más sobre las fin…) — la visita, contada a cámara',
      nus: '«Tuve la oportunidad de presentar sobre México a estudiantes de la National University of Singapore»',
      singapur: '«Ahora entendí por qué aquí vive el dinero del mundo» — Singapur',
      japon: '«Datos financieros de Japón»',
      tokio: '«Lo creerías?» — datos financieros de Japón, desde la Torre de Tokio',
      canada: '«Canada is not just beautiful it’s one of the smartest places in the w…» (en español: Canadá no solo es bonito, es uno de los lugares más inteligentes del m…) — cinco datos financieros de Canadá'
    },
    canadaNota: 'Su foto es la de la Torre CN que abre este CV, en el capítulo 1 — aquí no se repite.',
    sinImagen: [
      { id: '7654447626644933909', que: '«Your first investment should be in yourself»' },
      { id: '7659438690179026196', que: '«Most people are waiting for the perfect moment. It doesn’t exist» — 4 hábitos' },
      { id: '7661209936906521876', que: '«Most people wait until they feel ready. Start now»' }
    ],
    arcoH: 'El arco de Singapur',
    arco: [
      { cuando: '2026', que: 'Programa de verano en Singapur' },
      { cuando: '2026', que: 'Vídeos de datos financieros: Japón y Singapur' },
      { cuando: '2026', que: 'Presentación sobre México a estudiantes de la National University of Singapore' },
      { cuando: '2026', que: 'Entrevistas: Andy Toh (CEO, BlueSky Education) y el profesor Lloyd (NUS)' }
    ],
    arcoFuente: 'Todo el arco es de 2026; cada vídeo, con su fecha exacta, está en @smart.financee.',
    arcoImgAlt: 'Jaime, con micrófono de solapa, hablando junto a una laptop con la lámina «Finance facts of Mexico», en un aula de la NUS',
    arcoImgPie: 'La presentación sobre México en la NUS, un cuadro de su TikTok (2026)'
  },

  entrevistas: {
    verVideo: 'Ver la conversación en TikTok',
    // Ver el bloque inglés: sin esta línea, la forma de las citas de Ondo
    // insinúa un aval que no existe.
    aviso: 'Son conversaciones que él buscó y grabó. Nadie de aquí lo está respaldando: lo que va en grande es lo que él se llevó de cada conversación, en sus palabras.',
    carruselAria: 'Conversaciones, una tarjeta por persona. Lista horizontal; se desplaza de lado.',
    prev: 'Conversación anterior',
    next: 'Conversación siguiente',
    llevo: 'Lo que me llevé',
    personas: {
      andy: { nombre: 'Andy Toh', rol: 'CEO, BlueSky Education', tipo: '' },
      lloyd: { nombre: 'Profesor Lloyd', rol: 'National University of Singapore', tipo: '', alt: 'Jaime, con la playera verde de México, entrevistando al profesor Lloyd junto a las letras grandes de la NUS' },
      nus: {
        nombre: 'Una estudiante de la NUS',
        rol: 'National University of Singapore',
        tipo: 'Su nombre no está publicado, y esta página no lo inventa. La entrevista: «Los skills que ocupas para estar en una universidad top 8 mundial».'
      },
      jesus: {
        nombre: 'Un creador de contenido de EE. UU.',
        rol: '',
        tipo: 'Un creador de contenido cristiano al que entrevistó en Singapur, como lo describe su propia publicación sobre el programa.',
        alt: 'Jaime entrevistando al creador de contenido de EE. UU. al atardecer, con el horizonte de Marina Bay detrás'
      },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'Una sesión a la que asistí, no una entrevista mía — «Lo que dejó el Chief ETF Strategist de J.P. Morgan», como lo publica el sitio.'
      },
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: '«Una conversación con Moris Dieck», con las palabras del propio sitio.' },
      mauricio: {
        nombre: 'Mauricio Mercenario Nieto',
        rol: 'FX Sales & Trading',
        tipo: 'Un podcast en dos partes — y, con las palabras de Jaime en LinkedIn, «su mentoría ha jugado un papel importante en mi desarrollo».',
        alt: 'Jaime y Mauricio Mercenario sentados en sillones alrededor de una mesa baja, grabando el podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Estudiante de finanzas',
        tipo: 'El podcast que Jaime organizó en el Financial Trading Room del Tec.'
      },
      raul: { nombre: 'Raúl Irabién', rol: 'Presidente de Grupos Estudiantiles', tipo: '' },
      sol: {
        nombre: 'Sol',
        rol: 'Fundadora de Callejeritos',
        tipo: 'Entrevistada en la marcha por la adopción responsable; el clip de ese día está en «Servir».'
      }
    }
  },

  servir: {
    animalesClip: 'El clip: la marcha con Callejeritos por la adopción responsable — también entrevistó a Sol, su fundadora (2026).',
    donacion: 'También donó alimento a un stand de adopción local y pasó el día con los voluntarios y los animalitos (2026).',
    playa: 'La limpieza de playa fue en Singapur, un día de voluntariado de su curso de Green Technology and Sustainable Ecology (2026).',
    bloques: {
      animales: 'Los animalitos',
      playas: 'Limpieza de playa'
    }
  },

  exp: {
    lede: 'Qué, dónde, cuándo — solo el año. Este capítulo y el siguiente son los que un comité escanea.',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      { cuando: '2025', que: 'Sesión con Jon Maier, Chief ETF Strategist de J.P. Morgan Asset Management, en el Tec Santa Fe' },
      { cuando: '2026', que: 'smartfinance.lat — sitio bilingüe de educación financiera: lecciones, datos de mercado, glosario, boletín semanal' },
      { cuando: '2026', que: 'Fundador y presidente de la comunidad estudiantil de Smart Finance — visitas a la bolsa, pláticas, talleres, voluntariados, y la Feria de Grupos Estudiantiles del Tec' },
      { cuando: '2026', que: 'Visita a la University of Toronto y Rotman Commerce — el campus al que apunta esta solicitud' },
      { cuando: '2026', que: 'Singapur: programa de verano (Green Technology and Sustainable Ecology), presentación sobre México en la NUS, limpieza de playa, entrevistas' },
      { cuando: '2026', que: 'Visita a Concordia University, Montréal' },
      { cuando: '2026', que: 'Asamblea General de la AEM — una de sus primeras conferencias de negocios y eventos de networking' },
      { cuando: '2026', que: 'Firma del acuerdo global CFA Institute × Tec de Monterrey — le pidió consejo a Marg Franklin sobre estudiar en Canadá' },
      { cuando: '2026', que: 'Jasa Motor — tienda en línea y marketing de la refaccionaria de su familia (capítulo 5)' },
      { cuando: '2026', que: 'TikTok @smart.financee — videos cortos de educación financiera, y las conversaciones del capítulo 4' },
      { cuando: '2026', que: 'Reto Actinver — el calendario y la cartera del concurso están en el capítulo 6' }
    ]
  },

  certs: {
    lede: 'Los recibos. El nombre exacto, tal como lo publica su LinkedIn; el emisor y el año, solo donde una fuente lo diga.',
    verLinkedIn: 'Verlo en LinkedIn',
    fotoPend: 'La imagen del certificado, cuando Jaime la capture de LinkedIn.',
    sinEmisor: 'Emisor por verificar',
    sinAnio: 'año por verificar',
    filas: [
      { que: 'Investment Foundations® Certificate', de: 'CFA Institute', anio: '2026' },
      { que: 'Demystifying Private Equity Job Simulation', de: 'Vista Equity Partners, en Forage', anio: '2026' },
      { que: 'Investment Banking Job Simulation', de: 'Bank of America, en Forage', anio: '2026' },
      { que: 'Bloomberg Finance Fundamentals', de: 'Bloomberg', anio: '2026' },
      { que: 'Green Technology Programme', de: '', anio: '2026' },
      { que: 'B2 First Certificate', de: '', anio: '' }
    ],
    frances: {
      que: 'Francés — A2',
      tag: 'Afirmación suya, pendiente de verificación',
      nota: 'No hay certificado publicado en su LinkedIn. Lo que sí tiene fuente: su publicación sobre Concordia (2026) dice que estudia francés.'
    }
  },

  cartas: {
    lede: 'Cartas de recomendación, en el formato que un comité puede verificar: nombre, cargo, relación y una forma de contactar a la persona. Hoy no hay ninguna entregada — estos huecos esperan, y aquí nunca se inventará nada.',
    tag: 'Falta la carta',
    campos: 'Nombre · cargo · relación · contacto',
    slots: [
      'Alguien que pueda responder por el grupo estudiantil y la prepa.',
      'Alguien que pueda responder por el programa de verano en Singapur.',
      'Alguien que pueda responder por su trabajo de educación financiera.'
    ]
  },

  frase: {
    texto: 'Si la vida destruye tus planes, es porque tus planes te pueden destruir a ti. Haz tu mejor esfuerzo siempre, y los resultados se darán, y si no, es porque te pudieron haber destruido a ti.',
    traduccion: '“If life destroys your plans, it is because your plans could destroy you. Always do your best, and the results will come — and if they don’t, it is because they could have destroyed you.”',
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
    servirAnimales: {
      que: 'Los animalitos, con mis palabras',
      pista: 'Una o dos frases. Qué hiciste, no qué sentiste.'
    },
    servirPlayas: {
      que: 'Las playas, con mis palabras',
      pista: 'Una o dos frases. Qué hiciste, no qué sentiste.'
    }
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
    servirAnimales: '',
    servirPlayas: ''
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
    pe: '«Este programa me puso en los zapatos de un analista de verano de private equity evaluando Workday como posible inversión. Construí un estado de resultados conforme a GAAP desde el 10-K de Workday con los estándares de modelado de Vista, y después apliqué el marco de la Rule of 40 […] Sinteticé lo que encontré (junto con datos de la presentación a inversionistas) en un resumen de méritos de inversión frente a riesgos y consideraciones, igual que se lo presentaría a un equipo de operaciones antes de una decisión de diligencia completa.»',
    peFuente: 'De su publicación en LinkedIn sobre la simulación de Vista Equity Partners (2026). El «[…]» marca un trozo que esta página no reproduce.',
    peTag: 'Su publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
    // texto de Jaime, pendiente de su revisión final
    dedicacion: '«Me gusta lo corporativo y la investigación para inversión en empresas. Es a lo que me quiero dedicar.»',
    // texto de Jaime, pendiente de su revisión final
    actinver: '«Quiero representar a mi prepa, el Tec CEM; aprender, visitar Actinver, traer gente de Actinver a que nos dé pláticas, y promover este tipo de retos para invitar a todos a sumarse.»',
    // texto de Jaime, pendiente de su revisión final
    ensenar: '«Quiero mostrarme como un estudiante que quiere comunicar finanzas a todos. Soy un niño que quiere compartir los consejos y la motivación de gente importante, ayudar a guiar a los demás hacia su vocación, y dejar una huellita en todos.»',
    // texto de Jaime, pendiente de su revisión final
    entrevistas: '«Te puedes llevar algo de cada quien, porque son pequeñas experiencias y puntos de vista diferentes.»',
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
    torontoTag: 'Su publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
    torontoFuente: 'De su publicación en LinkedIn sobre su visita a la University of Toronto y Rotman Commerce (2026).'
  }
};

export type CvCopy = typeof en;
/** Clave de un hueco: sirve para que <Hueco id="..."> no admita inventos. */
export type CvHueco = keyof CvCopy['huecos'] & keyof CvCopy['suyo'];

export const cv: Record<Locale, CvCopy> = { en, es };
export function useCv(locale: Locale): CvCopy { return cv[locale]; }
