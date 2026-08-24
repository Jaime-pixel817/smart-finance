// El contrato de teclado y lector de pantalla de la hoja de Smart Finance AI.
//
// QUÉ ES ESTO Y QUÉ NO ES. Estas comprobaciones leen el CÓDIGO —el marcado de
// AISheet.astro, el guion de ia.ts, la hoja de ia.css—, no un navegador de
// verdad. No sustituyen a abrir la hoja y recorrerla con el tabulador: eso hay
// que seguir haciéndolo a mano. Lo que hacen es que un borrado accidental
// (quitar el `aria-modal`, dejarse el `body.overflow` puesto al cerrar, olvidar
// devolver el foco al botón) se caiga en CI en vez de descubrirse en producción.
// Sin esto no había NADA commiteado vigilando esta parte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hoja = readFileSync(new URL('./AISheet.astro', import.meta.url), 'utf8');
const boton = readFileSync(new URL('./ExplainButton.astro', import.meta.url), 'utf8');
const guion = readFileSync(new URL('../../scripts/ia.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../styles/ia.css', import.meta.url), 'utf8');
const base = readFileSync(new URL('../../styles/base.css', import.meta.url), 'utf8');

test('la hoja se anuncia como diálogo modal y con nombre', () => {
  assert.match(hoja, /role="dialog"/, 'sin role=dialog un lector de pantalla no sabe que es una hoja');
  assert.match(hoja, /aria-modal="true"/, 'sin aria-modal el lector sigue leyendo la página de debajo');
  assert.match(hoja, /aria-labelledby="ia-sheet-title"/, 'el diálogo necesita nombre accesible');
  assert.match(hoja, /id="ia-sheet-title"/, 'y ese nombre tiene que existir en el marcado');
  assert.match(hoja, /class="ia-sheet-close"[^>]*aria-label=/, 'el botón de cerrar es un icono: necesita etiqueta');
});

test('el cuerpo anuncia solo la respuesta cuando llega', () => {
  // La respuesta tarda segundos. Sin aria-live, quien usa lector de pantalla
  // tiene que ir a buscarla sin saber que ya está.
  assert.match(hoja, /class="ia-cuerpo" aria-live="polite" aria-busy="false"/);
  assert.match(guion, /setAttribute\('aria-busy', 'true'\)/, 'mientras carga, aria-busy=true');
  assert.match(guion, /setAttribute\('aria-busy', 'false'\)/, 'y vuelve a false al terminar');
});

test('el botón dice que abre un diálogo y de qué habla', () => {
  assert.match(boton, /aria-haspopup="dialog"/);
  assert.match(boton, /aria-label=\{texto \+ ': ' \+ sobre\}/,
    '"Explícame esto" a secas no dice nada fuera de contexto: la etiqueta lleva el sobre');
  assert.match(boton, /aria-hidden="true" focusable="false"/, 'el icono no se lee ni recibe foco');
});

test('Esc cierra, y cerrar deshace TODO lo que abrir hizo', () => {
  assert.match(guion, /e\.key === 'Escape'/, 'Esc tiene que cerrar la hoja');
  const abrir = guion.slice(guion.indexOf('function abrir'), guion.indexOf('function cerrarHoja'));
  const cerrar = guion.slice(guion.indexOf('function cerrarHoja'));
  assert.match(abrir, /document\.body\.style\.overflow = 'hidden'/, 'abrir bloquea el scroll de detrás');
  assert.match(cerrar, /document\.body\.style\.overflow = ''/, 'y cerrar lo devuelve, o la página queda muerta');
  assert.match(abrir, /abridor = btn/, 'abrir recuerda quién la abrió');
  assert.match(cerrar, /abridor\.focus\(\)/, 'y cerrar le devuelve el foco: si no, el foco cae al principio de la página');
  assert.match(abrir, /cerrar\.focus\(\)/, 'al abrir, el foco entra en la hoja');
});

test('el foco queda atrapado en el panel, en los dos sentidos', () => {
  const trampa = guion.slice(guion.indexOf("if (e.key !== 'Tab') return;"));
  assert.match(trampa, /panel\.querySelectorAll/, 'los focables se buscan DENTRO del panel, no en el documento');
  assert.match(trampa, /a\[href\], button:not\(\[disabled\]\), input:not\(\[disabled\]\)/);
  assert.match(trampa, /offsetParent !== null/, 'lo que está escondido no cuenta como focable');
  assert.match(trampa, /e\.shiftKey && document\.activeElement === primero/, 'Shift+Tab desde el primero va al último');
  assert.match(trampa, /!e\.shiftKey && document\.activeElement === ultimo/, 'Tab desde el último vuelve al primero');
});

test('con la hoja cerrada, el teclado no la toca', () => {
  const escucha = guion.slice(guion.indexOf("document.addEventListener('keydown'"));
  assert.match(escucha, /if \(sheet!\.hidden\) return;/,
    'Esc con la hoja cerrada no puede robarle la tecla al resto de la página');
});

test('prefers-reduced-motion apaga las DOS animaciones', () => {
  const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  const cuerpo = bloque.slice(0, bloque.indexOf('}\n@media'));
  assert.match(cuerpo, /\.ia-sheet-panel \{ animation: none/, 'la entrada del panel');
  assert.match(cuerpo, /\.ia-dots i \{ animation: none/, 'y los tres puntos de "pensando", que son los que marean');
});

test('el anillo de foco sigue puesto y el objetivo táctil llega a 44 px', () => {
  // El anillo es del sitio entero (base.css), no de esta hoja: aquí lo que hay
  // que vigilar es que la hoja no se lo quite a nada que reciba el tabulador.
  // Va en `outline` y NO en `box-shadow`: cualquier regla posterior con sombra
  // (.card, .tile) se llevaba el anillo por delante. La regla está en CLAUDE.md.
  assert.match(base, /:focus-visible \{[^}]*outline: 2px solid var\(--brand-text\)/,
    'sin anillo de foco, navegar con teclado es a ciegas');
  const apagones = css.match(/^([^{]*)\{[^}]*outline: none/gm) || [];
  for (const a of apagones) {
    assert.match(a, /\.ia-sheet-panel/,
      'lo único que puede quitarse el anillo es el panel, que recibe foco por código y no con el tabulador: ' + a);
  }
  assert.match(css, /\.ia-sheet-close \{[^}]*width: 44px; height: 44px/s, 'el botón de cerrar es el objetivo táctil mínimo');
});

test('la etiqueta de IA está en la hoja, no escondida', () => {
  // Es la regla del sitio: la disclosure no va en letra chica ni detrás de un
  // "leer más". Si alguien la mete en un <details>, esto se cae.
  assert.match(hoja, /class="ia-disclosure"/);
  assert.doesNotMatch(hoja, /<details/, 'la etiqueta de IA no se esconde detrás de un desplegable');
  assert.match(hoja, /ia-disclosure-txt/, 'y el texto lo reescribe el guion según quién escribió la respuesta');
  assert.match(guion, /generadoPor === 'ia' \? txt\.disclosure : txt\.disclosureFixed/);
});
