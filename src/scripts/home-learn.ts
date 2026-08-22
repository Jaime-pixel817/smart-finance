// "Sigue aprendiendo" del home: marca las lecciones leídas en el carrusel y
// convierte la tarjeta grande en "Continuar" con la siguiente lección sin leer
// (primero dentro de la ruta Desde cero, luego las demás). Todo local.
import { readProgress, paintProgress } from './lessons-progress';

type L = { slug: string; href: string; title: string; desc: string; min: number; path: string; i: number; n: number };
const card = document.querySelector<HTMLAnchorElement>('[data-learn-next]');
function update() {
  paintProgress();
  if (!card) return;
  let list: L[] = [];
  try { list = JSON.parse(card.dataset.lessons || '[]'); } catch { list = []; }
  const done = readProgress();
  if (!list.length || !done.length) return;
  const next = list.find((l) => !done.includes(l.slug));
  const set = (sel: string, text: string) => { const el = card.querySelector<HTMLElement>(sel); if (el) el.textContent = text; };
  if (!next) { set('[data-learn-kicker]', '✓'); set('[data-learn-cta]', card.dataset.start || ''); return; }
  card.href = next.href;
  set('[data-learn-kicker]', card.dataset.continue || '');
  set('[data-learn-path]', next.path);
  set('[data-learn-pos]', next.i + '/' + next.n);
  set('[data-learn-title]', next.title);
  set('[data-learn-desc]', next.desc);
  set('[data-learn-min]', String(next.min));
  set('[data-learn-cta]', card.dataset.continue || '');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update); else update();
document.addEventListener('sf:lessons', update);
