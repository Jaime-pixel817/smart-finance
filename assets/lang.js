/* Idioma: recordar la elección del visitante.
 *
 * Antes esto era un botón que reescribía los textos con JavaScript. Ahora cada
 * idioma tiene su propia URL y su propio HTML, así que el toggle es un enlace
 * normal y este archivo solo se encarga de una cosa: recordar lo que el
 * visitante eligió, para que siga en ese idioma al navegar por el sitio y al
 * volver otro día.
 *
 * NO SE DETECTA EL IDIOMA DEL NAVEGADOR. Quien llega por primera vez a
 * smartfinance.lat ve la versión en inglés, tenga el navegador en el idioma
 * que tenga. El inglés es la versión por omisión del sitio y es a donde apunta
 * el hreflang x-default; que un visitante con el navegador en español acabara
 * en /es sin haberlo pedido hacía que la portada que se enseña —y la que se
 * comparte por link— dependiera de una configuración que ni se ve.
 *
 * Lo que esto NO cambia:
 *   - las URLs /es siguen existiendo y sirviéndose en español. Quien llega
 *     directo a una (por Google o por un enlace) se queda ahí; aquí no hay
 *     nada que lo mande al inglés.
 *   - en cuanto el visitante toca EN o ES, eso manda para siempre, en todas
 *     las páginas y en las visitas siguientes.
 *
 * De dónde saca las URLs: de los <link rel="alternate" hreflang> que ya están
 * en el <head> de cada página. No hay una segunda lista de rutas que se pueda
 * desincronizar con la del generador.
 */

(function () {
  'use strict';

  var CLAVE = 'sf-lang';               // misma clave que usaba el toggle viejo

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
  // la redirección de abajo tiene que ocurrir antes de que se pinte nada, o
  // quien ya eligió idioma ve un parpadeo de la versión equivocada. Los
  // botones todavía no existen en ese momento.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (a) {
      a.addEventListener('click', function () { guardar(a.dataset.lang); });
    });
  });

  // ---- 2. Respetar una elección anterior --------------------------------
  // Sin elección guardada no pasa nada: se sirve la página que se pidió. Esa
  // es la única rama que queda, y por eso una primera visita a / se queda en
  // inglés y una a /es se queda en español.
  var elegido = guardado();
  if (elegido !== 'en' && elegido !== 'es') return;

  if (elegido !== idiomaPagina) {
    var destino = alternativa(elegido);
    // Solo si esta página tiene hermana: en una que no esté traducida todavía,
    // quedarse es mejor que mandar a un 404.
    if (destino && destino !== location.pathname) {
      // replace y no assign: el botón de atrás debe volver a de donde venía el
      // visitante, no a la versión que acabamos de descartar (que lo
      // redirigiría otra vez y lo dejaría atrapado en el botón de atrás).
      location.replace(destino + location.search + location.hash);
    }
  }
})();
