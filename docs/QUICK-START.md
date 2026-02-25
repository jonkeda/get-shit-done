# Quick Start Guide

Get up and running with GSD in 5 minutes.

## Prerequisites

- **VS Code** with GitHub Copilot extension (agent mode enabled)
- **Node.js** 16.7 or later
- **Git** configured with `user.name` and `user.email`

## Installation

```bash
npx gsd-copilot@latest
```

The installer will:
1. Copy GSD agents, skills, and prompts to `.github/`
2. Set up the MCP server in `.gsd/`
3. Configure `.vscode/mcp.json`
4. Add `.gsd/` to `.gitignore`

## Your First Project

### 1. Start a New Project

Open VS Code Copilot chat and type:

```
/gsd-new-project
```

GSD will interview you about your project — goals, tech stack, constraints — then create:
- `.planning/PROJECT.md` — project definition
- `.planning/REQUIREMENTS.md` — requirement specifications
- `.planning/ROADMAP.md` — phased execution roadmap
- `.planning/STATE.md` — project state tracker
- `.planning/config.json` — workflow configuration

### 2. Discuss a Phase (Optional)

Before planning, share your preferences for how a phase should be implemented:

```
/gsd-discuss-phase 1
```

GSD will ask targeted questions about your preferences and save them to a CONTEXT.md file that the planner will follow.

### 3. Plan a Phase

```
/gsd-plan-phase 1
```

This researches the problem space, creates execution plans with task breakdowns, dependency analysis, and verification criteria, then validates the plans.

### 4. Execute a Phase

```
/gsd-execute-phase 1
```

GSD executes each plan sequentially — writing code, running tests, making atomic commits, and producing execution summaries.

### 5. Verify the Work

```
/gsd-verify-work 1
```

Runs verification against the plan's must-have criteria to confirm everything was built correctly.

## Quick Tasks

For small, standalone changes that don't need full planning:

```
/gsd-quick "Add a health check endpoint at /api/health"
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `/gsd-progress` | Show current project status |
| `/gsd-help` | List all available commands |
| `/gsd-pause-work` | Save session context for later |
| `/gsd-resume-work` | Resume from where you left off |
| `/gsd-debug "symptom"` | Scientific debugging workflow |
| `/gsd-health` | Check project health and repair issues |
| `/gsd-settings` | View and modify configuration |

## Existing Projects

For an existing codebase, start with:

```
/gsd-map-codebase
```

This analyzes your code structure, conventions, and tech stack before project setup. Then run `/gsd-new-project` — GSD will incorporate the codebase analysis.
