---
mode: agent
description: "Audit milestone — verify cross-phase integration and requirement coverage"
---

Verify the current milestone achieved its definition of done by aggregating phase verifications, checking cross-phase integration, and assessing requirements coverage.

**Arguments:** `$ARGUMENTS` (optional — milestone version)

## Process

Read and follow the **Audit Flow** defined in `.github/skills/gsd-milestone/SKILL.md`.

The audit flow covers:

1. **Load milestone context** — Call `gsd_state_load`, identify all phase directories in scope
2. **Read all phase verifications** — For each phase, read VERIFICATION.md; flag missing verifications as blockers
3. **Cross-reference requirements** — 3-source verification across REQUIREMENTS.md, phase VERIFICATION.md, and SUMMARY.md frontmatter
4. **Spawn integration checker** — Verify cross-phase wiring, E2E user flows, data handoffs
5. **Produce audit report** — Create `.planning/v{version}-MILESTONE-AUDIT.md` with status, scores, gaps, tech debt
6. **Present results and route** — If passed → suggest `/gsd-complete-milestone`; if gaps → suggest `/gsd-plan-milestone-gaps`
