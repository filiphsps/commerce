---
title: TypeScript Project Structure
sidebar_position: 6
---

# TypeScript Project Structure

The repo has five tsconfig files at the root: one absolute base plus four purpose-named bases that extend it. Every concrete tsconfig under `apps/*` or `packages/*` extends exactly one of those four; test configs use a specific array-extends pattern, documented below.

## The five root files

| File | Extends | For |
| --- | --- | --- |
| `tsconfig.json` | — | Absolute base. Strict, ESNext, moduleResolution. Not extended directly by any concrete config. |
| `tsconfig.lib.json` | `tsconfig.json` | Packages in `./packages/**`. Composite, declaration, sourceMap, conventional `outDir`/`rootDir`. |
| `tsconfig.app.json` | `tsconfig.json` | Next.js apps in `./apps/**`. `noEmit`, `jsx: preserve`, DOM libs, Next plugin. |
| `tsconfig.test.json` | `tsconfig.json` | `*.test.*` files everywhere. Vitest/happy-dom types, `jsx: react-jsx`, `noEmit`. |
| `tsconfig.node.json` | `tsconfig.json` | Node-runtime TS: `vite.config.ts`, `vitest.config.ts`, scripts. |

## The inheritance invariant

Every concrete tsconfig either:

1. `extends` exactly one of the four bases, OR
2. (Test configs only) `extends` an array of `[host project's main config, "../../tsconfig.test.json"]`.

No other `extends` chain is sanctioned. `apps/docs` is the documented exception — it extends `@docusaurus/tsconfig` because Docusaurus owns that contract.

## Cookbook

### Adding a package

```jsonc
// packages/<name>/tsconfig.json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../tsconfig.lib.json",
    "include": ["./src/**/*.ts"]
}
```

### Adding a JSX-emitting package

```jsonc
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../tsconfig.lib.json",
    "compilerOptions": {
        "jsx": "react-jsx",
        "lib": ["ESNext", "DOM"]
    },
    "include": ["./src/**/*.ts", "./src/**/*.tsx"]
}
```

### Adding a nested package (one level deeper)

Use one extra `../`. The `@tagtree/*` packages live under `packages/tagtree/*`:

```jsonc
// packages/<group>/<name>/tsconfig.json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../../tsconfig.lib.json",
    "include": ["./src/**/*.ts"]
}
```

### Adding a Next.js app

```jsonc
// apps/<name>/tsconfig.json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../tsconfig.app.json",
    "compilerOptions": {
        "paths": {
            "@/components/*": ["./src/components/*"]
        }
    },
    "include": [
        "next-env.d.ts",
        "./src/**/*.ts",
        "./src/**/*.tsx",
        ".next/types/**/*.ts",
        ".next/dev/types/**/*.ts"
    ]
}
```

### Adding tests to a package or app

```jsonc
// <project>/tsconfig.test.json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": ["./tsconfig.json", "../../tsconfig.test.json"],
    "include": ["./src/**/*.test.ts", "./src/**/*.test.tsx"]
}
```

The order matters: host config first (for `paths`/conventions), test base second so its `types`/`jsx`/`noEmit` win on conflict.

### Adding a `vite.config.ts` or `vitest.config.ts`

```jsonc
// <project>/tsconfig.node.json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../tsconfig.node.json",
    "include": ["vite.config.ts", "vitest.config.ts"]
}
```

## Where compiler options live

| Option | Lives in |
| --- | --- |
| `strict`, `target`, `module`, `moduleResolution`, `lib` | `tsconfig.json` |
| `composite`, `declaration`, `declarationMap`, `sourceMap`, `incremental`, `outDir`, `rootDir`, `types: ["node"]` | `tsconfig.lib.json` |
| `noEmit`, `jsx: preserve`, `jsxImportSource`, DOM `lib`, Next `plugins`, relaxed `noUnused*`/`noUncheckedIndexedAccess` | `tsconfig.app.json` |
| `types: ["vitest/globals", "happy-dom"]`, `jsx: react-jsx`, test `noEmit`, test `composite` | `tsconfig.test.json` |
| `types: ["node"]`, ESNext-only `lib`, node `composite`, node `noEmit` | `tsconfig.node.json` |

## A note on app strictness

The app base relaxes a few checks that the absolute base enables:

- `noUnusedLocals: false` and `noUnusedParameters: false` — framework callback signatures (NextAuth, Payload, Next route handlers) commonly have unused args. Libraries keep these checks on.
- `noUncheckedIndexedAccess: false` — older app code uses indexed access without undefined-checks. The flag is on for libraries; apps were never strict here, so this preserves prior behavior. Cleaning the apps up to enable this universally is tracked as a separate effort.

## The Docusaurus exception

`apps/docs/tsconfig.json` extends `@docusaurus/tsconfig`. Docusaurus pins TS settings that conflict with the repo's strict defaults (e.g. JSX/lib expectations), so it sits outside the four-base pattern. `apps/docs/tsconfig.typedoc.json` is a TypeDoc input config and is also exempt.

If you touch `apps/docs/tsconfig.json`, **do not** make it extend `tsconfig.app.json` — the upstream `@docusaurus/tsconfig` may drift, and the override pattern is intentionally tool-specific.

## Anti-patterns (refuse in review)

- `"references": [{ "path": "../../tsconfig.json" }]` without `composite` on both ends. Project references graph is Phase 2; do not paste this pattern.
- `"typeRoots": ["./dist/index.d.ts"]`. `typeRoots` takes directories, not files. Pointing at your own dist is circular.
- Apps re-declaring base strict options (`strict`, `target`, `module`, etc.) inline. Extend the base instead.
- Extending another concrete config (e.g. a package's `tsconfig.json` extending another package's). The only sanctioned multi-extend is the array form in test configs.
- Adding JSX or DOM `lib` in the lib base. Packages opt in individually.
