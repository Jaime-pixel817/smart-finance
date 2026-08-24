// La og:image del reto del día: la tarjeta que se ve cuando alguien comparte
// /challenge o /es/reto en WhatsApp, y que enseña la gráfica CIEGA de HOY.
//
// La sirve api/newsletter-chart.js como una acción más (?reto=…). No es un
// archivo nuevo en api/: el plan de Vercel admite 12 funciones y el sitio está
// justo en 12 (CLAUDE.md). Va ahí y no en otra porque newsletter-chart.js ya es
// la función que entrega imágenes y la que casi nadie llama, así que sumarle
// este trabajo no le cuesta arranques en frío a nadie.
//
// CÓMO SE COMPONE
//   1. api/_lib/og-reto-base.js trae el fondo YA DIBUJADO (1200×630 en RGB,
//      deflate + base64) con el titular en Fraunces, el rótulo y el pie. Lo
//      genera scripts/build-og-reto.mjs en el build y se commitea. Aquí no se
//      escribe texto: lienzo.js dibuja líneas, no letras, y meter un
//      rasterizador de fuentes en una función serverless es justo lo que su
//      cabecera explica que no se hace.
//   2. Se pide la serie del PRIMER activo del reto de hoy con las MISMAS reglas
//      que el juego (src/lib/challenge/reto.mjs) y por la MISMA clave de caché
//      que usa quien lo juega (api/history.js → serie()). La tarjeta y el juego
//      no pueden enseñar cosas distintas.
//   3. Se dibuja en la caja libre de la derecha: la parte visible, la zona
//      tapada y la línea de corte. LA RESPUESTA NO SE DIBUJA — una tarjeta que
//      destripara el reto lo arruinaría para quien la ve antes de jugar.
//
// Si algo falla (Yahoo caído, la serie corta), esto lanza y quien llama redirige
// a la og:image estática de siempre. Una tarjeta rota en un chat no se arregla:
// los servicios de mensajería la cachean días.

const zlib = require('zlib');
const lienzo = require('./lienzo');
const base = require('./og-reto-base.js');
const historia = require('../history.js');

const TINTA = lienzo.color('#F5F5F2');
const PANEL = lienzo.color('#121212');
const TAPA = lienzo.color('#1C1C1C');
const BORDE = lienzo.color('#1F1F1F');
const CORTE = lienzo.color('#4A4A4E');
const VERDE = lienzo.color('#16C47F');

const GROSOR = 2.6;
const RELLENO = 18;   // margen interno de la caja

/** Las reglas del juego son ESM en src/: se cargan una vez y se guardan. */
let reglas = null;
async function cargarReglas() {
  if (!reglas) {
    const [reto, pool] = await Promise.all([
      import('../../src/lib/challenge/reto.mjs'),
      import('../../src/lib/challenge/pool.mjs')
    ]);
    reglas = { reto, pool };
  }
  return reglas;
}

/** El fondo, inflado a un lienzo de los de _lib/lienzo.js. */
function fondo(lang) {
  const b64 = lang === 'es' ? base.es : base.en;
  const px = zlib.inflateSync(Buffer.from(b64, 'base64'));
  if (px.length !== base.ancho * base.alto * 3) throw new Error('og-reto: el fondo mide ' + px.length);
  // Una COPIA: el lienzo se pinta encima y el módulo se reusa entre peticiones
  // en la misma instancia. Sin copiar, la segunda tarjeta del día saldría con
  // la gráfica de la primera debajo.
  return { ancho: base.ancho, alto: base.alto, px: new Uint8Array(px) };
}

/** Rectángulo relleno, sin antialias (los bordes caen en píxeles enteros). */
function rect(l, x, y, w, h, col) {
  const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(l.ancho, Math.round(x + w)), y1 = Math.min(l.alto, Math.round(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (py * l.ancho + px) * 3;
      l.px[i] = col[0]; l.px[i + 1] = col[1]; l.px[i + 2] = col[2];
    }
  }
}

/** Línea vertical punteada, que es como se marca el corte en el juego. */
function punteadaVertical(l, x, y0, y1, col) {
  for (let y = y0; y < y1; y += 9) rect(l, x, y, 1, Math.min(5, y1 - y), col);
}

/**
 * La tarjeta del reto de una fecha.
 *
 * @param {string} fecha  YYYY-MM-DD (día civil en Ciudad de México)
 * @param {'en'|'es'} lang
 * @returns {Promise<Buffer>} PNG de 1200×630
 */
async function tarjetaDelDia(fecha, lang) {
  const { reto, pool } = await cargarReglas();
  const plan = reto.planDelReto(fecha, pool.POOL_DIARIO);
  const par = pool.parDeHistorial(plan.activos[0]);

  const sobre = await historia.serie(par, '5Y');
  const puntos = ((sobre && sobre.valor && sobre.valor.points) || [])
    .filter((p) => Array.isArray(p) && typeof p[1] === 'number' && isFinite(p[1]) && p[1] > 0);
  const minimo = reto.VENTANA + reto.OCULTAS + 20;
  if (puntos.length < minimo) throw new Error('og-reto: serie corta (' + puntos.length + ')');

  const ronda = reto.armarRonda({
    id: plan.activos[0],
    cierres: puntos.map((p) => p[1]),
    fechas: puntos.map((p) => p[0] * 1000),
    fraccion: plan.cortes[0]
  });

  const l = fondo(lang);
  const c = base.caja;
  rect(l, c.x, c.y, c.w, c.h, PANEL);
  // Marco de 1 px, el mismo gris que la divisoria del pie.
  rect(l, c.x, c.y, c.w, 1, BORDE);
  rect(l, c.x, c.y + c.h - 1, c.w, 1, BORDE);
  rect(l, c.x, c.y, 1, c.h, BORDE);
  rect(l, c.x + c.w - 1, c.y, 1, c.h, BORDE);

  // El área de dibujo y las mismas proporciones del juego: 40 semanas a la
  // vista y 8 tapadas, así que el corte cae en 40/48 del ancho.
  const ax = c.x + RELLENO, ay = c.y + RELLENO;
  const aw = c.w - RELLENO * 2, ah = c.h - RELLENO * 2;
  const total = reto.VENTANA + reto.OCULTAS;
  const xDe = (n) => ax + (n / (total - 1)) * aw;
  const xCorte = xDe(reto.VENTANA - 1);

  // La escala es la de lo VISIBLE, igual que en el juego: con la escala de la
  // serie completa, una parte tapada grande aplastaría la curva y la tarjeta
  // enseñaría la respuesta.
  const vis = ronda.visibles;
  const min = Math.min(...vis), max = Math.max(...vis);
  const margen = (max - min || Math.abs(max) * 0.02 || 1) * 0.12;
  const lo = min - margen, hi = max + margen;
  const yDe = (v) => ay + ah * (1 - (v - lo) / (hi - lo));

  // La zona tapada: un bloque más claro y su línea de corte. Nada dentro.
  rect(l, xCorte, ay - 6, ax + aw - xCorte + 6, ah + 12, TAPA);
  punteadaVertical(l, xCorte, ay - 6, ay + ah + 6, CORTE);

  const linea = vis.map((v, n) => [xDe(n), yDe(v)]);
  lienzo.trazo(l, linea, GROSOR, TINTA);
  // El último punto que se ve, en verde: es el sitio exacto donde empieza la
  // pregunta.
  lienzo.circulo(l, linea[linea.length - 1][0], linea[linea.length - 1][1], 4.2, VERDE);

  return lienzo.png(l);
}

/**
 * La tarjeta de HOY, con "hoy" medido en Ciudad de México y no en UTC: el reto
 * cambia a medianoche de México (con UTC cambiaría a las 18:00 de allí), y la
 * tarjeta tiene que cambiar en el mismo instante que el juego.
 * @param {'en'|'es'} lang
 */
async function tarjetaDeHoy(lang) {
  const { reto } = await cargarReglas();
  return tarjetaDelDia(reto.fechaLocal(new Date()), lang);
}

module.exports = { tarjetaDelDia, tarjetaDeHoy };
