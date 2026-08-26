// Pruebas de la dirección del CV. Lo que se protege aquí es una promesa:
// sin `CV_SLUG` el build sale igual y no filtra nada, y con un `CV_SLUG` mal
// escrito el build se cae en vez de publicar la vista previa creyendo que es
// privada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugCv, esVistaPrevia, RESPALDO } from './slug.mjs';

test('sin variable, vista previa', () => {
  assert.equal(slugCv(undefined), RESPALDO);
  assert.equal(slugCv(null), RESPALDO);
  assert.equal(slugCv(''), RESPALDO);
  assert.equal(slugCv('   '), RESPALDO);
  assert.equal(RESPALDO, 'vista-previa');
  assert.ok(esVistaPrevia(slugCv('')));
});

test('un slug normal se respeta TAL CUAL, quitándole el espacio de alrededor', () => {
  assert.equal(slugCv('abc123'), 'abc123');
  assert.equal(slugCv('  mesa-de-operaciones-9  '), 'mesa-de-operaciones-9');
  assert.equal(slugCv('mesa-de-operaciones-9\n'), 'mesa-de-operaciones-9');
  assert.equal(slugCv('a-b-c'), 'a-b-c');
  assert.equal(slugCv('x'.repeat(64)), 'x'.repeat(64));
  assert.ok(!esVistaPrevia(slugCv('abc123')));
});

test('las mayúsculas se RECHAZAN, no se convierten', () => {
  // Esto llegó a pasar: con toLowerCase() el build emitía dist/cv/abc-123-xyz
  // sin decir nada, y el campo de /about mandaba a /cv/ABC-123-XYZ, que en un
  // CDN que distingue mayúsculas es un 404. Un código repartido que no abre
  // nada es peor que un build rojo, porque no avisa.
  for (const malo of ['ABC-123-XYZ', 'Mesa-De-Operaciones-9', 'mesaX', 'MESA']) {
    assert.throws(() => slugCv(malo), /CV_SLUG/, 'debería rechazar: ' + malo);
  }
  // Y la salida NUNCA cambia de caja: lo que entra bien, sale igual.
  assert.equal(slugCv('mesa-de-operaciones-9'), 'mesa-de-operaciones-9');
});

test('lo que no puede ser un segmento de URL tumba el build', () => {
  for (const malo of [
    'con/barra', 'con espacio', 'acentuado-ñ', 'con.punto', 'con_guion_bajo',
    '-empieza-con-guion', 'termina-con-guion-', 'ab', 'x'.repeat(65), '..', '%2e%2e'
  ]) {
    assert.throws(() => slugCv(malo), /CV_SLUG/, 'debería rechazar: ' + malo);
  }
});

test('el mensaje de error no repite el valor', () => {
  // Un error de build se queda escrito en los registros de Vercel: el slug no
  // puede acabar ahí ni siquiera cuando está mal escrito.
  const secreto = 'este/es/el/secreto';
  try {
    slugCv(secreto);
    assert.fail('debería haber lanzado');
  } catch (e) {
    assert.ok(!e.message.includes('secreto'), 'el mensaje no puede llevar el valor');
    assert.ok(!e.message.includes(secreto));
  }
});
