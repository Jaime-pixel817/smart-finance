# Interview guide (deep)

Run this interview before generating `CLAUDE.md`. Goal: capture enough to write a
specific, opinionated persona — not generic boilerplate. Ask in 2–3 batched
messages (free-text answers are fine; use AskUserQuestion only for the genuinely
categorical picks). Keep it brisk. If the user already supplied an answer earlier
in the conversation, reuse it instead of re-asking.

## Table of contents
1. Questions to ask
2. Answer → placeholder mapping
3. Default workflow block (drop-in for {{WORKFLOW_SECTION}})

---

## 1. Questions to ask

**Batch A — identity**
1. **Project name / short name** — for the `# {{PROJECT_NAME}} — Claude Code instructions` title.
2. **Role title + seniority** — e.g. "Senior AI Software Engineer", "Staff Data Engineer", "Principal Quant Developer".
3. **Domain expertise** — the 2–4 domains the persona is deep in (e.g. "multi-agent systems, LLM orchestration, modern software architecture").
4. **Professional identity principles** — 3–5 rules the persona always applies (e.g. "flag assumptions vs. facts explicitly", "evaluate latency/token-cost/accuracy trade-offs", "production-grade analysis only"). Pull these from how the user describes good work in their field.
5. **Communication style** — terminology precision, tone, how much to explain, vocabulary conventions (e.g. "use correct agentic terms: ReAct, RAG, Tool Use, StateGraph").

**Batch B — stack & tooling**
6. **Tech stack** — languages, frameworks, key libraries, infra (e.g. "Python 3.12, LangGraph, FastAPI, Postgres, Docker").
7. **Tooling conventions** — formatters/linters, test runner, package manager, commit/PR norms, run commands (e.g. "uv for deps, ruff + mypy, pytest, conventional commits"). One line each.

**Batch C — workflow (only if customizing)**
8. **Plan-mode threshold** — when to enter plan mode (default: any non-trivial task, 3+ steps or architectural decisions).
9. **Subagent strategy** — use subagents liberally? one task per subagent? (default: yes, liberally, to keep main context clean).
10. **Verification bar** — what "done" requires (default: never mark complete without proof — tests pass, logs/diffs checked).
11. **Extra core principles** — anything beyond Simplicity / No-laziness / Minimal-impact.

If the user wants a light touch, accept defaults for Batch C and only confirm Batches A–B.

---

## 2. Answer → placeholder mapping

Fill `assets/CLAUDE_TEMPLATE.md` placeholders from the answers:

- `{{PROJECT_NAME}}` ← Q1
- `{{ROLE_TITLE}}` ← Q2
- `{{DOMAIN_EXPERTISE}}` ← Q3 (comma-joined prose)
- `{{PERSONA_EXTRA}}` ← one optional sentence elevating the persona (e.g. "You design and orchestrate autonomous pipelines."). Empty string if nothing to add.
- `{{IDENTITY_PRINCIPLES}}` ← Q4 as a markdown bullet list, one principle per line.
- `{{COMMUNICATION_STYLE}}` ← Q5 as 1–3 bullets.
- `{{TECH_STACK}}` ← Q6 as a short bullet list or one tight paragraph.
- `{{TOOLING_CONVENTIONS}}` ← Q7 as bullets, one convention per line. If none given, write "_None specified yet._"
- `{{REFERENCE_LINES}}` ← if the user named reference docs they intend to add, write one rule per doc (e.g. "- When writing Python code, read `docs/references/python_best_practices.md`."). If none, leave a single placeholder bullet: "- _Add rules here as you drop docs into `docs/references/`._"
- `{{WORKFLOW_SECTION}}` ← the default block in section 3, edited per Q8–Q10.
- `{{CORE_PRINCIPLES_EXTRA}}` ← Q11 as extra bullets, or empty string.

Remove any HTML comment hints from the template that no longer apply. Do not leave
unfilled `{{...}}` markers in the final file.

---

## 3. Default workflow block

Drop this in for `{{WORKFLOW_SECTION}}`, adjusting thresholds from Q8–Q10:

```
### 1. Plan first
- Enter plan mode for any non-trivial task (3+ steps or an architectural decision).
- If something goes sideways, STOP and re-plan — don't keep pushing.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagents
- Use subagents liberally to keep the main context window clean.
- Offload research, exploration, and parallel analysis. One task per subagent.

### 3. Self-improvement loop
- After ANY correction from the user, append the pattern to `docs/context/lessons.md`.
- Write a rule that prevents the same mistake. Review lessons at session start.

### 4. Verify before "done"
- Never mark a task complete without proving it works.
- Diff behavior between main and your change when relevant; run tests, check logs.
- Ask: "would a staff engineer approve this?"

### 5. Demand elegance (balanced)
- For non-trivial changes, pause: "is there a more elegant way?" Skip for obvious fixes.

### 6. Autonomous bug fixing
- Given a bug report, just fix it. Point at logs, errors, failing tests, then resolve them.
```
