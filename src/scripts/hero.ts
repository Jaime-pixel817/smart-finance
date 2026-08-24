// El hero del home: la barra que se vuelve sólida, el globo que aterriza en
// ella, el SVG de respaldo que casi nunca se ve y las pastillas de cambio del
// día pegadas a los marcadores.
//
// CUATRO COSAS Y NINGUNA LIBRERÍA
//
// 1. LA BARRA. Un IntersectionObserver sobre un testigo de 1 px arriba del
//    hero. Mientras se ve, la barra está encima del globo y va transparente;
//    en cuanto se sale, se pone sólida. Cero listeners de scroll.
//
// 2. LA ÓRBITA. El globo no se va en línea recta hasta el ícono de la barra:
//    describe un arco —baja, se abre a la izquierda y desde ahí sube al logo—
//    encogiéndose, ladeándose y difuminándose, como algo que se aleja en el
//    espacio. La curva es una Bézier cuadrática y está explicada en
//    Hero.astro. Lo hace el CSS con scroll-timeline, que corre en el
//    compositor y no toca el hilo principal; donde no lo hay, aquí se calcula
//    EL MISMO transform con un scroll pasivo leído dentro de un rAF.
//    Todo lo que es geometría —dónde empieza la banda, cuánto mide, dónde está
//    el hueco del wordmark— se mide UNA vez y se guarda: por frame solo quedan
//    multiplicaciones y una escritura de estilo. (Antes se leía `top`,
//    `offsetHeight` y `getComputedStyle` en cada frame, o sea un layout
//    forzado por frame durante todo el scroll.)
//    En los dos caminos, un segundo IntersectionObserver avisa cuando el globo
//    ya aterrizó: entonces se esconde y se manda "globe:visible" para que
//    risk-sphere.js pare el bucle. Sin eso, el lienzo seguiría pintando a 60
//    fps detrás de una página que ya no lo enseña — es position:fixed y su
//    propio IntersectionObserver nunca lo daría por fuera de pantalla.
//
// 3. EL RESPALDO. El SVG estático del hero nace apagado y solo se enciende si
//    no va a haber globo: lo dice el evento "globe:fail" (sin WebGL, o three.js
//    que no llega). Con prefers-reduced-motion lo enciende el CSS solo. Ver el
//    bloque de abajo.
//
// 4. LAS PASTILLAS. Nueva York, Ciudad de México y la bolsa que más se mueva
//    llevan pegado su cambio del día. La posición la manda el globo por
//    "globe:pins" (ver risk-sphere.js) porque es el único que sabe dónde está
//    cada marcador ahora mismo; aquí solo se mueve un div con transform. Van
//    con aria-hidden: el mismo dato en texto está en la barra de ocho chips.
import { fmtPct, arrow, dirClass, type Loc } from './format';

const hero = document.querySelector<HTMLElement>('.hero');
const globo = document.getElementById('hero-globe');
if (hero && globo) boot(hero, globo);

type Item = { id: string; city: string; changePct: number | null };
type Pin = { id: string; x: number; y: number; on: boolean };

// Abreviaturas de ciudad, iguales en los dos idiomas: en una pastilla de 11 px
// "Ciudad de México" no cabe, y traducir tres letras no aporta nada.
const CORTO: Record<string, string> = {
  nyc: 'NY', yto: 'TOR', mex: 'CDMX', sao: 'SÃO', lon: 'LDN', fra: 'FRA', tyo: 'TYO', hkg: 'HK'
};

function boot(hero: HTMLElement, globo: HTMLElement) {
  const loc: Loc = document.documentElement.lang === 'es' ? 'es' : 'en';
  const topbar = document.querySelector<HTMLElement>('.topbar');
  const menos = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- 1. La barra sólida --------------------------------------------------
  const testigoTop = hero.querySelector('.hero-mark-top');
  if (topbar && testigoTop && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => topbar.classList.toggle('is-solid', !e.isIntersecting),
      { threshold: 0 }
    ).observe(testigoTop);
  }

  // ---- 2. El aterrizaje ----------------------------------------------------
  const testigoFin = hero.querySelector('.hero-mark-end');
  if (testigoFin && 'IntersectionObserver' in window) {
    // El globo se apaga al final del recorrido, ni un píxel antes: ahí es
    // cuando la órbita lo ha dejado exactamente encima del hueco del wordmark.
    new IntersectionObserver(([e]) => {
      const aterrizado = !e.isIntersecting && e.boundingClientRect.top < 0;
      globo.classList.toggle('is-parked', aterrizado);
      document.dispatchEvent(new CustomEvent('globe:visible', { detail: { on: !aterrizado } }));
    }, { threshold: 0 }).observe(testigoFin);
    // El ícono de la barra se enciende 80 px ANTES (rootMargin negativo arriba).
    // Es el cruce: el globo llega ya pequeño y medio apagado, el ícono sube
    // debajo de él y cuando el globo se va del todo el ícono ya está puesto. Sin
    // esos 80 px había un frame con el globo a opacidad 0 y el ícono todavía sin
    // encender, y el aterrizaje se veía como un parpadeo en vez de un encaje.
    new IntersectionObserver(([e]) => {
      topbar?.classList.toggle('is-parked', !e.isIntersecting && e.boundingClientRect.top < 80);
    }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' }).observe(testigoFin);
  }

  // ---- El destino de la órbita, medido y no supuesto -----------------------
  //
  // Los @keyframes de Hero.astro traen unos valores razonables por defecto,
  // pero el hueco del wordmark no está siempre donde dice la cuenta: desde
  // 1200 px el contenedor deja de tocar el borde y el ícono se corre con él (a
  // 1280 px, 40 px más adentro), y el tamaño del disco depende de si manda el
  // ancho del lienzo o el tope de la cámara. Así que --park-x / --park-y /
  // --park-s se miden aquí, UNA vez y en cada resize, sobre el ícono de verdad.
  // No mueven nada de la maquetación (solo alimentan la animación), así que
  // llegar tarde no cuesta CLS.
  const marca = document.querySelector<HTMLElement>('.topbar .wm-mark');
  let recorrido = 1, destinoX = 0, destinoY = 0, escalaFin = .083;
  const medir = () => {
    const alto = globo.offsetHeight || 1;
    const arriba = parseFloat(getComputedStyle(globo).top) || 0;
    // El recorrido lo marca el mismo testigo que decide el aterrizaje, que en
    // el CSS está puesto en calc(--hero-h * .8) igual que animation-range: así
    // la órbita termina EXACTAMENTE en el frame en que el globo se apaga.
    recorrido = (testigoFin as HTMLElement | null)?.offsetTop || (hero.offsetHeight * 0.8) || 1;
    const r = marca?.getBoundingClientRect();
    const iconoX = r ? (r.left + r.right) / 2 : 29;
    const iconoY = r ? (r.top + r.bottom) / 2 : 26;
    // El diámetro del disco, con la misma cuenta que risk-sphere.js y que
    // --globe-d: manda el ancho del lienzo, salvo que el tope de la cámara
    // (BASE_SCALE) lo deje más pequeño en una banda muy baja.
    const relleno = parseFloat(getComputedStyle(hero).getPropertyValue('--globe-fill')) || .8;
    const disco = Math.min(relleno * globo.offsetWidth, .8692 * alto) || 1;
    escalaFin = (r ? r.width : 26) / disco;
    hero.style.setProperty('--park-x', iconoX + 'px');
    hero.style.setProperty('--park-y', iconoY + 'px');
    hero.style.setProperty('--park-s', String(+escalaFin.toFixed(5)));
    destinoX = iconoX - (globo.offsetLeft + globo.offsetWidth / 2);
    destinoY = iconoY - arriba - alto / 2;
  };
  medir();
  addEventListener('resize', medir);

  // El respaldo de la órbita, solo donde no hay scroll-timeline y solo si no
  // se pidió menos movimiento (ahí el globo ni se mueve: se va con la página).
  const conTimeline = typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    && CSS.supports('animation-timeline', 'scroll()');
  if (!conTimeline && !menos.matches) {
    const lienzo = globo.querySelector<HTMLElement>('.globe-host');
    const capaPins = globo.querySelector<HTMLElement>('.hero-pins');
    const cielo = globo.querySelector<HTMLElement>('.hero-sky');
    // La opacidad, muestreada en los MISMOS puntos que @keyframes hero-park.
    const OPACIDAD: [number, number][] = [[0, 1], [.5, 1], [.625, .97], [.75, .9], [.875, .55], [1, 0]];

    let pedido = false;
    const pintar = () => {
      pedido = false;
      const t = Math.min(1, Math.max(0, window.scrollY / recorrido));
      const u = 1 - t;
      // La Bézier cuadrática de Hero.astro, ya desarrollada. La y sale positiva
      // hasta t ≈ 0.52 aunque destinoY sea negativa: el globo BAJA antes de
      // subir, que es lo que hace el arco.
      const tx = destinoX * (1.5 * t * u + t * t);
      const ty = destinoY * (-1.1 * t * u + t * t);
      const s = 1 + (escalaFin - 1) * Math.pow(t, .75);
      globo.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      let op = 0;
      for (let i = 1; i < OPACIDAD.length; i++) {
        if (t <= OPACIDAD[i][0]) {
          const [t0, o0] = OPACIDAD[i - 1], [t1, o1] = OPACIDAD[i];
          op = o0 + (o1 - o0) * (t - t0) / (t1 - t0);
          break;
        }
      }
      globo.style.opacity = op.toFixed(3);
      if (lienzo) {
        const desenfoque = t <= .625 ? 0 : 1.4 * (t - .625) / .375;
        lienzo.style.transform = `rotate(${(-20 * Math.pow(t, 1.25)).toFixed(2)}deg)`;
        lienzo.style.filter = desenfoque ? `blur(${desenfoque.toFixed(2)}px)` : 'none';
      }
      // Las pastillas se van con el primer 15 % del recorrido: a partir de ahí
      // el lienzo gira y la etiqueta ya no cae sobre su marcador. El cielo, con
      // el 22 %: lo que se aleja es la esfera, no un rectángulo con un planeta.
      if (capaPins) capaPins.style.opacity = String(Math.max(0, 1 - t / .15));
      if (cielo) cielo.style.opacity = String(Math.max(0, 1 - t / .22));
    };
    addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(pintar); } }, { passive: true });
    addEventListener('resize', pintar);
    pintar();
  }

  // ---- Tocar una ciudad devuelve el globo ---------------------------------
  // Los ocho chips están ahora DENTRO del hero, así que lo normal es tocarlos
  // con la página arriba del todo y esto no hace nada. Sigue puesto para el
  // caso en que se llegue a ellos con la página ya bajada (un enlace con
  // ancla, volver atrás): encender el país de Canadá en un globo que ya
  // aterrizó en la barra no sirve de nada, así que la página vuelve arriba. La
  // tarjeta es position: fixed y no se pierde de vista mientras sube. Con
  // menos movimiento el salto es seco, sin deslizamiento.
  document.addEventListener('world:select', (e) => {
    const id = (e as CustomEvent<{ id?: string | null }>).detail?.id;
    if (!id || window.scrollY < 8) return;
    window.scrollTo({ top: 0, behavior: menos.matches ? 'auto' : 'smooth' });
  });

  // ---- El SVG estático: respaldo, no primer pintado ------------------------
  //
  // El SVG del hero (Hero.astro) nace invisible. Lo normal es que no se vea
  // NUNCA: se veía medio segundo antes de la entrada de partículas y ese
  // parpadeo sobraba. Solo se enciende cuando no va a haber globo que enseñar:
  //
  //   - prefers-reduced-motion → lo pone el CSS, desde el primer frame y sin
  //     pasar por aquí; risk-sphere.js pinta igualmente un fotograma quieto y
  //     al llegar "globe:ready" el SVG se va.
  //   - sin WebGL, o three.js que no llega (CDN caído o bloqueado) → quien lo
  //     descubre avisa con "globe:fail": el catch de risk-sphere.js y el
  //     onerror de las dos etiquetas <script> de home.ts. Va por evento y no
  //     preguntándole al navegador si hay WebGL: crear un contexto de prueba
  //     al arrancar costaba medio segundo de hilo principal en un teléfono
  //     modesto (+230 ms de bloqueo en Lighthouse), y es medio segundo pagado
  //     por todo el mundo para enterarse de algo que casi nunca pasa.
  //   - y si no llega ninguna de las dos cosas —el globo ni siquiera arrancó—,
  //     la red de seguridad es el reloj: a los 10 s se enseña el SVG.
  //
  // El lienzo, cuando pinta, gana siempre: .is-live apaga el SVG esté como
  // esté.
  const host = document.getElementById('globalRiskGlobe');
  const encender = () => globo.classList.add('is-live');
  const respaldo = () => globo.classList.add('is-still');
  if (!menos.matches) {
    const reloj = setTimeout(respaldo, 10000);
    document.addEventListener('globe:fail', respaldo, { once: true });
    document.addEventListener('globe:ready', () => clearTimeout(reloj), { once: true });
  }

  // EL ORDEN ES LO IMPORTANTE. risk-sphere.js manda "globe:ready" cuando ya
  // tiene el lienzo montado y va a empezar la entrada de partículas, y espera
  // --still-out ms antes de arrancarla. Así el SVG de respaldo —si estaba
  // puesto— se va PRIMERO y la entrada empieza sobre un fondo limpio: si se
  // solaparan, lo que se vería es el globo estático deshaciéndose en polvo, que
  // es justo lo que no se quiere. El MutationObserver se queda como respaldo
  // por si el evento no llega (una versión vieja del script en caché).
  document.addEventListener('globe:ready', encender, { once: true });
  if (host) {
    if (host.querySelector('canvas')) encender();
    else if (typeof MutationObserver === 'function') {
      const mo = new MutationObserver(() => {
        if (!host.querySelector('canvas')) return;
        mo.disconnect();
        // Un par de frames de margen para que el primer render ya esté hecho
        // cuando el SVG empiece a irse: si no, se ve el hueco negro un instante.
        requestAnimationFrame(() => requestAnimationFrame(encender));
      });
      mo.observe(host, { childList: true });
    }
  }

  // ---- 4. Las pastillas ----------------------------------------------------
  const capa = document.getElementById('hero-pins');
  if (!capa) return;
  const pins = new Map<string, HTMLElement>();
  let elegidas: string[] = [];

  function elegir(items: Item[]): string[] {
    // Nueva York y Ciudad de México siempre (el lector está en México o en
    // Canadá y mira a Wall Street), más la que más se mueva de las demás.
    const fijas = ['nyc', 'mex'].filter((id) => items.some((it) => it.id === id));
    const resto = items
      .filter((it) => !fijas.includes(it.id) && typeof it.changePct === 'number')
      .sort((a, b) => Math.abs(b.changePct!) - Math.abs(a.changePct!));
    return resto.length ? [...fijas, resto[0].id] : fijas;
  }

  function pintarPins(items: Item[]) {
    const ids = elegir(items);
    if (ids.join() !== elegidas.join()) {
      elegidas = ids;
      capa!.textContent = '';
      pins.clear();
      for (const id of ids) {
        const el = document.createElement('span');
        el.className = 'pin';
        capa!.appendChild(el);
        pins.set(id, el);
      }
      // El globo se carga DIFERIDO: cuando llegan los datos puede que aún no
      // exista nadie escuchando "world:pins". Se deja también en un global,
      // igual que window.SmartWorld con los datos, y risk-sphere.js lo lee al
      // arrancar. Sin esto las pastillas se creaban y no se movían nunca.
      (window as any).SmartWorldPins = ids;
      document.dispatchEvent(new CustomEvent('world:pins', { detail: { ids } }));
    }
    for (const it of items) {
      const el = pins.get(it.id);
      if (!el) continue;
      const chg = it.changePct == null
        ? '<span class="flat">—</span>'
        : `<span class="${dirClass(it.changePct)}">${arrow(it.changePct)} ${fmtPct(it.changePct, loc)}</span>`;
      el.innerHTML = `<b>${CORTO[it.id] || it.id.toUpperCase()}</b> ${chg}`;
    }
  }

  document.addEventListener('world:data', (e) => {
    const items = (e as CustomEvent<{ items?: Item[] }>).detail?.items;
    if (items && items.length) pintarPins(items);
  });

  document.addEventListener('globe:pins', (e) => {
    const d = (e as CustomEvent<{ pins?: Pin[]; w?: number }>).detail;
    if (!d?.pins) return;
    const ancho = d.w || capa!.clientWidth;
    for (const p of d.pins) {
      const el = pins.get(p.id);
      if (!el) continue;
      // Se sujeta a los bordes para que la pastilla no se salga del lienzo, y
      // sube 16 px: la etiqueta va encima del punto, no tapándolo. Si arriba
      // no cabe —Toronto y Nueva York quedan bajo la barra superior— se pone
      // debajo del punto en vez de meterse detrás de la barra.
      const x = Math.min(Math.max(p.x, 52), ancho - 52);
      const barra = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 52;
      const arriba = p.y - 16 - 26 > barra + 6;
      el.style.transform = arriba
        ? `translate(${x.toFixed(1)}px, ${(p.y - 16).toFixed(1)}px) translate(-50%, -100%)`
        : `translate(${x.toFixed(1)}px, ${(p.y + 16).toFixed(1)}px) translate(-50%, 0)`;
      el.classList.toggle('on', p.on);
    }
  });
}
