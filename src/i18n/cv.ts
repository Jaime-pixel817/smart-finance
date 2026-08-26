// Textos EN/ES de "La mesa", el CV de /cv/<codigo>. Van aquí y no en ui.ts
// por el mismo motivo que src/i18n/cartera.ts y src/i18n/research.ts: son
// párrafos, no rótulos de interfaz. Los rótulos del botón de /about sí están
// en ui.ts (claves `cv.*`).
//
// ═══════════════════════════════════════════════════════════════════════════
// LÍMITE DE AUTORÍA — LO MÁS IMPORTANTE DE ESTE ARCHIVO
// ═══════════════════════════════════════════════════════════════════════════
// En este archivo NO hay una sola frase sobre Jaime que no estuviera ya
// publicada en el sitio. Ni un logro, ni una cifra suya, ni una nota, ni una
// universidad, ni una fecha de su vida. Lo único que se describe es la PÁGINA:
// qué va en cada hueco, de dónde sale cada número y qué significa.
//
// Lo suyo vive en el bloque `suyo`, y hoy está VACÍO a propósito. Cada cadena
// vacía se pinta como un hueco marcado (src/components/cv/Hueco.astro) con el
// rótulo de lo que falta; en cuanto Jaime escribe la frase, el hueco
// desaparece solo y sale su texto. No hay que tocar ningún componente.
//
// `const es: typeof en` obliga a que las dos tablas tengan LAS MISMAS CLAVES:
// si se añade un hueco en inglés y se olvida el español, TypeScript lo dice en
// el build. Lo que TypeScript no puede comprobar es que las dos estén
// escritas: un hueco lleno en español y vacío en inglés sale como hueco en la
// versión inglesa, que es justo lo que tiene que pasar (un CV a medio traducir
// no se disimula).
import type { Locale } from './routes';

const en = {
  // Lo que ve la pestaña del navegador. Sin el código dentro, obviamente.
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  // ---- Selector de idioma de la propia página ----
  // La página es UNA sola (un código = un archivo), así que los dos idiomas
  // viven en el mismo documento y se cambian sin JavaScript.
  lang: { en: 'English', es: 'Español', aria: 'Language of this page' },

  // ---- Marca de hueco ----
  hueco: {
    tag: 'To write',
    note: 'Jaime writes this, in his own words. Nothing on this page is generated for him.'
  },

  // ---- Cabecera ----
  head: {
    eyebrow: 'Curriculum vitae',
    name: 'Jaime Sandoval Ricaño',
    site: 'smartfinance.lat',
    // Lo único que la cabecera afirma por su cuenta, y es verdad comprobable:
    // esta página corre sobre el mismo código que el sitio público.
    note: 'This page runs on the same code as the public site: the same endpoints, the same source chips, the same delays. Nothing on it is a screenshot.',
    backLabel: 'Open the site'
  },

  // ---- La cinta ----
  tape: {
    h: 'The tape',
    lede: 'Three of the assets the site follows, asked for when this page opens.',
    // Nunca "en vivo": cadencia real, como en todo el sitio.
    note: 'Prices come from the site’s own endpoint, which reads Yahoo Finance and caches it. They are delayed, and the chip says by how much. They update when you open or reload this page, not continuously.',
    fail: 'If the endpoint does not answer, the prices stay as dashes and the chip says so. No figure on this page is typed in by hand.',
    price: 'Price',
    change: 'Change today',
    pending: '—',
    open: 'Open the asset page'
  },

  // ---- La cartera ----
  book: {
    h: 'My portfolio',
    lede: 'The positions I publish with my own money, each with the reason I opened it. The full page has the thesis and the risk of every one.',
    link: 'Open the full portfolio',
    value: 'Portfolio value',
    change: 'Change since the start',
    positions: 'Positions',
    trades: 'Trades',
    chartAria: 'Portfolio value, one point per trading day',
    snapshot: 'Figures at the close of {date}, from the snapshot written into the repository after each trading day.',
    empty: 'No positions published yet. This block fills itself from the same file the public portfolio page reads — there is nothing to type in here.',
    emptyWhere: 'The file: src/data/portfolio.json'
  },

  // ---- Reto Actinver ----
  reto: {
    h: 'Actinver Challenge',
    lede: 'A student stock-market contest played with fictional money, run on the Mexican exchange. The dates below are the published calendar of the edition.',
    // Fechas, no frases sobre HOY: esta página es estática y puede pasar meses
    // sin desplegarse. Qué fase corre hoy se calcula con la fecha del navegador
    // en /research, y ahí es donde se enlaza (ver el comentario de Mesa.astro).
    calH: 'The calendar',
    linkPhase: 'Where the challenge stands today',
    linkMine: 'My contest portfolio',
    cal: {
      inscripciones: 'Registration',
      // "Practice round" era el único sitio del repo que le llamaba "round":
      // src/i18n/research.ts dice "Practice week" en las seis fases, y el
      // calendario publicado son cinco días (28 sep – 2 oct). Un comité que
      // abra las dos páginas no puede leer dos nombres del mismo tramo.
      practica: 'Practice week',
      reto: 'The contest itself',
      premiacion: 'Prize-giving'
    },
    source: 'Calendar taken from retoactinver.com on {d}. Smart Finance is not affiliated with Actinver.'
  },

  // ---- Equity research ----
  research: {
    h: 'Equity research',
    lede: 'Analyst-style reports with every figure traced to the filing it came from. The published one is below, with the state it is actually in.',
    link: 'Open the report',
    hubLink: 'All of Smart Finance Projects',
    ticker: 'Ticker',
    dataAsOf: 'Data as of',
    version: 'Version',
    status: 'Status',
    years: 'Fiscal years verified',
    statusLabel: { draft: 'Draft', review: 'In review', published: 'Published', none: 'Not started' } as Record<string, string>
  },

  // ---- Cierre ----
  close: {
    h: 'One last thing',
    contactH: 'Where to find me',
    about: 'About me',
    methodology: 'How the site works',
    repo: 'The code, on GitHub',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok'
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
      que: 'Who I am',
      pista: 'Two or three sentences. No adjective that something further down this page cannot back up.'
    },
    carteraNota: {
      que: 'How I run the portfolio',
      pista: 'What you decide before buying, and what makes you sell. Written by you, not a description of the software.'
    },
    retoNota: {
      que: 'What I want out of the contest',
      pista: 'Why you entered and what you would count as having gone well — written before the result, so it is worth something afterwards.'
    },
    researchNota: {
      que: 'What building the report taught me',
      pista: 'The part that was harder than you expected, in one short paragraph.'
    },
    cierre: {
      que: 'Why this page exists',
      pista: 'Close it yourself: what you are asking for and what you would do with it.'
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
    carteraNota: '',
    retoNota: '',
    researchNota: '',
    cierre: ''
  }
};

const es: typeof en = {
  docTitle: 'Jaime Sandoval Ricaño — Smart Finance',

  lang: { en: 'English', es: 'Español', aria: 'Idioma de esta página' },

  hueco: {
    tag: 'Falta escribirlo',
    // "se genera por él" decía lo CONTRARIO del inglés: se lee como "generado
    // POR él", que es justo lo que esta frase promete que no pasa. Y es la
    // única frase que explica qué son los huecos, en la primera pantalla del
    // panel español. "en su lugar" = "for him", sin ninguna lectura de agente.
    note: 'Esto lo escribe Jaime, con sus palabras. Nada de esta página se genera en su lugar.'
  },

  head: {
    eyebrow: 'Currículum',
    name: 'Jaime Sandoval Ricaño',
    site: 'smartfinance.lat',
    note: 'Esta página corre sobre el mismo código que el sitio público: los mismos endpoints, los mismos chips de fuente, los mismos retrasos. Nada de lo que hay aquí es una captura.',
    backLabel: 'Abrir el sitio'
  },

  tape: {
    h: 'La cinta',
    lede: 'Tres de los activos que sigue el sitio, pedidos al abrir esta página.',
    note: 'Los precios salen del endpoint del propio sitio, que lee Yahoo Finance y lo cachea. Llegan con retraso, y el chip dice cuánto. Se actualizan al abrir o recargar esta página, no continuamente.',
    fail: 'Si el endpoint no contesta, los precios se quedan en rayas y el chip lo dice. Ninguna cifra de esta página está escrita a mano.',
    price: 'Precio',
    change: 'Cambio de hoy',
    pending: '—',
    open: 'Abrir la ficha del activo'
  },

  book: {
    h: 'Mi cartera',
    lede: 'Las posiciones que publico con mi propio dinero, cada una con la razón por la que la abrí. La página completa lleva la tesis y el riesgo de todas.',
    link: 'Abrir la cartera completa',
    value: 'Valor de la cartera',
    change: 'Cambio desde el inicio',
    positions: 'Posiciones',
    trades: 'Operaciones',
    chartAria: 'Valor de la cartera, un punto por día hábil',
    snapshot: 'Cifras al cierre del {date}, de la foto que se escribe en el repositorio después de cada día hábil.',
    empty: 'Todavía no hay posiciones publicadas. Este bloque se llena solo desde el mismo archivo que lee la página pública de la cartera — aquí no hay nada que teclear.',
    emptyWhere: 'El archivo: src/data/portfolio.json'
  },

  reto: {
    h: 'Reto Actinver',
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
    source: 'Calendario tomado de retoactinver.com el {d}. Smart Finance no está afiliado a Actinver.'
  },

  research: {
    h: 'Equity research',
    lede: 'Reportes tipo analista con cada cifra rastreada hasta el documento del que sale. El publicado está abajo, con el estado en el que de verdad está.',
    link: 'Abrir el reporte',
    // "Todo Smart Finance Projects" no es español: falta el nexo. El nombre
    // de la sección NO se traduce (el h1 de /es/research es literalmente
    // "Smart Finance Projects", ver src/i18n/research.ts), así que lo que se
    // arregla es la gramática de alrededor, no el nombre propio — cambiarlo
    // por "Proyectos" nombraría algo que la página de destino no se llama.
    hubLink: 'Todo lo de Smart Finance Projects',
    ticker: 'Ticker',
    dataAsOf: 'Datos al',
    version: 'Versión',
    status: 'Estado',
    years: 'Años fiscales verificados',
    statusLabel: { draft: 'Borrador', review: 'En revisión', published: 'Publicado', none: 'Sin empezar' } as Record<string, string>
  },

  close: {
    h: 'Una última cosa',
    contactH: 'Dónde encontrarme',
    about: 'Sobre mí',
    methodology: 'Cómo funciona el sitio',
    repo: 'El código, en GitHub',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok'
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
      que: 'Quién soy',
      pista: 'Dos o tres frases. Ni un adjetivo que algo más abajo de esta página no pueda respaldar.'
    },
    carteraNota: {
      que: 'Cómo llevo la cartera',
      pista: 'Qué decides antes de comprar y qué te hace vender. Escrito por ti, no una descripción del software.'
    },
    retoNota: {
      que: 'Qué quiero sacar del reto',
      pista: 'Por qué entraste y qué contarías como que salió bien — escrito antes del resultado, que es lo que hace que valga algo después.'
    },
    researchNota: {
      que: 'Qué aprendí haciendo el reporte',
      pista: 'La parte que costó más de lo que esperabas, en un párrafo corto.'
    },
    cierre: {
      que: 'Por qué existe esta página',
      pista: 'Ciérrala tú: qué estás pidiendo y qué harías con ello.'
    }
  },

  suyo: {
    aplicaA: '',
    linea: '',
    quienSoy: '',
    carteraNota: '',
    retoNota: '',
    researchNota: '',
    cierre: ''
  }
};

export type CvCopy = typeof en;
/** Clave de un hueco: sirve para que <Hueco id="..."> no admita inventos. */
export type CvHueco = keyof CvCopy['huecos'] & keyof CvCopy['suyo'];

export const cv: Record<Locale, CvCopy> = { en, es };
export function useCv(locale: Locale): CvCopy { return cv[locale]; }
