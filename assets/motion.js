/* Primitivas de movimiento compartidas por las once páginas.
 *
 * POR QUÉ EXISTE
 * --------------
 * Tres cosas distintas necesitan exactamente la misma pregunta —"¿es la
 * primera vez que esto aparece en pantalla?"— y la misma respuesta cuando la
 * respuesta es "no se puede animar":
 *
 *   assets/charts.js   la línea de las gráficas, que se traza al aparecer
 *   assets/market.js   las mini-gráficas de las tarjetas de cripto
 *   index.html         los números que entran deslizándose desde abajo
 *
 * Estaba a punto de escribirse tres veces, con tres criterios distintos de
 * cuándo rendirse. Aquí está una vez.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LA REGLA QUE MANDA (la misma de assets/reveal.js)
 * ───────────────────────────────────────────────────────────────────────────
 * El contenido es visible por defecto. Nada de esto puede esconder algo si no
 * tiene con qué volver a mostrarlo. De ahí sale puedeAnimar(): quien vaya a
 * esconder para animar TIENE que preguntar primero, y si dice que no, dibujar
 * el estado final directamente. Sin IntersectionObserver o con
 * prefers-reduced-motion, en este archivo no se esconde nada.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POR QUÉ NO HAY UNA RED DE SEGURIDAD POR TIEMPO A SECAS
 * ───────────────────────────────────────────────────────────────────────────
 * reveal.js enciende todo lo que quede pendiente a los 3.5 s. Aquí eso sería
 * un error: la gráfica del VIX está a tres pantallas de distancia y su
 * animación tiene que esperar a que alguien llegue, aunque tarde un minuto.
 * Un temporizador ciego se la comería antes de que nadie la viera.
 *
 * La red que sí hay comprueba GEOMETRÍA, no tiempo: a los 4 segundos, si el
 * elemento está dentro de la pantalla y el observador no ha dicho nada, se
 * dispara igual (algo falló). Si está fuera de la pantalla, no se toca: ahí el
 * observador está haciendo su trabajo, que es esperar.
 */
(function () {
  'use strict';

  var DUR_TRAZO = 1000;   // gráficas grandes
  var DUR_SPARK = 800;    // mini-gráficas de las tarjetas
  // Arranca rápido y frena largo: la línea "llega y se asienta" en vez de
  // avanzar a velocidad constante. Es la misma curva de las apariciones de
  // assets/tokens.css, para que todo el sitio se mueva igual.
  var CURVA = 'cubic-bezier(.22,.61,.36,1)';

  function reducido() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function puedeAnimar() {
    return ('IntersectionObserver' in window) && !reducido();
  }

  /*
   * Llama a cb(animar) UNA sola vez.
   *   cb(true)   entró en pantalla: anima.
   *   cb(false)  no se puede animar (sin observador o sin movimiento): pinta
   *              el estado final y ya.
   * Con cb(false) la llamada es SÍNCRONA, así que quien esconde puede
   * preguntar y decidir en la misma línea.
   */
  function alPrimerVistazo(el, cb, opciones) {
    if (!el) return;
    opciones = opciones || {};
    if (!puedeAnimar()) { cb(false); return; }

    var hecho = false;
    var io = null;
    var red = 0;

    function disparar(animar) {
      if (hecho) return;
      hecho = true;
      if (io) io.disconnect();
      if (red) clearTimeout(red);
      cb(animar);
    }

    io = new IntersectionObserver(function (entradas) {
      for (var i = 0; i < entradas.length; i++) {
        if (entradas[i].isIntersecting) { disparar(true); return; }
      }
    }, {
      threshold: opciones.threshold != null ? opciones.threshold : 0.2,
      rootMargin: opciones.rootMargin || '0px 0px -40px 0px'
    });
    io.observe(el);

    // La red geométrica descrita arriba.
    red = setTimeout(function () {
      if (hecho) return;
      var r = el.getBoundingClientRect();
      var enPantalla = r.bottom > 0 && r.top < (window.innerHeight || 0);
      if (enPantalla) disparar(true);
    }, 4000);
  }

  /*
   * Traza un <path> de SVG de principio a fin.
   *
   * Va con stroke-dashoffset y no con un recorte animado porque el trazo de
   * una mini-gráfica mide 100 unidades de viewBox: el navegador resuelve la
   * transición sin volver a maquetar nada, solo repinta el path. Es repintado,
   * sí —dashoffset no lo puede hacer el compositor— pero el área que repinta
   * son 54x16 px en el chip y unos 150x40 en la tarjeta. Comparado con
   * promover cada tarjeta a su propia capa, sale muchísimo más barato.
   *
   * ESCONDE AL LLAMAR. Quien llame ya tuvo que preguntar por puedeAnimar():
   * si no se puede, no se llama a esto y la línea se queda dibujada.
   */
  function prepararTrazo(path) {
    if (!path || typeof path.getTotalLength !== 'function') return 0;
    var largo = 0;
    try { largo = path.getTotalLength(); } catch (e) { return 0; }
    if (!largo || !isFinite(largo)) return 0;
    path.style.strokeDasharray = largo;
    path.style.strokeDashoffset = largo;
    return largo;
  }

  function trazar(path, dur) {
    if (!path) return;
    dur = dur || DUR_SPARK;
    // Leer una medida obliga al navegador a quedarse con el estado escondido
    // como punto de partida; sin esto, poner y quitar el dashoffset en el
    // mismo frame se resuelve como que nunca cambió y no hay transición.
    void path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset ' + dur + 'ms ' + CURVA;
    path.style.strokeDashoffset = '0';
    limpiarAlTerminar(path, dur, function () {
      // Se borra TODO el rastro: sin transition puesta y sin dasharray, el
      // path vuelve a ser un path normal. Dejar la transición puesta significa
      // que cualquier repintado posterior vuelve a animarse solo.
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    });
  }

  /* Espera al transitionend y, por si no llega (pestaña en segundo plano),
   * limpia igual por temporizador. Una sola de las dos. */
  function limpiarAlTerminar(el, dur, fn) {
    var hecho = false;
    function limpiar() {
      if (hecho) return;
      hecho = true;
      el.removeEventListener('transitionend', alTerminar);
      fn();
    }
    function alTerminar(e) { if (e.target === el) limpiar(); }
    el.addEventListener('transitionend', alTerminar);
    setTimeout(limpiar, dur + 400);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * NÚMEROS QUE ENTRAN DESDE ABAJO
   * ═══════════════════════════════════════════════════════════════════════
   *
   * El número sube hasta su sitio y lo que asoma por debajo queda recortado,
   * como si saliera de detrás de una línea.
   *
   * NO ES UN CONTADOR. El valor es el definitivo desde el primer fotograma:
   * lo único que se mueve es la POSICIÓN. Son precios en vivo, y enseñar un
   * número que no es el real —aunque sea medio segundo— no es un efecto, es
   * un dato falso.
   *
   * POR QUÉ EL RECORTE ES clip-path Y NO overflow:hidden
   * ----------------------------------------------------
   * overflow:hidden habría sido lo obvio, pero cambia la LÍNEA BASE del
   * elemento: por especificación, una caja con overflow distinto de visible
   * deja de alinearse por el texto y pasa a alinearse por su borde inferior.
   * Y estos números viven casi todos dentro de contenedores flex con
   * align-items:baseline (.fx-chart-head, .vix-head, .rate-row), así que el
   * precio se habría descolocado respecto a su etiqueta al empezar la
   * animación y habría dado un salto al terminar.
   *
   * clip-path no toca la maquetación: recorta al pintar. El elemento sigue
   * midiendo y alineándose exactamente igual que antes.
   *
   * SE ENVUELVE Y SE DESENVUELVE
   * ----------------------------
   * Hace falta que lo que se mueve y lo que recorta sean dos cosas distintas
   * (si el recorte se moviera con el número, no recortaría nada). Como el
   * texto de estos elementos lo escribe JavaScript con textContent, no se
   * puede dejar un <span> fijo dentro: el primer refresco se lo llevaría. Así
   * que la envoltura se pone al empezar la animación y se quita al terminar,
   * y entre medias el elemento vuelve a quedar exactamente como estaba.
   */
  var DUR_NUM = 720;
  var ESCALON_NUM = 70;   // ms entre hermanos
  var MAX_ESCALON_NUM = 6;

  function conValor(el) {
    if (!el) return false;
    if (el.querySelector && el.querySelector('.skel')) return false;   // esqueleto
    var t = (el.textContent || '').replace(/\s| /g, '');
    return !!t && t !== '—';
  }

  function animarNumero(el, indice) {
    if (!el || el.__num) return;
    el.__num = true;

    var envoltura = document.createElement('span');
    envoltura.className = 'num-sube';
    while (el.firstChild) envoltura.appendChild(el.firstChild);
    el.appendChild(envoltura);

    el.style.setProperty('--num-i', indice || 0);
    el.classList.add('num-mask');
    // Un frame con la posición de salida ya aplicada; sin esto el navegador
    // resuelve poner y quitar el transform como que nunca pasó nada.
    void el.getBoundingClientRect();
    el.classList.add('num-in');

    limpiarAlTerminar(envoltura, DUR_NUM + (indice || 0) * ESCALON_NUM, function () {
      // Se deshace todo: fuera el recorte, fuera la transición, fuera la
      // envoltura. El elemento queda como un nodo normal, sin nada promovido.
      el.classList.remove('num-mask', 'num-in');
      el.style.removeProperty('--num-i');
      if (envoltura.parentNode === el) {
        while (envoltura.firstChild) el.insertBefore(envoltura.firstChild, envoltura);
        el.removeChild(envoltura);
      }
    });
  }

  /*
   * Anima los números de un contenedor cuando el CONTENEDOR entra en pantalla
   * (no cada número por su cuenta): así los hermanos llegan escalonados en vez
   * de cada uno con su propio retraso suelto.
   *
   * Se puede llamar en cada repintado. Solo se engancha la primera vez que hay
   * datos de verdad: mientras solo haya esqueletos, sale sin hacer nada y se
   * vuelve a intentar en el siguiente pintado.
   */
  function numeros(cont, que) {
    if (!cont || cont.__numLista) return;
    // "que" puede ser un selector (tarjetas que se repintan enteras) o una
    // lista de elementos fijos (el valor y el cambio de una gráfica, que
    // siempre son los mismos nodos y solo cambian de textContent).
    var lista = typeof que === 'string' ? cont.querySelectorAll(que) : que;
    var hay = false;
    for (var i = 0; i < lista.length; i++) { if (conValor(lista[i])) { hay = true; break; } }
    if (!hay) return;

    cont.__numLista = true;
    if (!puedeAnimar()) return;   // se quedan visibles y quietos

    alPrimerVistazo(cont, function (animar) {
      if (!animar) return;
      // Con selector se vuelve a consultar aquí: entre que se enganchó y que
      // entró en pantalla puede haber habido un refresco, y los nodos de
      // entonces ya no estarían en el documento.
      var actuales = typeof que === 'string' ? cont.querySelectorAll(que) : que;
      var n = 0;
      for (var j = 0; j < actuales.length; j++) {
        if (!conValor(actuales[j])) continue;
        animarNumero(actuales[j], Math.min(n, MAX_ESCALON_NUM));
        n++;
      }
    }, { threshold: 0.25 });
  }

  window.SmartMotion = {
    DUR_NUM: DUR_NUM,
    numeros: numeros,
    DUR_TRAZO: DUR_TRAZO,
    DUR_SPARK: DUR_SPARK,
    CURVA: CURVA,
    reducido: reducido,
    puedeAnimar: puedeAnimar,
    alPrimerVistazo: alPrimerVistazo,
    prepararTrazo: prepararTrazo,
    trazar: trazar,
    limpiarAlTerminar: limpiarAlTerminar
  };
})();
