// LOS ATRIBUTOS DE UN CLIP DEL CV, ESCRITOS UNA SOLA VEZ.
//
// Vivían dentro de `Historia.astro` como una constante local, y el comentario
// que los acompañaba ya decía por qué existían: el clip vivo y su gemelo del
// `<noscript>` tienen que ser el MISMO vídeo, y la única diferencia entre los
// dos tiene que ser dónde va el póster (`data-poster` en el vivo, `poster` en
// el del `<noscript>`). Con los atributos escritos a mano dos veces, eso dura
// hasta que alguien toque uno.
//
// SE MUEVEN AQUÍ EN LA OLA 5 porque desde el 2026-09-04 hay un SEGUNDO
// componente que sirve clips: el módulo del micrófono (`Microfono.astro`), que
// pinta los cuatro países que Jaime pidió debajo del carrusel. Copiar la
// función al segundo componente habría sido exactamente el fallo contra el
// que avisa CLAUDE.md («un `poster=` escrito a pelo en el vídeo vivo devuelve
// los 109 KB y no lo avisa nada más que volver a medir»): dos definiciones de
// lo mismo, y la regla de los 109 KB sobreviviendo solo en una.
//
// LO QUE HACE CADA ATRIBUTO, Y POR QUÉ NO SE NEGOCIA:
//  · `preload="none"`   ni un byte de vídeo hasta que alguien le dé al play.
//  · SIN `poster=`      el póster viaja en `data-poster` —texto, no pide
//                       nada— y lo asciende `src/scripts/cv-clips.ts` 400 px
//                       antes del pliegue. Los cuatro pósteres del CV pesaban
//                       109 290 B en la PRIMERA carga por estar escritos aquí.
//  · `controls`         es el mecanismo de pausa de WCAG 2.2.2. No se quitan.
//  · `width`/`height`   las dimensiones REALES del archivo servido: sin ellas
//                       nada reserva la caja y cada llegada empuja la página.
//  · `bucle`            solo los clips MUDOS de b-roll, que mueve cv-clips.ts
//                       con `data-en-vista`. Los que llevan su voz los arranca
//                       una persona.

/**
 * @param {string} src      ruta del clip servido desde este dominio
 * @param {string} etiqueta nombre accesible del vídeo
 * @param {boolean} [bucle] mudo y en bucle (b-roll), lo mueve cv-clips.ts
 * @param {number} [w]      ancho REAL del archivo
 * @param {number} [h]      alto REAL del archivo
 * @param {string} [extra]  clases del componente que lo pinta, si las hay
 */
export const attrsClip = (src, etiqueta, bucle = false, w = 360, h = 640, extra = '') => ({
  class: 'clip-video' + (w > h ? ' clip-video-ancho' : '') + (extra ? ' ' + extra : ''),
  src,
  width: String(w), height: String(h),
  controls: true, playsinline: true, preload: 'none', 'aria-label': etiqueta,
  ...(bucle ? { muted: true, loop: true, 'data-en-vista': '' } : {})
});
