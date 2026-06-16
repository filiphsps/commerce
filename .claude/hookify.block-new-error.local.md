---
name: block-new-error
enabled: true
event: file
action: block
conditions:
  - field: new_text, operator: regex_match, pattern: new\s+Error\s*\(
  - field: file_path, operator: not_contains, pattern: /scripts/
  - field: file_path, operator: not_contains, pattern: packages/next-build-notifier/
  - field: file_path, operator: not_contains, pattern: .claude/mcp/
---

🚫 **The native `Error` constructor is banned in app and package source.**

CLAUDE.md: throw via `@nordcom/commerce-errors`. If no class fits, add one (plus
`*ErrorKind` and a `getErrorFromCode` case) in the errors package.

Exempt:
- build/codegen tooling under any `scripts/` directory, where the runtime errors
  package is not a dependency and a plain `Error` is appropriate.
- standalone, dependency-free OSS packages that deliberately ship no Nordcom
  runtime dependency (see docs/adr/0001). These are allowlisted by path above —
  add one `not_contains` condition per such package.
