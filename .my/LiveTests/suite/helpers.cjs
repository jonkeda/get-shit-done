/**
 * Chat Test Helpers
 *
 * Utilities for sending commands to Copilot Chat and verifying
 * side effects (file changes, MCP tool invocations, state mutations).
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Get the workspace root folder path.
 */
function workspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return folders[0].uri.fsPath;
}

/**
 * Send a message to Copilot Chat via the workbench command.
 *
 * This opens the chat panel and submits the query. The chat will process
 * the prompt asynchronously — use waitFor* helpers to check outcomes.
 *
 * @param {string} query - The chat message (e.g. '/gsd-help')
 * @returns {Promise<void>}
 */
async function sendChatMessage(query) {
  // Open in agent mode so MCP tools are permitted (non-agent modes only
  // allow internal read/search/web tools, filtering out MCP tools).
  await vscode.commands.executeCommand('workbench.action.chat.open', {
    query,
    mode: 'agent',
  });
  // Small delay to let the chat panel open and begin processing
  await sleep(2000);
}

/**
 * Wait for a file to exist in the workspace.
 *
 * @param {string} relativePath - Path relative to workspace root
 * @param {number} [timeoutMs=60000] - Timeout in ms
 * @returns {Promise<string>} File contents when found
 */
async function waitForFile(relativePath, timeoutMs = 60_000) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    await sleep(1000);
  }
  throw new Error(`Timeout: file ${relativePath} not created within ${timeoutMs}ms`);
}

/**
 * Wait for a file's content to match a pattern.
 *
 * @param {string} relativePath - Path relative to workspace root
 * @param {RegExp} pattern - Pattern to match
 * @param {number} [timeoutMs=60000] - Timeout in ms
 * @returns {Promise<string>} Full file contents when pattern matches
 */
async function waitForFileContent(relativePath, pattern, timeoutMs = 60_000) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        return content;
      }
    }
    await sleep(1000);
  }
  throw new Error(`Timeout: file ${relativePath} did not match ${pattern} within ${timeoutMs}ms`);
}

/**
 * Wait for any new file to appear in a directory.
 *
 * @param {string} relativeDir - Directory path relative to workspace root
 * @param {number} [timeoutMs=60000] - Timeout in ms
 * @returns {Promise<string[]>} List of new file names
 */
async function waitForNewFileInDir(relativeDir, timeoutMs = 60_000) {
  const fullDir = path.join(workspaceRoot(), relativeDir);

  // Snapshot current files
  const before = new Set();
  if (fs.existsSync(fullDir)) {
    for (const f of fs.readdirSync(fullDir)) {
      before.add(f);
    }
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(fullDir)) {
      const now = fs.readdirSync(fullDir);
      const newFiles = now.filter(f => !before.has(f));
      if (newFiles.length > 0) {
        return newFiles;
      }
    }
    await sleep(1000);
  }
  throw new Error(`Timeout: no new file appeared in ${relativeDir} within ${timeoutMs}ms`);
}

/**
 * Wait for STATE.md to contain a specific pattern.
 *
 * @param {RegExp} pattern - Pattern to match
 * @param {number} [timeoutMs=60000] - Timeout in ms
 * @returns {Promise<string>} STATE.md contents when pattern matches
 */
async function waitForStateChange(pattern, timeoutMs = 60_000) {
  return waitForFileContent('.planning/STATE.md', pattern, timeoutMs);
}

/**
 * Read a file from the workspace.
 *
 * @param {string} relativePath - Path relative to workspace root
 * @returns {string|null} File contents or null if not found
 */
function readWorkspaceFile(relativePath) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if a file exists in the workspace.
 *
 * @param {string} relativePath - Path relative to workspace root
 * @returns {boolean}
 */
function fileExists(relativePath) {
  return fs.existsSync(path.join(workspaceRoot(), relativePath));
}

/**
 * List files in a workspace directory.
 *
 * @param {string} relativeDir - Path relative to workspace root
 * @returns {string[]} File/directory names
 */
function listDir(relativeDir) {
  const fullPath = path.join(workspaceRoot(), relativeDir);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath);
}

/**
 * Verify that the GSD extension is active.
 *
 * @returns {Promise<boolean>}
 */
async function isExtensionActive() {
  const ext = vscode.extensions.getExtension('gsd.gsd-copilot');
  if (!ext) return false;
  if (!ext.isActive) {
    await ext.activate();
  }
  return ext.isActive;
}

/**
 * Get all VS Code commands that start with 'gsd.'
 *
 * @returns {Promise<string[]>}
 */
async function getGsdCommands() {
  const allCommands = await vscode.commands.getCommands(true);
  return allCommands.filter(cmd => cmd.startsWith('gsd.'));
}

/**
 * Wait for the chat panel to be open by checking if the
 * chat view is visible.
 *
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<void>}
 */
async function waitForChatOpen(timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Try to check if chat is open via command
    try {
      const allCommands = await vscode.commands.getCommands(true);
      if (allCommands.includes('workbench.action.chat.open')) {
        return;
      }
    } catch {
      // ignore
    }
    await sleep(500);
  }
}

/**
 * Clear the chat session (start fresh).
 *
 * @returns {Promise<void>}
 */
async function clearChat() {
  try {
    await vscode.commands.executeCommand('workbench.action.chat.clear');
  } catch {
    // Command may not exist — ignore
  }
  await sleep(500);
}

/**
 * Write a file in the workspace (for test setup).
 *
 * @param {string} relativePath
 * @param {string} content
 */
function writeWorkspaceFile(relativePath, content) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
}

/**
 * Delete a file from the workspace (for test teardown).
 *
 * @param {string} relativePath
 */
function deleteWorkspaceFile(relativePath) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  try {
    fs.unlinkSync(fullPath);
  } catch {
    // ignore if not found
  }
}

/**
 * Wait for a file's content to NOT match a pattern.
 * Useful for verifying that content was removed (e.g. phase deletion).
 *
 * @param {string} relativePath - Path relative to workspace root
 * @param {RegExp} pattern - Pattern that should NOT match
 * @param {number} [timeoutMs=120000] - Timeout in ms
 * @returns {Promise<string>} File contents when pattern no longer matches
 */
async function waitForFileContentAbsent(relativePath, pattern, timeoutMs = 120_000) {
  const fullPath = path.join(workspaceRoot(), relativePath);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!pattern.test(content)) {
        return content;
      }
    }
    await sleep(1000);
  }
  throw new Error(`Timeout: file ${relativePath} still matches ${pattern} after ${timeoutMs}ms`);
}

/**
 * Wait for the .planning/ directory to become quiescent (no file changes).
 * Sends a chat message and waits until no files in .planning/ have been
 * modified for `quietMs` consecutive milliseconds.
 *
 * @param {number} [quietMs=8000] - How long files must be unchanged
 * @param {number} [timeoutMs=180000] - Overall timeout
 * @returns {Promise<void>}
 */
async function waitForChatIdle(quietMs = 8000, timeoutMs = 180_000) {
  const planningDir = path.join(workspaceRoot(), '.planning');
  const deadline = Date.now() + timeoutMs;

  function getLatestMtime(dir) {
    let latest = 0;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          latest = Math.max(latest, getLatestMtime(full));
        } else {
          latest = Math.max(latest, fs.statSync(full).mtimeMs);
        }
      }
    } catch { /* directory may not exist yet */ }
    return latest;
  }

  // Wait at least 3s for the request to start producing changes
  await sleep(3000);

  let lastChange = getLatestMtime(planningDir);
  while (Date.now() < deadline) {
    await sleep(2000);
    const current = getLatestMtime(planningDir);
    if (current > lastChange) {
      lastChange = current;
    } else if (Date.now() - lastChange > quietMs) {
      // No changes for quietMs — chat is likely done
      return;
    }
  }
  throw new Error(`Timeout: .planning/ still changing after ${timeoutMs}ms`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  workspaceRoot,
  sendChatMessage,
  waitForFile,
  waitForFileContent,
  waitForFileContentAbsent,
  waitForNewFileInDir,
  waitForStateChange,
  readWorkspaceFile,
  fileExists,
  listDir,
  isExtensionActive,
  getGsdCommands,
  waitForChatOpen,
  waitForChatIdle,
  clearChat,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  sleep,
};
