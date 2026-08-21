# SmartFinance.lat — Plan maestro 2026-08-24 → 2027-01-15

> **Para agentes ejecutores:** este es el plan de programa. Cada semana se convierte en un plan ejecutable con `superpowers:writing-plans` (guardado en `docs/superpowers/plans/YYYY-MM-DD-<tema>.md`) y se ejecuta con `superpowers:subagent-driven-development` (TDD, un subagente por tarea, revisión entre tareas).

**Goal:** convertir smartfinance.lat en un producto creíble (markets honestos + lecciones con fuentes + Smart Finance Research con un Equity Research Report interactivo) publicado antes del 15-nov-2026, con CI, tests y políticas de datos/IA, sin gastar dinero.

**Architecture:** Astro 6 estático (sin adapter) + islas Preact solo donde hay interacción; contenido en MDX (content collections) bilingüe con i18n nativo; `/api` serverless CommonJS intacto; CI en GitHub Actions; `main` protegido con previews de Vercel.

**Tech Stack:** Astro 6.x, Preact + signals, MDX, Lightweight Charts v5 (islas), SVG generado en build, Vitest, ESLint, Lighthouse CI, Vercel Hobby, Upstash, Resend, Claude Code + superpowers.

**Spec:** `scratchpad/audit-findings.md` (auditoría 2026-08-21; no se repite aquí).

## Global Constraints

- Node ≥ 22 (Astro 6); local hay v24.18; fijar Node 22.x en Vercel.
- `package.json` sigue `"type": "commonjs"` (los `/api/*.js` usan `require`); config de Astro en `.mjs`.
- Vercel Hobby: 1 M invocaciones/mes, crons 1×/día (±59 min), 100 deploys/día, uso no comercial.
- Presupuesto móvil: Performance ≥ 90, LCP < 2.5 s, TBT < 200 ms, JS ≤ 150 KB gz por página.
- Nunca "en vivo"; toda cifra con fuente + `asOf`; disclaimer educativo en cada página financiera.
- Jaime: 10–15 h/semana; Claude Code hace la mayor parte del código; Jaime decide, revisa, graba y firma.

---

## 0. Hechos verificados hoy (2026-08-21)

| Tema | Dato verificado | Fuente / nota |
|---|---|---|
| OUAC 105 (otoño 2027) | Abre **17-sep-2026** (sujeto a cambio); OUAC entrega datos a universidades ~21-ene-2027 | stellaradvisers.com citando calendario OUAC; página OUAC devolvió 403 → reverificar en ouac.on.ca |
| U of T general | Tabla oficial aún muestra ciclo 2026: recomendado **7-nov**, documentos tempranos **2-dic**, límite **15-ene**, algunos programas 2-feb | future.utoronto.ca/deadlines (revisar cuando publiquen 2027, normalmente sept–oct) |
| Rotman Commerce 2027 (ya publicado) | Solicitud temprana **7-nov-2026**; suplementaria temprana **1-dic-2026**; solicitud final **15-ene-2027**; suplementaria/documentos **1-feb-2027**; "submitting after Dec 1 may delay to March round" | rotmancommerce.utoronto.ca/future-students/important-dates |
| Reto Actinver 2026 | Inscripciones 27-jul → 4-oct; **práctica 28-sep → 2-oct; reto real 5-oct → 13-nov**; premiación dic (BMV) | retoactinver.com (resumen de búsqueda; confirmar en la cuenta) |
| Vercel Hobby | 1 M invocaciones, 4 CPU-h, 360 GB-h, 1 M edge requests, 100 deploys/día, cron 100/proyecto **1×/día ±59 min**, Web Analytics **50 k eventos/mes, ventana 1 mes, sin eventos custom**, Speed Insights 10 k, logs 1 h, función máx 300 s, **no comercial** | vercel.com/docs/plans/hobby, /docs/cron-jobs/usage-and-pricing |
| GitHub Actions | Gratis e ilimitado en repos públicos (el repo lo es) | github.blog changelog 2025-12 |
| Astro 6 | Estable desde mar-2026; Node ≥ 22; cambió el default de `i18n.routing.redirectToDefaultLocale`; Fonts API, CSP nativo, Live Content Collections; Zod v4 | astro.build/blog, southwellmedia |
| Astro + Vercel | Sitio estático = zero-config sin adapter; el adapter solo hace falta para SSR/ISR/Image API; con adapter, la carpeta raíz `/api` **no se sirve** (issue withastro/astro#5451) | vercel.com/docs/frameworks/frontend/astro |
| Gráficas | Lightweight Charts v5 ≈ 35 KB gz, Apache-2.0 **con atribución obligatoria** a TradingView; uPlot ≈ 15 KB gz MIT; Chart.js ≈ 60 KB gz | tradingview.github.io, bundlephobia |
| Email / Redis | Resend free **100/día, 3 000/mes**, 1 dominio; Upstash free 500 k comandos/mes, 256 MB | resend.com, upstash.com |

---

## A. Decisión de stack

### A.1 Comparativa

| Criterio | (a) HTML + vanilla + Vite/11ty | (b) **Astro 6 estático + islas Preact + MDX + i18n nativo, `/api` intacto** | (c) Next.js |
|---|---|---|---|
| Duplicación nav/footer (18 archivos) | Se resuelve solo si añadimos plantillas (11ty) — a medias | Layouts + componentes: se resuelve de raíz | Se resuelve |
| i18n con slugs traducidos (/market ↔ /es/mercado) | A mano otra vez (otro build-es) | `i18n.locales` + registro de rutas; hreflang en layout | Middleware + carpetas `[lang]`; más código |
| Lecciones/research en MDX con frontmatter tipado | No (11ty sí, sin tipos) | Content collections + Zod | MDX sí, pero sin colecciones nativas |
| JS en cliente | Lo que escribamos | 0 KB por defecto; islas solo en gráficas/DCF | React runtime ≈ 90 KB + hidratación |
| `/api` CommonJS actual | Intacto | **Intacto** (sin adapter, zero-config de Vercel) | Hay que portar a route handlers |
| Lighthouse ≥ 90 móvil | Posible, pero manual | Natural | Posible con trabajo |
| Coste de migración | 1 sem (y seguimos con build-es) | **3 semanas incrementales, ~40 h** | 4–5 semanas, todo o nada |
| Ajuste con Claude Code | Bueno | Muy bueno (Astro es HTML + frontmatter) | Bueno |
| Riesgo | Deuda se queda | Bajo | Sobre-ingeniería para un sitio de contenido |

**Recomendación: (b).** Astro resuelve exactamente los tres dolores de la auditoría (duplicación, i18n por regex, peso JS) sin tocar el backend ni convertir el sitio en una app. Next.js solo tendría sentido con usuarios/auth, que están fuera del MVP. Si algún día hace falta SSR (páginas por ticker bajo demanda), se añade `@astrojs/vercel` y se portan los endpoints (≈ 2 días); no antes.

### A.2 Decisiones secundarias

| Tema | Decisión | Por qué / coste |
|---|---|---|
| Gráficas | **Lightweight Charts v5** como isla perezosa para series de precio (market, sparklines, Actinver, portafolio); **SVG generado en build** para gráficas del research (barras, márgenes, football field); el DCF interactivo es una isla Preact que re-renderiza SVG. Chart.js se retira. | LWC: UX financiera (crosshair, touch, velas) a 35 KB; la atribución a TradingView ya encaja con nuestra política de fuentes. SVG estático = 0 JS, imprimible y reutilizable como PNG para LinkedIn/IG. uPlot (15 KB) es el plan B si el presupuesto JS aprieta. |
| i18n | `i18n: { locales: ['en','es'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } }`; textos de UI en `src/i18n/ui.ts` (tipado, `t(locale)`); rutas traducidas en `src/i18n/routes.ts`; contenido en `src/content/{lessons,research}/{en,es}/`; componente `<Hreflang>` en `BaseLayout` que emite en/es/x-default desde el registro; `src/pages/sitemap.xml.ts` generado desde el mismo registro. | Sustituye `build-es.js` (607 líneas de regex). Un test de paridad (`parity.test.ts`) falla si a una página EN le falta su ES o su `updated` es más viejo: ese es el nuevo `check-es`. |
| `/es` en build | Se borra `es/` del repo; Astro lo genera en `dist/` (ignorado) | −4 300 líneas generadas commiteadas; cero riesgo de desincronía |
| Tipografías | Geist Sans **variable** (1 woff2, subset latin) + Geist Mono variable (solo donde haya números tabulares) + Fraunces **subset** solo para H1/wordmark; `font-display: swap`, `preload` de la sans, fallbacks con `size-adjust`. Fonts API de Astro 6 (provider local). | De 9 woff2 (≈193 KB) a 3 (≈70 KB). |
| Imágenes | `src/assets/` + `<Picture>` (sharp en build → AVIF/WebP, srcset); og:images generadas en build a `public/og/` | jaime.jpg 279 KB → ≈15 KB a 260 px |
| CI (GitHub Actions, gratis) | `ci.yml` en cada PR: `npm ci` → `astro check` → `eslint` → `vitest run` → `astro build` → `lychee` (links internos sobre `dist/`) → **Lighthouse CI** (`treosh/lighthouse-ci-action`, `staticDistDir: dist`, 3 runs, assertions: performance ≥ 0.9, LCP < 2500, TBT < 200, total-byte-weight < 600 KB, `resource-summary:script:size` < 150 KB) en `/`, `/market`, `/lessons/inflacion`, `/research/<empresa>`. `lighthouse-prod.yml` semanal contra producción. | ≈ 5 min por PR; sobre `dist/` estático las llamadas a `/api` fallan y muestran el esqueleto: mide el presupuesto, no los datos. |
| Ramas y deploy | `main` protegido (PR obligatorio, checks `ci` + `lighthouse` requeridos, sin force-push, historia lineal, incluye admins); ramas `feat/*`, `fix/*`, `content/*`; squash merge; Vercel: producción solo desde `main`, preview por PR (desactivar Vercel Authentication en previews para compartir con un profesor). Jaime no puede aprobar su propio PR: la "aprobación" = CI verde + `/code-review` de Claude pegado como comentario + plantilla de PR con checklist. | Elimina "push a main = producción". Coste: 30 min. |
| Tests mínimos | Vitest. Unit: `src/lib/finance/` (dcf, wacc, cagr, irr, interés compuesto, sensibilidad), `src/lib/format/` (moneda, %, fechas por locale), `src/i18n/parity`. Smoke de `/api`: importar los handlers CJS con `fetch` stubbeado (`vi.stubGlobal`) y `node-mocks-http`; verificar forma del JSON, `asOf` y fallback Yahoo. | El DCF con tests es lo que convence a un profesor: las cifras del reporte salen de funciones probadas. |
| Analítica | **Vercel Web Analytics** (gratis, sin cookies, 50 k eventos) + Speed Insights (RUM de Core Web Vitals). Plausible ($9/mes) descartado por ahora; si hace falta "tiempo en research"/scroll, añadir Umami Cloud (gratis, verificar cuota) en fase 2. | Ventana de 1 mes: captura mensual de KPIs en `docs/kpis/YYYY-MM.md`. |
| Monitoreo | `healthcheck.yml` (cron de Actions cada 6 h): `curl` a `/api/markets`, `/api/news`, `/api/history?pair=USDMXN&range=1D`, `/api/newsletter-log` → valida 200, esquema con `jq` y frescura (`asOf` < 26 h en días hábiles; último envío de boletín < 8 días). Fallo = email automático de Actions. Nuevo `/api/health` (edad de caché por proveedor). | Gratis; cubre Yahoo caído, cuota Twelve Data agotada y cron del boletín que no corrió. |
| Higiene | README (EN/ES corto), LICENSE (código MIT; contenido CC BY-NC-ND 4.0), versionar `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` (ignorar solo `settings.local.json`), borrar `desktop-check.png`, `assets/geoMasks.js`, `assets/risk-sphere.js`, three.js; `package.json` con nombre/autor/`engines`; `docs/` para planes y KPIs. | Un admissions officer que abra el repo debe entenderlo en 2 minutos. |

### A.3 Migración incremental (sin romper URLs, SEO ni hreflang)

1. **Día 1 (rama `feat/astro`)**: `npm create astro@latest` en la raíz; mover TODO el sitio legacy (HTML, `assets/`, `es/`, og, robots) a `public/`. Astro copia `public/` tal cual → el sitio se sirve idéntico, `/api` intacto. **Gate:** en el preview, `curl /api/markets` responde y `/es/mercado` abre. Si `/api` no respondiera (no debería, sin adapter), plan B = mover endpoints a `src/pages/api/*.ts` con adapter (2 días).
2. **Regla de convivencia**: una página legacy se borra de `public/` en el mismo PR en que nace su versión Astro con **la misma URL** (no se renombra ningún slug: `/market`, `/es/mercado`, `/lessons/...`). Las páginas legacy ya emiten canonical + hreflang; las nuevas emiten exactamente los mismos pares desde `routes.ts`. Los 301 de `/articles/*` siguen en `vercel.json` (Astro estático haría meta-refresh; un 301 real es mejor). `vercel.json` conserva `cleanUrls`, `trailingSlash:false`, crons, `functions`; Astro usa `trailingSlash: 'never'` + `build.format: 'file'` para coincidir.
3. **Sitemap**: `src/pages/sitemap.xml.ts` lee el registro, que durante la transición incluye entradas `legacy: true` con `lastmod` real; desaparece el hardcode.
4. **`build-es.js`** queda congelado desde el día 1 (no se vuelve a correr: reescribe fuentes); `es/` legacy se sirve desde `public/` hasta que cada página migra; se elimina el script al migrar la última (S5).
5. **Orden**: layout + tokens + i18n + `/about` + `/methodology` (S2) → lecciones (S3) → `/market` (S4) → home (S5) → `/research` (S6–S8) → boletín + 404 (S7).

### A.4 Costes mensuales

| Servicio | Plan | Coste | Límite que importa | Disparador de pago |
|---|---|---|---|---|
| Vercel | Hobby | $0 | 1 M invocaciones, cron 1×/día, no comercial | Patrocinio/ingresos → Pro $20 |
| GitHub (repo público) | Free | $0 | Actions ilimitado | — |
| Upstash Redis | Free | $0 | 500 k cmd/mes | Caché compartida intensa (>16 k/día) |
| Resend | Free | $0 | **100 emails/día**, 3 000/mes | > ~90 suscriptores con envío diario → boletín semanal (decisión) o Pro $20 |
| Twelve Data / Yahoo / CoinGecko demo / Stooq | Free | $0 | 800 créditos/día; Yahoo sin garantía; CoinGecko exige atribución | — |
| SEC EDGAR / FRED / Banxico SIE | Gratis | $0 | User-Agent / token | — |
| Anthropic API (news, Haiku 4.5) | Pago por uso | ≈ $0.1–1 | Caché no compartida (arreglar con Redis) | — |
| Claude Code | Suscripción (ya la pagas) | — | — | — |
| Dominio .lat | Anual | ≈ $2–3/mes prorrateado | — | — |
| **Total recurrente** | | **≈ $0/mes** | | Primer pago probable: Resend Pro cuando el boletín crezca |

---

## B. MVP y roadmap

### B.1 MVP (hito 15-nov-2026)

Criterio: un profesor de finanzas o un admissions officer ve **datos honestos con fuente, un análisis propio reproducible y un producto que funciona en el teléfono**.

| Dentro del MVP | Fuera (fase 2+) |
|---|---|
| Sitio Astro bilingüe con paridad EN/ES verificada por CI | Modo claro, cuentas de usuario, comentarios |
| Home mobile-first cuya primera pantalla es producto (markets + último research + noticia explicada), sin globo 3D | Screener, búsqueda de tickers arbitrarios, fundamentales BMV/TSX por API |
| `/market` con LWC, cadencia y atribución visibles, mercado cerrado señalado | Chat IA sobre activos |
| 6 lecciones en MDX con fuentes, fecha real, prev/next, ruta de aprendizaje; la calculadora de interés compuesto como isla | Más de 2 lecciones nuevas |
| `/research` hub + **1 Equity Research Report** interactivo (DCF con supuestos editables, sensibilidad, comparables, fuentes numeradas, PDF) | Segundo reporte (arranca dic) |
| `/actinver`: posiciones con tesis en JSON + snapshot diario (cron) + resultados | Portafolio personal real |
| `/methodology` (política de datos e IA) + `/about` + 404 + boletín semanal | App, notificaciones |
| CI + tests + Lighthouse ≥ 90 móvil + healthcheck | — |

### B.2 Calendario semanal (Jaime ≈ 12 h/sem; Claude Code en sesiones asíncronas)

| Sem | Fechas | Objetivo (fases) | Entregables verificables / DoD | Jaime → Claude/agentes | Horas J | Depende de |
|---|---|---|---|---|---|---|
| 1 | 24–30 ago | Cimientos y quick wins (cierre F1–F2, F3 visión) | `main` protegido + PR flow + CI v0 (check-es, links, LH legacy); PR hotfix legacy: bug CSS `index.html:356`, fuera globo/three/geoMasks/`desktop-check.png`, reduced-motion, preload fuentes, jaime.jpg ≤ 30 KB, cache headers → **LH móvil ≥ 75**; README, LICENSE, `.claude/` versionado; `docs/vision.md` (1 página, brainstorming) | J: decisiones E, revisar PRs, escribir visión · C: gestor + creador | 10 | Decisiones E |
| 2 | 31 ago–6 sep | Astro scaffold + sistema visual (F4) | Rama `feat/astro` con legacy en `public/`; **gate `/api` en preview**; `tokens.css` (breakpoints y card únicos), `BaseLayout`, Nav, Footer, i18n infra, `<Hreflang>`, sitemap endpoint; fuentes nuevas; `/about` y `/methodology` EN/ES en producción con LH ≥ 90; página `/design` (no indexada) con componentes | J: aprobar tokens y copy de /methodology · C: diseno ∥ creador | 12 | S1 |
| 3 | 7–13 sep | Lecciones a MDX + **arranque Research (F7, F8)** | Colección `lessons` (6 EN + 6 ES), fuentes (≥ 2 por lección, las añade Jaime), JSON-LD, prev/next, `parity.test.ts`; borrar legacy lessons. Research: spec de "Smart Finance Research" (plantilla de reporte, `model.json` schema, `sources.yaml`), skill `research-report`; **empresa elegida**; `scripts/edgar-facts.mjs` → `financials.json` 5 años (Jaime verifica 3 cifras contra el 10-K) | J: fuentes, elegir empresa, spot-check · C: creador ∥ finanzas ∥ gestor | 13 | S2 |
| 4 | 14–20 sep | `/market` en Astro + Research secciones 1–3 (F9). **OUAC abre 17-sep: crear cuenta** | `/market` con isla LWC (FX, cripto, VIX, tasas), atribución/cadencia, LH ≥ 90, 0 "en vivo"; borrar Chart.js y legacy market; research: company explained, industria, "what happened" con ≥ 10 fuentes; inscripción Actinver confirmada; esquema JSON de `/actinver` | J: leer 10-K/Q2 call (3 h), redactar notas · C: creador ∥ finanzas | 13 | S3 |
| 5 | 21–27 sep | Home nuevo (F5/F6) + modelo financiero (F9) | Home: primera pantalla producto, news con disclosure IA, breakdowns → research; eliminar `build-es.js` y `es/` legacy; `src/lib/finance/dcf.ts` con TDD (≥ 15 tests), `model.json` con supuestos de Jaime, sensibilidad, comparables; LH home ≥ 90 | J: fijar supuestos (WACC, crecimiento, márgenes) y poder explicarlos en 60 s · C: creador ∥ finanzas | 13 | S4 |
| 6 | 28 sep–4 oct | **Actinver práctica** + gráficas del research (F9/F10) | `/actinver` con posiciones/tesis, cron diario `actinver-snapshot` (22:30 UTC), disclaimer "simulador"; SVG build-time (ingresos, márgenes, FCF, football field); isla DCF (Preact) con sliders; secciones 4–5 (desempeño financiero, valuación) | J: jugar práctica 20 min/día, revisar gráficas · C: creador ∥ finanzas ∥ diseno | 12 | S5 |
| 7 | 5–11 oct | **Reto real arranca 5-oct** + reporte v1 completo | v1 EN completo (tesis, riesgos, "qué me haría cambiar de opinión"), QA de finanzas (cada cifra ↔ fuente), traducción ES; boletín pasa a semanal (cron domingo) y páginas de boletín + 404 en Astro; v1 enviado a 1 revisor humano (profesor/mentor) | J: escribir la tesis con su voz (4 h), log Actinver 10 min/día · C: finanzas QA ∥ marketing | 13 | S6 |
| 8 | 12–18 oct | Research interactivo (F10) + hub | `/research` + `/research/<empresa>` con TOC, SVG, isla DCF, notas al pie, print CSS/PDF, og image, JSON-LD; a11y 100; budget LH en CI para la ruta; (opcional) lección "DCF en 10 minutos" reutilizando la isla | J: probar en 390 px, leer en voz alta · C: creador ∥ diseno ∥ gestor | 12 | S7 |
| 9 | 19–25 oct | QA editorial + **buffer** | Incorporar feedback del revisor, ES final, `/methodology` con políticas IA/datos y registro de correcciones; checklist D completo; 0 cifras sin fuente; margen para retrasos de S5–S8 | J: correcciones · C: gestor (checklist) | 10 | S8 |
| 10 | 26 oct–1 nov | **Publicar reporte (F11)** + derivados v1 (F12) | Publicado ≤ 30-oct; post LinkedIn + boletín especial; skill `derive-content` produce 5 guiones TikTok, carrusel IG, newsletter; Jaime graba 2 videos | J: publicar, grabar · C: marketing | 12 | S9 |
| 11 | 2–8 nov | **OUAC** (Rotman temprana 7-nov) + difusión | OUAC 105 enviado; sitio "demo-ready" (home, market, research, lessons, methodology); 3 TikToks + carrusel publicados; Actinver semana 5 | J: OUAC, grabar · C: marketing ∥ gestor | 12 | S10 |
| 12 | 9–15 nov | Cierre Actinver (13-nov) + retro + plan fase 2 | Post-mortem Actinver en `/actinver` + boletín; TikToks 4–5; `docs/kpis/2026-11.md`; reporte v1.1 si hubo correcciones; plan fase 2 con writing-plans | J: retro, KPIs · C: finanzas ∥ marketing ∥ gestor | 10 | S11 |

**Mapa de fases:** F1–F2 cerradas (auditoría) · F3 S1 · F4 S2 · F5–F6 S2–S8 · F7 S3 · F8 S3 · F9 S4–S7 · F10 S6–S8 · F11 S10 · F12 S10–S12 y fase 2. El research corre en paralelo desde S3.

### B.3 Hitos duros

| Fecha | Hito | Estado requerido del sitio |
|---|---|---|
| 17-sep-2026 | OUAC abre | Nada que enviar aún; crear cuenta |
| 28-sep → 2-oct | Actinver práctica | `/actinver` en preview |
| 5-oct | Reto real (diario hasta 13-nov) | `/actinver` en producción con cron |
| 30-oct (objetivo) / **15-nov (límite)** | Reporte publicado | `/research/<empresa>` con checklist D |
| 7-nov | Rotman: solicitud temprana; U of T recomienda ~7-nov (ciclo 2026) | Sitio demo-ready; URL del reporte lista |
| 13-nov | Fin Actinver | Post-mortem la semana siguiente |
| 1-dic | Rotman: suplementaria temprana (donde se cuenta el proyecto) | Reporte + KPIs + video tesis |
| 15-ene-2027 | U of T límite general | Reporte actualizado post-resultados trimestrales |
| 1-feb-2027 | Rotman: suplementaria/documentos final | — |

### B.4 Fase 2 (16-nov → 15-ene)

| Quincena | Foco | Entregable |
|---|---|---|
| 16–30 nov | Material para suplementaria (1-dic); boletín semanal estable; lección interactiva #2 | Texto de perfil con URLs; 2 boletines enviados |
| 1–15 dic | Actualización del reporte con resultados trimestrales de la empresa (si reporta en dic) → demuestra research vivo | Nota "Update" con changelog visible |
| 16 dic–5 ene | Reporte #2 (empresa canadiense/mexicana) en borrador; caché compartida en Redis para `/api` | `content/research/<empresa2>/` en PR |
| 6–15 ene | Pulido, KPIs de 3 meses, envío U of T | `docs/kpis/2027-01.md` |

### B.5 Riesgos

| Riesgo | Señal | Mitigación |
|---|---|---|
| Sobre-alcance (12 fases en 12 semanas) | S5 termina sin home nuevo | MVP fijo; buffer en S9; regla: si una semana se atrasa, el recorte es del sitio (home/lecciones), nunca del research ni de CI |
| Dependencia de Yahoo (FX, VIX, historial, boletín) | healthcheck rojo, gráficas vacías | Capa `api/_lib/providers/` (Yahoo → Stooq EOD → Twelve Data) + caché compartida en Redis + degradación honesta "último cierre"; `/api/health` |
| Tiempo escolar + Actinver diario | Semanas < 8 h | 2 bloques fijos (sábado 4 h + 2 tardes); plantilla de log Actinver de 10 min; Claude Code prepara PRs para revisar, no para escribir desde cero |
| Deuda del `build-es.js` | Tentación de regenerar `/es` | Congelado desde S2; paridad por test; se borra en S5 |
| "Esto lo hizo la IA" | Revisor no ve la mano de Jaime | Supuestos y changelog firmados por Jaime; `sources.yaml` con 10-K/transcripts; sección "qué no sé"; video de tesis a cámara; revisión humana externa; disclosure de IA específica (qué hizo Claude, qué hizo Jaime) |
| Tope de Resend (100/día) | > 90 suscriptores | Boletín semanal (S7); si crece, Resend Pro $20 |
| Fechas U of T 2027 aún no publicadas | Cambio de fechas en sept–oct | Revisar future.utoronto.ca/deadlines el 1-oct; planear con 7-nov/1-dic |

---

## C. Sistema de contenido multiplataforma

### C.1 Estructura

```
content/research/<empresa>/
  meta.yaml            # ticker, nombre, fecha, precio asOf, versión, autor, estado (draft/review/published)
  sources.yaml         # id, título, URL/10-K página, fecha de acceso, qué cifra respalda
  data/financials.json # EDGAR companyfacts normalizado (5 años) — generado por script
  model.json           # supuestos del DCF/comps firmados por Jaime (+ changelog de decisiones)
  report.en.mdx / report.es.mdx   # reporte completo (secciones fijas de la plantilla)
  charts/*.svg         # generados en build desde data+model
  derivatives/
    linkedin.{en,es}.md
    tiktok/01-company-explained.md … 05-my-thesis.md   # guion + b-roll + texto en pantalla + CTA
    instagram/carousel.json  (+ png/ renderizados)
    newsletter.{en,es}.md
  changelog.md         # correcciones y actualizaciones públicas
```

### C.2 Pipeline: qué automatiza Claude, qué revisa Jaime

| Pieza | Entrada | Plantilla (`.claude/skills/`) | Claude genera | Jaime revisa/aporta | Publica en |
|---|---|---|---|---|---|
| Reporte web | data + model + notas de Jaime | `research-report` (secciones: resumen, negocio, industria, qué pasó, desempeño, valuación, riesgos, tesis, qué me haría cambiar, metodología, fuentes) | Borrador con citas `[S3]`, tablas, SVG | Tesis y supuestos con su voz; spot-check de cifras; firma | `/research/<empresa>` |
| LinkedIn | report.mdx | `derive-content` → `linkedin.md` (gancho 1 línea, 3 hallazgos con cifras citadas, 1 gráfica PNG, CTA) | Texto EN/ES + PNG del SVG | Tono, gancho | LinkedIn |
| TikTok ×5 | report.mdx | `derive-content` → 5 guiones de 45–60 s (company explained · what happened · financial performance · valuation · my thesis) con texto en pantalla y fuente visible | Guion + lista de b-roll | Graba a cámara, ajusta jerga | TikTok (+ subtítulos) |
| Instagram | report.mdx + charts | `derive-content` → `carousel.json` (5–8 slides: título, dato, gráfica, fuente, disclaimer) → PNG 1080×1350 con sharp (o Canva MCP) | Slides | Orden, colores | Instagram |
| Boletín semanal | markets de la semana + último research/lección | `newsletter-issue` (resumen, 1 gráfica, 1 lección, disclaimer, cadencia) | Borrador | Edita 15 min | Resend (domingo) |

**Checklist de publicación (cada pieza):** disclaimer educativo + "no es recomendación"; fuentes visibles (número de 10-K/transcripción/fecha); fecha y precio `asOf` con retraso indicado; opinión separada de dato ("tesis" vs "hecho"); disclosure de IA (qué asistió Claude); posición propia declarada (simulador Actinver / ninguna); enlace al reporte completo; alt text / subtítulos; versión y changelog si es actualización.

### C.3 Equipo de agentes (`.claude/agents/`)

| Agente | Responsabilidad | Skills/herramientas | Cuándo lanzarlo | Entregable |
|---|---|---|---|---|
| `finanzas` | Datos (EDGAR/FRED/Banxico), `financials.json`, modelo, QA cifra↔fuente, Actinver, portafolio | `research-report`, `edgar-facts`, tests de `src/lib/finance` | S3–S9 en paralelo con creador | data + model + informe QA |
| `diseno` | Tokens, componentes, revisión visual en 390/768/1280 px, a11y | `design` canvas, capturas | S2, S6, S8 | tokens, revisión con capturas |
| `creador` | Features: páginas Astro, islas, endpoints | TDD, writing-plans, subagent-driven-development | Cada semana | PRs con tests |
| `gestor` | SEO, sitemap/hreflang, checklist pre-deploy, CI, healthcheck, KPIs | `pre-deploy-check`, Lighthouse | Antes de cada merge a `main`; S9, S12 | checklist firmado, `docs/kpis` |
| `marketing` | Derivados, imágenes, boletín, calendario de publicación | `derive-content`, `newsletter-issue`, sharp/Canva | S10–S12 y cada domingo | guiones, PNG, borradores |

**Flujo superpowers por tema:** `brainstorming` (spec en `docs/superpowers/specs/`) → `writing-plans` (plan con tareas de 2–5 min, TDD) → `subagent-driven-development` con `test-driven-development` → `requesting-code-review` (+ `/code-review` en el PR) → `verification-before-completion` → `finishing-a-development-branch` (PR, squash). Paralelismo (`dispatching-parallel-agents`) cuando las tareas no comparten archivos: p. ej. S3 = creador (lecciones MDX) ∥ finanzas (EDGAR) ∥ gestor (parity test); S6 = creador (isla DCF) ∥ finanzas (secciones 4–5) ∥ diseno (SVG).

---

## D. Gobernanza y credibilidad

**Checklist pre-deploy (plantilla de PR; ★ = lo verifica CI):** ★ tests y `astro check` verdes · ★ Lighthouse móvil ≥ 90 / LCP < 2.5 s / JS ≤ 150 KB · ★ paridad EN/ES y hreflang · ★ links internos sin 404 · cada cifra con fuente y `asOf` (y la palabra "retraso"/"último cierre" donde aplique) · opinión marcada como tesis, dato como dato · disclaimer educativo + "no es recomendación" · disclosure de IA donde intervino (news "takes" renombrados "Why it matters — AI-assisted"; research: qué hizo Claude) · ningún dato inventado (si falta, se dice) · atribución de proveedores (TradingView, CoinGecko, Yahoo, Twelve Data, Banxico) · a11y: skip-link, roles, contraste, reduced-motion · fecha `updated` real en frontmatter y sitemap · og:image y JSON-LD.

**`/methodology` (pública, EN/ES):** qué datos usamos y de quién; cadencia y retraso por superficie; cadena de fallback y caché; qué hace la IA y qué no (Haiku genera "why it matters" de noticias etiquetado; el research lo escribe Jaime con Claude como asistente de datos/redacción; ninguna cifra sale de la IA sin fuente); política de correcciones (changelog público); conflictos de interés y posiciones; "esto no es asesoría"; contacto para errores.

**KPIs a 3 meses (medir el 15-nov; instrumento entre paréntesis):**

| KPI | Hoy | Meta 15-nov | Cómo |
|---|---|---|---|
| Visitas únicas/mes | sin medir (instrumentar S1) | 1 500–3 000 | Vercel WA |
| Suscriptores boletín | ? (leer de Redis) | +100 netos, bajas < 5 % | `/api/newsletter-log` |
| Lectura del reporte | — | ≥ 500 vistas en 2 semanas; ≥ 30 % llega a la sección de tesis (evento de scroll si se añade Umami) | WA + Umami opcional |
| Compartidos | — | LinkedIn ≥ 5 000 impresiones; 5 TikToks ≥ 2 000 vistas c/u; carrusel ≥ 50 guardados | analíticas nativas |
| Menciones/validación | — | 3 (profesor, comunidad Actinver, escuela) + 1 revisor externo citado en el reporte | registro manual |
| Salud técnica | LH 51 | LH ≥ 90 en 4 rutas; 0 healthchecks rojos > 24 h | CI + Actions |

---

## E. Decisiones que Jaime debe tomar ahora + primeros pasos

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 1 | Stack | (a) vanilla+Vite · (b) Astro estático · (c) Next | **(b)** |
| 2 | Empresa del reporte | Lululemon (NASDAQ, datos XBRL gratis, fundada en Vancouver, nueva CEO 8-sep) · Dollarama (TSX, Canadá, datos manuales) · Walmex (BMV, México, datos manuales) | **Lululemon**; Dollarama como reporte #2 en dic (ángulo Canadá) |
| 3 | Boletín | Diario · **Semanal (domingo)** | Semanal: evita el tope de Resend y alimenta la pieza "resumen semanal" |
| 4 | Globo 3D / three.js | Mantener · **Eliminar** | Eliminar (decorativo, 722 KB, LH 51) |
| 5 | Modo claro | Ahora · **Fase 2** | Fase 2 |
| 6 | "My take" de noticias (IA) | Mantener nombre · **Renombrar + disclosure** | "Why it matters (AI-assisted)" + 1 take semanal escrito por Jaime |
| 7 | Programa U of T (define fechas) | Rotman Commerce (suplementaria 1-dic/1-feb) · Arts & Science · Engineering | Dímelo: cambia el calendario de fase 2 |
| 8 | Licencias | Código MIT · contenido CC BY-NC-ND 4.0 | Así |
| 9 | Analítica | Vercel WA · Plausible $9 | Vercel WA |
| 10 | Nombre/ruta del hub | `/research` y `/es/research` · `/es/investigacion` | `/research` en ambos (marca) |

**Semana 1 — cinco pasos concretos (todo en PRs; `gh` ya está autenticado como Jaime-pixel817):**

1. Proteger `main` y el flujo de PR:
   ```bash
   gh api -X PUT repos/Jaime-pixel817/smart-finance/branches/main/protection \
     -F required_status_checks='{"strict":true,"contexts":["ci"]}' \
     -F enforce_admins=true -F required_pull_request_reviews=null \
     -F restrictions=null -F required_linear_history=true -F allow_force_pushes=false
   gh repo edit Jaime-pixel817/smart-finance --enable-squash-merge --delete-branch-on-merge
   ```
   (Cuando exista el job `lighthouse`, añadirlo a `contexts`.)
2. Rama `fix/quick-wins`: corregir `index.html:356-361` y `es/index.html:357` (prosa dentro de `<style>`); quitar `three.js`, `assets/risk-sphere.js`, `assets/geoMasks.js`, `desktop-check.png`; `prefers-reduced-motion`; `<link rel=preload>` de la sans; `jaime.jpg` → 260 px WebP con sharp; `headers` de caché en `vercel.json`. Verificar con Lighthouse local (`npx lighthouse https://<preview> --preset=mobile`) ≥ 75 antes de mergear.
3. Rama `chore/ci`: `.github/workflows/ci.yml` (node 22, `npm ci`, `npm run check-es`, `lychee` sobre HTML, `treosh/lighthouse-ci-action` con `lighthouserc.json` y `staticDistDir: .`) + `healthcheck.yml` (cron `0 */6 * * *` con `curl`/`jq` a los 4 endpoints) + `.github/pull_request_template.md` con el checklist D.
4. Rama `chore/repo-hygiene`: README, LICENSE, `package.json` (nombre, autor, `engines.node >=22`), `.gitignore` → solo `.claude/settings.local.json`; crear `.claude/agents/{finanzas,diseno,creador,gestor,marketing}.md` y `.claude/skills/{research-report,derive-content,pre-deploy-check}/SKILL.md` (esqueletos con responsabilidades de C.3); `docs/vision.md` con `superpowers:brainstorming`.
5. Preparar S2: `superpowers:brainstorming` → `docs/superpowers/specs/2026-08-30-astro-migration.md` y `superpowers:writing-plans` → `docs/superpowers/plans/2026-08-30-astro-scaffold.md`; en Vercel: fijar Node 22.x, desactivar Vercel Authentication en previews, activar Web Analytics y Speed Insights; revisar fechas U of T 2027 en `future.utoronto.ca/deadlines` y anotar en `docs/calendar.md`.
