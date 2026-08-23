# docs/ — documentación de trabajo de SmartFinance.lat

Nada de esta carpeta se sirve en el sitio (está en `.vercelignore`). Es la memoria del proyecto para Jaime y para los agentes de Claude Code.

## Qué hay aquí

| Carpeta / archivo | Qué es |
|---|---|
| `2026-08-21-estrategia/` | Auditoría completa del sitio y plan "Smart Finance 2.0" (2026-08-21): `00-hallazgos-auditoria.md`, `01-agente-finanzas-y-datos.md`, `02-agente-diseno-y-funciones.md`, `03-agente-planeacion.md` (plan maestro 24-ago → 15-ene), `smart-finance-2-0.html` (documento publicado), `lighthouse-mobile-2026-08-21.json` y `capturas/` (móvil y escritorio). |
| `2026-08-23-reto/` | El reto interactivo de `/challenge` y `/es/reto`: `00-tres-ideas-y-eleccion.md` (las tres ideas que se pusieron sobre la mesa, sus pros y sus contras, y por qué gana la del gráfico ciego). |
| `context/memory.md` | Decisiones de arquitectura vigentes (Astro + islas, sin globo, LWC + SVG, Redis, `/research`, roadmap). |
| `context/lessons.md` | Errores convertidos en reglas (push a main = producción, `/es` generado, zsh `path`, Twelve Data, etc.). |
| `context/todo.md` | Pendientes de las semanas 1–2 del plan y decisiones que bloquean. |
| `context/session-log.md` | Una línea por sesión de trabajo. |
| `context/results.md` | Registro de builds, revisiones y métricas. |
| `superpowers/specs/`, `superpowers/plans/` | (Se crean al usar `superpowers:brainstorming` / `writing-plans`.) |
| `kpis/` | (Captura mensual de KPIs: `YYYY-MM.md`.) |

Los agentes (`.claude/agents/`) y las skills del repo (`.claude/skills/`) están versionados en la raíz; `CLAUDE.md` tiene las reglas críticas.

## Cómo retomar el proyecto en cualquier máquina

1. `git clone https://github.com/Jaime-pixel817/smart-finance.git` (o `git pull` si ya existe) y `npm ci`.
2. Instalar el plugin de flujo de trabajo (es por máquina, no viaja con el repo):
   `claude plugin install superpowers@claude-plugins-official`
3. Las skills del repo en `.claude/skills/` (`scaffold`, `research-report`, `derive-content`, `pre-deploy-check`) y los agentes en `.claude/agents/` se cargan solos al abrir Claude Code en la carpeta.
4. Copiar `.env.local` (las API keys nunca van a git): `TWELVE_DATA_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
5. Abrir `claude` en la carpeta y decir:
   > lee docs/context y docs/2026-08-21-estrategia y sigue con docs/context/todo.md
6. Todo cambio va por rama + PR a `main` (push a `main` despliega a producción). Antes de abrir el PR: `npm run check-es` y la checklist de `.github/pull_request_template.md`.
