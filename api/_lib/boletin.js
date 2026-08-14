// Arma el contenido del boletín diario y lo pinta en la plantilla de correo.
//
// REUTILIZA, NO DUPLICA: las noticias y los precios se piden a /api/news y
// /api/history del propio sitio en vez de repetir aquí su lógica. Eso importa
// sobre todo con las noticias: /api/news ya cachea el resultado del día junto
// con las opiniones, así que pedírselo por HTTP aprovecha ese caché y NO
// dispara una segunda llamada a Anthropic. Si en cambio importáramos su código,
// cada envío generaría las opiniones otra vez, con otro costo y otro texto.

const { tipDelDia } = require('./tips');
// El MISMO módulo que usa la gráfica del sitio para decidir si el mercado está
// cerrado. No es una copia: si el correo y la web usaran criterios distintos,
// un domingo el sitio diría "último cierre: viernes" y el boletín seguiría
// presentando el mismo número como si fuera de hoy.
const horario = require('../../assets/market-hours');
// Dibuja la gráfica del dólar y la deja publicada. Vive aparte porque no tiene
// nada que ver con armar texto: es rasterizar píxeles.
const graficaDolar = require('./grafica');

// Respaldo del consejo motivacional que abre el correo. La sección nunca puede
// salir vacía: un hueco arriba de todo rompe el correo visualmente y es peor
// que una frase fija. Genérica a propósito — sirve cualquier día, sin depender
// de la fecha ni del mercado. /api/news la importa de aquí para que no existan
// dos copias que se puedan desincronizar.
const IMPULSO_RESPALDO = {
  en: 'Starting early beats starting perfect. What you put away this month has more time to grow than anything you save later, and the habit is worth more than the amount.',
  es: 'Empezar temprano vale más que empezar perfecto. Lo que guardes este mes tiene más tiempo para crecer que cualquier cantidad que ahorres después, y el hábito pesa más que el monto.'
};

// Respaldo del gancho, que es además el asunto del correo. Genérico pero cierto
// de cualquier edición: siempre lleva el dólar y siempre lleva una lección. Un
// asunto vacío o con la fecha dentro es un correo que nadie abre, así que aquí
// no puede quedar hueco. /api/news lo importa de aquí por lo mismo que el
// consejo: una sola copia que no se pueda desincronizar.
const GANCHO_RESPALDO = {
  en: 'How the dollar opened, and a lesson in two minutes',
  es: 'Así amaneció el dólar, y una lección en dos minutos'
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
 * EL PRESUPUESTO DE /api/news, Y POR QUÉ NO ES EL DE POR DEFECTO.
 *
 * ESTE ERA EL FALLO QUE DEJÓ AL BOLETÍN SIN ENVIARSE.
 *
 * /api/news tarda unos milisegundos cuando su caché está caliente y unos OCHO
 * SEGUNDOS cuando está frío, porque en frío tiene que bajar el RSS de Bloomberg
 * y esperar a que Anthropic escriba las opiniones, el consejo y el gancho. El
 * presupuesto de aquí eran 8 s exactos: medido en local, la corrida en frío da
 * 8.1 s. Se pasaba por menos de dos décimas.
 *
 * Lo que hacía eso: el cron corre a las 8:00 de la mañana. Si alguien había
 * entrado al sitio antes, el caché estaba caliente y el boletín salía sin
 * enterarse. Si el cron era la primera visita del día —que es lo normal a esa
 * hora— la petición se abortaba, el boletín se quedaba sin titulares y abortaba
 * con "sin_contenido". Un correo que sale unos días sí y otros no, sin tocar
 * una línea de código, y sin rastro porque los logs de Vercel duran 30 minutos.
 *
 * De dónde salió: el commit d97a250 subió el plazo de la llamada a Anthropic de
 * 8 a 20 segundos para que el consejo del inicio dejara de perderse. Arregló
 * /api/news y dejó a su consumidor con el presupuesto viejo.
 *
 * 30 s cubre el peor caso de /api/news (20 s de Anthropic más el feed) con
 * holgura, y cabe de sobra: los datos de mercado se piden EN PARALELO, no
 * después, y send-newsletter tiene 60 s de función con un tope propio de 50 s
 * para el envío.
 */
const MS_NOTICIAS = 30000;

// ---- Datos de mercado ------------------------------------------------------
// De la serie intradía se toma el primer y el último punto: ese es el cambio de
// la sesión, el mismo criterio que usa la gráfica del sitio.
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

async function datosDeMercado(base) {
  // En paralelo y tolerante a fallos: si Yahoo no responde para uno de los dos,
  // el boletín sale igual sin ese dato en vez de no salir.
  const [fx, vix] = await Promise.all([
    pedirJSON(base + '/api/history?pair=USDMXN&range=1D').catch((e) => {
      console.error('boletín: falló USD/MXN:', e.message);
      return null;
    }),
    pedirJSON(base + '/api/history?pair=VIX&range=1D').catch((e) => {
      console.error('boletín: falló VIX:', e.message);
      return null;
    })
  ]);

  return {
    mercado: { usdmxn: resumirSerie(fx), vix: resumirSerie(vix) },
    // La serie completa del dólar, que es la que dibuja la gráfica del correo.
    // Va aparte del resumen y no dentro de él porque `mercado` se devuelve
    // entero en la respuesta del ensayo: meter aquí 288 puntos convertiría esa
    // respuesta en un muro de números cada vez que se quiere revisar el correo
    // del día.
    serieFx: fx && Array.isArray(fx.points) ? fx.points : null
  };
}

// ---- Contenido completo ----------------------------------------------------

// Un par {en, es} sirve solo si las dos versiones traen texto. Si falta una, se
// usa el respaldo entero en vez de mezclar: media pareja deja a la mitad de la
// lista sin esa sección, y eso no se nota hasta que alguien se queja.
function parBilingue(crudo, respaldo) {
  return crudo && typeof crudo.es === 'string' && crudo.es.trim() &&
    typeof crudo.en === 'string' && crudo.en.trim()
    ? { en: crudo.en.trim(), es: crudo.es.trim() }
    : respaldo;
}

async function construirContenido(fecha = new Date()) {
  const base = urlBase();

  // Una sola petición trae el titular, su opinión, el consejo del inicio y el
  // gancho: los cuatro salen de la misma llamada a Anthropic que /api/news ya
  // cachea, así que el boletín no dispara ni una generación extra.
  const [deNoticias, deMercado] = await Promise.all([
    pedirJSON(base + '/api/news', MS_NOTICIAS)
      .then((d) => {
        const items = d && Array.isArray(d.items) ? d.items : [];
        // El índice viene elegido por el modelo con el criterio que está
        // escrito en el prompt de /api/news; aquí solo se comprueba que apunte
        // a algo. Fuera de rango cae al primero, que es el más reciente.
        const i = Number.isInteger(d && d.principal) && d.principal >= 0 && d.principal < items.length
          ? d.principal
          : 0;
        return { noticia: items[i] || null, impulso: d && d.impulso, gancho: d && d.gancho };
      })
      .catch((e) => {
        console.error('boletín: falló /api/news:', e.message);
        return { noticia: null, impulso: null, gancho: null };
      }),
    datosDeMercado(base)
  ]);

  /*
   * La gráfica se dibuja AQUÍ, no al renderizar y no al abrir el correo.
   *
   * Aquí es donde acaban de llegar los puntos, y son los mismos con los que se
   * calculó el resumen numérico de arriba. Dibujar en este punto es lo que
   * garantiza que la curva y las cifras impresas al lado cuenten la misma
   * sesión — que es todo el motivo por el que no se genera bajo demanda.
   *
   * Se dibuja UNA vez por envío aunque el boletín salga en dos idiomas: la
   * imagen no lleva texto, así que la misma sirve para los dos. Y como la URL
   * es idéntica para toda la lista, el proxy de Gmail la descarga una sola vez
   * para todos los destinatarios.
   */
  const grafica = deMercado.serieFx
    ? await graficaDolar.publicar(deMercado.serieFx, fecha, urlSitio())
    : null;

  return {
    fecha,
    noticia: deNoticias.noticia,
    mercado: deMercado.mercado,
    grafica,
    impulso: parBilingue(deNoticias.impulso, IMPULSO_RESPALDO),
    gancho: parBilingue(deNoticias.gancho, GANCHO_RESPALDO),
    tip: tipDelDia(fecha)
  };
}

// ---- Plantilla del correo --------------------------------------------------
// Reglas de correo, distintas a las de la web: fondo claro (el modo oscuro se
// rompe en muchos clientes), tipografía del sistema con serif de respaldo para
// los títulos (Fraunces no carga en correo), maquetado con <table> y estilos en
// línea (Gmail borra el <style> del <head> en varios casos), y 600px de ancho
// máximo, que es lo que muestran sin recortar los clientes de escritorio.

const VERDE = '#0F8A5F';
const ROJO = '#A32D2D';
const TINTA = '#14161A';
const GRIS = '#5B6470';
const LINEA = '#E4E7EC';
const FONDO = '#F4F6F8';
// Tinte del bloque motivacional que abre el correo. Es la única sección con
// fondo propio: así se lee como el arranque y no como una noticia más. Verde
// muy lavado para que el texto oscuro encima siga teniendo contraste de sobra.
const VERDE_TENUE = '#F1F8F4';
const VERDE_BORDE = '#D7EAE0';

const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FUENTE_TITULO = "Georgia,'Times New Roman',serif";

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

const TEXTOS = {
  en: {
    impulsoTitulo: 'To start your day',
    noticiaTitulo: "Today's story",
    miLectura: 'My take',
    leerMas: 'Read the full story →',
    mercadoTitulo: 'How the dollar opened',
    // El título de repuesto para cuando el mercado de divisas está cerrado.
    // "How the dollar opened" un domingo es falso de entrada: no abrió. No se
    // pide perdón por ello —el mercado cierra el fin de semana, es lo normal—,
    // simplemente se dice qué se está mirando.
    mercadoTituloCerrado: 'The dollar at its last close',
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Fear index (VIX)',
    tipTitulo: "Today you'll learn",
    tipCta: 'Read the lesson →',
    // Texto alternativo de la gráfica. Lleva los números DENTRO a propósito:
    // Outlook bloquea las imágenes por defecto y lo que se lee entonces es
    // esto, así que tiene que decir lo mismo que dice la curva.
    graficaAlt: 'Chart of the dollar against the peso {periodo}: from {inicio} to {fin} ({cambio}).',
    graficaPeriodoAbierto: 'over the last 24 hours',
    graficaPeriodoCerrado: 'in its last session',
    despedida: 'Until tomorrow,',
    seguir: 'Follow along',
    baja: 'Unsubscribe',
    bajaFrase: 'You are getting this because you confirmed your subscription to the Smart Finance daily.',
    aviso: 'Educational content only — not financial, investment, or tax advice.',
    sinDatos: 'Not available right now.'
  },
  es: {
    impulsoTitulo: 'Para arrancar el día',
    noticiaTitulo: 'La noticia de hoy',
    miLectura: 'Mi lectura',
    leerMas: 'Leer la nota completa →',
    mercadoTitulo: 'Así amaneció el dólar',
    mercadoTituloCerrado: 'El dólar, en su último cierre',
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Índice del miedo (VIX)',
    tipTitulo: 'Hoy aprenderás',
    tipCta: 'Leer la lección →',
    graficaAlt: 'Gráfica del dólar frente al peso {periodo}: de {inicio} a {fin} ({cambio}).',
    graficaPeriodoAbierto: 'en las últimas 24 horas',
    graficaPeriodoCerrado: 'en su última sesión',
    despedida: 'Hasta mañana,',
    seguir: 'Sígueme',
    baja: 'Darse de baja',
    bajaFrase: 'Recibes este correo porque confirmaste tu suscripción al boletín diario de Smart Finance.',
    aviso: 'Contenido educativo únicamente — no es asesoría financiera, de inversión ni fiscal.',
    sinDatos: 'No disponible por ahora.'
  }
};

const URL_LINKEDIN = 'https://www.linkedin.com/in/jaime-sandoval-ricano-23b3a4401';
const URL_TIKTOK = 'https://www.tiktok.com/@smart.financee';

// El correo entero se fecha en hora de Ciudad de México: es donde vive quien lo
// escribe y la mayoría de quien lo lee, y el cron sale a las 8:00 de allá.
const HUSO = 'America/Mexico_City';

function fechaLarga(fecha, idioma) {
  const texto = fecha.toLocaleDateString(idioma === 'es' ? 'es-MX' : 'en-US', {
    timeZone: HUSO, weekday: 'long', day: 'numeric', month: 'long'
  });
  // Solo la primera letra: en español los días y meses van en minúscula, y un
  // text-transform:capitalize dejaba "Jueves, 30 De Julio".
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Quien firma el correo. Una sola constante para el HTML y para la versión de
// texto: son el mismo nombre y no pueden decir cosas distintas.
const FIRMA = 'Jaime Sandoval';

/*
 * EL ENCABEZADO DE CADA BLOQUE, con su ícono.
 *
 * Va en tabla de dos celdas y no como un <img> dentro del texto. Un ícono
 * alineado con vertical-align se cae medio píxel para arriba en Gmail, otro
 * medio para abajo en Outlook y se ve torcido justo en las cuatro líneas que
 * más se miran; en celdas separadas con valign="middle" queda alineado en
 * todos, que es la razón por la que el correo entero está maquetado en tablas.
 *
 * EL alt VA VACÍO Y ES CORRECTO. Los cuatro íconos no dicen nada que no diga
 * el título que tienen al lado: son una ayuda para distinguir las secciones de
 * un vistazo. Ponerles texto alternativo descriptivo haría que un lector de
 * pantalla leyera "ícono de amanecer, Para arrancar el día" — la misma
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
    <td valign="middle" style="${celda}font-family:${FUENTE};font-size:${tamano}px;font-weight:700;letter-spacing:${espaciado};text-transform:uppercase;color:${VERDE};">${escapar(texto)}</td>
  </tr></table>`;
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
 * Si no hay gráfica (falló el dibujo, o Redis no contestó) no se pinta nada.
 * Nunca un <img> roto: los números ya están arriba, así que no se pierde dato.
 */
function bloqueGrafica(g, alt) {
  if (!g || !g.url) return '';
  return `<div style="padding-top:12px;">
    <img src="${escapar(g.url)}" width="${g.ancho}" height="${g.alto}" alt="${escapar(alt)}"
      style="display:block;width:100%;max-width:${g.ancho}px;height:auto;border:1px solid ${LINEA};border-radius:10px;">
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
  const celda = (etiqueta, resumen, decimales, invertirColor, pie) => {
    if (!resumen) {
      return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};font-size:13px;color:${GRIS};">
        <div style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiqueta)}</div>
        <div style="font-size:15px;color:${GRIS};padding-top:4px;">${escapar(t.sinDatos)}</div></td>`;
    }
    const sube = resumen.cambio >= 0;
    const color = (invertirColor ? !sube : sube) ? VERDE : ROJO;
    const signo = sube ? '+' : '';
    // El pie va en el gris de siempre y sin adorno: es una precisión sobre de
    // cuándo es el número, no una advertencia de que algo salió mal.
    const linea = pie
      ? `<div style="font-size:11px;color:${GRIS};padding-top:6px;">${escapar(pie)}</div>`
      : '';
    return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};">
      <div style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiqueta)}</div>
      <div style="font-size:22px;font-weight:700;color:${TINTA};padding-top:2px;">${fmt(resumen.valor, decimales)}</div>
      <div style="font-size:13px;font-weight:600;color:${color};padding-top:2px;">${signo}${fmt(resumen.cambio, decimales)} (${signo}${resumen.cambioPct.toFixed(2)}%)</div>
      ${linea}
    </td>`;
  };

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINEA};border-radius:10px;background:#FFFFFF;">
    <tr>${celda(t.fxEtiqueta, mercado.usdmxn, 4, false, pies.fx)}${celda(t.vixEtiqueta, mercado.vix, 2, true, pies.vix)}</tr>
  </table>`;
}

// UNA noticia, no cuatro. La elige el modelo en /api/news con el criterio que
// está escrito en su prompt: lo que más le mueve el dinero a una persona normal
// en México, y a igualdad de eso lo que alcanza a más gente. El titular es más
// grande que antes porque ahora carga con toda la sección él solo.
function bloqueNoticia(n, idioma, t) {
  if (!n) {
    return `<p style="font-family:${FUENTE};font-size:14px;color:${GRIS};margin:0;">${escapar(t.sinDatos)}</p>`;
  }

  const take = (n.take && (idioma === 'es' ? n.take.es : n.take.en)) || '';
  const pendiente = !take || (n.take && n.take.pending);
  const link = urlSegura(n.link);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:0 0 10px;font-family:${FUENTE_TITULO};font-size:20px;line-height:1.3;font-weight:700;color:${TINTA};">
      ${link ? `<a href="${link}" style="color:${TINTA};text-decoration:none;">${escapar(n.title)}</a>` : escapar(n.title)}
    </td></tr>
    ${pendiente ? '' : `<tr><td style="padding:0 0 6px 12px;border-left:3px solid ${VERDE};font-family:${FUENTE};font-size:15px;line-height:1.6;color:#39404A;">
      <span style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:3px;">${escapar(t.miLectura)}</span>
      ${escapar(take)}
    </td></tr>`}
    ${link ? `<tr><td style="padding:10px 0 0;font-family:${FUENTE};font-size:13px;">
      <a href="${link}" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.leerMas)}</a>
    </td></tr>` : ''}
  </table>`;
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
function recortarGancho(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
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

// Los dos botones de redes. En tabla y con el color de fondo en el <td>, que es
// la única forma que pintan igual Gmail, Outlook y Apple Mail: un <a> con
// padding y background se le queda gris a Outlook, que ignora el padding.
function bloqueBotones(t) {
  const boton = (texto, url, fondo, colorTexto, borde) => `<td style="padding:0 8px 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="background:${fondo};border:1px solid ${borde};border-radius:8px;">
        <a href="${escapar(url)}" style="display:inline-block;padding:11px 22px;font-family:${FUENTE};font-size:14px;font-weight:600;color:${colorTexto};text-decoration:none;">${escapar(texto)}</a>
      </td>
    </tr></table>
  </td>`;

  return `<div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:10px;">${escapar(t.seguir)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    ${boton('LinkedIn', URL_LINKEDIN, VERDE, '#FFFFFF', VERDE)}
    ${boton('TikTok', URL_TIKTOK, '#FFFFFF', TINTA, LINEA)}
  </tr></table>`;
}

/*
 * EL ORDEN DEL CORREO, de arriba a abajo:
 *
 *   1. La marca    — el nombre, tratado como en el sitio. Solo tipografía.
 *   2. Gancho      — titular corto y distinto cada día. Es también el asunto.
 *   3. Impulso     — la frase motivacional.
 *   4. La noticia  — UNA, la más relevante, con mi lectura.
 *   5. El dólar    — USD/MXN y el VIX al lado, y la gráfica de la sesión.
 *   6. La lección  — teaser de la lección del día, con su link.
 *   7. Botones     — LinkedIn y TikTok.
 *   8. La firma    — quién escribe esto.
 *   9. La baja     — obligatoria por ley, en todos los envíos.
 *
 * Nada más. Las otras tres noticias salieron: un correo diario se lee en la
 * fila del transporte, y cuatro titulares con opinión cada uno era ya un
 * artículo. Con uno solo, ese uno se lee.
 */
function renderizarCorreo({ contenido, idioma, urlBaja }) {
  const es = idioma === 'es';
  const t = TEXTOS[es ? 'es' : 'en'];
  const sitio = urlSitio();
  const tip = contenido.tip[es ? 'es' : 'en'];
  const urlTip = sitio + contenido.tip.url;
  const teaser = teaserLeccion(tip.resumen);
  // construirContenido ya garantiza que esto viene lleno; los respaldos de aquí
  // cubren a quien llame a renderizarCorreo por su cuenta (por ejemplo el ensayo).
  const impulso = (contenido.impulso && contenido.impulso[es ? 'es' : 'en']) ||
    IMPULSO_RESPALDO[es ? 'es' : 'en'];
  // Un solo valor recortado para los tres sitios donde aparece: el asunto, el
  // titular de arriba y la versión de texto. Si el asunto y el titular no
  // coincidieran, abrir el correo se sentiría como abrir otro distinto.
  const gancho = recortarGancho(
    (contenido.gancho && contenido.gancho[es ? 'es' : 'en']) || GANCHO_RESPALDO[es ? 'es' : 'en']
  );
  const noticia = contenido.noticia || null;

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
  const cierreDe = (resumen) =>
    horario.estado(resumen && resumen.ultimoTs, { ahora, timeZone: HUSO });
  const pieDe = (est) =>
    est.cerrado ? horario.pieCierre(est, { es, timeZone: HUSO }) : '';

  const cierreFx = cierreDe(contenido.mercado.usdmxn);
  const cierreVix = cierreDe(contenido.mercado.vix);
  const pies = { fx: pieDe(cierreFx), vix: pieDe(cierreVix) };
  // La misma fecha suelta, sin la etiqueta, para la versión de texto: ahí la
  // línea la encabeza el símbolo y la etiqueta va en minúscula dentro de la
  // frase. Se saca aparte en vez de pasar el pie por toLowerCase() porque eso
  // se comía también la fecha y dejaba "last close · friday, august 7".
  const cuandoCerro = (est) =>
    est.cerrado ? horario.cuando(est, { es, timeZone: HUSO }) : '';
  // El título habla del dólar, así que lo manda el dólar. El VIX se explica en
  // su propia celda.
  const tituloMercado = cierreFx.cerrado ? t.mercadoTituloCerrado : t.mercadoTitulo;
  // El alt de la gráfica dice el mismo periodo que el título de la sección:
  // "las últimas 24 horas" un domingo sería falso por la misma razón.
  const altGrafica = altDeGrafica(contenido.mercado.usdmxn, t, cierreFx.cerrado);

  const html = `<!doctype html>
<html lang="${idioma === 'es' ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Finance</title>
</head>
<body style="margin:0;padding:0;background:${FONDO};">
<!-- Preencabezado: lo que se lee en la bandeja junto al asunto. Ya no repite el
     gancho —eso deja "titular · titular" en la bandeja—: anuncia la lección,
     que es lo otro que trae el correo. Oculto en el cuerpo con tamaño cero
     para que no se vea dos veces al abrir. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(t.tipTitulo)}: ${escapar(tip.titulo)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid ${LINEA};">

  <!-- 1. LA MARCA. El nombre tratado como en el sitio: serif, "Finance" en
          verde. Es TEXTO, no una imagen — así se ve igual con las imágenes
          bloqueadas, no suma un solo byte de descarga y no le da a ningún
          filtro de spam una imagen más que contar. La serif de sistema hace
          aquí el papel de Fraunces, que no carga en correo. -->
  <tr><td align="center" style="padding:22px 24px 18px;border-bottom:1px solid ${LINEA};">
    <div style="font-family:${FUENTE_TITULO};font-size:23px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:${TINTA};">
      Smart <span style="color:${VERDE};">Finance</span>
    </div>
  </td></tr>

  <!-- 2. EL GANCHO. La fecha se queda pequeña encima: quien abre el correo ya
          sabe de quién es —lo acaba de leer arriba—, así que lo grande tiene
          que ser de qué va el de hoy. -->
  <tr><td style="padding:20px 24px 20px;border-bottom:1px solid ${LINEA};">
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${GRIS};">
      ${escapar(fechaLarga(contenido.fecha, idioma))}
    </div>
    <div style="font-family:${FUENTE_TITULO};font-size:25px;line-height:1.28;font-weight:700;color:${TINTA};padding-top:10px;">
      ${escapar(gancho)}
    </div>
  </td></tr>

  <!-- 3. Arranque motivacional. Es el único bloque del correo con fondo propio:
          el tinte, la comilla y la cursiva lo separan del resto sin usar
          imágenes, que la mayoría de los clientes bloquea hasta que el lector
          las permite. Maquetado en tabla de dos celdas porque flexbox no
          existe en correo. -->
  <tr><td style="padding:20px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${VERDE_TENUE};border:1px solid ${VERDE_BORDE};border-radius:12px;">
      <tr>
        <td width="34" valign="top" style="padding:14px 0 16px 16px;font-family:${FUENTE_TITULO};font-size:38px;line-height:32px;color:${VERDE};">&ldquo;</td>
        <td valign="top" style="padding:16px 18px 16px 4px;">
          ${etiqueta(t.impulsoTitulo, 'consejo', sitio, { tamano: 10, espaciado: '.12em', abajo: 6 })}
          <div style="font-family:${FUENTE_TITULO};font-style:italic;font-size:16px;line-height:1.5;color:${TINTA};">${escapar(impulso)}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 4. La noticia del día. Una. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.noticiaTitulo, 'noticia', sitio, { abajo: 12 })}
    ${bloqueNoticia(noticia, idioma, t)}
  </td></tr>

  <!-- 5. Así amaneció el dólar: USD/MXN y el VIX al lado, en la misma fila, y
          debajo la gráfica de la sesión. Con el mercado cerrado el título
          cambia y cada celda dice de qué sesión es su número. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(tituloMercado, 'dolar', sitio, {})}
    ${bloqueMercado(contenido.mercado, t, pies)}
    ${bloqueGrafica(contenido.grafica, altGrafica)}
  </td></tr>

  <!-- 6. Hoy aprenderás: el título de la lección del día y un teaser corto. -->
  <tr><td style="padding:26px 24px 6px;">
    ${etiqueta(t.tipTitulo, 'leccion', sitio, { abajo: 8 })}
    <div style="font-family:${FUENTE_TITULO};font-size:19px;line-height:1.3;font-weight:700;color:${TINTA};padding-bottom:6px;">${escapar(tip.titulo)}</div>
    <div style="font-family:${FUENTE};font-size:14px;line-height:1.6;color:#39404A;">${escapar(teaser)}</div>
    <div style="padding-top:10px;font-family:${FUENTE};font-size:13px;">
      <a href="${escapar(urlTip)}" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.tipCta)}</a>
    </div>
  </td></tr>

  <!-- 7. Los botones de redes. -->
  <tr><td style="padding:26px 24px 22px;">
    ${bloqueBotones(t)}
  </td></tr>

  <!-- 8. La firma. Texto, no imagen: es un nombre, y una imagen para un nombre
          se ve rota justo en los clientes que bloquean imágenes. Discreta a
          propósito — cierra el correo, no lo encabeza. -->
  <tr><td style="padding:0 24px 24px;">
    <div style="border-top:1px solid ${LINEA};padding-top:16px;font-family:${FUENTE};font-size:12px;line-height:1.5;color:${GRIS};">
      ${escapar(t.despedida)}
      <div style="font-family:${FUENTE_TITULO};font-style:italic;font-size:17px;color:${TINTA};padding-top:2px;">${escapar(FIRMA)}</div>
    </div>
  </td></tr>

  <!-- 9. La baja. Va en TODOS los envíos: es obligatoria por ley, no una
          cortesía, y por eso no depende de ninguna condición de arriba. -->
  <tr><td style="padding:16px 24px 24px;border-top:1px solid ${LINEA};">
    <div style="font-family:${FUENTE};font-size:11px;line-height:1.6;color:${GRIS};">
      ${escapar(t.bajaFrase)}<br>
      <a href="${escapar(urlBaja)}" style="color:${GRIS};text-decoration:underline;">${escapar(t.baja)}</a>
    </div>
    <div style="font-family:${FUENTE};font-size:11px;line-height:1.6;color:#8A929C;padding-top:10px;">
      ${escapar(t.aviso)}
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // Versión en texto plano: algunos clientes la prefieren y su ausencia cuenta
  // como señal de spam en varios filtros.
  // Mismo orden que el HTML, para que quien lea la versión de texto lea el
  // mismo correo y no otro.
  const lineas = [
    'SMART FINANCE — ' + fechaLarga(contenido.fecha, idioma),
    '',
    gancho,
    '',
    t.impulsoTitulo.toUpperCase(), impulso, '',
    t.noticiaTitulo.toUpperCase()
  ];

  if (noticia) {
    const take = (noticia.take && (es ? noticia.take.es : noticia.take.en)) || '';
    lineas.push(noticia.title);
    if (take && !(noticia.take && noticia.take.pending)) lineas.push(t.miLectura + ': ' + take);
    if (noticia.link) lineas.push(noticia.link);
  } else {
    lineas.push(t.sinDatos);
  }

  // Misma información que en el HTML, incluido el aviso de cierre: quien lee la
  // versión de texto tiene que leer el mismo correo, no uno con menos matices.
  const etiquetaCierre = es ? 'último cierre' : 'last close';
  const conPie = (linea, est) => {
    const q = cuandoCerro(est);
    return q ? linea + ' — ' + etiquetaCierre + ': ' + q : linea;
  };

  lineas.push(
    '', tituloMercado.toUpperCase(),
    contenido.mercado.usdmxn
      ? conPie(`USD/MXN ${fmt(contenido.mercado.usdmxn.valor, 4)} (${contenido.mercado.usdmxn.cambioPct >= 0 ? '+' : ''}${contenido.mercado.usdmxn.cambioPct.toFixed(2)}%)`, cierreFx)
      : 'USD/MXN ' + t.sinDatos,
    contenido.mercado.vix
      ? conPie(`VIX ${fmt(contenido.mercado.vix.valor, 2)} (${contenido.mercado.vix.cambioPct >= 0 ? '+' : ''}${contenido.mercado.vix.cambioPct.toFixed(2)}%)`, cierreVix)
      : 'VIX ' + t.sinDatos,
    '', t.tipTitulo.toUpperCase(), tip.titulo, teaser, urlTip,
    '', t.seguir.toUpperCase(),
    'LinkedIn: ' + URL_LINKEDIN,
    'TikTok: ' + URL_TIKTOK,
    // La misma firma que cierra el HTML. La gráfica en cambio no deja rastro
    // aquí, y es lo correcto: sus datos ya están escritos arriba, así que
    // anunciar una imagen que esta versión no puede enseñar solo sobraría.
    '', t.despedida, FIRMA,
    '', t.bajaFrase, t.baja + ': ' + urlBaja,
    '', t.aviso
  );

  // El asunto ES el gancho: ese es todo el punto de generarlo. Antes iba
  // "Smart Finance · <título de la lección>", que era el mismo molde todos los
  // días y decía lo mismo del correo del lunes que del correo del viernes. El
  // remitente ya se llama Smart Finance, así que repetirlo aquí solo gastaba
  // los caracteres que la bandeja muestra antes de cortar.
  const asunto = gancho;

  return { html, texto: lineas.join('\n'), asunto };
}

module.exports = {
  construirContenido, renderizarCorreo, urlBase, urlSitio, escapar, urlSegura,
  teaserLeccion, recortarGancho, IMPULSO_RESPALDO, GANCHO_RESPALDO
};
