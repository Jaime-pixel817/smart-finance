// El reto del día: "¿Y luego qué pasó?" (/challenge y /es/reto).
//
// Módulo ESM puro, sin dependencias ni DOM, con pruebas en reto.test.mjs. Es la
// ÚNICA copia de las reglas del juego: src/scripts/challenge.ts solo pide los
// datos a /api/history, llama a esto y pinta.
//
// CÓMO FUNCIONA EL JUEGO
// ----------------------
// Cinco rondas. En cada una se enseña la forma de `VENTANA` semanas reales de un
// activo real —sin nombre y sin precios, normalizada a base 100— y se tapan las
// siguientes `OCULTAS`. El jugador elige una de cuatro bandas:
//
//    -2  cayó fuerte   (cambio ≤ −umbral)
//    -1  bajó          (−umbral < cambio < 0)
//    +1  subió         (0 ≤ cambio < umbral)
//    +2  subió fuerte  (cambio ≥ umbral)
//
// El "umbral" NO es un número inventado: es el movimiento típico de ESE activo
// en ese mismo plazo (mediana del valor absoluto de todos sus movimientos de
// `OCULTAS` semanas en los 5 años que devuelve el endpoint), redondeado a una
// cifra legible. Así BTC y el dólar se juegan con la misma dificultad.
//
// Puntuación: banda exacta 2, dirección correcta con magnitud equivocada 1,
// dirección equivocada 0. Máximo 10 en cinco rondas. Tirar un dado saca 3.75 de
// media (ESPERADO_AL_AZAR), y ese número es el que da la lección al final: el
// corto plazo no se adivina.
//
// POR QUÉ TODO ES DETERMINISTA
// ----------------------------
// El reto es el MISMO para todo el mundo un día dado: la semilla es la fecha en
// Ciudad de México. No hace falta servidor ni cuenta para que dos personas
// comparen su resultado, que es justo lo que no podemos añadir (las 12 funciones
// de Vercel están ocupadas). El generador es un mulberry32 sembrado con un hash
// xmur3 de la fecha: 30 líneas, sin dependencias y reproducible.
//
// CÓMO SE CALCULA EL RETO DE HOY, PASO POR PASO
// ---------------------------------------------
// 1. `fechaLocal(new Date())` da la fecha civil en America/Mexico_City, p. ej.
//    "2026-08-23". Es lo único que entra: ni la hora, ni el idioma, ni nada del
//    dispositivo. Dos teléfonos distintos el mismo día sacan la misma cadena.
// 2. La semilla es esa fecha con el prefijo de versión: `sf-reto-v1:2026-08-23`.
//    El prefijo existe para poder cambiar el sorteo algún día sin que el reto
//    del pasado cambie de forma retroactiva: se sube a `v2` y ya.
// 3. `hash32` (xmur3) convierte la semilla en un entero de 32 bits y ese entero
//    siembra un `mulberry32`, que es el generador. Mismo texto → misma secuencia
//    de números, en cualquier navegador y en Node.
// 4. Con esa secuencia se baraja el catálogo (Fisher-Yates) y se toman los
//    primeros cinco activos.
// 5. Con los cinco siguientes números del generador salen los cinco cortes, cada
//    uno una fracción 0–1 de la serie del activo. La fracción y no el índice
//    porque el índice depende de cuántos cierres devuelva el endpoint ese día.
//
// No hay reloj, no hay servidor y no hay estado: quien abra la página en otro
// país verá exactamente el mismo reto que quien la abra en México, y el de ayer
// se puede reconstruir con solo la fecha.
//
// El "reto libre" usa la MISMA maquinaria con otra semilla (`planLibre`), así que
// también se puede compartir por enlace, pero no toca la racha ni el calendario.

const esNum = (x) => typeof x === 'number' && Number.isFinite(x);

/** Semanas visibles y semanas tapadas de cada ronda, y cuántas rondas hay. */
export const VENTANA = 40;
export const OCULTAS = 8;
export const RONDAS = 5;
export const PUNTOS_POR_RONDA = 2;

/**
 * Lo que saca de media quien contesta al azar, en puntos por ronda.
 * Con cuatro respuestas equiprobables: 1/4 acierta la banda (2 puntos) y 1/4
 * acierta solo la dirección (1 punto) → 0.25·2 + 0.25·1 = 0.75.
 * En cinco rondas, 3.75 de 10.
 */
export const ESPERADO_AL_AZAR_POR_RONDA = 0.75;
export const ESPERADO_AL_AZAR = ESPERADO_AL_AZAR_POR_RONDA * RONDAS;

/** Las cuatro bandas, en el orden en que se pintan los botones. */
export const BANDAS = [-2, -1, 1, 2];

// ---------------------------------------------------------------------------
// Fecha y azar reproducible
// ---------------------------------------------------------------------------

/**
 * Fecha civil (YYYY-MM-DD) en una zona horaria. El reto cambia a medianoche en
 * Ciudad de México, no a medianoche UTC: en México el UTC ya es "mañana" desde
 * las 18:00 y el reto habría cambiado a media tarde.
 * @param {Date} d
 * @param {string} zona zona IANA, p. ej. 'America/Mexico_City'
 */
export function fechaLocal(d, zona = 'America/Mexico_City') {
  if (!(d instanceof Date) || isNaN(d.getTime())) throw new Error('fechaLocal: hace falta una fecha válida');
  // en-CA da directamente YYYY-MM-DD, que es lo que queremos como semilla.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Hash de cadena a entero de 32 bits (xmur3). Solo sirve para sembrar. */
function hash32(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/**
 * Generador pseudoaleatorio reproducible (mulberry32) sembrado con un texto.
 * @param {string} semilla
 * @returns {() => number} devuelve números en [0, 1)
 */
export function generador(semilla) {
  if (typeof semilla !== 'string' || !semilla) throw new Error('generador: la semilla debe ser un texto no vacío');
  let a = hash32(semilla);
  return function siguiente() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Baraja una copia de `lista` con el generador dado (Fisher-Yates). */
export function barajar(lista, rnd) {
  if (!Array.isArray(lista)) throw new Error('barajar: lista debe ser un arreglo');
  const out = lista.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Prefijo de versión de la semilla del reto diario. Va delante de la fecha para
 * que un cambio futuro en el sorteo pueda subir a `v2` sin reescribir el pasado.
 */
export const PREFIJO_DIARIO = 'sf-reto-v1:';
/** Lo mismo para el reto libre, que no gasta el del día. */
export const PREFIJO_LIBRE = 'sf-libre-v1:';

/**
 * El plan de una partida: qué activos tocan y en qué punto de su historia se
 * corta cada uno. Se calcula ANTES de pedir los datos (así el navegador solo
 * baja las series que va a usar) y por eso el corte va como fracción 0–1: el
 * índice exacto depende de cuántos puntos devuelva el endpoint.
 *
 * @param {string} semilla  texto que siembra el generador
 * @param {string[]} catalogo ids de activo disponibles
 * @param {{ rondas?: number, repetir?: boolean }} [opts]
 *   `repetir` deja armar la partida con menos activos que rondas, repitiéndolos
 *   con otro corte. Lo usa el reto libre cuando filtras por tipo: de índices hay
 *   tres y las rondas son cinco. El reto del día NUNCA repite.
 * @returns {{ semilla: string, activos: string[], cortes: number[] }}
 */
export function planDesdeSemilla(semilla, catalogo, opts = {}) {
  const rondas = opts.rondas ?? RONDAS;
  const repetir = opts.repetir === true;
  if (typeof semilla !== 'string' || !semilla) throw new Error('planDesdeSemilla: la semilla debe ser un texto no vacío');
  if (!Array.isArray(catalogo) || !catalogo.length) throw new Error('planDesdeSemilla: el catálogo está vacío');
  if (!repetir && catalogo.length < rondas) {
    throw new Error('planDesdeSemilla: el catálogo necesita al menos ' + rondas + ' activos');
  }
  const rnd = generador(semilla);
  let activos = [];
  // Se baraja la lista ENTERA tantas veces como haga falta y luego se corta: así
  // ningún activo sale dos veces antes de que hayan salido todos los demás.
  while (activos.length < rondas) activos = activos.concat(barajar(catalogo, rnd));
  activos = activos.slice(0, rondas);
  const cortes = activos.map(() => rnd());
  return { semilla, activos, cortes };
}

/**
 * El reto del día: la semilla es la fecha civil en Ciudad de México.
 * @param {string} fecha   YYYY-MM-DD
 * @param {string[]} catalogo ids de activo disponibles
 * @param {{ rondas?: number }} [opts]
 * @returns {{ fecha: string, activos: string[], cortes: number[] }}
 */
export function planDelReto(fecha, catalogo, opts = {}) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error('planDelReto: fecha debe ser YYYY-MM-DD');
  }
  const { activos, cortes } = planDesdeSemilla(PREFIJO_DIARIO + fecha, catalogo, { ...opts, repetir: false });
  return { fecha, activos, cortes };
}

/**
 * El reto libre: mismo sorteo, otra semilla. La ficha es un texto corto que
 * viaja en la URL (`?libre=<ficha>`), así que dos personas pueden jugar el mismo
 * reto libre sin gastar el del día.
 * @param {string} ficha
 * @param {string[]} catalogo
 * @param {{ rondas?: number, repetir?: boolean }} [opts]
 * @returns {{ ficha: string, activos: string[], cortes: number[] }}
 */
export function planLibre(ficha, catalogo, opts = {}) {
  if (typeof ficha !== 'string' || !/^[a-z0-9-]{1,32}$/.test(ficha)) {
    throw new Error('planLibre: la ficha debe ser de 1 a 32 letras minúsculas, dígitos o guiones');
  }
  const { activos, cortes } = planDesdeSemilla(PREFIJO_LIBRE + ficha, catalogo, { repetir: true, ...opts });
  return { ficha, activos, cortes };
}

// ---------------------------------------------------------------------------
// Lectura de la serie
// ---------------------------------------------------------------------------

/** Cambio porcentual de `a` a `b`. */
export function cambioPct(a, b) {
  if (!esNum(a) || !esNum(b)) throw new Error('cambioPct: a y b deben ser números');
  if (a === 0) throw new Error('cambioPct: el precio de partida no puede ser 0');
  return (b / a - 1) * 100;
}

/** Mediana de una lista de números (no la modifica). */
export function mediana(valores) {
  const v = valores.filter(esNum).sort((x, y) => x - y);
  if (!v.length) throw new Error('mediana: hace falta al menos un número');
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Movimiento típico del activo en `pasos` barras: mediana del valor absoluto de
 * todos sus movimientos de ese plazo en la serie completa. Es lo que separa
 * "subió" de "subió fuerte", y por eso se mide en el propio activo: 8 % en ocho
 * semanas es un temblor en bitcoin y un terremoto en el dólar.
 */
export function movimientoTipico(cierres, pasos = OCULTAS) {
  if (!Array.isArray(cierres) || cierres.length <= pasos) {
    throw new Error('movimientoTipico: la serie necesita más de ' + pasos + ' puntos');
  }
  const movs = [];
  for (let i = 0; i + pasos < cierres.length; i++) {
    if (!esNum(cierres[i]) || !esNum(cierres[i + pasos]) || cierres[i] === 0) continue;
    movs.push(Math.abs(cambioPct(cierres[i], cierres[i + pasos])));
  }
  return mediana(movs);
}

/**
 * Qué tan grande fue este movimiento DENTRO DE LA HISTORIA DEL PROPIO ACTIVO:
 * porcentaje de sus periodos de `pasos` barras en los que se movió menos (en
 * valor absoluto) que este.
 *
 * Es el único "por qué" que los precios pueden sostener. No dice qué lo causó —
 * eso no está en la serie— sino si el movimiento fue de los raros o de los de
 * todas las semanas. La página lo dice con esas palabras, y dice también que la
 * causa no la sabemos.
 */
export function percentilDeMovimiento(cierres, cambio, pasos = OCULTAS) {
  if (!esNum(cambio)) throw new Error('percentilDeMovimiento: cambio debe ser un número');
  if (!Array.isArray(cierres) || cierres.length <= pasos) {
    throw new Error('percentilDeMovimiento: la serie necesita más de ' + pasos + ' puntos');
  }
  const objetivo = Math.abs(cambio);
  let menores = 0, total = 0;
  for (let i = 0; i + pasos < cierres.length; i++) {
    if (!esNum(cierres[i]) || !esNum(cierres[i + pasos]) || cierres[i] === 0) continue;
    total++;
    if (Math.abs(cambioPct(cierres[i], cierres[i + pasos])) < objetivo) menores++;
  }
  if (!total) throw new Error('percentilDeMovimiento: no hay periodos completos que comparar');
  return (menores / total) * 100;
}

/**
 * Hacia dónde venía la parte VISIBLE, medida en el mismo plazo que se tapa: +1
 * si el último punto visible está por encima del de hace `pasos` barras, −1 si
 * por debajo, 0 si es exactamente igual.
 *
 * Sirve para decir, con datos y sin inventar causas, si la tendencia que se veía
 * siguió o se dio la vuelta. Que la respuesta sea "más o menos la mitad de las
 * veces cada cosa" es justo la lección del reto.
 */
export function tendencia(visibles, pasos = OCULTAS) {
  if (!Array.isArray(visibles) || visibles.length <= pasos) {
    throw new Error('tendencia: hacen falta más de ' + pasos + ' puntos visibles');
  }
  const fin = visibles[visibles.length - 1];
  const ini = visibles[visibles.length - 1 - pasos];
  if (!esNum(ini) || !esNum(fin) || ini === 0) throw new Error('tendencia: puntos inválidos');
  return Math.sign(cambioPct(ini, fin));
}

/**
 * Redondea el umbral a una cifra que se pueda leer en un botón: medio punto
 * hasta 5 %, un punto hasta 20 %, de cinco en cinco por encima.
 */
export function umbralBonito(pct) {
  if (!esNum(pct) || pct <= 0) throw new Error('umbralBonito: pct debe ser un número mayor que 0');
  const paso = pct < 5 ? 0.5 : pct < 20 ? 1 : 5;
  return Math.max(paso, Math.round(pct / paso) * paso);
}

/**
 * En qué banda cae un movimiento. El 0 exacto cuenta como "subió" (banda 1):
 * hay que repartirlo a algún lado y con cierres reales no pasa nunca.
 */
export function banda(cambio, umbral) {
  if (!esNum(cambio)) throw new Error('banda: cambio debe ser un número');
  if (!esNum(umbral) || umbral <= 0) throw new Error('banda: umbral debe ser un número mayor que 0');
  if (cambio <= -umbral) return -2;
  if (cambio < 0) return -1;
  if (cambio < umbral) return 1;
  return 2;
}

/** 2 si acertó la banda, 1 si solo la dirección, 0 si se equivocó de dirección. */
export function puntosDeRonda(elegida, real) {
  if (!BANDAS.includes(elegida) || !BANDAS.includes(real)) throw new Error('puntosDeRonda: bandas inválidas');
  if (elegida === real) return PUNTOS_POR_RONDA;
  return Math.sign(elegida) === Math.sign(real) ? 1 : 0;
}

/** Normaliza una serie a base 100 sobre `base` (lo que se dibuja: forma, no precio). */
export function indexar(cierres, base) {
  if (!esNum(base) || base === 0) throw new Error('indexar: la base debe ser un número distinto de 0');
  return cierres.map((c) => (c / base) * 100);
}

/**
 * Arma una ronda a partir de la serie completa de un activo.
 *
 * @param {object} v
 * @param {string} v.id            id del activo (se revela al final)
 * @param {number[]} v.cierres     cierres semanales, del más viejo al más nuevo
 * @param {number[]} v.fechas      marca de tiempo en ms de cada cierre
 * @param {number} v.fraccion      0–1, dónde cortar (viene de planDelReto)
 * @param {number} [v.ventana]     barras visibles
 * @param {number} [v.ocultas]     barras tapadas
 * @returns {{
 *   id: string, corte: number, umbral: number, cambio: number, banda: number,
 *   visibles: number[], ocultos: number[], desde: number, hasta: number, finVisible: number,
 *   percentil: number, tendencia: number, siguio: boolean
 * }}
 */
export function armarRonda(v) {
  const { id, cierres, fechas, fraccion } = v || {};
  const ventana = v.ventana ?? VENTANA;
  const ocultas = v.ocultas ?? OCULTAS;
  if (!Array.isArray(cierres) || !Array.isArray(fechas) || cierres.length !== fechas.length) {
    throw new Error('armarRonda: cierres y fechas deben ser arreglos del mismo largo');
  }
  const minimo = ventana + ocultas;
  if (cierres.length < minimo) throw new Error('armarRonda: hacen falta al menos ' + minimo + ' puntos');
  if (!esNum(fraccion) || fraccion < 0 || fraccion >= 1) throw new Error('armarRonda: fraccion debe estar en [0, 1)');

  // corte = índice del último punto VISIBLE. El primero posible deja la ventana
  // completa detrás; el último deja las barras tapadas por delante.
  const primero = ventana - 1;
  const ultimo = cierres.length - 1 - ocultas;
  const corte = primero + Math.floor(fraccion * (ultimo - primero + 1));

  const visibles = cierres.slice(corte - ventana + 1, corte + 1);
  const ocultos = cierres.slice(corte + 1, corte + 1 + ocultas);
  const umbral = umbralBonito(movimientoTipico(cierres, ocultas));
  const cambio = cambioPct(cierres[corte], cierres[corte + ocultas]);
  // Lo que se le cuenta al jugador al revelar, y que sale SOLO de los precios.
  const venia = tendencia(visibles, ocultas);

  return {
    id,
    corte,
    umbral,
    cambio,
    banda: banda(cambio, umbral),
    visibles,
    ocultos,
    desde: fechas[corte - ventana + 1],
    finVisible: fechas[corte],
    hasta: fechas[corte + ocultas],
    percentil: percentilDeMovimiento(cierres, cambio, ocultas),
    tendencia: venia,
    siguio: venia !== 0 && Math.sign(cambio) === venia
  };
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

/**
 * Resumen de la partida.
 * @param {{ elegida: number, real: number }[]} respuestas
 */
export function resumen(respuestas) {
  if (!Array.isArray(respuestas)) throw new Error('resumen: respuestas debe ser un arreglo');
  const detalle = respuestas.map((r) => puntosDeRonda(r.elegida, r.real));
  const puntos = detalle.reduce((a, b) => a + b, 0);
  return {
    puntos,
    max: respuestas.length * PUNTOS_POR_RONDA,
    exactas: detalle.filter((p) => p === PUNTOS_POR_RONDA).length,
    direccion: respuestas.filter((r) => Math.sign(r.elegida) === Math.sign(r.real)).length,
    azar: ESPERADO_AL_AZAR_POR_RONDA * respuestas.length,
    detalle
  };
}

/**
 * Cuadrícula de emojis para compartir, sin destripar las respuestas:
 * 🟩 banda exacta · 🟨 dirección · ⬜ fallo. (Verde/amarillo/blanco y no
 * verde/amarillo/rojo: el rojo junto al verde es justo lo que no distingue
 * quien tiene daltonismo, y el blanco sí se ve en los dos temas.)
 */
export function cuadricula(respuestas) {
  return resumen(respuestas).detalle.map((p) => (p === 2 ? '🟩' : p === 1 ? '🟨' : '⬜')).join('');
}

/**
 * La racha diaria: días seguidos jugados. Solo cuenta si el último día jugado
 * fue AYER; si se saltó un día vuelve a 1. Se guarda en localStorage, nunca en
 * un servidor.
 * @param {{ ultimoDia?: string, racha?: number }} guardado
 * @param {string} hoy YYYY-MM-DD
 */
export function nuevaRacha(guardado, hoy) {
  const previo = guardado && typeof guardado.ultimoDia === 'string' ? guardado.ultimoDia : null;
  const racha = guardado && esNum(guardado.racha) ? guardado.racha : 0;
  if (previo === hoy) return Math.max(racha, 1);
  if (!previo) return 1;
  const ayer = new Date(hoy + 'T12:00:00Z');
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  const ayerISO = ayer.toISOString().slice(0, 10);
  return previo === ayerISO ? racha + 1 : 1;
}
