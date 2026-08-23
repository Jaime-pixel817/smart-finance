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

  const lecciones = slugs.map((slug) => ({
    slug,
    es: leerLeccion('es', slug + '.mdx'),
    en: leerLeccion('en', slug + '.mdx')
  }));

  return { activos, lecciones };
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
      manifiesto.lecciones.length + ' lecciones, ' + Math.round(json.length / 1024) + ' KB'
    );
  }
}
