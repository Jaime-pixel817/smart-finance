// El campo "CV" de /about. Son ocho líneas y las ocho importan por lo que NO
// hacen.
//
// ═══════════════════════════════════════════════════════════════════════════
// AQUÍ NO HAY NINGUNA RESPUESTA CORRECTA, Y POR ESO NO SE PUEDE LEER
// ═══════════════════════════════════════════════════════════════════════════
// Este módulo no compara, no consulta un endpoint, no guarda una lista y no
// tiene un hash contra el que probar. Lo único que hace es construir una
// dirección con lo que se escribió e ir a ella. Si existe el archivo, el CDN
// lo sirve; si no, es el 404 de verdad del servidor.
//
// Eso significa que "ver el código fuente" de /about no da absolutamente
// nada: no hay nada guardado. Un candado que se valida en el navegador
// siempre lleva dentro con qué comparar, y con qué comparar es la respuesta.
//
// Y por eso el botón NO es un `<a href="/cv/…">`: un enlace llevaría la
// dirección dentro del HTML de una página pública e indexada, y la vería
// Google el día del despliegue. La diferencia entre las dos cosas es toda la
// diferencia.
//
// SIN JAVASCRIPT. La caja se abre igual (es un <details>, no lo mueve nadie)
// y dentro hay un <noscript> que dice la dirección a mano. Lo que se pierde
// es el atajo, no el acceso.
const form = document.querySelector<HTMLFormElement>('[data-cv-form]');

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const campo = form.querySelector<HTMLInputElement>('input[name="codigo"]');
  const valor = (campo?.value || '').trim();
  // Campo vacío: se devuelve el foco y ya. Esto no es validar el código —no
  // hay código que validar—, es no navegar a /cv/ a secas.
  if (!valor) { campo?.focus(); return; }
  // encodeURIComponent y no el valor a pelo: si alguien pega algo con una
  // barra o un espacio, la dirección sigue siendo UN segmento de ruta y el
  // servidor contesta lo que tenga que contestar (un 404) en vez de acabar en
  // otra parte del sitio. Codificar no es comprobar: no se rechaza nada.
  location.href = '/cv/' + encodeURIComponent(valor);
});
