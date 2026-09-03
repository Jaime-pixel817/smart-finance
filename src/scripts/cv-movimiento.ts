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

function cabeceras(): void {
  if (reduce || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const cap = e.target.closest<HTMLElement>('.cap');
      cap?.querySelectorAll('[data-entra]').forEach((el) => el.setAttribute('data-entra', 'si'));
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -35% 0px' });
  document.querySelectorAll<HTMLElement>('.cap:not(.cap-portada)').forEach((cap) => {
    const h = cap.querySelector<HTMLElement>(':scope > .cap-h');
    if (!h || h.getBoundingClientRect().top < innerHeight * 0.65) return;
    const piezas = [':scope > .cap-num', ':scope > .cap-h', ':scope > .cap-h + .cap-lede']
      .map((s) => cap.querySelector<HTMLElement>(s))
      .filter((el): el is HTMLElement => !!el);
    piezas.forEach((el, i) => { el.setAttribute('data-entra', ''); el.setAttribute('data-entra-n', String(i + 1)); });
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
