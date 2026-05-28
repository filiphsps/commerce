---
name: block-eslint-prettier
enabled: true
event: bash
pattern: (^|\s|/)(eslint|prettier)(\s|$)
action: block
---

🚫 **ESLint/Prettier are not used here.**

CLAUDE.md: **Biome only** for lint + format. Use `pnpm lint` / `pnpm format`.
