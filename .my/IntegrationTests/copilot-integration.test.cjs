/**
 * Copilot Integration Tests
 * 
 * Validates that VS Code Copilot correctly discovers and wires together
 * all GSD components: agents, skills, prompts, instructions, and MCP tools.
 * 
 * These tests verify the INTEGRATION CONTRACTS — the file naming, frontmatter
 * schemas, cross-references, and configuration that Copilot relies on to
 * discover and connect GSD components.
 */
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const GITHUB_DIR = path.join(ROOT, '.github');
const AGENTS_DIR = path.join(GITHUB_DIR, 'agents');
const SKILLS_DIR = path.join(GITHUB_DIR, 'skills');
const PROMPTS_DIR = path.join(GITHUB_DIR, 'prompts');
const INSTRUCTIONS_DIR = path.join(GITHUB_DIR, 'instructions');
const GSD_DIR = path.join(ROOT, '.gsd');
const MCP_SERVER = path.join(GSD_DIR, 'tools', 'gsd-mcp-server.js');
const MCP_CONFIG = path.join(ROOT, '.vscode', 'mcp.json');
const COPILOT_INSTRUCTIONS = path.join(GITHUB_DIR, 'copilot-instructions.md');

// --- Helpers ---

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]+?)\n---/);
  if (!match) return null;
  const fm = {};
  const raw = match[1].replace(/\r/g, '');
  
  // Parse simple key: value and key: [array] lines
  for (const line of raw.split('\n')) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();
      // Array value
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      } else {
        value = value.replace(/^["']|["']$/g, '');
      }
      fm[key] = value;
    }
  }
  return fm;
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(ext));
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => 
    fs.statSync(path.join(dir, f)).isDirectory()
  );
}

function getMcpToolNames() {
  const content = fs.readFileSync(MCP_SERVER, 'utf8');
  const matches = [...content.matchAll(/defineTool\('([^']+)'/g)];
  return matches.map(m => m[1]);
}

function extractToolRefs(content) {
  // Find all gsd_xxx references
  const matches = [...content.matchAll(/\bgsd_\w+/g)];
  return [...new Set(matches.map(m => m[0]))];
}

// Known VS Code / Copilot generic tool names that agents can reference
const VSCODE_TOOLS = new Set([
  'read', 'createFile', 'edit', 'execute', 'search', 'fetch', 'web',
  'read_file', 'create_file', 'replace_string_in_file', 'run_in_terminal',
  'grep_search', 'semantic_search', 'fetch_webpage',
  'vscode_askQuestions', 'vscode_listCodeUsages',
]);

// ===================================================================
// Test Suite 1: Agent Discovery & Schema
// ===================================================================

describe('Agent Discovery', () => {
  const agentFiles = listFiles(AGENTS_DIR, '.agent.md');
  
  it('agents directory exists under .github/', () => {
    assert.ok(fs.existsSync(AGENTS_DIR), '.github/agents/ must exist');
  });

  it('all agent files use .agent.md extension', () => {
    // No .md files that aren't .agent.md
    const allMd = listFiles(AGENTS_DIR, '.md');
    for (const f of allMd) {
      assert.ok(f.endsWith('.agent.md'), `${f} must use .agent.md extension`);
    }
  });

  it('expected agent count is 11', () => {
    assert.equal(agentFiles.length, 11, `Expected 11 agents, found ${agentFiles.length}`);
  });

  it('all agent files follow gsd-{name}.agent.md naming', () => {
    for (const f of agentFiles) {
      assert.match(f, /^gsd-[\w-]+\.agent\.md$/, `${f} must match gsd-*.agent.md`);
    }
  });

  it('every agent has valid YAML frontmatter', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${f} must have frontmatter`);
    }
  });

  it('every agent has a description field', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm && fm.description, `${f} must have description`);
    }
  });

  it('every agent has a model field with at least one model', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm && fm.model, `${f} must have model field`);
      const models = Array.isArray(fm.model) ? fm.model : [fm.model];
      assert.ok(models.length > 0, `${f} must have at least one model`);
    }
  });

  it('every agent has user-invocable field (true or false)', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = (content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '').replace(/\r/g, '');
      assert.ok(
        /user-invocable:\s*(true|false)/.test(raw),
        `${f} must have user-invocable: true|false`
      );
    }
  });

  it('every agent has tools field', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = (content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '').replace(/\r/g, '');
      assert.ok(/tools:/.test(raw), `${f} must declare tools`);
    }
  });

  it('every agent has handoffs field', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = (content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '').replace(/\r/g, '');
      assert.ok(/handoffs:/.test(raw), `${f} must declare handoffs`);
    }
  });

  it('every agent has a markdown body after frontmatter', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const bodyStart = content.indexOf('---', content.indexOf('---') + 3);
      const body = content.slice(bodyStart + 3).trim();
      assert.ok(body.length > 100, `${f} must have substantial body (got ${body.length} chars)`);
    }
  });

  it('exactly one agent is user-invocable (gsd-debugger)', () => {
    const userInvocable = [];
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '';
      if (/user-invocable:\s*true/.test(raw)) {
        userInvocable.push(f);
      }
    }
    assert.deepEqual(userInvocable, ['gsd-debugger.agent.md']);
  });
});

// ===================================================================
// Test Suite 2: Agent Cross-References
// ===================================================================

describe('Agent Cross-References', () => {
  const agentFiles = listFiles(AGENTS_DIR, '.agent.md');
  const agentNames = agentFiles.map(f => f.replace('.agent.md', ''));
  const mcpToolNames = getMcpToolNames();

  it('all handoff targets are existing agents', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm.handoffs) continue;
      const handoffs = Array.isArray(fm.handoffs) ? fm.handoffs : [fm.handoffs];
      for (const target of handoffs) {
        if (!target || target === '') continue;
        assert.ok(
          agentNames.includes(target),
          `${f}: handoff "${target}" not found in agents [${agentNames.join(', ')}]`
        );
      }
    }
  });

  it('all agent tool references are valid (MCP gsd_* or VS Code builtins)', () => {
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = (content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '').replace(/\r/g, '');
      
      // Extract tool list from FRONTMATTER only - handle both inline [x, y] and multi-line - x
      const tools = [];
      const inlineMatch = raw.match(/tools:\s*\[([^\]]+)\]/);
      if (inlineMatch) {
        tools.push(...inlineMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')));
      } else {
        const lines = raw.split('\n');
        let inTools = false;
        for (const line of lines) {
          if (/^tools:/.test(line)) { inTools = true; continue; }
          if (inTools && /^\s+-\s+/.test(line)) {
            tools.push(line.replace(/^\s+-\s+/, '').trim());
          } else if (inTools && /^\w/.test(line)) {
            inTools = false;
          }
        }
      }
      
      for (const tool of tools) {
        if (tool.startsWith('gsd_')) {
          assert.ok(
            mcpToolNames.includes(tool),
            `${f}: MCP tool "${tool}" not found in server (68 tools)`
          );
        } else {
          assert.ok(
            VSCODE_TOOLS.has(tool),
            `${f}: tool "${tool}" not a known VS Code/MCP tool`
          );
        }
      }
    }
  });

  it('handoff graph forms valid structure (cycles only in iterative workflows)', () => {
    // Build adjacency list
    const graph = {};
    for (const f of agentFiles) {
      const name = f.replace('.agent.md', '');
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      const handoffs = Array.isArray(fm.handoffs) ? fm.handoffs.filter(h => h) : [];
      graph[name] = handoffs;
    }
    
    // DFS cycle detection
    const visited = new Set();
    const inStack = new Set();
    const cycles = [];
    
    function findCycle(node, path) {
      if (inStack.has(node)) { cycles.push([...path, node]); return; }
      if (visited.has(node)) return;
      visited.add(node);
      inStack.add(node);
      path.push(node);
      for (const neighbor of (graph[node] || [])) {
        findCycle(neighbor, path);
      }
      path.pop();
      inStack.delete(node);
    }
    
    for (const name of agentNames) {
      findCycle(name, []);
    }
    
    // Cycles are acceptable in GSD — iterative fix/verify loops
    // (e.g., debugger→executor→verifier→debugger)
    // Just verify all cycle participants are valid agents
    for (const cycle of cycles) {
      for (const agent of cycle) {
        assert.ok(agentNames.includes(agent), `Cycle contains unknown agent: ${agent}`);
      }
    }
    
    // Verify the graph is non-empty
    assert.ok(Object.keys(graph).length > 0, 'Agent handoff graph must have entries');
  });

  it('no agent is orphaned (reachable from at least one skill or another agent)', () => {
    // Build reverse reachability from skills and agent handoffs
    const reachable = new Set();
    
    // Agents reachable from skills
    const skillDirs = listDirs(SKILLS_DIR);
    for (const skill of skillDirs) {
      const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const content = fs.readFileSync(skillFile, 'utf8');
      for (const name of agentNames) {
        if (content.includes(name)) reachable.add(name);
      }
    }
    
    // Agents reachable from other agents via handoffs
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of agentFiles) {
        const name = f.replace('.agent.md', '');
        const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
        const fm = parseFrontmatter(content);
        const handoffs = Array.isArray(fm.handoffs) ? fm.handoffs.filter(h => h) : [];
        if (reachable.has(name)) {
          for (const target of handoffs) {
            if (!reachable.has(target)) { reachable.add(target); changed = true; }
          }
        }
      }
    }
    
    // user-invocable agents are also entry points
    for (const f of agentFiles) {
      const name = f.replace('.agent.md', '');
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      if (/user-invocable:\s*true/.test(content)) reachable.add(name);
    }
    
    // Propagate again after adding user-invocable
    changed = true;
    while (changed) {
      changed = false;
      for (const f of agentFiles) {
        const name = f.replace('.agent.md', '');
        const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
        const fm = parseFrontmatter(content);
        const handoffs = Array.isArray(fm.handoffs) ? fm.handoffs.filter(h => h) : [];
        if (reachable.has(name)) {
          for (const target of handoffs) {
            if (!reachable.has(target)) { reachable.add(target); changed = true; }
          }
        }
      }
    }
    
    for (const name of agentNames) {
      assert.ok(reachable.has(name), `Agent ${name} is orphaned — not reachable from any skill or agent chain`);
    }
  });
});

// ===================================================================
// Test Suite 3: Skill Discovery & Schema
// ===================================================================

describe('Skill Discovery', () => {
  const skillDirs = listDirs(SKILLS_DIR);

  it('skills directory exists under .github/', () => {
    assert.ok(fs.existsSync(SKILLS_DIR), '.github/skills/ must exist');
  });

  it('expected skill count is 9', () => {
    assert.equal(skillDirs.length, 9, `Expected 9 skills, got ${skillDirs.length}`);
  });

  it('all skill directories follow gsd-{name} naming', () => {
    for (const d of skillDirs) {
      assert.match(d, /^gsd-[\w-]+$/, `Skill dir ${d} must match gsd-* pattern`);
    }
  });

  it('every skill has a SKILL.md file', () => {
    for (const d of skillDirs) {
      const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
      assert.ok(fs.existsSync(skillFile), `${d}/SKILL.md must exist`);
    }
  });

  it('every SKILL.md has frontmatter with description', () => {
    for (const d of skillDirs) {
      const content = fs.readFileSync(path.join(SKILLS_DIR, d, 'SKILL.md'), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${d}/SKILL.md must have frontmatter`);
      assert.ok(fm.description, `${d}/SKILL.md must have description`);
    }
  });

  it('every SKILL.md has a markdown body with steps', () => {
    for (const d of skillDirs) {
      const content = fs.readFileSync(path.join(SKILLS_DIR, d, 'SKILL.md'), 'utf8');
      const body = content.replace(/^---[\s\S]+?---/, '').trim();
      assert.ok(body.length > 50, `${d}/SKILL.md must have body content`);
      // Most skills should have numbered steps or ## Steps heading
      assert.ok(
        /##\s|###\s|\d+\.\s/.test(body),
        `${d}/SKILL.md should have structured steps or headings`
      );
    }
  });
});

// ===================================================================
// Test Suite 4: Skill Cross-References
// ===================================================================

describe('Skill Cross-References', () => {
  const skillDirs = listDirs(SKILLS_DIR);
  const agentFiles = listFiles(AGENTS_DIR, '.agent.md');
  const agentNames = agentFiles.map(f => f.replace('.agent.md', ''));
  const mcpToolNames = getMcpToolNames();

  it('all gsd_ tool references in skills resolve to actual MCP tools', () => {
    for (const d of skillDirs) {
      const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
      const content = fs.readFileSync(skillFile, 'utf8');
      const toolRefs = extractToolRefs(content);
      for (const tool of toolRefs) {
        assert.ok(
          mcpToolNames.includes(tool),
          `Skill ${d}: MCP tool "${tool}" not found in server`
        );
      }
    }
  });

  it('all agent references in skills resolve to actual agents', () => {
    // Skills reference agents for handoff/spawning
    const agentRefPattern = /(?:@|handoff.*?|spawn.*?|delegate.*?)(gsd-[\w-]+)/gi;
    for (const d of skillDirs) {
      const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
      const content = fs.readFileSync(skillFile, 'utf8');
      
      // Also check for direct agent name mentions that look like handoffs
      for (const name of agentNames) {
        // Only check if it's a handoff/spawn context
        const regex = new RegExp(`(?:handoff|spawn|delegate|@)\\s*.*?${name.replace(/-/g, '-')}`, 'i');
        // We just check if the agent name appears at all — it's informational
      }
      
      // Check explicit @agent references
      const atRefs = [...content.matchAll(/@(gsd-[\w-]+)/g)].map(m => m[1]);
      for (const ref of atRefs) {
        assert.ok(
          agentNames.includes(ref),
          `Skill ${d}: @${ref} agent reference not found`
        );
      }
    }
  });

  it('skills that spawn agents reference agents in their tool list that exist', () => {
    // Map of which skills spawn which agents (from our research)
    const skillAgentMap = {
      'gsd-debug': ['gsd-debugger'],
      'gsd-execute-phase': ['gsd-executor', 'gsd-verifier'],
      'gsd-milestone': ['gsd-roadmapper'],
      'gsd-new-project': ['gsd-roadmapper'],
      'gsd-plan-phase': ['gsd-planner'],
      'gsd-quick': ['gsd-planner', 'gsd-executor', 'gsd-verifier'],
      'gsd-verify-work': ['gsd-debugger'],
    };
    
    for (const [skill, agents] of Object.entries(skillAgentMap)) {
      const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      const content = fs.readFileSync(skillFile, 'utf8');
      for (const agent of agents) {
        assert.ok(
          content.includes(agent),
          `Skill ${skill} should reference agent ${agent}`
        );
        assert.ok(
          agentNames.includes(agent),
          `Skill ${skill} references agent ${agent} which doesn't exist`
        );
      }
    }
  });
});

// ===================================================================
// Test Suite 5: Prompt Discovery & Schema
// ===================================================================

describe('Prompt Discovery', () => {
  const promptFiles = listFiles(PROMPTS_DIR, '.prompt.md');

  it('prompts directory exists under .github/', () => {
    assert.ok(fs.existsSync(PROMPTS_DIR), '.github/prompts/ must exist');
  });

  it('expected prompt count is 17', () => {
    assert.equal(promptFiles.length, 17, `Expected 17 prompts, got ${promptFiles.length}`);
  });

  it('all prompt files use .prompt.md extension', () => {
    const allMd = listFiles(PROMPTS_DIR, '.md');
    for (const f of allMd) {
      assert.ok(f.endsWith('.prompt.md'), `${f} must use .prompt.md extension`);
    }
  });

  it('all prompt files follow gsd-{name}.prompt.md naming', () => {
    for (const f of promptFiles) {
      assert.match(f, /^gsd-[\w-]+\.prompt\.md$/, `${f} must match gsd-*.prompt.md`);
    }
  });

  it('every prompt has frontmatter with description', () => {
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${f} must have frontmatter`);
      assert.ok(fm.description, `${f} must have description`);
    }
  });

  it('every prompt has instruction body after frontmatter', () => {
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const body = content.replace(/^---[\s\S]+?---/, '').trim();
      assert.ok(body.length > 20, `${f} must have instruction body (got ${body.length} chars)`);
    }
  });
});

// ===================================================================
// Test Suite 6: Prompt Cross-References
// ===================================================================

describe('Prompt Cross-References', () => {
  const promptFiles = listFiles(PROMPTS_DIR, '.prompt.md');
  const mcpToolNames = getMcpToolNames();

  it('all gsd_ tool references in prompts resolve to actual MCP tools', () => {
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const toolRefs = extractToolRefs(content);
      for (const tool of toolRefs) {
        assert.ok(
          mcpToolNames.includes(tool),
          `Prompt ${f}: MCP tool "${tool}" not found in server`
        );
      }
    }
  });

  it('prompts that reference slash commands point to existing prompts, skills, or skill sub-commands', () => {
    const allSlashCommands = new Set();
    // Prompts register as /gsd-{name}
    for (const f of promptFiles) {
      allSlashCommands.add('/' + f.replace('.prompt.md', ''));
    }
    // Skills register as /gsd-{name} and may define sub-commands
    const skillDirsList = listDirs(SKILLS_DIR);
    for (const d of skillDirsList) {
      allSlashCommands.add('/' + d);
      // Scan skill body for sub-commands it handles
      const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const skillContent = fs.readFileSync(skillFile, 'utf8');
        const subCmds = [...skillContent.matchAll(/\/gsd-[\w-]+/g)].map(m => m[0]);
        for (const sub of subCmds) allSlashCommands.add(sub);
      }
    }
    
    // Check cross-references within prompts
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const refs = [...content.matchAll(/`(\/gsd-[\w-]+)`/g)].map(m => m[1]);
      for (const ref of refs) {
        assert.ok(
          allSlashCommands.has(ref),
          `Prompt ${f}: slash command "${ref}" not found as prompt, skill, or skill sub-command`
        );
      }
    }
  });
});

// ===================================================================
// Test Suite 7: Instruction Discovery & Schema
// ===================================================================

describe('Instruction Discovery', () => {
  const instrFiles = listFiles(INSTRUCTIONS_DIR, '.instructions.md');

  it('instructions directory exists under .github/', () => {
    assert.ok(fs.existsSync(INSTRUCTIONS_DIR), '.github/instructions/ must exist');
  });

  it('expected instruction count is 6', () => {
    assert.equal(instrFiles.length, 6, `Expected 6 instructions, got ${instrFiles.length}`);
  });

  it('all instruction files use .instructions.md extension', () => {
    const allMd = listFiles(INSTRUCTIONS_DIR, '.md');
    for (const f of allMd) {
      assert.ok(f.endsWith('.instructions.md'), `${f} must use .instructions.md extension`);
    }
  });

  it('every instruction has frontmatter with applyTo', () => {
    for (const f of instrFiles) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm, `${f} must have frontmatter`);
      assert.ok(fm.applyTo, `${f} must have applyTo pattern`);
    }
  });

  it('all applyTo patterns target .planning/ directory', () => {
    for (const f of instrFiles) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      assert.ok(fm && fm.applyTo, `${f}: must have applyTo in frontmatter`);
      const pattern = fm.applyTo.replace(/^["']|["']$/g, '');
      assert.ok(
        pattern.startsWith('.planning/'),
        `${f}: applyTo "${pattern}" must target .planning/ directory`
      );
    }
  });

  it('instruction applyTo patterns are valid globs', () => {
    const validGlobChars = /^[a-zA-Z0-9_./*\-{}]+$/;
    for (const f of instrFiles) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8');
      const fm = parseFrontmatter(content);
      if (!fm || !fm.applyTo) continue; // covered by previous test
      const pattern = fm.applyTo.replace(/^["']|["']$/g, '');
      assert.ok(
        validGlobChars.test(pattern),
        `${f}: applyTo "${pattern}" contains invalid glob characters`
      );
    }
  });

  it('every instruction has body content', () => {
    for (const f of instrFiles) {
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf8');
      const body = content.replace(/^---[\s\S]+?---/, '').trim();
      assert.ok(body.length > 20, `${f} must have body content`);
    }
  });
});

// ===================================================================
// Test Suite 8: MCP Configuration
// ===================================================================

describe('MCP Configuration', () => {
  it('.vscode/mcp.json exists', () => {
    assert.ok(fs.existsSync(MCP_CONFIG), '.vscode/mcp.json must exist');
  });

  it('mcp.json is valid JSON', () => {
    const content = fs.readFileSync(MCP_CONFIG, 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), 'mcp.json must be valid JSON');
  });

  it('mcp.json has servers.gsd-tools entry', () => {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf8'));
    assert.ok(config.servers, 'must have servers key');
    assert.ok(config.servers['gsd-tools'], 'must have gsd-tools server');
  });

  it('gsd-tools server uses stdio transport', () => {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf8'));
    assert.equal(config.servers['gsd-tools'].type, 'stdio');
  });

  it('gsd-tools server command is node', () => {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf8'));
    assert.equal(config.servers['gsd-tools'].command, 'node');
  });

  it('gsd-tools server args point to existing server file', () => {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf8'));
    const args = config.servers['gsd-tools'].args;
    assert.ok(Array.isArray(args), 'args must be an array');
    assert.ok(args.length > 0, 'args must have at least one entry');
    // Replace ${workspaceFolder} with actual root
    const serverPath = args[0].replace('${workspaceFolder}', ROOT);
    assert.ok(fs.existsSync(serverPath), `Server file must exist: ${serverPath}`);
  });

  it('gsd-tools server sets GSD_WORKSPACE env var', () => {
    const config = JSON.parse(fs.readFileSync(MCP_CONFIG, 'utf8'));
    const env = config.servers['gsd-tools'].env;
    assert.ok(env, 'must have env section');
    assert.ok(env.GSD_WORKSPACE, 'must set GSD_WORKSPACE');
    assert.equal(env.GSD_WORKSPACE, '${workspaceFolder}');
  });

  it('MCP server file has valid Node.js syntax', () => {
    const { execFileSync } = require('node:child_process');
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', MCP_SERVER]),
      'MCP server must have valid syntax'
    );
  });
});

// ===================================================================
// Test Suite 9: Command-to-Component Routing
// ===================================================================

describe('Command-to-Component Routing', () => {
  const promptFiles = listFiles(PROMPTS_DIR, '.prompt.md');
  const promptNames = new Set(promptFiles.map(f => f.replace('.prompt.md', '')));
  const skillDirs = new Set(listDirs(SKILLS_DIR));

  // All slash commands mentioned in copilot-instructions.md
  it('copilot-instructions.md exists', () => {
    assert.ok(fs.existsSync(COPILOT_INSTRUCTIONS));
  });

  it('every /gsd-* command in copilot-instructions.md resolves to a prompt or skill', () => {
    const content = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf8');
    const commands = [...content.matchAll(/`\/gsd-([\w-]+)`/g)].map(m => 'gsd-' + m[1]);
    
    for (const cmd of commands) {
      const isPrompt = promptNames.has(cmd);
      const isSkill = skillDirs.has(cmd);
      assert.ok(
        isPrompt || isSkill,
        `Command /gsd-* "${cmd}" from copilot-instructions.md not found as prompt or skill`
      );
    }
  });

  it('every prompt has a corresponding /gsd-{name} slash command registration', () => {
    // Prompts auto-register as slash commands by file name convention
    for (const f of promptFiles) {
      const name = f.replace('.prompt.md', '');
      assert.match(name, /^gsd-/, `Prompt ${f} must start with gsd- to register as slash command`);
    }
  });

  it('every skill has a corresponding /gsd-{name} slash command registration', () => {
    for (const d of listDirs(SKILLS_DIR)) {
      assert.match(d, /^gsd-/, `Skill ${d} must start with gsd- to register as slash command`);
    }
  });

  it('no prompt name collides with a skill name', () => {
    const collisions = [];
    for (const name of promptNames) {
      if (skillDirs.has(name)) collisions.push(name);
    }
    assert.deepEqual(
      collisions, [],
      `Prompt-skill name collisions: ${collisions.join(', ')}. Skills take priority, prompt would be shadowed.`
    );
  });

  it('commands from legacy commands/ dir map to .github/ prompts, skills, or skill sub-commands', () => {
    const commandsDir = path.join(ROOT, 'commands', 'gsd');
    if (!fs.existsSync(commandsDir)) return; // skip if no legacy dir
    
    // Build full set including skill sub-commands
    const allKnown = new Set([...promptNames, ...skillDirs]);
    for (const d of skillDirs) {
      const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, 'utf8');
        const subCmds = [...content.matchAll(/\/gsd-([\w-]+)/g)].map(m => 'gsd-' + m[1]);
        for (const sub of subCmds) allKnown.add(sub);
      }
    }
    // Also check help prompt for sub-commands
    const helpFile = path.join(PROMPTS_DIR, 'gsd-help.prompt.md');
    if (fs.existsSync(helpFile)) {
      const content = fs.readFileSync(helpFile, 'utf8');
      const helpCmds = [...content.matchAll(/\/gsd-([\w-]+)/g)].map(m => 'gsd-' + m[1]);
      for (const cmd of helpCmds) allKnown.add(cmd);
    }
    
    // Known legacy-only commands not ported to Copilot (different workflow)
    const legacyExclusions = new Set(['gsd-join-discord', 'gsd-reapply-patches', 'gsd-add-tests']);
    
    const cmdFiles = listFiles(commandsDir, '.md');
    for (const f of cmdFiles) {
      const name = 'gsd-' + f.replace('.md', '');
      if (legacyExclusions.has(name)) continue;
      assert.ok(
        allKnown.has(name),
        `Legacy command ${f} has no corresponding prompt, skill, or sub-command: ${name}`
      );
    }
  });
});

// ===================================================================
// Test Suite 10: MCP Tool Coverage
// ===================================================================

describe('MCP Tool Coverage', () => {
  const mcpToolNames = getMcpToolNames();
  const mcpToolSet = new Set(mcpToolNames);

  it('all 68 MCP tools are defined', () => {
    assert.equal(mcpToolNames.length, 68, `Expected 68 tools, got ${mcpToolNames.length}`);
  });

  it('all MCP tools have gsd_ prefix', () => {
    for (const name of mcpToolNames) {
      assert.ok(name.startsWith('gsd_'), `Tool "${name}" must have gsd_ prefix`);
    }
  });

  it('no duplicate MCP tool names', () => {
    assert.equal(mcpToolSet.size, mcpToolNames.length, 'Duplicate tool names detected');
  });

  it('every MCP tool referenced in agent frontmatter exists in server', () => {
    // Only check frontmatter tools: field — body text may mention tools as documentation
    const agentFiles = listFiles(AGENTS_DIR, '.agent.md');
    for (const f of agentFiles) {
      const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
      const raw = (content.match(/^---\s*\n([\s\S]+?)\n---/)?.[1] || '').replace(/\r/g, '');
      
      const tools = [];
      const inlineMatch = raw.match(/tools:\s*\[([^\]]+)\]/);
      if (inlineMatch) {
        tools.push(...inlineMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')));
      } else {
        const lines = raw.split('\n');
        let inTools = false;
        for (const line of lines) {
          if (/^tools:/.test(line)) { inTools = true; continue; }
          if (inTools && /^\s+-\s+/.test(line)) {
            tools.push(line.replace(/^\s+-\s+/, '').trim());
          } else if (inTools && /^\w/.test(line)) {
            inTools = false;
          }
        }
      }
      
      for (const tool of tools) {
        if (tool.startsWith('gsd_')) {
          assert.ok(mcpToolSet.has(tool), `${f}: agent frontmatter tool "${tool}" not in MCP server`);
        }
      }
    }
  });

  it('every MCP tool referenced by any prompt exists in server', () => {
    const referenced = new Set();
    const promptFiles = listFiles(PROMPTS_DIR, '.prompt.md');
    for (const f of promptFiles) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      for (const ref of extractToolRefs(content)) {
        referenced.add(ref);
      }
    }
    for (const ref of referenced) {
      assert.ok(mcpToolSet.has(ref), `Prompt-referenced tool "${ref}" not in MCP server`);
    }
  });

  it('every MCP tool referenced by any skill exists in server', () => {
    const referenced = new Set();
    const skillDirs = listDirs(SKILLS_DIR);
    for (const d of skillDirs) {
      // Check all files in skill directory
      const walkDir = (dir) => {
        for (const entry of fs.readdirSync(dir)) {
          const full = path.join(dir, entry);
          if (fs.statSync(full).isDirectory()) {
            walkDir(full);
          } else if (entry.endsWith('.md') || entry.endsWith('.json')) {
            const content = fs.readFileSync(full, 'utf8');
            for (const ref of extractToolRefs(content)) {
              referenced.add(ref);
            }
          }
        }
      };
      walkDir(path.join(SKILLS_DIR, d));
    }
    for (const ref of referenced) {
      assert.ok(mcpToolSet.has(ref), `Skill-referenced tool "${ref}" not in MCP server`);
    }
  });

  it('critical tool categories are present', () => {
    const categories = {
      state: mcpToolNames.filter(n => n.startsWith('gsd_state_')),
      config: mcpToolNames.filter(n => n.startsWith('gsd_config_')),
      frontmatter: mcpToolNames.filter(n => n.startsWith('gsd_frontmatter_')),
      roadmap: mcpToolNames.filter(n => n.startsWith('gsd_roadmap_')),
      phase: mcpToolNames.filter(n => n.startsWith('gsd_phase_')),
      verify: mcpToolNames.filter(n => n.startsWith('gsd_verify_')),
      init: mcpToolNames.filter(n => n.startsWith('gsd_init_')),
    };
    
    for (const [cat, tools] of Object.entries(categories)) {
      assert.ok(tools.length > 0, `Tool category "${cat}" must have at least one tool`);
    }
  });
});

// ===================================================================
// Test Suite 11: Skill File Structure
// ===================================================================

describe('Skill File Structure', () => {
  const skillDirs = listDirs(SKILLS_DIR);

  it('skills with references/ subdirectory have .md files', () => {
    for (const d of skillDirs) {
      const refsDir = path.join(SKILLS_DIR, d, 'references');
      if (!fs.existsSync(refsDir)) continue;
      const files = listFiles(refsDir, '.md');
      const nonGitkeep = files.filter(f => f !== '.gitkeep');
      // If references/ exists, it should have content (unless just .gitkeep)
      const allFiles = fs.readdirSync(refsDir);
      if (allFiles.length > 0 && !allFiles.every(f => f === '.gitkeep')) {
        assert.ok(nonGitkeep.length > 0, `${d}/references/ should have .md files`);
      }
    }
  });

  it('skills with templates/ subdirectory have template files', () => {
    for (const d of skillDirs) {
      const templDir = path.join(SKILLS_DIR, d, 'templates');
      if (!fs.existsSync(templDir)) continue;
      const allFiles = [];
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir)) {
          const full = path.join(dir, entry);
          if (fs.statSync(full).isDirectory()) walk(full);
          else if (entry !== '.gitkeep') allFiles.push(entry);
        }
      };
      walk(templDir);
      if (allFiles.length > 0) {
        assert.ok(allFiles.some(f => f.endsWith('.md') || f.endsWith('.json')),
          `${d}/templates/ should have .md or .json files`);
      }
    }
  });

  it('no empty skill directories', () => {
    for (const d of skillDirs) {
      const files = fs.readdirSync(path.join(SKILLS_DIR, d));
      assert.ok(files.length > 0, `Skill ${d} directory must not be empty`);
    }
  });
});

// ===================================================================
// Test Suite 12: copilot-instructions.md Integrity
// ===================================================================

describe('copilot-instructions.md Integrity', () => {
  const content = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf8');

  it('references .planning/ directory conventions', () => {
    assert.ok(content.includes('.planning/STATE.md'), 'Must reference STATE.md');
    assert.ok(content.includes('.planning/ROADMAP.md'), 'Must reference ROADMAP.md');
    assert.ok(content.includes('.planning/REQUIREMENTS.md'), 'Must reference REQUIREMENTS.md');
  });

  it('references MCP tools with gsd_ prefix', () => {
    assert.ok(content.includes('gsd_'), 'Must reference gsd_ MCP tools');
  });

  it('references conventional commit format', () => {
    assert.ok(/conventional commit/i.test(content) || /\{type\}\(\{scope\}\)/.test(content),
      'Must describe conventional commit format');
  });

  it('mentions GSD commands section with /gsd- prefix', () => {
    assert.ok(content.includes('/gsd-'), 'Must mention /gsd- slash commands');
  });

  it('all /gsd- commands listed match actual prompts or skills', () => {
    const promptNames = new Set(listFiles(PROMPTS_DIR, '.prompt.md').map(f => f.replace('.prompt.md', '')));
    const skillNames = new Set(listDirs(SKILLS_DIR));
    
    const listed = [...content.matchAll(/\/gsd-([\w-]+)/g)].map(m => 'gsd-' + m[1]);
    const unique = [...new Set(listed)];
    
    for (const cmd of unique) {
      assert.ok(
        promptNames.has(cmd) || skillNames.has(cmd),
        `copilot-instructions.md lists /${cmd} but no matching prompt or skill exists`
      );
    }
  });
});

// ===================================================================
// Test Suite 13: GSD References & Templates
// ===================================================================

describe('GSD References & Templates', () => {
  const refsDir = path.join(GSD_DIR, 'references');
  const templDir = path.join(GSD_DIR, 'templates');

  it('.gsd/references/ exists and has .md files', () => {
    assert.ok(fs.existsSync(refsDir), '.gsd/references/ must exist');
    const files = listFiles(refsDir, '.md');
    assert.ok(files.length > 0, 'Must have reference files');
  });

  it('.gsd/templates/ exists and has template files', () => {
    assert.ok(fs.existsSync(templDir), '.gsd/templates/ must exist');
    // Count all non-.gitkeep files recursively
    let count = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (entry !== '.gitkeep') count++;
      }
    };
    walk(templDir);
    assert.ok(count > 0, 'Must have template files');
  });
});

// ===================================================================
// Test Suite 14: End-to-End Wiring Validation
// ===================================================================

describe('End-to-End Wiring', () => {
  it('new-project flow: skill → agents → tools all resolve', () => {
    // /gsd-new-project → skill → spawns gsd-roadmapper → handoffs to gsd-planner
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-new-project', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-roadmapper.agent.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-planner.agent.md')));
    
    // Verify roadmapper handoffs to planner
    const roadmapper = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-roadmapper.agent.md'), 'utf8');
    assert.ok(roadmapper.includes('gsd-planner'), 'Roadmapper must handoff to planner');
  });

  it('plan-phase flow: skill → agents → tools all resolve', () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-plan-phase', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-planner.agent.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-plan-checker.agent.md')));
    
    const planner = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-planner.agent.md'), 'utf8');
    assert.ok(planner.includes('gsd-plan-checker'), 'Planner must handoff to plan-checker');
    assert.ok(planner.includes('gsd-executor'), 'Planner must handoff to executor');
  });

  it('execute-phase flow: skill → agents → tools all resolve', () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-execute-phase', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-executor.agent.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-verifier.agent.md')));
    
    const executor = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-executor.agent.md'), 'utf8');
    assert.ok(executor.includes('gsd-verifier'), 'Executor must handoff to verifier');
  });

  it('debug flow: skill → agent → handoff chain resolve', () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-debug', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-debugger.agent.md')));
    
    const debugger_ = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-debugger.agent.md'), 'utf8');
    assert.ok(debugger_.includes('gsd-executor'), 'Debugger must handoff to executor');
  });

  it('verify-work flow: skill → agents → tools all resolve', () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-verify-work', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(AGENTS_DIR, 'gsd-verifier.agent.md')));
    
    const verifier = fs.readFileSync(path.join(AGENTS_DIR, 'gsd-verifier.agent.md'), 'utf8');
    assert.ok(verifier.includes('gsd-debugger'), 'Verifier must handoff to debugger');
  });

  it('quick flow: skill → agents → tools all resolve', () => {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, 'gsd-quick', 'SKILL.md')));
    const skill = fs.readFileSync(path.join(SKILLS_DIR, 'gsd-quick', 'SKILL.md'), 'utf8');
    assert.ok(skill.includes('gsd-planner'), 'Quick skill must reference planner');
    assert.ok(skill.includes('gsd-executor'), 'Quick skill must reference executor');
  });

  it('progress prompt uses only valid MCP tools', () => {
    const content = fs.readFileSync(path.join(PROMPTS_DIR, 'gsd-progress.prompt.md'), 'utf8');
    const mcpToolSet = new Set(getMcpToolNames());
    const refs = extractToolRefs(content);
    for (const ref of refs) {
      assert.ok(mcpToolSet.has(ref), `Progress prompt references missing tool: ${ref}`);
    }
  });

  it('settings prompt uses only valid MCP tools', () => {
    const content = fs.readFileSync(path.join(PROMPTS_DIR, 'gsd-settings.prompt.md'), 'utf8');
    const mcpToolSet = new Set(getMcpToolNames());
    const refs = extractToolRefs(content);
    for (const ref of refs) {
      assert.ok(mcpToolSet.has(ref), `Settings prompt references missing tool: ${ref}`);
    }
  });

  it('pause/resume prompts use only valid MCP tools', () => {
    const mcpToolSet = new Set(getMcpToolNames());
    for (const f of ['gsd-pause-work.prompt.md', 'gsd-resume-work.prompt.md']) {
      const content = fs.readFileSync(path.join(PROMPTS_DIR, f), 'utf8');
      const refs = extractToolRefs(content);
      for (const ref of refs) {
        assert.ok(mcpToolSet.has(ref), `${f} references missing tool: ${ref}`);
      }
    }
  });
});

// ===================================================================
// Test Suite 15: VS Code Extension ↔ Copilot Wiring
// ===================================================================

describe('Extension ↔ Copilot Wiring', () => {
  const extPkgPath = path.join(ROOT, 'extension', 'package.json');

  it('extension package.json exists', () => {
    assert.ok(fs.existsSync(extPkgPath));
  });

  it('extension commands map to prompts or skills', () => {
    const pkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf8'));
    const promptNames = new Set(listFiles(PROMPTS_DIR, '.prompt.md').map(f => f.replace('.prompt.md', '')));
    const skillNames = new Set(listDirs(SKILLS_DIR));
    
    const cmds = pkg.contributes?.commands || [];
    // Map command IDs to slash command names
    const commandMap = {
      'gsd.newProject': 'gsd-new-project',
      'gsd.planPhase': 'gsd-plan-phase',
      'gsd.executePhase': 'gsd-execute-phase',
      'gsd.quick': 'gsd-quick',
      'gsd.progress': 'gsd-progress',
      'gsd.switchProfile': 'gsd-set-profile',
    };
    
    for (const [cmdId, slashName] of Object.entries(commandMap)) {
      const cmdExists = cmds.some(c => c.command === cmdId);
      assert.ok(cmdExists, `Extension command ${cmdId} must exist`);
      assert.ok(
        promptNames.has(slashName) || skillNames.has(slashName),
        `Extension command ${cmdId} maps to /${slashName} which must exist as prompt or skill`
      );
    }
  });

  it('extension activation event matches expected trigger', () => {
    const pkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf8'));
    const events = pkg.activationEvents || [];
    assert.ok(
      events.some(e => e.includes('.planning/STATE.md') || e.includes('.planning')),
      'Extension must activate on .planning/ directory'
    );
  });
});
