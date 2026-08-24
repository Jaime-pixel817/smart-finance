// Página de lección: marcar como leída (botón y automático al llegar al final)
// y estado inicial desde localStorage.
import { isRead, setRead } from './lessons-progress';
import { medirUnaVez } from '../lib/analytics';

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
  // Solo cuenta terminarla: desmarcarla no es un evento, es corregir un clic.
  btn?.addEventListener('click', () => {
    const ahora = !isRead(slug);
    setRead(slug, ahora); paint();
    if (ahora) medirUnaVez('leccion_terminada', { leccion: slug });
  });
  // Al llegar al final del cuerpo se marca sola (una vez).
  const end = page.querySelector('[data-lesson-end]');
  if (end && 'IntersectionObserver' in window && !isRead(slug)) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setRead(slug, true); paint(); io.disconnect();
        medirUnaVez('leccion_terminada', { leccion: slug });
      }
    }, { threshold: 0.5 });
    io.observe(end);
  }
  paint();
  document.addEventListener('sf:lessons', paint);
}
