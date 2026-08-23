// Las lecciones publicadas, para "la lección de la semana" del boletín.
//
// COPIADO DE LAS LECCIONES DE VERDAD, NO ESCRITO AQUÍ. Cada entrada sale del
// frontmatter de src/content/lessons/{en,es}/<slug>.mdx: `title`,
// `description` y `readingMinutes`. api/ no puede leer esos MDX en Vercel —el
// empaquetado solo se lleva lo que la función requiere—, así que la copia es
// inevitable; lo que sí se puede evitar es que se desincronice en silencio, y
// de eso se encarga la prueba de boletin.test.mjs, que abre los diez MDX y
// compara campo por campo. Si alguien retoca el título de una lección, la
// prueba falla y dice cuál.
//
// LAS DOS URL, Y ESTO ERA UN FALLO DE VERDAD: antes solo se guardaba la ruta
// inglesa y el correo en español mandaba a /lessons/inflacion, o sea a la
// lección en inglés. Ahora cada entrada lleva su ruta en los dos idiomas, tal
// como están registradas en src/i18n/routes.ts.
//
// La rotación usa el día del año (`tipDelDia`, para el carrusel de /api/news) o
// la semana ISO (`tipDeLaSemana`, para el boletín): el mismo tip para todos los
// suscriptores, sin estado que guardar y sin pedirle nada a la IA.

// El orden ES la rotación, y va por ruta de aprendizaje: primero "desde cero",
// luego "mercados", luego "invertir". Quien se suscriba y se quede diez semanas
// habrá recorrido el plan completo en orden, que es más útil que diez lecciones
// sueltas en orden alfabético.
const TIPS = [
  {
    "slug": "presupuesto-50-30-20",
    "minutos": 6,
    "url": "/lessons/presupuesto-50-30-20",
    "urlEs": "/es/lecciones/presupuesto-50-30-20",
    "en": {
      "titulo": "The 50/30/20 rule for your first budget",
      "resumen": "How to build your first budget in Mexico: from your real take-home pay to a plan that survives a normal month."
    },
    "es": {
      "titulo": "La regla 50/30/20 para tu primer presupuesto",
      "resumen": "Cómo armar tu primer presupuesto en México: de lo que de verdad te llega libre a un plan que sobrevive un mes normal."
    }
  },
  {
    "slug": "interes-compuesto",
    "minutos": 5,
    "url": "/lessons/interes-compuesto",
    "urlEs": "/es/lecciones/interes-compuesto",
    "en": {
      "titulo": "Simple vs. compound interest",
      "resumen": "What compound interest actually is, why time matters more than the amount you start with, and how the same force works against you on a credit card."
    },
    "es": {
      "titulo": "Interés simple vs. interés compuesto",
      "resumen": "Qué es de verdad el interés compuesto, por qué el tiempo pesa más que el monto con el que empiezas, y cómo esa misma fuerza corre en tu contra en una tarjeta de crédito."
    }
  },
  {
    "slug": "inflacion",
    "minutos": 5,
    "url": "/lessons/inflacion",
    "urlEs": "/es/lecciones/inflacion",
    "en": {
      "titulo": "What inflation is, and how it hits you",
      "resumen": "Why the same money buys less over time, how a raise can still be a pay cut, and what central banks are actually doing when they raise rates."
    },
    "es": {
      "titulo": "Qué es la inflación y cómo te afecta",
      "resumen": "Por qué el mismo dinero compra menos con el tiempo, cómo un aumento puede ser en realidad un recorte, y qué hacen los bancos centrales cuando suben las tasas."
    }
  },
  {
    "slug": "tarjeta-de-credito",
    "minutos": 6,
    "url": "/lessons/tarjeta-de-credito",
    "urlEs": "/es/lecciones/tarjeta-de-credito",
    "en": {
      "titulo": "Your first credit card (and how not to wreck yourself)",
      "resumen": "What the CAT really is, why the minimum payment is a trap, how the interest starts running, and what a credit history buys you later."
    },
    "es": {
      "titulo": "Tu primera tarjeta de crédito (y cómo no arruinarte)",
      "resumen": "Qué es de verdad el CAT, por qué el pago mínimo es una trampa, cuándo empiezan a correr los intereses y para qué te sirve después el historial crediticio."
    }
  },
  {
    "slug": "peso-tipo-de-cambio",
    "minutos": 5,
    "url": "/lessons/peso-tipo-de-cambio",
    "urlEs": "/es/lecciones/peso-tipo-de-cambio",
    "en": {
      "titulo": "What it means when the peso weakens",
      "resumen": "A beginner's guide to how the peso-dollar exchange rate works: who moves it, why it swings, and what it means for your money."
    },
    "es": {
      "titulo": "Qué significa que el peso se deprecie",
      "resumen": "Guía para principiantes sobre cómo funciona el tipo de cambio peso-dólar: quién lo mueve, por qué brinca y qué significa para tu dinero."
    }
  },
  {
    "slug": "que-es-una-accion",
    "minutos": 6,
    "url": "/lessons/que-es-una-accion",
    "urlEs": "/es/lecciones/que-es-una-accion",
    "en": {
      "titulo": "What you actually buy when you buy a share",
      "resumen": "A share is a piece of a company, not a number on a screen. Where its value comes from, why the price moves, what a dividend is, and why it is not a lottery ticket."
    },
    "es": {
      "titulo": "Qué compras realmente cuando compras una acción",
      "resumen": "Una acción es un pedazo de una empresa, no un número en una pantalla. De dónde sale su valor, por qué sube y baja, qué es un dividendo y por qué no es un boleto de lotería."
    }
  },
  {
    "slug": "como-funciona-la-bolsa",
    "minutos": 6,
    "url": "/lessons/como-funciona-la-bolsa",
    "urlEs": "/es/lecciones/como-funciona-la-bolsa",
    "en": {
      "titulo": "How a stock exchange actually works",
      "resumen": "What happens between pressing buy and owning a share: the order book, the BMV, its hours, who regulates it, what an index is and what you would see if you walked in."
    },
    "es": {
      "titulo": "Cómo funciona una Bolsa de Valores",
      "resumen": "Qué pasa entre que aprietas comprar y eres dueño de una acción: el libro de órdenes, la BMV, sus horarios, quién la regula, qué es un índice y qué verías si la visitas."
    }
  },
  {
    "slug": "sp500",
    "minutos": 5,
    "url": "/lessons/sp500",
    "urlEs": "/es/lecciones/sp500",
    "en": {
      "titulo": "Why the S&P 500 goes up or down",
      "resumen": "What the S&P 500 actually measures, the four forces that move it, and why the daily number is mostly noise."
    },
    "es": {
      "titulo": "¿Por qué sube o baja el S&P 500?",
      "resumen": "Qué mide en realidad el S&P 500, las cuatro fuerzas que lo mueven y por qué el número de cada día es casi puro ruido."
    }
  },
  {
    "slug": "errores-al-invertir",
    "minutos": 6,
    "url": "/lessons/errores-al-invertir",
    "urlEs": "/es/lecciones/errores-al-invertir",
    "en": {
      "titulo": "3 common mistakes when you start investing",
      "resumen": "Saving and investing do different jobs. Here's the order that works, and the signal that tells you you're ready to start investing."
    },
    "es": {
      "titulo": "3 errores comunes al empezar a invertir",
      "resumen": "Ahorrar e invertir hacen trabajos distintos. Este es el orden que sí funciona, y la señal de que ya estás listo para empezar a invertir."
    }
  },
  {
    "slug": "etfs",
    "minutos": 6,
    "url": "/lessons/etfs",
    "urlEs": "/es/lecciones/etfs",
    "en": {
      "titulo": "ETFs: five hundred companies in one go",
      "resumen": "What an ETF is, why it diversifies, what its fee really costs you, two real examples (an S&P 500 ETF and NAFTRAC), and how it differs from picking single shares."
    },
    "es": {
      "titulo": "ETFs: 500 empresas de un solo golpe",
      "resumen": "Qué es un ETF, por qué diversifica, cuánto te cuesta de verdad su comisión, dos ejemplos reales (un ETF del S&P 500 y NAFTRAC) y en qué se diferencia de comprar acciones sueltas."
    }
  }
];

/** La ruta de la lección en el idioma del lector. */
function urlDelTip(tip, idioma) {
  return idioma === 'es' ? tip.urlEs : tip.url;
}

// Día del año (1-366) en la zona horaria de Ciudad de México, que es la que
// manda para un boletín que sale a las 8 de la mañana de allá.
function diaDelAnio(fecha = new Date()) {
  const enMexico = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const inicio = new Date(enMexico.getFullYear(), 0, 0);
  return Math.floor((enMexico - inicio) / 86400000);
}

function tipDelDia(fecha = new Date()) {
  return TIPS[diaDelAnio(fecha) % TIPS.length];
}

// Semana ISO-8601 (1–53): la que empieza en lunes. Se usa la ISO y no
// "diaDelAnio/7" porque esta no se descuadra en el cambio de año — el 1 de
// enero cae en la semana 52 o 53 del año anterior cuando toca, y así la lección
// no salta dos veces en la misma semana del 31 de diciembre al 1 de enero.
function semanaDelAnio(fecha = new Date()) {
  const enMexico = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const d = new Date(Date.UTC(enMexico.getFullYear(), enMexico.getMonth(), enMexico.getDate()));
  // Al jueves de esa semana: el año al que pertenece la semana ISO es el del
  // jueves. (getUTCDay() da 0 el domingo; el || 7 lo manda al final.)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const enero1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - enero1) / 86400000 + 1) / 7);
}

/**
 * La lección de la semana. Con diez lecciones la rotación se repite cada diez
 * semanas —antes eran seis— y va en el mismo orden para todos los suscriptores,
 * sin estado que guardar y sin pedirle nada a la IA.
 */
function tipDeLaSemana(fecha = new Date()) {
  return TIPS[semanaDelAnio(fecha) % TIPS.length];
}

module.exports = { TIPS, tipDelDia, tipDeLaSemana, diaDelAnio, semanaDelAnio, urlDelTip };
