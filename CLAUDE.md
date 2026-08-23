# SmartFinance.lat

Sitio de educación financiera para jóvenes de prepa y universidad, bilingüe EN/ES. Autor: Jaime (18, México). El sitio es también su proyecto insignia para aplicar a University of Toronto.

## Reglas críticas

- **Push a `main` despliega DIRECTO a producción** (Vercel). Verificar todo localmente antes de subir; los previews de Vercel no sirven para probar.
- **Nunca editar `/es` ni `sitemap.xml` a mano** — lo que quede de `/es` legacy se genera con `npm run build:es` (verificar con `npm run check-es`; hoy todas las páginas de `PAGINAS` son Astro); `sitemap.xml` lo genera Astro en el build desde `src/i18n/routes.ts`.
- Las páginas Astro comparten `src/layouts/Base.astro` (TopBar, BottomNav, Footer con disclaimer): un cambio de nav se hace una sola vez ahí. Solo `public/newsletter/*` sigue siendo HTML legacy.
- Nunca decir "en vivo" en datos de mercado: chip de fuente/retraso/hora (`src/components/SourceChip.astro`) con la cadencia real de actualización.
- Disclaimer educativo obligatorio en el footer de cada página con contenido financiero.
- **Ningún texto de IA se publica sin que Jaime lo apruebe.** Las noticias de `/news` nacen como `borrador` y solo aparecen en el sitio cuando una persona las pasa a `aprobada`. Pedir borradores por la vía pública (`/api/news?estado=borradores`) devuelve 403 a propósito: es la promesa del sitio, no un detalle.
- **No añadir símbolos a `/api/markets`** (Twelve Data): la cuota gratis ya va en 672 de 800 créditos/día. Datos nuevos van por `/api/history` (Yahoo Finance, caché 60 s, gratis) o `/api/quotes` (divisas y VIX, Yahoo, caché 15 min). El registro de activos del sitio es `src/data/symbols.ts`.
- Los ocho índices del globo del home salen de `/api/world` (Yahoo Finance, caché 15 min, UNA llamada por visita); abierto/cerrado lo decide `src/scripts/exchange-hours.ts` (horario regular, sin festivos). **La BMV no tiene horario fijo**: homologa su sesión con Nueva York y México ya no cambia de hora, así que opera 7:30–14:00 mientras EE. UU. está en horario de verano y 8:30–15:00 el resto del año. Lo calcula `src/lib/market/bmv.mjs` (única fuente, con pruebas) restando el adelanto real del reloj de Nueva York; NO metas una tabla de fechas, caduca cada año y falla en silencio — así estuvo el sitio diciendo "BMV abierta" una hora después del cierre y la leyenda/tarjeta las pinta `src/scripts/world-markets.ts` (`src/components/home/WorldMarkets.astro`). El globo (`public/assets/risk-sphere.js`) escucha `world:data` / `world:select` / `world:pins` / `globe:visible` y emite `globe:marker` y `globe:pins`.
- Responsive se verifica con iframes locales de distintos anchos (resize_window no sirve en la pestaña automatizada).

## Stack

- **El hero del home es el globo** (`src/components/home/Hero.astro` + `src/scripts/hero.ts`): a sangre, fijo arriba, 56 svh en el teléfono y 64 svh en escritorio, fundido hacia abajo con `mask-image`; el titular en Fraunces y la línea mono (fecha · NYSE · BMV) van encima. La barra superior va en modo `overlay` (`position: fixed` y transparente) y se pone sólida al salir del hero; al terminar el scroll el globo se encoge y aterriza como ícono en ella (scroll-timeline donde lo hay, `IntersectionObserver` + transform donde no). Dos o tres marcadores llevan pegado su cambio del día. **Regla:** el globo nace YA FORMADO y en la orientación del SVG estático — nada de entradas de partículas dispersas, que ahí se ve un globo deshacerse.
- **Primer pintado sin hueco**: `src/generated/globe-fallback.svg` (2.3 KB, lo genera `scripts/build-geo.mjs` desde la máscara de tierra) va inline en el hero, en el mismo sitio y tamaño que el lienzo, y se funde a 0 cuando WebGL empieza a pintar. Cero CLS.
- **La geografía del globo** son cuatro binarios en `public/assets/geo/` (`land.bin` 1440×720 a un bit por píxel, `country.bin` en RLE, `border-pos.bin` + `border-edges.bin`): 204 KB en crudo, ~75 KB comprimidos, contra los 551 KB de base64 de `public/assets/geoMasks.js` — que ya NO se sirve (`.vercelignore`, y ojo: la ruta correcta es `/public/assets/geoMasks.js`). Los genera `node scripts/build-geo.mjs`, se commitean, y los pide el globo con `fetch` + `ArrayBuffer` dentro de su arranque diferido. Tierra/mar y país van por atributo de vértice: cero trabajo por frame. Si no llegan, el globo se pinta monocromo y no se rompe nada.
- El id de país de cada bolsa (`countryId` en `src/data/world.ts`) sale de LEER `country.bin` en las coordenadas del marcador — lo imprime `scripts/build-geo.mjs` al final. Si se regenera la máscara, hay que volver a copiarlos.
- **Fotos**: `node scripts/build-photos.mjs` recorta las miniaturas y los avatares con el punto focal ESCRITO de cada foto (`sharp.strategy.attention` falla: dejó la entrevista con Andy Toh convertida en una mesa de centro). `object-position` por foto en `src/data/home.ts`.
- El globo (`public/assets/risk-sphere.js` + three.js r128 por CDN) arranca tras el evento `load` en tiempo ocioso, respeta `prefers-reduced-motion` y es el Globo de mercados (sol real + 8 bolsas desde `/api/world` + tierra, fronteras y país encendido).
- Astro 6 estático (`src/`) + legacy HTML en `public/` mientras migra (solo las páginas de estado del boletín). Gráficas de precio con Lightweight Charts (`src/scripts/chart-panel.ts`, import dinámico); sparklines y la calculadora de interés compuesto en SVG propio (sin Chart.js ni CDN).
- **Lecciones en MDX**: `src/content/lessons/{en,es}/<slug>.mdx` (colección `lessons`, schema Zod en `src/content.config.ts`: ≥ 2 fuentes verificadas con fecha, ruta de aprendizaje, orden, fechas, glosario). Rutas de aprendizaje y helpers en `src/data/lessons.ts`; páginas en `src/pages/lessons*` y `src/pages/es/lecciones*`; layout de lectura `src/components/learn/LessonArticle.astro`. Una lección nueva = MDX EN + MDX ES (mismo slug) + entrada en `LESSON_ROUTE` y en `src/i18n/routes.ts`.
- **Glosario al tacto**: `src/data/glossary.json` (EN/ES, "En pesos:", lección) + `<Term id="...">` en los MDX + `GlossarySheet.astro`; páginas A–Z `/lessons/glossary` y `/es/lecciones/glosario`. Todo término nuevo va al JSON, no en el texto.
- **Noticias explicadas** (`/news`, `/es/noticias`, y una página por noticia): **todo vive en `api/news.js`**, que es el router: `?estado=aprobadas` (público), `?accion=revision` (la cola, `CRON_SECRET`), `POST {accion:'generar'}` (borradores) y `POST {accion:'decidir'}` (aprobar/editar/rechazar). La lógica está en `api/_lib/noticias.js` (almacén en Redis), `api/_lib/borradores.js` y `api/_lib/revision.js`. **No se separan en endpoints propios**: el plan de Vercel admite **12 funciones por despliegue** y el sitio ya está justo en 12 — dos archivos nuevos en `api/` tumban el despliegue entero con `exceeded_serverless_functions_per_deployment`, con el build ya terminado. Lo que empieza por guion bajo (`api/_lib/`) no cuenta. Los borradores los dispara **GitHub Actions** (`.github/workflows/news-draft.yml`, 11:30 UTC; el plan de Vercel no admite un segundo cron) → hasta **3 borradores al día** con `claude-haiku-4-5` (~$0.01/día; el cálculo está en el encabezado de `api/_lib/borradores.js` y el tope de 3 es el freno de gasto). El índice se pinta en cliente desde el endpoint, así que **aprobar se ve en un minuto sin desplegar**; las páginas `/news/<slug>` se generan en el build desde `src/data/news/*.json`. Entre las dos cosas, la reescritura de `vercel.json` manda `/news/<slug>` a `/news-read`, que pinta la misma noticia desde el endpoint: nunca hay enlace roto. Los JSON viven en `src/data/news/` y **no** en `content/` porque `.vercelignore` excluye `/content` del despliegue y el build de Vercel no los vería.
- El HTML de una noticia lo escriben DOS sitios: `src/components/news/NewsStory.astro` (build) y `src/scripts/news-shared.ts` (navegador). Por eso sus estilos son globales (`src/styles/news.css`) y no `<style>` scoped: con scoped, la versión pintada en cliente saldría sin formato. Si cambia la estructura de uno, cambia el otro.
- `/about` y `/methodology` (`src/components/about/*`): la metodología documenta cadencias y retrasos reales de `/api`; si cambia un endpoint, se actualiza la tabla y el changelog.
- Funciones serverless CommonJS en `/api` (Vercel). Redis de Upstash vía `api/_lib/redis.js`.
- Boletín diario: cron de Vercel a las 14:00 UTC → `/api/send-newsletter` (Resend, doble opt-in, gráfica del dólar dibujada server-side con `api/_lib/lienzo.js` + `grafica.js`). Modo ensayo: `?dry=1`.
- Env vars (`.env.local`): `TWELVE_DATA_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET` (boletín **y** revisión de noticias), `KV_REST_API_URL`/`KV_REST_API_TOKEN`.

## Comandos

- `npm run build:es` — regenera todo `/es` legacy desde las páginas inglesas
- `npm run check-es` — corre el generador y falla si `/es` quedó desactualizado
- `npm run build:og` — genera las og:images en español
- `node scripts/build-geo.mjs` — regenera `public/assets/geo/*.bin` y el SVG del hero (solo si cambian las máscaras)
- `node scripts/build-photos.mjs` — regenera miniaturas de breakdowns y avatares de Jaime
- `npm run news:sync` — baja las noticias aprobadas de Redis a `src/data/news/*.json` (después: commit y push)

## Publicar una noticia (lo hace Jaime, todos los días)

1. Abrir **https://smartfinance.lat/review.html** y pegar el `CRON_SECRET` (el mismo del boletín, está en `.env.local` y en las variables de Vercel). Se guarda solo en esa pestaña.
2. Salen los borradores del día. Cada uno trae el texto completo en español y en inglés, editable, con el enlace al artículo original al lado. **Leer el original antes de aprobar**: la IA solo puede usar lo que dice el titular y el resumen, y eso hay que comprobarlo.
3. Tres botones: **Aprobar** (sale tal cual), **Aprobar con mis cambios** (sale con el texto editado y la etiqueta pasa de “Resumen IA · revisado por Jaime” a “Escrito por Jaime”), **Rechazar**.
4. Lo aprobado aparece en `/news` en menos de un minuto. Si el botón se queja, dice exactamente qué le falta a la noticia.
5. Cuando dé la gana (una vez por semana basta), desde la terminal: `npm run news:sync` y commit de `src/data/news/`. Eso le da a cada noticia su página permanente en el siguiente despliegue. Antes de eso la URL ya funciona, servida desde el endpoint.

Sin abrir el navegador, lo mismo con `curl` (ejemplos en el encabezado de `api/_lib/revision.js`).

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
