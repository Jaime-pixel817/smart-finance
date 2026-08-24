// Pruebas de los avisos contextuales (src/lib/avisos/avisos.mjs).
//
// Lo que se prueba aquí es lo que puede romperse en silencio: que un aviso
// cerrado no vuelva, que subirle la versión sí lo reviva, que nunca salga más
// de uno, y que las condiciones de cada aviso de la lista real hagan lo que
// dice su comentario. El pintado (src/scripts/avisos.ts) no entra: eso es DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVISOS, MAX_VISTAS, TOPE_ACTIVOS, LLAVE,
  tipoDePagina, idDeActivo, anterior,
  estadoVacio, normalizar, cerrar, anotarVista, recordarActivo, disponible, elegir, casa, avisosDe
} from './avisos.mjs';

const RUTAS = { market: '/market', compare: '/market/compare', challenge: '/challenge' };

/** Contexto por defecto: nadie sigue nada, nadie ha leído nada, y hay ratón. */
function ctx(extra = {}) {
  return {
    pagina: null, routeId: '', activo: null, activos: [], anterior: null,
    siguiendo: [], leidas: [], leccion: null, hayTerminos: false, hayChips: false,
    punteroGrueso: false, rutas: RUTAS, ...extra
  };
}

// ---------------------------------------------------------------- rutas

test('tipoDePagina reconoce las cuatro superficies y nada más', () => {
  assert.equal(tipoDePagina('asset.spy'), 'activo');
  assert.equal(tipoDePagina('lesson.peso'), 'leccion');
  assert.equal(tipoDePagina('market'), 'mercado');
  assert.equal(tipoDePagina('news'), 'noticias');
  // El home, /tools, /about… no montan nada.
  for (const id of ['home', 'tools', 'about', 'challenge', 'market.compare', 'news.read', 'lessons']) {
    assert.equal(tipoDePagina(id), null, id + ' no debería tener avisos');
  }
  assert.equal(tipoDePagina(undefined), null);
});

test('idDeActivo saca el id de la ficha', () => {
  assert.equal(idDeActivo('asset.usdmxn'), 'usdmxn');
  assert.equal(idDeActivo('market'), null);
});

test('anterior es el último activo DISTINTO del actual', () => {
  assert.equal(anterior(['spy'], 'spy'), null);
  assert.equal(anterior(['spy', 'btc'], 'btc'), 'spy');
  // Volver a una ficha ya vista no la compara consigo misma.
  assert.equal(anterior(['spy', 'btc', 'spy'], 'spy'), 'btc');
  assert.equal(anterior([], 'spy'), null);
});

// ---------------------------------------------------------------- estado

test('normalizar ignora la basura y respeta el tope de activos', () => {
  assert.deepEqual(normalizar(null), estadoVacio());
  assert.deepEqual(normalizar('{}'), estadoVacio());
  const e = normalizar({ cerrados: { a: 1, b: 'x', c: 0 }, vistas: { a: 2 }, activos: ['spy', 3, 'btc'] });
  assert.deepEqual(e.cerrados, { a: 1 });
  assert.deepEqual(e.vistas, { a: 2 });
  assert.deepEqual(e.activos, ['spy', 'btc']);
  const muchos = normalizar({ activos: Array.from({ length: 20 }, (_, i) => 'a' + i) });
  assert.equal(muchos.activos.length, TOPE_ACTIVOS);
  // Se quedan los ÚLTIMOS, que son los que importan para comparar.
  assert.equal(muchos.activos.at(-1), 'a19');
});

test('recordarActivo no repite y deja el actual al final', () => {
  let e = estadoVacio();
  e = recordarActivo(e, 'spy');
  e = recordarActivo(e, 'btc');
  e = recordarActivo(e, 'spy');
  assert.deepEqual(e.activos, ['btc', 'spy']);
  assert.deepEqual(recordarActivo(e, null).activos, ['btc', 'spy']);
});

test('cerrar guarda la versión y esa versión es la que revive el aviso', () => {
  const aviso = { id: 'x', version: 1 };
  let e = cerrar(estadoVacio(), aviso);
  assert.equal(disponible(aviso, e), false);
  // Mismo id, texto nuevo: version 2 vuelve a salir.
  assert.equal(disponible({ id: 'x', version: 2 }, e), true);
});

test('un aviso que se ignora MAX_VISTAS veces se retira solo', () => {
  const aviso = { id: 'x', version: 1 };
  let e = estadoVacio();
  for (let i = 0; i < MAX_VISTAS; i++) {
    assert.equal(disponible(aviso, e), true, 'vista ' + i);
    e = anotarVista(e, aviso);
  }
  assert.equal(disponible(aviso, e), false);
  // Y se puede pedir menos paciencia por aviso.
  assert.equal(disponible({ id: 'y', version: 1, maxVistas: 1 }, anotarVista(estadoVacio(), { id: 'y' })), false);
});

test('el estado es inmutable: cerrar y anotar devuelven copias', () => {
  const e = estadoVacio();
  cerrar(e, { id: 'x', version: 1 });
  anotarVista(e, { id: 'x' });
  recordarActivo(e, 'spy');
  assert.deepEqual(e, estadoVacio());
});

// ---------------------------------------------------------------- elegir

test('elegir devuelve UNO y respeta el orden de la lista como prioridad', () => {
  const lista = [
    { id: 'a', version: 1, paginas: ['activo'], cuando: () => true },
    { id: 'b', version: 1, paginas: ['activo'], cuando: () => true }
  ];
  const c = ctx({ pagina: 'activo' });
  assert.equal(elegir(c, estadoVacio(), lista).id, 'a');
  // Cerrado el primero, pasa el segundo. Nunca los dos.
  assert.equal(elegir(c, cerrar(estadoVacio(), lista[0]), lista).id, 'b');
});

test('elegir no mira avisos de otra página y sobrevive a una condición rota', () => {
  const lista = [
    { id: 'otra', version: 1, paginas: ['leccion'], cuando: () => true },
    { id: 'rota', version: 1, paginas: ['activo'], cuando: () => { throw new Error('boom'); } },
    { id: 'buena', version: 1, paginas: ['activo'], cuando: () => true }
  ];
  assert.equal(elegir(ctx({ pagina: 'activo' }), estadoVacio(), lista).id, 'buena');
  assert.equal(elegir(ctx({ pagina: null }), estadoVacio(), lista), null);
});

// ---------------------------------------------------------------- la lista real

test('la lista real está bien formada y sin ids repetidos', () => {
  const ids = new Set();
  const PAGINAS = new Set(['activo', 'mercado', 'leccion', 'noticias']);
  for (const a of AVISOS) {
    assert.ok(a.id && !ids.has(a.id), 'id repetido o vacío: ' + a.id);
    ids.add(a.id);
    assert.ok(Number.isInteger(a.version) && a.version >= 1, a.id + ': version');
    assert.ok(Array.isArray(a.paginas) && a.paginas.length > 0, a.id + ': paginas');
    for (const p of a.paginas) assert.ok(PAGINAS.has(p), a.id + ': página desconocida ' + p);
    assert.ok(a.texto.startsWith('aviso.'), a.id + ': el texto va en ui.ts con clave aviso.*');
    assert.ok(['ok', 'enlace'].includes(a.accion.tipo), a.id + ': tipo de acción');
    assert.ok(a.accion.etiqueta.startsWith('aviso.'), a.id + ': etiqueta');
    if (a.accion.tipo === 'enlace') assert.equal(typeof a.accion.href, 'function', a.id + ': href');
    assert.equal(typeof a.cuando, 'function', a.id + ': cuando');
  }
  assert.equal(LLAVE, 'sf-avisos-v1');
});

test('primera ficha de activo: el aviso de la gráfica dice el gesto que se puede hacer', () => {
  // Con el dedo se arrastra; con el ratón basta pasar por encima. Decirle
  // "arrastra el dedo" a quien tiene ratón es mandar algo imposible.
  const dedo = ctx({ pagina: 'activo', activo: 'spy', activos: ['spy'], punteroGrueso: true });
  assert.equal(elegir(dedo, estadoVacio()).id, 'grafica-arrastre');
  const raton = ctx({ pagina: 'activo', activo: 'spy', activos: ['spy'] });
  assert.equal(elegir(raton, estadoVacio()).id, 'grafica-raton');
  // Se excluyen: en la misma pantalla nunca casan los dos (ni ninguno de más).
  for (const punteroGrueso of [true, false]) {
    const c = ctx({ pagina: 'activo', activo: 'spy', activos: ['spy'], punteroGrueso });
    const casan = AVISOS.filter((a) => casa(a, c)).map((a) => a.id);
    assert.deepEqual(casan, [punteroGrueso ? 'grafica-arrastre' : 'grafica-raton']);
  }
  // Y en la segunda ficha ya no sale ninguno de los dos: se enseña una vez.
  const segunda = ctx({ pagina: 'activo', activo: 'btc', activos: ['spy', 'btc'], anterior: 'spy', punteroGrueso: true });
  assert.equal(AVISOS.filter((a) => casa(a, segunda) && a.texto.startsWith('aviso.grafica')).length, 0);
});

test('segunda ficha distinta: sale comparar, con LOS DOS activos en el enlace', () => {
  const c = ctx({ pagina: 'activo', activo: 'btc', activos: ['spy', 'btc'], anterior: 'spy' });
  const a = elegir(c, estadoVacio());
  assert.equal(a.id, 'comparar-dos');
  assert.equal(a.accion.href(c), '/market/compare?a=spy&b=btc');
});

test('en la ficha, seguir algo enseña dónde queda la lista; en /market solo salta', () => {
  const enFicha = ctx({ pagina: 'activo', activo: 'spy', activos: ['btc', 'spy'], anterior: 'btc', siguiendo: ['spy'] });
  // Comparar va antes en la lista: manda el que ahorra el clic.
  assert.equal(elegir(enFicha, estadoVacio()).id, 'comparar-dos');
  const soloSigue = ctx({ pagina: 'activo', activo: 'spy', activos: ['btc', 'spy'], siguiendo: ['spy'] });
  const a = elegir(soloSigue, cerrar(estadoVacio(), { id: 'comparar-dos', version: 1 }));
  assert.equal(a.id, 'sigues-arriba');
  assert.equal(a.accion.href(soloSigue), '/market#mkt-watch');
  const enMercado = ctx({ pagina: 'mercado', siguiendo: ['spy'] });
  assert.equal(elegir(enMercado, estadoVacio()).accion.href(enMercado), '#mkt-watch');
  // Sin nada seguido no hay nada que enseñar.
  assert.equal(elegir(ctx({ pagina: 'mercado' }), estadoVacio()), null);
});

test('lección: glosario mientras haya términos; el reto solo al terminarla', () => {
  const abierta = ctx({ pagina: 'leccion', leccion: 'inflacion', hayTerminos: true });
  assert.equal(elegir(abierta, estadoVacio()).id, 'glosario');
  const sinTerminos = ctx({ pagina: 'leccion', leccion: 'inflacion' });
  assert.equal(elegir(sinTerminos, estadoVacio()), null);
  const leida = ctx({ pagina: 'leccion', leccion: 'inflacion', leidas: ['inflacion'] });
  const a = elegir(leida, estadoVacio());
  assert.equal(a.id, 'reto-tras-leccion');
  assert.equal(a.accion.href(leida), '/challenge');
  // Haber leído OTRA lección no cuenta.
  assert.equal(elegir(ctx({ pagina: 'leccion', leccion: 'sp500', leidas: ['inflacion'] }), estadoVacio()), null);
});

test('noticias: el aviso espera a que el índice haya pintado los chips', () => {
  assert.equal(elegir(ctx({ pagina: 'noticias' }), estadoVacio()), null);
  assert.equal(elegir(ctx({ pagina: 'noticias', hayChips: true }), estadoVacio()).id, 'noticias-chips');
});

test('casa: un aviso puesto deja de casar cuando lo que decía ya no está', () => {
  const aviso = AVISOS.find((a) => a.id === 'noticias-chips');
  // El índice pinta desde la caché (hay chips) y luego el endpoint contesta sin
  // noticias: el motor usa esto para retirar el aviso en vez de dejarlo
  // hablando de unas tarjetas que ya no existen.
  assert.equal(casa(aviso, ctx({ pagina: 'noticias', hayChips: true })), true);
  assert.equal(casa(aviso, ctx({ pagina: 'noticias', hayChips: false })), false);
  // Y nunca casa fuera de su página.
  assert.equal(casa(aviso, ctx({ pagina: 'mercado', hayChips: true })), false);
  assert.equal(casa({ paginas: ['mercado'], cuando: () => { throw new Error('x'); } }, ctx({ pagina: 'mercado' })), false);
});

test('avisosDe reparte la lista real por página', () => {
  assert.ok(avisosDe('activo').length >= 3);
  assert.ok(avisosDe('leccion').length >= 2);
  assert.equal(avisosDe(null).length, 0);
  // Ningún aviso queda huérfano de página.
  const total = new Set(AVISOS.map((a) => a.id));
  const cubiertos = new Set(['activo', 'mercado', 'leccion', 'noticias'].flatMap((p) => avisosDe(p).map((a) => a.id)));
  assert.deepEqual(cubiertos, total);
});
