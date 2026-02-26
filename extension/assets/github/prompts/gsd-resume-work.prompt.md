---
description: Resume work from previous session with full context restoration
---

Restore complete project context and resume work from a previous session.

## Steps

1. **Load state**: Call `gsd_init_resume` to check project existence and detect interrupted work.

2. **Read STATE.md**: Call `gsd_state_snapshot` for current position (phase, plan, progress, blockers, paused-at).

3. **Check for checkpoints**: Look for `.continue-here.md` files in the current phase directory using `gsd_find_phase`. If found, read it for full context.

4. **Check for incomplete work**: Look for plans without matching summaries in the current phase.

5. **Present status**: Display a summary box:
   ```
   ┌─────────────────────────────────────┐
   │ GSD Session Resume                  │
   │ Phase: {N} - {name}                 │
   │ Plan: {current} of {total}          │
   │ Progress: [████░░░░░░] 40%          │
   │ Status: {status}                    │
   └─────────────────────────────────────┘
   ```
   Include warnings for: incomplete work, pending todos, blockers.

6. **Offer options** based on detected state:
   - If `.continue-here.md` exists: "Resume from checkpoint"
   - If incomplete plan: "Continue executing plan {X}"
   - If phase ready to plan: "Start planning phase {N}"
   - If phase complete: "Verify phase {N}" or "Move to next phase"
   - Always: "Check progress", "Pause again"

7. **Execute chosen action** by routing to the appropriate command.
