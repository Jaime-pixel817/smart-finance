# SmartFinance.lat

**EN** — Bilingual (EN/ES) financial-education site for high-school and university students, built by Jaime Sandoval Ricaño (18, Mexico). Live at [smartfinance.lat](https://smartfinance.lat): market data with honest "last close / delayed" labels, 6 lessons, a daily newsletter and, coming next, a personal portfolio, the Actinver challenge log and student-grade equity research reports. Static HTML + vanilla JS served by Vercel; serverless functions in `/api` (Node, Upstash Redis, Resend). Code is MIT; editorial content is CC BY-NC-ND 4.0 (see `LICENSE`). Nothing here is investment advice.

---

**ES** — Sitio de educación financiera, bilingüe EN/ES, para jóvenes de prepa y universidad. Lo construye Jaime Sandoval Ricaño (18, México) y es su proyecto insignia para aplicar a University of Toronto.

## Qué hay

- Datos de mercado (FX, índices, cripto) con fuente y retraso visibles — nunca "en vivo".
- 6 lecciones, calculadora de interés compuesto, boletín diario con gráfica del dólar.
- Próximo (plan "Smart Finance 2.0", ver `docs/`): portafolio personal, Reto Actinver en vivo y hub `/research` con reportes tipo analista.

## Stack

- HTML estático + JS vanilla; sin framework ni bundler (migración a Astro en evaluación, ver `docs/context/memory.md`).
- Funciones serverless CommonJS en `/api` (Vercel) con Redis de Upstash; boletín con Resend.
- `/es` y `sitemap.xml` se **generan**: `npm run build:es` (verificar con `npm run check-es`).

## Desarrollo

```bash
npm ci
# crear .env.local con las claves que lista CLAUDE.md
npx vercel dev               # sitio + /api en local
npm run check-es             # antes de cualquier PR
```

Push a `main` despliega a producción: todo cambio va por rama + PR (plantilla con checklist en `.github/pull_request_template.md`; CI en `.github/workflows/`).

## Documentación

- `CLAUDE.md` — reglas críticas del repo y comandos.
- `docs/` — auditoría, plan maestro y memoria del proyecto (`docs/README.md` explica cómo retomar en cualquier máquina).
- `.claude/agents/` y `.claude/skills/` — agentes y skills de Claude Code versionados.

## Licencia

Código bajo MIT; contenido editorial (lecciones, reportes, boletín, imágenes) bajo CC BY-NC-ND 4.0. Ver `LICENSE`. Contenido educativo, no es recomendación de inversión.
