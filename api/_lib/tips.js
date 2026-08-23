// Los seis tips de "Start Here", para el tip del día del boletín.
//
// GENERADO desde lessons/index.html — si cambias el texto de una lección,
// vuelve a generarlo en vez de editar aquí, para que el correo y la página no
// se desincronicen.
//
// La rotación usa el día del año: el mismo tip para todos los suscriptores de
// ese día, sin estado que guardar y sin pedirle nada a la IA. Con 6 tips y 365
// días cada uno cae cada seis días, siempre en el mismo orden.
//
// EL BOLETÍN USA `tipDeLaSemana` desde que sale los domingos. La diferencia no
// es cosmética: el correo la anuncia como "la lección de esta semana", y con la
// rotación por día eso sería falso — sería la lección del domingo, y el lunes
// ya estaría enseñando otra. Con la rotación por semana, lo que dice el correo
// y lo que el lector encuentra si entra el miércoles son lo mismo.
//
// `tipDelDia` se queda: /api/news lo usa para el carrusel del sitio.

const TIPS = [
  {
    "en": {
      "titulo": "What it means when the peso weakens",
      "resumen": "It means each dollar costs more pesos. Anything imported — gas, phones, streaming — gets pricier, and traveling abroad costs more. If you earn in dollars it's the opposite: your money stretches further at home."
    },
    "es": {
      "titulo": "¿Qué significa que el peso se deprecie?",
      "resumen": "Significa que cada dólar cuesta más pesos. Todo lo importado —gasolina, celulares, streaming— se encarece, y viajar fuera cuesta más. Si tú ganas en dólares es al revés: tu dinero rinde más aquí."
    },
    "url": "/lessons/peso-tipo-de-cambio"
  },
  {
    "en": {
      "titulo": "Simple vs. compound interest, in 30 seconds",
      "resumen": "Simple interest only ever pays you on the money you put in. Compound interest pays you on your money and on the interest it already earned. Same deposit, same rate — compound just keeps building on a bigger base."
    },
    "es": {
      "titulo": "Interés simple vs. compuesto, en 30 segundos",
      "resumen": "El interés simple solo te paga sobre lo que metiste. El compuesto te paga sobre tu dinero y también sobre los intereses que ya generaste. Mismo depósito, misma tasa: el compuesto va construyendo sobre una base cada vez más grande."
    },
    "url": "/lessons/interes-compuesto"
  },
  {
    "en": {
      "titulo": "Why the S&P 500 goes up or down",
      "resumen": "It tracks 500 of the largest US companies, so it moves with what people expect those companies to earn. Better expected profits push it up; higher rates, bad news, or plain fear push it down. Day to day is noise — the trend is what matters."
    },
    "es": {
      "titulo": "¿Por qué sube o baja el S&P 500?",
      "resumen": "Sigue a 500 de las empresas más grandes de Estados Unidos, así que se mueve con lo que la gente espera que ganen. Mejores utilidades esperadas lo suben; tasas más altas, malas noticias o puro miedo lo bajan. El día a día es ruido: lo que importa es la tendencia."
    },
    "url": "/lessons/sp500"
  },
  {
    "en": {
      "titulo": "The 50/30/20 rule for your first budget",
      "resumen": "Split what actually lands in your account: 50% needs (rent, food, transport), 30% wants, 20% saving or paying down debt. It won't fit everyone perfectly, and that's fine — it's a starting point, not a law."
    },
    "es": {
      "titulo": "La regla 50/30/20 para tu primer presupuesto",
      "resumen": "Divide lo que de verdad te cae en la cuenta: 50% necesidades (renta, comida, transporte), 30% gustos, 20% ahorro o pagar deudas. No le queda perfecto a todo el mundo, y está bien: es un punto de partida, no una ley."
    },
    "url": "/lessons/presupuesto-50-30-20"
  },
  {
    "en": {
      "titulo": "What inflation is, and how it hits you",
      "resumen": "Inflation means the same money buys less than it did before. Your salary can stay identical on paper and still shrink in practice. That's why money sitting still loses value, and why central banks raise rates to cool it down."
    },
    "es": {
      "titulo": "¿Qué es la inflación y cómo te afecta?",
      "resumen": "Que el mismo dinero compra menos que antes. Tu sueldo puede quedarse igualito en papel y aun así encoger en la práctica. Por eso el dinero quieto pierde valor, y por eso los bancos centrales suben tasas para enfriarla."
    },
    "url": "/lessons/inflacion"
  },
  {
    "en": {
      "titulo": "3 common mistakes when you start investing",
      "resumen": "Investing money you'll need next month. Chasing whatever went up the most last week. And checking your account every single day, which turns normal swings into panic. Slow and boring usually wins."
    },
    "es": {
      "titulo": "3 errores comunes al empezar a invertir",
      "resumen": "Invertir dinero que vas a necesitar el mes que entra. Perseguir lo que más subió la semana pasada. Y revisar tu cuenta todos los días, que convierte movimientos normales en pánico. Lo lento y aburrido suele ganar."
    },
    "url": "/lessons/errores-al-invertir"
  }
];

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
 * La lección de la semana. Con 6 lecciones, la rotación se repite cada 6
 * semanas y va en el mismo orden para todos los suscriptores, sin estado que
 * guardar y sin pedirle nada a la IA.
 */
function tipDeLaSemana(fecha = new Date()) {
  return TIPS[semanaDelAnio(fecha) % TIPS.length];
}

module.exports = { TIPS, tipDelDia, tipDeLaSemana, diaDelAnio, semanaDelAnio };
