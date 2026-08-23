// Foto diaria del valor de las carteras: escribe UN punto en
// src/data/actinver-history.json y src/data/portfolio-history.json.
//
// Lo dispara .github/workflows/actinver-snapshot.yml los días hábiles por la
// noche y lo commitea. La gráfica de /actinver y /portfolio se dibuja SOLO con
// esos archivos: así la evolución de la cartera es un dato del repositorio,
// auditable y con fecha, y no depende de que ningún servicio esté vivo cuando
// alguien abre la página.
//
// CÓMO SE USA
//   node scripts/snapshot-cartera.mjs            # escribe el punto de hoy
//   node scripts/snapshot-cartera.mjs --dry      # enseña lo que haría, sin tocar nada
//   node scripts/snapshot-cartera.mjs --base http://localhost:3000
//   node scripts/snapshot-cartera.mjs --horas 999 --dry   # probarlo en fin de semana
//
// REGLAS (por qué falla en vez de escribir un número a medias)
// - Si a una posición abierta le falta el precio, NO se escribe el punto y el
//   proceso sale con error. Media cartera valuada es una gráfica que miente.
// - Si el último precio de TODAS las posiciones tiene más de 30 h, se entiende
//   que la bolsa no operó (festivo) y se sale sin escribir ni fallar.
// - Si ya hay un punto con la fecha de hoy, se reescribe con los datos nuevos:
//   correr el workflow dos veces no duplica la línea.
// - Una cartera sin posiciones abiertas no genera puntos.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resumen } from '../src/lib/portfolio/cartera.mjs';
import { carteraSchema, historialSchema, leer } from '../src/lib/portfolio/schema.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const BASE = valorDe('--base') || 'https://smartfinance.lat';
/**
 * Horas sin precio nuevo a partir de las cuales se entiende que no hubo sesión.
 * Se puede subir con --horas para probar el script un domingo, cuando el último
 * precio real tiene dos días y el guardián de festivos salta con razón.
 */
const HORAS_SIN_SESION = Number(valorDe('--horas')) || 30;

const CARTERAS = [
  { id: 'actinver', datos: 'src/data/actinver.json', historial: 'src/data/actinver-history.json' },
  { id: 'portfolio', datos: 'src/data/portfolio.json', historial: 'src/data/portfolio-history.json' }
];

function valorDe(bandera) {
  const i = args.indexOf(bandera);
  return i >= 0 ? args[i + 1] : null;
}

/** La fecha del punto es la del día en Ciudad de México, no la del runner (UTC). */
function hoyEnMexico() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

async function leerJson(rel) {
  return JSON.parse(await readFile(path.join(RAIZ, rel), 'utf8'));
}

/** Último cierre conocido de un par, desde /api/history. */
async function precioDe(par) {
  const url = `${BASE}/api/history?pair=${encodeURIComponent(par)}&range=1D`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${par}: /api/history respondió ${res.status}`);
  const json = await res.json();
  const puntos = json && json.points;
  if (!Array.isArray(puntos) || !puntos.length) throw new Error(`${par}: sin puntos`);
  const [ts, precio] = puntos[puntos.length - 1];
  if (typeof precio !== 'number' || !isFinite(precio)) throw new Error(`${par}: el último punto no es un número`);
  return { precio, ts, stale: json.stale === true };
}

async function foto(cfg) {
  const cartera = leer(carteraSchema, await leerJson(cfg.datos), cfg.datos);
  const historial = leer(historialSchema, await leerJson(cfg.historial), cfg.historial);

  const abiertas = cartera.posiciones.filter((p) => p.estado === 'abierta');
  if (!abiertas.length) {
    console.log(`[${cfg.id}] sin posiciones abiertas: no hay nada que fotografiar.`);
    return null;
  }

  const sinPar = abiertas.filter((p) => !p.historyPair).map((p) => p.ticker);
  if (sinPar.length) {
    throw new Error(
      `[${cfg.id}] estas posiciones abiertas no tienen historyPair y no se pueden valuar: ${sinPar.join(', ')}.\n` +
        'Añade su clave al bloque BMV de api/history.js y ponla en el JSON de la cartera, o cierra la posición.'
    );
  }

  const pares = Array.from(new Set(abiertas.map((p) => p.historyPair)));
  const cotizaciones = {};
  for (const par of pares) cotizaciones[par] = await precioDe(par);

  const ahora = Math.floor(Date.now() / 1000);
  const masReciente = Math.max(...pares.map((par) => cotizaciones[par].ts));
  const horas = (ahora - masReciente) / 3600;
  if (horas > HORAS_SIN_SESION) {
    console.log(`[${cfg.id}] el último precio tiene ${horas.toFixed(1)} h: la bolsa no operó hoy. No se escribe punto.`);
    return null;
  }

  const precios = {};
  for (const p of abiertas) precios[p.ticker] = cotizaciones[p.historyPair].precio;

  const r = resumen(cartera, precios);
  if (!r.completo || r.valorTotal === null) {
    throw new Error(`[${cfg.id}] falta el precio de ${r.faltantes.join(', ')}: no se escribe un total a medias.`);
  }

  const punto = {
    fecha: hoyEnMexico(),
    valor: redondea(r.valorTotal),
    efectivo: r.efectivo === null ? null : redondea(r.efectivo),
    posiciones: redondea(r.valorAbierto),
    // Los precios con los que se hizo la cuenta, para poder revisarla después.
    precios: Object.fromEntries(Object.entries(precios).map(([k, v]) => [k, redondea(v, 4)]))
  };

  const puntos = historial.puntos.filter((p) => p.fecha !== punto.fecha);
  puntos.push(punto);
  puntos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const nuevo = { ...historial, puntos };
  // Se valida ANTES de escribir: si el punto nuevo rompiera el esquema, el
  // archivo del repositorio se queda como estaba.
  leer(historialSchema, nuevo, cfg.historial);

  console.log(
    `[${cfg.id}] ${punto.fecha}: ${punto.valor} ${cartera.moneda}` +
      (r.variacion ? ` (${r.variacion.pct >= 0 ? '+' : ''}${r.variacion.pct.toFixed(2)} % desde el inicio)` : '') +
      ` · ${abiertas.length} posición(es) · precios: ${JSON.stringify(punto.precios)}`
  );
  const viejas = pares.filter((par) => cotizaciones[par].stale);
  if (viejas.length) console.log(`[${cfg.id}] aviso: /api/history sirvió copia vieja para ${viejas.join(', ')}.`);

  if (DRY) {
    console.log(`[${cfg.id}] --dry: no se escribe ${cfg.historial}.`);
    return null;
  }
  await writeFile(path.join(RAIZ, cfg.historial), JSON.stringify(nuevo, null, 2) + '\n', 'utf8');
  return cfg.historial;
}

function redondea(n, decimales = 2) {
  return Number(n.toFixed(decimales));
}

const escritos = [];
for (const cfg of CARTERAS) {
  const salida = await foto(cfg);
  if (salida) escritos.push(salida);
}

if (!escritos.length) {
  console.log('Nada que commitear.');
} else {
  console.log('Archivos escritos: ' + escritos.join(', '));
}
