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

  // ---- Marca de hueco ----
  hueco: {
    tag: 'To write',
    note: 'I write this, in my own words. Nothing on this page is generated for me.'
  },
  // Marca de foto pendiente (FotoHueco.astro).
  fotoHueco: { tag: 'Photo to come' },
  // Qué foto falta en cada sitio. Instrucciones del hueco, no contenido.
  fotosPend: {
    origen: 'From when it started. Even blurry ones count.',
    research: 'Me working: a screen, a notebook, something real.',
    actinver: 'The visit, the school, the team, the talks.',
    sol: 'A portrait of Sol — or a frame from the march videos.',
    // TRES huecos, uno por foto, porque la publicación tiene TRES y están
    // descritas una por una en el material. Un solo hueco genérico decía
    // «faltan fotos»; tres dicen CUÁLES faltan, que es lo que hace falta
    // para poder traerlas.
    playa1: 'Me picking up litter with the red bucket and the grabber, at the edge of the path. Photo 1 of the 3 on my LinkedIn.',
    playa2: 'The wide shot of the coastal park: the trees, the turquoise sea and a cargo ship on the horizon. Photo 2 of 3.',
    playa3: 'The same scene, wider: the rubbish truck behind, and the whole group of volunteers working by the sea. Photo 3 of 3.',
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
    torrePie: 'Toronto · my photograph (2026)'
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
    grupoAlt: 'The Smart Finance student group, in front of the group’s banner',
    // El cuadro del vídeo de promo del grupo (2026, @smart.financee): qué es
    // y de dónde sale, como piden los pies de foto del brief.
    grupoTecPie: 'The group’s promo at Tec, from my TikTok (2026)',
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
    // EL AÑO ES 2025 y lo corrigió Jaime (2026-08-29): la tienda la creó en
    // 2025, no en 2026 como decía la línea del capítulo de experiencias.
    jasa: 'My family’s auto-parts business in Cuautitlán, State of Mexico, with more than twenty years of history. I built its online store in 2025 and I run its marketing.',
    jasaAlt: 'Home page of the Jasa Motor online store: the logo with a piston in the A, a search by make, model, year and engine, the “Refacciones para Motor” heading and the best-sellers grid with real prices.',
    jasaPie: 'The store I built — tienda.jasamotor.com.mx (2025)',
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
    // respuesta.
    lede: 'I started smartfinance.lat in 2025, to make finance easier to understand for any student. This is its home page.',
    // El pie de la captura del header. Dice QUÉ es y DE CUÁNDO: la imagen
    // lleva dentro precios y una hora, y sin fecha sería una lámina de
    // cifras sin edad justo encima de una cinta que sí pide precios de
    // verdad al abrir esta página.
    headerPie: 'The home page of smartfinance.lat, captured on 31 August 2026. The prices inside the image are from that moment; the ones below are asked for now.',
    headerAlt: 'The smartfinance.lat home page: the Smart Finance wordmark and menu, a dark globe with markers on New York and Mexico City, the headline “Markets and money, explained for young people. By Jaime Sandoval”, and a row of eight stock-exchange chips',
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

  // ---- La cinta (dentro del capítulo 2; mismo mecanismo que siempre) ----
  tape: {
    lede: 'Three of the assets the site follows, asked for when this page opens.',
    // ── DOS FRASES DONDE HABÍA CINCO (2026-08-30, «omite tanto texto») ──
    // Lo que NO se puede perder de aquí es lo que impide que esto se lea
    // como un dato en vivo: de dónde viene, que va con retraso, que se pide
    // al abrir y no continuamente, y que si el endpoint falla salen guiones.
    // Todo eso sigue; lo que se fue es la explicación de la caché.
    note: 'From the site’s own endpoint, delayed — the chip says by how much — and asked for when you open this page, not continuously.',
    fail: 'If it does not answer, the prices stay as dashes and the chip says so. No figure on this page is typed in by hand.',
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
    arcoImgPie: 'The presentation about Mexico at NUS, a frame from my TikTok'
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
      lloyd: { nombre: 'Prof. Lloyd', rol: 'National University of Singapore', tipo: '', alt: 'Me, in a green Mexico jersey, interviewing Prof. Lloyd beside the large NUS letters' },
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
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: '“A conversation with Moris Dieck”, in the site’s own words.' },
      mauricio: {
        nombre: 'Mauricio Mercenario Nieto',
        rol: 'FX Sales & Trading',
        tipo: 'A podcast in two parts — and, in my own words on LinkedIn, “his mentorship has played an important role in my development”.',
        alt: 'Mauricio Mercenario and me seated in armchairs around a low table, recording the podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Finance student',
        tipo: 'The podcast I organized in the Financial Trading Room at Tec.'
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
    // de BlueSky Education, del 22 de junio al 11 de julio de 2026 en la
    // Shaw Foundation Alumni House (que está dentro de la NUS). Estaban
    // escritos como dos actividades sueltas, y no lo son: la limpieza es la
    // parte de servicio del programa que certifica el diploma. Decirlo hace
    // que el voluntariado deje de parecer un día suelto y el certificado
    // deje de parecer un curso sin práctica.
    playaPrograma: 'That day was part of the programme whose certificate is in “Certifications”: the 2026 Green Technology Programme, BlueSky Education, in Singapore. The clean-up is the service part of the same programme.',
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
    // ── PLEGADO DESDE EL 2026-08-30 ─────────────────────────────────────
    // Jaime: «experience consume mucho, mejor que sea una cosa que diga view
    // y ya se deslice toda mi experience». El rótulo es el suyo. `pista`
    // lleva `{n}` y lo rellena el componente con `filas.length`: escrito a
    // mano, el número mentiría en cuanto se añada una fila.
    ver: 'View my experience',
    pista: '{n} entries',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      // Jon Maier va en su PROPIA fila y no en las conversaciones: la sesión
      // de J.P. Morgan fue algo a lo que Jaime ASISTIÓ. El año lo corrigió
      // él: es 2025, no 2026.
      { cuando: '2025', que: 'Session with Jon Maier, Chief ETF Strategist at J.P. Morgan Asset Management, at Tec Santa Fe' },
      // ⚠️ EL AÑO DEL GRUPO ESTUDIANTIL ESTÁ EN DISPUTA Y NO LO RESUELVE
      // ESTA PÁGINA. Jaime dijo el 2026-08-29 que lo creó «a finales de
      // 2025»; su propio LinkedIn publica el grupo como «ene. 2026» y el
      // proyecto smartfinance.lat como «feb. 2026». Aquí va 2025 porque es
      // lo que él afirmó y es su vida, no la de este repositorio — pero es
      // una contradicción REAL con una fuente pública suya, y hasta que él
      // la aclare (corrigiendo el LinkedIn o corrigiendo esta línea) se
      // queda anotada aquí. No la borres sin su respuesta.
      { cuando: '2025', que: 'Founder and president of the Smart Finance student community — stock-exchange visits, talks, workshops, volunteering, and the Student Groups Fair at Tec' },
      // «One of his first», no «his first»: su post dice «one of my first
      // experiences attending a business conference» (MATERIAL.md LI-17).
      // Redondearlo a «la primera» inflaba el hecho — corregido 2026-08-29.
      // EL AÑO ES 2025, corregido por Jaime el 2026-08-29 (iba como 2026).
      { cuando: '2025', que: 'AEM General Assembly — one of my first business conferences and networking events' },
      // 2025 también, y también corregido por él: «esta la creé en 2025».
      { cuando: '2025', que: 'Jasa Motor — online store and marketing for my family’s auto-parts business (chapter 5)' },
      // ⚠️ 2025 Y NO 2026, y es la MISMA disputa que la del grupo estudiantil
      // dos filas más arriba. Jaime, 2026-08-30: «que la creé desde 2025
      // empecé». Su LinkedIn publica el proyecto como «feb. 2026». Se pone
      // lo que él afirma, y se anota que hay una fuente pública suya que
      // dice otra cosa. Está escrito igual en `prueba.lede`, que es donde el
      // año se LEE en pantalla; las dos tienen que decir lo mismo.
      { cuando: '2025', que: 'smartfinance.lat — bilingual financial-education site: lessons, market data, glossary, weekly newsletter' },
      { cuando: '2026', que: 'Visit to the University of Toronto and Rotman Commerce — the campus this application is aimed at' },
      { cuando: '2026', que: 'Singapore: summer programme (Green Technology and Sustainable Ecology), presentation about Mexico at NUS, beach clean-up, interviews' },
      { cuando: '2026', que: 'Visit to Concordia University, Montréal' },
      // SIN el cargo de Marg Franklin: su post capturado (MATERIAL.md LI-20)
      // no dice «CEO of CFA Institute» — dice que la escuchó «leading one of
      // the most important organizations in the financial world» y que le
      // pidió consejo sobre estudiar en Canadá. El cargo exacto era una
      // anotación externa sin fuente en el material: fuera (2026-08-29).
      { cuando: '2026', que: 'Signing of the CFA Institute × Tec de Monterrey global agreement — asked Marg Franklin for advice on studying in Canada' },
      { cuando: '2026', que: 'TikTok @smart.financee — short financial-education videos, and the conversations of chapter 4' },
      { cuando: '2026', que: 'Reto Actinver — the calendar and the contest portfolio are in chapter 6' }
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
    lede: 'The receipts. Exact name, issuer, year and credential ID, as my LinkedIn publishes them.',
    verLinkedIn: 'See it on LinkedIn',
    credencial: 'Credential ID',
    // El único de los siete que LinkedIn publica sin ID. Se dice, no se
    // esconde: una tarjeta a la que le falta un campo y se calla parece una
    // tarjeta completa.
    sinCred: 'No credential ID published',
    // Solo el DELF A2 llega hasta aquí: es el único sin imagen en ninguna
    // parte (ni certificado ni logotipo en su LinkedIn).
    fotoPend: 'The diploma, when I scan it: it is the only one of the seven with no image on my LinkedIn.',
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
        img: 'cv-cert-vista.webp', w: 700, h: 495,
        alt: 'Forage certificate of completion in the name of Jaime Sandoval Ricaño for the Vista Equity Partners Demystifying Private Equity job simulation, with the Vista and Forage logos.'
      },
      {
        que: 'Bank of America - Investment Banking Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a80869baa694bdf898c2581',
        img: 'cv-cert-bofa.webp', w: 700, h: 495,
        alt: 'Forage certificate of completion in the name of Jaime Sandoval Ricaño for the Bank of America investment banking job simulation, with the Bank of America and Forage logos.'
      },
      {
        que: 'Investment Foundations® Certificate',
        de: 'CFA Institute', anio: '2026', cred: '191463283',
        img: 'cv-cert-cfa.webp', w: 700, h: 541,
        alt: 'CFA Institute certificate awarding the Investment Foundations Certificate to Jaime Sandoval Ricano, with its date, certificate number and verification QR code.'
      },
      {
        que: 'GREEN TECHNOLOGY PROGRAMME',
        de: 'BlueSky Education', anio: '2026', cred: '',
        img: 'cv-cert-green-tech.webp', w: 501, h: 700,
        alt: 'BlueSky Education certificate of completion for the 2026 Green Technology Programme, hosted at Shaw Foundation Alumni House in Singapore, in the name of Jaime Sandoval Ricaño.'
      },
      {
        que: 'Bloomberg Finance Fundamentals',
        de: 'Bloomberg', anio: '2026', cred: 'Xsgrm4LYnvGBWeskx8HpEut9',
        img: 'cv-cert-bloomberg.webp', w: 700, h: 497,
        alt: 'Bloomberg for Education certificate of completion for the Bloomberg Finance Fundamentals course, on a black background with candlestick charts.'
      },
      {
        que: 'DELF A2',
        de: 'Alliance Française de Paris', anio: '2026', cred: '052535012100',
        img: '', w: 0, h: 0, alt: ''
      },
      {
        que: 'B2 First Certificate',
        de: 'Cambridge English', anio: '2024', cred: '814072MSJ',
        img: 'cv-cert-b2-cambridge.webp', w: 700, h: 662,
        alt: 'Cambridge English certificate stating that Jaime Sandoval Ricaño was awarded Grade C in the First Certificate in English, Council of Europe level B2, with an overall score of 163.'
      }
    ]
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
  // que los recuadros de las que faltan se quedan. Ya no hay hueco para el
  // programa de Singapur: las dos cartas que llegaron son de ahí.
  cartas: {
    lede: 'Two have arrived. The letters themselves are not published here — they are documents for admissions committees. What is on this page is the record, the two lines that carry the most weight in each one, and the contact each signatory gave for enquiries about me. One of the letters also gives a personal phone number; that one is not published.',
    entregadasH: 'Delivered',
    faltanH: 'Still to come',
    citaTag: 'The two lines that carry the most weight',
    // RÓTULO DEL CONTACTO. Dice DE DÓNDE sale: no es un correo que Jaime
    // haya buscado, es el que el propio firmante escribió en su carta
    // ofreciéndose a contestar preguntas sobre él.
    contactoTag: 'Contact he gave for enquiries about me',
    entregadas: [
      {
        nombre: 'Lloyd George',
        cargo: 'CEO, TAQ Pte Ltd',
        donde: 'Singapore — biotechnology, healthcare management and green technologies',
        relacion: 'He taught me for two weeks on the Green Technology programme in Singapore, through the educational consultancy BlueSky Education. He is the “Prof. Lloyd” I interviewed for my TikTok.',
        anio: '2026',
        // LAS DOS FRASES, VERBATIM del PDF. La primera es UNA sola idea que la
        // carta escribe en dos oraciones: cortarla por la mitad deja un
        // renglón que ni siquiera nombra a Jaime, así que va entera.
        citas: [
          'Two weeks is a short period, but it is long enough to tell apart the student who works from the student who merely attends. Jaime stood out from the first day.',
          'What he has already achieved without institutional support indicates clearly what he will achieve with it.'
        ],
        correo: 'Enquiries.TAQ@outlook.com'
      },
      {
        nombre: 'Andy Toh',
        cargo: 'CEO, BlueSky Education',
        donde: 'Singapore — the educational consultancy that runs the programme',
        relacion: 'He observed me during my three-week programme in Singapore. He is the same Andy Toh I interviewed, and who is already on this site.',
        anio: '2026',
        citas: [
          'While many students spent their breaks socialising with their peers, Jaime actively approached and engaged with the educators, programme leaders, and industry professionals involved in the programme.',
          'His willingness to seek opportunities to learn and continually improve himself reflects a level of maturity and self-motivation that I believe will serve him extremely well at university.'
        ],
        correo: 'Andy.toh@bluesky-education.com'
      }
    ],
    tag: 'Letter to come',
    campos: 'Name · role · relationship · contact',
    slots: [
      'Someone who can answer for the student group and the school.',
      'Someone who can answer for my financial-education work.'
    ],
    // ── LO QUE LAS CARTAS VERIFICAN ─────────────────────────────────────
    // Seis hechos que hasta el 2026-08-29 eran solo palabra de Jaime. Ahora
    // los firma un tercero, así que se pueden AFIRMAR citando la carta — y
    // en los sitios del CV donde ya estaban dichos con su voz, se les pone
    // `fuenteCarta` debajo. La marca dice de QUIÉN es la carta: «un tercero»
    // a secas no es una fuente, es un rumor con buena presentación.
    verificaH: 'What the letters confirm',
    verificaLede: 'Until these arrived, the facts below were my word. Now someone from outside my school and my family has written them down and signed them.',
    verifica: [
      { que: 'I founded the Smart Finance student organisation at my campus.', quien: 'Lloyd George' },
      { que: 'I host a financial-education podcast in which I interview finance executives, entrepreneurs and university professors.', quien: 'Lloyd George' },
      { que: 'In Singapore I arranged and conducted the interviews with business leaders and with Business Administration students from NUS myself — “entirely on his own steam”.', quien: 'Lloyd George' },
      { que: 'I gave my time to community and environmental work in Singapore, “including a beach cleaning project during his stay”.', quien: 'Lloyd George' },
      { que: 'I work in Spanish, English and French.', quien: 'Lloyd George' },
      { que: 'At the Green Tech Youth Summit I developed a project and presented it, and “performed particularly well in both his project and presentation”.', quien: 'Andy Toh' }
    ],
    // ── EL PREMIO QUE ÉL NUNCA PUBLICÓ ──────────────────────────────────
    // La carta de Lloyd George dice que Jaime y su equipo ganaron un premio
    // en el GreenTech Summit 2026 contra estudiantes de Taiwán y Rusia. Se
    // revisaron sus 21 publicaciones con imagen y los tres posts de Singapur
    // una por una: NO está publicado en ninguna parte. Va con su marca
    // diciendo exactamente eso, porque un premio del que la única fuente es
    // una carta no se puede enseñar como si tuviera dos.
    premio: {
      h: 'An award I never posted',
      que: 'An award at the GreenTech Summit 2026, with my teammates, competing against students from Taiwan and Russia.',
      tag: 'Only source: Lloyd George’s letter',
      nota: 'This is not on my LinkedIn and not on my TikTok — I never posted it. It is here because someone else wrote it down and signed it, and this page says so instead of passing it off as something I published.'
    },
    // Se pinta donde una afirmación de Jaime pasó a tener fuente de tercero.
    // {n} es quien firma la carta y {s} el título de este capítulo.
    fuenteCarta: 'Third-party source: {n}’s letter, in “{s}”.'
  },

  // ---- Capítulo 9: la frase ----
  frase: {
    // VERBATIM. Es la voz de Jaime y NO SE TOCA — ni ortografía ni puntuación.
    // En los dos paneles va en español (lang="es" en el marcado); el panel
    // inglés enseña debajo la traducción pequeña de aquí abajo, marcada.
    texto: 'Si la vida destruye tus planes, es porque tus planes te pueden destruir a ti. Haz tu mejor esfuerzo siempre, y los resultados se darán, y si no, es porque te pudieron haber destruido a ti.',
    // Traducción de la frase, solo para el panel inglés, marcada como tal.
    traduccion: '“If life destroys your plans, it is because your plans could destroy you. Always do your best, and the results will come — and if they don’t, it is because they could have destroyed you.”',
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
    servirAnimales: {
      que: 'The animals, in my words',
      pista: 'One or two sentences. What you did, not what you felt.'
    }
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
    servirAnimales: ''
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
    pe: '“This program put me in the shoes of a Private Equity Summer Analyst evaluating Workday as a potential investment. I built a GAAP-compliant income statement from Workday’s 10-K using Vista’s modeling standards, then applied the Rule of 40 framework […] I synthesized my findings (alongside investor presentation data) into an Investment Merits vs. Risks & Considerations summary, just like I’d present to a deal team ahead of a full diligence decision.”',
    peFuente: 'From my LinkedIn post on the Vista Equity Partners job simulation (2026). The “[…]” marks a passage this page does not reproduce.',
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

const es: typeof en = {
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  cifraSuya: 'Mi cifra, del 29 de agosto de 2026. Esta página no la cuenta: es mi afirmación.',

  lang: { en: 'English', es: 'Español', aria: 'Idioma de esta página' },

  hueco: {
    tag: 'Falta escribirlo',
    note: 'Esto lo escribo yo, con mis palabras. Nada de esta página se genera en mi lugar.'
  },
  fotoHueco: { tag: 'Falta la foto' },
  fotosPend: {
    origen: 'De cuando empezó. Aunque estén movidas, cuentan.',
    research: 'Yo trabajando: una pantalla, un cuaderno, algo real.',
    actinver: 'La visita, la prepa, el equipo, las pláticas.',
    sol: 'Un retrato de Sol — o un cuadro de los vídeos de la marcha.',
    playa1: 'Yo recogiendo basura con la cubeta roja y la pinza, en la orilla del sendero. Foto 1 de las 3 que están en mi LinkedIn.',
    playa2: 'El plano abierto del parque costero: los árboles, el mar turquesa y un carguero en el horizonte. Foto 2 de 3.',
    playa3: 'La misma escena, más abierta: el camión de basura detrás y el grupo completo de voluntarios trabajando junto al mar. Foto 3 de 3.',
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
    torrePie: 'Toronto · foto mía (2026)'
  },

  proyectos: {
    grupoH: 'El grupo estudiantil',
    grupo: 'El grupo estudiantil que fundé y presido: visitas a la Bolsa Mexicana de Valores, pláticas y talleres de finanzas, y voluntariados por la comunidad y el medio ambiente.',
    grupoCifra: 'Somos casi 200 en la comunidad.',
    grupoLink: 'La comunidad, en el sitio',
    grupoAlt: 'El grupo estudiantil de Smart Finance, delante del cartel del grupo',
    grupoTecPie: 'La promo del grupo en el Tec, de mi TikTok (2026)',
    grupoTecAlt: 'Dos estudiantes conversando delante de un cartel de la Bolsa Mexicana de Valores en el Tec',
    sitioH: 'smartfinance.lat',
    jasaH: 'Jasa Motor',
    jasa: 'La refaccionaria de mi familia, en Cuautitlán, Estado de México, con más de veinte años de historia. Yo desarrollé su tienda en línea en 2025 y llevo su marketing.',
    jasaAlt: 'Portada de la tienda en línea de Jasa Motor: el logotipo con un pistón en la A, el buscador por marca, modelo, año y motor, el título «Refacciones para Motor» y la rejilla de los más vendidos con precios reales.',
    jasaPie: 'La tienda que desarrollé — tienda.jasamotor.com.mx (2025)',
    jasaLink: 'tienda.jasamotor.com.mx'
  },

  prueba: {
    lede: 'Empecé smartfinance.lat en 2025, para que las finanzas sean más fáciles de entender para cualquier estudiante. Esta es su portada.',
    headerPie: 'La portada de smartfinance.lat, capturada el 31 de agosto de 2026. Los precios que se ven dentro de la imagen son de ese momento; los de abajo se piden ahora.',
    headerAlt: 'La portada de smartfinance.lat: el logotipo y el menú de Smart Finance, un globo oscuro con marcadores en Nueva York y Ciudad de México, el titular «Markets and money, explained for young people. By Jaime Sandoval» y una fila de ocho chips de bolsas',
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

  tape: {
    lede: 'Tres de los activos que sigue el sitio, pedidos al abrir esta página.',
    note: 'Salen del endpoint del propio sitio, con retraso —el chip dice cuánto— y se piden al abrir esta página, no continuamente.',
    fail: 'Si no contesta, los precios se quedan en rayas y el chip lo dice. Ninguna cifra de esta página está escrita a mano.',
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
    verTodo: 'Ver todo mi contenido',
    arcoImgAlt: 'Yo, con micrófono de solapa, hablando junto a una laptop con la lámina «Finance facts of Mexico», en un aula de la NUS',
    arcoImgPie: 'La presentación sobre México en la NUS, un cuadro de mi TikTok'
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
      andy: { nombre: 'Andy Toh', rol: 'CEO, BlueSky Education', tipo: '' },
      lloyd: { nombre: 'Profesor Lloyd', rol: 'National University of Singapore', tipo: '', alt: 'Yo, con la playera verde de México, entrevistando al profesor Lloyd junto a las letras grandes de la NUS' },
      nus: {
        nombre: 'Una estudiante de la NUS',
        rol: 'National University of Singapore',
        tipo: 'Su nombre no está publicado, y esta página no lo inventa. La entrevista: «Los skills que ocupas para estar en una universidad top 8 mundial».'
      },
      jesus: {
        nombre: 'Un creador de contenido de EE. UU.',
        rol: '',
        tipo: 'Un creador de contenido cristiano al que entrevistó en Singapur, como lo describe su propia publicación sobre el programa.',
        alt: 'Yo entrevistando al creador de contenido de EE. UU. al atardecer, con el horizonte de Marina Bay detrás'
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
        tipo: 'Un podcast en dos partes — y, con mis propias palabras en LinkedIn, «su mentoría ha jugado un papel importante en mi desarrollo».',
        alt: 'Mauricio Mercenario y yo sentados en sillones alrededor de una mesa baja, grabando el podcast'
      },
      podcast: {
        nombre: 'Jesús Gutiérrez Parra',
        rol: 'Estudiante de finanzas',
        tipo: 'El podcast que organicé en el Financial Trading Room del Tec.'
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
    playaPrograma: 'Ese día es parte del programa cuyo certificado está en «Certificaciones»: el 2026 Green Technology Programme, de BlueSky Education, en Singapur. La limpieza es la parte de servicio de ese mismo programa.',
    bloques: {
      animales: 'Los animalitos',
      playas: 'Limpieza de playa'
    }
  },

  exp: {
    lede: 'Qué, dónde, cuándo — solo el año. Este capítulo y el siguiente son los que un comité escanea.',
    ver: 'Ver mi experiencia',
    pista: '{n} renglones',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      { cuando: '2025', que: 'Sesión con Jon Maier, Chief ETF Strategist de J.P. Morgan Asset Management, en el Tec Santa Fe' },
      // ⚠️ Año en disputa: ver la nota larga en la tabla inglesa.
      { cuando: '2025', que: 'Fundador y presidente de la comunidad estudiantil de Smart Finance — visitas a la bolsa, pláticas, talleres, voluntariados, y la Feria de Grupos Estudiantiles del Tec' },
      { cuando: '2025', que: 'Asamblea General de la AEM — una de sus primeras conferencias de negocios y eventos de networking' },
      { cuando: '2025', que: 'Jasa Motor — tienda en línea y marketing de la refaccionaria de mi familia (capítulo 5)' },
      { cuando: '2025', que: 'smartfinance.lat — sitio bilingüe de educación financiera: lecciones, datos de mercado, glosario, boletín semanal' },
      { cuando: '2026', que: 'Visita a la University of Toronto y Rotman Commerce — el campus al que apunta esta solicitud' },
      { cuando: '2026', que: 'Singapur: programa de verano (Green Technology and Sustainable Ecology), presentación sobre México en la NUS, limpieza de playa, entrevistas' },
      { cuando: '2026', que: 'Visita a Concordia University, Montréal' },
      { cuando: '2026', que: 'Firma del acuerdo global CFA Institute × Tec de Monterrey — le pidió consejo a Marg Franklin sobre estudiar en Canadá' },
      { cuando: '2026', que: 'TikTok @smart.financee — videos cortos de educación financiera, y las conversaciones del capítulo 4' },
      { cuando: '2026', que: 'Reto Actinver — el calendario y la cartera del concurso están en el capítulo 6' }
    ]
  },

  certs: {
    lede: 'Los recibos. Nombre exacto, emisor, año e ID de la credencial, tal como los publica mi LinkedIn.',
    verLinkedIn: 'Verlo en LinkedIn',
    credencial: 'ID de la credencial',
    sinCred: 'Sin ID de credencial publicado',
    fotoPend: 'El diploma, cuando yo lo escanee: es el único de los siete sin imagen en mi LinkedIn.',
    // Los NOMBRES no se traducen: son el nombre propio del certificado, y es
    // lo que un comité va a buscar. Lo que sí va en español es todo lo demás.
    filas: [
      {
        que: 'Vista Equity Partners - Demystifying Private Equity Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a83e06078fe04cae6937a9e',
        img: 'cv-cert-vista.webp', w: 700, h: 495,
        alt: 'Certificado de Forage a nombre de Jaime Sandoval Ricaño por la simulación de trabajo de private equity de Vista Equity Partners, con los logotipos de Vista y de Forage.'
      },
      {
        que: 'Bank of America - Investment Banking Job Simulation',
        de: 'Forage', anio: '2026', cred: '6a80869baa694bdf898c2581',
        img: 'cv-cert-bofa.webp', w: 700, h: 495,
        alt: 'Certificado de Forage a nombre de Jaime Sandoval Ricaño por la simulación de trabajo de banca de inversión de Bank of America, con los logotipos de Bank of America y de Forage.'
      },
      {
        que: 'Investment Foundations® Certificate',
        de: 'CFA Institute', anio: '2026', cred: '191463283',
        img: 'cv-cert-cfa.webp', w: 700, h: 541,
        alt: 'Certificado del CFA Institute que otorga el Investment Foundations Certificate a Jaime Sandoval Ricano, con su fecha, su número de certificado y un código QR de verificación.'
      },
      {
        que: 'GREEN TECHNOLOGY PROGRAMME',
        de: 'BlueSky Education', anio: '2026', cred: '',
        img: 'cv-cert-green-tech.webp', w: 501, h: 700,
        alt: 'Certificado de BlueSky Education por el 2026 Green Technology Programme, celebrado en la Shaw Foundation Alumni House de Singapur, a nombre de Jaime Sandoval Ricaño.'
      },
      {
        que: 'Bloomberg Finance Fundamentals',
        de: 'Bloomberg', anio: '2026', cred: 'Xsgrm4LYnvGBWeskx8HpEut9',
        img: 'cv-cert-bloomberg.webp', w: 700, h: 497,
        alt: 'Certificado de Bloomberg for Education por el curso Bloomberg Finance Fundamentals, sobre fondo negro con gráficas de velas.'
      },
      {
        que: 'DELF A2',
        de: 'Alliance Française de Paris', anio: '2026', cred: '052535012100',
        img: '', w: 0, h: 0, alt: ''
      },
      {
        que: 'B2 First Certificate',
        de: 'Cambridge English', anio: '2024', cred: '814072MSJ',
        img: 'cv-cert-b2-cambridge.webp', w: 700, h: 662,
        alt: 'Certificado de Cambridge English que acredita que Jaime Sandoval Ricaño obtuvo Grade C en el First Certificate in English, nivel B2 del Consejo de Europa, con una puntuación global de 163.'
      }
    ]
  },

  cartas: {
    lede: 'Ya llegaron dos. Las cartas no se publican aquí: son documentos para comités de admisión. En esta página va la ficha, las dos frases que más pesan de cada una y el contacto que cada quien dio para preguntar por mí. Una de las cartas trae además un teléfono personal; ese no se publica.',
    entregadasH: 'Entregadas',
    faltanH: 'Las que faltan',
    // Las dos cartas están escritas en inglés: en este panel las citas van
    // TRADUCIDAS, y la marca lo dice, como con las frases de `voz.*`.
    citaTag: 'Las dos frases que más pesan, traducidas del inglés',
    contactoTag: 'Contacto que dio para preguntar por mí',
    entregadas: [
      {
        nombre: 'Lloyd George',
        cargo: 'CEO, TAQ Pte Ltd',
        donde: 'Singapur — biotecnología, gestión sanitaria y tecnologías verdes',
        relacion: 'Me dio clase dos semanas en el programa de Green Technology en Singapur, a través de la consultoría educativa BlueSky Education. Es el «Prof. Lloyd» que entrevisté en mi TikTok.',
        anio: '2026',
        citas: [
          'Dos semanas son poco tiempo, pero bastan para distinguir al estudiante que trabaja del estudiante que solo asiste. Jaime destacó desde el primer día.',
          'Lo que ya ha logrado sin apoyo institucional indica con claridad lo que logrará con él.'
        ],
        correo: 'Enquiries.TAQ@outlook.com'
      },
      {
        nombre: 'Andy Toh',
        cargo: 'CEO, BlueSky Education',
        donde: 'Singapur — la consultoría educativa que organiza el programa',
        relacion: 'Me observó durante mi programa de tres semanas en Singapur. Es el mismo Andy Toh que entrevisté y que ya aparece en este sitio.',
        anio: '2026',
        citas: [
          'Mientras muchos estudiantes pasaban los descansos conviviendo entre ellos, Jaime se acercaba y conversaba con los educadores, los responsables del programa y los profesionales de la industria que participaban en él.',
          'Su disposición a buscar oportunidades para aprender y mejorar continuamente refleja un grado de madurez y automotivación que, en mi opinión, le servirá extremadamente bien en la universidad.'
        ],
        correo: 'Andy.toh@bluesky-education.com'
      }
    ],
    tag: 'Falta la carta',
    campos: 'Nombre · cargo · relación · contacto',
    slots: [
      'Alguien que pueda responder por el grupo estudiantil y la prepa.',
      // «MI trabajo», no «su»: el panel español va en primera persona desde
      // el brief del 2026-08-27 y este renglón se había quedado en tercera.
      'Alguien que pueda responder por mi trabajo de educación financiera.'
    ],
    verificaH: 'Lo que las cartas verifican',
    verificaLede: 'Hasta que llegaron, lo de abajo era palabra mía. Ahora lo escribe y lo firma alguien de fuera de mi escuela y de mi familia.',
    // Los entrecomillados son la frase EXACTA de la carta, en inglés; el
    // resto va traducido.
    verifica: [
      { que: 'Fundé la organización estudiantil Smart Finance en mi campus.', quien: 'Lloyd George' },
      { que: 'Conduzco un podcast de educación financiera en el que entrevisto a ejecutivos de finanzas, emprendedores y profesores universitarios.', quien: 'Lloyd George' },
      { que: 'En Singapur organicé y conduje por mi cuenta las entrevistas con líderes de negocio y con estudiantes de Business Administration de la NUS — «entirely on his own steam».', quien: 'Lloyd George' },
      { que: 'Di mi tiempo a trabajo comunitario y ambiental en Singapur, «including a beach cleaning project during his stay».', quien: 'Lloyd George' },
      { que: 'Trabajo en español, inglés y francés.', quien: 'Lloyd George' },
      { que: 'En el Green Tech Youth Summit desarrollé un proyecto y lo presenté, y «performed particularly well in both his project and presentation».', quien: 'Andy Toh' }
    ],
    premio: {
      h: 'Un premio que nunca publiqué',
      que: 'Un premio en el GreenTech Summit 2026, con mi equipo, compitiendo contra estudiantes de Taiwán y Rusia.',
      tag: 'Única fuente: la carta de Lloyd George',
      nota: 'Esto no está en mi LinkedIn ni en mi TikTok — nunca lo publiqué. Está aquí porque lo escribió y lo firmó alguien más, y esta página lo dice en vez de hacerlo pasar por algo que yo publiqué.'
    },
    fuenteCarta: 'Fuente de tercero: la carta de {n}, en «{s}».'
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
    servirAnimales: ''
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
    peFuente: 'De mi publicación en LinkedIn sobre la simulación de Vista Equity Partners (2026). El «[…]» marca un trozo que esta página no reproduce.',
    peTag: 'Mi publicación está en inglés. Esto es una traducción; el original está en el panel en inglés.',
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
