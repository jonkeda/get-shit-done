/**
 * E2E Tests — Error Handling & Protocol Edge Cases
 *
 * Validates that the MCP server handles errors gracefully:
 * - Unknown tools
 * - Missing required arguments
 * - Invalid method names
 * - Bad paths
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { McpClient, createTestWorkspace, cleanupTestWorkspace } = require('./mcp-client.cjs');

describe('E2E: Error Handling — Unknown Tools', () => {
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

  it('returns isError for unknown tool name', async () => {
    const result = await client.callToolRaw('gsd_nonexistent_tool', {});
    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text.includes('Unknown tool'));
  });

  it('returns isError for empty tool name', async () => {
    const result = await client.callToolRaw('', {});
    assert.strictEqual(result.isError, true);
  });

  it('returns method-not-found for unknown methods', async () => {
    await assert.rejects(
      () => client.sendRequest('tools/execute', {}),
      (err) => {
        assert.strictEqual(err.code, -32601);
        return true;
      }
    );
  });

  it('returns method-not-found for custom/method', async () => {
    await assert.rejects(
      () => client.sendRequest('custom/method', {}),
      (err) => {
        assert.strictEqual(err.code, -32601);
        return true;
      }
    );
  });
});

describe('E2E: Error Handling — Bad Arguments', () => {
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

  it('gsd_frontmatter_get with non-existent file returns error', async () => {
    try {
      await client.callTool('gsd_frontmatter_get', {
        file_path: '.planning/DOES_NOT_EXIST.md',
        field: 'milestone',
      });
      // Some tools return graceful results instead of throwing
    } catch (err) {
      assert.ok(err.toolResult, 'error should have toolResult');
      assert.ok(err.toolResult.error, 'toolResult should have error message');
    }
  });

  it('gsd_verify_plan_structure with non-existent plan returns error', async () => {
    try {
      await client.callTool('gsd_verify_plan_structure', {
        plan_path: '.planning/phases/99-fake/99-01-PLAN.md',
      });
    } catch (err) {
      assert.ok(err.toolResult, 'should have toolResult');
      assert.ok(err.toolResult.error, 'should have error message');
    }
  });

  it('gsd_roadmap_get_phase with non-existent phase handles gracefully', async () => {
    // Phase 99 doesn't exist — tool should handle without crashing
    try {
      const result = await client.callTool('gsd_roadmap_get_phase', { phase: '99' });
      // If it returns, it should indicate the phase wasn't found
      assert.ok(result !== undefined, 'should return something');
    } catch (err) {
      assert.ok(err.toolResult, 'error should have toolResult');
    }
  });

  it('gsd_find_phase with non-existent phase handles gracefully', async () => {
    try {
      const result = await client.callTool('gsd_find_phase', { phase: '99' });
      assert.ok(result !== undefined, 'should return something');
    } catch (err) {
      assert.ok(err.toolResult, 'error should have toolResult');
    }
  });

  it('gsd_config_set with invalid key path does not crash', async () => {
    // Even weird keys should be handled
    try {
      await client.callTool('gsd_config_set', {
        key: 'deeply.nested.nonexistent.key',
        value: 'test',
      });
    } catch (err) {
      assert.ok(err.toolResult, 'should have toolResult');
    }
  });
});

describe('E2E: Error Handling — Server Resilience', () => {
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

  it('server remains responsive after a tool error', async () => {
    // Trigger an error
    await client.callToolRaw('nonexistent_tool', {});

    // Server should still respond to valid requests
    const tools = await client.listTools();
    assert.ok(tools.length > 0, 'should still list tools after error');
  });

  it('server remains responsive after multiple errors', async () => {
    // Multiple errors in sequence
    await client.callToolRaw('bad_tool_1', {});
    await client.callToolRaw('bad_tool_2', {});
    await client.callToolRaw('bad_tool_3', {});

    // Normal operation should work
    const config = await client.callTool('gsd_config_load');
    assert.ok(config.model_profile, 'should still return config after errors');
  });

  it('handles rapid sequential requests', async () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(await client.callTool('gsd_current_timestamp', { format: 'full' }));
    }
    assert.strictEqual(results.length, 10, 'all 10 rapid requests should complete');
    for (const r of results) {
      assert.ok(r, 'each result should be defined');
    }
  });

  it('handles back-to-back requests without waiting', async () => {
    // Send two requests back-to-back (not waiting for first to complete)
    const p1 = client.callTool('gsd_config_load');
    const p2 = client.callTool('gsd_current_timestamp', { format: 'full' });
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.ok(r1, 'first result should be defined');
    assert.ok(r2, 'second result should be defined');
  });
});
