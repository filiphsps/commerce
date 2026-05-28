---
name: block-new-error
enabled: true
event: file
pattern: new\s+Error\s*\(
action: block
---

🚫 **`new Error(...)` is banned in this repo.**

CLAUDE.md: throw via `@nordcom/commerce-errors`, never `new Error(...)`.

If no class fits, add one (plus `*ErrorKind` and a `getErrorFromCode` case) in the errors package.
