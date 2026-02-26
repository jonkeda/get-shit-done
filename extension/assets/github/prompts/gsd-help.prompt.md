---
description: Show available GSD commands and usage guide
---

Display the complete GSD command reference below. Output ONLY this content — no project analysis, git status, or commentary.

# GSD Command Reference

## Core Workflow
| Command | Description |
|---------|-------------|
| `/gsd-new-project` | Initialize a new GSD project with planning structure |
| `/gsd-progress` | Check progress, show context, route to next action |
| `/gsd-pause-work` | Save complete context for resuming later |
| `/gsd-resume-work` | Restore context and resume from previous session |

## Phase Planning
| Command | Description |
|---------|-------------|
| `/gsd-research-phase {N}` | Deep research before planning a phase |
| `/gsd-discuss-phase {N}` | Interactive Q&A to capture decisions for a phase |
| `/gsd-plan-phase {N}` | Create execution plans for a phase |
| `/gsd-execute-phase {N}` | Execute plans for a phase |
| `/gsd-verify-work {N}` | Verify completed phase work |

## Quick Mode
| Command | Description |
|---------|-------------|
| `/gsd-quick "description"` | Plan and execute a quick task in one session |

## Roadmap Management
| Command | Description |
|---------|-------------|
| `/gsd-add-phase "description"` | Append a new phase to the roadmap |
| `/gsd-remove-phase {N}` | Remove a future phase and renumber |
| `/gsd-insert-phase {N} "description"` | Insert urgent work as decimal phase |

## Milestone Management
| Command | Description |
|---------|-------------|
| `/gsd-new-milestone` | Start a new milestone |
| `/gsd-complete-milestone` | Complete current milestone and archive |

## Configuration
| Command | Description |
|---------|-------------|
| `/gsd-settings` | Configure workflow toggles and model profile |
| `/gsd-set-profile {profile}` | Switch model profile (quality/balanced/budget) |

## Utilities
| Command | Description |
|---------|-------------|
| `/gsd-add-todo "description"` | Capture task/idea for later |
| `/gsd-check-todos` | List and manage pending todos |
| `/gsd-health` | Check project health and consistency |
| `/gsd-map-codebase` | Generate codebase analysis docs |
| `/gsd-update` | Check for GSD updates |
