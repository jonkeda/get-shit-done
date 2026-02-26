# Model Profile Resolution

Resolve model profile once at the start of orchestration, then use it for all agent spawns.

## Resolution Pattern

Read `.planning/config.json` and extract the `model_profile` value. Default: `balanced` if not set or config missing.

## Lookup Table

@.gsd/references/model-profiles.md

Look up the agent in the table for the resolved profile. Pass the model parameter when delegating to agents.

**Note:** Opus-tier agents resolve to `"inherit"` (not `"opus"`). This causes the agent to use the parent session's model, avoiding conflicts with organization policies that may block specific opus versions.

## Usage

1. Resolve once at orchestration start
2. Store the profile value
3. Look up each agent's model from the table when spawning
4. Pass model parameter to each agent delegation (values: `"inherit"`, `"sonnet"`, `"haiku"`)
