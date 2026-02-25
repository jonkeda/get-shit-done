---
mode: agent
description: "Remove future phase and renumber subsequent phases"
---

Remove an unstarted future phase from the roadmap, delete its directory, renumber all subsequent phases, and commit. The git commit serves as the historical record.

**Arguments:** `$ARGUMENTS` (phase number — required)

## Process

### 1. Parse Arguments

- `/gsd-remove-phase 17` → phase = 17
- `/gsd-remove-phase 16.1` → phase = 16.1

If no argument:
```
ERROR: Phase number required
Usage: /gsd-remove-phase <phase-number>
Example: /gsd-remove-phase 17
```
Exit.

### 2. Initialize

Call `gsd_init_phase_op` MCP tool with the target phase number.

Extract: `phase_found`, `phase_dir`, `phase_number`, `commit_docs`, `roadmap_exists`.

Read STATE.md to get current phase position.

### 3. Validate Future Phase

Target must be > current phase number.

If target ≤ current phase:
```
ERROR: Cannot remove Phase {target}

Only future phases can be removed:
- Current phase: {current}
- Phase {target} is current or completed

To abandon current work, use /gsd-pause-work instead.
```
Exit.

### 4. Confirm Removal

```
Removing Phase {target}: {Name}

This will:
- Delete: .planning/phases/{target}-{slug}/
- Renumber all subsequent phases
- Update: ROADMAP.md, STATE.md

Proceed? (y/n)
```

Wait for confirmation.

### 5. Execute Removal

Call `gsd_phase_remove` MCP tool with the target phase number.

The tool handles:
- Deleting the phase directory
- Renumbering all subsequent directories (reverse order to avoid conflicts)
- Renaming files inside renumbered directories
- Updating ROADMAP.md (removing section, renumbering references, updating dependencies)
- Updating STATE.md

If the phase has executed plans (SUMMARY.md files), the tool will error. Ask user to confirm with `--force` flag.

### 6. Commit

Use `gsd_commit` MCP tool:
- Message: `chore: remove phase {target} ({original-phase-name})`
- Files: `.planning/`

### 7. Confirm

```
Phase {target} ({original-name}) removed.

Changes:
- Deleted: .planning/phases/{target}-{slug}/
- Renumbered: {N} directories and {M} files
- Updated: ROADMAP.md, STATE.md
- Committed

---

Would you like to:
- `/gsd-progress` — see updated roadmap status
- Continue with current phase
```
