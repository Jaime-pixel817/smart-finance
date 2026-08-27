# SmartFinance.lat

**EN** — Bilingual (EN/ES) financial-education site for high-school and university students, built by Jaime Sandoval Ricaño (18, Mexico). Live at [smartfinance.lat](https://smartfinance.lat): market data with honest "last close / delayed" labels — never "live" — 10 lessons with cited primary sources, a 61-term touch glossary, a daily chart-reading game, three calculators, a weekly newsletter, and news summaries that **no AI publishes without a human approving them first**. Astro 6 (static) with Preact islands; serverless functions in `/api` (Node, Upstash Redis, Resend). Code is MIT; editorial content is CC BY-NC-ND 4.0 (see `LICENSE`). Nothing here is investment advice.

---

**ES** — Sitio de educación financiera, bilingüe EN/ES, para jóvenes de prepa y universidad. Lo construye Jaime Sandoval Ricaño (18, México) y es su proyecto insignia para aplicar a la universidad.

## Qué hay

- **Datos de mercado** (FX, índices, acciones, cripto) con fuente y retraso visibles — nunca "en vivo". 18 activos con ficha propia, comparador y lista de seguimiento local, sin cuenta ni servidor.
- **10 lecciones** en MDX, cada una en inglés y español, con **41 fuentes primarias citadas con su fecha de consulta** (Banxico, INEGI, SEC, Fed, BMV, Ley del Mercado de Valores). El esquema de validación **rechaza una lección con menos de dos fuentes verificadas**: el build se cae.
- **Glosario al tacto**: 61 términos, los 61 con ejemplo "en pesos" y los 61 enlazados a la lección donde salen.
- **Reto del día**: una gráfica real sin nombre ni precios, cinco rondas, racha local. Cómo se elige el reto de cada día está explicado en la propia página.
- **Noticias explicadas**: los borradores los escribe un modelo desde el RSS de Bloomberg, y **solo se publican cuando Jaime los aprueba uno por uno**. Pedirlos por la vía pública (`/api/news?estado=borradores`) devuelve 403 a propósito: es la promesa del sitio hecha código, y un healthcheck falla si deja de cumplirse.
- **Smart Finance AI**: explica lo que hay en la página usando **solo los datos de esa página**. El servidor hace las cuentas, una guardia rechaza cualquier cifra que no esté en los datos, un clasificador impide que dé consejos de inversión y hay tope de gasto. Cada respuesta va etiquetada.
- **Boletín semanal**, domingos, con doble opt-in y número archivado antes de enviarse.
- **Smart Finance Projects** (`/research`): equity research y el Reto Actinver, cuya fase se **calcula con la fecha** en vez de escribirse.
- **Carteras** (`/portfolio`, `/actinver`): posiciones con tesis en JSON validado, precios de `/api/history` y foto nocturna. **Publicadas y todavía sin posiciones reales.**

## Estado honesto

- El **reporte de equity research está en borrador**: los datos de Lululemon (7 años fiscales de SEC EDGAR) y las 20 fuentes están; la tesis, los supuestos y los comparables los escribe Jaime y aún no están.
- Las **dos carteras están vacías**. El Reto Actinver arranca el 5 de octubre de 2026.
- **Ningún número del boletín archivado todavía.**

## Stack

- **Astro 6 estático** con islas en Preact. Gráficas de precio con Lightweight Charts; sparklines y calculadoras en SVG propio. Solo las páginas de estado del boletín siguen siendo HTML legacy en `public/`.
- Funciones serverless CommonJS en `/api` (Vercel, tope de 12) con Redis de Upstash; boletín con Resend.
- **411 pruebas** con `node --test`. CI corre tipos, pruebas, paridad EN/ES, enlaces, guardia de SEO y presupuestos de Lighthouse sobre siete rutas.
- `/es` y `sitemap.xml` se **generan**: `npm run build:es` (verificar con `npm run check-es`).

## Desarrollo

```bash
npm ci
# crear .env.local con las claves que lista CLAUDE.md
npx vercel dev               # sitio + /api en local
npm test                     # 411 pruebas
npm run check-es             # antes de cualquier PR
```

Push a `main` despliega a producción: todo cambio va por rama + PR (plantilla con checklist en `.github/pull_request_template.md`; CI en `.github/workflows/`). `main` está protegida, y la regla aplica también al autor.

## Documentación

- `CLAUDE.md` — reglas críticas del repo y comandos.
- `docs/` — auditoría, plan maestro y memoria del proyecto (`docs/README.md` explica cómo retomar en cualquier máquina).
- `.claude/agents/` y `.claude/skills/` — agentes y skills de Claude Code versionados.

## Licencia

Código bajo MIT; contenido editorial (lecciones, reportes, boletín, imágenes) bajo CC BY-NC-ND 4.0. Ver `LICENSE`. Contenido educativo, no es recomendación de inversión.
