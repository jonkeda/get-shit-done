/**
 * Milestone — Milestone and requirements lifecycle operations (MCP port)
 */

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.js');

function cmdRequirementsMarkComplete(cwd, reqIdsRaw) {
  if (!reqIdsRaw || reqIdsRaw.length === 0) throw new Error('requirement IDs required');

  const reqIds = (Array.isArray(reqIdsRaw) ? reqIdsRaw.join(' ') : String(reqIdsRaw))
    .replace(/[\[\]]/g, '')
    .split(/[,\s]+/)
    .map(r => r.trim())
    .filter(Boolean);

  if (reqIds.length === 0) throw new Error('no valid requirement IDs found');

  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  if (!fs.existsSync(reqPath)) {
    return { updated: false, reason: 'REQUIREMENTS.md not found', ids: reqIds };
  }

  let reqContent = fs.readFileSync(reqPath, 'utf-8');
  const updated = [];
  const notFound = [];

  for (const reqId of reqIds) {
    let found = false;

    const checkboxPattern = new RegExp(`(-\\s*\\[)[ ](\\]\\s*\\*\\*${reqId}\\*\\*)`, 'gi');
    if (checkboxPattern.test(reqContent)) {
      reqContent = reqContent.replace(new RegExp(`(-\\s*\\[)[ ](\\]\\s*\\*\\*${reqId}\\*\\*)`, 'gi'), '$1x$2');
      found = true;
    }

    const tablePattern = new RegExp(`(\\|\\s*${reqId}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi');
    if (tablePattern.test(reqContent)) {
      reqContent = reqContent.replace(
        new RegExp(`(\\|\\s*${reqId}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi'),
        '$1 Complete $2'
      );
      found = true;
    }

    if (found) updated.push(reqId);
    else notFound.push(reqId);
  }

  if (updated.length > 0) {
    fs.writeFileSync(reqPath, reqContent, 'utf-8');
  }

  return {
    updated: updated.length > 0,
    marked_complete: updated,
    not_found: notFound,
    total: reqIds.length,
  };
}

function cmdMilestoneComplete(cwd, version, options) {
  if (!version) throw new Error('version required for milestone complete (e.g., v1.0)');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const milestonesPath = path.join(cwd, '.planning', 'MILESTONES.md');
  const archiveDir = path.join(cwd, '.planning', 'milestones');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const today = new Date().toISOString().split('T')[0];
  const milestoneName = (options && options.name) || version;

  fs.mkdirSync(archiveDir, { recursive: true });

  let phaseCount = 0;
  let totalPlans = 0;
  let totalTasks = 0;
  const accomplishments = [];

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();

    for (const dir of dirs) {
      phaseCount++;
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      totalPlans += plans.length;

      for (const s of summaries) {
        try {
          const content = fs.readFileSync(path.join(phasesDir, dir, s), 'utf-8');
          const fm = extractFrontmatter(content);
          if (fm['one-liner']) accomplishments.push(fm['one-liner']);
          const taskMatches = content.match(/##\s*Task\s*\d+/gi) || [];
          totalTasks += taskMatches.length;
        } catch {}
      }
    }
  } catch {}

  if (fs.existsSync(roadmapPath)) {
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    fs.writeFileSync(path.join(archiveDir, `${version}-ROADMAP.md`), roadmapContent, 'utf-8');
  }

  if (fs.existsSync(reqPath)) {
    const reqContent = fs.readFileSync(reqPath, 'utf-8');
    const archiveHeader = `# Requirements Archive: ${version} ${milestoneName}\n\n**Archived:** ${today}\n**Status:** SHIPPED\n\nFor current requirements, see \`.planning/REQUIREMENTS.md\`.\n\n---\n\n`;
    fs.writeFileSync(path.join(archiveDir, `${version}-REQUIREMENTS.md`), archiveHeader + reqContent, 'utf-8');
  }

  const auditFile = path.join(cwd, '.planning', `${version}-MILESTONE-AUDIT.md`);
  if (fs.existsSync(auditFile)) {
    fs.renameSync(auditFile, path.join(archiveDir, `${version}-MILESTONE-AUDIT.md`));
  }

  const accomplishmentsList = accomplishments.map(a => `- ${a}`).join('\n');
  const milestoneEntry = `## ${version} ${milestoneName} (Shipped: ${today})\n\n**Phases completed:** ${phaseCount} phases, ${totalPlans} plans, ${totalTasks} tasks\n\n**Key accomplishments:**\n${accomplishmentsList || '- (none recorded)'}\n\n---\n\n`;

  if (fs.existsSync(milestonesPath)) {
    const existing = fs.readFileSync(milestonesPath, 'utf-8');
    fs.writeFileSync(milestonesPath, existing + '\n' + milestoneEntry, 'utf-8');
  } else {
    fs.writeFileSync(milestonesPath, `# Milestones\n\n${milestoneEntry}`, 'utf-8');
  }

  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    stateContent = stateContent.replace(/(\*\*Status:\*\*\s*).*/, `$1${version} milestone complete`);
    stateContent = stateContent.replace(/(\*\*Last Activity:\*\*\s*).*/, `$1${today}`);
    stateContent = stateContent.replace(/(\*\*Last Activity Description:\*\*\s*).*/, `$1${version} milestone completed and archived`);
    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  let phasesArchived = false;
  if (options && options.archivePhases) {
    try {
      const phaseArchiveDir = path.join(archiveDir, `${version}-phases`);
      fs.mkdirSync(phaseArchiveDir, { recursive: true });
      const phaseEntries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const phaseDirNames = phaseEntries.filter(e => e.isDirectory()).map(e => e.name);
      for (const dir of phaseDirNames) {
        fs.renameSync(path.join(phasesDir, dir), path.join(phaseArchiveDir, dir));
      }
      phasesArchived = phaseDirNames.length > 0;
    } catch {}
  }

  return {
    version,
    name: milestoneName,
    date: today,
    phases: phaseCount,
    plans: totalPlans,
    tasks: totalTasks,
    accomplishments,
    archived: {
      roadmap: fs.existsSync(path.join(archiveDir, `${version}-ROADMAP.md`)),
      requirements: fs.existsSync(path.join(archiveDir, `${version}-REQUIREMENTS.md`)),
      audit: fs.existsSync(path.join(archiveDir, `${version}-MILESTONE-AUDIT.md`)),
      phases: phasesArchived,
    },
    milestones_updated: true,
    state_updated: fs.existsSync(statePath),
  };
}

function cmdMilestoneStats(cwd) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');

  let totalPhases = 0, completedPhases = 0, totalPlans = 0, totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    totalPhases = dirs.length;

    for (const dir of dirs) {
      const files = fs.readdirSync(path.join(phasesDir, dir));
      const plans = files.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;
      totalPlans += plans;
      totalSummaries += summaries;
      if (plans > 0 && summaries >= plans) completedPhases++;
    }
  } catch {}

  // Roadmap phase count (may differ from disk if phases haven't been created yet)
  let roadmapPhaseCount = 0;
  try {
    const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    const matches = roadmap.match(/#{2,4}\s*Phase\s+\d/gi);
    roadmapPhaseCount = matches ? matches.length : 0;
  } catch {}

  // Requirements coverage
  let reqTotal = 0, reqComplete = 0;
  try {
    const reqContent = fs.readFileSync(reqPath, 'utf-8');
    const checkboxes = reqContent.match(/-\s*\[[ x]\]\s*\*\*\w+-\d+\*\*/gi) || [];
    reqTotal = checkboxes.length;
    reqComplete = checkboxes.filter(c => /\[x\]/i.test(c)).length;

    if (reqTotal === 0) {
      const tableRows = reqContent.match(/\|\s*\w+-\d+\s*\|/gi) || [];
      reqTotal = tableRows.length;
      reqComplete = (reqContent.match(/\|\s*Complete\s*\|/gi) || []).length;
    }
  } catch {}

  // Blockers count
  let blockersCount = 0;
  try {
    const stateContent = fs.readFileSync(statePath, 'utf-8');
    const blockersSection = stateContent.match(/## Blockers\n([\s\S]*?)(?=\n##\s|\n$|$)/);
    if (blockersSection) {
      const lines = blockersSection[1].split('\n').filter(l => /^-\s+/.test(l) && !/^-\s+~~/.test(l) && !/none/i.test(l));
      blockersCount = lines.length;
    }
  } catch {}

  return {
    totalPhases: Math.max(totalPhases, roadmapPhaseCount),
    completedPhases,
    remainingPhases: Math.max(totalPhases, roadmapPhaseCount) - completedPhases,
    totalPlans,
    totalSummaries,
    planProgress: totalPlans > 0 ? Math.round((totalSummaries / totalPlans) * 100) : 0,
    requirementsCoverage: { total: reqTotal, complete: reqComplete, percent: reqTotal > 0 ? Math.round((reqComplete / reqTotal) * 100) : 0 },
    blockersCount,
  };
}

module.exports = {
  cmdRequirementsMarkComplete,
  cmdMilestoneComplete,
  cmdMilestoneStats,
};
