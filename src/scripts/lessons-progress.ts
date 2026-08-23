// Progreso local de las lecciones (sin cuenta, sin servidor): una lista de
// slugs leídos en localStorage. Lo comparten el índice /lessons, el home y la
// página de cada lección. Si localStorage no está (modo privado estricto), todo
// sigue funcionando sin progreso.
export const PROGRESS_KEY = 'sf-lessons-read';

export function readProgress(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
export function isRead(slug: string): boolean { return readProgress().includes(slug); }
export function setRead(slug: string, read: boolean): string[] {
  const cur = readProgress().filter((s) => s !== slug);
  const next = read ? [...cur, slug] : cur;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch {}
  document.dispatchEvent(new CustomEvent('sf:lessons', { detail: next }));
  return next;
}

// ---------------------------------------------------------------- quiz
// El resultado del quiz vive JUNTO al progreso (mismo localStorage, sin
// cuenta y sin servidor), en su propia clave para no ensuciar la lista de
// slugs leídos que ya usan el índice y el home. Se guardan las respuestas
// elegidas, no solo el puntaje, para poder repintar el quiz al volver.
export const QUIZ_KEY = 'sf-lessons-quiz';

/** answers[i] = índice elegido en la pregunta i, o -1 si sigue sin contestar. */
export interface QuizResult { answers: number[]; correct: number; total: number; at: string }

export function readQuiz(): Record<string, QuizResult> {
  try {
    const v = JSON.parse(localStorage.getItem(QUIZ_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, QuizResult>) : {};
  } catch { return {}; }
}

export function getQuiz(slug: string): QuizResult | undefined {
  const r = readQuiz()[slug];
  return r && Array.isArray(r.answers) ? r : undefined;
}

export function setQuiz(slug: string, result: QuizResult | null): void {
  const all = readQuiz();
  if (result) all[slug] = result; else delete all[slug];
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify(all)); } catch {}
  document.dispatchEvent(new CustomEvent('sf:quiz', { detail: { slug, result } }));
}

/** Marca tarjetas [data-lesson] y rellena contadores/barras [data-progress-*]. */
export function paintProgress(root: ParentNode = document) {
  const done = readProgress();
  root.querySelectorAll<HTMLElement>('[data-lesson]').forEach((el) => {
    el.classList.toggle('is-read', done.includes(el.dataset.lesson || ''));
  });
  root.querySelectorAll<HTMLElement>('[data-progress-of]').forEach((box) => {
    const slugs = (box.dataset.progressOf || '').split(',').filter(Boolean);
    const n = slugs.filter((s) => done.includes(s)).length;
    box.querySelectorAll<HTMLElement>('[data-progress-read]').forEach((el) => { el.textContent = String(n); });
    box.querySelectorAll<HTMLElement>('[data-progress-bar]').forEach((el) => { el.style.width = (slugs.length ? (n / slugs.length) * 100 : 0) + '%'; });
    box.classList.toggle('is-complete', slugs.length > 0 && n === slugs.length);
  });
}

if (typeof document !== 'undefined') {
  const run = () => paintProgress();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  document.addEventListener('sf:lessons', run);
}
