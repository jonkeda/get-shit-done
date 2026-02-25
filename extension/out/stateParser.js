"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStateMd = parseStateMd;
exports.parseRoadmapMd = parseRoadmapMd;
exports.parsePhaseDir = parsePhaseDir;
const vscode = __importStar(require("vscode"));
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        return {};
    }
    const fm = {};
    for (const line of match[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
        if (kv) {
            fm[kv[1]] = kv[2].trim();
        }
    }
    return fm;
}
function parseStateMd(content) {
    const fm = parseFrontmatter(content);
    const state = {};
    state.milestone = fm['milestone'] || undefined;
    state.status = fm['status'] || undefined;
    state.progress = fm['progress'] || undefined;
    if (fm['phase']) {
        const phaseMatch = fm['phase'].match(/^(\d+)/);
        if (phaseMatch) {
            state.phase = parseInt(phaseMatch[1], 10);
        }
    }
    if (fm['total-phases']) {
        state.totalPhases = parseInt(fm['total-phases'], 10);
    }
    if (fm['plan']) {
        const planMatch = fm['plan'].match(/^(\d+)/);
        if (planMatch) {
            state.plan = parseInt(planMatch[1], 10);
        }
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
function parseRoadmapMd(content) {
    const phases = [];
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
        }
        else if (/\bstatus:\s*(active|executing|in.?progress)\b/i.test(afterHeading)) {
            status = 'active';
        }
        else if (/\bstatus:\s*(skipped)\b/i.test(afterHeading)) {
            status = 'skipped';
        }
        phases.push({ number: num, name, status });
    }
    return phases;
}
async function parsePhaseDir(uri) {
    const plans = [];
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
    }
    catch {
        // Directory may not exist
    }
    return plans;
}
//# sourceMappingURL=stateParser.js.map