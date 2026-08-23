// La mesa de revisión: aquí una persona lee los borradores y decide.
//
// Es el único sitio donde una noticia pasa de "la escribió una IA" a "está
// publicada en smartfinance.lat". Sin este paso no sale nada: /api/news solo
// sirve las que tienen estado "aprobada", y el build solo genera páginas de
// las que están en src/data/news/.
//
// Va dentro de api/news.js y no en su propio endpoint por el tope de 12
// funciones del plan (ver el encabezado de borradores.js).
//
// CÓMO SE USA
//   Desde el teléfono: https://smartfinance.lat/review.html (pide el secreto).
//   Desde la terminal:
//     export CRON_SECRET=...   # el mismo del boletín, en .env.local
//     # ver los borradores de hoy
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//       "https://smartfinance.lat/api/news?accion=revision&formato=texto"
//     # aprobar uno tal cual está
//     curl -X POST -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
//       -d '{"accion":"decidir","id":"2026-08-22-mi-slug","estado":"aprobada"}' \
//       https://smartfinance.lat/api/news
//     # aprobar cambiando el texto en español
//     curl -X POST ... -d '{"accion":"decidir","id":"...","estado":"aprobada","es":{"titulo":"...","que":"...","porque":"...","impacto":"..."}}'
//     # rechazar
//     curl -X POST ... -d '{"accion":"decidir","id":"...","estado":"rechazada"}'
//
// POR QUÉ EL MISMO CRON_SECRET QUE EL BOLETÍN
//   Es el secreto de operación del sitio y ya protege /api/send-newsletter y
//   /api/newsletter-log. Un segundo secreto sería una segunda cosa que rotar,
//   que perder y que olvidar; la comparación es en tiempo constante en
//   _lib/secreto.js, igual para los tres.

const noticias = require('./noticias');

const REVISOR = 'Jaime';

function comoTexto(items) {
  if (!items.length) return 'No hay noticias en ese estado.\n';
  return items.map((n) => [
    `${n.id}   [${n.estado}]   tema: ${n.tema}`,
    `  ES  ${n.es && n.es.titulo}`,
    `  EN  ${n.en && n.en.titulo}`,
    `  qué  ${(n.es && n.es.que) || ''}`,
    `  por qué  ${(n.es && n.es.porque) || ''}`,
    `  impacto  ${(n.es && n.es.impacto) || ''}`,
    `  activos: ${(n.simbolos || []).join(', ') || '—'}   lección: ${n.leccion || '—'}   glosario: ${(n.terminos || []).join(', ') || '—'}`,
    `  fuente: ${n.fuente && n.fuente.url}`,
    ''
  ].join('\n')).join('\n');
}

/** Campos que una persona puede cambiar al revisar. Nada más. */
const EDITABLES = ['tema', 'simbolos', 'principal', 'leccion', 'terminos', 'en', 'es'];

function aplicarEdicion(n, cuerpo) {
  const cambios = {};
  let editado = false;
  for (const campo of EDITABLES) {
    if (!(campo in cuerpo) || cuerpo[campo] === undefined || cuerpo[campo] === null) continue;
    cambios[campo] = cuerpo[campo];
    // Solo el TEXTO cambia la autoría: retocar la etiqueta de tema o añadir un
    // activo no convierte la nota en algo escrito por una persona, pero
    // reescribir el título o los párrafos sí.
    if ((campo === 'en' || campo === 'es') &&
        JSON.stringify(cuerpo[campo]) !== JSON.stringify(n[campo])) editado = true;
  }
  return { cambios, editado };
}

/**
 * La cola de revisión. Devuelve { codigo, cuerpo } y, si se pidió en texto,
 * { codigo, texto }. No toca la respuesta: eso es del router.
 */
async function cola(query = {}) {
  const pedido = String(query.estado || 'borrador').toLowerCase();
  const todas = pedido === 'todas' || pedido === 'todos';
  const estado = todas ? undefined : noticias.estadoPedido(pedido);
  if (!todas && estado === undefined) {
    return { codigo: 400, cuerpo: { error: 'estado_desconocido', valores: noticias.ESTADOS.concat('todas') } };
  }
  const items = await noticias.listar({ estado, limite: query.limite || 30 });
  if (String(query.formato || '') === 'texto') return { codigo: 200, texto: comoTexto(items) };
  return { codigo: 200, cuerpo: { estado: estado || 'todas', total: items.length, items } };
}

/** Aprobar, editar o rechazar. Devuelve { codigo, cuerpo }. */
async function decidir(cuerpo) {
  if (!cuerpo) return { codigo: 400, cuerpo: { error: 'json_invalido' } };

  const id = String(cuerpo.id || '').trim();
  if (!id) return { codigo: 400, cuerpo: { error: 'falta_id' } };
  if (!noticias.ESTADOS.includes(cuerpo.estado)) {
    return { codigo: 400, cuerpo: { error: 'estado_desconocido', valores: noticias.ESTADOS } };
  }

  const actual = await noticias.leer(id);
  if (!actual) return { codigo: 404, cuerpo: { error: 'no_existe', id } };

  const { cambios, editado } = aplicarEdicion(actual, cuerpo);
  const propuesta = Object.assign({}, actual, cambios, {
    estado: cuerpo.estado,
    revisadoEn: new Date().toISOString(),
    revisadoPor: String(cuerpo.revisor || REVISOR).slice(0, 40),
    editadoPorHumano: actual.editadoPorHumano || editado
  });

  // La puerta de verdad: una noticia rota no se aprueba. Rechazar sí se puede
  // siempre — quitar de en medio algo malo nunca puede fallar por culpa de lo
  // malo que es.
  if (propuesta.estado === 'aprobada') {
    const errores = noticias.validar(propuesta);
    if (errores.length) return { codigo: 422, cuerpo: { error: 'noticia_incompleta', errores } };
  }

  await noticias.guardar(propuesta);
  return { codigo: 200, cuerpo: { ok: true, noticia: propuesta } };
}

module.exports = { cola, decidir, aplicarEdicion, comoTexto };
