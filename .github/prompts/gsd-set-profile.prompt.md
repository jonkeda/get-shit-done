---
mode: agent
description: "Quick model profile switch (quality/balanced/budget)"
tools: [read, edit, execute]
---

Switch the model profile used by GSD agents. Controls quality vs cost balance.

**Arguments:** `$ARGUMENTS` (profile name — required: quality, balanced, or budget)

## Process

### 1. Validate

If argument missing or not one of `quality`, `balanced`, `budget`:
```
ERROR: Invalid profile "{argument}"
Valid profiles: quality, balanced, budget
Usage: /gsd-set-profile <profile>
```
Exit.

### 2. Update Config

Call `gsd_config_set` MCP tool with key `model_profile` and the selected profile value.

If `.planning/config.json` doesn't exist, it will be created with defaults first.

### 3. Confirm

```
✓ Model profile set to: {profile}

| Profile   | Planning  | Execution | Verification |
|-----------|-----------|-----------|--------------|
| quality   | opus      | opus      | sonnet       |
| balanced  | opus      | sonnet    | sonnet       |
| budget    | sonnet    | sonnet    | haiku        |

Current: **{profile}** ← active

Next spawned agents will use the new profile.
```
