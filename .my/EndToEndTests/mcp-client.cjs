/**
 * MCP Client — spawns gsd-mcp-server.js and communicates via JSON-RPC 2.0
 * over Content-Length framed stdio (same protocol as LSP).
 *
 * Usage:
 *   const { McpClient } = require('./mcp-client.cjs');
 *   const client = new McpClient(workspaceDir);
 *   await client.start();
 *   const tools = await client.listTools();
 *   const result = await client.callTool('gsd_config_load', {});
 *   await client.close();
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_PATH = path.join(ROOT, '.gsd', 'tools', 'gsd-mcp-server.js');

class McpClient {
  /**
   * @param {string} workspaceDir - Directory with .planning/ to use as GSD_WORKSPACE
   */
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir;
    this.proc = null;
    this.buffer = '';
    this.nextId = 1;
    this.pending = new Map(); // id -> { resolve, reject }
    this.stderrOutput = '';
  }

  /** Spawn the MCP server and perform initialize handshake */
  async start() {
    return new Promise((resolve, reject) => {
      this.proc = spawn(process.execPath, [SERVER_PATH], {
        env: { ...process.env, GSD_WORKSPACE: this.workspaceDir },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this.proc.stdout.setEncoding('utf-8');
      this.proc.stdout.on('data', (chunk) => {
        this.buffer += chunk;
        this._processBuffer();
      });

      this.proc.stderr.setEncoding('utf-8');
      this.proc.stderr.on('data', (chunk) => {
        this.stderrOutput += chunk;
      });

      this.proc.on('error', (err) => reject(err));
      this.proc.on('exit', (code) => {
        // Reject all pending requests
        for (const [, p] of this.pending) {
          p.reject(new Error(`Server exited with code ${code}`));
        }
        this.pending.clear();
      });

      // Wait a tick for the server to start, then initialize
      setTimeout(async () => {
        try {
          const initResult = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'e2e-test', version: '1.0.0' },
          });
          // Send initialized notification (no response expected)
          this._sendMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });
          resolve(initResult);
        } catch (err) {
          reject(err);
        }
      }, 200);
    });
  }

  /** Send a JSON-RPC request and wait for response */
  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for response to ${method} (id=${id})`));
      }, 15000);

      this.pending.set(id, {
        resolve: (result) => { clearTimeout(timeout); resolve(result); },
        reject: (err) => { clearTimeout(timeout); reject(err); },
      });

      this._sendMessage({ jsonrpc: '2.0', id, method, params });
    });
  }

  /** List all tools */
  async listTools() {
    const result = await this.sendRequest('tools/list', {});
    return result.tools || [];
  }

  /** Call a tool and return parsed result */
  async callTool(name, args = {}) {
    const result = await this.sendRequest('tools/call', { name, arguments: args });
    if (result.isError) {
      const text = result.content?.[0]?.text || '{}';
      throw Object.assign(new Error(`Tool error: ${name}`), { toolResult: JSON.parse(text) });
    }
    const text = result.content?.[0]?.text || '{}';
    return JSON.parse(text);
  }

  /** Call a tool and return raw MCP result (including isError flag) */
  async callToolRaw(name, args = {}) {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  /** Gracefully close the server */
  async close() {
    if (this.proc && !this.proc.killed) {
      this.proc.stdin.end();
      return new Promise((resolve) => {
        this.proc.on('exit', resolve);
        setTimeout(() => {
          if (!this.proc.killed) this.proc.kill();
          resolve();
        }, 3000);
      });
    }
  }

  // --- Private ---

  _sendMessage(msg) {
    const body = JSON.stringify(msg);
    const header = 'Content-Length: ' + Buffer.byteLength(body, 'utf-8') + '\r\n\r\n';
    this.proc.stdin.write(header + body);
  }

  _processBuffer() {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.buffer.substring(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;

      if (Buffer.byteLength(this.buffer.substring(bodyStart), 'utf-8') < contentLength) break;

      const body = this.buffer.substring(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.substring(bodyStart + contentLength);

      let msg;
      try {
        msg = JSON.parse(body);
      } catch {
        continue;
      }

      // Route response to pending request
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          p.reject(Object.assign(new Error(msg.error.message), { code: msg.error.code }));
        } else {
          p.resolve(msg.result);
        }
      }
    }
  }
}

/**
 * Create a temporary workspace directory with minimal .planning/ files
 * suitable for E2E testing.
 */
function createTestWorkspace() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-e2e-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  // Minimal config.json
  fs.writeFileSync(path.join(planningDir, 'config.json'), JSON.stringify({
    model_profile: 'balanced',
    commit_docs: false,
    branching_strategy: 'none',
    research: true,
    plan_checker: true,
    verifier: true,
    parallelization: true,
  }, null, 2));

  // Minimal STATE.md — uses **Field:** pattern that state tools expect
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), `---
milestone: "E2E Test Milestone"
phase: "1"
plan: "01"
status: "in-progress"
progress: "[#-----] 1/6"
last_updated: "${new Date().toISOString()}"
---

# Current Position

**Milestone:** E2E Test Milestone
**Phase:** 1 — Setup
**Plan:** 01
**Status:** in-progress

## Blockers
None

## Decisions
None
`);

  // Minimal ROADMAP.md
  fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), `---
milestone: "E2E Test Milestone"
total_phases: 2
---

# Roadmap

## Phase 1 — Setup
**Status**: in-progress
**Goals**: Initial project setup

## Phase 2 — Implementation
**Status**: not-started
**Goals**: Build core features
`);

  // Minimal PROJECT.md
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), `---
name: "E2E Test Project"
type: "application"
---

# E2E Test Project

A test project for end-to-end MCP validation.
`);

  // Phase 1 directory with a plan
  const phase1Dir = path.join(planningDir, 'phases', '01-setup');
  fs.mkdirSync(phase1Dir, { recursive: true });

  fs.writeFileSync(path.join(phase1Dir, '01-CONTEXT.md'), `---
phase: "1"
type: "context"
---

# Phase 1 Context

Technology: Node.js
`);

  fs.writeFileSync(path.join(phase1Dir, '01-01-PLAN.md'), `---
phase: "1"
plan: "01"
type: "plan"
status: "in-progress"
---

# Plan 01 — Initial Setup

## Tasks
- [x] Create project structure
- [ ] Configure tooling
- [ ] Write tests

## Must Haves
### artifacts
- package.json
### key_links
- .planning/STATE.md
`);

  return tmpDir;
}

/** Remove a temporary workspace */
function cleanupTestWorkspace(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors on Windows
  }
}

module.exports = { McpClient, createTestWorkspace, cleanupTestWorkspace, ROOT, SERVER_PATH };
