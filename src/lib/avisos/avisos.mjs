// Avisos contextuales: enseñar el sitio a quien ya lo está usando.
//
// QUÉ ES ESTO. Una lista declarativa de frases cortas que aparecen UNA a la vez,
// abajo, cuando el contexto dice que sirven: al abrir la segunda ficha de activo
// se ofrece compararlas con las dos ya puestas; al terminar una lección se
// ofrece el reto del día; la primera vez que se abre una gráfica se dice cómo se
// recorre — con el dedo o con el ratón, según lo que tenga quien lee. No hay
// temporizadores ni "vuelve pronto": un aviso aparece porque el estado de la
// persona lo pide, no porque hayan pasado cinco segundos.
//
// UN AVISO SE LEE EN LA PANTALLA DONDE SALE. Una frase que manda hacer algo que
// no se puede hacer con el aparato que hay delante no enseña: estorba. Por eso
// el contexto trae `punteroGrueso` y hay dos avisos para la gráfica.
//
// LA REGLA QUE MANDA: si un aviso no ahorra un clic o no enseña algo que no se
// ve, no va. Un banner que repite el titular de arriba no es un aviso, es
// estorbo — de hecho este sistema nació de quitar uno.
//
// CÓMO AÑADIR UNO. Se escribe una entrada en AVISOS (aquí abajo) y sus dos
// textos en src/i18n/ui.ts. Nada más: el motor del navegador
// (src/scripts/avisos.ts) y el marcado (src/components/Avisos.astro) son
// genéricos. Campos:
//
//   id        clave estable; es la que se guarda al cerrarlo. NO se reutiliza.
//   version   súbela para REVIVIR un aviso que ya cerró todo el mundo (cambió
//             el texto, cambió a dónde lleva). Cerrado en v1 + version: 2 =
//             vuelve a salir una vez.
//   paginas   dónde puede salir: 'activo' | 'mercado' | 'leccion' | 'noticias'
//             (ver tipoDePagina). Decide además si la página siquiera monta el
//             sistema: donde no hay ningún aviso posible no se manda ni el
//             marcado ni los textos.
//   texto     clave de ui.ts con la frase. UNA frase.
//   accion    { tipo: 'enlace', etiqueta, href(ctx) } — el botón navega.
//             { tipo: 'ok', etiqueta }               — el botón solo cierra.
//   cuando    (ctx) => boolean. Puro: recibe el contexto ya leído, no toca DOM
//             ni localStorage. Por eso se puede probar (avisos.test.mjs). El
//             contexto lo arma src/scripts/avisos.ts: página y ruta, activos
//             vistos y el `anterior`, lo que se sigue, las lecciones leídas,
//             si la página tiene términos o chips, las rutas EN/ES y
//             `punteroGrueso` (true = el puntero primario es un dedo).
//   maxVistas opcional; por defecto MAX_VISTAS. Un aviso que se ignora tres
//             veces se retira solo: quien no lo cerró tampoco lo quiere.
//
// EL ORDEN DE LA LISTA ES LA PRIORIDAD. El motor enseña el PRIMERO que casa y
// se detiene: nunca hay dos a la vez, ni uno esperando turno.
//
// QUÉ NO ES UN AVISO. Lo que la página ya dice no se repite aquí: la página de
// una noticia ya enlaza su lección (bloque nw-learn de NewsStory.astro), así que
// no hay aviso para eso; el hero del globo ya dice "Toca una ciudad"; el botón
// de seguir ya explica dónde se guarda la lista. Un aviso duplicado es ruido con
// más pasos.

/** Veces que un aviso puede aparecer sin que nadie lo toque antes de retirarse. */
export const MAX_VISTAS = 3;
/** Cuántas fichas de activo distintas se recuerdan (para "¿los comparas?"). */
export const TOPE_ACTIVOS = 6;

/**
 * De un routeId de src/i18n/routes.ts al tipo de página que entienden los
 * avisos. Devuelve null en las páginas donde no hay ninguno: ahí no se monta
 * nada, ni marcado ni script.
 * @param {string} routeId
 * @returns {string|null}
 */
export function tipoDePagina(routeId) {
  if (typeof routeId !== 'string') return null;
  if (routeId.startsWith('asset.')) return 'activo';
  if (routeId.startsWith('lesson.')) return 'leccion';
  if (routeId === 'market') return 'mercado';
  if (routeId === 'news') return 'noticias';
  return null;
}

/** 'asset.spy' → 'spy'. En cualquier otra ruta, null. */
export function idDeActivo(routeId) {
  return typeof routeId === 'string' && routeId.startsWith('asset.') ? routeId.slice(6) : null;
}

/**
 * El activo distinto que se vio ANTES del de esta página. Es lo que convierte
 * "viste dos cosas" en un enlace al comparador con las dos ya puestas.
 * @param {string[]} activos ids en orden de visita, el actual el último
 * @param {string|null} actual
 */
export function anterior(activos, actual) {
  if (!Array.isArray(activos) || !actual) return null;
  for (let i = activos.length - 1; i >= 0; i--) {
    if (activos[i] && activos[i] !== actual) return activos[i];
  }
  return null;
}

// ---------------------------------------------------------------- la lista

/** @type {Array<Record<string, any>>} */
export const AVISOS = [
  // Glosario al tacto: las palabras subrayadas de una lección abren una ficha
  // con su definición y un ejemplo en pesos. Nadie lo descubre solo — parecen
  // un enlace más y no lo son.
  {
    id: 'glosario',
    version: 1,
    paginas: ['leccion'],
    texto: 'aviso.glosario',
    accion: { tipo: 'ok', etiqueta: 'aviso.ok' },
    cuando: (c) => c.hayTerminos
  },
  // Al marcar la lección como leída. El reto es el otro lado del sitio (jugar
  // en vez de leer) y desde una lección no se ve por ningún lado.
  {
    id: 'reto-tras-leccion',
    version: 1,
    paginas: ['leccion'],
    texto: 'aviso.reto',
    accion: { tipo: 'enlace', etiqueta: 'aviso.reto.cta', href: (c) => c.rutas.challenge },
    cuando: (c) => !!c.leccion && c.leidas.includes(c.leccion)
  },
  // Primera ficha de activo de la vida. La gráfica se lee con el puntero
  // encima (precio y hora bajo el punto) y eso no lo anuncia nada.
  //
  // Son DOS avisos y no uno porque el gesto NO es el mismo, y decirlo mal es
  // peor que no decirlo: con el dedo hay que arrastrar (por eso chart-panel.ts
  // monta su propia capa .pp-hit: la librería exigía mantener el dedo ~250 ms
  // quieto y un barrido normal no movía nada), y con ratón basta pasar por
  // encima, sin pulsar nada. "Arrastra el dedo" en un escritorio es una
  // instrucción imposible de seguir, que es justo lo contrario de enseñar.
  // Se excluyen entre sí por `punteroGrueso`: nunca casan los dos.
  {
    id: 'grafica-arrastre',
    version: 1,
    paginas: ['activo'],
    texto: 'aviso.grafica',
    accion: { tipo: 'ok', etiqueta: 'aviso.ok' },
    cuando: (c) => c.activos.length === 1 && c.punteroGrueso
  },
  {
    id: 'grafica-raton',
    version: 1,
    paginas: ['activo'],
    texto: 'aviso.grafica.raton',
    accion: { tipo: 'ok', etiqueta: 'aviso.ok' },
    cuando: (c) => c.activos.length === 1 && !c.punteroGrueso
  },
  // Segunda ficha distinta: el comparador con LOS DOS puestos. La ficha ya
  // tiene un botón "Comparar", pero llega con uno solo y hay que elegir el
  // otro a mano; esto ahorra justo ese paso.
  {
    id: 'comparar-dos',
    version: 1,
    paginas: ['activo'],
    texto: 'aviso.comparar',
    accion: {
      tipo: 'enlace',
      etiqueta: 'aviso.comparar.cta',
      href: (c) => c.rutas.compare + '?a=' + encodeURIComponent(c.anterior) + '&b=' + encodeURIComponent(c.activo)
    },
    cuando: (c) => !!c.anterior
  },
  // Seguiste algo: dónde vuelve a aparecer. El marcador guarda en silencio y
  // sin esto la lista es un sitio al que se llega por casualidad.
  {
    id: 'sigues-arriba',
    version: 1,
    paginas: ['activo', 'mercado'],
    texto: 'aviso.sigues',
    accion: {
      tipo: 'enlace',
      etiqueta: 'aviso.sigues.cta',
      // Desde /market no se navega a /market: se salta a la sección.
      href: (c) => (c.pagina === 'mercado' ? '' : c.rutas.market) + '#mkt-watch'
    },
    cuando: (c) => c.siguiendo.length > 0
  },
  // Índice de noticias: cada tarjeta lleva chips con el símbolo de lo que toca
  // la noticia, y cada chip es un enlace a la gráfica de ese activo. Parecen
  // etiquetas, así que nadie los toca.
  {
    id: 'noticias-chips',
    version: 1,
    paginas: ['noticias'],
    texto: 'aviso.noticias',
    accion: { tipo: 'ok', etiqueta: 'aviso.ok' },
    cuando: (c) => c.hayChips
  }
];

// ---------------------------------------------------------------- el estado
//
// Todo vive en UNA clave de localStorage. Sin cuenta y sin servidor, igual que
// la watchlist y el progreso de las lecciones. Si el navegador está en modo
// privado estricto y no deja escribir, el sistema sigue funcionando: se
// comporta como una primera visita eterna, que es molesto pero no roto.

export const LLAVE = 'sf-avisos-v1';

export function estadoVacio() {
  return { cerrados: {}, vistas: {}, activos: [] };
}

/** Sanea lo que salga de localStorage: si no se entiende, se ignora. */
export function normalizar(bruto) {
  const e = estadoVacio();
  if (!bruto || typeof bruto !== 'object') return e;
  const num = (o) => {
    /** @type {Record<string, number>} */
    const r = {};
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) if (typeof v === 'number' && v > 0) r[k] = v;
    }
    return r;
  };
  e.cerrados = num(bruto.cerrados);
  e.vistas = num(bruto.vistas);
  if (Array.isArray(bruto.activos)) {
    e.activos = bruto.activos.filter((x) => typeof x === 'string' && x).slice(-TOPE_ACTIVOS);
  }
  return e;
}

/**
 * Cerrar guarda LA VERSIÓN, no un true. Así subir `version` en la lista revive
 * el aviso para quien ya lo había cerrado, que es lo que hace falta cuando el
 * texto cambia o el aviso empieza a llevar a otro sitio.
 */
export function cerrar(estado, aviso) {
  return { ...estado, cerrados: { ...estado.cerrados, [aviso.id]: aviso.version } };
}

export function anotarVista(estado, aviso) {
  return { ...estado, vistas: { ...estado.vistas, [aviso.id]: (estado.vistas[aviso.id] || 0) + 1 } };
}

/** Apunta la ficha de activo que se está viendo, sin repetir y con tope. */
export function recordarActivo(estado, id) {
  if (!id) return estado;
  const previos = estado.activos.filter((x) => x !== id);
  return { ...estado, activos: [...previos, id].slice(-TOPE_ACTIVOS) };
}

/** ¿Este aviso sigue vivo para esta persona? (cerrado o ya muy visto, no). */
export function disponible(aviso, estado) {
  if ((estado.cerrados[aviso.id] || 0) >= aviso.version) return false;
  return (estado.vistas[aviso.id] || 0) < (aviso.maxVistas || MAX_VISTAS);
}

/**
 * ¿Este aviso viene a cuento AHORA MISMO? Se usa dos veces: para elegir el que
 * sale y para comprobar que el que ya está puesto sigue teniendo sentido — el
 * índice de noticias pinta desde la caché y luego repinta con lo que conteste
 * el endpoint, y un aviso que habla de unas tarjetas que ya no están en la
 * pantalla es justo el estorbo que este sistema vino a quitar.
 *
 * Una condición que reviente NO tumba la página: ese aviso simplemente no sale.
 */
export function casa(aviso, ctx) {
  if (!aviso.paginas.includes(ctx.pagina)) return false;
  try { return !!aviso.cuando(ctx); } catch { return false; }
}

/**
 * El aviso que toca enseñar, o null. Primero de la lista que case: la lista es
 * la prioridad y nunca sale más de uno.
 */
export function elegir(ctx, estado, avisos = AVISOS) {
  for (const a of avisosDe(ctx.pagina, avisos)) {
    if (!disponible(a, estado)) continue;
    if (casa(a, ctx)) return a;
  }
  return null;
}

/** Los avisos que esta página podría llegar a enseñar (para no montar de más). */
export function avisosDe(pagina, avisos = AVISOS) {
  return pagina ? avisos.filter((a) => a.paginas.includes(pagina)) : [];
}
