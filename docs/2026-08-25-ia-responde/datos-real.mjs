// Prueba con DATOS REALES (Yahoo Finance, la misma llamada que hace el sitio):
// ¿cambia el bloque DATOS según la pregunta? No hace falta el modelo — esto es
// justo la mitad del bug: el bloque no dependía de la pregunta.
import { createRequire } from 'node:module';
const require = createRequire('/Users/jaimesandovalricano/Desktop/carpeta sin título/sf-w6-ia2/package.json');
const ia = require('./api/_lib/ia.js');

// La caché real necesita Redis; aquí se sustituye por una que SIEMPRE calcula,
// así que la llamada a Yahoo es de verdad y los números son los de hoy.
const cacheDirecta = { conCache: async ({ calcular }) => ({ valor: await calcular(), stale: false }) };
require.cache[require.resolve('./api/_lib/cache.js')].exports = cacheDirecta;
const historia = require('./api/history.js');

const base = { tipo: 'activo', id: 'spy', lang: 'es', rango: '1M', modo: 'explicar' };
const deps = { historia, noticias: { listar: async () => [] } };

for (const pregunta of ['', '¿por qué subió hoy?', '¿cómo va este año?']) {
  const pedido = Object.assign({}, base, { pregunta }, ia.clasificarPregunta(pregunta, 'spy'));
  const bloque = await ia.armarDatos(pedido, deps);
  console.log('\n' + '='.repeat(70));
  console.log('PREGUNTA:', pregunta || '(ninguna — el botón a secas)');
  console.log('intención:', pedido.intencion, '· alcance:', pedido.alcance, '· rango pedido:', pedido.alcance || pedido.rango);
  console.log('-'.repeat(70));
  console.log(bloque.datos);
}
