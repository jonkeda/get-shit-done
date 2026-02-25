# Configuration Reference

GSD configuration lives in `.planning/config.json`. Use the `gsd_config_load` and `gsd_config_set` MCP tools to read and modify settings.

## Schema

```json
{
  "project_name": "My Project",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "gates": {
      "plan_approval": "auto",
      "execution_approval": "auto"
    }
  },
  "git": {
    "auto_commit": true,
    "branch_strategy": "none",
    "branch_prefix": "gsd/",
    "commit_docs": true
  },
  "model_profile": "balanced"
}
```

## Settings Reference

### `project_name`
- **Type:** string
- **Default:** directory name
- **Description:** Display name for the project in status outputs

### `workflow.research`
- **Type:** boolean
- **Default:** `true`
- **Description:** Enable research phase before planning. When `false`, `/gsd-plan-phase` skips the research agent and plans directly.

### `workflow.plan_check`
- **Type:** boolean
- **Default:** `true`
- **Description:** Enable plan verification after planning. When `false`, plans are not checked by the plan-checker agent before execution.

### `workflow.verifier`
- **Type:** boolean
- **Default:** `true`
- **Description:** Enable verification after execution. When `false`, `/gsd-execute-phase` skips the verification step.

### `workflow.gates.plan_approval`
- **Type:** `"auto"` | `"manual"`
- **Default:** `"auto"`
- **Description:** Whether plans require manual approval before execution. `"auto"` proceeds immediately; `"manual"` pauses for user review.

### `workflow.gates.execution_approval`
- **Type:** `"auto"` | `"manual"`
- **Default:** `"auto"`
- **Description:** Whether execution requires manual approval after plan creation. `"auto"` proceeds immediately; `"manual"` pauses for user review.

### `git.auto_commit`
- **Type:** boolean
- **Default:** `true`
- **Description:** Automatically commit after each task during execution. When `false`, changes are left uncommitted.

### `git.branch_strategy`
- **Type:** `"none"` | `"phase"` | `"plan"`
- **Default:** `"none"`
- **Description:** Git branching strategy:
  - `"none"`: All work on current branch
  - `"phase"`: Create a branch per phase (e.g., `gsd/phase-03-comments`)
  - `"plan"`: Create a branch per plan (e.g., `gsd/phase-03-plan-01`)

### `git.branch_prefix`
- **Type:** string
- **Default:** `"gsd/"`
- **Description:** Prefix for auto-created branch names

### `git.commit_docs`
- **Type:** boolean
- **Default:** `true`
- **Description:** Include `.planning/` files in commits. When `false`, planning docs are not committed.

### `model_profile`
- **Type:** `"quality"` | `"balanced"` | `"budget"`
- **Default:** `"balanced"`
- **Description:** Model tier for GSD agents. See Model Profiles below.

## Model Profiles

| Profile | Primary Model | Use When |
|---------|--------------|----------|
| `quality` | Claude Opus 4.6 / Claude Sonnet 4.6 | Complex projects, critical code |
| `balanced` | Claude Sonnet 4.6 / GPT-4.1 | Most projects (recommended) |
| `budget` | Claude Haiku 4.5 / GPT-4.1 Mini | Simple tasks, rapid iteration |

Agents have fallback chains — if the primary model is unavailable, they fall back to the next available model.

## Modifying Configuration

Use MCP tools (preferred):
```
gsd_config_set({ key: "workflow.research", value: false })
gsd_config_set({ key: "git.branch_strategy", value: "phase" })
```

Or use the settings command:
```
/gsd-settings
```
