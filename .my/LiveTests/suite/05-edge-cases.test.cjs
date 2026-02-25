/**
 * Edge Case and Robustness Tests
 *
 * Tests error handling, rapid command sequences, and boundary conditions.
 */

'use strict';

const assert = require('assert');
const {
  sendChatMessage,
  clearChat,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  fileExists,
  workspaceRoot,
  sleep,
} = require('./helpers.cjs');

describe('Edge Cases', function () {

  beforeEach(async function () {
    await clearChat();
    await sleep(1000);
  });

  describe('Rapid command sequences', function () {
    it('should handle two commands sent quickly', async function () {
      // Send two read-only commands in quick succession
      await sendChatMessage('/gsd-help');
      await sleep(500); // Brief pause, not full processing time
      await sendChatMessage('/gsd-progress');
      await sleep(10_000);

      // Neither should corrupt state
      assert.ok(fileExists('.planning/STATE.md'), 'STATE.md should survive rapid commands');
    });
  });

  describe('Invalid command', function () {
    it('should handle unknown /gsd- commands gracefully', async function () {
      // This command doesn't exist — Copilot should just respond saying so
      await sendChatMessage('/gsd-nonexistent-command');
      await sleep(5000);

      // No crash, no state corruption
      assert.ok(fileExists('.planning/STATE.md'), 'STATE.md should survive invalid command');
    });
  });

  describe('Missing planning directory', function () {
    // This test temporarily renames .planning/ to simulate a non-GSD workspace
    let stateBackup;

    before(function () {
      stateBackup = readWorkspaceFile('.planning/STATE.md');
    });

    it('should handle /gsd-progress gracefully when STATE.md is empty', async function () {
      // Write empty STATE.md
      writeWorkspaceFile('.planning/STATE.md', '');

      await sendChatMessage('/gsd-progress');
      await sleep(10_000);

      // Should not throw — chat should handle it
      // Restore original state
      writeWorkspaceFile('.planning/STATE.md', stateBackup || '');
    });

    after(function () {
      // Ensure STATE.md is restored
      if (stateBackup) {
        writeWorkspaceFile('.planning/STATE.md', stateBackup);
      }
    });
  });

  describe('Extension command robustness', function () {
    it('gsd.progress should not throw', async function () {
      const vscode = require('vscode');
      // Should resolve without error
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand('gsd.progress');
      });
    });

    it('gsd.newProject should not throw', async function () {
      const vscode = require('vscode');
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand('gsd.newProject');
      });
    });
  });
});
