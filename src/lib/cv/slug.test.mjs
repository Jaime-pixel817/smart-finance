// Pruebas de la dirección del CV. Lo que se protege aquí es una promesa que
// fallaba EN VERDE, que es la peor clase de fallo: sin `CV_SLUG`, un build de
// Vercel publicaba /cv/vista-previa —byte a byte la misma página que la
// privada— en una dirección escrita en texto plano en este repositorio
// público, con el build en éxito y sin un solo aviso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugCv, esVistaPrevia, decidirCv, rutasCv, enVercel, RESPALDO } from './slug.mjs';

const BUENO = 'mesa-de-operaciones-9';
const rutas = (env) => rutasCv(env, { avisar: false });

// ───────────────────────────────────────────────────────────────────────────
// Los tres escenarios del build
// ───────────────────────────────────────────────────────────────────────────

test('con CV_SLUG se emite UNA ruta, la de verdad, en cualquier máquina', () => {
  for (const entorno of [
    { CV_SLUG: BUENO },
    { CV_SLUG: BUENO, VERCEL: '1', VERCEL_ENV: 'production' },
    { CV_SLUG: BUENO, VERCEL: '1', VERCEL_ENV: 'preview' },
    { CV_SLUG: '  ' + BUENO + '\n', VERCEL: '1', VERCEL_ENV: 'production' }
  ]) {
    assert.deepEqual(decidirCv(entorno), { slug: BUENO, modo: 'privado' });
    assert.deepEqual(rutas(entorno), [{ params: { codigo: BUENO } }]);
  }
});

test('sin CV_SLUG y FUERA de Vercel: vista previa pública (es la que mide Lighthouse)', () => {
  for (const entorno of [
    {},                                    // npm run build a secas
    { CV_SLUG: '' },                       // CV_SLUG= npm run build
    { CV_SLUG: '   ' },
    { CV_SLUG: undefined },
    { CI: 'true', GITHUB_ACTIONS: 'true' } // el CI de GitHub
  ]) {
    assert.deepEqual(decidirCv(entorno), { slug: RESPALDO, modo: 'vista-previa' });
    assert.deepEqual(rutas(entorno), [{ params: { codigo: 'vista-previa' } }]);
  }
  assert.equal(RESPALDO, 'vista-previa');
  assert.ok(esVistaPrevia(decidirCv({}).slug));
});

test('sin CV_SLUG y EN Vercel: CERO rutas — el CV no se publica, el sitio sí', () => {
  // Este es el arreglo. Producción y preview dan lo mismo a propósito: las
  // variables de Vercel son POR ENTORNO, así que con CV_SLUG puesta solo en
  // Production cada preview habría publicado /cv/vista-previa en su
  // *.vercel.app.
  for (const entorno of [
    { VERCEL: '1' },
    { VERCEL: '1', VERCEL_ENV: 'production' },
    { VERCEL: '1', VERCEL_ENV: 'preview' },
    { VERCEL: '1', VERCEL_ENV: 'development' },
    { VERCEL_ENV: 'production' },          // basta con una de las dos
    { VERCEL: '1', CV_SLUG: '' },
    { VERCEL: '1', CV_SLUG: '   \n' }
  ]) {
    assert.deepEqual(decidirCv(entorno), { slug: null, modo: 'ninguna' });
    assert.deepEqual(rutas(entorno), [], 'no puede emitirse ninguna página de CV');
  }
});

test('enVercel no confunde el CI de GitHub ni una máquina cualquiera con Vercel', () => {
  assert.ok(enVercel({ VERCEL: '1' }));
  assert.ok(enVercel({ VERCEL: true }));
  assert.ok(enVercel({ VERCEL_ENV: 'preview' }));
  assert.ok(!enVercel({}));
  assert.ok(!enVercel({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_OS: 'Linux' }));
  assert.ok(!enVercel({ VERCEL: '' }));
  assert.ok(!enVercel({ VERCEL: '0' }));
  assert.ok(!enVercel({ VERCEL: 'false' }));
  assert.ok(!enVercel({ VERCEL_ENV: '' }));
});

test('slugCv NO devuelve nunca el nombre público, ni con la entrada vacía', () => {
  // Antes `slugCv('')` valía 'vista-previa'. Esa línea ERA el fallo en verde:
  // cualquiera que llamara a la función sin variable se llevaba el nombre
  // público sin enterarse. Quien decide el respaldo es decidirCv(), que además
  // mira si el build es de Vercel.
  for (const vacio of [undefined, null, '', '   ', '\n', 0, {}]) {
    assert.throws(() => slugCv(vacio), /CV_SLUG/, 'debería lanzar con: ' + JSON.stringify(vacio));
  }
});

// ───────────────────────────────────────────────────────────────────────────
// Forma del valor
// ───────────────────────────────────────────────────────────────────────────

test('un slug normal se respeta TAL CUAL, quitándole el espacio de alrededor', () => {
  assert.equal(slugCv('abc123'), 'abc123');
  assert.equal(slugCv('  mesa-de-operaciones-9  '), 'mesa-de-operaciones-9');
  assert.equal(slugCv('mesa-de-operaciones-9\n'), 'mesa-de-operaciones-9');
  assert.equal(slugCv('a-b-c'), 'a-b-c');
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
