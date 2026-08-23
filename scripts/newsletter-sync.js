// Baja los números ENVIADOS del boletín a src/data/newsletter/*.json, que es de
// donde el build genera /newsletter/<fecha> y /es/boletin/<fecha>.
//
// POR QUÉ HAY DOS SITIOS DONDE VIVE UN NÚMERO
// -------------------------------------------
// Redis es lo que acaba de pasar: el envío del domingo archiva ahí el número, y
// eso es lo que hace que el enlace de "ver en el navegador" del correo funcione
// desde el primer minuto (lo sirve src/pages/newsletter-read.astro leyendo del
// endpoint). Pero el sitio es estático y una página de verdad —con su HTML, su
// og:image y su JSON-LD, o sea algo que Google pueda indexar y alguien pueda
// compartir— solo sale del build. Este script es el puente.
//
// Se corre cuando te acuerdes, igual que `npm run news:sync`. Una vez al mes
// basta: mientras tanto las URL ya funcionan.
//
// NO NECESITA SECRETO. Un número enviado es público por definición: es el
// correo que ya recibieron noventa personas. El endpoint que lo sirve también
// lo es.
//
// CÓMO SE USA
//   npm run newsletter:sync                       # contra smartfinance.lat
//   npm run newsletter:sync -- --base=http://localhost:4321
// Después: git add src/data/newsletter && git commit && git push.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'src', 'data', 'newsletter');

const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const a = args.find((x) => x.startsWith('--' + nombre + '='));
  return a ? a.slice(nombre.length + 3) : porDefecto;
};
const BASE = String(opcion('base', 'https://smartfinance.lat')).replace(/\/$/, '');

async function pedirJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ' respondió ' + res.status);
  return res.json();
}

// Lo que se guarda de cada número: lo que llegó, tal cual. El archivo de Redis
// ya trae solo lo que la página necesita (api/_lib/boletin.js, paraArchivo), así
// que aquí no hay nada que recortar — y recortarlo sería la forma de que la
// página estática y la pintada en el navegador dejaran de ser la misma.
//
// Lo que sí se comprueba es la forma: un JSON a medias en el repo se convierte
// en un build roto, y el build roto se descubre en Vercel, con el despliegue ya
// empezado.
function valido(n) {
  const faltan = [];
  if (!n || typeof n !== 'object') return ['no es un objeto'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(n.fecha || ''))) faltan.push('fecha');
  if (!Number.isFinite(n.numero)) faltan.push('numero');
  for (const campo of ['rango', 'gancho', 'resumen']) {
    if (!n[campo] || !n[campo].en || !n[campo].es) faltan.push(campo + ' (en/es)');
  }
  return faltan;
}

async function main() {
  const { fechas } = await pedirJSON(BASE + '/api/newsletter-chart?issues=1');
  if (!Array.isArray(fechas) || !fechas.length) {
    console.log('No hay ningún número archivado todavía.');
    return;
  }
  console.log(fechas.length + ' números en el archivo.');

  fs.mkdirSync(DESTINO, { recursive: true });

  let nuevos = 0, cambiados = 0, iguales = 0;
  for (const fecha of fechas) {
    let numero;
    try {
      numero = await pedirJSON(BASE + '/api/newsletter-chart?issue=' + encodeURIComponent(fecha));
    } catch (e) {
      console.error('  SALTADO ' + fecha + ': ' + e.message);
      continue;
    }

    const errores = valido(numero);
    if (errores.length) {
      console.error('  SALTADO ' + fecha + ': le falta ' + errores.join(', '));
      continue;
    }

    const archivo = path.join(DESTINO, fecha + '.json');
    const texto = JSON.stringify(numero, null, 2) + '\n';
    let antes = null;
    try { antes = fs.readFileSync(archivo, 'utf8'); } catch (e) { /* nuevo */ }
    if (antes === texto) { iguales++; continue; }
    fs.writeFileSync(archivo, texto);
    if (antes === null) { nuevos++; console.log('  + ' + fecha + '  Nº' + numero.numero); }
    else { cambiados++; console.log('  ~ ' + fecha); }
  }

  const enRepo = fs.readdirSync(DESTINO).filter((f) => f.endsWith('.json')).length;
  console.log(`\n${nuevos} nuevos, ${cambiados} actualizados, ${iguales} sin cambios, ${enRepo} en el repo.`);
  // Nada se borra nunca: un número que caduca del archivo de Redis (a los dos
  // años) y ya está commiteado es justo lo que se quería conservar.
  if (nuevos || cambiados) {
    console.log('\nAhora: git add src/data/newsletter && git commit -m "Boletín: números al día" && git push');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
