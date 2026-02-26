/**
 * Phase — Phase CRUD, query, and lifecycle operations
 * Ported from get-shit-done/bin/lib/phase.cjs for MCP server
 */

const fs = require('fs');
const path = require('path');
const { escapeRegex, normalizePhaseName, comparePhaseNum, findPhaseInternal, getArchivedPhaseDirs, generateSlugInternal } = require('./core.js');
const { extractFrontmatter } = require('./frontmatter.js');

function cmdPhasesList(cwd, options) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const { type, phase, includeArchived } = options;

  if (!fs.existsSync(phasesDir)) {
    return type ? { files: [], count: 0 } : { directories: [], count: 0 };
  }

  const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
  let dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  if (includeArchived) {
    const archived = getArchivedPhaseDirs(cwd);
    for (const a of archived) {
      dirs.push(`${a.name} [${a.milestone}]`);
    }
  }

  dirs.sort((a, b) => comparePhaseNum(a, b));

  if (phase) {
    const normalized = normalizePhaseName(phase);
    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) {
      return { files: [], count: 0, phase_dir: null, error: 'Phase not found' };
    }
    dirs = [match];
  }

  if (type) {
    const files = [];
    for (const dir of dirs) {
      const dirPath = path.join(phasesDir, dir);
      const dirFiles = fs.readdirSync(dirPath);
      let filtered;
      if (type === 'plans') {
        filtered = dirFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md');
      } else if (type === 'summaries') {
        filtered = dirFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
      } else {
        filtered = dirFiles;
      }
      files.push(...filtered.sort());
    }
    return {
      files,
      count: files.length,
      phase_dir: phase ? dirs[0].replace(/^\d+(?:\.\d+)*-?/, '') : null,
    };
  }

  return { directories: dirs, count: dirs.length };
}

function cmdPhaseNextDecimal(cwd, basePhase) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(basePhase);

  if (!fs.existsSync(phasesDir)) {
    return { found: false, base_phase: normalized, next: `${normalized}.1`, existing: [] };
  }

  const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  const baseExists = dirs.some(d => d.startsWith(normalized + '-') || d === normalized);

  const decimalPattern = new RegExp(`^${normalized}\\.(\\d+)`);
  const existingDecimals = [];
  for (const dir of dirs) {
    const match = dir.match(decimalPattern);
    if (match) existingDecimals.push(`${normalized}.${match[1]}`);
  }
  existingDecimals.sort((a, b) => comparePhaseNum(a, b));

  let nextDecimal;
  if (existingDecimals.length === 0) {
    nextDecimal = `${normalized}.1`;
  } else {
    const lastDecimal = existingDecimals[existingDecimals.length - 1];
    const lastNum = parseInt(lastDecimal.split('.')[1], 10);
    nextDecimal = `${normalized}.${lastNum + 1}`;
  }

  return { found: baseExists, base_phase: normalized, next: nextDecimal, existing: existingDecimals };
}

function cmdFindPhase(cwd, phase) {
  if (!phase) throw new Error('phase identifier required');

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);
  const notFound = { found: false, directory: null, phase_number: null, phase_name: null, plans: [], summaries: [] };

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    const match = dirs.find(d => d.startsWith(normalized));
    if (!match) return notFound;

    const dirMatch = match.match(/^(\d+[A-Z]?(?:\.\d+)*)-?(.*)/i);
    const phaseNumber = dirMatch ? dirMatch[1] : normalized;
    const phaseName = dirMatch && dirMatch[2] ? dirMatch[2] : null;

    const phaseDir = path.join(phasesDir, match);
    const phaseFiles = fs.readdirSync(phaseDir);
    const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
    const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').sort();

    return {
      found: true,
      directory: path.join('.planning', 'phases', match),
      phase_number: phaseNumber,
      phase_name: phaseName,
      plans,
      summaries,
    };
  } catch {
    return notFound;
  }
}

function cmdPhasePlanIndex(cwd, phase) {
  if (!phase) throw new Error('phase required for phase-plan-index');

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalized = normalizePhaseName(phase);

  let phaseDir = null;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    const match = dirs.find(d => d.startsWith(normalized));
    if (match) phaseDir = path.join(phasesDir, match);
  } catch {}

  if (!phaseDir) {
    return { phase: normalized, error: 'Phase not found', plans: [], waves: {}, incomplete: [], has_checkpoints: false };
  }

  const phaseFiles = fs.readdirSync(phaseDir);
  const planFiles = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').sort();
  const summaryFiles = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
  const completedPlanIds = new Set(
    summaryFiles.map(s => s.replace('-SUMMARY.md', '').replace('SUMMARY.md', ''))
  );

  const plans = [];
  const waves = {};
  const incomplete = [];
  let hasCheckpoints = false;

  for (const planFile of planFiles) {
    const planId = planFile.replace('-PLAN.md', '').replace('PLAN.md', '');
    const planPath = path.join(phaseDir, planFile);
    const content = fs.readFileSync(planPath, 'utf-8');
    const fm = extractFrontmatter(content);

    const taskMatches = content.match(/##\s*Task\s*\d+/gi) || [];
    const taskCount = taskMatches.length;
    const wave = parseInt(fm.wave, 10) || 1;

    let autonomous = true;
    if (fm.autonomous !== undefined) {
      autonomous = fm.autonomous === 'true' || fm.autonomous === true;
    }
    if (!autonomous) hasCheckpoints = true;

    let filesModified = [];
    if (fm['files-modified']) {
      filesModified = Array.isArray(fm['files-modified']) ? fm['files-modified'] : [fm['files-modified']];
    }

    const hasSummary = completedPlanIds.has(planId);
    if (!hasSummary) incomplete.push(planId);

    plans.push({
      id: planId,
      wave,
      autonomous,
      objective: fm.objective || null,
      files_modified: filesModified,
      task_count: taskCount,
      has_summary: hasSummary,
    });

    const waveKey = String(wave);
    if (!waves[waveKey]) waves[waveKey] = [];
    waves[waveKey].push(planId);
  }

  return { phase: normalized, plans, waves, incomplete, has_checkpoints: hasCheckpoints };
}

function cmdPhaseAdd(cwd, description) {
  if (!description) throw new Error('description required for phase add');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) throw new Error('ROADMAP.md not found');

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const slug = generateSlugInternal(description);

  const phasePattern = /#{2,4}\s*Phase\s+(\d+)[A-Z]?(?:\.\d+)*:/gi;
  let maxPhase = 0;
  let m;
  while ((m = phasePattern.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    if (num > maxPhase) maxPhase = num;
  }

  const newPhaseNum = maxPhase + 1;
  const paddedNum = String(newPhaseNum).padStart(2, '0');
  const dirName = `${paddedNum}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);

  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');

  const phaseEntry = `\n### Phase ${newPhaseNum}: ${description}\n\n**Goal:** [To be planned]\n**Requirements**: TBD\n**Depends on:** Phase ${maxPhase}\n**Plans:** 0 plans\n\nPlans:\n- [ ] TBD (run /gsd:plan-phase ${newPhaseNum} to break down)\n`;

  let updatedContent;
  const lastSeparator = content.lastIndexOf('\n---');
  if (lastSeparator > 0) {
    updatedContent = content.slice(0, lastSeparator) + phaseEntry + content.slice(lastSeparator);
  } else {
    updatedContent = content + phaseEntry;
  }

  fs.writeFileSync(roadmapPath, updatedContent, 'utf-8');

  return {
    phase_number: newPhaseNum,
    padded: paddedNum,
    name: description,
    slug,
    directory: `.planning/phases/${dirName}`,
  };
}

function cmdPhaseInsert(cwd, afterPhase, description) {
  if (!afterPhase || !description) throw new Error('after-phase and description required for phase insert');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) throw new Error('ROADMAP.md not found');

  const content = fs.readFileSync(roadmapPath, 'utf-8');
  const slug = generateSlugInternal(description);

  const normalizedAfter = normalizePhaseName(afterPhase);
  const unpadded = normalizedAfter.replace(/^0+/, '');
  const afterPhaseEscaped = unpadded.replace(/\./g, '\\.');
  const targetPattern = new RegExp(`#{2,4}\\s*Phase\\s+0*${afterPhaseEscaped}:`, 'i');
  if (!targetPattern.test(content)) throw new Error(`Phase ${afterPhase} not found in ROADMAP.md`);

  const phasesDir = path.join(cwd, '.planning', 'phases');
  const normalizedBase = normalizePhaseName(afterPhase);
  let existingDecimals = [];

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    const decimalPattern = new RegExp(`^${normalizedBase}\\.(\\d+)`);
    for (const dir of dirs) {
      const dm = dir.match(decimalPattern);
      if (dm) existingDecimals.push(parseInt(dm[1], 10));
    }
  } catch {}

  const nextDecimal = existingDecimals.length === 0 ? 1 : Math.max(...existingDecimals) + 1;
  const decimalPhase = `${normalizedBase}.${nextDecimal}`;
  const dirName = `${decimalPhase}-${slug}`;
  const dirPath = path.join(cwd, '.planning', 'phases', dirName);

  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');

  const phaseEntry = `\n### Phase ${decimalPhase}: ${description} (INSERTED)\n\n**Goal:** [Urgent work - to be planned]\n**Requirements**: TBD\n**Depends on:** Phase ${afterPhase}\n**Plans:** 0 plans\n\nPlans:\n- [ ] TBD (run /gsd:plan-phase ${decimalPhase} to break down)\n`;

  const headerPattern = new RegExp(`(#{2,4}\\s*Phase\\s+0*${afterPhaseEscaped}:[^\\n]*\\n)`, 'i');
  const headerMatch = content.match(headerPattern);
  if (!headerMatch) throw new Error(`Could not find Phase ${afterPhase} header`);

  const headerIdx = content.indexOf(headerMatch[0]);
  const afterHeader = content.slice(headerIdx + headerMatch[0].length);
  const nextPhaseMatch = afterHeader.match(/\n#{2,4}\s+Phase\s+\d/i);

  let insertIdx;
  if (nextPhaseMatch) {
    insertIdx = headerIdx + headerMatch[0].length + nextPhaseMatch.index;
  } else {
    insertIdx = content.length;
  }

  const updatedContent = content.slice(0, insertIdx) + phaseEntry + content.slice(insertIdx);
  fs.writeFileSync(roadmapPath, updatedContent, 'utf-8');

  return {
    phase_number: decimalPhase,
    after_phase: afterPhase,
    name: description,
    slug,
    directory: `.planning/phases/${dirName}`,
  };
}

function cmdPhaseRemove(cwd, targetPhase, options) {
  if (!targetPhase) throw new Error('phase number required for phase remove');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const force = options?.force || false;

  if (!fs.existsSync(roadmapPath)) throw new Error('ROADMAP.md not found');

  const normalized = normalizePhaseName(targetPhase);
  const isDecimal = targetPhase.includes('.');

  let targetDir = null;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    targetDir = dirs.find(d => d.startsWith(normalized + '-') || d === normalized);
  } catch {}

  if (targetDir && !force) {
    const targetPath = path.join(phasesDir, targetDir);
    const files = fs.readdirSync(targetPath);
    const summaries = files.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');
    if (summaries.length > 0) {
      throw new Error(`Phase ${targetPhase} has ${summaries.length} executed plan(s). Use force to remove anyway.`);
    }
  }

  if (targetDir) {
    fs.rmSync(path.join(phasesDir, targetDir), { recursive: true, force: true });
  }

  const renamedDirs = [];
  const renamedFiles = [];

  if (isDecimal) {
    const baseParts = normalized.split('.');
    const baseInt = baseParts[0];
    const removedDecimal = parseInt(baseParts[1], 10);

    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
      const decPattern = new RegExp(`^${baseInt}\\.(\\d+)-(.+)$`);
      const toRename = [];
      for (const dir of dirs) {
        const dm = dir.match(decPattern);
        if (dm && parseInt(dm[1], 10) > removedDecimal) {
          toRename.push({ dir, oldDecimal: parseInt(dm[1], 10), slug: dm[2] });
        }
      }
      toRename.sort((a, b) => b.oldDecimal - a.oldDecimal);

      for (const item of toRename) {
        const newDecimal = item.oldDecimal - 1;
        const oldPhaseId = `${baseInt}.${item.oldDecimal}`;
        const newPhaseId = `${baseInt}.${newDecimal}`;
        const newDirName = `${baseInt}.${newDecimal}-${item.slug}`;
        fs.renameSync(path.join(phasesDir, item.dir), path.join(phasesDir, newDirName));
        renamedDirs.push({ from: item.dir, to: newDirName });

        const dirFiles = fs.readdirSync(path.join(phasesDir, newDirName));
        for (const f of dirFiles) {
          if (f.includes(oldPhaseId)) {
            const newFileName = f.replace(oldPhaseId, newPhaseId);
            fs.renameSync(path.join(phasesDir, newDirName, f), path.join(phasesDir, newDirName, newFileName));
            renamedFiles.push({ from: f, to: newFileName });
          }
        }
      }
    } catch {}
  } else {
    const removedInt = parseInt(normalized, 10);
    try {
      const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
      const toRename = [];
      for (const dir of dirs) {
        const dm = dir.match(/^(\d+)([A-Z])?(?:\.(\d+))?-(.+)$/i);
        if (!dm) continue;
        const dirInt = parseInt(dm[1], 10);
        if (dirInt > removedInt) {
          toRename.push({ dir, oldInt: dirInt, letter: dm[2] ? dm[2].toUpperCase() : '', decimal: dm[3] ? parseInt(dm[3], 10) : null, slug: dm[4] });
        }
      }
      toRename.sort((a, b) => {
        if (a.oldInt !== b.oldInt) return b.oldInt - a.oldInt;
        return (b.decimal || 0) - (a.decimal || 0);
      });

      for (const item of toRename) {
        const newInt = item.oldInt - 1;
        const newPadded = String(newInt).padStart(2, '0');
        const oldPadded = String(item.oldInt).padStart(2, '0');
        const letterSuffix = item.letter || '';
        const decimalSuffix = item.decimal !== null ? `.${item.decimal}` : '';
        const oldPrefix = `${oldPadded}${letterSuffix}${decimalSuffix}`;
        const newPrefix = `${newPadded}${letterSuffix}${decimalSuffix}`;
        const newDirName = `${newPrefix}-${item.slug}`;

        fs.renameSync(path.join(phasesDir, item.dir), path.join(phasesDir, newDirName));
        renamedDirs.push({ from: item.dir, to: newDirName });

        const dirFiles = fs.readdirSync(path.join(phasesDir, newDirName));
        for (const f of dirFiles) {
          if (f.startsWith(oldPrefix)) {
            const newFileName = newPrefix + f.slice(oldPrefix.length);
            fs.renameSync(path.join(phasesDir, newDirName, f), path.join(phasesDir, newDirName, newFileName));
            renamedFiles.push({ from: f, to: newFileName });
          }
        }
      }
    } catch {}
  }

  let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
  const targetEscaped = escapeRegex(targetPhase);

  const sectionPattern = new RegExp(
    `\\n?#{2,4}\\s*Phase\\s+${targetEscaped}\\s*:[\\s\\S]*?(?=\\n#{2,4}\\s+Phase\\s+\\d|$)`, 'i'
  );
  roadmapContent = roadmapContent.replace(sectionPattern, '');

  const checkboxPattern = new RegExp(`\\n?-\\s*\\[[ x]\\]\\s*.*Phase\\s+${targetEscaped}[:\\s][^\\n]*`, 'gi');
  roadmapContent = roadmapContent.replace(checkboxPattern, '');

  const tableRowPattern = new RegExp(`\\n?\\|\\s*${targetEscaped}\\.?\\s[^|]*\\|[^\\n]*`, 'gi');
  roadmapContent = roadmapContent.replace(tableRowPattern, '');

  if (!isDecimal) {
    const removedInt = parseInt(normalized, 10);
    const maxPhase = 99;
    for (let oldNum = maxPhase; oldNum > removedInt; oldNum--) {
      const newNum = oldNum - 1;
      const oldStr = String(oldNum);
      const newStr = String(newNum);
      const oldPad = oldStr.padStart(2, '0');
      const newPad = newStr.padStart(2, '0');

      roadmapContent = roadmapContent.replace(new RegExp(`(#{2,4}\\s*Phase\\s+)${oldStr}(\\s*:)`, 'gi'), `$1${newStr}$2`);
      roadmapContent = roadmapContent.replace(new RegExp(`(Phase\\s+)${oldStr}([:\\s])`, 'g'), `$1${newStr}$2`);
      roadmapContent = roadmapContent.replace(new RegExp(`${oldPad}-(\\d{2})`, 'g'), `${newPad}-$1`);
      roadmapContent = roadmapContent.replace(new RegExp(`(\\|\\s*)${oldStr}\\.\\s`, 'g'), `$1${newStr}. `);
      roadmapContent = roadmapContent.replace(new RegExp(`(Depends on:\\*\\*\\s*Phase\\s+)${oldStr}\\b`, 'gi'), `$1${newStr}`);
    }
  }

  fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  let stateUpdated = false;
  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    const totalPattern = /(\*\*Total Phases:\*\*\s*)(\d+)/;
    const totalMatch = stateContent.match(totalPattern);
    if (totalMatch) {
      const oldTotal = parseInt(totalMatch[2], 10);
      stateContent = stateContent.replace(totalPattern, `$1${oldTotal - 1}`);
    }
    const ofPattern = /(\bof\s+)(\d+)(\s*(?:\(|phases?))/i;
    const ofMatch = stateContent.match(ofPattern);
    if (ofMatch) {
      const oldTotal = parseInt(ofMatch[2], 10);
      stateContent = stateContent.replace(ofPattern, `$1${oldTotal - 1}$3`);
    }
    fs.writeFileSync(statePath, stateContent, 'utf-8');
    stateUpdated = true;
  }

  return {
    removed: targetPhase,
    directory_deleted: targetDir || null,
    renamed_directories: renamedDirs,
    renamed_files: renamedFiles,
    roadmap_updated: true,
    state_updated: stateUpdated,
  };
}

function cmdPhaseComplete(cwd, phaseNum) {
  if (!phaseNum) throw new Error('phase number required for phase complete');

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const today = new Date().toISOString().split('T')[0];

  const phaseInfo = findPhaseInternal(cwd, phaseNum);
  if (!phaseInfo) throw new Error(`Phase ${phaseNum} not found`);

  const planCount = phaseInfo.plans.length;
  const summaryCount = phaseInfo.summaries.length;

  if (fs.existsSync(roadmapPath)) {
    let roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    const checkboxPattern = new RegExp(
      `(-\\s*\\[)[ ](\\]\\s*.*Phase\\s+${escapeRegex(phaseNum)}[:\\s][^\\n]*)`, 'i'
    );
    roadmapContent = roadmapContent.replace(checkboxPattern, `$1x$2 (completed ${today})`);

    const phaseEscaped = escapeRegex(phaseNum);
    const tablePattern = new RegExp(
      `(\\|\\s*${phaseEscaped}\\.?\\s[^|]*\\|[^|]*\\|)\\s*[^|]*(\\|)\\s*[^|]*(\\|)`, 'i'
    );
    roadmapContent = roadmapContent.replace(tablePattern, `$1 Complete    $2 ${today} $3`);

    const planCountPattern = new RegExp(
      `(#{2,4}\\s*Phase\\s+${phaseEscaped}[\\s\\S]*?\\*\\*Plans:\\*\\*\\s*)[^\\n]+`, 'i'
    );
    roadmapContent = roadmapContent.replace(planCountPattern, `$1${summaryCount}/${planCount} plans complete`);
    fs.writeFileSync(roadmapPath, roadmapContent, 'utf-8');

    const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
    if (fs.existsSync(reqPath)) {
      const reqMatch = roadmapContent.match(
        new RegExp(`Phase\\s+${escapeRegex(phaseNum)}[\\s\\S]*?\\*\\*Requirements:\\*\\*\\s*([^\\n]+)`, 'i')
      );
      if (reqMatch) {
        const reqIds = reqMatch[1].replace(/[\[\]]/g, '').split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
        let reqContent = fs.readFileSync(reqPath, 'utf-8');
        for (const reqId of reqIds) {
          const reqEscaped = escapeRegex(reqId);
          reqContent = reqContent.replace(
            new RegExp(`(-\\s*\\[)[ ](\\]\\s*\\*\\*${reqEscaped}\\*\\*)`, 'gi'), '$1x$2'
          );
          reqContent = reqContent.replace(
            new RegExp(`(\\|\\s*${reqEscaped}\\s*\\|[^|]+\\|)\\s*Pending\\s*(\\|)`, 'gi'), '$1 Complete $2'
          );
        }
        fs.writeFileSync(reqPath, reqContent, 'utf-8');
      }
    }
  }

  let nextPhaseNum = null;
  let nextPhaseName = null;
  let isLastPhase = true;
  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));
    for (const dir of dirs) {
      const dm = dir.match(/^(\d+[A-Z]?(?:\.\d+)*)-?(.*)/i);
      if (dm && comparePhaseNum(dm[1], phaseNum) > 0) {
        nextPhaseNum = dm[1];
        nextPhaseName = dm[2] || null;
        isLastPhase = false;
        break;
      }
    }
  } catch {}

  if (fs.existsSync(statePath)) {
    let stateContent = fs.readFileSync(statePath, 'utf-8');
    stateContent = stateContent.replace(/(\*\*Current Phase:\*\*\s*).*/, `$1${nextPhaseNum || phaseNum}`);
    if (nextPhaseName) {
      stateContent = stateContent.replace(/(\*\*Current Phase Name:\*\*\s*).*/, `$1${nextPhaseName.replace(/-/g, ' ')}`);
    }
    stateContent = stateContent.replace(/(\*\*Status:\*\*\s*).*/, `$1${isLastPhase ? 'Milestone complete' : 'Ready to plan'}`);
    stateContent = stateContent.replace(/(\*\*Current Plan:\*\*\s*).*/, '$1Not started');
    stateContent = stateContent.replace(/(\*\*Last Activity:\*\*\s*).*/, `$1${today}`);
    stateContent = stateContent.replace(/(\*\*Last Activity Description:\*\*\s*).*/, `$1Phase ${phaseNum} complete${nextPhaseNum ? `, transitioned to Phase ${nextPhaseNum}` : ''}`);
    fs.writeFileSync(statePath, stateContent, 'utf-8');
  }

  return {
    completed_phase: phaseNum,
    phase_name: phaseInfo.phase_name,
    plans_executed: `${summaryCount}/${planCount}`,
    next_phase: nextPhaseNum,
    next_phase_name: nextPhaseName,
    is_last_phase: isLastPhase,
    date: today,
    roadmap_updated: fs.existsSync(roadmapPath),
    state_updated: fs.existsSync(statePath),
  };
}

module.exports = {
  cmdPhasesList,
  cmdPhaseNextDecimal,
  cmdFindPhase,
  cmdPhasePlanIndex,
  cmdPhaseAdd,
  cmdPhaseInsert,
  cmdPhaseRemove,
  cmdPhaseComplete,
};
