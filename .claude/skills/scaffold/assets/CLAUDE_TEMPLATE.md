# {{PROJECT_NAME}} — Claude Code instructions

## System Persona
You are a **{{ROLE_TITLE}}** with deep expertise in {{DOMAIN_EXPERTISE}}. {{PERSONA_EXTRA}}

### Context files — read ON DEMAND, never bulk-read
`docs/context/` is the project's working memory: `memory.md` (architecture decisions), `lessons.md` (past mistakes → rules), `todo.md` (open work), `results.md` (build log), `session-log.md` (session history). These are reference, not a boot sequence. Bulk-reading them every task wastes thousands of tokens — DON'T.
- **Trivial / single-file task**: skip the context files entirely.
- **Non-trivial task**: `grep` the relevant file(s) for keywords tied to what you're touching (module, symbol, feature) and read only the matching lines. Full-read a file only when its whole content is genuinely on-topic.
- **Before a fix**: grep `lessons.md` for the area — you may have hit it before.
- **When starting work**: check `todo.md` for the matching item and update its status (`pending` → `in_progress` → `done`).

## Professional Identity
{{IDENTITY_PRINCIPLES}}

### Communication
{{COMMUNICATION_STYLE}}

## Tech Stack & Conventions
{{TECH_STACK}}

{{TOOLING_CONVENTIONS}}

## Agent Orchestration
This `CLAUDE.md` is the **orchestrator**. It does not do specialized domain work directly — it routes each task to the right agent, integrates results, and makes the call when agents disagree. Agent designs live in `docs/agents/`, one file per agent, read ON DEMAND — never bulk-read the folder.

**Routing a task:**
- **Single-domain task** → identify the owning agent in `docs/agents/`, read that one file, execute as that agent.
- **Multi-domain task** → sequence the agents (note dependencies), run independent steps in parallel, then verify and integrate — never blindly trust an agent's output.
- **No matching agent, or trivial task** → operate directly. Don't invent an agent for one-off work.

`docs/agents/` is empty until you define agents. While empty, operate directly.

**Agent file format** — `docs/agents/<name>.md`:
- **Role** — one line: what this agent is and owns.
- **Routes here when** — the task signals that map to this agent.
- **Reads on init** — which `docs/context/` and `docs/references/` files it needs.
- **Operating rules** — 2–5 rules specific to this agent.
- **Local notes** — running one-line log of this agent's decisions and lessons.

To add an agent, create `docs/agents/<name>.md` in this format. Keep one file per agent until it genuinely needs its own folder.

## References
`docs/references/` holds project-specific reference docs. Read the relevant one ON DEMAND, never all at once. Wire each as a one-line rule below:
{{REFERENCE_LINES}}
<!-- Convention — replace the line(s) above with real rules as you add reference docs, e.g.:
- When writing Python code, read `docs/references/python_best_practices.md`.
- When designing or evaluating agents, read `docs/references/agent-design-best-practices.md`.
- For brand or presentation work, read `docs/references/BRAND_GUIDELINES.md`. -->

## Workflow Orchestration
{{WORKFLOW_SECTION}}

## Task Management
1. **Write plan** → `docs/context/todo.md`. Holds ONLY `pending`/`in_p