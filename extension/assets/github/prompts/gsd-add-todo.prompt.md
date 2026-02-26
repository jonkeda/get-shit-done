---
description: Capture idea or task as todo for later
---

Capture an idea, task, or issue as a structured todo for later work.

## Input
The user may provide a description after the command, or you can extract it from conversation context.

## Steps

1. **Init context**: Call `gsd_init_todos` to get current todo count and directory state.

2. **Extract content**: From the user's input or recent conversation, determine:
   - **Title**: Short descriptive title
   - **Problem**: What needs to be addressed
   - **Solution idea**: Initial approach (if mentioned)
   - **Related files**: Any files referenced

3. **Infer area**: Based on file paths and content, categorize as one of: api, ui, auth, database, testing, docs, planning, tooling, general.

4. **Generate slug**: Call `gsd_generate_slug` with the title.

5. **Get timestamp**: Call `gsd_current_timestamp` with format "date".

6. **Create todo file** at `.planning/todos/pending/{date}-{slug}.md`:
   ```markdown
   ---
   created: {date}
   title: {title}
   area: {area}
   ---
   
   # {title}
   
   ## Problem
   {problem description}
   
   ## Solution Ideas
   {initial approach or "TBD"}
   
   ## Related Files
   {list of related files or "None identified"}
   ```

7. **Commit**: Call `gsd_commit` with message `docs(planning): add todo - {title}`.

8. **Confirm**: Tell the user the todo was saved with its title, area, and file path.
