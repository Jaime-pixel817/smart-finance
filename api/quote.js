// Vercel serverless function: cotizaciones de acciones vía Twelve Data.
//
// Antes el navegador llamaba a Twelve Data directo con la API key incrustada en
// el HTML. Dos problemas: la key quedaba pública, y cada visitante gastaba
// cuota propia (5 símbolos cada 60s = 300 llamadas/hora por pestaña abierta,
// suficiente para agotar el plan gratis en una tarde).
//
// Aquí la key vive en process.env y una sola llamada al proveedor sirve a todos
// los visitantes durante el TTL del caché.
//
// El TTL es de 15 minutos porque el plan gratis de Twelve Data da 800 créditos
// al día y cada refresco cuesta 5 (uno por símbolo). A 15 min son 96 refrescos
// diarios = 480 créditos en el peor caso, con margen de sobra; a 60s eran
// ~7,200 y la cuota se agotaba en un par de horas. Para un sitio educativo no
// hacen falta precios al segundo.

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = null;

// Twelve Data devuelve un objeto plano cuando pides un símbolo, y uno indexado
// por símbolo cuando pides varios. Normalizamos a lo segundo.
function normalize(json) {
  if (json && typeof json === 'object' && (json.symbol || json.close)) {
    return { [json.symbol || SYMBOLS[0]]: json };
  }
  return json && typeof json === 'object' ? json : {};
}

module.exports = async function handler(req, res) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.error('TWELVE_DATA_API_KEY no está configurada en el entorno');
    res.status(503).json({ error: 'quotes unavailable' });
    return;
  }

  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    res.status(200).json(cache.body);
    return;
  }

  try {
    const url =
      'https://api.twelvedata.com/quote?symbol=' +
      encodeURIComponent(SYMBOLS.join(',')) +
      '&apikey=' + encodeURIComponent(apiKey);

    const tdRes = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!tdRes.ok) throw new Error('twelvedata responded ' + tdRes.status);

    const json = await tdRes.json();
    if (json && (json.status === 'error' || json.code >= 400)) {
      throw new Error('twelvedata error: ' + (json.message || json.code));
    }

    const raw = normalize(json);
    const quotes = {};
    for (const sym of SYMBOLS) {
      const q = raw[sym];
      if (!q || q.status === 'error') continue;
      const price = parseFloat(q.close);
      const change = parseFloat(q.percent_change);
      if (!isNaN(price)) {
        quotes[sym] = { price, change: isNaN(change) ? null : change };
      }
    }

    if (!Object.keys(quotes).length) throw new Error('no symbols returned data');

    const body = { quotes, asOf: Date.now() };
    cache = { expires: Date.now() + CACHE_TTL_MS, body };

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    res.status(200).json(body);
  } catch (err) {
    console.error('quote fetch failed:', err);
    // Preferimos datos tibios a una sección vacía si el proveedor falla. Aquí
    // el s-maxage sí es corto: son datos viejos, y así reintentamos pronto en
    // vez de congelarlos 15 minutos.
    if (cache) {
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.status(200).json(cache.body);
      return;
    }
    res.status(502).json({ error: 'upstream fetch failed' });
  }
};
