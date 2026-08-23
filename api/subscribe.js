// Alta en el boletín, primer paso del doble opt-in.
//
// Aquí NO se da de alta a nadie de verdad: se guarda como "pending" y se manda
// un correo con un link de confirmación. Mientras no lo abran, esa dirección no
// entra a la lista de envío. Eso evita que alguien suscriba a terceros con su
// correo y es lo que exige cualquier proveedor serio de correo.

const suscriptores = require('./_lib/suscriptores');
const resend = require('./_lib/resend');
const { urlSitio, urlBase, escapar } = require('./_lib/boletin');

const TEXTOS = {
  en: {
    asunto: 'Confirm your Smart Finance subscription',
    titulo: 'One last step',
    cuerpo: 'Tap the button to confirm you want the Smart Finance weekly: the market week, one lesson, and the story that mattered, every Sunday.',
    boton: 'Confirm my subscription',
    ignora: 'If you did not ask for this, ignore this email and nothing will happen.',
    alterno: 'If the button does not work, copy this link into your browser:'
  },
  es: {
    asunto: 'Confirma tu suscripción a Smart Finance',
    titulo: 'Falta un paso',
    cuerpo: 'Toca el botón para confirmar que quieres el boletín semanal de Smart Finance: la semana del mercado, una lección y la noticia que importó, cada domingo.',
    boton: 'Confirmar mi suscripción',
    ignora: 'Si tú no pediste esto, ignora este correo y no pasa nada.',
    alterno: 'Si el botón no funciona, copia este link en tu navegador:'
  }
};

const VERDE = '#0F8A5F';
const FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FUENTE_TITULO = "Georgia,'Times New Roman',serif";

function correoDeConfirmacion(idioma, urlConfirmar) {
  const t = TEXTOS[idioma === 'es' ? 'es' : 'en'];
  const link = escapar(urlConfirmar);
  const html = `<!doctype html><html lang="${idioma}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6F8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #E4E7EC;border-radius:14px;">
  <tr><td style="padding:26px 24px 8px;font-family:${FUENTE_TITULO};font-size:20px;font-weight:700;color:#14161A;">
    Smart <span style="color:${VERDE};">Finance</span>
  </td></tr>
  <tr><td style="padding:6px 24px 0;font-family:${FUENTE_TITULO};font-size:22px;line-height:1.3;font-weight:700;color:#14161A;">${escapar(t.titulo)}</td></tr>
  <tr><td style="padding:10px 24px 0;font-family:${FUENTE};font-size:15px;line-height:1.6;color:#39404A;">${escapar(t.cuerpo)}</td></tr>
  <tr><td style="padding:20px 24px 6px;">
    <a href="${link}" style="display:inline-block;background:${VERDE};color:#FFFFFF;font-family:${FUENTE};font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;">${escapar(t.boton)}</a>
  </td></tr>
  <tr><td style="padding:16px 24px 0;font-family:${FUENTE};font-size:12px;line-height:1.6;color:#5B6470;">
    ${escapar(t.alterno)}<br>
    <a href="${link}" style="color:${VERDE};word-break:break-all;">${link}</a>
  </td></tr>
  <tr><td style="padding:18px 24px 26px;font-family:${FUENTE};font-size:12px;line-height:1.6;color:#8A929C;">${escapar(t.ignora)}</td></tr>
</table>
</td></tr></table></body></html>`;

  const texto = [t.titulo, '', t.cuerpo, '', urlConfirmar, '', t.ignora].join('\n');
  return { asunto: t.asunto, html, texto };
}

function leerCuerpo(req) {
  // Vercel ya parsea el JSON en req.body, pero si llega como texto (o el
  // Content-Type no es el esperado) se intenta parsear a mano.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const cuerpo = leerCuerpo(req);
  const correo = String(cuerpo.email || '').trim();
  const idioma = cuerpo.lang === 'es' ? 'es' : 'en';

  // Honeypot: un campo que ningún humano ve. Si viene lleno es un bot, y se le
  // responde "ok" a propósito: si le dijéramos que falló, quien lo programó
  // ajustaría hasta pasar. Simplemente no se guarda nada.
  if (String(cuerpo.website || '').trim() !== '') {
    console.warn('alta descartada por honeypot');
    res.status(200).json({ ok: true });
    return;
  }

  // El consentimiento es obligatorio y se valida también aquí, no solo en el
  // navegador: el formulario se puede saltar con un POST directo.
  if (cuerpo.consent !== true && cuerpo.consent !== 'true' && cuerpo.consent !== 'on') {
    res.status(400).json({ error: 'consent_required' });
    return;
  }

  if (!suscriptores.correoValido(correo)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (!(await suscriptores.dentroDelLimite(ip))) {
      console.warn('límite de altas alcanzado para una IP');
      res.status(429).json({ error: 'rate_limited' });
      return;
    }

    const { registro, yaConfirmado } = await suscriptores.registrarPendiente(correo, idioma);

    // Si ya estaba confirmado no se reenvía nada, pero se responde igual que en
    // el caso normal: así esta URL no sirve para averiguar quién está suscrito.
    if (yaConfirmado) {
      res.status(200).json({ ok: true });
      return;
    }

    const urlConfirmar = urlSitio() + '/api/confirm?token=' + encodeURIComponent(registro.tokenConfirmacion) +
      '&email=' + encodeURIComponent(registro.correo);

    const { asunto, html, texto } = correoDeConfirmacion(idioma, urlConfirmar);
    await resend.enviarCorreo({ para: registro.correo, asunto, html, texto });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('alta fallida:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'subscribe_failed' });
  }
};

module.exports.correoDeConfirmacion = correoDeConfirmacion;
