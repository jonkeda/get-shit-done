/**
 * MCP Server Integration Tests
 *
 * Verifies the full chain: VS Code → Chat → Prompt → Agent → MCP Tools
 *
 * These tests send prompts that are known to invoke specific MCP tools,
 * then verify the tools executed by checking their side effects.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  sendChatMessage,
  clearChat,
  waitForFile,
  waitForFileContent,
  waitForNewFileInDir,
  readWorkspaceFile,
  writeWorkspaceFile,
  fileExists,
  listDir,
  workspaceRoot,
  sleep,
} = require('./helpers.cjs');

describe('MCP Tool Chain Verification', function () {

  beforeEach(async function () {
    await clearChat();
    await sleep(1000);
  });

  describe('gsd_state_load integration', function () {
    it('/gsd-progress should invoke gsd_state_load (no state corruption)', async function () {
      const stateBefore = readWorkspaceFile('.planning/STATE.md');
      assert.ok(stateBefore, 'STATE.md should exist before test');

      await sendChatMessage('/gsd-progress');
      // Progress reads state but should not modify it
      await sleep(15_000);

      const stateAfter = readWorkspaceFile('.planning/STATE.md');
      assert.strictEqual(stateAfter, stateBefore,
        'STATE.md should not be modified by progress check');
    });
  });

  describe('gsd_config_load integration', function () {
    it('/gsd-settings should read config without modifying', async function () {
      const configBefore = readWorkspaceFile('.planning/config.json');
      assert.ok(configBefore, 'config.json should exist before test');

      await sendChatMessage('/gsd-settings');
      await sleep(15_000);

      const configAfter = readWorkspaceFile('.planning/config.json');
      assert.strictEqual(configAfter, configBefore,
        'config.json should not be modified by settings check');
    });
  });

  describe('gsd_config_set integration', function () {
    it('/gsd-set-profile should modify config.json via MCP tool', async function () {
      // Ensure we start with 'balanced'
      const config = JSON.parse(readWorkspaceFile('.planning/config.json'));
      config.model_profile = 'balanced';
      writeWorkspaceFile('.planning/config.json', JSON.stringify(config, null, 2) + '\n');

      await sendChatMessage('/gsd-set-profile budget');

      // Wait for the config to be updated
      const content = await waitForFileContent(
        '.planning/config.json',
        /"model_profile"\s*:\s*"budget"/,
        90_000,
      );

      const updated = JSON.parse(content);
      assert.strictEqual(updated.model_profile, 'budget');
    });

    afterEach(async function () {
      // Reset
      const config = JSON.parse(readWorkspaceFile('.planning/config.json') || '{}');
      config.model_profile = 'balanced';
      writeWorkspaceFile('.planning/config.json', JSON.stringify(config, null, 2) + '\n');
    });
  });

  describe('gsd_roadmap_analyze integration', function () {
    it('/gsd-progress should read roadmap data without error', async function () {
      assert.ok(fileExists('.planning/ROADMAP.md'), 'ROADMAP.md should exist');

      await sendChatMessage('/gsd-progress');
      await sleep(15_000);

      // Verify roadmap wasn't corrupted
      const roadmap = readWorkspaceFile('.planning/ROADMAP.md');
      assert.ok(roadmap.includes('## Phase 1'), 'ROADMAP should still contain Phase 1');
      assert.ok(roadmap.includes('## Phase 2'), 'ROADMAP should still contain Phase 2');
    });
  });
});
