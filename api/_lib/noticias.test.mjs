// Pruebas de la capa de noticias que NO tocan Redis: las reglas que deciden si
// una noticia se puede publicar, y la puerta del secreto.
//
// Lo que se comprueba aquí es justo lo que no se puede comprobar mirando la
// página: que un borrador cojo no pueda aprobarse, que un símbolo inventado no
// llegue al HTML, y que sin CRON_SECRET no se pueda ni mirar la cola.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const noticias = require('./noticias.js');
const { autorizado } = require('./secreto.js');

/** Una noticia mínima y correcta, para ir rompiéndola campo a campo. */
function noticiaBuena(extra = {}) {
  const parrafo = (n) => Array.from({ length: n }, (_, i) => 'palabra' + i).join(' ');
  return Object.assign({
    id: '2026-08-22-una-noticia',
    slug: 'una-noticia',
    estado: 'borrador',
    tema: 'macro',
    creadoEn: '2026-08-22T12:00:00.000Z',
    fuente: {
      nombre: 'Bloomberg',
      titular: 'Something happened',
      url: 'https://www.bloomberg.com/news/articles/2026-08-22/algo',
      publicado: '2026-08-22T11:00:00.000Z'
    },
    simbolos: ['spy'],
    principal: 'spy',
    leccion: 'lesson.sp500',
    terminos: ['sp500'],
    en: { titulo: 'A plain headline', que: parrafo(30), porque: parrafo(30), impacto: 'Too early to tell.' },
    es: { titulo: 'Un titular claro', que: parrafo(30), porque: parrafo(30), impacto: 'Todavía no se sabe.' }
  }, extra);
}

test('una noticia completa pasa la validación', () => {
  assert.deepEqual(noticias.validar(noticiaBuena()), []);
});

test('sin fuente enlazable no se publica', () => {
  const sinUrl = noticiaBuena({ fuente: { nombre: 'Bloomberg', url: 'javascript:alert(1)', publicado: 'x' } });
  assert.ok(noticias.validar(sinUrl).some((e) => e.includes('URL http(s)')));
});

test('un símbolo o una lección inventados se detectan', () => {
  assert.ok(noticias.validar(noticiaBuena({ simbolos: ['tesla'] })).some((e) => e.includes('tesla')));
  assert.ok(noticias.validar(noticiaBuena({ leccion: 'lesson.cripto' })).some((e) => e.includes('lesson.cripto')));
});

test('un término fuera del glosario se detecta', () => {
  assert.ok(noticias.validar(noticiaBuena({ terminos: ['no-existe'] })).some((e) => e.includes('no-existe')));
});

test('un texto demasiado corto no cuenta como noticia explicada', () => {
  const corta = noticiaBuena();
  corta.es = Object.assign({}, corta.es, { porque: 'Importa mucho.' });
  assert.ok(noticias.validar(corta).some((e) => e.includes('por qué importa')));
});

test('un muro de texto tampoco: el formato son 120–180 palabras', () => {
  const larga = noticiaBuena();
  larga.en = Object.assign({}, larga.en, { que: Array.from({ length: 300 }, () => 'x').join(' ') });
  assert.ok(noticias.validar(larga).some((e) => e.includes('se pasa de largo')));
});

test('faltar un idioma entero es un error, no una noticia a medias', () => {
  const soloEs = noticiaBuena();
  delete soloEs.en;
  assert.ok(noticias.validar(soloEs).some((e) => e.includes('falta el texto en en')));
});

test('los símbolos que conoce la API existen en el registro del sitio', () => {
  // src/data/symbols.ts es la única lista real de activos. Si alguien añade uno
  // allí y no aquí, el modelo nunca lo podrá usar; si lo quita de allí y no de
  // aquí, la noticia acabaría enlazando a una ficha que no existe.
  const ts = readFileSync(new URL('../../src/data/symbols.ts', import.meta.url), 'utf8');
  const ids = new Set();
  for (const m of ts.matchAll(/\b(?:us|fx|crypto)\('([a-z0-9]+)'/g)) ids.add(m[1]);
  for (const m of ts.matchAll(/\bid: '([a-z0-9]+)',\s*sym:/g)) ids.add(m[1]);
  assert.ok(ids.size > 10, 'no se pudieron leer los símbolos de src/data/symbols.ts');
  for (const s of noticias.SIMBOLOS) {
    assert.ok(ids.has(s), `la API conoce "${s}" pero no está en src/data/symbols.ts`);
  }
});

test('slugify deja una URL legible y sin acentos', () => {
  assert.equal(noticias.slugify('Banxico bajó la tasa'), 'banxico-bajo-la-tasa');
  assert.equal(noticias.slugify('  ¿Qué pasó con el peso?  '), 'que-paso-con-el-peso');
  assert.equal(noticias.slugify(''), '');
});

test('estadoPedido distingue "no pidió nada" de "pidió una tontería"', () => {
  assert.equal(noticias.estadoPedido(''), null);          // no se pidió filtro
  assert.equal(noticias.estadoPedido(undefined), null);
  assert.equal(noticias.estadoPedido('aprobadas'), 'aprobada');
  assert.equal(noticias.estadoPedido('aprobada'), 'aprobada');
  assert.equal(noticias.estadoPedido('borradores'), 'borrador');
  assert.equal(noticias.estadoPedido('publicadas'), undefined);  // valor inválido
});

test('publica() no deja salir el estado ni las notas internas', () => {
  const p = noticias.publica(noticiaBuena({ estado: 'aprobada', editadoPorHumano: true, modelo: 'claude-haiku-4-5' }));
  assert.equal(p.estado, undefined);
  assert.equal(p.modelo, undefined);
  assert.equal(p.autoria, 'humana');
  assert.equal(noticias.publica(noticiaBuena()).autoria, 'ia-revisada');
});

test('sin CRON_SECRET configurado no se autoriza a nadie', () => {
  const antes = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal(autorizado({ headers: { authorization: 'Bearer loquesea' } }), false);
  if (antes !== undefined) process.env.CRON_SECRET = antes;
});

test('con CRON_SECRET, solo pasa el encabezado exacto', () => {
  const antes = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'secreto-de-prueba';
  assert.equal(autorizado({ headers: {} }), false);
  assert.equal(autorizado({ headers: { authorization: 'Bearer otro-secreto12' } }), false);
  assert.equal(autorizado({ headers: { authorization: 'secreto-de-prueba' } }), false);
  assert.equal(autorizado({ headers: { authorization: 'Bearer secreto-de-prueba' } }), true);
  if (antes === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = antes;
});
