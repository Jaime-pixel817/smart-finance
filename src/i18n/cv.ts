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
    lloyd: 'A portrait of Prof. Lloyd — or a frame from the interview clip.',
    playas: 'The beach clean-ups.'
  },
  // Marca de clip pendiente (los marcos de vídeo del capítulo 6).
  clip: {
    tag: 'Clip to come',
    pista: 'The clip will be served from this domain, never embedded. Until then, the poster and the link to the original.',
    ver: 'Watch on TikTok'
  },

  // ---- Índice y meta de la portada ----
  indice: {
    resumen: '11 chapters · about 6 minutes',
    ver: 'See the index',
    aria: 'Chapters of this page'
  },

  // ---- Títulos de capítulo (el 1 es el nombre; el 11 es la frase) ----
  caps: {
    c1: 'A hungry kid',
    c2: 'What is already standing',
    c3: 'Where the hunger comes from',
    c4: 'What I want to do',
    c5: 'Reto Actinver',
    c6: 'Teaching is half the work',
    c7: 'Everyone brings something',
    c8: 'Serving',
    c9: 'Experience',
    c10: 'Certifications',
    c11: 'The sentence'
  },

  // ---- Capítulo 1: portada ----
  head: {
    eyebrow: 'Curriculum vitae',
    name: 'Jaime Sandoval Ricaño',
    site: 'smartfinance.lat',
    // Su meta, dicha por él (texto de Jaime, pendiente de su revisión final):
    // programas de negocios en Canadá, entrada septiembre de 2027.
    meta: 'Business programs in Canada · September 2027 entry',
    fotoAlt: 'Jaime Sandoval Ricaño'
  },

  // ---- Capítulo 2: la prueba ----
  prueba: {
    // Lo único que este capítulo afirma por su cuenta, y es comprobable:
    // la página corre sobre el mismo código que el sitio público.
    lede: 'smartfinance.lat is a bilingual financial-education site, and this page runs on its same code: the same endpoints, the same source chips, the same delays. The prices below are asked for when you open this page. Nothing here is a screenshot.',
    // Las cifras de al lado se CUENTAN en el build desde los archivos reales
    // del repo (Historia.astro); estos son solo sus rótulos.
    stats: {
      lecciones: 'lessons, each written in English and Spanish',
      fuentes: 'primary sources cited across those lessons',
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

  // ---- Capítulo 4: research ----
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

  // ---- Capítulo 6: TikTok ----
  tiktok: {
    perfil: '@smart.financee, on TikTok',
    // La línea que conecta los clips con las lecciones del sitio.
    nota: 'The clips and the site’s lessons are the same work in two formats: the same sources, a different length.',
    videos: {
      andy: 'Interview: Andy Toh, CEO of Blue Sky Education — a summer programme in Singapore',
      japon: 'Financial data from Japan',
      singapur: 'Financial data from Singapore — “why the world’s money lives here”',
      skills: 'The skills for a top-8 university in the world'
    },
    // El arco de Singapur, con fechas. Las fechas son las de subida de cada
    // vídeo en @smart.financee: verificables abriendo el perfil.
    arcoH: 'The Singapore arc',
    arco: [
      { cuando: 'Jun–Jul 2026', que: 'Summer programme in Singapore' },
      { cuando: 'Jun 20 · 24', que: 'Financial-data videos: Japan and Singapore' },
      { cuando: 'Jul 2', que: 'Presentation about Mexico to National University of Singapore students' },
      { cuando: 'Jul 15 · 26', que: 'Interviews: Andy Toh (CEO, Blue Sky Education) and Prof. Lloyd (NUS)' }
    ],
    arcoFuente: 'The dates are the upload dates of each video on @smart.financee.'
  },

  // ---- Capítulo 7: la gente ----
  // CADA ROL LLEVA FUENTE Y EL QUE NO LA TIENE SE QUEDA VACÍO. `tipo` dice qué
  // fue el encuentro cuando llamarlo "entrevista" sería falso; vacío = una
  // conversación suya, que es lo que dice el material.
  // · Andy Toh, «CEO, Blue Sky Education» — el título de su propia entrevista
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
  // OJO CON LA GRAFÍA de Blue Sky Education: aquí va «Blue Sky» (dos
  // palabras), que es como lo escribió Jaime en el TikTok de la entrevista.
  // El resto del sitio lo escribe «BlueSky» (src/i18n/ui.ts) y «Bluesky»
  // (About.astro): tres grafías para el nombre de una empresa ajena. Cuál es
  // la buena lo dice Jaime, y entonces se unifican los tres sitios de una vez.
  entrevistas: {
    verVideo: 'Watch the conversation on TikTok',
    personas: {
      andy: { nombre: 'Andy Toh', rol: 'CEO, Blue Sky Education', tipo: '' },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'A session I attended, not an interview of mine — “Takeaways from JPMorgan’s Chief ETF Strategist”, as the site puts it.'
      },
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: '“A conversation with Moris Dieck”, in the site’s own words.' },
      podcast: { nombre: 'Financial Trading Room', rol: 'Podcast', tipo: '' },
      lloyd: { nombre: 'Prof. Lloyd', rol: 'National University of Singapore', tipo: '' },
      raul: { nombre: 'Raúl Irabién', rol: 'President of Student Groups', tipo: '' }
    }
  },

  // ---- Capítulo 8: servir ----
  servir: {
    // Hecho publicado en el sitio (/community, src/i18n/ui.ts `community.desc`).
    comunidad: 'The student group I founded and lead: trips to the Mexican stock exchange, finance talks and workshops, and volunteering for our community and the environment.',
    comunidadLink: 'The community, on the site',
    grupoAlt: 'The Smart Finance student group, in front of the group’s banner',
    // El clip del voluntariado con animales: existe, con fecha, en su TikTok.
    animalesClip: 'The clip: animal care and responsible adoption (August 23, 2026).',
    bloques: {
      comunidad: 'My community',
      animales: 'The animals',
      playas: 'Beach clean-ups'
    }
  },

  // ---- Capítulo 9: experiencias (en seco) ----
  exp: {
    lede: 'What, where, when. This chapter and the next are the ones a committee scans.',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      { cuando: '2026', que: 'smartfinance.lat — bilingual financial-education site: lessons, market data, glossary, weekly newsletter' },
      { cuando: '2026', que: 'Founder and president of the Smart Finance student community — stock-exchange visits, talks, workshops, volunteering' },
      { cuando: 'Jun–Jul 2026', que: 'Singapore: summer programme, presentation about Mexico to National University of Singapore students, interviews' },
      { cuando: 'Aug 2026', que: 'Student Groups Fair at Tec de Monterrey, with the Smart Finance group' },
      // Jon Maier va en su PROPIA fila y no en la de las conversaciones: la
      // sesión de J.P. Morgan fue algo a lo que Jaime asistió (ver el bloque
      // `entrevistas` de arriba), y meterlo en la lista de entrevistas era
      // convertir un asiento en el público en una entrevista suya.
      { cuando: '2026', que: 'Conversations: Andy Toh, Moris Dieck, Prof. Lloyd, Raúl Irabién, and the Financial Trading Room podcast' },
      { cuando: '2026', que: 'Attended the session with Jon Maier, Chief ETF Strategist at J.P. Morgan Asset Management' },
      { cuando: '2026', que: 'TikTok @smart.financee — short financial-education videos' },
      { cuando: '2026', que: 'Reto Actinver — the calendar and the contest portfolio are in chapter 5' }
    ]
  },

  // ---- Capítulo 10: certificaciones ----
  certs: {
    lede: 'The receipts. Exact name, institution, and the verification link when it exists.',
    // Nombres tal cual los publica su LinkedIn. Fecha y enlace de verificación
    // los trae Jaime; hasta entonces la columna dice que faltan.
    pendiente: 'date and verification link to come',
    filas: [
      { que: 'Bloomberg Finance Fundamentals', de: 'Bloomberg' },
      { que: 'Investment Foundations® Certificate', de: 'CFA Institute' },
      { que: 'Demystifying Private Equity — Job Simulation', de: 'Vista Equity Partners, on Forage' },
      { que: 'Investment Banking Virtual Experience', de: 'Bank of America, on Forage' },
      { que: 'B2 First Certificate', de: 'Cambridge English' },
      { que: 'Green Technology Programme', de: '' }
    ]
  },

  // ---- Capítulo 11: la frase ----
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
  contacto: {
    h: 'Where to find me',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    repo: 'The code, on GitHub',
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
    aplicaA: {
      que: 'What I am applying to',
      pista: 'One line: the university, the programme and the intake. Nothing else fits here.'
    },
    linea: {
      que: 'The one line',
      pista: 'One sentence — the thing you want them to remember after they close the tab.'
    },
    quienSoy: {
      que: 'Where it started',
      pista: 'Three to five sentences: where the hunger comes from, and what happened exactly. The shortest chapter, and the one they remember.'
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
    aplicaA: '',
    linea: '',
    quienSoy: '',
    retoNota: '',
    researchNota: '',
    tiktokNota: '',
    entrevistaAndy: '',
    entrevistaMaier: '',
    entrevistaDieck: '',
    entrevistaPodcast: '',
    entrevistaLloyd: '',
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
    // Palabras de Jaime, VERBATIM, de su publicación en LinkedIn sobre la
    // simulación de Vista Equity Partners (2026-08, urn 7495934696430764032).
    // En inglés en el original: aquí no hay traducción que revisar.
    //
    // LA CITA LLEGA HASTA DONDE TERMINA LA IDEA, Y EL RECORTE SE VE. Antes
    // cortaba en «Rule of 40 framework.» con punto final, y ese punto no
    // estaba en el post: se leía como el final de su frase cuando el post
    // seguía. Ahora va la idea entera —del 10-K al resumen de méritos contra
    // riesgos— y lo que falta en medio lleva su «[…]» dentro de las comillas.
    // Lo omitido es lo que la captura de la evidencia no traía
    // (cv-clips/EVIDENCIA-LINKEDIN-TIKTOK.md), no una elección de estilo.
    pe: '“This program put me in the shoes of a Private Equity Summer Analyst evaluating Workday as a potential investment. I built a GAAP-compliant income statement from Workday’s 10-K using Vista’s modeling standards, then applied the Rule of 40 framework […] I synthesized my findings into an Investment Merits vs. Risks & Considerations summary, just like I’d present to a deal team ahead of a full diligence decision.”',
    peFuente: 'From his LinkedIn post on the Vista Equity Partners job simulation, August 2026. The “[…]” marks a passage this page does not reproduce.',
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
    servir: '“Helping my community, the animals, and cleaning up beaches.”'
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
    lloyd: 'Un retrato del profesor Lloyd — o un cuadro del clip de la entrevista.',
    playas: 'Las limpiezas de playa.'
  },
  clip: {
    tag: 'Falta el clip',
    pista: 'El clip se servirá desde este dominio, nunca incrustado. Mientras tanto, el póster y el enlace al original.',
    ver: 'Ver en TikTok'
  },

  indice: {
    resumen: '11 capítulos · unos 6 minutos',
    ver: 'Ver el índice',
    aria: 'Capítulos de esta página'
  },

  caps: {
    c1: 'Un niño con hambre',
    c2: 'Lo que ya está de pie',
    c3: 'De dónde viene el hambre',
    c4: 'A lo que me quiero dedicar',
    c5: 'Reto Actinver',
    c6: 'Enseñar es la mitad del trabajo',
    c7: 'Cada quien trae algo',
    c8: 'Servir',
    c9: 'Experiencias',
    c10: 'Certificaciones',
    c11: 'La frase'
  },

  head: {
    eyebrow: 'Currículum',
    name: 'Jaime Sandoval Ricaño',
    site: 'smartfinance.lat',
    // texto de Jaime, pendiente de su revisión final
    meta: 'Programas de negocios en Canadá · entrada septiembre 2027',
    fotoAlt: 'Jaime Sandoval Ricaño'
  },

  prueba: {
    lede: 'smartfinance.lat es un sitio bilingüe de educación financiera, y esta página corre sobre su mismo código: los mismos endpoints, los mismos chips de fuente, los mismos retrasos. Los precios de abajo se piden al abrir esta página. Nada de lo que hay aquí es una captura.',
    stats: {
      lecciones: 'lecciones, cada una escrita en inglés y en español',
      fuentes: 'fuentes primarias citadas en esas lecciones',
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
    videos: {
      andy: 'Entrevista: Andy Toh, CEO de Blue Sky Education — un programa de verano en Singapur',
      japon: 'Datos financieros de Japón',
      singapur: 'Datos financieros de Singapur — «por qué aquí vive el dinero del mundo»',
      skills: 'Los skills para una universidad top 8 mundial'
    },
    arcoH: 'El arco de Singapur',
    arco: [
      { cuando: 'Jun–jul 2026', que: 'Programa de verano en Singapur' },
      { cuando: '20 · 24 jun', que: 'Vídeos de datos financieros: Japón y Singapur' },
      { cuando: '2 jul', que: 'Presentación sobre México a estudiantes de la National University of Singapore' },
      { cuando: '15 · 26 jul', que: 'Entrevistas: Andy Toh (CEO, Blue Sky Education) y el profesor Lloyd (NUS)' }
    ],
    arcoFuente: 'Las fechas son las de subida de cada vídeo en @smart.financee.'
  },

  entrevistas: {
    verVideo: 'Ver la conversación en TikTok',
    personas: {
      andy: { nombre: 'Andy Toh', rol: 'CEO, Blue Sky Education', tipo: '' },
      maier: {
        nombre: 'Jon Maier',
        rol: 'Chief ETF Strategist, J.P. Morgan Asset Management',
        tipo: 'Una sesión a la que asistí, no una entrevista mía — «Lo que dejó el Chief ETF Strategist de J.P. Morgan», como lo publica el sitio.'
      },
      dieck: { nombre: 'Moris Dieck', rol: '', tipo: '«Una conversación con Moris Dieck», con las palabras del propio sitio.' },
      podcast: { nombre: 'Financial Trading Room', rol: 'Podcast', tipo: '' },
      lloyd: { nombre: 'Profesor Lloyd', rol: 'National University of Singapore', tipo: '' },
      raul: { nombre: 'Raúl Irabién', rol: 'Presidente de Grupos Estudiantiles', tipo: '' }
    }
  },

  servir: {
    comunidad: 'El grupo estudiantil que fundé y presido: visitas a la Bolsa Mexicana de Valores, pláticas y talleres de finanzas, y voluntariados por la comunidad y el medio ambiente.',
    comunidadLink: 'La comunidad, en el sitio',
    grupoAlt: 'El grupo estudiantil de Smart Finance, delante del cartel del grupo',
    animalesClip: 'El clip: cuidado animal y adopción responsable (23 de agosto de 2026).',
    bloques: {
      comunidad: 'Mi comunidad',
      animales: 'Los animalitos',
      playas: 'Limpieza de playas'
    }
  },

  exp: {
    lede: 'Qué, dónde, cuándo. Este capítulo y el siguiente son los que un comité escanea.',
    filas: [
      { cuando: '2024–2027', que: 'Tec de Monterrey, Prepa Tec CEM — High School Diploma, Multicultural Program, Finance & Business' },
      { cuando: '2026', que: 'smartfinance.lat — sitio bilingüe de educación financiera: lecciones, datos de mercado, glosario, boletín semanal' },
      { cuando: '2026', que: 'Fundador y presidente de la comunidad estudiantil de Smart Finance — visitas a la bolsa, pláticas, talleres, voluntariados' },
      { cuando: 'Jun–jul 2026', que: 'Singapur: programa de verano, presentación sobre México a estudiantes de la National University of Singapore, entrevistas' },
      { cuando: 'Ago 2026', que: 'Feria de Grupos Estudiantiles del Tec de Monterrey, con el grupo Smart Finance' },
      { cuando: '2026', que: 'Conversaciones: Andy Toh, Moris Dieck, el profesor Lloyd, Raúl Irabién y el podcast del Financial Trading Room' },
      { cuando: '2026', que: 'Asistencia a la sesión con Jon Maier, Chief ETF Strategist de J.P. Morgan Asset Management' },
      { cuando: '2026', que: 'TikTok @smart.financee — videos cortos de educación financiera' },
      { cuando: '2026', que: 'Reto Actinver — el calendario y la cartera del concurso están en el capítulo 5' }
    ]
  },

  certs: {
    lede: 'Los recibos. Nombre exacto, institución, y el enlace de verificación cuando exista.',
    pendiente: 'fecha y enlace de verificación por llegar',
    filas: [
      { que: 'Bloomberg Finance Fundamentals', de: 'Bloomberg' },
      { que: 'Investment Foundations® Certificate', de: 'CFA Institute' },
      { que: 'Demystifying Private Equity — Job Simulation', de: 'Vista Equity Partners, en Forage' },
      { que: 'Investment Banking Virtual Experience', de: 'Bank of America, en Forage' },
      { que: 'B2 First Certificate', de: 'Cambridge English' },
      { que: 'Green Technology Programme', de: '' }
    ]
  },

  frase: {
    texto: 'Si la vida destruye tus planes, es porque tus planes te pueden destruir a ti. Haz tu mejor esfuerzo siempre, y los resultados se darán, y si no, es porque te pudieron haber destruido a ti.',
    traduccion: '“If life destroys your plans, it is because your plans could destroy you. Always do your best, and the results will come — and if they don’t, it is because they could have destroyed you.”',
    traduccionTag: 'His words, in Spanish. In English:'
  },

  contacto: {
    h: 'Dónde encontrarme',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    repo: 'El código, en GitHub',
    site: 'smartfinance.lat'
  },

  disc: {
    h: 'Educativo, no asesoría',
    p: 'Smart Finance es el proyecto de un estudiante. Todo lo de esta página se publica con fines educativos y no es asesoría financiera, de inversión ni fiscal, ni una recomendación de comprar o vender nada. Los datos de mercado llegan con retraso y vienen de terceros; verifícalos en la fuente antes de decidir cualquier cosa.'
  },

  huecos: {
    aplicaA: {
      que: 'A qué estoy aplicando',
      pista: 'Una línea: la universidad, el programa y la generación. Aquí no cabe nada más.'
    },
    linea: {
      que: 'La línea',
      pista: 'Una frase — lo que quieres que recuerden después de cerrar la pestaña.'
    },
    quienSoy: {
      que: 'Dónde empezó',
      pista: 'De tres a cinco frases: de dónde viene el hambre, y qué pasó exactamente. El capítulo más corto, y el que más se recuerda.'
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
    aplicaA: '',
    linea: '',
    quienSoy: '',
    retoNota: '',
    researchNota: '',
    tiktokNota: '',
    entrevistaAndy: '',
    entrevistaMaier: '',
    entrevistaDieck: '',
    entrevistaPodcast: '',
    entrevistaLloyd: '',
    entrevistaRaul: '',
    servirAnimales: '',
    servirPlayas: ''
  },

  voz: {
    // Palabras de Jaime en LinkedIn, en inglés en el original. Esta versión es
    // TRADUCCIÓN para el panel español, pendiente de su revisión final — y
    // ahora lo DICE en pantalla (`peTag`), porque unas comillas atribuidas a
    // su post sin más se leen como sus palabras exactas y el post está en
    // inglés. El «[…]» marca el trozo que esta página no reproduce.
    pe: '«Este programa me puso en los zapatos de un analista de verano de private equity evaluando Workday como posible inversión. Construí un estado de resultados conforme a GAAP desde el 10-K de Workday con los estándares de modelado de Vista, y después apliqué el marco de la Rule of 40 […] Sinteticé lo que encontré en un resumen de méritos de inversión frente a riesgos y consideraciones, igual que se lo presentaría a un equipo de operaciones antes de una decisión de diligencia completa.»',
    peFuente: 'De su publicación en LinkedIn sobre la simulación de Vista Equity Partners, agosto de 2026. El «[…]» marca un trozo que esta página no reproduce.',
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
    servir: '«Ayudar a mi comunidad, a los animalitos, y limpieza de playas.»'
  }
};

export type CvCopy = typeof en;
/** Clave de un hueco: sirve para que <Hueco id="..."> no admita inventos. */
export type CvHueco = keyof CvCopy['huecos'] & keyof CvCopy['suyo'];

export const cv: Record<Locale, CvCopy> = { en, es };
export function useCv(locale: Locale): CvCopy { return cv[locale]; }
