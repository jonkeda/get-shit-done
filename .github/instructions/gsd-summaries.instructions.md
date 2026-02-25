---
applyTo: ".planning/phases/**/*-SUMMARY.md"
---

This is a GSD execution summary. It records what was actually built during plan execution, including git commit hashes, deviations from the plan, patterns discovered, and decisions made.

**Rules:**
- Created by the executor agent after completing a plan — read-only after creation
- YAML frontmatter tracks: commits, dependencies added, patterns established, decisions made
- Body sections: What Was Built, Git History, Deviations, Patterns, Decisions
- Every claim must be verifiable against actual code and git history
- Commit hashes in frontmatter must match real git commits

**Frontmatter fields:**
- `commits`: Array of git commit hashes produced during execution
- `dependencies_added`: New packages/modules introduced
- `patterns_established`: Coding patterns set as precedent
- `decisions`: Architectural choices made during execution
