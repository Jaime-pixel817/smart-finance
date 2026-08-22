---
name: scaffold
description: Scaffold a project's Claude operating structure - create docs/context/ (memory.md, lessons.md, session-log.md, todo.md, results.md), an empty docs/references/, and a tailored CLAUDE.md generated from a short interview about the project's persona, identity, tech stack, and workflow. Use when the user wants to set up, initialize, bootstrap, or scaffold project memory and context files, a CLAUDE.md, or agent operating instructions for a repo or working folder. Triggers include "scaffold", "scaffold this project", "set up CLAUDE.md", "initialize project docs", "create context files", "bootstrap project memory", and "set up agent instructions". Fills only missing pieces, never overwrites, and asks before changing an existing CLAUDE.md.
---

# Scaffold

Set up a project's working-memory structure and a tailored `CLAUDE.md` so future
Claude sessions in this repo have persistent context and clear operating rules.

## What it produces

```
docs/
  context/
    memory.md        architecture decisions / high-relevance facts
    lessons.md       mistakes turned into rules
    session-log.md   one line per session
    todo.md          open work (pending / in_progress only)
    results.md       build log / review notes
  references/        empty - project-specific reference docs go here
  agents/            empty - business/project-specific agent designs go here
CLAUDE.md            persona + operating instructions (generated from an interview)
```

## Operating rules (non-negotiable)

- **Gap-fill, never overwrite.** Create only what's missing. Never modify or
  replace an existing file silently.
- **Ask before changing anything that exists.** If `CLAUDE.md` (or any target
  file) is already present, do not touch it without explicit approval.
- **Caps are guidance, not enforced.** The generated `CLAUDE.md` documents soft
  token caps and one-line discipline as *manual* hygiene. Do **not** create hooks,
  PowerShell scripts, or slash commands.
- **`references/` and `agents/` stay empty.** Create both folders (each with a
  `.gitkeep`), but do not seed files. Wire any reference docs the user names into
  `CLAUDE.md`'s References section as one-line, read-on-demand rules. `agents/` is
  a staging folder for business/project-specific agent designs, added later.
- **Light orchestration only.** The generated `CLAUDE.md` includes a compact
  "Agent Orchestration" section that documents the agent-file format **inline**, so
  agents are added later without any separate template file and with no references
  to protocol files that don't exist. Do not scaffold subteam/pipeline machinery.

## Workflow

### Step 1 — Confirm the target directory
Scaffold into the project root the user means — usually the connected working
folder. Confirm the path. If no folder is connected, ask the user to connect their
project folder before continuing (it can't scaffold a folder it can't see).

### Step 2 — Interview for the persona
Read `references/interview-guide.md` and run the interview. It captures project
name, role/seniority, domain, identity principles, communication style, tech stack,
tooling conventions, and (optionally) workflow customizations. Batch the questions;
reuse anything the user already told you; don't re-ask. This step defines the
`CLAUDE.md` content — do it before writing that file.

### Step 3 — Create the structure
Run the scaffold script against the confirmed target:

```bash
python scripts/scaffold.py /path/to/project
```

It creates the `docs/` tree and the five context files **only if missing**, never
overwrites, and prints a CREATED vs. KEPT report plus whether `CLAUDE.md` exists.
Relay that report to the user verbatim-ish so they know exactly what changed.

### Step 4 — Generate CLAUDE.md
Read `assets/CLAUDE_TEMPLATE.md`, fill every `{{PLACEHOLDER}}` from the interview
answers (mapping is in `references/interview-guide.md`), and remove any leftover
comment hints. Leave **no** unfilled `{{...}}` markers.

- If `CLAUDE.md` does **not** exist → write it to the project root.
- If `CLAUDE.md` **does** exist → do not overwrite. Show the user the proposed
  version (or just the sections they're missing) and ask whether to (a) leave the
  current file as-is, (b) replace it, or (c) merge in the missing sections. Act
  only on their choice