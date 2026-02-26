---
mode: agent
description: "Clean up completed debug sessions and archived planning artifacts"
---

Archive phase directories from completed milestones into `.planning/milestones/v{X.Y}-phases/`. Use when `.planning/phases/` has accumulated directories from past milestones.

## Process

### 1. Identify Completed Milestones

Read `.planning/MILESTONES.md` to find completed milestone versions.

Check which milestone archive dirs already exist:
```
ls -d .planning/milestones/v*-phases 2>/dev/null
```

Filter to milestones that do NOT already have a `-phases` archive directory.

If all milestones already archived:
```
All completed milestones already have phase directories archived. Nothing to clean up.
```
Exit.

### 2. Determine Phase Membership

For each completed milestone without a `-phases` archive, read the archived ROADMAP snapshot:
```
cat .planning/milestones/v{X.Y}-ROADMAP.md
```

Extract phase numbers and names. Match against directories still in `.planning/phases/`.

### 3. Show Dry-Run Summary

```
## Cleanup Summary

### v{X.Y} — {Milestone Name}
Phase directories to archive:
- 01-foundation/
- 02-auth/
- 03-core-features/

Destination: .planning/milestones/v{X.Y}-phases/

### v{X.Z} — {Milestone Name}
Phase directories to archive:
- 04-security/
- 05-hardening/

Destination: .planning/milestones/v{X.Z}-phases/
```

If no phase directories remain to archive:
```
No phase directories found to archive.
```
Exit.

Ask: "Proceed with archiving?" — Yes / Cancel

### 4. Archive Phases

For each milestone:
```bash
mkdir -p .planning/milestones/v{X.Y}-phases
mv .planning/phases/{dir} .planning/milestones/v{X.Y}-phases/
```

### 5. Commit

Use `gsd_commit` MCP tool:
- Message: `chore: archive phase directories from completed milestones`
- Files: `.planning/milestones/`, `.planning/phases/`

### 6. Report

```
Archived:
- v{X.Y}: {N} phase directories → .planning/milestones/v{X.Y}-phases/
- v{X.Z}: {M} phase directories → .planning/milestones/v{X.Z}-phases/

.planning/phases/ cleaned up.
```
