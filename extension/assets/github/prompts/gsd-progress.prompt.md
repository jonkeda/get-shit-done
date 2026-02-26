---
description: Check project progress and route to next action
---

Check this GSD project's progress, summarize state, and route to the next logical action.

## Steps

1. **Load state**: Call `gsd_state_load` to check project existence, then `gsd_state_snapshot` for current position.

2. **Analyze roadmap**: Call `gsd_roadmap_analyze` to get phase-by-phase status.

3. **Load progress context**: Call `gsd_init_progress` for full progress assembly.

4. **Present status**: Display a progress summary including:
   - Current milestone and phase
   - Progress bar (plans completed / total)
   - Phase-by-phase status table
   - Any blockers or paused work

5. **Route to next action** based on state:
   - **Route A (Paused work)**: If `.continue-here.md` exists → offer to resume
   - **Route B (Incomplete plan)**: If plans exist without summaries → offer to execute
   - **Route C (Phase complete)**: If all plans have summaries → offer verification or next phase
   - **Route D (Ready to plan)**: If phase has no plans → offer to plan
   - **Route E (Ready to research)**: If phase needs research → offer research
   - **Route F (All done)**: If all phases complete → offer milestone completion

Present the user with numbered options relevant to their current state.
