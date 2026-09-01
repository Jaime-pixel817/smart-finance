// Las cartas de recomendación: que NINGÚN PDF firmado se sirva desde el sitio,
// y que los dos paneles digan lo mismo sobre ello.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÉ ESTA PRUEBA CAMBIÓ DE SENTIDO EL 2026-09-01
// ═══════════════════════════════════════════════════════════════════════════
// Hasta hoy comprobaba lo contrario: que los dos PDF EXISTIERAN en
// public/assets/cv/ y que el peso escrito («PDF · 366 KB») fuera el real. Eso
// venía de la instrucción de Jaime del 2026-08-31 («sube en cada carta de
// recomendación el archivo de la carta»), que él dio asumiendo un alcance
// escrito: «quien tenga el enlace del CV ve el teléfono de Lloyd George».
//
// ESE ALCANCE NO SE PODÍA CONSTRUIR, y por eso el archivo salió:
//  · Los PDF se servían en `/assets/cv/carta-*.pdf`. Esa ruta es FIJA y no
//    pasa por `CV_SLUG`: el `noindex`/`no-referrer` del `<head>` protege la
//    PÁGINA, no un archivo estático que se pide directo.
//  · `public/` se commitea y este repositorio es PÚBLICO, así que los dos
//    archivos se bajaban con una petición anónima a raw.githubusercontent.com
//    (comprobado: 200 y 374 826 bytes).
//  · El sitio es estático y Vercel sirve el repo. NO HAY forma de que esta
//    página entregue un archivo solo a quien reciba la dirección.
// Y lo expuesto son datos de TERCEROS: las dos cartas van dirigidas «To the
// Admissions Committee» y llevan el móvil personal de un firmante, los correos
// de los dos y la dirección registrada de una empresa.
//
// LO QUE COMPRUEBA AHORA, y por qué cada cosa:
//  1. Que no hay NINGÚN PDF en public/assets/cv/. Es la comprobación que
//     importa: el fallo no fue una decisión, fue que un archivo cayó en una
//     carpeta que se publica entera y nadie lo volvió a mirar. Copiar un PDF
//     ahí vuelve a exponerlo sin que nada avise — salvo esto.
//  2. Que cv.ts no vuelve a nombrar un `pdf:` ni un `pdfKb:` en las fichas, o
//     sea que el enlace no vuelve por la puerta de atrás.
//  3. Que los DOS paneles traen su `pdfNo`. La regla del CV es paridad exacta
//     EN/ES: un panel que explique por qué no está el archivo y otro que se lo
//     calle son dos documentos distintos.
//  4. Que los originales siguen enteros en la carpeta de Jaime, fuera del
//     repo, para que retirarlos de la web no sea perderlos. No está en CI, así
//     que ahí se salta con un aviso en vez de fallar: lo que no se puede
//     comprobar no se da por bueno ni por malo, se dice.
//
// SI JAIME DECIDE VOLVER A PUBLICARLOS (repo privado, o alojarlos detrás de
// algo que sí autentique), esta prueba hay que reescribirla A PROPÓSITO, con
// el alcance nuevo delante. Que cueste un cambio deliberado es la idea.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SERVIDO = join(raiz, 'public', 'assets', 'cv');
// La carpeta de trabajo de Jaime, fuera del repo. Puede no estar.
const ORIGINAL = join(raiz, '..', 'cv-material', 'cartas');
const CV_TS = join(raiz, 'src', 'i18n', 'cv.ts');

/** El cuerpo del bloque `cartas:` de un panel de cv.ts. */
function bloqueCartas(panel) {
  const fuente = readFileSync(CV_TS, 'utf8');
  const trozos = fuente.split(/^  cartas: \{$/m);
  assert.equal(trozos.length, 3, 'cv.ts tiene que traer exactamente dos bloques `cartas:`');
  return trozos[panel === 'en' ? 1 : 2];
}

test('no se sirve ningún PDF desde public/assets/cv/', () => {
  const pdfs = readdirSync(SERVIDO).filter((f) => f.toLowerCase().endsWith('.pdf'));
  assert.deepEqual(
    pdfs, [],
    'hay PDF en public/assets/cv/. Esa carpeta se publica ENTERA en una ruta fija que no pasa por CV_SLUG, ' +
    'y este repositorio es público: un PDF ahí es un documento firmado descargable por cualquiera. ' +
    'Las cartas llevan el móvil personal de un firmante y van dirigidas a un comité de admisiones.\n' +
    'Encontrados: ' + pdfs.join(', ')
  );
});

test('las fichas de las cartas no vuelven a nombrar un archivo ni un peso', () => {
  for (const panel of ['en', 'es']) {
    const cuerpo = bloqueCartas(panel);
    assert.equal(/\n\s*pdf: '/.test(cuerpo), false,
      `el panel ${panel} vuelve a nombrar un archivo de carta (\`pdf:\`). Si es a propósito, hay que reescribir esta prueba con el alcance nuevo.`);
    assert.equal(/\n\s*pdfKb: /.test(cuerpo), false,
      `el panel ${panel} vuelve a publicar un peso de archivo (\`pdfKb:\`), que solo tiene sentido si el archivo se sirve.`);
  }
});

test('los dos paneles explican por qué no está el archivo', () => {
  for (const panel of ['en', 'es']) {
    const cuerpo = bloqueCartas(panel);
    assert.ok(/\n\s*pdfNo: '/.test(cuerpo),
      `el panel ${panel} no trae \`pdfNo\`: una ficha que enseña el rótulo «la carta, tal cual» y no dice nada debajo se lee como un enlace roto.`);
  }
});

test('los originales siguen enteros fuera del repo (si su carpeta está)', () => {
  if (!existsSync(ORIGINAL)) {
    console.log('  (cv-material/cartas/ no está aquí — no se comprueba; en CI es lo normal)');
    return;
  }
  const pdfs = readdirSync(ORIGINAL).filter((f) => f.toLowerCase().endsWith('.pdf'));
  assert.equal(
    pdfs.length, 2,
    'en cv-material/cartas/ tienen que seguir los dos PDF originales: retirarlos de la web no puede ser perderlos. ' +
    'Encontrados: ' + (pdfs.join(', ') || 'ninguno')
  );
});
