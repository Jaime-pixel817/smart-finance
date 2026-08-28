// Las cifras que el CV narrativo cuenta de los archivos reales del repo:
// lecciones, fuentes primarias, términos de glosario y pruebas automáticas.
// Las tres últimas son las que el capítulo 5 pinta al tamaño de un titular.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTO ES UN MÓDULO Y NO CUATRO LÍNEAS DENTRO DE Historia.astro
// ═══════════════════════════════════════════════════════════════════════════
// Las cifras se CUENTAN de los archivos reales en el build, que es lo correcto
// —si mañana hay once lecciones la página dice once sin que nadie la toque—,
// pero mientras la cuenta vivía suelta dentro del `.astro` no había forma de
// probarla: `node --test` no puede importar un componente de Astro. Y una
// cuenta rota aquí no rompe nada: el build sigue, la página se publica, y lo
// único que pasa es que un CV que a un comité de admisiones le presume
// verificabilidad enseña una cifra falsa. Falla en silencio, que es la peor
// forma de fallar.
//
// Con la cuenta aquí, `cifras.test.mjs` la corre contra los MDX y el JSON de
// verdad y compara con su propio conteo, hecho a mano y de otra manera. Si
// alguien rompe la lógica —cuenta las dos lenguas, suma las fuentes
// españolas, se le cae un filtro— CI se cae en vez de publicar el número mal.
//
// LO QUE CUENTA CADA UNA, Y POR QUÉ ASÍ
// · lecciones: el MÍNIMO entre las inglesas y las españolas, no el total ni
//   las de un idioma. La cifra se presenta como "lecciones, cada una escrita
//   en inglés y en español": una lección con solo la mitad traducida no
//   cumple esa frase. Ante un desajuste, mejor la cifra menor que una mentira.
// · fuentes: la suma de las fuentes de las lecciones INGLESAS. Las dos
//   versiones citan las mismas fuentes; sumar las dos las contaría dos veces.
// · glosario: los términos del catálogo, que es bilingüe por fila.

/**
 * @typedef {{ id: string, data: { sources: unknown[] } }} EntradaLeccion
 * @typedef {{ lecciones: number, fuentes: number, glosario: number }} Cifras
 */

/**
 * @param {EntradaLeccion[]} lecciones  getCollection('lessons') o su equivalente
 * @param {unknown[]} glosario          src/data/glossary.json
 * @returns {Cifras}
 */
export function contarCifras(lecciones, glosario) {
  const en = lecciones.filter((l) => l.id.startsWith('en/'));
  const es = lecciones.filter((l) => l.id.startsWith('es/'));
  return {
    lecciones: Math.min(en.length, es.length),
    fuentes: en.reduce((s, l) => s + l.data.sources.length, 0),
    glosario: glosario.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LAS PRUEBAS AUTOMÁTICAS, CONTADAS COMO LAS CUENTA `node --test`
// ═══════════════════════════════════════════════════════════════════════════
// La portada nueva enseña tres cifras al tamaño de un titular, y una de ellas
// es cuántas pruebas corren en cada cambio. Esa cifra no puede escribirse a
// mano por la misma razón que las otras tres — se queda vieja en silencio —,
// pero además tiene un riesgo propio: si lo que la página dice no es lo mismo
// que imprime `npm test`, la cifra es falsa aunque la cuenta esté "bien".
//
// POR QUÉ CONTAR `test(` AL PRINCIPIO DE RENGLÓN ES CONTAR LO MISMO QUE EL
// CORREDOR. `node --test` cuenta las pruebas que se DECLARAN. Hoy las de
// este repo se declaran todas en la columna 0: ninguna va dentro de un bucle,
// de un `describe` ni de otra prueba (los bucles que hay están DENTRO del
// cuerpo de una prueba, generando aserciones, no pruebas). Mientras eso siga
// siendo verdad, contar los renglones que EMPIEZAN por `test(` o `it(` da
// exactamente el número que imprime el corredor.
//
// Y "mientras siga siendo verdad" no se deja a la buena fe: `cifras.test.mjs`
// comprueba que ningún fichero declare una prueba con sangría. Una prueba
// anidada o generada en un bucle empieza sangrada, así que en cuanto alguien
// escriba una, CI se cae y dice que esta cuenta ya no vale — en vez de dejar
// que el CV publique un número que no es el que sale de correr las pruebas.
//
// Le llega el TEXTO de cada fichero, no rutas: la página lo pide con
// `import.meta.glob(..., { query: '?raw' })` porque este repo no declara
// @types/node y `astro check` se cae en cuanto un componente ve `node:fs`.

/**
 * @param {string[]} fuentes  el texto de cada fichero *.test.mjs / *.test.js
 * @returns {number}          pruebas declaradas
 */
export function contarPruebas(fuentes) {
  return fuentes.reduce((s, txt) => s + (txt.match(/^(?:test|it)\(/gm) || []).length, 0);
}

/**
 * Los ficheros que declaran alguna prueba SANGRADA, o sea anidada o dentro de
 * un bucle. Si esta lista no está vacía, `contarPruebas` ya no cuenta lo mismo
 * que `node --test` y la cifra del CV deja de poder publicarse.
 * @param {{nombre: string, texto: string}[]} ficheros
 * @returns {string[]}
 */
export function pruebasSangradas(ficheros) {
  return ficheros.filter((f) => /^[ \t]+(?:test|it)\(/m.test(f.texto)).map((f) => f.nombre);
}
