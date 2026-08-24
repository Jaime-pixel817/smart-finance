// Lo que sigues: una watchlist SIN CUENTA y SIN SERVIDOR.
//
// POR QUÉ ASÍ. Pedir un correo para poder marcar tres activos es la forma más
// rápida de que nadie marque ninguno, y guardar esa lista en un servidor es
// guardar datos de un menor de edad para no ganar nada. La lista vive en el
// localStorage del navegador: se pierde si borras el navegador y no viaja a
// ningún sitio. El botón dice exactamente eso (`watch.note` en ui.ts).
//
// GUARDA IDS DE src/data/symbols.ts, no símbolos: son los mismos que usan las
// URL de las fichas (/market/spy) y las filas (data-row), así que la lista se
// puede pintar sin saber nada más. Al leer se filtran los que ya no existen —
// si un día se retira un activo, la watchlist de quien lo seguía no se rompe.
//
// La clave lleva versión (`-v1`) por si algún día cambia el formato: una lista
// vieja que ya no se entienda se ignora en vez de reventar.

import { medir } from '../lib/analytics';

const LS = 'sf-watchlist-v1';
/** Se dispara en `document` cada vez que la lista cambia (también entre pestañas). */
export const EVENTO = 'sf:watchlist';
/** Tope: una watchlist de veinte activos no es una watchlist, es /market otra vez. */
export const TOPE = 12;

export function leer(validos?: Set<string> | string[]): string[] {
  let lista: unknown;
  try { lista = JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; }
  if (!Array.isArray(lista)) return [];
  const ok = validos ? (validos instanceof Set ? validos : new Set(validos)) : null;
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const x of lista) {
    if (typeof x !== 'string' || vistos.has(x)) continue;
    if (ok && !ok.has(x)) continue;
    vistos.add(x);
    salida.push(x);
  }
  return salida.slice(0, TOPE);
}

function guardar(ids: string[]) {
  try { localStorage.setItem(LS, JSON.stringify(ids)); } catch { /* modo privado: la sesión sigue funcionando */ }
  document.dispatchEvent(new CustomEvent(EVENTO, { detail: ids }));
}

export function sigue(id: string): boolean {
  return leer().includes(id);
}

/** Sigue o deja de seguir. Devuelve el estado nuevo. */
export function alternar(id: string): boolean {
  const ids = leer();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  guardar(ids.slice(0, TOPE));
  return i < 0;
}

/** Cambios en esta pestaña y en las demás (otra pestaña abierta en /market). */
export function alCambiar(fn: (ids: string[]) => void) {
  document.addEventListener(EVENTO, () => fn(leer()));
  window.addEventListener('storage', (e) => { if (e.key === LS) fn(leer()); });
}

/**
 * Deja un botón `[data-follow="<id>"]` funcionando: estado inicial, clic y
 * sincronía con el resto de botones del mismo activo (la misma fila puede
 * estar en "Lo que sigues" y en su sección, y las dos tienen que ir a la vez).
 *
 * El botón es un `<button aria-pressed>`, no una casilla: para un lector de
 * pantalla "Seguir SPY, no presionado" es exactamente lo que hace.
 */
export function montarBotones(raiz: ParentNode = document) {
  const botones = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-follow]'));
  if (!botones.length) return;

  const pintar = (ids: string[]) => {
    const set = new Set(ids);
    for (const b of botones) {
      const id = b.dataset.follow || '';
      const on = set.has(id);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const etiqueta = on ? b.dataset.labelOn : b.dataset.labelOff;
      if (etiqueta) b.setAttribute('aria-label', etiqueta);
    }
  };

  for (const b of botones) {
    if (b.dataset.wired) continue;
    b.dataset.wired = '1';
    b.addEventListener('click', (e) => {
      // La fila entera es un enlace a la ficha: el botón no puede navegar.
      e.preventDefault();
      e.stopPropagation();
      const id = b.dataset.follow || '';
      const ahora = alternar(id);
      // La lista NO sale del navegador; lo que se cuenta es qué activos se
      // marcan, no quién los marca ni cuál es la lista de nadie.
      medir('activo_seguido', { activo: id, sigue: ahora });
    });
  }
  alCambiar(pintar);
  pintar(leer());
}

/** La URL del comparador con los primeros activos de la lista. */
export function urlComparar(base: string, ids: string[]): string {
  const claves = ['a', 'b', 'c'];
  const q = ids.slice(0, 3).map((id, i) => claves[i] + '=' + encodeURIComponent(id)).join('&');
  return q ? base + '?' + q : base;
}
