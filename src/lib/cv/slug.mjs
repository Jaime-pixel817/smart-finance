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
// Lo que SÍ se valida, y no es lo mismo, es el valor que Jaime escribe en
// `CV_SLUG` ANTES de construir. Ahí no hay ningún visitante: hay una persona
// configurando un despliegue, y una persona se equivoca. Las dos cosas que
// comprueba este módulo —que el build de producción tenga dirección, y que la
// dirección sea inadivinable— son justo las dos que, si fallan, fallan EN
// VERDE: el build sale con éxito y el CV queda publicado donde no debía.
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
 * Longitud mínima de un slug, y de dónde sale el 20.
 * ══════════════════════════════════════════════════════════════════════════
 * Todo el apartado descansa en UNA cosa: que la dirección no se pueda
 * adivinar. No hay contraseña, no hay sesión y no hay servidor que cuente
 * intentos — hay un CDN que sirve un archivo estático si el nombre acierta y
 * un 404 si no. Un 404 no le cuesta nada a quien prueba. Así que la única
 * defensa es el tamaño del espacio de nombres, y eso es una cuenta:
 *
 *   Alfabeto: 36 caracteres (a-z0-9). La forma admite además el guion, pero
 *   `npm run cv:codigo` no lo genera y contar 36 en vez de 37 solo hace la
 *   cuenta MÁS conservadora.
 *
 *   Atacante: 10 000 peticiones por segundo, sostenidas, para siempre, sin
 *   límite de peticiones, sin WAF y sin que le cueste dinero. Es más de lo que
 *   Vercel deja hacer, y está puesto a propósito por encima de lo real.
 *   → 3.16 × 10^11 intentos al año; 3.16 × 10^12 en diez años.
 *
 *   Objetivo: que tras DIEZ AÑOS de eso la probabilidad de haber acertado sea
 *   menor que 1 entre mil millones (10⁻⁹). Como cada intento es una dirección
 *   distinta, esa probabilidad es intentos / 36^N.
 *   → 36^N ≥ 3.16 × 10^12 / 10⁻⁹ = 3.16 × 10^21 → N ≥ 13.81, o sea 14.
 *
 * O sea: catorce caracteres ya pasan un listón deliberadamente paranoico. El
 * mínimo es 20, seis por encima, por tres razones:
 *
 *   1. **Esta regla mide LARGO, no azar.** 36^N es el tamaño del espacio solo
 *      si cada carácter se sorteó. Una persona eligiendo a mano saca mucho
 *      menos de 5.17 bits por carácter, y este número es el suelo para todos
 *      los valores, no solo para los que salen del generador. Los seis
 *      caracteres de más son el colchón que sostiene la cuenta cuando el slug
 *      no es perfectamente aleatorio.
 *   2. **No cuesta nada.** El código se pega en un formulario o en un correo;
 *      nadie lo teclea de memoria. Veinte caracteres ocupan lo mismo que
 *      catorce: un renglón.
 *   3. **Deja el asunto cerrado.** 20 × log₂36 = 103.4 bits, contra los 72.4
 *      de 14. Está dentro de lo que se le pide normalmente a una URL que ES la
 *      credencial, así que no hay que volver a discutir el número.
 *
 * Con N = 20 el espacio son 1.34 × 10^31 direcciones. El atacante de arriba
 * cubre 3.16 × 10^12 en diez años: probabilidad 2.4 × 10⁻¹⁹. Para llegar
 * siquiera a una probabilidad de 1 entre un millón necesitaría 4.2 × 10^13
 * años, unas tres mil veces la edad del universo. Aun con mil millones de
 * peticiones por segundo (un millón de máquinas a mil cada una), diez años dan
 * 2.4 × 10⁻¹⁴.
 *
 * El máximo (64) no es seguridad, es higiene: es un nombre de archivo y un
 * segmento de URL, y a partir de ahí deja de poder pegarse en un renglón.
 */
export const MINIMO = 20;
export const MAXIMO = 64;

/**
 * Caracteres DISTINTOS mínimos, para que el largo no se rellene repitiendo.
 *
 * `MINIMO` solo cuenta caracteres, así que 'xxxxxxxxxxxxxxxxxxxx' mide 20 y
 * pasaría — con un espacio de búsqueda real de 36, no de 36^20. Ocho distintos
 * lo tapa sin estorbar a nadie: la distribución exacta del número de valores
 * distintos en 20 extracciones de 36 (calculada con los números de Stirling de
 * segunda especie) da P(distintos ≤ 7) = 3.6 × 10⁻⁸, o sea que rechazaría un
 * slug generado de verdad una vez cada 28 millones. La media son 15.5.
 */
export const DISTINTOS_MINIMO = 8;

/**
 * Forma admitida: minúsculas, dígitos y guiones, sin empezar ni terminar en
 * guion. Esto NO es la comprobación de fuerza (esa es el largo y las de abajo):
 * es la de que el valor puede ser un segmento de URL. Un valor con `/`, con
 * espacios o con acentos escribiría el archivo en otro sitio o en una ruta que
 * el navegador codifica de otra forma. El largo se comprueba aparte para poder
 * decir cuál de las dos cosas está mal.
 */
const FORMA = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Nombres que NO pueden ser el código, cada uno por su motivo, y cada uno con
 * su mensaje. Se comprueban ANTES que el largo para que el error diga la razón
 * de verdad y no "es corto".
 *
 * - `vista-previa`: es el RESPALDO público, escrito en este repositorio.
 *   Ponerlo en CV_SLUG construye exactamente la página que Lighthouse mide y
 *   que cualquiera puede abrir, creyendo haber configurado una privada. Es el
 *   fallo en verde de este archivo, escrito a mano.
 * - `index`: el enrutador de Astro con `build.format: 'file'` mapea
 *   `dist/cv/index.html` a la ruta `/cv/`, así que el parámetro `codigo` se
 *   queda sin valor y el build muere con `TypeError: Missing parameter:
 *   codigo`. Se cae, sí, pero por accidente del enrutador y con un mensaje que
 *   no menciona CV_SLUG ni dice qué hacer. Aquí se rechaza a la cara. (El largo
 *   mínimo ya lo rechazaría; esta entrada existe por el MENSAJE, y va antes que
 *   el largo por lo mismo.)
 */
const RESERVADOS = new Map([
  [RESPALDO, 'es el nombre de la VISTA PREVIA pública: está escrito en este repositorio, en lighthouserc.json y en package.json, y lo puede abrir cualquiera'],
  ['index', 'colisiona con el enrutador (dist/cv/index.html es la ruta /cv/, sin parámetro) y el build muere con un "TypeError: Missing parameter: codigo" que no menciona esta variable']
]);

/**
 * Palabras que hacen adivinable un slug aunque mida 20. Sin esto, la regla del
 * largo se esquiva sola: quien tenga que inventar veinte caracteres escribe
 * `jaime-sandoval-curriculum-2026`, que mide 30 y se adivina al segundo
 * intento. Una regla que estorba se acaba esquivando; por eso hay
 * `npm run cv:codigo`, que saca uno bueno en un segundo.
 *
 * Dos listas, y la diferencia importa:
 *
 * - `PALABRAS` se busca como SUBCADENA, y por eso todas miden 5 o más. Un slug
 *   aleatorio de 20 caracteres contiene una palabra concreta de 5 con
 *   probabilidad 16/36⁵ ≈ 2.6 × 10⁻⁷; con toda la lista, del orden de 10⁻⁶.
 * - `PIEZAS` se compara ENTERA contra cada trozo separado por guiones. Ahí
 *   caben las cortas: buscar 'cv' como subcadena rechazaría un 1.4 % de los
 *   slugs generados, y como pieza no puede rechazar ninguno (un slug generado
 *   no lleva guiones y mide 20, así que nunca es igual a 'cv').
 */
const PALABRAS = [
  'jaime', 'sandoval', 'ricano', 'smartfinance', 'smart-finance', 'finance',
  'finanzas', 'curriculum', 'resume', 'hojadevida', 'hoja-de-vida', 'vitae',
  'toronto', 'admision', 'admission', 'universidad', 'university', 'secreto',
  'secret', 'privado', 'private', 'password', 'contrasena', 'prueba',
  'preview', 'vista', 'previa', 'ejemplo', 'example', 'portafolio',
  'portfolio', 'la-mesa', 'lamesa'
];

const PIEZAS = new Set([
  'cv', 'abc', 'abcd', 'hola', 'hello', 'mesa', 'test', 'demo', 'dev', 'prod',
  'mi', 'mio', 'yo', 'me', 'my', 'admin', 'home', 'index', 'jaime', 'uoft',
  'ut', 'sf', '2025', '2026', '2027', '2028'
]);

/** Cuántos caracteres distintos tiene una cadena. */
function distintos(s) {
  return new Set(s).size;
}

/** El final de todos los mensajes: qué hacer, sin repetir nunca el valor. */
const QUE_HACER =
  ' El valor no se imprime aquí a propósito: un error de build acaba escrito en los registros de Vercel. ' +
  'Saca uno bueno con `npm run cv:codigo` y ponlo en CV_SLUG (Vercel → Settings → Environment Variables, y .env.local en tu máquina).';

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
      'que además mira si el build corre en Vercel.' + QUE_HACER
    );
  }

  const reservado = RESERVADOS.get(s);
  if (reservado) {
    throw new Error(
      'CV_SLUG usa un nombre reservado que no puede ser el código del CV: ' + reservado + '.' + QUE_HACER
    );
  }

  if (!FORMA.test(s)) {
    throw new Error(
      'CV_SLUG no tiene forma de segmento de URL (solo minúsculas, dígitos y guiones, sin empezar ni terminar en guion). ' +
      'OJO CON LAS MAYÚSCULAS: no se convierten, se rechazan — el archivo se llamaría distinto de lo que teclee quien reciba el código, y el CDN distingue.' +
      QUE_HACER
    );
  }

  if (s.length < MINIMO || s.length > MAXIMO) {
    throw new Error(
      'CV_SLUG tiene que medir entre ' + MINIMO + ' y ' + MAXIMO + ' caracteres y la tuya no. ' +
      'El mínimo NO es un capricho: /cv/<codigo> no tiene contraseña ni servidor que cuente intentos, así que lo único que impide adivinarla es el tamaño del espacio de nombres. ' +
      'Con ' + MINIMO + ' caracteres de [a-z0-9] son 1.34e31 direcciones: alguien probando 10 000 por segundo durante diez años tendría una probabilidad de 2.4e-19 de acertar. ' +
      'Con 5 caracteres el espacio entero son 60 466 176 direcciones: ese mismo atacante las prueba TODAS en 1 hora y 41 minutos. La cuenta entera está en la cabecera de este archivo.' +
      QUE_HACER
    );
  }

  if (distintos(s) < DISTINTOS_MINIMO) {
    throw new Error(
      'CV_SLUG mide lo suficiente pero repite muy pocos caracteres distintos (hacen falta ' + DISTINTOS_MINIMO + '). ' +
      'Rellenar el largo repitiendo deja el espacio de búsqueda real en nada, que es justo lo que el mínimo de ' + MINIMO + ' viene a impedir.' +
      QUE_HACER
    );
  }

  const palabra = PALABRAS.find((p) => s.includes(p)) || s.split('-').find((p) => PIEZAS.has(p));
  if (palabra) {
    throw new Error(
      'CV_SLUG contiene una palabra adivinable, y con eso el largo no sirve de nada: quien busque el CV de Jaime prueba primero su nombre, el del sitio y la palabra "cv". ' +
      'Un código no se inventa, se sortea.' + QUE_HACER
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
