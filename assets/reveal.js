/* Aparición al hacer scroll — para las once páginas.
 *
 * Vivía dentro del <script> de index.html, así que /market, /lessons y las
 * lecciones bajaban completamente quietas. Aquí está el mismo mecanismo, un
 * poco más suave, y compartido.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS
 * ─────────────────────────────────────────────────────────────────────────
 * El contenido es visible por defecto. Este archivo es lo único que puede
 * esconderlo, y solo lo hace cuando ya tiene con qué volver a mostrarlo
 * (IntersectionObserver disponible y sin prefers-reduced-motion). Si algo
 * falla, no se esconde nada: se pierde la animación, nunca el contenido.
 * Y por si acaso hay una red de seguridad a los 3.5 s que enciende todo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO SE LLEVA EL SCROLL POR DELANTE
 * ─────────────────────────────────────────────────────────────────────────
 * Ya hubo un problema de frames en móvil, así que va escrito en contra de
 * eso, no solo evitándolo:
 *
 *   1. CERO listeners de scroll. Todo pasa por IntersectionObserver, que el
 *      navegador resuelve fuera del hilo de scroll. Nada de este archivo
 *      corre mientras el dedo se mueve.
 *   2. Solo se animan opacity y transform. Son las dos propiedades que el
 *      compositor resuelve sin recalcular layout ni repintar. Animar height,
 *      top o filter sí habría costado frames.
 *   3. Cada elemento se deja de observar en cuanto aparece.
 *   4. Y sobre todo: EN CUANTO TERMINA LA TRANSICIÓN SE LIMPIA TODO. Se le
 *      quitan las clases y la variable, así que el elemento vuelve a ser un
 *      nodo normal, sin transition y sin capa de composición. Media página de
 *      elementos con will-change o translate3d permanentes es exactamente la
 *      forma de comerse la memoria de un teléfono; aquí, una vez que pasaste,
 *      no queda nada corriendo ni nada promovido.
 */

(function () {
  'use strict';

  /*
   * Bloques que aparecen enteros. Uno por página, porque cada una tiene su
   * propia estructura:
   *   .reveal                  las secciones del home, que ya lo traían
   *   .mkt-head / .mkt-block   /market
   *   .lessons > .wrap > *     /lessons (no usa <section>)
   *   .article-inner > *       cada lección
   */
  var BLOQUES = [
    '.reveal',
    '.mkt-head', '.mkt-block',
    '.lessons > .wrap > *',
    '.article-inner > *'
  ].join(',');

  /*
   * Rejillas cuyos hijos entran EN ESCALÓN, uno detrás de otro. Es el
   * "ligero escalón entre elementos hermanos": sin esto, seis tarjetas
   * aparecen las seis de golpe y se lee como un parpadeo del bloque entero,
   * no como que el contenido va llegando.
   */
  var REJILLAS = '.market-grid, .content-grid, .mkt-grid, .tips-grid';

  // Tope del escalón. Sin él, la tarjeta 12 de una rejilla esperaría casi un
  // segundo con la pantalla ya quieta, que se siente roto, no elegante.
  var MAX_ESCALON = 6;

  function init() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Si alguien no quiere movimiento, este archivo no hace absolutamente
    // nada: no esconde, no observa, no anima. El CSS de tokens.css también lo
    // apaga por su cuenta, por si la clase llegara a ponerse.
    if (reduce.matches || !('IntersectionObserver' in window)) return;

    var elementos = [];

    Array.prototype.forEach.call(document.querySelectorAll(BLOQUES), function (el) {
      elementos.push(el);
    });

    Array.prototype.forEach.call(document.querySelectorAll(REJILLAS), function (rejilla) {
      Array.prototype.forEach.call(rejilla.children, function (hijo, i) {
        hijo.style.setProperty('--reveal-i', Math.min(i, MAX_ESCALON));
        // Un desplazamiento más corto que el del bloque: la tarjeta se acomoda
        // dentro de un bloque que ya se está acomodando, y sumar los dos
        // movimientos completos se ve como un rebote.
        hijo.style.setProperty('--reveal-y', '12px');
        elementos.push(hijo);
      });
    });

    if (!elementos.length) return;

    elementos.forEach(function (el) { el.classList.add('reveal-el'); });

    function encender(el) {
      el.classList.add('is-in');
      limpiarAlTerminar(el);
    }

    /*
     * La limpieza. Se espera al último transitionend (llegan dos, uno por
     * opacity y otro por transform) y se borra el rastro. El temporizador de
     * respaldo cubre el caso de que la transición no llegue a dispararse
     * —pestaña en segundo plano, por ejemplo—, porque entonces transitionend
     * no ocurre nunca y el elemento se quedaría con su transition puesta.
     */
    function limpiarAlTerminar(el) {
      var hecho = false;
      function limpiar() {
        if (hecho) return;
        hecho = true;
        el.removeEventListener('transitionend', alTerminar);
        el.classList.remove('reveal-el', 'is-in');
        el.style.removeProperty('--reveal-i');
        el.style.removeProperty('--reveal-y');
      }
      function alTerminar(e) {
        if (e.target !== el || e.propertyName !== 'transform') return;
        limpiar();
      }
      el.addEventListener('transitionend', alTerminar);
      setTimeout(limpiar, 1800);
    }

    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        encender(entrada.target);
        io.unobserve(entrada.target);
      });
    }, {
      // Un umbral bajo y un margen negativo abajo: el elemento empieza a
      // aparecer cuando ya entró de verdad, no cuando asoma un pixel.
      threshold: 0.08,
      rootMargin: '0px 0px -48px 0px'
    });

    elementos.forEach(function (el) { io.observe(el); });

    // Red de seguridad. Si por lo que sea algo no llegó a dispararse, se
    // enciende igual: nunca se queda contenido invisible.
    setTimeout(function () {
      elementos.forEach(function (el) {
        if (el.classList.contains('reveal-el')) { encender(el); io.unobserve(el); }
      });
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
