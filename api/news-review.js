// La mesa de revisión: aquí una persona lee los borradores y decide.
//
// Es el único sitio donde una noticia pasa de "la escribió una IA" a "está
// publicada en smartfinance.lat". Sin este paso no sale nada: /api/news solo
// sirve las que tienen estado "aprobada", y el build solo genera páginas de
// las que están en src/data/news/.
//
// CÓMO SE USA
//   Desde el teléfono: https://smartfinance.lat/review.html (pide el secreto).
//   Desde la terminal:
//     export CRON_SECRET=...   # el mismo del boletín, en .env.local
//     # ver los borradores de hoy
//     curl -H "Authorization: Bearer $CRON_SECRET" \
//       "https://smartfinance.lat/api/news-review?formato=texto"
//     # aprobar uno tal cual está
//     curl -X POST -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
//       -d '{"id":"2026-08-22-mi-slug","estado":"aprobada"}' \
//       https://smartfinance.lat/api/news-review
//     # aprobar cambiando el texto en español
//     curl -X POST ... -d '{"id":"...","estado":"aprobada","es":{"titulo":"...","que":"...","porque":"...","impacto":"..."}}'
//     # rechazar
//     curl -X POST ... -d '{"id":"...","estado":"rechazada"}'
//
// POR QUÉ EL MISMO CRON_SECRET QUE EL BOLETÍN
//   Es el secreto de operación del sitio y ya protege /api/send-newsletter y
//   /api/newsletter-log. Un segundo secreto sería una segunda cosa que rotar,
//   que perder y que olvidar; la comparación es en tiempo constante en
//   _lib/secreto.js, igual para los tres.

const { autorizado } = require('./_lib/secreto');
const noticias = require('./_lib/noticias');

const REVISOR = 'Jaime';

function leerCuerpo(req) {
  // Vercel ya parsea el JSON en req.body; en una prueba con req/res falsos
  // puede llegar como cadena.
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch (e) { return null; } }
  return b;
}

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

module.exports = async function handler(req, res) {
  if (!autorizado(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  // Una mesa de revisión cacheada contestaría con los borradores de hace una
  // hora justo cuando se está decidiendo qué publicar.
  res.setHeader('Cache-Control', 'no-store');

  const metodo = String(req.method || 'GET').toUpperCase();

  try {
    // ---- Ver la cola ------------------------------------------------------
    if (metodo === 'GET') {
      const q = req.query || {};
      const pedido = String(q.estado || 'borrador').toLowerCase();
      const estado = pedido === 'todas' || pedido === 'todos' ? undefined : noticias.estadoPedido(pedido);
      if (estado === undefined && pedido !== 'todas' && pedido !== 'todos') {
        res.status(400).json({ error: 'estado_desconocido', valores: noticias.ESTADOS.concat('todas') });
        return;
      }
      const items = await noticias.listar({ estado, limite: q.limite || 30 });

      if (String(q.formato || '') === 'texto') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(comoTexto(items));
        return;
      }
      res.status(200).json({ estado: estado || 'todas', total: items.length, items });
      return;
    }

    // ---- Decidir ----------------------------------------------------------
    if (metodo === 'POST') {
      const cuerpo = leerCuerpo(req);
      if (!cuerpo) { res.status(400).json({ error: 'json_invalido' }); return; }

      const id = String(cuerpo.id || '').trim();
      if (!id) { res.status(400).json({ error: 'falta_id' }); return; }
      if (!noticias.ESTADOS.includes(cuerpo.estado)) {
        res.status(400).json({ error: 'estado_desconocido', valores: noticias.ESTADOS });
        return;
      }

      const actual = await noticias.leer(id);
      if (!actual) { res.status(404).json({ error: 'no_existe', id }); return; }

      const { cambios, editado } = aplicarEdicion(actual, cuerpo);
      const propuesta = Object.assign({}, actual, cambios, {
        estado: cuerpo.estado,
        revisadoEn: new Date().toISOString(),
        revisadoPor: String(cuerpo.revisor || REVISOR).slice(0, 40),
        editadoPorHumano: actual.editadoPorHumano || editado
      });

      // La puerta de verdad: una noticia rota no se aprueba. Rechazar sí se
      // puede siempre — quitar de en medio algo malo nunca puede fallar por
      // culpa de lo malo que es.
      if (propuesta.estado === 'aprobada') {
        const errores = noticias.validar(propuesta);
        if (errores.length) {
          res.status(422).json({ error: 'noticia_incompleta', errores });
          return;
        }
      }

      await noticias.guardar(propuesta);
      res.status(200).json({ ok: true, noticia: propuesta });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'metodo_no_permitido' });
  } catch (err) {
    const noConfigurado = err && err.code === 'REDIS_NO_CONFIGURADO';
    console.error('news-review falló:', err && err.message ? err.message : err);
    res.status(noConfigurado ? 500 : 502).json({
      error: noConfigurado ? 'redis_no_configurado' : 'revision_fallida',
      detalle: err && err.message ? err.message : String(err)
    });
  }
};

module.exports.aplicarEdicion = aplicarEdicion;
