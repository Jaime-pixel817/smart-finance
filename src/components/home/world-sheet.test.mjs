// LA TARJETA DEL PAÍS DEL HOME: dónde cuelga y con qué se tapa.
//
// QUÉ ES ESTO Y QUÉ NO ES. Esto lee el CÓDIGO —Hero.astro, WorldSheet.astro,
// WorldMarkets.astro, world-markets.ts— y no abre ningún navegador. No
// sustituye a tocar una ciudad en un teléfono; eso hay que seguir haciéndolo.
// Lo que hace es que **este** bug no pueda volver sin que CI se entere.
//
// EL BUG. La tarjeta vivía dentro de WorldMarkets.astro, que Hero.astro monta
// dentro de .hero-world — y .hero-world es `position: relative; z-index: 3`, o
// sea un contexto de apilamiento propio. Ahí dentro, el `z-index: 50` de la
// tarjeta no competía con la página: competía con sus hermanas, y el conjunto
// entero seguía valiendo 3. El chip de fuente del hero (.hero-source, z-index
// 3) y el cuerpo de la página (.home-body, z-index 3 y fondo OPACO) vienen
// después en el DOM, empataban a 3 y ganaban por orden: en el teléfono se leían
// "Delayed 15 min · Yahoo Finance · 08:57" del hero y la misma línea de la
// tarjeta píxel sobre píxel, y el enlace "¿Qué es este índice?" desaparecía
// tragado por el fondo de .home-body. Medido antes del arreglo, a 390×844: 7
// renglones de la página pintándose encima de la tarjeta y 7 renglones de la
// tarjeta pisados (10 a 430×932). Después: 0 y 0.
//
// Un z-index no se lee solo: se lee junto a quién abre contexto por encima. Por
// eso lo que se vigila aquí es DÓNDE cuelga la tarjeta, no qué número tiene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const hero = leer('./Hero.astro');
const hoja = leer('./WorldSheet.astro');
const barra = leer('./WorldMarkets.astro');
const guion = leer('../../scripts/world-markets.ts');
const nav = leer('../BottomNav.astro');
const busqueda = leer('../SearchOverlay.astro');

test('la tarjeta NO cuelga de la barra, que va dentro de .hero-world', () => {
  // .hero-world abre contexto de apilamiento: mientras siga teniendo z-index,
  // nada que deba pintarse sobre la página puede vivir ahí dentro.
  assert.match(hero, /\.hero-world\s*\{[^}]*z-index:\s*3/,
    '.hero-world sigue abriendo contexto de apilamiento; si eso cambia, revisa esta prueba entera');
  assert.doesNotMatch(barra, /class="world-sheet"|world-sheet-card/,
    'la tarjeta volvió a WorldMarkets.astro: ahí dentro su z-index no vale contra la página');
  assert.match(barra, /#world-sheet/,
    'y WorldMarkets.astro tiene que seguir diciendo a dónde se fue');
});

test('Hero.astro la monta FUERA del <section class="hero">', () => {
  const cierre = hero.lastIndexOf('</section>');
  const monta = hero.indexOf('<WorldSheet');
  assert.ok(monta > -1, 'Hero.astro tiene que montar <WorldSheet />');
  assert.ok(cierre > -1 && monta > cierre,
    'la tarjeta va DESPUÉS del cierre del hero: dentro, cualquier regla del hero puede volver a encerrarla');
  assert.match(hero, /import WorldSheet from '\.\/WorldSheet\.astro'/);
});

test('el z-index de la tarjeta significa lo que dice: sobre el nav, bajo la búsqueda', () => {
  const z = (css, sel) => {
    const m = css.match(new RegExp(sel.replace('.', '\\.') + '\\s*\\{[^}]*z-index:\\s*(\\d+)'));
    return m ? Number(m[1]) : null;
  };
  const zHoja = z(hoja, '.world-sheet');
  assert.equal(zHoja, 50);
  assert.ok(zHoja > z(nav, '.bottom-nav'), 'la tarjeta va por encima de la barra de abajo');
  assert.ok(zHoja < z(busqueda, '.search-overlay'), 'y por debajo de la búsqueda');
  // Y encima de todo lo del hero, que como mucho llega a 3.
  const zsHero = [...hero.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...zsHero) < zHoja, 'nada del hero puede declarar un z-index mayor que el de la tarjeta');
});

test('la tarjeta se apoya sobre el bottom nav, no encima de él', () => {
  assert.match(hoja, /bottom:\s*calc\(var\(--bottomnav-h\)/,
    'el borde de abajo arranca donde acaba la barra de navegación');
  assert.match(hoja, /env\(safe-area-inset-bottom/, 'y respeta la franja del gesto del iPhone');
});

test('el fondo de la tarjeta es OPACO', () => {
  const tarjeta = hoja.slice(hoja.indexOf('.world-sheet-card {'), hoja.indexOf('.world-sheet.is-open'));
  assert.match(tarjeta, /background:\s*var\(--bg-3\)/, 'el fondo es un token sólido');
  assert.doesNotMatch(tarjeta, /background:[^;]*(rgba|hsla|color-mix|transparent)/,
    'nada de transparencias en el fondo: la tarjeta tapa texto de verdad y se transparentaría justo lo que está separando');
  assert.doesNotMatch(tarjeta, /(^|[^-])opacity:/, 'ni opacidad sobre la caja entera');
});

test('con la tarjeta abierta, el chip de fuente del hero se aparta', () => {
  assert.match(guion, /classList\.toggle\('is-world-open', abierta\)/,
    'el guion marca <html> mientras la tarjeta está abierta');
  const abrir = guion.slice(guion.indexOf('function open('), guion.indexOf('function close('));
  const cerrar = guion.slice(guion.indexOf('function close('));
  assert.match(abrir, /marcarAbierta\(true\)/, 'abrir aparta el chip');
  assert.match(cerrar, /marcarAbierta\(false\)/, 'y cerrar lo devuelve, o se queda invisible para siempre');
  assert.match(hero, /:global\(:root\.is-world-open\)\s*\.hero-source\s*\{[^}]*visibility:\s*hidden/,
    'la regla que lo esconde vive en Hero.astro, que es donde vive el chip');
});

test('se esconde SIN mover la página', () => {
  const regla = hero.slice(hero.indexOf(':global(:root.is-world-open) .hero-source'));
  const bloque = regla.slice(0, regla.indexOf('}') + 1);
  assert.doesNotMatch(bloque, /display:\s*none/,
    'display: none saca el chip del flujo: el hero encoge y .home-body sube 14 px a 390×844 — un salto justo al tocar una ciudad');
  assert.match(bloque, /opacity:\s*0/);
  assert.match(bloque, /visibility:\s*hidden/,
    'visibility conserva la caja (CLS 0 medido al abrir y al cerrar) y además saca el chip del árbol de accesibilidad, que es lo que evita oír el dato dos veces');
});

test('la tarjeta sigue trayendo su propia línea de fuente', () => {
  // Es la razón por la que se puede esconder la del hero: si un día se quita de
  // la tarjeta, esconder la otra dejaría la hora sin decir en ninguna parte.
  assert.match(hoja, /id="chip-world-sheet"/);
  assert.match(hoja, /source="Yahoo Finance" delay=\{15\}/);
  assert.match(hero, /id="chip-world"/, 'y el hero sigue teniendo la suya para cuando no hay tarjeta');
});
