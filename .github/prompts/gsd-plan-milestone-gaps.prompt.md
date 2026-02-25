---
mode: agent
description: "Create phases to close gaps identified by milestone audit"
tools: [read, edit, execute]
---

Create all phases necessary to close gaps identified by `/gsd-audit-milestone`. One command creates all fix phases — no manual `/gsd-add-phase` per gap.

## Process

### 1. Load Audit Results

Find the most recent audit file:
```
ls -t .planning/v*-MILESTONE-AUDIT.md | head -1
```

Parse YAML frontmatter for structured gaps:
- `gaps.requirements` — unsatisfied requirements
- `gaps.integration` — missing cross-phase connections
- `gaps.flows` — broken end-to-end flows

If no audit file or no gaps:
```
No audit gaps found. Run `/gsd-audit-milestone` first.
```
Exit.

### 2. Prioritize Gaps

Group by priority from REQUIREMENTS.md:

| Priority | Action |
|---|---|
| `must` | Create phase — blocks milestone |
| `should` | Create phase — recommended |
| `nice` | Ask user: include or defer? |

### 3. Group Gaps into Phases

Cluster related gaps into logical phases:
- Same affected phase → combine
- Same subsystem (auth, API, UI) → combine
- Dependency order (fix stubs before wiring)
- Keep phases focused: 2–4 tasks each

### 4. Determine Phase Numbers

Find highest existing phase number. New phases continue sequentially.

### 5. Present Gap Closure Plan

```
## Gap Closure Plan

**Milestone:** {version}
**Gaps to close:** {N} requirements, {M} integration, {K} flows

### Proposed Phases

**Phase {N}: {Name}**
Closes:
- {REQ-ID}: {description}
- Integration: {from} → {to}
Tasks: {count}

**Phase {N+1}: {Name}**
Closes:
- {REQ-ID}: {description}
Tasks: {count}

[If nice-to-have gaps:]
### Deferred (nice-to-have)
- {gap description}

Create these {X} phases? (yes / adjust / defer all optional)
```

Wait for confirmation.

### 6. Update ROADMAP.md

Add new phases with goals derived from the gaps being closed. Include `**Gap Closure:** Closes gaps from audit` marker.

### 7. Update REQUIREMENTS.md

For each REQ-ID assigned to a gap closure phase:
- Update Phase column to reflect the new phase
- Reset Status to `Pending`
- Change `[x]` → `[ ]` for requirements the audit found unsatisfied

### 8. Create Phase Directories

Create `.planning/phases/{NN}-{name}/` for each new phase.

### 9. Commit

Use `gsd_commit` MCP tool:
- Message: `docs(roadmap): add gap closure phases {N}-{M}`
- Files: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`

### 10. Offer Next Steps

```
## ✓ Gap Closure Phases Created

**Phases added:** {N} – {M}
**Gaps addressed:** {count} requirements, {count} integration, {count} flows

---

## ▶ Next Up

`/gsd-plan-phase {N}` — plan first gap closure phase

After all gap phases complete:
- `/gsd-audit-milestone` — re-audit to verify gaps closed
- `/gsd-complete-milestone {version}` — archive when audit passes
```
