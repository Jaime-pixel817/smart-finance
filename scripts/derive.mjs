#!/usr/bin/env node
/*
 * npm run derive -- <tipo> <slug>
 *
 * Convierte una pieza REAL del repo en sus borradores de difusión:
 *
 *   content/derivados/<tipo>-<slug>/
 *     linkedin.en.md · linkedin.es.md
 *     tiktok/01.md … 05.md
 *     instagram/carousel.json  (+ laminas/NN.png, 1080×1350)
 *     newsletter.md
 *     checklist.md
 *     cifras.json              ← el recibo de la guardia
 *
 * Tipos: leccion (src/content/lessons), research (content/research) y noticia
 * (src/data/news, solo las ya aprobadas y sincronizadas).
 *
 * LA GUARDIA MANDA
 * ----------------
 * Antes de escribir NADA se comprueba que ninguna cifra de los borradores esté
 * fuera de la pieza de origen (scripts/derive/cifras.mjs). Si sobra una, el
 * comando falla, dice cuál y en qué línea, y no deja archivos a medias. Es la
 * diferencia entre una regla escrita en una skill y una regla que se cumple.
 *
 * ESTO SON BORRADORES. Jaime graba, ajusta el tono y publica. Ningún texto de
 * IA sale del sitio sin que él lo apruebe: es la misma promesa que /news.
 *
 * Banderas:
 *   --dry           genera y revisa, pero no escribe nada
 *   --sin-imagenes  salta los PNG del carrusel
 *   --revisar       NO regenera: pasa la guardia por los archivos que ya están
 *                   en la carpeta. Es lo que hay que correr después de editar
 *                   un borrador a mano, que es justo cuando se cuela un número.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { leerPieza, pendientesDe, RAIZ, TIPOS } from './derive/piezas.mjs';
import { linkedin, tiktok, carrusel, boletin, checklist } from './derive/plantillas.mjs';
import { permisoDe, revisarTexto, revisarJson, informe } from './derive/cifras.mjs';

const LIMITE_LINKEDIN = 1300;   // lo que la skill derive-content pide

const args = process.argv.slice(2);
const banderas = new Set(args.filter((a) => a.startsWith('--')));
const [tipo, slug] = args.filter((a) => !a.startsWith('--'));

if (!tipo || !slug) {
  console.error('uso: npm run derive -- <tipo> <slug>');
  console.error('     tipos: ' + TIPOS.join(' · '));
  console.error('     ejemplo: npm run derive -- leccion interes-compuesto');
  process.exit(2);
}

let pieza;
try {
  pieza = leerPieza(tipo, slug);
} catch (e) {
  console.error('derive: ' + e.message);
  process.exit(1);
}

const salida = path.join(RAIZ, 'content', 'derivados', tipo + '-' + slug);

// ------------------------------------------- --revisar: los archivos que ya están

if (banderas.has('--revisar')) {
  if (!fs.existsSync(salida)) {
    console.error('derive --revisar: no existe ' + path.relative(RAIZ, salida) + '. Corre primero `npm run derive -- ' + tipo + ' ' + slug + '`.');
    process.exit(1);
  }
  const permisoYa = permisoDe(pieza.textoFuente);
  const encontrados = [];
  (function recorrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { recorrer(p); continue; }
      // cifras.json es el recibo de la propia guardia, no un borrador.
      if (e.name === 'cifras.json') continue;
      if (e.name.endsWith('.md') || e.name.endsWith('.json')) encontrados.push(p);
    }
  })(salida);

  const malos = encontrados.flatMap((p) => {
    const rel = path.relative(salida, p);
    const crudo = fs.readFileSync(p, 'utf8');
    return p.endsWith('.json')
      ? revisarJson(JSON.parse(crudo), permisoYa, rel)
      : revisarTexto(crudo, permisoYa, rel);
  });

  if (malos.length) {
    console.error('\nderive --revisar: ' + malos.length + (malos.length === 1 ? ' cifra que NO está' : ' cifras que NO están') +
      ' en la pieza de origen (' + pieza.archivos.join(', ') + '):\n');
    console.error(informe(malos));
    console.error('');
    process.exit(1);
  }
  console.log('derive --revisar: ' + encontrados.length + ' archivos de ' + path.relative(RAIZ, salida) + ', ninguna cifra fuera de la pieza.');
  process.exit(0);
}

// ------------------------------------------------------------- los borradores

const textos = [
  linkedin(pieza, 'es'),
  linkedin(pieza, 'en'),
  ...tiktok(pieza, 'es'),
  boletin(pieza, 'es'),
  checklist(pieza, 'es')
];
const carrusels = carrusel(pieza, 'es');

// ------------------------------------------------------------- la guardia

const permiso = permisoDe(pieza.textoFuente);
const problemas = [
  ...textos.flatMap((t) => revisarTexto(t.texto, permiso, t.ruta)),
  ...revisarJson(carrusels.json, permiso, carrusels.ruta)
];

if (problemas.length) {
  console.error('\nderive: ' + problemas.length + (problemas.length === 1 ? ' cifra que NO está' : ' cifras que NO están') +
    ' en la pieza de origen (' + pieza.archivos.join(', ') + '):\n');
  console.error(informe(problemas));
  console.error('\nNo se escribió nada. O la cifra sale de la pieza, o no sale.');
  process.exit(1);
}

// ------------------------------------------------------------- el recibo

const recibo = {
  pieza: { tipo: pieza.tipo, slug: pieza.slug, archivos: pieza.archivos, fechaDatos: pieza.fechaDatos || null },
  generado: new Date().toISOString().slice(0, 10),
  guardia: {
    regla: 'ninguna cifra de un derivado puede estar fuera de la pieza de origen',
    exenciones: [
      'el frontmatter YAML de los .md generados (metadatos de produccion, no se publican)',
      'la marca de tiempo de un plano de guion con la forma **0-3 s · Titulo**',
      'las URL y los nombres de archivo',
      'los campos numericos de carousel.json (lamina, total, lienzo): son la estructura del archivo'
    ],
    archivosRevisados: [...textos.map((t) => t.ruta), carrusels.ruta],
    estado: 'ok'
  },
  cifrasDeLaPieza: [...permiso.valores].map(Number).sort((a, b) => a - b),
  fechasDeLaPieza: [...permiso.fechas].sort()
};

// ------------------------------------------------------------- escribir

if (banderas.has('--dry')) {
  console.log('derive (--dry): ' + (textos.length + 1) + ' borradores listos y sin cifras inventadas. No se escribió nada.');
  process.exit(0);
}

fs.rmSync(salida, { recursive: true, force: true });
for (const t of textos) escribir(path.join(salida, t.ruta), t.texto);
escribir(path.join(salida, carrusels.ruta), JSON.stringify(carrusels.json, null, 2) + '\n');
escribir(path.join(salida, 'cifras.json'), JSON.stringify(recibo, null, 2) + '\n');

function escribir(destino, contenido) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido);
}

const rel = path.relative(RAIZ, salida);
console.log('\n' + pieza.tipo + ' · ' + pieza.slug + ' → ' + rel);
console.log('  ' + (textos.length + 2) + ' archivos escritos. Guardia de cifras: sin nada que reportar.');

// ------------------------------------------------------------- las imágenes

if (!banderas.has('--sin-imagenes')) {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'derive', 'laminas.mjs'), path.join(salida, carrusels.ruta)], { stdio: 'inherit' });
  if (r.status !== 0) console.warn('  [láminas] no se generaron las imágenes. Los textos del carrusel están en ' + rel + '/instagram/carousel.json.');
}

// ------------------------------------------------------------- qué falta

const largos = textos.filter((t) => t.caracteres && t.caracteres > LIMITE_LINKEDIN);
const pendientes = [
  ...pendientesDe(pieza),
  ...largos.map((t) => t.ruta + ' se pasa del límite de LinkedIn (' + t.caracteres + ' caracteres): hay que recortar un hallazgo'),
  'grabar los cinco TikTok y leer el post de LinkedIn en voz alta antes de publicar',
  'aprobación de Jaime: nada de esto sale solo'
];
console.log('\n  Pendientes:');
for (const p of pendientes) console.log('    - ' + p);
console.log('');
