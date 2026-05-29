---
name: reload-claudemd-on-change
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: CLAUDE\.md$
---

📄 **A CLAUDE.md was just edited — re-read it now.**

Re-read the full CLAUDE.md you just changed before continuing. Its instructions
override default behavior, so any stale copy in context must be refreshed. If the
edit was made by a linter/formatter or another process, reconcile your understanding
with the new content rather than the version you remember.
