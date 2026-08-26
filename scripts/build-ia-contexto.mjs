// Manifiesto de GROUNDING de Smart Finance AI: lo único que el explicador
// tiene permitido saber sobre los activos y las lecciones del sitio.
//
// POR QUÉ EXISTE UN ARCHIVO GENERADO Y NO SE LEE LA FUENTE
// -------------------------------------------------------
// El explicador vive en una función serverless CommonJS (api/_lib/ia.js) y las
// fuentes de verdad del sitio no se pueden leer desde ahí:
//   · src/data/symbols.ts es TypeScript — `require` no lo entiende.
//   · las lecciones son MDX y su cuerpo solo existe después de que Astro lo
//     compila; además Vercel empaqueta la función con `require` estático, así
//     que un `fs.readFileSync` de un .mdx ni siquiera viajaría al despliegue.
// La salida es un JSON que SÍ se puede `require`, commiteado igual que
// src/generated/photos.json y og-pages.json.
//
// EL RIESGO ES QUE SE DESINCRONICE, así que no se vigila con disciplina:
// api/_lib/ia-contexto.test.mjs vuelve a construirlo en memoria y compara con
// el archivo commiteado. Si alguien añade un activo o edita una lección y no
// regenera, CI se cae. Por eso `construir()` es exportable y determinista — sin
// fecha de generación dentro, que haría fallar la comparación siempre.
//
//   node scripts/build-ia-contexto.mjs          escribe el manifiesto
//   node scripts/build-ia-contexto.mjs --dry    lo imprime sin escribir
//
// scripts/ NO viaja a Vercel (.vercelignore), así que esto corre en local y en
// CI, nunca en el despliegue.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parseYaml } from '../src/lib/research/yaml.mjs';
import { VENTANA, OCULTAS, RONDAS, ESPERADO_AL_AZAR } from '../src/lib/challenge/reto.mjs';

const RAIZ = new URL('../', import.meta.url);
const SALIDA = new URL('src/generated/ia-contexto.json', RAIZ);

// Cuánto texto de una lección entra en el bloque DATOS. 6 000 caracteres son
// ~1 500 tokens: cabe entera la lección más larga del sitio y el prompt sigue
// costando céntimos. Si una lección crece por encima, se corta por el final y
// el modelo tiene que decir que no lo sabe en vez de inventarlo.
const MAX_CUERPO = 6000;

/**
 * Carga un módulo TypeScript sin tipos: lo transpila con el compilador que ya
 * está en devDependencies y lo evalúa. symbols.ts solo importa `import type`,
 * que la transpilación borra, así que el `require` de mentira nunca se usa.
 */
function cargarTS(url) {
  const fuente = readFileSync(fileURLToPath(url), 'utf8');
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const modulo = { exports: {} };
  const requireFalso = (id) => {
    throw new Error('build-ia-contexto: ' + fileURLToPath(url) + ' importa "' + id + '" en tiempo de ejecución; ' +
      'este cargador solo admite imports de tipos');
  };
  new Function('module', 'exports', 'require', outputText)(modulo, modulo.exports, requireFalso);
  return modulo.exports;
}

// ---- Lecciones -------------------------------------------------------------

/** Saca un escalar del frontmatter: title, description, lede, readingMinutes… */
function campo(frontmatter, nombre) {
  const m = frontmatter.match(new RegExp('^' + nombre + ':\\s*(.+)$', 'm'));
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

/** Las fuentes del frontmatter, que son la lista de `- { title: …, url: … }`. */
function fuentesDe(frontmatter) {
  const bloque = frontmatter.match(/^sources:\n([\s\S]*?)(?=^\S)/m);
  if (!bloque) return [];
  const fuentes = [];
  for (const linea of bloque[1].split('\n')) {
    const titulo = linea.match(/title:\s*"([^"]+)"/);
    const url = linea.match(/url:\s*"([^"]+)"/);
    if (!titulo || !url) continue;
    const editor = linea.match(/publisher:\s*"([^"]+)"/);
    const fecha = linea.match(/date:\s*"([^"]+)"/);
    fuentes.push({
      titulo: titulo[1],
      url: url[1],
      editor: editor ? editor[1] : null,
      fecha: fecha ? fecha[1] : null
    });
  }
  return fuentes;
}

/**
 * El cuerpo de la lección como texto plano. Los componentes de Astro no dicen
 * nada que el modelo pueda usar (`<Term id="x">tipo de cambio</Term>` es
 * "tipo de cambio" y una calculadora no es texto), así que se quedan solo con
 * su contenido. Lo que NO se toca son las cifras: es justo lo que el bloque
 * DATOS tiene que respaldar.
 */
function cuerpoPlano(mdx) {
  return mdx
    .replace(/<(Term|Callout)\b[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    .replace(/<[A-Z][A-Za-z]*\b[^>]*\/>/g, '')
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CUERPO);
}

function leerLeccion(locale, archivo) {
  const crudo = readFileSync(fileURLToPath(new URL('src/content/lessons/' + locale + '/' + archivo, RAIZ)), 'utf8');
  const partes = crudo.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!partes) throw new Error('lección sin frontmatter: ' + locale + '/' + archivo);
  const [, frontmatter, cuerpo] = partes;
  return {
    titulo: campo(frontmatter, 'title'),
    descripcion: campo(frontmatter, 'description'),
    entradilla: campo(frontmatter, 'lede'),
    minutos: Number(campo(frontmatter, 'readingMinutes')) || null,
    actualizada: campo(frontmatter, 'updatedAt'),
    fuentes: fuentesDe(frontmatter),
    cuerpo: cuerpoPlano(cuerpo)
  };
}

// ---- Rutas -----------------------------------------------------------------

/**
 * Las rutas EN/ES que el explicador necesita enlazar (la lección de cada tema,
 * el glosario y /methodology). Se leen del REGISTRO, src/i18n/routes.ts, pero
 * a nivel de texto: ese archivo importa symbols.ts, news.ts y newsletter.ts en
 * tiempo de ejecución, así que no se puede evaluar suelto como symbols.ts. Las
 * líneas que interesan son literales, y si alguien cambia una URL sin
 * regenerar, la prueba de sincronía lo caza.
 */
function rutasDe() {
  const fuente = readFileSync(fileURLToPath(new URL('src/i18n/routes.ts', RAIZ)), 'utf8');
  const re = /\{\s*id:\s*'([^']+)'\s*,\s*en:\s*'([^']+)'\s*,\s*es:\s*'([^']+)'/g;
  const rutas = {};
  for (const m of fuente.matchAll(re)) {
    const [, id, en, es] = m;
    if (id.startsWith('lesson.') || id.startsWith('research.') ||
      id === 'methodology' || id === 'lessons.glossary' || id === 'challenge') {
      rutas[id] = { en, es };
    }
  }
  for (const obligatoria of ['methodology', 'lesson.errores']) {
    if (!rutas[obligatoria]) throw new Error('build-ia-contexto: falta la ruta ' + obligatoria + ' en routes.ts');
  }
  return rutas;
}

// ---- Reportes de research ---------------------------------------------------
//
// El explicador también vive en /research/<empresa>, y su grounding son los
// MISMOS ficheros que pintan la página: meta.yaml y data/financials.json de
// content/research/<slug>/. Las cuentas (millones, márgenes, crecimiento) se
// hacen AQUÍ, con el mismo redondeo que src/lib/research/reports.ts, porque la
// guardia de cifras exige que cada número de la respuesta ya exista en el
// bloque. El registro de qué reportes tienen página se lee de reports.ts a
// nivel de texto, igual que las rutas: ese archivo usa import.meta.glob y no
// se puede evaluar suelto.

const MM = (x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round((x / 1e6) * 10) / 10 : null);
const pct = (a, b) => (a !== null && b !== null && b !== 0 ? Math.round((a / b) * 1000) / 10 : null);
const cifra = (v) => (v === null ? 's/d' : String(v));

function reportesPaginados() {
  const fuente = readFileSync(fileURLToPath(new URL('src/lib/research/reports.ts', RAIZ)), 'utf8');
  const re = /\{\s*slug:\s*'([^']+)',\s*dir:\s*'([^']+)',\s*routeId:\s*'([^']*)',\s*page:\s*(true|false),\s*ticker:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
  const lista = [];
  for (const m of fuente.matchAll(re)) {
    const [, slug, dir, routeId, page] = m;
    if (page === 'true') lista.push({ slug, dir, routeId });
  }
  if (!lista.length) throw new Error('build-ia-contexto: no encontré el registro REPORTS en reports.ts');
  return lista;
}

function leerReporte({ slug, dir, routeId }, rutas) {
  const base = 'content/research/' + dir + '/';
  const meta = parseYaml(readFileSync(fileURLToPath(new URL(base + 'meta.yaml', RAIZ)), 'utf8'));
  const financials = JSON.parse(readFileSync(fileURLToPath(new URL(base + 'data/financials.json', RAIZ)), 'utf8'));
  const sources = parseYaml(readFileSync(fileURLToPath(new URL(base + 'sources.yaml', RAIZ)), 'utf8'));

  const filas = (financials.annual || []).map((r, i, todo) => {
    const revenue = MM(r.revenue);
    const anterior = i > 0 ? MM(todo[i - 1].revenue) : null;
    const crecimiento = anterior !== null && revenue !== null && anterior !== 0
      ? Math.round(((revenue / anterior) - 1) * 1000) / 10 : null;
    return '  ' + r.fy + ' (cerrado ' + r.periodEnd + '): ingresos ' + cifra(revenue) +
      ' MUSD' + (crecimiento === null ? '' : ' (' + (crecimiento > 0 ? '+' : '') + crecimiento + ' % vs. año anterior)') +
      ', margen bruto ' + cifra(pct(MM(r.grossProfit), revenue)) + ' %' +
      ', utilidad operativa ' + cifra(MM(r.operatingIncome)) + ' MUSD' +
      ', utilidad neta ' + cifra(MM(r.netIncome)) + ' MUSD' +
      ', flujo libre ' + cifra(MM(r.fcf)) + ' MUSD';
  });

  const datos = [
    'Reporte de equity research del sitio (BORRADOR: la tesis, los supuestos del DCF y la',
    'conclusión los está escribiendo Jaime; lo que hay son los datos de los reportes anuales).',
    '  empresa: ' + meta.name + ' (' + meta.exchange + ': ' + meta.ticker + ')',
    '  moneda de las cifras: ' + meta.currency + ' (MUSD = millones de dólares)',
    '  cierre del año fiscal: ' + meta.fiscalYearEnd,
    '  datos al: ' + meta.dataAsOf,
    '  estado del reporte: borrador — sin tesis, sin precio objetivo, sin conclusión',
    'Años fiscales (de los 10-K presentados a la SEC; cuentas hechas por el sitio):',
    ...filas
  ].join('\n');

  const fuentes = (Array.isArray(sources.sources) ? sources.sources : [])
    .filter((s) => s && s.url && s.title)
    .slice(0, 4)
    .map((s) => ({ titulo: s.title, url: s.url }));

  return {
    slug,
    ticker: meta.ticker,
    nombre: meta.name,
    routeId,
    href: rutas[routeId] || null,
    dataAsOf: meta.dataAsOf || null,
    datos,
    fuentes
  };
}

// ---- El reto del día --------------------------------------------------------
//
// La descripción sale de las REGLAS de verdad (las constantes exportadas de
// src/lib/challenge/reto.mjs), no de una copia a mano que caduque: si las
// reglas cambian, esto se regenera y la prueba de sincronía obliga a
// commitearlo.

function retoParaIA(rutas) {
  const datos = [
    'El reto del día de Smart Finance ("¿Y luego qué pasó?"): un juego para aprender a leer',
    'gráficas, no una calculadora ni un pronóstico.',
    '  qué ve quien juega: ' + RONDAS + ' rondas con una gráfica REAL de precios, sin el nombre del',
    '  activo y sin el eje de precios: se ven ' + (VENTANA - OCULTAS) + ' semanas y las últimas ' + OCULTAS + ' están tapadas.',
    '  qué se contesta: qué pasó en esas semanas tapadas, entre cuatro opciones (bajó fuerte,',
    '  bajó, subió, subió fuerte). El umbral entre "subió" y "subió fuerte" es el movimiento',
    '  típico del PROPIO activo, por eso el bitcoin y el dólar se juegan con las mismas opciones.',
    '  por qué no se ve el nombre: para que se lea la gráfica, no la fama del activo.',
    '  el reto diario: uno al día, el mismo para todo el mundo; se sortea con la fecha de Ciudad',
    '  de México, así que cambia a medianoche de México. Solo el PRIMER intento del día cuenta.',
    '  la racha: días seguidos jugando el reto diario. Se guarda solo en el navegador de quien',
    '  juega (localStorage): cambiar de navegador la empieza de cero, y el sitio no guarda nada.',
    '  la puntuación: al azar se esperan ' + ESPERADO_AL_AZAR + ' puntos por partida; sacar más que eso de',
    '  forma consistente es señal de que estás leyendo algo de la gráfica.',
    '  modo libre: partidas extra que no tocan la racha, con más activos.',
    '  qué NO es: no predice precios, no da consejos, y acertar aquí no significa saber qué hará',
    '  el mercado mañana — esa es justo la lección del juego.'
  ].join('\n');

  return {
    href: rutas.challenge || null,
    datos
  };
}

// ---- El manifiesto ---------------------------------------------------------

export function construir() {
  const { ASSETS } = cargarTS(new URL('src/data/symbols.ts', RAIZ));

  const activos = ASSETS.map((s) => ({
    id: s.id,
    sym: s.sym,
    nombre: s.name,
    tipo: s.kind,
    moneda: s.currency,
    sesion: s.session,
    fuente: s.source,
    retrasoMin: s.delay,
    decimales: s.decimals,
    history: s.history || null,
    leccion: s.lesson,
    que: s.what
  }));

  const slugs = readdirSync(fileURLToPath(new URL('src/content/lessons/es/', RAIZ)))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
    .sort();

  const rutas = rutasDe();
  // El id de ruta de cada lección sale de la propia tabla de rutas: la entrada
  // cuyo camino en inglés termina en el slug. Así no hay una segunda tabla
  // slug → routeId que mantener a mano.
  const routeIdDe = (slug) =>
    Object.keys(rutas).find((id) => id.startsWith('lesson.') && rutas[id].en.endsWith('/' + slug)) || null;

  const lecciones = slugs.map((slug) => {
    const routeId = routeIdDe(slug);
    if (!routeId) throw new Error('build-ia-contexto: la lección ' + slug + ' no está en routes.ts');
    return {
      slug,
      routeId,
      href: rutas[routeId],
      es: leerLeccion('es', slug + '.mdx'),
      en: leerLeccion('en', slug + '.mdx')
    };
  });

  const reportes = reportesPaginados().map((r) => leerReporte(r, rutas));

  return { activos, lecciones, reportes, reto: retoParaIA(rutas), rutas };
}

const esteArchivo = fileURLToPath(import.meta.url);
if (process.argv[1] === esteArchivo) {
  const manifiesto = construir();
  const json = JSON.stringify(manifiesto, null, 2) + '\n';
  if (process.argv.includes('--dry')) {
    console.log(json);
  } else {
    writeFileSync(fileURLToPath(SALIDA), json);
    console.log(
      '[ia] src/generated/ia-contexto.json: ' + manifiesto.activos.length + ' activos, ' +
      manifiesto.lecciones.length + ' lecciones, ' + manifiesto.reportes.length + ' reportes y el reto, ' +
      Math.round(json.length / 1024) + ' KB'
    );
  }
}
