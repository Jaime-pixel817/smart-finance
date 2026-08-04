/* Menú de navegación en móvil.
 *
 * QUÉ HACE
 * --------
 * En pantallas chicas la barra se queda con el logo, el toggle EN/ES y un
 * botón de menú. Los enlaces (Nosotros, Mercado, Lecciones, Suscríbete) pasan
 * a un desplegable que este archivo construye.
 *
 * POR QUÉ EL MENÚ SE GENERA Y NO ESTÁ EN EL HTML
 * ----------------------------------------------
 * Porque el nav está copiado en las once páginas. Meter el markup del menú a
 * mano habría sido pegar el mismo bloque once veces y mantener DOS listas de
 * enlaces por página: la de la barra y la del menú. La primera vez que alguien
 * agregara una sección, se acordaría de una y no de la otra.
 *
 * Aquí se leen los enlaces que YA están en .nav-links y se clonan. Hay una
 * sola lista, la del HTML, y el menú no puede desincronizarse de ella.
 *
 * SIN JAVASCRIPT
 * --------------
 * La clase .has-mobile-menu —la que esconde .nav-links y enciende el botón—
 * la agrega este archivo. Si no corre, no se esconde nada: los enlaces siguen
 * en la barra, apretados pero funcionando. Nunca se llega al caso de "no hay
 * enlaces y tampoco hay botón que los abra".
 *
 * ALTURA DE LA BARRA
 * ------------------
 * De paso publica --nav-h con la altura real medida. El hero la necesita para
 * calcular su alto en móvil, y antes era un 61px escrito a mano con un
 * comentario avisando de que había que actualizarlo si cambiaba el padding.
 * Ahora se mide sola.
 */

(function () {
  'use strict';

  function init() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    var inner = nav.querySelector('.nav-inner');
    var links = nav.querySelector('.nav-links');
    var right = nav.querySelector('.nav-right');
    if (!inner || !links || !right) return;

    // ---- El desplegable, clonado de los enlaces que ya existen ----------
    var panel = document.createElement('div');
    panel.className = 'nav-mobile';
    panel.id = 'navMobile';

    var panelInner = document.createElement('div');
    panelInner.className = 'nav-mobile-inner';

    Array.prototype.forEach.call(links.children, function (a) {
      if (a.tagName !== 'A') return;
      var copia = a.cloneNode(true);
      // Los data-i18n se quitan del clon: scripts/build-es.js recorre el HTML
      // buscando esos atributos para traducir, y este nodo no existe en el
      // archivo — nace ya traducido, clonado del original que sí se tradujo.
      copia.removeAttribute('data-i18n');
      copia.removeAttribute('data-i18n-html');
      copia.removeAttribute('id');
      panelInner.appendChild(copia);
    });
    panel.appendChild(panelInner);

    // ---- El botón ------------------------------------------------------
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'navMobile');
    // El nombre accesible va en el idioma de la página: es un botón sin texto
    // visible, así que esto es lo único que anuncia un lector de pantalla.
    var es = document.documentElement.lang === 'es';
    btn.setAttribute('aria-label', es ? 'Abrir menú' : 'Open menu');
    btn.innerHTML = '<span></span><span></span><span></span>';

    // Después del toggle de idioma: el orden visual de izquierda a derecha es
    // logo · EN/ES · menú, y el orden del DOM es el mismo, así que tabular
    // recorre la barra en el orden en el que se ve.
    right.appendChild(btn);
    nav.appendChild(panel);
    nav.classList.add('has-mobile-menu');

    function abrir(si) {
      nav.classList.toggle('is-open', si);
      btn.setAttribute('aria-expanded', si ? 'true' : 'false');
      btn.setAttribute('aria-label',
        si ? (es ? 'Cerrar menú' : 'Close menu') : (es ? 'Abrir menú' : 'Open menu'));
    }

    btn.addEventListener('click', function () {
      abrir(!nav.classList.contains('is-open'));
    });

    // Tocar un enlace cierra el menú. Importa sobre todo con las anclas
    // (#about, #newsletter): ahí no hay navegación que recargue la página, así
    // que sin esto el menú se quedaría abierto tapando justo la sección a la
    // que se acaba de saltar.
    panelInner.addEventListener('click', function (e) {
      if (e.target.closest('a')) abrir(false);
    });

    // Escape cierra, y devuelve el foco al botón: quien navega con teclado no
    // se queda con el foco dentro de un panel que ya no se ve.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        abrir(false);
        btn.focus();
      }
    });

    // Al pasar a escritorio el menú se cierra solo: si se deja abierto, la
    // clase is-open se queda puesta y al volver a girar el teléfono aparece
    // desplegado sin que nadie lo haya tocado.
    var ancho = window.matchMedia('(max-width: 860px)');
    var alCambiar = function (e) { if (!e.matches) abrir(false); };
    if (ancho.addEventListener) ancho.addEventListener('change', alCambiar);
    else if (ancho.addListener) ancho.addListener(alCambiar);

    // ---- Altura real de la barra ---------------------------------------
    function medir() {
      var h = nav.getBoundingClientRect().height;
      if (h) document.documentElement.style.setProperty('--nav-h', Math.round(h) + 'px');
    }
    medir();
    // Se vuelve a medir al cambiar el tamaño. ResizeObserver y no el evento
    // resize porque la barra también cambia de alto cuando carga la fuente y
    // el logo pasa de la de respaldo a Fraunces, y eso no dispara un resize.
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(nav);
    else window.addEventListener('resize', medir);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
