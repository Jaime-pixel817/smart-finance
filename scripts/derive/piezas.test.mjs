import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontmatterMdx, textoPlano, secciones, frases, leerPieza, pendientesDe } from './piezas.mjs';

test('frontmatterMdx lee lo que usan los MDX de lecciones', () => {
  const mdx = [
    '---',
    'title: "Interés simple vs. interés compuesto"',
    'order: 2',
    'heroStat: { value: "30,000 vs 67,000", label: "10,000 pesos al 10% durante 20 años" }',
    'related: [errores-al-invertir, tarjeta-de-credito]',
    'sources:',
    '  - { title: "Uno", url: "https://a.example/x", publisher: "CFA Institute", date: "2026-08-21" }',
    '  - { title: "Dos, con coma", url: "https://b.example/y", publisher: "Banxico", date: "2026-08-21" }',
    '---',
    '',
    '## Sección',
    '',
    'Cuerpo.'
  ].join('\n');
  const { datos, cuerpo } = frontmatterMdx(mdx);
  assert.equal(datos.title, 'Interés simple vs. interés compuesto');
  assert.equal(datos.order, 2);
  assert.equal(datos.heroStat.value, '30,000 vs 67,000');
  assert.deepEqual(datos.related, ['errores-al-invertir', 'tarjeta-de-credito']);
  assert.equal(datos.sources.length, 2);
  assert.equal(datos.sources[1].title, 'Dos, con coma', 'una coma dentro de comillas no parte el mapa');
  assert.equal(datos.sources[0].publisher, 'CFA Institute');
  assert.match(cuerpo, /## Sección/);
});

test('textoPlano deja la prosa y se lleva la maquinaria de MDX', () => {
  const mdx = 'Divide <Term id="regla-del-72">72 entre tu tasa</Term> y ya.\n\n<CompoundCalculator />\n\n<Callout>\nUn **aviso** con [enlace](https://x.example/2026).\n</Callout>';
  const plano = textoPlano(mdx);
  assert.match(plano, /Divide 72 entre tu tasa y ya\./);
  assert.match(plano, /Un aviso con enlace\./);
  assert.doesNotMatch(plano, /Term|Callout|CompoundCalculator|https/);
  // El id del tag llevaba un 72 que NO es una cifra publicada: se fue con el tag.
  assert.equal((plano.match(/72/g) || []).length, 1);
});

test('secciones y frases parten el cuerpo por ## y por punto', () => {
  const secs = secciones('## Una\n\nFrase uno. Frase dos.\n\n## Otra\n\nFrase tres.');
  assert.deepEqual(secs.map((s) => s.titulo), ['Una', 'Otra']);
  assert.deepEqual(frases(secs[0].parrafos[0]), ['Frase uno.', 'Frase dos.']);
});

test('una lección real del repo se lee entera y en los dos idiomas', () => {
  const p = leerPieza('leccion', 'interes-compuesto');
  assert.equal(p.tipo, 'leccion');
  assert.ok(p.es.titulo && p.en.titulo);
  assert.equal(p.es.url, 'https://smartfinance.lat/es/lecciones/interes-compuesto');
  assert.equal(p.en.url, 'https://smartfinance.lat/lessons/interes-compuesto');
  assert.equal(p.es.archivo, 'src/content/lessons/es/interes-compuesto.mdx');
  assert.ok(p.fuentes.length >= 2, 'el schema de lecciones exige dos fuentes');
  assert.match(p.fechaDatos, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(p.es.hechos.length, 'tiene frases con cifra');
  assert.ok(p.es.hechos.every((h) => typeof h.seccion === 'number'), 'cada hecho sabe de qué sección salió');
  assert.ok(p.cifraDestacada && p.cifraDestacada.valor);
  assert.deepEqual(pendientesDe(p), [], 'una lección publicada no deja pendientes de datos');
});

test('un tipo o un slug que no existen fallan diciendo qué falta', () => {
  assert.throws(() => leerPieza('podcast', 'x'), /tipo desconocido/);
  assert.throws(() => leerPieza('leccion', 'no-existe'), /no existe la lección/);
  assert.throws(() => leerPieza('noticia', 'no-existe'), /npm run news:sync/);
});
