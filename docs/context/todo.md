# Pendientes — semanas 1–2 del plan (24-ago → 6-sep-2026)

Fuente: `docs/2026-08-21-estrategia/03-agente-planeacion.md` (secciones B.2 y E). Estados: pending · in_progress · done.

## Decisiones de Jaime (bloquean lo demás) — pending
- [ ] Stack: (b) Astro 6 estático + islas (recomendado) · (a) vanilla+Vite · (c) Next
- [ ] Empresa del primer reporte: Lululemon (recomendada) · Dollarama · Walmex
- [x] Boletín: **semanal, domingos** — hecho en la ola 3 (`"0 14 * * 0"`). La decisión la forzó el tope de Resend: 100 correos/día compartidos con las altas y ~90 suscriptores.
- [ ] Programa U of T (define las fechas de fase 2): Rotman Commerce · Arts & Science · Engineering
- [ ] Confirmar: eliminar globo 3D, modo claro en fase 2, "Why it matters (AI-assisted)", licencias MIT + CC BY-NC-ND 4.0, Vercel WA, hub `/research` en ambos idiomas

## Semana 1 (24–30 ago) — pending
- [x] **`main` protegida** — hecho el 23-ago-2026 con `gh api -X PUT repos/Jaime-pixel817/smart-finance/branches/main/protection`. Estado verificado con `gh api repos/Jaime-pixel817/smart-finance/branches/main/protection`:
  ```
  pr_obligatorio: true    aprobaciones: 0        checks: ["ci"]  (estrictos: la rama tiene que estar al día)
  historia_lineal: true   force_push: false      borrar_rama: false
  admins: true            resolver_hilos: true
  ```
  `required_approving_review_count: 0` a propósito: exige que todo pase por un PR, pero deja que Jaime lo mergee solo (nadie puede aprobar su propio PR, y con 1 se quedaría bloqueado siendo el único mantenedor). **`enforce_admins: true`**, o sea que la regla también le aplica a Jaime: ya no se puede hacer `git push` a `main` desde la terminal, ni siquiera él. Con historia lineal, el botón de *Create a merge commit* deja de valer: hay que mergear con **Squash** o **Rebase** (los dos están activados en el repo, comprobado).
  **Salida de emergencia**, si algún día hay que subir algo a `main` a pelo: Settings → Branches → editar la regla y desmarcar *Do not allow bypassing the above settings*, o desde la terminal `gh api -X DELETE repos/Jaime-pixel817/smart-finance/branches/main/protection` (la quita entera; volver a ponerla es el `PUT` de arriba).
- [ ] Vercel/GitHub: añadir `CRON_SECRET` como **secreto del repo** (Settings → Secrets and variables → Actions), el mismo valor que en Vercel. Sin él, el healthcheck se salta el informe de cuota en vez de fallar, pero nadie ve cuántos créditos de Twelve Data se están gastando.
- [ ] *Borrar rama al mergear* (Settings → General → Pull Requests): sigue en `false`. El **squash merge** ya está activado (comprobado con `gh api repos/Jaime-pixel817/smart-finance --jq .allow_squash_merge`), y ahora hace falta: con la historia lineal de la protección, el merge commit deja de ser una opción.
- [ ] Mergear PR `chore/repo-hygiene` (docs, agentes, CI, README/LICENSE) tras CI verde
- [ ] Mergear PR `fix/quick-wins` (bug CSS `index.html:356`, fuera three.js/geoMasks/risk-sphere/desktop-check.png, reduced-motion, preload fuentes, jaime.jpg ≤ 30 KB, cache headers) con Lighthouse móvil ≥ 75
- [ ] `docs/vision.md` (1 página) con `superpowers:brainstorming`
- [ ] Vercel: fijar Node 22.x, desactivar Vercel Authentication en previews, activar Web Analytics + Speed Insights

## Semana 2 (31 ago–6 sep) — pending
- [ ] Spec de migración a Astro: `docs/superpowers/specs/2026-08-30-astro-migration.md` + plan `docs/superpowers/plans/2026-08-30-astro-scaffold.md`
- [ ] Rama `feat/astro`: legacy en `public/`, gate `/api` en preview, `tokens.css`, `BaseLayout`, Nav, Footer, i18n, `<Hreflang>`, sitemap endpoint
- [ ] `/about` y `/methodology` EN/ES en producción con Lighthouse ≥ 90

## Arranque del research (semana 3, pero preparar ya) — pending
- [ ] Elegir empresa (ver decisiones) y crear `content/research/<empresa>/` con `meta.yaml`, `sources.yaml`, `model.json` (schema)
- [ ] Script `scripts/edgar-facts.mjs` → `data/financials.json` (5 años, EDGAR companyfacts); Jaime verifica 3 cifras contra el 10-K
- [ ] Revisar fechas U of T 2027 en future.utoronto.ca/deadlines y anotar en `docs/calendar.md`
- [ ] (pending) Mergear en orden: #2 → #1 → #3 → #5; luego #4 (home Astro) y #6 (market) tras revisar previews
- [x] Portar el Globo de mercados al home Astro → PR #7
- [ ] (pending) Vercel: desactivar Deployment Protection en previews; fijar Node 22; activar Web Analytics + Speed Insights
- [ ] (pending) Proteger main (PR obligatorio + CI) — ver arriba, con el comando exacto
- [ ] (pending) Siguientes PRs: /news explicadas, lecciones MDX + /about + /methodology, /research página interactiva, búsqueda global completa, glosario al tacto
- [ ] (pending) Orden de merge sugerido: #2 → #1 → #3 → #4 → #6 → #7 → #8 (luego cerrar #5 como superado por #7, o mergearlo antes de #4 si se quiere el globo en el legacy)
- [ ] (pending) Siguiente ola: /news explicadas con cola de revisión, /research página interactiva (DCF sliders, escenarios, comps) con el JSON de LULU, quiz en lecciones, og:image por lección, /community

## Ola 3 — ops (PR #17, 2026-08-23)
- [x] Caché compartida de datos de mercado en Redis, con stale de 48 h, singleflight y contadores de cuota
- [x] Degradación automática de Twelve Data a Yahoo al llegar a 700/800 créditos del día
- [x] Informe de salud en `/api/markets?accion=health` (CRON_SECRET), sin añadir un archivo a `api/`
- [x] Boletín semanal los domingos, con contenido de la semana y solo texto ya aprobado
- [x] og:image propia por lección, noticia, herramienta, research, `/news`, `/tools`, `/community` y `/market`
- [x] Healthcheck ampliado: `/api/world`, `/api/quotes`, `/api/news?estado=aprobadas`, borradores en 403, frescura de 26 h en día hábil
- [x] `/methodology` con la caché compartida, la cadencia semanal y la cuota por proveedor
- [ ] (pending) Segundo proveedor para divisas, VIX y gráficas: hoy solo hay Yahoo y es el hueco conocido que queda
- [ ] (pending) `/api/news` sigue generando `gancho` e `impulso` con Anthropic y ya no los usa nadie (el boletín dejó de leerlos). Quitarlos del prompt ahorra tokens, pero toca el prompt de `/news`: hacerlo en un PR propio y con las pruebas delante.
