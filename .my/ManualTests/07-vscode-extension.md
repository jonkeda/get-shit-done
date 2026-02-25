# Manual Test: VS Code Extension

**Tests the VS Code extension scaffold works correctly.**

Prerequisite: Extension is built or loaded in development mode.

---

## MT-36: Extension activates

1. Open a workspace that has `.planning/` directory
2. Check the Activity Bar for the GSD rocket icon
3. **Expected:** Icon appears, clicking it opens the GSD Explorer tree view
4. **Pass/Fail:** ___

## MT-37: Status bar shows phase info

1. With `.planning/STATE.md` containing active phase info
2. **Expected:** Status bar item (left side) shows current phase/plan, color-coded
3. **Pass/Fail:** ___

## MT-38: Tree view shows project structure

1. Expand the GSD Explorer tree view
2. **Expected:** Shows sections for: Project, Progress, Phases (expandable with plan children), Todos, Blockers
3. **Pass/Fail:** ___

## MT-39: Commands route to Copilot

1. Open command palette (Ctrl+Shift+P)
2. Type "GSD"
3. **Expected:** Shows 6 commands: New Project, Plan Phase, Execute Phase, Quick Task, Progress, Switch Profile
4. Execute "GSD: Quick Task" 
5. **Expected:** Opens Copilot chat with `/gsd-quick` context
6. **Pass/Fail:** ___

## MT-40: Extension doesn't activate without `.planning/`

1. Open a workspace WITHOUT `.planning/` directory
2. **Expected:** No GSD icon in activity bar, no status bar item
3. **Pass/Fail:** ___
