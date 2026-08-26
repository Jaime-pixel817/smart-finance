// El campo "CV" de /about. Son cuatro líneas de lógica y lo que importa de
// ellas es lo que NO hacen.
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
// es el atajo y el cierre con Escape, no el acceso.
const form = document.querySelector<HTMLFormElement>('[data-cv-form]');

// ESCAPE CIERRA EL CAMPO. `<details>` nativo no lo hace —abre y cierra con
// Enter y con Espacio, y ahí se acaba— pero en este sitio lo que se abre se
// cierra con Escape: lo hacen los avisos (src/scripts/avisos.ts) y lo dicen
// las reglas. Un campo que se abre con teclado y no se cierra con teclado es
// una trampa pequeña, y esta cae justo encima del enlace al CV.
//
// El foco vuelve al <summary>, que es de donde salió: es lo mismo que ya hacen
// Enter y Espacio, así que la tecla nueva no estrena comportamiento.
//
// Y se para la propagación en vez de dejarla subir a `document`: si además hay
// un aviso puesto, su listener de Escape también dispararía y UNA tecla
// cerraría DOS cosas. La tecla es del widget que tiene el foco dentro. Se
// respeta la misma excepción que avisos.ts: con una hoja modal abierta,
// Escape es suyo primero.
const det = document.querySelector<HTMLDetailsElement>('details.cv-acc');

det?.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !det.open) return;
  if (document.querySelector('[role="dialog"]:not([hidden])')) return;
  e.stopPropagation();
  det.open = false;
  det.querySelector<HTMLElement>('summary')?.focus();
});

/** La región viva del campo vacío. Nace en el HTML y nace VACÍA. */
const aviso = form?.querySelector<HTMLElement>('[data-cv-aviso]');

// El aviso se borra en cuanto se teclea: si no, se queda contradiciendo a un
// campo que ya tiene texto, y la próxima vez que hiciera falta el mismo texto
// ya estaría puesto — o sea, la región viva no anunciaría nada.
form?.querySelector<HTMLInputElement>('input[name="codigo"]')
  ?.addEventListener('input', () => { if (aviso && aviso.textContent) aviso.textContent = ''; });

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const campo = form.querySelector<HTMLInputElement>('input[name="codigo"]');
  const valor = (campo?.value || '').trim();
  // Campo vacío: se devuelve el foco Y SE DICE POR QUÉ. Devolver el foco a
  // secas dejaba el envío mudo: quien no ve la pantalla pulsaba "Abrir", no
  // pasaba nada y no había forma de saber qué había fallado.
  //
  // El texto sale del `data-` que escribió Astro con useT(), no de aquí: este
  // módulo no lleva ni una palabra traducible. Y NO dice "código inválido",
  // porque aquí no se valida nada y decirlo sería mentir sobre cómo funciona
  // esto; lo único que ha pasado es que no hay nada que poner en la dirección.
  if (!valor) {
    if (aviso) aviso.textContent = aviso.dataset.cvAviso || '';
    campo?.focus();
    return;
  }
  if (aviso) aviso.textContent = '';
  // encodeURIComponent y no el valor a pelo: si alguien pega algo con una
  // barra o un espacio, la dirección sigue siendo UN segmento de ruta y el
  // servidor contesta lo que tenga que contestar (un 404) en vez de acabar en
  // otra parte del sitio. Codificar no es comprobar: no se rechaza nada.
  location.href = '/cv/' + encodeURIComponent(valor);
});
