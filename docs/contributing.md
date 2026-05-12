---
title: Contributing
sidebar_position: 3
---

# Contributing

## Prerequisites

- Node.js 22.x, pnpm 11.x, MongoDB.
- `pnpm install` and `pnpm build:packages` must succeed in a fresh checkout — apps
  depend on each package's `dist/`.

## Quality gates

Before opening a PR, the following must pass locally:

```bash
pnpm lint           # biome lint .
pnpm typecheck      # turbo run typecheck
pnpm test           # vitest, requires MONGODB_URI
```

CI runs the same set in parallel on every PR.

## House style

- Biome formatting: 4-space indent, single quotes, semicolons, trailing commas, `lineWidth: 120`.
- `import type` is enforced (`useImportType` error).
- `console.log` fails lint; use `console.warn` / `console.error` / `console.info` / `console.debug`.
- See [Conventions](./conventions.md) for the full list.
