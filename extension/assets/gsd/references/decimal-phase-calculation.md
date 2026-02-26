# Decimal Phase Calculation

Calculate the next decimal phase number for urgent insertions.

## Using MCP Tools

Use the `gsd_phase_next-decimal` MCP tool:
```
gsd_phase_next-decimal 6
```

Output:
```json
{
  "found": true,
  "base_phase": "06",
  "next": "06.1",
  "existing": []
}
```

With existing decimals:
```json
{
  "found": true,
  "base_phase": "06",
  "next": "06.3",
  "existing": ["06.1", "06.2"]
}
```

## Extract Values

Use `gsd_phase_next-decimal` MCP tool with the target phase number. The result JSON contains:
- `next` — the next available decimal phase number
- `base_phase` — the zero-padded base phase

With `--raw` flag, returns just the decimal phase number (e.g., `06.1`).

## Examples

| Existing Phases | Next Phase |
|-----------------|------------|
| 06 only | 06.1 |
| 06, 06.1 | 06.2 |
| 06, 06.1, 06.2 | 06.3 |
| 06, 06.1, 06.3 (gap) | 06.4 |

## Directory Naming

Decimal phase directories use the full decimal number:

Use `gsd_generate-slug` MCP tool to create the slug, then build the directory path:

```
PHASE_DIR=".planning/phases/${DECIMAL_PHASE}-${SLUG}"
```

Example: `.planning/phases/06.1-fix-critical-auth-bug/`
