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
 * LA URL PEDIDA MANDA SOBRE LA PREFERENCIA GUARDADA.
 *
 * Esto es lo que cambió. La cabecera de este archivo ya prometía que "quien
 * llega directo a una URL /es se queda ahí", pero el código hacía lo
 * contrario: comparaba la preferencia con el idioma de CUALQUIER página y
 * redirigía si no coincidían. Quien alguna vez tocó EN se quedaba con "en"
 * guardado para siempre, y a partir de ahí cada visita a /es —incluida la de
 * alguien que abría un enlace compartido en español— se la comía un
 * location.replace() hacia la versión inglesa. El enlace que mandas a otra
 * persona no puede depender de lo que esa persona tocó en este sitio hace
 * meses.
 *
 * La regla ahora es una sola, y se decide por la URL:
 *
 *   - Pediste una URL con idioma (/es, /es/mercado, /lessons/sp500...): esa
 *     es una elección explícita. Se sirve tal cual y ADEMÁS se adopta como la
 *     preferencia nueva. Nunca se redirige.
 *
 *   - Pediste la raíz (/) a secas: ahí no dijiste en qué idioma la quieres, y
 *     es el único caso ambiguo del sitio. Solo ahí decide lo guardado. Sin
 *     nada guardado te quedas en inglés, que es el x-default.
 *
 * Por qué el toggle sigue guardando en el click, si la página de destino ya
 * guarda al cargar: el botón EN apunta a /, que es justo el caso ambiguo. Si
 * no se guardara "en" ANTES de navegar, se llegaría a / con "es" todavía
 * guardado y la regla de la raíz devolvería al visitante a /es de inmediato:
 * el botón EN no funcionaría nunca. Guardar en el click es lo que rompe ese
 * ciclo.
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
  // otra página la preferencia ya está puesta y la regla de la raíz no intenta
  // devolverlo. Ver la nota sobre el botón EN en la cabecera.
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

  // ---- 2. ¿Pidió la raíz, o pidió un idioma? ----------------------------
  // location.pathname es "/" solo en la portada inglesa. Cualquier otra ruta
  // —/es, /es/mercado, /market, /lessons/...— lleva el idioma escrito en la
  // URL. cleanUrls y trailingSlash:false (ver vercel.json) garantizan que la
  // raíz llegue siempre como "/" exacto, sin index.html ni barra de más.
  var esRaiz = location.pathname === '/' || location.pathname === '';

  if (!esRaiz) {
    // Elección explícita: la URL manda y se convierte en la preferencia. Aquí
    // no se redirige nunca, ni siquiera si lo guardado dice lo contrario.
    if (guardado() !== idiomaPagina) guardar(idiomaPagina);
    return;
  }

  // ---- 3. En la raíz, y solo en la raíz, decide lo guardado -------------
  // Sin elección guardada no pasa nada: se queda en inglés, que es el
  // x-default. Tampoco se guarda "en" aquí — la raíz no es una elección de
  // idioma, y anotarla como tal pisaría la preferencia de quien venía leyendo
  // en español.
  var elegido = guardado();
  if (elegido !== 'en' && elegido !== 'es') return;
  if (elegido === idiomaPagina) return;

  var destino = alternativa(elegido);
  // Solo si esta página tiene hermana: en una que no esté traducida todavía,
  // quedarse es mejor que mandar a un 404.
  if (destino && destino !== location.pathname) {
    // replace y no assign: el botón de atrás debe volver a de donde venía el
    // visitante, no a la versión que acabamos de descartar (que lo
    // redirigiría otra vez y lo dejaría atrapado en el botón de atrás).
    location.replace(destino + location.search + location.hash);
  }
})();
