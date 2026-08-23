import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valoresDe, numerosDe, fechasDe, permisoDe, revisarTexto, revisarJson, informe } from './cifras.mjs';

const valores = (t) => numerosDe(t).map((n) => n.valor);

test('un número escrito → su valor: millares, decimales y números pegados', () => {
  assert.deepEqual(valoresDe('10,000'), [10000]);
  assert.deepEqual(valoresDe('1,234,567'), [1234567]);
  assert.deepEqual(valoresDe('3.5'), [3.5]);
  assert.deepEqual(valoresDe('67,000.25'), [67000.25]);
  assert.deepEqual(valoresDe('10,000.'), [10000]);       // punto final de la frase
  assert.deepEqual(valoresDe('3,5'), [3, 5]);            // no es millar: son dos
});

test('la unidad no entra: 45 % y 45 años son el mismo número', () => {
  assert.deepEqual(valores('subió 45 %'), [45]);
  assert.deepEqual(valores('45 años'), [45]);
  assert.deepEqual(valores('el 50/30/20'), [50, 30, 20]);
});

test('las fechas ISO salen como fechas, no como tres números', () => {
  const t = 'Datos al 2026-08-21, revisado el 2026-07-26.';
  assert.deepEqual(valores(t), []);
  assert.deepEqual(fechasDe(t), ['2026-08-21', '2026-07-26']);
});

test('las URL no cuentan como cifras en ninguno de los dos lados', () => {
  assert.deepEqual(valores('Lección: https://smartfinance.lat/lessons/presupuesto-50-30-20'), []);
  assert.deepEqual(valores('ver [la regla](https://www.investopedia.com/terms/r/ruleof72.asp)'), []);
  assert.deepEqual(valores('/es/lecciones/presupuesto-50-30-20 explica la regla'), []);
});

test('las horas tampoco', () => {
  assert.deepEqual(valores('el boletín sale a las 14:00'), []);
});

test('una ruta del sitio no es una cifra, pero 50/30/20 sí son tres', () => {
  assert.deepEqual(valores('ensayo: `/api/send-newsletter?dry=1`'), []);
  assert.deepEqual(valores('la ficha vive en /market/spy'), []);
  assert.deepEqual(valores('la regla 50/30/20'), [50, 30, 20]);
  assert.deepEqual(valores('opera 24/7'), [24, 7]);
});

test('un nombre de archivo no es una cifra', () => {
  assert.deepEqual(valores('la lámina está en laminas/01.png'), []);
  assert.deepEqual(valores('sale de src/content/lessons/es/presupuesto-50-30-20.mdx'), []);
});

test('el permiso de una pieza incluye las partes de sus fechas', () => {
  const p = permisoDe('publishedAt: 2026-07-26\nMete 10,000 pesos al 10%.');
  assert.ok(p.valores.has('10000'));
  assert.ok(p.valores.has('10'));
  assert.ok(p.valores.has('2026'), 'el año de una fecha de la pieza vale como número');
  assert.ok(p.valores.has('26'), 'el día también');
  assert.ok(p.fechas.has('2026-07-26'));
});

test('un derivado limpio no da problemas', () => {
  const p = permisoDe('Mete 10,000 pesos al 10% durante 20 años: 30,000 contra 67,000.');
  assert.deepEqual(revisarTexto('10,000 pesos al 10 % durante 20 años dejan 67,000.', p, 'linkedin.es.md'), []);
});

test('una cifra inventada falla y dice cuál, dónde y en qué línea', () => {
  const p = permisoDe('Mete 10,000 pesos al 10% durante 20 años.');
  const malos = revisarTexto('Primera línea.\n10,000 pesos al 12 % durante 20 años.', p, 'linkedin.es.md');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].crudo, '12');
  assert.equal(malos[0].valor, 12);
  assert.equal(malos[0].linea, 2);
  assert.equal(malos[0].archivo, 'linkedin.es.md');
  assert.match(informe(malos), /linkedin\.es\.md:2 — la cifra 12 no está en la pieza/);
});

test('una fecha que la pieza no trae también falla', () => {
  const p = permisoDe('Datos al 2026-08-21.');
  const malos = revisarTexto('Datos al 2026-08-22.', p, 'newsletter.md');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].tipo, 'fecha');
  assert.match(informe(malos), /la fecha 2026-08-22 no está en la pieza/);
});

// ---- las dos exenciones, y solo esas dos ----

test('exención 1: el frontmatter de un .md generado no se revisa (no se publica)', () => {
  const p = permisoDe('Sin cifras aquí.');
  const md = '---\nplataforma: TikTok\nduracion: "45–60 s"\n---\n\nCuerpo sin cifras.\n';
  assert.deepEqual(revisarTexto(md, p, 'tiktok/01.md'), []);
  // Y con conFrontmatter, que es como se lee la PIEZA, sí se ve todo.
  assert.equal(revisarTexto(md, p, 'x', { conFrontmatter: true }).length, 2);
});

test('exención 2: la marca de tiempo de un plano, con su forma exacta', () => {
  const p = permisoDe('Sin cifras aquí.');
  assert.deepEqual(revisarTexto('**0–3 s · Gancho**\nTexto en pantalla.', p, 'tiktok/01.md'), []);
  // Un número suelto en el mismo sitio NO es una marca de plano y sí se revisa.
  const malos = revisarTexto('**3 empresas · Gancho**', p, 'tiktok/01.md');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].valor, 3);
});

test('el cuerpo de un plano sí se revisa aunque la línea empiece con la marca', () => {
  const p = permisoDe('Sin cifras aquí.');
  const malos = revisarTexto('**0–3 s · Gancho**: el 45 % de la gente.', p, 'tiktok/01.md');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].valor, 45);
});

test('en el carrusel solo se revisan los textos; los índices del archivo no', () => {
  const p = permisoDe('Mete 10,000 pesos.');
  const bueno = { total: 8, laminas: [{ lamina: 1, titulo: '10,000 pesos', texto: 'Sin más cifras.' }] };
  assert.deepEqual(revisarJson(bueno, p, 'carousel.json'), []);
  const malo = { total: 8, laminas: [{ lamina: 1, titulo: '12,000 pesos' }] };
  const malos = revisarJson(malo, p, 'carousel.json');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].valor, 12000);
  assert.match(malos[0].archivo, /carousel\.json → laminas\[0\]\.titulo/);
});
