// Las cifras del capítulo 5 del CV son lo único que esa página afirma
// por su cuenta, y son justo lo que un comité de admisiones puede ir a
// comprobar: "418 pruebas, 41 fuentes primarias, 61 términos, 10 lecciones".
// Se cuentan en el build de los archivos reales, que es lo correcto — pero una cuenta rota
// NO rompe nada: el build termina, la página se publica y enseña un número
// falso. Falla en silencio, que es la peor forma de fallar en la única página
// del sitio que nadie va a revisar dos veces.
//
// Esta prueba cuenta POR SU CUENTA, leyendo los MDX y el JSON, y compara con
// lo que devuelve el módulo. Y no cuenta de una forma sola: las fuentes se
// cuentan por los renglones de la lista Y por sus `url:`, y las dos tienen que
// coincidir — si el troceado del frontmatter se rompiera, un conteo mal daría
// dos veces el mismo número mal y esta prueba pasaría feliz.
//
// La última prueba mira Historia.astro por dentro: comprueba que la página
// sigue pintando los números que salen de aquí y que no hay ni un dígito
// escrito a mano en el bloque de las cifras. Sin eso, alguien puede dejar el
// módulo perfecto y clavar un 10 en el HTML, que es exactamente el fallo del
// que va todo este archivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { contarCifras, contarPruebas, pruebasSangradas } from './cifras.mjs';

const SRC = new URL('../../', import.meta.url);
const RAIZ = new URL('../../../', import.meta.url);
const LECCIONES = new URL('content/lessons/', SRC);
const GLOSARIO = new URL('data/glossary.json', SRC);
const HISTORIA = new URL('components/cv/Historia.astro', SRC);

/** Los .mdx de un idioma, en orden. */
function slugs(lang) {
  return readdirSync(new URL(lang + '/', LECCIONES))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
    .sort();
}

/** El frontmatter de una lección: lo que hay entre el primer par de `---`. */
function frontmatter(lang, slug) {
  const texto = readFileSync(new URL(`${lang}/${slug}.mdx`, LECCIONES), 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(texto);
  assert.ok(m, `${lang}/${slug}.mdx: no se encontró el frontmatter`);
  return m[1];
}

/** El bloque `sources:` del frontmatter, hasta la siguiente clave de nivel 0. */
function bloqueFuentes(lang, slug) {
  const lineas = frontmatter(lang, slug).split(/\r?\n/);
  const i = lineas.findIndex((l) => /^sources:\s*$/.test(l));
  assert.notEqual(i, -1, `${lang}/${slug}.mdx: no tiene bloque sources:`);
  const fin = lineas.findIndex((l, j) => j > i && /^\S/.test(l));
  return lineas.slice(i + 1, fin === -1 ? lineas.length : fin);
}

/** Dos conteos distintos de las fuentes de una lección; tienen que coincidir. */
function fuentesDe(lang, slug) {
  const bloque = bloqueFuentes(lang, slug);
  const porRenglon = bloque.filter((l) => /^\s+-\s/.test(l)).length;
  const porUrl = bloque.filter((l) => /\burl:\s*"/.test(l)).length;
  assert.equal(
    porRenglon, porUrl,
    `${lang}/${slug}.mdx: contando renglones de la lista salen ${porRenglon} fuentes y contando url: salen ${porUrl}. ` +
    'Si no coinciden, el troceado del frontmatter de esta prueba dejó de entender el archivo y su cuenta no vale.'
  );
  return porRenglon;
}

/** La colección tal y como se la pasa Historia.astro al módulo. */
function coleccion() {
  const entradas = [];
  for (const lang of ['en', 'es']) {
    for (const slug of slugs(lang)) {
      entradas.push({ id: `${lang}/${slug}`, data: { sources: new Array(fuentesDe(lang, slug)).fill(null) } });
    }
  }
  return entradas;
}

const glosario = JSON.parse(readFileSync(GLOSARIO, 'utf8'));

test('las tres cifras del CV son las que sale contando los archivos a mano', () => {
  const en = slugs('en');
  const es = slugs('es');
  const esperado = {
    lecciones: Math.min(en.length, es.length),
    fuentes: en.reduce((s, slug) => s + fuentesDe('en', slug), 0),
    glosario: glosario.length
  };
  assert.deepEqual(contarCifras(coleccion(), glosario), esperado);
  // Y ninguna puede ser cero: una cuenta que se rompe a cero es el fallo
  // silencioso más fácil de tener y el más difícil de ver en la página.
  for (const [que, n] of Object.entries(esperado)) {
    assert.ok(n > 0, `la cifra "${que}" salió ${n}: eso no es una cuenta, es un fallo`);
  }
});

test('cada lección existe en los dos idiomas', () => {
  // Si no, `lecciones` se queda con el mínimo y la página dice menos de las
  // que hay — que es lo correcto, pero lo que hay que arreglar es la lección
  // que le falta la mitad, y aquí es donde se ve.
  assert.deepEqual(slugs('es'), slugs('en'));
});

test('ninguna lección baja de dos fuentes verificadas', () => {
  // Es la regla del schema de la colección (src/content.config.ts). Si una
  // lección se quedara sin fuentes, la cifra bajaría sin que nada avisara.
  for (const lang of ['en', 'es']) {
    for (const slug of slugs(lang)) {
      const n = fuentesDe(lang, slug);
      assert.ok(n >= 2, `${lang}/${slug}.mdx tiene ${n} fuente(s); el mínimo del schema son 2`);
    }
  }
});

test('el CV pinta las cifras del módulo y no un número escrito a mano', () => {
  const fuente = readFileSync(HISTORIA, 'utf8');
  assert.match(
    fuente, /import \{ contarCifras, contarPruebas \} from '\.\.\/\.\.\/lib\/cv\/cifras\.mjs'/,
    'Historia.astro dejó de usar src/lib/cv/cifras.mjs: la cuenta volvió a un sitio sin pruebas'
  );
  const bloque = /<ul class="cifras">([\s\S]*?)<\/ul>/.exec(fuente);
  assert.ok(bloque, 'no se encontró el bloque <ul class="cifras"> del capítulo 5');
  for (const v of ['{nPruebas}', '{nFuentes}', '{nGlosario}']) {
    assert.ok(bloque[1].includes(v), `el bloque de cifras ya no pinta ${v}`);
  }
  assert.doesNotMatch(
    bloque[1], /\d/,
    'hay un dígito escrito a mano en el bloque de cifras del CV. Esas tres cifras se cuentan de los archivos reales; ' +
    'una escrita a mano se queda vieja en silencio y la página miente sin que falle nada.'
  );
  // Las lecciones salieron de las cifras grandes (un «10» a 200 px no es un
  // titular) pero SIGUEN pintándose, con el número delante de su frase. Si
  // alguien las quita del todo, la página deja de decir cuántas hay.
  assert.match(
    fuente, /\{nLecciones\} \{c\.prueba\.stats\.lecciones\}/,
    'el CV dejó de pintar el número de lecciones'
  );
});

// ═════════════════════════════════════════════════════════════════════════
// LAS PRUEBAS AUTOMÁTICAS: la cifra más fácil de publicar mal
// ═════════════════════════════════════════════════════════════════════════
// Las otras tres cifras se cuentan de archivos que solo pueden decir una cosa.
// Esta se cuenta del CÓDIGO, y el peligro no es que la cuenta falle sino que
// cuente algo distinto de lo que imprime `npm test`: el CV diría «415 pruebas»
// mientras el corredor dice otra cosa, y eso en la página que presume de que
// cada cifra se puede ir a comprobar.

/** Todos los ficheros de prueba del repo, con su ruta relativa y su texto. */
function ficherosDePrueba() {
  const salida = [];
  const anda = (dir, rel) => {
    for (const e of readdirSync(new URL(dir, RAIZ), { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      if (e.isDirectory()) anda(dir + e.name + '/', rel + e.name + '/');
      else if (/\.test\.(mjs|js)$/.test(e.name)) {
        salida.push({ nombre: rel + e.name, texto: readFileSync(new URL(dir + e.name, RAIZ), 'utf8') });
      }
    }
  };
  for (const raiz of ['src/', 'api/', 'scripts/']) anda(raiz, raiz);
  return salida.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

test('contarPruebas cuenta lo mismo que sale contando a mano', () => {
  const ficheros = ficherosDePrueba();
  assert.ok(ficheros.length >= 25, `solo encontré ${ficheros.length} ficheros de prueba; el barrido se rompió`);
  // Conteo independiente: renglón a renglón, sin regex global.
  const aMano = ficheros.reduce((s, f) => s + f.texto.split(/\r?\n/).filter((l) => /^(test|it)\(/.test(l)).length, 0);
  assert.equal(contarPruebas(ficheros.map((f) => f.texto)), aMano);
  assert.ok(aMano > 300, `salieron ${aMano} pruebas: eso no es una cuenta, es un fallo`);
});

test('ninguna prueba se declara sangrada, que es lo que hace válida la cuenta del CV', () => {
  // `node --test` cuenta pruebas DECLARADAS. Contar los renglones que empiezan
  // por `test(` da su mismo número solo mientras no haya pruebas anidadas ni
  // generadas dentro de un bucle — y esas empiezan sangradas. En cuanto
  // alguien escriba una, esta prueba se cae y dice que la cifra del CV ya no
  // se puede publicar tal cual, en vez de dejar que la página mienta.
  const malas = pruebasSangradas(ficherosDePrueba());
  assert.deepEqual(
    malas, [],
    'estos ficheros declaran pruebas con sangría: ' + malas.join(', ') + '. ' +
    'Una prueba anidada o dentro de un bucle hace que `npm test` cuente más pruebas de las que cuenta ' +
    'src/lib/cv/cifras.mjs, y el CV publica esa cifra al tamaño de un titular. Antes de dejarlas, hay que ' +
    'cambiar la cuenta (y este comentario) para que siga diciendo lo mismo que el corredor.'
  );
});

test('el CV cuenta las pruebas de src/, api/ y scripts/, que son las tres que corre npm test', () => {
  const fuente = readFileSync(HISTORIA, 'utf8');
  const m = /import\.meta\.glob\('([^']+)'/.exec(fuente);
  assert.ok(m, 'Historia.astro ya no lee los ficheros de prueba con import.meta.glob');
  for (const carpeta of ['src', 'api', 'scripts']) {
    assert.ok(m[1].includes(carpeta), `el glob del CV ya no mira ${carpeta}/: la cifra se quedaría corta`);
  }
});
