/**
 * GSD Copilot MCP Server — Test Helpers
 * Provides temp project scaffolding and module loaders for .gsd/tools/lib/ modules.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

const LIB_PATH = path.join(__dirname, '..', '.gsd', 'tools', 'lib');

// ─── Module loaders (ESM via dynamic import) ─────────────────────────────────

async function loadModule(name) {
  const filePath = path.join(LIB_PATH, name);
  return import(pathToFileURL(filePath).href);
}

async function loadCore() { return loadModule('core.js'); }
async function loadState() { return loadModule('state.js'); }
async function loadConfig() { return loadModule('config.js'); }
async function loadFrontmatter() { return loadModule('frontmatter.js'); }
async function loadVerify() { return loadModule('verify.js'); }
async function loadTemplate() { return loadModule('template.js'); }

// ─── Temp project scaffolding ─────────────────────────────────────────────────

function createTempProject(opts = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-copilot-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });

  if (opts.config !== false) {
    writeConfig(tmpDir, opts.config || {});
  }
  if (opts.state !== false) {
    writeState(tmpDir, opts.state || {});
  }
  if (opts.roadmap) {
    writeRoadmap(tmpDir, Array.isArray(opts.roadmap) ? opts.roadmap : undefined);
  }
  if (opts.project) {
    writeProject(tmpDir, typeof opts.project === 'object' ? opts.project : undefined);
  }

  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ─── Fixture writers ──────────────────────────────────────────────────────────

function writeConfig(cwd, overrides) {
  const defaults = {
    model_profile: 'balanced',
    commit_docs: true,
    search_gitignored: false,
    branching_strategy: 'none',
    phase_branch_template: 'gsd/phase-{phase}-{slug}',
    milestone_branch_template: 'gsd/{milestone}-{slug}',
    workflow: { research: true, plan_check: true, verifier: true },
    parallelization: true,
    brave_search: false,
  };
  const config = { ...defaults, ...overrides };
  fs.writeFileSync(
    path.join(cwd, '.planning', 'config.json'),
    JSON.stringify(config, null, 2),
    'utf-8'
  );
  return config;
}

function writeState(cwd, fields) {
  const defaults = {
    currentPhase: '01',
    currentPhaseName: 'Foundation',
    totalPhases: 3,
    currentPlan: '1',
    totalPlans: 2,
    status: 'In progress',
    progress: '25%',
    lastActivity: '2025-01-15',
  };
  const f = { ...defaults, ...fields };

  const content = `# Project State

**Current Phase:** ${f.currentPhase}
**Current Phase Name:** ${f.currentPhaseName}
**Total Phases:** ${f.totalPhases}
**Current Plan:** ${f.currentPlan}
**Total Plans in Phase:** ${f.totalPlans}
**Status:** ${f.status}
**Progress:** ${f.progress}
**Last Activity:** ${f.lastActivity}
${f.pausedAt ? `**Paused At:** ${f.pausedAt}\n` : ''}
## Decisions Made

${f.decisions || 'None yet.'}

## Blockers

${f.blockers || 'None'}

## Session

**Last Date:** ${f.lastActivity}
**Stopped At:** Phase ${f.currentPhase}, Plan ${f.currentPlan}
**Resume File:** .planning/phases/${f.currentPhase}-foundation/${f.currentPhase}-0${f.currentPlan}-PLAN.md
`;
  fs.writeFileSync(path.join(cwd, '.planning', 'STATE.md'), content, 'utf-8');
  return content;
}

function writeRoadmap(cwd, phases) {
  const phaseList = phases || [
    { num: 1, name: 'Foundation', goal: 'Set up project structure' },
    { num: 2, name: 'Core Logic', goal: 'Implement business logic' },
    { num: 3, name: 'Polish', goal: 'Final touches' },
  ];

  let content = `# Roadmap — v1.0\n\n`;
  for (const p of phaseList) {
    content += `## Phase ${p.num}: ${p.name}\n\n**Goal:** ${p.goal}\n\n`;
  }
  fs.writeFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), content, 'utf-8');
  return content;
}

function writeProject(cwd, opts) {
  const o = opts || {};
  const content = `# ${o.name || 'Test Project'}

## What This Is

${o.description || 'A test project for GSD testing.'}

## Core Value

${o.coreValue || 'Testing infrastructure.'}

## Requirements

${o.requirements || '- REQ-001: Must work correctly'}
`;
  fs.writeFileSync(path.join(cwd, '.planning', 'PROJECT.md'), content, 'utf-8');
  return content;
}

// ─── Phase directory helpers ──────────────────────────────────────────────────

function createPhaseDir(cwd, phaseNum, phaseName, files) {
  const padded = String(phaseNum).padStart(2, '0');
  const slug = phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const dirName = `${padded}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);
  fs.mkdirSync(dirPath, { recursive: true });

  if (files) {
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dirPath, name), content, 'utf-8');
    }
  }

  return { dirName, dirPath, phaseNum: padded };
}

function writePlanFile(cwd, phaseDir, planNum, opts) {
  const padded = String(planNum).padStart(2, '0');
  const phaseMatch = phaseDir.match(/^(\d+)/);
  const phaseNum = phaseMatch ? phaseMatch[1] : '01';
  const fileName = `${phaseNum}-${padded}-PLAN.md`;
  const o = opts || {};

  const content = `---
phase: "${phaseNum}"
plan: "${phaseNum}-${padded}"
type: ${o.type || 'implementation'}
wave: ${o.wave || 1}
depends_on: ${o.dependsOn ? JSON.stringify(o.dependsOn) : '[]'}
files_modified: ${o.filesModified ? JSON.stringify(o.filesModified) : '[]'}
autonomous: ${o.autonomous !== undefined ? o.autonomous : true}
must_haves:
  artifacts: []
  key_links: []
---

# Plan ${phaseNum}-${padded}

${o.body || '<task>\n<name>Task 1</name>\n<action>Do the thing</action>\n<verify>Check it</verify>\n<done>It works</done>\n</task>'}
`;
  const filePath = path.join(cwd, '.planning', 'phases', phaseDir, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  return { fileName, filePath };
}

function writeSummaryFile(cwd, phaseDir, planNum) {
  const padded = String(planNum).padStart(2, '0');
  const phaseMatch = phaseDir.match(/^(\d+)/);
  const phaseNum = phaseMatch ? phaseMatch[1] : '01';
  const fileName = `${phaseNum}-${padded}-SUMMARY.md`;

  const content = `---
phase: "${phaseNum}"
plan: "${phaseNum}-${padded}"
subsystem: core
tags: [test]
duration: 30m
completed: true
---

# Summary ${phaseNum}-${padded}

Completed successfully.
`;
  const filePath = path.join(cwd, '.planning', 'phases', phaseDir, fileName);
  fs.writeFileSync(filePath, content, 'utf-8');
  return { fileName, filePath };
}

module.exports = {
  LIB_PATH,
  loadModule,
  loadCore,
  loadState,
  loadConfig,
  loadFrontmatter,
  loadVerify,
  loadTemplate,
  createTempProject,
  cleanup,
  writeConfig,
  writeState,
  writeRoadmap,
  writeProject,
  createPhaseDir,
  writePlanFile,
  writeSummaryFile,
};
