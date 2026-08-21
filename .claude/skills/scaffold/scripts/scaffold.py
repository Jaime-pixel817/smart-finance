#!/usr/bin/env python3
"""
scaffold.py - Create a project's docs/ working-memory structure WITHOUT overwriting.

Creates, only if missing:
    docs/
      context/
        memory.md, lessons.md, session-log.md, todo.md, results.md
      references/        (kept empty - drop project-specific reference docs here)
      agents/            (kept empty - design business/project-specific agents here)

Rules:
- Never modifies or overwrites an existing file. Existing items are reported as "kept".
- Does NOT touch CLAUDE.md. That file is generated separately from the interview
  answers + assets/CLAUDE_TEMPLATE.md, so the persona is preserved on re-runs.
- Prints a report of created vs. kept so the caller can tell the user exactly
  what changed.

Usage:
    python scaffold.py [TARGET_DIR]      # TARGET_DIR defaults to the current directory
"""

import sys
from pathlib import Path

# Starter content for each context file. Intentionally tiny: enough to teach the
# format and the one-line discipline, nothing more.
STARTERS = {
    "memory.md": (
        "# Project Memory\n\n"
        "Architecture decisions and high-relevance facts. One line each, readable.\n"
        "Format: `# decision: one-sentence rationale`. Dedupe before appending -\n"
        "never restate a fact that is already here.\n\n"
        "<!-- Soft cap ~11k tokens (bytes / 4). Past it: snapshot to\n"
        "docs/context/archive/memory/<YYYY-MM-DD>.md, then compact in place. -->\n"
    ),
    "lessons.md": (
        "# Lessons\n\n"
        "Mistakes turned into rules. Append after every correction. One line each,\n"
        "list format. Before a fix, grep this file for the area - you may have hit\n"
        "it before.\n\n"
        "<!-- Soft cap ~7k tokens (bytes / 4). -->\n"
    ),
    "session-log.md": (
        "# Session Log\n\n"
        "One line per session, newest at top. Format: `[YYYY-MM-DD]: what happened`.\n\n"
        "<!-- Soft cap ~4k tokens (bytes / 4). -->\n"
    ),
    "todo.md": (
        "# TODO\n\n"
        "Open work ONLY - holds `pending` and `in_progress` items. Done items move\n"
        "to results.md. Format: `- [ ] (pending|in_progress) task - short note`.\n\n"
        "<!-- Soft cap ~2.5k tokens (bytes / 4). -->\n"
    ),
    "results.md": (
        "# Results / Build Log\n\n"
        "Review notes for completed work. 1-4 lines per entry, list format, readable.\n\n"
        "<!-- Soft cap ~6k tokens (bytes / 4). -->\n"
    ),
}

# Guidance .gitkeep for each intentionally-empty folder. Keeps the folder under
# version control without seeding a real file (user asked for empty folders).
EMPTY_DIR_KEEPS = {
    "references": (
        "# Drop project-specific reference docs in this folder.\n"
        "# Wire each into CLAUDE.md's References section as a one-line, read-on-demand rule.\n"
        "# Examples: python_best_practices.md, agent-design-best-practices.md, BRAND_GUIDELINES.md\n"
    ),
    "agents": (
        "# Design business/project-specific agents here, one file per agent.\n"
        "# Read on demand when working on a given agent - never bulk-read.\n"
        "# Examples: research-agent.md, reconciliation-agent.md, orchestrator.md\n"
    ),
}


def main():
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    if not target.exists():
        print(f"ERROR: target directory does not exist: {target}")
        return 1

    docs = target / "docs"
    context = docs / "context"
    references = docs / "references"
    agents = docs / "agents"

    created, kept = [], []

    for d in (docs, context, references, agents):
        if d.exists():
            kept.append(f"{d.relative_to(target)}/")
        else:
            d.mkdir(parents=True, exist_ok=True)
            created.append(f"{d.relative_to(target)}/")

    for name, content in STARTERS.items():
        f = context / name
        if f.exists():
            kept.append(str(f.relative_to(target)))
        else:
            f.write_text(content, encoding="utf-8")
            created.append(str(f.relative_to(target)))

    for dirname, keep_content in EMPTY_DIR_KEEPS.items():
        keep = docs / dirname / ".gitkeep"
        if keep.exists():
            kept.append(str(keep.relative_to(target)))
        else:
            keep.write_text(keep_content, encoding="utf-8")
            created.append(str(keep.relative_to(target)))

    print(f"Scaffold target: {target}\n")
    print("CREATED:" if created else "CREATED: (nothing - already scaffolded)")
    for item in created:
        print(f"  + {item}")
    if kept:
        print("\nKEPT (untouched, already present):")
        for item in kept:
            print(f"  = {item}")

    claude_md = target / "CLAUDE.md"
    print(
        "\nCLAUDE.md: "
        + (
            "EXISTS - left untouched. Do not overwrite; ask the user before changing it."
            if claude_md.exists()
            else "MISSING - generate it from the interview + assets/CLAUDE_TEMPLATE.md."
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
