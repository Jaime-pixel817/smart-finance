// Arma el contenido del boletín diario y lo pinta en la plantilla de correo.
//
// REUTILIZA, NO DUPLICA: las noticias y los precios se piden a /api/news y
// /api/history del propio sitio en vez de repetir aquí su lógica. Eso importa
// sobre todo con las noticias: /api/news ya cachea el resultado del día junto
// con las opiniones, así que pedírselo por HTTP aprovecha ese caché y NO
// dispara una segunda llamada a Anthropic. Si en cambio importáramos su código,
// cada envío generaría las opiniones otra vez, con otro costo y otro texto.

const { tipDelDia } = require('./tips');

// Respaldo del consejo motivacional que abre el correo. La sección nunca puede
// salir vacía: un hueco arriba de todo rompe el correo visualmente y es peor
// que una frase fija. Genérica a propósito — sirve cualquier día, sin depender
// de la fecha ni del mercado. /api/news la importa de aquí para que no existan
// dos copias que se puedan desincronizar.
const IMPULSO_RESPALDO = {
  en: 'Starting early beats starting perfect. What you put away this month has more time to grow than anything you save later, and the habit is worth more than the amount.',
  es: 'Empezar temprano vale más que empezar perfecto. Lo que guardes este mes tiene más tiempo para crecer que cualquier cantidad que ahorres después, y el hábito pesa más que el monto.'
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
    cambioPct: ((ultimo - primero) / primero) * 100
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

  return { usdmxn: resumirSerie(fx), vix: resumirSerie(vix) };
}

// ---- Contenido completo ----------------------------------------------------

async function construirContenido(fecha = new Date()) {
  const base = urlBase();

  // Una sola petición trae titulares, opiniones y el consejo del inicio: los
  // tres salen de la misma llamada a Anthropic que /api/news ya cachea.
  const [noticiasYConsejo, mercado] = await Promise.all([
    pedirJSON(base + '/api/news')
      .then((d) => ({
        noticias: d && Array.isArray(d.items) ? d.items.slice(0, 4) : [],
        impulso: d && d.impulso
      }))
      .catch((e) => {
        console.error('boletín: falló /api/news:', e.message);
        return { noticias: [], impulso: null };
      }),
    datosDeMercado(base)
  ]);

  const crudo = noticiasYConsejo.impulso;
  const impulso = crudo && typeof crudo.es === 'string' && crudo.es.trim() &&
    typeof crudo.en === 'string' && crudo.en.trim()
    ? { en: crudo.en.trim(), es: crudo.es.trim() }
    : IMPULSO_RESPALDO;

  return { fecha, noticias: noticiasYConsejo.noticias, mercado, impulso, tip: tipDelDia(fecha) };
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
    saludo: 'Today in markets',
    impulsoTitulo: 'To start your day',
    tipTitulo: 'Tip of the day',
    tipCta: 'Read the full lesson →',
    mercadoTitulo: 'Quick numbers',
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Fear index (VIX)',
    noticiasTitulo: 'In the headlines',
    miLectura: 'My take',
    leerMas: 'Read more →',
    baja: 'Unsubscribe',
    bajaFrase: 'You are getting this because you confirmed your subscription to the Smart Finance daily.',
    aviso: 'Educational content only — not financial, investment, or tax advice.',
    verEnLinea: 'Smart Finance',
    sinDatos: 'Not available right now.'
  },
  es: {
    saludo: 'Hoy en los mercados',
    impulsoTitulo: 'Para arrancar el día',
    tipTitulo: 'Tip del día',
    tipCta: 'Leer la lección completa →',
    mercadoTitulo: 'Datos rápidos',
    fxEtiqueta: 'USD/MXN',
    vixEtiqueta: 'Índice del miedo (VIX)',
    noticiasTitulo: 'En los titulares',
    miLectura: 'Mi lectura',
    leerMas: 'Leer más →',
    baja: 'Darse de baja',
    bajaFrase: 'Recibes este correo porque confirmaste tu suscripción al boletín diario de Smart Finance.',
    aviso: 'Contenido educativo únicamente — no es asesoría financiera, de inversión ni fiscal.',
    verEnLinea: 'Smart Finance',
    sinDatos: 'No disponible por ahora.'
  }
};

function fechaLarga(fecha, idioma) {
  const texto = fecha.toLocaleDateString(idioma === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long'
  });
  // Solo la primera letra: en español los días y meses van en minúscula, y un
  // text-transform:capitalize dejaba "Jueves, 30 De Julio".
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function bloqueMercado(mercado, t) {
  // invertirColor sirve para el VIX: que suba significa MÁS miedo, así que se
  // pinta en rojo aunque el número vaya hacia arriba. Es el mismo criterio que
  // usa el panel del VIX en el sitio.
  const celda = (etiqueta, resumen, decimales, invertirColor) => {
    if (!resumen) {
      return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};font-size:13px;color:${GRIS};">
        <div style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiqueta)}</div>
        <div style="font-size:15px;color:${GRIS};padding-top:4px;">${escapar(t.sinDatos)}</div></td>`;
    }
    const sube = resumen.cambio >= 0;
    const color = (invertirColor ? !sube : sube) ? VERDE : ROJO;
    const signo = sube ? '+' : '';
    return `<td width="50%" style="padding:10px 12px;font-family:${FUENTE};">
      <div style="text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:${GRIS};">${escapar(etiqueta)}</div>
      <div style="font-size:22px;font-weight:700;color:${TINTA};padding-top:2px;">${fmt(resumen.valor, decimales)}</div>
      <div style="font-size:13px;font-weight:600;color:${color};padding-top:2px;">${signo}${fmt(resumen.cambio, decimales)} (${signo}${resumen.cambioPct.toFixed(2)}%)</div>
    </td>`;
  };

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINEA};border-radius:10px;background:#FFFFFF;">
    <tr>${celda(t.fxEtiqueta, mercado.usdmxn, 4, false)}${celda(t.vixEtiqueta, mercado.vix, 2, true)}</tr>
  </table>`;
}

function bloqueNoticias(noticias, idioma, t) {
  if (!noticias.length) {
    return `<p style="font-family:${FUENTE};font-size:14px;color:${GRIS};margin:0;">${escapar(t.sinDatos)}</p>`;
  }

  return noticias.map((n) => {
    const take = (n.take && (idioma === 'es' ? n.take.es : n.take.en)) || '';
    const pendiente = !take || (n.take && n.take.pending);
    const link = urlSegura(n.link);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr><td style="padding:0 0 6px;font-family:${FUENTE_TITULO};font-size:17px;line-height:1.35;font-weight:700;color:${TINTA};">
        ${link ? `<a href="${link}" style="color:${TINTA};text-decoration:none;">${escapar(n.title)}</a>` : escapar(n.title)}
      </td></tr>
      ${pendiente ? '' : `<tr><td style="padding:0 0 6px 12px;border-left:3px solid ${VERDE};font-family:${FUENTE};font-size:14px;line-height:1.55;color:#39404A;">
        <span style="display:block;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:3px;">${escapar(t.miLectura)}</span>
        ${escapar(take)}
      </td></tr>`}
      ${link ? `<tr><td style="padding:4px 0 0;font-family:${FUENTE};font-size:13px;">
        <a href="${link}" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.leerMas)}</a>
      </td></tr>` : ''}
    </table>`;
  }).join('');
}

function renderizarCorreo({ contenido, idioma, urlBaja }) {
  const t = TEXTOS[idioma === 'es' ? 'es' : 'en'];
  const sitio = urlSitio();
  const tip = contenido.tip[idioma === 'es' ? 'es' : 'en'];
  const urlTip = sitio + contenido.tip.url;
  // construirContenido ya garantiza que esto viene lleno; el respaldo de aquí
  // cubre a quien llame a renderizarCorreo por su cuenta (por ejemplo el ensayo).
  const impulso = (contenido.impulso && contenido.impulso[idioma === 'es' ? 'es' : 'en']) ||
    IMPULSO_RESPALDO[idioma === 'es' ? 'es' : 'en'];

  const html = `<!doctype html>
<html lang="${idioma === 'es' ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Finance</title>
</head>
<body style="margin:0;padding:0;background:${FONDO};">
<!-- Preencabezado: lo que se lee en la bandeja junto al asunto. Oculto en el
     cuerpo con tamaño cero para que no se vea dos veces al abrir. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(tip.titulo)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid ${LINEA};">

  <tr><td style="padding:22px 24px;border-bottom:1px solid ${LINEA};">
    <div style="font-family:${FUENTE_TITULO};font-size:20px;font-weight:700;color:${TINTA};">
      Smart <span style="color:${VERDE};">Finance</span>
    </div>
    <div style="font-family:${FUENTE};font-size:12px;color:${GRIS};padding-top:3px;">
      ${escapar(fechaLarga(contenido.fecha, idioma))}
    </div>
  </td></tr>

  <!-- Arranque motivacional. Es el único bloque del correo con fondo propio: el
       tinte, la comilla y la cursiva lo separan del resto sin usar imágenes,
       que la mayoría de los clientes bloquea hasta que el lector las permite.
       Maquetado en tabla de dos celdas porque flexbox no existe en correo. -->
  <tr><td style="padding:20px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${VERDE_TENUE};border:1px solid ${VERDE_BORDE};border-radius:12px;">
      <tr>
        <td width="34" valign="top" style="padding:14px 0 16px 16px;font-family:${FUENTE_TITULO};font-size:38px;line-height:32px;color:${VERDE};">&ldquo;</td>
        <td valign="top" style="padding:16px 18px 16px 4px;">
          <div style="font-family:${FUENTE};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${VERDE};padding-bottom:6px;">${escapar(t.impulsoTitulo)}</div>
          <div style="font-family:${FUENTE_TITULO};font-style:italic;font-size:16px;line-height:1.5;color:${TINTA};">${escapar(impulso)}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:22px 24px 6px;">
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:8px;">${escapar(t.tipTitulo)}</div>
    <div style="font-family:${FUENTE_TITULO};font-size:19px;line-height:1.3;font-weight:700;color:${TINTA};padding-bottom:6px;">${escapar(tip.titulo)}</div>
    <div style="font-family:${FUENTE};font-size:14px;line-height:1.6;color:#39404A;">${escapar(tip.resumen)}</div>
    <div style="padding-top:10px;font-family:${FUENTE};font-size:13px;">
      <a href="${escapar(urlTip)}" style="color:${VERDE};text-decoration:none;font-weight:600;">${escapar(t.tipCta)}</a>
    </div>
  </td></tr>

  <tr><td style="padding:20px 24px 6px;">
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:10px;">${escapar(t.mercadoTitulo)}</div>
    ${bloqueMercado(contenido.mercado, t)}
  </td></tr>

  <tr><td style="padding:22px 24px 6px;">
    <div style="font-family:${FUENTE};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${VERDE};padding-bottom:12px;">${escapar(t.noticiasTitulo)}</div>
    ${bloqueNoticias(contenido.noticias, idioma, t)}
  </td></tr>

  <tr><td style="padding:14px 24px 24px;border-top:1px solid ${LINEA};">
    <div style="font-family:${FUENTE};font-size:12px;line-height:1.6;color:${GRIS};">
      <a href="https://www.linkedin.com/in/jaime-sandoval-ricano-23b3a4401" style="color:${GRIS};text-decoration:underline;">LinkedIn</a>
      &nbsp;·&nbsp;
      <a href="https://www.tiktok.com/@smart.financee" style="color:${GRIS};text-decoration:underline;">TikTok</a>
      &nbsp;·&nbsp;
      <a href="${escapar(sitio)}" style="color:${GRIS};text-decoration:underline;">${escapar(t.verEnLinea)}</a>
    </div>
    <div style="font-family:${FUENTE};font-size:11px;line-height:1.6;color:${GRIS};padding-top:12px;">
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
  const lineas = [
    'SMART FINANCE — ' + fechaLarga(contenido.fecha, idioma),
    '',
    t.impulsoTitulo.toUpperCase(), impulso, '',
    t.tipTitulo.toUpperCase(), tip.titulo, tip.resumen, urlTip, '',
    t.mercadoTitulo.toUpperCase(),
    contenido.mercado.usdmxn
      ? `USD/MXN ${fmt(contenido.mercado.usdmxn.valor, 4)} (${contenido.mercado.usdmxn.cambioPct >= 0 ? '+' : ''}${contenido.mercado.usdmxn.cambioPct.toFixed(2)}%)`
      : 'USD/MXN ' + t.sinDatos,
    contenido.mercado.vix
      ? `VIX ${fmt(contenido.mercado.vix.valor, 2)} (${contenido.mercado.vix.cambioPct >= 0 ? '+' : ''}${contenido.mercado.vix.cambioPct.toFixed(2)}%)`
      : 'VIX ' + t.sinDatos,
    '', t.noticiasTitulo.toUpperCase(), ''
  ];
  for (const n of contenido.noticias) {
    const take = (n.take && (idioma === 'es' ? n.take.es : n.take.en)) || '';
    lineas.push('· ' + n.title);
    if (take && !(n.take && n.take.pending)) lineas.push('  ' + t.miLectura + ': ' + take);
    if (n.link) lineas.push('  ' + n.link);
    lineas.push('');
  }
  lineas.push(t.bajaFrase, t.baja + ': ' + urlBaja, '', t.aviso);

  const asunto = (idioma === 'es' ? 'Smart Finance · ' : 'Smart Finance · ') + tip.titulo;

  return { html, texto: lineas.join('\n'), asunto };
}

module.exports = { construirContenido, renderizarCorreo, urlBase, urlSitio, escapar, urlSegura, IMPULSO_RESPALDO };
