---
mode: agent
description: "Check for GSD updates"
tools: [execute]
---

Check for GSD updates via npm, display changelog, and execute update on confirmation.

## Process

### 1. Get Installed Version

Check the installed GSD version:

```bash
# Check for VERSION file in the workspace or global install
cat ./.gsd/VERSION 2>/dev/null || cat "$HOME/.gsd/VERSION" 2>/dev/null || echo "UNKNOWN"
```

If version unknown, treat as 0.0.0 and proceed to install.

### 2. Check Latest Version

```bash
npm view get-shit-done-cc version 2>/dev/null
```

If npm check fails:
```
Couldn't check for updates (offline or npm unavailable).
To update manually: npx get-shit-done-cc@latest
```
Exit.

### 3. Compare Versions

- If installed == latest: "You're already on the latest version." — exit.
- If installed > latest: "You're ahead of the latest release (development version?)." — exit.

### 4. Show Changes and Confirm

If update available, display:

```
## GSD Update Available

**Installed:** {installed}
**Latest:** {latest}

### What's New
[Fetch and display changelog entries between installed and latest versions]

⚠️  Note: The installer performs a clean install of GSD folders.
Your custom files outside GSD directories are preserved.
```

Ask: "Proceed with update?" — Yes / No

If No: exit.

### 5. Run Update

```bash
npx -y get-shit-done-cc@latest
```

### 6. Display Result

```
╔═══════════════════════════════════════════════════════════╗
║  GSD Updated: v{old} → v{new}                             ║
╚═══════════════════════════════════════════════════════════╝

⚠️  Restart your editor to pick up the new commands.
```
