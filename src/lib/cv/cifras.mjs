// Las tres cifras del capítulo 2 del CV narrativo ("Lo que ya está de pie"):
// lecciones, fuentes primarias y términos de glosario.
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
