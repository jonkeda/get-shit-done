---
applyTo: ".planning/phases/**/*-PLAN.md"
---

This is a GSD execution plan. Tasks are ordered by dependency. Each task has `files`, `action`, `verify`, `done` fields. Execute via `/gsd-execute-phase`. Do not modify plans manually during execution — the executor agent handles task progression, commits, and state updates.
