/**
 * GSD Copilot Port Validation — MCP Server Integrity
 * Validates the MCP server has all expected tools, no stubs, and correct startup behavior.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MCP_SERVER = path.join(ROOT, '.gsd', 'tools', 'gsd-mcp-server.js');
const LIB_DIR = path.join(ROOT, '.gsd', 'tools', 'lib');

describe('MCP Server Integrity', () => {

  it('gsd-mcp-server.js exists and has valid syntax', () => {
    assert.ok(fs.existsSync(MCP_SERVER), 'gsd-mcp-server.js not found');
    // Syntax is validated by node --check in CI; here just verify it's non-empty
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    assert.ok(content.length > 1000, 'Server file appears too small');
  });

  it('has exactly 68 defineTool() calls', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    const matches = content.match(/defineTool\('/g) || [];
    assert.strictEqual(matches.length, 68, `Expected 68 tools, found ${matches.length}`);
  });

  it('has no placeholder or stub tools', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    // Match TODO/FIXME/STUB/HACK as standalone comment markers, not in tool names like gsd_todo_complete
    const stubs = [/\/[/*]\s*TODO\b/i, /\/[/*]\s*FIXME\b/i, /\bSTUB\b/, /\/[/*]\s*HACK\b/i, /not.?implemented/i];
    for (const pattern of stubs) {
      const match = content.match(pattern);
      assert.ok(!match, `Found stub marker: ${match ? match[0] : ''}`);
    }
  });

  it('does not call process.exit()', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    assert.ok(!content.includes('process.exit('), 'Server should not call process.exit()');
  });

  it('has process.cwd() fallback for workspace resolution', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    assert.ok(content.includes('process.cwd()'), 'Missing process.cwd() fallback');
  });

  it('checks for .planning/ directory on startup', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    assert.ok(content.includes('.planning'), 'Missing .planning/ check');
  });

  it('has fallback indicator in startup log', () => {
    const content = fs.readFileSync(MCP_SERVER, 'utf-8');
    assert.ok(content.includes('fallback: cwd'), 'Missing fallback indicator in startup log');
  });
});

describe('MCP Lib Modules', () => {
  const EXPECTED_MODULES = [
    'core.js', 'state.js', 'config.js', 'frontmatter.js', 'verify.js',
    'init.js', 'roadmap.js', 'phase.js', 'milestone.js', 'commands.js', 'template.js',
  ];

  it('all 11 lib modules exist', () => {
    for (const mod of EXPECTED_MODULES) {
      const modPath = path.join(LIB_DIR, mod);
      assert.ok(fs.existsSync(modPath), `Missing lib module: ${mod}`);
    }
  });

  it('no extra unexpected lib modules', () => {
    const actual = fs.readdirSync(LIB_DIR).filter(f => f.endsWith('.js'));
    const unexpected = actual.filter(f => !EXPECTED_MODULES.includes(f));
    assert.deepStrictEqual(unexpected, [], `Unexpected modules: ${unexpected.join(', ')}`);
  });

  it('lib modules have no stubs or TODOs', () => {
    for (const mod of EXPECTED_MODULES) {
      const content = fs.readFileSync(path.join(LIB_DIR, mod), 'utf-8');
      assert.ok(!/\bTODO\b/.test(content), `${mod} contains TODO`);
      assert.ok(!/\bFIXME\b/.test(content), `${mod} contains FIXME`);
      assert.ok(!/\bSTUB\b/.test(content), `${mod} contains STUB`);
    }
  });

  it('each lib module exports at least one function', () => {
    for (const mod of EXPECTED_MODULES) {
      const content = fs.readFileSync(path.join(LIB_DIR, mod), 'utf-8');
      assert.ok(content.includes('module.exports'), `${mod} has no module.exports`);
    }
  });
});
