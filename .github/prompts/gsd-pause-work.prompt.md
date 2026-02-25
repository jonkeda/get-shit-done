---
description: Save complete context for resuming later
---

Create a `.continue-here.md` handoff file to preserve work state across sessions.

## Steps

1. **Detect active phase**: Call `gsd_state_snapshot` to get current phase, then `gsd_find_phase` to locate the phase directory.

2. **Gather context**: Ask the user:
   - What were you working on?
   - What's the current status?
   - Any decisions made this session?
   - Any blockers or concerns?
   - What should be done next?

3. **Build handoff file**: Create `.continue-here.md` in the phase directory with:
   ```markdown
   ---
   phase: "{phase_number}"
   task: "{current_plan}"
   status: "paused"
   last_updated: "{ISO timestamp}"
   ---
   
   # Continue Here
   
   ## Current State
   {what was being worked on and current status}
   
   ## Completed This Session
   {list of completed items}
   
   ## Remaining Work
   {what still needs to be done}
   
   ## Decisions Made
   {any decisions from this session}
   
   ## Blockers
   {any blockers or concerns}
   
   ## Next Action
   {specific next step to take when resuming}
   ```

4. **Update state**: Call `gsd_state_record_session` with the stopped-at description and resume file path.

5. **Commit**: Call `gsd_commit` with message `docs(planning): pause work - {phase description}`.

6. **Confirm**: Tell the user where the file was saved and that they can resume with `/gsd-resume-work`.
