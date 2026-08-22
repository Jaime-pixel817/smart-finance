// Puente para /api: el archivo real vive en public/assets/market-hours.js
// (desde la migración a Astro el sitio se sirve desde public/), y
// api/_lib/boletin.js lo sigue requiriendo por esta ruta. Vercel incluye el
// archivo en la función porque sigue el require. No hay dos copias: esta
// línea es la única lógica de aquí.
module.exports = require('../public/assets/market-hours.js');
