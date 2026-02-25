/**
 * GSD Live Tests — Automated VS Code Chat Interaction Tests
 *
 * These tests launch a real VS Code instance, open Copilot Chat with /gsd-* commands,
 * and verify side effects (file creation, MCP tool calls, state changes).
 *
 * How it works:
 * 1. Creates a temporary workspace with GSD installed (.planning/, .gsd/, .github/, .vscode/)
 * 2. Launches VS Code with the GSD extension loaded
 * 3. Executes chat commands via workbench.action.chat.open
 * 4. Monitors file system for expected outcomes
 * 5. Checks MCP server logs for tool invocations
 *
 * Run: node .my/LiveTests/run-live-tests.cjs
 *
 * Note: Requires VS Code Insiders and GitHub Copilot extension installed.
 * Cannot run while another VS Code instance is open (use Insiders for dev, Stable for tests).
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const extensionRoot = path.join(ROOT, 'extension');
const { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } =
  require(path.join(extensionRoot, 'node_modules', '@vscode', 'test-electron'));

/**
 * Create a temporary workspace with full GSD installation
 * (copies .gsd/, .github/, .vscode/ from this repo)
 */
function createTestWorkspace() {
  // Resolve the real temp dir path (avoid Windows 8.3 short names like JONK43~1)
  // os.tmpdir() returns 8.3 names; build from USERPROFILE instead
  let tmpBase = os.tmpdir();
  if (process.platform === 'win32' && process.env.USERPROFILE) {
    const longTemp = path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Temp');
    if (fs.existsSync(longTemp)) {
      tmpBase = longTemp;
    }
  }
  const tmpDir = fs.mkdtempSync(path.join(tmpBase, 'gsd-live-'));
  console.log('  Test workspace:', tmpDir);

  // Copy directories needed for a functional GSD workspace
  const dirsToCopy = ['.gsd', '.github', '.vscode'];
  for (const dir of dirsToCopy) {
    copyDirSync(path.join(ROOT, dir), path.join(tmpDir, dir));
  }

  // Add workspace settings that enable MCP and auto-approve everything
  const vscodeDir = path.join(tmpDir, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify({
    'chat.mcp.discovery.enabled': true,
    'chat.mcp.enabled': true,
    'chat.tools.autoApprove': true,
    'chat.agent.autoApprove': true,
    'chat.terminal.autoApprove': true,
    'github.copilot.chat.agent.autoApprove': true,
    'github.copilot.chat.mcpTools.autoApprove': true,
    'github.copilot.chat.tools.autoApprove': true,
    'security.workspace.trust.enabled': false,
  }, null, 2) + '\n');

  // Create minimal .planning/ structure
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  fs.writeFileSync(path.join(planningDir, 'config.json'), JSON.stringify({
    model_profile: 'balanced',
    commit_docs: false,
    branching_strategy: 'none',
    workflow: { research: true, planCheck: true, verifier: true },
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(planningDir, 'STATE.md'), `---
milestone: M1
phase: "1"
plan: "01-01"
status: planning
progress: "[░░░░░░░░░░] 0%"
updated: "${new Date().toISOString()}"
---

# Active Context

## Current Focus
Test workspace for live tests

## Blockers
(none)

## Decisions
(none)

## Session Log
`);

  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), `---
name: Live Test Project
type: cli
---

# Live Test Project

A test project used for automated live testing of GSD commands.
`);

  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), `---
milestone: M1
total_phases: 2
---

# Roadmap

## Phase 1 — Setup
- Set up project structure
- Configure build system

## Phase 2 — Implementation
- Implement core features
- Add tests
`);

  fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), `---
count: 2
---

# Requirements

## REQ-001: Project Setup
The project must have a proper build system.

## REQ-002: Core Features
The project must implement the core features described in the roadmap.
`);

  // Create phases directory
  const phasesDir = path.join(planningDir, 'phases', '01-setup');
  fs.mkdirSync(phasesDir, { recursive: true });

  // Create a log file that the test harness writes MCP tool calls to
  fs.writeFileSync(path.join(tmpDir, '.gsd-test-log'), '');

  // Create user data dir with MCP auto-enabled settings
  const userDataDir = path.join(tmpDir, '.user-data');
  const userSettingsDir = path.join(userDataDir, 'User');
  fs.mkdirSync(userSettingsDir, { recursive: true });

  // VS Code settings that auto-enable MCP and suppress all approval prompts
  const autoApproveSettings = {
    // MCP
    'chat.mcp.discovery.enabled': true,
    'chat.mcp.enabled': true,
    // Auto-approve all tool invocations (MCP tools, file edits, terminal, etc.)
    'chat.tools.autoApprove': true,
    'chat.agent.autoApprove': true,
    'github.copilot.chat.agent.autoApprove': true,
    'github.copilot.chat.mcpTools.autoApprove': true,
    'github.copilot.chat.tools.autoApprove': true,
    // Terminal auto-approve
    'chat.terminal.autoApprove': true,
    'github.copilot.chat.terminalChatLocation': 'chatView',
    // Workspace trust — don't prompt
    'security.workspace.trust.enabled': false,
    'security.workspace.trust.startupPrompt': 'never',
    'security.workspace.trust.banner': 'never',
    // Suppress update/telemetry popups
    'extensions.autoCheckUpdates': false,
    'update.mode': 'none',
    'telemetry.telemetryLevel': 'off',
    // Git — don't prompt
    'git.enabled': false,
    'git.autofetch': false,
    // Misc — suppress notifications
    'extensions.ignoreRecommendations': true,
    'workbench.startupEditor': 'none',
    'workbench.tips.enabled': false,
  };
  fs.writeFileSync(path.join(userSettingsDir, 'settings.json'),
    JSON.stringify(autoApproveSettings, null, 2) + '\n');

  // Pre-enable the gsd-tools MCP server in workspace storage
  // VS Code stores enabled state per-server; this ensures it's checked on
  const workspaceStorageDir = path.join(userDataDir, 'workspaceStorage');
  fs.mkdirSync(workspaceStorageDir, { recursive: true });

  return { workspace: tmpDir, userDataDir };
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    console.log('  Warning: Could not clean up', dir);
  }
}

async function main() {
  console.log('\n  GSD Live Tests — VS Code Chat Interaction\n');

  let testWorkspace;
  try {
    // 1. Create test workspace + user data dir
    const testEnv = createTestWorkspace();
    testWorkspace = testEnv.workspace;
    const userDataDir = testEnv.userDataDir;

    // 2. Download VS Code (or use existing install)
    // Use 'insiders' or 'stable' — pass via env var GSD_TEST_VSCODE_VERSION
    const vsVersion = process.env.GSD_TEST_VSCODE_VERSION || 'stable';
    console.log('  VS Code version:', vsVersion);
    const vscodeExecutablePath = await downloadAndUnzipVSCode(vsVersion);
    const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    // 3. Install Copilot extension (needed for chat commands)
    // Note: If Copilot is already installed in the user profile, this is a no-op
    console.log('  Ensuring Copilot extensions...');

    // 4. Run the tests
    const extensionDevelopmentPath = path.join(ROOT, 'extension');
    const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.cjs');

    console.log('  Launching VS Code with test workspace...\n');

    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        '--user-data-dir', userDataDir,
        // Don't disable all extensions — we need Copilot for chat
        // Only disable specific problematic extensions if needed
        '--enable-proposed-api', 'gsd.gsd-copilot',
      ],
      // Pass test workspace location as env var so tests can find it
      extensionTestsEnv: {
        GSD_TEST_WORKSPACE: testWorkspace,
      },
    });

    console.log('\n  All live tests passed!\n');
  } catch (err) {
    console.error('\n  Live tests failed:', err.message || err);
    process.exit(1);
  } finally {
    if (testWorkspace) {
      cleanup(testWorkspace);
    }
  }
}

main();
