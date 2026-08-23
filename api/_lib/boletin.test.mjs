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
