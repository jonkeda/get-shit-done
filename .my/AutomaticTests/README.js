/**
 * GSD Copilot Port Validation — Test Runner
 * 
 * Run all port validation tests:
 *   node --test .my/AutomaticTests/
 * 
 * Or run a specific test file:
 *   node --test .my/AutomaticTests/port-validation-mcp.test.cjs
 * 
 * These tests validate the structural integrity of the Copilot port:
 * - MCP server: 68 tools, no stubs, resilient startup
 * - Agents: 11 agents, frontmatter, no stale refs
 * - Skills: 9 skills, SKILL.md, no stale refs
 * - Prompts: 17 prompts, command coverage
 * - Templates: all runtime + skill templates present
 * - Installer: all modes, copies all directories
 * - Infrastructure: instructions, extension, docs, Windows compat, stale refs
 */
