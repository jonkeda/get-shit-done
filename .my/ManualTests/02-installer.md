# Manual Test: Installer

**Tests that the installer correctly sets up a fresh project.**

---

## MT-6: Fresh install (dry-run)

1. Create a temp directory: `mkdir $env:TEMP\gsd-test-install; cd $env:TEMP\gsd-test-install; git init`
2. Run: `node e:\repos\Private\get-shit-done2\bin\copilot-install.js --dry-run`
3. **Expected:** Output lists all files that WOULD be copied, including:
   - `.github/agents/*.agent.md` (11 files)
   - `.github/prompts/*.prompt.md` (17 files)
   - `.github/skills/*/` (9 skill dirs)
   - `.github/instructions/*.instructions.md` (6 files)
   - `.gsd/tools/` (MCP server + lib)
   - `.gsd/references/` (15 files)
   - `.gsd/templates/` (after fix — ~22 files)
   - `.vscode/mcp.json`
   - `copilot-instructions.md`
4. No files are actually created
5. **Pass/Fail:** ___

## MT-7: Fresh install (actual)

1. From the temp dir: `node e:\repos\Private\get-shit-done2\bin\copilot-install.js`
2. **Expected:** All files are copied. Verify:
   - `Test-Path .github\agents\gsd-planner.agent.md` → True
   - `Test-Path .gsd\tools\gsd-mcp-server.js` → True
   - `Test-Path .gsd\templates\summary-standard.md` → True (after fix)
   - `Test-Path .vscode\mcp.json` → True
   - `(Get-Content .gitignore) -match '\.gsd/'` → True
3. **Pass/Fail:** ___

## MT-8: Post-install verification message

1. After install, check output for verification results
2. **Expected:** "Verified: 4/4 critical files present" (or similar)
3. **Pass/Fail:** ___

## MT-9: Update mode

1. From the installed dir: `node e:\repos\Private\get-shit-done2\bin\copilot-install.js --update`
2. **Expected:** Files are overwritten, version is updated
3. `.gsd/VERSION` exists and contains version string
4. **Pass/Fail:** ___

## MT-10: Uninstall

1. Run: `node e:\repos\Private\get-shit-done2\bin\copilot-install.js --uninstall`
2. **Expected:**
   - `.github/agents/gsd-*.agent.md` removed
   - `.github/prompts/gsd-*.prompt.md` removed
   - `.gsd/` directory removed
   - `.vscode/mcp.json` cleaned (gsd-tools entry removed)
   - `.planning/` is preserved (if it existed)
3. **Pass/Fail:** ___

## MT-11: Instructions skip-if-exists

1. Fresh install first
2. Edit `.github/instructions/gsd-plans.instructions.md` — add a comment `<!-- user custom -->`
3. Run update: `node e:\repos\Private\get-shit-done2\bin\copilot-install.js --update`
4. **Expected:** The file is NOT overwritten — "Skipped (exists)" message shown
5. The `<!-- user custom -->` comment is still present
6. **Pass/Fail:** ___

## Cleanup

```powershell
Remove-Item -Recurse -Force $env:TEMP\gsd-test-install
```
