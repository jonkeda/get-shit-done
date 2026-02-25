# Manual Test: Templates & File Structure

**Verifies all templates exist and are referenced correctly.**

---

## MT-29: Skill template completeness

Run from repo root:
```powershell
$skills = @("gsd-quick","gsd-new-project","gsd-plan-phase","gsd-execute-phase",
  "gsd-discuss-phase","gsd-verify-work","gsd-debug","gsd-map-codebase","gsd-milestone")
foreach ($s in $skills) {
  $path = ".github\skills\$s"
  $skill = Test-Path "$path\SKILL.md"
  $tmpl = (Get-ChildItem "$path\templates" -Recurse -File -EA 0).Count
  $refs = (Get-ChildItem "$path\references" -Recurse -File -EA 0).Count
  "$s : SKILL=$skill templates=$tmpl references=$refs"
}
```

**Expected:** All 9 skills have SKILL.md = True. Template/reference counts > 0 for all except gsd-debug and gsd-discuss-phase (which may have 0 references).

**Pass/Fail:** ___

## MT-30: Codebase mapping templates — 7 files

```powershell
$expected = @("STACK.md","INTEGRATIONS.md","ARCHITECTURE.md","STRUCTURE.md",
  "CONVENTIONS.md","TESTING.md","CONCERNS.md")
foreach ($f in $expected) {
  $exists = Test-Path ".github\skills\gsd-map-codebase\templates\codebase\$f"
  "  $f : $exists"
}
```

**Expected (after fix):** All 7 return True.

**Pass/Fail:** ___

## MT-31: Research-project templates — 7 files

```powershell
$expected = @("STACK.md","FEATURES.md","ARCHITECTURE.md","PITFALLS.md",
  "SUMMARY.md","COMPARISON.md","FEASIBILITY.md")
foreach ($f in $expected) {
  $exists = Test-Path ".gsd\templates\research-project\$f"
  "  $f : $exists"
}
```

**Expected (after fix):** All 7 return True.

**Pass/Fail:** ___

## MT-32: Runtime templates in `.gsd/templates/`

```powershell
@("summary-standard.md","summary-complex.md","summary-minimal.md",
  "planner-subagent-prompt.md","debug-subagent-prompt.md",
  "config.json","state.md","continue-here.md","summary.md") | ForEach-Object {
  "  $_ : $(Test-Path ".gsd\templates\$_")"
}
```

**Expected:** All True.

**Pass/Fail:** ___

## MT-33: Agent frontmatter completeness

```powershell
Get-ChildItem ".github\agents\*.agent.md" | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  $model = $c -match '(?m)^model:'
  $ui = $c -match '(?m)^user-invocable:'
  $ho = $c -match '(?m)^handoffs:'
  "$($_.BaseName) : model=$model invocable=$ui handoffs=$ho"
}
```

**Expected:** All 11 agents show True/True/True.

**Pass/Fail:** ___

## MT-34: Zero stale references

```powershell
$count = (Select-String -Path ".github\agents\*.agent.md",".github\prompts\*.prompt.md",
  ".github\skills\*\SKILL.md" -Pattern "gsd-tools\.cjs|~/\.(gsd|claude)|Bash\(|Task\(" -EA 0 |
  Measure-Object).Count
"Stale references: $count"
```

**Expected:** 0

**Pass/Fail:** ___

## MT-35: All tests pass

```powershell
npm test
```

**Expected:** 376+ tests, 0 failing.

**Pass/Fail:** ___
