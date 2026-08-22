# SmartFinance.lat

Sitio de educación financiera para jóvenes de prepa y universidad, bilingüe EN/ES. Autor: Jaime (18, México). El sitio es también su proyecto insignia para aplicar a University of Toronto.

## Reglas críticas

- **Push a `main` despliega DIRECTO a producción** (Vercel). Verificar todo localmente antes de subir; los previews de Vercel no sirven para probar.
- **Nunca editar `/es` ni `sitemap.xml` a mano** — lo que quede de `/es` legacy se genera con `npm run build:es` (verificar con `npm run check-es`; hoy todas las páginas de `PAGINAS` son Astro); `sitemap.xml` lo genera Astro en el build desde `src/i18n/routes.ts`.
- Las páginas Astro comparten `src/layouts/Base.astro` (TopBar, BottomNav, Footer con disclaimer): un cambio de nav se hace una sola vez ahí. Solo `public/newsletter/*` sigue siendo HTML legacy.
- Nunca decir "en vivo" en datos de mercado: chip de fuente/retraso/hora (`src/components/SourceChip.astro`) con la cadencia real de actualización.
- Disclaimer educativo obligatorio en el footer de cada página con contenido financiero.
- **No añadir símbolos a `/api/markets`** (Twelve Data): la cuota gratis ya va en 672 de 800 créditos/día. Datos nuevos van por `/api/history` (Yahoo Finance, caché 60 s, gratis) o `/api/quotes` (divisas y VIX, Yahoo, caché 15 min). El registro de activos del sitio es `src/data/symbols.ts`.
- Responsive se verifica con iframes locales de distintos anchos (resize_window no sirve en la pestaña automatizada).

## Stack

- El globo del home (`public/assets/risk-sphere.js` + three.js r128 por CDN con `defer`) arranca tras el evento `load`, respeta `prefers-reduced-motion` y es el Globo de mercados (sol real + 8 bolsas desde `/api/world`).
- Astro 6 estático (`src/`) + legacy HTML en `public/` mientras migra (solo las páginas de estado del boletín). Gráficas de precio con Lightweight Charts (`src/scripts/chart-panel.ts`, import dinámico); sparklines y la calculadora de interés compuesto en SVG propio (sin Chart.js ni CDN).
- **Lecciones en MDX**: `src/content/lessons/{en,es}/<slug>.mdx` (colección `lessons`, schema Zod en `src/content.config.ts`: ≥ 2 fuentes verificadas con fecha, ruta de aprendizaje, orden, fechas, glosario). Rutas de aprendizaje y helpers en `src/data/lessons.ts`; páginas en `src/pages/lessons*` y `src/pages/es/lecciones*`; layout de lectura `src/components/learn/LessonArticle.astro`. Una lección nueva = MDX EN + MDX ES (mismo slug) + entrada en `LESSON_ROUTE` y en `src/i18n/routes.ts`.
- **Glosario al tacto**: `src/data/glossary.json` (EN/ES, "En pesos:", lección) + `<Term id="...">` en los MDX + `GlossarySheet.astro`; páginas A–Z `/lessons/glossary` y `/es/lecciones/glosario`. Todo término nuevo va al JSON, no en el texto.
- `/about` y `/methodology` (`src/components/about/*`): la metodología documenta cadencias y retrasos reales de `/api`; si cambia un endpoint, se actualiza la tabla y el changelog.
- Funciones serverless CommonJS en `/api` (Vercel). Redis de Upstash vía `api/_lib/redis.js`.
- Boletín diario: cron de Vercel a las 14:00 UTC → `/api/send-newsletter` (Resend, doble opt-in, gráfica del dólar dibujada server-side con `api/_lib/lienzo.js` + `grafica.js`). Modo ensayo: `?dry=1`.
- Env vars (`.env.local`): `TWELVE_DATA_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `KV_REST_API_URL`/`KV_REST_API_TOKEN`.

## Comandos

- `npm run build:es` — regenera todo `/es` legacy desde las páginas inglesas
- `npm run check-es` — corre el generador y falla si `/es` quedó desactualizado
- `npm run build:og` — genera las og:images en español

## Checklist para una página nueva (Astro)

1. Crear `src/pages/<ruta>.astro` y `src/pages/es/<ruta-es>.astro` usando `Base.astro` (title, description, routeId, active, jsonLd; textos de UI en `src/i18n/ui.ts`, nunca sueltos en inglés dentro de `/es`).
2. Registrar el par EN/ES en `src/i18n/routes.ts` (canonical, hreflang, nav, sitemap) y, si aplica, en el buscador (`src/pages/search-index.json.ts`) y en el footer.
3. og:image 1200×630 + variante `-es` (`scripts/build-og.js`) o reutilizar una existente.
4. `npm run build`, `npx astro check`, `npm run check-es`; capturas a 500×900 y 1280×800; Lighthouse móvil ≥ 90 / a11y ≥ 95.
5. Disclaimer educativo (el footer de `Base.astro` ya lo lleva; las páginas financieras añaden el suyo en línea).

## Pilares 2026–2027

1. **Portafolio personal en tiempo casi real** — posiciones con tesis en un JSON del repo + precios de `/api/history`.
2. **Reto Actinver en vivo** — prácticas hasta inicios de octubre 2026; luego el reto real con actualización diaria.
3. **Private equity research** — reportes tipo analista con fuentes citadas.

Base transversal: lecciones (6 publicadas en MDX, tres rutas de aprendizaje, glosario al tacto) y el boletín.

## Equipo de agentes (`.claude/agents/`)

`finanzas` (datos, portafolio, Actinver, research) · `diseno` (UI/UX y dirección visual) · `creador` (features nuevas) · `gestor` (SEO, checklist pre-deploy, salud del sitio) · `marketing` (contenido, imágenes, boletín). Lanzarlos en paralelo cuando las tareas sean independientes.
