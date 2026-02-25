---
mode: agent
description: "Scientific debugging with persistent sessions — hypothesis → experiment → conclusion"
---

Systematic debugging using scientific method with persistent session files. Supports new investigations and resuming prior sessions across context resets.

**Arguments:** `$ARGUMENTS` (optional — symptom description)

- If provided: start a new debug session for the described issue
- If omitted: list active sessions and offer to resume or start new

```
Examples:
  /gsd-debug The app crashes on startup after the auth migration
  /gsd-debug Tests timeout when running the integration suite
  /gsd-debug
```

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-debug/SKILL.md`.

The skill covers:

1. **Check for active sessions** — Look for `.planning/debug/*.md` files (excluding resolved/)
2. **Gather symptoms** (new issue) — Ask focused questions: expected vs actual behavior, error messages, timeline, reproduction steps
3. **Create debug session file** — Write session file with structured format: symptom profile, hypotheses, evidence log
4. **Delegate to debugger** — Spawn debugger agent with session context; follows hypothesis → experiment → conclusion cycle
5. **Update session** — Record findings, eliminated hypotheses, and next steps
6. **Resolution** — When resolved, move session to `.planning/debug/resolved/`, commit fix
