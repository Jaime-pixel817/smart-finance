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
// LOS `sizes` DICEN MÁS DE 100vw, Y NO SON ERRATAS
// ═══════════════════════════════════════════════════════════════════════════
// `sizes` describe cuántos píxeles de ANCHO se van a PINTAR de esta imagen, y
// con `object-fit: cover` eso no es el ancho de la caja: es
// `max(anchoCaja, altoCaja x proporción)`.
//
//   VERTICAL (1400x2664, proporción 0.5255). En un teléfono de 390x844 se
//   pinta con 844 x 0.5255 = 444 px de ancho, o sea 113.8vw. Las tres anchuras
//   de teléfono que pide Jaime dan lo mismo (375x812, 390x844 y 414x896 son
//   las tres 0.462), y el móvil de Lighthouse (412x823) da 105vw. Se declara
//   115vw: cubre las cuatro con un pelo de margen y no infla la petición.
//
//   APAISADA (6000x2664, proporción 2.2523). Aquí el factor depende de la
//   forma de la ventana: 141vw en 1280x800, 127vw en 1920x1080, 100vw en una
//   pantalla tan ancha como la foto. Se declara 170vw, que es el techo
//   razonable de un escritorio; una ventana casi cuadrada pediría más, y ahí
//   la foto sale un poco blanda a cambio de no servirle 2 880 px a nadie que
//   no los vaya a pintar.
//
// Los archivos los escribe `node scripts/build-photos.mjs` (gris grabado,
// AVIF + WebP, huella de contenido). Las dos escaleras de anchos de aquí y las
// del script son las mismas listas, y si se tocan hay que tocarlas en los dos
// sitios: el manifiesto es quien avisa — `foto()` tumba el build con el nombre
// exacto de la que falta.
import { foto } from '../photos';

/** Los cinco anchos apaisados que escribe scripts/build-photos.mjs. */
export const PORTADA_ANCHOS = [960, 1280, 1620, 2160, 2880] as const;
/** Los cinco anchos del recorte vertical. */
export const PORTADA_ANCHOS_ALTO = [440, 620, 880, 1100, 1400] as const;

/** El original apaisado, tal cual: lo que va en width/height del <img>. */
export const PORTADA_W = 6000;
export const PORTADA_H = 2664;
/** El recorte vertical, para el width/height de su <source>. */
export const PORTADA_ALTO_W = 1400;
export const PORTADA_ALTO_H = 2664;

/** Ver el bloque de arriba: ninguno de los dos es 100vw, y no es una errata. */
export const PORTADA_SIZES = '170vw';
export const PORTADA_SIZES_ALTO = '115vw';

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
