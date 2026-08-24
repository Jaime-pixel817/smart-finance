// Smart Finance AI — el botón "Explícame esto".
//
// QUÉ HACE
//   Explica, en lenguaje de estudiante, lo que la persona está viendo: una
//   noticia aprobada, la ficha de un activo, el movimiento de una gráfica, un
//   término del glosario o una lección. También escribe tres preguntas de
//   estudio sobre esa misma pieza.
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
//   ≈ $0.0034 por consulta GENERADA. Las repetidas no cuestan nada: la
//   respuesta se guarda en Redis 24 h con el hash del bloque DATOS, así que dos
//   personas leyendo la misma noticia pagan una sola vez.
//   TOPE DURO: MAX_DIA = 100 consultas generadas al día → $0.34 al día, $10 al
//   mes en el peor caso absoluto. Lo esperado con el tráfico de hoy es menos de
//   $1 al mes. Bajar el techo es cambiar esa constante.
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
const MAX_DIA = 100;          // consultas GENERADAS al día en todo el sitio
const MAX_IP = 8;             // por IP y día: suficiente para leer, corto para raspar
const TTL_CACHE = 24 * 60 * 60;   // la respuesta vale 24 h para el mismo bloque DATOS

// Cuánto texto libre se acepta. Es una caja para "no entendí esta parte", no un
// chat: 200 caracteres bastan para preguntar y evitan que alguien pegue un
// documento entero y nos lo cobre Anthropic.
const MAX_PREGUNTA = 200;

const TIPOS = ['noticia', 'activo', 'grafica', 'termino', 'leccion'];
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

const PATRONES_CONSEJO = [
  // Comprar / vender / invertir, en primera persona o como recomendación.
  /\b(compro|vendo|invierto|le\s+entro|me\s+meto)\b/i,
  /\b(deber[íi]as?|conviene|vale\s+la\s+pena|recomiendas?|recomiendan|recomendar[íi]as?)\b/i,
  /\b(should\s+i|would\s+you|do\s+you\s+recommend|is\s+it\s+worth|worth\s+buying)\b/i,
  /\b(qu[ée]|d[óo]nde|en\s+qu[ée])\s+(me\s+conviene|invierto|compro)\b/i,
  /\b(what|where|which)\s+(should|to)\s+(i\s+)?(buy|sell|invest)/i,
  /\bbuy\s+or\s+sell\b/i,
  /\b(es|ser[íi]a)\s+(una\s+)?buena\s+(inversi[óo]n|compra|idea\s+de\s+inversi[óo]n)\b/i,
  /\b(good|bad)\s+(investment|buy|time\s+to\s+(buy|sell))\b/i,
  // Predicción de precio.
  /\b(va\s+a\s+(subir|bajar|caer|valer)|subir[áa]|bajar[áa]|caer[áa]|llegar[áa]\s+a)\b/i,
  /\b(cu[áa]nto\s+(va\s+a\s+|)(subir|bajar|valer|costar))\b/i,
  /\b(will\s+it\s+(go\s+up|go\s+down|rise|fall|crash|moon)|price\s+target|forecast|prediction)\b/i,
  /\b(pron[óo]stico|predicci[óo]n|predice|va\s+a\s+llegar)\b/i,
  // Petición directa de cartera.
  /\b(qu[ée]\s+acciones?|qu[ée]\s+cripto|d[óo]nde\s+pongo\s+mi\s+dinero|en\s+qu[ée]\s+invierto)\b/i,
  /\b(what\s+stocks?\s+should|where\s+(should|do)\s+i\s+(put|invest))\b/i
];

/** true si el texto PIDE un consejo de inversión o una predicción de precio. */
function esConsejo(texto) {
  const t = String(texto || '');
  if (!t.trim()) return false;
  return PATRONES_CONSEJO.some((re) => re.test(t));
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
  /\b(s[íi]|no)\s+vale\s+la\s+pena\s+(comprar|invertir|entrar)\b/i,
  /\b(va\s+a\s+(subir|bajar|caer)|subir[áa]|bajar[áa]|caer[áa]|llegar[áa]\s+a|alcanzar[áa])\b/i,
  /\byou\s+should\s+(buy|sell|hold|invest|avoid)\b/i,
  /\bi\s+(recommend|would\s+(buy|sell))\b/i,
  /\bit(?:'s|\s+is)\s+a\s+(good|bad)\s+(time|buy|entry|investment)\b/i,
  /\b(will|is\s+going\s+to)\s+(go\s+up|go\s+down|rise|fall|drop|climb|reach)\b/i,
  /\bprice\s+target\b/i
];

const RE_NEGACION = /\b(no|ni|nunca|jam[áa]s|nadie|ning[úu]n|not|never|nobody|cannot|can'?t)\b/i;

/** true si el texto DA un consejo o predice un precio, sin contar lo negado. */
function daConsejo(texto) {
  const t = String(texto || '');
  if (!t.trim()) return false;
  return PATRONES_CONSEJO_DADO.some((re) => {
    const m = t.match(re);
    if (!m) return false;
    // 26 caracteres de contexto por delante: lo que cabe entre "no" y el verbo
    // en una frase normal, sin llegar a la oración anterior.
    const antes = t.slice(Math.max(0, m.index - 26), m.index);
    return !RE_NEGACION.test(antes);
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
//   · Los enteros del 0 al 10 pasan solos SALVO que lleven pegada una unidad
//     (%, pesos, dólares, puntos). "Tres cosas" y "5 minutos" son prosa; "5 %"
//     es una cifra y tiene que estar respaldada.

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
const RE_UNIDAD = /^\s*(%|(?:por\s?ciento|percent|pesos?|d[óo]lares?|dollars?|USD|MXN|EUR|JPY|puntos?|points?|mil|millones?|million|billion)\b)/i;

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
    const llevaUnidad = RE_UNIDAD.test(cola);
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

async function datosDeActivo(pedido, deps) {
  const a = activoPorId(pedido.id);
  if (!a) throw sinDatos('activo desconocido: ' + pedido.id);

  const ficha = [
    'Ficha del activo (registro del sitio, src/data/symbols.ts):',
    '  nombre: ' + a.nombre[pedido.lang],
    '  símbolo: ' + a.sym,
    '  tipo: ' + a.tipo,
    '  moneda: ' + a.moneda,
    '  proveedor del precio: ' + a.fuente + ' (retraso de ' + a.retrasoMin + ' minutos)',
    '  qué es: ' + a.que[pedido.lang]
  ].join('\n');

  const fuentes = [{ titulo: a.fuente, url: null }];
  let asOf = new Date().toISOString().slice(0, 10);
  let serieTexto = 'No hay serie de precios disponible ahora mismo para este activo.';

  if (a.history) {
    try {
      const r = await deps.historia.serie(a.history, pedido.rango);
      const resumen = resumirSerie(r.valor, a.decimales);
      serieTexto = resumen.texto + (r.stale ? '\n  aviso: es el último dato conocido, el proveedor no respondió.' : '');
      asOf = resumen.asOf;
      // La gráfica siempre es de Yahoo, pero el precio de la ficha puede ser de
      // otro proveedor (Twelve Data en las acciones). Sin este filtro, una
      // divisa listaba "Yahoo Finance · Yahoo Finance".
      if (!fuentes.some((f) => f.titulo === 'Yahoo Finance')) fuentes.push({ titulo: 'Yahoo Finance', url: null });
    } catch (err) {
      console.warn('ia: sin serie para ' + a.history + ':', err && err.message);
    }
  }

  return {
    titulo: a.nombre[pedido.lang] + ' (' + a.sym + ')',
    datos: ficha + '\n\n' + serieTexto,
    asOf,
    fuentes,
    leccion: contexto.rutas[a.leccion] ? contexto.rutas[a.leccion][pedido.lang] : null
  };
}

async function datosDeNoticia(pedido, deps) {
  // Solo APROBADAS. Un borrador es texto de IA que nadie ha leído todavía, y la
  // promesa del sitio es que eso no se publica — tampoco por esta puerta.
  const lista = await deps.noticias.listar({ estado: 'aprobada', limite: 60 });
  const n = lista.find((x) => x.slug === pedido.id || x.id === pedido.id);
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

async function armarDatos(pedido, deps) {
  if (pedido.tipo === 'activo' || pedido.tipo === 'grafica') return datosDeActivo(pedido, deps);
  if (pedido.tipo === 'noticia') return datosDeNoticia(pedido, deps);
  if (pedido.tipo === 'termino') return datosDeTermino(pedido);
  return datosDeLeccion(pedido);
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

function mensajeUsuario(pedido, bloque, correccion) {
  const idioma = pedido.lang === 'es' ? 'Mexican Spanish' : 'English';
  const partes = [
    'Answer in ' + idioma + '. The reader is looking at: ' + bloque.titulo,
    '',
    'TASK: ' + INSTRUCCION[pedido.tipo][pedido.modo],
    pedido.modo === 'preguntas'
      ? 'Put the three questions in "preguntas" and leave "respuesta" as one short line introducing them. ' +
        'The questions must be answerable from the DATA block alone.'
      : 'Put the explanation in "respuesta" and leave "preguntas" empty.',
    '',
    'Also fill: "datosUsados" = the two to four lines of the DATA block you actually leaned on, ' +
    'copied short; "fuentes" = the sources listed at the end of the DATA block, copied exactly; ' +
    '"asOf" = the as-of date given below, copied exactly.',
    '',
    '=== DATA (everything you know) ===',
    bloque.datos,
    '',
    'Sources of this data: ' + bloque.fuentes.map((f) => f.titulo).join(' · '),
    'as-of: ' + bloque.asOf,
    '=== END OF DATA ==='
  ];

  if (pedido.pregunta) {
    partes.push(
      '',
      'The reader also asked, in their own words: "' + pedido.pregunta + '"',
      'Answer it only if the DATA block answers it. If it does not, say so and explain what the ' +
      'data does show instead.'
    );
  }

  if (correccion) {
    partes.push(
      '',
      'YOUR PREVIOUS ANSWER WAS REJECTED. It contained figures that are not in the DATA block: ' +
      correccion.join(', ') + '. Those numbers do not exist. Write the answer again using only ' +
      'figures that appear in the DATA block, or no figures at all.'
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

  if (!TIPOS.includes(tipo)) return { error: 'tipo_desconocido', valores: TIPOS };
  if (!MODOS.includes(modo)) return { error: 'modo_desconocido', valores: MODOS };
  if (!id) return { error: 'falta_id' };
  return { tipo, modo, lang, id, rango, pregunta };
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
    huella(pedido.id + '|' + pedido.pregunta + '|' + bloque.datos);
  const guardado = await d.cache.leer(claveCache);
  if (guardado && guardado.valor) {
    return { codigo: 200, cuerpo: Object.assign({}, guardado.valor, { cacheado: true }) };
  }

  // 4. Tope de gasto.
  const cobro = await cobrar(d.saltarTopeIp ? null : huella(ipDe(req)), d);
  if (!cobro.permitido) {
    console.warn('ia: no se genera —', cobro.motivo);
    return {
      codigo: 429,
      cuerpo: Object.assign({}, base, {
        rechazada: cobro.motivo,
        respuesta: cobro.motivo === 'sin_contador' ? FRASE_SIN_CONTADOR[pedido.lang] : FRASE_TOPE[pedido.lang],
        preguntas: [], datosUsados: [], fuentes: [], asOf: bloque.asOf, generadoPor: 'regla'
      })
    };
  }

  // 5. Generar, validar y —si hace falta— reintentar UNA vez.
  const cliente = d.crearCliente();
  let ultimo = null;
  for (const correccion of [null, 'reintento']) {
    let cruda;
    try {
      cruda = await pedirAlModelo(cliente, pedido, bloque, correccion ? ultimo.cifras : null);
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
        reintentado: correccion !== null
      });
      await d.cache.escribir(claveCache, cuerpo, TTL_CACHE, 'anthropic');
      return { codigo: 200, cuerpo };
    }
    console.warn('ia: respuesta rechazada (' + v.motivo + ')' + (v.cifras.length ? ': ' + v.cifras.join(', ') : ''));
    ultimo = v;
    // Un consejo o una respuesta vacía no se reintentan: el reintento solo sabe
    // corregir cifras, y volver a pedir lo mismo es pagar dos veces por el
    // mismo fallo.
    if (v.motivo !== 'cifras_inventadas') break;
  }

  return {
    codigo: 200,
    cuerpo: Object.assign({}, base, {
      rechazada: ultimo ? ultimo.motivo : 'sin_respuesta',
      respuesta: FRASE_SIN_VERIFICAR[pedido.lang],
      preguntas: [], datosUsados: [], fuentes: bloque.fuentes, asOf: bloque.asOf,
      titulo: bloque.titulo, leccion: bloque.leccion, generadoPor: 'regla'
    })
  };
}

module.exports = {
  explicar,
  // Para las pruebas y para quien venga a cambiar los topes.
  esConsejo, daConsejo, numerosDe, numerosFuera, permitidosDe, separarFechas, normalizar,
  armarDatos, resumirSerie, validar, leerPedido, ipDe, cobrar,
  MODELO, MAX_DIA, MAX_IP, MAX_PREGUNTA, TIPOS, MODOS, RANGOS,
  FRASE_CONSEJO, FRASE_SIN_VERIFICAR, FRASE_TOPE, FRASE_SIN_CONTADOR, FRASE_SIN_DATOS
};
