---
mode: agent
description: "Check project health — file integrity, state consistency, config validation"
tools: [read, execute, search]
---

Validate `.planning/` directory integrity and report actionable issues. Optionally repair auto-fixable problems.

**Arguments:** `$ARGUMENTS` (optional `--repair` flag)

## Process

### 1. Parse Arguments

Check if `--repair` flag is present.

### 2. Run Health Checks

Perform these validation checks:

**Critical (Errors):**
- `.planning/` directory exists
- `PROJECT.md` exists and has required sections
- `ROADMAP.md` exists
- `STATE.md` exists and parses correctly
- `config.json` is valid JSON

**Consistency (Warnings):**
- STATE.md references valid phase numbers
- Phase numbering is sequential (no gaps except decimals)
- ROADMAP.md phase entries match directories on disk
- Phase directories follow `NN-name` naming convention
- config.json fields have valid values

**Informational:**
- Plans without SUMMARY.md (may be in progress)
- Orphaned phase directories not in ROADMAP.md
- Phase in ROADMAP.md with no directory

### 3. Format Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: HEALTHY | DEGRADED | BROKEN
Errors: N | Warnings: N | Info: N
```

**If errors exist:**
```
## Errors
- [E001] config.json: JSON parse error at line 5
  Fix: Run /gsd-health --repair to reset to defaults
```

**If warnings exist:**
```
## Warnings
- [W001] STATE.md references phase 5, but only phases 1-3 exist
  Fix: Run /gsd-health --repair to regenerate
```

**If info exists:**
```
## Info
- [I001] 02-implementation/02-01-PLAN.md has no SUMMARY.md
  Note: May be in progress
```

### 4. Auto-Repair (if --repair)

Repairable issues:

| Action | Effect |
|---|---|
| Create config.json | Created with defaults |
| Reset config.json | Delete + recreate (loses custom settings) |
| Regenerate STATE.md | Created from ROADMAP structure (loses session history) |

**Not auto-repairable** (too risky):
- PROJECT.md, ROADMAP.md content
- Phase directory renaming
- Orphaned plan cleanup

### 5. Offer Repair (if repairable issues and no --repair)

```
{N} issues can be auto-repaired. Run: /gsd-health --repair
```

If user wants to proceed, run repairs and re-check to confirm resolution.

### Error Codes

| Code | Severity | Description | Repairable |
|------|----------|-------------|------------|
| E001 | error | .planning/ not found | No |
| E002 | error | PROJECT.md not found | No |
| E003 | error | ROADMAP.md not found | No |
| E004 | error | STATE.md not found | Yes |
| E005 | error | config.json parse error | Yes |
| W001 | warning | PROJECT.md missing section | No |
| W002 | warning | STATE.md references invalid phase | Yes |
| W003 | warning | config.json not found | Yes |
| W004 | warning | config.json invalid field | No |
| W005 | warning | Phase directory naming mismatch | No |
| W006 | warning | Phase in ROADMAP but no directory | No |
| W007 | warning | Phase on disk not in ROADMAP | No |
| I001 | info | Plan without SUMMARY | No |
