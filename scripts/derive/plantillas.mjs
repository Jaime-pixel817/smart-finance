/*
 * Los borradores: de una pieza a LinkedIn, cinco guiones de TikTok, el carrusel
 * de Instagram, el número del boletín y el checklist de publicación.
 *
 * LA REGLA DE ESCRITURA
 * ---------------------
 * Todo lo que lleva una cifra se COPIA de la pieza, frase entera, sin
 * reescribir. Lo único que pone este archivo son las costuras (los rótulos, el
 * disclosure, el CTA), y las costuras no llevan números. Así la guardia de
 * cifras (cifras.mjs) no es un filtro que haya que ir esquivando: comprueba
 * algo que ya es cierto por construcción, y salta el día que alguien edite un
 * borrador a mano y se le vaya un número.
 *
 * Por eso tampoco hay números en los rótulos: los bloques del boletín no son
 * "Bloque 1", los guiones no llevan su número dentro (lo lleva el nombre del
 * archivo) y las marcas de tiempo de los planos van con la forma exacta que la
 * guardia conoce (`**0–3 s · Gancho**`).
 *
 * REPARTIR, NO REPETIR
 * --------------------
 * Cinco guiones sacados de la misma lección se parecen demasiado si cada uno
 * coge las primeras frases. Cada guion arranca en una sección distinta de la
 * pieza (`desde`) y se lleva su propio hecho, así que los cinco cuentan cosas
 * distintas del mismo texto.
 *
 * ESTO SON BORRADORES. Jaime graba, ajusta el tono y publica. Nada de aquí sale
 * solo: es la misma promesa que /news (ningún texto de IA se publica sin que
 * una persona lo apruebe).
 */

const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

/** "2026-08-21" → "21 de agosto de 2026" / "21 August 2026". */
export function fechaLarga(iso, loc) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const [, a, mm, d] = m;
  return loc === 'es'
    ? `${Number(d)} de ${MESES.es[Number(mm) - 1]} de ${a}`
    : `${Number(d)} ${MESES.en[Number(mm) - 1]} ${a}`;
}

const T = {
  es: {
    post: 'El post', imagen: 'Imagen', notas: 'Notas antes de publicar',
    enlace: 'Lo escribí completo aquí',
    disclosure: 'Análisis educativo, no es una recomendación.',
    datosAl: 'Datos verificados al',
    fuentes: 'Fuentes',
    ia: 'Cómo se hizo: la IA me ayuda a ordenar datos y a preparar borradores; los ejemplos, la tesis y la revisión final son míos.',
    iaNoticia: 'Cómo se hizo: el resumen lo redactó una IA y lo revisé yo antes de que saliera en el sitio.',
    kPortada: 'Lección', kIdea: 'Idea', kDato: 'El dato', kCierre: 'Cierre',
    cta: 'La lección completa está en smartfinance.lat',
    ctaNoticia: 'La noticia explicada está en smartfinance.lat',
    ctaResearch: 'El reporte completo está en smartfinance.lat',
    disclaimerCorto: 'Educativo, no es recomendación de inversión.',
    enPantalla: 'En pantalla', dice: 'Jaime dice',
    fuenteEnPantalla: 'Fuente en pantalla', broll: 'B-roll', antesDeGrabar: 'Antes de grabar',
    guionDe: 'uno de cinco', sinCifra: 'esta pieza no trae ninguna frase con cifra: el plano va sin número',
    idea: 'La idea', dato: 'El dato', giro: 'Lo que casi nadie ve', cierre: 'Cierre', gancho: 'Gancho',
    asunto: 'Asunto', preheader: 'Preheader',
    bloquePorQue: 'Por qué esto, esta semana', bloqueNumeros: 'Los números, tal como están en la pieza', bloqueSigue: 'Qué sigue',
    antesDeEnviar: 'Antes de enviar'
  },
  en: {
    post: 'The post', imagen: 'Image', notas: 'Before posting',
    enlace: 'I wrote the whole thing here',
    disclosure: 'Educational analysis, not a recommendation.',
    datosAl: 'Data verified as of',
    fuentes: 'Sources',
    ia: 'How it was made: AI helps me organise data and draft; the examples, the thesis and the final read are mine.',
    iaNoticia: 'How it was made: an AI drafted the summary and I reviewed it before it went on the site.',
    kPortada: 'Lesson', kIdea: 'Idea', kDato: 'The figure', kCierre: 'Closing',
    cta: 'The full lesson is on smartfinance.lat',
    ctaNoticia: 'The news, explained, is on smartfinance.lat',
    ctaResearch: 'The full report is on smartfinance.lat',
    disclaimerCorto: 'Educational, not investment advice.',
    enPantalla: 'On screen', dice: 'Jaime says',
    fuenteEnPantalla: 'Source on screen', broll: 'B-roll', antesDeGrabar: 'Before filming',
    guionDe: 'one of five', sinCifra: 'this piece has no sentence with a figure: this beat runs without a number',
    idea: 'The idea', dato: 'The figure', giro: 'What almost nobody sees', cierre: 'Close', gancho: 'Hook',
    asunto: 'Subject', preheader: 'Preheader',
    bloquePorQue: 'Why this, this week', bloqueNumeros: 'The numbers, exactly as the piece has them', bloqueSigue: 'What comes next',
    antesDeEnviar: 'Before sending'
  }
};

const KICKER = { portada: 'kPortada', idea: 'kIdea', dato: 'kDato', cierre: 'kCierre' };

/** Los cinco ángulos de TikTok, por tipo de pieza. */
const ANGULOS = {
  leccion: {
    es: ['El gancho', 'El número', 'Cómo funciona', 'El error que casi todos cometen', 'Lo que yo hago'],
    en: ['The hook', 'The number', 'How it works', 'The mistake almost everyone makes', 'What I actually do']
  },
  noticia: {
    es: ['Qué pasó', 'El dato', 'Por qué te importa', 'Lo que la nota NO dice', 'Qué voy a mirar'],
    en: ['What happened', 'The figure', 'Why it matters to you', 'What the story does NOT say', 'What I will watch']
  },
  research: {
    es: ['La empresa, explicada', 'Qué pasó', 'Los números', 'La valuación', 'Mi tesis'],
    en: ['The company, explained', 'What happened', 'Financial performance', 'Valuation', 'My thesis']
  }
};

const ARCHIVOS_TIKTOK = ['01.md', '02.md', '03.md', '04.md', '05.md'];

const limpia = (f) => String(f).replace(/\s+/g, ' ').trim();
const primeraFrase = (t) => limpia(String(t).split(/(?<=[.!?])\s+/)[0] || t);
const numerosEn = (f) => (String(f).match(/\d[\d.,]*/g) || []).join('|');

function recorte(s, n) {
  const t = limpia(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * Hasta n frases con cifra, sin repetir números y repartidas por secciones.
 * Se prefieren las frases con cuerpo: "Mete 10,000 pesos al 10% anual" es el
 * planteamiento, no el hallazgo, y sola no dice nada.
 */
function hechosDe(bloque, n = 3, { desde = 0, max = 280 } = {}) {
  const candidatas = bloque.hechos.filter((h) => h.frase.length <= max);
  const puntos = (h) => (h.frase.length >= 70 ? 2 : 0) + Math.min(2, (h.frase.match(/\d[\d.,]*/g) || []).length - 1);
  const rotadas = [...candidatas.slice(desde), ...candidatas.slice(0, desde)];
  const porSeccion = new Map();
  for (const h of rotadas) {
    const previa = porSeccion.get(h.seccion);
    if (!previa || puntos(h) > puntos(previa)) porSeccion.set(h.seccion, h);
  }
  const primeras = [...porSeccion.values()];
  const resto = rotadas.filter((h) => !primeras.includes(h));
  const vistos = new Set();
  const salida = [];
  for (const h of [...primeras, ...resto]) {
    const clave = numerosEn(h.frase);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(limpia(h.frase));
    if (salida.length >= n) break;
  }
  return salida;
}

/** n ideas (frases sin cifra), empezando en `desde` y dando la vuelta. */
function ideasDe(bloque, n, desde = 0) {
  const todas = bloque.ideas.map((i) => limpia(i.frase));
  if (!todas.length) return [];
  const rotadas = [...todas.slice(desde % todas.length), ...todas.slice(0, desde % todas.length)];
  return rotadas.slice(0, n);
}

/**
 * Los editores de las fuentes para el rótulo. Se quitan los que son una
 * versión larga de otro ("Banco de México, Sistema de Información Económica"
 * cuando ya está "Banco de México") y se cortan en dos: un rótulo de TikTok o
 * una lámina no aguantan cuatro, y la lista completa está en la pieza.
 */
function editores(pieza, limite = 2) {
  const todos = [...new Set(pieza.fuentes.map((f) => String(f.editor || '').trim()).filter(Boolean))];
  const cortos = todos.filter((e) => !todos.some((otro) => otro !== e && e.startsWith(otro)));
  return cortos.slice(0, limite);
}
const rotulo = (pieza, loc, limite = 2) => {
  const e = editores(pieza, limite).join(' · ');
  const f = fechaLarga(pieza.fechaDatos, loc);
  return [e, f].filter(Boolean).join(' · ');
};

function bloqueDisclosure(pieza, loc) {
  const t = T[loc];
  const partes = [t.disclosure];
  const fecha = fechaLarga(pieza.fechaDatos, loc);
  if (fecha) partes.push(t.datosAl + ' ' + fecha + '.');
  const ed = editores(pieza, 3).join(' · ');
  if (ed) partes.push(t.fuentes + ': ' + ed + '.');
  return partes.join(' ') + '\n' + (pieza.tipo === 'noticia' ? t.iaNoticia : t.ia);
}

const HASHTAGS = {
  es: '#EducaciónFinanciera #FinanzasPersonales #México #Inversión #SmartFinance',
  en: '#FinancialLiteracy #PersonalFinance #Investing #Mexico #SmartFinance'
};

const frontmatter = (pares) => '---\n' + pares.filter(([, v]) => v != null && v !== '')
  .map(([k, v]) => k + ': ' + (/[:#]/.test(String(v)) ? JSON.stringify(String(v)) : v)).join('\n') + '\n---\n';

const cabecera = (pieza, loc, plataforma, extra = []) => frontmatter([
  ['plataforma', plataforma],
  ['idioma', loc],
  ['pieza', pieza.tipo + ' · ' + pieza.slug],
  ['origen', pieza[loc].archivo || pieza.archivos[0]],
  ['enlace', pieza[loc].url],
  ...extra,
  ['estado', 'borrador · lo revisa, ajusta y publica Jaime']
]);

/** Junta bloques dejando UNA línea en blanco entre ellos. null = se salta. */
const juntar = (bloques) => bloques.filter((b) => b != null).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

/**
 * La cifra destacada de la pieza (el heroStat de una lección), tal cual.
 * Se devuelve partida porque cada sitio la arma distinto: LinkedIn la lee como
 * una frase y la lámina la pinta como número grande con su etiqueta debajo.
 */
function destacada(pieza, loc) {
  const h = loc === 'en' ? (pieza.cifraDestacadaEn || pieza.cifraDestacada) : pieza.cifraDestacada;
  if (!h || !h.valor) return null;
  return { valor: limpia(h.valor), etiqueta: limpia(h.etiqueta || '') };
}
/** La misma cifra escrita en una línea: "etiqueta: valor". */
const enLinea = (c) => (c ? (c.etiqueta ? c.etiqueta + ': ' + c.valor : c.valor) : null);

// ==================================================================== LinkedIn

export function linkedin(pieza, loc) {
  const t = T[loc];
  const b = pieza[loc];
  const clave = destacada(pieza, loc);
  const hechos = hechosDe(b, clave ? 2 : 3);
  const gancho = primeraFrase(b.entradilla || b.descripcion || b.titulo);

  const post = juntar([
    gancho,
    ...(clave ? ['→ ' + enLinea(clave)] : []),
    ...hechos.map((h) => '→ ' + h),
    t.enlace + ' ↓\n' + b.url,
    bloqueDisclosure(pieza, loc),
    HASHTAGS[loc]
  ]).trim();

  const texto = juntar([
    cabecera(pieza, loc, 'LinkedIn').trim(),
    '## ' + t.post,
    post,
    '## ' + t.imagen,
    loc === 'es'
      ? '- La portada del carrusel (`instagram/laminas/01.png`) funciona como imagen del post.\n- Texto alternativo: el titular de la pieza más la fuente.'
      : '- The carousel cover (`instagram/laminas/01.png`) works as the post image.\n- Alt text: the piece headline plus the source.',
    '## ' + t.notas,
    loc === 'es'
      ? '- Leer el post en voz alta: si una frase no se puede decir, se corta.\n- Comprobar que el enlace abre la versión en español.\n- Publicar entre semana, a media mañana en hora de México.'
      : '- Read it out loud: any sentence you cannot say gets cut.\n- Check the link opens the English version.\n- Post on a weekday, mid-morning Mexico time.'
  ]);

  return { ruta: 'linkedin.' + loc + '.md', texto, caracteres: post.length };
}

// ===================================================================== TikTok

export function tiktok(pieza, loc = 'es') {
  const t = T[loc];
  const b = pieza[loc];
  const angulos = ANGULOS[pieza.tipo][loc];
  const ed = rotulo(pieza, loc);
  const cta = pieza.tipo === 'noticia' ? t.ctaNoticia : pieza.tipo === 'research' ? t.ctaResearch : t.cta;
  const clave = destacada(pieza, loc);

  return angulos.map((angulo, i) => {
    // Cada guion arranca en otro sitio de la pieza: cinco guiones del mismo
    // texto tienen que sonar a cinco cosas distintas.
    const ideas = ideasDe(b, 4, i * 2);
    const hechos = hechosDe(b, 2, { desde: i });
    const hecho = hechos[0] || '';
    const gancho = i === 0 ? primeraFrase(b.entradilla || b.descripcion) : (ideas[0] || primeraFrase(b.entradilla));
    const idea = ideas[1] || ideas[0] || '';
    const idea2 = ideas[2] || '';
    const giro = ideas[3] || hechos[1] || idea;

    const texto = juntar([
      cabecera(pieza, loc, 'TikTok', [['tema', angulo], ['guion', t.guionDe], ['duracion', '45–60 s']]).trim(),
      '# ' + angulo,
      '**0–3 s · ' + t.gancho + '**',
      '- ' + t.enPantalla + ': «' + recorte(gancho, 70) + '»\n- ' + t.dice + ': «' + gancho + '»',
      '**3–15 s · ' + t.idea + '**',
      ['- ' + t.dice + ': «' + idea + '»', idea2 ? '- ' + t.dice + ': «' + idea2 + '»' : null].filter(Boolean).join('\n'),
      '**15–35 s · ' + t.dato + '**',
      [hecho ? '- ' + t.dice + ': «' + hecho + '»' : '- ' + t.sinCifra,
        clave ? '- ' + t.enPantalla + ': «' + clave.valor + '»' : null,
        (hecho || clave) && ed ? '- ' + t.enPantalla + ': «' + ed + '»' : null].filter(Boolean).join('\n'),
      '**35–50 s · ' + t.giro + '**',
      '- ' + t.dice + ': «' + giro + '»',
      '**50–60 s · ' + t.cierre + '**',
      '- ' + t.dice + ': «' + cta + '»\n- ' + t.enPantalla + ': «' + t.disclaimerCorto + '»',
      '## ' + t.fuenteEnPantalla,
      ed
        ? (loc === 'es'
          ? 'Cada vez que aparezca una cifra, el rótulo dice «' + ed + '». Si no cabe, se corta el plano, no la fuente.'
          : 'Whenever a figure appears, the caption reads “' + ed + '”. If it does not fit, cut the shot, not the source.')
        : (loc === 'es'
          ? 'La pieza no declara fuentes: hay que escribirlas a mano antes de grabar.'
          : 'The piece declares no sources: write them by hand before filming.'),
      '## ' + t.broll,
      brollDe(loc, i),
      '## ' + t.antesDeGrabar,
      loc === 'es'
        ? '- Decirlo sin leer. Si hay que leerlo, todavía no se entendió.\n- Ninguna cifra en pantalla sin su rótulo de fuente.\n- Subtítulos quemados: la mitad lo ve sin sonido.'
        : '- Say it without reading. If you need to read it, you have not understood it yet.\n- No figure on screen without its source caption.\n- Burn in the subtitles: half the audience watches on mute.'
    ]);

    return { ruta: 'tiktok/' + ARCHIVOS_TIKTOK[i], texto, angulo };
  });
}

function brollDe(loc, i) {
  const listas = {
    es: [
      '- Plano cerrado a cámara, sin cortes.',
      '- La gráfica de la pieza a pantalla completa en el teléfono.',
      '- La ficha del activo en smartfinance.lat, con el dedo cambiando de rango.',
      '- Cuaderno y pluma: el número escrito a mano.',
      '- Calle de la Ciudad de México, plano corto de ambiente.'
    ],
    en: [
      '- Tight shot to camera, no cuts.',
      '- The chart from the piece, full screen on the phone.',
      '- The asset page on smartfinance.lat, thumb switching the range.',
      '- Notebook and pen: the number written by hand.',
      '- A short street shot for texture.'
    ]
  };
  const l = listas[loc];
  return [l[i % l.length], l[(i + 1) % l.length], l[(i + 3) % l.length]].join('\n');
}

// ================================================================== Instagram

/**
 * El carrusel: portada, una idea por lámina, las cifras en láminas propias con
 * su rótulo de fuente pegado, y cierre con CTA y disclaimer.
 *
 * Los textos NO se recortan con puntos suspensivos: el generador de láminas
 * baja el cuerpo hasta que la frase cabe (scripts/derive/laminas.mjs), y una
 * frase cortada a la mitad en una imagen no se puede arreglar después.
 */
export function carrusel(pieza, loc = 'es') {
  const t = T[loc];
  const b = pieza[loc];
  const clave = destacada(pieza, loc);
  const hechos = hechosDe(b, 3, { max: 200 });
  const ed = rotulo(pieza, loc);
  const cta = pieza.tipo === 'noticia' ? t.ctaNoticia : pieza.tipo === 'research' ? t.ctaResearch : t.cta;

  const laminas = [];
  const empuja = (tipo, titulo, texto = '', fuente = '') => {
    laminas.push({ lamina: laminas.length + 1, tipo, kicker: t[KICKER[tipo]], titulo: limpia(titulo), texto: limpia(texto), fuente });
  };

  empuja('portada', b.titulo, primeraFrase(b.entradilla || b.descripcion));
  if (clave) empuja('dato', clave.valor, clave.etiqueta, ed);
  for (const s of b.secciones.filter((s) => s.titulo).slice(0, 4)) {
    empuja('idea', s.titulo, primeraFrase(s.parrafos[0] || ''));
  }
  for (const h of hechos) {
    if (laminas.some((l) => l.titulo === h)) continue;
    empuja('dato', h, '', ed);
  }
  for (const idea of ideasDe(b, 6)) {
    if (laminas.length >= 9) break;
    if (laminas.some((l) => l.titulo === idea || l.texto === idea)) continue;
    empuja('idea', idea);
  }
  laminas.splice(9);
  empuja('cierre', cta, t.disclaimerCorto, b.url.replace(/^https?:\/\//, ''));

  return {
    ruta: 'instagram/carousel.json',
    json: {
      pieza: pieza.tipo + ' · ' + pieza.slug,
      idioma: loc,
      enlace: b.url,
      lienzo: { ancho: 1080, alto: 1350 },
      total: laminas.length,
      laminas: laminas.map((l) => ({ ...l, archivo: 'laminas/' + String(l.lamina).padStart(2, '0') + '.png' }))
    }
  };
}

// =================================================================== Boletín

export function boletin(pieza, loc = 'es') {
  const t = T[loc];
  const b = pieza[loc];
  const clave = destacada(pieza, loc);
  const hechos = hechosDe(b, 3, { max: 240 });
  const ideas = ideasDe(b, 6);
  const cta = pieza.tipo === 'noticia' ? t.ctaNoticia : pieza.tipo === 'research' ? t.ctaResearch : t.cta;

  const texto = juntar([
    cabecera(pieza, loc, 'Boletín semanal (Resend)').trim(),
    '## ' + t.asunto,
    recorte(b.titulo, 60),
    '## ' + t.preheader,
    recorte(primeraFrase(b.entradilla || b.descripcion), 110),
    '## ' + t.bloquePorQue,
    limpia(b.entradilla || b.descripcion),
    '## ' + t.bloqueNumeros,
    [...(clave ? ['- ' + enLinea(clave)] : []), ...hechos.map((h) => '- ' + h)].join('\n') || '- ' + t.sinCifra,
    '## ' + t.bloqueSigue,
    ideas.length ? ideas[ideas.length - 1] : limpia(b.descripcion),
    cta + ' → ' + b.url,
    bloqueDisclosure(pieza, loc),
    '## ' + t.antesDeEnviar,
    loc === 'es'
      ? '- Ensayo primero: `/api/send-newsletter?dry=1`.\n- La gráfica del dólar sigue yendo como siempre; esto se añade, no la sustituye.\n- El boletín sale los domingos: no adelantarlo por tener el borrador listo.'
      : '- Dry run first: `/api/send-newsletter?dry=1`.\n- The dollar chart still goes as always; this is added, not swapped in.\n- The newsletter goes out on Sundays: do not rush it just because the draft is ready.'
  ]);

  return { ruta: 'newsletter.md', texto };
}

// ================================================================= Checklist

export function checklist(pieza, loc = 'es') {
  const b = pieza[loc];
  const ed = editores(pieza, 3).join(' · ');
  const fecha = fechaLarga(pieza.fechaDatos, loc);
  const texto = juntar([
    cabecera(pieza, loc, 'Checklist de publicación').trim(),
    '# Antes de publicar cualquiera de estos borradores',
    [
      '- [ ] Cifras cruzadas contra la pieza. `npm run derive` ya lo comprueba; si editas un borrador a mano, vuelve a correrlo.',
      '- [ ] Cada cifra lleva su fuente visible (texto o rótulo en pantalla)' + (ed ? ': ' + ed : '') + (fecha ? ', datos al ' + fecha + '.' : '.'),
      '- [ ] Disclaimer educativo y «no es recomendación» en cada pieza.',
      '- [ ] Disclosure de IA: qué hizo la IA y qué hizo Jaime.',
      '- [ ] Nada de Twelve Data (sin derechos de redistribución): se cita EDGAR, Yahoo, Stooq o Banxico.',
      '- [ ] Láminas con texto alternativo y la marca del sitio; el tamaño y el peso los vigila `scripts/derive/laminas.mjs`.',
      '- [ ] Fechas y plataforma anotadas en `docs/calendar.md`; métricas a capturar en `docs/kpis/`.',
      '- [ ] Leído en voz alta y aprobado por Jaime. Ningún texto de IA sale sin eso.'
    ].join('\n'),
    '## La pieza',
    '- Título: ' + b.titulo + '\n- Enlace: ' + b.url + '\n- En el repo: ' + pieza.archivos.join(', ')
  ]);
  return { ruta: 'checklist.md', texto };
}
