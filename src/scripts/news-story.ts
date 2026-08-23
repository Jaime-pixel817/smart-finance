// Página de una noticia generada en el build: el texto ya viene en el HTML, así
// que aquí solo falta lo que cambia cada 15 minutos — el Δ del día de cada
// activo y la mini gráfica del principal.
import { aplicarMercados, type ActivoUI } from './news-markets';
import type { Loc } from './format';

const raiz = document.getElementById('news-story');
if (raiz) {
  const loc = (raiz.dataset.locale === 'es' ? 'es' : 'en') as Loc;
  const activos = JSON.parse(raiz.dataset.activos || '[]') as ActivoUI[];
  if (activos.length) aplicarMercados(raiz, loc, activos);
}
