// ═══════════════════════════════════════════════════════════════════════════
// EL MOVIMIENTO DEL CV (ola 4): M2, M3 y M7 del catálogo de spec-ola4-sitios §B
// ═══════════════════════════════════════════════════════════════════════════
// Las reglas de estilo viven en src/styles/motion.css (sección «El CV»); este
// guion solo pone y quita atributos. Y ESCONDE ÉL, no el CSS (regla de
// Base.astro): sin JavaScript no hay `data-entra` ni `data-carga` en el DOM y
// todo está visible desde el primer pintado.
//
//  M2 · La cabecera de cada capítulo (número → titular → resumen) entra 12 px
//       en 240 ms, escalonada 40 ms, UNA vez, cuando el titular cruza el 65 %
//       del viewport (Ondo). Las cabeceras que ya están a la vista al cargar
//       no se esconden: esconder lo que el lector ya vio es un parpadeo.
//  M3 · Cada foto `loading="lazy"` del cuerpo aparece en 180 ms de opacidad
//       sobre una caja ya reservada (`width`/`height`): 0 CLS.
//  M7 · Las miniaturas de 154 (`a[data-abre-foto]`) abren la foto al natural
//       en UN `<dialog>` compartido, 400 ms. Escape cierra, el foco vuelve al
//       enlace solo (es lo que hace `<dialog>`), y sin `showModal` el enlace
//       sigue siendo un enlace: abre la foto en la pestaña.
//
// Con «menos movimiento» no se hace nada: los tokens ya valen .01 ms y 0 px,
// pero además aquí no se esconde ni una cabecera ni una foto.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── POR QUÉ ESTO NO ES UN `isIntersecting` A SECAS ─────────────────────────
// Lo era, con `rootMargin: '0px 0px -35% 0px'`, y dejaba cabeceras invisibles
// PARA SIEMPRE. Lo cazó `npm run check-sistema-cv` (prueba 8b) el 2026-09-04 y
// está medido en los dos motores a 1920 × 1080:
//
//   webkit   1920 · «02 / 10» y el titular del capítulo 3 (y=5 853 y 5 899)
//   chromium 1920 · «06 / 10» y el titular del capítulo 7 (y=14 533 y 14 579)
//
// El mecanismo: con ese `rootMargin` la raíz del observador no es la ventana,
// es una banda de su 65 % — 702 px de los 1 080. Un `IntersectionObserver` no
// avisa por fotograma sino cuando CRUZA un umbral, así que un salto de scroll
// más largo que la banda puede llevar al titular de «debajo de la banda» a
// «encima de la banda» sin que llegue a estar dentro en ningún fotograma: no
// se cruza ningún umbral, no llega ninguna entrada, y el `data-entra` se queda
// sin encender. El salto que lo destapó es el del propio guardián (0.8 × alto
// de ventana = 864 px, más que los 702 de la banda), pero es exactamente lo
// que hace en la vida real un `Fin`, un ancla del índice o un empujón fuerte
// con dos dedos.
//
// EN CHROME NO SE VE, Y ESO ES LO PEOR DEL ASUNTO: ahí la regla de
// `@supports (animation-timeline: view())` de Historia.astro anima las mismas
// tres piezas con el scroll y las deja a opacidad 1 igual. En el Safari 16.6
// de Jaime ese `@supports` es falso, no hay nada detrás, y la cabecera del
// capítulo se queda en blanco mientras él lee el resto.
//
// El arreglo no cambia CUÁNDO entra (sigue siendo al cruzar el 65 %): cambia
// quién lo decide. El observador pasa a mirar la ventana entera —que no se
// puede saltar con un salto más corto que la propia ventana— y la línea del
// 65 % se comprueba con geometría, sobre TODAS las cabeceras que quedan
// pendientes, cada vez que llega cualquier entrada. Una que se haya quedado
// atrás se enciende en la siguiente entrada de cualquier otra. Son ocho
// `getBoundingClientRect` por aviso, y los avisos llegan al cruzar un borde,
// no por fotograma.
function cabeceras(): void {
  if (reduce || !('IntersectionObserver' in window)) return;
  const pendientes = new Set<HTMLElement>();
  const encender = (h: HTMLElement): void => {
    const cap = h.closest<HTMLElement>('.cap');
    cap?.querySelectorAll('[data-entra]').forEach((el) => el.setAttribute('data-entra', 'si'));
    pendientes.delete(h);
    io.unobserve(h);
  };
  // Se barre TODO lo pendiente, no solo lo que trae la entrada: la cabecera
  // que se saltó el salto ya no va a generar avisos propios.
  const barrer = (): void => {
    for (const h of [...pendientes]) {
      if (h.getBoundingClientRect().top < innerHeight * 0.65) encender(h);
    }
  };
  const io = new IntersectionObserver(barrer);
  document.querySelectorAll<HTMLElement>('.cap:not(.cap-portada)').forEach((cap) => {
    const h = cap.querySelector<HTMLElement>(':scope > .cap-h');
    if (!h || h.getBoundingClientRect().top < innerHeight * 0.65) return;
    const piezas = [':scope > .cap-num', ':scope > .cap-h', ':scope > .cap-h + .cap-lede']
      .map((s) => cap.querySelector<HTMLElement>(s))
      .filter((el): el is HTMLElement => !!el);
    piezas.forEach((el, i) => { el.setAttribute('data-entra', ''); el.setAttribute('data-entra-n', String(i + 1)); });
    pendientes.add(h);
    io.observe(h);
  });
}

function fundido(): void {
  if (reduce) return;
  document.querySelectorAll<HTMLImageElement>('.cap img[loading="lazy"]').forEach((img) => {
    if (img.complete) return;
    img.setAttribute('data-carga', '');
    const listo = () => img.setAttribute('data-carga', 'si');
    img.addEventListener('load', listo, { once: true });
    img.addEventListener('error', listo, { once: true });
    // Red de seguridad: pase lo que pase con `load`, a los 2.5 s la foto se ve.
    // Una foto que no llega a verse es peor que una que no se funde.
    setTimeout(listo, 2500);
  });
}

function dialogo(): void {
  let dlg: HTMLDialogElement | null = null;
  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element).closest<HTMLAnchorElement>('a[data-abre-foto]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'cv-dialog';
      dlg.innerHTML = '<img alt="" decoding="async">';
      // Clic fuera de la foto (el propio <dialog> es el fondo): cerrar.
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg!.close(); });
      document.body.append(dlg);
    }
    if (typeof dlg.showModal !== 'function') return;
    ev.preventDefault();
    const grande = dlg.querySelector('img')!;
    const mini = a.querySelector('img');
    grande.src = a.href;
    grande.alt = mini?.alt ?? '';
    dlg.showModal();
  });
}

cabeceras();
fundido();
dialogo();
