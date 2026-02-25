/**
 * E2E Tests — MCP Tool Calls (State, Config, Roadmap)
 *
 * Actually invokes GSD tools through the MCP JSON-RPC protocol
 * and validates real responses from the server.
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { McpClient, createTestWorkspace, cleanupTestWorkspace } = require('./mcp-client.cjs');

describe('E2E: State Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_state_load returns project context', async () => {
    const result = await client.callTool('gsd_state_load');
    assert.ok(result, 'should return a result');
    assert.ok(result.config, 'should include config');
    assert.strictEqual(result.state_exists, true, 'state file should exist');
    assert.strictEqual(result.config_exists, true, 'config file should exist');
    assert.strictEqual(result.roadmap_exists, true, 'roadmap file should exist');
    assert.ok(result.state_raw.includes('E2E Test Milestone'), 'state should contain milestone name');
  });

  it('gsd_state_get retrieves a section', async () => {
    const result = await client.callTool('gsd_state_get', { section: 'milestone' });
    assert.ok(result !== undefined, 'should return something');
  });

  it('gsd_state_snapshot returns structured data', async () => {
    const result = await client.callTool('gsd_state_snapshot');
    assert.ok(result, 'should return snapshot');
  });

  it('gsd_state_update modifies a field', async () => {
    const result = await client.callTool('gsd_state_update', {
      field: 'status',
      value: 'paused',
    });
    assert.ok(result, 'should return result');

    // Verify the update was written
    const snapshot = await client.callTool('gsd_state_load');
    assert.ok(snapshot.state_raw.includes('paused'), 'state should now contain paused');
  });

  it('gsd_state_add_blocker adds a blocker', async () => {
    const result = await client.callTool('gsd_state_add_blocker', {
      text: 'E2E test blocker',
    });
    assert.ok(result, 'should return result');

    const state = await client.callTool('gsd_state_load');
    assert.ok(state.state_raw.includes('E2E test blocker'), 'blocker should be in state');
  });

  it('gsd_state_resolve_blocker resolves a blocker', async () => {
    const result = await client.callTool('gsd_state_resolve_blocker', {
      text: 'E2E test blocker',
    });
    assert.ok(result, 'should return result');
  });

  it('gsd_state_add_decision records a decision', async () => {
    const result = await client.callTool('gsd_state_add_decision', {
      summary: 'Use JSON-RPC for testing',
      rationale: 'Matches production protocol',
    });
    assert.ok(result, 'should return result');
  });
});

describe('E2E: Config Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_config_load returns config object', async () => {
    const result = await client.callTool('gsd_config_load');
    assert.ok(result, 'should return config');
    assert.strictEqual(result.model_profile, 'balanced');
    assert.strictEqual(typeof result.commit_docs, 'boolean');
    assert.strictEqual(typeof result.research, 'boolean');
    assert.strictEqual(typeof result.parallelization, 'boolean');
  });

  it('gsd_config_ensure creates config with defaults', async () => {
    const result = await client.callTool('gsd_config_ensure');
    assert.ok(result, 'should return result');
  });

  it('gsd_config_set updates a config value', async () => {
    await client.callTool('gsd_config_set', {
      key: 'model_profile',
      value: 'quality',
    });

    const config = await client.callTool('gsd_config_load');
    assert.strictEqual(config.model_profile, 'quality', 'profile should be updated');
  });
});

describe('E2E: Roadmap Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_roadmap_analyze returns roadmap structure', async () => {
    const result = await client.callTool('gsd_roadmap_analyze');
    assert.ok(result, 'should return analysis');
  });

  it('gsd_roadmap_get_phase returns phase details', async () => {
    const result = await client.callTool('gsd_roadmap_get_phase', { phase: '1' });
    assert.ok(result, 'should return phase details');
  });
});

describe('E2E: Command Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_generate_slug creates a slug', async () => {
    const result = await client.callTool('gsd_generate_slug', { text: 'Hello World Test' });
    assert.ok(result, 'should return result');
    // Result should contain a slug-like string
    const resultStr = JSON.stringify(result);
    assert.ok(resultStr.includes('hello') || resultStr.includes('Hello'), 'slug should derive from input');
  });

  it('gsd_current_timestamp returns a timestamp', async () => {
    const result = await client.callTool('gsd_current_timestamp', { format: 'full' });
    assert.ok(result, 'should return timestamp');
  });

  it('gsd_verify_path_exists checks paths', async () => {
    const result = await client.callTool('gsd_verify_path_exists', {
      target_path: '.planning/STATE.md',
    });
    assert.ok(result, 'should return result');
  });

  it('gsd_progress renders progress', async () => {
    const result = await client.callTool('gsd_progress', { format: 'json' });
    assert.ok(result, 'should return progress data');
  });
});

describe('E2E: Frontmatter Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_frontmatter_get reads a field', async () => {
    const result = await client.callTool('gsd_frontmatter_get', {
      file_path: '.planning/STATE.md',
      field: 'milestone',
    });
    assert.ok(result, 'should return frontmatter value');
  });

  it('gsd_frontmatter_set writes a field', async () => {
    await client.callTool('gsd_frontmatter_set', {
      file_path: '.planning/STATE.md',
      field: 'test_field',
      value: 'e2e_value',
    });

    const result = await client.callTool('gsd_frontmatter_get', {
      file_path: '.planning/STATE.md',
      field: 'test_field',
    });
    assert.ok(result, 'should return the set value');
  });

  it('gsd_frontmatter_validate checks document schema', async () => {
    const result = await client.callTool('gsd_frontmatter_validate', {
      file_path: '.planning/phases/01-setup/01-01-PLAN.md',
      doc_type: 'plan',
    });
    assert.ok(result, 'should return validation result');
  });
});

describe('E2E: Phase Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_find_phase locates a phase directory', async () => {
    const result = await client.callTool('gsd_find_phase', { phase: '1' });
    assert.ok(result, 'should return phase info');
  });

  it('gsd_phases_list returns all phases', async () => {
    const result = await client.callTool('gsd_phases_list', { type: 'all' });
    assert.ok(result, 'should return phase list');
  });

  it('gsd_phase_plan_index indexes plans in a phase', async () => {
    const result = await client.callTool('gsd_phase_plan_index', { phase: '1' });
    assert.ok(result, 'should return plan index');
  });
});

describe('E2E: Verify Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_validate_health checks workspace integrity', async () => {
    const result = await client.callTool('gsd_validate_health', {});
    assert.ok(result, 'should return health check');
  });

  it('gsd_validate_consistency checks phase numbering', async () => {
    const result = await client.callTool('gsd_validate_consistency', {});
    assert.ok(result, 'should return consistency check');
  });

  it('gsd_verify_plan_structure checks plan format', async () => {
    const result = await client.callTool('gsd_verify_plan_structure', {
      plan_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(result, 'should return structure check');
  });

  it('gsd_verify_references checks path references', async () => {
    const result = await client.callTool('gsd_verify_references', {
      file_path: '.planning/STATE.md',
    });
    assert.ok(result, 'should return reference check');
  });
});

describe('E2E: Template Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_template_select picks a template type', async () => {
    const result = await client.callTool('gsd_template_select', {
      plan_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(result, 'should return template selection');
  });

  it('gsd_template_fill creates a pre-filled document', async () => {
    const result = await client.callTool('gsd_template_fill', {
      template_type: 'summary',
      phase: '1',
      plan: '01',
    });
    assert.ok(result, 'should return filled template');
  });
});

describe('E2E: Init Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_init_execute_phase assembles execution context', async () => {
    const result = await client.callTool('gsd_init_execute_phase', { phase: '1' });
    assert.ok(result, 'should return execution context');
  });

  it('gsd_init_plan_phase assembles planning context', async () => {
    const result = await client.callTool('gsd_init_plan_phase', { phase: '1' });
    assert.ok(result, 'should return planning context');
  });

  it('gsd_init_quick assembles quick task context', async () => {
    const result = await client.callTool('gsd_init_quick', { description: 'Test quick task' });
    assert.ok(result, 'should return quick task context');
  });

  it('gsd_init_progress assembles progress context', async () => {
    const result = await client.callTool('gsd_init_progress');
    assert.ok(result, 'should return progress context');
  });

  it('gsd_init_resume assembles resume context', async () => {
    const result = await client.callTool('gsd_init_resume');
    assert.ok(result, 'should return resume context');
  });

  it('gsd_init_todos assembles todo context', async () => {
    const result = await client.callTool('gsd_init_todos');
    assert.ok(result, 'should return todo context');
  });

  it('gsd_init_new_project assembles new project context', async () => {
    const result = await client.callTool('gsd_init_new_project');
    assert.ok(result, 'should return new project context');
  });

  it('gsd_init_new_milestone assembles new milestone context', async () => {
    const result = await client.callTool('gsd_init_new_milestone');
    assert.ok(result, 'should return new milestone context');
  });

  it('gsd_init_map_codebase assembles codebase mapping context', async () => {
    const result = await client.callTool('gsd_init_map_codebase');
    assert.ok(result, 'should return codebase mapping context');
  });
});

describe('E2E: Milestone Tools', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
    await client.start();
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('gsd_milestone_stats returns statistics', async () => {
    const result = await client.callTool('gsd_milestone_stats');
    assert.ok(result, 'should return stats');
  });
});
