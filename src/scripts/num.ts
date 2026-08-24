// Números que CAMBIAN.
//
// Un precio que pasa de 6 512.30 a 6 514.90 sin más no se lee como que ha
// cambiado: se lee como que siempre puso eso. Lo que se hace aquí es que el
// valor nuevo entre subiendo un poco, en --dur-3, y con eso el ojo va solo al
// dato que se movió.
//
// TRES REGLAS QUE ESTÁN EN EL CÓDIGO, NO EN LA BUENA VOLUNTAD
//
// 1. AL CARGAR NO SE ANIMA. La primera vez que un hueco recibe su valor (que es
//    cuando se quita el esqueleto) solo se escribe. Si animara, cada página
//    arrancaría con veinte números subiendo a la vez, que es exactamente el
//    ruido que esto viene a quitar. Se distingue por `data-num`: el atributo no
//    existe hasta la primera pintada.
// 2. SI EL VALOR NO CAMBIÓ, NO PASA NADA. Media hora de sondeos con el mercado
//    cerrado devuelve el mismo número una y otra vez; animarlo sería un tic.
// 3. LA DURACIÓN Y LA CURVA SE LEEN DE LOS TOKENS, no se escriben aquí. Se
//    piden UNA vez a :root (--dur-3, --ease-out, --num-rise) y se guardan. Así
//    el ritmo de un número sigue saliendo de src/styles/motion.css como todo lo
//    demás y, de propina, con `prefers-reduced-motion` los tokens ya valen
//    ~0 ms y esta animación se apaga sola, sin una condición aparte.
//
// Se anima con la API de animaciones del navegador y no con una clase porque
// reiniciar una animación de CSS obliga a leer `offsetWidth` para forzar un
// recálculo del diseño, y en /market hay treinta números que se repintan a la
// vez: serían treinta recálculos sincrónicos por actualización.
//
// El ancho NO cambia mientras el número entra: las cifras van en `.num`, que es
// `tabular-nums`. Sin eso, un 1 más estrecho que un 8 movería la fila de al
// lado en mitad de la animación.

let dur = -1;
let ease = '';
let rise = '';

function tokens() {
  if (dur < 0) {
    const cs = getComputedStyle(document.documentElement);
    // Los tokens de duración se escriben en ms (`240ms`), así que parseFloat da
    // el número. Si alguna vez se escribieran en segundos habría que mirarlo.
    dur = parseFloat(cs.getPropertyValue('--dur-3')) || 240;
    ease = cs.getPropertyValue('--ease-out').trim() || 'ease-out';
    rise = cs.getPropertyValue('--num-rise').trim() || '.3em';
  }
}

const vivas = new WeakMap<Element, Animation>();

/**
 * Escribe un valor en su hueco y, si de verdad cambió, lo hace entrar subiendo.
 *
 * @param el   el hueco (puede ser null: los pintores llaman a ciegas)
 * @param txt  el valor, en texto — es también con lo que se compara
 * @param html marcado opcional cuando el hueco lleva flecha o `<span>` dentro;
 *             se escribe esto y se compara `txt`
 */
export function setNum(el: HTMLElement | null | undefined, txt: string, html?: string) {
  if (!el) return;
  const antes = el.getAttribute('data-num');
  if (html === undefined) el.textContent = txt;
  else el.innerHTML = html;
  el.setAttribute('data-num', txt);
  if (antes === null || antes === txt) return; // primera pintada, o no cambió
  tokens();
  if (dur < 20) return; // menos movimiento: el token ya lo dijo
  vivas.get(el)?.cancel();
  vivas.set(el, el.animate(
    [{ opacity: 0, transform: 'translateY(' + rise + ')' }, { opacity: 1, transform: 'none' }],
    { duration: dur, easing: ease }
  ));
}
