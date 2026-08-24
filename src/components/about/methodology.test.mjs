// El changelog de /methodology y /es/metodologia es el registro de correcciones
// del sitio: es lo que le dice a un lector "si algo estuvo mal, aquí está y con
// fecha". Un registro de correcciones con una fecha de mañana no es un registro,
// es una promesa — y ya pasó una vez: la fila del botón "Explícame esto" se
// escribió con la fecha del día en que se pensaba desplegar, no la de hoy, y se
// renderizó en las dos páginas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fuente = readFileSync(new URL('./Methodology.astro', import.meta.url), 'utf8');

/** Las fechas de cada bloque `changelog:` del componente, en orden. */
function changelogs() {
  return fuente.split('changelog:').slice(1).map((bloque) => {
    const cuerpo = bloque.slice(0, bloque.indexOf('\n    ],'));
    return (cuerpo.match(/'(\d{4}-\d{2}-\d{2})'/g) || []).map((s) => s.slice(1, -1));
  });
}

test('ninguna entrada del changelog lleva fecha futura', () => {
  // "Hoy" es hoy en Ciudad de México, no en UTC. México va seis horas por
  // detrás: a partir de las 18:00 la fecha UTC ya es la de mañana, y con ella
  // esta prueba daba por buena justo la entrada que venía a cazar. Es el mismo
  // criterio con el que el reto del día elige su semilla.
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const bloques = changelogs();
  assert.equal(bloques.length, 2, 'se esperaban los dos changelog: el inglés y el español');
  for (const fechas of bloques) {
    assert.ok(fechas.length, 'un changelog salió vacío: ¿cambió la forma del componente?');
    for (const f of fechas) {
      assert.ok(f <= hoy, 'entrada del changelog fechada en el futuro: ' + f + ' (hoy es ' + hoy + ')');
    }
  }
});

test('el changelog inglés y el español registran lo mismo', () => {
  const [en, es] = changelogs();
  assert.deepEqual(es, en, 'las dos páginas tienen que contar las mismas correcciones, con las mismas fechas');
});

test('el changelog va de lo nuevo a lo viejo', () => {
  for (const fechas of changelogs()) {
    const ordenado = [...fechas].sort().reverse();
    assert.deepEqual(fechas, ordenado, 'el changelog se lee de arriba abajo, de lo más reciente a lo más antiguo');
  }
});
