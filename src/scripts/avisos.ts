// Avisos contextuales en el navegador. Lee el contexto, pide a
// src/lib/avisos/avisos.mjs cuál toca (si toca alguno) y lo pinta. Las reglas
// —qué avisos hay, cuándo y a dónde llevan— NO están aquí: están en esa lista,
// que es la que tiene pruebas. Aquí solo hay DOM.
//
// POR CONTEXTO, NO POR TIEMPO. No hay setTimeout que haga aparecer nada. El
// motor se despierta cuando el navegador está ocioso tras cargar, y luego solo
// cuando cambia algo que puede volver relevante un aviso: la watchlist
// (`sf:watchlist`), el progreso de lecciones (`sf:lessons`) y el `sf:avisos`
// que dispara el índice de noticias al terminar de pintar sus tarjetas.
//
// UNO A LA VEZ. Mientras haya un aviso puesto no se evalúa otro: ni se
// sustituye ni se encola. El que está es el que hay.
//
// ACCESIBILIDAD. El contenedor es role="status" (región viva educada): lo que
// se mete dentro se anuncia solo, sin robar el foco — un aviso no es un
// diálogo y no puede interrumpir lo que estás escribiendo. Se cierra con la ✕,
// con su botón de acción y con Escape (salvo que haya una hoja abierta, que se
// queda con la tecla). El foco nunca se mueve solo; si estaba dentro del aviso
// al cerrarlo, vuelve a <main>, que no es un sitio sorpresa.
import {
  AVISOS, LLAVE, idDeActivo, anterior,
  normalizar, estadoVacio, recordarActivo, anotarVista, cerrar, elegir
} from '../lib/avisos/avisos.mjs';
import { leer as leerWatchlist } from './watchlist';
import { readProgress } from './lessons-progress';

const raiz = document.getElementById('sf-avisos');
if (raiz) arrancar(raiz);

type Textos = Record<string, { texto: string; accion: string }>;

function arrancar(raiz: HTMLElement) {
  const pagina = raiz.dataset.pagina || null;
  const routeId = raiz.dataset.route || '';
  const textos = leerJSON<Textos>(raiz.dataset.textos, {});
  const rutas = leerJSON<Record<string, string>>(raiz.dataset.rutas, {});
  const etiquetaCerrar = raiz.dataset.cerrar || 'Cerrar';
  const activo = idDeActivo(routeId);

  let estado = cargar();
  // Apuntar la ficha ANTES de elegir: "viste dos activos" se decide con esta
  // visita ya contada, y el anterior es el último distinto que quede detrás.
  if (activo) {
    estado = recordarActivo(estado, activo);
    guardar(estado);
  }

  let puesto: HTMLElement | null = null;

  function contexto() {
    return {
      pagina, routeId, activo,
      activos: estado.activos,
      anterior: anterior(estado.activos, activo),
      siguiendo: leerWatchlist(),
      leidas: readProgress(),
      leccion: document.querySelector<HTMLElement>('[data-lesson-page]')?.dataset.lessonPage || null,
      hayTerminos: !!document.querySelector('.lesson-body [data-term]'),
      hayChips: !!document.querySelector('.nw-card .chip-activo'),
      rutas
    };
  }

  function revisar() {
    if (puesto) return;
    const aviso = elegir(contexto(), estado, AVISOS);
    if (aviso) mostrar(aviso);
  }

  function mostrar(aviso: (typeof AVISOS)[number]) {
    const txt = textos[aviso.id];
    if (!txt) return;
    const caja = document.createElement('div');
    caja.className = 'aviso';
    caja.dataset.aviso = aviso.id;

    const p = document.createElement('p');
    p.className = 'aviso-txt';
    p.textContent = txt.texto;

    // La acción es un <a> de verdad cuando lleva a otro sitio (se puede abrir
    // en otra pestaña, se ve a dónde va) y un <button> cuando solo cierra.
    let cta: HTMLElement;
    if (aviso.accion.tipo === 'enlace') {
      const a = document.createElement('a');
      a.href = aviso.accion.href(contexto());
      // Se apunta el cierre y se quita DESPUÉS del clic: si el <a> desaparece
      // durante el propio evento, el navegador puede no seguir el enlace (y
      // "Ver mi lista" en /market es un salto a #mkt-watch, sin recarga que
      // limpie la pantalla por su cuenta).
      a.addEventListener('click', () => { anotarCierre(aviso); setTimeout(() => quitar(false), 0); });
      cta = a;
    } else {
      const b = document.createElement('button');
      b.type = 'button';
      b.addEventListener('click', () => { descartar(aviso); });
      cta = b;
    }
    cta.className = 'btn btn-primary btn-sm aviso-cta';
    cta.textContent = txt.accion;

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'aviso-x';
    x.setAttribute('aria-label', etiquetaCerrar);
    x.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    x.addEventListener('click', () => { descartar(aviso); });

    caja.append(p, cta, x);
    raiz.appendChild(caja);
    puesto = caja;
    // El final de la página tiene que seguir alcanzándose por debajo del aviso.
    document.documentElement.classList.add('con-aviso');
    estado = anotarVista(estado, aviso);
    guardar(estado);
  }

  /** Cerrado o usado: en los dos casos ya hizo su trabajo y no vuelve. */
  function anotarCierre(aviso: (typeof AVISOS)[number]) {
    estado = cerrar(estado, aviso);
    guardar(estado);
  }

  function descartar(aviso: (typeof AVISOS)[number]) {
    anotarCierre(aviso);
    quitar(true);
  }

  function quitar(devolverFoco: boolean) {
    if (!puesto) return;
    const teniaFoco = puesto.contains(document.activeElement);
    puesto.remove();
    puesto = null;
    document.documentElement.classList.remove('con-aviso');
    if (devolverFoco && teniaFoco) document.getElementById('main')?.focus();
  }

  // Escape cierra, salvo que haya algo modal abierto (glosario, búsqueda): esa
  // tecla es suya primero, y quitarle el Escape a un diálogo es peor que dejar
  // un aviso puesto.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !puesto) return;
    if (document.querySelector('[role="dialog"]:not([hidden])')) return;
    const id = puesto.dataset.aviso;
    const aviso = AVISOS.find((a) => a.id === id);
    if (aviso) descartar(aviso);
  });

  // Nada de temporizadores: se revisa al quedar el navegador ocioso y cada vez
  // que cambia algo que puede hacer relevante un aviso.
  for (const evento of ['sf:watchlist', 'sf:lessons', 'sf:avisos']) {
    document.addEventListener(evento, () => revisar());
  }
  window.addEventListener('storage', (e) => { if (e.key === 'sf-watchlist-v1' || e.key === 'sf-lessons-read') revisar(); });
  ocioso(revisar);
}

// ---------------------------------------------------------------- utilidades

function ocioso(fn: () => void) {
  const correr = () => {
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(fn, { timeout: 2000 }); else setTimeout(fn, 200);
  };
  if (document.readyState === 'complete') correr();
  else window.addEventListener('load', correr, { once: true });
}

function leerJSON<T>(s: string | undefined, porDefecto: T): T {
  try { return s ? (JSON.parse(s) as T) : porDefecto; } catch { return porDefecto; }
}

function cargar() {
  try { return normalizar(JSON.parse(localStorage.getItem(LLAVE) || 'null')); } catch { return estadoVacio(); }
}

function guardar(estado: ReturnType<typeof estadoVacio>) {
  try { localStorage.setItem(LLAVE, JSON.stringify(estado)); } catch { /* modo privado: se comporta como primera visita */ }
}
