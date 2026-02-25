# Phase 3 Supplementary Specs

These specs fill gaps in the Phase 3 plan. Read these alongside `phase-3-polish-and-distribution.md`.

---

## Supplement A: Installer File Handling — Merge vs. Overwrite Strategies

### A1: The Problem

The installer (`npx gsd-copilot`) places files into `.github/` and `.gsd/`. Users may already have files at these locations. The installer must distinguish between files it should merge, replace, or skip.

### A2: Strategy Per File Type

| File/Directory | Install Strategy | Update Strategy | Uninstall Strategy |
|---------------|-----------------|-----------------|-------------------|
| `.github/copilot-instructions.md` | **Section-append** | Update GSD section only | Remove GSD section only |
| `.github/instructions/*.instructions.md` | Skip if exists with same name | Replace | Remove `gsd-*.instructions.md` only |
| `.github/prompts/gsd-*.prompt.md` | Copy all | Replace all | Remove all `gsd-*.prompt.md` |
| `.github/agents/gsd-*.agent.md` | Copy all | Replace all | Remove all `gsd-*.agent.md` |
| `.github/skills/gsd-*/` | Copy all skill dirs | Replace all skill dirs | Remove all `gsd-*/` dirs |
| `.github/hooks/*.json` | **Merge** into existing | Merge (add/update GSD hooks) | Remove GSD hooks from JSONs |
| `.gsd/` | Copy entirely | Replace entirely | Remove entirely |
| `.vscode/mcp.json` | **Merge** (add `gsd-tools` entry) | Update `gsd-tools` entry | Remove `gsd-tools` entry |
| `.gitignore` | **Append** `.gsd/` if missing | No-op | Remove `.gsd/` line |

### A3: Section-Append for `copilot-instructions.md`

The GSD section is delimited by markers:

```markdown
<!-- GSD:BEGIN -->
## GSD (Get Shit Done) Project Conventions

{GSD content here}

<!-- GSD:END -->
```

**Install:** If file exists, find `<!-- GSD:BEGIN -->` marker:
- If found: replace between markers (update)
- If not found: append section at end of file
- If file doesn't exist: create with GSD section only

**Uninstall:** Remove everything between `<!-- GSD:BEGIN -->` and `<!-- GSD:END -->` inclusive. If file becomes empty (only GSD content), delete the file.

### A4: Hook Merging

`.github/hooks/` may contain user hooks. GSD hooks use a naming prefix:

```json
// User's existing hooks (do not touch):
{ "event": "PreToolUse", "command": "..." }

// GSD hooks (identifiable by gsd- prefix in command):
{ "event": "PostToolUse", "command": "node ${workspaceFolder}/.gsd/hooks/context-monitor.js" }
```

**Merge strategy:**
- Read existing hook JSON files
- GSD hooks are identified by command path containing `.gsd/hooks/`
- On install/update: add or replace GSD hooks, leave others untouched
- On uninstall: remove only hooks containing `.gsd/hooks/` in the command

### A5: MCP Server Entry Merging

`.vscode/mcp.json` may have other MCP servers configured.

```json
{
  "servers": {
    "existing-server": { "..." },
    "gsd-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/.gsd/tools/gsd-mcp-server.js"],
      "env": { "GSD_WORKSPACE": "${workspaceFolder}" }
    }
  }
}
```

**Merge strategy:**
- Read existing `mcp.json`
- Add or replace `servers["gsd-tools"]` entry only
- Preserve all other server entries
- If file doesn't exist, create with `gsd-tools` entry only

---

## Supplement B: Windows Compatibility Audit

### B1: Known Unix-Only Patterns in Source

| Pattern | Location | Issue | Fix |
|---------|----------|-------|-----|
| `execSync('find ...')` | `init.cjs` (brownfield detection) | `find` is Unix-only | Use `fs.readdirSync` recursive scan |
| Shell string with single quotes | `core.cjs` (`execGit`) | Single quotes don't work in cmd/PowerShell | Use `child_process.execFileSync` with args array |
| `/tmp/` temp file paths | `core.cjs` (large payload hack) | `/tmp/` doesn't exist on Windows | Use `os.tmpdir()` or remove (MCP has no buffer limit) |
| `~/.claude/` paths | Many references | Tilde expansion varies | Use `path.join(os.homedir(), '.claude')` (but this path changes in the port) |
| `/` hardcoded in path construction | Various | Windows uses `\` natively | Use `path.join()` consistently |
| `chmod +x` | `install.js` | Not applicable on Windows | Skip on Windows, use shebang for Unix |

### B2: `execGit` Windows-Safe Implementation

The current implementation uses shell string concatenation:
```javascript
// CURRENT (Unix-only):
execSync(`git ${args.map(a => `'${a}'`).join(' ')}`, { cwd });
```

**Port to:**
```javascript
const { execFileSync } = require('child_process');

function execGit(cwd, args) {
  try {
    const stdout = execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      windowsHide: true  // Prevent console flash on Windows
    });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: (err.stdout ?? '').toString().trim(),
      stderr: (err.stderr ?? '').toString().trim()
    };
  }
}
```

**Key changes:**
- `execFileSync` with args array avoids shell escaping entirely
- `windowsHide: true` prevents console window flashes on Windows
- No quotes in args — `execFileSync` handles argument separation
- Works identically on Windows, macOS, and Linux

### B3: Brownfield Detection Windows-Safe Implementation

Replace Unix `find` command with Node.js `fs`:

```javascript
function detectBrownfield(cwd) {
  const indicators = {
    hasPackageJson: fs.existsSync(path.join(cwd, 'package.json')),
    hasPyproject: fs.existsSync(path.join(cwd, 'pyproject.toml')),
    hasGoMod: fs.existsSync(path.join(cwd, 'go.mod')),
    hasCargo: fs.existsSync(path.join(cwd, 'Cargo.toml')),
    hasGemfile: fs.existsSync(path.join(cwd, 'Gemfile')),
    hasSrc: fs.existsSync(path.join(cwd, 'src')),
    hasLib: fs.existsSync(path.join(cwd, 'lib')),
    fileCount: countFilesRecursive(cwd, { maxDepth: 3, maxCount: 50 })
  };
  indicators.isBrownfield =
    Object.entries(indicators)
      .filter(([k]) => k !== 'fileCount' && k !== 'isBrownfield')
      .some(([, v]) => v === true)
    || indicators.fileCount > 10;
  return indicators;
}

function countFilesRecursive(dir, opts, depth = 0) {
  if (depth >= opts.maxDepth) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (count >= opts.maxCount) return count;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isFile()) count++;
      else if (entry.isDirectory()) {
        count += countFilesRecursive(path.join(dir, entry.name), opts, depth + 1);
      }
    }
  } catch { /* permission denied, etc. */ }
  return count;
}
```

### B4: Path Normalization Rule

All paths stored in `.planning/` artifacts (STATE.md, PLAN.md, SUMMARY.md frontmatter) should use forward slashes (`/`), regardless of OS. This ensures cross-platform portability:

```javascript
function normalizePath(p) {
  return p.replace(/\\/g, '/');
}
```

Apply when:
- Writing `files_modified` frontmatter field
- Writing `key-files.created` / `key-files.modified`
- Writing `must_haves.artifacts[].path`
- Writing `must_haves.key_links[].from` / `.to`
- Writing any path in markdown content

---

## Supplement C: MCP Server Testing Strategy

### C1: Unit Test Structure

```
.gsd/tools/
├── __tests__/
│   ├── core.test.js
│   ├── state.test.js
│   ├── config.test.js
│   ├── frontmatter.test.js
│   ├── phase.test.js
│   ├── roadmap.test.js
│   ├── verify.test.js
│   ├── milestone.test.js
│   ├── commands.test.js
│   ├── init.test.js
│   ├── template.test.js
│   └── fixtures/
│       ├── valid-state.md
│       ├── valid-roadmap.md
│       ├── valid-plan.md
│       ├── valid-summary.md
│       ├── valid-config.json
│       ├── corrupt-config.json
│       ├── stubbed-file.ts
│       └── minimal-project/
│           └── .planning/
│               ├── PROJECT.md
│               ├── ROADMAP.md
│               ├── STATE.md
│               └── config.json
└── package.json  ← includes "test": "node --test __tests__/*.test.js"
```

### C2: Test Categories Per Module

**`core.test.js` — Foundation tests:**
- `loadConfig()` with valid/missing/corrupt config.json
- `normalizePhaseName()` — "1" → "01", "2A" → "2A", "12.1" → "12.1"
- `comparePhaseNum()` — sorting correctness for mixed numeric/alpha/decimal
- `findPhaseInternal()` — finds by number, handles missing, searches archives
- `execGit()` — basic git commands succeed, handles errors
- `generateSlugInternal()` — spaces → hyphens, special chars removed, lowercase
- `isGitIgnored()` — respects .gitignore patterns

**`state.test.js` — State CRUD tests:**
- Load STATE.md → parsed JSON with position, progress, decisions
- Update single field → content reflects change
- Patch multiple fields → all changed atomically
- Snapshot → all sections extracted
- Advance plan → next plan number, phase completion detection
- Update progress → bar recalculated from disk

**`config.test.js` — Config tests:**
- Ensure creates with defaults when missing
- Set with dot notation: `workflow.research → false`
- Load merges defaults for missing fields

**`frontmatter.test.js` — Parsing tests:**
- Extract from valid YAML → correct object
- Extract from empty frontmatter → empty object
- Reconstruct → valid YAML string
- Splice → only frontmatter changed, body preserved
- Parse must_haves block → truths, artifacts, key_links arrays

**`verify.test.js` — Verification tests:**
- Plan structure with all required fields → valid
- Plan structure missing `wave` → error
- Plan with checkpoint task + `autonomous: true` → error
- Summary with valid commit hashes → passes
- Summary with fake hashes → fails commit check
- Artifact exists with `min_lines: 10` on 5-line file → fails
- Key link with matching pattern → verified
- Health check on minimal project → healthy
- Health check on missing STATE.md → E004, repairable
- Health repair creates backup + regenerates

**`phase.test.js` — Phase manipulation tests:**
- Add phase → ROADMAP updated, directory created
- Remove phase → directory removed, subsequent renumbered
- Insert decimal → correct number calculated, directory created
- Remove with active plans → error (safety)

**`roadmap.test.js` — Roadmap tests:**
- Analyze → correct phase count, plan/summary inventories
- Get phase → correct section extracted
- Update progress → specific row changed

**`milestone.test.js` — Milestone tests:**
- Requirements mark-complete → checkboxes + table updated
- Complete → files archived, MILESTONES.md created, stats correct

### C3: Integration Test Chains

| Test | Tools Called | Validates |
|------|------------|-----------|
| Quick task flow | `init_quick` → `commit` → `state_update` | State consistency after quick task |
| Phase lifecycle | `phase_add` → `roadmap_analyze` → `find_phase` | Phase appears in roadmap and disk |
| Phase removal | `phase_add` (×3) → `phase_remove(2)` → `roadmap_analyze` | Renumbering correct |
| Decimal insert | `phase_insert(after=2)` → `find_phase(2.1)` | Decimal calculation and directory |
| Config cycle | `config_ensure` → `config_set(research, false)` → `config_load` | Value persisted |
| Health repair | Corrupt STATE.md → `validate_health(repair)` → `state_load` | Backup created, state regenerated |
| Frontmatter cycle | `frontmatter_set` → `frontmatter_get` → `frontmatter_validate` | Roundtrip fidelity |
| Verify chain | Create plan + summary → `verify_plan_structure` → `verify_summary` | Both pass |

### C4: Test Fixture Conventions

- All fixtures use `MIN_PLANNING_DIR` — a minimal `.planning/` directory with PROJECT.md, ROADMAP.md, STATE.md, config.json
- Tests that modify fixtures use `fs.cpSync` to create a temp copy in `os.tmpdir()`
- Tests clean up temp directories in `after()` hooks
- Git tests initialize a temp repo: `git init && git add . && git commit -m "init"`

---

## Supplement D: Cross-Model Behavioral Differences

### D1: Testing Matrix

| Agent | Claude Sonnet 4 | GPT-4.1 | Gemini 2.5 Pro |
|-------|----------------|---------|----------------|
| gsd-planner | Primary (tested) | Secondary | Tertiary |
| gsd-executor | Primary (tested) | Secondary | Tertiary |
| gsd-plan-checker | Primary (tested) | Secondary | Tertiary |
| gsd-verifier | Primary (tested) | Secondary | Tertiary |
| gsd-debugger | Primary (tested) | Secondary | Tertiary |
| gsd-codebase-mapper | Claude Haiku 3.5 | GPT-4.1 Mini | — |

### D2: Known Model-Specific Issues

**Structured output fidelity:**
- Claude: excellent at following YAML frontmatter schemas
- GPT-4.1: may add extra fields or change field ordering — verify frontmatter is parseable
- Gemini: may use different markdown heading levels — verify heading markers

**XML task parsing:**
- Claude: reliably produces `<task>` XML blocks
- GPT-4.1: sometimes uses markdown instead of XML — agent instructions should emphasize XML format
- Gemini: generally follows XML but may omit optional elements

**Tool call patterns:**
- Claude: follows MCP tool call instructions precisely
- GPT-4.1: may call tools with slightly different parameter formats (e.g., missing optional fields vs. passing null)
- Gemini: may batch tool calls differently

### D3: Model-Agnostic Robustness Rules

To ensure agents work across models:

1. **Validate outputs, don't trust format:** After any agent produces output, validate it (frontmatter fields exist, XML parses, files written) before proceeding.

2. **Error recovery for malformed output:** If an agent produces invalid frontmatter or XML, the skill should:
   - Note the issue
   - Ask the model to fix its output
   - Max 1 retry before reporting to user

3. **No model-specific instructions in agents:** Agent `.md` files should NOT contain instructions like "Important for GPT: ..." — this creates confusion for other models. Instead, make instructions unambiguous for ALL models.

4. **Completion markers must be explicit:** Every agent should end with a clear marker that the skill can detect:
   - Planner: `## PLANNING COMPLETE`
   - Executor: `## EXECUTION COMPLETE`
   - Checker: `## VERIFICATION PASSED` or `## ISSUES FOUND`
   - Verifier: `## VERIFICATION COMPLETE`

---

## Supplement E: VS Code Extension Architecture

### E1: Extension Package Structure

```
gsd-copilot-extension/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts          ← Entry point: activate(), deactivate()
│   ├── statusBar.ts          ← Status bar provider
│   ├── treeView.ts           ← GSD Explorer tree view
│   ├── commands.ts           ← Command palette registrations
│   ├── stateParser.ts        ← Parse STATE.md, ROADMAP.md for display
│   └── utils.ts              ← File watching, path helpers
├── media/
│   └── gsd-icon.svg          ← Tree view and status bar icon
└── test/
    └── extension.test.ts
```

### E2: `package.json` Contributions

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "gsd-explorer",
        "title": "GSD",
        "icon": "media/gsd-icon.svg"
      }]
    },
    "views": {
      "gsd-explorer": [{
        "id": "gsdProjectView",
        "name": "Project",
        "when": "gsd:hasPlanning"
      }]
    },
    "commands": [
      { "command": "gsd.newProject", "title": "GSD: New Project" },
      { "command": "gsd.planPhase", "title": "GSD: Plan Phase" },
      { "command": "gsd.executePhase", "title": "GSD: Execute Phase" },
      { "command": "gsd.quick", "title": "GSD: Quick Task" },
      { "command": "gsd.progress", "title": "GSD: Progress" },
      { "command": "gsd.switchProfile", "title": "GSD: Switch Model Profile" }
    ],
    "configuration": {
      "title": "GSD",
      "properties": {
        "gsd.modelProfile": {
          "type": "string",
          "enum": ["quality", "balanced", "budget"],
          "default": "balanced",
          "description": "Model profile tier for GSD agents"
        },
        "gsd.workflow.research": {
          "type": "boolean",
          "default": true,
          "description": "Enable research before planning"
        },
        "gsd.workflow.planCheck": {
          "type": "boolean",
          "default": true,
          "description": "Enable plan verification after planning"
        },
        "gsd.workflow.verifier": {
          "type": "boolean",
          "default": true,
          "description": "Enable verification after execution"
        }
      }
    }
  }
}
```

### E3: Status Bar Implementation

```typescript
// statusBar.ts

import * as vscode from 'vscode';

export class GsdStatusBar {
  private item: vscode.StatusBarItem;
  private watcher: vscode.FileSystemWatcher | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'gsd.progress';
  }

  activate(context: vscode.ExtensionContext) {
    // Watch STATE.md and ROADMAP.md for changes
    const planningGlob = new vscode.RelativePattern(
      vscode.workspace.workspaceFolders![0],
      '.planning/{STATE,ROADMAP}.md'
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(planningGlob);
    this.watcher.onDidChange(() => this.refresh());
    this.watcher.onDidCreate(() => this.refresh());
    this.watcher.onDidDelete(() => this.refresh());

    this.refresh();
    context.subscriptions.push(this.item, this.watcher);
  }

  async refresh() {
    // Parse STATE.md for current position
    // Parse ROADMAP.md for phase count
    // Update status bar text and color
    const state = await this.parseState();
    if (!state) {
      this.item.hide();
      return;
    }

    this.item.text = `$(rocket) GSD: Phase ${state.currentPhase}/${state.totalPhases} | Plan ${state.currentPlan}`;
    this.item.tooltip = `${state.milestone} — ${state.status}`;

    // Color by status
    switch (state.status) {
      case 'executing':
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      case 'blocked':
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      default:
        this.item.backgroundColor = undefined;
    }

    this.item.show();
  }
}
```

### E4: Tree View Implementation

```typescript
// treeView.ts — data model overview

interface GsdTreeItem {
  label: string;
  icon: string;
  children?: GsdTreeItem[];
  command?: vscode.Command;
  resourceUri?: vscode.Uri;
}

// Tree structure:
// 📋 Project: {name}
// 📊 Progress: {pct}% ({done}/{total} phases)
// 🎯 Current: Phase {N} — {name}
//   ├── 📝 Plan 1: {title} ✅
//   ├── 📝 Plan 2: {title} 🔄
//   └── 📝 Plan 3: {title} ⏳
// 📌 Todos ({count})
//   ├── {todo 1}
//   └── {todo 2}
// 🐛 Debug Sessions ({count})
//   └── {session name}
```

**Tree data source:** Parse `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/phases/*/`, `.planning/quick/`, `.planning/debug/`

**Refresh triggers:** FileSystemWatcher on `.planning/**`

### E5: Command Registration → Copilot Chat

Commands route to Copilot chat using the `vscode.commands.executeCommand` API:

```typescript
// commands.ts

vscode.commands.registerCommand('gsd.quick', async () => {
  const description = await vscode.window.showInputBox({
    prompt: 'Describe the task',
    placeHolder: 'Add a health check endpoint'
  });
  if (description) {
    // Open Copilot chat with the command
    await vscode.commands.executeCommand(
      'workbench.action.chat.open',
      { query: `/gsd-quick ${description}` }
    );
  }
});

vscode.commands.registerCommand('gsd.planPhase', async () => {
  const phase = await vscode.window.showInputBox({
    prompt: 'Phase number',
    placeHolder: '1'
  });
  if (phase) {
    await vscode.commands.executeCommand(
      'workbench.action.chat.open',
      { query: `/gsd-plan-phase ${phase}` }
    );
  }
});
```

### E6: Context Key for Conditional UI

Set `gsd:hasPlanning` context key to show/hide GSD UI elements:

```typescript
// extension.ts activate()

const planningDir = vscode.Uri.joinPath(
  vscode.workspace.workspaceFolders![0].uri,
  '.planning'
);

try {
  await vscode.workspace.fs.stat(planningDir);
  vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', true);
} catch {
  vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', false);
}

// Watch for creation/deletion
const watcher = vscode.workspace.createFileSystemWatcher(
  new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], '.planning')
);
watcher.onDidCreate(() =>
  vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', true));
watcher.onDidDelete(() =>
  vscode.commands.executeCommand('setContext', 'gsd:hasPlanning', false));
```

### E7: Settings Sync with config.json

When the user changes VS Code settings, update `.planning/config.json`:

```typescript
vscode.workspace.onDidChangeConfiguration(event => {
  if (event.affectsConfiguration('gsd')) {
    const config = vscode.workspace.getConfiguration('gsd');
    // Read current .planning/config.json
    // Update matching fields
    // Write back
  }
});
```

Bidirectional: when `.planning/config.json` changes (e.g., via MCP tool), update VS Code settings.

---

## Supplement F: Installer Behavioral Specification

### F1: CLI Interface

```
npx gsd-copilot@latest [options]

Options:
  --update      Update existing installation
  --uninstall   Remove GSD files (preserves .planning/)
  --scope       Installation scope: "local" (default) | "user"
  --dry-run     Show what would be installed without writing files
  --force       Overwrite files without prompting
  --version     Show installed and latest version
  --help        Show help
```

### F2: Install Flow

```
1. DETECT WORKSPACE
   - Must be in a directory (not a file path)
   - Must have write access
   - Warn if not a git repo (but don't block)

2. CHECK EXISTING INSTALLATION
   If .github/agents/gsd-*.agent.md OR .gsd/ exists:
     → "GSD is already installed ({version}). Update? [y/N]"
     → If yes: run update flow
     → If no: abort

3. PROMPT FOR SCOPE (if --scope not provided)
   - "Local install" (default): .github/ + .gsd/ in current workspace
   - "User-level install": prompts/agents to VS Code user data directory
     (C:\Users\{user}\AppData\Roaming\Code\User\prompts\)

4. COPY FILES (per strategy in Supplement A2)

5. NPM INSTALL MCP DEPENDENCIES
   cd .gsd/tools && npm install
   (only needed if @modelcontextprotocol/sdk not bundled)

6. VERIFY INSTALLATION
   Check key files exist:
   - .github/agents/gsd-planner.agent.md
   - .github/skills/gsd-quick/SKILL.md
   - .gsd/tools/gsd-mcp-server.js
   - .vscode/mcp.json has gsd-tools entry

7. PRINT SUCCESS
   ╔═════════════════════════════════════════╗
   ║  ✅ GSD installed successfully!          ║
   ╠═════════════════════════════════════════╣
   ║  Quick start:                            ║
   ║  1. Open VS Code Copilot chat            ║
   ║  2. Type /gsd-new-project                ║
   ║  3. Follow the interactive setup         ║
   ║                                           ║
   ║  For help: /gsd-help                      ║
   ╚═════════════════════════════════════════╝
```

### F3: Update Flow

```
1. DETECT INSTALLED VERSION
   Read .gsd/VERSION file (contains semver string)

2. COMPARE WITH PACKAGE VERSION
   If same: "Already up to date ({version})"
   If different: show changelog summary between versions

3. BACKUP USER CUSTOMIZATIONS (optional)
   Check for user-modified files in .github/:
   - Files where content differs from package version
   - Report: "Warning: .github/agents/gsd-planner.agent.md has local changes"

4. UPDATE FILES (per strategy in Supplement A2)

5. RUN NPM INSTALL (if dependencies changed)

6. REPORT
   "Updated from {old} to {new}. {N} files updated."
```

### F4: Uninstall Flow

```
1. CONFIRM
   "Remove GSD from this workspace? (.planning/ will be preserved) [y/N]"

2. REMOVE FILES
   - Delete all gsd-*.prompt.md from .github/prompts/
   - Delete all gsd-*.agent.md from .github/agents/
   - Delete all gsd-*/ from .github/skills/
   - Delete gsd-*.instructions.md from .github/instructions/
   - Remove GSD section from copilot-instructions.md
   - Remove GSD hooks from .github/hooks/ JSON files
   - Remove gsd-tools entry from .vscode/mcp.json
   - Remove .gsd/ directory entirely
   - Remove .gsd/ line from .gitignore

3. PRESERVE
   - .planning/ (user data — never touched)
   - Non-GSD files in .github/ (other agents, prompts, etc.)
   - Other entries in .vscode/mcp.json

4. REPORT
   "GSD removed. Your .planning/ directory has been preserved."
```

### F5: Version Tracking

`.gsd/VERSION` file contains:
```
1.0.0
```

This is checked on update to determine what changed and whether migration steps are needed.

### F6: Post-Install Migration (for version upgrades)

```javascript
// In install.js, after copying files:

const migrations = {
  '1.1.0': () => {
    // Example: rename tool in mcp.json
  },
  '1.2.0': () => {
    // Example: add new config field default
  }
};

function runMigrations(fromVersion, toVersion) {
  for (const [version, migrate] of Object.entries(migrations)) {
    if (semver.gt(version, fromVersion) && semver.lte(version, toVersion)) {
      migrate();
    }
  }
}
```

---

## Supplement G: Distribution Package Structure

### G1: npm Package Layout

```
gsd-copilot/                          ← npm package name
├── package.json
├── README.md
├── LICENSE
├── CHANGELOG.md
├── bin/
│   └── install.js                    ← CLI entry point
├── dist/
│   ├── github/                       ← Files for .github/
│   │   ├── copilot-instructions.md
│   │   ├── instructions/
│   │   │   ├── gsd-state.instructions.md
│   │   │   ├── gsd-plans.instructions.md
│   │   │   ├── gsd-summaries.instructions.md
│   │   │   ├── gsd-research.instructions.md
│   │   │   └── gsd-quick.instructions.md
│   │   ├── prompts/
│   │   │   ├── gsd-help.prompt.md
│   │   │   ├── gsd-progress.prompt.md
│   │   │   ├── gsd-pause-work.prompt.md
│   │   │   ├── gsd-resume-work.prompt.md
│   │   │   ├── gsd-settings.prompt.md
│   │   │   ├── gsd-add-todo.prompt.md
│   │   │   ├── gsd-check-todos.prompt.md
│   │   │   ├── gsd-add-phase.prompt.md
│   │   │   ├── gsd-remove-phase.prompt.md
│   │   │   ├── gsd-insert-phase.prompt.md
│   │   │   ├── gsd-set-profile.prompt.md
│   │   │   ├── gsd-update.prompt.md
│   │   │   ├── gsd-research-phase.prompt.md
│   │   │   ├── gsd-list-phase-assumptions.prompt.md
│   │   │   ├── gsd-plan-milestone-gaps.prompt.md
│   │   │   ├── gsd-cleanup.prompt.md
│   │   │   └── gsd-health.prompt.md
│   │   ├── agents/
│   │   │   ├── gsd-planner.agent.md
│   │   │   ├── gsd-executor.agent.md
│   │   │   ├── gsd-plan-checker.agent.md
│   │   │   ├── gsd-verifier.agent.md
│   │   │   ├── gsd-phase-researcher.agent.md
│   │   │   ├── gsd-project-researcher.agent.md
│   │   │   ├── gsd-research-synthesizer.agent.md
│   │   │   ├── gsd-roadmapper.agent.md
│   │   │   ├── gsd-debugger.agent.md
│   │   │   ├── gsd-codebase-mapper.agent.md
│   │   │   └── gsd-integration-checker.agent.md
│   │   ├── skills/
│   │   │   ├── gsd-quick/
│   │   │   ├── gsd-new-project/
│   │   │   ├── gsd-discuss-phase/
│   │   │   ├── gsd-plan-phase/
│   │   │   ├── gsd-execute-phase/
│   │   │   ├── gsd-verify-work/
│   │   │   ├── gsd-map-codebase/
│   │   │   ├── gsd-debug/
│   │   │   └── gsd-milestone/
│   │   └── hooks/
│   │       └── context-monitor.json
│   └── gsd/                          ← Files for .gsd/
│       ├── VERSION
│       ├── tools/
│       │   ├── gsd-mcp-server.js
│       │   ├── package.json
│       │   └── lib/
│       │       ├── core.js
│       │       ├── state.js
│       │       ├── config.js
│       │       ├── init.js
│       │       ├── roadmap.js
│       │       ├── phase.js
│       │       ├── commands.js
│       │       ├── frontmatter.js
│       │       ├── verify.js
│       │       ├── milestone.js
│       │       └── template.js
│       ├── hooks/
│       │   └── context-monitor.js
│       └── references/
│           ├── ui-brand.md
│           ├── git-integration.md
│           ├── verification-patterns.md
│           ├── model-profiles.md
│           ├── checkpoints.md
│           ├── continuation-format.md
│           ├── decimal-phase-calculation.md
│           ├── git-planning-commit.md
│           ├── model-profile-resolution.md
│           ├── phase-argument-parsing.md
│           ├── planning-config.md
│           ├── tdd.md
│           ├── config-default.json
│           └── state-template.md
└── .npmignore
```

### G2: File Count Summary

| Directory | Files | Phase |
|-----------|-------|-------|
| `.github/prompts/` | 17 prompt files | P1 (12) + P2 (5) |
| `.github/agents/` | 11 agent files | P1 (4) + P2 (7) |
| `.github/skills/` | 9 skill directories | P1 (1) + P2 (8) |
| `.github/instructions/` | 5 instruction files | P1 (2) + P3 (3) |
| `.github/hooks/` | 1 hook config | P1 |
| `.gsd/tools/` | 12 JS files | P1 (core) + P2 (extensions) |
| `.gsd/hooks/` | 1 hook script | P1 |
| `.gsd/references/` | 14 reference docs | P1 (4) + P2 (10) |
| **Total** | **~70 files** | |
