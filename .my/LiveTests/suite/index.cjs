/**
 * Test Suite Entry Point
 *
 * This module runs inside VS Code via @vscode/test-electron.
 * It sets up Mocha, discovers all test files, and runs them.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Resolve mocha from the extension's node_modules
const extensionRoot = path.resolve(__dirname, '..', '..', '..', 'extension');
const Mocha = require(path.join(extensionRoot, 'node_modules', 'mocha'));

function run() {
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
        resolve();
      }
    });
  });
}

module.exports = { run };
