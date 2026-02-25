/**
 * GSD Copilot MCP Server Tests — state.js
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadState,
  createTempProject,
  cleanup,
  writeState,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let state;

describe('state.js', () => {
  before(async () => {
    state = await loadState();
  });

  // ─── stateLoad ────────────────────────────────────────────────────────

  describe('stateLoad()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns config and state existence flags', () => {
      tmpDir = createTempProject();
      const result = state.stateLoad(tmpDir);
      assert.strictEqual(result.state_exists, true);
      assert.strictEqual(result.config_exists, true);
      assert.ok(result.config, 'should include config object');
      assert.strictEqual(result.config.model_profile, 'balanced');
    });

    it('returns empty state_raw when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      const result = state.stateLoad(tmpDir);
      assert.strictEqual(result.state_exists, false);
      assert.strictEqual(result.state_raw, '');
    });

    it('detects roadmap existence', () => {
      tmpDir = createTempProject({ roadmap: true });
      const result = state.stateLoad(tmpDir);
      assert.strictEqual(result.roadmap_exists, true);
    });

    it('detects missing roadmap', () => {
      tmpDir = createTempProject();
      const result = state.stateLoad(tmpDir);
      assert.strictEqual(result.roadmap_exists, false);
    });
  });

  // ─── stateSnapshot ────────────────────────────────────────────────────

  describe('stateSnapshot()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('parses standard STATE.md fields', () => {
      tmpDir = createTempProject({
        state: { currentPhase: '03', currentPhaseName: 'API Layer', totalPhases: 6, currentPlan: '2', totalPlans: 3, progress: '45%' },
      });

      const snap = state.stateSnapshot(tmpDir);
      assert.strictEqual(snap.current_phase, '03');
      assert.strictEqual(snap.current_phase_name, 'API Layer');
      assert.strictEqual(snap.total_phases, 6);
      assert.strictEqual(snap.current_plan, '2');
      assert.strictEqual(snap.total_plans_in_phase, 3);
      assert.strictEqual(snap.progress_percent, 45);
    });

    it('returns error when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      const snap = state.stateSnapshot(tmpDir);
      assert.strictEqual(snap.error, 'STATE.md not found');
    });

    it('extracts blockers list', () => {
      tmpDir = createTempProject({
        state: { blockers: '- Waiting for API keys\n- Need design review' },
      });
      const snap = state.stateSnapshot(tmpDir);
      assert.deepStrictEqual(snap.blockers, ['Waiting for API keys', 'Need design review']);
    });

    it('returns empty blockers when section has None', () => {
      tmpDir = createTempProject({ state: { blockers: 'None' } });
      const snap = state.stateSnapshot(tmpDir);
      assert.deepStrictEqual(snap.blockers, []);
    });

    it('extracts paused_at field', () => {
      tmpDir = createTempProject({
        state: { pausedAt: 'Phase 2, Plan 1, Task 3 - mid-refactor' },
      });
      const snap = state.stateSnapshot(tmpDir);
      assert.strictEqual(snap.paused_at, 'Phase 2, Plan 1, Task 3 - mid-refactor');
    });
  });

  // ─── stateGet ─────────────────────────────────────────────────────────

  describe('stateGet()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns full content when no section specified', () => {
      tmpDir = createTempProject();
      const result = state.stateGet(tmpDir);
      assert.ok(result.content, 'should have content');
      assert.ok(result.content.includes('Current Phase'), 'should contain state fields');
    });

    it('extracts a single field by name', () => {
      tmpDir = createTempProject({ state: { status: 'Paused' } });
      const result = state.stateGet(tmpDir, 'Status');
      assert.strictEqual(result.Status, 'Paused');
    });

    it('extracts a section by header', () => {
      tmpDir = createTempProject({ state: { blockers: '- Item A\n- Item B' } });
      const result = state.stateGet(tmpDir, 'Blockers');
      assert.ok(result.Blockers, 'should have Blockers section');
      assert.ok(result.Blockers.includes('Item A'));
    });

    it('returns error for nonexistent field', () => {
      tmpDir = createTempProject();
      const result = state.stateGet(tmpDir, 'NonexistentField');
      assert.ok(result.error);
    });

    it('throws when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      assert.throws(() => state.stateGet(tmpDir), /STATE\.md not found/);
    });
  });

  // ─── stateUpdate ──────────────────────────────────────────────────────

  describe('stateUpdate()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('updates a single field value', () => {
      tmpDir = createTempProject({ state: { status: 'In progress' } });
      const result = state.stateUpdate(tmpDir, 'Status', 'Complete');
      assert.strictEqual(result.updated, true);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('**Status:** Complete'));
    });

    it('returns not-updated for missing field', () => {
      tmpDir = createTempProject();
      const result = state.stateUpdate(tmpDir, 'FakeField', 'value');
      assert.strictEqual(result.updated, false);
      assert.ok(result.reason.includes('not found'));
    });

    it('returns not-updated when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      const result = state.stateUpdate(tmpDir, 'Status', 'X');
      assert.strictEqual(result.updated, false);
    });

    it('throws with missing arguments', () => {
      tmpDir = createTempProject();
      assert.throws(() => state.stateUpdate(tmpDir, null, 'v'), /field and value required/);
    });
  });

  // ─── statePatch ───────────────────────────────────────────────────────

  describe('statePatch()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('updates multiple fields at once', () => {
      tmpDir = createTempProject({ state: { status: 'In progress', currentPlan: '1' } });
      const result = state.statePatch(tmpDir, { 'Status': 'Paused', 'Current Plan': '2' });
      assert.deepStrictEqual(result.updated, ['Status', 'Current Plan']);
      assert.deepStrictEqual(result.failed, []);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('**Status:** Paused'));
      assert.ok(content.includes('**Current Plan:** 2'));
    });

    it('reports failed fields', () => {
      tmpDir = createTempProject();
      const result = state.statePatch(tmpDir, { 'Status': 'New', 'Fake': 'val' });
      assert.ok(result.updated.includes('Status'));
      assert.ok(result.failed.includes('Fake'));
    });

    it('throws when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      assert.throws(() => state.statePatch(tmpDir, { Status: 'X' }), /STATE\.md not found/);
    });
  });

  // ─── stateAdvancePlan ─────────────────────────────────────────────────

  describe('stateAdvancePlan()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('advances plan number by one', () => {
      tmpDir = createTempProject({ state: { currentPlan: '1', totalPlans: 3 } });
      const result = state.stateAdvancePlan(tmpDir);
      assert.strictEqual(result.advanced, true);
      assert.strictEqual(result.previous_plan, 1);
      assert.strictEqual(result.current_plan, 2);
    });

    it('detects phase completion when on last plan', () => {
      tmpDir = createTempProject({ state: { currentPlan: '3', totalPlans: 3 } });
      const result = state.stateAdvancePlan(tmpDir);
      assert.strictEqual(result.advanced, false);
      assert.strictEqual(result.reason, 'last_plan');
      assert.strictEqual(result.status, 'ready_for_verification');
    });

    it('updates status and last activity date', () => {
      tmpDir = createTempProject({ state: { currentPlan: '1', totalPlans: 3 } });
      state.stateAdvancePlan(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('**Status:** Ready to execute'));
      // Last activity should be today's date
      const today = new Date().toISOString().split('T')[0];
      assert.ok(content.includes(`**Last Activity:** ${today}`));
    });

    it('returns error when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      const result = state.stateAdvancePlan(tmpDir);
      assert.ok(result.error);
    });
  });

  // ─── stateUpdateProgress ──────────────────────────────────────────────

  describe('stateUpdateProgress()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('calculates progress from plan/summary counts', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = state.stateUpdateProgress(tmpDir);
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.percent, 50);
      assert.strictEqual(result.completed, 1);
      assert.strictEqual(result.total, 2);
    });

    it('reports 0% when no plans exist', () => {
      tmpDir = createTempProject();
      createPhaseDir(tmpDir, 1, 'empty');
      const result = state.stateUpdateProgress(tmpDir);
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.percent, 0);
    });

    it('reports 100% when all plans have summaries', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'done');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);

      const result = state.stateUpdateProgress(tmpDir);
      assert.strictEqual(result.percent, 100);
    });

    it('writes progress bar to STATE.md', () => {
      tmpDir = createTempProject();
      const { dirName } = createPhaseDir(tmpDir, 1, 'foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);

      state.stateUpdateProgress(tmpDir);
      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('**Progress:**'));
      assert.ok(content.includes('100%'));
    });

    it('returns error when STATE.md missing', () => {
      tmpDir = createTempProject({ state: false });
      const result = state.stateUpdateProgress(tmpDir);
      assert.ok(result.error);
    });
  });

  // ─── stateAddDecision ─────────────────────────────────────────────────

  describe('stateAddDecision()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('adds decision to Decisions section', () => {
      tmpDir = createTempProject({ state: { decisions: 'None yet.' } });
      const result = state.stateAddDecision(tmpDir, '01', 'Use Prisma', 'Better DX');
      assert.strictEqual(result.added, true);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('Use Prisma'));
      assert.ok(content.includes('Better DX'));
      assert.ok(!content.includes('None yet.'));
    });
  });

  // ─── stateAddBlocker / stateResolveBlocker ────────────────────────────

  describe('stateAddBlocker() / stateResolveBlocker()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('adds blocker to Blockers section', () => {
      tmpDir = createTempProject({ state: { blockers: 'None' } });
      const result = state.stateAddBlocker(tmpDir, 'Need API credentials');
      assert.strictEqual(result.added, true);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(content.includes('Need API credentials'));
    });

    it('resolves a blocker by text match', () => {
      tmpDir = createTempProject({ state: { blockers: '- Need API credentials\n- Waiting on design' } });
      const result = state.stateResolveBlocker(tmpDir, 'API credentials');
      assert.strictEqual(result.resolved, true);

      const content = fs.readFileSync(path.join(tmpDir, '.planning', 'STATE.md'), 'utf-8');
      assert.ok(!content.includes('API credentials'));
      assert.ok(content.includes('Waiting on design'));
    });
  });
});
