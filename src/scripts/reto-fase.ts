// La fase del Reto Actinver, recalculada en el NAVEGADOR.
//
// El HTML llega con las seis fases pintadas y con la que era verdad el día del
// build a la vista (RetoActinver.astro). Este módulo la vuelve a calcular con
// el reloj de quien lee y enseña la que toca.
//
// POR QUÉ HACE FALTA. El sitio es estático: si nadie despliega entre agosto y
// octubre, el HTML servido sigue siendo el de agosto y la página diría "faltan
// 36 días para la semana de práctica" el día que la semana de práctica ya
// empezó. Es el mismo agujero por el que el sitio estuvo diciendo "BMV
// abierta" una hora después del cierre, y se tapa igual: la regla vive en un
// módulo puro con pruebas (src/lib/reto/actinver.mjs) y la usan el servidor y
// el navegador, no dos copias que se van separando.
//
// No pide nada a la red y no toca ningún texto traducido: los textos ya están
// en el HTML, uno por fase. Lo único que este script ESCRIBE es el número de
// días, y su palabra ("día"/"días", "day"/"days") viene en un data- del propio
// bloque para no meter idioma en el JavaScript.
import { fase, estadoHitos, fechaLocal } from '../lib/reto/actinver.mjs';

const raiz = document.querySelector<HTMLElement>('[data-reto]');
const calendario = document.querySelectorAll<HTMLElement>('[data-hito]');

if (raiz) {
  const textos = (() => {
    try { return JSON.parse(raiz.dataset.retoTextos || '{}'); }
    catch { return {}; }
  })() as { dia?: string; dias?: string };

  const pinta = () => {
    // El día en México, no el del reloj del visitante: el reto es mexicano y
    // así todo el mundo ve la misma fase esté donde esté.
    const hoy = fechaLocal(new Date());
    const f = fase(hoy);

    // El renglón marcado del calendario va por fechas, no por la fase: el 3 y
    // el 4 de octubre la fase es 'vispera' y las inscripciones siguen abiertas.
    const hitos = estadoHitos(hoy) as Record<string, string>;
    for (const fila of Array.from(calendario)) {
      const id = fila.dataset.hito;
      if (id && hitos[id]) fila.dataset.estado = hitos[id];
    }

    for (const bloque of Array.from(raiz.querySelectorAll<HTMLElement>('.fase'))) {
      const esta = bloque.dataset.fase === f.id;
      bloque.hidden = !esta;
      if (!esta) continue;

      const hoyMismo = f.faltan === 0;
      const conNumero = bloque.querySelector<HTMLElement>('[data-cuenta]');
      const soloHoy = bloque.querySelector<HTMLElement>('[data-cuenta-hoy]');
      if (conNumero) conNumero.hidden = hoyMismo || f.faltan === null;
      if (soloHoy) soloHoy.hidden = !hoyMismo;

      const n = bloque.querySelector<HTMLElement>('[data-dias]');
      if (n && typeof f.faltan === 'number' && f.faltan > 0) {
        n.textContent = f.faltan + ' ' + (f.faltan === 1 ? textos.dia : textos.dias);
      }

      // "Las inscripciones siguen abiertas": solo mientras de verdad lo estén.
      const abiertas = bloque.querySelector<HTMLElement>('[data-abiertas]');
      if (abiertas) abiertas.hidden = !f.inscripciones;
    }
  };

  // El oyente se registra ANTES de la primera pasada: si `pinta()` se cayera,
  // registrarlo después lo dejaría sin registrar y la página se quedaría con la
  // fase del build para siempre. Así, al menos, cada vuelta a la pestaña es
  // otra oportunidad. Alguien puede dejarla abierta y volver al día siguiente;
  // recalcular es comparar cadenas, no cuesta nada.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pinta(); });
  pinta();
}
