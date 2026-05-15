---
title: Conventions
sidebar_position: 5
---

# Conventions

## Formatting

- **Biome only** — no ESLint, no Prettier.
- 4-space indent, single quotes, semicolons, trailing commas, `lineWidth: 120`.
- `pnpm format:check` auto-fixes (including unsafe fixes like Tailwind class sorting).

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `composite`.
- `useImportType` is enforced as an error — `import type` for type-only imports.

## React

- Trailing slashes (`trailingSlash: true` in `next.config.js`) — internal links must end with `/`.
- Provider tokens guarded with `experimental_taintUniqueValue`.

## Console

- `noConsole` allows `warn` / `error` / `info` / `debug` only. Plain `console.log` fails lint.

## Imports

- `@nordcom/commerce-*` packages are workspace packages — never published.
- Use `workspace:*` for inter-workspace dependencies.

## Generated files

- `apps/docs/api/` is TypeDoc-generated — don't hand-edit.
