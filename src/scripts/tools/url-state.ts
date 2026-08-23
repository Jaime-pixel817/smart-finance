// Estado de las herramientas en la URL.
//
// Cada control lleva data-param con una clave corta (m, r, y, p, i, a, c, b) y
// esa clave viaja en el query string: /tools/interes-compuesto?m=1500&r=9&y=25
// abre la herramienta con esos números. Así un enlace compartido lleva el
// cálculo, no solo la página, y el botón "Copiar enlace" copia justo eso.
//
// El estado solo se escribe donde se pide (data-url-state en la raíz del
// widget): dentro de una lección la calculadora no debe ensuciar la URL de la
// lección. Se usa replaceState, así que el botón "atrás" del navegador sigue
// saliendo de la página en lugar de deshacer arrastres del slider.

/** Ajusta un valor al min/max/step del input y lo devuelve como cadena. */
function encajar(input: HTMLInputElement, valor: number): string {
  const min = Number(input.min || 0);
  const max = Number(input.max || 0);
  const step = Number(input.step || 1) || 1;
  let v = Math.min(Math.max(valor, min), max);
  v = Math.round((v - min) / step) * step + min;
  // El redondeo binario deja colas de tipo 6.500000000000001.
  const decimales = (String(step).split('.')[1] || '').length;
  return v.toFixed(decimales);
}

/** Todos los controles del widget que participan en la URL. */
export function campos(raiz: ParentNode): HTMLInputElement[] {
  return Array.from(raiz.querySelectorAll<HTMLInputElement>('input[data-param]'));
}

/** Aplica ?clave=valor a los controles. Ignora lo que no sea un número. */
export function aplicarUrl(raiz: ParentNode, busqueda = location.search): void {
  const q = new URLSearchParams(busqueda);
  for (const input of campos(raiz)) {
    const crudo = q.get(input.dataset.param!);
    if (crudo === null) continue;
    const n = Number(crudo);
    if (!Number.isFinite(n)) continue;
    input.value = encajar(input, n);
  }
}

/** Guarda los valores actuales en la URL, sin recargar ni crear historial. */
export function guardarUrl(raiz: ParentNode): void {
  const url = new URL(location.href);
  for (const input of campos(raiz)) url.searchParams.set(input.dataset.param!, input.value);
  history.replaceState(history.state, '', url.toString());
}

/**
 * Botones "Copiar enlace": <button data-copy data-copied="¡Copiado!">.
 * Copia la URL actual (ya con los parámetros) y confirma dos segundos.
 * Si el navegador bloquea el portapapeles, selecciona la URL en un campo
 * visible para que se pueda copiar a mano.
 */
export function montarCopiar(raiz: ParentNode = document): void {
  for (const boton of Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-copy]'))) {
    // El botón vive en el cascarón de la página, fuera del widget, así que se
    // busca en todo el documento; la marca evita engancharlo dos veces si la
    // página llegara a tener dos calculadoras.
    if (boton.dataset.copyReady !== undefined) continue;
    boton.dataset.copyReady = '';
    const original = boton.querySelector<HTMLElement>('[data-copy-label]') ?? boton;
    const textoOriginal = original.textContent || '';
    const aviso = boton.parentElement?.querySelector<HTMLElement>('[data-copy-live]') ?? null;
    let temporizador = 0;
    boton.addEventListener('click', async () => {
      const url = location.href;
      let ok = true;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        ok = false;
      }
      const copiado = boton.dataset.copied || textoOriginal;
      const fallo = boton.dataset.failed || url;
      original.textContent = ok ? copiado : fallo;
      if (aviso) aviso.textContent = ok ? copiado : fallo;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        original.textContent = textoOriginal;
        if (aviso) aviso.textContent = '';
      }, 2400);
    });
  }
}

/**
 * Conecta un widget: aplica la URL de entrada, repinta con `pintar` en cada
 * cambio y guarda el estado si la raíz trae data-url-state.
 */
export function conectar(raiz: HTMLElement, pintar: () => void): void {
  const guarda = raiz.dataset.urlState !== undefined;
  if (guarda) aplicarUrl(raiz);
  for (const input of campos(raiz)) {
    input.addEventListener('input', () => {
      pintar();
      if (guarda) guardarUrl(raiz);
    });
  }
  montarCopiar(document);
  pintar();
}
