// El reto del día en el navegador (src/components/challenge/Challenge.astro).
//
// Lo único que hace este archivo es: pedir las cinco series a /api/history,
// dibujar la gráfica ciega en SVG, escuchar los cuatro botones y pintar el
// resultado. Las reglas —semilla del día, corte de la ventana, umbral, banda y
// puntuación— viven en src/lib/challenge/reto.mjs, que es lo que cubren las
// pruebas de `node --test`. Aquí no se calcula nada del juego.
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
  fechaLocal, planDelReto, armarRonda, puntosDeRonda, resumen, cuadricula, nuevaRacha,
  RONDAS, VENTANA, OCULTAS, ESPERADO_AL_AZAR
} from '../lib/challenge/reto.mjs';
import { fmtNum, type Loc } from './format';

type Activo = { id: string; pair: string; sym: string; name: string; href: string };
type Ronda = ReturnType<typeof armarRonda> & { activo: Activo };
type Textos = {
  loading: string; error: string; retry: string; round: string; question: string; blind: string;
  op: Record<string, string>; aria: string; ariaDone: string; base: string;
  verdict: Record<string, string>; points: string; point: string; reveal: string;
  next: string; see: string; tips: string[]; you: string; random: string;
  labels: { low: string; mid: string; high: string; top: string };
  streak: string; streakOne: string; copied: string; copyFailed: string;
  shareTitle: string; shareLine: string; challenged: string; asOf: string;
};

const LLAVE = 'sf:reto:v1';
const W = 640, H = 260;
const TOTAL = VENTANA + OCULTAS;

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
  const limpia = (s: string) => s.replace(/\./g, '');
  /** "+12.4 %" con el signo menos tipográfico y el punto decimal del idioma. */
  const pct = (n: number, dec = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmtNum(Math.abs(n), loc, dec) + ' %';
  /** El umbral se enseña sin signo y sin decimales cuando es entero: "6 %". */
  const umbralTxt = (u: number) => fmtNum(u, loc, u % 1 === 0 ? 0 : 1) + ' %';
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
  const chip = document.getElementById('reto-chip');

  // ---- Estado ----
  const hoy = fechaLocal(new Date());
  const plan = planDelReto(hoy, activos.map((a) => a.id));
  let rondas: Ronda[] = [];
  let i = 0;
  const respuestas: { elegida: number; real: number }[] = [];

  q<HTMLElement>('[data-reto-fecha]')!.textContent = limpia(fDia.format(new Date(hoy + 'T12:00:00Z')));

  // Alguien compartió su resultado: ?s=8&d=2026-08-23.
  const busca = new URLSearchParams(location.search);
  const sCompartida = Number(busca.get('s'));
  if (Number.isFinite(sCompartida) && sCompartida >= 0 && sCompartida <= RONDAS * 2) {
    const banner = q<HTMLElement>('[data-reto-desafio]')!;
    const dia = busca.get('d');
    const cuando = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? limpia(fCorta.format(new Date(dia + 'T12:00:00Z'))) : limpia(fCorta.format(new Date(hoy + 'T12:00:00Z')));
    banner.innerHTML = '';
    banner.append(rellena(T.challenged, { s: sCompartida, max: RONDAS * 2, d: cuando }));
    banner.hidden = false;
  }

  // Los puntos de avance.
  for (let n = 0; n < RONDAS; n++) elProgreso.append(document.createElement('span'));
  const marcasProgreso = Array.from(elProgreso.children) as HTMLElement[];

  // ---- Datos ----
  async function serie(pair: string): Promise<{ cierres: number[]; fechas: number[]; stale: boolean }> {
    const r = await fetch('/api/history?pair=' + encodeURIComponent(pair) + '&range=5Y', { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('history ' + r.status);
    const j = (await r.json()) as { points?: [number, number][]; stale?: boolean };
    const pts = (j.points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[1]) && p[1] > 0);
    if (pts.length < TOTAL + 20) throw new Error('serie corta: ' + pts.length);
    return { cierres: pts.map((p) => p[1]), fechas: pts.map((p) => p[0] * 1000), stale: j.stale === true };
  }

  async function cargar() {
    elError.hidden = true;
    elCargando.hidden = false;
    elJuego.hidden = true;
    elFinal.hidden = true;
    try {
      const series = await Promise.all(plan.activos.map(async (id) => {
        const a = activos.find((x) => x.id === id)!;
        // Un reintento: el arranque en frío de la función se cae de vez en cuando.
        try { return { a, s: await serie(a.pair) }; } catch { return { a, s: await serie(a.pair) }; }
      }));
      rondas = series.map(({ a, s }, n) => ({
        ...armarRonda({ id: a.id, cierres: s.cierres, fechas: s.fechas, fraccion: plan.cortes[n] }),
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
      { v: corte, txt: '0', cero: true },
      { v: refs[1], txt: '−' + umbralTxt(r.umbral), cero: false }
    ];
    gGrid.innerHTML = niveles
      .map((n) => `<line x1="0" x2="${W}" y1="${yEn(n.v, dv).toFixed(1)}" y2="${yEn(n.v, dv).toFixed(1)}"${n.cero ? ' class="reto-cero"' : ''}/>`)
      .join('');
    elY.innerHTML = niveles
      .map((n) => `<span data-v="${n.v}" style="top:${((yEn(n.v, dv) / H) * 100).toFixed(2)}%">${n.txt}</span>`)
      .join('');
    elY.dataset.zoom = JSON.stringify(z);

    // Textos de la ronda.
    q<HTMLElement>('[data-reto-ronda]')!.textContent = rellena(T.round, { n: i + 1, total: RONDAS });
    q<HTMLElement>('[data-reto-cap-izq]')!.textContent = T.base;
    q<HTMLElement>('[data-reto-cap-der]')!.textContent = rellena(T.blind, { n: VENTANA + 1, m: TOTAL });
    svg.setAttribute('aria-label', rellena(T.aria, { n: i + 1 }));

    for (const b of opciones) {
      b.removeAttribute('aria-disabled');
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

  function responder(elegida: number) {
    const r = rondas[i];
    if (elFig.dataset.fase === 'revelado') return;
    const gana = puntosDeRonda(elegida, r.banda);
    respuestas.push({ elegida, real: r.banda });

    elFig.dataset.fase = 'revelado';
    elFig.dataset.dir = r.cambio >= 0 ? 'up' : 'down';
    const z = JSON.parse(elY.dataset.zoom || '{"a":1,"b":0}') as { a: number; b: number };
    gZoom.setAttribute('transform', `translate(0 ${z.b.toFixed(2)}) scale(1 ${z.a.toFixed(4)})`);
    for (const s of Array.from(elY.children) as HTMLElement[]) {
      const top = parseFloat(s.style.top);
      s.style.top = ((z.a * ((top / 100) * H) + z.b) / H * 100).toFixed(2) + '%';
    }

    for (const b of opciones) {
      b.setAttribute('aria-disabled', 'true');
      if (Number(b.dataset.banda) === r.banda) b.classList.add('es-correcta');
      if (Number(b.dataset.banda) === elegida) {
        b.classList.add('es-elegida');
        if (gana === 0) b.classList.add('es-fallo');
      }
    }
    marcasProgreso[i].dataset.p = String(gana);

    const cifra = q<HTMLElement>('[data-reto-cifra]')!;
    cifra.textContent = pct(r.cambio);
    cifra.className = 'reto-cifra num ' + (r.cambio >= 0 ? 'up' : 'down');
    q<HTMLElement>('[data-reto-veredicto]')!.textContent = T.verdict[String(gana)];
    q<HTMLElement>('[data-reto-gan]')!.textContent = gana === 0 ? '' : gana === 1 ? T.point : rellena(T.points, { p: gana });
    q<HTMLElement>('[data-reto-detalle]')!.textContent = rellena(T.reveal, {
      name: r.activo.name, from: limpia(fLarga.format(new Date(r.finVisible))), to: limpia(fLarga.format(new Date(r.hasta)))
    });
    q<HTMLElement>('[data-reto-tip]')!.textContent = T.tips[i] || '';
    btnSiguiente.textContent = i === RONDAS - 1 ? T.see : T.next;
    elRevelado.hidden = false;
    svg.setAttribute('aria-label', rellena(T.ariaDone, { n: i + 1, pct: pct(r.cambio) }));
    elLive.textContent = T.verdict[String(gana)] + ' ' + pct(r.cambio) + '. ' +
      rellena(T.reveal, { name: r.activo.name, from: limpia(fLarga.format(new Date(r.finVisible))), to: limpia(fLarga.format(new Date(r.hasta))) });
  }

  // ---- Resultado ----
  function terminar() {
    const res = resumen(respuestas);
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

    // Racha, solo en este teléfono.
    let racha = 1;
    try {
      const g = JSON.parse(localStorage.getItem(LLAVE) || 'null');
      racha = nuevaRacha(g, hoy);
      localStorage.setItem(LLAVE, JSON.stringify({ ultimoDia: hoy, racha, puntos: res.puntos }));
    } catch { /* modo privado o almacenamiento lleno: la partida sigue igual */ }
    const elRacha = q<HTMLElement>('[data-reto-racha]')!;
    elRacha.textContent = racha === 1 ? T.streakOne : rellena(T.streak, { n: racha });
    elRacha.hidden = false;

    const url = location.origin + location.pathname + '?s=' + res.puntos + '&d=' + hoy;
    const texto = [
      rellena(T.shareTitle, { d: limpia(fCorta.format(new Date(hoy + 'T12:00:00Z'))) }),
      cuadricula(respuestas),
      rellena(T.shareLine, { p: res.puntos, max: res.max }),
      url
    ].join('\n');
    q<HTMLTextAreaElement>('[data-reto-texto]')!.value = texto;
    q<HTMLElement>('[data-reto-total]')!.setAttribute('aria-label', res.puntos + ' / ' + res.max);
    elLive.textContent = res.puntos + ' / ' + res.max + '. ' + T.labels[clave];
    (q<HTMLElement>('.reto-marcador') as HTMLElement).focus();
    // El número del azar sale de la librería: si algún día cambian las bandas,
    // este texto no se queda mintiendo.
    void ESPERADO_AL_AZAR;
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
  q<HTMLButtonElement>('[data-reto-otra]')!.addEventListener('click', () => {
    i = 0;
    respuestas.length = 0;
    elFinal.hidden = true;
    elJuego.hidden = false;
    pintarRonda();
    opciones[0].focus();
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

  cargar();
}

document.querySelectorAll<HTMLElement>('[data-reto]').forEach(montar);
