---
mode: agent
description: "Interactive UAT verification — walk through deliverables, diagnose failures, create fix plans"
---

Validate built features through conversational user acceptance testing. Walk through each deliverable one at a time, record pass/fail, diagnose failures, and optionally create fix plans.

**Arguments:** `$ARGUMENTS` (phase number — optional)

- If phase number provided: start/resume UAT for that phase
- If omitted: list active UAT sessions or prompt for phase number

## Process

Read and follow the complete workflow defined in `.github/skills/gsd-verify-work/SKILL.md`.

The skill covers:

1. **Initialize** — Parse phase number, load state, check for active UAT sessions
2. **Extract testable deliverables** — Read SUMMARY.md, VERIFICATION.md, and PLAN.md to identify user-observable outcomes
3. **Create UAT file** — Write `{phase}-UAT.md` with all test cases
4. **Walk through tests** — Present each deliverable one at a time, show expected behavior, ask user to confirm pass/fail
5. **Record results** — Update UAT.md with results and notes
6. **Diagnose failures** — For failed tests, investigate root cause and suggest fixes
7. **Create fix plans** — If gaps found, optionally generate fix PLAN.md files for `/gsd-execute-phase {N} --gaps-only`
8. **Present summary** — Show pass/fail counts, overall status, next steps
