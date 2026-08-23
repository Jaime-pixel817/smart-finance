/*
 * La guardia de cifras: ninguna cifra puede aparecer en un derivado si no está
 * en la pieza de origen.
 *
 * POR QUÉ EXISTE
 * -------------
 * Un post de LinkedIn o un guion de TikTok que dice "el mercado cayó 12 %"
 * cuando la lección decía 10 % no es un error de redacción: es el sitio
 * mintiendo con la firma de Jaime. La regla de la skill derive-content ("toda
 * cifra citada existe en la pieza de origen") no sirve de nada si nadie la
 * comprueba, así que aquí se comprueba de verdad: se extraen los números de la
 * pieza, se extraen los del derivado y, si sobra uno, el comando falla y dice
 * cuál, en qué archivo y en qué línea.
 *
 * CÓMO SE COMPARA UN NÚMERO
 * -------------------------
 * Por su VALOR, no por cómo está escrito. "10,000", "10000" y "10 000" son el
 * mismo número; "10 %" y "10 años" también (la unidad no entra en la
 * comparación). Eso hace la guardia deliberadamente conservadora en un
 * sentido: deja pasar un 20 de "20 años" usado como "20 %". Endurecer eso
 * pedía entender la unidad de cada cifra, y una guardia que se equivoca en los
 * dos sentidos es peor que una que solo puede pecar de permisiva en el mismo
 * documento. Lo que NO deja pasar nunca es un número inventado.
 *
 * ES-MX Y EN-US ESCRIBEN IGUAL
 * ----------------------------
 * Los dos usan la coma para los millares y el punto para los decimales
 * (Intl.NumberFormat con es-MX y en-US, que es lo que usa src/scripts/format.ts).
 * Por eso hay una sola regla: coma seguida de exactamente tres dígitos = millar.
 *
 * LAS FECHAS VAN APARTE
 * ---------------------
 * "2026-08-21" no son tres números (2026, 8, 21): es una fecha. Se extraen
 * como fechas y se comparan como fechas, y ADEMÁS sus partes se dan por buenas
 * como números — si la fecha está en la pieza, "21 de agosto de 2026" también.
 *
 * LAS URL Y LOS NOMBRES DE ARCHIVO NO SON CIFRAS
 * ----------------------------------------------
 * El slug de una lección puede llevar números (/lessons/presupuesto-50-30-20),
 * una fuente puede citarse con un id que los lleve (CF101) y una lámina del
 * carrusel se llama laminas/01.png. Nada de eso es un dato publicado, así que
 * las URL y las rutas de archivo se borran de los dos lados antes de contar.
 *
 * LAS DOS EXENCIONES (y no hay más)
 * ---------------------------------
 * 1. El frontmatter YAML de un .md generado: son metadatos de producción
 *    (plataforma, duración, pieza de origen) que nunca se publican. Lo que se
 *    publica va en el cuerpo.
 * 2. La marca de tiempo de un plano de guion al principio de una línea, con la
 *    forma exacta `**0–3 s · Gancho**`. Es la escaleta, no una cifra.
 * Las dos están probadas en cifras.test.mjs. Todo lo demás se revisa.
 */

/** Fechas ISO. Se sacan del texto ANTES de contar números. */
const RE_FECHA = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
/** Horas tipo 14:30. Tampoco son cifras publicadas. */
const RE_HORA = /\b\d{1,2}:\d{2}\b/g;
/**
 * URL completas, rutas absolutas (`/api/send-newsletter?dry=1`) y nombres de
 * archivo. Una ruta empieza por "/" seguido de LETRA y no puede venir pegada a
 * un carácter de palabra: así "/market/spy" es una ruta y el "50/30/20" del
 * presupuesto sigue siendo tres cifras.
 */
const RE_URL = /\bhttps?:\/\/\S+|(?<![\w])\/[A-Za-z][\w\-./?=&%]*|\S+\.(?:png|jpe?g|webp|svg|json|ya?ml|mdx?|mjs|ts|astro)\b/g;
/** Un número tal cual está escrito, con sus separadores pegados. */
const RE_NUMERO = /\d[\d.,]*/g;
/** Exención 2: la marca de tiempo de un plano (`**0–3 s · Gancho**`). */
const RE_PLANO = /^\*\*\d+\s*[–-]\s*\d+\s*s\s*·/gm;
/** Exención 1: el bloque de frontmatter YAML al principio de un .md. */
const RE_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/** Sustituye por espacios para no mover los índices (y con ellos las líneas). */
const enBlanco = (m) => ' '.repeat(m.length);

/**
 * Deja el texto listo para contar: sin frontmatter, sin marcas de plano, sin
 * URL, sin horas y sin fechas. Devuelve el texto (misma longitud) y las fechas
 * que encontró.
 */
export function limpiar(texto, { conFrontmatter = false } = {}) {
  let t = String(texto).replace(/\r\n?/g, '\n');
  if (!conFrontmatter) t = t.replace(RE_FRONTMATTER, enBlanco);
  t = t.replace(RE_PLANO, enBlanco).replace(RE_URL, enBlanco).replace(RE_HORA, enBlanco);
  const fechas = [];
  t = t.replace(RE_FECHA, (m) => { fechas.push(m); return enBlanco(m); });
  return { texto: t, fechas };
}

/**
 * Un número escrito → los valores que representa.
 * "10,000" → [10000] · "3.5" → [3.5] · "3,5" → [3, 5] (dos números pegados)
 * "50/30/20" llega ya partido por el regex, cada trozo por su lado.
 */
export function valoresDe(crudo) {
  let s = String(crudo).replace(/[.,]+$/, '');
  let antes;
  do { antes = s; s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2'); } while (s !== antes);
  return s.split(',').map((t) => t.replace(/[.,]+$/, '')).filter(Boolean)
    .map(Number).filter((n) => Number.isFinite(n));
}

/** Clave de comparación de un valor: quita el ruido de coma flotante. */
export const clave = (n) => String(Number(n.toFixed(6)));

/**
 * Los números de un texto, con su posición.
 * → [{ crudo, valor, indice }]
 */
export function numerosDe(texto, opciones) {
  const { texto: limpio } = limpiar(texto, opciones);
  const salida = [];
  for (const m of limpio.matchAll(RE_NUMERO)) {
    for (const valor of valoresDe(m[0])) salida.push({ crudo: m[0].replace(/[.,]+$/, ''), valor, indice: m.index });
  }
  return salida;
}

/** Las fechas ISO de un texto, sin repetir. */
export function fechasDe(texto, opciones) {
  return [...new Set(limpiar(texto, opciones).fechas)];
}

/**
 * El permiso que da una pieza: qué números y qué fechas pueden aparecer en sus
 * derivados. Las partes de cada fecha (año, mes, día) entran como números:
 * si la pieza dice 2026-08-21, un derivado puede decir "21 de agosto de 2026".
 */
export function permisoDe(textoFuente) {
  const numeros = numerosDe(textoFuente, { conFrontmatter: true });
  const fechas = fechasDe(textoFuente, { conFrontmatter: true });
  const valores = new Set(numeros.map((n) => clave(n.valor)));
  for (const f of fechas) for (const parte of f.split('-')) valores.add(clave(Number(parte)));
  return { valores, fechas: new Set(fechas), numeros };
}

/** Número de línea (1-based) y la línea entera donde cae un índice. */
function contexto(texto, indice) {
  const antes = texto.slice(0, indice);
  const linea = antes.split('\n').length;
  const ini = antes.lastIndexOf('\n') + 1;
  const fin = texto.indexOf('\n', indice);
  return { linea, frase: texto.slice(ini, fin === -1 ? texto.length : fin).trim() };
}

/**
 * Revisa un texto contra el permiso de la pieza.
 * → [{ archivo, linea, crudo, valor, frase, tipo }] — vacío si todo cuadra.
 */
export function revisarTexto(texto, permiso, archivo = '(texto)', opciones) {
  const crudo = String(texto).replace(/\r\n?/g, '\n');
  const problemas = [];
  for (const n of numerosDe(crudo, opciones)) {
    if (permiso.valores.has(clave(n.valor))) continue;
    problemas.push({ archivo, tipo: 'cifra', crudo: n.crudo, valor: n.valor, ...contexto(crudo, n.indice) });
  }
  for (const f of fechasDe(crudo, opciones)) {
    if (permiso.fechas.has(f)) continue;
    const i = crudo.indexOf(f);
    problemas.push({ archivo, tipo: 'fecha', crudo: f, valor: null, ...contexto(crudo, i) });
  }
  return problemas;
}

/**
 * Revisa un JSON (el carrusel). Solo se miran los valores de TEXTO: los
 * campos numéricos del archivo (`lamina`, `total`) son su estructura, no una
 * cifra publicada, y ninguno se pinta en una imagen.
 */
export function revisarJson(valor, permiso, archivo = '(json)', ruta = '') {
  if (typeof valor === 'string') return revisarTexto(valor, permiso, archivo + (ruta ? ' → ' + ruta : ''), { conFrontmatter: true });
  if (Array.isArray(valor)) return valor.flatMap((v, i) => revisarJson(v, permiso, archivo, ruta + '[' + i + ']'));
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) => revisarJson(v, permiso, archivo, ruta ? ruta + '.' + k : k));
  }
  return [];
}

/** El listado que imprime el comando cuando algo no cuadra. */
export function informe(problemas) {
  const lineas = [];
  for (const p of problemas) {
    const que = p.tipo === 'fecha'
      ? 'la fecha ' + p.crudo + ' no está en la pieza'
      : 'la cifra ' + p.crudo + ' no está en la pieza';
    lineas.push('  ' + p.archivo + ':' + p.linea + ' — ' + que);
    if (p.frase) lineas.push('      ' + (p.frase.length > 120 ? p.frase.slice(0, 117) + '…' : p.frase));
  }
  return lineas.join('\n');
}
