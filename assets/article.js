// Antes aquí vivía el toggle EN/ES de /market, /lessons y las lecciones: leía
// window.ARTICLE_I18N y reescribía los textos de la página al vuelo.
//
// Ese mecanismo se retiró. Cada idioma tiene ahora su propia URL y su propio
// HTML —/lessons/inflacion y /es/lecciones/inflacion son dos archivos, no uno
// con un botón—, que es lo único que Google puede indexar. Las páginas en
// español las genera scripts/build-es.js a partir de estos mismos diccionarios,
// así que window.ARTICLE_I18N sigue en cada página: es la fuente del generador.
//
// El toggle es un enlace normal a la URL hermana, y de recordar la elección y
// de la detección en la primera visita se encarga assets/lang.js.
//
// Este archivo se queda porque las lecciones lo cargan y porque aquí vive el
// acordeón y el resto de la mecánica común; solo se fue la parte del idioma.
(function () {
  'use strict';

  // document.documentElement.lang lo trae el HTML servido, así que todo lo que
  // pregunta por el idioma (charts.js, market.js, news.js) lee el valor
  // correcto desde el primer render y no hay nada que avisar.
  //
  // El evento 'smartfinance:lang' se sigue emitiendo una vez al cargar por si
  // algún módulo se suscribe para pintar su parte: antes lo disparaba el
  // toggle, y sin él esos módulos nunca recibirían la señal inicial.
  document.addEventListener('DOMContentLoaded', function () {
    document.dispatchEvent(new CustomEvent('smartfinance:lang', {
      detail: { lang: document.documentElement.lang === 'es' ? 'es' : 'en' }
    }));
  });
})();
