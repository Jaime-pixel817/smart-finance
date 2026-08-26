// Smart Finance AI en el navegador: abre la hoja, pide la explicación y la
// pinta. Toda la parte delicada (el bloque DATOS, el clasificador de consejo,
// la guardia de cifras, el tope de gasto) está en el servidor —
// api/_lib/ia.js— porque aquí no se puede garantizar nada.
//
// Lo que este archivo SÍ garantiza:
//   · lo que se manda son identificadores, nunca cifras. Si el navegador
//     mandara los números, cualquiera podría hacer que la IA explicara datos
//     falsos con la etiqueta del sitio encima. (El historial de la
//     conversación viaja como contexto de LECTURA y el servidor no lo usa
//     para respaldar ninguna cifra — la regla sigue en pie.)
//   · la etiqueta de IA y la fecha del dato se pintan SIEMPRE, también cuando
//     la respuesta es un rechazo o un error.
//   · el estado de carga dice la verdad: hay tres puntos y, si pasa de seis
//     segundos, una frase que explica por qué tarda. Nada de barras de
//     progreso inventadas.
//   · la conversación tiene tope y lo dice: MAX_PREGUNTAS repreguntas por
//     contexto, y al llegar la caja se cierra con una frase, no en silencio.
//     El historial vive SOLO en localStorage (sf-ia-charla-v1), nunca en un
//     servidor, y caduca en una hora.
//
// Ningún texto vive aquí: viajan en data-strings desde AISheet.astro, que los
// saca de src/i18n/ui.ts.

interface Respuesta {
  respuesta: string;
  preguntas?: string[];
  datosUsados?: string[];
  fuentes?: { titulo: string; url: string | null }[];
  asOf?: string | null;
  titulo?: string;
  leccion?: string | null;
  rechazada?: string;
  generadoPor?: string;
  metodologia?: string;
  error?: string;
}

interface Contexto {
  tipo: string;
  id: string;
  modo: string;
  rango?: string;
  sobre: string;
}

interface Turno {
  p: string;
  r: string;
}

const MAX_PREGUNTAS = 3;
const CLAVE_CHARLA = 'sf-ia-charla-v1';
const CHARLA_TTL_MS = 60 * 60 * 1000;

const sheet = document.getElementById('ia-sheet');

if (sheet) {
  const panel = sheet.querySelector<HTMLElement>('.ia-sheet-panel')!;
  const titulo = sheet.querySelector<HTMLElement>('#ia-sheet-title')!;
  const cuerpo = sheet.querySelector<HTMLElement>('.ia-cuerpo')!;
  const asOf = sheet.querySelector<HTMLElement>('.ia-asof')!;
  const disclosure = sheet.querySelector<HTMLElement>('.ia-disclosure-txt')!;
  const form = sheet.querySelector<HTMLFormElement>('.ia-ask')!;
  const input = sheet.querySelector<HTMLInputElement>('#ia-ask-input')!;
  const cerrar = sheet.querySelector<HTMLButtonElement>('.ia-sheet-close')!;
  const sugeridas = sheet.querySelector<HTMLElement>('.ia-sugeridas')!;
  const sugChips = sheet.querySelector<HTMLElement>('.ia-sug-chips')!;
  const txt = JSON.parse(sheet.dataset.strings || '{}') as Record<string, string>;
  const sugPorTipo = JSON.parse(sheet.dataset.sugeridas || '{}') as Record<string, string[]>;
  const lang = sheet.dataset.locale === 'en' ? 'en' : 'es';

  let abridor: HTMLElement | null = null;
  let contexto: Contexto | null = null;
  let peticion = 0;
  // La conversación de ESTE contexto: la primera explicación y las repreguntas.
  let charla: Turno[] = [];
  let preguntasHechas = 0;

  // -- la charla en localStorage --------------------------------------------

  const claveCtx = () => (contexto ? contexto.tipo + ':' + contexto.id + ':' + lang : '');

  function guardarCharla() {
    // Solo si la persona preguntó algo: la explicación automática ya la
    // regala la caché del servidor y no hace falta recordarla aquí.
    if (!preguntasHechas) return;
    try {
      localStorage.setItem(CLAVE_CHARLA, JSON.stringify({
        ctx: claveCtx(), items: charla.slice(-MAX_PREGUNTAS - 1), n: preguntasHechas, ts: Date.now()
      }));
    } catch { /* sin localStorage no hay charla que guardar, y no pasa nada */ }
  }

  /** true si había una charla fresca de ESTE contexto y se restauró. */
  function cargarCharla(): boolean {
    try {
      const bruto = localStorage.getItem(CLAVE_CHARLA);
      if (!bruto) return false;
      const d = JSON.parse(bruto) as { ctx?: string; items?: Turno[]; n?: number; ts?: number };
      if (!d || d.ctx !== claveCtx()) return false;
      if (typeof d.ts !== 'number' || Date.now() - d.ts > CHARLA_TTL_MS) return false;
      if (!Array.isArray(d.items)) return false;
      const items = d.items.filter((h) => h && typeof h.p === 'string' && typeof h.r === 'string' && h.p && h.r);
      if (!items.length) return false;
      charla = items;
      preguntasHechas = typeof d.n === 'number' && d.n >= 0 ? d.n : items.length;
      return true;
    } catch {
      return false;
    }
  }

  // -- pintar ---------------------------------------------------------------

  const crear = <K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, texto?: string) => {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto) el.textContent = texto;
    return el;
  };

  function limpiar() {
    cuerpo.textContent = '';
  }

  function quitarCargando() {
    cuerpo.querySelectorAll('.ia-cargando').forEach((el) => el.remove());
  }

  function pintarCargando(anexar?: boolean) {
    if (!anexar) limpiar();
    cuerpo.setAttribute('aria-busy', 'true');
    const fila = crear('p', 'ia-cargando');
    const puntos = crear('span', 'ia-dots');
    puntos.append(crear('i'), crear('i'), crear('i'));
    fila.append(puntos, crear('span', undefined, txt.loading));
    cuerpo.append(fila);
    fila.scrollIntoView({ block: 'nearest' });

    // Si tarda, se dice por qué en vez de dejar los puntos girando en el vacío.
    const id = peticion;
    window.setTimeout(() => {
      if (id !== peticion || sheet!.hidden) return;
      const largo = cuerpo.querySelector('.ia-cargando span:last-child');
      if (largo) largo.textContent = txt.loadingLong;
    }, 6000);
  }

  /** Los párrafos de la respuesta, respetando los saltos que mandó el servidor. */
  function pintarTexto(destino: HTMLElement, texto: string) {
    for (const parrafo of texto.split(/\n{2,}/)) {
      if (parrafo.trim()) destino.append(crear('p', undefined, parrafo.trim()));
    }
  }

  /** La pregunta de la persona, como turno propio encima de su respuesta. */
  function pintarPregunta(p: string) {
    cuerpo.append(crear('p', 'ia-turno-p', p));
  }

  function pintarLista(etiqueta: string, items: string[], enlaces?: (string | null)[]) {
    if (!items.length) return;
    const bloque = crear('div', 'ia-bloque');
    bloque.append(crear('p', 'eyebrow', etiqueta));
    const ul = crear('ul', 'ia-lista');
    items.forEach((item, i) => {
      const li = crear('li');
      const href = enlaces && enlaces[i];
      if (href) {
        const a = crear('a', undefined, item);
        a.href = href;
        if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
        li.append(a);
      } else {
        li.textContent = item;
      }
      ul.append(li);
    });
    bloque.append(ul);
    cuerpo.append(bloque);
  }

  /** Enseña u oculta la caja de preguntar y los chips, con el tope a la vista. */
  function actualizarFormulario(r?: Respuesta) {
    const tope = preguntasHechas >= MAX_PREGUNTAS;
    const cerrada = contexto?.modo === 'preguntas' ||
      (!!r?.rechazada && r.rechazada !== 'consejo');
    form.hidden = cerrada || tope;
    sugeridas.hidden = form.hidden || !sugChips.childElementCount;
    if (tope && !cuerpo.querySelector('.ia-tope')) {
      cuerpo.append(crear('p', 'ia-tope', txt.limit));
    }
  }

  function pintarRespuesta(r: Respuesta, anexar?: boolean) {
    if (anexar) quitarCargando();
    else limpiar();
    cuerpo.setAttribute('aria-busy', 'false');

    const preguntas = r.preguntas || [];
    // Cuando hay preguntas, el rótulo lo pone el sitio y no el modelo: si no,
    // salían dos encabezados seguidos diciendo lo mismo ("Tres preguntas para
    // comprobar que lo entendiste" dos veces, una traducida y otra no).
    if (!preguntas.length) {
      const respuesta = crear('div', 'ia-respuesta');
      pintarTexto(respuesta, r.respuesta || '');
      cuerpo.append(respuesta);
    } else {
      const bloque = crear('div', 'ia-bloque');
      bloque.append(crear('p', 'eyebrow', txt.questionsTitle));
      const ol = crear('ol', 'ia-preguntas');
      for (const p of preguntas) ol.append(crear('li', undefined, p));
      bloque.append(ol);
      cuerpo.append(bloque);
    }

    pintarLista(txt.used, r.datosUsados || []);
    const fuentes = r.fuentes || [];
    pintarLista(txt.sources, fuentes.map((f) => f.titulo), fuentes.map((f) => f.url));

    // El enlace a la lección solo la primera vez: repetir el botón en cada
    // repregunta es ruido.
    if (r.leccion && !anexar) {
      const acciones = crear('div', 'ia-acciones-sheet');
      const a = crear('a', 'btn btn-ghost btn-sm', txt.lesson + ' →');
      a.href = r.leccion;
      acciones.append(a);
      cuerpo.append(acciones);
    }

    // La fecha del dato va pegada a la respuesta... cuando hay respuesta. Debajo
    // de "hoy ya no hay presupuesto" no se usó ningún dato, y ponerle fecha a
    // algo que no se leyó es ruido con pinta de rigor.
    asOf.textContent = r.generadoPor === 'ia' && r.asOf ? txt.asof + ' ' + r.asOf : '';
    // Y la etiqueta dice la verdad en los dos sentidos: una frase fija del
    // sitio (un rechazo, un tope) NO la escribió la IA, y llamarla "generada
    // con IA" sería mentir a la inversa.
    disclosure.textContent = r.generadoPor === 'ia' ? txt.disclosure : txt.disclosureFixed;
    // La caja de preguntar desaparece cuando no hay nada que preguntar (no hay
    // presupuesto, no hay datos, se llegó al tope). Tras rechazar un consejo
    // SE QUEDA: la siguiente pregunta puede ser buena.
    actualizarFormulario(r);
    if (anexar) {
      const ultimo = cuerpo.lastElementChild;
      if (ultimo) ultimo.scrollIntoView({ block: 'nearest' });
    }
  }

  /** La charla guardada, pintada tal cual: turno de la persona, respuesta. */
  function pintarCharla() {
    limpiar();
    cuerpo.setAttribute('aria-busy', 'false');
    for (const h of charla) {
      pintarPregunta(h.p);
      const div = crear('div', 'ia-respuesta');
      pintarTexto(div, h.r);
      cuerpo.append(div);
    }
    asOf.textContent = '';
    disclosure.textContent = txt.disclosure;
    actualizarFormulario();
  }

  function pintarError(reintentar: () => void, anexar?: boolean) {
    if (anexar) quitarCargando();
    else limpiar();
    cuerpo.setAttribute('aria-busy', 'false');
    cuerpo.append(crear('p', 'ia-error', txt.error));
    disclosure.textContent = txt.disclosureFixed;
    const acciones = crear('div', 'ia-acciones-sheet');
    const btn = crear('button', 'btn btn-ghost btn-sm', txt.retry);
    btn.type = 'button';
    btn.addEventListener('click', reintentar);
    acciones.append(btn);
    cuerpo.append(acciones);
    if (!anexar) asOf.textContent = '';
  }

  /** Los tres chips de "prueba a preguntar" del contexto abierto. */
  function pintarSugeridas() {
    sugChips.textContent = '';
    const lista = (contexto && sugPorTipo[contexto.tipo]) || [];
    for (const s of lista) {
      if (!s) continue;
      const b = crear('button', 'ia-sug', s);
      b.type = 'button';
      b.addEventListener('click', () => pedir(s));
      sugChips.append(b);
    }
    sugeridas.hidden = !sugChips.childElementCount || form.hidden;
  }

  // -- pedir ----------------------------------------------------------------

  async function pedir(pregunta?: string) {
    if (!contexto) return;
    if (pregunta && preguntasHechas >= MAX_PREGUNTAS) return;
    const id = ++peticion;
    const anexar = !!pregunta;
    if (pregunta) pintarPregunta(pregunta);
    pintarCargando(anexar);

    const q = new URLSearchParams({
      accion: 'explicar',
      tipo: contexto.tipo,
      id: contexto.id,
      modo: contexto.modo,
      lang
    });

    // El rango que se explica es el que se está VIENDO, no el que tenía la
    // página al cargar: el panel de precio deja su rango actual en
    // data-range cada vez que alguien toca 1M/3M/1A (chart-panel.ts). Sin
    // esto, tocar "5A" y pedir la explicación describía el mes.
    const panelPrecio = document.querySelector<HTMLElement>('[data-price-panel][data-range]');
    const rango = (panelPrecio && panelPrecio.dataset.range) || contexto.rango;
    if (rango) q.set('rango', rango);

    // El botón a secas va por GET: la URL no lleva nada que no esté ya en la
    // página, y así el CDN puede cachear la respuesta y no se paga dos veces.
    // Una PREGUNTA escrita a mano va por POST, en el cuerpo: lo que alguien
    // escribe con sus palabras no tiene por qué quedarse en los registros de
    // acceso, y una URL se guarda entera. El historial —las repreguntas de
    // esta misma charla— viaja con ella, y solo con ella.
    const peticionHTTP = pregunta
      ? fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.assign(
            Object.fromEntries(q.entries()),
            { pregunta },
            charla.length ? { historial: charla.slice(-MAX_PREGUNTAS) } : null
          ))
        })
      : fetch('/api/news?' + q.toString(), { headers: { Accept: 'application/json' } });

    try {
      const res = await peticionHTTP;
      const datos = (await res.json()) as Respuesta;
      if (id !== peticion) return;               // llegó tarde: manda la última
      // 400/404/429 traen respuesta honesta en el cuerpo; solo un 5xx sin texto
      // es un error de verdad.
      if (!datos || !datos.respuesta) { pintarError(() => pedir(pregunta), anexar); return; }
      if (pregunta) preguntasHechas++;
      pintarRespuesta(datos, anexar);
      // La charla recuerda lo que se dijo — la primera explicación también,
      // para que "¿y eso por qué?" tenga a qué referirse.
      if (datos.generadoPor === 'ia' && datos.respuesta && contexto.modo !== 'preguntas') {
        charla.push({ p: pregunta || txt.explain, r: datos.respuesta.slice(0, 600) });
        guardarCharla();
      }
    } catch (e) {
      if (id !== peticion) return;
      pintarError(() => pedir(pregunta), anexar);
    }
  }

  // -- abrir y cerrar -------------------------------------------------------

  function abrir(btn: HTMLElement) {
    abridor = btn;
    contexto = {
      tipo: btn.dataset.iaTipo || '',
      id: btn.dataset.iaId || '',
      modo: btn.dataset.iaModo || 'explicar',
      rango: btn.dataset.iaRango || undefined,
      sobre: btn.dataset.iaSobre || ''
    };
    titulo.textContent = contexto.sobre;
    asOf.textContent = '';
    input.value = '';
    charla = [];
    preguntasHechas = 0;
    form.hidden = contexto.modo === 'preguntas';
    pintarSugeridas();
    sheet!.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.scrollTop = 0;
    cerrar.focus();
    // Una charla fresca del MISMO contexto se retoma donde iba, en vez de
    // empezar de cero; si no la hay, la explicación de siempre.
    const seleccion = btn.dataset.iaSeleccion || '';
    if (seleccion) {
      pedirSeleccion(seleccion);
    } else if (contexto.modo === 'explicar' && cargarCharla()) {
      pintarCharla();
    } else {
      pedir();
    }
  }

  /** "Explícame esto" sobre una frase seleccionada: viaja por POST, como la
   *  pregunta, y con la misma etiqueta y las mismas guardas del servidor. */
  async function pedirSeleccion(seleccion: string) {
    if (!contexto) return;
    const id = ++peticion;
    pintarCargando();
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          accion: 'explicar', tipo: contexto.tipo, id: contexto.id,
          modo: 'explicar', lang, seleccion
        })
      });
      const datos = (await res.json()) as Respuesta;
      if (id !== peticion) return;
      if (!datos || !datos.respuesta) { pintarError(() => pedirSeleccion(seleccion)); return; }
      pintarRespuesta(datos);
      if (datos.generadoPor === 'ia' && contexto.modo !== 'preguntas') {
        charla.push({ p: txt.explain + ': "' + seleccion.slice(0, 120) + '"', r: datos.respuesta.slice(0, 600) });
      }
    } catch {
      if (id !== peticion) return;
      pintarError(() => pedirSeleccion(seleccion));
    }
  }

  function cerrarHoja() {
    peticion++;                                   // lo que llegue después se ignora
    sheet!.hidden = true;
    document.body.style.overflow = '';
    // La burbuja de selección ya no existe cuando la hoja se cierra: el foco
    // solo se devuelve a un abridor que siga en la página.
    if (abridor && document.contains(abridor)) abridor.focus();
    abridor = null;
    contexto = null;
  }

  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.ia-btn[data-ia]');
    if (btn) { e.preventDefault(); abrir(btn); return; }
    if ((e.target as HTMLElement).closest('[data-ia-close]')) cerrarHoja();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pregunta = input.value.trim();
    if (pregunta) {
      input.value = '';
      pedir(pregunta);
    }
  });

  // -- selección de texto: "Explícame esto" sobre una frase -----------------
  //
  // Solo en contenido de LECTURA: los contenedores marcados con
  // [data-ia-seleccion] (el cuerpo de una lección, una noticia, un reporte).
  // La frase viaja por POST como una pregunta más, con las mismas guardas del
  // servidor: sus cifras NO respaldan nada — si alguien fabrica una selección
  // con números falsos, la guardia de cifras los tira igual.
  //
  // En el teléfono el menú del sistema (copiar/buscar) sale ENCIMA de la
  // selección, así que la burbuja va DEBAJO y tras una pausa: no se pelean.

  const MIN_SELECCION = 12;
  const MAX_SELECCION = 260;
  let burbuja: HTMLButtonElement | null = null;
  let selTimer = 0;
  const punteroGrueso = window.matchMedia('(pointer: coarse)');

  function quitarBurbuja() {
    if (burbuja) { burbuja.remove(); burbuja = null; }
  }

  function contenedorDeSeleccion(sel: Selection): HTMLElement | null {
    const donde = (n: Node | null) => {
      const el = n instanceof Element ? n : n?.parentElement;
      return el ? el.closest<HTMLElement>('[data-ia-seleccion]') : null;
    };
    const a = donde(sel.anchorNode);
    const b = donde(sel.focusNode);
    return a && a === b ? a : null;   // entera dentro del MISMO contenedor
  }

  function mostrarBurbuja() {
    quitarBurbuja();
    if (!sheet!.hidden) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const frase = sel.toString().replace(/\s+/g, ' ').trim();
    if (frase.length < MIN_SELECCION || frase.length > MAX_SELECCION) return;
    const cont = contenedorDeSeleccion(sel);
    if (!cont || !cont.dataset.iaId) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const b = crear('button', 'ia-burbuja') as HTMLButtonElement;
    b.type = 'button';
    b.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7z"></path></svg>';
    b.append(crear('span', undefined, txt.seleccion));
    // El contexto viaja en el propio botón, como en cualquier abridor: solo
    // identificadores más la frase seleccionada.
    b.dataset.iaTipo = cont.dataset.iaTipo || '';
    b.dataset.iaId = cont.dataset.iaId || '';
    b.dataset.iaSobre = cont.dataset.iaSobre || '';
    b.dataset.iaSeleccion = frase;
    b.addEventListener('click', () => {
      const abrelo = b;
      quitarBurbuja();
      window.getSelection()?.removeAllRanges();
      abrir(abrelo);
    });

    document.body.append(b);
    const ancho = b.offsetWidth || 160;
    const x = Math.min(
      Math.max(window.scrollX + rect.left + rect.width / 2 - ancho / 2, window.scrollX + 8),
      window.scrollX + document.documentElement.clientWidth - ancho - 8
    );
    // Con el dedo, debajo (el menú del sistema va arriba); con ratón, encima.
    const y = punteroGrueso.matches
      ? window.scrollY + rect.bottom + 10
      : window.scrollY + rect.top - 46;
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    burbuja = b;
  }

  document.addEventListener('pointerup', (e) => {
    if ((e.target as HTMLElement).closest('.ia-burbuja')) return;
    window.setTimeout(mostrarBurbuja, 60);
  });
  document.addEventListener('selectionchange', () => {
    window.clearTimeout(selTimer);
    selTimer = window.setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) quitarBurbuja();
      else if (punteroGrueso.matches) mostrarBurbuja();
    }, 350);
  });
  window.addEventListener('scroll', quitarBurbuja, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (sheet!.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrarHoja(); return; }
    if (e.key !== 'Tab') return;
    // Foco atrapado dentro del panel mientras la hoja está abierta.
    const foco = Array.from(
      panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
    ).filter((el) => el.offsetParent !== null);
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  });

  // -- lo que estaba pendiente al cargar ------------------------------------
  //
  // Este módulo llega POR DEMANDA: el arranque de AISheet.astro lo importa al
  // primer gesto y deja escrito en window.__iaPend qué lo provocó (el botón
  // que se tocó, o la cadena 'sel' si lo que había era una selección). Ese
  // gesto ya ocurrió antes de que existieran los oyentes de aquí, así que se
  // atiende ahora o se pierde — y perderlo se vería como un botón que no hace
  // nada la primera vez que lo tocas.
  const ventana = window as unknown as { __iaPend?: unknown };
  const pendiente = ventana.__iaPend;
  ventana.__iaPend = null;
  if (pendiente === 'sel') mostrarBurbuja();
  else if (pendiente instanceof HTMLElement) abrir(pendiente);
}

// Este archivo no exporta nada: se importa por su efecto. El `export {}` está
// para que TypeScript lo trate como MÓDULO — sin él, el `import()` del arranque
// de AISheet.astro falla en `astro check` con "is not a module" (ts 2306).
export {};
