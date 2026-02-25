/**
 * E2E Tests — MCP Server Lifecycle
 *
 * Tests that the MCP server starts, responds to initialize/initialized,
 * lists tools correctly, and shuts down cleanly.
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { McpClient, createTestWorkspace, cleanupTestWorkspace } = require('./mcp-client.cjs');

describe('E2E: Server Lifecycle', () => {
  let client;
  let workspace;

  before(async () => {
    workspace = createTestWorkspace();
    client = new McpClient(workspace);
  });

  after(async () => {
    await client.close();
    cleanupTestWorkspace(workspace);
  });

  it('starts and completes initialize handshake', async () => {
    const result = await client.start();
    assert.ok(result, 'initialize should return a result');
    assert.strictEqual(result.protocolVersion, '2024-11-05');
    assert.ok(result.serverInfo, 'should have serverInfo');
    assert.strictEqual(result.serverInfo.name, 'gsd-tools');
    assert.ok(result.serverInfo.version, 'should have version');
    assert.ok(result.capabilities, 'should have capabilities');
    assert.ok(result.capabilities.tools !== undefined, 'should declare tools capability');
  });

  it('reports workspace on stderr', () => {
    assert.ok(client.stderrOutput.includes('GSD MCP Server'), 'stderr should contain startup banner');
    assert.ok(client.stderrOutput.includes('workspace:'), 'stderr should mention workspace');
  });

  it('lists tools via tools/list', async () => {
    const tools = await client.listTools();
    assert.ok(Array.isArray(tools), 'tools should be an array');
    assert.ok(tools.length >= 60, `should have 60+ tools, got ${tools.length}`);

    // Each tool has required shape
    for (const tool of tools) {
      assert.ok(tool.name, 'tool must have name');
      assert.ok(tool.description, 'tool must have description');
      assert.ok(tool.inputSchema, 'tool must have inputSchema');
      assert.strictEqual(tool.inputSchema.type, 'object', 'inputSchema.type should be object');
    }
  });

  it('returns exactly 68 tools', async () => {
    const tools = await client.listTools();
    assert.strictEqual(tools.length, 68, `expected 68 tools, got ${tools.length}`);
  });

  it('all tool names start with gsd_', async () => {
    const tools = await client.listTools();
    const nonGsd = tools.filter(t => !t.name.startsWith('gsd_'));
    assert.strictEqual(nonGsd.length, 0, `tools without gsd_ prefix: ${nonGsd.map(t => t.name).join(', ')}`);
  });

  it('returns error for unknown method', async () => {
    await assert.rejects(
      () => client.sendRequest('nonexistent/method', {}),
      (err) => {
        assert.strictEqual(err.code, -32601, 'should be method-not-found');
        return true;
      }
    );
  });

  it('returns error for malformed tool call', async () => {
    const result = await client.callToolRaw('nonexistent_tool_xyz', {});
    assert.strictEqual(result.isError, true, 'should flag as error');
    const text = result.content[0].text;
    assert.ok(text.includes('Unknown tool'), `error should mention unknown tool, got: ${text}`);
  });
});
