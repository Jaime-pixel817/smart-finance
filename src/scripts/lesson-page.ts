// Página de lección: marcar como leída (botón y automático al llegar al final)
// y estado inicial desde localStorage.
import { isRead, setRead } from './lessons-progress';

const page = document.querySelector<HTMLElement>('[data-lesson-page]');
if (page) {
  const slug = page.dataset.lessonPage || '';
  const btn = page.querySelector<HTMLButtonElement>('[data-mark-read]');
  function paint() {
    const done = isRead(slug);
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(done));
    btn.textContent = done ? (btn.dataset.labelDone || '✓') : (btn.dataset.labelRead || '');
  }
  btn?.addEventListener('click', () => { setRead(slug, !isRead(slug)); paint(); });
  // Al llegar al final del cuerpo se marca sola (una vez).
  const end = page.querySelector('[data-lesson-end]');
  if (end && 'IntersectionObserver' in window && !isRead(slug)) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setRead(slug, true); paint(); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(end);
  }
  paint();
  document.addEventListener('sf:lessons', paint);
}
