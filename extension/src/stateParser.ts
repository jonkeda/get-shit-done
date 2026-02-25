import * as vscode from 'vscode';
import * as path from 'path';

export interface GsdState {
  milestone?: string;
  phase?: number;
  totalPhases?: number;
  plan?: number;
  status?: string;
  progress?: string;
  todos?: string[];
  blockers?: string[];
}

export interface RoadmapPhase {
  number: number;
  name: string;
  status: string;
}

export interface PhasePlan {
  file: string;
  name: string;
  uri: vscode.Uri;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) { return {}; }
  const fm: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) {
      fm[kv[1]] = kv[2].trim();
    }
  }
  return fm;
}

export function parseStateMd(content: string): GsdState {
  const fm = parseFrontmatter(content);
  const state: GsdState = {};

  state.milestone = fm['milestone'] || undefined;
  state.status = fm['status'] || undefined;
  state.progress = fm['progress'] || undefined;

  if (fm['phase']) {
    const phaseMatch = fm['phase'].match(/^(\d+)/);
    if (phaseMatch) { state.phase = parseInt(phaseMatch[1], 10); }
  }
  if (fm['total-phases']) {
    state.totalPhases = parseInt(fm['total-phases'], 10);
  }
  if (fm['plan']) {
    const planMatch = fm['plan'].match(/^(\d+)/);
    if (planMatch) { state.plan = parseInt(planMatch[1], 10); }
  }

  // Parse todos from body
  const todosMatch = content.match(/## Todos?\r?\n([\s\S]*?)(?=\r?\n##|\s*$)/i);
  if (todosMatch) {
    state.todos = todosMatch[1]
      .split(/\r?\n/)
      .filter(l => l.match(/^[-*]\s/))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  // Parse blockers from body
  const blockersMatch = content.match(/## Blockers?\r?\n([\s\S]*?)(?=\r?\n##|\s*$)/i);
  if (blockersMatch) {
    state.blockers = blockersMatch[1]
      .split(/\r?\n/)
      .filter(l => l.match(/^[-*]\s/))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  return state;
}

export function parseRoadmapMd(content: string): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];
  // Match phase headings like "## Phase 1: Project Setup" or "### Phase 01 — Setup"
  const phaseRegex = /^#{2,3}\s+Phase\s+(\d+)[:\s—–-]+(.+)$/gim;
  let match;
  while ((match = phaseRegex.exec(content)) !== null) {
    const num = parseInt(match[1], 10);
    const name = match[2].trim();

    // Look for status marker after the heading
    const afterHeading = content.slice(match.index + match[0].length, match.index + match[0].length + 200);
    let status = 'pending';
    if (/\bstatus:\s*(complete|done)\b/i.test(afterHeading) || /\[x\]/i.test(afterHeading)) {
      status = 'complete';
    } else if (/\bstatus:\s*(active|executing|in.?progress)\b/i.test(afterHeading)) {
      status = 'active';
    } else if (/\bstatus:\s*(skipped)\b/i.test(afterHeading)) {
      status = 'skipped';
    }

    phases.push({ number: num, name, status });
  }
  return phases;
}

export async function parsePhaseDir(uri: vscode.Uri): Promise<PhasePlan[]> {
  const plans: PhasePlan[] = [];
  try {
    const entries = await vscode.workspace.fs.readDirectory(uri);
    for (const [name, type] of entries) {
      if (type === vscode.FileType.File && name.endsWith('-PLAN.md')) {
        plans.push({
          file: name,
          name: name.replace(/\.md$/, ''),
          uri: vscode.Uri.joinPath(uri, name),
        });
      }
    }
  } catch {
    // Directory may not exist
  }
  return plans;
}
