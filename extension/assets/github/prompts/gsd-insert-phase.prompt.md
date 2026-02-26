---
mode: agent
description: "Insert urgent work as decimal phase between existing phases"
---

Insert a decimal phase for urgent work discovered mid-milestone between existing integer phases. Uses decimal numbering (72.1, 72.2, etc.) to preserve the logical sequence without renumbering.

**Arguments:** `$ARGUMENTS` (format: `<after-phase-number> <description>` — both required)

## Process

### 1. Parse Arguments

First argument: integer phase number to insert after. Remaining arguments: phase description.
- `/gsd-insert-phase 72 Fix critical auth bug` → after = 72, description = "Fix critical auth bug"

If arguments missing:
```
ERROR: Both phase number and description required
Usage: /gsd-insert-phase <after> <description>
Example: /gsd-insert-phase 72 Fix critical auth bug
```
Exit.

### 2. Initialize

Call `gsd_init_phase_op` MCP tool with the after-phase number.

Check `roadmap_exists`. If false:
```
ERROR: No roadmap found (.planning/ROADMAP.md)
```
Exit.

### 3. Insert Phase

Call `gsd_phase_insert` MCP tool with `after_phase` and `description`.

The tool handles:
- Verifying target phase exists in ROADMAP.md
- Calculating next decimal phase number (checking existing decimals on disk)
- Generating slug from description
- Creating phase directory `.planning/phases/{N.M}-{slug}/`
- Inserting phase entry into ROADMAP.md after target phase with `(INSERTED)` marker

Extract: `phase_number`, `after_phase`, `name`, `slug`, `directory`.

### 4. Update State

Read `.planning/STATE.md`. Under "## Accumulated Context" → "### Roadmap Evolution", add:
```
- Phase {decimal_phase} inserted after Phase {after_phase}: {description} (URGENT)
```

Create the section if it doesn't exist.

### 5. Confirm

```
Phase {decimal_phase} inserted after Phase {after_phase}:
- Description: {description}
- Directory: .planning/phases/{decimal-phase}-{slug}/
- Status: Not planned yet
- Marker: (INSERTED) — indicates urgent work

Roadmap updated: .planning/ROADMAP.md

---

## ▶ Next Up

**Phase {decimal_phase}: {description}** — urgent insertion

`/gsd-plan-phase {decimal_phase}`

---

Also available:
- Review insertion impact: check if Phase {next_integer} dependencies still hold
- Review roadmap
```
