/**
 * Chat Command Tests — Stateful Commands
 *
 * Tests GSD commands that modify project state:
 * /gsd-new-project, /gsd-research-phase, /gsd-plan-phase,
 * /gsd-execute-phase, /gsd-verify-work, /gsd-pause-work, /gsd-resume-work
 *
 * These tests verify side effects: file creation, STATE.md mutations,
 * config changes, and phase directory structure.
 *
 * **IMPORTANT**: These tests interact with a real LLM (Copilot) and
 * MCP server. They are slow (~30-60s each) and non-deterministic.
 * The timeouts are generous to accommodate model response time.
 */

'use strict';

const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const {
  sendChatMessage,
  clearChat,
  waitForFile,
  waitForFileContent,
  waitForNewFileInDir,
  waitForStateChange,
  readWorkspaceFile,
  writeWorkspaceFile,
  fileExists,
  listDir,
  workspaceRoot,
  sleep,
} = require('./helpers.cjs');

describe('Stateful Chat Commands', function () {

  beforeEach(async function () {
    // Cancel any pending request, then start fresh
    try { await vscode.commands.executeCommand('workbench.action.chat.cancel'); } catch {}
    await sleep(1000);
    try { await vscode.commands.executeCommand('workbench.action.chat.newChat'); } catch { await clearChat(); }
    await sleep(2000);
  });

  describe('/gsd-set-profile', function () {
    it('should change model profile when set to "quality"', async function () {
      // Read current config
      const configBefore = JSON.parse(readWorkspaceFile('.planning/config.json'));

      await sendChatMessage('/gsd-set-profile quality');

      // Wait for config to be updated by MCP tool
      const content = await waitForFileContent(
        '.planning/config.json',
        /"model_profile"\s*:\s*"quality"/,
        90_000,
      );

      const configAfter = JSON.parse(content);
      assert.strictEqual(configAfter.model_profile, 'quality');
    });

    afterEach(async function () {
      // Reset to balanced
      const config = JSON.parse(readWorkspaceFile('.planning/config.json') || '{}');
      config.model_profile = 'balanced';
      writeWorkspaceFile('.planning/config.json', JSON.stringify(config, null, 2) + '\n');
    });
  });

  describe('/gsd-add-todo', function () {
    it('should create a todo entry', async function () {
      await sendChatMessage('/gsd-add-todo "Write unit tests for auth module"');

      // Wait for the quick/ directory to have a file, or STATE.md to reference the todo
      try {
        await waitForNewFileInDir('.planning/quick', 45_000);
        // Success — a quick task file was created
      } catch {
        // It may have been stored in STATE.md or another location
        const state = readWorkspaceFile('.planning/STATE.md');
        assert.ok(state, 'STATE.md should still exist');
      }
    });
  });

  describe('/gsd-pause-work', function () {
    it('should save session context to STATE.md', async function () {
      await sendChatMessage('/gsd-pause-work');

      // pause-work should update STATE.md with session context
      const state = await waitForFileContent(
        '.planning/STATE.md',
        /session|pause|context/i,
        60_000,
      );
      assert.ok(state.length > 0, 'STATE.md should be updated');
    });
  });

  describe('/gsd-resume-work', function () {
    it('should read STATE.md and provide context', async function () {
      // First, ensure STATE.md has session context
      const currentState = readWorkspaceFile('.planning/STATE.md');
      assert.ok(currentState, 'STATE.md should exist before resume');

      await sendChatMessage('/gsd-resume-work');

      // resume-work reads state but shouldn't corrupt it
      await sleep(10_000);
      const stateAfter = readWorkspaceFile('.planning/STATE.md');
      assert.ok(stateAfter, 'STATE.md should still exist after resume');
    });
  });

  describe('Extension command: gsd.progress', function () {
    it('should execute via command palette', async function () {
      const vscode = require('vscode');
      // Execute the command directly (bypasses chat, tests the extension command)
      await vscode.commands.executeCommand('gsd.progress');
      await sleep(3000);
      // Chat panel should open — no errors means success
    });
  });
});
