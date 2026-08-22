# Pendientes — semanas 1–2 del plan (24-ago → 6-sep-2026)

Fuente: `docs/2026-08-21-estrategia/03-agente-planeacion.md` (secciones B.2 y E). Estados: pending · in_progress · done.

## Decisiones de Jaime (bloquean lo demás) — pending
- [ ] Stack: (b) Astro 6 estático + islas (recomendado) · (a) vanilla+Vite · (c) Next
- [ ] Empresa del primer reporte: Lululemon (recomendada) · Dollarama · Walmex
- [ ] Boletín: semanal domingo (recomendado) · diario
- [ ] Programa U of T (define las fechas de fase 2): Rotman Commerce · Arts & Science · Engineering
- [ ] Confirmar: eliminar globo 3D, modo claro en fase 2, "Why it matters (AI-assisted)", licencias MIT + CC BY-NC-ND 4.0, Vercel WA, hub `/research` en ambos idiomas

## Semana 1 (24–30 ago) — pending
- [ ] Proteger `main` (PR obligatorio, check `ci` requerido, historia lineal, sin force-push, incluye admins) + squash merge + borrar rama al mergear (`gh api ... branches/main/protection`)
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
- [ ] (pending) Portar el Globo de mercados (PR #5: world-markets.js, leyenda/tarjeta, i18n) al home Astro (src/components/home) después de mergear #4
- [ ] (pending) Vercel: desactivar Deployment Protection en previews; fijar Node 22; activar Web Analytics + Speed Insights
- [ ] (pending) Proteger main (PR obligatorio + CI) después de mergear #1
- [ ] (pending) Siguientes PRs: /news explicadas, lecciones MDX + /about + /methodology, /research página interactiva, búsqueda global completa, glosario al tacto
