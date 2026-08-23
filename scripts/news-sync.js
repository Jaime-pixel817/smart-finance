// Baja las noticias APROBADAS a src/data/news/*.json, que es de donde el build
// genera /news/<slug> y /es/noticias/<slug>.
//
// POR QUÉ HAY DOS SITIOS DONDE VIVE UNA NOTICIA
// --------------------------------------------
// Redis es el estado vivo: aprobar allí se ve en /news en un minuto, sin
// desplegar. Pero el sitio es estático y una URL propia por noticia —con su
// HTML, su og:image y su JSON-LD— solo puede salir del build. Este script es
// el puente: se corre cuando te acuerdes, mete las aprobadas en el repositorio
// y a partir del siguiente despliegue cada una tiene su página de verdad.
//
// Entre aprobar y correr esto, /news/<slug> lo sirve la página de lectura
// (src/pages/news-read.astro, ver la reescritura de vercel.json): la noticia
// se lee igual, solo que pintada en el navegador. Nunca hay un enlace roto.
//
// Todo lo de noticias vive en /api/news (el plan de Vercel admite 12 funciones
// y el sitio ya estaba en 12); la cola de revisión es ?accion=revision.
//
// CÓMO SE USA
//   export CRON_SECRET=...        # el mismo del boletín (.env.local)
//   npm run news:sync             # contra smartfinance.lat
//   npm run news:sync -- --base=http://localhost:4321
//   npm run news:sync -- --limpiar   # además borra las que ya no están aprobadas
// Después: git add src/data/news && git commit && git push.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'src', 'data', 'news');
const { validar } = require(path.join(RAIZ, 'api', '_lib', 'noticias.js'));

// ---- Argumentos y secreto -------------------------------------------------

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const a = args.find((x) => x.startsWith('--' + nombre + '='));
  return a ? a.slice(nombre.length + 3) : porDefecto;
};
const BASE = String(opcion('base', 'https://smartfinance.lat')).replace(/\/$/, '');
const LIMPIAR = args.includes('--limpiar');

function secreto() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  // Comodidad: si está en .env.local no hay que exportarlo a mano cada vez.
  try {
    const env = fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8');
    const m = env.match(/^\s*CRON_SECRET\s*=\s*"?([^"\n\r]+)"?\s*$/m);
    if (m) return m[1].trim();
  } catch (e) { /* no hay .env.local: se avisa abajo */ }
  return null;
}

// ---- Lo que se guarda de cada noticia -------------------------------------
// Solo lo que la página necesita. El estado, el modelo y las notas de revisión
// se quedan en Redis: el repositorio es el archivo de lo publicado, no un
// volcado de la base de datos.
function paraElRepo(n) {
  return {
    id: n.id,
    slug: n.slug,
    tema: n.tema,
    // Fecha de la NOTICIA (la de la fuente), que es por la que se ordena y la
    // que sale en el sitemap. No la de aprobación.
    fecha: n.fuente.publicado,
    fuente: { nombre: n.fuente.nombre, titular: n.fuente.titular, url: n.fuente.url, publicado: n.fuente.publicado },
    simbolos: n.simbolos || [],
    principal: n.principal || null,
    leccion: n.leccion || null,
    terminos: n.terminos || [],
    autoria: n.editadoPorHumano ? 'humana' : 'ia-revisada',
    revisadoPor: n.revisadoPor || null,
    revisadoEn: n.revisadoEn || null,
    en: n.en,
    es: n.es
  };
}

async function main() {
  const clave = secreto();
  if (!clave) {
    console.error('Falta CRON_SECRET (exportalo o ponlo en .env.local).');
    process.exit(1);
  }

  const url = BASE + '/api/news?accion=revision&estado=todas&limite=200';
  console.log('Leyendo ' + url);
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + clave } });
  if (!res.ok) {
    console.error('El endpoint respondió ' + res.status + ': ' + (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const { items } = await res.json();
  const aprobadas = items.filter((n) => n.estado === 'aprobada');
  const otras = new Set(items.filter((n) => n.estado !== 'aprobada').map((n) => n.slug));
  console.log(items.length + ' noticias en Redis, ' + aprobadas.length + ' aprobadas.');

  fs.mkdirSync(DESTINO, { recursive: true });

  let nuevas = 0, cambiadas = 0, iguales = 0;
  for (const n of aprobadas) {
    // El build no puede fallar por una noticia mal formada: se comprueba aquí,
    // con el glosario completo delante, antes de que entre al repositorio.
    const errores = validar(n);
    if (errores.length) {
      console.error('  SALTADA ' + n.slug + ': ' + errores.join('; '));
      continue;
    }
    const archivo = path.join(DESTINO, n.slug + '.json');
    const texto = JSON.stringify(paraElRepo(n), null, 2) + '\n';
    let antes = null;
    try { antes = fs.readFileSync(archivo, 'utf8'); } catch (e) { /* nueva */ }
    if (antes === texto) { iguales++; continue; }
    fs.writeFileSync(archivo, texto);
    if (antes === null) { nuevas++; console.log('  + ' + n.slug); }
    else { cambiadas++; console.log('  ~ ' + n.slug); }
  }

  // Las que ya están en el repo pero dejaron de estar aprobadas. Borrar una URL
  // publicada no se hace solo: se avisa y se borra si te lo pides con
  // --limpiar. Las que ya no están en Redis (caducaron) no cuentan: esas están
  // publicadas y en su archivo, que es justo lo que se quería.
  const enRepo = fs.readdirSync(DESTINO).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const sobrantes = enRepo.filter((slug) => otras.has(slug));
  for (const slug of sobrantes) {
    if (LIMPIAR) { fs.unlinkSync(path.join(DESTINO, slug + '.json')); console.log('  - ' + slug + ' (borrada)'); }
    else console.log('  ! ' + slug + ' ya no está aprobada; usa --limpiar para borrar su página');
  }

  console.log(`\n${nuevas} nuevas, ${cambiadas} actualizadas, ${iguales} sin cambios, ${enRepo.length} en el repo.`);
  if (nuevas || cambiadas || (LIMPIAR && sobrantes.length)) {
    console.log('\nAhora: git add src/data/news && git commit -m "Noticias revisadas del <día>" && git push');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
