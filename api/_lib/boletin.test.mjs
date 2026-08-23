// Pruebas del boletín SEMANAL.
//
// Lo que se comprueba aquí es lo que no se ve mirando un correo suelto: que la
// cadencia que dice el código es la que está en vercel.json, que el correo no
// puede llevar texto de IA sin aprobar, que la lección rota por semana y no por
// día, que el bloque de research solo aparece cuando hay novedad, y que el modo
// ensayo (?dry=1) sigue armando el correo entero sin escribirle a nadie.
//
// No se toca la red: se le pasa a `renderizarCorreo` un contenido ya armado, y
// para el ensayo se sustituye `fetch` por uno de mentira que responde lo que
// responderían /api/history, /api/news?estado=aprobadas y
// /research-latest.json.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const boletin = require('./boletin.js');
const tips = require('./tips.js');

const RAIZ = new URL('../../', import.meta.url);

// ---------------------------------------------------------------- utilidades

const DOMINGO = new Date('2026-08-23T14:00:00.000Z');   // domingo, 8:00 en CDMX

function contenidoDePrueba(extra = {}) {
  return Object.assign({
    fecha: DOMINGO,
    noticia: {
      slug: 'banxico-baja-la-tasa',
      autoria: 'humana',
      fuente: 'Banxico',
      en: {
        titulo: 'Banxico cuts its rate again',
        take: 'Cheaper credit, but your savings account pays less too.',
        link: 'https://smartfinance.lat/news/banxico-baja-la-tasa'
      },
      es: {
        titulo: 'Banxico vuelve a bajar la tasa',
        take: 'El crédito se abarata, pero tu cuenta de ahorro también paga menos.',
        link: 'https://smartfinance.lat/es/noticias/banxico-baja-la-tasa'
      }
    },
    research: null,
    mercado: {
      usdmxn: { valor: 18.4210, cambio: 0.1130, cambioPct: 0.617, ultimoTs: 1787000000 },
      vix: { valor: 15.20, cambio: -0.48, cambioPct: -3.06, ultimoTs: 1787000000 }
    },
    grafica: null,
    tip: tips.TIPS[0]
  }, extra);
}

const pintar = (contenido, idioma) =>
  boletin.renderizarCorreo({
    contenido,
    idioma,
    urlBaja: 'https://smartfinance.lat/api/unsubscribe?token=X&email=a%40b.com'
  });

// ------------------------------------------------------------- la cadencia

test('el cron de vercel.json manda el boletín los domingos', () => {
  const vercel = JSON.parse(readFileSync(new URL('vercel.json', RAIZ), 'utf8'));
  const cron = vercel.crons.find((c) => c.path === '/api/send-newsletter');
  assert.ok(cron, 'no hay cron para /api/send-newsletter');
  // "0 14 * * 0" = domingos a las 14:00 UTC = 8:00 en Ciudad de México.
  assert.equal(cron.schedule, '0 14 * * 0');
  const [min, hora, , , dia] = cron.schedule.split(' ');
  assert.equal(min, '0');
  assert.equal(hora, '14');
  assert.equal(dia, '0', 'el día de la semana debe ser domingo, no "*"');
});

test('solo hay UN cron: el plan de Vercel no admite dos', () => {
  const vercel = JSON.parse(readFileSync(new URL('vercel.json', RAIZ), 'utf8'));
  assert.equal(vercel.crons.length, 1);
});

test('la lección rota por SEMANA, no por día', () => {
  const lunes = new Date('2026-08-17T18:00:00Z');
  const miercoles = new Date('2026-08-19T18:00:00Z');
  const domingoSiguiente = new Date('2026-08-30T18:00:00Z');

  // Dentro de la misma semana, la misma lección: el correo la anuncia como "la
  // de esta semana" y quien entre el miércoles tiene que encontrar esa.
  assert.deepEqual(tips.tipDeLaSemana(lunes), tips.tipDeLaSemana(miercoles));
  // A la semana siguiente, otra.
  assert.notDeepEqual(tips.tipDeLaSemana(lunes), tips.tipDeLaSemana(domingoSiguiente));
});

test('la rotación semanal recorre TODAS las lecciones sin repetir de más', () => {
  const vistas = new Set();
  for (let i = 0; i < tips.TIPS.length; i++) {
    vistas.add(tips.tipDeLaSemana(new Date(Date.UTC(2026, 0, 5 + i * 7, 18))).url);
  }
  assert.equal(vistas.size, tips.TIPS.length,
    tips.TIPS.length + ' semanas deberían dar las ' + tips.TIPS.length + ' lecciones');
});

// ------------------------------------------------- el contenido del correo

test('el correo habla de la SEMANA, no del día, en los dos idiomas', () => {
  const es = pintar(contenidoDePrueba(), 'es');
  const en = pintar(contenidoDePrueba(), 'en');

  assert.match(es.html, /La semana en una línea/);
  assert.match(es.html, /La noticia de la semana/);
  assert.match(es.html, /La lección de la semana/);
  assert.match(es.html, /boletín semanal de Smart Finance/);
  assert.match(es.html, /próximo domingo/);
  // Y nada que siga hablando de un correo diario.
  assert.doesNotMatch(es.html, /boletín diario/i);
  assert.doesNotMatch(es.html, /Hasta mañana/i);

  assert.match(en.html, /The week in one line/);
  assert.match(en.html, /The week&#39;s story|The week's story/);
  assert.match(en.html, /This week&#39;s lesson|This week's lesson/);
  assert.match(en.html, /Smart Finance weekly/);
  assert.doesNotMatch(en.html, /Smart Finance daily/i);
  assert.doesNotMatch(en.html, /Until tomorrow/i);
});

test('la fecha de arriba es el RANGO de la semana, no el domingo suelto', () => {
  const es = pintar(contenidoDePrueba(), 'es');
  // Del lunes 17 al domingo 23 de agosto.
  assert.match(es.html, /17–23 de agosto/);
  assert.equal(boletin.rangoSemana(DOMINGO, 'en'), 'August 17–23');
});

test('el rango dice los dos meses cuando la semana los cruza', () => {
  // Domingo 6 de septiembre de 2026: la semana arranca el 31 de agosto.
  const cruce = new Date('2026-09-06T14:00:00Z');
  assert.match(boletin.rangoSemana(cruce, 'es'), /agosto.*septiembre/);
  assert.match(boletin.rangoSemana(cruce, 'en'), /August.*September/);
});

test('"la semana en una línea" sale de los números reales, no de una frase fija', () => {
  const t = boletin.TEXTOS.es;
  const linea = boletin.resumenSemana(contenidoDePrueba().mercado, t, true);
  assert.match(linea, /18\.42/);
  assert.match(linea, /arriba/);
  assert.match(linea, /0\.62%/);
  assert.match(linea, /15\.20/);
  assert.match(linea, /bajó/);
});

test('sin un solo dato de mercado, el bloque de arriba no queda vacío', () => {
  const linea = boletin.resumenSemana({ usdmxn: null, vix: null }, boletin.TEXTOS.es, true);
  assert.ok(linea && linea.length > 20);
  assert.equal(linea, boletin.IMPULSO_RESPALDO.es);
});

// ------------------------------------------------- nada sin aprobar humana

test('el asunto es el titular de la noticia YA APROBADA', () => {
  const { asunto } = pintar(contenidoDePrueba(), 'es');
  assert.equal(asunto, 'Banxico vuelve a bajar la tasa');
});

test('sin noticia aprobada el correo sale igual, y lo dice', () => {
  const { html, texto, asunto } = pintar(contenidoDePrueba({ noticia: null }), 'es');
  assert.match(html, /no hubo ninguna noticia revisada/i);
  assert.match(texto, /no hubo ninguna noticia revisada/i);
  // El asunto cae al título de la lección de la semana, nunca queda vacío ni
  // repite el mismo texto todas las semanas sin noticia.
  assert.equal(asunto, tips.TIPS[0].es.titulo);
  assert.notEqual(asunto, boletin.GANCHO_SEMANAL.es);
  // Y el resto del correo sigue completo.
  assert.match(html, /La lección de la semana/);
  assert.match(html, /18\.4210/);
});

test('la etiqueta de autoría dice la verdad: humana o IA revisada', () => {
  const humana = pintar(contenidoDePrueba(), 'es').html;
  assert.match(humana, /Mi lectura/);
  assert.doesNotMatch(humana, /Resumen IA/);

  const conIA = contenidoDePrueba();
  conIA.noticia.autoria = 'ia-revisada';
  assert.match(pintar(conIA, 'es').html, /Resumen IA · revisado por Jaime/);
});

test('el enlace de la noticia va a NUESTRA página, en el idioma del lector', () => {
  assert.match(pintar(contenidoDePrueba(), 'es').html, /smartfinance\.lat\/es\/noticias\/banxico-baja-la-tasa/);
  assert.match(pintar(contenidoDePrueba(), 'en').html, /smartfinance\.lat\/news\/banxico-baja-la-tasa/);
});

// ------------------------------------------------------------- el research

test('sin novedad de research, ese bloque no existe', () => {
  const { html, texto } = pintar(contenidoDePrueba(), 'es');
  assert.doesNotMatch(html, /Novedad en research/);
  assert.doesNotMatch(texto, /NOVEDAD EN RESEARCH/);
});

test('con novedad, el research entra en el HTML y en la versión de texto', () => {
  const con = contenidoDePrueba({
    research: {
      ticker: 'LULU', name: 'lululemon athletica inc.', exchange: 'NASDAQ',
      status: 'draft', actualizado: '2026-08-21',
      en: { link: 'https://smartfinance.lat/research/lululemon' },
      es: { link: 'https://smartfinance.lat/es/research/lululemon' }
    }
  });
  const es = pintar(con, 'es');
  assert.match(es.html, /Novedad en research/);
  assert.match(es.html, /lululemon athletica inc\. \(LULU\)/);
  assert.match(es.html, /es\/research\/lululemon/);
  assert.match(es.texto, /NOVEDAD EN RESEARCH/);

  const en = pintar(con, 'en');
  assert.match(en.html, /New in research/);
  assert.match(en.html, /smartfinance\.lat\/research\/lululemon/);
});

// ------------------------------------------------------ el correo, entero

test('la baja va SIEMPRE, aunque no haya ni noticia ni research', () => {
  const { html, texto } = pintar(contenidoDePrueba({ noticia: null, research: null }), 'es');
  assert.match(html, /api\/unsubscribe\?token=X/);
  assert.match(texto, /api\/unsubscribe\?token=X/);
  assert.match(html, /no es asesoría financiera/);
});

test('la versión de texto lleva lo mismo que el HTML', () => {
  const { texto } = pintar(contenidoDePrueba(), 'es');
  assert.match(texto, /SMART FINANCE — NÚMERO 1 · 17–23 de agosto/);
  assert.match(texto, /Banxico vuelve a bajar la tasa/);
  assert.match(texto, /USD\/MXN/);
  assert.match(texto, /VIX/);
  assert.match(texto, /Darse de baja/);
});

// -------------------------------------------------------- el modo ensayo

test('?dry=1 arma el correo entero y no le escribe a nadie', async () => {
  const antesSecreto = process.env.CRON_SECRET;
  const antesResend = process.env.RESEND_API_KEY;
  const antesSitio = process.env.SITE_URL;
  process.env.CRON_SECRET = 'secreto-de-prueba';
  process.env.RESEND_API_KEY = 're_de_mentira';
  process.env.SITE_URL = 'https://smartfinance.lat';

  // Las dos piezas que hablan con Redis se sustituyen aquí. No es por comodidad:
  // el ensayo tiene que poder correrse en cualquier máquina sin base de datos, y
  // lo que esta prueba comprueba es el CONTENIDO del correo, no Upstash.
  const suscriptores = require('./suscriptores.js');
  const grafica = require('./grafica.js');
  const listarReal = suscriptores.listarConfirmados;
  const publicarReal = grafica.publicar;
  suscriptores.listarConfirmados = async () => ([
    { correo: 'lectora@ejemplo.com', idioma: 'es', tokenBaja: 'T1' },
    { correo: 'reader@example.com', idioma: 'en', tokenBaja: 'T2' }
  ]);
  grafica.publicar = async () => ({ url: 'https://smartfinance.lat/api/newsletter-chart?d=x&v=y', ancho: 552, alto: 144 });

  const pedidas = [];
  const fetchReal = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    pedidas.push(u);
    // Si algo intentara hablar con Resend, esto lo cazaría.
    assert.ok(!/resend\.com/.test(u), 'el ensayo no debe llamar a Resend: ' + u);

    const json = (cuerpo) => ({ ok: true, status: 200, async json() { return cuerpo; }, async text() { return JSON.stringify(cuerpo); } });

    if (/\/api\/history/.test(u)) {
      assert.match(u, /range=1W/, 'el boletín semanal debe pedir la semana, no el día: ' + u);
      const t0 = Math.floor(Date.UTC(2026, 7, 17, 14) / 1000);
      const puntos = Array.from({ length: 40 }, (_, i) => [t0 + i * 3600, 18.3 + i * 0.003]);
      return json({ pair: 'X', range: '1W', points: puntos });
    }
    if (/\/api\/news/.test(u)) {
      assert.match(u, /estado=aprobadas/, 'el boletín solo puede pedir noticias APROBADAS: ' + u);
      return json({
        fuente: 'revisadas',
        items: [{
          slug: 'banxico-baja-la-tasa', autoria: 'humana',
          fuente: { nombre: 'Banxico', url: 'https://banxico.org.mx/x' },
          en: { titulo: 'Banxico cuts again', que: 'x '.repeat(40), porque: 'y '.repeat(40), impacto: 'Cheaper credit.' },
          es: { titulo: 'Banxico vuelve a bajar la tasa', que: 'x '.repeat(40), porque: 'y '.repeat(40), impacto: 'El crédito se abarata.' }
        }]
      });
    }
    if (/research-latest\.json/.test(u)) {
      return json({ reportes: [] });
    }
    throw new Error('el ensayo pidió algo inesperado: ' + u);
  };

  try {
    const handler = require('../send-newsletter.js');
    let salida = null;
    const res = { setHeader() {}, status(c) { this._c = c; return this; }, json(b) { salida = { codigo: this._c, cuerpo: b }; } };

    await handler(
      { method: 'GET', query: { dry: '1' }, headers: { authorization: 'Bearer secreto-de-prueba' } },
      res
    );

    assert.equal(salida.codigo, 200, JSON.stringify(salida.cuerpo));
    assert.equal(salida.cuerpo.ensayo, true);
    assert.equal(salida.cuerpo.titular, 'Banxico vuelve a bajar la tasa');
    assert.equal(salida.cuerpo.asunto, 'Banxico vuelve a bajar la tasa');
    assert.equal(salida.cuerpo.research, null);
    assert.ok(salida.cuerpo.mercado.usdmxn, 'el ensayo no trajo el dólar');
    // Confirmados y "se enviaría a" salen del ensayo, pero no salió un correo.
    assert.equal(salida.cuerpo.confirmados, 2);
    assert.equal(salida.cuerpo.seEnviariaA, 2);
    assert.match(salida.cuerpo.html, /La noticia de la semana/);
    assert.match(salida.cuerpo.html, /La semana en una línea/);

    // Y que de verdad pidió las tres cosas del propio sitio, ninguna a un tercero.
    assert.ok(pedidas.some((u) => /api\/history\?pair=USDMXN&range=1W/.test(u)));
    assert.ok(pedidas.some((u) => /api\/news\?estado=aprobadas/.test(u)));
    assert.ok(pedidas.some((u) => /research-latest\.json/.test(u)));
    assert.equal(pedidas.some((u) => /anthropic|bloomberg/i.test(u)), false,
      'el boletín semanal no debe llamar ni a Anthropic ni al feed');
  } finally {
    globalThis.fetch = fetchReal;
    suscriptores.listarConfirmados = listarReal;
    grafica.publicar = publicarReal;
    if (antesSecreto === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = antesSecreto;
    if (antesResend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = antesResend;
    if (antesSitio === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = antesSitio;
  }
});

test('sin el secreto, ?dry=1 no arma nada', async () => {
  const antes = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'secreto-de-prueba';
  const handler = require('../send-newsletter.js');
  let salida = null;
  const res = { setHeader() {}, status(c) { this._c = c; return this; }, json(b) { salida = { codigo: this._c, cuerpo: b }; } };
  await handler({ method: 'GET', query: { dry: '1' }, headers: {} }, res);
  assert.equal(salida.codigo, 401);
  if (antes === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = antes;
});

// ------------------------------------ los textos del sitio, en EN y en ES

test('ni el sitio ni los correos de estado siguen prometiendo un boletín diario', () => {
  // El texto que ve la gente vive en src/i18n/ui.ts (Astro) y en las páginas de
  // estado del boletín (public/newsletter/*.html). Si alguno vuelve a decir
  // "diario"/"daily" del boletín, esta prueba lo caza antes del despliegue.
  const sospechosas = [
    'src/i18n/ui.ts',
    'public/newsletter/confirmado.html',
    'public/newsletter/baja.html',
    'api/_lib/resend.js'
  ];
  const patron = /(boletín|boletin)\s+diario|daily\s+(newsletter|email|brief)|newsletter\s+diario/i;
  for (const rel of sospechosas) {
    const texto = readFileSync(new URL(rel, RAIZ), 'utf8');
    const linea = texto.split('\n').findIndex((l) => patron.test(l));
    assert.equal(linea, -1, rel + ' sigue diciendo que el boletín es diario (línea ' + (linea + 1) + ')');
  }
});

// ======================================================================
// Lo que se añadió al mejorar el boletín: la cabecera con identidad, la
// tabla de "qué se movió", la línea de Jaime, el archivo y la versión web.
// ======================================================================

// ------------------------------------------------- la lección de la semana

test('cada lección del boletín es la MISMA que la del sitio', () => {
  // api/ no puede leer los MDX en Vercel (el empaquetado solo se lleva lo que
  // la función requiere), así que tips.js es una copia. Esta prueba es lo que
  // impide que la copia se desincronice en silencio: si alguien retoca el
  // título, la descripción o los minutos de una lección, aquí se cae.
  for (const tip of tips.TIPS) {
    for (const lang of ['en', 'es']) {
      const mdx = readFileSync(new URL('src/content/lessons/' + lang + '/' + tip.slug + '.mdx', RAIZ), 'utf8');
      const campo = (nombre) => {
        const m = new RegExp('^' + nombre + ':\\s*"([^"]+)"', 'm').exec(mdx);
        return m ? m[1] : null;
      };
      assert.equal(tip[lang].titulo, campo('title'), tip.slug + ' (' + lang + '): el título no es el de la lección');
      assert.equal(tip[lang].resumen, campo('description'), tip.slug + ' (' + lang + '): el resumen no es el de la lección');
    }
    const minutos = /^readingMinutes:\s*(\d+)/m.exec(
      readFileSync(new URL('src/content/lessons/es/' + tip.slug + '.mdx', RAIZ), 'utf8')
    );
    assert.equal(tip.minutos, Number(minutos[1]), tip.slug + ': los minutos de lectura no son los de la lección');
  }
});

test('las dos rutas de cada lección están registradas en el sitio', () => {
  const rutas = readFileSync(new URL('src/i18n/routes.ts', RAIZ), 'utf8');
  for (const tip of tips.TIPS) {
    assert.ok(rutas.includes("'" + tip.url + "'"), 'falta ' + tip.url + ' en routes.ts');
    assert.ok(rutas.includes("'" + tip.urlEs + "'"), 'falta ' + tip.urlEs + ' en routes.ts');
  }
});

test('el correo en español enlaza a la lección EN ESPAÑOL', () => {
  // Era un fallo de verdad: tips.js solo guardaba la ruta inglesa, así que el
  // botón del correo en español mandaba a /lessons/... y el lector aterrizaba
  // en la lección en inglés.
  const es = pintar(contenidoDePrueba(), 'es').html;
  assert.match(es, /smartfinance\.lat\/es\/lecciones\//);
  assert.doesNotMatch(es, /smartfinance\.lat\/lessons\//);

  const en = pintar(contenidoDePrueba(), 'en').html;
  assert.match(en, /smartfinance\.lat\/lessons\//);
  assert.doesNotMatch(en, /smartfinance\.lat\/es\/lecciones\//);
});

test('la lección dice cuánto se tarda en leerse', () => {
  const es = pintar(contenidoDePrueba(), 'es');
  assert.match(es.html, /\d+ min de lectura/);
  assert.match(es.texto, /\d+ min de lectura/);
  assert.match(pintar(contenidoDePrueba(), 'en').html, /\d+-minute read/);
});

// ------------------------------------------------------ la cabecera

test('la cabecera lleva el número de edición y la semana', () => {
  const { html, texto } = pintar(contenidoDePrueba(), 'es');
  assert.match(html, /Número 1/);
  assert.match(html, /17–23 de agosto/);
  assert.match(texto, /NÚMERO 1 · 17–23 de agosto/);
  assert.match(pintar(contenidoDePrueba(), 'en').html, /Issue 1/);
});

test('el número de edición sube de uno en uno cada domingo', () => {
  const domingo = (n) => new Date(Date.parse('2026-08-23T14:00:00.000Z') + n * 7 * 86400000);
  assert.equal(boletin.numeroDeEdicion(domingo(0)), 1);
  assert.equal(boletin.numeroDeEdicion(domingo(1)), 2);
  assert.equal(boletin.numeroDeEdicion(domingo(10)), 11);
  // Un ensayo fechado antes del primer domingo no puede enseñar "Nº 0".
  assert.equal(boletin.numeroDeEdicion(new Date('2026-01-04T14:00:00.000Z')), 1);
});

test('"ver en el navegador" apunta a la versión web de ESTE número', () => {
  const { html, texto } = pintar(contenidoDePrueba(), 'es');
  assert.match(html, /smartfinance\.lat\/newsletter\/2026-08-23/);
  assert.match(texto, /Ver este número en el navegador: https:\/\/smartfinance\.lat\/newsletter\/2026-08-23/);
});

test('el correo trae las reglas del modo oscuro', () => {
  const { html } = pintar(contenidoDePrueba(), 'es');
  assert.match(html, /prefers-color-scheme: dark/);
  // Outlook.com no entiende prefers-color-scheme y marca el cuerpo con esto.
  assert.match(html, /\[data-ogsc\]/);
  assert.match(html, /name="color-scheme"/);
  // Y cada color en línea tiene su clase: sin ellas el <style> no repinta nada.
  assert.match(html, /class="sf-tarjeta"/);
});

// -------------------------------------------------- el chip de fuente

test('ningún bloque de datos sale sin decir de dónde viene y de cuándo es', () => {
  const conMovs = contenidoDePrueba({
    movimientos: {
      suben: [{ id: 'nvda', sym: 'NVDA', en: 'Nvidia', es: 'Nvidia', valor: 210, cambioPct: 4.2, ultimoTs: 1787000000 }],
      bajan: [{ id: 'spy', sym: 'SPY', en: 'S&P 500', es: 'S&P 500', valor: 760, cambioPct: -1.3, ultimoTs: 1787000000 }],
      asOf: 1787000000, consultados: 9
    }
  });
  const { html, texto } = pintar(conMovs, 'es');
  // Uno por el dólar y otro por la tabla de movimientos.
  assert.equal((html.match(/Yahoo Finance/g) || []).length, 2);
  assert.match(html, /Yahoo Finance · último cierre: /);
  assert.match(texto, /Yahoo Finance/);
});

// ------------------------------------------------------ qué se movió

test('la tabla de movimientos sale con flecha, nombre, ticker y cifra', () => {
  const con = contenidoDePrueba({
    movimientos: {
      suben: [{ id: 'nvda', sym: 'NVDA', en: 'Nvidia', es: 'Nvidia', valor: 210, cambioPct: 4.2, ultimoTs: 1787000000 }],
      bajan: [{ id: 'spy', sym: 'SPY', en: 'S&P 500', es: 'S&P 500', valor: 760, cambioPct: -1.3, ultimoTs: 1787000000 }],
      asOf: 1787000000, consultados: 9
    }
  });
  const { html, texto } = pintar(con, 'es');
  assert.match(html, /Qué se movió esta semana/);
  assert.match(html, /&#9650;/);            // ▲
  assert.match(html, /&#9660;/);            // ▼
  assert.match(html, /Nvidia/);
  assert.match(html, /NVDA/);
  assert.match(html, /\+4\.20%/);
  assert.match(html, /-1\.30%/);
  // En texto plano la flecha va de verdad, no como entidad.
  assert.match(texto, /▲ Nvidia \(NVDA\) \+4\.20%/);
});

test('sin datos de movimientos, ese bloque simplemente no existe', () => {
  const { html, texto } = pintar(contenidoDePrueba(), 'es');
  assert.doesNotMatch(html, /Qué se movió/);
  assert.doesNotMatch(texto, /QUÉ SE MOVIÓ/);
});

test('los activos de la tabla existen en el registro del sitio y en /api/history', () => {
  const movs = require('./movimientos.js');
  const symbols = readFileSync(new URL('src/data/symbols.ts', RAIZ), 'utf8');
  const history = readFileSync(new URL('api/history.js', RAIZ), 'utf8');

  for (const a of movs.ACTIVOS) {
    assert.ok(symbols.includes("'" + a.id + "', '" + a.sym + "'"),
      a.sym + ' no está en src/data/symbols.ts con ese id');
    assert.match(history, new RegExp('^\\s*' + a.pair + ':', 'm'),
      a.pair + ' no es un par que sepa servir /api/history');
  }
});

test('la tabla no mezcla ventanas: nada de cripto, y ni el dólar ni el VIX', () => {
  // `range=1W` son cinco SESIONES para una acción y cinco días de CALENDARIO
  // para el bitcoin. Mezclarlos en la misma columna ordenada es una comparación
  // falsa: salían Ethereum +27.50 % y el S&P 500 −1.26 % con el mismo título.
  const movs = require('./movimientos.js');
  const ids = movs.ACTIVOS.map((a) => a.id);
  for (const cripto of ['btc', 'eth', 'sol', 'xrp']) {
    assert.ok(!ids.includes(cripto), cripto + ' mide una ventana distinta: no puede ir en esta tabla');
  }
  // Estos dos tienen su propio bloque con su gráfica, tres líneas más arriba.
  assert.ok(!ids.includes('usdmxn'));
  assert.ok(!ids.includes('vix'));
});

test('con pocas respuestas no se publica media tabla', async () => {
  const movs = require('./movimientos.js');
  let n = 0;
  const pedirJSON = async () => {
    // Solo contestan cuatro; el resto se cae.
    if (++n > 4) throw new Error('proveedor caído');
    return { points: [[1786900000, 100], [1787000000, 105]] };
  };
  assert.equal(await movs.delaSemana('https://x', pedirJSON), null);
});

test('con la lista entera salen los tres de arriba y los tres de abajo, ordenados', async () => {
  const movs = require('./movimientos.js');
  // Cada activo sube un poco más que el anterior: el orden es predecible.
  let i = 0;
  const pedirJSON = async () => {
    const cambio = 1 + (i++ - 4) / 100;    // de -0.03 a +0.04
    return { points: [[1786900000, 100], [1787000000, 100 * cambio]] };
  };
  const r = await movs.delaSemana('https://x', pedirJSON);
  assert.equal(r.suben.length, 3);
  assert.equal(r.bajan.length, 3);
  assert.ok(r.suben[0].cambioPct > r.suben[1].cambioPct, 'los que suben van de mayor a menor');
  assert.ok(r.bajan[0].cambioPct < r.bajan[1].cambioPct, 'los que bajan van del que más cayó al que menos');
  // Ninguno puede estar en los dos lados.
  const arriba = new Set(r.suben.map((x) => x.id));
  assert.ok(r.bajan.every((x) => !arriba.has(x.id)));
});

// --------------------------------------------------- la línea de Jaime

test('sin nota, el correo no deja un bloque vacío', () => {
  const { html, texto } = pintar(contenidoDePrueba(), 'es');
  assert.doesNotMatch(html, /La línea de Jaime/);
  assert.doesNotMatch(texto, /LA LÍNEA DE JAIME/);
});

test('con nota, se ve como su voz y va firmada', () => {
  const con = contenidoDePrueba({ nota: { es: 'Esta semana abrí mi primera cuenta de casa de bolsa.', en: 'This week I opened my first brokerage account.' } });
  const { html, texto } = pintar(con, 'es');
  assert.match(html, /La línea de Jaime/);
  assert.match(html, /Esta semana abrí mi primera cuenta/);
  assert.match(html, /— Jaime Sandoval/);
  assert.match(texto, /LA LÍNEA DE JAIME/);
});

test('una nota solo en español NO sale en el correo en inglés', () => {
  // La regla del sitio es que no hay texto suelto en el idioma que no toca, y
  // traducirla por nuestra cuenta sería poner una máquina a escribir lo único
  // que firma una persona.
  const con = contenidoDePrueba({ nota: { es: 'Esta semana abrí mi primera cuenta.', en: null } });
  assert.match(pintar(con, 'es').html, /Esta semana abrí mi primera cuenta/);
  const en = pintar(con, 'en').html;
  assert.doesNotMatch(en, /Esta semana abrí/);
  assert.doesNotMatch(en, /Jaime&#39;s line|Jaime's line/);
});

// --------------------------------- un solo llamado a la acción

test('el correo tiene UN botón, y es el de la lección', () => {
  const { html } = pintar(contenidoDePrueba(), 'es');
  // El botón se pinta con la clase sf-boton; las redes bajaron a enlaces.
  assert.equal((html.match(/class="sf-boton"/g) || []).length, 1);
  assert.match(html, /Leer la lección/);
  // LinkedIn y TikTok siguen estando, pero como texto en el pie.
  assert.match(html, /linkedin\.com/);
  assert.match(html, /tiktok\.com/);
});

// ------------------------------------------- el archivo y la versión web

test('el número archivado trae todo lo que necesita su página', () => {
  const con = contenidoDePrueba({
    nota: { es: 'Una línea.', en: 'One line.' },
    serieFx: [[1786900000, 18.3], [1787000000, 18.42]],
    movimientos: { suben: [], bajan: [{ id: 'spy', sym: 'SPY', en: 'S&P 500', es: 'S&P 500', valor: 760, cambioPct: -1.3, ultimoTs: 1787000000 }], asOf: 1787000000, consultados: 9 }
  });
  const n = boletin.paraArchivo(con);

  assert.equal(n.fecha, '2026-08-23');           // es la URL: /newsletter/<fecha>
  assert.equal(n.numero, 1);
  assert.equal(n.rango.es, '17–23 de agosto');
  assert.equal(n.rango.en, 'August 17–23');
  assert.equal(n.gancho.es, 'Banxico vuelve a bajar la tasa');
  assert.ok(n.resumen.es.includes('18.42'));
  assert.deepEqual(n.nota, { es: 'Una línea.', en: 'One line.' });
  assert.ok(n.serieFx.length === 2, 'la serie del dólar viaja: la página dibuja su propia gráfica');
  assert.ok(n.mercado.usdmxn && n.movimientos && n.tip);
  assert.ok(n.enviadoEn.startsWith('2026-08-23'));
});

test('/newsletter/<fecha> existe como página y como reescritura', () => {
  const rutas = readFileSync(new URL('src/i18n/routes.ts', RAIZ), 'utf8');
  assert.match(rutas, /id: 'newsletter', en: '\/newsletter', es: '\/es\/boletin'/);
  assert.match(rutas, /id: 'newsletter\.read'/);

  // La reescritura solo entra si la página estática NO existe (Vercel mira el
  // sistema de archivos antes), así que un número ya commiteado se sigue
  // sirviendo como HTML y esto no lo tapa.
  const vercel = JSON.parse(readFileSync(new URL('vercel.json', RAIZ), 'utf8'));
  const reescrituras = vercel.rewrites.map((r) => r.source + ' -> ' + r.destination);
  assert.ok(reescrituras.some((r) => r.startsWith('/newsletter/:fecha') && r.endsWith('/newsletter-read')));
  assert.ok(reescrituras.some((r) => r.startsWith('/es/boletin/:fecha') && r.endsWith('/es/boletin-leer')));
  // Y no puede tragarse /newsletter/baja ni /newsletter/confirmado, que son
  // páginas de verdad en public/.
  const patron = vercel.rewrites.find((r) => r.source.startsWith('/newsletter/:fecha')).source;
  assert.match(patron, /\\d\{4\}-\\d\{2\}-\\d\{2\}/);
});

test('el plan de Vercel sigue cabiendo: 12 funciones y ni una más', () => {
  // La versión web y la línea de Jaime entraron como ACCIONES de endpoints que
  // ya existían, no como archivos nuevos: 13 tumbarían el despliegue entero.
  const { readdirSync } = require('node:fs');
  const funciones = readdirSync(new URL('api/', RAIZ)).filter((f) => f.endsWith('.js'));
  assert.equal(funciones.length, 12, 'api/ tiene ' + funciones.length + ' funciones: ' + funciones.join(', '));

  const chart = readFileSync(new URL('api/newsletter-chart.js', RAIZ), 'utf8');
  assert.match(chart, /req\.query && req\.query\.issue/, 'el número en JSON se sirve desde newsletter-chart');
  const log = readFileSync(new URL('api/newsletter-log.js', RAIZ), 'utf8');
  assert.match(log, /accion !== 'nota'/, 'la línea de Jaime se escribe desde newsletter-log');
});
