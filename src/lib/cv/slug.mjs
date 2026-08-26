// De dónde sale la dirección del CV.
//
// EL CÓDIGO ES LA DIRECCIÓN, Y NO SE VALIDA NADA.
// -----------------------------------------------
// /cv/<codigo> existe como archivo o no existe. No hay lista de códigos, no
// hay respuesta correcta guardada en el navegador y no hay endpoint que
// pregunte: un código equivocado da el 404 de verdad del servidor, igual que
// cualquier otra URL que no existe. Eso es lo que hace que no se pueda probar
// códigos contra el sitio ni leer la respuesta buena en el código fuente.
//
// El slug ENTRA POR `CV_SLUG` Y NO SE COMMITEA. Vive en las variables de
// entorno de Vercel y en el .env.local de Jaime; este repositorio es público.
//
// SIN LA VARIABLE, EL BUILD NO SE CAE: se emite /cv/vista-previa. El CI de
// GitHub no tiene el secreto, así que lo que Lighthouse mide (y lo que
// cualquiera que clone el repo construye) es la página de vista previa, con
// exactamente la misma estructura y ni una pista del slug de verdad.
//
// Es .mjs y no .ts por lo mismo que src/lib/portfolio/cartera.mjs: el
// package.json es commonjs y `node --test` no puede importar un .ts. Los tipos
// salen por inferencia.

/** La dirección que se emite cuando no hay `CV_SLUG`. */
export const RESPALDO = 'vista-previa';

/**
 * Forma admitida de un slug: minúsculas, dígitos y guiones, de 3 a 64
 * caracteres, sin empezar ni terminar en guion. No es una validación DEL
 * CÓDIGO (no hay código correcto que comparar): es la comprobación de que lo
 * que se escribió en la variable de entorno puede ser un segmento de URL. Un
 * valor con `/`, con espacios o con acentos escribiría el archivo en otro
 * sitio o en una ruta que el navegador codifica de otra forma.
 */
const FORMA = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;

/**
 * Resuelve la dirección del CV a partir del valor de `CV_SLUG`.
 *
 * - Vacío, ausente o solo espacios → `RESPALDO` ('vista-previa').
 * - Con la forma correcta → ese slug, TAL CUAL.
 * - Con cualquier otra forma → se TUMBA EL BUILD, a propósito. Un slug mal
 *   escrito no puede degradarse a 'vista-previa' en silencio: Jaime creería
 *   que repartió una dirección privada y estaría repartiendo la pública.
 *   El mensaje NO repite el valor: un error de build acaba en los registros
 *   de Vercel y en la consola, y ahí es donde no debe quedarse escrito.
 *
 * LO ÚNICO QUE SE NORMALIZA ES EL ESPACIO DE ALREDEDOR, Y LAS MAYÚSCULAS SE
 * RECHAZAN EN VEZ DE ARREGLARSE.
 * -----------------------------------------------------------------------
 * Esto hacía `.trim().toLowerCase()`, y ese `toLowerCase()` era un agujero
 * exactamente del tipo que el `throw` de aquí abajo está puesto para tapar.
 * Con `CV_SLUG='ABC-123-XYZ'` el build no se quejaba: emitía
 * `dist/cv/abc-123-xyz.html`. Pero el campo de /about no toca lo que se
 * teclea —no puede: no valida nada, solo hace `location.href = '/cv/' + …`—
 * y el CDN distingue mayúsculas, así que el código que Jaime creía haber
 * configurado abría un 404. Repartir una dirección que no existe es peor que
 * un build rojo, y es invisible hasta que alguien lo intenta.
 *
 * Arreglarlo por el otro lado (bajar a minúsculas en el navegador) sería
 * meter en el cliente una regla sobre cómo se escribe el código, que es justo
 * lo que este apartado no tiene. Así que la regla vive donde ya vivía: si
 * CV_SLUG no es EXACTAMENTE la dirección que se va a repartir, no se
 * construye. El `trim()` se queda porque un salto de línea pegado al pegar en
 * el panel de Vercel no cambia qué dirección quiso escribir nadie.
 */
export function slugCv(valor) {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (!s) return RESPALDO;
  if (!FORMA.test(s)) {
    throw new Error(
      'CV_SLUG no tiene forma de segmento de URL (3-64 caracteres: minúsculas, dígitos y guiones, sin empezar ni terminar en guion). ' +
      'OJO CON LAS MAYÚSCULAS: no se convierten, se rechazan — el archivo se llamaría distinto de lo que teclee quien reciba el código, y el CDN distingue. ' +
      'El valor no se imprime aquí a propósito. Corrígelo en las variables de entorno, o quítalo para construir /cv/' + RESPALDO + '.'
    );
  }
  return s;
}

/** ¿Lo que se va a construir es la vista previa pública? */
export function esVistaPrevia(slug) {
  return slug === RESPALDO;
}
