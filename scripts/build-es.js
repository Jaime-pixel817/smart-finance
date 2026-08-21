#!/usr/bin/env node
/*
 * Genera las páginas en español a partir de las inglesas.
 *
 * POR QUÉ EXISTE
 * --------------
 * El sitio se servía siempre en inglés y el español vivía solo en JavaScript:
 * el visitante apretaba ES y el navegador reescribía los textos. Para Google
 * eso significa que la versión en español NO EXISTE — rastrea el HTML que
 * llega del servidor, que está en inglés. Alguien buscando "qué es la
 * inflación" no podía encontrar este sitio nunca.
 *
 * Este script convierte esas traducciones —que ya estaban escritas— en páginas
 * de verdad, con su propia URL y su propio HTML en español.
 *
 * DE DÓNDE SALEN LAS TRADUCCIONES
 * -------------------------------
 * De las propias páginas. Cada una ya trae su diccionario:
 *   - el home, en `const translations = {...}` dentro de su <script>;
 *   - las demás, en `window.ARTICLE_I18N = {...}`.
 * No se traduce nada de cero aquí: se aplica lo que ya estaba.
 *
 * Los únicos textos que se escriben a mano en este archivo son <title> y
 * meta description de cada página, porque esos nunca estuvieron en los
 * diccionarios (no son texto visible que el toggle tuviera que cambiar).
 *
 * CÓMO SE USA
 * -----------
 *   node scripts/build-es.js
 *
 * Escribe /es/**. La salida se commitea: así lo que hay en el repo es
 * exactamente lo que se sirve, y se puede revisar en local. Hay que volver a
 * correrlo cuando se cambie texto de una página en inglés; `npm run check-es`
 * avisa si se olvidó.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SITIO = 'https://smartfinance.lat';

// ---------------------------------------------------------------- las páginas
// enUrl/esUrl son las rutas públicas (vercel.json trae cleanUrls, así que van
// sin .html). Son las que acaban en el canonical, en los hreflang y en el
// sitemap.
const PAGINAS = [
  {
    en: 'index.html', es: 'es/index.html',
    enUrl: '/', esUrl: '/es',
    imgAlt: 'Smart Finance — finanzas que sí se entienden, por Jaime Sandoval Ricaño',
    title: 'Smart Finance — Finanzas actualizadas, por Jaime Sandoval',
    desc: 'Educación financiera, mercados y dinero, explicados claro. Datos diarios y explicaciones de verdad. Sigue a Smart Finance en LinkedIn y TikTok.',
    ogTitle: 'Smart Finance — Finanzas actualizadas, por Jaime Sandoval',
    ogDesc: 'Educación financiera en palabras normales. Datos de mercado diarios, explicaciones claras, sin jerga.'
  },
  {
    en: 'market/index.html', es: 'es/mercado/index.html',
    enUrl: '/market', esUrl: '/es/mercado',
    imgAlt: 'Smart Finance — Mercado: acciones, divisas y cripto',
    title: 'Mercados hoy: acciones, divisas y cripto — Smart Finance',
    desc: 'Siete acciones y ETF de índices, seis pares de divisas, el VIX y cuatro criptomonedas grandes, cada uno con su gráfica de tendencia. Los precios se actualizan cada 15 minutos.',
    ogTitle: 'Mercados hoy: acciones, divisas y cripto — Smart Finance',
    ogDesc: 'Acciones, divisas y cripto en un solo lugar, cada cosa con su gráfica de tendencia. Se actualiza cada 15 minutos.'
  },
  {
    en: 'lessons/index.html', es: 'es/lecciones/index.html',
    enUrl: '/lessons', esUrl: '/es/lecciones',
    imgAlt: 'Smart Finance — Lecciones: finanzas desde cero, en palabras normales',
    title: 'Todas las lecciones — Smart Finance',
    desc: 'Seis lecciones cortas de finanzas en palabras normales: el peso, el interés compuesto, el S&P 500, el presupuesto 50/30/20, la inflación y los errores al empezar a invertir.',
    ogTitle: 'Todas las lecciones — Smart Finance',
    ogDesc: 'Seis lecciones cortas de finanzas en palabras normales, para quien apenas empieza.'
  },
  {
    en: 'lessons/peso-tipo-de-cambio.html', es: 'es/lecciones/peso-tipo-de-cambio.html',
    enUrl: '/lessons/peso-tipo-de-cambio', esUrl: '/es/lecciones/peso-tipo-de-cambio',
    title: '¿Qué significa que el peso se deprecie? — Smart Finance',
    desc: 'Guía para principiantes sobre cómo funciona el tipo de cambio peso-dólar: quién lo mueve, por qué brinca y qué significa para tu dinero.',
    ogTitle: '¿Qué significa que el peso se deprecie? — Smart Finance',
    ogDesc: 'Quién mueve el tipo de cambio, por qué brinca y qué significa para tu dinero.'
  },
  {
    en: 'lessons/interes-compuesto.html', es: 'es/lecciones/interes-compuesto.html',
    enUrl: '/lessons/interes-compuesto', esUrl: '/es/lecciones/interes-compuesto',
    title: 'Interés simple vs. compuesto — Smart Finance',
    desc: 'Qué es de verdad el interés compuesto, por qué el tiempo pesa más que el monto con el que empiezas, y cómo esa misma fuerza corre en tu contra en una tarjeta de crédito.',
    ogTitle: 'Interés simple vs. compuesto — Smart Finance',
    ogDesc: 'Por qué el tiempo pesa más que el monto con el que empiezas.'
  },
  {
    en: 'lessons/sp500.html', es: 'es/lecciones/sp500.html',
    enUrl: '/lessons/sp500', esUrl: '/es/lecciones/sp500',
    title: '¿Por qué sube o baja el S&P 500? — Smart Finance',
    desc: 'Qué mide en realidad el S&P 500, las cuatro fuerzas que lo mueven y por qué el número de cada día es casi puro ruido.',
    ogTitle: '¿Por qué sube o baja el S&P 500? — Smart Finance',
    ogDesc: 'Qué mide en realidad, qué lo mueve y por qué el día a día es ruido.'
  },
  {
    en: 'lessons/presupuesto-50-30-20.html', es: 'es/lecciones/presupuesto-50-30-20.html',
    enUrl: '/lessons/presupuesto-50-30-20', esUrl: '/es/lecciones/presupuesto-50-30-20',
    title: 'La regla 50/30/20 para tu primer presupuesto — Smart Finance',
    desc: 'Cómo armar tu primer presupuesto en México: de lo que de verdad te llega libre a un plan que sobrevive un mes normal.',
    ogTitle: 'La regla 50/30/20 para tu primer presupuesto — Smart Finance',
    ogDesc: 'De lo que de verdad te llega libre a un plan que sobrevive un mes normal.'
  },
  {
    en: 'lessons/inflacion.html', es: 'es/lecciones/inflacion.html',
    enUrl: '/lessons/inflacion', esUrl: '/es/lecciones/inflacion',
    title: '¿Qué es la inflación y cómo te afecta? — Smart Finance',
    desc: 'Por qué el mismo dinero compra menos con el tiempo, cómo un aumento puede ser en realidad un recorte, y qué hacen los bancos centrales cuando suben las tasas.',
    ogTitle: '¿Qué es la inflación y cómo te afecta? — Smart Finance',
    ogDesc: 'Por qué el mismo dinero compra menos, y cómo un aumento puede ser un recorte.'
  },
  {
    en: 'lessons/errores-al-invertir.html', es: 'es/lecciones/errores-al-invertir.html',
    enUrl: '/lessons/errores-al-invertir', esUrl: '/es/lecciones/errores-al-invertir',
    title: '3 errores comunes al empezar a invertir — Smart Finance',
    desc: 'Ahorrar e invertir hacen trabajos distintos. Este es el orden que sí funciona, y la señal de que ya estás listo para empezar a invertir.',
    ogTitle: '3 errores comunes al empezar a invertir — Smart Finance',
    ogDesc: 'El orden que sí funciona, y la señal de que ya estás listo.'
  }
];

// Mapa de enlaces internos EN → ES. Se aplica de la ruta más larga a la más
// corta: si "/lessons" se sustituyera primero, "/lessons/sp500" se convertiría
// en "/es/lecciones/sp500" por accidente… y también "/lessonsotracosa".
const RUTAS = PAGINAS
  .map((p) => ({ en: p.enUrl, es: p.esUrl }))
  .sort((a, b) => b.en.length - a.en.length);

// ------------------------------------------------------------------ utilidades

/*
 * Se lee normalizando los finales de línea a \n.
 *
 * NO ES COSMÉTICO. En Windows git suele estar con core.autocrlf=true: el repo
 * guarda \n pero la copia de trabajo se saca con \r\n. Este script limpia
 * líneas enteras con expresiones que terminan en \n? —por ejemplo la que borra
 * los hreflang viejos antes de volver a escribirlos— y contra un archivo con
 * \r\n ese \n? no se lleva el \r: se borra el texto de la línea y queda el \r
 * solo, o sea una línea en blanco.
 *
 * Como el script también reescribe las páginas en inglés, la basura se guarda
 * y la corrida siguiente empieza con una línea en blanco más. Así se juntaron
 * las 31 líneas en blanco que había en el <head> del home y las 8 de cada
 * lección: cinco por corrida (tres hreflang y dos og:locale), durante meses.
 *
 * Normalizando aquí, el resto del archivo puede seguir dando por hecho \n.
 * La salida se escribe con \n, que es lo que guarda git de todos modos.
 */
function leer(rel) {
  return fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
}

function escribir(rel, contenido) {
  const destino = path.join(RAIZ, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido);
}

// Escapa para meterlo dentro de un atributo HTML.
function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Escapa para meterlo como texto entre etiquetas.
function texto(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/*
 * Saca el diccionario de la propia página.
 *
 * Los diccionarios son objetos literales de JavaScript con claves y valores
 * entre comillas simples, así que se leen con un new Function en vez de
 * JSON.parse (JSON no acepta comillas simples ni comentarios, y algunos
 * diccionarios traen comentarios).
 */
function extraerDiccionario(html) {
  const inicios = [
    html.indexOf('const translations = {'),
    html.indexOf('window.ARTICLE_I18N = {')
  ].filter((i) => i !== -1);
  if (!inicios.length) throw new Error('no encontré el diccionario');

  const desde = html.indexOf('{', Math.min(...inicios));
  // Recorre contando llaves para encontrar la que cierra el objeto. Hacerlo
  // con una expresión regular fallaría con cualquier llave dentro de un texto.
  let nivel = 0, comilla = null, fin = -1;
  for (let i = desde; i < html.length; i++) {
    const c = html[i];
    if (comilla) {
      if (c === '\\') { i++; continue; }
      if (c === comilla) comilla = null;
      continue;
    }
    if (c === "'" || c === '"') { comilla = c; continue; }
    if (c === '{') nivel++;
    else if (c === '}') { nivel--; if (nivel === 0) { fin = i; break; } }
  }
  if (fin === -1) throw new Error('el diccionario no cierra');

  // eslint-disable-next-line no-new-func
  return new Function('return (' + html.slice(desde, fin + 1) + ');')();
}

/*
 * Encuentra dónde cierra la etiqueta que empieza en `desdeTag`.
 *
 * Hace falta contar anidamiento: varios textos traducibles llevan <strong>
 * dentro, y un `</span>` buscado a la brava cerraría en el primero que
 * aparezca, no en el que toca.
 */
function finDeElemento(html, desdeTag, tag) {
  const abre = new RegExp('<' + tag + '\\b', 'gi');
  const cierra = new RegExp('</' + tag + '\\s*>', 'gi');
  let i = html.indexOf('>', desdeTag) + 1;
  let nivel = 1;
  while (i < html.length && nivel > 0) {
    abre.lastIndex = i; cierra.lastIndex = i;
    const a = abre.exec(html);
    const c = cierra.exec(html);
    if (!c) return -1;
    if (a && a.index < c.index) { nivel++; i = a.index + 1; }
    else { nivel--; if (nivel === 0) return c.index; i = c.index + 1; }
  }
  return -1;
}

/*
 * Aplica el diccionario a todo lo marcado con data-i18n / data-i18n-html.
 *
 * Se recorre el HTML de una pasada en vez de usar reemplazos globales: hay que
 * saber qué etiqueta abre cada elemento para encontrar la que lo cierra.
 */
function traducirContenido(html, dic, avisos) {
  let salida = '';
  let i = 0;
  const re = /<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [tagCompleto, tag, clave] = m;
    const esHtml = /\bdata-i18n-html\b/.test(tagCompleto);
    const fin = finDeElemento(html, m.index, tag);
    if (fin === -1) { avisos.push('no pude cerrar <' + tag + '> de "' + clave + '"'); continue; }

    const valor = dic[clave];
    if (valor === undefined) {
      avisos.push('sin traducción: ' + clave);
      continue;
    }

    salida += html.slice(i, m.index) + tagCompleto + (esHtml ? valor : texto(valor));
    i = fin;
    re.lastIndex = fin;
  }
  return salida + html.slice(i);
}

// Los alt de las imágenes: el atributo se sustituye en su sitio.
function traducirAlt(html, dic, avisos) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = tag.match(/\bdata-i18n-alt="([^"]+)"/);
    if (!m) return tag;
    const valor = dic[m[1]];
    if (valor === undefined) { avisos.push('sin traducción (alt): ' + m[1]); return tag; }
    return tag.replace(/\balt="[^"]*"/, 'alt="' + attr(valor) + '"');
  });
}

// Los aria-label: mismo mecanismo que los alt, marcados con data-i18n-aria.
// Solo los oye quien navega con lector de pantalla, pero en /es también
// tienen que estar en español.
function traducirAria(html, dic, avisos) {
  return html.replace(/<[a-z0-9]+\b[^>]*\bdata-i18n-aria="[^"]+"[^>]*>/gi, (tag) => {
    const m = tag.match(/\bdata-i18n-aria="([^"]+)"/);
    const valor = dic[m[1]];
    if (valor === undefined) { avisos.push('sin traducción (aria): ' + m[1]); return tag; }
    return tag.replace(/\baria-label="[^"]*"/, 'aria-label="' + attr(valor) + '"');
  });
}

// Enlaces internos → su equivalente en español.
function reescribirEnlaces(html) {
  return html.replace(/\b(href)="([^"]*)"/gi, (todo, at, url) => {
    // Fuera: absolutas a otros dominios, mailto, anclas puras y archivos.
    if (/^(https?:|mailto:|#|data:)/i.test(url)) return todo;

    // Las lecciones enlazan con rutas relativas ("../", "../#about").
    let normal = url;
    if (normal.startsWith('../')) normal = '/' + normal.slice(3);
    if (!normal.startsWith('/')) return todo;

    // Se separa el ancla para no perderla.
    const corte = normal.indexOf('#');
    const ancla = corte === -1 ? '' : normal.slice(corte);
    let ruta = corte === -1 ? normal : normal.slice(0, corte);
    if (ruta.length > 1 && ruta.endsWith('/')) ruta = ruta.slice(0, -1);
    if (ruta === '') ruta = '/';

    const par = RUTAS.find((r) => r.en === ruta);
    if (!par) return todo;   // /assets/…, /api/… y demás los arregla absolutizarRecursos
    return at + '="' + par.es + ancla + '"';
  });
}

/*
 * Las rutas relativas a archivos (CSS, JS, imágenes) pasan a ser absolutas.
 *
 * EL BUG QUE ARREGLA — y era gordo:
 *
 * Las seis lecciones enlazan sus hojas con "../assets/article.css". Desde
 * /lessons/inflacion eso resuelve a /assets/article.css, correcto. Pero la
 * versión en español vive un nivel MÁS ABAJO, en /es/lecciones/inflacion, así
 * que el mismo "../" resuelve a /es/assets/article.css… que no existe.
 *
 * Resultado: las seis lecciones en español llevaban sirviéndose SIN NADA de
 * CSS y sin su JavaScript desde que existe /es. Ni la barra, ni la paleta, ni
 * la tipografía: texto negro sobre blanco en Times New Roman. Se comprobó
 * contra producción, no solo en local:
 *
 *     GET https://smartfinance.lat/es/assets/article.css  → 404
 *     GET https://smartfinance.lat/assets/article.css     → 200
 *
 * No se veía en el generador porque copia el atributo tal cual, y no se veía
 * en las otras páginas en español porque el home, /market y /lessons ya
 * enlazaban con "/assets/…" absoluto.
 *
 * Se corre DESPUÉS de reescribirEnlaces, para que lo que quede en "../" sea
 * ya solo archivos: los enlaces a páginas ("../#about") ese paso los convirtió
 * antes a su equivalente en español.
 *
 * Se hace absoluto en vez de contar niveles porque las páginas en inglés
 * cuelgan todas de un solo nivel: ahí "../algo" y "/algo" son la misma ruta.
 */
function absolutizarRecursos(html) {
  return html.replace(/\b(href|src)="\.\.\/([^"]*)"/gi, (todo, at, resto) => at + '="/' + resto + '"');
}

// ------------------------------------------------------- cabecera de cada página

function bloqueHreflang(pag) {
  // Recíproco y con x-default: las dos versiones se apuntan entre sí y
  // x-default manda a la inglesa, que es la que sirve a quien no cae en
  // ninguno de los dos idiomas.
  return [
    '<link rel="alternate" hreflang="en" href="' + SITIO + pag.enUrl + '">',
    '<link rel="alternate" hreflang="es" href="' + SITIO + pag.esUrl + '">',
    '<link rel="alternate" hreflang="x-default" href="' + SITIO + pag.enUrl + '">'
  ].join('\n');
}

/*
 * Los datos estructurados (ld+json) también son contenido indexable: si la
 * página está en español pero su JSON-LD sigue diciendo el título en inglés y
 * apuntando a la URL inglesa, Google recibe dos versiones contradictorias de
 * la misma página.
 *
 * Se sustituyen por valor exacto —el título y la descripción en inglés que ya
 * se leyeron de la propia página— en vez de por nombre de campo, porque el
 * JSON-LD no tiene la misma forma en todas: el home trae un @graph con varias
 * entidades y las lecciones un Article.
 */
function traducirDatosEstructurados(html, pag, enTitle, enDesc) {
  return html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, (bloque) => {
    let b = bloque;
    if (enTitle) b = b.split(jsonEscape(enTitle)).join(jsonEscape(pag.title));
    if (enDesc) b = b.split(jsonEscape(enDesc)).join(jsonEscape(pag.desc));
    // Las URLs internas van a su equivalente en español.
    for (const r of RUTAS) {
      b = b.split('"' + SITIO + r.en + '"').join('"' + SITIO + r.es + '"');
    }
    return b;
  });
}

// Dentro de un JSON los valores llevan las comillas escapadas igual que en el
// HTML de origen; se normaliza para que la comparación por valor exacto no
// falle por una comilla.
function jsonEscape(s) {
  return String(s).replace(/"/g, '\\"');
}

/*
 * La imagen que se ve al compartir, en su versión en español.
 *
 * Las tres las genera scripts/build-og.js a partir de las inglesas: misma
 * foto, mismo aro, mismo todo, con el texto traducido. Antes las páginas /es
 * servían la inglesa, así que compartir la versión en español enseñaba una
 * tarjeta que decía "Finance that actually clicks.".
 *
 * Se sustituye por URL y no por etiqueta porque la misma dirección aparece en
 * og:image, en twitter:image y dentro del ld+json (como "image" y, en el home,
 * como "logo" de la organización): buscar la URL las agarra todas.
 */
const IMAGENES_ES = {
  'og-image.jpg': 'og-image-es.jpg',
  'og-market.jpg': 'og-market-es.jpg',
  'og-lessons.jpg': 'og-lessons-es.jpg'
};

function imagenEs(html) {
  let out = html;
  for (const [en, es] of Object.entries(IMAGENES_ES)) {
    out = out.split(SITIO + '/' + en).join(SITIO + '/' + es);
  }
  return out;
}

function cabeceraEs(html, pag) {
  let out = html;

  out = out.replace(/<html lang="[^"]*"/i, '<html lang="es"');
  out = out.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + texto(pag.title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*">/i,
    '<meta name="description" content="' + attr(pag.desc) + '">');
  out = out.replace(/<meta property="og:title" content="[^"]*">/i,
    '<meta property="og:title" content="' + attr(pag.ogTitle) + '">');
  out = out.replace(/<meta property="og:description" content="[^"]*">/i,
    '<meta property="og:description" content="' + attr(pag.ogDesc) + '">');
  out = out.replace(/<meta name="twitter:title" content="[^"]*">/i,
    '<meta name="twitter:title" content="' + attr(pag.ogTitle) + '">');
  out = out.replace(/<meta name="twitter:description" content="[^"]*">/i,
    '<meta name="twitter:description" content="' + attr(pag.ogDesc) + '">');
  out = out.replace(/<link rel="canonical" href="[^"]*">/i,
    '<link rel="canonical" href="' + SITIO + pag.esUrl + '">');
  out = out.replace(/<meta property="og:url" content="[^"]*">/i,
    '<meta property="og:url" content="' + SITIO + pag.esUrl + '">');

  // og:locale de la página en español, con el inglés como alternativa.
  out = quitarLocale(out);
  out = out.replace(/<meta property="og:type"/i,
    '<meta property="og:locale" content="es_MX">\n' +
    '<meta property="og:locale:alternate" content="en_US">\n' +
    '<meta property="og:type"');

  out = ponerHreflang(out, pag);
  return out;
}

function quitarLocale(html) {
  return html.replace(/<meta property="og:locale(?::alternate)?" content="[^"]*">\n?/gi, '');
}

function ponerHreflang(html, pag) {
  const limpio = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/gi, '');
  return limpio.replace(/<link rel="canonical"([^>]*)>/i,
    '<link rel="canonical"$1>\n' + bloqueHreflang(pag));
}

/*
 * El toggle deja de ser dos botones de JavaScript y pasa a ser dos enlaces a
 * la URL equivalente. Es lo que hace que la URL refleje el idioma: antes se
 * podía estar leyendo en español en una dirección que decía /market, y eso es
 * justo lo que Google no puede indexar.
 *
 * data-lang se conserva porque assets/lang.js lo lee para recordar la elección.
 */
function toggleComoEnlaces(html, pag, idioma) {
  const en = '<a href="' + pag.enUrl + '" class="lang-btn' + (idioma === 'en' ? ' active' : '') +
    '" data-lang="en" hreflang="en">EN</a>';
  const es = '<a href="' + pag.esUrl + '" class="lang-btn' + (idioma === 'es' ? ' active' : '') +
    '" data-lang="es" hreflang="es">ES</a>';
  return html.replace(/<span class="lang-toggle[^"]*">[\s\S]*?<\/span>/gi,
    (bloque) => bloque.match(/^<span[^>]*>/)[0] + '\n        ' + en + '\n        ' + es + '\n      </span>');
}

// ---------------------------------------------------------------------- salida

function construir() {
  const avisos = [];
  let escritas = 0;

  for (const pag of PAGINAS) {
    const html = leer(pag.en);
    const dic = extraerDiccionario(html);

    // Se leen ANTES de tocar nada: son los valores que hay que buscar y
    // sustituir dentro del ld+json.
    const enTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const enDesc = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1];

    let out = html;
    out = traducirContenido(out, dic, avisos);
    out = traducirAlt(out, dic, avisos);
    out = traducirAria(out, dic, avisos);
    out = reescribirEnlaces(out);
    out = absolutizarRecursos(out);
    out = traducirDatosEstructurados(out, pag, enTitle, enDesc);
    out = cabeceraEs(out, pag);
    out = imagenEs(out);
    if (pag.imgAlt) {
      out = out.replace(/<meta property="og:image:alt" content="[^"]*">/i,
        '<meta property="og:image:alt" content="' + attr(pag.imgAlt) + '">');
    }
    out = toggleComoEnlaces(out, pag, 'es');

    escribir(pag.es, out);
    escritas++;
  }

  // Las páginas en inglés también necesitan sus hreflang, su og:locale correcto
  // y el toggle como enlaces.
  for (const pag of PAGINAS) {
    let html = leer(pag.en);
    html = ponerHreflang(html, pag);
    html = quitarLocale(html);
    html = html.replace(/<meta property="og:type"/i,
      '<meta property="og:locale" content="en_US">\n' +
      '<meta property="og:locale:alternate" content="es_MX">\n' +
      '<meta property="og:type"');
    html = toggleComoEnlaces(html, pag, 'en');
    escribir(pag.en, html);
  }

  return { escritas, avisos };
}

/*
 * El sitemap se genera de la MISMA lista de páginas, para que no pueda
 * quedarse corto cuando se agregue una lección: una URL que existe pero no
 * está en el sitemap es una que Google tarda mucho más en encontrar.
 *
 * Cada <url> lleva sus xhtml:link recíprocos. Google pide que cada versión
 * declare a todas —incluida ella misma— y que la relación sea simétrica; con
 * declararlo aquí basta, aunque también esté en el <head> de cada página.
 *
 * Los lastmod, changefreq y priority se conservan de los que ya había: son
 * fechas reales de commit y no se pueden inventar.
 */
const METADATOS = {
  '/':  { changefreq: 'daily',   priority: '1.0', lastmod: '2026-08-21' },
  '/market': { changefreq: 'hourly', priority: '0.9', lastmod: '2026-08-21' },
  '/lessons': { changefreq: 'monthly', priority: '0.8', lastmod: '2026-08-21' }
};
const META_LECCION = { changefreq: 'monthly', priority: '0.7', lastmod: '2026-07-31' };

function generarSitemap() {
  const bloques = PAGINAS.map((p) => {
    const meta = METADATOS[p.enUrl] || META_LECCION;
    const alternos = [
      '    <xhtml:link rel="alternate" hreflang="en" href="' + SITIO + p.enUrl + '"/>',
      '    <xhtml:link rel="alternate" hreflang="es" href="' + SITIO + p.esUrl + '"/>',
      '    <xhtml:link rel="alternate" hreflang="x-default" href="' + SITIO + p.enUrl + '"/>'
    ].join('\n');

    // Las dos versiones se listan por separado, cada una con el mismo bloque
    // de alternos. La española hereda changefreq y priority de su hermana:
    // es la misma página, en otro idioma.
    return [p.enUrl, p.esUrl].map((url) => [
      '  <url>',
      '    <loc>' + SITIO + url + '</loc>',
      '    <lastmod>' + meta.lastmod + '</lastmod>',
      '    <changefreq>' + meta.changefreq + '</changefreq>',
      '    <priority>' + meta.priority + '</priority>',
      alternos,
      '  </url>'
    ].join('\n')).join('\n\n');
  }).join('\n\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!--',
    '  Mapa del sitio. LO GENERA scripts/build-es.js — no se edita a mano; se',
    '  vuelve a correr el script y listo. Así no puede pasar que se agregue una',
    '  lección y su URL en español se quede fuera.',
    '',
    '  Cada página aparece dos veces, una por idioma, y las dos declaran los',
    '  mismos xhtml:link recíprocos (en, es y x-default apuntando al inglés).',
    '',
    '  NO se incluyen a propósito:',
    '    /newsletter/confirmado y /newsletter/baja  — pantallas de estado a las',
    '      que se llega desde un correo; llevan noindex.',
    '    /articles/*  — ya no existen, son redirecciones 301 de vercel.json.',
    '      Un sitemap no debe listar redirecciones.',
    '',
    '  lastmod sale de la fecha real del último commit de cada archivo. Si',
    '  editas una página, actualiza su fecha en METADATOS dentro del script:',
    '  una fecha inventada le enseña a Google a desconfiar del archivo entero.',
    '-->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    '',
    bloques,
    '',
    '</urlset>',
    ''
  ].join('\n');
}

if (require.main === module) {
  const { escritas, avisos } = construir();
  escribir('sitemap.xml', generarSitemap());
  console.log('sitemap.xml regenerado con ' + (PAGINAS.length * 2) + ' URLs');
  console.log('páginas en español escritas: ' + escritas);
  if (avisos.length) {
    console.log('\nAVISOS (' + avisos.length + '):');
    [...new Set(avisos)].forEach((a) => console.log('  - ' + a));
  } else {
    console.log('sin avisos: todas las claves tenían traducción');
  }
}

module.exports = { construir, PAGINAS, SITIO };
