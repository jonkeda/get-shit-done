/**
 * Document Creation Tests
 *
 * Verifies that each GSD /command creates the expected planning documents.
 *
 * These tests send real prompts through Copilot Chat and then verify
 * that the expected files appear in .planning/. They test the complete
 * chain: prompt → skill → agent → MCP tools → file system.
 *
 * **IMPORTANT**: These tests are slow (LLM + MCP roundtrip per command)
 * and must run sequentially in the order listed — later tests depend on
 * files created by earlier tests.
 *
 * Test workspace prerequisites:
 * - A fresh workspace with `npx gsd-copilot init` already run
 * - OR a workspace where .planning/ can be safely recreated
 * - MCP server running (gsd-tools)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const {
  sendChatMessage,
  clearChat,
  waitForFile,
  waitForFileContent,
  waitForFileContentAbsent,
  waitForNewFileInDir,
  waitForStateChange,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  fileExists,
  listDir,
  workspaceRoot,
  waitForChatIdle,
  sleep,
} = require('./helpers.cjs');

// ───────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────

/**
 * Find the first phase directory matching a pattern.
 * Phase dirs are named like "01-fix-scaffold", "02-setup-tests", etc.
 */
function findPhaseDir(phaseNum) {
  const padded = String(phaseNum).padStart(2, '0');
  const phasesDir = path.join(workspaceRoot(), '.planning', 'phases');
  if (!fs.existsSync(phasesDir)) return null;
  const dirs = fs.readdirSync(phasesDir);
  const match = dirs.find(d => d.startsWith(padded + '-'));
  return match ? `phases/${match}` : null;
}

/**
 * List all files in a .planning/ subdirectory recursively.
 */
function listPlanningFiles(relDir) {
  const fullDir = path.join(workspaceRoot(), '.planning', relDir);
  if (!fs.existsSync(fullDir)) return [];
  const results = [];
  function walk(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), rel);
      } else {
        results.push(rel);
      }
    }
  }
  walk(fullDir, '');
  return results;
}

/**
 * Assert a file exists in .planning/ and optionally check its content.
 */
function assertPlanningFile(relPath, contentPattern) {
  const fullPath = path.join(workspaceRoot(), '.planning', relPath);
  assert.ok(fs.existsSync(fullPath),
    `.planning/${relPath} should exist`);
  if (contentPattern) {
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(contentPattern.test(content),
      `.planning/${relPath} should match ${contentPattern}`);
  }
}

/**
 * Assert a file has YAML frontmatter (starts with ---).
 */
function assertHasFrontmatter(relPath) {
  const fullPath = path.join(workspaceRoot(), '.planning', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert.ok(content.startsWith('---'),
    `.planning/${relPath} should have YAML frontmatter`);
  assert.ok(content.indexOf('---', 3) > 3,
    `.planning/${relPath} should have closing frontmatter delimiter`);
}

// ───────────────────────────────────────────────────────
// Test Suites
// ───────────────────────────────────────────────────────

describe('Document Creation per Command', function () {

  // These tests are slow — generous timeout
  // summarizeVirtualTools adds ~20s per request, plus MCP tool chain execution
  this.timeout(300_000);
  this.slow(90_000);

  /**
   * Cancel any pending chat request, then start a fresh chat session.
   * VS Code refuses to accept new input while a prior request is processing
   * ("You already have pending requests" dialog), so we must cancel first.
   */
  async function resetChat() {
    // 1. Cancel any in-progress chat request
    try {
      await vscode.commands.executeCommand('workbench.action.chat.cancel');
    } catch { /* command may not exist */ }
    await sleep(1000);

    // 2. Start a fresh chat session (avoids stale request state)
    try {
      await vscode.commands.executeCommand('workbench.action.chat.newChat');
    } catch {
      await clearChat();
    }
    await sleep(2000);
  }

  // Wait for prior test suites' chat requests to fully drain
  before(async function () {
    this.timeout(30_000);
    await resetChat();
    // Extra wait after all previous suites
    await sleep(5000);
  });

  beforeEach(async function () {
    await resetChat();
  });

  // ─────────────────────────────────────────────────────
  // /gsd-set-profile — modifies config.json
  // ─────────────────────────────────────────────────────
  describe('/gsd-set-profile', function () {
    it('should update config.json with the selected profile', async function () {
      // Ensure starting point
      const configBefore = JSON.parse(readWorkspaceFile('.planning/config.json'));
      const originalProfile = configBefore.model_profile || 'balanced';

      await sendChatMessage('/gsd-set-profile quality');

      const content = await waitForFileContent(
        '.planning/config.json',
        /"model_profile"\s*:\s*"quality"/,
        90_000,
      );

      const config = JSON.parse(content);
      assert.strictEqual(config.model_profile, 'quality',
        'config.json should have model_profile set to "quality"');

      // Restore
      config.model_profile = originalProfile;
      writeWorkspaceFile('.planning/config.json', JSON.stringify(config, null, 2) + '\n');
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-add-phase — modifies ROADMAP.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-add-phase', function () {
    let roadmapBefore;

    before(function () {
      roadmapBefore = readWorkspaceFile('.planning/ROADMAP.md');
    });

    it('should append a new phase to ROADMAP.md', async function () {
      await sendChatMessage('/gsd-add-phase "Document creation test phase"');

      // Wait for ROADMAP.md to contain our new phase
      const content = await waitForFileContent(
        '.planning/ROADMAP.md',
        /document creation test phase/i,
        90_000,
      );

      assert.ok(content.length > roadmapBefore.length,
        'ROADMAP.md should be longer after adding a phase');
    });

    after(async function () {
      // Clean up: restore original roadmap
      if (roadmapBefore) {
        writeWorkspaceFile('.planning/ROADMAP.md', roadmapBefore);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-insert-phase — modifies ROADMAP.md (decimal phase)
  // ─────────────────────────────────────────────────────
  describe('/gsd-insert-phase', function () {
    let roadmapBefore;

    before(function () {
      roadmapBefore = readWorkspaceFile('.planning/ROADMAP.md');
    });

    it('should insert a phase into ROADMAP.md', async function () {
      await sendChatMessage('/gsd-insert-phase 1 "Urgent document test insertion"');

      const content = await waitForFileContent(
        '.planning/ROADMAP.md',
        /urgent document test insertion/i,
        90_000,
      );

      assert.ok(content.includes('1.'),
        'ROADMAP.md should contain a decimal phase (1.x)');
    });

    after(async function () {
      if (roadmapBefore) {
        writeWorkspaceFile('.planning/ROADMAP.md', roadmapBefore);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-remove-phase — modifies ROADMAP.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-remove-phase', function () {
    let roadmapBefore;

    before(async function () {
      this.timeout(240_000);
      // First add a phase so we have something safe to remove
      roadmapBefore = readWorkspaceFile('.planning/ROADMAP.md');
      await clearChat();
      await sendChatMessage('/gsd-add-phase "Temporary phase to be removed"');
      await waitForFileContent('.planning/ROADMAP.md', /temporary phase to be removed/i, 180_000);
    });

    it('should remove a phase from ROADMAP.md', async function () {
      // Count phases before removal
      const roadmapWithPhase = readWorkspaceFile('.planning/ROADMAP.md');
      const phaseCountBefore = (roadmapWithPhase.match(/^## Phase/gm) || []).length;

      // Remove the last phase
      await sendChatMessage(`/gsd-remove-phase ${phaseCountBefore}`);

      // Poll until the removed phase text disappears from ROADMAP.md
      const roadmapAfter = await waitForFileContentAbsent(
        '.planning/ROADMAP.md',
        /temporary phase to be removed/i,
        180_000,
      );

      assert.ok(!roadmapAfter.includes('Temporary phase to be removed'),
        'Removed phase should no longer appear in ROADMAP.md');
    });

    after(async function () {
      if (roadmapBefore) {
        writeWorkspaceFile('.planning/ROADMAP.md', roadmapBefore);
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-discuss-phase — creates CONTEXT.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-discuss-phase', function () {
    it('should create {NN}-CONTEXT.md in the phase directory', async function () {
      // This is interactive — GSD will ask questions.
      // We send a follow-up message with preset answers to move it along.
      await sendChatMessage('/gsd-discuss-phase 1');

      // Wait for the agent to finish its first response (asking questions)
      await waitForChatIdle(8000, 120_000);

      // Provide generic answers to advance the discussion
      await sendChatMessage(
        'Use the simplest approach for everything. ' +
        'No special preferences — use project defaults for all decisions. ' +
        "Let's keep it minimal. I'm happy with whatever you suggest.",
      );

      // Wait for CONTEXT.md to appear in the phase directory
      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      await waitForFile(`.planning/${phaseDir}/01-CONTEXT.md`, 240_000);
      assertPlanningFile(`${phaseDir}/01-CONTEXT.md`);
      assertHasFrontmatter(`${phaseDir}/01-CONTEXT.md`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-plan-phase — creates RESEARCH.md, PLAN.md(s), VALIDATION.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-plan-phase', function () {
    it('should create RESEARCH.md in the phase directory', async function () {
      await sendChatMessage('/gsd-plan-phase 1');

      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      // RESEARCH.md is created during the research sub-step
      await waitForFile(`.planning/${phaseDir}/01-RESEARCH.md`, 240_000);
      assertPlanningFile(`${phaseDir}/01-RESEARCH.md`);
      assertHasFrontmatter(`${phaseDir}/01-RESEARCH.md`);
    });

    it('should create at least one PLAN.md in the phase directory', async function () {
      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      // Wait for the first plan file to appear
      await waitForFile(`.planning/${phaseDir}/01-01-PLAN.md`, 240_000);
      assertPlanningFile(`${phaseDir}/01-01-PLAN.md`);
      assertHasFrontmatter(`${phaseDir}/01-01-PLAN.md`);

      // Plan should have task structure
      const planContent = readWorkspaceFile(`.planning/${phaseDir}/01-01-PLAN.md`);
      assert.ok(planContent.length > 100,
        'PLAN.md should have substantial content');
    });

    it('should create VALIDATION.md in the phase directory', async function () {
      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      // VALIDATION.md is created after plan verification
      await waitForFile(`.planning/${phaseDir}/01-VALIDATION.md`, 240_000);
      assertPlanningFile(`${phaseDir}/01-VALIDATION.md`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-execute-phase — creates SUMMARY.md(s), VERIFICATION.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-execute-phase', function () {
    it('should create SUMMARY.md for each plan', async function () {
      await sendChatMessage('/gsd-execute-phase 1');

      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      // At least one SUMMARY.md should be created
      await waitForFile(`.planning/${phaseDir}/01-01-SUMMARY.md`, 120_000);
      assertPlanningFile(`${phaseDir}/01-01-SUMMARY.md`);
      assertHasFrontmatter(`${phaseDir}/01-01-SUMMARY.md`);

      const summary = readWorkspaceFile(`.planning/${phaseDir}/01-01-SUMMARY.md`);
      assert.ok(summary.length > 50,
        'SUMMARY.md should have content describing what was done');
    });

    it('should create VERIFICATION.md in the phase directory', async function () {
      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      // VERIFICATION.md is created during post-execution verification
      await waitForFile(`.planning/${phaseDir}/01-VERIFICATION.md`, 120_000);
      assertPlanningFile(`${phaseDir}/01-VERIFICATION.md`);
    });

    it('should update STATE.md with progress', async function () {
      const state = readWorkspaceFile('.planning/STATE.md');
      assert.ok(state, 'STATE.md should exist');
      // After execution, STATE should reflect phase progress
      assert.ok(state.length > 0, 'STATE.md should have content');
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-verify-work — creates UAT.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-verify-work', function () {
    it('should create UAT.md in the phase directory', async function () {
      await sendChatMessage('/gsd-verify-work 1');

      // Wait for agent to finish first response (asks for verification)
      await waitForChatIdle(8000, 120_000);
      await sendChatMessage('All items look correct. Approve everything as passed.');

      const phaseDir = findPhaseDir(1);
      assert.ok(phaseDir, 'Phase 1 directory should exist');

      await waitForFile(`.planning/${phaseDir}/01-UAT.md`, 120_000);
      assertPlanningFile(`${phaseDir}/01-UAT.md`);
      assertHasFrontmatter(`${phaseDir}/01-UAT.md`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-quick — creates task dir with PLAN.md + SUMMARY.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-quick', function () {
    it('should create a task directory in .planning/quick/', async function () {
      await sendChatMessage('/gsd-quick "Add a CONTRIBUTING.md with basic guidelines"');

      // Wait for a new directory to appear in quick/
      const newDirs = await waitForNewFileInDir('.planning/quick', 120_000);
      assert.ok(newDirs.length > 0,
        'A new task directory should be created in .planning/quick/');
    });

    it('should create PLAN.md in the quick task directory', async function () {
      const quickDirs = listDir('.planning/quick');
      const taskDir = quickDirs.find(d => {
        const fullPath = path.join(workspaceRoot(), '.planning', 'quick', d);
        return fs.statSync(fullPath).isDirectory();
      });
      assert.ok(taskDir, 'Quick task directory should exist');

      const planExists = fileExists(`.planning/quick/${taskDir}/PLAN.md`);
      assert.ok(planExists, `PLAN.md should exist in .planning/quick/${taskDir}/`);
    });

    it('should create SUMMARY.md in the quick task directory', async function () {
      const quickDirs = listDir('.planning/quick');
      const taskDir = quickDirs.find(d => {
        const fullPath = path.join(workspaceRoot(), '.planning', 'quick', d);
        return fs.statSync(fullPath).isDirectory();
      });
      assert.ok(taskDir, 'Quick task directory should exist');

      // SUMMARY.md may take a while since it executes after planning
      await waitForFile(`.planning/quick/${taskDir}/SUMMARY.md`, 120_000);
      const summary = readWorkspaceFile(`.planning/quick/${taskDir}/SUMMARY.md`);
      assert.ok(summary.length > 0, 'SUMMARY.md should have content');
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-debug — creates debug session file
  // ─────────────────────────────────────────────────────
  describe('/gsd-debug', function () {
    it('should create a debug session file in .planning/debug/', async function () {
      await sendChatMessage('/gsd-debug "Test file not found when running npm test"');

      // Wait for agent to finish first response (diagnostic questions)
      await waitForChatIdle(8000, 120_000);

      // Provide answers to the diagnostic questions
      await sendChatMessage(
        'The error is "Cannot find module ./test.js". ' +
        'It happens every time I run npm test. ' +
        'Started after renaming the test file. ' +
        'No other errors. Running Node.js 22 on Windows.',
      );

      // Wait for debug session file to appear
      const newFiles = await waitForNewFileInDir('.planning/debug', 120_000);
      assert.ok(newFiles.length > 0,
        'A debug session file should be created in .planning/debug/');

      // Verify it's a .md file with content
      const mdFile = newFiles.find(f => f.endsWith('.md'));
      assert.ok(mdFile, 'Debug session should be a .md file');

      const content = readWorkspaceFile(`.planning/debug/${mdFile}`);
      assert.ok(content.length > 50,
        'Debug session file should have substantial content');
    });

    after(async function () {
      // Clean up debug files created by this test
      const debugDir = path.join(workspaceRoot(), '.planning', 'debug');
      if (fs.existsSync(debugDir)) {
        for (const file of fs.readdirSync(debugDir)) {
          const fullPath = path.join(debugDir, file);
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-research-phase — creates RESEARCH.md (standalone)
  // ─────────────────────────────────────────────────────
  describe('/gsd-research-phase', function () {
    it('should create RESEARCH.md without creating plans', async function () {
      // Use phase 2 so we don't collide with phase 1's research from plan-phase
      const phaseDir = findPhaseDir(2);
      if (!phaseDir) {
        this.skip('Phase 2 directory does not exist — skipping');
        return;
      }

      // Check there's no research file yet for phase 2
      const researchPath = `.planning/${phaseDir}/02-RESEARCH.md`;
      const hadResearch = fileExists(researchPath);

      await sendChatMessage('/gsd-research-phase 2');

      await waitForFile(researchPath, 120_000);
      assertPlanningFile(researchPath.replace('.planning/', ''));
      assertHasFrontmatter(researchPath.replace('.planning/', ''));

      // Should NOT create PLAN.md files (that's plan-phase's job)
      const files = listPlanningFiles(phaseDir);
      const planFiles = files.filter(f => f.includes('-PLAN.md'));
      if (!hadResearch) {
        // If there were no prereqs, standalone research should not create plans
        assert.strictEqual(planFiles.length, 0,
          'research-phase should not create PLAN.md files');
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-pause-work — modifies STATE.md with session context
  // ─────────────────────────────────────────────────────
  describe('/gsd-pause-work', function () {
    it('should save session context to STATE.md', async function () {
      const stateBefore = readWorkspaceFile('.planning/STATE.md');

      await sendChatMessage('/gsd-pause-work');

      // STATE.md should be updated with session/continuation info
      const state = await waitForFileContent(
        '.planning/STATE.md',
        /session|pause|continuation|context/i,
        60_000,
      );

      assert.ok(state.length >= stateBefore.length,
        'STATE.md should grow or stay same after pause (adds context)');
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-resume-work — reads STATE.md (no new files)
  // ─────────────────────────────────────────────────────
  describe('/gsd-resume-work', function () {
    it('should read STATE.md without creating new files', async function () {
      const filesBefore = listPlanningFiles('.');

      await sendChatMessage('/gsd-resume-work');
      await waitForChatIdle(8000, 60_000);

      // Resume is read-only — should not create new files
      // (it may update STATE.md with session timestamp, which is fine)
      const filesAfter = listPlanningFiles('.');
      // Allow STATE.md modification but no new files outside of it
      const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
      assert.ok(newFiles.length === 0,
        `resume-work should not create new files, but found: ${newFiles.join(', ')}`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-health — no new files (read-only)
  // ─────────────────────────────────────────────────────
  describe('/gsd-health', function () {
    it('should not create any new files', async function () {
      const filesBefore = listPlanningFiles('.');

      await sendChatMessage('/gsd-health');
      await waitForChatIdle(8000, 60_000);

      const filesAfter = listPlanningFiles('.');
      const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
      assert.ok(newFiles.length === 0,
        `/gsd-health should not create files, but found: ${newFiles.join(', ')}`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-progress — no new files (read-only)
  // ─────────────────────────────────────────────────────
  describe('/gsd-progress', function () {
    it('should not create any new files', async function () {
      const filesBefore = listPlanningFiles('.');

      await sendChatMessage('/gsd-progress');
      await waitForChatIdle(8000, 60_000);

      const filesAfter = listPlanningFiles('.');
      const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
      assert.ok(newFiles.length === 0,
        `/gsd-progress should not create files, but found: ${newFiles.join(', ')}`);
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-add-todo — modifies STATE.md or creates todo file
  // ─────────────────────────────────────────────────────
  describe('/gsd-add-todo', function () {
    it('should record a todo entry', async function () {
      const stateBefore = readWorkspaceFile('.planning/STATE.md');

      await sendChatMessage('/gsd-add-todo "Test todo: verify document creation"');
      await waitForChatIdle(8000, 120_000);

      // Todo may be stored in STATE.md or in a quick/ task file
      const stateAfter = readWorkspaceFile('.planning/STATE.md');
      const stateChanged = stateAfter !== stateBefore;
      const hasQuickFiles = listDir('.planning/quick').length > 0;

      assert.ok(stateChanged || hasQuickFiles,
        'Todo should be recorded in STATE.md or .planning/quick/');
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-audit-milestone — creates MILESTONE-AUDIT.md
  // ─────────────────────────────────────────────────────
  describe('/gsd-audit-milestone', function () {
    it('should create a milestone audit report', async function () {
      await sendChatMessage('/gsd-audit-milestone');

      // Wait for the audit file to appear (pattern: v*-MILESTONE-AUDIT.md)
      const deadline = Date.now() + 120_000;
      let auditFile = null;

      while (Date.now() < deadline) {
        const planningFiles = listDir('.planning');
        auditFile = planningFiles.find(f => f.includes('MILESTONE-AUDIT'));
        if (auditFile) break;
        await sleep(2000);
      }

      assert.ok(auditFile,
        'A MILESTONE-AUDIT.md file should be created in .planning/');

      const content = readWorkspaceFile(`.planning/${auditFile}`);
      assert.ok(content.length > 50,
        'Audit report should have substantial content');
    });

    after(async function () {
      // Clean up audit file
      const planningFiles = listDir('.planning');
      for (const f of planningFiles) {
        if (f.includes('MILESTONE-AUDIT')) {
          deleteWorkspaceFile(`.planning/${f}`);
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // /gsd-map-codebase — creates files in .planning/codebase/
  // ─────────────────────────────────────────────────────
  describe('/gsd-map-codebase', function () {
    it('should create STACK.md in .planning/codebase/', async function () {
      await sendChatMessage('/gsd-map-codebase');

      await waitForFile('.planning/codebase/STACK.md', 120_000);
      assertPlanningFile('codebase/STACK.md');

      const content = readWorkspaceFile('.planning/codebase/STACK.md');
      assert.ok(content.length > 50,
        'STACK.md should have substantial content');
    });

    it('should create INTEGRATIONS.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/INTEGRATIONS.md', 120_000);
      assertPlanningFile('codebase/INTEGRATIONS.md');
    });

    it('should create ARCHITECTURE.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/ARCHITECTURE.md', 120_000);
      assertPlanningFile('codebase/ARCHITECTURE.md');
    });

    it('should create STRUCTURE.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/STRUCTURE.md', 120_000);
      assertPlanningFile('codebase/STRUCTURE.md');
    });

    it('should create CONVENTIONS.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/CONVENTIONS.md', 120_000);
      assertPlanningFile('codebase/CONVENTIONS.md');
    });

    it('should create TESTING.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/TESTING.md', 120_000);
      assertPlanningFile('codebase/TESTING.md');
    });

    it('should create CONCERNS.md in .planning/codebase/', async function () {
      await waitForFile('.planning/codebase/CONCERNS.md', 120_000);
      assertPlanningFile('codebase/CONCERNS.md');
    });

    after(async function () {
      // Clean up codebase docs created by this test
      const codebaseDir = path.join(workspaceRoot(), '.planning', 'codebase');
      if (fs.existsSync(codebaseDir)) {
        for (const file of fs.readdirSync(codebaseDir)) {
          const fullPath = path.join(codebaseDir, file);
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────
  // Summary: Full phase lifecycle document inventory
  // ─────────────────────────────────────────────────────
  describe('Phase lifecycle — complete document inventory', function () {
    it('should have all expected documents after discuss → plan → execute → verify', function () {
      const phaseDir = findPhaseDir(1);
      if (!phaseDir) {
        this.skip('Phase 1 directory does not exist — earlier tests may have been skipped');
        return;
      }

      const files = listPlanningFiles(phaseDir);
      const padded = '01';

      // CONTEXT.md (from discuss-phase)
      assert.ok(files.some(f => f.includes(`${padded}-CONTEXT.md`)),
        `${phaseDir} should contain CONTEXT.md`);

      // RESEARCH.md (from plan-phase)
      assert.ok(files.some(f => f.includes(`${padded}-RESEARCH.md`)),
        `${phaseDir} should contain RESEARCH.md`);

      // At least one PLAN.md (from plan-phase)
      assert.ok(files.some(f => f.includes('-PLAN.md')),
        `${phaseDir} should contain at least one PLAN.md`);

      // VALIDATION.md (from plan-phase)
      assert.ok(files.some(f => f.includes(`${padded}-VALIDATION.md`)),
        `${phaseDir} should contain VALIDATION.md`);

      // At least one SUMMARY.md (from execute-phase)
      assert.ok(files.some(f => f.includes('-SUMMARY.md')),
        `${phaseDir} should contain at least one SUMMARY.md`);

      // VERIFICATION.md (from execute-phase)
      assert.ok(files.some(f => f.includes(`${padded}-VERIFICATION.md`)),
        `${phaseDir} should contain VERIFICATION.md`);

      // UAT.md (from verify-work)
      assert.ok(files.some(f => f.includes(`${padded}-UAT.md`)),
        `${phaseDir} should contain UAT.md`);
    });

    it('should have all expected top-level planning documents', function () {
      assertPlanningFile('STATE.md');
      assertPlanningFile('PROJECT.md');
      assertPlanningFile('REQUIREMENTS.md');
      assertPlanningFile('ROADMAP.md');
      assertPlanningFile('config.json');
    });
  });
});
