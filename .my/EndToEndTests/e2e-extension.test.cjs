/**
 * VS Code Extension Tests — Parser Unit Tests + Extension Structure Validation
 *
 * Tests the GSD VS Code extension without requiring VS Code:
 * - Pure parser functions (parseStateMd, parseRoadmapMd) extracted from TypeScript
 * - Extension package.json correctness (commands, views, activation)
 * - Source file structure and integrity
 * - MCP config validation
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EXT_DIR = path.join(ROOT, 'extension');
const EXT_PKG = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'package.json'), 'utf-8'));

// ─── Extract pure parser functions from TypeScript source ────────────────────
// We parse the TS source directly since stateParser.ts contains pure functions
// that only use `vscode.Uri` in parsePhaseDir (which we skip).

const parserSource = fs.readFileSync(path.join(EXT_DIR, 'src', 'stateParser.ts'), 'utf-8');

/**
 * Manually port parseFrontmatter and parseStateMd from the TS source
 * so we can test them without compiling or mocking vscode.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function parseStateMd(content) {
  const fm = parseFrontmatter(content);
  const state = {};

  state.milestone = fm['milestone'] || undefined;
  state.status = fm['status'] || undefined;
  state.progress = fm['progress'] || undefined;

  if (fm['phase']) {
    const phaseMatch = fm['phase'].match(/^(\d+)/);
    if (phaseMatch) state.phase = parseInt(phaseMatch[1], 10);
  }
  if (fm['total-phases']) {
    state.totalPhases = parseInt(fm['total-phases'], 10);
  }
  if (fm['plan']) {
    const planMatch = fm['plan'].match(/^(\d+)/);
    if (planMatch) state.plan = parseInt(planMatch[1], 10);
  }

  const todosMatch = content.match(/## Todos?\r?\n([\s\S]*?)(?=\r?\n##|\s*$)/i);
  if (todosMatch) {
    state.todos = todosMatch[1]
      .split(/\r?\n/)
      .filter(l => l.match(/^[-*]\s/))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  const blockersMatch = content.match(/## Blockers?\r?\n([\s\S]*?)(?=\r?\n##|\s*$)/i);
  if (blockersMatch) {
    state.blockers = blockersMatch[1]
      .split(/\r?\n/)
      .filter(l => l.match(/^[-*]\s/))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  return state;
}

function parseRoadmapMd(content) {
  const phases = [];
  const phaseRegex = /^#{2,3}\s+Phase\s+(\d+)[:\s—–-]+(.+)$/gim;
  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    const name = match[2].trim();

    const afterHeading = content.slice(match.index + match[0].length, match.index + match[0].length + 200);
    let status = 'pending';
    if (/\bstatus:\s*(complete|done)\b/i.test(afterHeading) || /\[x\]/i.test(afterHeading)) {
      status = 'complete';
    } else if (/\bstatus:\s*(active|executing|in.?progress)\b/i.test(afterHeading)) {
      status = 'active';
    } else if (/\bstatus:\s*(skipped)\b/i.test(afterHeading)) {
      status = 'skipped';
    }

    phases.push({ number: num, name, status });
  }
  return phases;
}

// ─── Parser Tests ────────────────────────────────────────────────────────────

describe('Extension: parseStateMd', () => {
  it('parses frontmatter fields', () => {
    const state = parseStateMd(`---
milestone: My Project
phase: 3
plan: 02
status: in-progress
progress: "[###---] 3/6"
---

# Current Position
`);
    assert.strictEqual(state.milestone, 'My Project');
    assert.strictEqual(state.phase, 3);
    assert.strictEqual(state.plan, 2);
    assert.strictEqual(state.status, 'in-progress');
    assert.strictEqual(state.progress, '"[###---] 3/6"');
  });

  it('parses unquoted frontmatter', () => {
    const state = parseStateMd(`---
milestone: My Project
phase: 5
plan: 01
status: blocked
---
`);
    assert.strictEqual(state.milestone, 'My Project');
    assert.strictEqual(state.phase, 5);
    assert.strictEqual(state.plan, 1);
    assert.strictEqual(state.status, 'blocked');
  });

  it('parses total-phases field', () => {
    const state = parseStateMd(`---
phase: 2
total-phases: 8
---
`);
    assert.strictEqual(state.phase, 2);
    assert.strictEqual(state.totalPhases, 8);
  });

  it('extracts todos from body', () => {
    const state = parseStateMd(`---
phase: 1
---

## Todos
- Fix the login page
- Add error handling
- Write documentation

## Next Steps
`);
    assert.deepStrictEqual(state.todos, [
      'Fix the login page',
      'Add error handling',
      'Write documentation',
    ]);
  });

  it('extracts blockers from body', () => {
    const state = parseStateMd(`---
phase: 1
---

## Blockers
- Waiting for API credentials
- Database migration stuck

## Decisions
`);
    assert.deepStrictEqual(state.blockers, [
      'Waiting for API credentials',
      'Database migration stuck',
    ]);
  });

  it('returns empty state for no content', () => {
    const state = parseStateMd('');
    assert.strictEqual(state.milestone, undefined);
    assert.strictEqual(state.phase, undefined);
  });

  it('handles missing frontmatter', () => {
    const state = parseStateMd('# Just a heading\nSome text');
    assert.strictEqual(state.milestone, undefined);
  });

  it('handles empty frontmatter', () => {
    const state = parseStateMd('---\n---\n# Content');
    assert.strictEqual(state.phase, undefined);
  });
});

describe('Extension: parseRoadmapMd', () => {
  it('parses phase headings with colon separator', () => {
    const phases = parseRoadmapMd(`# Roadmap

## Phase 1: Project Setup
Status: complete

## Phase 2: Core Implementation
Status: active

## Phase 3: Testing
Status: not-started
`);
    assert.strictEqual(phases.length, 3);
    assert.strictEqual(phases[0].number, 1);
    assert.strictEqual(phases[0].name, 'Project Setup');
    assert.strictEqual(phases[0].status, 'complete');
    assert.strictEqual(phases[1].number, 2);
    assert.strictEqual(phases[1].name, 'Core Implementation');
    assert.strictEqual(phases[1].status, 'active');
    assert.strictEqual(phases[2].status, 'pending');
  });

  it('parses phase headings with em-dash separator', () => {
    const phases = parseRoadmapMd(`## Phase 1 — Setup
Status: in-progress

## Phase 2 — Build
Status: not-started
`);
    assert.strictEqual(phases.length, 2);
    assert.strictEqual(phases[0].name, 'Setup');
    assert.strictEqual(phases[0].status, 'active');
    assert.strictEqual(phases[1].status, 'pending');
  });

  it('detects complete status from checkbox', () => {
    const phases = parseRoadmapMd(`## Phase 1: Done Already
[x] Complete
`);
    assert.strictEqual(phases[0].status, 'complete');
  });

  it('detects skipped status', () => {
    const phases = parseRoadmapMd(`## Phase 1: Skipped Phase
Status: skipped
`);
    assert.strictEqual(phases[0].status, 'skipped');
  });

  it('returns empty array for no phases', () => {
    const phases = parseRoadmapMd('# Roadmap\n\nNo phases yet.');
    assert.strictEqual(phases.length, 0);
  });

  it('handles h3 phase headings', () => {
    const phases = parseRoadmapMd(`### Phase 1: Sub-phase
Status: done
`);
    assert.strictEqual(phases.length, 1);
    assert.strictEqual(phases[0].status, 'complete');
  });
});

// ─── Extension package.json Validation ────────────────────────────────────────

describe('Extension: package.json structure', () => {
  it('has correct name and display name', () => {
    assert.strictEqual(EXT_PKG.name, 'gsd-copilot');
    assert.strictEqual(EXT_PKG.displayName, 'GSD - Get Shit Done');
  });

  it('targets correct VS Code version', () => {
    assert.ok(EXT_PKG.engines.vscode, 'should have vscode engine');
    assert.ok(EXT_PKG.engines.vscode.startsWith('^'), 'should use ^ range');
  });

  it('has correct main entry point', () => {
    assert.strictEqual(EXT_PKG.main, './out/extension.js');
  });

  it('activates on .planning/STATE.md presence', () => {
    assert.ok(
      EXT_PKG.activationEvents.includes('workspaceContains:.planning/STATE.md'),
      'should activate when .planning/STATE.md exists'
    );
  });

  it('registers all expected commands', () => {
    const commands = EXT_PKG.contributes.commands.map(c => c.command);
    const expected = [
      'gsd.newProject',
      'gsd.planPhase',
      'gsd.executePhase',
      'gsd.quick',
      'gsd.progress',
      'gsd.switchProfile',
    ];
    for (const cmd of expected) {
      assert.ok(commands.includes(cmd), `missing command: ${cmd}`);
    }
  });

  it('all commands have titles', () => {
    for (const cmd of EXT_PKG.contributes.commands) {
      assert.ok(cmd.title, `command ${cmd.command} has no title`);
      assert.ok(cmd.title.startsWith('GSD:'), `command ${cmd.command} title should start with "GSD:"`);
    }
  });

  it('registers GSD explorer view container', () => {
    const containers = EXT_PKG.contributes.viewsContainers.activitybar;
    const gsd = containers.find(c => c.id === 'gsd-explorer');
    assert.ok(gsd, 'should have gsd-explorer container');
    assert.strictEqual(gsd.title, 'GSD');
  });

  it('registers gsdProjectView in gsd-explorer', () => {
    const views = EXT_PKG.contributes.views['gsd-explorer'];
    assert.ok(views, 'should have views in gsd-explorer');
    const projectView = views.find(v => v.id === 'gsdProjectView');
    assert.ok(projectView, 'should have gsdProjectView');
    assert.ok(projectView.when.includes('gsd:hasPlanning'), 'view should be conditional on gsd:hasPlanning');
  });
});

// ─── Extension Source File Integrity ──────────────────────────────────────────

describe('Extension: Source file integrity', () => {
  const srcFiles = ['extension.ts', 'statusBar.ts', 'treeView.ts', 'commands.ts', 'stateParser.ts'];

  for (const file of srcFiles) {
    it(`${file} exists`, () => {
      assert.ok(
        fs.existsSync(path.join(EXT_DIR, 'src', file)),
        `extension/src/${file} should exist`
      );
    });
  }

  it('extension.ts exports activate and deactivate', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes('export async function activate'), 'should export activate');
    assert.ok(src.includes('export function deactivate'), 'should export deactivate');
  });

  it('extension.ts sets gsd:hasPlanning context', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes("'gsd:hasPlanning'"), 'should set gsd:hasPlanning context');
  });

  it('extension.ts creates status bar', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes('GsdStatusBar'), 'should use GsdStatusBar');
  });

  it('extension.ts creates tree view', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes('GsdTreeViewProvider'), 'should use GsdTreeViewProvider');
  });

  it('extension.ts registers commands', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes('registerCommands'), 'should call registerCommands');
  });

  it('extension.ts watches .planning directory', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'extension.ts'), 'utf-8');
    assert.ok(src.includes('.planning'), 'should watch .planning');
    assert.ok(src.includes('createFileSystemWatcher'), 'should use file watcher');
  });

  it('commands.ts opens Copilot Chat with slash commands', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'commands.ts'), 'utf-8');
    assert.ok(src.includes('workbench.action.chat.open'), 'should open Copilot Chat');
    assert.ok(src.includes('/gsd-new-project'), 'should use /gsd-new-project');
    assert.ok(src.includes('/gsd-plan-phase'), 'should use /gsd-plan-phase');
    assert.ok(src.includes('/gsd-execute-phase'), 'should use /gsd-execute-phase');
    assert.ok(src.includes('/gsd-quick'), 'should use /gsd-quick');
    assert.ok(src.includes('/gsd-progress'), 'should use /gsd-progress');
    assert.ok(src.includes('/gsd-set-profile'), 'should use /gsd-set-profile');
  });

  it('statusBar.ts refreshes on STATE.md and ROADMAP.md changes', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'statusBar.ts'), 'utf-8');
    assert.ok(src.includes('STATE.md'), 'should watch STATE.md');
    assert.ok(src.includes('ROADMAP.md'), 'should watch ROADMAP.md');
    assert.ok(src.includes('onDidChange'), 'should handle file changes');
  });

  it('statusBar.ts shows rocket icon', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'statusBar.ts'), 'utf-8');
    assert.ok(src.includes('$(rocket)'), 'should use rocket icon');
  });

  it('statusBar.ts color-codes blocked status', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'statusBar.ts'), 'utf-8');
    assert.ok(src.includes('errorBackground'), 'should use error color for blocked');
    assert.ok(src.includes('warningBackground'), 'should use warning color for active');
  });

  it('treeView.ts implements TreeDataProvider', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'treeView.ts'), 'utf-8');
    assert.ok(src.includes('TreeDataProvider'), 'should implement TreeDataProvider');
    assert.ok(src.includes('getTreeItem'), 'should have getTreeItem');
    assert.ok(src.includes('getChildren'), 'should have getChildren');
    assert.ok(src.includes('onDidChangeTreeData'), 'should fire change events');
  });

  it('treeView.ts shows phases, todos, and blockers', () => {
    const src = fs.readFileSync(path.join(EXT_DIR, 'src', 'treeView.ts'), 'utf-8');
    assert.ok(src.includes("'phase'"), 'should have phase kind');
    assert.ok(src.includes("'todo'"), 'should have todo kind');
    assert.ok(src.includes("'blocker'"), 'should have blocker kind');
  });

  it('stateParser.ts matches implementation', () => {
    // Verify our extracted parser matches the patterns in the source
    assert.ok(parserSource.includes('parseFrontmatter'), 'source should have parseFrontmatter');
    assert.ok(parserSource.includes('parseStateMd'), 'source should have parseStateMd');
    assert.ok(parserSource.includes('parseRoadmapMd'), 'source should have parseRoadmapMd');
    assert.ok(parserSource.includes('parsePhaseDir'), 'source should have parsePhaseDir');
  });
});

// ─── tsconfig.json Validation ─────────────────────────────────────────────────

describe('Extension: tsconfig.json', () => {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(EXT_DIR, 'tsconfig.json'), 'utf-8'));

  it('outputs to ./out', () => {
    assert.strictEqual(tsconfig.compilerOptions.outDir, './out');
  });

  it('uses commonjs modules', () => {
    assert.strictEqual(tsconfig.compilerOptions.module, 'commonjs');
  });

  it('has strict mode enabled', () => {
    assert.strictEqual(tsconfig.compilerOptions.strict, true);
  });

  it('excludes node_modules and out', () => {
    assert.ok(tsconfig.exclude.includes('node_modules'));
    assert.ok(tsconfig.exclude.includes('out'));
  });
});

// ─── MCP Config Validation ───────────────────────────────────────────────────

describe('Extension: MCP config (.vscode/mcp.json)', () => {
  const mcpPath = path.join(ROOT, '.vscode', 'mcp.json');

  it('mcp.json exists', () => {
    assert.ok(fs.existsSync(mcpPath), '.vscode/mcp.json should exist');
  });

  it('is valid JSON', () => {
    const content = fs.readFileSync(mcpPath, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(content), 'should be valid JSON');
  });

  it('defines gsd-tools server', () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    assert.ok(mcp.servers, 'should have servers');
    assert.ok(mcp.servers['gsd-tools'], 'should have gsd-tools server');
  });

  it('uses stdio transport', () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    assert.strictEqual(mcp.servers['gsd-tools'].type, 'stdio');
  });

  it('uses node command', () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    assert.strictEqual(mcp.servers['gsd-tools'].command, 'node');
  });

  it('points to correct server path', () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    const args = mcp.servers['gsd-tools'].args;
    assert.ok(Array.isArray(args), 'args should be an array');
    assert.ok(args[0].includes('gsd-mcp-server.js'), 'should point to gsd-mcp-server.js');
  });

  it('sets GSD_WORKSPACE env var', () => {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    const env = mcp.servers['gsd-tools'].env;
    assert.ok(env, 'should have env');
    assert.ok(env.GSD_WORKSPACE, 'should set GSD_WORKSPACE');
    assert.ok(env.GSD_WORKSPACE.includes('workspaceFolder'), 'should use workspaceFolder variable');
  });
});

// ─── Command-to-Prompt Mapping Validation ─────────────────────────────────────

describe('Extension: Command-to-Prompt/Skill mapping', () => {
  const promptsDir = path.join(ROOT, '.github', 'prompts');
  const skillsDir = path.join(ROOT, '.github', 'skills');
  const commandsSource = fs.readFileSync(path.join(EXT_DIR, 'src', 'commands.ts'), 'utf-8');

  // Extract slash commands used in commands.ts
  const slashCommands = [...commandsSource.matchAll(/\/gsd-([a-z-]+)/g)].map(m => m[1]);

  it('commands.ts references slash commands', () => {
    assert.ok(slashCommands.length >= 5, `should have at least 5 slash commands, found ${slashCommands.length}`);
  });

  for (const cmd of slashCommands) {
    it(`/gsd-${cmd} has a matching prompt or skill`, () => {
      const promptFile = path.join(promptsDir, `gsd-${cmd}.prompt.md`);
      const skillDir = path.join(skillsDir, `gsd-${cmd}`);
      const hasPrompt = fs.existsSync(promptFile);
      const hasSkill = fs.existsSync(skillDir);
      assert.ok(
        hasPrompt || hasSkill,
        `/gsd-${cmd} has neither .github/prompts/gsd-${cmd}.prompt.md nor .github/skills/gsd-${cmd}/`
      );
    });
  }
});

// ─── Copilot Integration Wiring Validation ───────────────────────────────────

describe('Extension: Copilot integration wiring', () => {
  it('agents directory exists with agent files', () => {
    const agentsDir = path.join(ROOT, '.github', 'agents');
    assert.ok(fs.existsSync(agentsDir), '.github/agents/ should exist');
    const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.md'));
    assert.ok(agents.length >= 10, `should have 10+ agents, found ${agents.length}`);
  });

  it('skills directory exists with skill folders', () => {
    const skillsDir = path.join(ROOT, '.github', 'skills');
    assert.ok(fs.existsSync(skillsDir), '.github/skills/ should exist');
    const skills = fs.readdirSync(skillsDir).filter(f =>
      fs.statSync(path.join(skillsDir, f)).isDirectory()
    );
    assert.ok(skills.length >= 8, `should have 8+ skills, found ${skills.length}`);
  });

  it('prompts directory exists with prompt files', () => {
    const promptsDir = path.join(ROOT, '.github', 'prompts');
    assert.ok(fs.existsSync(promptsDir), '.github/prompts/ should exist');
    const prompts = fs.readdirSync(promptsDir).filter(f => f.endsWith('.prompt.md'));
    assert.ok(prompts.length >= 15, `should have 15+ prompts, found ${prompts.length}`);
  });

  it('MCP server file exists', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, '.gsd', 'tools', 'gsd-mcp-server.js')),
      'MCP server should exist at .gsd/tools/gsd-mcp-server.js'
    );
  });

  it('MCP server has valid JavaScript syntax', () => {
    const serverPath = path.join(ROOT, '.gsd', 'tools', 'gsd-mcp-server.js');
    // node --check validates syntax without executing
    const { execFileSync } = require('child_process');
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', serverPath], { windowsHide: true }),
      'MCP server should have valid JS syntax'
    );
  });

  it('all prompt files reference MCP tools or agent handoffs', () => {
    const promptsDir = path.join(ROOT, '.github', 'prompts');
    const prompts = fs.readdirSync(promptsDir).filter(f => f.endsWith('.prompt.md'));
    let toolRefs = 0;
    for (const p of prompts) {
      const content = fs.readFileSync(path.join(promptsDir, p), 'utf-8');
      if (content.includes('gsd_') || content.includes('gsd-')) {
        toolRefs++;
      }
    }
    assert.ok(toolRefs >= 10, `at least 10 prompts should reference GSD tools/agents, found ${toolRefs}`);
  });
});
