// Smart Finance AI en el navegador: abre la hoja, pide la explicación y la
// pinta. Toda la parte delicada (el bloque DATOS, el clasificador de consejo,
// la guardia de cifras, el tope de gasto) está en el servidor —
// api/_lib/ia.js— porque aquí no se puede garantizar nada.
//
// Lo que este archivo SÍ garantiza:
//   · lo que se manda son identificadores, nunca cifras. Si el navegador
//     mandara los números, cualquiera podría hacer que la IA explicara datos
//     falsos con la etiqueta del sitio encima.
//   · la etiqueta de IA y la fecha del dato se pintan SIEMPRE, también cuando
//     la respuesta es un rechazo o un error.
//   · el estado de carga dice la verdad: hay tres puntos y, si pasa de seis
//     segundos, una frase que explica por qué tarda. Nada de barras de
//     progreso inventadas.
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
  const txt = JSON.parse(sheet.dataset.strings || '{}') as Record<string, string>;
  const lang = sheet.dataset.locale === 'en' ? 'en' : 'es';

  let abridor: HTMLElement | null = null;
  let contexto: Contexto | null = null;
  let peticion = 0;

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

  function pintarCargando() {
    limpiar();
    cuerpo.setAttribute('aria-busy', 'true');
    const fila = crear('p', 'ia-cargando');
    const puntos = crear('span', 'ia-dots');
    puntos.append(crear('i'), crear('i'), crear('i'));
    fila.append(puntos, crear('span', undefined, txt.loading));
    cuerpo.append(fila);

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

  function pintarRespuesta(r: Respuesta) {
    limpiar();
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

    if (r.leccion) {
      const acciones = crear('div', 'ia-acciones-sheet');
      const a = crear('a', 'btn btn-ghost btn-sm', txt.lesson + ' →');
      a.href = r.leccion;
      acciones.append(a);
      cuerpo.append(acciones);
    }

    // La fecha del dato va en la etiqueta, siempre pegada a la respuesta.
    asOf.textContent = r.asOf ? txt.asof + ' ' + r.asOf : '';
    // Y la etiqueta dice la verdad en los dos sentidos: una frase fija del
    // sitio (un rechazo, un tope) NO la escribió la IA, y llamarla "generada
    // con IA" sería mentir a la inversa.
    disclosure.textContent = r.generadoPor === 'ia' ? txt.disclosure : txt.disclosureFixed;
    // La caja de preguntar desaparece cuando no hay nada que preguntar (no hay
    // presupuesto, no hay datos). Tras rechazar un consejo SE QUEDA: la
    // siguiente pregunta puede ser buena.
    form.hidden = contexto?.modo === 'preguntas' ||
      (!!r.rechazada && r.rechazada !== 'consejo');
  }

  function pintarError() {
    limpiar();
    cuerpo.setAttribute('aria-busy', 'false');
    cuerpo.append(crear('p', 'ia-error', txt.error));
    disclosure.textContent = txt.disclosureFixed;
    const acciones = crear('div', 'ia-acciones-sheet');
    const btn = crear('button', 'btn btn-ghost btn-sm', txt.retry);
    btn.type = 'button';
    btn.addEventListener('click', () => pedir());
    acciones.append(btn);
    cuerpo.append(acciones);
    asOf.textContent = '';
  }

  // -- pedir ----------------------------------------------------------------

  async function pedir(pregunta?: string) {
    if (!contexto) return;
    const id = ++peticion;
    pintarCargando();

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
    if (pregunta) q.set('pregunta', pregunta);

    try {
      const res = await fetch('/api/news?' + q.toString(), { headers: { Accept: 'application/json' } });
      const datos = (await res.json()) as Respuesta;
      if (id !== peticion) return;               // llegó tarde: manda la última
      // 400/404/429 traen respuesta honesta en el cuerpo; solo un 5xx sin texto
      // es un error de verdad.
      if (!datos || (!datos.respuesta && !datos.error)) { pintarError(); return; }
      if (!datos.respuesta) { pintarError(); return; }
      pintarRespuesta(datos);
    } catch (e) {
      if (id !== peticion) return;
      pintarError();
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
    form.hidden = contexto.modo === 'preguntas';
    sheet!.hidden = false;
    document.body.style.overflow = 'hidden';
    panel.scrollTop = 0;
    cerrar.focus();
    pedir();
  }

  function cerrarHoja() {
    peticion++;                                   // lo que llegue después se ignora
    sheet!.hidden = true;
    document.body.style.overflow = '';
    if (abridor) abridor.focus();
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
    if (pregunta) pedir(pregunta);
  });

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
}
