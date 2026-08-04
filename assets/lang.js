/* Idioma: recordar la elección y llevar a la versión correcta en la primera
 * visita.
 *
 * Antes esto era un botón que reescribía los textos con JavaScript. Ahora cada
 * idioma tiene su propia URL y su propio HTML, así que el toggle es un enlace
 * normal y este archivo solo se encarga de dos cosas:
 *
 *   1. Recordar lo que el visitante eligió, para que siga en ese idioma al
 *      navegar por el sitio y al volver otro día.
 *   2. En la PRIMERA visita, si el navegador está en español, llevarlo a la
 *      versión en español.
 *
 * SIN ATRAPAR A NADIE. Esa es la regla de la que cuelga todo lo demás:
 *   - la detección automática ocurre una sola vez, y solo si no hay una
 *     elección guardada;
 *   - en cuanto el visitante toca EN o ES, eso manda para siempre y la
 *     detección no se vuelve a ejecutar;
 *   - si llega con ?lang=en (o cualquier enlace directo a una versión), se
 *     respeta la página que pidió.
 *
 * De dónde saca las URLs: de los <link rel="alternate" hreflang> que ya están
 * en el <head> de cada página. No hay una segunda lista de rutas que se pueda
 * desincronizar con la del generador.
 */

(function () {
  'use strict';

  var CLAVE = 'sf-lang';               // misma clave que usaba el toggle viejo
  var YA_MIRAMOS = 'sf-lang-auto';     // marca de "ya hicimos la detección"

  function guardado() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function guardar(lang) {
    try { localStorage.setItem(CLAVE, lang); } catch (e) { /* modo privado */ }
  }

  // La URL hermana en el otro idioma, tomada del <head>.
  function alternativa(lang) {
    var el = document.querySelector('link[rel="alternate"][hreflang="' + lang + '"]');
    if (!el) return null;
    var href = el.getAttribute('href') || '';
    // Se navega con ruta relativa al sitio: así funciona igual en producción,
    // en un preview de Vercel y en local, sin depender del dominio escrito.
    try { return new URL(href).pathname; } catch (e) { return null; }
  }

  var idiomaPagina = document.documentElement.lang === 'es' ? 'es' : 'en';

  // ---- 1. El toggle recuerda -------------------------------------------
  // Se guarda ANTES de que el navegador siga el enlace, así que al llegar a la
  // otra página la preferencia ya está puesta y la redirección de abajo no
  // intenta devolverlo.
  //
  // Va en DOMContentLoaded porque este script se carga en el <head> SIN defer:
  // la redirección de abajo tiene que ocurrir antes de que se pinte nada, o el
  // visitante ve un parpadeo de la versión equivocada. Los botones todavía no
  // existen en ese momento.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (a) {
      a.addEventListener('click', function () { guardar(a.dataset.lang); });
    });
  });

  // ---- 2. Respetar una elección anterior --------------------------------
  var elegido = guardado();
  if (elegido === 'en' || elegido === 'es') {
    if (elegido !== idiomaPagina) {
      var destino = alternativa(elegido);
      // Solo si esta página tiene hermana: en una que no esté traducida
      // todavía, quedarse es mejor que mandar a un 404.
      if (destino && destino !== location.pathname) {
        location.replace(destino + location.search + location.hash);
      }
    }
    return;   // con elección guardada NO se vuelve a detectar nada
  }

  // ---- 3. Primera visita: detectar el idioma del navegador --------------
  try {
    if (sessionStorage.getItem(YA_MIRAMOS)) return;
    sessionStorage.setItem(YA_MIRAMOS, '1');
  } catch (e) { /* modo privado: se detecta igual, solo que sin marca */ }

  var idiomas = navigator.languages || [navigator.language || ''];
  var quiereEs = idiomas.length && String(idiomas[0]).toLowerCase().indexOf('es') === 0;
  var deseado = quiereEs ? 'es' : 'en';

  if (deseado !== idiomaPagina) {
    var url = alternativa(deseado);
    if (url && url !== location.pathname) {
      // replace y no assign: el botón de atrás debe volver a de donde venía el
      // visitante, no a la versión que acabamos de descartar (que lo
      // redirigiría otra vez y lo dejaría atrapado en el botón de atrás).
      location.replace(url + location.search + location.hash);
    }
  }
})();
