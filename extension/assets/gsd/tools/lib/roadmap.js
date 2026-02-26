/**
 * Roadmap — Roadmap parsing and update operations
 * Ported from get-shit-done/bin/lib/roadmap.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const { escapeRegex, normalizePhaseName, findPhaseInternal } = require('./core.js');

function cmdRoadmapGetPhase(cwd, phaseNum) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return { found: false, error: 'ROADMAP.md not found' };
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const escapedPhase = escapeRegex(phaseNum);

  const phasePattern = new RegExp(
    `#{2,4}\\s*Phase\\s+${escapedPhase}:\\s*([^\\n]+)`, 'i'
  );
  const headerMatch = content.match(phasePattern);

  if (!headerMatch) {
    const checklistPattern = new RegExp(
      `-\\s*\\[[ x]\\]\\s*\\*\\*Phase\\s+${escapedPhase}:\\s*([^*]+)\\*\\*`, 'i'
    );
    const checklistMatch = content.match(checklistPattern);
    if (checklistMatch) {
      return {
        found: false,
        phase_number: phaseNum,
        phase_name: checklistMatch[1].trim(),
        error: 'malformed_roadmap',
        message: `Phase ${phaseNum} exists in summary list but missing "### Phase ${phaseNum}:" detail section. ROADMAP.md needs both formats.`,
      };
    }
    return { found: false, phase_number: phaseNum };
  }

  const phaseName = headerMatch[1].trim();
  const headerIndex = headerMatch.index;
  const restOfContent = content.slice(headerIndex);
  const nextHeaderMatch = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
  const sectionEnd = nextHeaderMatch ? headerIndex + nextHeaderMatch.index : content.length;
  const section = content.slice(headerIndex, sectionEnd).trim();

  const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
  const goal = goalMatch ? goalMatch[1].trim() : null;

  const criteriaMatch = section.match(/\*\*Success Criteria\*\*[^\n]*:\s*\n((?:\s*\d+\.\s*[^\n]+\n?)+)/i);
  const success_criteria = criteriaMatch
    ? criteriaMatch[1].trim().split('\n').map(line => line.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean)
    : [];

  return {
    found: true,
    phase_number: phaseNum,
    phase_name: phaseName,
    goal,
    success_criteria,
    section,
  };
}

function cmdRoadmapAnalyze(cwd) {
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return { error: 'ROADMAP.md not found', milestones: [], phases: [], current_phase: null };
  }

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const phasesDir = path.join(cwd, '.planning', 'phases');

  const phasePattern = /#{2,4}\s*Phase\s+(\d+[A-Z]?(?:\.\d+)*)\s*:\s*([^\n]+)/gi;
  const phases = [];
  let match;

  while ((match = phasePattern.exec(content)) !== null) {
    const phaseNum = match[1];
    const phaseName = match[2].replace(/\(INSERTED\)/i, '').trim();

    const sectionStart = match.index;
    const restOfContent = content.slice(sectionStart);
    const nextHeader = restOfContent.match(/\n#{2,4}\s+Phase\s+\d/i);
    const sectionEnd = nextHeader ? sectionStart + nextHeader.index : content.length;
    const section = content.slice(sectionStart, sectionEnd);

    const goalMatch = section.match(/\*\*Goal:\*\*\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : null;

    const dependsMatch = section.match(/\*\*Depends on:\*\*\s*([^\n]+)/i);
    const depends_on = dependsMatch ? dependsMatch[1].trim() : null;

    const normalized = normalizePhaseName(phaseNum);
    let diskStatus = 'no_directory';
    let planCount = 0;
    let summaryCount = 0;
    let hasContext = false;
    let hasResearch = false;

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
      const dirMatch = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);

      if (dirMatch) {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dirMatch));
        planCount = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
        summaryCount = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;
        hasContext = phaseFiles.some(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
        hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');

        if (summaryCount >= planCount && planCount > 0) diskStatus = 'complete';
        else if (summaryCount > 0) diskStatus = 'partial';
        else if (planCount > 0) diskStatus = 'planned';
        else if (hasResearch) diskStatus = 'researched';
        else if (hasContext) diskStatus = 'discussed';
        else diskStatus = 'empty';
      }
    } catch {}

    const checkboxPattern = new RegExp(`-\\s*\\[(x| )\\]\\s*.*Phase\\s+${escapeRegex(phaseNum)}`, 'i');
    const checkboxMatch = content.match(checkboxPattern);
    const roadmapComplete = checkboxMatch ? checkboxMatch[1] === 'x' : false;

    phases.push({
      number: phaseNum,
      name: phaseName,
      goal,
      depends_on,
      plan_count: planCount,
      summary_count: summaryCount,
      has_context: hasContext,
      has_research: hasResearch,
      disk_status: diskStatus,
      roadmap_complete: roadmapComplete,
    });
  }

  const milestones = [];
  const milestonePattern = /##\s*(.*v(\d+\.\d+)[^(\n]*)/gi;
  let mMatch;
  while ((mMatch = milestonePattern.exec(content)) !== null) {
    milestones.push({ heading: mMatch[1].trim(), version: 'v' + mMatch[2] });
  }

  const currentPhase = phases.find(p => p.disk_status === 'planned' || p.disk_status === 'partial') || null;
  const nextPhase = phases.find(p => p.disk_status === 'empty' || p.disk_status === 'no_directory' || p.disk_status === 'discussed' || p.disk_status === 'researched') || null;

  const totalPlans = phases.reduce((sum, p) => sum + p.plan_count, 0);
  const totalSummaries = phases.reduce((sum, p) => sum + p.summary_count, 0);
  const completedPhases = phases.filter(p => p.disk_status === 'complete').length;

  const checklistPattern = /-\s*\[[ x]\]\s*\*\*Phase\s+(\d+[A-Z]?(?:\.\d+)*)/gi;
  const checklistPhases = new Set();
  let checklistMatch;
  while ((checklistMatch = checklistPattern.exec(content)) !== null) {
    checklistPhases.add(checklistMatch[1]);
  }
  const detailPhases = new Set(phases.map(p => p.number));
  const missingDetails = [...checklistPhases].filter(p => !detailPhases.has(p));

  return {
    milestones,
    phases,
    phase_count: phases.length,
    completed_phases: completedPhases,
    total_plans: totalPlans,
    total_summaries: totalSummaries,
    progress_percent: totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0,
    current_phase: currentPhase ? currentPhase.number : null,
    next_phase: nextPhase ? nextPhase.number : null,
    missing_phase_details: missingDetails.length > 0 ? missingDetails : null,
  };
}

function cmdRoadmapUpdatePlanProgress(cwd, phaseNum) {
  if (!phaseNum) throw new Error('phase number required for roadmap update-plan-progress');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const phaseInfo = findPhaseInternal(cwd, phaseNum);
  if (!phaseInfo) throw new Error(`Phase ${phaseNum} not found`);

  const planCount = phaseInfo.plans.length;
  const summaryCount = phaseInfo.summaries.length;

  if (planCount === 0) {
    return { updated: false, reason: 'No plans found', plan_count: 0, summary_count: 0 };
  }

  const isComplete = summaryCount >= planCount;
  const status = isComplete ? 'Complete' : summaryCount > 0 ? 'In Progress' : 'Planned';
  const today = new Date().toISOString().split('T')[0];

  if (!fs.existsSync(roadmapPath)) {
    return { updated: false, reason: 'ROADMAP.md not found', plan_count: planCount, summary_count: summaryCount };
  }

  let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
  const phaseEscaped = escapeRegex(phaseNum);

  const tablePattern = new RegExp(
    `(\\|\\s*${phaseEscaped}\\.?\\s[^|]*\\|)[^|]*(\\|)\\s*[^|]*(\\|)\\s*[^|]*(\\|)`, 'i'
  );
  const dateField = isComplete ? ` ${today} ` : '  ';
  roadmapContent = roadmapContent.replace(
    tablePattern,
    `$1 ${summaryCount}/${planCount} $2 ${status.padEnd(11)}$3${dateField}$4`
  );

  const planCountPattern = new RegExp(
    `(#{2,4}\\s*Phase\\s+${phaseEscaped}[\\s\\S]*?\\*\\*Plans:\\*\\*\\s*)[^\\n]+`, 'i'
  );
  const planCountText = isComplete
    ? `${summaryCount}/${planCount} plans complete`
    : `${summaryCount}/${planCount} plans executed`;
  roadmapContent = roadmapContent.replace(planCountPattern, `$1${planCountText}`);

  if (isComplete) {
    const checkboxPattern = new RegExp(
      `(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${phaseEscaped}[:\\s][^\\n]*)`, 'i'
    );
    roadmapContent = roadmapContent.replace(checkboxPattern, `$1x$2 (completed ${today})`);
  }

  fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

  return {
    updated: true,
    phase: phaseNum,
    plan_count: planCount,
    summary_count: summaryCount,
    status,
    complete: isComplete,
  };
}

function cmdRoadmapUpdatePhaseStatus(cwd, phaseNum, status) {
  if (!phaseNum) throw new Error('phase number required');
  if (!status) throw new Error('status required (not-started, in-progress, complete)');
  
  const validStatuses = ['not-started', 'in-progress', 'complete'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return { updated: false, reason: 'ROADMAP.md not found' };
  }

  let content = fs.readFileSync(roadmapPath, 'utf-8');
  const phaseEscaped = escapeRegex(phaseNum);
  const today = new Date().toISOString().split('T')[0];

  if (status === 'complete') {
    const checkboxPattern = new RegExp(
      `(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${phaseEscaped}[:\\s][^\\n]*)`, 'i'
    );
    content = content.replace(checkboxPattern, `$1x$2 (completed ${today})`);
  }

  const statusPattern = new RegExp(
    `(#{2,4}\\s*Phase\\s+${phaseEscaped}[\\s\\S]*?\\*\\*Status:\\*\\*\\s*)[^\\n]+`, 'i'
  );
  const statusText = status === 'complete' ? `Complete (${today})` :
                     status === 'in-progress' ? 'In Progress' : 'Not Started';
  content = content.replace(statusPattern, `$1${statusText}`);

  fs.writeFileSync(roadmapPath, content, 'utf-8');

  return { updated: true, phase: phaseNum, status, date: today };
}

module.exports = {
  cmdRoadmapGetPhase,
  cmdRoadmapAnalyze,
  cmdRoadmapUpdatePlanProgress,
  cmdRoadmapUpdatePhaseStatus,
};
