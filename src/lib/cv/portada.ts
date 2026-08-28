// La foto de la portada del CV: sus dos recortes, sus anchos, sus `sizes` y
// sus `srcset`.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTO ES UN MÓDULO Y NO CUATRO ATRIBUTOS ESCRITOS EN EL HTML
// ═══════════════════════════════════════════════════════════════════════════
// La portada se pide DOS veces en la misma página y las dos tienen que decir
// exactamente lo mismo:
//
//   1. los `<link rel="preload">` de la cabecera (src/layouts/Cv.astro), que
//      existen para que la descarga empiece antes de que el navegador llegue
//      al marcado;
//   2. el `<picture>` de la portada (src/components/cv/Historia.astro).
//
// Un preload cuyo `imagesrcset`/`imagesizes` no coincida CARÁCTER POR CARÁCTER
// con los del candidato que va a elegir no acelera nada: el navegador descarga
// un archivo, luego decide que quería otro, y descarga los dos. O sea que la
// copia mal pegada no se nota como un error sino como el doble de bytes en la
// ruta crítica, que es justo lo que el preload venía a evitar. Con una sola
// fuente eso no puede pasar. Y ahora que hay DOS recortes son dos preloads con
// `media` complementario, o sea el doble de sitios donde equivocarse.
//
// ═══════════════════════════════════════════════════════════════════════════
// DOS RECORTES, Y EL CORTE ES POR FORMA DE PANTALLA, NO POR ANCHO
// ═══════════════════════════════════════════════════════════════════════════
// La foto es una panorámica de 2.2523:1 (el horizonte de Toronto desde el
// agua) y la pantalla de un teléfono es 0.462:1. Con `object-fit: cover`, un
// 390x844 enseña el ALTO entero y solo el 20.5 % del ancho — y la Torre CN
// está en el 37.87 %, o sea fuera del recorte centrado. La portada salía
// decapitada.
//
// Tampoco se arregla solo moviendo `object-position`, y esto es lo que obliga
// a tener dos archivos: para pintar 390 px de CSS con densidad 3 enseñando el
// 20.5 % del ancho harían falta 5 700 px de foto. Eso es servirle el original
// a un teléfono.
//
// Así que hay dos archivos y el `<picture>` elige con
// `media="(max-aspect-ratio: 1/1)"`, no con un ancho de dispositivo: lo que
// decide qué recorte hace falta es la FORMA DEL HUECO, no cuántos píxeles mide
// de lado. Una tableta de pie (768x1024) tiene el mismo problema que un
// teléfono y la misma solución.
//
// ═══════════════════════════════════════════════════════════════════════════
// LOS `sizes` NO SON UN vw REDONDEADO: SON LA CUENTA EXACTA DE `cover`
// ═══════════════════════════════════════════════════════════════════════════
// `sizes` describe cuántos píxeles de ANCHO se van a PINTAR de esta imagen, y
// con `object-fit: cover` eso no es el ancho de la caja: es
// `max(anchoCaja, altoCaja x proporción)`. O sea que depende de la FORMA de la
// ventana, y por eso no hay ningún «N vw» que sea verdad en todas.
//
// La forma de decirlo exacta es partir el `sizes` justo donde `cover` cambia
// de eje, que es cuando la ventana y la foto tienen la misma proporción:
//
//   VERTICAL   (max-aspect-ratio: 1400/2664) 52.55vh, 100vw
//   APAISADA   (max-aspect-ratio: 6000/2664) 225.23vh, 100vw
//
// Más estrecha que la foto → `cover` escala por el ALTO y se pinta
// `alto x proporción`; más ancha → escala por el ANCHO y se pinta `100vw`. Sin
// redondeos y sin un caso peor que pague el resto.
//
// LA ALTERNATIVA ERA `max(100vw, 52.55vh)`, que dice lo mismo en una línea y
// que Chrome entiende (comprobado: elige el mismo archivo en 412x823, 390x844
// y 768x1024). Se descarta porque un navegador que no sepa de funciones
// matemáticas dentro de `sizes` tira toda la entrada y cae a `100vw`, que en
// un teléfono se queda un 14 % corto — y la portada sale blanda justo donde
// más se ve. La consulta de medios la entiende todo el mundo, y además es el
// mismo idioma con el que ya se elige el recorte tres líneas más arriba.
//
// LO QUE COSTABA REDONDEAR: con `115vw` (el techo de las anchuras de teléfono)
// el móvil de Lighthouse (412x823, densidad 1.75) pedía 829 px y se llevaba el
// archivo de 880; con la cuenta exacta pide 757 y se lleva el de 800. Son
// 5 KB en la ruta crítica de la página con menos margen de LCP del repo.
//
// Los archivos los escribe `node scripts/build-photos.mjs` (gris grabado,
// AVIF + WebP, huella de contenido). Las dos escaleras de anchos de aquí y las
// del script son las mismas listas, y si se tocan hay que tocarlas en los dos
// sitios: el manifiesto es quien avisa — `foto()` tumba el build con el nombre
// exacto de la que falta.
import { foto } from '../photos';

/** Los cinco anchos apaisados que escribe scripts/build-photos.mjs. */
export const PORTADA_ANCHOS = [960, 1280, 1620, 2160, 2880] as const;
/** Los seis anchos del recorte vertical. */
export const PORTADA_ANCHOS_ALTO = [440, 620, 800, 1000, 1200, 1400] as const;

/** El original apaisado, tal cual: lo que va en width/height del <img>. */
export const PORTADA_W = 6000;
export const PORTADA_H = 2664;
/** El recorte vertical, para el width/height de su <source>. */
export const PORTADA_ALTO_W = 1400;
export const PORTADA_ALTO_H = 2664;

/** Ver el bloque de arriba: es la cuenta de `cover`, no un vw redondeado. */
export const PORTADA_SIZES = '(max-aspect-ratio: 6000/2664) 225.23vh, 100vw';
export const PORTADA_SIZES_ALTO = '(max-aspect-ratio: 1400/2664) 52.55vh, 100vw';

/**
 * La consulta que decide el recorte. Vive aquí porque la escriben TRES sitios
 * (los dos `<source>` del `<picture>` y los dos `<link rel=preload>`), y el
 * preload del apaisado tiene que llevar exactamente la negación de esta.
 */
export const PORTADA_MEDIA_ALTO = '(max-aspect-ratio: 1/1)';
export const PORTADA_MEDIA_ANCHO = '(min-aspect-ratio: 1/1)';

/** `960w, 1280w, …` con la huella de cada archivo, para un formato. */
export function portadaSrcset(ext: 'avif' | 'webp'): string {
  return PORTADA_ANCHOS.map((w) => `${foto(`cv-toronto-${w}.${ext}`)} ${w}w`).join(', ');
}

/** Lo mismo para el recorte vertical. */
export function portadaSrcsetAlto(ext: 'avif' | 'webp'): string {
  return PORTADA_ANCHOS_ALTO.map((w) => `${foto(`cv-toronto-alto-${w}.${ext}`)} ${w}w`).join(', ');
}
