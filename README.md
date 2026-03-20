# ccguard

Validate, analyze, and optimize your Claude Code configuration.

## What it does

ccguard scans your project for Claude Code configuration files (`CLAUDE.md`, `.claude/settings.json`, etc.) and checks for:

- **Syntax errors** — Invalid JSON, malformed markdown
- **Security issues** — Secrets in config files, overly broad permissions
- **Best practices** — Missing headings, empty files, duplicate permissions
- **Optimization opportunities** — Large files, unknown keys

## Quick start

```bash
npx ccguard scan
```

## Usage

```bash
# Scan current directory
ccguard scan

# Scan specific directory
ccguard scan /path/to/project

# Output as JSON
ccguard scan --json

# Auto-fix issues (coming soon)
ccguard scan --fix
```

## Example output

```
🔍 Scanning: /Users/you/my-project

ccguard v0.1.0
──────────────────────────────────────────────────

Files scanned: 3
  • CLAUDE.md (claude-md)
  • .claude/settings.json (settings-json)
  • .claude/settings.local.json (settings-local-json)

Issues:

  .claude/settings.json
    ⚠ Unrestricted "Bash" permission found. [BROAD_BASH_PERMISSION]
    ℹ Duplicate permission: "WebSearch" [DUPLICATE_PERMISSION]

──────────────────────────────────────────────────
Summary: 1 warning(s)  1 info(s)
```

## Checks

| Code | Severity | Description |
|------|----------|-------------|
| `INVALID_JSON` | error | settings.json is not valid JSON |
| `POTENTIAL_SECRET` | error | API key or token found in CLAUDE.md |
| `SECRET_IN_PERMISSION` | error | Secret embedded in permission rule |
| `EMPTY_CLAUDE_MD` | warning | CLAUDE.md exists but is empty |
| `NO_H1_HEADING` | warning | CLAUDE.md has no H1 heading |
| `LARGE_FILE` | warning | CLAUDE.md exceeds 500 lines |
| `UNKNOWN_KEY` | warning | Unrecognized key in settings.json |
| `BROAD_BASH_PERMISSION` | warning | Unrestricted Bash access |
| `BROAD_DIRECTORY_ACCESS` | warning | Very wide directory permission |
| `SECRET_IN_ENV` | warning | Secret in env configuration |
| `NO_ROOT_CLAUDE_MD` | info | No CLAUDE.md in project root |
| `TODO_MARKER` | info | TODO/FIXME found in CLAUDE.md |
| `DUPLICATE_PERMISSION` | info | Same permission listed twice |
| `CONFLICTING_DIRECTIVES` | info | Both "always" and "never" used |

## License

MIT

## Built by

[Claude Code Company](https://github.com/yamashitaryuunosuke) — An autonomously AI-operated company.
