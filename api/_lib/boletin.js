// Arma el contenido del boletín SEMANAL y lo pinta en la plantilla de correo.
//
// POR QUÉ SEMANAL Y NO DIARIO
// ---------------------------
// El plan gratuito de Resend da 100 correos AL DÍA, y esos 100 son los mismos
// que usan las confirmaciones de alta. Con ~90 suscriptores el boletín diario
// se comía la cuota entera todos los días: bastaba que se dieran de alta once
// personas para que a alguien no le llegara su correo de confirmación —o sea,
// para que no pudiera suscribirse— y eso no se ve desde fuera. El sistema se
// rompía solo con crecer, que es la peor forma de romperse.
//
// Sale los DOMINGOS a las 14:00 UTC (8:00 de la mañana en Ciudad de México),
// configurado en vercel.json con "0 14 * * 0". Un envío por semana deja el
// resto de la cuota libre para las altas de los siete días.
//
// QUÉ TRAE
// --------
//   1. Lo que hizo el mercado EN LA SEMANA (USD/MXN y VIX, de lunes a viernes)
//   2. La noticia de la semana — la más reciente ya APROBADA por Jaime
//   3. La lección de la semana
//   4. El research, solo si hubo novedad en los últimos días
//
// REUTILIZA, NO DUPLICA: los precios se piden a /api/history y las noticias a
// /api/news?estado=aprobadas del propio sitio, en vez de repetir aquí su
// lógica.
//
// SOLO SALE TEXTO APROBADO POR UNA PERSONA. La versión diaria tomaba los
// titulares de Bloomberg con la opinión que escribía Anthropic y los mandaba
// tal cual: texto de IA que nadie había leído, en la bandeja de entrada de
// noventa personas. El sitio promete lo contrario (ver CLAUDE.md), y /news ya
// tiene el circuito de revisión — así que el correo pide las APROBADAS y punto.
// De paso desaparece la dependencia de Anthropic dentro del envío, que es de
// donde venía el fallo de "sin_contenido" que dejó al boletín sin salir varios
// días.

const { tipDeLaSemana, urlDelTip } = require('./tips');
// El MISMO módulo que usa la gráfica del sitio para decidir si el mercado está
// cerrado. No es una copia: si el correo y la web usaran criterios distintos,
// un domingo el sitio diría "último cierre: viernes" y el boletín seguiría
// presentando el mismo número como si fuera de hoy.
const horario = require('../../assets/market-hours');
// Dibuja la gráfica del dólar y la deja publicada. Vive aparte porque no tiene
// nada que ver con armar texto: es rasterizar píxeles.
const graficaDolar = require('./grafica');
// "Qué se movió": los que más subieron y bajaron del registro de activos del
// sitio, de /api/history. Vive aparte porque es doce peticiones con su propio
// presupuesto de tiempo, y eso no tiene que estorbar la lectura de esto.
const movimientos = require('./movimientos');
// La línea de Jaime: el único texto del correo que escribe una persona a mano.
const nota = require('./nota');

// Respaldo del consejo motivacional. Desde que el boletín es semanal, el bloque
// que abre el correo lo escribe `resumenSemana()` con los datos de la semana en
// vez de con una frase de IA: siempre es cierto, siempre es distinto y no
// depende de que nadie conteste. Estas dos constantes se quedan porque
// /api/news las importa para el carrusel del sitio, y porque siguen siendo el
// último recurso si la semana se queda sin un solo dato de mercado.
const IMPULSO_RESPALDO = {
  en: 'Starting early beats starting perfect. What you put away this month has more time to grow than anything you save later, and the habit is worth more than the amount.',
  es: 'Empezar temprano vale más que empezar perfecto. Lo que guardes este mes tiene más tiempo para crecer que cualquier cantidad que ahorres después, y el hábito pesa más que el monto.'
};

// Respaldo del gancho, que es además el asunto del correo. /api/news lo importa
// de aquí para el carrusel del sitio.
const GANCHO_RESPALDO = {
  en: 'How the dollar opened, and a lesson in two minutes',
  es: 'Así amaneció el dólar, y una lección en dos minutos'
};

// El asunto del boletín semanal cuando no hay noticia aprobada de la que
// tirar. Genérico pero cierto de cualquier edición: siempre lleva la semana del
// dólar y siempre lleva una lección. Un asunto vacío o con la fecha dentro es
// un correo que nadie abre, así que aquí no puede quedar hueco.
const GANCHO_SEMANAL = {
  en: 'The dollar\u2019s week, and a lesson in two minutes',
  es: 'La semana del dólar, y una lección en dos minutos'
};

// Dominio público del sitio. Es el que va en los links del correo, incluido el
// de baja, así que tiene que ser uno que responda: el antiguo
// smartfinance-sooty.vercel.app ya devuelve DEPLOYMENT_NOT_FOUND.
// Se puede sobreescribir con la variable SITE_URL sin tocar código.
const SITIO_POR_DEFECTO = 'https://smartfinance.lat';

// URL base para las llamadas internas a /api/news y /api/history.
//
// SITE_URL TIENE QUE ESTAR CONFIGURADA EN VERCEL. No es opcional aunque el
// código tenga respaldos: el proyecto tiene activada la Protección de
// Despliegue, así que la URL de VERCEL_URL (la del despliegue, no el alias)
// contesta con la página de login SSO. Las llamadas de aquí reciben entonces
// HTML en vez de JSON, se quedan sin titulares y el envío aborta con
// "sin_contenido" — en silencio, porque el cron corre solo y nadie mira.
// El alias público smartfinance.lat sí responde, y a eso apunta SITE_URL.
//
// El orden de abajo se conserva por si algún día se apaga la protección: ahí
// VERCEL_URL vuelve a ser útil para probar en despliegues de previsualización.
function urlBase() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  return SITIO_POR_DEFECTO;
}

// El sitio público, para los links que ve el lector. Puede diferir de urlBase()
// si se llama desde una URL de previsualización.
function urlSitio() {
  return (process.env.SITE_URL || SITIO_POR_DEFECTO).replace(/\/$/, '');
}

async function pedirJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(url + ' respondió ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/*
 * EL PRESUPUESTO DE LAS LLAMADAS AL PROPIO SITIO.
 *
 * AQUÍ ESTUVO EL FALLO QUE DEJÓ AL BOLETÍN SIN ENVIARSE, y conviene que quede
 * escrito para no repetirlo.
 *
 * El boletín diario pedía /api/news SIN filtro, que es la ruta cara: en frío
 * baja el RSS de Bloomberg y espera a que Anthropic escriba las opiniones —unos
 * OCHO segundos— y el presupuesto de aquí eran 8 s exactos. Si alguien había
 * entrado al sitio antes, el caché estaba caliente y el correo salía; si el
 * cron era la primera visita del día, que a las 8:00 es lo normal, la petición
 * se abortaba, el boletín se quedaba sin titulares y moría con "sin_contenido".
 * Un correo que sale unos días sí y otros no, sin tocar una línea de código, y
 * sin rastro porque los logs de Vercel duran 30 minutos.
 *
 * EL BOLETÍN SEMANAL YA NO PUEDE CAER EN ESO: pide /api/news?estado=aprobadas,
 * que no llama a Anthropic ni lee ningún feed — solo lee de Redis lo que una
 * persona ya aprobó. Es una petición de milisegundos, así que 10 s sobran y no
 * hay ninguna dependencia lenta escondida detrás.
 */
const MS_SITIO = 10000;

// Cuántos días atrás cuenta como "novedad" del research. Diez y no siete: si el
// reporte se actualiza un lunes y el correo sale el domingo siguiente, con
// siete justos se quedaría fuera por horas.
const DIAS_NOVEDAD_RESEARCH = 10;

// ---- Datos de mercado ------------------------------------------------------
// De la serie se toma el primer y el último punto: con `range=1W` eso es el
// cambio DE LA SEMANA, medido igual que la gráfica del sitio mide el del día.
function resumirSerie(datos) {
  const puntos = (datos && datos.points) || [];
  if (puntos.length < 2) return null;
  const primero = puntos[0][1];
  const ultimo = puntos[puntos.length - 1][1];
  if (typeof primero !== 'number' || typeof ultimo !== 'number' || !primero) return null;
  return {
    valor: ultimo,
    cambio: ultimo - primero,
    cambioPct: ((ultimo - primero) / primero) * 100,
    // Cuándo fue ese último punto. Antes se tiraba, y era justo el dato que
    // faltaba para poder decir de qué sesión son los números.
    ultimoTs: puntos[puntos.length - 1][0]
  };
}

// `range=1W` y no `1D`: el correo sale el domingo y habla de la SEMANA. Con 1D
// un domingo se enseñaría la sesión del viernes sola, que no es lo que dice el
// título de la sección. La ventana la define api/history.js (5 días en barras
// de una hora), no este archivo: así el correo y el sitio miden lo mismo.
async function datosDeMercado(base) {
  // En paralelo y tolerante a fallos: si Yahoo no responde para uno de los dos,
  // el boletín sale igual sin ese dato en vez de no salir.
  const [fx, vix] = await Promise.all([
    pedirJSON(base + '/api/history?pair=USDMXN&range=1W', MS_SITIO).catch((e) => {
      console.error('boletín: falló USD/MXN:', e.message);
      return null;
    }),
    pedirJSON(base + '/api/history?pair=VIX&range=1W', MS_SITIO).catch((e) => {
      console.error('boletín: falló VIX:', e.message);
      return null;
    })
  ]);

  return {
    mercado: { usdmxn: resumirSerie(fx), vix: resumirSerie(vix) },
    // La serie completa del dólar, que es la que dibuja la gráfica del correo.
    // Va aparte del resumen y no dentro de él porque `mercado` se devuelve
    // entero en la respuesta del ensayo: meter aquí ~120 puntos convertiría esa
    // respuesta en un muro de números cada vez que se quiere revisar el correo
    // de la semana.
    serieFx: fx && Array.isArray(fx.points) ? fx.points : null
  };
}

// ---- La noticia de la semana -----------------------------------------------
//
// De /api/news?estado=aprobadas, que devuelve SOLO lo que una persona revisó y
// aprobó. La más reciente primero: es la que llega el domingo con la semana
// todavía fresca.
//
// Se normaliza a la forma que pinta la plantilla, con los dos idiomas dentro:
// el contenido se arma UNA vez por envío y de ahí salen los correos en inglés y
// en español, así que aquí no se puede elegir idioma todavía.
async function noticiaDeLaSemana(base, sitio) {
  const datos = await pedirJSON(base + '/api/news?estado=aprobadas&limite=1', MS_SITIO)
    .catch((e) => {
      console.error('boletín: falló /api/news?estado=aprobadas:', e.message);
      return null;
    });

  const n = datos && Array.isArray(datos.items) ? datos.items[0] : null;
  if (!n || !n.slug || !n.es || !n.en) return null;

  // El enlace va a NUESTRA página, no al artículo original: ahí está la versión
  // explicada, en el idioma del lector, con el enlace a la fuente al lado. El
  // original a secas suele estar en inglés y detrás de un muro de pago.
  const texto = (lang) => ({
    titulo: String(n[lang].titulo || '').trim(),
    // `impacto` es la línea de "y esto a ti qué te toca", que es exactamente lo
    // que cabe en el correo. Si falta, las primeras frases del porqué.
    take: String(n[lang].impacto || '').trim() || teaserLeccion(n[lang].porque)
  });

  return {
    slug: n.slug,
    en: Object.assign(texto('en'), { link: sitio + '/news/' + n.slug }),
    es: Object.assign(texto('es'), { link: sitio + '/es/noticias/' + n.slug }),
    fuente: (n.fuente && n.fuente.nombre) || null,
    // 'humana' si Jaime reescribió el texto, 'ia-revisada' si lo aprobó tal
    // cual. La plantilla lo usa para etiquetar honestamente quién escribió eso.
    autoria: n.autoria || 'ia-revisada'
  };
}

// ---- El research, solo si hay novedad --------------------------------------
//
// /research-latest.json es una página ESTÁTICA de Astro (src/pages), no una
// función: el plan de Vercel admite 12 funciones y el sitio está en 12. Trae la
// cabecera de cada reporte con su fecha; aquí solo se decide si esa fecha es lo
// bastante reciente como para que valga la pena contarlo.
async function researchConNovedad(base, fecha) {
  const datos = await pedirJSON(base + '/research-latest.json', MS_SITIO).catch((e) => {
    console.error('boletín: falló /research-latest.json:', e.message);
    return null;
  });

  const lista = datos && Array.isArray(datos.reportes) ? datos.reportes : [];
  // Solo los que tienen página propia: enlazar a un reporte que todavía no
  // existe como URL sería mandar a la gente a un 404.
  const r = lista.find((x) => x && x.tienePagina && x.actualizado && x.enlaces && x.enlaces.en);
  if (!r) return null;

  const dias = (fecha.getTime() - Date.parse(r.actualizado + 'T00:00:00Z')) / 86400000;
  if (!isFinite(dias) || dias < 0 || dias > DIAS_NOVEDAD_RESEARCH) return null;

  return {
    ticker: r.ticker,
    name: r.name,
    exchange: r.exchange || null,
    status: r.status || null,
    actualizado: r.actualizado,
    en: { link: r.enlaces.en },
    es: { link: r.enlaces.es || r.enlaces.en }
  };
}

// ---- Contenido completo ----------------------------------------------------

async function construirContenido(fecha = new Date()) {
  const base = urlBase();
  const sitio = urlSitio();

  // Las piezas van EN PARALELO y fallan por separado: el research caído no debe
  // dejar al correo sin la noticia, ni la noticia sin el mercado. Ninguna llama
  // a Anthropic ni a un tercero — todo sale del propio sitio o de Redis.
  const [deMercado, noticia, research, movs, linea] = await Promise.all([
    datosDeMercado(base),
    noticiaDeLaSemana(base, sitio),
    researchConNovedad(base, fecha),
    movimientos.delaSemana(base, pedirJSON).catch((e) => {
      console.error('boletín: falló "qué se movió":', e.message);
      return null;
    }),
    nota.leer(fecha)
  ]);

  /*
   * La gráfica se dibuja AQUÍ, no al renderizar y no al abrir el correo.
   *
   * Aquí es donde acaban de llegar los puntos, y son los mismos con los que se
   * calculó el resumen numérico de arriba. Dibujar en este punto es lo que
   * garantiza que la curva y las cifras impresas al lado cuenten la misma
   * semana — que es todo el motivo por el que no se genera bajo demanda.
   *
   * Se dibuja UNA vez por envío aunque el boletín salga en dos idiomas: la
   * imagen no lleva texto, así que la misma sirve para los dos. Y como la URL
   * es idéntica para toda la lista, el proxy de Gmail la descarga una sola vez
   * para todos los destinatarios.
   */
  const grafica = deMercado.serieFx
    ? await graficaDolar.publicar(deMercado.serieFx, fecha, sitio)
    : null;

  return {
    fecha,
    numero: numeroDeEdicion(fecha),
    noticia,
    research,
    mercado: deMercado.mercado,
    movimientos: movs,
    // La línea de Jaime en los dos idiomas, o null. Es texto suyo tal cual: ni
    // pasa por una IA ni se recorta aquí (nota.js ya le puso el tope al
    // guardarla). Si solo escribió el español, `en` viene en null y el correo
    // en inglés sale sin ese bloque — ver el encabezado de nota.js.
    nota: linea ? { es: linea.es, en: linea.en } : null,
    grafica,
    // La serie completa del dólar. La usa el ARCHIVO —de ahí sale la gráfica de
    // la versión web, que se dibuja como SVG y no caduca a los 30 días como el
    // PNG del correo—, no la plantilla.
    serieFx: deMercado.serieFx,
    tip: tipDeLaSemana(fecha)
  };
}

// ---- Plantilla del correo --------------------------------------------------
// Reglas de correo, distintas a las de la web: maquetado con <table> y estilos
// EN LÍNEA (Gmail borra el <style> del <head> en varios casos), tipografía del
// sistema con serif de respaldo para los títulos (Fraunces no carga en correo),
// y 600px de ancho máximo, que es lo que muestran sin recortar los clientes de
// escritorio.
//
// EL MODO OSCURO, que es donde lee media bandeja de entrada, se resuelve con
// las dos únicas cosas que funcionan de verdad:
//
//   1. Colores en línea para el modo claro (lo que ve quien no tiene nada raro)
//      + una clase `sf-*` en CADA elemento coloreado, y un bloque <style> con
//      `prefers-color-scheme: dark` que solo repinta esas clases. Apple Mail,
//      iOS y Outlook para Mac lo respetan; el resto se queda en claro, que es
//      un correo correcto y no uno roto.
//   2. La cabecera es OSCURA SIEMPRE. Es la parte que peor sobrevive a la
//      inversión automática de Gmail —una marca en tinta negra sobre blanco
//      invertida a blanco sobre negro se ve sucia—, así que se dibuja ya
//      oscura: invertida o no, se ve igual.
//
// Y una regla que manda sobre las dos: NINGÚN dato vive solo dentro de una
// imagen. Con las imágenes bloqueadas el correo se lee entero.

// -- Modo claro: los colores en línea ----------------------------------------
const VERDE = '#0F8A5F';
const ROJO = '#A32D2D';
const TINTA = '#14161A';
const GRIS = '#5B6470';
const LINEA = '#E4E7EC';
const FONDO = '#F4F6F8';
const BLANCO = '#FFFFFF';
// Tinte del bloque que abre el correo. Verde muy lavado para que el texto
// oscuro encima siga teniendo contraste de sobra.
const VERDE_TENUE = '#F1F8F4';
const VERDE_BORDE = '#D7EAE0';
// La cabecera, que va oscura en los dos modos. Es la misma tinta de la barra
// superior del sitio: quien abre el correo ve lo mismo que ve en la web.
const CABECERA = '#14161A';
const VERDE_BRILLANTE = '#3ECF8E';

const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FUENTE_TITULO = "Georgia,'Times New Roman',serif";

/*
 * El <style> del modo oscuro.
 *
 * Solo repinta clases, nunca etiquetas: un selector como `td { }` lo aplican
 * algunos clientes a tablas que no son nuestras (las que envuelve el propio
 * cliente) y descuadra el correo entero.
 *
 * `[data-ogsc]` es lo que le pone Outlook.com al cuerpo cuando el lector tiene
 * el tema oscuro; no entiende prefers-color-scheme, así que lleva su propia
 * copia de las reglas. Son cuatro líneas repetidas y es más barato que la
 * alternativa, que es un correo ilegible para quien use Outlook.com de noche.
 */
const ESTILOS_OSCURO = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .sf-fondo   { background:#0B0D10 !important; }
    .sf-tarjeta { background:#15181D !important; border-color:#2B313A !important; }
    .sf-caja    { background:#1B1F26 !important; border-color:#2B313A !important; }
    .sf-tinta   { color:#EDEFF2 !important; }
    .sf-cuerpo  { color:#C7CDD6 !important; }
    .sf-gris    { color:#A2ABB6 !important; }
    .sf-linea   { border-color:#2B313A !important; }
    .sf-verde   { color:#3ECF8E !important; }
    .sf-rojo    { color:#F1817E !important; }
    .sf-tinte   { background:#122019 !important; border-color:#234032 !important; }
    .sf-boton   { background:#3ECF8E !important; border-color:#3ECF8E !important; }
    .sf-boton a { color:#0B0D10 !important; }
  }
  [data-ogsc] .sf-fondo   { background:#0B0D10 !important; }
  [data-ogsc] .sf-tarjeta { background:#15181D !important; border-color:#2B313A !important; }
  [data-ogsc] .sf-caja    { background:#1B1F26 !important; border-color:#2B313A !important; }
  [data-ogsc] .sf-tinta   { color:#EDEFF2 !important; }
  [data-ogsc] .sf-cuerpo  { color:#C7CDD6 !important; }
  [data-ogsc] .sf-gris    { color:#A2ABB6 !important; }
  [data-ogsc] .sf-linea   { border-color:#2B313A !important; }
  [data-ogsc] .sf-verde   { color:#3ECF8E !important; }
  [data-ogsc] .sf-rojo    { color:#F1817E !important; }
  [data-ogsc] .sf-tinte   { background:#122019 !important; border-color:#234032 !important; }
`;

function escapar(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Solo http(s) en los href: una URL rara del feed no debe acabar como link vivo
// dentro del correo.
function urlSegura(u) {
  return /^https?:\/\//i.test(String(u || '')) ? escapar(u) : '';
}

function fmt(n, dec = 4) {
  return typeof n === 'number' && isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : '—';
}

function pct(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

const TEXTOS = {
  en: {
    // Cabecera
    edicion: 'Issue',
    verEnWeb: 'View this issue in your browser',
    impulsoTitulo: 'The week in one line',
    notaTitulo: "Jaime's line",
    noticiaTitulo: "The week's story",
    miLectura: 'My take',
    // Etiqueta honesta de quién escribió el texto de la noticia. Es la misma
    // distinción que hace /news: aprobada tal cual o reescrita por Jaime.
    miLecturaIA: 'AI summary · reviewed by Jaime',
    leerMas: 'Read the full story →',
    mercadoTitulo: 'The dollar this week',
    // El título de repuesto para cuando el mercado de divisas está cerrado, que
    // un domingo es SIEMPRE. No se pide perdón por ello —el mercado cierra el
    // fin de semana, es lo normal—, simplemente se dice hasta cuándo llega el
    // número que se está enseñando.
    mercadoTituloCerrado: "The dollar's week, through Friday's close",
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Fear index (VIX)',
    movimientosTitulo: 'What moved this week',
    movimientosPie: 'Monday-to-Friday change',
    tipTitulo: "This week's lesson",
    tipCta: 'Read the lesson',
    tipMinutos: '{n}-minute read',
    researchTitulo: 'New in research',
    researchCta: 'Open the report →',
    researchPie: 'Equity research — sources cited, assumptions written out.',
    // Texto alternativo de la gráfica. Lleva los números DENTRO a propósito:
    // Outlook bloquea las imágenes por defecto y lo que se lee entonces es
    // esto, así que tiene que decir lo mismo que dice la curva.
    graficaAlt: 'Chart of the dollar against the peso {periodo}: from {inicio} to {fin} ({cambio}).',
    graficaPeriodoAbierto: 'over the past week',
    graficaPeriodoCerrado: "over the past week, through Friday's close",
    fuenteRetraso: 'Yahoo Finance · quotes delayed up to 15 min',
    fuenteCierre: 'Yahoo Finance · last close: {cuando}',
    despedida: 'See you next Sunday,',
    seguir: 'Follow along',
    verNumeros: 'Past issues',
    baja: 'Unsubscribe',
    bajaFrase: 'You are getting this because you confirmed your subscription to the Smart Finance weekly.',
    aviso: 'Educational content only — not financial, investment, or tax advice.',
    sinDatos: 'Not available right now.',
    sinNoticia: 'No story was reviewed and published this week. Nothing gets sent here before a human reads it.',
    // La frase de la semana en una línea. Se rellena con los datos reales; si
    // no llegó ninguno, se cae al respaldo de siempre.
    semanaFx: 'The dollar ended the week at {valor} pesos, {direccion} {pct}.',
    semanaFxSube: 'up',
    semanaFxBaja: 'down',
    semanaVix: 'Fear in the market ({vix}) {direccion} {pct}.',
    semanaVixSube: 'rose',
    semanaVixBaja: 'eased'
  },
  es: {
    edicion: 'Número',
    verEnWeb: 'Ver este número en el navegador',
    impulsoTitulo: 'La semana en una línea',
    notaTitulo: 'La línea de Jaime',
    noticiaTitulo: 'La noticia de la semana',
    miLectura: 'Mi lectura',
    miLecturaIA: 'Resumen IA · revisado por Jaime',
    leerMas: 'Leer la nota completa →',
    mercadoTitulo: 'El dólar esta semana',
    mercadoTituloCerrado: 'La semana del dólar, al cierre del viernes',
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Índice del miedo (VIX)',
    movimientosTitulo: 'Qué se movió esta semana',
    movimientosPie: 'cambio de lunes a viernes',
    tipTitulo: 'La lección de la semana',
    tipCta: 'Leer la lección',
    tipMinutos: '{n} min de lectura',
    researchTitulo: 'Novedad en research',
    researchCta: 'Abrir el reporte →',
    researchPie: 'Equity research — con las fuentes citadas y los supuestos escritos.',
    graficaAlt: 'Gráfica del dólar frente al peso {periodo}: de {inicio} a {fin} ({cambio}).',
    graficaPeriodoAbierto: 'en la última semana',
    graficaPeriodoCerrado: 'en la última semana, hasta el cierre del viernes',
    fuenteRetraso: 'Yahoo Finance · cotizaciones con hasta 15 min de retraso',
    fuenteCierre: 'Yahoo Finance · último cierre: {cuando}',
    despedida: 'Nos leemos el próximo domingo,',
    seguir: 'Sígueme',
    verNumeros: 'Números anteriores',
    baja: 'Darse de baja',
    bajaFrase: 'Recibes este correo porque confirmaste tu suscripción al boletín semanal de Smart Finance.',
    aviso: 'Contenido educativo únicamente — no es asesoría financiera, de inversión ni fiscal.',
    sinDatos: 'No disponible por ahora.',
    sinNoticia: 'Esta semana no hubo ninguna noticia revisada y publicada. Aquí no sale nada que una persona no haya leído antes.',
    semanaFx: 'El dólar cerró la semana en {valor} pesos, {direccion} {pct}.',
    semanaFxSube: 'arriba',
    semanaFxBaja: 'abajo',
    semanaVix: 'El miedo en el mercado ({vix}) {direccion} {pct}.',
    semanaVixSube: 'subió',
    semanaVixBaja: 'bajó'
  }
};

const URL_LINKEDIN = 'https://www.linkedin.com/in/jaime-sandoval-ricano-23b3a4401';
const URL_TIKTOK = 'https://www.tiktok.com/@smart.financee';

// El correo entero se fecha en hora de Ciudad de México: es donde vive quien lo
// escribe y la mayoría de quien lo lee, y el cron sale a las 8:00 de allá.
const HUSO = 'America/Mexico_City';

/*
 * EL NÚMERO DE EDICIÓN.
 *
 * Se cuenta desde el primer domingo del boletín semanal, que es el día en que
 * dejó de ser diario (el commit "El boletin pasa a ser semanal"). No se guarda
 * un contador en ninguna parte a propósito: un contador se desincroniza en
 * cuanto alguien manda una prueba, y entonces el número que va impreso en el
 * correo —y en la URL de su versión web— deja de ser el mismo dos veces.
 * Calculado desde la fecha, dos boletines del mismo domingo llevan el mismo
 * número siempre, que es lo único que el lector necesita que sea cierto.
 */
const PRIMER_DOMINGO = '2026-08-23';

function diaLocal(fecha) {
  return fecha.toLocaleDateString('en-CA', { timeZone: HUSO });   // 2026-08-23
}

function numeroDeEdicion(fecha) {
  const semanas = Math.floor(
    (Date.parse(diaLocal(fecha) + 'T12:00:00Z') - Date.parse(PRIMER_DOMINGO + 'T12:00:00Z')) /
    (7 * 86400000)
  );
  // Un ensayo fechado antes del primer domingo no puede enseñar "Nº 0" ni un
  // número negativo: se queda en el 1.
  return Math.max(1, semanas + 1);
}

/*
 * El renglón de fecha del boletín SEMANAL: el rango de los siete días que
 * resume, no el día en que salió.
 *
 * "Domingo, 23 de agosto" encabezando un correo que habla de lunes a viernes es
 * la fecha del sobre, no la del contenido. "17–23 de agosto" dice de qué semana
 * es esto, que es lo que el lector necesita saber cuando lo abre el martes.
 *
 * La semana se cuenta hacia atrás desde la fecha del envío: seis días antes del
 * domingo es el lunes anterior.
 */
function rangoSemana(fecha, idioma) {
  const es = idioma === 'es';
  const fin = new Date(diaLocal(fecha) + 'T12:00:00Z');
  const inicio = new Date(fin.getTime() - 6 * 86400000);

  const mes = (d) => d.toLocaleDateString(es ? 'es-MX' : 'en-US', { timeZone: 'UTC', month: 'long' });
  const dia = (d) => d.toLocaleDateString(es ? 'es-MX' : 'en-US', { timeZone: 'UTC', day: 'numeric' });

  // Dentro del mismo mes el mes se dice una vez: "17–23 de agosto".
  const texto = mes(inicio) === mes(fin)
    ? (es ? dia(inicio) + '–' + dia(fin) + ' de ' + mes(fin) : mes(fin) + ' ' + dia(inicio) + '–' + dia(fin))
    : (es ? dia(inicio) + ' de ' + mes(inicio) + ' – ' + dia(fin) + ' de ' + mes(fin)
          : mes(inicio) + ' ' + dia(inicio) + ' – ' + mes(fin) + ' ' + dia(fin));

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/*
 * LA SEMANA EN UNA LÍNEA — el bloque que abre el correo.
 *
 * Antes ahí iba una frase motivacional que escribía Anthropic. Se cambió por
 * esto y el cambio es a mejor por dos razones: es siempre cierto (sale de los
 * mismos números que están impresos tres bloques más abajo) y no puede fallar
 * ni costar nada. Un boletín semanal necesita además decir en el primer renglón
 * qué pasó, y una frase de ánimo genérica no lo dice.
 *
 * Si no llegó ni un dato de mercado se cae al respaldo de siempre: el bloque
 * nunca sale vacío, que era la regla original y sigue siéndolo.
 */
function resumenSemana(mercado, t, es) {
  const partes = [];
  const sinSigno = (n) => Math.abs(n).toFixed(2) + '%';

  if (mercado.usdmxn) {
    partes.push(t.semanaFx
      .replace('{valor}', fmt(mercado.usdmxn.valor, 2))
      .replace('{direccion}', mercado.usdmxn.cambioPct >= 0 ? t.semanaFxSube : t.semanaFxBaja)
      .replace('{pct}', sinSigno(mercado.usdmxn.cambioPct)));
  }
  if (mercado.vix) {
    partes.push(t.semanaVix
      .replace('{vix}', fmt(mercado.vix.valor, 2))
      .replace('{direccion}', mercado.vix.cambioPct >= 0 ? t.semanaVixSube : t.semanaVixBaja)
      .replace('{pct}', sinSigno(mercado.vix.cambioPct)));
  }

  return partes.length ? partes.join(' ') : IMPULSO_RESPALDO[es ? 'es' : 'en'];
}

// Quien firma el correo. Una sola constante para el HTML y para la versión de
// texto: son el mismo nombre y no pueden decir cosas distintas.
const FIRMA = 'Jaime Sandoval';

/*
 * EL ENCABEZADO DE CADA BLOQUE, con su ícono.
 *
 * Va en tabla de dos celdas y no como un <img> dentro del texto. Un ícono
 * alineado con vertical-align se cae medio píxel para arriba en Gmail, otro
 * medio para abajo en Outlook y se ve torcido justo en las líneas que más se
 * miran; en celdas separadas con valign="middle" queda alineado en todos, que
 * es la razón por la que el correo entero está maquetado en tablas.
 *
 * EL alt VA VACÍO Y ES CORRECTO. Los íconos no dicen nada que no diga el título
 * que tienen al lado: son una ayuda para distinguir las secciones de un
 * vistazo. Ponerles texto alternativo descriptivo haría que un lector de
 * pantalla leyera "ícono de libro, La lección de la semana" — la misma
 * información dos veces. La regla de que toda imagen lleve alt existe para que
 * no se pierda información dentro de una imagen, y aquí no hay ninguna: por eso
 * la gráfica del dólar sí lleva un alt largo y estos no llevan ninguno.
 */
function etiqueta(texto, icono, sitio, opciones) {
  const o = opciones || {};
  const tamano = o.tamano || 11;
  const espaciado = o.espaciado || '.1em';
  const abajo = o.abajo === undefined ? 10 : o.abajo;
  const celda = `padding-bottom:${abajo}px;`;

  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="16" valign="middle" style="${celda}line-height:0;padding-right:7px;">
      <img src="${escapar(sitio)}/assets/email/${escapar(icono)}.png" width="16" height="16" alt="" style="display:block;border:0;">
    </td>
    <td valign="middle" class="sf-verde" style="${celda}font-family:${FUENTE};font-size:${tamano}px;font-weight:700;letter-spacing:${espaciado};text-transform:uppercase;color:${VERDE};">${escapar(texto)}</td>
  </tr></table>`;
}

/*
 * EL CHIP DE FUENTE. Regla del sitio (CLAUDE.md): ningún dato de mercado se
 * publica sin decir de dónde sale y de cuándo es.
 *
 * En el correo faltaba, y no era un descuido menor: el boletín es el único
 * sitio donde esos números llegan SIN la página alrededor, o sea sin nada que
 * los ponga en contexto. Un "16.8950" suelto en una bandeja de entrada parece
 * el precio de este segundo.
 */
function chipFuente(texto) {
  return `<div class="sf-gris" style="font-family:${FUENTE};font-size:11px;line-height:1.5;color:${GRIS};padding-top:8px;">${escapar(texto)}</div>`;
}

/*
 * La gráfica del dólar.
 *
 * Va DEBAJO de las cifras, no encima. Con las imágenes bloqueadas —que es como
 * llega a Outlook por defecto— lo primero que se lee entonces son los números,
 * y el hueco de la imagen queda al final del bloque en vez de partirlo en dos.
 *
 * width/height en atributos Y en estilo: el atributo es lo único que entiende
 * Outlook, y sirve además para que reserve el sitio antes de cargar; el estilo
 * con max-width y height:auto es lo que la hace encogerse en un móvil, donde la
 * columna mide menos de 552 px.
 *
 * NO lleva clase de modo oscuro y es a propósito: el PNG está dibujado sobre
 * blanco, así que en modo oscuro se queda como una tarjeta blanca. Repintarle
 * el fondo al contenedor dejaría un marco oscuro alrededor de un rectángulo
 * blanco, que es peor.
 *
 * Si no hay gráfica (falló el dibujo, o Redis no contestó) no se pinta nada.
 * Nunca un <img> roto: los números ya están arriba, así que no se pierde dato.
 */
function bloqueGrafica(g, alt) {
  if (!g || !g.url) return '';
  return `<div style="padding-top:12px;">
    <img src="${escapar(g.url)}" width="${g.ancho}" height="${g.alto}" alt="${escapar(alt)}"
      style="display:block;width:100%;max-width:${g.ancho}px;height:auto;background:${BLANCO};border:1px solid ${LINEA};border-radius:10px;">
  </div>`;
}

// El texto alternativo de la gráfica, con los datos dentro. Se arma a partir
// del mismo resumen que pintan las celdas de al lado.
function altDeGrafica(resumen, t, cerrado) {
  if (!resumen) return '';
  const apertura = resumen.valor - resumen.cambio;
  const signo = resumen.cambioPct >= 0 ? '+' : '';
  return t.graficaAlt
    .replace('{periodo}', cerrado ? t.graficaPeriodoCerrado : t.graficaPeriodoAbierto)
    .replace('{inicio}', fmt(apertura, 4))
    .replace('{fin}', fmt(resumen.valor, 4))
    .replace('{cambio}', signo + resumen.cambioPct.toFixed(2) + '%');
}

/*
 * pies = { fx, vix }: "Último cierre · viernes 7 de agosto", o cadena vacía si
 * ese mercado estaba abierto cuando salió el correo.
 *
 * VA POR CELDA Y NO UNA SOLA VEZ ARRIBA, porque los dos números no cierran a la
 * vez y casi nunca coinciden. El cron sale a las 8:00 de México, o sea antes de
 * que abra la bolsa de Estados Unidos (8:30): en un martes cualquiera el
 * USD/MXN va en vivo —el mercado de divisas opera casi 24 h— mientras que el
 * VIX que se enseña es el del cierre de ayer. Un aviso único diciendo "el
 * mercado está cerrado" sería mentira sobre el dólar; uno por celda dice la
 * verdad sobre cada uno.
 */
function bloqueMercado(mercado, t, pies) {
  // invertirColor sirve para el VIX: que suba significa MÁS miedo, así que se
  // pinta en rojo aunque el número vaya hacia arriba. Es el mismo criterio que
  // usa el panel del VIX en el sitio.
  const celda = (etiquetaTexto, resumen, decimales, invertirColor, pie) => {
    if (!resumen) {
      return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};font-size:13px;">
        <div class="sf-gris" style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiquetaTexto)}</div>
        <div class="sf-gris" style="font-size:15px;color:${GRIS};padding-top:4px;">${escapar(t.sinDatos)}</div></td>`;
    }
    const sube = resumen.cambio >= 0;
    const bueno = invertirColor ? !sube : sube;
    const color = bueno ? VERDE : ROJO;
    const clase = bueno ? 'sf-verde' : 'sf-rojo';
    const signo = sube ? '+' : '';
    // El pie va en el gris de siempre y sin adorno: es una precisión sobre de
    // cuándo es el número, no una advertencia de que algo salió mal.
    const linea = pie
      ? `<div class="sf-gris" style="font-size:11px;color:${GRIS};padding-top:6px;">${escapar(pie)}</div>`
      : '';
    return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};">
      <div class="sf-gris" style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiquetaTexto)}</div>
      <div class="sf-tinta" style="font-size:22px;font-weight:700;color:${TINTA};padding-top:2px;">${fmt(resumen.valor, decimales)}</div>
      <div class="${clase}" style="font-size:13px;font-weight:600;color:${color};padding-top:2px;">${signo}${fmt(resumen.cambio, decimales)} (${signo}${resumen.cambioPct.toFixed(2)}%)</div>
      ${linea}
    </td>`;
  };

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-caja" style="border:1px solid ${LINEA};border-radius:10px;background:${BLANCO};">
    <tr>${celda(t.fxEtiqueta, mercado.usdmxn, 4, false, pies.fx)}${celda(t.vixEtiqueta, mercado.vix, 2, true, pies.vix)}</tr>
  </table>`;
}

/*
 * QUÉ SE MOVIÓ ESTA SEMANA: los que más subieron y los que más bajaron.
 *
 * Una fila por activo, con la flecha, el nombre, el ticker y el cambio. El
 * nombre va delante del ticker porque el correo lo lee gente que está
 * empezando: "Nvidia" se entiende y "NVDA" hay que aprendérselo, así que el
 * ticker va detrás y en gris, como la apostilla que es.
 *
 * LAS FLECHAS SON TEXTO (▲ ▼), no imágenes. Dos motivos: sobreviven a las
 * imágenes bloqueadas, y el color no es la única señal —quien no distingue
 * verde de rojo sigue viendo hacia dónde apunta el triángulo, y el signo del
 * porcentaje lo dice una tercera vez.
 */
function bloqueMovimientos(movs, idioma, t) {
  if (!movs) return '';

  const fila = (m, sube, ultima) => {
    const color = sube ? VERDE : ROJO;
    const clase = sube ? 'sf-verde' : 'sf-rojo';
    const borde = ultima ? '' : `border-bottom:1px solid ${LINEA};`;
    const claseBorde = ultima ? '' : ' sf-linea';
    return `<tr>
      <td width="18" valign="middle" aria-hidden="true" class="${clase}${claseBorde}" style="${borde}padding:9px 0 9px 12px;font-family:${FUENTE};font-size:12px;line-height:1.2;color:${color};">${sube ? '&#9650;' : '&#9660;'}</td>
      <td valign="middle" class="sf-tinta${claseBorde}" style="${borde}padding:9px 8px;font-family:${FUENTE};font-size:14px;line-height:1.3;color:${TINTA};">
        ${escapar(m[idioma === 'es' ? 'es' : 'en'])}
        <span class="sf-gris" style="color:${GRIS};font-size:11px;">${escapar(m.sym)}</span>
      </td>
      <td valign="middle" align="right" class="${clase}${claseBorde}" style="${borde}padding:9px 12px 9px 0;font-family:${FUENTE};font-size:14px;font-weight:700;line-height:1.3;color:${color};white-space:nowrap;">${escapar(pct(m.cambioPct))}</td>
    </tr>`;
  };

  const filas = movs.suben.map((m) => ({ m, sube: true }))
    .concat(movs.bajan.map((m) => ({ m, sube: false })));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-caja" style="border:1px solid ${LINEA};border-radius:10px;background:${BLANCO};">
    ${filas.map((f, i) => fila(f.m, f.sube, i === filas.length - 1)).join('')}
  </table>`;
}

/*
 * LA LÍNEA DE JAIME: el hueco fijo donde habla una persona.
 *
 * Si no hay nota, esta función devuelve cadena vacía y el correo no cambia de
 * forma: no queda un bloque con un título y nada debajo, que es como se ve un
 * hueco mal resuelto. Cuando la hay, va entre comillas, en la serif de los
 * títulos y firmada — o sea, se lee como una voz y no como una sección más.
 *
 * Va ARRIBA, después del resumen de la semana y antes de todo lo demás, porque
 * es lo único del correo que no podría haber escrito una máquina; enterrarla al
 * final sería quedarse con lo más valioso del boletín donde ya nadie lee.
 */
function bloqueNota(texto, sitio, t) {
  if (!texto) return '';
  return `<tr><td style="padding:26px 24px 0;">
    ${etiqueta(t.notaTitulo, 'nota', sitio, { abajo: 10 })}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td class="sf-linea" style="padding:2px 0 2px 14px;border-left:3px solid ${VERDE};">
        <div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-size:16px;line-height:1.6;color:${TINTA};">${escapar(texto)}</div>
        <div class="sf-gris" style="font-family:${FUENTE};font-size:12px;color:${GRIS};padding-top:8px;">— ${escapar(FIRMA)}</div>
      </td></tr>
    </table>
  </td></tr>`;
}

// UNA noticia, no cuatro: la más reciente que Jaime ya aprobó en /news. El
// titular es grande porque carga con toda la sección él solo.
//
// SIN NOTICIA APROBADA NO SE INVENTA NADA. El bloque dice que esta semana no
// hubo ninguna revisada, y eso es información, no un error: es exactamente la
// promesa del sitio funcionando. Antes aquí entraba un titular de Bloomberg con
// una opinión que había escrito Anthropic y que nadie había leído.
function bloqueNoticia(n, idioma, t) {
  if (!n) {
    return `<p class="sf-gris" style="font-family:${FUENTE};font-size:14px;line-height:1.6;color:${GRIS};margin:0;">${escapar(t.sinNoticia)}</p>`;
  }

  const lado = idioma === 'es' ? n.es : n.en;
  const take = lado.take || '';
  const link = urlSegura(lado.link);
  // Quién escribió el texto: si Jaime lo reescribió es suyo y va como "Mi
  // lectura"; si lo aprobó tal cual, se dice que es un resumen de IA revisado.
  const firmaTake = n.autoria === 'humana' ? t.miLectura : t.miLecturaIA;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td class="sf-tinta" style="padding:0 0 10px;font-family:${FUENTE_TITULO};font-size:20px;line-height:1.3;font-weight:700;color:${TINTA};">
      ${link ? `<a href="${link}" class="sf-tinta" style="color:${TINTA};text-decoration:none;">${escapar(lado.titulo)}</a>` : escapar(lado.titulo)}
    </td></tr>
    ${take ? `<tr><td class="sf-cuerpo" style="padding:0 0 6px 12px;border-left:3px solid ${VERDE};font-family:${FUENTE};font-size:15px;line-height:1.6;color:#39404A;">
      <span class="sf-verde" style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:3px;">${escapar(firmaTake)}</span>
      ${escapar(take)}
    </td></tr>` : ''}
    ${link ? `<tr><td style="padding:10px 0 0;font-family:${FUENTE};font-size:13px;">
      <a href="${link}" class="sf-verde" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.leerMas)}</a>
    </td></tr>` : ''}
  </table>`;
}

/*
 * EL BLOQUE DE RESEARCH, que solo aparece si hubo novedad.
 *
 * Es la única sección CONDICIONAL del correo con la nota de Jaime, y a
 * propósito: un reporte de research no se actualiza cada semana, y anunciar
 * "nada nuevo" siete veces seguidas entrena al lector a saltarse esa parte para
 * siempre. Cuando aparece, aparece porque hay algo.
 */
function bloqueResearch(r, idioma, t, sitio) {
  if (!r) return '';
  const lado = idioma === 'es' ? r.es : r.en;
  const link = urlSegura(lado.link);
  const titulo = r.name + (r.ticker ? ' (' + r.ticker + ')' : '');

  return `<tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.researchTitulo, 'research', sitio, { abajo: 10 })}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-caja" style="border:1px solid ${LINEA};border-radius:10px;background:${BLANCO};">
      <tr><td style="padding:14px 16px;">
        <div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-size:18px;line-height:1.3;font-weight:700;color:${TINTA};">${escapar(titulo)}</div>
        <div class="sf-gris" style="font-family:${FUENTE};font-size:13px;line-height:1.6;color:${GRIS};padding-top:4px;">${escapar(t.researchPie)}</div>
        ${link ? `<div style="padding-top:10px;font-family:${FUENTE};font-size:13px;">
          <a href="${link}" class="sf-verde" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.researchCta)}</a>
        </div>` : ''}
      </td></tr>
    </table>
  </td></tr>`;
}

/*
 * EL BOTÓN. Uno solo en todo el correo, y es el de la lección.
 *
 * Antes los dos únicos botones eran LinkedIn y TikTok, o sea que lo más
 * llamativo del boletín mandaba FUERA del sitio. Un correo con cinco enlaces
 * del mismo peso no tiene llamado a la acción: tiene cinco, que es lo mismo que
 * ninguno. La lección es lo que siempre está —haya noticia o no, haya research
 * o no— y es lo que el sitio quiere que la gente lea, así que es la que se lleva
 * el botón; todo lo demás se queda como enlace de texto.
 *
 * En tabla y con el color de fondo en el <td>, que es la única forma que pintan
 * igual Gmail, Outlook y Apple Mail: un <a> con padding y background se le
 * queda gris a Outlook, que ignora el padding.
 */
function boton(texto, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td align="center" class="sf-boton" style="background:${VERDE};border:1px solid ${VERDE};border-radius:8px;">
      <a href="${escapar(url)}" style="display:inline-block;padding:12px 24px;font-family:${FUENTE};font-size:15px;font-weight:600;color:${BLANCO};text-decoration:none;">${escapar(texto)}</a>
    </td>
  </tr></table>`;
}

// Teaser de la lección: las primeras frases enteras de su resumen, hasta llegar
// a unos 90 caracteres.
//
// Se corta por frases y no por número de letras a propósito: cortar a los 90 y
// poner puntos suspensivos deja la línea a medias justo donde estaba la idea, y
// el objetivo es que dé ganas de abrir la lección, no que parezca un error.
// El corte solo cuenta como final de frase si al punto le siguen un espacio y
// una mayúscula, para que "S&P 500." o "50/30/20." no partan la frase en dos.
/*
 * El tope del gancho, garantizado aquí y no solo pedido en el prompt.
 *
 * El prompt dice "menos de 65 caracteres" y el modelo a veces lo cumple y a
 * veces no: en una corrida devolvió 83, que en la bandeja de Gmail se corta a
 * media frase. Pedirlo más fuerte no lo convierte en garantía — esto sí.
 *
 * No recorta a lo bruto: busca el final de la primera cláusula (la coma, la
 * raya, los dos puntos) y corta ahí, así que lo que queda es una frase entera y
 * no una a medias con puntos suspensivos. "Los aranceles de soja suben tu
 * carrito de compras, y la regla para controlar gastos" se queda en "Los
 * aranceles de soja suben tu carrito de compras", que es justo lo que se
 * querría haber escrito. Por eso el prompt le pide además poner lo importante
 * al principio: lo que sobreviva al corte es lo de delante.
 */
const GANCHO_MAX = 65;

/*
 * Lo que un filtro de spam mira en el asunto, y que no se puede confiar a que
 * quien escribió el titular se acuerde.
 *
 * No reescribe el texto: solo quita lo que NUNCA quiere decir nada y sí puntúa
 * como correo basura — signos repetidos ("¡¡GRATIS!!"), el titular gritado
 * entero en mayúsculas y los espacios de más. Un "!" suelto se respeta: es
 * puntuación normal y quitarlo sería corregirle la redacción a una persona.
 *
 * Las mayúsculas se arreglan bajándolas y devolviendo la inicial, no
 * rechazando el asunto: un boletín no puede quedarse sin salir porque un
 * titular venga en caja alta.
 */
function limpiarAsunto(texto) {
  let t = String(texto || '').replace(/\s+/g, ' ').trim();
  t = t.replace(/([!?¡¿])\1+/g, '$1');

  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length;
  // Más de ocho letras y todas en alta: es un grito, no un titular.
  if (letras.length > 8 && mayusculas === letras.length) {
    t = t.toLocaleLowerCase('es-MX');
    t = t.charAt(0).toLocaleUpperCase('es-MX') + t.slice(1);
  }
  return t;
}

function recortarGancho(texto) {
  const t = limpiarAsunto(texto);
  if (t.length <= GANCHO_MAX) return t;

  const zona = t.slice(0, GANCHO_MAX + 1);
  const corte = Math.max(
    zona.lastIndexOf(' — '), zona.lastIndexOf('—'), zona.lastIndexOf('–'),
    zona.lastIndexOf(', '), zona.lastIndexOf('; '), zona.lastIndexOf(': ')
  );
  // El mínimo de 20 evita que una coma muy temprana deje un asunto de tres
  // palabras; en ese caso es mejor cortar por la última palabra que quepa.
  const bruto = corte > 20 ? zona.slice(0, corte) : zona.slice(0, zona.lastIndexOf(' '));

  // Sin puntuación colgando ("…de compras,") ni palabra de relleno al final
  // ("…y te explico la"), que es lo que deja el corte por última palabra
  // cuando la frase no traía puntuación donde cortar.
  const COLGANTES = /\s+(y|e|o|u|de|del|al|la|el|los|las|un|una|unos|unas|que|con|por|para|en|su|sus|and|or|the|a|an|of|to|for|in|on|with|its)$/i;
  let r = bruto.replace(/[\s,;:—–-]+$/, '');
  while (COLGANTES.test(r)) r = r.replace(COLGANTES, '');
  return r.trim();
}

const TEASER_MIN = 90;
function teaserLeccion(texto) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return '';

  const corte = /[.!?](?=\s+[¿¡"“A-ZÁÉÍÓÚÑ])/g;
  let m;
  let fin = -1;
  while ((m = corte.exec(limpio)) !== null) {
    fin = m.index + 1;
    if (fin >= TEASER_MIN) break;
  }
  return fin > 0 ? limpio.slice(0, fin) : limpio;
}

// Las redes, ya sin botón: dos enlaces de texto en el pie, junto al archivo de
// números anteriores. Siguen estando y siguen siendo fáciles de encontrar; lo
// que ya no hacen es competir con el único llamado a la acción del correo.
// `baseBoletin` es la raíz del archivo EN EL IDIOMA DEL CORREO. Se recibe en
// vez de calcularse aquí porque el idioma lo decide quien renderiza: si esta
// función se lo inventara, volveríamos al fallo que arregla — la etiqueta
// traducida y el destino en inglés.
function pieEnlaces(t, sitio, baseBoletin) {
  const enlace = (texto, url) =>
    `<a href="${escapar(url)}" class="sf-gris" style="color:${GRIS};text-decoration:underline;">${escapar(texto)}</a>`;

  return `<div class="sf-gris" style="font-family:${FUENTE};font-size:12px;line-height:1.8;color:${GRIS};">
    ${enlace('LinkedIn', URL_LINKEDIN)} &nbsp;·&nbsp; ${enlace('TikTok', URL_TIKTOK)} &nbsp;·&nbsp; ${enlace(t.verNumeros, sitio + baseBoletin)}
  </div>`;
}

/*
 * EL ORDEN DEL CORREO, de arriba a abajo:
 *
 *   0. Ver en el navegador — fuera de la tarjeta, chiquito. La salida de
 *      emergencia de quien tiene las imágenes bloqueadas o un cliente raro.
 *   1. La cabecera  — la marca, el número de edición y la semana que resume.
 *   2. Gancho       — titular corto, distinto cada semana. Es también el asunto.
 *   3. La semana    — lo que hizo el mercado, en una línea y con sus números.
 *   4. La línea de Jaime — SOLO si la escribió. Es lo único que no puede
 *                     escribir una máquina, así que va antes que nada.
 *   5. La noticia   — UNA, la más reciente ya aprobada, con su "por qué importa".
 *   6. El dólar     — USD/MXN y el VIX al lado, la gráfica y el chip de fuente.
 *   7. Qué se movió — los tres que más subieron y los tres que más bajaron.
 *   8. La lección   — nombre, tiempo de lectura, teaser y EL botón del correo.
 *   9. Research     — SOLO si hubo novedad.
 *  10. La firma     — quién escribe esto.
 *  11. El pie       — redes, números anteriores, baja y disclaimer.
 *
 * Nada más. Un boletín semanal tiene la tentación de meter las cinco noticias
 * de la semana y las tres lecciones; con eso se convierte en un archivo que
 * nadie termina. Una de cada, elegidas, se leen.
 */
function renderizarCorreo({ contenido, idioma, urlBaja }) {
  const es = idioma === 'es';
  const t = TEXTOS[es ? 'es' : 'en'];
  const sitio = urlSitio();
  const tip = contenido.tip[es ? 'es' : 'en'];
  const urlTip = sitio + urlDelTip(contenido.tip, es ? 'es' : 'en');
  const teaser = teaserLeccion(tip.resumen);
  const noticia = contenido.noticia || null;
  const research = contenido.research || null;
  const movs = contenido.movimientos || null;
  const linea = (contenido.nota && contenido.nota[es ? 'es' : 'en']) || null;
  const numero = contenido.numero || numeroDeEdicion(contenido.fecha);
  const rango = rangoSemana(contenido.fecha, idioma);
  // La raíz del archivo del boletín EN EL IDIOMA DE ESTE CORREO. Va aquí arriba
  // y no repetida en cada sitio donde hace falta porque el fallo que arregla
  // fue justamente ese: la ruta escrita a mano tres veces, traducida cero.
  // Un suscriptor en español aterrizaba en la página inglesa.
  const baseBoletin = es ? '/es/boletin' : '/newsletter';
  // La versión web de ESTE número. La página la genera Astro desde el archivo
  // commiteado, y mientras no lo esté la sirve /newsletter-read leyendo del
  // endpoint: la URL funciona desde el minuto uno.
  const urlWeb = sitio + baseBoletin + '/' + diaLocal(contenido.fecha);
  // La semana en una línea: sale de los mismos números que se imprimen abajo.
  const resumen = resumenSemana(contenido.mercado, t, es);

  /*
   * El gancho —que es también el asunto— es el TITULAR DE LA NOTICIA APROBADA.
   *
   * Antes lo escribía Anthropic dentro de /api/news. Se dejó de usar porque el
   * modelo lo redactaba a partir de los titulares del DÍA, y en un correo
   * semanal eso prometía en la bandeja de entrada una noticia que dentro del
   * correo no estaba. El titular de la noticia que sí va dentro no puede
   * desincronizarse de nada, y además ya pasó por una persona.
   *
   * SIN NOTICIA APROBADA, EL ASUNTO ES EL TÍTULO DE LA LECCIÓN, y esto es un
   * cambio con motivo: el respaldo de antes ("La semana del dólar, y una
   * lección en dos minutos") era el mismo texto todas las semanas que no
   * hubiera noticia. Dos domingos seguidos con el mismo asunto es la señal más
   * clara que existe de correo automático que no hace falta abrir. El título de
   * la lección cambia cada semana, es cierto —esa lección va dentro— y dice de
   * qué va el correo. El respaldo genérico se queda para el caso de que ni
   * siquiera haya lección, que no debería pasar nunca.
   */
  const gancho = recortarGancho(
    (noticia && (es ? noticia.es.titulo : noticia.en.titulo)) ||
    (tip && tip.titulo) ||
    GANCHO_SEMANAL[es ? 'es' : 'en']
  );

  /*
   * ¿ESTÁ CERRADO EL MERCADO? Lo decide assets/market-hours.js con la marca de
   * tiempo del último punto de cada serie, que es exactamente el mismo cálculo
   * que hace la gráfica del sitio.
   *
   * El "ahora" es la fecha del propio boletín y no Date.now(): así un ensayo
   * puede fingir que es domingo y ver el correo tal cual saldría ese día, sin
   * tener que esperar al domingo.
   */
  const ahora = (contenido.fecha instanceof Date ? contenido.fecha : new Date()).getTime();
  const cierreDe = (r) => horario.estado(r && r.ultimoTs, { ahora, timeZone: HUSO });
  const pieDe = (est) => (est.cerrado ? horario.pieCierre(est, { es, timeZone: HUSO }) : '');

  const cierreFx = cierreDe(contenido.mercado.usdmxn);
  const cierreVix = cierreDe(contenido.mercado.vix);
  const pies = { fx: pieDe(cierreFx), vix: pieDe(cierreVix) };
  // La misma fecha suelta, sin la etiqueta, para la versión de texto: ahí la
  // línea la encabeza el símbolo y la etiqueta va en minúscula dentro de la
  // frase. Se saca aparte en vez de pasar el pie por toLowerCase() porque eso
  // se comía también la fecha y dejaba "last close · friday, august 7".
  const cuandoCerro = (est) => (est.cerrado ? horario.cuando(est, { es, timeZone: HUSO }) : '');

  // El chip de fuente: de dónde salen los números y de cuándo son. Con el
  // mercado abierto manda el retraso real del proveedor; cerrado, la sesión de
  // la que se está hablando.
  const chipDe = (est) => (est.cerrado && cuandoCerro(est)
    ? t.fuenteCierre.replace('{cuando}', cuandoCerro(est))
    : t.fuenteRetraso);

  // El título habla del dólar, así que lo manda el dólar. El VIX se explica en
  // su propia celda.
  const tituloMercado = cierreFx.cerrado ? t.mercadoTituloCerrado : t.mercadoTitulo;
  // El alt de la gráfica dice el mismo periodo que el título de la sección:
  // "las últimas 24 horas" un domingo sería falso por la misma razón.
  const altGrafica = altDeGrafica(contenido.mercado.usdmxn, t, cierreFx.cerrado);

  // El chip de la tabla de movimientos: su propia hora (la del punto más nuevo
  // de los doce activos), no la del dólar.
  const cierreMovs = movs ? cierreDe({ ultimoTs: movs.asOf }) : null;
  const chipMovs = movs ? chipDe(cierreMovs) + ' · ' + t.movimientosPie : '';

  const minutos = contenido.tip.minutos
    ? t.tipMinutos.replace('{n}', String(contenido.tip.minutos))
    : '';

  /*
   * ¿EL TITULAR DE ARRIBA YA ES EL TÍTULO DE LA LECCIÓN?
   *
   * Pasa cada semana en la que no hubo noticia aprobada, porque entonces el
   * gancho lo pone la lección. En la primera versión el mismo título salía dos
   * veces en serif grande, con ochocientos píxeles de por medio, y eso no se
   * lee como un boletín bien hecho: se lee como una plantilla mal rellenada.
   *
   * Se quita el de abajo y no el de arriba: el de arriba es el titular del
   * número, y el bloque de la lección se sostiene igual con su etiqueta, el
   * tiempo de lectura, el resumen y el botón.
   */
  const tituloRepetido = gancho === recortarGancho(tip.titulo);

  const plantilla = `<!doctype html>
<html lang="${es ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Smart Finance — ${escapar(t.edicion)} ${numero}</title>
<style>${ESTILOS_OSCURO}</style>
</head>
<body class="sf-fondo" style="margin:0;padding:0;background:${FONDO};">
<!-- Preencabezado: lo que se lee en la bandeja junto al asunto. Ya no repite el
     gancho —eso deja "titular · titular" en la bandeja—: anuncia lo que hizo el
     mercado, que es lo otro que trae el correo y cambia cada semana. Oculto en
     el cuerpo con tamaño cero para que no se vea dos veces al abrir. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(resumen)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-fondo" style="background:${FONDO};">
<tr><td align="center" style="padding:20px 12px 24px;">

<!-- 0. VER EN EL NAVEGADOR. Fuera de la tarjeta y en gris pequeño: es la salida
        de emergencia de quien tiene las imágenes bloqueadas o abre el correo en
        un cliente que destroza el HTML, no una sección del boletín. -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
  <tr><td align="center" style="padding:0 0 10px;font-family:${FUENTE};font-size:11px;line-height:1.5;">
    <a href="${escapar(urlWeb)}" class="sf-gris" style="color:${GRIS};text-decoration:underline;">${escapar(t.verEnWeb)}</a>
  </td></tr>
</table>

<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="sf-tarjeta" style="width:100%;max-width:600px;background:${BLANCO};border-radius:14px;overflow:hidden;border:1px solid ${LINEA};">

  <!-- 1. LA CABECERA. Oscura en los dos modos, como la barra superior del
          sitio: es lo que hace que el correo se reconozca de un vistazo en la
          bandeja y lo único que no se descuadra cuando Gmail invierte los
          colores por su cuenta.

          Es TEXTO, no una imagen — así se ve igual con las imágenes
          bloqueadas, no suma un byte de descarga y no le da a ningún filtro de
          spam una imagen más que contar. La serif de sistema hace aquí el papel
          de Fraunces, que no carga en correo. -->
  <tr><td style="background:${CABECERA};padding:20px 24px 18px;">
    <div style="font-family:${FUENTE_TITULO};font-size:23px;font-weight:700;letter-spacing:-0.01em;line-height:1.1;color:#FFFFFF;">
      Smart <span style="color:${VERDE_BRILLANTE};">Finance</span>
    </div>
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8A929C;padding-top:7px;">
      ${escapar(t.edicion)} ${numero} &nbsp;·&nbsp; ${escapar(rango)}
    </div>
  </td></tr>

  <!-- 2. EL GANCHO: de qué va el número de esta semana. -->
  <tr><td class="sf-linea" style="padding:22px 24px;border-bottom:1px solid ${LINEA};">
    <div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-size:25px;line-height:1.28;font-weight:700;color:${TINTA};">
      ${escapar(gancho)}
    </div>
  </td></tr>

  <!-- 3. La semana en una línea. Es el único bloque del correo con fondo
          propio: el tinte lo separa del resto sin usar imágenes, que la mayoría
          de los clientes bloquea hasta que el lector las permite. -->
  <tr><td style="padding:20px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="sf-tinte" style="background:${VERDE_TENUE};border:1px solid ${VERDE_BORDE};border-radius:12px;">
      <tr>
        <td valign="top" style="padding:16px 18px;">
          ${etiqueta(t.impulsoTitulo, 'semana', sitio, { tamano: 10, espaciado: '.12em', abajo: 6 })}
          <div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-size:16px;line-height:1.55;color:${TINTA};">${escapar(resumen)}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 4. La línea de Jaime: SOLO si la escribió esta semana. -->
  ${bloqueNota(linea, sitio, t)}

  <!-- 5. La noticia de la semana. Una, y aprobada por una persona. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.noticiaTitulo, 'noticia', sitio, { abajo: 12 })}
    ${bloqueNoticia(noticia, idioma, t)}
  </td></tr>

  <!-- 6. La semana del dólar: USD/MXN y el VIX al lado, en la misma fila, y
          debajo la gráfica de los cinco días. Con el mercado cerrado —que un
          domingo es siempre— el título cambia y cada celda dice de qué sesión
          es su número. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(tituloMercado, 'dolar', sitio, {})}
    ${bloqueMercado(contenido.mercado, t, pies)}
    ${bloqueGrafica(contenido.grafica, altGrafica)}
    ${chipFuente(chipDe(cierreFx))}
  </td></tr>

  <!-- 7. Qué se movió: los tres que más subieron y los tres que más bajaron del
          registro de activos del sitio. Si no contestaron bastantes, este
          bloque no existe (mejor nada que media tabla). -->
  ${movs ? `<tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.movimientosTitulo, 'movimientos', sitio, {})}
    ${bloqueMovimientos(movs, idioma, t)}
    ${chipFuente(chipMovs)}
  </td></tr>` : ''}

  <!-- 8. La lección de la semana: nombre, cuánto se tarda en leerla, un teaser
          corto y EL botón del correo. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.tipTitulo, 'leccion', sitio, { abajo: 8 })}
    ${tituloRepetido ? '' : `<div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-size:19px;line-height:1.3;font-weight:700;color:${TINTA};padding-bottom:4px;">${escapar(tip.titulo)}</div>`}
    ${minutos ? `<div class="sf-gris" style="font-family:${FUENTE};font-size:12px;color:${GRIS};padding-bottom:8px;">${escapar(minutos)}</div>` : ''}
    <div class="sf-cuerpo" style="font-family:${FUENTE};font-size:14px;line-height:1.6;color:#39404A;padding-bottom:14px;">${escapar(teaser)}</div>
    ${boton(t.tipCta, urlTip)}
  </td></tr>

  <!-- 9. Research: SOLO si hubo novedad en los últimos días. -->
  ${bloqueResearch(research, idioma, t, sitio)}

  <!-- 10. La firma. Texto, no imagen: es un nombre, y una imagen para un nombre
          se ve rota justo en los clientes que bloquean imágenes. -->
  <tr><td style="padding:28px 24px 0;">
    <div class="sf-linea" style="border-top:1px solid ${LINEA};padding-top:16px;font-family:${FUENTE};font-size:12px;line-height:1.5;">
      <span class="sf-gris" style="color:${GRIS};">${escapar(t.despedida)}</span>
      <div class="sf-tinta" style="font-family:${FUENTE_TITULO};font-style:italic;font-size:17px;color:${TINTA};padding-top:2px;">${escapar(FIRMA)}</div>
    </div>
  </td></tr>

  <!-- 11. El pie: las redes y el archivo como enlaces de texto, la baja y el
          disclaimer. La baja va en TODOS los envíos: es obligatoria por ley, no
          una cortesía, y por eso no depende de ninguna condición de arriba. -->
  <tr><td style="padding:16px 24px 24px;">
    ${pieEnlaces(t, sitio, baseBoletin)}
  </td></tr>
  <tr><td class="sf-linea" style="padding:16px 24px 24px;border-top:1px solid ${LINEA};">
    <div class="sf-gris" style="font-family:${FUENTE};font-size:11px;line-height:1.6;color:${GRIS};">
      ${escapar(t.bajaFrase)}<br>
      <a href="${escapar(urlBaja)}" class="sf-gris" style="color:${GRIS};text-decoration:underline;">${escapar(t.baja)}</a>
    </div>
    <div class="sf-gris" style="font-family:${FUENTE};font-size:11px;line-height:1.6;color:#8A929C;padding-top:10px;">
      ${escapar(t.aviso)}
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  /*
   * Los comentarios del HTML se quitan al enviar.
   *
   * Están escritos para quien lea ESTE archivo —por qué la cabecera va oscura,
   * por qué la gráfica va debajo de las cifras— y no aportan nada dentro del
   * correo: son unos 2 KB por envío, y Gmail corta el mensaje a los 102 KB con
   * un "mensaje truncado". Además una prueba que busque "Qué se movió" en el
   * HTML encontraría el comentario aunque el bloque no se haya pintado, que es
   * la clase de prueba que pasa siempre y no comprueba nada.
   *
   * OJO si algún día hay que meter un comentario condicional de Outlook
   * (`<!--[if mso]>`): eso NO es documentación y esta línea se lo llevaría por
   * delante. Hoy no hay ninguno.
   */
  const html = plantilla.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n');

  // Versión en texto plano: algunos clientes la prefieren y su ausencia cuenta
  // como señal de spam en varios filtros.
  // Mismo orden que el HTML, para que quien lea la versión de texto lea el
  // mismo correo y no otro.
  const lineas = [
    'SMART FINANCE — ' + t.edicion.toUpperCase() + ' ' + numero + ' · ' + rango,
    '',
    gancho,
    '',
    t.verEnWeb + ': ' + urlWeb,
    '',
    t.impulsoTitulo.toUpperCase(), resumen, ''
  ];

  if (linea) {
    lineas.push(t.notaTitulo.toUpperCase(), '"' + linea + '"', '— ' + FIRMA, '');
  }

  lineas.push(t.noticiaTitulo.toUpperCase());

  if (noticia) {
    const lado = es ? noticia.es : noticia.en;
    lineas.push(lado.titulo);
    if (lado.take) {
      lineas.push((noticia.autoria === 'humana' ? t.miLectura : t.miLecturaIA) + ': ' + lado.take);
    }
    if (lado.link) lineas.push(lado.link);
  } else {
    lineas.push(t.sinNoticia);
  }

  // Misma información que en el HTML, incluido el aviso de cierre: quien lee la
  // versión de texto tiene que leer el mismo correo, no uno con menos matices.
  const etiquetaCierre = es ? 'último cierre' : 'last close';
  const conPie = (l, est) => {
    const q = cuandoCerro(est);
    return q ? l + ' — ' + etiquetaCierre + ': ' + q : l;
  };

  lineas.push(
    '', tituloMercado.toUpperCase(),
    contenido.mercado.usdmxn
      ? conPie(`USD/MXN ${fmt(contenido.mercado.usdmxn.valor, 4)} (${pct(contenido.mercado.usdmxn.cambioPct)})`, cierreFx)
      : 'USD/MXN ' + t.sinDatos,
    contenido.mercado.vix
      ? conPie(`VIX ${fmt(contenido.mercado.vix.valor, 2)} (${pct(contenido.mercado.vix.cambioPct)})`, cierreVix)
      : 'VIX ' + t.sinDatos,
    chipDe(cierreFx)
  );

  // La tabla de movimientos, con las mismas flechas: en texto plano un "+" y un
  // "-" bastarían, pero la flecha es lo que hace que la lista se lea de un
  // vistazo también aquí.
  if (movs) {
    lineas.push('', t.movimientosTitulo.toUpperCase());
    for (const m of movs.suben) lineas.push('  ▲ ' + m[es ? 'es' : 'en'] + ' (' + m.sym + ') ' + pct(m.cambioPct));
    for (const m of movs.bajan) lineas.push('  ▼ ' + m[es ? 'es' : 'en'] + ' (' + m.sym + ') ' + pct(m.cambioPct));
    lineas.push(chipMovs);
  }

  lineas.push('', t.tipTitulo.toUpperCase());
  // Mismo criterio que en el HTML: si el titular del número ya ES el título de
  // la lección, aquí no se repite.
  if (!tituloRepetido) lineas.push(tip.titulo + (minutos ? ' · ' + minutos : ''));
  else if (minutos) lineas.push(minutos);
  lineas.push(teaser, urlTip);

  // El research solo si lo hay, igual que en el HTML: las dos versiones tienen
  // que ser el mismo correo.
  if (research) {
    const lado = es ? research.es : research.en;
    lineas.push(
      '', t.researchTitulo.toUpperCase(),
      research.name + (research.ticker ? ' (' + research.ticker + ')' : ''),
      t.researchPie,
      lado.link
    );
  }

  lineas.push(
    '', t.seguir.toUpperCase(),
    'LinkedIn: ' + URL_LINKEDIN,
    'TikTok: ' + URL_TIKTOK,
    t.verNumeros + ': ' + sitio + baseBoletin,
    // La misma firma que cierra el HTML. La gráfica en cambio no deja rastro
    // aquí, y es lo correcto: sus datos ya están escritos arriba, así que
    // anunciar una imagen que esta versión no puede enseñar solo sobraría.
    '', t.despedida, FIRMA,
    '', t.bajaFrase, t.baja + ': ' + urlBaja,
    '', t.aviso
  );

  // El asunto ES el gancho: el titular de la noticia aprobada o, si esta semana
  // no hubo, el título de la lección. El remitente ya se llama Smart Finance,
  // así que repetirlo aquí solo gastaría los caracteres que la bandeja muestra
  // antes de cortar.
  const asunto = gancho;

  return { html, texto: lineas.join('\n'), asunto };
}

/*
 * EL NÚMERO PARA EL ARCHIVO: lo mismo que se mandó, en datos.
 *
 * Se guarda el CONTENIDO y no el HTML del correo. Una página web no es una
 * tabla de 600 px con estilos en línea, así que con los datos la versión web se
 * pinta como página —con la tipografía del sitio, su modo oscuro y sus
 * enlaces— y el archivo pesa 4 KB en vez de 40.
 *
 * Los textos van EN LOS DOS IDIOMAS, como en el correo: de aquí salen las dos
 * páginas, /newsletter/<fecha> y su gemela en español.
 */
function paraArchivo(contenido) {
  const fecha = contenido.fecha instanceof Date ? contenido.fecha : new Date();
  const t = { en: TEXTOS.en, es: TEXTOS.es };
  const conIdioma = (fn) => ({ en: fn('en'), es: fn('es') });

  return {
    version: 1,
    fecha: diaLocal(fecha),
    enviadoEn: fecha.toISOString(),
    numero: contenido.numero || numeroDeEdicion(fecha),
    rango: conIdioma((l) => rangoSemana(fecha, l)),
    gancho: conIdioma((l) => recortarGancho(
      (contenido.noticia && contenido.noticia[l].titulo) ||
      (contenido.tip && contenido.tip[l] && contenido.tip[l].titulo) ||
      GANCHO_SEMANAL[l]
    )),
    resumen: conIdioma((l) => resumenSemana(contenido.mercado, t[l], l === 'es')),
    nota: contenido.nota || null,
    noticia: contenido.noticia || null,
    mercado: contenido.mercado || null,
    movimientos: contenido.movimientos || null,
    // La serie del dólar, para que la página pueda dibujar la misma curva en
    // SVG. El PNG del correo caduca a los 30 días en Redis; esto no caduca.
    serieFx: contenido.serieFx || null,
    tip: contenido.tip || null,
    research: contenido.research || null
  };
}

module.exports = {
  construirContenido, renderizarCorreo, urlBase, urlSitio, escapar, urlSegura,
  teaserLeccion, recortarGancho, limpiarAsunto, rangoSemana, resumenSemana, numeroDeEdicion,
  paraArchivo, diaLocal,
  // IMPULSO_RESPALDO y GANCHO_RESPALDO los importa api/news.js para el
  // carrusel del sitio; el boletín semanal ya no los usa salvo como último
  // recurso si la semana entera se queda sin un dato de mercado.
  IMPULSO_RESPALDO, GANCHO_RESPALDO, GANCHO_SEMANAL, TEXTOS
};
