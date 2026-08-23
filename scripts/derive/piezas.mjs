/*
 * De una pieza real del repo a lo que necesitan los borradores de difusión.
 *
 * Tres tipos, tres sitios donde ya vive el contenido (no se escribe nada dos
 * veces, igual que en scripts/build-og-pages.mjs):
 *
 *   leccion  → src/content/lessons/{en,es}/<slug>.mdx
 *   research → content/research/<empresa>/ (meta.yaml, sources.yaml, model.json)
 *   noticia  → src/data/news/<slug>.json  (solo las YA aprobadas y sincronizadas)
 *
 * LO IMPORTANTE: los "hechos" que se reparten a LinkedIn, TikTok, Instagram y
 * el boletín son FRASES DE LA PIEZA, copiadas tal cual. No se resumen ni se
 * reescriben. Así la guardia de cifras (cifras.mjs) no es un filtro que hay que
 * ir esquivando: es la comprobación de algo que ya es cierto por construcción.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import parseYaml from '../../src/lib/research/yaml.mjs';

export const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITIO = 'https://smartfinance.lat';

export const TIPOS = ['leccion', 'research', 'noticia'];

// ============================================================ frontmatter MDX

/**
 * Lee el frontmatter de un MDX de lección. Cubre EXACTAMENTE lo que usan
 * src/content/lessons/**\/*.mdx: escalares, mapas y secuencias en línea
 * (`{ a: "x" }`, `[a, b]`) y listas de mapas en línea (`sources`). Lo que no
 * entienda (el bloque `quiz`, que son mapas de bloque) se guarda como texto
 * crudo: nadie lo necesita aquí, pero tampoco debe reventar el lector.
 *
 * No se usa src/lib/research/yaml.mjs porque ese, a propósito, no soporta
 * flow (`{}` / `[]`) — y el frontmatter de las lecciones está lleno.
 */
export function frontmatterMdx(texto) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(String(texto).replace(/\r\n?/g, '\n'));
  if (!m) return { datos: {}, cuerpo: String(texto) };
  const lineas = m[1].split('\n');
  const datos = {};
  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    const cabeza = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(linea);
    if (!cabeza) { i++; continue; }
    const [, llave, resto] = cabeza;
    if (resto.trim()) { datos[llave] = valorEnLinea(resto.trim()); i++; continue; }
    // Bloque indentado bajo la llave.
    const bloque = [];
    i++;
    while (i < lineas.length && (lineas[i].trim() === '' || /^\s/.test(lineas[i]))) { bloque.push(lineas[i]); i++; }
    const items = [];
    let sueltas = [];
    for (const b of bloque) {
      const it = /^\s*-\s+(.*)$/.exec(b);
      if (it) items.push(valorEnLinea(it[1].trim()));
      else if (b.trim()) sueltas.push(b);
    }
    datos[llave] = items.length && !sueltas.length ? items : (items.length ? items : bloque.join('\n'));
  }
  return { datos, cuerpo: m[2] };
}

/** Un valor escrito en una línea: `{...}`, `[...]`, "texto", texto. */
function valorEnLinea(s) {
  if (s.startsWith('{') && s.endsWith('}')) return mapaEnLinea(s.slice(1, -1));
  if (s.startsWith('[') && s.endsWith(']')) return partirComas(s.slice(1, -1)).map(escalar);
  return escalar(s);
}

function mapaEnLinea(s) {
  const salida = {};
  for (const par of partirComas(s)) {
    const k = /^([A-Za-z_][\w-]*):\s*([\s\S]*)$/.exec(par.trim());
    if (k) salida[k[1]] = escalar(k[2].trim());
  }
  return salida;
}

/** Parte por comas que estén fuera de comillas y fuera de {} o []. */
function partirComas(s) {
  const salida = [];
  let actual = '', comilla = null, hondo = 0;
  for (const c of s) {
    if (comilla) { actual += c; if (c === comilla) comilla = null; continue; }
    if (c === '"' || c === "'") { comilla = c; actual += c; continue; }
    if (c === '{' || c === '[') hondo++;
    if (c === '}' || c === ']') hondo--;
    if (c === ',' && hondo === 0) { salida.push(actual); actual = ''; continue; }
    actual += c;
  }
  if (actual.trim()) salida.push(actual);
  return salida.map((x) => x.trim()).filter(Boolean);
}

function escalar(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  if (/^-?\d+$/.test(t)) return Number(t);
  return t;
}

// ============================================================ MDX → texto plano

/**
 * El texto que un lector ve, sin la maquinaria de MDX. Se conserva el texto de
 * dentro de <Term> y <Callout> (es prosa de la lección) y se tiran los
 * componentes sin contenido (<CompoundCalculator />) y los ids de los tags,
 * que llevan números que NO son cifras publicadas (id="regla-del-72").
 */
export function textoPlano(mdx) {
  return String(mdx)
    .replace(/^import .*$/gm, '')
    .replace(/<([A-Z][\w]*)\b[^>]*\/>/g, '')          // <CompoundCalculator />
    .replace(/<\/?[A-Za-z][\w]*\b[^>]*>/g, '')        // <Term id="x"> … </Term>, <Callout>
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')             // imágenes
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')          // [texto](url) → texto
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/^>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

/** Secciones del cuerpo: cada ## con sus párrafos ya en texto plano. */
export function secciones(mdx) {
  const plano = textoPlano(mdx);
  const salida = [];
  let actual = { titulo: null, parrafos: [] };
  for (const bloque of plano.split(/\n{2,}/)) {
    const t = bloque.trim();
    if (!t) continue;
    const h = /^#{2,3}\s+(.*)$/.exec(t);
    if (h) { if (actual.titulo || actual.parrafos.length) salida.push(actual); actual = { titulo: h[1].trim(), parrafos: [] }; continue; }
    if (/^#{1}\s/.test(t)) continue;
    actual.parrafos.push(t.replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '').replace(/\s*\n\s*/g, ' ').trim());
  }
  if (actual.titulo || actual.parrafos.length) salida.push(actual);
  return salida;
}

/** Frases de un párrafo. Corta en . ! ? seguidos de espacio y mayúscula. */
export function frases(texto) {
  return String(texto)
    .split(/(?<=[.!?])\s+(?=[¿¡"“(A-ZÁÉÍÓÚÑ0-9])/)
    .map((f) => f.trim())
    .filter((f) => f.length > 2);
}

const tieneCifra = (f) => /\d/.test(f.replace(/https?:\/\/\S+/g, ''));

/**
 * Cada frase de la pieza con el índice de la sección de la que salió. El
 * índice importa: los borradores reparten hechos e ideas por secciones
 * distintas para no repetir tres veces el mismo párrafo en tres sitios.
 */
function frasesConSeccion(secs) {
  return secs.flatMap((s, i) => s.parrafos.flatMap(frases).map((f) => ({ frase: f, seccion: i, titulo: s.titulo || '' })));
}

// ============================================================ lectores

const leer = (p) => fs.readFileSync(p, 'utf8');
const existe = (p) => fs.existsSync(p);

function fuentesDeLeccion(datos) {
  const s = Array.isArray(datos.sources) ? datos.sources : [];
  return s.filter((x) => x && x.title).map((x) => ({
    titulo: String(x.title), url: String(x.url || ''), editor: String(x.publisher || ''), fecha: String(x.date || '')
  }));
}

/** Una lección: los dos MDX (EN y ES) con el mismo slug. */
function leerLeccion(slug) {
  const rutas = { en: path.join(RAIZ, 'src/content/lessons/en', slug + '.mdx'), es: path.join(RAIZ, 'src/content/lessons/es', slug + '.mdx') };
  for (const [loc, r] of Object.entries(rutas)) {
    if (!existe(r)) throw new Error('no existe la lección ' + loc.toUpperCase() + ': ' + path.relative(RAIZ, r));
  }
  const crudo = { en: leer(rutas.en), es: leer(rutas.es) };
  const fm = { en: frontmatterMdx(crudo.en), es: frontmatterMdx(crudo.es) };
  const porIdioma = {};
  for (const loc of ['en', 'es']) {
    const { datos, cuerpo } = fm[loc];
    const secs = secciones(cuerpo);
    const todas = frasesConSeccion(secs);
    porIdioma[loc] = {
      titulo: String(datos.title || ''),
      descripcion: String(datos.description || ''),
      entradilla: String(datos.lede || ''),
      secciones: secs,
      hechos: todas.filter((f) => tieneCifra(f.frase)),
      ideas: todas.filter((f) => !tieneCifra(f.frase) && f.frase.length >= 40 && f.frase.length <= 220),
      url: SITIO + (loc === 'es' ? '/es/lecciones/' : '/lessons/') + slug,
      archivo: path.relative(RAIZ, rutas[loc])
    };
  }
  const d = fm.es.datos;
  return {
    tipo: 'leccion', slug,
    etiqueta: { en: 'Lesson', es: 'Lección' },
    ...porIdioma,
    cifraDestacada: d.heroStat && d.heroStat.value ? { valor: String(d.heroStat.value), etiqueta: String(d.heroStat.label || '') } : null,
    cifraDestacadaEn: fm.en.datos.heroStat && fm.en.datos.heroStat.value
      ? { valor: String(fm.en.datos.heroStat.value), etiqueta: String(fm.en.datos.heroStat.label || '') } : null,
    fuentes: fuentesDeLeccion(d),
    fechaDatos: String(d.updatedAt || d.publishedAt || ''),
    minutos: Number(d.readingMinutes) || null,
    archivos: [path.relative(RAIZ, rutas.en), path.relative(RAIZ, rutas.es)],
    textoFuente: crudo.en + '\n' + crudo.es
  };
}

/** Una noticia YA aprobada y sincronizada al repo. */
function leerNoticia(slug) {
  const ruta = path.join(RAIZ, 'src/data/news', slug + '.json');
  if (!existe(ruta)) {
    throw new Error('no existe la noticia ' + path.relative(RAIZ, ruta) +
      '.\n  Solo se derivan noticias APROBADAS y bajadas con `npm run news:sync`: un borrador no se difunde.');
  }
  const crudo = leer(ruta);
  const n = JSON.parse(crudo);
  const porIdioma = {};
  for (const loc of ['en', 'es']) {
    const t = n[loc] || {};
    const secs = [
      { titulo: loc === 'es' ? 'Qué pasó' : 'What happened', parrafos: [String(t.que || '')] },
      { titulo: loc === 'es' ? 'Por qué importa' : 'Why it matters', parrafos: [String(t.porque || '')] },
      { titulo: loc === 'es' ? 'Impacto en mercados' : 'Market impact', parrafos: [String(t.impacto || '')] }
    ];
    const todas = frasesConSeccion(secs);
    porIdioma[loc] = {
      titulo: String(t.titulo || ''),
      descripcion: String(t.que || '').slice(0, 200),
      entradilla: String(t.que || ''),
      secciones: secs,
      hechos: todas.filter((f) => tieneCifra(f.frase)),
      ideas: todas.filter((f) => !tieneCifra(f.frase) && f.frase.length >= 40 && f.frase.length <= 220),
      url: SITIO + (loc === 'es' ? '/es/noticias/' : '/news/') + slug,
      archivo: path.relative(RAIZ, ruta)
    };
  }
  return {
    tipo: 'noticia', slug,
    etiqueta: { en: 'News, explained', es: 'Noticia explicada' },
    ...porIdioma,
    cifraDestacada: null, cifraDestacadaEn: null,
    fuentes: n.fuente ? [{ titulo: n.fuente.titular, url: n.fuente.url, editor: n.fuente.nombre, fecha: String(n.fuente.publicado || '').slice(0, 10) }] : [],
    fechaDatos: String(n.fecha || '').slice(0, 10),
    autoria: n.autoria || null,
    archivos: [path.relative(RAIZ, ruta)],
    textoFuente: crudo
  };
}

/** Un reporte de research: la carpeta entera cuenta como pieza de origen. */
function leerResearch(empresa) {
  const dir = path.join(RAIZ, 'content/research', empresa);
  if (!existe(dir)) throw new Error('no existe la carpeta content/research/' + empresa);
  const meta = parseYaml(leer(path.join(dir, 'meta.yaml')));
  const archivos = [];
  let textoFuente = '';
  for (const rel of ['meta.yaml', 'sources.yaml', 'model.json', 'README.md', 'data/financials.json', 'data/VERIFICACION.md']) {
    const p = path.join(dir, rel);
    if (!existe(p)) continue;
    archivos.push(path.relative(RAIZ, p));
    textoFuente += '\n' + leer(p);
  }
  const model = existe(path.join(dir, 'model.json')) ? JSON.parse(leer(path.join(dir, 'model.json'))) : {};
  const tesis = model.thesis || {};
  const nombre = String(meta.name || empresa);
  const ticker = String(meta.ticker || '').toUpperCase();
  const bloque = (loc) => {
    const t = [tesis[loc], tesis.resumen, tesis.summary].find((x) => typeof x === 'string' && x.trim());
    const parrafos = t ? [t] : [];
    const secs = parrafos.length ? [{ titulo: loc === 'es' ? 'Tesis' : 'Thesis', parrafos }] : [];
    const todas = frasesConSeccion(secs);
    return {
      titulo: nombre + (ticker ? ' (' + ticker + ')' : ''),
      descripcion: loc === 'es' ? 'Reporte de research de ' + nombre : 'Equity research report on ' + nombre,
      entradilla: t || '',
      secciones: secs,
      hechos: todas.filter((f) => tieneCifra(f.frase)),
      ideas: todas.filter((f) => !tieneCifra(f.frase)),
      url: SITIO + (loc === 'es' ? '/es/research/' : '/research/') + empresa,
      archivo: archivos[0] || ''
    };
  };
  return {
    tipo: 'research', slug: empresa,
    etiqueta: { en: 'Research', es: 'Research' },
    en: bloque('en'), es: bloque('es'),
    cifraDestacada: null, cifraDestacadaEn: null,
    fuentes: [],
    fechaDatos: String(meta.dataAsOf || ''),
    estado: String(meta.status || ''),
    archivos, textoFuente
  };
}

/** Lee la pieza real del repo. Falla ruidosamente si no está. */
export function leerPieza(tipo, slug) {
  if (!TIPOS.includes(tipo)) throw new Error('tipo desconocido "' + tipo + '". Los que hay: ' + TIPOS.join(', '));
  const pieza = tipo === 'leccion' ? leerLeccion(slug) : tipo === 'noticia' ? leerNoticia(slug) : leerResearch(slug);
  if (!pieza.es.titulo || !pieza.en.titulo) throw new Error('la pieza no tiene título en los dos idiomas: no se puede derivar a medias');
  return pieza;
}

/** Lo que hay que grabar/completar a mano, para el resumen del comando. */
export function pendientesDe(pieza) {
  const p = [];
  for (const loc of ['en', 'es']) {
    if (!pieza[loc].hechos.length) p.push('la pieza no trae ninguna frase con cifra en ' + loc.toUpperCase() + ': los derivados van sin números');
  }
  if (!pieza.fuentes.length) p.push('la pieza no declara fuentes: hay que escribirlas a mano antes de publicar');
  if (!pieza.fechaDatos) p.push('la pieza no declara fecha de datos: el disclosure sale sin fecha');
  if (pieza.tipo === 'research' && pieza.estado && pieza.estado !== 'final') p.push('el reporte está en estado "' + pieza.estado + '": no se publica nada hasta que Jaime lo cierre');
  return p;
}
