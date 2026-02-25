/**
 * GSD Copilot MCP Server Tests — config.js
 */

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  loadConfig: loadConfigModule,
  createTempProject,
  cleanup,
} = require('./copilot-helpers.cjs');

let config;

describe('config.js', () => {
  before(async () => {
    config = await loadConfigModule();
  });

  // ─── configEnsure ─────────────────────────────────────────────────────

  describe('configEnsure()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('creates config.json with defaults when missing', () => {
      tmpDir = createTempProject({ config: false });
      const result = config.configEnsure(tmpDir);
      assert.strictEqual(result.created, true);
      assert.ok(result.path.includes('config.json'));

      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.model_profile, 'balanced');
      assert.strictEqual(content.commit_docs, true);
      assert.strictEqual(content.parallelization, true);
      assert.strictEqual(content.workflow.research, true);
      assert.strictEqual(content.workflow.plan_check, true);
    });

    it('returns already_exists when config.json present', () => {
      tmpDir = createTempProject(); // creates config by default
      const result = config.configEnsure(tmpDir);
      assert.strictEqual(result.created, false);
      assert.strictEqual(result.reason, 'already_exists');
    });

    it('creates .planning directory if missing', () => {
      tmpDir = createTempProject({ config: false, state: false });
      fs.rmSync(path.join(tmpDir, '.planning'), { recursive: true, force: true });
      // configEnsure should create .planning
      const result = config.configEnsure(tmpDir);
      assert.strictEqual(result.created, true);
      assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'config.json')));
    });
  });

  // ─── configSet ────────────────────────────────────────────────────────

  describe('configSet()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('sets a top-level key', () => {
      tmpDir = createTempProject();
      const result = config.configSet(tmpDir, 'model_profile', 'quality');
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.value, 'quality');

      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.model_profile, 'quality');
    });

    it('sets a nested key with dot notation', () => {
      tmpDir = createTempProject();
      const result = config.configSet(tmpDir, 'workflow.research', 'false');
      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.value, false); // string "false" → boolean

      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.workflow.research, false);
    });

    it('coerces "true" string to boolean', () => {
      tmpDir = createTempProject();
      config.configSet(tmpDir, 'brave_search', 'true');
      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.brave_search, true);
    });

    it('coerces numeric strings to numbers', () => {
      tmpDir = createTempProject();
      config.configSet(tmpDir, 'custom_count', '42');
      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.custom_count, 42);
    });

    it('creates intermediate objects for deep paths', () => {
      tmpDir = createTempProject();
      config.configSet(tmpDir, 'deeply.nested.key', 'value');
      const content = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'config.json'), 'utf-8'));
      assert.strictEqual(content.deeply.nested.key, 'value');
    });

    it('throws when key path is missing', () => {
      tmpDir = createTempProject();
      assert.throws(() => config.configSet(tmpDir, null, 'v'), /key path required/);
    });
  });

  // ─── configGet ────────────────────────────────────────────────────────

  describe('configGet()', () => {
    let tmpDir;
    afterEach(() => { if (tmpDir) cleanup(tmpDir); });

    it('gets a top-level value', () => {
      tmpDir = createTempProject({ config: { model_profile: 'budget' } });
      const result = config.configGet(tmpDir, 'model_profile');
      assert.strictEqual(result, 'budget');
    });

    it('gets a nested value with dot notation', () => {
      tmpDir = createTempProject({ config: { workflow: { research: false } } });
      const result = config.configGet(tmpDir, 'workflow.research');
      assert.strictEqual(result, false);
    });

    it('throws for nonexistent key', () => {
      tmpDir = createTempProject();
      assert.throws(() => config.configGet(tmpDir, 'nonexistent.key'), /Key not found/);
    });

    it('throws when config.json missing', () => {
      tmpDir = createTempProject({ config: false });
      assert.throws(() => config.configGet(tmpDir, 'model_profile'), /No config\.json found/);
    });

    it('throws when key path is null', () => {
      tmpDir = createTempProject();
      assert.throws(() => config.configGet(tmpDir, null), /key path required/);
    });
  });
});
