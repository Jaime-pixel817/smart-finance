// De dónde sale la dirección del CV, y qué se emite cuando no hay dirección.
//
// EL CÓDIGO ES LA DIRECCIÓN, Y NO SE VALIDA NADA — AL PEDIRLA.
// -----------------------------------------------------------
// /cv/<codigo> existe como archivo o no existe. No hay lista de códigos, no
// hay respuesta correcta guardada en el navegador y no hay endpoint que
// pregunte: un código equivocado da el 404 de verdad del servidor, igual que
// cualquier otra URL que no existe. Eso es lo que hace que no se pueda probar
// códigos contra el sitio ni leer la respuesta buena en el código fuente.
//
// Lo que SÍ se comprueba, y no es lo mismo, es el valor que Jaime escribe en
// `CV_SLUG` ANTES de construir. Ahí no hay ningún visitante: hay una persona
// configurando un despliegue, y una persona se equivoca.
//
// El slug ENTRA POR `CV_SLUG` Y NO SE COMMITEA. Vive en las variables de
// entorno de Vercel y en el .env.local de Jaime; este repositorio es público.
//
// Es .mjs y no .ts por lo mismo que src/lib/portfolio/cartera.mjs: el
// package.json es commonjs y `node --test` no puede importar un .ts. Los tipos
// salen por inferencia.

/**
 * La dirección PÚBLICA que se emite cuando no hay `CV_SLUG` **y el build no es
 * de Vercel**. Está escrita en este repositorio público, en `lighthouserc.json`
 * y en `package.json`: no es un secreto y no pretende serlo. Es la página que
 * mide Lighthouse y la que construye cualquiera que clone el repo.
 *
 * Quién puede devolverla: SOLO `decidirCv()`, y solo después de comprobar que
 * el build no corre en Vercel. `slugCv()` no la devuelve nunca — ver abajo.
 */
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
 * Valida el valor de `CV_SLUG` y devuelve la dirección que se va a repartir.
 *
 * **Esta función no devuelve nunca el RESPALDO, ni siquiera con la entrada
 * vacía.** Antes lo hacía, y ese era el agujero: `slugCv('')` valía
 * 'vista-previa' y el build salía en verde con el CV publicado en una
 * dirección escrita en un repositorio público. La decisión de emitir la vista
 * previa —o de no emitir nada— vive AHORA en un solo sitio, `decidirCv()`, que
 * es el único que además mira si el build corre en Vercel. Una función que
 * puede devolver el nombre público por descuido no puede existir.
 *
 * Con cualquier valor que no pase, se TUMBA EL BUILD. Un slug mal escrito no
 * puede degradarse en silencio: Jaime creería que repartió una dirección
 * privada y estaría repartiendo la pública, o una que da 404.
 *
 * LO ÚNICO QUE SE NORMALIZA ES EL ESPACIO DE ALREDEDOR, Y LAS MAYÚSCULAS SE
 * RECHAZAN EN VEZ DE ARREGLARSE.
 * -----------------------------------------------------------------------
 * Esto hacía `.trim().toLowerCase()`, y ese `toLowerCase()` era un agujero
 * exactamente del tipo que los `throw` de aquí abajo están puestos para tapar.
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
 *
 * @param {unknown} valor  el contenido crudo de CV_SLUG
 * @returns {string} el slug, tal cual, sin el espacio de alrededor
 */
export function slugCv(valor) {
  const s = typeof valor === 'string' ? valor.trim() : '';

  if (!s) {
    throw new Error(
      'CV_SLUG está vacía y esta función no decide el respaldo: quien decide qué se emite sin variable es decidirCv() (src/lib/cv/slug.mjs), ' +
      'que además mira si el build corre en Vercel.'
    );
  }

  if (!FORMA.test(s)) {
    throw new Error(
      'CV_SLUG no tiene forma de segmento de URL (3-64 caracteres: minúsculas, dígitos y guiones, sin empezar ni terminar en guion). ' +
      'OJO CON LAS MAYÚSCULAS: no se convierten, se rechazan — el archivo se llamaría distinto de lo que teclee quien reciba el código, y el CDN distingue. ' +
      'El valor no se imprime aquí a propósito: un error de build acaba escrito en los registros de Vercel. Corrígelo en las variables de entorno.'
    );
  }

  return s;
}

/** ¿Lo que se va a construir es la vista previa pública? */
export function esVistaPrevia(slug) {
  return slug === RESPALDO;
}

/**
 * ¿Este build lo está corriendo Vercel?
 *
 * Vercel define `VERCEL=1` y `VERCEL_ENV` (`production` | `preview` |
 * `development`) en TODOS sus builds, y ninguna de las dos existe en el CI de
 * GitHub ni en la máquina de nadie. Se miran las dos y basta con una: si
 * mañana Vercel deja de poner una, la otra sigue tapando el agujero.
 *
 * Comprobado que llegan hasta aquí: `import.meta.env` de Astro las expone en el
 * build (no solo las de prefijo público — eso es cosa del bundle del
 * navegador), igual que a CV_SLUG.
 *
 * @param {Record<string, unknown>} [env]
 */
export function enVercel(env = {}) {
  const bandera = env.VERCEL;
  if (bandera === true) return true;
  if (typeof bandera === 'string') {
    const v = bandera.trim().toLowerCase();
    if (v && v !== '0' && v !== 'false') return true;
  }
  return typeof env.VERCEL_ENV === 'string' && env.VERCEL_ENV.trim() !== '';
}

/**
 * QUÉ SE EMITE EN /cv/<codigo>, Y EL FALLO SEGURO.
 * ══════════════════════════════════════════════════════════════════════════
 * Tres casos, y solo uno de ellos publica algo con nombre público:
 *
 *   1. Hay CV_SLUG → se emite UNA página, en esa dirección. Igual en todas
 *      partes.
 *   2. No hay CV_SLUG y el build NO es de Vercel (tu máquina, el CI de
 *      GitHub, cualquiera que clone el repo) → se emite /cv/vista-previa. Es
 *      la que mide Lighthouse (lighthouserc.json) y la que revisa
 *      scripts/check-seo.mjs, y su nombre no es secreto.
 *   3. No hay CV_SLUG y el build SÍ es de Vercel → NO SE EMITE NINGUNA
 *      PÁGINA DE CV. Cero rutas.
 *
 * El caso 3 es el arreglo, y es el que faltaba. Antes hacía lo mismo que el
 * 2: publicaba /cv/vista-previa —byte a byte la misma página que la privada—
 * en una dirección escrita en texto plano en este repositorio PÚBLICO, en
 * lighthouserc.json y en package.json, con el build en verde y sin un solo
 * aviso. O sea: olvidar la variable no era un error, era una publicación.
 *
 * Por qué CERO PÁGINAS y no un build rojo: el sitio no es el CV. Tumbar el
 * despliegue entero por una variable que falta dejaría sin publicar arreglos
 * que no tienen nada que ver, y la tentación sería quitar la comprobación. Sin
 * página, el resto del sitio sale y el CV simplemente no existe: Jaime abre su
 * dirección, ve un 404 y pone la variable. Un 404 se nota; una página privada
 * publicada con nombre público, no.
 *
 * Y por qué vale también para los previews: las variables de Vercel son POR
 * ENTORNO. Con CV_SLUG puesta solo en *Production*, cada despliegue de preview
 * habría publicado /cv/vista-previa en su `*.vercel.app`. Aquí no se mira
 * VERCEL_ENV para decidir: se mira si el build es de Vercel, y punto.
 *
 * @param {Record<string, unknown>} [env] normalmente `import.meta.env`
 * @returns {{ slug: string | null, modo: 'privado' | 'vista-previa' | 'ninguna' }}
 */
export function decidirCv(env = {}) {
  const bruto = typeof env.CV_SLUG === 'string' ? env.CV_SLUG.trim() : '';
  if (bruto) return { slug: slugCv(bruto), modo: 'privado' };
  if (enVercel(env)) return { slug: null, modo: 'ninguna' };
  return { slug: RESPALDO, modo: 'vista-previa' };
}

/** Lo que se dice en el registro del build en cada caso. Nunca el slug. */
const AVISOS = {
  privado: '[cv] CV_SLUG definida: se emite UNA pagina, en su direccion. No se imprime aqui.',
  'vista-previa': '[cv] sin CV_SLUG y este build no es de Vercel: se emite la vista previa PUBLICA /cv/' + RESPALDO + ' (la que mide Lighthouse).',
  ninguna:
    '[cv] SIN CV_SLUG EN UN BUILD DE VERCEL: no se emite NINGUNA pagina de CV.\n' +
    '[cv] Es el fallo seguro, a proposito: publicar /cv/' + RESPALDO + ' aqui seria dejar el CV en una direccion escrita en un repositorio publico.\n' +
    '[cv] El resto del sitio se despliega igual. Para que el CV exista: Vercel > Settings > Environment Variables > CV_SLUG, marcada en Production Y en Preview, y volver a desplegar.'
};

let avisado = false;

/**
 * Lo que consume `getStaticPaths()` en src/pages/cv/[codigo].astro: la lista
 * de rutas a emitir, ya decidida. Devuelve `[]` cuando no hay que emitir nada,
 * que en Astro significa exactamente cero páginas para esa ruta (comprobado:
 * el build sale en 0 y baja de 101 páginas a 100).
 *
 * Escribe UNA línea en el registro del build diciendo cuál de los tres casos
 * fue —el caso 3 escribe tres, en `stderr`—, porque «falla en verde» empieza
 * por no decir nada. El slug no aparece en ninguna. `avisar: false` es para
 * las pruebas, que llaman a esto muchas veces y no tienen registro que leer.
 *
 * @param {Record<string, unknown>} [env] normalmente `import.meta.env`
 * @param {{ avisar?: boolean }} [opciones]
 */
export function rutasCv(env = {}, opciones = {}) {
  const { slug, modo } = decidirCv(env);
  if (opciones.avisar !== false && !avisado) {
    avisado = true;
    if (modo === 'ninguna') console.warn(AVISOS.ninguna);
    else console.log(AVISOS[modo]);
  }
  return slug ? [{ params: { codigo: slug } }] : [];
}
