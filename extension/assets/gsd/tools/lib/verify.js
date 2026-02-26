/**
 * Verify — Verification suite, consistency, and health validation (MCP port)
 */

const fs = require('fs');
const path = require('path');
const { safeReadFile, normalizePhaseName, execGit, findPhaseInternal, getMilestoneInfo } = require('./core.js');
const { extractFrontmatter, parseMustHavesBlock } = require('./frontmatter.js');

function cmdVerifySummary(cwd, summaryPath, checkFileCount) {
  if (!summaryPath) throw new Error('summary-path required');

  const fullPath = path.join(cwd, summaryPath);
  const checkCount = checkFileCount || 2;

  if (!fs.existsSync(fullPath)) {
    return {
      passed: false,
      checks: { summary_exists: false, files_created: { checked: 0, found: 0, missing: [] }, commits_exist: false, self_check: 'not_found' },
      errors: ['SUMMARY.md not found'],
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const errors = [];

  const mentionedFiles = new Set();
  const patterns = [
    /`([^`]+\.[a-zA-Z]+)`/g,
    /(?:Created|Modified|Added|Updated|Edited):\s*`?([^\s`]+\.[a-zA-Z]+)`?/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const filePath = m[1];
      if (filePath && !filePath.startsWith('http') && filePath.includes('/')) {
        mentionedFiles.add(filePath);
      }
    }
  }

  const filesToCheck = Array.from(mentionedFiles).slice(0, checkCount);
  const missing = [];
  for (const file of filesToCheck) {
    if (!fs.existsSync(path.join(cwd, file))) missing.push(file);
  }

  const commitHashPattern = /\b[0-9a-f]{7,40}\b/g;
  const hashes = content.match(commitHashPattern) || [];
  let commitsExist = false;
  if (hashes.length > 0) {
    for (const hash of hashes.slice(0, 3)) {
      const result = execGit(cwd, ['cat-file', '-t', hash]);
      if (result.exitCode === 0 && result.stdout === 'commit') { commitsExist = true; break; }
    }
  }

  let selfCheck = 'not_found';
  const selfCheckPattern = /##\s*(?:Self[- ]?Check|Verification|Quality Check)/i;
  if (selfCheckPattern.test(content)) {
    const passPattern = /(?:all\s+)?(?:pass|✓|✅|complete|succeeded)/i;
    const failPattern = /(?:fail|✗|❌|incomplete|blocked)/i;
    const checkSection = content.slice(content.search(selfCheckPattern));
    if (failPattern.test(checkSection)) selfCheck = 'failed';
    else if (passPattern.test(checkSection)) selfCheck = 'passed';
  }

  if (missing.length > 0) errors.push('Missing files: ' + missing.join(', '));
  if (!commitsExist && hashes.length > 0) errors.push('Referenced commit hashes not found in git history');
  if (selfCheck === 'failed') errors.push('Self-check section indicates failure');

  const checks = {
    summary_exists: true,
    files_created: { checked: filesToCheck.length, found: filesToCheck.length - missing.length, missing },
    commits_exist: commitsExist,
    self_check: selfCheck,
  };

  const passed = missing.length === 0 && selfCheck !== 'failed';
  return { passed, checks, errors };
}

function cmdVerifyPlanStructure(cwd, filePath) {
  if (!filePath) throw new Error('file path required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) return { error: 'File not found', path: filePath };

  const fm = extractFrontmatter(content);
  const errors = [];
  const warnings = [];

  const required = ['phase', 'plan', 'type', 'wave', 'depends_on', 'files_modified', 'autonomous', 'must_haves'];
  for (const field of required) {
    if (fm[field] === undefined) errors.push(`Missing required frontmatter field: ${field}`);
  }

  const taskPattern = /<task[^>]*>([\s\S]*?)<\/task>/g;
  const tasks = [];
  let taskMatch;
  while ((taskMatch = taskPattern.exec(content)) !== null) {
    const taskContent = taskMatch[1];
    const nameMatch = taskContent.match(/<name>([\s\S]*?)<\/name>/);
    const taskName = nameMatch ? nameMatch[1].trim() : 'unnamed';
    const hasFiles = /<files>/.test(taskContent);
    const hasAction = /<action>/.test(taskContent);
    const hasVerify = /<verify>/.test(taskContent);
    const hasDone = /<done>/.test(taskContent);

    if (!nameMatch) errors.push('Task missing <name> element');
    if (!hasAction) errors.push(`Task '${taskName}' missing <action>`);
    if (!hasVerify) warnings.push(`Task '${taskName}' missing <verify>`);
    if (!hasDone) warnings.push(`Task '${taskName}' missing <done>`);
    if (!hasFiles) warnings.push(`Task '${taskName}' missing <files>`);

    tasks.push({ name: taskName, hasFiles, hasAction, hasVerify, hasDone });
  }

  if (tasks.length === 0) warnings.push('No <task> elements found');

  if (fm.wave && parseInt(fm.wave) > 1 && (!fm.depends_on || (Array.isArray(fm.depends_on) && fm.depends_on.length === 0))) {
    warnings.push('Wave > 1 but depends_on is empty');
  }

  const hasCheckpoints = /<task\s+type=["']?checkpoint/.test(content);
  if (hasCheckpoints && fm.autonomous !== 'false' && fm.autonomous !== false) {
    errors.push('Has checkpoint tasks but autonomous is not false');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    task_count: tasks.length,
    tasks,
    frontmatter_fields: Object.keys(fm),
  };
}

function cmdVerifyPhaseCompleteness(cwd, phase) {
  if (!phase) throw new Error('phase required');
  const phaseInfo = findPhaseInternal(cwd, phase);
  if (!phaseInfo || !phaseInfo.found) return { error: 'Phase not found', phase };

  const errors = [];
  const warnings = [];
  const phaseDir = path.join(cwd, phaseInfo.directory);

  let files;
  try { files = fs.readdirSync(phaseDir); } catch { return { error: 'Cannot read phase directory' }; }

  const plans = files.filter(f => f.match(/-PLAN\.md$/i));
  const summaries = files.filter(f => f.match(/-SUMMARY\.md$/i));

  const planIds = new Set(plans.map(p => p.replace(/-PLAN\.md$/i, '')));
  const summaryIds = new Set(summaries.map(s => s.replace(/-SUMMARY\.md$/i, '')));

  const incompletePlans = [...planIds].filter(id => !summaryIds.has(id));
  if (incompletePlans.length > 0) errors.push(`Plans without summaries: ${incompletePlans.join(', ')}`);

  const orphanSummaries = [...summaryIds].filter(id => !planIds.has(id));
  if (orphanSummaries.length > 0) warnings.push(`Summaries without plans: ${orphanSummaries.join(', ')}`);

  return {
    complete: errors.length === 0,
    phase: phaseInfo.phase_number,
    plan_count: plans.length,
    summary_count: summaries.length,
    incomplete_plans: incompletePlans,
    orphan_summaries: orphanSummaries,
    errors,
    warnings,
  };
}

function cmdVerifyReferences(cwd, filePath) {
  if (!filePath) throw new Error('file path required');
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const content = safeReadFile(fullPath);
  if (!content) return { error: 'File not found', path: filePath };

  const found = [];
  const missing = [];

  const atRefs = content.match(/@([^\s\n,)]+\/[^\s\n,)]+)/g) || [];
  for (const ref of atRefs) {
    const cleanRef = ref.slice(1);
    const resolved = cleanRef.startsWith('~/')
      ? path.join(require('os').homedir(), cleanRef.slice(2))
      : path.join(cwd, cleanRef);
    if (fs.existsSync(resolved)) found.push(cleanRef);
    else missing.push(cleanRef);
  }

  const backtickRefs = content.match(/`([^`]+\/[^`]+\.[a-zA-Z]{1,10})`/g) || [];
  for (const ref of backtickRefs) {
    const cleanRef = ref.slice(1, -1);
    if (cleanRef.startsWith('http') || cleanRef.includes('${') || cleanRef.includes('{{')) continue;
    if (found.includes(cleanRef) || missing.includes(cleanRef)) continue;
    const resolved = path.join(cwd, cleanRef);
    if (fs.existsSync(resolved)) found.push(cleanRef);
    else missing.push(cleanRef);
  }

  return { valid: missing.length === 0, found: found.length, missing, total: found.length + missing.length };
}

function cmdVerifyCommits(cwd, hashes) {
  if (!hashes || hashes.length === 0) throw new Error('At least one commit hash required');

  const valid = [];
  const invalid = [];
  for (const hash of hashes) {
    const result = execGit(cwd, ['cat-file', '-t', hash]);
    if (result.exitCode === 0 && result.stdout.trim() === 'commit') valid.push(hash);
    else invalid.push(hash);
  }

  return { all_valid: invalid.length === 0, valid, invalid, total: hashes.length };
}

function cmdVerifyArtifacts(cwd, planFilePath) {
  if (!planFilePath) throw new Error('plan file path required');
  const fullPath = path.isAbsolute(planFilePath) ? planFilePath : path.join(cwd, planFilePath);
  const content = safeReadFile(fullPath);
  if (!content) return { error: 'File not found', path: planFilePath };

  const artifacts = parseMustHavesBlock(content, 'artifacts');
  if (artifacts.length === 0) return { error: 'No must_haves.artifacts found in frontmatter', path: planFilePath };

  const results = [];
  for (const artifact of artifacts) {
    if (typeof artifact === 'string') continue;
    const artPath = artifact.path;
    if (!artPath) continue;

    const artFullPath = path.join(cwd, artPath);
    const exists = fs.existsSync(artFullPath);
    const check = { path: artPath, exists, issues: [], passed: false };

    if (exists) {
      const fileContent = safeReadFile(artFullPath) || '';
      const lineCount = fileContent.split('\n').length;

      if (artifact.min_lines && lineCount < artifact.min_lines) check.issues.push(`Only ${lineCount} lines, need ${artifact.min_lines}`);
      if (artifact.contains && !fileContent.includes(artifact.contains)) check.issues.push(`Missing pattern: ${artifact.contains}`);
      if (artifact.exports) {
        const exports = Array.isArray(artifact.exports) ? artifact.exports : [artifact.exports];
        for (const exp of exports) {
          if (!fileContent.includes(exp)) check.issues.push(`Missing export: ${exp}`);
        }
      }
      check.passed = check.issues.length === 0;
    } else {
      check.issues.push('File not found');
    }

    results.push(check);
  }

  const passed = results.filter(r => r.passed).length;
  return { all_passed: passed === results.length, passed, total: results.length, artifacts: results };
}

function cmdVerifyKeyLinks(cwd, planFilePath) {
  if (!planFilePath) throw new Error('plan file path required');
  const fullPath = path.isAbsolute(planFilePath) ? planFilePath : path.join(cwd, planFilePath);
  const content = safeReadFile(fullPath);
  if (!content) return { error: 'File not found', path: planFilePath };

  const keyLinks = parseMustHavesBlock(content, 'key_links');
  if (keyLinks.length === 0) return { error: 'No must_haves.key_links found in frontmatter', path: planFilePath };

  const results = [];
  for (const link of keyLinks) {
    if (typeof link === 'string') continue;
    const check = { from: link.from, to: link.to, via: link.via || '', verified: false, detail: '' };

    const sourceContent = safeReadFile(path.join(cwd, link.from || ''));
    if (!sourceContent) {
      check.detail = 'Source file not found';
    } else if (link.pattern) {
      try {
        const regex = new RegExp(link.pattern);
        if (regex.test(sourceContent)) {
          check.verified = true;
          check.detail = 'Pattern found in source';
        } else {
          const targetContent = safeReadFile(path.join(cwd, link.to || ''));
          if (targetContent && regex.test(targetContent)) {
            check.verified = true;
            check.detail = 'Pattern found in target';
          } else {
            check.detail = `Pattern "${link.pattern}" not found in source or target`;
          }
        }
      } catch {
        check.detail = `Invalid regex pattern: ${link.pattern}`;
      }
    } else {
      if (sourceContent.includes(link.to || '')) {
        check.verified = true;
        check.detail = 'Target referenced in source';
      } else {
        check.detail = 'Target not referenced in source';
      }
    }

    results.push(check);
  }

  const verified = results.filter(r => r.verified).length;
  return { all_verified: verified === results.length, verified, total: results.length, links: results };
}

function cmdValidateConsistency(cwd) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(roadmapPath)) {
    return { passed: false, errors: [{ code: 'E001', message: 'ROADMAP.md not found' }], warnings };
  }

  const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');

  const roadmapPhases = new Set();
  const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:/gi;
  let m;
  while ((m = phasePattern.exec(roadmapContent)) !== null) roadmapPhases.add(m[1]);

  const diskPhases = new Set();
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+[A-Z]?(?:\.\d+)*)/i);
      if (dm) diskPhases.add(dm[1]);
    }
  } catch {}

  for (const p of roadmapPhases) {
    if (!diskPhases.has(p) && !diskPhases.has(normalizePhaseName(p))) {
      warnings.push(`Phase ${p} in ROADMAP.md but no directory on disk`);
    }
  }

  for (const p of diskPhases) {
    const unpadded = String(parseInt(p, 10));
    if (!roadmapPhases.has(p) && !roadmapPhases.has(unpadded)) {
      warnings.push(`Phase ${p} exists on disk but not in ROADMAP.md`);
    }
  }

  const integerPhases = [...diskPhases].filter(p => !p.includes('.')).map(p => parseInt(p, 10)).sort((a, b) => a - b);
  for (let i = 1; i < integerPhases.length; i++) {
    if (integerPhases[i] !== integerPhases[i - 1] + 1) {
      warnings.push(`Gap in phase numbering: ${integerPhases[i - 1]} → ${integerPhases[i]}`);
    }
  }

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md')).sort();
      const planNums = plans.map(p => {
        const pm = p.match(/-(\d{2})-PLAN\.md$/);
        return pm ? parseInt(pm[1], 10) : null;
      }).filter(n => n !== null);

      for (let i = 1; i < planNums.length; i++) {
        if (planNums[i] !== planNums[i - 1] + 1) {
          warnings.push(`Gap in plan numbering in ${dir}: plan ${planNums[i - 1]} → ${planNums[i]}`);
        }
      }

      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md'));
      const planIds = new Set(plans.map(p => p.replace('-PLAN.md', '')));
      const summaryIds = new Set(summaries.map(s => s.replace('-SUMMARY.md', '')));

      for (const sid of summaryIds) {
        if (!planIds.has(sid)) warnings.push(`Summary ${sid}-SUMMARY.md in ${dir} has no matching PLAN.md`);
      }
    }
  } catch {}

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    for (const dir of dirs) {
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md'));

      for (const plan of plans) {
        const content = fs.readFileSync(path.join(phasesDir, dir, plan), 'utf-8');
        const fm = extractFrontmatter(content);
        if (!fm.wave) warnings.push(`${dir}/${plan}: missing 'wave' in frontmatter`);
      }
    }
  } catch {}

  return { passed: errors.length === 0, errors, warnings, warning_count: warnings.length };
}

function cmdValidateHealth(cwd, options) {
  const planningDir = path.join(cwd, '.planning');
  const projectPath = path.join(planningDir, 'PROJECT.md');
  const roadmapPath = path.join(planningDir, 'ROADMAP.md');
  const statePath = path.join(planningDir, 'STATE.md');
  const configPath = path.join(planningDir, 'config.json');
  const phasesDir = path.join(planningDir, 'phases');

  const errors = [];
  const warnings = [];
  const info = [];
  const repairs = [];

  const addIssue = (severity, code, message, fix, repairable = false) => {
    const issue = { code, message, fix, repairable };
    if (severity === 'error') errors.push(issue);
    else if (severity === 'warning') warnings.push(issue);
    else info.push(issue);
  };

  if (!fs.existsSync(planningDir)) {
    addIssue('error', 'E001', '.planning/ directory not found', 'Run /gsd:new-project to initialize');
    return { status: 'broken', errors, warnings, info, repairable_count: 0 };
  }

  if (!fs.existsSync(projectPath)) {
    addIssue('error', 'E002', 'PROJECT.md not found', 'Run /gsd:new-project to create');
  } else {
    const content = fs.readFileSync(projectPath, 'utf-8');
    const requiredSections = ['## What This Is', '## Core Value', '## Requirements'];
    for (const section of requiredSections) {
      if (!content.includes(section)) addIssue('warning', 'W001', `PROJECT.md missing section: ${section}`, 'Add section manually');
    }
  }

  if (!fs.existsSync(roadmapPath)) {
    addIssue('error', 'E003', 'ROADMAP.md not found', 'Run /gsd:new-milestone to create roadmap');
  }

  if (!fs.existsSync(statePath)) {
    addIssue('error', 'E004', 'STATE.md not found', 'Run /gsd:health --repair to regenerate', true);
    repairs.push('regenerateState');
  } else {
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    const phaseRefs = [...stateContent.matchAll(/[Pp]hase\s+(\d+(?:\.\d+)*)/g)].map(m => m[1]);
    const diskPhases = new Set();
    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) { const m = e.name.match(/^(\d+(?:\.\d+)*)/); if (m) diskPhases.add(m[1]); }
      }
    } catch {}
    for (const ref of phaseRefs) {
      const normalizedRef = String(parseInt(ref, 10)).padStart(2, '0');
      if (!diskPhases.has(ref) && !diskPhases.has(normalizedRef) && !diskPhases.has(String(parseInt(ref, 10)))) {
        if (diskPhases.size > 0) {
          addIssue('warning', 'W002', `STATE.md references phase ${ref}, but only phases ${[...diskPhases].sort().join(', ')} exist`, 'Run /gsd:health --repair to regenerate STATE.md', true);
          if (!repairs.includes('regenerateState')) repairs.push('regenerateState');
        }
      }
    }
  }

  if (!fs.existsSync(configPath)) {
    addIssue('warning', 'W003', 'config.json not found', 'Run /gsd:health --repair to create with defaults', true);
    repairs.push('createConfig');
  } else {
    try {
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      const validProfiles = ['quality', 'balanced', 'budget'];
      if (parsed.model_profile && !validProfiles.includes(parsed.model_profile)) {
        addIssue('warning', 'W004', `config.json: invalid model_profile "${parsed.model_profile}"`, `Valid values: ${validProfiles.join(', ')}`);
      }
    } catch (err) {
      addIssue('error', 'E005', `config.json: JSON parse error - ${err.message}`, 'Run /gsd:health --repair to reset to defaults', true);
      repairs.push('resetConfig');
    }
  }

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.match(/^\d{2}(?:\.\d+)*-[\w-]+$/)) {
        addIssue('warning', 'W005', `Phase directory "${e.name}" doesn't follow NN-name format`, 'Rename to match pattern (e.g., 01-setup)');
      }
    }
  } catch {}

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const phaseFiles = fs.readdirSync(path.join(phasesDir, e.name));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const summaryBases = new Set(summaries.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', '')));
      for (const plan of plans) {
        const planBase = plan.replace('-PLAN.md', '').replace('PLAN.md', '');
        if (!summaryBases.has(planBase)) addIssue('info', 'I001', `${e.name}/${plan} has no SUMMARY.md`, 'May be in progress');
      }
    }
  } catch {}

  if (fs.existsSync(roadmapPath)) {
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    const roadmapPhases = new Set();
    const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:/gi;
    let m;
    while ((m = phasePattern.exec(roadmapContent)) !== null) roadmapPhases.add(m[1]);

    const diskPhases = new Set();
    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) { const dm = e.name.match(/^(\d+[A-Z]?(?:\.\d+)*)/i); if (dm) diskPhases.add(dm[1]); }
      }
    } catch {}

    for (const p of roadmapPhases) {
      const padded = String(parseInt(p, 10)).padStart(2, '0');
      if (!diskPhases.has(p) && !diskPhases.has(padded)) {
        addIssue('warning', 'W006', `Phase ${p} in ROADMAP.md but no directory on disk`, 'Create phase directory or remove from roadmap');
      }
    }
    for (const p of diskPhases) {
      const unpadded = String(parseInt(p, 10));
      if (!roadmapPhases.has(p) && !roadmapPhases.has(unpadded)) {
        addIssue('warning', 'W007', `Phase ${p} exists on disk but not in ROADMAP.md`, 'Add to roadmap or remove directory');
      }
    }
  }

  const repairActions = [];
  if (options && options.repair && repairs.length > 0) {
    for (const repair of repairs) {
      try {
        switch (repair) {
          case 'createConfig':
          case 'resetConfig': {
            const defaults = {
              model_profile: 'balanced', commit_docs: true, search_gitignored: false,
              branching_strategy: 'none', research: true, plan_checker: true,
              verifier: true, parallelization: true,
            };
            fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), 'utf-8');
            repairActions.push({ action: repair, success: true, path: 'config.json' });
            break;
          }
          case 'regenerateState': {
            if (fs.existsSync(statePath)) {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
              const backupPath = `${statePath}.bak-${timestamp}`;
              fs.copyFileSync(statePath, backupPath);
              repairActions.push({ action: 'backupState', success: true, path: backupPath });
            }
            const milestone = getMilestoneInfo(cwd);
            let stateContent = `# Session State\n\n`;
            stateContent += `## Project Reference\n\nSee: .planning/PROJECT.md\n\n`;
            stateContent += `## Position\n\n`;
            stateContent += `**Milestone:** ${milestone.version} ${milestone.name}\n`;
            stateContent += `**Current phase:** (determining...)\n`;
            stateContent += `**Status:** Resuming\n\n`;
            stateContent += `## Session Log\n\n`;
            stateContent += `- ${new Date().toISOString().split('T')[0]}: STATE.md regenerated by /gsd:health --repair\n`;
            fs.writeFileSync(statePath, stateContent, 'utf-8');
            repairActions.push({ action: repair, success: true, path: 'STATE.md' });
            break;
          }
        }
      } catch (err) {
        repairActions.push({ action: repair, success: false, error: err.message });
      }
    }
  }

  let status;
  if (errors.length > 0) status = 'broken';
  else if (warnings.length > 0) status = 'degraded';
  else status = 'healthy';

  const repairableCount = errors.filter(e => e.repairable).length + warnings.filter(w => w.repairable).length;

  return {
    status,
    errors,
    warnings,
    info,
    repairable_count: repairableCount,
    repairs_performed: repairActions.length > 0 ? repairActions : undefined,
  };
}

module.exports = {
  cmdVerifySummary,
  cmdVerifyPlanStructure,
  cmdVerifyPhaseCompleteness,
  cmdVerifyReferences,
  cmdVerifyCommits,
  cmdVerifyArtifacts,
  cmdVerifyKeyLinks,
  cmdValidateConsistency,
  cmdValidateHealth,
};
