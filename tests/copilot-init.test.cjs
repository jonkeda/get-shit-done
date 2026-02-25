/**
 * GSD Copilot MCP Server Tests — init.js
 */

const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadModule,
  createTempProject,
  cleanup,
  writeConfig,
  writeState,
  writeRoadmap,
  writeProject,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
} = require('./copilot-helpers.cjs');

let init;

describe('init.js', () => {
  before(async () => {
    init = await loadModule('init.js');
  });

  // ─── cmdInitNewProject ────────────────────────────────────────────────

  describe('cmdInitNewProject()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns project path and planning state', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitNewProject(tmpDir);
      assert.ok(result);
      assert.strictEqual(result.project_path, '.planning/PROJECT.md');
      assert.strictEqual(result.planning_exists, true);
      assert.strictEqual(result.project_exists, false);
    });

    it('detects existing PROJECT.md', () => {
      tmpDir = createTempProject({ project: true });
      const result = init.cmdInitNewProject(tmpDir);
      assert.strictEqual(result.project_exists, true);
    });

    it('detects brownfield project with code files', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'module.exports = {};', 'utf-8');
      const result = init.cmdInitNewProject(tmpDir);
      assert.strictEqual(result.has_existing_code, true);
      assert.strictEqual(result.is_brownfield, true);
      assert.strictEqual(result.needs_codebase_map, true);
    });

    it('returns commit_docs from config', () => {
      tmpDir = createTempProject({ config: { commit_docs: false } });
      const result = init.cmdInitNewProject(tmpDir);
      assert.strictEqual(result.commit_docs, false);
    });
  });

  // ─── cmdInitPlanPhase ─────────────────────────────────────────────────

  describe('cmdInitPlanPhase()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase is not provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => init.cmdInitPlanPhase(tmpDir), /phase required/);
    });

    it('returns phase info for existing phase dir', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      createPhaseDir(tmpDir, 1, 'Foundation');
      const result = init.cmdInitPlanPhase(tmpDir, '1');
      assert.strictEqual(result.phase_found, true);
      assert.strictEqual(result.phase_number, '01');
      assert.strictEqual(result.padded_phase, '01');
      assert.strictEqual(result.state_path, '.planning/STATE.md');
      assert.strictEqual(result.roadmap_path, '.planning/ROADMAP.md');
      assert.strictEqual(result.requirements_path, '.planning/REQUIREMENTS.md');
    });

    it('detects existing plans in phase', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      const { dirName } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, dirName, 1);
      const result = init.cmdInitPlanPhase(tmpDir, '1');
      assert.strictEqual(result.has_plans, true);
      assert.strictEqual(result.plan_count, 1);
    });

    it('detects CONTEXT and RESEARCH files', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      const { dirName, dirPath } = createPhaseDir(tmpDir, 1, 'Foundation');
      fs.writeFileSync(path.join(dirPath, '01-CONTEXT.md'), '# Context', 'utf-8');
      fs.writeFileSync(path.join(dirPath, '01-RESEARCH.md'), '# Research', 'utf-8');
      const result = init.cmdInitPlanPhase(tmpDir, '1');
      assert.strictEqual(result.has_context, true);
      assert.strictEqual(result.has_research, true);
      assert.ok(result.context_path);
      assert.ok(result.research_path);
    });

    it('returns phase_found false for missing phase', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitPlanPhase(tmpDir, '99');
      assert.strictEqual(result.phase_found, false);
      assert.strictEqual(result.phase_dir, null);
    });
  });

  // ─── cmdInitExecutePhase ──────────────────────────────────────────────

  describe('cmdInitExecutePhase()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase is not provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => init.cmdInitExecutePhase(tmpDir), /phase required/);
    });

    it('returns plan and summary counts', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      const { dirName } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, dirName, 1);
      writePlanFile(tmpDir, dirName, 2);
      writeSummaryFile(tmpDir, dirName, 1);
      const result = init.cmdInitExecutePhase(tmpDir, '1');
      assert.strictEqual(result.phase_found, true);
      assert.strictEqual(result.plan_count, 2);
      assert.strictEqual(result.plans.length, 2);
      assert.strictEqual(result.summaries.length, 1);
      assert.strictEqual(result.incomplete_count, 1);
    });

    it('returns milestone info and state paths', () => {
      tmpDir = createTempProject({
        roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }],
      });
      createPhaseDir(tmpDir, 1, 'Foundation');
      const result = init.cmdInitExecutePhase(tmpDir, '1');
      assert.ok(result.milestone_version);
      assert.strictEqual(result.state_path, '.planning/STATE.md');
      assert.strictEqual(result.roadmap_path, '.planning/ROADMAP.md');
      assert.strictEqual(result.config_path, '.planning/config.json');
      assert.strictEqual(result.state_exists, true);
      assert.strictEqual(result.config_exists, true);
    });
  });

  // ─── cmdInitVerifyWork ────────────────────────────────────────────────

  describe('cmdInitVerifyWork()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('throws when phase is not provided', () => {
      tmpDir = createTempProject();
      assert.throws(() => init.cmdInitVerifyWork(tmpDir), /phase required/);
    });

    it('returns verification context for existing phase', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 2, name: 'Core Logic', goal: 'Build' }] });
      createPhaseDir(tmpDir, 2, 'Core Logic');
      const result = init.cmdInitVerifyWork(tmpDir, '2');
      assert.strictEqual(result.phase_found, true);
      assert.strictEqual(result.phase_number, '02');
      assert.strictEqual(result.phase_name, 'core-logic');
      assert.strictEqual(result.has_verification, false);
    });
  });

  // ─── cmdInitPhaseOp ───────────────────────────────────────────────────

  describe('cmdInitPhaseOp()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns phase context with file detection', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      const { dirName, dirPath } = createPhaseDir(tmpDir, 1, 'Foundation');
      fs.writeFileSync(path.join(dirPath, '01-CONTEXT.md'), '# Context', 'utf-8');
      const result = init.cmdInitPhaseOp(tmpDir, '1');
      assert.strictEqual(result.phase_found, true);
      assert.strictEqual(result.padded_phase, '01');
      assert.ok(result.context_path);
      assert.strictEqual(result.state_path, '.planning/STATE.md');
    });

    it('falls back to roadmap when phase dir is missing', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 3, name: 'Polish', goal: 'Finish' }] });
      const result = init.cmdInitPhaseOp(tmpDir, '3');
      assert.strictEqual(result.phase_found, true);
      assert.strictEqual(result.phase_number, '3');
      assert.strictEqual(result.phase_dir, null);
    });
  });

  // ─── cmdInitMilestoneOp ───────────────────────────────────────────────

  describe('cmdInitMilestoneOp()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns milestone context with phase counts', () => {
      tmpDir = createTempProject({ roadmap: [{ num: 1, name: 'Foundation', goal: 'Setup' }] });
      const { dirName } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, dirName, 1);
      writeSummaryFile(tmpDir, dirName, 1);
      const result = init.cmdInitMilestoneOp(tmpDir);
      assert.ok(result.milestone_version);
      assert.strictEqual(result.phase_count, 1);
      assert.strictEqual(result.completed_phases, 1);
      assert.strictEqual(result.all_phases_complete, true);
      assert.strictEqual(result.phases_dir_exists, true);
    });

    it('counts archived milestones', () => {
      tmpDir = createTempProject();
      fs.mkdirSync(path.join(tmpDir, '.planning', 'archive', 'v0.1'), { recursive: true });
      const result = init.cmdInitMilestoneOp(tmpDir);
      assert.strictEqual(result.archive_count, 1);
      assert.deepStrictEqual(result.archived_milestones, ['v0.1']);
      assert.strictEqual(result.archive_exists, true);
    });
  });

  // ─── cmdInitMapCodebase ───────────────────────────────────────────────

  describe('cmdInitMapCodebase()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns codebase mapping context', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitMapCodebase(tmpDir);
      assert.strictEqual(result.codebase_dir, '.planning/codebase');
      assert.strictEqual(result.has_maps, false);
      assert.deepStrictEqual(result.existing_maps, []);
      assert.strictEqual(result.planning_exists, true);
      assert.strictEqual(result.codebase_dir_exists, false);
    });

    it('detects existing codebase maps', () => {
      tmpDir = createTempProject();
      fs.mkdirSync(path.join(tmpDir, '.planning', 'codebase'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.planning', 'codebase', 'overview.md'), '# Map', 'utf-8');
      const result = init.cmdInitMapCodebase(tmpDir);
      assert.strictEqual(result.has_maps, true);
      assert.strictEqual(result.existing_maps.length, 1);
      assert.strictEqual(result.codebase_dir_exists, true);
    });
  });

  // ─── cmdInitQuick ─────────────────────────────────────────────────────

  describe('cmdInitQuick()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns quick task context with slug', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitQuick(tmpDir, 'Fix the login bug');
      assert.ok(result.slug);
      assert.strictEqual(result.description, 'Fix the login bug');
      assert.strictEqual(result.next_num, 1);
      assert.strictEqual(result.quick_dir, '.planning/quick');
      assert.ok(result.task_dir);
      assert.ok(result.date);
    });

    it('increments next_num from existing quick tasks', () => {
      tmpDir = createTempProject();
      fs.mkdirSync(path.join(tmpDir, '.planning', 'quick', '1-first-task'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.planning', 'quick', '2-second-task'), { recursive: true });
      const result = init.cmdInitQuick(tmpDir, 'Third task');
      assert.strictEqual(result.next_num, 3);
    });

    it('handles null description', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitQuick(tmpDir);
      assert.strictEqual(result.description, null);
      assert.strictEqual(result.slug, null);
      assert.strictEqual(result.task_dir, null);
    });
  });

  // ─── cmdInitResume ────────────────────────────────────────────────────

  describe('cmdInitResume()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns resume context with paths', () => {
      tmpDir = createTempProject({ project: true });
      const result = init.cmdInitResume(tmpDir);
      assert.strictEqual(result.state_exists, true);
      assert.strictEqual(result.roadmap_exists, false);
      assert.strictEqual(result.project_exists, true);
      assert.strictEqual(result.state_path, '.planning/STATE.md');
      assert.strictEqual(result.has_interrupted_agent, false);
      assert.strictEqual(result.interrupted_agent_id, null);
    });

    it('detects interrupted agent id', () => {
      tmpDir = createTempProject();
      fs.writeFileSync(path.join(tmpDir, '.planning', 'current-agent-id.txt'), 'agent-42\n', 'utf-8');
      const result = init.cmdInitResume(tmpDir);
      assert.strictEqual(result.has_interrupted_agent, true);
      assert.strictEqual(result.interrupted_agent_id, 'agent-42');
    });
  });

  // ─── cmdInitTodos ─────────────────────────────────────────────────────

  describe('cmdInitTodos()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns empty todos when none exist', () => {
      tmpDir = createTempProject();
      const result = init.cmdInitTodos(tmpDir);
      assert.strictEqual(result.todo_count, 0);
      assert.deepStrictEqual(result.todos, []);
      assert.strictEqual(result.area_filter, null);
      assert.strictEqual(result.pending_dir, '.planning/todos/pending');
    });

    it('reads pending todos', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'todo-1.md'),
        'title: Fix tests\narea: testing\ncreated: 2025-01-15', 'utf-8');
      const result = init.cmdInitTodos(tmpDir);
      assert.strictEqual(result.todo_count, 1);
      assert.strictEqual(result.todos[0].title, 'Fix tests');
      assert.strictEqual(result.todos[0].area, 'testing');
      assert.strictEqual(result.pending_dir_exists, true);
    });

    it('filters by area', () => {
      tmpDir = createTempProject();
      const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
      fs.mkdirSync(pendingDir, { recursive: true });
      fs.writeFileSync(path.join(pendingDir, 'a.md'),
        'title: A\narea: frontend\ncreated: 2025-01-15', 'utf-8');
      fs.writeFileSync(path.join(pendingDir, 'b.md'),
        'title: B\narea: backend\ncreated: 2025-01-15', 'utf-8');
      const result = init.cmdInitTodos(tmpDir, 'frontend');
      assert.strictEqual(result.todo_count, 1);
      assert.strictEqual(result.area_filter, 'frontend');
      assert.strictEqual(result.todos[0].title, 'A');
    });
  });

  // ─── cmdInitProgress ──────────────────────────────────────────────────

  describe('cmdInitProgress()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns progress with phase statuses', () => {
      tmpDir = createTempProject({
        roadmap: [
          { num: 1, name: 'Foundation', goal: 'Setup' },
          { num: 2, name: 'Core', goal: 'Build' },
        ],
      });
      const { dirName: d1 } = createPhaseDir(tmpDir, 1, 'Foundation');
      writePlanFile(tmpDir, d1, 1);
      writeSummaryFile(tmpDir, d1, 1);
      createPhaseDir(tmpDir, 2, 'Core');

      const result = init.cmdInitProgress(tmpDir);
      assert.strictEqual(result.phase_count, 2);
      assert.strictEqual(result.completed_count, 1);
      assert.ok(result.milestone_version);
      assert.strictEqual(result.state_path, '.planning/STATE.md');
      assert.strictEqual(result.phases[0].status, 'complete');
      assert.strictEqual(result.phases[1].status, 'pending');
    });

    it('detects paused state', () => {
      tmpDir = createTempProject();
      writeState(tmpDir, { pausedAt: 'Phase 1, Plan 2' });
      const result = init.cmdInitProgress(tmpDir);
      assert.strictEqual(result.paused_at, 'Phase 1, Plan 2');
    });
  });

  // ─── cmdInitNewMilestone ──────────────────────────────────────────────

  describe('cmdInitNewMilestone()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('returns new milestone context', () => {
      tmpDir = createTempProject({ roadmap: true, project: true });
      const result = init.cmdInitNewMilestone(tmpDir);
      assert.ok(result.current_milestone);
      assert.strictEqual(result.project_exists, true);
      assert.strictEqual(result.roadmap_exists, true);
      assert.strictEqual(result.state_exists, true);
      assert.strictEqual(result.project_path, '.planning/PROJECT.md');
      assert.strictEqual(result.roadmap_path, '.planning/ROADMAP.md');
      assert.strictEqual(result.state_path, '.planning/STATE.md');
    });
  });
});
