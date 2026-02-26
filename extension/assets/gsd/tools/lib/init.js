/**
 * Init — Compound init commands for workflow bootstrapping
 * Ported from get-shit-done/bin/lib/init.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, resolveModelInternal, findPhaseInternal, getRoadmapPhaseInternal, pathExistsInternal, generateSlugInternal, getMilestoneInfo, normalizePhaseName } = require('./core.js');

function detectExistingCode(cwd) {
  const codeExtensions = new Set(['.ts', '.js', '.py', '.go', '.rs', '.swift', '.java']);
  const ignoreDirs = new Set(['node_modules', '.git', '.planning', 'dist', 'build', '__pycache__']);

  function walk(dir, depth) {
    if (depth > 3) return false;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (codeExtensions.has(ext)) return true;
        } else if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
          if (walk(path.join(dir, entry.name), depth + 1)) return true;
        }
      }
    } catch {}
    return false;
  }

  return walk(cwd, 0);
}

function cmdInitExecutePhase(cwd, phase) {
  if (!phase) throw new Error('phase required for init execute-phase');

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);
  const milestone = getMilestoneInfo(cwd);

  const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
  const reqMatch = roadmapPhase?.section?.match(/^\*\*Requirements\*\*:[^\S\n]*([^\n]*)$/m);
  const reqExtracted = reqMatch
    ? reqMatch[1].replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ')
    : null;
  const phase_req_ids = (reqExtracted && reqExtracted !== 'TBD') ? reqExtracted : null;

  return {
    executor_model: resolveModelInternal(cwd, 'gsd-executor'),
    verifier_model: resolveModelInternal(cwd, 'gsd-verifier'),
    commit_docs: config.commit_docs,
    parallelization: config.parallelization,
    branching_strategy: config.branching_strategy,
    phase_branch_template: config.phase_branch_template,
    milestone_branch_template: config.milestone_branch_template,
    verifier_enabled: config.verifier,
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    phase_req_ids,
    plans: phaseInfo?.plans || [],
    summaries: phaseInfo?.summaries || [],
    incomplete_plans: phaseInfo?.incomplete_plans || [],
    plan_count: phaseInfo?.plans?.length || 0,
    incomplete_count: phaseInfo?.incomplete_plans?.length || 0,
    branch_name: config.branching_strategy === 'phase' && phaseInfo
      ? config.phase_branch_template
          .replace('{phase}', phaseInfo.phase_number)
          .replace('{slug}', phaseInfo.phase_slug || 'phase')
      : config.branching_strategy === 'milestone'
        ? config.milestone_branch_template
            .replace('{milestone}', milestone.version)
            .replace('{slug}', generateSlugInternal(milestone.name) || 'milestone')
        : null,
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    config_exists: pathExistsInternal(cwd, '.planning/config.json'),
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    config_path: '.planning/config.json',
  };
}

function cmdInitPlanPhase(cwd, phase) {
  if (!phase) throw new Error('phase required for init plan-phase');

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
  const reqMatch = roadmapPhase?.section?.match(/^\*\*Requirements\*\*:[^\S\n]*([^\n]*)$/m);
  const reqExtracted = reqMatch
    ? reqMatch[1].replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(', ')
    : null;
  const phase_req_ids = (reqExtracted && reqExtracted !== 'TBD') ? reqExtracted : null;

  const result = {
    researcher_model: resolveModelInternal(cwd, 'gsd-phase-researcher'),
    planner_model: resolveModelInternal(cwd, 'gsd-planner'),
    checker_model: resolveModelInternal(cwd, 'gsd-plan-checker'),
    research_enabled: config.research,
    plan_checker_enabled: config.plan_checker,
    nyquist_validation_enabled: config.nyquist_validation,
    commit_docs: config.commit_docs,
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,
    phase_req_ids,
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    plan_count: phaseInfo?.plans?.length || 0,
    planning_exists: pathExistsInternal(cwd, '.planning'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    requirements_path: '.planning/REQUIREMENTS.md',
  };

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) result.context_path = path.join(phaseInfo.directory, contextFile);
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) result.research_path = path.join(phaseInfo.directory, researchFile);
      const verificationFile = files.find(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');
      if (verificationFile) result.verification_path = path.join(phaseInfo.directory, verificationFile);
      const uatFile = files.find(f => f.endsWith('-UAT.md') || f === 'UAT.md');
      if (uatFile) result.uat_path = path.join(phaseInfo.directory, uatFile);
    } catch {}
  }

  return result;
}

function cmdInitNewProject(cwd) {
  const config = loadConfig(cwd);

  const hasBraveSearch = !!process.env.BRAVE_API_KEY;

  const hasCode = detectExistingCode(cwd);
  const hasPackageFile = pathExistsInternal(cwd, 'package.json') ||
    pathExistsInternal(cwd, 'requirements.txt') ||
    pathExistsInternal(cwd, 'Cargo.toml') ||
    pathExistsInternal(cwd, 'go.mod') ||
    pathExistsInternal(cwd, 'Package.swift');

  return {
    researcher_model: resolveModelInternal(cwd, 'gsd-project-researcher'),
    synthesizer_model: resolveModelInternal(cwd, 'gsd-research-synthesizer'),
    roadmapper_model: resolveModelInternal(cwd, 'gsd-roadmapper'),
    commit_docs: config.commit_docs,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    has_codebase_map: pathExistsInternal(cwd, '.planning/codebase'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    has_existing_code: hasCode,
    has_package_file: hasPackageFile,
    is_brownfield: hasCode || hasPackageFile,
    needs_codebase_map: (hasCode || hasPackageFile) && !pathExistsInternal(cwd, '.planning/codebase'),
    has_git: pathExistsInternal(cwd, '.git'),
    brave_search_available: hasBraveSearch,
    project_path: '.planning/PROJECT.md',
  };
}

function cmdInitNewMilestone(cwd) {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);

  return {
    researcher_model: resolveModelInternal(cwd, 'gsd-project-researcher'),
    synthesizer_model: resolveModelInternal(cwd, 'gsd-research-synthesizer'),
    roadmapper_model: resolveModelInternal(cwd, 'gsd-roadmapper'),
    commit_docs: config.commit_docs,
    research_enabled: config.research,
    current_milestone: milestone.version,
    current_milestone_name: milestone.name,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    project_path: '.planning/PROJECT.md',
    roadmap_path: '.planning/ROADMAP.md',
    state_path: '.planning/STATE.md',
  };
}

function cmdInitQuick(cwd, description) {
  const config = loadConfig(cwd);
  const now = new Date();
  const slug = description ? generateSlugInternal(description)?.substring(0, 40) : null;

  const quickDir = path.join(cwd, '.planning', 'quick');
  let nextNum = 1;
  try {
    const existing = fs.readdirSync(quickDir)
      .filter(f => /^\d+-/.test(f))
      .map(f => parseInt(f.split('-')[0], 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) nextNum = Math.max(...existing) + 1;
  } catch {}

  return {
    planner_model: resolveModelInternal(cwd, 'gsd-planner'),
    executor_model: resolveModelInternal(cwd, 'gsd-executor'),
    checker_model: resolveModelInternal(cwd, 'gsd-plan-checker'),
    verifier_model: resolveModelInternal(cwd, 'gsd-verifier'),
    commit_docs: config.commit_docs,
    next_num: nextNum,
    slug,
    description: description || null,
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),
    quick_dir: '.planning/quick',
    task_dir: slug ? `.planning/quick/${nextNum}-${slug}` : null,
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
  };
}

function cmdInitResume(cwd) {
  const config = loadConfig(cwd);

  let interruptedAgentId = null;
  try {
    interruptedAgentId = fs.readFileSync(path.join(cwd, '.planning', 'current-agent-id.txt'), 'utf-8').trim();
  } catch {}

  return {
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    project_path: '.planning/PROJECT.md',
    has_interrupted_agent: !!interruptedAgentId,
    interrupted_agent_id: interruptedAgentId,
    commit_docs: config.commit_docs,
  };
}

function cmdInitVerifyWork(cwd, phase) {
  if (!phase) throw new Error('phase required for init verify-work');

  const config = loadConfig(cwd);
  const phaseInfo = findPhaseInternal(cwd, phase);

  return {
    planner_model: resolveModelInternal(cwd, 'gsd-planner'),
    checker_model: resolveModelInternal(cwd, 'gsd-plan-checker'),
    commit_docs: config.commit_docs,
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    has_verification: phaseInfo?.has_verification || false,
  };
}

function cmdInitPhaseOp(cwd, phase) {
  const config = loadConfig(cwd);
  let phaseInfo = findPhaseInternal(cwd, phase);

  if (!phaseInfo) {
    const roadmapPhase = getRoadmapPhaseInternal(cwd, phase);
    if (roadmapPhase?.found) {
      const phaseName = roadmapPhase.phase_name;
      phaseInfo = {
        found: true,
        directory: null,
        phase_number: roadmapPhase.phase_number,
        phase_name: phaseName,
        phase_slug: phaseName ? phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null,
        plans: [],
        summaries: [],
        incomplete_plans: [],
        has_research: false,
        has_context: false,
        has_verification: false,
      };
    }
  }

  const result = {
    commit_docs: config.commit_docs,
    brave_search: config.brave_search,
    phase_found: !!phaseInfo,
    phase_dir: phaseInfo?.directory || null,
    phase_number: phaseInfo?.phase_number || null,
    phase_name: phaseInfo?.phase_name || null,
    phase_slug: phaseInfo?.phase_slug || null,
    padded_phase: phaseInfo?.phase_number?.padStart(2, '0') || null,
    has_research: phaseInfo?.has_research || false,
    has_context: phaseInfo?.has_context || false,
    has_plans: (phaseInfo?.plans?.length || 0) > 0,
    has_verification: phaseInfo?.has_verification || false,
    plan_count: phaseInfo?.plans?.length || 0,
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    planning_exists: pathExistsInternal(cwd, '.planning'),
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    requirements_path: '.planning/REQUIREMENTS.md',
  };

  if (phaseInfo?.directory) {
    const phaseDirFull = path.join(cwd, phaseInfo.directory);
    try {
      const files = fs.readdirSync(phaseDirFull);
      const contextFile = files.find(f => f.endsWith('-CONTEXT.md') || f === 'CONTEXT.md');
      if (contextFile) result.context_path = path.join(phaseInfo.directory, contextFile);
      const researchFile = files.find(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');
      if (researchFile) result.research_path = path.join(phaseInfo.directory, researchFile);
      const verificationFile = files.find(f => f.endsWith('-VERIFICATION.md') || f === 'VERIFICATION.md');
      if (verificationFile) result.verification_path = path.join(phaseInfo.directory, verificationFile);
      const uatFile = files.find(f => f.endsWith('-UAT.md') || f === 'UAT.md');
      if (uatFile) result.uat_path = path.join(phaseInfo.directory, uatFile);
    } catch {}
  }

  return result;
}

function cmdInitTodos(cwd, area) {
  const config = loadConfig(cwd);
  const now = new Date();
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

  return {
    commit_docs: config.commit_docs,
    date: now.toISOString().split('T')[0],
    timestamp: now.toISOString(),
    todo_count: count,
    todos,
    area_filter: area || null,
    pending_dir: '.planning/todos/pending',
    completed_dir: '.planning/todos/completed',
    planning_exists: pathExistsInternal(cwd, '.planning'),
    todos_dir_exists: pathExistsInternal(cwd, '.planning/todos'),
    pending_dir_exists: pathExistsInternal(cwd, '.planning/todos/pending'),
  };
}

function cmdInitMilestoneOp(cwd) {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);
  const phasesDir = path.join(cwd, '.planning', 'phases');

  let phaseCount = 0;
  let completedPhases = 0;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    phaseCount = dirs.length;
    for (const dir of dirs) {
      try {
        const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
        const hasSummary = phaseFiles.some(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
        if (hasSummary) completedPhases++;
      } catch {}
    }
  } catch {}

  const archiveDir = path.join(cwd, '.planning', 'archive');
  let archivedMilestones = [];
  try {
    archivedMilestones = fs.readdirSync(archiveDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
  } catch {}

  return {
    commit_docs: config.commit_docs,
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    milestone_slug: generateSlugInternal(milestone.name),
    phase_count: phaseCount,
    completed_phases: completedPhases,
    all_phases_complete: phaseCount > 0 && phaseCount === completedPhases,
    archived_milestones: archivedMilestones,
    archive_count: archivedMilestones.length,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    archive_exists: pathExistsInternal(cwd, '.planning/archive'),
    phases_dir_exists: pathExistsInternal(cwd, '.planning/phases'),
  };
}

function cmdInitMapCodebase(cwd) {
  const config = loadConfig(cwd);
  const codebaseDir = path.join(cwd, '.planning', 'codebase');
  let existingMaps = [];
  try {
    existingMaps = fs.readdirSync(codebaseDir).filter(f => f.endsWith('.md'));
  } catch {}

  return {
    mapper_model: resolveModelInternal(cwd, 'gsd-codebase-mapper'),
    commit_docs: config.commit_docs,
    search_gitignored: config.search_gitignored,
    parallelization: config.parallelization,
    codebase_dir: '.planning/codebase',
    existing_maps: existingMaps,
    has_maps: existingMaps.length > 0,
    planning_exists: pathExistsInternal(cwd, '.planning'),
    codebase_dir_exists: pathExistsInternal(cwd, '.planning/codebase'),
  };
}

function cmdInitProgress(cwd) {
  const config = loadConfig(cwd);
  const milestone = getMilestoneInfo(cwd);
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const phases = [];
  let currentPhase = null;
  let nextPhase = null;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
    for (const dir of dirs) {
      const match = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNumber = match ? match[1] : dir;
      const phaseName = match && match[2] ? match[2] : null;
      const phasePath = path.join(phasesDir, dir);
      const phaseFiles = fs.readdirSync(phasePath);
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      const hasResearch = phaseFiles.some(f => f.endsWith('-RESEARCH.md') || f === 'RESEARCH.md');

      const status = summaries.length >= plans.length && plans.length > 0 ? 'complete' :
        plans.length > 0 ? 'in_progress' :
        hasResearch ? 'researched' : 'pending';

      const phaseObj = {
        number: phaseNumber,
        name: phaseName,
        directory: path.join('.planning', 'phases', dir),
        status,
        plan_count: plans.length,
        summary_count: summaries.length,
        has_research: hasResearch,
      };
      phases.push(phaseObj);

      if (!currentPhase && (status === 'in_progress' || status === 'researched')) currentPhase = phaseObj;
      if (!nextPhase && status === 'pending') nextPhase = phaseObj;
    }
  } catch {}

  let pausedAt = null;
  try {
    const state = fs.readFileSync(path.join(cwd, '.planning', 'STATE.md'), 'utf-8');
    const pauseMatch = state.match(/\*\*Paused At:\*\*\s*(.+)/);
    if (pauseMatch) pausedAt = pauseMatch[1].trim();
  } catch {}

  return {
    executor_model: resolveModelInternal(cwd, 'gsd-executor'),
    planner_model: resolveModelInternal(cwd, 'gsd-planner'),
    commit_docs: config.commit_docs,
    milestone_version: milestone.version,
    milestone_name: milestone.name,
    phases,
    phase_count: phases.length,
    completed_count: phases.filter(p => p.status === 'complete').length,
    in_progress_count: phases.filter(p => p.status === 'in_progress').length,
    current_phase: currentPhase,
    next_phase: nextPhase,
    paused_at: pausedAt,
    has_work_in_progress: !!currentPhase,
    project_exists: pathExistsInternal(cwd, '.planning/PROJECT.md'),
    roadmap_exists: pathExistsInternal(cwd, '.planning/ROADMAP.md'),
    state_exists: pathExistsInternal(cwd, '.planning/STATE.md'),
    state_path: '.planning/STATE.md',
    roadmap_path: '.planning/ROADMAP.md',
    project_path: '.planning/PROJECT.md',
    config_path: '.planning/config.json',
  };
}

module.exports = {
  cmdInitExecutePhase,
  cmdInitPlanPhase,
  cmdInitNewProject,
  cmdInitNewMilestone,
  cmdInitQuick,
  cmdInitResume,
  cmdInitVerifyWork,
  cmdInitPhaseOp,
  cmdInitTodos,
  cmdInitMilestoneOp,
  cmdInitMapCodebase,
  cmdInitProgress,
};