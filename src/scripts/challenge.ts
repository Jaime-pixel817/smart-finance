// El reto del día en el navegador (src/components/challenge/Challenge.astro).
//
// Lo único que hace este archivo es: pedir las series a /api/history, dibujar la
// gráfica ciega en SVG, escuchar los cuatro botones y pintar el resultado, la
// racha y el calendario. Las reglas —semilla del día, corte de la ventana,
// umbral, banda y puntuación— viven en src/lib/challenge/reto.mjs y las de la
// racha en src/lib/challenge/progreso.mjs, que es lo que cubren las pruebas de
// `node --test`. Aquí no se calcula nada del juego.
//
// LOS DOS MODOS
//   diario  el de la fecha (en Ciudad de México). Uno al día, cuenta para la
//           racha y solo el PRIMER intento se apunta.
//   libre   otra semilla, cuantos quieras, no toca la racha. La ficha viaja en
//           `?libre=<filtro>-<azar>`, así que un reto libre también se comparte.
// Un enlace con `?d=<fecha>` juega el reto de ESE día (es lo que hace que
// compartir el resultado sirva de algo a la mañana siguiente); solo el de hoy
// se apunta en el calendario.
//
// EL REVELADO. La gráfica se dibuja con la escala de lo VISIBLE: si se usara la
// escala de los 48 puntos, una parte tapada enorme aplastaría la curva contra
// el suelo y el jugador vería la respuesta antes de contestar. Al revelar, el
// grupo <g class="reto-zoom"> recibe un translate+scaleY que lleva la escala
// visible a la escala completa y el lienzo "se abre" en 0.7 s mientras la parte
// tapada entra por un clip que crece de izquierda a derecha. Con
// prefers-reduced-motion las dos transiciones se apagan en CSS y todo aparece
// de golpe: la información es la misma.
import {
  fechaLocal, planDelReto, planLibre, armarRonda, puntosDeRonda, resumen, cuadricula,
  RONDAS, VENTANA, OCULTAS, PUNTOS_POR_RONDA
} from '../lib/challenge/reto.mjs';
import {
  LLAVE, LLAVE_V1, leerProgreso, registrarDia, yaJugado, rachaVigente, totales, calendario,
  progresoVacio
} from '../lib/challenge/progreso.mjs';
import { fmtNum, type Loc } from './format';
import { medir, medirUnaVez } from '../lib/analytics';

type Tipo = 'index' | 'stock' | 'fx' | 'crypto';
type Activo = {
  id: string; pair: string; sym: string; name: string; href: string;
  tipo: Tipo; diario: boolean;
  leccion: { href: string; t: string };
  termino: { href: string; t: string };
};
type Ronda = ReturnType<typeof armarRonda> & { activo: Activo };
type Textos = {
  loading: string; error: string; retry: string; round: string; question: string; blind: string;
  op: Record<string, string>; aria: string; ariaDone: string; base: string;
  verdict: Record<string, string>; points: string; point: string; reveal: string;
  next: string; see: string; tips: string[]; you: string; random: string;
  labels: { low: string; mid: string; high: string; top: string };
  streak: string; streakOne: string; copied: string; copyFailed: string;
  shareTitle: string; shareLine: string; shareFree: string;
  challenged: string; asOf: string; doneToday: string; otherDay: string; otherToday: string;
  freeNew: string; how1: string; eyebrowDaily: string; eyebrowFree: string;
  why: { size: string; t1: string; t2: string; t3: string; t4: string; t0: string };
  lesson: string; term: string;
  prog: { empty: string; of: string; cleared: string; day: string; none: string; calSummary: string; calLegend: string };
};
type Modo = 'diario' | 'libre';
type Filtro = 'todo' | Tipo;

/** Con prefers-reduced-motion no se desliza nada: ni el lienzo ni la página. */
const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = 640, H = 260;
const TOTAL = VENTANA + OCULTAS;
const FILTROS: Filtro[] = ['todo', 'index', 'stock', 'fx', 'crypto'];

function montar(raiz: HTMLElement) {
  const loc: Loc = raiz.dataset.locale === 'es' ? 'es' : 'en';
  const tag = loc === 'es' ? 'es-MX' : 'en-US';
  const q = <T extends Element>(s: string, base: ParentNode = raiz) => base.querySelector<T>(s);
  const leerJson = <X,>(sel: string): X | null => {
    const el = q<HTMLScriptElement>(sel);
    try { return el ? (JSON.parse(el.textContent || 'null') as X) : null; } catch { return null; }
  };
  const catalogo = leerJson<Activo[]>('[data-reto-activos]');
  const textos = leerJson<Textos>('[data-reto-textos]');
  if (!catalogo || !textos) return;
  // Copias ya sin null: el resto del archivo las usa dentro de funciones
  // anidadas y TypeScript no arrastra el estrechamiento hasta ahí.
  const activos: Activo[] = catalogo;
  const T: Textos = textos;

  const fDia = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long' });
  const fCorta = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' });
  const fLarga = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' });
  const fMes = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' });
  const limpia = (s: string) => s.replace(/\./g, '');
  const dFecha = (iso: string) => new Date(iso + 'T12:00:00Z');
  /** "+12.4 %" con el signo menos tipográfico y el punto decimal del idioma. */
  // El espacio antes del % es duro (\u00A0): con el normal, "Cayó más de 20 %"
  // partía el botón dejando el signo solo en la segunda línea.
  const pct = (n: number, dec = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtNum(Math.abs(n), loc, dec) + '\u00A0%';
  /** El umbral se enseña sin signo y sin decimales cuando es entero: "6 %". */
  const umbralTxt = (u: number) => fmtNum(u, loc, u % 1 === 0 ? 0 : 1) + '\u00A0%';
  const rellena = (s: string, vals: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (_, k) => String(vals[k] ?? ''));

  // ---- Nodos ----
  const elCargando = q<HTMLElement>('[data-reto-cargando]')!;
  const elError = q<HTMLElement>('[data-reto-error]')!;
  const elJuego = q<HTMLElement>('[data-reto-juego]')!;
  const elFinal = q<HTMLElement>('[data-reto-final]')!;
  const elLive = q<HTMLElement>('[data-reto-live]')!;
  const elFig = q<HTMLElement>('[data-reto-fig]')!;
  const svg = q<SVGSVGElement>('[data-reto-svg]')!;
  const gZoom = q<SVGGElement>('[data-reto-zoom]')!;
  const gGrid = q<SVGGElement>('[data-reto-grid]')!;
  const pLinea = q<SVGPathElement>('[data-reto-linea]')!;
  const pOculta = q<SVGPathElement>('[data-reto-oculta]')!;
  const rTapa = q<SVGRectElement>('[data-reto-tapa]')!;
  const rClip = q<SVGRectElement>('[data-reto-clip]')!;
  const lCorte = q<SVGLineElement>('[data-reto-corte]')!;
  const elQ = q<HTMLElement>('[data-reto-q]')!;
  const elY = q<HTMLElement>('[data-reto-ylabels]')!;
  const opciones = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.reto-op'));
  const elRevelado = q<HTMLElement>('[data-reto-revelado]')!;
  const btnSiguiente = q<HTMLButtonElement>('[data-reto-siguiente]')!;
  const elProgreso = q<HTMLElement>('[data-reto-progreso]')!;
  const elDesafio = q<HTMLElement>('[data-reto-desafio]')!;
  const elYa = q<HTMLElement>('[data-reto-ya]')!;
  const elLibre = q<HTMLElement>('[data-reto-libre]')!;
  const btnOtra = q<HTMLButtonElement>('[data-reto-otra]')!;
  const etiquetaOtra = btnOtra.textContent || '';
  const elManana = q<HTMLElement>('[data-reto-manana]')!;
  const elEyebrow = q<HTMLElement>('[data-reto-eyebrow]')!;
  const elFechaWrap = q<HTMLElement>('[data-reto-fecha-wrap]')!;
  const modos = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-reto-modo]'));
  const chips = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[data-reto-filtro]'));
  const chip = document.getElementById('reto-chip');

  // ---- Estado ----
  const hoy = fechaLocal(new Date());
  let modo: Modo = 'diario';
  let filtro: Filtro = 'todo';
  /** Ficha del reto libre. Va en la URL, así que se puede compartir. */
  let ficha = '';
  /** Qué día se está jugando en modo diario. Solo `hoy` cuenta para la racha. */
  let dia = hoy;
  let plan: { activos: string[]; cortes: number[] } = { activos: [], cortes: [] };
  let rondas: Ronda[] = [];
  let i = 0;
  /** Cómo se abre el lienzo al revelar la ronda que está en pantalla. */
  let zoomRonda = { a: 1, b: 0 };
  const respuestas: { elegida: number; real: number }[] = [];

  q<HTMLElement>('[data-reto-fecha]')!.textContent = limpia(fDia.format(dFecha(hoy)));
  // La fecha de la explicacion la pone el navegador: el HTML es estatico y se
  // sirve cacheado, asi que una fecha escrita en el build seria la del deploy.
  const how1 = q<HTMLElement>('[data-reto-how-1]');
  if (how1) how1.textContent = rellena(T.how1, { d: hoy });

  // Los puntos de avance.
  for (let n = 0; n < RONDAS; n++) elProgreso.append(document.createElement('span'));
  const marcasProgreso = Array.from(elProgreso.children) as HTMLElement[];

  // ---- Lo guardado, con el modo privado en mente ----
  // En Safari en modo privado localStorage existe pero lanza al escribir, y en
  // un iframe de terceros ni existe. Nada de eso puede tumbar la partida: sin
  // almacenamiento el juego funciona igual, solo que sin racha.
  function cargarProgreso() {
    try {
      return leerProgreso(localStorage.getItem(LLAVE), localStorage.getItem(LLAVE_V1));
    } catch { return progresoVacio(); }
  }
  function guardarProgreso(p: ReturnType<typeof progresoVacio>) {
    try { localStorage.setItem(LLAVE, JSON.stringify(p)); } catch { /* sin sitio: la partida sigue igual */ }
  }

  // ---- URL: reto compartido, reto libre compartido y día compartido ----
  const busca = new URLSearchParams(location.search);
  const libreUrl = busca.get('libre');
  if (libreUrl && /^[a-z0-9-]{1,32}$/.test(libreUrl)) {
    modo = 'libre';
    ficha = libreUrl;
    const trozo = libreUrl.split('-')[0] as Filtro;
    if (FILTROS.includes(trozo)) filtro = trozo;
  } else {
    const d = busca.get('d');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= hoy) dia = d;
  }
  // Alguien compartió su resultado: ?s=8&d=2026-08-23.
  // OJO con Number(null): sin ?s= daba 0 y el banner salía siempre diciendo
  // que alguien había sacado cero.
  const sCompartida = Number(busca.get('s'));
  if (busca.has('s') && Number.isInteger(sCompartida) && sCompartida >= 0 && sCompartida <= RONDAS * PUNTOS_POR_RONDA) {
    const cuando = limpia(fCorta.format(dFecha(dia)));
    elDesafio.replaceChildren(rellena(T.challenged, { s: sCompartida, max: RONDAS * PUNTOS_POR_RONDA, d: cuando }));
    elDesafio.hidden = false;
  }

  // ---- Modo ----
  function nuevaFicha() {
    // 6 caracteres de base 36: suficiente para que dos personas no coincidan y
    // corto para que quepa en un mensaje. No identifica a nadie: es azar puro.
    return filtro + '-' + Math.random().toString(36).slice(2, 8).replace(/[^a-z0-9]/g, '0');
  }

  function catalogoDelModo(): Activo[] {
    if (modo === 'diario') return activos.filter((a) => a.diario);
    return filtro === 'todo' ? activos : activos.filter((a) => a.tipo === filtro);
  }

  function armarPlan() {
    const lista = catalogoDelModo();
    const ids = lista.map((a) => a.id);
    plan = modo === 'diario' ? planDelReto(dia, ids) : planLibre(ficha, ids);
  }

  function pintarModo() {
    for (const b of modos) b.setAttribute('aria-pressed', String(b.dataset.retoModo === modo));
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.retoFiltro === filtro));
    elLibre.hidden = modo !== 'libre';
    elManana.hidden = modo !== 'diario';
    // En el reto libre no hay "reto del día": el rótulo dice lo que se juega.
    elEyebrow.textContent = modo === 'libre' ? T.eyebrowFree : T.eyebrowDaily;
    elFechaWrap.hidden = modo === 'libre';
    btnOtra.textContent = modo === 'libre' ? T.freeNew : etiquetaOtra;
    // Aviso de "hoy ya jugaste" o "estás jugando el de otro día".
    elYa.replaceChildren();
    elYa.hidden = true;
    if (modo !== 'diario') return;
    const prog = cargarProgreso();
    if (dia !== hoy) {
      elYa.append(rellena(T.otherDay, { d: limpia(fCorta.format(dFecha(dia))) }));
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'reto-aviso-link';
      a.textContent = T.otherToday;
      a.addEventListener('click', () => { dia = hoy; irA({ d: null, s: null, libre: null }); reiniciar(); });
      elYa.append(' ', a);
      elYa.hidden = false;
    } else if (yaJugado(prog, hoy)) {
      const g = prog.dias[hoy];
      elYa.append(rellena(T.doneToday, { p: g.p, max: g.m }));
      elYa.hidden = false;
    }
  }

  /** Cambia la URL sin recargar, para que el enlace sea el del reto que se ve. */
  function irA(cambios: Record<string, string | null>) {
    const u = new URL(location.href);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  }

  function reiniciar() {
    i = 0;
    respuestas.length = 0;
    elFinal.hidden = true;
    pintarModo();
    armarPlan();
    cargar();
  }

  // ---- Datos ----
  const cacheSeries = new Map<string, Promise<{ cierres: number[]; fechas: number[]; stale: boolean }>>();

  async function serie(pair: string): Promise<{ cierres: number[]; fechas: number[]; stale: boolean }> {
    const r = await fetch('/api/history?pair=' + encodeURIComponent(pair) + '&range=5Y', { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('history ' + r.status);
    const j = (await r.json()) as { points?: [number, number][]; stale?: boolean };
    const pts = (j.points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[1]) && p[1] > 0);
    if (pts.length < TOTAL + 20) throw new Error('serie corta: ' + pts.length);
    return { cierres: pts.map((p) => p[1]), fechas: pts.map((p) => p[0] * 1000), stale: j.stale === true };
  }

  /**
   * Una petición por PAR, no por ronda: en el reto libre filtrado un activo
   * puede salir dos veces con otro corte, y pedir su serie dos veces sería
   * gastarle al proveedor una llamada por nada.
   */
  function serieCacheada(pair: string) {
    let p = cacheSeries.get(pair);
    if (!p) {
      // Un reintento: el arranque en frío de la función se cae de vez en cuando.
      p = serie(pair).catch(() => serie(pair));
      cacheSeries.set(pair, p);
      p.catch(() => cacheSeries.delete(pair));
    }
    return p;
  }

  async function cargar() {
    elError.hidden = true;
    elCargando.hidden = false;
    elJuego.hidden = true;
    elFinal.hidden = true;
    const planActual = plan;
    try {
      const series = await Promise.all(planActual.activos.map(async (id) => {
        const a = activos.find((x) => x.id === id)!;
        return { a, s: await serieCacheada(a.pair) };
      }));
      // Mientras se bajaban las series se pudo cambiar de modo: entonces esto
      // ya no es lo que hay en pantalla y pintarlo sería pisar la partida nueva.
      if (planActual !== plan) return;
      rondas = series.map(({ a, s }, n) => ({
        ...armarRonda({ id: a.id, cierres: s.cierres, fechas: s.fechas, fraccion: planActual.cortes[n] }),
        activo: a
      }));
      const ultimo = Math.max(...series.map(({ s }) => s.fechas[s.fechas.length - 1]));
      if (chip) {
        chip.dataset.fresh = series.some(({ s }) => s.stale) ? 'stale' : 'fresh';
        const t = chip.querySelector('.sc-time');
        if (t) t.textContent = rellena(T.asOf, { d: limpia(fLarga.format(new Date(ultimo))) });
      }
      i = 0;
      respuestas.length = 0;
      elCargando.hidden = true;
      elJuego.hidden = false;
      pintarRonda();
    } catch (err) {
      console.error('reto: no se pudieron traer las series', err);
      elCargando.hidden = true;
      elError.hidden = false;
    }
  }

  // ---- Dibujo ----
  const x = (n: number) => (n / (TOTAL - 1)) * W;
  const xCorte = x(VENTANA - 1);

  function dominio(vals: number[]): [number, number] {
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = max - min || Math.abs(max) * 0.02 || 1;
    return [min - span * 0.1, max + span * 0.1];
  }
  const yEn = (v: number, d: [number, number]) => H * (1 - (v - d[0]) / (d[1] - d[0]));
  const ruta = (vals: number[], desde: number, d: [number, number]) =>
    vals.map((v, n) => (n ? 'L' : 'M') + x(desde + n).toFixed(1) + ' ' + yEn(v, d).toFixed(1)).join(' ');

  /** Escala visible → escala completa, como translate+scaleY del grupo. */
  function zoom(dv: [number, number], df: [number, number]) {
    const spanV = dv[1] - dv[0], spanF = df[1] - df[0];
    const a = spanV / spanF;
    const b = H - (H * (dv[0] - df[0])) / spanF - H * a;
    return { a, b };
  }

  function pintarRonda() {
    const r = rondas[i];
    const corte = r.visibles[r.visibles.length - 1];
    const refs = [corte * (1 + r.umbral / 100), corte * (1 - r.umbral / 100)];
    const dv = dominio([...r.visibles, ...refs]);
    const df = dominio([...r.visibles, ...r.ocultos, ...refs]);
    const z = zoom(dv, df);

    // Sin animación mientras se rearma: si no, el revelado de la ronda
    // anterior se ve corriendo al revés.
    elFig.classList.add('reto-sin-anim');
    elFig.dataset.fase = 'pregunta';
    delete elFig.dataset.dir;
    gZoom.removeAttribute('transform');

    pLinea.setAttribute('d', ruta(r.visibles, 0, dv));
    pOculta.setAttribute('d', ruta([corte, ...r.ocultos], VENTANA - 1, dv));
    rTapa.setAttribute('x', String(xCorte));
    rTapa.setAttribute('width', String(W - xCorte));
    rClip.setAttribute('x', String(xCorte));
    rClip.setAttribute('width', String(W - xCorte));
    lCorte.setAttribute('x1', String(xCorte));
    lCorte.setAttribute('x2', String(xCorte));
    elQ.style.left = (((xCorte + W) / 2 / W) * 100).toFixed(2) + '%';

    // Rejilla: el nivel del último punto visible y el umbral arriba y abajo.
    const niveles = [
      { v: refs[0], txt: '+' + umbralTxt(r.umbral), cero: false },
      { v: corte, txt: '0\u00A0%', cero: true },
      { v: refs[1], txt: '−' + umbralTxt(r.umbral), cero: false }
    ];
    gGrid.innerHTML = niveles
      .map((n) => `<line x1="0" x2="${W}" y1="${yEn(n.v, dv).toFixed(1)}" y2="${yEn(n.v, dv).toFixed(1)}"${n.cero ? ' class="reto-cero"' : ''}/>`)
      .join('');
    elY.innerHTML = niveles
      .map((n) => `<span data-v="${n.v}" style="top:${((yEn(n.v, dv) / H) * 100).toFixed(2)}%">${n.txt}</span>`)
      .join('');
    zoomRonda = z;

    // Textos de la ronda.
    q<HTMLElement>('[data-reto-ronda]')!.textContent = rellena(T.round, { n: i + 1, total: RONDAS });
    q<HTMLElement>('[data-reto-cap-izq]')!.textContent = T.base;
    q<HTMLElement>('[data-reto-cap-der]')!.textContent = rellena(T.blind, { n: VENTANA + 1, m: TOTAL });
    svg.setAttribute('aria-label', rellena(T.aria, { n: i + 1 }));

    for (const b of opciones) {
      b.removeAttribute('aria-disabled');
      b.removeAttribute('tabindex');
      b.classList.remove('es-correcta', 'es-elegida', 'es-fallo');
      b.querySelector('[data-etiqueta]')!.textContent = rellena(T.op[b.dataset.banda!], { u: umbralTxt(r.umbral) });
    }
    elRevelado.hidden = true;
    for (const [n, m] of marcasProgreso.entries()) {
      if (n < i) m.dataset.p = String(puntosDeRonda(respuestas[n].elegida, respuestas[n].real));
      else if (n === i) m.dataset.p = 'now';
      else delete m.dataset.p;
    }
    requestAnimationFrame(() => elFig.classList.remove('reto-sin-anim'));
  }

  /** La frase de "por qué", que sale SOLO de los precios. */
  function porque(r: Ronda) {
    const tam = rellena(T.why.size, { p: Math.max(1, Math.round(100 - r.percentil)) });
    const t = r.tendencia === 0 ? T.why.t0
      : r.tendencia > 0 ? (r.siguio ? T.why.t1 : T.why.t2)
        : (r.siguio ? T.why.t3 : T.why.t4);
    return t + ' ' + tam;
  }

  function responder(elegida: number) {
    const r = rondas[i];
    if (elFig.dataset.fase === 'revelado') return;
    const gana = puntosDeRonda(elegida, r.banda);
    respuestas.push({ elegida, real: r.banda });
    // Una sola vez por partida: lo que se quiere saber es cuánta gente empieza
    // el reto de las que abren la página, no cuántas rondas contesta.
    medirUnaVez('reto_empezado');

    elFig.dataset.fase = 'revelado';
    elFig.dataset.dir = r.cambio >= 0 ? 'up' : 'down';
    const z = zoomRonda;
    gZoom.setAttribute('transform', `translate(0 ${z.b.toFixed(2)}) scale(1 ${z.a.toFixed(4)})`);
    for (const s of Array.from(elY.children) as HTMLElement[]) {
      const top = parseFloat(s.style.top);
      s.style.top = ((z.a * ((top / 100) * H) + z.b) / H * 100).toFixed(2) + '%';
    }

    for (const b of opciones) {
      // aria-disabled y no disabled: un botón deshabilitado pierde el foco y
      // quien navega con teclado se queda tirado en el <body>. Así el foco se
      // queda en la respuesta que pulsó.
      b.setAttribute('aria-disabled', 'true');
      if (Number(b.dataset.banda) === r.banda) b.classList.add('es-correcta');
      if (Number(b.dataset.banda) === elegida) {
        b.classList.add('es-elegida');
        if (gana === 0) b.classList.add('es-fallo');
      } else {
        // Las otras tres salen del recorrido: el siguiente Tab es "Siguiente".
        b.tabIndex = -1;
      }
    }
    marcasProgreso[i].dataset.p = String(gana);

    const cifra = q<HTMLElement>('[data-reto-cifra]')!;
    // El % va en su propio <span> más chico: a 3rem, el espacio de una mono
    // deja un hueco enorme entre la cifra y el signo.
    const signo = document.createElement('span');
    signo.className = 'reto-cifra-pct';
    signo.textContent = '%';
    cifra.replaceChildren(document.createTextNode(pct(r.cambio).replace('\u00A0%', '')), signo);
    cifra.className = 'reto-cifra num ' + (r.cambio >= 0 ? 'up' : 'down');
    q<HTMLElement>('[data-reto-veredicto]')!.textContent = T.verdict[String(gana)];
    q<HTMLElement>('[data-reto-gan]')!.textContent = gana === 0 ? '' : gana === 1 ? T.point : rellena(T.points, { p: gana });
    const fechas = { from: limpia(fLarga.format(new Date(r.finVisible))), to: limpia(fLarga.format(new Date(r.hasta))) };
    const [antes, despues] = T.reveal.split('{name}');
    const enlace = document.createElement('a');
    enlace.href = r.activo.href;
    enlace.textContent = r.activo.name;
    q<HTMLElement>('[data-reto-detalle]')!.replaceChildren(
      document.createTextNode(rellena(antes, fechas)), enlace, document.createTextNode(rellena(despues, fechas))
    );
    q<HTMLElement>('[data-reto-porque]')!.textContent = porque(r);
    q<HTMLElement>('[data-reto-tip]')!.textContent = T.tips[i] || '';
    // A dónde ir a entender esta ronda: la lección del activo y su término.
    const aLeccion = q<HTMLAnchorElement>('[data-reto-leccion]')!;
    aLeccion.href = r.activo.leccion.href;
    aLeccion.textContent = rellena(T.lesson, { t: r.activo.leccion.t }) + '\u00A0→';
    aLeccion.hidden = !r.activo.leccion.t;
    const aTermino = q<HTMLAnchorElement>('[data-reto-termino]')!;
    aTermino.href = r.activo.termino.href;
    aTermino.textContent = rellena(T.term, { t: r.activo.termino.t }) + '\u00A0→';
    btnSiguiente.textContent = i === RONDAS - 1 ? T.see : T.next;
    elRevelado.hidden = false;
    // En un teléfono el revelado nace debajo del pliegue: sin esto se contesta
    // y no se ve el resultado hasta que uno adivina que hay que bajar. Se baja
    // lo justo, y contando la barra inferior fija (56 px + área segura), que
    // con scrollIntoView({block:'end'}) se comía las dos últimas líneas.
    const falta = elRevelado.getBoundingClientRect().bottom - (window.innerHeight - 76);
    if (falta > 0) window.scrollBy({ top: falta, behavior: suave ? 'smooth' : 'auto' });
    svg.setAttribute('aria-label', rellena(T.ariaDone, { n: i + 1, pct: pct(r.cambio) }));
    elLive.textContent = T.verdict[String(gana)] + ' ' + pct(r.cambio) + '. ' +
      rellena(T.reveal, { name: r.activo.name, ...fechas }) + '. ' + porque(r);
  }

  // ---- Resultado ----
  function terminar() {
    const res = resumen(respuestas);
    // Puntos (0–10, con parcial por acertar la dirección) y aciertos limpios
    // (0–5). Los dos, porque terminar con 5/5 y con 0/5 se lee distinto.
    medir('reto_terminado', { puntos: res.puntos, aciertos: res.exactas });
    elJuego.hidden = true;
    elFinal.hidden = false;

    const total = q<HTMLElement>('[data-reto-total]')!;
    total.innerHTML = '';
    total.append(String(res.puntos));
    const small = document.createElement('small');
    small.textContent = ' / ' + res.max;
    total.append(small);

    q<HTMLElement>('[data-reto-emojis]')!.textContent = cuadricula(respuestas);
    const clave = res.puntos <= 2 ? 'low' : res.puntos <= 5 ? 'mid' : res.puntos <= 8 ? 'high' : 'top';
    q<HTMLElement>('[data-reto-etiqueta]')!.textContent = T.labels[clave];
    q<HTMLElement>('[data-reto-tu]')!.textContent = T.you;
    q<HTMLElement>('[data-reto-azar]')!.textContent = T.random;
    q<SVGRectElement>('[data-reto-barra-tu]')!.setAttribute('width', String((res.puntos / res.max) * 100));
    q<HTMLElement>('[data-reto-barra-tu-n]')!.textContent = String(res.puntos);
    // El 3.75 no está escrito a mano en ningún sitio: sale de las reglas del
    // juego, así que si algún día cambian las bandas, la comparación no miente.
    q<SVGRectElement>('[data-reto-barra-azar]')!.setAttribute('width', String((res.azar / res.max) * 100));
    q<HTMLElement>('[data-reto-barra-azar-n]')!.textContent = fmtNum(res.azar, loc, 2);

    // Racha: solo el reto DIARIO de HOY, y solo el primer intento.
    let racha = 0;
    if (modo === 'diario' && dia === hoy) {
      const prog = registrarDia(cargarProgreso(), { fecha: hoy, puntos: res.puntos, max: res.max, exactas: res.exactas });
      guardarProgreso(prog);
      racha = rachaVigente(prog, hoy);
      pintarPanel();
    }
    const elRacha = q<HTMLElement>('[data-reto-racha]')!;
    elRacha.textContent = racha === 1 ? T.streakOne : rellena(T.streak, { n: racha });
    elRacha.hidden = racha < 1;

    q<HTMLTextAreaElement>('[data-reto-texto]')!.value = textoParaCompartir(res, racha);
    elLive.textContent = res.puntos + ' / ' + res.max + '. ' + T.labels[clave];
    // El foco va al marcador (para quien navega con teclado) pero SIN mover la
    // página con él: la vista la coloca el bloque entero, que así entra con su
    // "Tu resultado" arriba y no cortado por la barra superior.
    (q<HTMLElement>('.reto-marcador') as HTMLElement).focus({ preventScroll: true });
    elFinal.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' });
  }

  /**
   * Lo que se copia al portapapeles: la cuadrícula, la puntuación, el número
   * del azar, la racha si está viva y el enlace del MISMO reto.
   *
   * No lleva ni un dato personal, y no lleva las respuestas: quien lo reciba ve
   * cuántas clavaste, no cuáles, así que el reto no se le destripa.
   */
  function textoParaCompartir(res: ReturnType<typeof resumen>, racha: number) {
    const url = new URL(location.origin + location.pathname);
    if (modo === 'libre') url.searchParams.set('libre', ficha);
    else { url.searchParams.set('s', String(res.puntos)); url.searchParams.set('d', dia); }
    const cabeza = modo === 'libre'
      ? T.shareFree
      : rellena(T.shareTitle, { d: limpia(fCorta.format(dFecha(dia))) });
    const lineas = [cabeza, cuadricula(respuestas) + '  ' + rellena(T.shareLine, { p: res.puntos, max: res.max })];
    if (modo === 'diario' && racha > 1) lineas.push(rellena(T.streak, { n: racha }));
    lineas.push(url.toString());
    return lineas.join('\n');
  }

  // ---- Racha, totales y calendario ----
  function pintarPanel() {
    const prog = cargarProgreso();
    const tot = totales(prog);
    const elVacio = q<HTMLElement>('[data-reto-vacio]')!;
    const elStats = q<HTMLElement>('[data-reto-stats]')!;
    const elCal = q<HTMLElement>('[data-reto-cal]')!;
    const elLey = q<HTMLElement>('[data-reto-cal-leyenda]')!;
    const hayAlgo = tot.dias > 0;
    elVacio.hidden = hayAlgo;
    elStats.hidden = !hayAlgo;
    elCal.hidden = !hayAlgo;
    elLey.hidden = !hayAlgo;
    if (!hayAlgo) return;

    q<HTMLElement>('[data-reto-st-racha]')!.textContent = String(rachaVigente(prog, hoy));
    q<HTMLElement>('[data-reto-st-mejor]')!.textContent = String(tot.mejorRacha);
    q<HTMLElement>('[data-reto-st-dias]')!.textContent = String(tot.dias);
    const elClavadas = q<HTMLElement>('[data-reto-st-clavadas]')!;
    const deN = document.createElement('small');
    deN.textContent = rellena(T.prog.of, { n: tot.max / PUNTOS_POR_RONDA });
    elClavadas.replaceChildren(document.createTextNode(String(tot.exactas)), deN);

    const [ano, mes] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7))];
    const cal = calendario(prog, ano, mes, hoy);
    const elMes = q<HTMLElement>('[data-reto-cal-mes]')!;
    elMes.textContent = limpia(fMes.format(dFecha(hoy)));
    const rejilla = q<HTMLElement>('[data-reto-cal-rejilla]')!;
    rejilla.replaceChildren();
    let jugados = 0, pasados = 0;
    for (const semana of cal.semanas) {
      for (const celda of semana) {
        const s = document.createElement('span');
        s.className = 'reto-cal-dia';
        if (!celda) { s.classList.add('es-hueco'); rejilla.append(s); continue; }
        s.textContent = String(celda.dia);
        if (celda.hoy) s.dataset.hoy = 'si';
        if (celda.futuro) s.dataset.futuro = 'si';
        else pasados++;
        if (celda.jugado && celda.max) {
          jugados++;
          // Cuatro tonos y no diez: lo que se lee de un vistazo es "vine" y
          // "me fue bien", no la puntuación exacta, que está en el título.
          const r = celda.puntos! / celda.max;
          s.dataset.n = String(r <= 0.3 ? 1 : r <= 0.6 ? 2 : r <= 0.85 ? 3 : 4);
          s.title = rellena(T.prog.day, { d: celda.dia, p: celda.puntos!, max: celda.max });
        } else if (!celda.futuro) {
          s.title = rellena(T.prog.none, { d: celda.dia });
        }
        rejilla.append(s);
      }
    }
    // La rejilla es un dibujo (aria-hidden en el marcado); lo que lee un lector
    // de pantalla es esta línea, que dice lo mismo en una frase.
    elLey.textContent = rellena(T.prog.calSummary, { n: jugados, m: pasados }) + ' ' + T.prog.calLegend;
  }

  // ---- Escuchas ----
  for (const b of opciones) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      responder(Number(b.dataset.banda));
    });
  }
  btnSiguiente.addEventListener('click', () => {
    if (i === RONDAS - 1) { terminar(); return; }
    i++;
    pintarRonda();
    opciones[0].focus();
  });
  q<HTMLButtonElement>('[data-reto-reintentar]')!.addEventListener('click', cargar);
  btnOtra.addEventListener('click', () => {
    if (modo === 'libre') { ficha = nuevaFicha(); irA({ libre: ficha }); reiniciar(); return; }
    i = 0;
    respuestas.length = 0;
    elFinal.hidden = true;
    elJuego.hidden = false;
    pintarRonda();
    opciones[0].focus();
  });

  for (const b of modos) {
    b.addEventListener('click', () => {
      const nuevo = b.dataset.retoModo as Modo;
      if (nuevo === modo) return;
      modo = nuevo;
      if (modo === 'libre') { ficha = nuevaFicha(); irA({ libre: ficha, s: null, d: null }); }
      else { dia = hoy; irA({ libre: null }); }
      reiniciar();
    });
  }
  for (const c of chips) {
    c.addEventListener('click', () => {
      const nuevo = c.dataset.retoFiltro as Filtro;
      if (nuevo === filtro) return;
      filtro = nuevo;
      ficha = nuevaFicha();
      irA({ libre: ficha });
      reiniciar();
    });
  }
  q<HTMLButtonElement>('[data-reto-otro-libre]')!.addEventListener('click', () => {
    ficha = nuevaFicha();
    irA({ libre: ficha });
    reiniciar();
  });

  // Borrar el progreso: con confirmación a la vista, no con un confirm() del
  // navegador (que en un móvil sale como un aviso del sitio y da mala espina).
  const btnBorrar = q<HTMLButtonElement>('[data-reto-borrar]')!;
  const cajaBorrar = q<HTMLElement>('[data-reto-confirmar]')!;
  btnBorrar.addEventListener('click', () => {
    cajaBorrar.hidden = false;
    btnBorrar.hidden = true;
    q<HTMLButtonElement>('[data-reto-borrar-si]')!.focus();
  });
  q<HTMLButtonElement>('[data-reto-borrar-no]')!.addEventListener('click', () => {
    cajaBorrar.hidden = true;
    btnBorrar.hidden = false;
    btnBorrar.focus();
  });
  q<HTMLButtonElement>('[data-reto-borrar-si]')!.addEventListener('click', () => {
    try { localStorage.removeItem(LLAVE); localStorage.removeItem(LLAVE_V1); } catch { /* nada que borrar */ }
    cajaBorrar.hidden = true;
    btnBorrar.hidden = false;
    pintarPanel();
    pintarModo();
    q<HTMLElement>('[data-reto-vacio]')!.textContent = T.prog.cleared;
    elLive.textContent = T.prog.cleared;
    btnBorrar.focus();
  });

  const btnCopiar = q<HTMLButtonElement>('[data-reto-copiar]')!;
  const etiquetaCopiar = btnCopiar.textContent || '';
  let temporizador = 0;
  btnCopiar.addEventListener('click', async () => {
    const area = q<HTMLTextAreaElement>('[data-reto-texto]')!;
    let ok = true;
    try { await navigator.clipboard.writeText(area.value); } catch { ok = false; }
    if (!ok) { area.hidden = false; area.select(); }
    btnCopiar.textContent = ok ? T.copied : T.copyFailed;
    elLive.textContent = ok ? T.copied : T.copyFailed;
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => { btnCopiar.textContent = etiquetaCopiar; }, 2400);
  });

  pintarModo();
  pintarPanel();
  armarPlan();
  cargar();
}

document.querySelectorAll<HTMLElement>('[data-reto]').forEach(montar);
