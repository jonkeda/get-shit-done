---
description: Configure GSD workflow toggles and model profile
---

Interactive configuration of GSD workflow settings.

## Steps

1. **Ensure config**: Call `gsd_config_ensure` to create config.json with defaults if missing.

2. **Load current config**: Call `gsd_config_load` to read current settings.

3. **Present settings**: Show current configuration and ask the user to choose what to change:

   **Current Settings:**
   | Setting | Current Value |
   |---------|--------------|
   | Model Profile | {model_profile} |
   | Research Phase | {workflow.research} |
   | Plan Checker | {workflow.plan_check} |
   | Verifier | {workflow.verifier} |
   | Branching Strategy | {branching_strategy} |
   | Auto-commit Docs | {commit_docs} |

   Ask: "Which settings would you like to change? You can update one or more."

4. **For each setting changed**, call `gsd_config_set` with the appropriate key:
   - Model Profile → `model_profile` (quality/balanced/budget)
   - Research → `workflow.research` (true/false)
   - Plan Checker → `workflow.plan_check` (true/false)
   - Verifier → `workflow.verifier` (true/false)
   - Branching → `branching_strategy` (none/phase/milestone)
   - Auto-commit → `commit_docs` (true/false)

5. **Confirm**: Display updated settings table.
