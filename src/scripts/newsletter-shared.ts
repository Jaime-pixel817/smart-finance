// El cuerpo de un número del boletín, en HTML.
//
// LO ESCRIBEN DOS SITIOS y por eso vive aquí:
//   - el build, desde src/data/newsletter/<fecha>.json
//     (src/pages/newsletter/[fecha].astro)
//   - el navegador, desde /api/newsletter-chart?issue=<fecha>, mientras ese
//     número todavía no está commiteado (src/scripts/newsletter-read.ts)
// Si la estructura cambia aquí cambia en los dos a la vez, que es justo lo que
// evita que la versión de hoy y la de la semana que viene se vean distintas.
// Por el mismo motivo los estilos van en src/styles/newsletter.css y no en un
// <style> scoped de un componente: con scoped, lo pintado en el navegador
// saldría sin formato.
//
// NO ES EL CORREO. El correo es una tabla de 600 px con estilos en línea porque
// Gmail no entiende otra cosa; esto es una página, con la tipografía del sitio,
// su modo oscuro y sus enlaces. Lo que comparten es el CONTENIDO, que es lo que
// se archiva (api/_lib/archivo.js).
//
// TODO LO QUE LLEGA SE ESCAPA antes de entrar al HTML. Es texto nuestro, ya
// revisado por una persona, pero un almacén compartido no es sitio donde
// confiar por costumbre.
import type { Locale } from '../i18n/routes';
import type { Numero, MovimientoActivo, ResumenActivo } from '../data/newsletter';
import { fmtNum, sparkPath } from './format';

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Solo http(s) y rutas internas acaban como enlace vivo. */
function href(u: unknown): string {
  const s = String(u ?? '');
  return /^https?:\/\//i.test(s) || /^\/[^/]/.test(s) ? esc(s) : '';
}

/*
 * Los textos de los bloques viven AQUÍ y no en src/i18n/ui.ts, a diferencia del
 * resto del sitio. Dos motivos: este módulo también corre en el navegador y
 * arrastrar la tabla entera de UI a esa página serían 30 KB para catorce
 * frases; y son las mismas catorce frases que usa el correo (api/_lib/
 * boletin.js), así que tenerlas juntas es lo que permite comprobar de un
 * vistazo que la web y el correo llaman igual a lo mismo. Los textos de la
 * PÁGINA —título, descripción, intro— sí van en ui.ts, como todos.
 */
const TEXTOS: Record<Locale, Record<string, string>> = {
  en: {
    edicion: 'Issue',
    semana: 'The week in one line',
    nota: "Jaime's line",
    noticia: "The week's story",
    miLectura: 'My take',
    miLecturaIA: 'AI summary · reviewed by Jaime',
    leerMas: 'Read the full story',
    mercado: 'The dollar this week',
    fx: 'USD/MXN',
    vix: 'Fear index (VIX)',
    movimientos: 'What moved this week',
    movimientosPie: 'Monday-to-Friday change',
    fuente: 'Yahoo Finance · quotes delayed up to 15 min',
    leccion: "This week's lesson",
    leccionCta: 'Read the lesson',
    minutos: '{n}-minute read',
    research: 'New in research',
    researchCta: 'Open the report',
    researchPie: 'Equity research — sources cited, assumptions written out.',
    sinNoticia: 'No story was reviewed and published this week. Nothing gets sent here before a human reads it.',
    graficaTitulo: 'US dollar against the Mexican peso, over the week',
    aviso: 'Educational content only — not financial, investment, or tax advice. Prices are the ones shown in the email that week; they are not updated.'
  },
  es: {
    edicion: 'Número',
    semana: 'La semana en una línea',
    nota: 'La línea de Jaime',
    noticia: 'La noticia de la semana',
    miLectura: 'Mi lectura',
    miLecturaIA: 'Resumen IA · revisado por Jaime',
    leerMas: 'Leer la nota completa',
    mercado: 'El dólar esta semana',
    fx: 'USD/MXN',
    vix: 'Índice del miedo (VIX)',
    movimientos: 'Qué se movió esta semana',
    movimientosPie: 'cambio de lunes a viernes',
    fuente: 'Yahoo Finance · cotizaciones con hasta 15 min de retraso',
    leccion: 'La lección de la semana',
    leccionCta: 'Leer la lección',
    minutos: '{n} min de lectura',
    research: 'Novedad en research',
    researchCta: 'Abrir el reporte',
    researchPie: 'Equity research — con las fuentes citadas y los supuestos escritos.',
    sinNoticia: 'Esta semana no hubo ninguna noticia revisada y publicada. Aquí no sale nada que una persona no haya leído antes.',
    graficaTitulo: 'El dólar frente al peso mexicano, a lo largo de la semana',
    aviso: 'Contenido educativo únicamente — no es asesoría financiera, de inversión ni fiscal. Los precios son los que llevaba el correo de esa semana; no se actualizan.'
  }
};

function pct(n: number, loc: Locale): string {
  const s = fmtNum(Math.abs(n), loc, 2);
  return (n >= 0 ? '+' : '−') + s + ' %';
}

function dir(n: number): 'up' | 'down' | 'flat' {
  return n > 0.0001 ? 'up' : n < -0.0001 ? 'down' : 'flat';
}

/** El día de un cierre, escrito: "viernes 21 de agosto". */
function diaDe(ts: number | null | undefined, loc: Locale): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const tag = loc === 'es' ? 'es-MX' : 'en-US';
  const dia = new Intl.DateTimeFormat(tag, { weekday: 'long', timeZone: 'America/Mexico_City' }).format(d);
  const resto = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }).format(d);
  return loc === 'es' ? dia + ' ' + resto : dia + ', ' + resto;
}

function bloqueEtiqueta(texto: string): string {
  return `<h2 class="nl-label">${esc(texto)}</h2>`;
}

function celdaMercado(etiqueta: string, r: ResumenActivo | null, decimales: number, invertir: boolean, loc: Locale): string {
  if (!r) return '';
  const clase = dir(invertir ? -r.cambioPct : r.cambioPct);
  return `<div class="nl-cifra">
    <div class="nl-cifra-et">${esc(etiqueta)}</div>
    <div class="nl-cifra-num">${esc(fmtNum(r.valor, loc, decimales))}</div>
    <div class="nl-cifra-d ${clase}"><span aria-hidden="true">${r.cambioPct >= 0 ? '▲' : '▼'}</span> ${esc(pct(r.cambioPct, loc))}</div>
  </div>`;
}

/*
 * LA GRÁFICA DEL DÓLAR, en SVG y no en la imagen del correo.
 *
 * El PNG del correo vive en Redis y caduca a los treinta días: una página de
 * archivo que lo enseñara se quedaría con un hueco al mes de publicarse. La
 * serie completa, en cambio, viaja en el JSON del número (unos 3 KB), así que
 * la curva se dibuja aquí y dura lo que dure la página.
 *
 * Los números van fuera de la gráfica, en las celdas de arriba: la imagen no
 * lleva ningún dato que no esté escrito, que es la misma regla del correo.
 */
function grafica(serie: [number, number][] | null, t: Record<string, string>): string {
  if (!serie || serie.length < 2) return '';
  const valores = serie.map((p) => p[1]).filter((v) => typeof v === 'number' && isFinite(v));
  if (valores.length < 2) return '';

  const { line, area } = sparkPath(valores, 600, 140, 3);
  if (!line) return '';
  const clase = dir(valores[valores.length - 1] - valores[0]);

  return `<svg class="nl-grafica ${clase}" viewBox="0 0 600 140" preserveAspectRatio="none" role="img" aria-label="${esc(t.graficaTitulo)}">
    <path class="fill" d="${area}"></path>
    <path class="line" d="${line}"></path>
  </svg>`;
}

function tablaMovimientos(m: Numero['movimientos'], loc: Locale): string {
  if (!m) return '';
  const fila = (a: MovimientoActivo, sube: boolean) => `<tr class="${sube ? 'up' : 'down'}">
    <td class="nl-flecha" aria-hidden="true">${sube ? '▲' : '▼'}</td>
    <td class="nl-nombre">${esc(a[loc])} <span class="nl-tk">${esc(a.sym)}</span></td>
    <td class="nl-delta">${esc(pct(a.cambioPct, loc))}</td>
  </tr>`;

  const filas = m.suben.map((a) => fila(a, true)).concat(m.bajan.map((a) => fila(a, false)));
  return `<table class="nl-tabla"><tbody>${filas.join('')}</tbody></table>`;
}

/**
 * El cuerpo entero de un número. Devuelve HTML como cadena, sin la cabecera de
 * la página (título y fecha los pinta quien llama, porque en la versión
 * estática van además en el <title> y en el JSON-LD).
 */
export function cuerpoDelNumero(n: Numero, loc: Locale): string {
  const t = TEXTOS[loc];
  const partes: string[] = [];

  partes.push(`<p class="nl-resumen">${esc(n.resumen[loc])}</p>`);

  // La línea de Jaime, solo si existe EN ESTE IDIOMA. Si solo la escribió en
  // español, la página en inglés sale sin el bloque: es preferible al español
  // suelto en una página inglesa (ver api/_lib/nota.js).
  const nota = n.nota && n.nota[loc];
  if (nota) {
    partes.push(`<section class="nl-nota">
      ${bloqueEtiqueta(t.nota)}
      <blockquote><p>${esc(nota)}</p><cite>Jaime Sandoval</cite></blockquote>
    </section>`);
  }

  // ---- La noticia ----------------------------------------------------------
  const noticia = n.noticia;
  partes.push(`<section class="nl-bloque">
    ${bloqueEtiqueta(t.noticia)}
    ${noticia ? `
      <h3 class="nl-titulo">${href(noticia[loc].link) ? `<a href="${href(noticia[loc].link)}">${esc(noticia[loc].titulo)}</a>` : esc(noticia[loc].titulo)}</h3>
      ${noticia[loc].take ? `<div class="nl-take">
        <span class="nl-autoria">${esc(noticia.autoria === 'humana' ? t.miLectura : t.miLecturaIA)}</span>
        <p>${esc(noticia[loc].take)}</p>
      </div>` : ''}
      ${href(noticia[loc].link) ? `<p class="nl-mas"><a href="${href(noticia[loc].link)}">${esc(t.leerMas)} →</a></p>` : ''}
    ` : `<p class="nl-vacio">${esc(t.sinNoticia)}</p>`}
  </section>`);

  // ---- El dólar ------------------------------------------------------------
  const mercado = n.mercado;
  if (mercado && (mercado.usdmxn || mercado.vix)) {
    const cuando = diaDe(mercado.usdmxn?.ultimoTs ?? mercado.vix?.ultimoTs ?? null, loc);
    partes.push(`<section class="nl-bloque">
      ${bloqueEtiqueta(t.mercado)}
      <div class="nl-cifras">
        ${celdaMercado(t.fx, mercado.usdmxn, 4, false, loc)}
        ${celdaMercado(t.vix, mercado.vix, 2, true, loc)}
      </div>
      ${grafica(n.serieFx, t)}
      <p class="nl-fuente">${esc(t.fuente)}${cuando ? ' · ' + esc(cuando) : ''}</p>
    </section>`);
  }

  // ---- Qué se movió --------------------------------------------------------
  if (n.movimientos) {
    const cuando = diaDe(n.movimientos.asOf, loc);
    partes.push(`<section class="nl-bloque">
      ${bloqueEtiqueta(t.movimientos)}
      ${tablaMovimientos(n.movimientos, loc)}
      <p class="nl-fuente">${esc(t.fuente)}${cuando ? ' · ' + esc(cuando) : ''} · ${esc(t.movimientosPie)}</p>
    </section>`);
  }

  // ---- La lección ----------------------------------------------------------
  const tip = n.tip;
  if (tip) {
    const url = loc === 'es' ? tip.urlEs : tip.url;
    const min = tip.minutos ? t.minutos.replace('{n}', String(tip.minutos)) : '';
    /*
     * Las semanas sin noticia aprobada, el titular del número ES el título de
     * la lección (así lo elige api/_lib/boletin.js, para que el asunto del
     * correo cambie cada semana en vez de repetir una frase fija). Cuando pasa,
     * el título no se repite aquí: el mismo texto dos veces en la misma página,
     * los dos en serif grande, se lee como una plantilla mal rellenada. El
     * bloque se sostiene con su etiqueta, el tiempo de lectura, el resumen y el
     * botón — y el titular de arriba ya dijo cómo se llama.
     */
    const repetido = !n.noticia && tip[loc].titulo.startsWith(n.gancho[loc]);
    partes.push(`<section class="nl-bloque">
      ${bloqueEtiqueta(t.leccion)}
      ${repetido ? '' : `<h3 class="nl-titulo">${esc(tip[loc].titulo)}</h3>`}
      ${min ? `<p class="nl-min">${esc(min)}</p>` : ''}
      <p class="nl-teaser">${esc(tip[loc].resumen)}</p>
      ${href(url) ? `<p class="nl-cta"><a class="btn btn-primary" href="${href(url)}">${esc(t.leccionCta)}</a></p>` : ''}
    </section>`);
  }

  // ---- Research ------------------------------------------------------------
  const research = n.research;
  if (research) {
    const url = loc === 'es' ? research.es.link : research.en.link;
    partes.push(`<section class="nl-bloque">
      ${bloqueEtiqueta(t.research)}
      <h3 class="nl-titulo">${esc(research.name)}${research.ticker ? ' (' + esc(research.ticker) + ')' : ''}</h3>
      <p class="nl-teaser">${esc(t.researchPie)}</p>
      ${href(url) ? `<p class="nl-mas"><a href="${href(url)}">${esc(t.researchCta)} →</a></p>` : ''}
    </section>`);
  }

  partes.push(`<p class="nl-aviso">${esc(t.aviso)}</p>`);

  return partes.join('\n');
}

/** El kicker de la cabecera: "Número 3 · 17–23 de agosto". */
export function kicker(n: Numero, loc: Locale): string {
  return TEXTOS[loc].edicion + ' ' + n.numero + ' · ' + n.rango[loc];
}

export { TEXTOS as TEXTOS_BOLETIN };
