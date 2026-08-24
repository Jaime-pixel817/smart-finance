// Quiz de comprensión de una lección (src/components/learn/Quiz.astro).
//
// Sin backend: las respuestas correctas y la explicación ya vienen pintadas en
// el HTML desde el frontmatter del MDX, así que aquí solo se escucha el cambio
// del radio, se marca acierto o error, se destapa el porqué y se guarda el
// resultado en localStorage junto al progreso de lecturas.
//
// Ningún texto vive en este archivo: las plantillas del marcador y las
// palabras "Correcto"/"Casi" viajan en data-* desde el componente, que las saca
// de src/i18n/ui.ts. Así el mismo script sirve en inglés y en español.
import { getQuiz, setQuiz } from './lessons-progress';
import { medir } from '../lib/analytics';

function montar(raiz: HTMLElement) {
  const slug = raiz.dataset.quiz || '';
  const preguntas = Array.from(raiz.querySelectorAll<HTMLElement>('[data-quiz-q]'));
  if (!preguntas.length) return;
  const total = preguntas.length;
  const marcador = raiz.querySelector<HTMLElement>('[data-quiz-score]');
  const reiniciar = raiz.querySelector<HTMLButtonElement>('[data-quiz-reset]');
  const txt = {
    right: raiz.dataset.right || '',
    wrong: raiz.dataset.wrong || '',
    pending: raiz.dataset.tplPending || '',
    progress: raiz.dataset.tplProgress || '',
    score: raiz.dataset.tplScore || '',
    perfect: raiz.dataset.perfect || ''
  };

  /** -1 = sin contestar. */
  const elegidas: number[] = preguntas.map(() => -1);

  function opciones(q: HTMLElement) {
    return Array.from(q.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  }

  function pintarPregunta(i: number) {
    const q = preguntas[i];
    const correcta = Number(q.dataset.answer);
    const elegida = elegidas[i];
    const acerto = elegida === correcta;
    for (const input of opciones(q)) {
      const etiqueta = input.closest<HTMLElement>('.quiz-opt');
      if (!etiqueta) continue;
      const j = Number(input.value);
      etiqueta.classList.remove('is-right', 'is-wrong');
      if (elegida < 0) continue;
      // Al fallar se marca también la correcta: el objetivo es que se vea
      // cuál era, no que se adivine en el siguiente intento.
      if (j === correcta) etiqueta.classList.add('is-right');
      else if (j === elegida) etiqueta.classList.add('is-wrong');
    }
    const why = q.querySelector<HTMLElement>('[data-quiz-why]');
    const verdict = q.querySelector<HTMLElement>('[data-quiz-verdict]');
    if (why) {
      why.hidden = elegida < 0;
      why.classList.toggle('is-right', elegida >= 0 && acerto);
      why.classList.toggle('is-wrong', elegida >= 0 && !acerto);
    }
    if (verdict) verdict.textContent = elegida < 0 ? '' : acerto ? txt.right : txt.wrong;
  }

  function aciertos() {
    return preguntas.reduce((n, q, i) => n + (elegidas[i] === Number(q.dataset.answer) ? 1 : 0), 0);
  }

  function pintarMarcador() {
    const contestadas = elegidas.filter((v) => v >= 0).length;
    const bien = aciertos();
    const listo = contestadas === total;
    if (marcador) {
      marcador.classList.toggle('is-done', listo);
      marcador.textContent = contestadas === 0
        ? txt.pending
        : !listo
          ? txt.progress.replace('{done}', String(contestadas)).replace('{total}', String(total))
          : (bien === total && txt.perfect ? txt.perfect : txt.score.replace('{n}', String(bien)).replace('{total}', String(total)));
    }
    if (reiniciar) reiniciar.hidden = contestadas === 0;
  }

  function guardar() {
    const contestadas = elegidas.filter((v) => v >= 0).length;
    if (!contestadas) { setQuiz(slug, null); return; }
    setQuiz(slug, { answers: elegidas.slice(), correct: aciertos(), total, at: new Date().toISOString().slice(0, 10) });
  }

  for (const [i, q] of preguntas.entries()) {
    for (const input of opciones(q)) {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        elegidas[i] = Number(input.value);
        pintarPregunta(i);
        pintarMarcador();
        guardar();
        // Viaja el slug de la lección y si acertó, nunca qué opción eligió.
        medir('quiz_respondido', { leccion: slug, acierto: elegidas[i] === Number(q.dataset.answer) });
      });
    }
  }

  reiniciar?.addEventListener('click', () => {
    for (const [i, q] of preguntas.entries()) {
      elegidas[i] = -1;
      for (const input of opciones(q)) input.checked = false;
      pintarPregunta(i);
    }
    pintarMarcador();
    setQuiz(slug, null);
    opciones(preguntas[0])[0]?.focus();
  });

  // Estado guardado: se repintan las respuestas de la última vez.
  const previo = getQuiz(slug);
  if (previo && previo.total === total) {
    for (const [i, q] of preguntas.entries()) {
      const j = previo.answers[i];
      if (typeof j !== 'number' || j < 0) continue;
      const input = opciones(q).find((x) => Number(x.value) === j);
      if (!input) continue;
      input.checked = true;
      elegidas[i] = j;
      pintarPregunta(i);
    }
  }
  pintarMarcador();
}

document.querySelectorAll<HTMLElement>('[data-quiz]').forEach(montar);
