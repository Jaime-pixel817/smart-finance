// Pinta un número del boletín que todavía no tiene página estática.
//
// La fecha sale de la URL (/newsletter/2026-08-23 o /es/boletin/2026-08-23) y
// el número, de /api/newsletter-chart?issue=<fecha>, que es donde lo dejó el
// envío del domingo. El cuerpo lo arma el MISMO módulo que usa el build
// (newsletter-shared.ts), así que esta versión y la estática son idénticas.
//
// Ver src/components/newsletter/IssueRead.astro para el porqué de todo esto.
import type { Locale } from '../i18n/routes';
import type { Numero } from '../data/newsletter';
import { cuerpoDelNumero, kicker, esc } from './newsletter-shared';

const raiz = document.getElementById('nl-read');
if (raiz) {
  const loc = (raiz.dataset.locale === 'es' ? 'es' : 'en') as Locale;
  const strings = JSON.parse(raiz.dataset.strings || '{}') as Record<string, string>;
  const indice = raiz.dataset.indice || '/newsletter';
  const home = raiz.dataset.home || '/#newsletter';

  const skel = document.getElementById('nl-skel');
  const salida = document.getElementById('nl-out');
  const error = document.getElementById('nl-error');

  // La fecha es el último segmento de la ruta, y se valida por forma antes de
  // meterla en una URL: lo que llega de la barra del navegador no se pega en
  // una petición sin mirarlo.
  const m = /(\d{4}-\d{2}-\d{2})\/?$/.exec(location.pathname);

  const fallar = () => {
    if (skel) skel.hidden = true;
    if (error) error.hidden = false;
  };

  if (!m) {
    fallar();
  } else {
    fetch('/api/newsletter-chart?issue=' + encodeURIComponent(m[1]))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((n: Numero) => {
        if (!n || !n.fecha || !salida) throw new Error('número vacío');

        salida.innerHTML =
          `<header class="nl-cab">
            <p class="kicker">${esc(kicker(n, loc))}</p>
            <h1 class="t-display">${esc(n.gancho[loc])}</h1>
          </header>
          <div class="nl-cuerpo">${cuerpoDelNumero(n, loc)}</div>
          <footer class="nl-pie">
            <a class="btn btn-primary" href="${esc(home)}">${esc(strings.cta || '')}</a>
            <a class="nl-volver" href="${esc(indice)}">${esc(strings.volver || '')} →</a>
          </footer>`;

        // El <title> también: quien comparte esta URL desde el navegador manda
        // el título de la pestaña, no "Smart Finance" a secas.
        document.title = n.gancho[loc] + ' — Smart Finance';

        if (skel) skel.hidden = true;
        salida.hidden = false;
      })
      .catch(fallar);
  }
}
