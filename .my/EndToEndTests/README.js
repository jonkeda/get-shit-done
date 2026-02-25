/**
 * GSD End-to-End Test Suite
 * ========================
 *
 * These tests spawn a REAL MCP server process and communicate with it
 * using the same JSON-RPC 2.0 Content-Length framed protocol that
 * VS Code Copilot uses. This validates the entire stack end-to-end.
 *
 * ## What's tested:
 *
 * - **Lifecycle** (e2e-lifecycle.test.cjs)
 *   Server startup, initialize handshake, tool listing, shutdown, error methods
 *
 * - **Tool Calls** (e2e-tool-calls.test.cjs)
 *   Every tool category: state, config, roadmap, commands, frontmatter,
 *   phases, verify, templates, init, milestones
 *
 * - **Error Handling** (e2e-error-handling.test.cjs)
 *   Unknown tools, bad arguments, invalid methods, server resilience,
 *   concurrent requests
 *
 * - **Workflows** (e2e-workflows.test.cjs)
 *   Full command flows: /gsd-progress, /gsd-settings, /gsd-pause-work,
 *   /gsd-resume-work, /gsd-execute-phase, /gsd-plan-phase, /gsd-health,
 *   /gsd-add-phase, /gsd-quick, /gsd-verify-work, frontmatter round-trip,
 *   state mutation round-trip, document scaffolding, history tracking
 *
 * ## Transport:
 *
 * Tests use McpClient (mcp-client.cjs) which:
 * 1. Spawns `node .gsd/tools/gsd-mcp-server.js` as a child process
 * 2. Sets GSD_WORKSPACE to a temporary directory with .planning/ fixtures
 * 3. Sends Content-Length framed JSON-RPC requests to stdin
 * 4. Parses Content-Length framed responses from stdout
 * 5. Manages request IDs, timeouts, and response routing
 *
 * ## Running:
 *
 *   node --test .my/EndToEndTests/
 *
 * Or a specific suite:
 *
 *   node --test .my/EndToEndTests/e2e-lifecycle.test.cjs
 *   node --test .my/EndToEndTests/e2e-tool-calls.test.cjs
 *   node --test .my/EndToEndTests/e2e-error-handling.test.cjs
 *   node --test .my/EndToEndTests/e2e-workflows.test.cjs
 */
