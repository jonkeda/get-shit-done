#!/usr/bin/env node
'use strict';

/**
 * GSD MCP Server - Zero-dependency stdio JSON-RPC 2.0 with Content-Length framing
 * Protocol version: 2024-11-05
 *
 * Workspace is set via GSD_WORKSPACE env var (from .vscode/mcp.json).
 */

const fs = require('fs');
const path = require('path');

// --- Lib modules ---

const state = require('./lib/state.js');
const config = require('./lib/config.js');
const core = require('./lib/core.js');
const frontmatter = require('./lib/frontmatter.js');
const commands = require('./lib/commands.js');
const roadmap = require('./lib/roadmap.js');
const phase = require('./lib/phase.js');
const init = require('./lib/init.js');
const verify = require('./lib/verify.js');
const milestone = require('./lib/milestone.js');
const template = require('./lib/template.js');

// --- Workspace Resolution ---

const GSD_WORKSPACE = process.env.GSD_WORKSPACE || process.cwd();
const cwd = path.resolve(GSD_WORKSPACE);
const _usingFallback = !process.env.GSD_WORKSPACE;
if (!fs.existsSync(path.join(cwd, '.planning'))) {
  process.stderr.write('GSD MCP Server: WARNING - no .planning/ directory found in ' + cwd + '\n');
}
// --- Tool Registry ---

const tools = {};

function defineTool(name, description, inputSchema, handler) {
  tools[name] = { name, description, inputSchema, handler };
}

function prop(type, description, opts) {
  const p = { type, description };
  if (opts) Object.assign(p, opts);
  return p;
}

// -- State tools --

defineTool('gsd_state_load', 'Load STATE.md and project context',
  { type: 'object', properties: {} },
  () => state.stateLoad(cwd));

defineTool('gsd_state_get', 'Get a specific field or section from STATE.md',
  { type: 'object', properties: { section: prop('string', 'Field name or section heading to extract') } },
  (a) => state.stateGet(cwd, a.section));

defineTool('gsd_state_update', 'Update a single field in STATE.md',
  { type: 'object', properties: { field: prop('string', 'Field name'), value: prop('string', 'New value') }, required: ['field', 'value'] },
  (a) => state.stateUpdate(cwd, a.field, a.value));

defineTool('gsd_state_patch', 'Update multiple fields in STATE.md atomically',
  { type: 'object', properties: { patches: { type: 'object', description: 'Field name to value mapping', additionalProperties: { type: 'string' } } }, required: ['patches'] },
  (a) => state.statePatch(cwd, a.patches));

defineTool('gsd_state_snapshot', 'Get structured snapshot of all STATE.md fields',
  { type: 'object', properties: {} },
  () => state.stateSnapshot(cwd));

defineTool('gsd_state_advance_plan', 'Advance to next plan in current phase',
  { type: 'object', properties: {} },
  () => state.stateAdvancePlan(cwd));

defineTool('gsd_state_update_progress', 'Recalculate and update progress bar in STATE.md',
  { type: 'object', properties: {} },
  () => state.stateUpdateProgress(cwd));

defineTool('gsd_state_add_decision', 'Record a decision in STATE.md',
  { type: 'object', properties: { phase: prop('string', 'Phase number'), summary: prop('string', 'Decision summary'), rationale: prop('string', 'Rationale') }, required: ['summary'] },
  (a) => state.stateAddDecision(cwd, a.phase, a.summary, a.rationale));

defineTool('gsd_state_add_blocker', 'Add a blocker to STATE.md',
  { type: 'object', properties: { text: prop('string', 'Blocker description') }, required: ['text'] },
  (a) => state.stateAddBlocker(cwd, a.text));

defineTool('gsd_state_resolve_blocker', 'Resolve a blocker in STATE.md',
  { type: 'object', properties: { text: prop('string', 'Text to match against existing blockers') }, required: ['text'] },
  (a) => state.stateResolveBlocker(cwd, a.text));

defineTool('gsd_state_record_session', 'Record session end in STATE.md',
  { type: 'object', properties: { stopped_at: prop('string', 'Where work stopped'), resume_file: prop('string', 'Path to resume file') } },
  (a) => state.stateRecordSession(cwd, a.stopped_at, a.resume_file));
// -- Config tools --

defineTool('gsd_config_ensure', 'Ensure .planning/config.json exists with defaults',
  { type: 'object', properties: {} },
  () => config.configEnsure(cwd));

defineTool('gsd_config_set', 'Set a config value in .planning/config.json',
  { type: 'object', properties: { key: prop('string', 'Dot-separated key path'), value: prop('string', 'Value to set') }, required: ['key', 'value'] },
  (a) => config.configSet(cwd, a.key, a.value));

defineTool('gsd_config_load', 'Load full config from .planning/config.json',
  { type: 'object', properties: {} },
  () => core.loadConfig(cwd));

// -- Frontmatter tools --

defineTool('gsd_frontmatter_get', 'Get a frontmatter field from a file',
  { type: 'object', properties: { file_path: prop('string', 'Relative path to file'), field: prop('string', 'Frontmatter field name') }, required: ['file_path', 'field'] },
  (a) => frontmatter.frontmatterGet(cwd, a.file_path, a.field));

defineTool('gsd_frontmatter_set', 'Set a frontmatter field in a file',
  { type: 'object', properties: { file_path: prop('string', 'Relative path'), field: prop('string', 'Field name'), value: prop('string', 'Value to set') }, required: ['file_path', 'field', 'value'] },
  (a) => frontmatter.frontmatterSet(cwd, a.file_path, a.field, a.value));

defineTool('gsd_frontmatter_merge', 'Merge multiple frontmatter fields',
  { type: 'object', properties: { file_path: prop('string', 'Relative path'), fields: { type: 'object', description: 'Field-value pairs', additionalProperties: true } }, required: ['file_path', 'fields'] },
  (a) => frontmatter.frontmatterMerge(cwd, a.file_path, a.fields));

defineTool('gsd_frontmatter_validate', 'Validate frontmatter against schema',
  { type: 'object', properties: { file_path: prop('string', 'Relative path'), doc_type: prop('string', 'Document type (plan, summary, context, research, state, validation, verification, uat)') }, required: ['file_path', 'doc_type'] },
  (a) => frontmatter.frontmatterValidate(cwd, a.file_path, a.doc_type));

// -- Command tools --

defineTool('gsd_commit', 'Commit planning docs to git',
  { type: 'object', properties: { message: prop('string', 'Commit message'), files: { type: 'array', items: { type: 'string' }, description: 'Files to stage' }, amend: prop('boolean', 'Amend previous commit') } },
  (a) => commands.cmdCommit(cwd, a.message, a.files, a.amend));

defineTool('gsd_generate_slug', 'Generate URL-safe slug from text',
  { type: 'object', properties: { text: prop('string', 'Text to slugify') }, required: ['text'] },
  (a) => commands.cmdGenerateSlug(a.text));

defineTool('gsd_current_timestamp', 'Get current timestamp',
  { type: 'object', properties: { format: prop('string', 'Format: full, date, or filename') } },
  (a) => commands.cmdCurrentTimestamp(a.format));

defineTool('gsd_list_todos', 'List pending todo items',
  { type: 'object', properties: { area: prop('string', 'Filter by area') } },
  (a) => commands.cmdListTodos(cwd, a.area));

defineTool('gsd_verify_path_exists', 'Check if a path exists',
  { type: 'object', properties: { target_path: prop('string', 'Path to verify (relative to workspace)') }, required: ['target_path'] },
  (a) => commands.cmdVerifyPathExists(cwd, a.target_path));

defineTool('gsd_resolve_model', 'Resolve model for an agent based on profile',
  { type: 'object', properties: { agent_type: prop('string', 'Agent type (e.g. gsd-executor)') }, required: ['agent_type'] },
  (a) => commands.cmdResolveModel(cwd, a.agent_type));

defineTool('gsd_summary_extract', 'Extract structured data from SUMMARY.md',
  { type: 'object', properties: { summary_path: prop('string', 'Relative path to SUMMARY.md'), fields: { type: 'array', items: { type: 'string' }, description: 'Fields to extract' } }, required: ['summary_path'] },
  (a) => commands.cmdSummaryExtract(cwd, a.summary_path, a.fields));

defineTool('gsd_progress', 'Render progress in various formats',
  { type: 'object', properties: { format: prop('string', 'Output format: json, table, or bar') } },
  (a) => commands.cmdProgressRender(cwd, a.format));

defineTool('gsd_todo_complete', 'Complete a pending todo item',
  { type: 'object', properties: { filename: prop('string', 'Todo filename to complete') }, required: ['filename'] },
  (a) => commands.cmdTodoComplete(cwd, a.filename));

defineTool('gsd_scaffold', 'Scaffold a planning document',
  { type: 'object', properties: { type: prop('string', 'Document type: context, uat, verification, phase-dir'), phase: prop('string', 'Phase number'), name: prop('string', 'Name for document') }, required: ['type'] },
  (a) => commands.cmdScaffold(cwd, a.type, { phase: a.phase, name: a.name }));

defineTool('gsd_history_digest', 'Synthesize prior phase summaries and decisions',
  { type: 'object', properties: { phase: prop('string', 'Filter to specific phase (optional)') } },
  (a) => commands.cmdHistoryDigest(cwd, a.phase));
// -- Roadmap tools --

defineTool('gsd_roadmap_analyze', 'Analyze ROADMAP.md structure and progress',
  { type: 'object', properties: {} },
  () => roadmap.cmdRoadmapAnalyze(cwd));

defineTool('gsd_roadmap_get_phase', 'Get details of a specific phase from ROADMAP.md',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => roadmap.cmdRoadmapGetPhase(cwd, a.phase));

defineTool('gsd_roadmap_update_plan_progress', 'Update plan progress for a phase in ROADMAP.md',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => roadmap.cmdRoadmapUpdatePlanProgress(cwd, a.phase));

defineTool('gsd_roadmap_update_phase_status', 'Update phase status in ROADMAP.md',
  { type: 'object', properties: { phase: prop('string', 'Phase number'), status: prop('string', 'Status: not-started, in-progress, or complete') }, required: ['phase', 'status'] },
  (a) => roadmap.cmdRoadmapUpdatePhaseStatus(cwd, a.phase, a.status));

// -- Phase tools --

defineTool('gsd_find_phase', 'Find a phase directory and its contents',
  { type: 'object', properties: { phase: prop('string', 'Phase number or identifier') }, required: ['phase'] },
  (a) => phase.cmdFindPhase(cwd, a.phase));

defineTool('gsd_phase_add', 'Add a new phase to the roadmap',
  { type: 'object', properties: { description: prop('string', 'Phase description/name') }, required: ['description'] },
  (a) => phase.cmdPhaseAdd(cwd, a.description));

defineTool('gsd_phase_insert', 'Insert a phase after an existing one (decimal numbering)',
  { type: 'object', properties: { after_phase: prop('string', 'Phase number to insert after'), description: prop('string', 'Phase description') }, required: ['after_phase', 'description'] },
  (a) => phase.cmdPhaseInsert(cwd, a.after_phase, a.description));

defineTool('gsd_phase_remove', 'Remove a phase and renumber subsequent phases',
  { type: 'object', properties: { phase: prop('string', 'Phase number to remove'), force: prop('boolean', 'Force removal') }, required: ['phase'] },
  (a) => phase.cmdPhaseRemove(cwd, a.phase, { force: a.force }));

defineTool('gsd_phase_complete', 'Mark a phase as complete',
  { type: 'object', properties: { phase: prop('string', 'Phase number to complete') }, required: ['phase'] },
  (a) => phase.cmdPhaseComplete(cwd, a.phase));

defineTool('gsd_phases_list', 'List phase directories or files',
  { type: 'object', properties: { type: prop('string', 'Filter: plans, summaries, or all'), phase: prop('string', 'Specific phase'), include_archived: prop('boolean', 'Include archived') } },
  (a) => phase.cmdPhasesList(cwd, { type: a.type, phase: a.phase, includeArchived: a.include_archived }));

defineTool('gsd_phase_next_decimal', 'Calculate next decimal phase number',
  { type: 'object', properties: { base_phase: prop('string', 'Base phase number') }, required: ['base_phase'] },
  (a) => phase.cmdPhaseNextDecimal(cwd, a.base_phase));

defineTool('gsd_phase_plan_index', 'Index plans within a phase',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => phase.cmdPhasePlanIndex(cwd, a.phase));
// -- Verify tools --

defineTool('gsd_verify_summary', 'Verify a SUMMARY.md file',
  { type: 'object', properties: { summary_path: prop('string', 'Relative path to SUMMARY.md'), check_file_count: prop('number', 'Min files to check') }, required: ['summary_path'] },
  (a) => verify.cmdVerifySummary(cwd, a.summary_path, a.check_file_count));

defineTool('gsd_verify_plan_structure', 'Check PLAN.md structure and tasks',
  { type: 'object', properties: { plan_path: prop('string', 'Relative path to PLAN.md') }, required: ['plan_path'] },
  (a) => verify.cmdVerifyPlanStructure(cwd, a.plan_path));

defineTool('gsd_verify_phase_completeness', 'Check all plans have summaries',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => verify.cmdVerifyPhaseCompleteness(cwd, a.phase));

defineTool('gsd_verify_references', 'Check @-refs and paths resolve',
  { type: 'object', properties: { file_path: prop('string', 'Relative path to check') }, required: ['file_path'] },
  (a) => verify.cmdVerifyReferences(cwd, a.file_path));

defineTool('gsd_verify_commits', 'Batch verify commit hashes',
  { type: 'object', properties: { hashes: { type: 'array', items: { type: 'string' }, description: 'Commit hashes to verify' } }, required: ['hashes'] },
  (a) => verify.cmdVerifyCommits(cwd, a.hashes));

defineTool('gsd_verify_artifacts', 'Check must_haves.artifacts from a plan',
  { type: 'object', properties: { plan_path: prop('string', 'Relative path to PLAN.md') }, required: ['plan_path'] },
  (a) => verify.cmdVerifyArtifacts(cwd, a.plan_path));

defineTool('gsd_verify_key_links', 'Check must_haves.key_links from a plan',
  { type: 'object', properties: { plan_path: prop('string', 'Relative path to PLAN.md') }, required: ['plan_path'] },
  (a) => verify.cmdVerifyKeyLinks(cwd, a.plan_path));

defineTool('gsd_validate_consistency', 'Check phase numbering and disk/roadmap sync',
  { type: 'object', properties: {} },
  () => verify.cmdValidateConsistency(cwd));

defineTool('gsd_validate_health', 'Check .planning/ integrity, optionally repair',
  { type: 'object', properties: { repair: prop('boolean', 'Attempt repairs') } },
  (a) => verify.cmdValidateHealth(cwd, a.repair));

// -- Template tools --

defineTool('gsd_template_select', 'Select template type for a plan',
  { type: 'object', properties: { plan_path: prop('string', 'Relative path to PLAN.md') }, required: ['plan_path'] },
  (a) => template.cmdTemplateSelect(cwd, a.plan_path));

defineTool('gsd_template_fill', 'Create pre-filled planning document from template',
  { type: 'object', properties: { template_type: prop('string', 'Template: summary, plan, verification'), phase: prop('string', 'Phase number'), plan: prop('string', 'Plan number'), name: prop('string', 'Document name'), wave: prop('number', 'Wave number'), fields: prop('string', 'JSON fields to fill') }, required: ['template_type', 'phase'] },
  (a) => template.cmdTemplateFill(cwd, a.template_type, { phase: a.phase, plan: a.plan, name: a.name, wave: a.wave, fields: a.fields }));

// -- Milestone tools --

defineTool('gsd_requirements_mark_complete', 'Mark requirement IDs as complete',
  { type: 'object', properties: { req_ids: { type: 'array', items: { type: 'string' }, description: 'Requirement IDs (e.g. REQ-01)' } }, required: ['req_ids'] },
  (a) => milestone.cmdRequirementsMarkComplete(cwd, a.req_ids));

defineTool('gsd_milestone_complete', 'Archive milestone and create MILESTONES.md',
  { type: 'object', properties: { version: prop('string', 'Version string'), name: prop('string', 'Milestone name'), archive_phases: prop('boolean', 'Move phase dirs to archive') }, required: ['version'] },
  (a) => milestone.cmdMilestoneComplete(cwd, a.version, { name: a.name, archivePhases: a.archive_phases }));

defineTool('gsd_milestone_stats', 'Get milestone statistics',
  { type: 'object', properties: {} },
  () => milestone.cmdMilestoneStats(cwd));

defineTool('gsd_switch_profile', 'Switch model profile for all agents',
  { type: 'object', properties: { profile: prop('string', 'Profile: quality, balanced, or budget') }, required: ['profile'] },
  (a) => {
    const profile = a.profile;
    if (!['quality', 'balanced', 'budget'].includes(profile)) {
      throw new Error('Profile must be quality, balanced, or budget');
    }

    const profileMap = {
      quality:  { primary: 'claude-opus-4.6', fallback: ['claude-sonnet-4.6', 'gpt-4.1'] },
      balanced: { primary: 'claude-sonnet-4.6', fallback: ['gpt-4.1'] },
      budget:   { primary: 'claude-haiku-4.5', fallback: ['gpt-4.1-mini'] },
    };
    const cheapMap = {
      quality:  { primary: 'claude-sonnet-4.6', fallback: ['gpt-4.1'] },
      balanced: { primary: 'claude-haiku-4.5', fallback: ['gpt-4.1-mini'] },
      budget:   { primary: 'claude-haiku-4.5', fallback: ['gpt-4.1-mini'] },
    };
    const cheapAgents = new Set(['gsd-codebase-mapper']);

    const agentsDir = path.join(cwd, '.github', 'agents');
    if (!fs.existsSync(agentsDir)) {
      throw new Error('.github/agents/ directory not found');
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.md'));
    const updated = [];

    for (const file of files) {
      const filePath = path.join(agentsDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');

      const agentName = file.replace('.agent.md', '');
      const map = cheapAgents.has(agentName) ? cheapMap[profile] : profileMap[profile];
      const models = [map.primary, ...map.fallback];
      const modelLine = `model: [${models.join(', ')}]`;

      const modelPattern = /^model:\s*\[.*\]$/m;
      if (modelPattern.test(content)) {
        content = content.replace(modelPattern, modelLine);
        fs.writeFileSync(filePath, content, 'utf-8');
        updated.push({ file, models });
      }
    }

    // Update config
    try {
      config.configSet(cwd, 'model_profile', profile);
    } catch {}

    return { profile, updated, count: updated.length };
  });
// -- Init tools (compound context assembly) --

defineTool('gsd_init_execute_phase', 'Assemble context for phase execution',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => init.cmdInitExecutePhase(cwd, a.phase));

defineTool('gsd_init_plan_phase', 'Assemble context for phase planning',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => init.cmdInitPlanPhase(cwd, a.phase));

defineTool('gsd_init_new_project', 'Assemble context for new project creation',
  { type: 'object', properties: {} },
  () => init.cmdInitNewProject(cwd));

defineTool('gsd_init_new_milestone', 'Assemble context for new milestone',
  { type: 'object', properties: {} },
  () => init.cmdInitNewMilestone(cwd));

defineTool('gsd_init_quick', 'Assemble context for quick task',
  { type: 'object', properties: { description: prop('string', 'Task description') } },
  (a) => init.cmdInitQuick(cwd, a.description));

defineTool('gsd_init_resume', 'Assemble context for resuming work',
  { type: 'object', properties: {} },
  () => init.cmdInitResume(cwd));

defineTool('gsd_init_verify_work', 'Assemble context for work verification',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => init.cmdInitVerifyWork(cwd, a.phase));

defineTool('gsd_init_phase_op', 'Assemble context for phase operations',
  { type: 'object', properties: { phase: prop('string', 'Phase number') }, required: ['phase'] },
  (a) => init.cmdInitPhaseOp(cwd, a.phase));

defineTool('gsd_init_todos', 'Assemble context for todo management',
  { type: 'object', properties: { area: prop('string', 'Filter by area') } },
  (a) => init.cmdInitTodos(cwd, a.area));

defineTool('gsd_init_milestone_op', 'Assemble context for milestone operations',
  { type: 'object', properties: {} },
  () => init.cmdInitMilestoneOp(cwd));

defineTool('gsd_init_map_codebase', 'Assemble context for codebase mapping',
  { type: 'object', properties: {} },
  () => init.cmdInitMapCodebase(cwd));

defineTool('gsd_init_progress', 'Assemble context for progress display',
  { type: 'object', properties: {} },
  () => init.cmdInitProgress(cwd));

// --- JSON-RPC 2.0 over stdio ---

const SERVER_INFO = { name: 'gsd-tools', version: '2.0.0' };
const SUPPORTED_VERSIONS = ['2025-11-25', '2025-03-26', '2024-11-05'];

function makeResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function makeError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function negotiateVersion(clientVersion) {
  if (SUPPORTED_VERSIONS.includes(clientVersion)) return clientVersion;
  return SUPPORTED_VERSIONS[0];
}

function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    const clientVersion = (params && params.protocolVersion) || SUPPORTED_VERSIONS[0];
    return makeResponse(id, {
      protocolVersion: negotiateVersion(clientVersion),
      serverInfo: SERVER_INFO,
      capabilities: { tools: { listChanged: false } },
    });
  }

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return null;
  }

  if (method === 'ping') {
    return makeResponse(id, {});
  }

  if (method === 'tools/list') {
    const toolList = Object.values(tools).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return makeResponse(id, { tools: toolList });
  }

  if (method === 'tools/call') {
    const toolName = params && params.name;
    const toolArgs = (params && params.arguments) || {};
    const tool = tools[toolName];

    if (!tool) {
      return makeResponse(id, {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool: ' + toolName }) }],
        isError: true,
      });
    }

    try {
      const result = tool.handler(toolArgs);
      if (result && typeof result.then === 'function') {
        return result.then(
          (val) => makeResponse(id, { content: [{ type: 'text', text: JSON.stringify(val, null, 2) }] }),
          (err) => makeResponse(id, { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true })
        );
      }
      return makeResponse(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (err) {
      return makeResponse(id, {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
        isError: true,
      });
    }
  }

  if (id === undefined || id === null) return null;
  return makeError(id, -32601, 'Method not found: ' + method);
}

// --- Stdio transport (auto-detect: Content-Length framed or newline-delimited JSON) ---

let buffer = '';
let transportMode = null; // 'content-length' or 'json-lines'

function send(obj) {
  const body = JSON.stringify(obj);
  if (transportMode === 'json-lines') {
    process.stdout.write(body + '\n');
  } else {
    const header = 'Content-Length: ' + Buffer.byteLength(body, 'utf-8') + '\r\n\r\n';
    process.stdout.write(header + body);
  }
}

function dispatch(msg) {
  const response = handleRequest(msg);
  if (response && typeof response.then === 'function') {
    response.then(function(r) { if (r) send(r); });
  } else if (response) {
    send(response);
  }
}

function processJsonLines() {
  let newlineIdx;
  while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.substring(0, newlineIdx).trim();
    buffer = buffer.substring(newlineIdx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      send(makeError(null, -32700, 'Parse error'));
      continue;
    }
    dispatch(msg);
  }
  // Try parsing remaining buffer as complete JSON (no trailing newline yet)
  if (buffer.length > 0) {
    const trimmed = buffer.trim();
    if (trimmed.endsWith('}')) {
      try {
        const msg = JSON.parse(trimmed);
        buffer = '';
        dispatch(msg);
      } catch (e) {
        // Incomplete, wait for more data
      }
    }
  }
}

function processContentLength() {
  while (true) {
    // Accept both \r\n\r\n (spec) and \n\n (some clients)
    const crlfEnd = buffer.indexOf('\r\n\r\n');
    const lfEnd = buffer.indexOf('\n\n');
    let headerEnd, sepLen;
    if (crlfEnd !== -1 && (lfEnd === -1 || crlfEnd <= lfEnd)) {
      headerEnd = crlfEnd; sepLen = 4;
    } else if (lfEnd !== -1) {
      headerEnd = lfEnd; sepLen = 2;
    } else {
      break;
    }

    const header = buffer.substring(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.substring(headerEnd + sepLen);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = headerEnd + sepLen;

    if (Buffer.byteLength(buffer.substring(bodyStart), 'utf-8') < contentLength) break;

    const body = buffer.substring(bodyStart, bodyStart + contentLength);
    buffer = buffer.substring(bodyStart + contentLength);

    let msg;
    try {
      msg = JSON.parse(body);
    } catch (e) {
      send(makeError(null, -32700, 'Parse error'));
      continue;
    }
    dispatch(msg);
  }
}

function processBuffer() {
  // Auto-detect transport on first data
  if (transportMode === null) {
    const trimmed = buffer.trimStart();
    if (trimmed.startsWith('{')) {
      transportMode = 'json-lines';
    } else if (trimmed.startsWith('Content-Length')) {
      transportMode = 'content-length';
    } else if (trimmed.length > 0) {
      // Unknown format, try json-lines as fallback
      transportMode = 'json-lines';
    } else {
      return; // No data yet
    }
  }

  if (transportMode === 'json-lines') {
    processJsonLines();
  } else {
    processContentLength();
  }
}

process.stdin.setEncoding('utf-8');
process.stdin.on('data', function(chunk) {
  buffer += chunk;
  processBuffer();
});

process.stderr.write('GSD MCP Server v' + SERVER_INFO.version + ' - workspace: ' + cwd + (_usingFallback ? ' (fallback: cwd)' : '') + '\n');