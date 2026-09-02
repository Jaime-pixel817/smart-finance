// Los dos sitios en vivo del CV: quitar la tapa y devolver el marco a la vida.
//
// Son quince líneas y hacen dos cosas que no se pueden hacer en el HTML:
//  · Quitar el `inert` del `<iframe>` SOLO cuando una persona lo pide. Escrito
//    en el HTML, el marco nace fuera del orden de tabulación —o sea sin trampa
//    de foco— y sin JavaScript se queda así para siempre, que es lo correcto:
//    sin JavaScript no hay forma de devolver el foco a quien entre.
//  · Apagar el respaldo cuando el marco carga de verdad. Un `<iframe>` NO
//    dispara `onerror`, así que la única señal fiable es la contraria: si
//    `load` no llega, el respaldo se queda puesto y lo que se ve es la
//    captura, no un rectángulo blanco.
document.querySelectorAll<HTMLElement>('[data-viv]').forEach((fig) => {
  const marco = fig.querySelector<HTMLIFrameElement>('[data-viv-frame]');
  const boton = fig.querySelector<HTMLButtonElement>('[data-viv-activar]');
  if (!marco) return;
  marco.addEventListener('load', () => { fig.setAttribute('data-viv-cargado', ''); });
  if (!boton) return;
  boton.addEventListener('click', () => {
    marco.removeAttribute('inert');
    fig.setAttribute('data-viv-vivo', '');
    // El foco va AL MARCO y no se queda en un botón que acaba de desaparecer.
    marco.focus();
  });
});
