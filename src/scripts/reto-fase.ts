// La fase del Reto Actinver, recalculada en el NAVEGADOR.
//
// El HTML llega con UNA fase viva —la que era verdad el día del build— y las
// otras cinco dentro de un <template> inerte (RetoActinver.astro). Este módulo
// mira qué día es de verdad y, si no coincide, saca del <template> la que toca
// y la pone en su sitio.
//
// POR QUÉ HACE FALTA. El sitio es estático: si nadie despliega entre agosto y
// octubre, el HTML servido sigue siendo el de agosto y la página diría "faltan
// 36 días para la semana de práctica" el día que la semana de práctica ya
// empezó. Es el mismo agujero por el que el sitio estuvo diciendo "BMV
// abierta" una hora después del cierre, y se tapa igual: la regla vive en un
// módulo puro con pruebas (src/lib/reto/actinver.mjs) y la usan el servidor y
// el navegador, no dos copias que se van separando.
//
// POR QUÉ UN <template> Y NO SEIS BLOQUES CON `hidden`. Con `hidden` el HTML
// servido llevaría cinco frases falsas sobre hoy —"el reto está en marcha", en
// agosto— escondidas pero presentes para quien lea el código fuente, lo raspe
// o lo resuma. El contenido de un <template> no se renderiza ni cuenta como
// contenido de la página; los nodos clonados conservan el atributo de ámbito
// de Astro, así que salen con formato igual.
//
// No pide nada a la red y no traduce nada: los textos ya vienen escritos, uno
// por fase. Lo único que este script ESCRIBE es el número de días, y su
// palabra ("día"/"días", "day"/"days") viene en un data- del propio bloque
// para no meter idioma en el JavaScript.
import { fase, estadoHitos, fechaLocal } from '../lib/reto/actinver.mjs';

const raiz = document.querySelector<HTMLElement>('[data-reto]');
const calendario = document.querySelectorAll<HTMLElement>('[data-hito]');

if (raiz) {
  const hueco = raiz.querySelector<HTMLElement>('[data-reto-actual]');
  const plantilla = raiz.querySelector<HTMLTemplateElement>('[data-reto-fases]');
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

    if (!hueco) return;
    let bloque = hueco.querySelector<HTMLElement>('.fase');

    // ¿Cambió el día desde que se construyó la página? Se trae la otra fase.
    if (bloque && bloque.dataset.fase !== f.id && plantilla) {
      const otra = plantilla.content.querySelector<HTMLElement>('[data-fase="' + f.id + '"]');
      if (otra) {
        hueco.replaceChildren(otra.cloneNode(true));
        bloque = hueco.querySelector<HTMLElement>('.fase');
      }
    }
    if (!bloque || bloque.dataset.fase !== f.id) return; // no había recambio: se queda lo servido

    const hoyMismo = f.faltan === 0;
    const conNumero = bloque.querySelector<HTMLElement>('[data-cuenta]');
    const soloHoy = bloque.querySelector<HTMLElement>('[data-cuenta-hoy]');
    if (conNumero) conNumero.hidden = hoyMismo || f.faltan === null;
    if (soloHoy) soloHoy.hidden = !hoyMismo;

    const n = bloque.querySelector<HTMLElement>('[data-dias]');
    if (n && typeof f.faltan === 'number' && f.faltan > 0) {
      // Espacio duro, igual que en el servidor: "36 días" no se parte.
      n.textContent = f.faltan + '\u00a0' + (f.faltan === 1 ? textos.dia : textos.dias);
    }

    // "Las inscripciones siguen abiertas": solo mientras de verdad lo estén.
    const abiertas = bloque.querySelector<HTMLElement>('[data-abiertas]');
    if (abiertas) abiertas.hidden = !f.inscripciones;
  };

  // El oyente se registra ANTES de la primera pasada: si `pinta()` se cayera,
  // registrarlo después lo dejaría sin registrar y la página se quedaría con la
  // fase del build para siempre. Así, al menos, cada vuelta a la pestaña es
  // otra oportunidad. Alguien puede dejarla abierta y volver al día siguiente;
  // recalcular es comparar cadenas, no cuesta nada.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pinta(); });
  pinta();
}
