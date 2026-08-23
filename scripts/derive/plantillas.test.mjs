import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerPieza } from './piezas.mjs';
import { linkedin, tiktok, carrusel, boletin, checklist, fechaLarga } from './plantillas.mjs';
import { permisoDe, revisarTexto, revisarJson } from './cifras.mjs';

const pieza = leerPieza('leccion', 'interes-compuesto');
const permiso = permisoDe(pieza.textoFuente);
const todos = [linkedin(pieza, 'es'), linkedin(pieza, 'en'), ...tiktok(pieza, 'es'), boletin(pieza, 'es'), checklist(pieza, 'es')];

test('fechaLarga escribe la fecha en cada idioma sin depender de Intl', () => {
  assert.equal(fechaLarga('2026-08-21', 'es'), '21 de agosto de 2026');
  assert.equal(fechaLarga('2026-08-21', 'en'), '21 August 2026');
  assert.equal(fechaLarga('', 'es'), '');
});

test('TODOS los borradores de una lección real pasan la guardia de cifras', () => {
  for (const t of todos) {
    assert.deepEqual(revisarTexto(t.texto, permiso, t.ruta), [], t.ruta + ' trae una cifra que no está en la lección');
  }
  assert.deepEqual(revisarJson(carrusel(pieza, 'es').json, permiso, 'carousel.json'), []);
});

test('se generan las piezas que pide la skill: LinkedIn EN/ES, cinco TikTok, carrusel y boletín', () => {
  assert.deepEqual(todos.map((t) => t.ruta), [
    'linkedin.es.md', 'linkedin.en.md',
    'tiktok/01.md', 'tiktok/02.md', 'tiktok/03.md', 'tiktok/04.md', 'tiktok/05.md',
    'newsletter.md', 'checklist.md'
  ]);
  const c = carrusel(pieza, 'es').json;
  assert.ok(c.laminas.length >= 8 && c.laminas.length <= 10, 'el carrusel va de 8 a 10 láminas');
  assert.equal(c.laminas[0].tipo, 'portada');
  assert.equal(c.laminas.at(-1).tipo, 'cierre');
  assert.deepEqual(c.lienzo, { ancho: 1080, alto: 1350 });
  // Cada lámina con cifra lleva su rótulo de fuente pegado.
  for (const l of c.laminas.filter((x) => x.tipo === 'dato')) assert.ok(l.fuente, 'lámina de dato sin fuente');
});

test('los cinco guiones cuentan cosas distintas', () => {
  const guiones = tiktok(pieza, 'es');
  const ganchos = guiones.map((g) => /- Jaime dice: «(.*)»/.exec(g.texto)[1]);
  assert.equal(new Set(ganchos).size, 5, 'dos guiones arrancan con la misma frase');
  assert.equal(new Set(guiones.map((g) => g.angulo)).size, 5);
});

test('cada borrador dice de dónde sale y que es un borrador', () => {
  for (const t of todos) {
    assert.match(t.texto, /^---\n/, t.ruta + ' sin frontmatter');
    assert.match(t.texto, /estado: borrador/, t.ruta + ' no se declara borrador');
    assert.match(t.texto, /pieza: leccion · interes-compuesto/, t.ruta + ' no dice de qué pieza sale');
  }
  assert.match(linkedin(pieza, 'es').texto, /origen: src\/content\/lessons\/es\//);
  assert.match(linkedin(pieza, 'en').texto, /origen: src\/content\/lessons\/en\//);
});

test('el post de LinkedIn cabe en el límite de la plataforma', () => {
  assert.ok(linkedin(pieza, 'es').caracteres <= 1300, 'el post en español se pasa de 1300 caracteres');
  assert.ok(linkedin(pieza, 'en').caracteres <= 1300, 'el post en inglés se pasa de 1300 caracteres');
});

test('cada borrador lleva disclaimer y disclosure de IA', () => {
  const es = linkedin(pieza, 'es').texto;
  assert.match(es, /no es una recomendación/);
  assert.match(es, /Cómo se hizo/);
  const en = linkedin(pieza, 'en').texto;
  assert.match(en, /not a recommendation/);
  assert.match(en, /How it was made/);
});

// La prueba que importa: si una plantilla metiera una cifra que la pieza no
// tiene, la guardia lo dice. Se simula ensuciando la pieza, no la plantilla.
test('si a un borrador se le cuela una cifra ajena, la guardia la caza', () => {
  const falsa = { ...pieza, es: { ...pieza.es, entradilla: 'El interés compuesto rinde 42 % al año.' } };
  const malos = revisarTexto(linkedin(falsa, 'es').texto, permiso, 'linkedin.es.md');
  assert.equal(malos.length, 1);
  assert.equal(malos[0].valor, 42);
  assert.equal(malos[0].tipo, 'cifra');
});
