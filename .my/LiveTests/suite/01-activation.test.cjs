/**
 * Extension Activation Tests
 *
 * Verifies that the GSD VS Code extension loads properly,
 * registers all expected commands, and recognizes the .planning/ workspace.
 */

'use strict';

const assert = require('assert');
const vscode = require('vscode');
const {
  isExtensionActive,
  getGsdCommands,
  fileExists,
  workspaceRoot,
  sendChatMessage,
  clearChat,
  sleep,
} = require('./helpers.cjs');

describe('Extension Activation', function () {

  before(async function () {
    // Extension needs time to activate
    await sleep(5000);
  });

  it('should activate the GSD extension', async function () {
    const active = await isExtensionActive();
    assert.strictEqual(active, true, 'GSD extension should be active');
  });

  it('should register all gsd.* commands', async function () {
    const commands = await getGsdCommands();
    const expected = [
      'gsd.newProject',
      'gsd.planPhase',
      'gsd.executePhase',
      'gsd.quick',
      'gsd.progress',
      'gsd.switchProfile',
    ];
    for (const cmd of expected) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  it('should detect .planning/ workspace', async function () {
    // The extension sets gsd:hasPlanning context key
    assert.ok(fileExists('.planning'), '.planning/ should exist in test workspace');
    assert.ok(fileExists('.planning/STATE.md'), 'STATE.md should exist');
    assert.ok(fileExists('.planning/config.json'), 'config.json should exist');
  });

  it('should have GSD tree view registered', async function () {
    // Can't easily check if tree view is visible, but we can check
    // that the view container exists
    const ext = vscode.extensions.getExtension('gsd.gsd-copilot');
    assert.ok(ext, 'Extension should be found');
    const pkg = ext.packageJSON;
    const views = pkg?.contributes?.views;
    assert.ok(views, 'Extension should contribute views');
  });

  it('should set gsd:hasPlanning context key', async function () {
    // We can't directly read context keys, but we can verify
    // the extension activated without errors (which sets the key)
    const ext = vscode.extensions.getExtension('gsd.gsd-copilot');
    assert.ok(ext?.isActive, 'Extension should be active (which sets context keys)');
  });

  it('should warm up MCP server (may require trust approval)', async function () {
    // Send a lightweight command that triggers MCP server start.
    // If this is the first run, VS Code will show a trust prompt —
    // the tester should click Allow. The generous timeout gives time
    // for that interaction. Subsequent suites will then have a warm MCP.
    this.timeout(120_000);
    await sendChatMessage('/gsd-progress');
    // Wait long enough for MCP trust prompt + server startup
    await sleep(30_000);
    await clearChat();
    await sleep(2000);
  });
});
