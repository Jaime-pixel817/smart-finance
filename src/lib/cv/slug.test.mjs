// Pruebas de la dirección del CV. Lo que se protege aquí son dos promesas, y
// las dos fallaban EN VERDE, que es la peor clase de fallo:
//
//   1. Sin `CV_SLUG`, un build de Vercel NO puede publicar el CV. Antes
//      publicaba /cv/vista-previa —byte a byte la misma página que la privada—
//      en una dirección escrita en texto plano en este repositorio público, con
//      el build en éxito y sin un solo aviso.
//   2. El código tiene que ser inadivinable. Antes 'abc', 'jaime', 'mi-cv' y
//      'hola' construían en silencio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugCv, esVistaPrevia, decidirCv, rutasCv, enVercel,
  RESPALDO, MINIMO, MAXIMO, DISTINTOS_MINIMO
} from './slug.mjs';

// Un slug de los que saca `npm run cv:codigo`: 20 caracteres sorteados.
const BUENO = 'k7q2mx9v4blz8ndr3wct';
const rutas = (env) => rutasCv(env, { avisar: false });

// ───────────────────────────────────────────────────────────────────────────
// SERIO 1 — los tres escenarios del build
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
    {},                                  // npm run build a secas
    { CV_SLUG: '' },                     // CV_SLUG= npm run build
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
// SERIO 2 — el código tiene que ser inadivinable
// ───────────────────────────────────────────────────────────────────────────

test('los cuatro slugs que construían en silencio ahora tumban el build', () => {
  // Comprobados por el revisor: CV_SLUG=abc, =jaime, =mi-cv y =hola salían en
  // verde. 'jaime' se adivina al primer intento.
  for (const malo of ['abc', 'jaime', 'mi-cv', 'hola']) {
    assert.throws(() => slugCv(malo), /CV_SLUG/, 'debería rechazar: ' + malo);
  }
});

test('el mínimo de longitud son ' + MINIMO + ' caracteres, y el máximo ' + MAXIMO, () => {
  assert.equal(MINIMO, 20);
  assert.equal(MAXIMO, 64);
  // Uno de 19 sorteados no pasa; el mismo con un carácter más, sí.
  assert.throws(() => slugCv('k7q2mx9v4blz8ndr3wc'), /entre 20 y 64/);
  assert.equal(slugCv('k7q2mx9v4blz8ndr3wct'), 'k7q2mx9v4blz8ndr3wct');
  // El máximo: 64 pasa, 65 no.
  const largo = 'k7q2mx9v4blz8ndr3wct';
  const de64 = (largo + '-').repeat(4).slice(0, 64).replace(/-$/, 'z');
  assert.equal(de64.length, 64);
  assert.equal(slugCv(de64), de64);
  assert.throws(() => slugCv(de64 + 'a'), /entre 20 y 64/);
});

test('el mensaje del mínimo explica POR QUÉ, no solo que es corto', () => {
  // Una regla sin su motivo se salta; una con la cuenta delante, no.
  try {
    slugCv('mi-cv-privado-2026');
    assert.fail('debería haber lanzado');
  } catch (e) {
    assert.match(e.message, /adivinar|espacio de nombres/);
    assert.match(e.message, /cv:codigo/, 'tiene que decir cómo sacar uno bueno');
  }
});

test('el largo no se rellena repitiendo: hacen falta ' + DISTINTOS_MINIMO + ' caracteres distintos', () => {
  assert.equal(DISTINTOS_MINIMO, 8);
  for (const malo of [
    'x'.repeat(20),          // 1 distinto, y antes pasaba: la prueba vieja lo daba por bueno
    'x'.repeat(64),
    'ababababababababababab',
    'aaaa-bbbb-cccc-dddd-eeee'
  ]) {
    assert.throws(() => slugCv(malo), /distintos/, 'debería rechazar: ' + malo);
  }
  // Un slug sorteado tiene 15.5 distintos de media; ocho no estorba a nadie.
  assert.equal(new Set(BUENO).size >= DISTINTOS_MINIMO, true);
});

test('lo evidentemente adivinable no se salva por medir 20', () => {
  // Esto es lo que escribe quien tiene que inventarse veinte caracteres.
  for (const malo of [
    'jaime-sandoval-ricano',
    'jaime-sandoval-curriculum-2026',
    'curriculum-vitae-de-jaime',
    'smartfinance-curriculum-jaime',
    'mi-curriculum-para-toronto',
    'el-portafolio-de-jaime-2026',
    'esto-es-secreto-de-verdad-ya',
    'la-mesa-de-jaime-sandoval',
    'codigo-privado-para-uoft-2027',
    'universidad-de-toronto-solicitud'
  ]) {
    assert.throws(() => slugCv(malo), /CV_SLUG/, 'debería rechazar: ' + malo);
  }
});

test('la lista de palabras no rechaza slugs sorteados de verdad', () => {
  // Si la regla tuviera falsos positivos a menudo, se acabaría quitando. Se
  // comprueba con slugs generados como los del comando, no con inventados.
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let semilla = 20260826;
  const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 2000; i++) {
    let s = '';
    for (let j = 0; j < MINIMO; j++) s += alfabeto[Math.floor(azar() * 36)];
    assert.equal(slugCv(s), s, 'un slug sorteado no puede rechazarse: ' + s);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// Forma, nombres reservados y lo que no puede acabar en un registro
// ───────────────────────────────────────────────────────────────────────────

test('las mayúsculas se RECHAZAN, no se convierten', () => {
  // Esto llegó a pasar: con toLowerCase() el build emitía dist/cv/abc-123-xyz
  // sin decir nada, y el campo de /about mandaba a /cv/ABC-123-XYZ, que en un
  // CDN que distingue mayúsculas es un 404. Un código repartido que no abre
  // nada es peor que un build rojo, porque no avisa.
  for (const malo of ['K7Q2MX9V4BLZ8NDR3WCT', 'k7q2Mx9v4blz8ndr3wct', 'MESA']) {
    assert.throws(() => slugCv(malo), /MAY[ÚU]SCULAS/, 'debería rechazar: ' + malo);
  }
  // Y la salida NUNCA cambia de caja: lo que entra bien, sale igual.
  assert.equal(slugCv(BUENO), BUENO);
});

test('lo que no puede ser un segmento de URL tumba el build', () => {
  for (const malo of [
    'k7q2mx9v4blz/8ndr3wct', 'k7q2mx9v4 blz8ndr3wct', 'k7q2mx9v4blz8ndr3wcñ',
    'k7q2mx9v4blz.8ndr3wct', 'k7q2mx9v4blz_8ndr3wct', '-7q2mx9v4blz8ndr3wct',
    'k7q2mx9v4blz8ndr3wc-', '..', '%2e%2e', 'k7q2mx9v4blz8ndr3wct/../secreto'
  ]) {
    assert.throws(() => slugCv(malo), /CV_SLUG/, 'debería rechazar: ' + malo);
  }
});

test('CV_SLUG=index se rechaza a la cara, no por accidente del enrutador', () => {
  // Antes tumbaba el build con "TypeError: Missing parameter: codigo", que no
  // menciona CV_SLUG y que solo avisa porque dist/cv/index.html resulta ser la
  // ruta /cv/. El largo mínimo ya lo rechazaría; lo que se prueba aquí es que
  // el MENSAJE es el bueno, o sea que el reservado se mira antes que el largo.
  try {
    slugCv('index');
    assert.fail('debería haber lanzado');
  } catch (e) {
    assert.match(e.message, /CV_SLUG/);
    assert.match(e.message, /reservado/);
    assert.match(e.message, /enrutador/);
    assert.doesNotMatch(e.message, /entre 20 y 64/, 'el mensaje del largo taparía el de verdad');
  }
});

test('CV_SLUG=vista-previa se rechaza: es el nombre PÚBLICO', () => {
  // Ponerlo a mano construye exactamente la página que mide Lighthouse y que
  // puede abrir cualquiera, creyendo haber configurado una privada.
  try {
    slugCv(RESPALDO);
    assert.fail('debería haber lanzado');
  } catch (e) {
    assert.match(e.message, /reservado/);
    assert.match(e.message, /p[úu]blica/i);
  }
  // Pero el respaldo SÍ se emite cuando lo decide decidirCv() fuera de Vercel.
  assert.deepEqual(rutas({}), [{ params: { codigo: RESPALDO } }]);
});

test('ningún mensaje de error repite el valor', () => {
  // Un error de build se queda escrito en los registros de Vercel: el slug no
  // puede acabar ahí ni siquiera cuando está mal escrito. Se prueba con un
  // valor de cada rama del `throw`.
  const malos = [
    'este/es/el/secreto',        // forma
    'K7Q2MX9V4BLZ8NDR3WCT',      // mayúsculas
    'corto',                     // longitud
    'q'.repeat(20),              // repetición
    'jaime-sandoval-ricano',     // palabra adivinable
    ''                           // vacío
  ];
  for (const malo of malos) {
    try {
      slugCv(malo);
      assert.fail('debería haber lanzado con: ' + malo);
    } catch (e) {
      assert.ok(!e.message.includes(malo) || malo === '',
        'el mensaje no puede llevar el valor: ' + malo);
    }
  }
});

test('los dos nombres reservados SÍ salen en su mensaje, y da igual', () => {
  // Es la única excepción a la regla de arriba, y no es un descuido:
  // 'vista-previa' e 'index' son dos constantes escritas en este repositorio
  // público, y el mensaje no sirve de nada si no puede decir cuál de las dos
  // es. Ningún valor que llegue a esa rama puede ser un secreto: solo llegan
  // esos dos.
  assert.throws(() => slugCv(RESPALDO), /VISTA PREVIA/);
  assert.throws(() => slugCv('index'), /dist\/cv\/index\.html/);
});
