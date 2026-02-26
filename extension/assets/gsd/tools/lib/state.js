/**
 * State — STATE.md operations and progression engine
 * Ported from get-shit-done/bin/lib/state.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./core.js');

function stateExtractField(content, fieldName) {
  const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function stateReplaceField(content, fieldName, newValue) {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${escaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) {
    return content.replace(pattern, (_match, prefix) => `${prefix}${newValue}`);
  }
  return null;
}

function stateLoad(cwd) {
  const config = loadConfig(cwd);
  const planningDir = path.join(cwd, '.planning');

  let stateRaw = '';
  try {
    stateRaw = fs.readFileSync(path.join(planningDir, 'STATE.md'), 'utf-8');
  } catch {}

  return {
    config,
    state_raw: stateRaw,
    state_exists: stateRaw.length > 0,
    roadmap_exists: fs.existsSync(path.join(planningDir, 'ROADMAP.md')),
    config_exists: fs.existsSync(path.join(planningDir, 'config.json')),
  };
}

function stateGet(cwd, section) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  let content;
  try {
    content = fs.readFileSync(statePath, 'utf-8');
  } catch {
    throw new Error('STATE.md not found');
  }

  if (!section) return { content };

  const fieldEscaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fieldPattern = new RegExp(`\\*\\*${fieldEscaped}:\\*\\*\\s*(.*)`, 'i');
  const fieldMatch = content.match(fieldPattern);
  if (fieldMatch) return { [section]: fieldMatch[1].trim() };

  const sectionPattern = new RegExp(`##\\s*${fieldEscaped}\\s*\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
  const sectionMatch = content.match(sectionPattern);
  if (sectionMatch) return { [section]: sectionMatch[1].trim() };

  return { error: `Section or field "${section}" not found` };
}

function stateUpdate(cwd, field, value) {
  if (!field || value === undefined) throw new Error('field and value required');

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  let content;
  try {
    content = fs.readFileSync(statePath, 'utf-8');
  } catch {
    return { updated: false, reason: 'STATE.md not found' };
  }

  const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
  if (pattern.test(content)) {
    content = content.replace(pattern, (_match, prefix) => `${prefix}${value}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    return { updated: true };
  }
  return { updated: false, reason: `Field "${field}" not found in STATE.md` };
}

function statePatch(cwd, patches) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  let content;
  try {
    content = fs.readFileSync(statePath, 'utf-8');
  } catch {
    throw new Error('STATE.md not found');
  }

  const results = { updated: [], failed: [] };
  for (const [field, value] of Object.entries(patches)) {
    const fieldEscaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(\\*\\*${fieldEscaped}:\\*\\*\\s*)(.*)`, 'i');
    if (pattern.test(content)) {
      content = content.replace(pattern, (_match, prefix) => `${prefix}${value}`);
      results.updated.push(field);
    } else {
      results.failed.push(field);
    }
  }

  if (results.updated.length > 0) {
    fs.writeFileSync(statePath, content, 'utf-8');
  }
  return results;
}

function stateSnapshot(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };

  const content = fs.readFileSync(statePath, 'utf-8');

  const extractField = (fieldName) => {
    const pattern = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : null;
  };

  const currentPhase = extractField('Current Phase');
  const currentPhaseName = extractField('Current Phase Name');
  const totalPhasesRaw = extractField('Total Phases');
  const currentPlan = extractField('Current Plan');
  const totalPlansRaw = extractField('Total Plans in Phase');
  const status = extractField('Status');
  const progressRaw = extractField('Progress');
  const lastActivity = extractField('Last Activity');
  const lastActivityDesc = extractField('Last Activity Description');
  const pausedAt = extractField('Paused At');

  const blockers = [];
  const blockersMatch = content.match(/##\s*Blockers\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (blockersMatch) {
    const items = blockersMatch[1].match(/^-\s+(.+)$/gm) || [];
    for (const item of items) {
      blockers.push(item.replace(/^-\s+/, '').trim());
    }
  }

  return {
    current_phase: currentPhase,
    current_phase_name: currentPhaseName,
    total_phases: totalPhasesRaw ? parseInt(totalPhasesRaw, 10) : null,
    current_plan: currentPlan,
    total_plans_in_phase: totalPlansRaw ? parseInt(totalPlansRaw, 10) : null,
    status,
    progress_percent: progressRaw ? parseInt(progressRaw.replace('%', ''), 10) : null,
    last_activity: lastActivity,
    last_activity_desc: lastActivityDesc,
    blockers,
    paused_at: pausedAt,
  };
}

function stateAdvancePlan(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };

  let content = fs.readFileSync(statePath, 'utf-8');
  const currentPlan = parseInt(stateExtractField(content, 'Current Plan'), 10);
  const totalPlans = parseInt(stateExtractField(content, 'Total Plans in Phase'), 10);
  const today = new Date().toISOString().split('T')[0];

  if (isNaN(currentPlan) || isNaN(totalPlans)) {
    return { error: 'Cannot parse Current Plan or Total Plans in Phase from STATE.md' };
  }

  if (currentPlan >= totalPlans) {
    content = stateReplaceField(content, 'Status', 'Phase complete — ready for verification') || content;
    content = stateReplaceField(content, 'Last Activity', today) || content;
    fs.writeFileSync(statePath, content, 'utf-8');
    return { advanced: false, reason: 'last_plan', current_plan: currentPlan, total_plans: totalPlans, status: 'ready_for_verification' };
  }

  const newPlan = currentPlan + 1;
  content = stateReplaceField(content, 'Current Plan', String(newPlan)) || content;
  content = stateReplaceField(content, 'Status', 'Ready to execute') || content;
  content = stateReplaceField(content, 'Last Activity', today) || content;
  fs.writeFileSync(statePath, content, 'utf-8');
  return { advanced: true, previous_plan: currentPlan, current_plan: newPlan, total_plans: totalPlans };
}

function stateUpdateProgress(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };

  let content = fs.readFileSync(statePath, 'utf-8');

  const phasesDir = path.join(cwd, '.planning', 'phases');
  let totalPlans = 0;
  let totalSummaries = 0;

  if (fs.existsSync(phasesDir)) {
    const phaseDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);
    for (const dir of phaseDirs) {
      const files = fs.readdirSync(path.join(phasesDir, dir));
      totalPlans += files.filter(f => f.match(/-PLAN\.md$/i)).length;
      totalSummaries += files.filter(f => f.match(/-SUMMARY\.md$/i)).length;
    }
  }

  const percent = totalPlans > 0 ? Math.min(100, Math.round(totalSummaries / totalPlans * 100)) : 0;
  const barWidth = 10;
  const filled = Math.round(percent / 100 * barWidth);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
  const progressStr = `[${bar}] ${percent}%`;

  const progressPattern = /(\*\*Progress:\*\*\s*).*/i;
  if (progressPattern.test(content)) {
    content = content.replace(progressPattern, (_match, prefix) => `${prefix}${progressStr}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    return { updated: true, percent, completed: totalSummaries, total: totalPlans, bar: progressStr };
  }
  return { updated: false, reason: 'Progress field not found in STATE.md' };
}

function stateAddDecision(cwd, phase, summary, rationale) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };
  if (!summary) return { error: 'summary required' };

  let content = fs.readFileSync(statePath, 'utf-8');
  const entry = `- [Phase ${phase || '?'}]: ${summary}${rationale ? ` — ${rationale}` : ''}`;

  const sectionPattern = /(###?\s*(?:Decisions|Decisions Made|Accumulated.*Decisions)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    let sectionBody = match[2];
    sectionBody = sectionBody.replace(/None yet\.?\s*\n?/gi, '').replace(/No decisions yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n' + entry + '\n';
    content = content.replace(sectionPattern, (_match, header) => `${header}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    return { added: true, decision: entry };
  }
  return { added: false, reason: 'Decisions section not found in STATE.md' };
}

function stateAddBlocker(cwd, text) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };
  if (!text) return { error: 'text required' };

  let content = fs.readFileSync(statePath, 'utf-8');
  const entry = `- ${text}`;

  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    let sectionBody = match[2];
    sectionBody = sectionBody.replace(/None\.?\s*\n?/gi, '').replace(/None yet\.?\s*\n?/gi, '');
    sectionBody = sectionBody.trimEnd() + '\n' + entry + '\n';
    content = content.replace(sectionPattern, (_match, header) => `${header}${sectionBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    return { added: true, blocker: text };
  }
  return { added: false, reason: 'Blockers section not found in STATE.md' };
}

function stateResolveBlocker(cwd, text) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };
  if (!text) return { error: 'text required' };

  let content = fs.readFileSync(statePath, 'utf-8');

  const sectionPattern = /(###?\s*(?:Blockers|Blockers\/Concerns|Concerns)\s*\n)([\s\S]*?)(?=\n###?|\n##[^#]|$)/i;
  const match = content.match(sectionPattern);

  if (match) {
    const sectionBody = match[2];
    const lines = sectionBody.split('\n');
    const filtered = lines.filter(line => {
      if (!line.startsWith('- ')) return true;
      return !line.toLowerCase().includes(text.toLowerCase());
    });

    let newBody = filtered.join('\n');
    if (!newBody.trim() || !newBody.includes('- ')) {
      newBody = 'None\n';
    }

    content = content.replace(sectionPattern, (_match, header) => `${header}${newBody}`);
    fs.writeFileSync(statePath, content, 'utf-8');
    return { resolved: true, blocker: text };
  }
  return { resolved: false, reason: 'Blockers section not found in STATE.md' };
}

function stateRecordSession(cwd, stoppedAt, resumeFile) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  if (!fs.existsSync(statePath)) return { error: 'STATE.md not found' };

  let content = fs.readFileSync(statePath, 'utf-8');
  const now = new Date().toISOString();
  const updated = [];

  let result = stateReplaceField(content, 'Last session', now);
  if (result) { content = result; updated.push('Last session'); }
  result = stateReplaceField(content, 'Last Date', now);
  if (result) { content = result; updated.push('Last Date'); }

  if (stoppedAt) {
    result = stateReplaceField(content, 'Stopped At', stoppedAt);
    if (!result) result = stateReplaceField(content, 'Stopped at', stoppedAt);
    if (result) { content = result; updated.push('Stopped At'); }
  }

  const rf = resumeFile || 'None';
  result = stateReplaceField(content, 'Resume File', rf);
  if (!result) result = stateReplaceField(content, 'Resume file', rf);
  if (result) { content = result; updated.push('Resume File'); }

  if (updated.length > 0) {
    fs.writeFileSync(statePath, content, 'utf-8');
    return { recorded: true, updated };
  }
  return { recorded: false, reason: 'No session fields found in STATE.md' };
}

module.exports = {
  stateLoad,
  stateGet,
  stateUpdate,
  statePatch,
  stateSnapshot,
  stateAdvancePlan,
  stateUpdateProgress,
  stateAddDecision,
  stateAddBlocker,
  stateResolveBlocker,
  stateRecordSession,
};
