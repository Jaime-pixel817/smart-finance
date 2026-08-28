// La foto de la portada del CV: sus anchos, su `sizes` y su `srcset`.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTO ES UN MÓDULO Y NO DOS ATRIBUTOS ESCRITOS EN EL HTML
// ═══════════════════════════════════════════════════════════════════════════
// La portada se pide DOS veces en la misma página y las dos tienen que decir
// exactamente lo mismo:
//
//   1. el `<link rel="preload">` de la cabecera (src/layouts/Cv.astro), que
//      existe para que la descarga empiece antes de que el navegador llegue
//      al marcado — es el LCP de la página;
//   2. el `<picture>` de la portada (src/components/cv/Historia.astro).
//
// Un preload cuyo `imagesrcset`/`imagesizes` no coincida CARÁCTER POR CARÁCTER
// con los del `<img>` no acelera nada: el navegador descarga un archivo, luego
// decide que quería otro, y descarga los dos. O sea que la copia mal pegada no
// se nota como un error sino como el doble de bytes en la ruta crítica, que es
// justo lo que el preload venía a evitar. Con una sola fuente eso no puede
// pasar.
//
// ═══════════════════════════════════════════════════════════════════════════
// EL `sizes` DICE 200vw EN EL TELÉFONO, Y NO ES UNA ERRATA
// ═══════════════════════════════════════════════════════════════════════════
// `sizes` describe cuántos píxeles de ANCHO se van a PINTAR de esta imagen, y
// con `object-fit: cover` eso no es el ancho de la caja. La foto es casi
// cuadrada (1620×1728) y la caja de la portada es la pantalla entera: en un
// teléfono de 390×844 `cover` la escala por el ALTO, así que se pinta con
// 844 × (1620/1728) = 791 px de ancho y solo se ven los 390 de en medio.
// Con `100vw` el navegador pedía la mitad de la resolución que iba a pintar y
// la Torre CN salía blanda. 200vw es la cuenta redondeada de ese factor.
// Desde 768 px la pantalla ya es más ancha que alta, `cover` escala por el
// ancho y `100vw` vuelve a ser la verdad.
//
// Los archivos los escribe `node scripts/build-photos.mjs` (gris grabado,
// AVIF + WebP, huella de contenido). Los anchos de aquí y los del script son
// la misma lista, y si se tocan hay que tocarlos en los dos sitios: el
// manifiesto es quien avisa — `foto()` tumba el build con el nombre exacto de
// la que falta.
import { foto } from '../photos';

/** Los cuatro anchos que escribe scripts/build-photos.mjs. */
export const PORTADA_ANCHOS = [640, 960, 1280, 1620] as const;

/** El original, tal cual: lo que va en width/height del <img>. */
export const PORTADA_W = 1620;
export const PORTADA_H = 1728;

/** Ver el bloque de arriba: 200vw por debajo de 768 px no es una errata. */
export const PORTADA_SIZES = '(max-width: 767px) 200vw, 100vw';

/** `640w, 960w, …` con la huella de cada archivo, para un formato. */
export function portadaSrcset(ext: 'avif' | 'webp'): string {
  return PORTADA_ANCHOS.map((w) => `${foto(`cv-toronto-${w}.${ext}`)} ${w}w`).join(', ');
}
