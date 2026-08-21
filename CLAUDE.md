# SmartFinance.lat

Sitio de educación financiera para jóvenes de prepa y universidad, bilingüe EN/ES. Autor: Jaime (18, México). El sitio es también su proyecto insignia para aplicar a University of Toronto.

## Reglas críticas

- **Push a `main` despliega DIRECTO a producción** (Vercel). Verificar todo localmente antes de subir; los previews de Vercel no sirven para probar.
- **Nunca editar `/es` ni `sitemap.xml` a mano** — se generan con `npm run build:es`; verificar con `npm run check-es`.
- El nav está duplicado en las 9 páginas inglesas: un cambio de nav se hace en TODAS.
- Nunca decir "en vivo" en datos de mercado: usar `assets/source.js` con la cadencia real de actualización.
- Disclaimer educativo obligatorio en el footer de cada página con contenido financiero.
- **No añadir símbolos a `/api/markets`** (Twelve Data): la cuota gratis ya va en 672 de 800 créditos/día. Datos nuevos van por `/api/history` (Yahoo Finance, caché 60 s, gratis).
- Responsive se verifica con iframes locales de distintos anchos (resize_window no sirve en la pestaña automatizada).

## Stack

- HTML estático + JS vanilla. Sin framework, sin bundler, sin build del sitio. Chart.js 4.4 y three.js por CDN.
- Funciones serverless CommonJS en `/api` (Vercel). Redis de Upstash vía `api/_lib/redis.js`.
- Boletín diario: cron de Vercel a las 14:00 UTC → `/api/send-newsletter` (Resend, doble opt-in, gráfica del dólar dibujada server-side con `api/_lib/lienzo.js` + `grafica.js`). Modo ensayo: `?dry=1`.
- Env vars (`.env.local`): `TWELVE_DATA_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `KV_REST_API_URL`/`KV_REST_API_TOKEN`.

## Comandos

- `npm run build:es` — regenera todo `/es` + `sitemap.xml` desde las páginas inglesas
- `npm run check-es` — corre el generador y falla si `/es` o el sitemap quedaron desactualizados
- `npm run build:og` — genera las og:images en español

## Checklist para una página nueva

1. Crear `x/index.html` copiando la estructura de `market/index.html` (diccionario `window.ARTICLE_I18N` + textos marcados con `data-i18n`).
2. Registrar el par EN/ES en el array `PAGINAS` de `scripts/build-es.js` (title/desc/ogTitle/ogDesc en español) y su entrada en `METADATOS`.
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
