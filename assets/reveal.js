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
   * Bloques que aparecen enteros: los que no tienen partes que valga la pena
   * separar, o cuyas partes ya se escalonan por otro lado.
   */
  var BLOQUES = [
    '.mkt-head', '.mkt-block',
    '.article-inner > *'
  ].join(',');

  /*
   * Contenedores cuyos HIJOS entran EN ESCALÓN, uno detrás de otro.
   *
   * QUÉ CAMBIÓ Y POR QUÉ
   * --------------------
   * Antes las secciones del home entraban de una pieza: la sección entera
   * pasaba de opacidad 0 a 1, con el título, el texto y las tarjetas a la vez.
   * Eso se lee como un parpadeo del bloque, no como que el contenido va
   * llegando — que es justo lo que se pedía arreglar.
   *
   * Ahora la sección NO se mueve: se mueven sus partes, en orden. El
   * antetítulo, el titular, la bajada y cada bloque de contenido llegan uno
   * detrás de otro con 65 ms de diferencia. Es el patrón de ondo.finance, y es
   * también más barato: el elemento que se anima es más chico, así que el área
   * que el navegador repinta en cada frame también.
   *
   * Los dos niveles (las partes de la sección, y dentro de una rejilla sus
   * tarjetas) se llevan bien porque el de dentro se mueve menos: 18px el de
   * fuera, 12px el de dentro. Sumar dos recorridos completos se vería como un
   * rebote.
   */
  var GRUPOS = [
    '.reveal > .wrap',      // las seis secciones del home
    '.lessons > .wrap',     // /lessons
    '.about-inner',         // retrato y texto de "About"
    '.footer-inner',        // el pie, que hasta ahora no se movía en ninguna página
    '.market-grid', '.content-grid', '.mkt-grid', '.tips-grid', '.macro-grid'
  ].join(',');

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
    // Sin repetidos: un mismo elemento puede caer en BLOQUES y ser además hijo
    // de un grupo, y observarlo dos veces solo duplica trabajo.
    function anotar(el) {
      if (el.__reveal) return;
      el.__reveal = true;
      elementos.push(el);
    }

    Array.prototype.forEach.call(document.querySelectorAll(BLOQUES), anotar);

    Array.prototype.forEach.call(document.querySelectorAll(GRUPOS), function (grupo) {
      // Anidado dentro de otro grupo (una rejilla dentro de una sección): sus
      // hijos se mueven menos, para que los dos recorridos no se sumen.
      var dentro = !!(grupo.parentNode && grupo.parentNode.closest &&
                      grupo.parentNode.closest(GRUPOS));
      Array.prototype.forEach.call(grupo.children, function (hijo) {
        if (!hijo.getBoundingClientRect) return;
        hijo.style.setProperty('--reveal-y', dentro ? '12px' : '18px');
        anotar(hijo);
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
        delete el.__reveal;
      }
      function alTerminar(e) {
        if (e.target !== el || e.propertyName !== 'transform') return;
        limpiar();
      }
      el.addEventListener('transitionend', alTerminar);
      setTimeout(limpiar, 1800);
    }

    /*
     * EL ESCALÓN SE DECIDE AQUÍ, NO AL PREPARAR.
     *
     * Antes cada hijo llevaba su número de orden escrito desde el principio.
     * Eso funciona en una rejilla, donde las seis tarjetas entran a la vez,
     * pero no en una sección alta: el quinto bloque de "What the market's
     * doing" entra en pantalla él solo, minutos después, y se quedaba
     * esperando 325 ms con la pantalla quieta antes de aparecer. Un retraso
     * heredado de unos hermanos que ya nadie está mirando.
     *
     * El observador avisa EN LOTES: lo que entra en el mismo momento llega en
     * la misma llamada. Así que el escalón se reparte dentro del lote, y quien
     * entra solo entra sin esperar a nadie.
     */
    var io = new IntersectionObserver(function (entradas) {
      var n = 0;
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.style.setProperty('--reveal-i', Math.min(n, MAX_ESCALON));
        n++;
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
