# Verification Report Template

Template for `.planning/phases/XX-name/{phase_num}-VERIFICATION.md` — phase goal verification results.

---

```markdown
---
phase: XX-name
verified: YYYY-MM-DDTHH:MM:SSZ
status: passed | gaps_found | human_needed
score: N/M must-haves verified
---

# Phase {X}: {Name} Verification Report

**Phase Goal:** {goal from ROADMAP.md}
**Verified:** {timestamp}
**Status:** {passed | gaps_found | human_needed}

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | {truth from must_haves} | ✓ VERIFIED | {what confirmed it} |
| 2 | {truth} | ✗ FAILED | {what's wrong} |
| 3 | {truth} | ? UNCERTAIN | {why can't verify} |

**Score:** {N}/{M} truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/X.tsx` | Component | ✓ EXISTS + SUBSTANTIVE | Exports, renders, no stubs |
| `src/app/api/x/route.ts` | API route | ✗ STUB | POST returns placeholder |

**Artifacts:** {N}/{M} verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Component | /api/route | fetch | ✓ WIRED | Line N: fetch call with response handling |
| Input | POST | onSubmit | ✗ NOT WIRED | onSubmit only console.logs |

**Wiring:** {N}/{M} connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| REQ-01: {desc} | ✓ SATISFIED | — |
| REQ-02: {desc} | ✗ BLOCKED | API route is stub |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| file.ts | N | `// TODO` | ⚠️ Warning | Incomplete |
| file.tsx | N | Placeholder div | 🛑 Blocker | No content |

## Human Verification Required

[If none: "None — all verifiable items checked programmatically."]

[If needed:]
### 1. {Test Name}
**Test / Expected / Why human**

## Gaps Summary

[If no gaps: "No gaps found. Phase goal achieved. Ready to proceed."]

[If gaps:]
### Critical Gaps (Block Progress)
1. **{Gap}** — Missing: / Impact: / Fix:

### Non-Critical Gaps (Can Defer)
1. **{Gap}** — Issue: / Impact: / Recommendation:

## Recommended Fix Plans
[If gaps found, generate fix plan recommendations with objective, tasks, estimated scope]

---
*Verified: {timestamp}*
```

---

## Status Values

- `passed` — All must-haves verified, no blockers
- `gaps_found` — One or more critical gaps found
- `human_needed` — Automated checks pass but human verification required

## Routing

| Status | Next Step |
|--------|-----------|
| passed | `/gsd-verify-work {N}` or next phase |
| gaps_found | `/gsd-plan-phase {N} --gaps` |
| human_needed | Present human verification items, then proceed |
