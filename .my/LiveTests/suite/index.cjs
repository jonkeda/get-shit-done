/**
 * Test Suite Entry Point
 *
 * This module runs inside VS Code via @vscode/test-electron.
 * It sets up Mocha, discovers all test files, and runs them.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const vscode = require('vscode');

// Resolve mocha from the extension's node_modules
const extensionRoot = path.resolve(__dirname, '..', '..', '..', 'extension');
const Mocha = require(path.join(extensionRoot, 'node_modules', 'mocha'));

async function run() {
  // Set the testMode context key BEFORE running any tests. This bypasses
  // the security confirmation dialog that chat.tools.global.autoApprove
  // would otherwise trigger, allowing all tools (including MCP) to
  // execute without manual approval.
  await vscode.commands.executeCommand(
    'setContext',
    'vscode.chat.tools.global.autoApprove.testMode',
    true
  );

  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 120_000, // 2 min per test — chat interactions are slow
    slow: 30_000,
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    // Find all test files
    const testFiles = fs.readdirSync(testsRoot)
      .filter(f => f.endsWith('.test.cjs'));

    for (const file of testFiles) {
      mocha.addFile(path.resolve(testsRoot, file));
    }

    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} test(s) failed`));
      } else {
        // Write success marker so the runner knows tests passed even if
        // VS Code exits with SIGINT during shutdown
        const workspace = process.env.GSD_TEST_WORKSPACE;
        if (workspace) {
          fs.writeFileSync(path.join(workspace, '.gsd-tests-passed'), '');
        }
        resolve();
      }
    });
  });
}

module.exports = { run };
