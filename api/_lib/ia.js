// Smart Finance AI — el botón "Explícame esto".
//
// QUÉ HACE
//   Explica, en lenguaje de estudiante, lo que la persona está viendo: una
//   noticia aprobada, la ficha de un activo, el movimiento de una gráfica, un
//   término del glosario, una lección, un reporte de research o el reto del
//   día. También escribe tres preguntas de estudio sobre esa misma pieza.
//
// LA PREGUNTA MANDA
//   Si la persona escribió una pregunta, el encargo al modelo deja de ser
//   "explica esto" y pasa a ser "responde ESTO con los datos de abajo". Antes
//   no era así: el TASK era siempre el genérico y la pregunta viajaba como
//   posdata, así que "¿por qué subió hoy?" recibía el mismo resumen del mes
//   que el botón a secas (docs/2026-08-25-ia-responde/). Ahora
//   `clasificarPregunta` lee la intención (qué es · por qué se movió ·
//   cuánto/cuándo se movió · comparar · término) y el alcance temporal (hoy,
//   la semana, el año...), y el bloque DATOS se arma para ESA pregunta: hoy →
//   la serie del día con el cierre anterior y las noticias aprobadas del
//   símbolo; el año → la serie de 1Y; un término → su entrada del glosario;
//   comparar → la serie del otro activo también. El resumen mensual ya no es
//   la respuesta de todo.
//
// SABE DECIR "NO LO SÉ"
//   Si piden una causa ("¿por qué subió?") y el sitio no tiene ninguna noticia
//   APROBADA que la respalde, la respuesta tiene que decir en la primera frase
//   que con estos datos no se puede saber el porqué, y ofrecer lo que sí
//   consta. Está prohibido rellenar con una causa plausible, y no lo garantiza
//   el prompt sino un cierre en `validar`: con `bloque.sinCausa`, una
//   respuesta que atribuye causa o especula (`atribuyeCausa`) o que no admite
//   que no se sabe (`admiteNoSaber`) se rechaza, se reintenta UNA vez y, si
//   reincide, sale FRASE_SIN_CAUSA — escrita por una persona.
//
// CONVERSACIÓN CORTA, NUNCA EN EL SERVIDOR
//   El navegador puede mandar hasta MAX_TURNOS intercambios anteriores
//   (pregunta + respuesta) para poder repreguntar sin empezar de cero. Ese
//   historial vive SOLO en localStorage del visitante: aquí no se guarda, y al
//   modelo entra como contexto de lectura, NUNCA como parte del bloque DATOS —
//   viene del navegador, así que sus cifras no respaldan nada (la regla de que
//   el navegador manda identificadores y nunca cifras sigue intacta: una
//   cifra del historial que no esté en DATOS se rechaza igual).
//
// LA REGLA QUE SOSTIENE TODO: NO INVENTA NADA
//   El servidor arma un bloque DATOS con lo que el sitio YA tiene (la noticia
//   revisada por una persona, la serie de precios de /api/history, la ficha de
//   src/data/symbols.ts, el glosario, el texto de la lección) y el prompt exige
//   responder SOLO con eso. Un prompt, sin embargo, no es una garantía, así que
//   hay tres cierres de verdad en el código:
//
//   1. CLASIFICADOR DE CONSEJO (esConsejo). "¿Compro?", "¿cuánto va a subir?",
//      "should I sell" se rechazan ANTES de gastar un token, con una frase fija
//      que enlaza a la lección de errores al invertir. También se pasa por la
//      RESPUESTA: si el modelo se pone a recomendar, no sale.
//   2. GUARDIA DE CIFRAS (numerosFuera). Cada número de la respuesta tiene que
//      estar en el bloque DATOS. Si aparece uno que no está, se reintenta UNA
//      vez diciéndole cuál sobra; si vuelve a fallar, la persona ve un mensaje
//      honesto en vez de una cifra inventada. Las cuentas (el cambio del
//      periodo, el máximo, el mínimo) las hace ESTE archivo y van en DATOS: el
//      modelo narra, no calcula.
//   3. TOPE DE GASTO (Redis). Contador global del día y contador por IP, con
//      apagado automático y mensaje honesto al llegar al límite.
//
// POR QUÉ NO ES api/ia.js
//   El plan de Vercel admite 12 funciones por despliegue y api/ tiene
//   exactamente 12 (hay una prueba que falla en 13). Así que esto es una ACCIÓN
//   de un endpoint que ya existía: GET /api/news?accion=explicar. api/news.js
//   ya era el router de todo el texto generado del sitio — es donde vive la
//   llamada a Anthropic, el flujo de borrador → aprobación y la promesa de que
//   nada de IA se publica sin revisar. Los archivos de api/_lib no cuentan como
//   funciones (Vercel no enruta lo que empieza por guion bajo).
//
// COSTE (claude-haiku-4-5: $1 por millón de tokens de entrada, $5 por millón de
// salida — tarifas de la API de Anthropic)
//   Entrada  ~1,600 tokens (sistema ~800 + bloque DATOS 400–1,500)  → $0.0016
//   Salida   ~350 tokens (respuesta + datosUsados + fuentes)        → $0.0018
//   ------------------------------------------------------------------------
//   ≈ $0.0034 por LLAMADA AL MODELO. Las repetidas no cuestan nada: la
//   respuesta se guarda en Redis 24 h con el hash del bloque DATOS, así que dos
//   personas leyendo la misma noticia pagan una sola vez.
//   TOPE DURO: MAX_DIA = 100 LLAMADAS al día → $0.34 al día, $10 al mes en el
//   peor caso absoluto. Lo esperado con el tráfico de hoy es menos de $1 al mes.
//   Bajar el techo es cambiar esa constante.
//   OJO: el techo cuenta LLAMADAS, no consultas, y por eso es de verdad. Una
//   consulta que dispara la guardia de cifras hace DOS llamadas (la primera y
//   el reintento) y paga las dos. Contando una sola por consulta —como se hacía
//   antes—, el peor caso real era el doble del escrito: 200 generaciones,
//   ~$0.68 al día, ~$20 al mes.
//
// POR QUÉ HAIKU Y NO SONNET
//   La tarea es reescribir en lenguaje simple un bloque de datos que ya viene
//   masticado y estructurado; no hay razonamiento largo ni cálculo (las cuentas
//   las hace este archivo). Haiku es cinco veces más barato y aquí el techo de
//   gasto es una restricción real. Si algún día el explicador tuviera que
//   razonar sobre varias series a la vez, ese caso justificaría subir de modelo
//   — y se documentaría aquí.

'use strict';

const crypto = require('node:crypto');

const AnthropicSDK = require('@anthropic-ai/sdk');
const Anthropic = AnthropicSDK.Anthropic || AnthropicSDK.default || AnthropicSDK;

const cache = require('./cache.js');
const noticias = require('./noticias.js');

const MODELO = 'claude-haiku-4-5';
const TIMEOUT_MS = 20000;
const MAX_TOKENS = 1200;

// Tope de gasto. Ver el cálculo del encabezado.
const MAX_DIA = 100;          // LLAMADAS al modelo al día en todo el sitio
const MAX_IP = 8;             // por IP y día: suficiente para leer, corto para raspar
const TTL_CACHE = 24 * 60 * 60;   // la respuesta vale 24 h para el mismo bloque DATOS

// Cuánto texto libre se acepta. Es una caja para "no entendí esta parte", no un
// chat: 200 caracteres bastan para preguntar y evitan que alguien pegue un
// documento entero y nos lo cobre Anthropic.
const MAX_PREGUNTA = 200;

// La conversación tiene tope y es corto: hasta MAX_TURNOS intercambios
// anteriores viajan con la repregunta (el historial vive en localStorage del
// visitante, nunca aquí). Cada respuesta guardada se recorta a
// MAX_R_HISTORIAL caracteres antes de entrar al prompt: el contexto de una
// repregunta son dos frases, no el ensayo entero.
const MAX_TURNOS = 3;
const MAX_R_HISTORIAL = 600;

// La frase que alguien seleccionó en la página para pedir "explícame esto".
// Más larga que MAX_PREGUNTA porque una frase de una lección puede serlo, pero
// con tope igual: no es la puerta para pegar un documento.
const MAX_SELECCION = 260;

const TIPOS = ['noticia', 'activo', 'grafica', 'termino', 'leccion', 'reporte', 'reto'];
const MODOS = ['explicar', 'preguntas'];
const RANGOS = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

const contexto = require('../../src/generated/ia-contexto.json');
let glosario = [];
try {
  glosario = require('../../src/data/glossary.json');
} catch (e) {
  console.warn('ia: glosario no disponible en la función:', e && e.message);
}

// ---------------------------------------------------------------------------
// 1. El clasificador de consejo financiero.
//
// No pretende entender la intención: busca las FORMAS con las que se pide un
// consejo. Un falso positivo cuesta una explicación que no se dio; un falso
// negativo cuesta que un sitio educativo hecho por alguien de 18 años le diga a
// un desconocido qué comprar. La asimetría manda, y por eso barre ancho.

// LA FRONTERA DE PALABRA QUE SÍ FUNCIONA EN ESPAÑOL.
// Para JavaScript `\b` es el borde de [A-Za-z0-9_], y la "á" no está ahí: entre
// la "á" de "subirá" y el espacio que sigue NO hay frontera, así que
// /subir[áa]\b/ no casa NUNCA con "subirá". Los dos clasificadores tenían las
// cuatro predicciones de precio escritas así, y las cuatro pasaban de largo:
// "¿el dólar subirá?" entraba al modelo y "el precio subirá con fuerza" salía a
// pantalla. Detrás de una palabra acentuada hay que preguntar por lo que NO
// viene detrás — otra letra —, no por una frontera que no existe.
const LETRA = 'a-z0-9áéíóúüñ';
const FIN = '(?![' + LETRA + '])';
const RESTO = '[' + LETRA + ']*';   // el resto de una palabra, acentos incluidos

/**
 * Predicción de precio en español, con las formas acentuadas que sí casan.
 *
 * Dos versiones, y la diferencia es "valer". En la ENTRADA, "¿cuánto va a valer
 * el dólar?" es pedir un pronóstico. En la SALIDA no vale: la lección de la
 * tarjeta de crédito dice "un historial que a los veinticinco va a valer dinero
 * de verdad", que no predice ningún precio, y meterlo en la lista de salida
 * dejaba muda esa lección entera.
 */
const PREDICE = '(?:va\\s+a\\s+(?:subir|bajar|caer{VALER})|subir[áa]|bajar[áa]|caer[áa]|' +
  'alcanzar[áa]|llegar[áa]\\s+a)';
const RE_PREDICE_ES = new RegExp('\\b' + PREDICE.replace('{VALER}', '|valer') + FIN, 'i');
const RE_PREDICE_ES_SALIDA = new RegExp('\\b' + PREDICE.replace('{VALER}', '') + FIN, 'i');

const PATRONES_CONSEJO = [
  // Comprar / vender / invertir, en primera persona o como recomendación.
  /\b(compro|vendo|invierto|le\s+entro|me\s+meto)\b/i,
  /\b(deber[íi]as?|conviene|vale\s+la\s+pena|recomiendas?|recomiendan|recomendar[íi]as?)\b/i,
  // "debo" no es "debería", y "¿debo comprar dólares?" no lo veía nadie.
  new RegExp('\\b(?:debo|deber[íi]a|debiera|debiese|me\\s+conviene)\\s+(?:comprar|vender|invertir|' +
    'entrar|entrarle|meter' + RESTO + '|salir' + RESTO + '|mantener|holdear|aguantar)' + FIN, 'i'),
  /\b(should\s+i|would\s+you|do\s+you\s+recommend|is\s+it\s+worth|worth\s+buying)\b/i,
  /\b(qu[ée]|d[óo]nde|en\s+qu[ée])\s+(me\s+conviene|invierto|compro)\b/i,
  /\b(what|where|which)\s+(should|to)\s+(i\s+)?(buy|sell|invest)/i,
  /\bbuy\s+or\s+sell\b/i,
  /\b(es|ser[íi]a)\s+(una\s+)?buena\s+(inversi[óo]n|compra|idea\s+de\s+inversi[óo]n)\b/i,
  // "¿es momento de entrar?" y "is now a good time?" son la misma pregunta.
  new RegExp('\\b(?:es|ser[íi]a|ya\\s+es)\\s+(?:el\\s+|un\\s+|buen\\s+)*momento\\s+(?:de|para)\\s+' +
    '(?:comprar|vender|invertir|entrar|entrarle|meter' + RESTO + '|salir' + RESTO + ')' + FIN, 'i'),
  /\bgood\s+time\b/i,
  /\b(good|bad)\s+(investment|buy|time\s+to\s+(buy|sell))\b/i,
  // "¿tú qué harías?" es pedir el consejo por la puerta de atrás.
  new RegExp('\\b(?:t[úu]\\s+)?qu[ée]\\s+(?:har[íi]as|me\\s+recomiendas|me\\s+dices\\s+que\\s+haga)' + FIN, 'i'),
  /\bwhat\s+would\s+you\s+do\b/i,
  // Predicción de precio.
  RE_PREDICE_ES,
  /\b(cu[áa]nto\s+(va\s+a\s+|)(subir|bajar|valer|costar))\b/i,
  /\b(will\s+it\s+(go\s+up|go\s+down|rise|fall|crash|moon)|price\s+target|forecast|prediction)\b/i,
  /\b(pron[óo]stico|predicci[óo]n|predice|va\s+a\s+llegar)\b/i,
  // Petición directa de cartera.
  /\b(qu[ée]\s+acciones?|qu[ée]\s+cripto|d[óo]nde\s+pongo\s+mi\s+dinero|en\s+qu[ée]\s+invierto)\b/i,
  /\b(what\s+stocks?\s+should|where\s+(should|do)\s+i\s+(put|invest))\b/i
];

// PEDIR UNA VALUACIÓN ES PEDIR UN CONSEJO, pero preguntar por una causa no.
//
//   "¿está barato?"                  → es pedir el juicio, o sea el consejo
//   "¿por qué está caro el dólar?"   → es pedir la causa, y eso sí se explica
//
// Por eso estos patrones van aparte: solo cuentan cuando la pregunta no viene
// con un porqué delante. En la SALIDA no hay excepción — el prompt le prohíbe
// al modelo decir que algo está barato o caro, con porqué o sin él.
const PATRONES_VALUACION = [
  new RegExp('\\b(?:est[áa]|es|luce|parece|se\\s+ve)\\s+(?:muy\\s+|algo\\s+|bastante\\s+|' +
    'demasiado\\s+)?(?:barat|car)[oa]' + FIN, 'i'),
  new RegExp('\\b(?:infra|sobre|sub)valorad[oa]s?' + FIN, 'i'),
  /\b(undervalued|overvalued)\b/i,
  /\b(is|are|looks|seems)\s+(it|this|that|now)?\s*(really\s+|quite\s+|pretty\s+|too\s+|so\s+)?(cheap|expensive)\b/i
];

// Y aquí otra vez el `\b` tras vocal acentuada: /por\s?qu[ée]\b/ no casa con
// "por qué ". Se termina con FIN, como todo lo que puede acabar en acento.
const RE_PORQUE = new RegExp('\\b(?:por\\s?qu[ée]|why|c[óo]mo\\s+es\\s+que|what\\s+makes)' + FIN, 'i');

/** true si el texto PIDE un consejo de inversión o una predicción de precio. */
function esConsejo(texto) {
  const t = String(texto || '');
  if (!t.trim()) return false;
  if (PATRONES_CONSEJO.some((re) => re.test(t))) return true;
  return !RE_PORQUE.test(t) && PATRONES_VALUACION.some((re) => re.test(t));
}

// El otro lado del mismo problema: que el modelo DÉ un consejo aunque nadie se
// lo haya pedido. No sirve la misma lista, y esto se aprendió con una prueba:
// la frase con la que el sitio RECHAZA dar consejos ("no te digo qué comprar
// ni qué vender") la detectaba como consejo el clasificador de entrada. Pedir
// y dar no se escriben igual, así que se miran con listas distintas:
//
//   · entrada  → cualquier forma de preguntar (ancha, un falso positivo cuesta
//                una explicación que no se dio)
//   · salida   → solo formas IMPERATIVAS o de predicción, y además se ignora
//                la coincidencia si viene negada ("no deberías fiarte de quien
//                te diga que va a subir" es una advertencia, no un consejo)
const PATRONES_CONSEJO_DADO = [
  /\b(deber[íi]as?|tienes\s+que|tendr[íi]as\s+que)\s+(comprar|vender|invertir|entrarle|meterle|salirte)\b/i,
  /\b(te|le)\s+(recomiendo|recomendar[íi]a|aconsejo|sugiero|conviene)\b/i,
  /\b(yo\s+)?(comprar[íi]a|vender[íi]a)\b/i,
  /\bes\s+(un\s+)?(buen|mal)\s+(momento|precio|punto|negocio|nivel|entrada)\b/i,
  // "Es momento de comprar" no lleva "buen" delante y se colaba entero.
  new RegExp('\\b(?:es|ser[íi]a|ya\\s+es|hoy\\s+es)\\s+(?:el\\s+|un\\s+)?momento\\s+(?:de|para)\\s+' +
    '(?:comprar|vender|invertir|entrar|entrarle|meter' + RESTO + '|salir' + RESTO + ')' + FIN, 'i'),
  // Sin exigir el sí/no delante: "Vale la pena comprar ahora" es la forma
  // normal, y "no vale la pena comprar" también es recomendar (que no compres).
  new RegExp('\\bvale\\s+la\\s+pena\\s+(?:comprar|invertir|entrar|entrarle|meter' + RESTO + ')' + FIN, 'i'),
  // Empujar a mover la posición es dar consejo aunque no diga "compra".
  new RegExp('\\b(?:considera|plant[ée]ate|piensa\\s+en|te\\s+toca)\\s+(?:comprar|vender|invertir|' +
    'entrar|aumentar|reducir|meter' + RESTO + ')' + FIN, 'i'),
  new RegExp('\\b(?:aumentar|reducir|abrir|cerrar|subir|bajar)\\s+(?:tu|su)\\s+posici[óo]n' + FIN, 'i'),
  /\bconsider\s+(buying|selling|adding|increasing|reducing|trimming)\b/i,
  RE_PREDICE_ES_SALIDA,
  /\byou\s+should\s+(buy|sell|hold|invest|avoid)\b/i,
  /\bi\s+(recommend|would\s+(buy|sell))\b/i,
  // "This is a good time to buy" no dice "it's": el sujeto podía ser cualquiera.
  /\b(it|this|that|now|today)(?:'s|\s+is)\s+a\s+(good|bad)\s+(time|buy|entry|investment|moment|point|level)\b/i,
  /\b(will|is\s+going\s+to)\s+(go\s+up|go\s+down|rise|fall|drop|climb|reach)\b/i,
  /\bprice\s+target\b/i,
  // El prompt le prohíbe decir que algo está barato, caro o infravalorado; el
  // prompt no es una garantía, así que también se comprueba aquí.
  ...PATRONES_VALUACION
];

// QUÉ NEGACIÓN CONVIERTE UNA PREDICCIÓN EN ADVERTENCIA.
//
// La versión anterior era "cualquier 'no' en los 26 caracteres de antes", y eso
// se le volvía en contra:
//
//   "No hay duda: el precio subirá"  →  se leía como advertencia. El "no" era
//                                       de la oración anterior y no negaba el
//                                       precio: es una predicción de manual.
//
// Lo que de verdad distingue una advertencia de un consejo no es que haya un
// "no" cerca, sino QUÉ se niega: el SABER o el DECIR, nunca el precio.
//
//   "nadie sabe si va a subir"        → advertencia (niega el saber)
//   "esto no te dice si deberías…"    → advertencia (niega el decir)
//   "no vale la pena comprar"         → CONSEJO igual: recomienda no comprar
//
// Y la negación tiene que estar en la MISMA oración: un punto, unos dos puntos
// o un punto y coma cortan su alcance.
const RE_NEG_ABSOLUTA = new RegExp(
  '\\b(?:nadie|nunca|jam[áa]s|ning[úu]n[oa]?|nobody|never|no\\s+one)' + FIN, 'i');

const RE_NEG_SABER = new RegExp(
  '\\b(?:no|not|ni|cannot|can\'?t)\\b[^.:;!?]{0,24}?\\b(?:s[ée]|sab' + RESTO + '|dic' + RESTO +
  '|digo|decir|afirm' + RESTO + '|promet' + RESTO + '|garantiz' + RESTO +
  '|recomendaci[óo]n|adivin' + RESTO + '|know' + RESTO + '|say' + RESTO + '|tell' + RESTO +
  '|recommendation|advice|predict' + RESTO + ')' + FIN, 'i');

/** El último corte de oración: lo de más allá no niega nada de más acá. */
const RE_CORTE = /[.:;!?—\n][^.:;!?—\n]*$/;

/** true si la coincidencia que empieza en `indice` viene negada de verdad. */
function negada(texto, indice) {
  let antes = texto.slice(Math.max(0, indice - 60), indice);
  const corte = antes.search(RE_CORTE);
  if (corte !== -1) antes = antes.slice(corte + 1);
  return RE_NEG_ABSOLUTA.test(antes) || RE_NEG_SABER.test(antes);
}

// Se miran TODAS las coincidencias de cada patrón, no la primera. Con `match` a
// secas, "Nadie sabe si va a subir. El dólar va a bajar" se salvaba entera: la
// primera coincidencia venía negada y la segunda —el consejo de verdad— no se
// llegaba a mirar.
const PATRONES_CONSEJO_DADO_G = PATRONES_CONSEJO_DADO.map(
  (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
);

/** true si el texto DA un consejo o predice un precio, sin contar lo negado. */
function daConsejo(texto) {
  const t = String(texto || '');
  if (!t.trim()) return false;
  return PATRONES_CONSEJO_DADO_G.some((re) => {
    for (const m of t.matchAll(re)) {
      if (!negada(t, m.index)) return true;
    }
    return false;
  });
}

// OJO al editar estas frases: hay una prueba que exige que NINGUNA de ellas
// dispare el clasificador de salida. Si una empieza a hablar de lo que "va a
// subir", aunque sea para negarlo, la prueba se cae — a propósito.
const FRASE_CONSEJO = {
  es: 'No te digo qué comprar ni qué vender, y nadie sabe lo que hará un precio mañana: no soy ' +
    'un asesor. Lo que sí puedo es explicarte lo que estás viendo. Si te interesa el tema, la ' +
    'lección de errores al invertir empieza justo por ahí.',
  en: 'I will not tell you what to buy or sell, and nobody knows what a price does tomorrow: I am ' +
    'not an adviser. What I can do is explain what you are looking at. If that is what you are ' +
    'after, the lesson on mistakes when investing starts right there.'
};

const FRASE_SIN_VERIFICAR = {
  es: 'No pude comprobar la respuesta contra los datos de esta página, así que prefiero no ' +
    'enseñártela: preferimos quedarnos callados a darte una cifra inventada. Inténtalo otra vez ' +
    'en un momento.',
  en: 'I could not check the answer against the data on this page, so I would rather not show ' +
    'it: we prefer saying nothing to giving you a made-up figure. Try again in a moment.'
};

const FRASE_TOPE = {
  es: 'Hoy ya se agotó el presupuesto que este sitio le dedica a la IA (lo paga Jaime de su ' +
    'bolsillo y por eso tiene un tope). Vuelve mañana: el resto de la página funciona igual.',
  en: 'The budget this site spends on AI is used up for today (Jaime pays for it himself, which ' +
    'is why there is a cap). Come back tomorrow: the rest of the page works as usual.'
};

const FRASE_SIN_CONTADOR = {
  es: 'Ahora mismo no puedo llevar la cuenta de lo que gasto, y sin esa cuenta prefiero no ' +
    'generar nada. Inténtalo en un rato.',
  en: 'Right now I cannot keep track of what I am spending, and without that count I would ' +
    'rather not generate anything. Try again in a bit.'
};

const FRASE_SIN_DATOS = {
  es: 'No tengo los datos de esta página para explicarla. No lo sé con los datos que tengo.',
  en: 'I do not have the data for this page to explain it. I do not know, with the data I have.'
};

// Sale cuando piden una causa, el sitio no tiene ninguna noticia aprobada que
// la respalde, y el modelo insistió dos veces en inventar una. La escribió una
// persona, y por eso la etiqueta de la hoja cambia a "Respuesta fija del sitio".
const FRASE_SIN_CAUSA = {
  es: 'Con los datos de esta página no se puede saber el porqué de ese movimiento: el sitio no ' +
    'tiene ninguna noticia revisada que lo explique, y adivinar una causa sería inventarla. Lo ' +
    'que sí consta —cuánto y cuándo se movió— está en la gráfica de esta página.',
  en: 'With the data on this page there is no way to know the reason for that move: the site has ' +
    'no reviewed news item explaining it, and guessing a cause would be making one up. What is ' +
    'on record — how much it moved and when — is in the chart on this page.'
};

// ---------------------------------------------------------------------------
// 1.5 La intención de la pregunta.
//
// No es comprensión del lenguaje: son las FORMAS con las que se pregunta cada
// cosa, igual que el clasificador de consejo. Lo que decide es QUÉ DATOS se
// arman y QUÉ ENCARGO se le da al modelo — equivocarse de intención cuesta una
// respuesta menos afinada, nunca una cifra inventada (eso lo cierra la guardia
// de cifras, que no depende de esto).
//
//   causa      "¿por qué subió hoy?"        → serie + noticias aprobadas del símbolo
//   movimiento "¿cuánto subió este año?"    → la serie del alcance que diga la pregunta
//   comparar   "¿mejor que el oro?"         → la serie del otro activo también
//   termino    "¿qué es un ETF?"            → su entrada del glosario
//   que_es     todo lo demás                → la ficha y la serie de siempre
//
// El ALCANCE temporal ("hoy", "esta semana", "el año") se mapea al rango de la
// serie: preguntar por hoy y recibir el resumen del mes era la mitad del bug.

const RE_ALCANCE = [
  { re: /\b(hoy|today|intradia|intrad[íi]a)\b/i, rango: '1D' },
  { re: /\b(ayer|yesterday|esta\s+semana|this\s+week|la\s+semana|week)\b/i, rango: '1W' },
  { re: /\b(este\s+mes|el\s+mes|del\s+mes|month)\b/i, rango: '1M' },
  { re: /\b(trimestre|quarter|3\s+meses)\b/i, rango: '3M' },
  { re: new RegExp('\\b(?:5|cinco|five)\\s+(?:a[ñn]os|years)' + FIN, 'i'), rango: '5Y' },
  { re: new RegExp('\\b(?:este\\s+a[ñn]o|el\\s+a[ñn]o|del\\s+a[ñn]o|anual|this\\s+year|year|12\\s+meses)' + FIN, 'i'), rango: '1Y' }
];

// Movimiento en pasado ("subió", "cayó", "se disparó") o consumado ("ha
// subido"): es lo que separa "¿por qué subió hoy?" (pide la causa de un hecho)
// de "¿por qué sube cuando el peso se debilita?" (pide el mecanismo, y eso lo
// contesta la ficha).
const RE_MOVIMIENTO_HECHO = new RegExp(
  '\\b(?:subi[óo]|baj[óo]|cay[óo]|(?:se\\s+)?(?:movi[óo]|dispar[óo]|desplom[óo]|derrumb[óo]|hundi[óo]|recuper[óo]|fortaleci[óo]|debilit[óo])|' +
  'ha\\s+(?:subido|bajado|ca[íi]do)|perdi[óo]|gan[óo]|' +
  'went\\s+(?:up|down)|rose|fell|dropped|jumped|spiked|crashed|climbed|moved|rallied|tanked)' + FIN, 'i');

const RE_CUANTO_CUANDO = new RegExp(
  '\\b(?:cu[áa]nto|cu[áa]ndo|how\\s+much|when|desde\\s+cu[áa]ndo)' + FIN, 'i');

const RE_COMO_VA = new RegExp(
  '\\b(?:c[óo]mo\\s+(?:va|vamos|viene|cerr[óo]|le\\s+ha\\s+ido|le\\s+fue|se\\s+ha\\s+movido)|' +
  'qu[ée]\\s+(?:hizo|ha\\s+hecho|tal)|how\\s+is\\s+it\\s+doing|how\\s+did\\s+it\\s+do|how\\s+has\\s+it|' +
  'what\\s+(?:did\\s+it\\s+do|has\\s+it\\s+done))' + FIN, 'i');

const RE_EXTREMOS = new RegExp(
  '\\b(?:m[áa]ximo|m[íi]nimo|r[ée]cord|pico|high|low|highest|lowest|peak)' + FIN, 'i');

const RE_COMPARAR = new RegExp(
  '\\b(?:compar[' + LETRA + ']*|versus|vs\\.?|frente\\s+a|contra|' +
  'mejor\\s+que|peor\\s+que|m[áa]s\\s+que|menos\\s+que|' +
  'compared?|better\\s+than|worse\\s+than|more\\s+than)' + FIN, 'i');

const RE_QUE_ES = new RegExp(
  '\\b(?:qu[ée]\\s+(?:es|son|significa|quiere\\s+decir)|what\\s+(?:is|are|does)|' +
  'qu[ée]\\s+diferencia|explica|no\\s+entend[íi])' + FIN, 'i');

/** El término del glosario que menciona la pregunta, si menciona alguno. */
function terminoEnPregunta(texto) {
  const t = ' ' + String(texto || '').toLowerCase() + ' ';
  if (!RE_QUE_ES.test(texto)) return null;
  let mejor = null;
  for (const g of glosario) {
    for (const lang of ['es', 'en']) {
      const term = (g[lang] && g[lang].term ? g[lang].term : '').toLowerCase();
      if (term.length < 3) continue;
      if (t.includes(' ' + term + ' ') || t.includes(' ' + term + '?') || t.includes(' ' + term + 's ')) {
        // El término más largo gana: "tipo de cambio" antes que "cambio".
        if (!mejor || term.length > mejor.term.length) mejor = { id: g.id, term };
      }
    }
  }
  return mejor ? mejor.id : null;
}

/** El OTRO activo que menciona la pregunta (para comparar), si menciona uno. */
function otroActivoEnPregunta(texto, idActual) {
  const t = ' ' + String(texto || '').toLowerCase() + ' ';
  let mejor = null;
  for (const a of contexto.activos) {
    if (a.id === idActual) continue;
    const nombres = [a.sym.toLowerCase(), a.id, a.nombre.es.toLowerCase(), a.nombre.en.toLowerCase()];
    for (const n of nombres) {
      if (n.length < 3) continue;
      if (t.includes(' ' + n + ' ') || t.includes(' ' + n + '?') || t.includes(' ' + n + ',')) {
        if (!mejor || n.length > mejor.n.length) mejor = { id: a.id, n };
      }
    }
  }
  return mejor ? mejor.id : null;
}

/**
 * Lee la intención y el alcance de una pregunta escrita a mano.
 * Devuelve { intencion, alcance, terminoId, otroId } — todo puede ser null.
 */
function clasificarPregunta(pregunta, idActual) {
  const p = String(pregunta || '').trim();
  if (!p) return { intencion: null, alcance: null, terminoId: null, otroId: null };

  let alcance = null;
  for (const { re, rango } of RE_ALCANCE) {
    if (re.test(p)) { alcance = rango; break; }
  }

  const terminoId = terminoEnPregunta(p);
  // El otro activo se busca SIEMPRE que la pregunta mencione uno ("¿y el
  // bitcoin?" también es preguntar por el bitcoin), pero solo cuenta como
  // comparación si la pregunta compara.
  const otroId = otroActivoEnPregunta(p, idActual);

  let intencion = 'que_es';
  if (otroId && RE_COMPARAR.test(p)) {
    intencion = 'comparar';
  } else if (RE_PORQUE.test(p) && (RE_MOVIMIENTO_HECHO.test(p) || alcance)) {
    intencion = 'causa';
  } else if ((RE_CUANTO_CUANDO.test(p) && RE_MOVIMIENTO_HECHO.test(p)) ||
    RE_COMO_VA.test(p) || RE_EXTREMOS.test(p) ||
    (RE_MOVIMIENTO_HECHO.test(p) && alcance)) {
    intencion = 'movimiento';
  } else if (terminoId) {
    intencion = 'termino';
  }

  return { intencion, alcance, terminoId, otroId };
}

// ---------------------------------------------------------------------------
// 1.6 La guardia de la causa inventada.
//
// Cuando la pregunta pide un PORQUÉ y el sitio no tiene ninguna noticia
// aprobada del activo, el bloque DATOS se marca `sinCausa` y la respuesta
// tiene que cumplir dos cosas, comprobadas aquí y no en el prompt:
//
//   1. ADMITIR que no se sabe (admiteNoSaber): "con estos datos no se puede
//      saber por qué" tiene que estar escrito, no sobreentendido.
//   2. NO ATRIBUIR ninguna causa (atribuyeCausa): ni "porque la Fed", ni
//      "probablemente por los resultados", ni "tras el anuncio". Un modelo de
//      lenguaje SIEMPRE tiene a mano una causa plausible de memoria, y una
//      causa plausible sin fuente es exactamente la mentira que este sitio
//      promete no contar.
//
// La única excepción del vocabulario causal es la frase que niega el saber:
// "no lo sé porque no hay ninguna noticia que lo explique" usa "porque" para
// explicar la ignorancia, no el precio. Igual que en `negada`, el alcance es
// la MISMA oración.

const RE_CAUSA_VOCAB = new RegExp(
  '\\b(?:porque|debido\\s+a|a\\s+causa\\s+de|se\\s+deb(?:e|i[óo])\\s+a|gracias\\s+a|' +
  'por\\s+culpa\\s+de|impulsad[oa]s?\\s+por|explicad[oa]s?\\s+por|provocad[oa]s?\\s+por|' +
  'como\\s+(?:resultado|consecuencia)\\s+de|reaccion(?:[óo]|a|ando)\\s+a|' +
  'tras\\s+(?:el|la|los|las|un|una)|luego\\s+de\\s+que|despu[ée]s\\s+de\\s+que|' +
  'probablemente|posiblemente|quiz[áa]s?|tal\\s+vez|puede\\s+que|seguramente|' +
  'suele\\s+(?:subir|bajar|moverse)|' +
  'because|due\\s+to|driven\\s+by|thanks\\s+to|caused\\s+by|on\\s+the\\s+back\\s+of|' +
  'in\\s+response\\s+to|after\\s+(?:the|a|an)|following\\s+(?:the|a|an)|' +
  'likely|probably|possibly|perhaps|maybe|usually\\s+(?:rises|falls|moves))' + FIN, 'gi');

const RE_ADMITE = new RegExp(
  '\\b(?:no\\s+(?:se\\s+puede|puedo|podemos)\\s+saber|no\\s+se\\s+sabe|no\\s+lo\\s+s[ée]|' +
  'no\\s+(?:hay|existe)\\s+(?:ninguna\\s+|una\\s+)?(?:noticia|informaci[óo]n|dato|fuente)|' +
  'no\\s+(?:dicen?|explican?|muestran?|indican?)\\s+(?:el\\s+)?por\\s?qu[ée]|' +
  'no\\s+(?:me\\s+)?(?:dicen?|alcanzan?)\\s+para\\s+saber|' +
  'cannot\\s+(?:know|tell|say)|can\'?t\\s+(?:know|tell|say)|no\\s+way\\s+to\\s+know|' +
  'do(?:es)?\\s+not\\s+(?:say|explain|show|tell)|don\'?t\\s+know|' +
  'there\\s+is\\s+no\\s+(?:approved|reviewed)?\\s*(?:news|information|source|data))' + FIN, 'i');

/** true si el texto ADMITE en algún sitio que la causa no se sabe. */
function admiteNoSaber(texto) {
  return RE_ADMITE.test(String(texto || ''));
}

/**
 * true si el texto atribuye o insinúa una causa que los DATOS no respaldan.
 * Se salva solo el vocabulario causal cuya oración niega el saber.
 */
function atribuyeCausa(texto) {
  const t = String(texto || '');
  for (const m of t.matchAll(RE_CAUSA_VOCAB)) {
    // La oración de la coincidencia: del corte anterior al corte siguiente.
    const antes = t.slice(0, m.index);
    const corte = antes.search(RE_CORTE);
    const inicio = corte === -1 ? 0 : corte + 1;
    const resto = t.slice(m.index);
    const fin = resto.search(/[.:;!?—\n]/);
    const oracion = t.slice(inicio, fin === -1 ? t.length : m.index + fin);
    if (!RE_ADMITE.test(oracion) && !RE_NEG_SABER.test(oracion) && !RE_NEG_ABSOLUTA.test(oracion)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 2. La guardia de cifras.
//
// Cada número de la respuesta tiene que existir en el bloque DATOS. Las reglas
// finas están donde se aplican; el resumen:
//   · Fechas y horas se parten antes de mirar: "2026-08-21" son 2026, 08 y 21,
//     no un 2026 y un −8.
//   · Se compara en VALOR ABSOLUTO: DATOS dice "cambio: −2.31 %" y la respuesta
//     dice "cayó 2.31 %". Es la misma cifra; el signo lo llevan las palabras.
//   · Se admite redondear, nunca inventar: si DATOS trae 18.4032, la respuesta
//     puede decir 18.40 (redondear 18.4032 a dos decimales da 18.40) pero no
//     18.41.
//   · Los enteros del 0 al 10 pasan solos SALVO que lleven pegada una unidad,
//     DETRÁS (%, pesos, dólares, puntos, y el símbolo: "9$") o DELANTE ($, MXN,
//     USD). "Tres cosas" y "5 minutos" son prosa; "5 %", "$9" y "9$" son cifras
//     y tienen que estar respaldadas. Las tres posiciones, porque el dinero se
//     escribe en las tres.

/** Parte fechas y horas para que sus partes cuenten como números sueltos. */
function separarFechas(texto) {
  return String(texto || '').replace(/(\d)\s*[-–—:/]\s*(\d)/g, '$1 $2');
}

const RE_NUMERO = /-?\d[\d.,]*/g;

/** "1,234.56" → 1234.56 · "18,40" → 18.4 · "3." → 3. null si no es número. */
function normalizar(token) {
  let s = token.replace(/[.,]+$/, '');
  s = s.replace(/,(?=\d{3}(\D|$))/g, '');
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Cuántos decimales trae escrito el token, para saber cuánto se redondeó. */
function decimalesDe(token) {
  const s = token.replace(/[.,]+$/, '');
  const m = s.match(/[.,](\d+)$/);
  return m ? m[1].length : 0;
}

/** Los números que aparecen en un texto, en valor absoluto y sin repetir. */
function numerosDe(texto) {
  const out = [];
  for (const m of separarFechas(texto).matchAll(RE_NUMERO)) {
    const n = normalizar(m[0]);
    if (n !== null) out.push(Math.abs(n));
  }
  return Array.from(new Set(out));
}

// Unidades que convierten un número pequeño en una CIFRA (y por tanto le
// quitan el pase libre de los enteros del 0 al 10).
// OJO con el `\b`: `%\b` NO casa con "5 % este mes" (después del % viene un
// espacio y entre dos caracteres que no son de palabra no hay frontera), así
// que el % va fuera del grupo con frontera. Ese error dejaba pasar justo el
// caso que más importa — una cifra con unidad.
// El símbolo de moneda cuenta también PEGADO DETRÁS ("9$", "7 €"): es la
// tercera posición en la que se escribe el dinero, y sin ella quedaba abierto
// el mismo agujero que ya se tapó delante — un entero ≤ 10 inventado con el
// pase libre de la prosa. Va junto al %, fuera del grupo con `\b`, por el mismo
// motivo que él: entre un símbolo y el espacio que le sigue no hay frontera.
const RE_UNIDAD = /^\s*([%$€£¥]|(?:por\s?ciento|percent|pesos?|d[óo]lares?|dollars?|USD|MXN|EUR|JPY|GBP|puntos?|points?|mil|millones?|million|billion)\b)/i;

// Y la MISMA unidad puesta DELANTE, que es como se escribe el dinero casi
// siempre: "$9", "MXN 20", "US$ 5". Mirar solo lo que va detrás del número
// dejaba un agujero del tamaño del glosario: 32 de sus 61 entradas escriben su
// ejemplo en pesos con el símbolo delante ("$368", "$20", "$1,000") y la
// instrucción de `termino` le pide al modelo justo un ejemplo en pesos. Sin
// esto, un "$9" inventado conservaba el pase libre de los enteros del 0 al 10 —
// el mismo bug que ya se había cazado con "7 pesos", pero espejado.
const RE_MONEDA_ANTES = /(?:[$€£¥]|\b(?:MXN|USD|EUR|JPY|GBP))\s*$/i;

const RE_FECHA_ISO = /\b\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?/g;

/**
 * Lo que el bloque DATOS respalda, en DOS montones.
 *
 * Las fechas se separan del resto a propósito. Un bloque con "2026-07-23"
 * mete un 7, un 23 y un 2026 en el saco de lo permitido, y sin separarlos ese
 * 7 le daba pase libre a "costaría 7 pesos más" — una cifra inventada
 * respaldada por el mes de una fecha. Así que una cifra CON UNIDAD (%, pesos,
 * puntos) solo puede apoyarse en `cifras`; las fechas solo respaldan números
 * escritos como fechas.
 */
function permitidosDe(datos) {
  const fechas = [];
  const resto = String(datos || '').replace(RE_FECHA_ISO, (fecha) => {
    for (const parte of fecha.split(/[-T :]/)) {
      const n = Number(parte);
      if (Number.isFinite(n)) fechas.push(Math.abs(n));
    }
    return ' ';
  });
  return { cifras: numerosDe(resto), fechas: Array.from(new Set(fechas)) };
}

/**
 * Los números de `respuesta` que NO están respaldados por `datos`.
 * Devuelve los tokens tal y como estaban escritos, para poder decirle al modelo
 * exactamente cuál sobra en el reintento.
 */
function numerosFuera(respuesta, datos) {
  const { cifras, fechas } = permitidosDe(datos);
  const texto = separarFechas(respuesta);
  const fuera = [];

  for (const m of texto.matchAll(RE_NUMERO)) {
    // Sin el punto final de la frase: el reintento le dice al modelo qué cifra
    // sobra, y "380." no es una cifra.
    const token = m[0].replace(/[.,]+$/, '');
    const n = normalizar(token);
    if (n === null) continue;
    const abs = Math.abs(n);
    const dec = decimalesDe(token);
    const cola = texto.slice(m.index + token.length, m.index + token.length + 16);
    const cabeza = texto.slice(Math.max(0, m.index - 8), m.index);
    const llevaUnidad = RE_UNIDAD.test(cola) || RE_MONEDA_ANTES.test(cabeza);
    const respalda = (lista) => lista.some((p) => p === abs || Number(p.toFixed(dec)) === abs);

    if (llevaUnidad) {
      if (!respalda(cifras) && !fuera.includes(token)) fuera.push(token);
      continue;
    }
    // Enteros pequeños sin unidad: prosa, no dato ("tres razones", "2 minutos").
    if (Number.isInteger(abs) && abs <= 10) continue;
    if (!respalda(cifras) && !respalda(fechas) && !fuera.includes(token)) fuera.push(token);
  }
  return fuera;
}

// ---------------------------------------------------------------------------
// 3. El bloque DATOS. Una función por tipo de contexto.
//
// Todas devuelven { titulo, datos, asOf, fuentes, leccion } o lanzan un error
// con code = 'IA_SIN_DATOS'. `datos` es el texto EXACTO que ve el modelo y
// contra el que se comprueban las cifras: nada que no esté aquí puede salir en
// la respuesta.

function sinDatos(detalle) {
  const err = new Error(detalle);
  err.code = 'IA_SIN_DATOS';
  return err;
}

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : 's/d');

/** Fecha de un punto de la serie en el huso de la BOLSA, no en el del servidor. */
function fechaBolsa(ts, tzOffset, conHora) {
  const d = new Date((ts + (tzOffset || 0)) * 1000);
  const iso = d.toISOString();
  return conHora ? iso.slice(0, 10) + ' ' + iso.slice(11, 16) : iso.slice(0, 10);
}

/**
 * Resume una serie de precios en el bloque DATOS. Las CUENTAS SE HACEN AQUÍ
 * (primero, último, cambio, máximo, mínimo, mayor salto) por dos razones: un
 * modelo de lenguaje calculando porcentajes es una fuente de errores, y la
 * guardia de cifras exige que cada número de la respuesta ya exista aquí.
 */
function resumirSerie(serie, decimales) {
  const puntos = (serie.points || []).filter((p) => typeof p[1] === 'number');
  if (puntos.length < 2) throw sinDatos('la serie tiene menos de dos puntos');

  const conHora = serie.range === '1D' || serie.range === '1W';
  const tz = serie.tzOffset || 0;
  const dia = (p) => fechaBolsa(p[0], tz, conHora);

  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  let alto = primero;
  let bajo = primero;
  for (const p of puntos) {
    if (p[1] > alto[1]) alto = p;
    if (p[1] < bajo[1]) bajo = p;
  }
  const cambio = ultimo[1] - primero[1];
  const cambioPct = (cambio / primero[1]) * 100;

  // El tramo de un paso que más se movió en cada dirección: es lo que hace que
  // la explicación pueda decir "el salto fue el día X" sin inventárselo.
  let subida = null;
  let bajada = null;
  for (let i = 1; i < puntos.length; i++) {
    const d = puntos[i][1] - puntos[i - 1][1];
    if (!subida || d > subida.d) subida = { d, desde: puntos[i - 1], hasta: puntos[i] };
    if (!bajada || d < bajada.d) bajada = { d, desde: puntos[i - 1], hasta: puntos[i] };
  }

  // Ocho paradas repartidas por la serie para poder narrar la forma.
  const paradas = [];
  const n = Math.min(8, puntos.length);
  for (let i = 0; i < n; i++) {
    const p = puntos[Math.round((i * (puntos.length - 1)) / (n - 1))];
    const linea = '  ' + dia(p) + ': ' + num(p[1], decimales);
    if (!paradas.includes(linea)) paradas.push(linea);
  }

  return {
    ultimo: ultimo[1],
    asOf: dia(ultimo),
    texto: [
      'Serie de precios (' + serie.range + ', ' + puntos.length + ' puntos, cierre de cada barra):',
      '  primer punto  ' + dia(primero) + ': ' + num(primero[1], decimales),
      '  último punto  ' + dia(ultimo) + ': ' + num(ultimo[1], decimales),
      '  cambio del periodo: ' + num(cambio, decimales) + ' (' + num(cambioPct, 2) + ' %)',
      '  máximo del periodo ' + dia(alto) + ': ' + num(alto[1], decimales),
      '  mínimo del periodo ' + dia(bajo) + ': ' + num(bajo[1], decimales),
      '  mayor subida de un tramo ' + dia(subida.desde) + ' → ' + dia(subida.hasta) + ': ' + num(subida.d, decimales),
      '  mayor bajada de un tramo ' + dia(bajada.desde) + ' → ' + dia(bajada.hasta) + ': ' + num(bajada.d, decimales),
      'Paradas de la serie:',
      ...paradas
    ].join('\n')
  };
}

const activoPorId = (id) => contexto.activos.find((a) => a.id === id);
const leccionPorSlug = (slug) => contexto.lecciones.find((l) => l.slug === slug);
const terminoPorId = (id) => glosario.find((g) => g.id === id);

function fichaDeActivo(a, lang) {
  return [
    'Ficha del activo (registro del sitio, src/data/symbols.ts):',
    '  nombre: ' + a.nombre[lang],
    '  símbolo: ' + a.sym,
    '  tipo: ' + a.tipo,
    '  moneda: ' + a.moneda,
    '  proveedor del precio: ' + a.fuente + ' (retraso de ' + a.retrasoMin + ' minutos)',
    '  qué es: ' + a.que[lang]
  ].join('\n');
}

/**
 * La serie de UN activo como texto del bloque DATOS. En el rango 1D añade el
 * movimiento de HOY contra el cierre del día hábil anterior — la cuenta la
 * hace ESTE archivo, como todas: preguntar "¿por qué subió hoy?" y recibir el
 * resumen del mes era la mitad del bug que esto arregla.
 */
async function serieDeActivo(a, rango, deps) {
  const r = await deps.historia.serie(a.history, rango);
  const resumen = resumirSerie(r.valor, a.decimales);
  let texto = resumen.texto;

  if (rango === '1D' && typeof r.valor.prevClose === 'number' && isFinite(r.valor.prevClose)) {
    const cambioHoy = resumen.ultimo - r.valor.prevClose;
    const pctHoy = (cambioHoy / r.valor.prevClose) * 100;
    texto += '\n' + [
      'Movimiento de HOY (la sesión más reciente):',
      '  cierre del día hábil anterior: ' + num(r.valor.prevClose, a.decimales),
      '  último precio: ' + num(resumen.ultimo, a.decimales),
      '  cambio de hoy: ' + num(cambioHoy, a.decimales) + ' (' + num(pctHoy, 2) + ' %)'
    ].join('\n');
  }
  if (r.stale) texto += '\n  aviso: es el último dato conocido, el proveedor no respondió.';
  return { texto, asOf: resumen.asOf };
}

/**
 * Las noticias APROBADAS que mencionan este activo, para las preguntas de
 * causa. Solo aprobadas: un borrador es texto de IA que nadie ha leído, y esa
 * puerta ya está cerrada en datosDeNoticia — aquí también.
 */
async function noticiasDelActivo(id, lang, deps) {
  try {
    const lista = await deps.noticias.listar({ estado: 'aprobada', limite: 60 });
    return lista
      .filter((n) => Array.isArray(n.simbolos) && n.simbolos.includes(id))
      .slice(0, 2)
      .map((n) => {
        const t = n[lang] || n.es || n.en;
        return {
          texto: [
            '  · [' + String(n.fuente.publicado).slice(0, 10) + '] ' + t.titulo,
            '    qué pasó: ' + t.que,
            '    por qué importa: ' + t.porque,
            '    impacto en mercados: ' + t.impacto
          ].join('\n'),
          fuente: { titulo: n.fuente.nombre + ' — ' + n.fuente.titular, url: n.fuente.url }
        };
      });
  } catch (err) {
    // Sin Redis no hay noticias que citar; la explicación sale igual, solo que
    // sin causa — que es exactamente lo que sinCausa obliga a decir.
    console.warn('ia: sin noticias del activo:', err && err.message);
    return [];
  }
}

async function datosDeActivo(pedido, deps) {
  const a = activoPorId(pedido.id);
  if (!a) throw sinDatos('activo desconocido: ' + pedido.id);

  // El rango que pide LA PREGUNTA gana al de la página: "¿cómo va el año?"
  // con la gráfica en 1M se contesta con la serie del año.
  const rango = pedido.alcance || pedido.rango;

  const fuentes = [{ titulo: a.fuente, url: null }];
  let asOf = new Date().toISOString().slice(0, 10);
  let serieTexto = 'No hay serie de precios disponible ahora mismo para este activo.';

  if (a.history) {
    try {
      const s = await serieDeActivo(a, rango, deps);
      serieTexto = s.texto;
      asOf = s.asOf;
      // La gráfica siempre es de Yahoo, pero el precio de la ficha puede ser de
      // otro proveedor (Twelve Data en las acciones). Sin este filtro, una
      // divisa listaba "Yahoo Finance · Yahoo Finance".
      if (!fuentes.some((f) => f.titulo === 'Yahoo Finance')) fuentes.push({ titulo: 'Yahoo Finance', url: null });
    } catch (err) {
      console.warn('ia: sin serie para ' + a.history + ':', err && err.message);
    }
  }

  const partes = [fichaDeActivo(a, pedido.lang), serieTexto];
  let sinCausa = false;

  // Pregunta de CAUSA: las únicas causas que existen son las noticias
  // aprobadas del símbolo. Si no hay ninguna, el bloque lo dice con todas sus
  // letras y se marca sinCausa — la guardia de 1.6 hace el resto.
  if (pedido.intencion === 'causa') {
    const noticiasActivo = await noticiasDelActivo(pedido.id, pedido.lang, deps);
    if (noticiasActivo.length) {
      partes.push(
        'Noticias del sitio que mencionan este activo (escritas a partir de un titular real y ' +
        'REVISADAS por una persona; son las ÚNICAS causas que se pueden citar):\n' +
        noticiasActivo.map((n) => n.texto).join('\n')
      );
      for (const n of noticiasActivo) fuentes.push(n.fuente);
    } else {
      sinCausa = true;
      partes.push(
        'Noticias aprobadas de este activo: NINGUNA. El sitio no tiene ninguna noticia revisada ' +
        'que explique por qué se movió. La causa del movimiento NO SE SABE con estos datos.'
      );
    }
  }

  // La pregunta compara (o menciona) otro activo del sitio: su ficha y su
  // serie del MISMO rango entran también, con las cuentas ya hechas.
  if (pedido.otroId) {
    const b = activoPorId(pedido.otroId);
    if (b) {
      let otraSerie = 'No hay serie de precios disponible ahora mismo para este activo.';
      if (b.history) {
        try {
          otraSerie = (await serieDeActivo(b, rango, deps)).texto;
        } catch (err) {
          console.warn('ia: sin serie para ' + b.history + ':', err && err.message);
        }
      }
      partes.push(
        'EL OTRO ACTIVO que menciona la pregunta — ' + b.nombre[pedido.lang] + ' (' + b.sym + '):\n' +
        fichaDeActivo(b, pedido.lang) + '\n' + otraSerie
      );
    }
  }

  return {
    titulo: a.nombre[pedido.lang] + ' (' + a.sym + ')',
    datos: partes.join('\n\n'),
    asOf,
    fuentes,
    sinCausa,
    leccion: contexto.rutas[a.leccion] ? contexto.rutas[a.leccion][pedido.lang] : null
  };
}

async function datosDeNoticia(pedido, deps) {
  // Solo APROBADAS. Un borrador es texto de IA que nadie ha leído todavía, y la
  // promesa del sitio es que eso no se publica — tampoco por esta puerta.
  const lista = await deps.noticias.listar({ estado: 'aprobada', limite: 60 });
  // 'ultima' es el alias del índice de /news: el botón flotante de esa página
  // no sabe en el build qué noticia estará arriba, así que lo resuelve el
  // servidor con la más reciente aprobada.
  const n = pedido.id === 'ultima'
    ? lista[0]
    : lista.find((x) => x.slug === pedido.id || x.id === pedido.id);
  if (!n) throw sinDatos('noticia no encontrada o no aprobada: ' + pedido.id);

  const t = n[pedido.lang] || n.es || n.en;
  return {
    titulo: t.titulo,
    datos: [
      'Noticia explicada del sitio (escrita a partir de un titular real y REVISADA por una persona):',
      '  título: ' + t.titulo,
      '  qué pasó: ' + t.que,
      '  por qué importa: ' + t.porque,
      '  impacto en mercados: ' + t.impacto,
      '  fuente original: ' + n.fuente.nombre + ' — ' + n.fuente.titular,
      '  publicada: ' + n.fuente.publicado
    ].join('\n'),
    asOf: String(n.fuente.publicado).slice(0, 10),
    fuentes: [{ titulo: n.fuente.nombre + ' — ' + n.fuente.titular, url: n.fuente.url }],
    leccion: n.leccion && contexto.rutas[n.leccion] ? contexto.rutas[n.leccion][pedido.lang] : null
  };
}

function datosDeTermino(pedido) {
  const g = terminoPorId(pedido.id);
  if (!g) throw sinDatos('término fuera del glosario: ' + pedido.id);
  const t = g[pedido.lang];
  return {
    titulo: t.term,
    datos: [
      'Término del glosario del sitio:',
      '  término: ' + t.term,
      '  definición: ' + t.def,
      '  en pesos: ' + t.pesos
    ].join('\n'),
    asOf: new Date().toISOString().slice(0, 10),
    fuentes: [{ titulo: 'Glosario de Smart Finance', url: contexto.rutas['lessons.glossary'][pedido.lang] }],
    leccion: contexto.rutas[g.lesson] ? contexto.rutas[g.lesson][pedido.lang] : null
  };
}

function datosDeLeccion(pedido) {
  const l = leccionPorSlug(pedido.id);
  if (!l) throw sinDatos('lección desconocida: ' + pedido.id);
  const t = l[pedido.lang];
  return {
    titulo: t.titulo,
    datos: [
      'Lección publicada en el sitio:',
      '  título: ' + t.titulo,
      '  de qué va: ' + t.descripcion,
      '  texto completo de la lección:',
      t.cuerpo
    ].join('\n'),
    asOf: t.actualizada || new Date().toISOString().slice(0, 10),
    fuentes: t.fuentes.map((f) => ({ titulo: f.titulo + (f.editor ? ' — ' + f.editor : ''), url: f.url })),
    leccion: l.href[pedido.lang]
  };
}

function datosDeReporte(pedido) {
  const r = (contexto.reportes || []).find((x) => x.slug === pedido.id);
  if (!r) throw sinDatos('reporte desconocido: ' + pedido.id);
  return {
    titulo: r.nombre + ' (' + r.ticker + ')',
    datos: r.datos,
    asOf: r.dataAsOf || new Date().toISOString().slice(0, 10),
    fuentes: r.fuentes,
    leccion: contexto.rutas['lesson.accion'] ? contexto.rutas['lesson.accion'][pedido.lang] : null
  };
}

function datosDeReto(pedido) {
  if (!contexto.reto) throw sinDatos('el manifiesto no trae el reto');
  return {
    titulo: pedido.lang === 'es' ? 'El reto del día' : 'The daily challenge',
    datos: contexto.reto.datos,
    asOf: new Date().toISOString().slice(0, 10),
    fuentes: [{
      titulo: pedido.lang === 'es' ? 'Las reglas del reto, publicadas en la propia página' : 'The challenge rules, published on the page itself',
      url: contexto.reto.href ? contexto.reto.href[pedido.lang] : null
    }],
    leccion: contexto.rutas['lesson.bolsa'] ? contexto.rutas['lesson.bolsa'][pedido.lang] : null
  };
}

async function armarDatos(pedido, deps) {
  let bloque;
  if (pedido.tipo === 'activo' || pedido.tipo === 'grafica') bloque = await datosDeActivo(pedido, deps);
  else if (pedido.tipo === 'noticia') bloque = await datosDeNoticia(pedido, deps);
  else if (pedido.tipo === 'termino') bloque = datosDeTermino(pedido);
  else if (pedido.tipo === 'reporte') bloque = datosDeReporte(pedido);
  else if (pedido.tipo === 'reto') bloque = datosDeReto(pedido);
  else bloque = datosDeLeccion(pedido);

  // La pregunta menciona un término del glosario ("¿qué es un ETF?" en la
  // ficha del SPY): su entrada entra al bloque, venga el pedido del tipo que
  // venga. Salvo que el bloque YA SEA esa entrada, claro.
  if (pedido.terminoId && !(pedido.tipo === 'termino' && pedido.id === pedido.terminoId)) {
    const g = terminoPorId(pedido.terminoId);
    if (g) {
      const t = g[pedido.lang];
      bloque.datos += '\n\n' + [
        'Término del glosario del sitio que menciona la pregunta:',
        '  término: ' + t.term,
        '  definición: ' + t.def,
        '  en pesos: ' + t.pesos
      ].join('\n');
    }
  }
  return bloque;
}

// ---------------------------------------------------------------------------
// 4. El prompt.

const SISTEMA = [
  'You explain finance to a student who is just starting, for Smart Finance, a bilingual site',
  'written by Jaime Sandoval. You are not a person and the page says so.',
  '',
  'THE ONE RULE: the DATA block in the user message is everything you know. You have no other',
  'knowledge. Every fact, every name and above all every NUMBER in your answer must already be',
  'in that block, written there.',
  '- Never add a figure from memory, not even one you are sure about. Not a price, not a date,',
  '  not a percentage, not a market cap.',
  '- Never compute a new number. The arithmetic is already done for you in the DATA block.',
  '- If the DATA block does not answer what was asked, say so plainly, in one sentence, in the',
  '  reader\'s language. "I do not know with the data I have" is a correct answer, not a failure.',
  '- Do not write numbers that are not in the DATA block, not even as examples or round figures.',
  '  Small counts are fine written as words ("three reasons").',
  '',
  'NEVER FINANCIAL ADVICE. Do not say what to buy, sell, hold or avoid. Do not predict a price',
  'or a direction. Do not say something is cheap, expensive, a good entry or a good moment. If',
  'the question asks for that, explain instead what the data shows and stop there.',
  '',
  'VOICE: close and plain, the way you would explain it to a friend who does not follow markets.',
  'No hype, no emoji, no exclamation marks, no filler like "great question". Short sentences.',
  'Explain a technical term in the same breath you use it.',
  '',
  'LENGTH: 90 to 150 words. Two or three short paragraphs, separated by a blank line.'
].join('\n');

const INSTRUCCION = {
  noticia: {
    explicar: 'Explain what happened and why it matters to someone who is 18 and lives in Mexico. ' +
      'Connect it to something they actually feel: the peso, prices, a job, tuition. Do not repeat ' +
      'the story sentence by sentence — say what it MEANS.',
    preguntas: 'Write three study questions about this story.'
  },
  activo: {
    explicar: 'Explain what this asset is, what moves its price, and what it did over the range in ' +
      'the data. Use the figures from the series for the movement.',
    preguntas: 'Write three study questions about this asset and what its price did.'
  },
  grafica: {
    explicar: 'Read the chart out loud: when it went up, when it went down, and by how much, using ' +
      'ONLY the figures in the series. Say what the shape looks like overall. Do not guess WHY it ' +
      'moved unless the data says so — if you do not know the reason, say you do not.',
    preguntas: 'Write three study questions about reading this chart.'
  },
  termino: {
    explicar: 'Explain this term more simply than the glossary does, and give an example in Mexican ' +
      'pesos. If the glossary already gives a peso example, build on it instead of inventing a new one.',
    preguntas: 'Write three study questions about this term.'
  },
  leccion: {
    explicar: 'Explain the core idea of this lesson more simply than the lesson does, and give one ' +
      'example in Mexican pesos taken from the lesson text.',
    preguntas: 'Write three study questions about this lesson.'
  },
  reporte: {
    explicar: 'Explain what this research report shows so far: what the company is, and how its ' +
      'revenue, margins and free cash flow have moved across the fiscal years in the data. The ' +
      'report is a DRAFT and the data says so: no thesis, no target, no conclusion — do not offer ' +
      'one, and never say whether the company is cheap or expensive.',
    preguntas: 'Write three study questions about what this report\'s figures show.'
  },
  reto: {
    explicar: 'Explain how the daily challenge works using only the rules in the data: what the ' +
      'player sees, how the daily pick and the streak work, and what the game teaches. Make clear ' +
      'it is a reading exercise, not a way to predict prices.',
    preguntas: 'Write three study questions about how this challenge works.'
  }
};

const ESQUEMA = {
  type: 'object',
  properties: {
    respuesta: { type: 'string' },
    preguntas: { type: 'array', items: { type: 'string' } },
    datosUsados: { type: 'array', items: { type: 'string' } },
    fuentes: { type: 'array', items: { type: 'string' } },
    asOf: { type: 'string' }
  },
  required: ['respuesta', 'preguntas', 'datosUsados', 'fuentes', 'asOf'],
  additionalProperties: false
};

// Plan B si la API rechazara output_config (mismo patrón que api/news.js y
// _lib/borradores.js): el formato se pide en el prompt y el JSON se recorta a
// mano. Sin esto, un 400 por ese campo apagaría el explicador en silencio.
const PISTA_JSON = [
  '',
  'Reply with raw JSON only — no prose, no markdown fence. Exact shape:',
  '{"respuesta":"...","preguntas":[],"datosUsados":["..."],"fuentes":["..."],"asOf":"YYYY-MM-DD"}'
].join('\n');

function recortarJSON(texto) {
  const a = texto.indexOf('{');
  const b = texto.lastIndexOf('}');
  if (a === -1 || b <= a) throw new Error('la respuesta no traía JSON');
  return JSON.parse(texto.slice(a, b + 1));
}

/**
 * El encargo cuando hay una pregunta escrita: responderla, y responderla
 * PRIMERO. Antes el TASK era siempre el genérico ("explica este activo") y la
 * pregunta viajaba de posdata — por eso "¿por qué subió hoy?" recibía el
 * resumen del mes. La instrucción fina depende de la intención clasificada.
 */
function encargoDePregunta(pedido, bloque) {
  const lineas = [
    'TASK: The reader typed a question in their own words: "' + pedido.pregunta + '"',
    'ANSWER THAT QUESTION, and answer it in the FIRST sentence. Do not open with a generic ' +
    'description of what this asset or page is — the reader is already looking at it. Add ' +
    'background only if the question needs it.'
  ];
  if (pedido.intencion === 'causa' && bloque.sinCausa) {
    lineas.push(
      'The question asks WHY it moved, and the DATA block contains NO verified cause: there is ' +
      'no approved news item about this asset. Your first sentence must say plainly that with ' +
      'the data on this page the reason cannot be known. Then offer what the data DOES show — ' +
      'the movement itself, with its figures. Do NOT suggest, guess or hint at any cause, ' +
      'however plausible: no "because", no "likely", no "after the…", no market narrative from ' +
      'memory. Causal language is allowed only to explain that the cause is unknown.'
    );
  } else if (pedido.intencion === 'causa') {
    lineas.push(
      'The question asks WHY it moved. The ONLY causes you may mention are the approved news ' +
      'items included in the DATA block, each reviewed by a person. If they do not explain this ' +
      'specific move, say so plainly instead of guessing.'
    );
  } else if (pedido.intencion === 'movimiento') {
    lineas.push(
      'The question asks about the movement itself. The arithmetic is already done in the DATA ' +
      'block (change of the period, high, low, biggest one-step moves) — narrate those figures ' +
      'and never compute new ones.'
    );
  } else if (pedido.intencion === 'comparar') {
    lineas.push(
      'The question involves two assets, and both are in the DATA block with their own series, ' +
      'computed by the server. Compare only with those figures; if the data does not settle the ' +
      'comparison, say what is missing.'
    );
  }
  return lineas;
}

function mensajeUsuario(pedido, bloque, correccion) {
  const idioma = pedido.lang === 'es' ? 'Mexican Spanish' : 'English';
  const partes = ['Answer in ' + idioma + '. The reader is looking at: ' + bloque.titulo, ''];

  // El encargo. La pregunta escrita MANDA sobre el genérico; la selección de
  // una frase es su propio encargo; sin ninguna de las dos, el de siempre.
  if (pedido.modo === 'explicar' && pedido.pregunta) {
    partes.push(...encargoDePregunta(pedido, bloque));
  } else if (pedido.modo === 'explicar' && pedido.seleccion) {
    partes.push(
      'TASK: The reader selected this exact phrase on the page: "' + pedido.seleccion + '"',
      'Explain THAT PHRASE more simply than the page does, in the first sentence, and give an ' +
      'example in Mexican pesos if the DATA block provides one. Do not summarize the whole page. ' +
      'If the phrase asks for advice, explain the concept behind it without recommending anything.'
    );
  } else {
    partes.push('TASK: ' + INSTRUCCION[pedido.tipo][pedido.modo]);
  }

  partes.push(
    pedido.modo === 'preguntas'
      ? 'Put the three questions in "preguntas" and leave "respuesta" as one short line introducing them. ' +
        'The questions must be answerable from the DATA block alone.'
      : 'Put the explanation in "respuesta" and leave "preguntas" empty.',
    '',
    'Also fill: "datosUsados" = the two to four lines of the DATA block you actually leaned on, ' +
    'copied short; "fuentes" = the sources listed at the end of the DATA block, copied exactly; ' +
    '"asOf" = the as-of date given below, copied exactly.'
  );

  // La conversación anterior, si la hay. Entra como CONTEXTO de lectura y
  // nada más: viene del navegador, así que sus cifras no respaldan nada.
  if (pedido.historial && pedido.historial.length) {
    partes.push('', 'Earlier exchanges in this same conversation, oldest first (context only):');
    for (const h of pedido.historial) {
      partes.push('  the reader asked: "' + h.p + '"', '  you answered: "' + h.r + '"');
    }
    partes.push(
      'The new question may refer back to them ("and this year?", "why is that?"). Figures from ' +
      'earlier answers may be repeated ONLY if they also appear in the DATA block below.'
    );
  }

  partes.push(
    '',
    '=== DATA (everything you know) ===',
    bloque.datos,
    '',
    'Sources of this data: ' + bloque.fuentes.map((f) => f.titulo).join(' · '),
    'as-of: ' + bloque.asOf,
    '=== END OF DATA ==='
  );

  if (correccion && correccion.cifras) {
    partes.push(
      '',
      'YOUR PREVIOUS ANSWER WAS REJECTED. It contained figures that are not in the DATA block: ' +
      correccion.cifras.join(', ') + '. Those numbers do not exist. Write the answer again using ' +
      'only figures that appear in the DATA block, or no figures at all.'
    );
  } else if (correccion && correccion.causa) {
    partes.push(
      '',
      'YOUR PREVIOUS ANSWER WAS REJECTED. It stated or hinted at a cause for the move, but the ' +
      'DATA block contains no verified cause. Write it again: say plainly that the reason cannot ' +
      'be known with this data, offer what the data does show, and use no causal or speculative ' +
      'language at all.'
    );
  }

  return partes.join('\n');
}

// ---------------------------------------------------------------------------
// 5. La llamada y la validación.

function crearClienteReal() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY no está configurada');
    err.code = 'ANTHROPIC_NO_CONFIGURADO';
    throw err;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
}

async function pedirAlModelo(cliente, pedido, bloque, correccion) {
  const pedir = async (conEsquema) => {
    const res = await cliente.messages.create(Object.assign(
      {
        model: MODELO,
        max_tokens: MAX_TOKENS,
        system: conEsquema ? SISTEMA : SISTEMA + PISTA_JSON,
        messages: [{ role: 'user', content: mensajeUsuario(pedido, bloque, correccion) }]
      },
      conEsquema ? { output_config: { format: { type: 'json_schema', schema: ESQUEMA } } } : null
    ));
    return (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  };

  try {
    return recortarJSON(await pedir(true));
  } catch (err) {
    if (!err || err.status !== 400) throw err;
    console.warn('ia: salida estructurada rechazada, reintento sin esquema:', err.message);
    return recortarJSON(await pedir(false));
  }
}

/**
 * Comprueba la respuesta del modelo contra el bloque DATOS.
 * Devuelve { ok: true, salida } o { ok: false, motivo, cifras }.
 */
function validar(cruda, bloque, pedido) {
  if (!cruda || typeof cruda.respuesta !== 'string' || !cruda.respuesta.trim()) {
    return { ok: false, motivo: 'respuesta_vacia', cifras: [] };
  }
  const preguntas = (Array.isArray(cruda.preguntas) ? cruda.preguntas : [])
    .filter((p) => typeof p === 'string' && p.trim())
    .map((p) => p.trim())
    .slice(0, 3);

  if (pedido.modo === 'preguntas' && preguntas.length < 3) {
    return { ok: false, motivo: 'faltan_preguntas', cifras: [] };
  }

  const todoElTexto = [cruda.respuesta, ...preguntas].join('\n');

  // El clasificador otra vez, ahora sobre lo que escribió el modelo: el prompt
  // se lo prohíbe, pero prohibir no es impedir.
  if (daConsejo(todoElTexto)) return { ok: false, motivo: 'consejo', cifras: [] };

  // Pidieron una causa y no hay ninguna noticia aprobada que la respalde: la
  // respuesta tiene que ADMITIR que no se sabe y no puede atribuir ni insinuar
  // ninguna. Un modelo siempre tiene a mano una causa plausible de memoria, y
  // una causa plausible sin fuente es la mentira que este sitio promete no
  // contar. Ver 1.6.
  if (bloque.sinCausa && (atribuyeCausa(todoElTexto) || !admiteNoSaber(cruda.respuesta))) {
    return { ok: false, motivo: 'causa_inventada', cifras: [] };
  }

  const cifras = numerosFuera(todoElTexto, bloque.datos);
  if (cifras.length) return { ok: false, motivo: 'cifras_inventadas', cifras };

  // Las fuentes NO se toman del modelo: se cruzan con las que puso el servidor
  // y lo que no coincida se cae. Una fuente inventada es tan grave como una
  // cifra inventada, y aquí sale gratis comprobarlo.
  const declaradas = (Array.isArray(cruda.fuentes) ? cruda.fuentes : []).map(String);
  const fuentes = bloque.fuentes.filter((f) =>
    declaradas.some((d) => d.includes(f.titulo) || f.titulo.includes(d))
  );

  return {
    ok: true,
    salida: {
      respuesta: cruda.respuesta.trim(),
      preguntas,
      datosUsados: (Array.isArray(cruda.datosUsados) ? cruda.datosUsados : [])
        .filter((d) => typeof d === 'string' && d.trim()).map((d) => d.trim()).slice(0, 4),
      // asOf lo pone el SERVIDOR, no el modelo: es un dato del sitio, no una
      // opinión, y así no puede envejecer ni adelantarse.
      fuentes: fuentes.length ? fuentes : bloque.fuentes,
      asOf: bloque.asOf
    }
  };
}

// ---------------------------------------------------------------------------
// 6. Tope de gasto y caché.

const huella = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

/** La IP del visitante detrás de Vercel. Solo se guarda su hash. */
function ipDe(req) {
  const cabecera = String((req.headers && req.headers['x-forwarded-for']) || '');
  return cabecera.split(',')[0].trim() || 'desconocida';
}

/**
 * Suma uno a los contadores y dice si se puede seguir.
 *
 * Se llama UNA VEZ POR LLAMADA AL MODELO, incluido el reintento: lo que se paga
 * son llamadas, así que es lo que se cuenta.
 *
 * Se INCREMENTA antes de mirar, a propósito: es lo único atómico y por tanto lo
 * único que funciona con varias instancias a la vez. Y si Redis no contesta,
 * `contarCuota` devuelve null y aquí se PARA — no saber cuánto se lleva gastado
 * no es permiso para gastar más. El resto de la página no depende de esto.
 */
async function cobrar(clave, deps) {
  const dia = await deps.cache.contarCuota('ia', 1);
  if (dia === null) return { permitido: false, motivo: 'sin_contador' };
  if (dia > MAX_DIA) return { permitido: false, motivo: 'tope_dia', dia };

  if (clave) {
    const porIp = await deps.cache.contarCuota('ia:ip:' + clave, 1);
    if (porIp === null) return { permitido: false, motivo: 'sin_contador' };
    if (porIp > MAX_IP) return { permitido: false, motivo: 'tope_ip', dia, porIp };
  }
  return { permitido: true, dia };
}

// ---------------------------------------------------------------------------
// 7. La puerta: lo que llama api/news.js?accion=explicar.

/** Normaliza y valida la query. Devuelve el pedido o { error }. */
function leerPedido(query) {
  const q = query || {};
  const tipo = String(q.tipo || '').toLowerCase();
  const modo = String(q.modo || 'explicar').toLowerCase();
  const lang = String(q.lang || 'es').toLowerCase() === 'en' ? 'en' : 'es';
  const id = String(q.id || '').trim().slice(0, 80);
  const rango = RANGOS.includes(String(q.rango || '').toUpperCase())
    ? String(q.rango).toUpperCase() : '1M';
  const pregunta = String(q.pregunta || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PREGUNTA);
  const seleccion = String(q.seleccion || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SELECCION);

  // La conversación anterior, tal y como la guardó el navegador. Se recorta
  // campo por campo ANTES de pagarla: es una cadena que cualquiera puede
  // fabricar, así que se trata como lo que es — texto ajeno con tope.
  const historial = [];
  if (Array.isArray(q.historial)) {
    for (const h of q.historial.slice(-MAX_TURNOS)) {
      if (!h || typeof h !== 'object') continue;
      const p = String(h.p || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PREGUNTA);
      const r = String(h.r || '').replace(/\s+/g, ' ').trim().slice(0, MAX_R_HISTORIAL);
      if (p && r) historial.push({ p, r });
    }
  }

  if (!TIPOS.includes(tipo)) return { error: 'tipo_desconocido', valores: TIPOS };
  if (!MODOS.includes(modo)) return { error: 'modo_desconocido', valores: MODOS };
  if (!id) return { error: 'falta_id' };
  return { tipo, modo, lang, id, rango, pregunta, seleccion, historial };
}

/**
 * Genera (o recupera de la caché) la explicación de lo que se está viendo.
 *
 * @param {object} query      la query del endpoint
 * @param {object} req        para la IP y el secreto
 * @param {object} deps       inyectables para las pruebas
 * @returns {{codigo:number, cuerpo:object}}
 */
async function explicar(query, req, deps) {
  const d = Object.assign(
    { cache, noticias, historia: require('../history.js'), crearCliente: crearClienteReal, saltarTopeIp: false },
    deps
  );

  const pedido = leerPedido(query);
  if (pedido.error) return { codigo: 400, cuerpo: pedido };

  // La intención y el alcance de la pregunta deciden qué DATOS se arman y qué
  // encargo se escribe. Sin pregunta, todo queda en null y nada cambia.
  Object.assign(pedido, clasificarPregunta(pedido.pregunta, pedido.id));

  const enlaceRiesgo = contexto.rutas['lesson.errores'][pedido.lang];
  const metodologia = contexto.rutas.methodology[pedido.lang];
  const base = { modelo: MODELO, generadoPor: 'ia', metodologia };

  // 1. Consejo financiero: se rechaza ANTES de gastar un token.
  if (esConsejo(pedido.pregunta)) {
    return {
      codigo: 200,
      cuerpo: Object.assign({}, base, {
        rechazada: 'consejo',
        respuesta: FRASE_CONSEJO[pedido.lang],
        preguntas: [], datosUsados: [], fuentes: [],
        asOf: null,
        leccion: enlaceRiesgo,
        generadoPor: 'regla'
      })
    };
  }

  // 2. El bloque DATOS, del servidor y de nadie más.
  let bloque;
  try {
    bloque = await armarDatos(pedido, d);
  } catch (err) {
    if (err && err.code === 'IA_SIN_DATOS') {
      console.warn('ia: sin datos —', err.message);
      return {
        codigo: 404,
        cuerpo: Object.assign({}, base, {
          rechazada: 'sin_datos', respuesta: FRASE_SIN_DATOS[pedido.lang],
          preguntas: [], datosUsados: [], fuentes: [], asOf: null, generadoPor: 'regla'
        })
      };
    }
    throw err;
  }

  // 3. Caché por hash del bloque DATOS: mismo contexto, misma respuesta, y se
  //    paga una sola vez. Si los datos cambian (un precio nuevo), el hash
  //    cambia y se vuelve a generar; es el precio de no mentir sobre la fecha.
  const claveCache = 'ia:v1:' + pedido.tipo + ':' + pedido.modo + ':' + pedido.lang + ':' +
    huella([pedido.id, pedido.pregunta, pedido.seleccion,
      JSON.stringify(pedido.historial), bloque.datos].join('|'));
  const guardado = await d.cache.leer(claveCache);
  if (guardado && guardado.valor) {
    return { codigo: 200, cuerpo: Object.assign({}, guardado.valor, { cacheado: true }) };
  }

  // 4 y 5. Tope de gasto, generar, validar y —si hace falta— reintentar UNA vez.
  //
  // LA CUOTA SE DESCUENTA ANTES DE CADA LLAMADA, no una vez por consulta. El
  // reintento es una llamada más y cuesta exactamente lo mismo que la primera:
  // contando solo una, el techo real era el DOBLE del escrito (200 generaciones
  // al día, ~$0.68, no ~$0.34). Por eso MAX_DIA es un techo de LLAMADAS AL
  // MODELO, que es lo que se paga, y el cálculo del encabezado sale exacto.
  const claveIp = d.saltarTopeIp ? null : huella(ipDe(req));
  let cliente = null;
  let ultimo = null;

  for (let intento = 0; intento < 2; intento++) {
    const cobro = await cobrar(claveIp, d);
    if (!cobro.permitido) {
      console.warn('ia: no se genera —', cobro.motivo);
      // Si lo que no se puede pagar es el REINTENTO, no hay 429: ya hay una
      // respuesta rechazada y lo que toca es el mensaje honesto de abajo.
      if (intento) break;
      return {
        codigo: 429,
        cuerpo: Object.assign({}, base, {
          rechazada: cobro.motivo,
          respuesta: cobro.motivo === 'sin_contador' ? FRASE_SIN_CONTADOR[pedido.lang] : FRASE_TOPE[pedido.lang],
          preguntas: [], datosUsados: [], fuentes: [], asOf: bloque.asOf, generadoPor: 'regla'
        })
      };
    }

    if (!cliente) cliente = d.crearCliente();
    // El reintento le dice al modelo QUÉ falló: la cifra que sobra, o la causa
    // que no existe. Cada fallo con su corrección.
    const correccion = intento === 0 ? null
      : ultimo.motivo === 'causa_inventada' ? { causa: true } : { cifras: ultimo.cifras };
    let cruda;
    try {
      cruda = await pedirAlModelo(cliente, pedido, bloque, correccion);
    } catch (err) {
      console.error('ia: la llamada falló:', err && err.message ? err.message : err);
      break;
    }
    const v = validar(cruda, bloque, pedido);
    if (v.ok) {
      const cuerpo = Object.assign({}, base, v.salida, {
        titulo: bloque.titulo,
        leccion: bloque.leccion,
        cacheado: false,
        reintentado: intento > 0
      });
      await d.cache.escribir(claveCache, cuerpo, TTL_CACHE, 'anthropic');
      return { codigo: 200, cuerpo };
    }
    console.warn('ia: respuesta rechazada (' + v.motivo + ')' + (v.cifras.length ? ': ' + v.cifras.join(', ') : ''));
    ultimo = v;
    // Un consejo o una respuesta vacía no se reintentan: el reintento solo sabe
    // corregir una cifra que sobra o una causa que no existe, y volver a pedir
    // lo mismo es pagar dos veces por el mismo fallo.
    if (v.motivo !== 'cifras_inventadas' && v.motivo !== 'causa_inventada') break;
  }

  // Cada rechazo con su frase. Si el modelo se puso a recomendar no falló
  // ninguna comprobación de cifras, y decirle a la persona "no pude comprobar
  // la respuesta contra los datos de esta página" sería contarle algo que no
  // pasó. Lo que pasó es que el modelo dio un consejo, así que sale la frase
  // que lo dice —la misma del rechazo de entrada— con su enlace a la lección
  // de errores al invertir. Y si lo que hizo fue inventar una causa, sale la
  // frase que dice que la causa no se puede saber con estos datos.
  const porConsejo = ultimo && ultimo.motivo === 'consejo';
  const porCausa = ultimo && ultimo.motivo === 'causa_inventada';

  return {
    codigo: 200,
    cuerpo: Object.assign({}, base, {
      rechazada: ultimo ? ultimo.motivo : 'sin_respuesta',
      respuesta: porConsejo ? FRASE_CONSEJO[pedido.lang]
        : porCausa ? FRASE_SIN_CAUSA[pedido.lang]
        : FRASE_SIN_VERIFICAR[pedido.lang],
      preguntas: [], datosUsados: [], fuentes: bloque.fuentes, asOf: bloque.asOf,
      titulo: bloque.titulo,
      leccion: porConsejo ? enlaceRiesgo : bloque.leccion,
      generadoPor: 'regla'
    })
  };
}

module.exports = {
  explicar,
  // Para las pruebas y para quien venga a cambiar los topes.
  esConsejo, daConsejo, PATRONES_CONSEJO, PATRONES_VALUACION, PATRONES_CONSEJO_DADO,
  numerosDe, numerosFuera, permitidosDe, separarFechas, normalizar,
  clasificarPregunta, atribuyeCausa, admiteNoSaber,
  armarDatos, resumirSerie, validar, leerPedido, ipDe, cobrar,
  MODELO, MAX_DIA, MAX_IP, MAX_PREGUNTA, MAX_TURNOS, MAX_SELECCION, MAX_R_HISTORIAL, TIPOS, MODOS, RANGOS,
  FRASE_CONSEJO, FRASE_SIN_VERIFICAR, FRASE_TOPE, FRASE_SIN_CONTADOR, FRASE_SIN_DATOS,
  FRASE_SIN_CAUSA
};
