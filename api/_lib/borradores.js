// Genera los BORRADORES del día para /news, a partir de titulares reales.
//
// Es el primer paso del flujo de "noticias explicadas": lee el RSS de Bloomberg,
// le pide a Claude que escriba hasta tres notas con la estructura del sitio
// (qué pasó / por qué importa / impacto / lección) y las guarda en Redis con
// estado "borrador". NADA de lo que escribe aquí sale en smartfinance.lat: para
// eso hace falta que una persona lo apruebe. Ver CLAUDE.md.
//
// POR QUÉ ES UN MÓDULO Y NO SU PROPIO ENDPOINT
//   El plan de Vercel admite 12 funciones por despliegue y el sitio ya estaba
//   justo en 12: añadir /api/news-draft y /api/news-review tumbaba el
//   despliegue entero con "exceeded_serverless_functions_per_deployment", con
//   el build ya terminado. Todo lo de noticias vive ahora dentro de
//   api/news.js, que es su router; los archivos de api/_lib no cuentan como
//   funciones porque Vercel no enruta lo que empieza por guion bajo.
//
// CÓMO SE DISPARA
//   GitHub Actions a las 11:30 UTC (.github/workflows/news-draft.yml), o a mano:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" -d '{"accion":"generar"}' \
//     https://smartfinance.lat/api/news
//   ...con "seco": true genera y devuelve sin guardar (para ver qué escribiría)
//
// POR QUÉ VA DETRÁS DE CRON_SECRET
//   Cada llamada cuesta dinero en la cuenta de Anthropic. Una URL abierta que
//   gasta por visita es una factura esperando a que alguien la descubra.
//
// COSTE ESTIMADO (claude-haiku-4-5: $1 por millón de tokens de entrada,
// $5 por millón de salida — tarifas de la API de Anthropic, junio 2026)
//   Entrada  ~2,000 tokens (system + 5 titulares con su resumen) → $0.0020
//   Salida   ~1,500 tokens (3 noticias × 4 campos × 2 idiomas)   → $0.0075
//   ------------------------------------------------------------------------
//   ≈ $0.010 por día ≈ $0.30 al mes, con UNA corrida diaria (la que hace el
//   cron). Sumado a lo que ya gasta /api/news (una llamada al día para las
//   opiniones del home y el boletín), la sección entera vive por debajo de
//   $1 al mes. El tope de MAX_DIA borradores es lo que garantiza que ese
//   número no se mueva aunque alguien llame al endpoint muchas veces.

const AnthropicSDK = require('@anthropic-ai/sdk');
const Anthropic = AnthropicSDK.Anthropic || AnthropicSDK.default || AnthropicSDK;

const noticias = require('./noticias');
const { parseFeed } = require('../news');

const FEED_URL = 'https://feeds.bloomberg.com/markets/news.rss';
const FUENTE = 'Bloomberg';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MODEL = 'claude-haiku-4-5';
// Tres noticias al día es lo que una persona alcanza a revisar de verdad antes
// de ir a clase. También es el techo del gasto: ver el cálculo de arriba.
const MAX_DIA = 3;
// Cuántos titulares se le enseñan al modelo para que elija. Más de los que va a
// escribir, para que pueda descartar los que no sirven (video, agenda, quiz).
const CANDIDATOS = 6;
const TIMEOUT_MS = 45000;

// ---- El prompt ------------------------------------------------------------
// Las reglas duras están aquí arriba y se repiten en la validación de
// _lib/noticias.js: el prompt pide, el código comprueba. Un prompt solo nunca
// es una garantía.

const SISTEMA = [
  'You write short news explainers for Smart Finance, a bilingual finance site for students in',
  'Mexico and Canada, written by Jaime Sandoval. Your output is a DRAFT: a person reads every',
  'draft and approves, edits or rejects it before it is ever published. Write accordingly.',
  '',
  'HARD RULES — breaking any of these makes the draft useless:',
  '- Use ONLY what the headline and the summary you are given actually say. If a number, a date,',
  '  a name or a quote is not in that text, it does not exist. Never fill a gap with what you',
  '  remember or with what is plausible.',
  '- No recommendations of any kind. Never say what to buy, sell, hold or avoid.',
  '- No price predictions, no forecasts, no "this will probably go up".',
  '- No hype, no emoji, no exclamation marks, no clickbait, no ALL CAPS.',
  '- If you do not know how markets reacted, say so plainly. "It is too early to tell" is a',
  '  correct and expected answer, not a failure.',
  '',
  'For each story you write, in BOTH English (en) and Mexican Spanish (es) — the Spanish is its',
  'own version in the same voice, never a literal translation:',
  '',
  '- "titulo": the headline rewritten in plain language, the way you would say it out loud to a',
  '  friend who does not follow markets. Under 80 characters. Not a copy of the source headline.',
  '- "que" (What happened): 2 to 3 sentences. Include the figure, the date and who is involved',
  '  IF the source text gives them. Facts only, no interpretation.',
  '- "porque" (Why it matters): 2 to 3 sentences, written for an 18-year-old in Mexico or Canada.',
  '  Connect it to something they actually feel: the peso against the dollar, interest rates,',
  '  prices in the supermarket, tuition and scholarships, jobs, remittances. Explain the chain,',
  '  do not assert it.',
  '- "impacto" (Market impact): 1 to 2 sentences on what this touches in the markets. If the',
  '  source does not say how anything moved, write exactly that it is too early to tell.',
  '',
  'Total length of que + porque + impacto: between 120 and 180 words in each language.',
  '',
  'Also pick, for each story:',
  '- "tema": one of peso | tasas | acciones | cripto | macro.',
  '    peso = the Mexican peso and the exchange rate. tasas = central banks (Fed, Banxico),',
  '    interest rates, inflation. acciones = companies and stock indexes. cripto = crypto.',
  '    macro = everything else about the economy (trade, jobs, energy, growth).',
  '- "simbolos": 0 to 3 assets the story touches, from EXACTLY this list, no others:',
  '    spy qqq dia vix aapl msft nvda amzn usdmxn eurmxn chfmxn eurusd gbpusd usdjpy btc eth xrp sol',
  '  Only include one if the story is genuinely about it. An empty list is fine.',
  '- "principal": the ONE symbol from your list that the story is most about, or an empty string.',
  '- "leccion": the lesson on the site that helps the reader understand this story, from exactly:',
  '    lesson.peso (the peso and the exchange rate) | lesson.interes (compound interest) |',
  '    lesson.sp500 (the S&P 500 and stock indexes) | lesson.presupuesto (budgeting) |',
  '    lesson.inflacion (inflation and central banks) | lesson.errores (mistakes when investing)',
  '- "terminos": 1 or 2 glossary ids from the list given in the user message, and nothing else.',
  '- "slug": 3 to 6 English words, lowercase, separated by hyphens, describing the story. This',
  '  becomes the URL, so it has to read well and never contain a date.',
  '- "origen": the 0-based number of the headline you used.',
  '',
  'Pick the stories that most affect the money of an ordinary young person in Mexico or Canada.',
  'Skip anything that is a video segment, a quiz, a programming schedule or a promo for the',
  'outlet itself: those are not news. If fewer than three headlines are worth explaining, return',
  'fewer. Returning two good drafts beats returning three with one padded out.'
].join('\n');

const ESQUEMA = {
  type: 'object',
  properties: {
    noticias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          origen: { type: 'integer' },
          slug: { type: 'string' },
          tema: { type: 'string' },
          simbolos: { type: 'array', items: { type: 'string' } },
          principal: { type: 'string' },
          leccion: { type: 'string' },
          terminos: { type: 'array', items: { type: 'string' } },
          en: {
            type: 'object',
            properties: {
              titulo: { type: 'string' }, que: { type: 'string' },
              porque: { type: 'string' }, impacto: { type: 'string' }
            },
            required: ['titulo', 'que', 'porque', 'impacto'],
            additionalProperties: false
          },
          es: {
            type: 'object',
            properties: {
              titulo: { type: 'string' }, que: { type: 'string' },
              porque: { type: 'string' }, impacto: { type: 'string' }
            },
            required: ['titulo', 'que', 'porque', 'impacto'],
            additionalProperties: false
          }
        },
        required: ['origen', 'slug', 'tema', 'simbolos', 'principal', 'leccion', 'terminos', 'en', 'es'],
        additionalProperties: false
      }
    }
  },
  required: ['noticias'],
  additionalProperties: false
};

// Mismo plan B que /api/news: si la API rechazara output_config (campo nuevo),
// el formato se pide en el prompt y el JSON se recorta a mano.
const PISTA_JSON = [
  '',
  'Reply with raw JSON only — no prose, no markdown fence. Exact shape:',
  '{"noticias":[{"origen":0,"slug":"...","tema":"macro","simbolos":["spy"],"principal":"spy",' +
    '"leccion":"lesson.sp500","terminos":["accion"],' +
    '"en":{"titulo":"...","que":"...","porque":"...","impacto":"..."},' +
    '"es":{"titulo":"...","que":"...","porque":"...","impacto":"..."}}]}'
].join('\n');

function recortarJSON(texto) {
  const a = texto.indexOf('{');
  const b = texto.lastIndexOf('}');
  if (a === -1 || b <= a) return { noticias: [] };
  const parsed = JSON.parse(texto.slice(a, b + 1));
  return { noticias: Array.isArray(parsed.noticias) ? parsed.noticias : [] };
}

// Los segmentos de video, los quiz y la parrilla de programación llenan este
// feed los fines de semana y no son noticias que explicar. Se filtran antes de
// gastar tokens en ellos.
function esArticulo(item) {
  if (/\/news\/videos\//i.test(item.link)) return false;
  return !/^(bloomberg (this|the) |pointed!|.* podcast$)/i.test(item.title || '');
}

function limpiar(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function pedirAlModelo(candidatos, glosario) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: TIMEOUT_MS,
    maxRetries: 0
  });

  const lista = candidatos
    .map((it, i) => `${i}. ${it.title}${it.description ? `\n   Summary: ${limpiar(it.description).slice(0, 500)}` : ''}`)
    .join('\n\n');

  const pedir = async (conEsquema) => {
    const res = await client.messages.create(Object.assign(
      {
        model: MODEL,
        max_tokens: 4000,
        system: conEsquema ? SISTEMA : SISTEMA + PISTA_JSON,
        messages: [{
          role: 'user',
          content:
            `Write up to ${MAX_DIA} drafts from these headlines (numbered from 0):\n\n` + lista +
            '\n\nGlossary ids you may use in "terminos" (only these):\n' + glosario.join(', ')
        }]
      },
      conEsquema ? { output_config: { format: { type: 'json_schema', schema: ESQUEMA } } } : null
    ));
    return (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  };

  try {
    return recortarJSON(await pedir(true));
  } catch (err) {
    if (!err || err.status !== 400) throw err;
    console.warn('salida estructurada rechazada, reintento sin esquema:', err.message);
    return recortarJSON(await pedir(false));
  }
}

/** Junta lo que escribió el modelo con lo que sabe el servidor (fuente, hora). */
function armar(cruda, candidatos, ahora) {
  const origen = candidatos[Number(cruda.origen)];
  if (!origen) return { error: 'origen fuera de rango: ' + cruda.origen };

  const slug = noticias.slugify(cruda.slug || cruda.en?.titulo || origen.title);
  if (!slug) return { error: 'no se pudo derivar un slug' };

  // Los símbolos y términos inventados se DESCARTAN en vez de tumbar la nota:
  // el texto puede ser bueno aunque la etiqueta esté mal, y quien revisa puede
  // añadir el activo a mano. Lo que no se descarta es la fuente ni la hora.
  const simbolos = (Array.isArray(cruda.simbolos) ? cruda.simbolos : [])
    .filter((s) => noticias.SIMBOLOS.includes(s)).slice(0, 3);
  const principal = noticias.SIMBOLOS.includes(cruda.principal) ? cruda.principal : (simbolos[0] || null);

  const n = {
    id: noticias.nuevoId(slug, ahora),
    slug,
    estado: 'borrador',
    tema: noticias.TEMAS.includes(cruda.tema) ? cruda.tema : 'macro',
    creadoEn: ahora.toISOString(),
    revisadoEn: null,
    revisadoPor: null,
    editadoPorHumano: false,
    modelo: MODEL,
    fuente: {
      nombre: FUENTE,
      titular: origen.title,
      url: origen.link,
      publicado: origen.pubDate ? new Date(origen.pubDate).toISOString() : ahora.toISOString()
    },
    simbolos,
    principal,
    leccion: noticias.LECCIONES.includes(cruda.leccion) ? cruda.leccion : null,
    terminos: (Array.isArray(cruda.terminos) ? cruda.terminos : []).slice(0, 2),
    en: cruda.en,
    es: cruda.es
  };

  // Un término fuera del glosario se limpia y se vuelve a validar: es el fallo
  // más común y el más inofensivo (la nota se lee igual sin él).
  let errores = noticias.validar(n);
  if (errores.some((e) => e.startsWith('término fuera del glosario'))) {
    n.terminos = [];
    errores = noticias.validar(n);
  }
  return errores.length ? { error: errores.join('; '), noticia: n } : { noticia: n };
}

/**
 * Genera y guarda los borradores del día. Devuelve el cuerpo de la respuesta.
 * Lanza si el feed o la API fallan; quien llama decide qué código HTTP dar.
 * @param {{seco?: boolean}} opciones seco = generar sin guardar.
 */
async function generar({ seco = false } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY no está configurada');
    err.code = 'ANTHROPIC_NO_CONFIGURADO';
    throw err;
  }

  const ahora = new Date();

  {
    // 1. El freno de gasto va PRIMERO: antes de pedir el feed y antes de gastar
    //    un solo token.
    const yaGeneradas = seco ? 0 : await noticias.cuotaDelDia(ahora);
    const cupo = MAX_DIA - yaGeneradas;
    if (cupo <= 0) {
      return { generadas: 0, motivo: 'cuota_del_dia_agotada', yaGeneradas, maximo: MAX_DIA };
    }

    // 2. Titulares reales. Sin feed no hay noticia: nunca se escribe de memoria.
    const feedRes = await fetch(FEED_URL, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' }
    });
    if (!feedRes.ok) throw new Error('bloomberg respondió ' + feedRes.status);
    // parseFeed recorta a los 4 más recientes para el home; aquí interesa un
    // abanico más ancho para poder descartar los videos del fin de semana.
    const todos = parseFeed(await feedRes.text(), 40);
    const candidatos = todos.filter(esArticulo).slice(0, CANDIDATOS);
    if (!candidatos.length) {
      return { generadas: 0, motivo: 'ningun_titular_util', revisados: todos.length };
    }

    // 3. Los borradores.
    const glosario = (() => {
      try { return require('../src/data/glossary.json').map((g) => g.id); } catch (e) { return []; }
    })();
    const { noticias: crudas } = await pedirAlModelo(candidatos, glosario);

    const guardadas = [];
    const descartadas = [];
    for (const cruda of crudas.slice(0, cupo)) {
      const { noticia, error } = armar(cruda, candidatos, ahora);
      if (error) { descartadas.push({ error, slug: cruda && cruda.slug }); continue; }
      if (!seco) await noticias.guardar(noticia);
      guardadas.push(noticia);
    }
    if (!seco && guardadas.length) await noticias.sumarCuota(guardadas.length, ahora);

    return {
      generadas: guardadas.length,
      seco,
      cupoRestante: cupo - guardadas.length,
      borradores: guardadas.map((n) => ({ id: n.id, slug: n.slug, tema: n.tema, titulo: n.es.titulo, fuente: n.fuente.url })),
      descartadas,
      // El modelo va en la respuesta para que el registro de la corrida diga
      // qué se gastó sin tener que abrir el panel de Anthropic.
      modelo: MODEL
    };
  }
}

module.exports = { generar, esArticulo, armar, MAX_DIA, MODEL };
