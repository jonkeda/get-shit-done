/**
 * Commands — Standalone utility commands
 * Ported from get-shit-done/bin/lib/commands.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, isGitIgnored, execGit, normalizePhaseName, comparePhaseNum, getArchivedPhaseDirs, generateSlugInternal, getMilestoneInfo, resolveModelInternal, MODEL_PROFILES, findPhaseInternal } = require('./core.js');
const { extractFrontmatter } = require('./frontmatter.js');

function cmdGenerateSlug(text) {
  if (!text) throw new Error('text required for slug generation');
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return { slug };
}

function cmdCurrentTimestamp(format) {
  const now = new Date();
  let result;
  switch (format) {
    case 'date':
      result = now.toISOString().split('T')[0];
      break;
    case 'filename':
      result = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      break;
    case 'full':
    default:
      result = now.toISOString();
      break;
  }
  return { timestamp: result };
}

function cmdListTodos(cwd, area) {
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  let count = 0;
  const todos = [];

  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);
        const todoArea = areaMatch ? areaMatch[1].trim() : 'general';
        if (area && todoArea !== area) continue;
        count++;
        todos.push({
          file,
          created: createdMatch ? createdMatch[1].trim() : 'unknown',
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          area: todoArea,
          path: path.join('.planning', 'todos', 'pending', file),
        });
      } catch {}
    }
  } catch {}

  return { count, todos };
}

function cmdVerifyPathExists(cwd, targetPath) {
  if (!targetPath) throw new Error('path required for verification');
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  try {
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    return { exists: true, type };
  } catch {
    return { exists: false, type: null };
  }
}

function cmdResolveModel(cwd, agentType) {
  if (!agentType) throw new Error('agent-type required');
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) {
    return { model: 'sonnet', profile, unknown_agent: true };
  }
  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';
  const model = resolved === 'opus' ? 'inherit' : resolved;
  return { model, profile };
}

function cmdCommit(cwd, message, files, amend) {
  if (!message && !amend) throw new Error('commit message required');

  const config = loadConfig(cwd);

  if (!config.commit_docs) {
    return { committed: false, hash: null, reason: 'skipped_commit_docs_false' };
  }

  if (isGitIgnored(cwd, '.planning')) {
    return { committed: false, hash: null, reason: 'skipped_gitignored' };
  }

  const filesToStage = files && files.length > 0 ? files : ['.planning/'];
  for (const file of filesToStage) {
    execGit(cwd, ['add', file]);
  }

  const commitArgs = amend ? ['commit', '--amend', '--no-edit'] : ['commit', '-m', message];
  const commitResult = execGit(cwd, commitArgs);
  if (commitResult.exitCode !== 0) {
    if ((commitResult.stdout + commitResult.stderr).includes('nothing to commit')) {
      return { committed: false, hash: null, reason: 'nothing_to_commit' };
    }
    return { committed: false, hash: null, reason: 'commit_failed', error: commitResult.stderr };
  }

  const hashResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const hash = hashResult.exitCode === 0 ? hashResult.stdout : null;
  return { committed: true, hash, reason: 'committed' };
}

function cmdSummaryExtract(cwd, summaryPath, fields) {
  if (!summaryPath) throw new Error('summary-path required for summary-extract');
  const fullPath = path.join(cwd, summaryPath);
  if (!fs.existsSync(fullPath)) {
    return { error: 'File not found', path: summaryPath };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);

  const parseDecisions = (decisionsList) => {
    if (!decisionsList || !Array.isArray(decisionsList)) return [];
    return decisionsList.map(d => {
      const colonIdx = d.indexOf(':');
      if (colonIdx > 0) {
        return { summary: d.substring(0, colonIdx).trim(), rationale: d.substring(colonIdx + 1).trim() };
      }
      return { summary: d, rationale: null };
    });
  };

  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    decisions: parseDecisions(fm['key-decisions']),
    requirements_completed: fm['requirements-completed'] || [],
  };

  if (fields && fields.length > 0) {
    const filtered = { path: summaryPath };
    for (const field of fields) {
      if (fullResult[field] !== undefined) filtered[field] = fullResult[field];
    }
    return filtered;
  }
  return fullResult;
}

function cmdProgressRender(cwd, format) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const milestone = getMilestoneInfo(cwd);
  const phases = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNum = dm ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;
      totalPlans += plans;
      totalSummaries += summaries;
      let status;
      if (plans === 0) status = 'Pending';
      else if (summaries >= plans) status = 'Complete';
      else if (summaries > 0) status = 'In Progress';
      else status = 'Planned';
      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch {}

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  if (format === 'table') {
    const barWidth = 10;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    let out = `# ${milestone.version} ${milestone.name}\n\n`;
    out += `**Progress:** [${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)\n\n`;
    out += `| Phase | Name | Plans | Status |\n`;
    out += `|-------|------|-------|--------|\n`;
    for (const p of phases) {
      out += `| ${p.number} | ${p.name} | ${p.summaries}/${p.plans} | ${p.status} |\n`;
    }
    return { rendered: out };
  } else if (format === 'bar') {
    const barWidth = 20;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const text = `[${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)`;
    return { bar: text, percent, completed: totalSummaries, total: totalPlans };
  }
  return {
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    phases,
    total_plans: totalPlans,
    total_summaries: totalSummaries,
    percent,
  };
}

function cmdTodoComplete(cwd, filename) {
  if (!filename) throw new Error('filename required for todo complete');
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  const completedDir = path.join(cwd, '.planning', 'todos', 'completed');
  const sourcePath = path.join(pendingDir, filename);
  if (!fs.existsSync(sourcePath)) throw new Error(`Todo not found: ${filename}`);

  fs.mkdirSync(completedDir, { recursive: true });
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  content = `completed: ${today}\n` + content;
  fs.writeFileSync(path.join(completedDir, filename), content, 'utf-8');
  fs.unlinkSync(sourcePath);
  return { completed: true, file: filename, date: today };
}

function cmdScaffold(cwd, type, options) {
  const { phase, name } = options;
  const padded = phase ? normalizePhaseName(phase) : '00';
  const today = new Date().toISOString().split('T')[0];
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  const phaseDir = phaseInfo ? path.join(cwd, phaseInfo.directory) : null;

  if (phase && !phaseDir && type !== 'phase-dir') {
    throw new Error(`Phase ${phase} directory not found`);
  }

  let filePath, content;

  switch (type) {
    case 'context': {
      filePath = path.join(phaseDir, `${padded}-CONTEXT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Context\n\n## Decisions\n\n_Decisions will be captured during /gsd:discuss-phase ${phase}_\n\n## Discretion Areas\n\n_Areas where the executor can use judgment_\n\n## Deferred Ideas\n\n_Ideas to consider later_\n`;
      break;
    }
    case 'uat': {
      filePath = path.join(phaseDir, `${padded}-UAT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — User Acceptance Testing\n\n## Test Results\n\n| # | Test | Status | Notes |\n|---|------|--------|-------|\n\n## Summary\n\n_Pending UAT_\n`;
      break;
    }
    case 'verification': {
      filePath = path.join(phaseDir, `${padded}-VERIFICATION.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Verification\n\n## Goal-Backward Verification\n\n**Phase Goal:** [From ROADMAP.md]\n\n## Checks\n\n| # | Requirement | Status | Evidence |\n|---|------------|--------|----------|\n\n## Result\n\n_Pending verification_\n`;
      break;
    }
    case 'phase-dir': {
      if (!phase || !name) throw new Error('phase and name required for phase-dir scaffold');
      const slug = generateSlugInternal(name);
      const dirName = `${padded}-${slug}`;
      const phasesParent = path.join(cwd, '.planning', 'phases');
      fs.mkdirSync(phasesParent, { recursive: true });
      const dirPath = path.join(phasesParent, dirName);
      fs.mkdirSync(dirPath, { recursive: true });
      return { created: true, directory: `.planning/phases/${dirName}`, path: dirPath };
    }
    default:
      throw new Error(`Unknown scaffold type: ${type}. Available: context, uat, verification, phase-dir`);
  }

  if (fs.existsSync(filePath)) {
    return { created: false, reason: 'already_exists', path: filePath };
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const relPath = path.relative(cwd, filePath);
  return { created: true, path: relPath };
}

function cmdHistoryDigest(cwd, phase) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const digest = { phases: {}, decisions: [], tech_stack: new Set() };

  const allPhaseDirs = [];
  const archived = getArchivedPhaseDirs(cwd);
  for (const a of archived) {
    allPhaseDirs.push({ name: a.name, fullPath: a.fullPath, milestone: a.milestone });
  }

  if (fs.existsSync(phasesDir)) {
    try {
      const currentDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
        .filter(e => e.isDirectory()).map(e => e.name).sort();
      for (const dir of currentDirs) {
        allPhaseDirs.push({ name: dir, fullPath: path.join(phasesDir, dir), milestone: null });
      }
    } catch {}
  }

  if (allPhaseDirs.length === 0) {
    digest.tech_stack = [];
    return digest;
  }

  for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
    try {
      const summaries = fs.readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      for (const summary of summaries) {
        try {
          const content = fs.readFileSync(path.join(dirPath, summary), 'utf-8');
          const fm = extractFrontmatter(content);
          const phaseNum = fm.phase || dir.split('-')[0];

          if (!digest.phases[phaseNum]) {
            digest.phases[phaseNum] = {
              name: fm.name || dir.split('-').slice(1).join(' ') || 'Unknown',
              provides: new Set(), affects: new Set(), patterns: new Set(),
            };
          }

          if (fm['dependency-graph'] && fm['dependency-graph'].provides) {
            fm['dependency-graph'].provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          } else if (fm.provides) {
            (Array.isArray(fm.provides) ? fm.provides : [fm.provides]).forEach(p => digest.phases[phaseNum].provides.add(p));
          }
          if (fm['dependency-graph'] && fm['dependency-graph'].affects) {
            fm['dependency-graph'].affects.forEach(a => digest.phases[phaseNum].affects.add(a));
          }
          if (fm['patterns-established']) {
            (Array.isArray(fm['patterns-established']) ? fm['patterns-established'] : [fm['patterns-established']]).forEach(p => digest.phases[phaseNum].patterns.add(p));
          }
          if (fm['key-decisions']) {
            (Array.isArray(fm['key-decisions']) ? fm['key-decisions'] : [fm['key-decisions']]).forEach(d => {
              digest.decisions.push({ phase: phaseNum, decision: d });
            });
          }
          if (fm['tech-stack'] && fm['tech-stack'].added) {
            fm['tech-stack'].added.forEach(t => digest.tech_stack.add(typeof t === 'string' ? t : t.name));
          }
        } catch {}
      }
    } catch {}
  }

  // If a specific phase was requested, filter to just that phase
  if (phase) {
    const normalized = String(phase).padStart(2, '0');
    const filtered = {};
    for (const [k, v] of Object.entries(digest.phases)) {
      if (k === phase || k === normalized || k.startsWith(phase + '.') || k.startsWith(normalized + '.')) {
        filtered[k] = v;
      }
    }
    digest.phases = filtered;
  }

  Object.keys(digest.phases).forEach(p => {
    digest.phases[p].provides = [...digest.phases[p].provides];
    digest.phases[p].affects = [...digest.phases[p].affects];
    digest.phases[p].patterns = [...digest.phases[p].patterns];
  });
  digest.tech_stack = [...digest.tech_stack];

  return digest;
}

// Deferred to Phase 2: cmdWebsearch

module.exports = {
  cmdGenerateSlug,
  cmdCurrentTimestamp,
  cmdListTodos,
  cmdVerifyPathExists,
  cmdResolveModel,
  cmdCommit,
  cmdSummaryExtract,
  cmdProgressRender,
  cmdTodoComplete,
  cmdScaffold,
  cmdHistoryDigest,
};
