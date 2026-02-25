/**
 * Chat Command Tests — Read-Only Commands
 *
 * Tests GSD commands that read state without modifying it:
 * /gsd-help, /gsd-progress, /gsd-health, /gsd-settings, /gsd-check-todos
 *
 * Since we can't read chat responses programmatically, these tests verify:
 * 1. The command executes without throwing
 * 2. The chat panel opens successfully
 * 3. No unintended file modifications occur
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  sendChatMessage,
  clearChat,
  readWorkspaceFile,
  fileExists,
  listDir,
  workspaceRoot,
  sleep,
} = require('./helpers.cjs');

describe('Read-Only Chat Commands', function () {

  /**
   * Snapshot the .planning/ directory state before each test
   * so we can verify nothing was modified unexpectedly.
   */
  let planningSnapshot;

  function snapshotPlanning() {
    const planDir = path.join(workspaceRoot(), '.planning');
    const snapshot = {};
    if (fs.existsSync(planDir)) {
      walkDir(planDir, (relPath, content) => {
        snapshot[relPath] = content;
      });
    }
    return snapshot;
  }

  function walkDir(dir, callback, rel = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryRel = path.join(rel, entry.name);
      const entryFull = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(entryFull, callback, entryRel);
      } else {
        callback(entryRel, fs.readFileSync(entryFull, 'utf8'));
      }
    }
  }

  function assertPlanningUnchanged() {
    const current = snapshotPlanning();
    const beforeKeys = Object.keys(planningSnapshot).sort();
    const afterKeys = Object.keys(current).sort();
    assert.deepStrictEqual(afterKeys, beforeKeys,
      'No files should be added or removed from .planning/');
    for (const key of beforeKeys) {
      assert.strictEqual(current[key], planningSnapshot[key],
        `File .planning/${key} should not be modified`);
    }
  }

  beforeEach(async function () {
    planningSnapshot = snapshotPlanning();
    await clearChat();
  });

  describe('/gsd-help', function () {
    it('should open chat without errors', async function () {
      // This should execute the help prompt and show available commands
      await sendChatMessage('/gsd-help');
      // Wait for processing
      await sleep(5000);
      // Verify no side effects
      assertPlanningUnchanged();
    });
  });

  describe('/gsd-progress', function () {
    it('should open chat without errors', async function () {
      await sendChatMessage('/gsd-progress');
      await sleep(5000);
      assertPlanningUnchanged();
    });
  });

  describe('/gsd-health', function () {
    it('should open chat without errors', async function () {
      await sendChatMessage('/gsd-health');
      await sleep(5000);
      assertPlanningUnchanged();
    });
  });

  describe('/gsd-settings', function () {
    it('should open chat without errors', async function () {
      await sendChatMessage('/gsd-settings');
      await sleep(5000);
      assertPlanningUnchanged();
    });
  });

  describe('/gsd-check-todos', function () {
    it('should open chat without errors', async function () {
      await sendChatMessage('/gsd-check-todos');
      await sleep(5000);
      assertPlanningUnchanged();
    });
  });
});
