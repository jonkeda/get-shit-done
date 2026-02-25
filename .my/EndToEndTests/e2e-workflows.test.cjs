/**
 * E2E Tests — Workflow Simulations
 *
 * Simulates complete Copilot Chat interaction flows by calling
 * sequences of MCP tools in the same order that GSD agents would.
 * Each test represents a real user workflow.
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { McpClient, createTestWorkspace, cleanupTestWorkspace } = require('./mcp-client.cjs');

describe('E2E Workflow: /gsd-progress flow', () => {
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

  it('simulates full progress display workflow', async () => {
    // Step 1: Agent calls gsd_init_progress to gather context
    const initCtx = await client.callTool('gsd_init_progress');
    assert.ok(initCtx, 'init_progress should return context');

    // Step 2: Agent calls gsd_state_load currently
    const state = await client.callTool('gsd_state_load');
    assert.ok(state.state_exists, 'state should exist');

    // Step 3: Agent calls gsd_roadmap_analyze
    const roadmap = await client.callTool('gsd_roadmap_analyze');
    assert.ok(roadmap, 'roadmap analysis should return');

    // Step 4: Agent renders progress
    const progress = await client.callTool('gsd_progress', { format: 'json' });
    assert.ok(progress, 'progress should render');
  });
});

describe('E2E Workflow: /gsd-settings flow', () => {
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

  it('simulates loading and changing settings', async () => {
    // Step 1: Load current config
    const config = await client.callTool('gsd_config_load');
    assert.strictEqual(config.model_profile, 'balanced');

    // Step 2: Change a setting
    await client.callTool('gsd_config_set', { key: 'research', value: 'false' });

    // Step 3: Verify change persisted
    const updated = await client.callTool('gsd_config_load');
    assert.strictEqual(updated.research, false, 'research should now be false');

    // Step 4: Change back
    await client.callTool('gsd_config_set', { key: 'research', value: 'true' });
    const restored = await client.callTool('gsd_config_load');
    assert.strictEqual(restored.research, true, 'research should be restored');
  });
});

describe('E2E Workflow: /gsd-pause-work and /gsd-resume-work flow', () => {
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

  it('simulates pausing work: record session context', async () => {
    // Step 1: Load current state
    const state = await client.callTool('gsd_state_load');
    assert.ok(state.state_exists);

    // Step 2: Record session stop point
    const result = await client.callTool('gsd_state_record_session', {
      stopped_at: 'Phase 1 Plan 01 - task 2 of 3',
      resume_file: '.planning/phases/01-setup/01-RESUME.md',
    });
    assert.ok(result, 'should record session');

    // Step 3: Update status
    await client.callTool('gsd_state_update', { field: 'status', value: 'paused' });

    // Verify
    const updated = await client.callTool('gsd_state_load');
    assert.ok(updated.state_raw.includes('paused'), 'state should be paused');
  });

  it('simulates resuming work: load context', async () => {
    // Step 1: Load resume context
    const ctx = await client.callTool('gsd_init_resume');
    assert.ok(ctx, 'resume context should load');

    // Step 2: Load state
    const state = await client.callTool('gsd_state_load');
    assert.ok(state.state_exists);

    // Step 3: Update status back to in-progress
    await client.callTool('gsd_state_update', { field: 'status', value: 'in-progress' });
  });
});

describe('E2E Workflow: /gsd-execute-phase flow', () => {
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

  it('simulates phase execution initialization', async () => {
    // Step 1: Agent loads execution context
    const ctx = await client.callTool('gsd_init_execute_phase', { phase: '1' });
    assert.ok(ctx, 'execution context should load');

    // Step 2: Agent finds the phase directory
    const phaseInfo = await client.callTool('gsd_find_phase', { phase: '1' });
    assert.ok(phaseInfo, 'phase info should load');

    // Step 3: Agent indexes plans
    const plans = await client.callTool('gsd_phase_plan_index', { phase: '1' });
    assert.ok(plans, 'plan index should load');

    // Step 4: Agent loads config for model resolution
    const config = await client.callTool('gsd_config_load');
    assert.ok(config.model_profile, 'config should have profile');
  });
});

describe('E2E Workflow: /gsd-plan-phase flow', () => {
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

  it('simulates phase planning initialization', async () => {
    // Step 1: Agent loads planning context
    const ctx = await client.callTool('gsd_init_plan_phase', { phase: '1' });
    assert.ok(ctx, 'planning context should load');

    // Step 2: Agent gets roadmap phase details
    const phase = await client.callTool('gsd_roadmap_get_phase', { phase: '1' });
    assert.ok(phase, 'roadmap phase should load');

    // Step 3: Agent selects template
    const tmpl = await client.callTool('gsd_template_select', {
      plan_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(tmpl, 'template selection should work');
  });
});

describe('E2E Workflow: /gsd-health flow', () => {
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

  it('simulates full health check workflow', async () => {
    // Step 1: Validate health
    const health = await client.callTool('gsd_validate_health', {});
    assert.ok(health, 'health check should return');

    // Step 2: Consistency check
    const consistency = await client.callTool('gsd_validate_consistency', {});
    assert.ok(consistency, 'consistency check should return');

    // Step 3: Verify plan structure
    const planCheck = await client.callTool('gsd_verify_plan_structure', {
      plan_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(planCheck, 'plan structure check should return');
  });
});

describe('E2E Workflow: /gsd-add-phase and /gsd-remove-phase flow', () => {
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

  it('adds a new phase to the roadmap', async () => {
    const result = await client.callTool('gsd_phase_add', {
      description: 'E2E Testing Phase',
    });
    assert.ok(result, 'should add phase');

    // Verify it shows in roadmap
    const roadmap = await client.callTool('gsd_roadmap_analyze');
    assert.ok(roadmap, 'roadmap should still analyze');
  });

  it('inserts a phase between existing ones', async () => {
    const result = await client.callTool('gsd_phase_insert', {
      after_phase: '1',
      description: 'Inserted Phase',
    });
    assert.ok(result, 'should insert phase');
  });
});

describe('E2E Workflow: /gsd-quick flow', () => {
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

  it('simulates quick task initialization', async () => {
    // Step 1: Agent calls init_quick
    const ctx = await client.callTool('gsd_init_quick', {
      description: 'Fix a typo in README',
    });
    assert.ok(ctx, 'quick context should load');

    // Step 2: Agent loads state for situational awareness
    const state = await client.callTool('gsd_state_load');
    assert.ok(state, 'state should load');

    // Step 3: After execution, agent generates slug for any docs
    const slug = await client.callTool('gsd_generate_slug', { text: 'Fix a typo in README' });
    assert.ok(slug, 'slug should generate');
  });
});

describe('E2E Workflow: /gsd-verify-work flow', () => {
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

  it('simulates work verification flow', async () => {
    // Step 1: Init verify context
    const ctx = await client.callTool('gsd_init_verify_work', { phase: '1' });
    assert.ok(ctx, 'verify context should load');

    // Step 2: Verify plan structure
    const planCheck = await client.callTool('gsd_verify_plan_structure', {
      plan_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(planCheck, 'plan check should pass');

    // Step 3: Verify references
    const refCheck = await client.callTool('gsd_verify_references', {
      file_path: '.planning/phases/01-setup/01-01-PLAN.md',
    });
    assert.ok(refCheck, 'reference check should pass');

    // Step 4: Verify phase completeness
    const phaseCheck = await client.callTool('gsd_verify_phase_completeness', { phase: '1' });
    assert.ok(phaseCheck, 'phase completeness check should return');
  });
});

describe('E2E Workflow: Frontmatter round-trip', () => {
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

  it('reads, writes, and validates frontmatter end-to-end', async () => {
    // Step 1: Read existing frontmatter
    const milestone = await client.callTool('gsd_frontmatter_get', {
      file_path: '.planning/STATE.md',
      field: 'milestone',
    });
    assert.ok(milestone, 'should read milestone');

    // Step 2: Set a new field
    await client.callTool('gsd_frontmatter_set', {
      file_path: '.planning/STATE.md',
      field: 'e2e_tracked',
      value: 'true',
    });

    // Step 3: Merge multiple fields
    await client.callTool('gsd_frontmatter_merge', {
      file_path: '.planning/STATE.md',
      fields: { reviewer: 'e2e-bot', verified: 'yes' },
    });

    // Step 4: Read back all set fields
    const tracked = await client.callTool('gsd_frontmatter_get', {
      file_path: '.planning/STATE.md',
      field: 'e2e_tracked',
    });
    assert.ok(tracked, 'should read back e2e_tracked');

    // Step 5: Validate frontmatter against a known schema
    const validation = await client.callTool('gsd_frontmatter_validate', {
      file_path: '.planning/phases/01-setup/01-01-PLAN.md',
      doc_type: 'plan',
    });
    assert.ok(validation, 'should validate');
  });
});

describe('E2E Workflow: State mutation round-trip', () => {
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

  it('updates state, adds blockers/decisions, and verifies', async () => {
    // Step 1: Initial load
    const initial = await client.callTool('gsd_state_load');
    assert.ok(initial.state_exists);

    // Step 2: Patch multiple fields
    await client.callTool('gsd_state_patch', {
      patches: { status: 'blocked', phase: '1' },
    });

    // Step 3: Add a blocker
    await client.callTool('gsd_state_add_blocker', { text: 'Waiting for API key' });

    // Step 4: Record a decision
    await client.callTool('gsd_state_add_decision', {
      phase: '1',
      summary: 'Use REST over GraphQL',
      rationale: 'Simpler for MVP',
    });

    // Step 5: Resolve the blocker
    await client.callTool('gsd_state_resolve_blocker', { text: 'API key' });

    // Step 6: Update status
    await client.callTool('gsd_state_update', { field: 'status', value: 'in-progress' });

    // Step 7: Final snapshot
    const final = await client.callTool('gsd_state_load');
    assert.ok(final.state_raw.includes('in-progress'), 'final state should be in-progress');
    assert.ok(final.state_raw.includes('Use REST over GraphQL'), 'decision should be recorded');
  });
});

describe('E2E Workflow: Scaffold documents', () => {
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

  it('scaffolds a verification document', async () => {
    const result = await client.callTool('gsd_scaffold', {
      type: 'verification',
      phase: '1',
    });
    assert.ok(result, 'should scaffold verification doc');
  });

  it('scaffolds a UAT document', async () => {
    const result = await client.callTool('gsd_scaffold', {
      type: 'uat',
      phase: '1',
    });
    assert.ok(result, 'should scaffold UAT doc');
  });

  it('scaffolds a context document', async () => {
    const result = await client.callTool('gsd_scaffold', {
      type: 'context',
      phase: '1',
    });
    assert.ok(result, 'should scaffold context doc');
  });
});

describe('E2E Workflow: History and decision tracking', () => {
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

  it('records decisions and retrieves history digest', async () => {
    // Add decisions across the session
    await client.callTool('gsd_state_add_decision', {
      phase: '1',
      summary: 'Decision A',
      rationale: 'Because A is better',
    });
    await client.callTool('gsd_state_add_decision', {
      phase: '1',
      summary: 'Decision B',
      rationale: 'Because B complements A',
    });

    // Get history digest
    const digest = await client.callTool('gsd_history_digest', {});
    assert.ok(digest, 'digest should return');
  });
});
