/**
 * Config — Planning config CRUD operations
 * Ported from get-shit-done/bin/lib/config.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function configEnsure(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const planningDir = path.join(cwd, '.planning');

  try {
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
  } catch (err) {
    throw new Error('Failed to create .planning directory: ' + err.message);
  }

  if (fs.existsSync(configPath)) {
    return { created: false, reason: 'already_exists' };
  }

  const hasBraveSearch = !!process.env.BRAVE_API_KEY;

  const globalDefaultsPath = path.join(os.homedir(), '.gsd', 'defaults.json');
  let userDefaults = {};
  try {
    if (fs.existsSync(globalDefaultsPath)) {
      userDefaults = JSON.parse(fs.readFileSync(globalDefaultsPath, 'utf-8'));
    }
  } catch {}

  const hardcoded = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'gsd/phase-{phase}-{slug}',
    milestone_branch_template: 'gsd/{milestone}-{slug}',
    workflow: {
      research: true,
      plan_check: true,
      verifier: true,
      nyquist_validation: false,
    },
    parallelization: true,
    brave_search: hasBraveSearch,
  };
  const defaults = {
    ...hardcoded,
    ...userDefaults,
    workflow: { ...hardcoded.workflow, ...(userDefaults.workflow || {}) },
  };

  fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
  return { created: true, path: '.planning/config.json' };
}

function configSet(cwd, keyPath, value) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  if (!keyPath) throw new Error('key path required');

  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (typeof value === 'string' && !isNaN(value) && value !== '') parsedValue = Number(value);

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    throw new Error('Failed to read config.json: ' + err.message);
  }

  const keys = keyPath.split('.');
  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = parsedValue;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return { updated: true, key: keyPath, value: parsedValue };
}

function configGet(cwd, keyPath) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  if (!keyPath) throw new Error('key path required');

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } else {
      throw new Error('No config.json found');
    }
  } catch (err) {
    throw err;
  }

  const keys = keyPath.split('.');
  let current = config;
  for (const key of keys) {
    if (current === undefined || current === null || typeof current !== 'object') {
      throw new Error(`Key not found: ${keyPath}`);
    }
    current = current[key];
  }

  if (current === undefined) throw new Error(`Key not found: ${keyPath}`);
  return current;
}

module.exports = {
  configEnsure,
  configSet,
  configGet,
};
