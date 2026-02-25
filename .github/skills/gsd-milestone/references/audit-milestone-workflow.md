---
reference: audit-milestone-workflow
---

# Milestone Audit Protocol

Verify milestone achieved its definition of done before archiving.

## Sequence

```
Load context → Read phase verifications → 3-source requirement cross-reference
  → Spawn integration checker → Aggregate results → Produce audit report → Route
```

## Scope Determination

1. Parse version from arguments or detect current from ROADMAP.md
2. Identify all phase directories in milestone scope
3. Extract milestone definition of done from ROADMAP.md
4. Extract requirements mapped to this milestone from REQUIREMENTS.md

## Phase Verification Aggregation

For each phase, read VERIFICATION.md and extract:
- Status (passed / gaps_found)
- Critical gaps (blockers)
- Non-critical gaps (tech debt, deferred)
- Anti-patterns (TODOs, stubs, placeholders)
- Requirements coverage

Missing VERIFICATION.md = "unverified phase" = blocker.

## 3-Source Requirements Cross-Reference

### Source 1: REQUIREMENTS.md Traceability Table
- REQ-IDs mapped to phases
- Checked-off state (`[x]` vs `[ ]`)

### Source 2: Phase VERIFICATION.md Requirements Tables
- Requirement | Source Plan | Description | Status | Evidence

### Source 3: SUMMARY.md Frontmatter
- `requirements-completed` field from each phase's YAML frontmatter

### Status Matrix

| VERIFICATION | SUMMARY | REQUIREMENTS | Final Status |
|---|---|---|---|
| passed | listed | `[x]` | **satisfied** |
| passed | listed | `[ ]` | **satisfied** (update checkbox) |
| passed | missing | any | **partial** |
| gaps_found | any | any | **unsatisfied** |
| missing | listed | any | **partial** |
| missing | missing | any | **unsatisfied** |

### Fail Gate

- Any `unsatisfied` requirement → forces `gaps_found` audit status
- Orphaned requirements (in traceability but absent from ALL VERIFICATIONs) → treated as `unsatisfied`

## Integration Checking

Delegate to `gsd-integration-checker` agent:
- Cross-phase wiring verification
- E2E user flow validation
- Data handoff verification between phases
- Map findings to affected REQ-IDs

## Audit Report Structure

`.planning/v{version}-MILESTONE-AUDIT.md`:

```yaml
---
milestone: {version}
audited: {timestamp}
status: passed | gaps_found | tech_debt
scores:
  requirements: N/M
  phases: N/M
  integration: N/M
  flows: N/M
gaps:
  requirements: [{id, status, phase, evidence}]
  integration: [...]
  flows: [...]
tech_debt:
  - phase: {name}
    items: [...]
---
```

## Routing

| Audit Status | Recommended Action |
|---|---|
| `passed` | `/gsd-complete-milestone {version}` |
| `gaps_found` | `/gsd-plan-milestone-gaps` |
| `tech_debt` | Complete (accept debt) or plan cleanup |
