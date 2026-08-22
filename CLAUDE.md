# SmartFinance.lat

Sitio de educación financiera para jóvenes de prepa y universidad, bilingüe EN/ES. Autor: Jaime (18, México). El sitio es también su proyecto insignia para aplicar a University of Toronto.

## Reglas críticas

- **Push a `main` despliega DIRECTO a producción** (Vercel). Verificar todo localmente antes de subir; los previews de Vercel no sirven para probar.
- **Nunca editar `/es` ni `sitemap.xml` a mano** — `/es` (legacy) se genera con `npm run build:es` (verificar con `npm run check-es`); `sitemap.xml` lo genera Astro en el build desde `src/i18n/routes.ts`.
- El nav está duplicado en las 9 páginas inglesas: un cambio de nav se hace en TODAS.
- Nunca decir "en vivo" en datos de mercado: chip de fuente/retraso/hora (`src/components/SourceChip.astro`) con la cadencia real de actualización.
- Disclaimer educativo obligatorio en el footer de cada página con contenido financiero.
- **No añadir símbolos a `/api/markets`** (Twelve Data): la cuota gratis ya va en 672 de 800 créditos/día. Datos nuevos van por `/api/history` (Yahoo Finance, caché 60 s, gratis) o `/api/quotes` (divisas y VIX, Yahoo, caché 15 min). El registro de activos del sitio es `src/data/symbols.ts`.
- Responsive se verifica con iframes locales de distintos anchos (resize_window no sirve en la pestaña automatizada).

## Stack

- Astro 6 estático (`src/`) + legacy HTML en `public/` mientras migra. Gráficas de precio con Lightweight Charts (`src/scripts/chart-panel.ts`, import dinámico); sparklines en SVG propio. Las lecciones legacy siguen con Chart.js por CDN.
- Funciones serverless CommonJS en `/api` (Vercel). Redis de Upstash vía `api/_lib/redis.js`.
- Boletín diario: cron de Vercel a las 14:00 UTC → `/api/send-newsletter` (Resend, doble opt-in, gráfica del dólar dibujada server-side con `api/_lib/lienzo.js` + `grafica.js`). Modo ensayo: `?dry=1`.
- Env vars (`.env.local`): `TWELVE_DATA_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `KV_REST_API_URL`/`KV_REST_API_TOKEN`.

## Comandos

- `npm run build:es` — regenera todo `/es` legacy desde las páginas inglesas
- `npm run check-es` — corre el generador y falla si `/es` quedó desactualizado
- `npm run build:og` — genera las og:images en español

## Checklist para una página nueva

1. Crear `x/index.html` copiando la estructura de `market/index.html` (diccionario `window.ARTICLE_I18N` + textos marcados con `data-i18n`).
2. Registrar el par EN/ES en el array `PAGINAS` de `scripts/build-es.js` (title/desc/ogTitle/ogDesc en español) y la ruta en `src/i18n/routes.ts` (nav, hreflang y sitemap).
3. `npm run build:es` y luego `npm run check-es`.
4. Añadir el enlace al nav de las 9 páginas inglesas y al footer.
5. og:image 1200×630 + variante `-es` (`scripts/build-og.js`).
6. Disclaimer educativo en el footer.

## Pilares 2026–2027

1. **Portafolio personal en tiempo casi real** — posiciones con tesis en un JSON del repo + precios de `/api/history`.
2. **Reto Actinver en vivo** — prácticas hasta inicios de octubre 2026; luego el reto real con actualización diaria.
3. **Private equity research** — reportes tipo analista con fuentes citadas.

Base transversal: lecciones (6 publicadas) y el boletín.

## Equipo de agentes (`.claude/agents/`)

`finanzas` (datos, portafolio, Actinver, research) · `diseno` (UI/UX y dirección visual) · `creador` (features nuevas) · `gestor` (SEO, checklist pre-deploy, salud del sitio) · `marketing` (contenido, imágenes, boletín). Lanzarlos en paralelo cuando las tareas sean independientes.
