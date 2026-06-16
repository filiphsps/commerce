# lspmesh — LSP Aggregator + MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `.claude/mcp/lsp-symbols.mjs` into a published TypeScript package `lspmesh` at `packages/ai/lspmesh` — a dual-protocol LSP aggregator (LSP server + MCP server, shared core) that fronts typescript + tailwind + biome backends concurrently, routing by file extension and merging per-op — then consolidate commerce onto it.

**Architecture:** One `lspmesh` bin with two modes (`lsp`, `mcp`) over a shared `AggregatorEngine`. The engine owns a registry of `BackendClient`s (one child LSP process each, via `vscode-jsonrpc`), routes each request to every backend whose `extensionToLanguage` matches the document, and merges responses. The carry-over `workspace/symbol` seed-and-fan logic from the old MJS lives in the engine. LSP framing uses `vscode-languageserver` / `vscode-languageserver-protocol`; MCP uses `@modelcontextprotocol/sdk`.

**Tech Stack:** TypeScript (ESM), `vscode-jsonrpc`, `vscode-languageserver`, `vscode-languageserver-protocol`, `@modelcontextprotocol/sdk`, vitest, `tsc && vite build`, Biome, changesets, Fumadocs/TypeDoc docs.

**Reference:** The current behavior to port lives at `.claude/mcp/lsp-symbols.mjs` (read it before Phase 3–4). The scaffold template is `packages/next-build-notifier/`.

---

## Conventions for every task

- **Run from repo root** `/Users/filiphsandstrom/commerce` unless stated.
- Filter for the package: `pnpm --filter lspmesh <script>` (the package `name` is `lspmesh`).
- Tests: `pnpm --filter lspmesh test` (vitest). Single file: `pnpm --filter lspmesh test src/path/x.test.ts`.
- After any code edit, check LSP diagnostics and fix before moving on.
- Commit after each task with Conventional Commits + scope `lspmesh` and a trailing period, e.g. `feat(lspmesh): add the backend config loader.`
- **Branch:** all work (including these spec files) lives on a feature branch `feat/lspmesh`, never master. Phase 1 Task 1.0 creates it.

---

## Phase 0 — npm name reservation (DONE)

- [x] `lspmesh@0.0.0` stub published to npm to reserve the name (`latest=0.0.0`).
- [ ] **Manual web step (owner):** npmjs.com → `lspmesh` → Settings → Trusted Publisher → repo `filiphsps/commerce`, workflow `.github/workflows/release.yml`. Needed before the CI `0.0.1` release in Phase 12.

---

## Phase 1 — Workspace scaffold

### Task 1.0: Branch + spec on branch

**Files:** none (git)

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/lspmesh
```

- [ ] **Step 2: Move the spec onto the branch (it must not live on master)**

The `.specs/2026-06-16-lspmesh-lsp-aggregator/` dir was authored on master. Commit it as the first commit on the branch.

```bash
git add .specs/2026-06-16-lspmesh-lsp-aggregator
git commit -m "docs(lspmesh): add the migration spec and plan."
```

If the files are already committed on master, cherry-pick or `git reset` per the repo's "never leave specs on master" rule before continuing.

### Task 1.1: Register `packages/ai/*` in the workspace

**Files:**
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: Add the glob**

In `pnpm-workspace.yaml`, under `packages:`, add `"packages/ai/*"` alongside the existing nested globs:

```yaml
packages:
    - "packages/*"
    - "packages/ai/*"
    - "packages/tagtree/*"
    - "packages/cart/*"
    - "apps/*"
    - "!**/tests/fixtures/**"
```

- [ ] **Step 2: Verify pnpm sees no error yet (dir doesn't exist — fine)**

Run: `pnpm -w ls --depth -1 >/dev/null 2>&1; echo ok`
Expected: `ok` (the glob simply matches nothing until Task 1.2).

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "build(lspmesh): register packages/ai/* in the pnpm workspace."
```

### Task 1.2: Package scaffold (`package.json`, tsconfig, vite, biome, dirs)

**Files:**
- Create: `packages/ai/lspmesh/package.json`
- Create: `packages/ai/lspmesh/tsconfig.json`
- Create: `packages/ai/lspmesh/tsconfig.test.json`
- Create: `packages/ai/lspmesh/vite.config.ts`
- Create: `packages/ai/lspmesh/vitest.config.ts`
- Create: `packages/ai/lspmesh/biome.jsonc` (only if the package needs overrides; otherwise root Biome applies — check `biome.jsonc` at root first and skip if a single root config governs all packages)
- Create: `packages/ai/lspmesh/src/index.ts` (placeholder export)
- Create: `packages/ai/lspmesh/README.md`

- [ ] **Step 1: Write `package.json`** (mirrors `next-build-notifier`, adds `bin` + node-CLI shape; **not** React)

```json
{
    "$schema": "https://json.schemastore.org/package.json",
    "name": "lspmesh",
    "version": "0.0.1",
    "publishConfig": { "access": "public", "provenance": true },
    "description": "LSP aggregator + MCP server — fronts multiple language servers (TypeScript, Tailwind, Biome) behind one LSP/MCP endpoint.",
    "private": false,
    "sideEffects": false,
    "type": "module",
    "types": "./dist/index.d.ts",
    "module": "./dist/index.js",
    "bin": { "lspmesh": "./dist/cli.js" },
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "source": "./src/index.ts",
            "default": "./dist/index.js"
        }
    },
    "files": ["dist", "README.md"],
    "engines": { "node": ">=20" },
    "scripts": {
        "build": "tsc && vite build",
        "clean": "rimraf -g dist coverage .turbo *.tsbuildinfo *.log node_modules",
        "lint": "biome lint .",
        "format": "concurrently -i pnpm:format:*",
        "format:lint": "biome lint --write .",
        "format:format": "biome format --write .",
        "format:check": "biome check --write --unsafe .",
        "test": "vitest run",
        "test:integration": "vitest run --config vitest.integration.config.ts",
        "typecheck": "tsc -noEmit"
    },
    "dependencies": {
        "@modelcontextprotocol/sdk": "^1.0.0",
        "vscode-jsonrpc": "^8.2.1",
        "vscode-languageserver": "^9.0.1",
        "vscode-languageserver-protocol": "^3.17.5"
    },
    "devDependencies": {
        "@types/node": "^22.0.0"
    },
    "author": { "name": "Filiph Sandström", "email": "filfat@hotmail.se", "url": "https://github.com/filiphsps/" },
    "license": "MIT",
    "repository": { "type": "git", "url": "git+https://github.com/filiphsps/commerce.git", "directory": "packages/ai/lspmesh" },
    "homepage": "https://github.com/filiphsps/commerce/tree/master/packages/ai/lspmesh",
    "bugs": { "url": "https://github.com/filiphsps/commerce/issues" },
    "keywords": ["lsp", "language-server", "mcp", "model-context-protocol", "aggregator", "typescript", "tailwindcss", "biome", "claude", "claude-code"]
}
```

> Verify the exact latest versions of the four runtime deps with `pnpm view <pkg> version` before pinning; bump the `^` ranges to match. `provenance: true` requires CI OIDC (Phase 12) — it is ignored by a tokenful manual publish.

- [ ] **Step 2: Write `tsconfig.json`** (mirrors `next-build-notifier`, no JSX/DOM — node CLI)

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../../tsconfig.lib.json",
    "compilerOptions": {
        "lib": ["ESNext"],
        "types": ["node"]
    },
    "include": ["./src/**/*.ts"]
}
```

> Note the `../../../` — lspmesh is one level deeper than top-level packages (`packages/ai/lspmesh` vs `packages/utils`). Verify `tsconfig.lib.json`'s `${configDir}`-relative `outDir`/`rootDir` resolve correctly from this depth; they use `${configDir}` so they do.

- [ ] **Step 3: Write `tsconfig.test.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "./tsconfig.json",
    "compilerOptions": { "noEmit": true, "types": ["node", "vitest/globals"] },
    "include": ["./src/**/*.ts", "./tests/**/*.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`** (node library + CLI build; externalize deps + node builtins; shebang banner on the CLI entry)

```ts
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dts from 'unplugin-dts/vite';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nodeExternals = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default mergeConfig(
    base,
    defineConfig({
        root: resolve(__dirname),
        build: {
            target: 'node20',
            outDir: 'dist',
            emptyOutDir: true,
            sourcemap: true,
            minify: false,
            lib: {
                entry: {
                    index: resolve(__dirname, 'src/index.ts'),
                    cli: resolve(__dirname, 'src/cli.ts'),
                },
                formats: ['es'],
            },
            rolldownOptions: {
                external: [
                    ...nodeExternals,
                    '@modelcontextprotocol/sdk',
                    'vscode-jsonrpc',
                    'vscode-languageserver',
                    'vscode-languageserver-protocol',
                ],
                output: {
                    entryFileNames: '[name].js',
                    chunkFileNames: 'chunks/[name].[hash].js',
                    // Shebang only on the CLI entry so `npx lspmesh` is directly executable.
                    banner: (chunk) => (chunk.name === 'cli' ? '#!/usr/bin/env node' : ''),
                },
            },
        },
        plugins: [
            dts({
                entryRoot: 'src',
                tsconfigPath: './tsconfig.json',
                include: ['**/src'],
                bundleTypes: false,
                insertTypesEntry: true,
            }),
        ],
    }),
);
```

> `base` (`packages/vite.config.ts`) auto-discovers inputs; we override `build` entirely here because this is a node CLI, not the auto-globbed React-lib shape. If `rolldownOptions.output.banner` as a function isn't supported by the repo's vite/rolldown version, fall back to a tiny `vite-plugin` that prepends the shebang to `dist/cli.js` in `closeBundle`, OR add a `postbuild` script `node -e "..."`. Verify by inspecting `dist/cli.js` line 1 after build.

- [ ] **Step 5: Write `vitest.config.ts`** (unit tests; integration has its own config in Phase 8)

```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
    root,
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/**'],
    },
});
```

- [ ] **Step 6: Placeholder `src/index.ts` + `README.md`**

```ts
// src/index.ts
export const LSPMESH_VERSION = '0.0.1';
```

```markdown
<!-- README.md -->
# lspmesh

LSP aggregator + MCP server. See https://github.com/filiphsps/commerce/tree/master/packages/ai/lspmesh
```

- [ ] **Step 7: Install + verify it resolves as a workspace package**

Run: `pnpm install`
Then: `pnpm --filter lspmesh exec node -e "console.log('ok')"`
Expected: prints `ok` (package is recognized by the workspace).

- [ ] **Step 8: Verify build produces an executable CLI shebang**

Run: `pnpm --filter lspmesh build && head -1 packages/ai/lspmesh/dist/cli.js`
Expected: `#!/usr/bin/env node`

> `src/cli.ts` doesn't exist yet — temporarily add `// src/cli.ts\nexport {};` to make the build pass, or defer Step 8's assertion until Phase 7. If deferring, note it and re-run there.

- [ ] **Step 9: Commit**

```bash
git add packages/ai/lspmesh pnpm-lock.yaml
git commit -m "build(lspmesh): scaffold the package, build, and test config."
```

### Task 1.3: Widen the `block-new-error` hook to this package

**Files:**
- Modify: `.claude/hookify.block-new-error.local.md`
- Modify: `docs/adr/0001-standalone-oss-packages-opt-out-of-commerce-errors.md` (add lspmesh to the opt-out list) — confirm exact filename via `ls docs/adr/`

- [ ] **Step 1: Add the path exemption** (lspmesh is bare OSS; it uses native `Error`, like `next-build-notifier`)

In `.claude/hookify.block-new-error.local.md`, under `conditions:`, add:

```yaml
  - field: file_path, operator: not_contains, pattern: packages/ai/lspmesh/
```

- [ ] **Step 2: Note it in ADR 0001** (one bullet under the standalone-OSS allowlist), then commit

```bash
git add .claude/hookify.block-new-error.local.md docs/adr/0001-*.md
git commit -m "chore(lspmesh): exempt the package from the new-Error ban as standalone OSS."
```

---

## Phase 2 — Config layer

The engine is configured by a `LspMeshConfig`: a list of backends, each with a `command`, `args`, and an `extensionToLanguage` map. A built-in default wires the three backends with npx-pinned commands (matching the existing plugins). Config discovery walks from cwd upward for `lspmesh.json`.

### Task 2.1: Config types + default config

**Files:**
- Create: `packages/ai/lspmesh/src/config/types.ts`
- Create: `packages/ai/lspmesh/src/config/default-config.ts`
- Test: `packages/ai/lspmesh/src/config/default-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// default-config.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './default-config.js';

describe('DEFAULT_CONFIG', () => {
    it('wires typescript, tailwind, and biome backends', () => {
        const names = DEFAULT_CONFIG.backends.map((b) => b.name).sort();
        expect(names).toEqual(['biome', 'tailwindcss', 'typescript']);
    });

    it('maps .tsx to typescript and tailwind but not biome json', () => {
        const ts = DEFAULT_CONFIG.backends.find((b) => b.name === 'typescript')!;
        expect(ts.extensionToLanguage['.tsx']).toBe('typescriptreact');
    });

    it('every backend has a command and a non-empty extension map', () => {
        for (const b of DEFAULT_CONFIG.backends) {
            expect(b.command).toBeTruthy();
            expect(Object.keys(b.extensionToLanguage).length).toBeGreaterThan(0);
        }
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter lspmesh test src/config/default-config.test.ts`
Expected: FAIL — cannot find module `./default-config.js`.

- [ ] **Step 3: Write `types.ts`**

```ts
// config/types.ts

/** One backend LSP server lspmesh fronts. */
export interface BackendConfig {
    /** Unique id, e.g. "typescript". */
    name: string;
    /** Executable to spawn (must speak LSP over stdio). */
    command: string;
    /** Arguments passed to {@link command}. */
    args: string[];
    /** Maps a file extension (".ts") to the LSP languageId ("typescript"). */
    extensionToLanguage: Record<string, string>;
    /** Working directory for the child; defaults to the mesh root. */
    cwd?: string;
    /** Extra environment for the child. */
    env?: Record<string, string>;
}

/** Resolved lspmesh configuration. */
export interface LspMeshConfig {
    /** Filesystem root the mesh operates over; defaults to process cwd. */
    root: string;
    backends: BackendConfig[];
}
```

- [ ] **Step 4: Write `default-config.ts`** (commands mirror the existing `commerce-plugins/*/.lsp.json`)

```ts
// config/default-config.ts
import type { LspMeshConfig } from './types.js';

const TS_EXT = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.mts': 'typescript',
    '.cts': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
} as const;

/**
 * Built-in default used when no lspmesh.json is found. Backends launch via
 * `npx -y` with pinned versions — matching how the commerce-plugins LSP plugins
 * launched them — so a fresh install needs no global binaries.
 */
export const DEFAULT_CONFIG: Omit<LspMeshConfig, 'root'> = {
    backends: [
        {
            name: 'typescript',
            command: 'npx',
            args: ['-y', 'typescript-language-server@4.4.1', '--stdio'],
            extensionToLanguage: { ...TS_EXT },
        },
        {
            name: 'tailwindcss',
            command: 'npx',
            args: ['-y', '@tailwindcss/language-server@0.14.29', '--stdio'],
            extensionToLanguage: {
                '.css': 'css',
                '.scss': 'scss',
                '.ts': 'typescript',
                '.tsx': 'typescriptreact',
                '.jsx': 'javascriptreact',
                '.html': 'html',
            },
        },
        {
            name: 'biome',
            command: 'npx',
            args: ['-y', '@biomejs/biome@latest', 'lsp-proxy'],
            extensionToLanguage: {
                '.ts': 'typescript',
                '.tsx': 'typescriptreact',
                '.js': 'javascript',
                '.jsx': 'javascriptreact',
                '.json': 'json',
                '.jsonc': 'jsonc',
            },
        },
    ],
};
```

> Pin `@biomejs/biome` to the repo's Biome version (`pnpm why @biomejs/biome` / read root `package.json`) rather than `@latest`. Confirm the biome LSP entry subcommand is `lsp-proxy` for that version.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter lspmesh test src/config/default-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ai/lspmesh/src/config
git commit -m "feat(lspmesh): add backend config types and the default three-backend config."
```

### Task 2.2: Config loader + discovery

**Files:**
- Create: `packages/ai/lspmesh/src/config/load-config.ts`
- Test: `packages/ai/lspmesh/src/config/load-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// load-config.test.ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './load-config.js';

describe('loadConfig', () => {
    it('returns the default config (with root) when no file is found', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        const cfg = loadConfig(dir);
        expect(cfg.root).toBe(dir);
        expect(cfg.backends.map((b) => b.name).sort()).toEqual(['biome', 'tailwindcss', 'typescript']);
    });

    it('reads lspmesh.json discovered from a child dir upward', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        writeFileSync(
            join(dir, 'lspmesh.json'),
            JSON.stringify({ backends: [{ name: 'only', command: 'x', args: [], extensionToLanguage: { '.ts': 'typescript' } }] }),
        );
        const child = mkdtempSync(join(dir, 'sub-'));
        const cfg = loadConfig(child);
        expect(cfg.backends).toHaveLength(1);
        expect(cfg.backends[0]?.name).toBe('only');
        expect(cfg.root).toBe(dir); // root is the dir containing the config
    });

    it('throws a descriptive error on a malformed backend (missing command)', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-'));
        writeFileSync(join(dir, 'lspmesh.json'), JSON.stringify({ backends: [{ name: 'bad', args: [], extensionToLanguage: {} }] }));
        expect(() => loadConfig(dir)).toThrow(/bad.*command/i);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter lspmesh test src/config/load-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `load-config.ts`**

```ts
// config/load-config.ts
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DEFAULT_CONFIG } from './default-config.js';
import type { BackendConfig, LspMeshConfig } from './types.js';

const CONFIG_FILENAME = 'lspmesh.json';

/** Walk from `start` up to the filesystem root looking for lspmesh.json. */
const findConfigFile = (start: string): string | undefined => {
    let dir = start;
    for (;;) {
        const candidate = join(dir, CONFIG_FILENAME);
        if (existsSync(candidate)) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return undefined;
        dir = parent;
    }
};

/** Validate one backend entry, throwing on the first problem. */
const validateBackend = (b: unknown, i: number): BackendConfig => {
    const e = b as Partial<BackendConfig>;
    if (!e || typeof e.name !== 'string') throw new Error(`lspmesh: backend[${i}] is missing "name".`);
    if (typeof e.command !== 'string') throw new Error(`lspmesh: backend "${e.name}" is missing "command".`);
    if (!Array.isArray(e.args)) throw new Error(`lspmesh: backend "${e.name}" is missing "args" array.`);
    if (!e.extensionToLanguage || typeof e.extensionToLanguage !== 'object') {
        throw new Error(`lspmesh: backend "${e.name}" is missing "extensionToLanguage".`);
    }
    return e as BackendConfig;
};

/**
 * Resolve the lspmesh config for a working directory. Reads the nearest
 * lspmesh.json (searching upward); falls back to the built-in default rooted at
 * `cwd` when none exists.
 * @throws Error when a discovered config is malformed.
 */
export const loadConfig = (cwd: string = process.cwd()): LspMeshConfig => {
    const file = findConfigFile(cwd);
    if (!file) return { root: cwd, backends: DEFAULT_CONFIG.backends.map((b) => ({ ...b })) };

    const raw = JSON.parse(readFileSync(file, 'utf8')) as { backends?: unknown };
    if (!Array.isArray(raw.backends)) throw new Error(`lspmesh: ${file} has no "backends" array.`);
    const backends = raw.backends.map(validateBackend);
    return { root: dirname(file), backends };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter lspmesh test src/config/load-config.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ai/lspmesh/src/config/load-config.ts packages/ai/lspmesh/src/config/load-config.test.ts
git commit -m "feat(lspmesh): add upward config discovery and validation."
```

### Task 2.3: Routing helpers (extension → backends)

**Files:**
- Create: `packages/ai/lspmesh/src/core/routing.ts`
- Test: `packages/ai/lspmesh/src/core/routing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// routing.test.ts
import { describe, expect, it } from 'vitest';
import { extnameLower, languageIdFor, matchesBackend } from './routing.js';
import type { BackendConfig } from '../config/types.js';

const ts: BackendConfig = { name: 'typescript', command: 'x', args: [], extensionToLanguage: { '.ts': 'typescript', '.tsx': 'typescriptreact' } };
const biome: BackendConfig = { name: 'biome', command: 'x', args: [], extensionToLanguage: { '.json': 'json' } };

describe('routing', () => {
    it('lowercases the extension', () => {
        expect(extnameLower('/a/B.TS')).toBe('.ts');
    });
    it('matches a backend by extension', () => {
        expect(matchesBackend(ts, '/x/y.tsx')).toBe(true);
        expect(matchesBackend(ts, '/x/y.json')).toBe(false);
        expect(matchesBackend(biome, '/x/y.json')).toBe(true);
    });
    it('returns the languageId for a path', () => {
        expect(languageIdFor(ts, '/x/y.tsx')).toBe('typescriptreact');
        expect(languageIdFor(ts, '/x/y.json')).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter lspmesh test src/core/routing.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `routing.ts`**

```ts
// core/routing.ts
import { extname } from 'node:path';
import type { BackendConfig } from '../config/types.js';

/** Lowercased file extension including the dot, e.g. "/a/B.TSX" → ".tsx". */
export const extnameLower = (path: string): string => extname(path).toLowerCase();

/** Whether a backend handles the file at `path`, by extension. */
export const matchesBackend = (backend: BackendConfig, path: string): boolean =>
    extnameLower(path) in backend.extensionToLanguage;

/** The LSP languageId a backend assigns to `path`, or undefined if unhandled. */
export const languageIdFor = (backend: BackendConfig, path: string): string | undefined =>
    backend.extensionToLanguage[extnameLower(path)];
```

- [ ] **Step 4: Run + commit**

Run: `pnpm --filter lspmesh test src/core/routing.test.ts` → PASS

```bash
git add packages/ai/lspmesh/src/core/routing.ts packages/ai/lspmesh/src/core/routing.test.ts
git commit -m "feat(lspmesh): add extension-based backend routing helpers."
```

---

## Phase 3 — Backend client (one child LSP process)

Port the hardened client from `.claude/mcp/lsp-symbols.mjs` to TypeScript on top of `vscode-jsonrpc` (which handles Content-Length framing, ids, and cancellation). Carry over: **45s request timeout**, **dead-process detection + reject-in-flight**, **mtime-aware didOpen/didChange**, **lazy-ready**.

### Task 3.1: Pure helpers — snippet, uri, definition classification, seed ordering

**Files:**
- Create: `packages/ai/lspmesh/src/core/locations.ts`
- Create: `packages/ai/lspmesh/src/core/definitions.ts`
- Create: `packages/ai/lspmesh/src/core/seed.ts`
- Test: `packages/ai/lspmesh/src/core/definitions.test.ts`
- Test: `packages/ai/lspmesh/src/core/seed.test.ts`

These are direct ports of the pure logic in `lsp-symbols.mjs` (`uriToPath`, `snippet`, `rel`, `normLoc`, `isDefinitionSnippet`, `seedScore`, `normBase`). Read that file's corresponding functions first.

- [ ] **Step 1: Write `definitions.test.ts`** (port the classifier cases proven in the MJS work)

```ts
// definitions.test.ts
import { describe, expect, it } from 'vitest';
import { isDefinitionSnippet } from './definitions.js';

describe('isDefinitionSnippet', () => {
    const cases: [string, boolean][] = [
        ['export const ShopifyApolloApiClient = async ({', true],
        ["import { X } from '@/api/shopify';", false],
        ['isProduction: boolean;', false],
        ['export function isProduction() {', true],
        ['export type Foo = {', true],
        ['export interface Bar {', true],
        ["export { isProduction } from './env';", false],
        ["export * from './x';", false],
        ['enum Kind {', true],
        ['abstract class Base {', true],
    ];
    it.each(cases)('classifies %j as %s', (snip, expected) => {
        expect(isDefinitionSnippet(snip)).toBe(expected);
    });
});
```

- [ ] **Step 2: Write `seed.test.ts`** (port the basename-boost + tier ordering proven earlier)

```ts
// seed.test.ts
import { describe, expect, it } from 'vitest';
import { orderSeedFiles, seedScore } from './seed.js';

describe('seedScore', () => {
    it('defers tests, dist, and .d.ts; floats basename matches', () => {
        expect(seedScore('apps/x/foo.test.ts', 'foo')).toBeGreaterThan(0);
        expect(seedScore('packages/x/dist/foo.js', 'foo')).toBeGreaterThan(0);
        expect(seedScore('packages/utils/src/locale/locale.ts', 'locale')).toBeLessThan(0);
        expect(seedScore('apps/x/uses-locale.ts', 'locale')).toBe(0);
    });
});

describe('orderSeedFiles', () => {
    it('puts the basename match first and caps the list', () => {
        const files = ['apps/a.ts', 'apps/b.ts', 'packages/utils/src/locale/locale.ts'];
        const { ordered, truncated } = orderSeedFiles(files, 'Locale', 2);
        expect(ordered[0]).toBe('packages/utils/src/locale/locale.ts');
        expect(ordered).toHaveLength(2);
        expect(truncated).toBe(true);
    });
});
```

- [ ] **Step 3: Run both — verify they fail** → `pnpm --filter lspmesh test src/core/definitions.test.ts src/core/seed.test.ts`

- [ ] **Step 4: Implement `definitions.ts`** (port verbatim from MJS)

```ts
// core/definitions.ts

const DEFINITION_SNIPPET =
    /^(export\s+)?(default\s+)?(declare\s+)?(abstract\s+)?(async\s+)?(public\s+|private\s+|protected\s+|static\s+|readonly\s+)*(const|let|var|function|function\*|class|interface|type|enum|namespace|module)\b/;

/** Whether a source line looks like a definition, not an import/re-export. */
export const isDefinitionSnippet = (snip: string): boolean => {
    if (/^import\b/.test(snip) || /\bfrom\s+['"]/.test(snip)) return false;
    if (/^export\s+\{/.test(snip) || /^export\s+\*/.test(snip)) return false;
    return DEFINITION_SNIPPET.test(snip);
};
```

- [ ] **Step 5: Implement `seed.ts`** (port `normBase`, `seedScore`, and the ordering+cap+truncation from MJS `seedFiles`)

```ts
// core/seed.ts

/** A path basename minus extension, lowercased and stripped to alphanumerics. */
export const normBase = (rel: string): string => {
    const base = rel.slice(rel.lastIndexOf('/') + 1).replace(/\.[cm]?[jt]sx?$/, '').replace(/\.d$/, '');
    return base.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

/** Seed priority for a repo-relative path; lower is opened first. */
export const seedScore = (rel: string, normQuery: string): number => {
    if (/(^|\/)dist\//.test(rel)) return 4;
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)(e2e|__tests__|__mocks__)\//.test(rel)) return 3;
    if (/\.d\.ts$/.test(rel)) return 2;
    if (normQuery && normBase(rel) === normQuery) return -1;
    return 0;
};

/** Order seed files by priority (stable) and cap, reporting truncation. */
export const orderSeedFiles = (
    files: string[],
    query: string,
    cap = 60,
): { ordered: string[]; truncated: boolean; total: number } => {
    const normQuery = query.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const ordered = files
        .map((rel, i) => ({ rel, i }))
        .sort((a, b) => seedScore(a.rel, normQuery) - seedScore(b.rel, normQuery) || a.i - b.i)
        .slice(0, cap)
        .map(({ rel }) => rel);
    return { ordered, truncated: files.length > cap, total: files.length };
};
```

- [ ] **Step 6: Implement `locations.ts`** (port `uriToPath`, `rel`, `snippet`, `normLoc`)

```ts
// core/locations.ts
import { readFileSync } from 'node:fs';
import type { Location, LocationLink } from 'vscode-languageserver-protocol';

/** Filesystem path for a file:// URI (decodes %5B etc.). */
export const uriToPath = (uri: string): string => decodeURIComponent(uri.replace('file://', ''));

/** Repo-relative path for a file:// URI, given a root dir. */
export const relPath = (uri: string, root: string): string => uriToPath(uri).replace(`${root}/`, '');

/** The trimmed source line at a 0-based line number, capped at 200 chars. */
export const snippet = (uri: string, line: number): string => {
    try {
        const lines = readFileSync(uriToPath(uri), 'utf8').split('\n');
        return (lines[line] ?? '').trim().slice(0, 200);
    } catch {
        return '';
    }
};

/** Normalize a Location or LocationLink to a plain {uri, range}. */
export const normLoc = (l: Location | LocationLink): Location => {
    if ('targetUri' in l) return { uri: l.targetUri, range: l.targetSelectionRange ?? l.targetRange };
    return l;
};
```

- [ ] **Step 7: Run all four tests** → PASS. **Commit**

```bash
git add packages/ai/lspmesh/src/core
git commit -m "feat(lspmesh): port pure location, definition, and seed helpers to TypeScript."
```

### Task 3.2: `BackendClient` over vscode-jsonrpc

**Files:**
- Create: `packages/ai/lspmesh/src/core/backend-client.ts`
- Test: `packages/ai/lspmesh/src/core/backend-client.test.ts` (uses a fake child LSP server fixture)
- Create: `packages/ai/lspmesh/tests/fixtures/echo-lsp-server.mjs` (a tiny stdio LSP server that answers a couple of methods, for fast unit-level tests without npx)

- [ ] **Step 1: Write the fake LSP server fixture** (deterministic, no network)

```js
// tests/fixtures/echo-lsp-server.mjs
// Minimal LSP server: answers initialize, records didOpen/didChange, and
// returns canned results for workspace/symbol and textDocument/references.
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

const conn = createMessageConnection(new StreamMessageReader(process.stdin), new StreamMessageWriter(process.stdout));
const opened = new Map();

conn.onRequest('initialize', () => ({ capabilities: { referencesProvider: true, workspaceSymbolProvider: true } }));
conn.onNotification('initialized', () => {});
conn.onNotification('textDocument/didOpen', (p) => opened.set(p.textDocument.uri, p.textDocument.version));
conn.onNotification('textDocument/didChange', (p) => opened.set(p.textDocument.uri, p.textDocument.version));
conn.onRequest('workspace/symbol', (p) => [
    { name: p.query, kind: 13, location: { uri: 'file:///fixture/a.ts', range: { start: { line: 0, character: 6 }, end: { line: 0, character: 6 } } } },
]);
conn.onRequest('textDocument/references', () => [
    { uri: 'file:///fixture/a.ts', range: { start: { line: 3, character: 2 }, end: { line: 3, character: 3 } } },
]);
conn.onRequest('$/getOpenVersion', (p) => opened.get(p.uri) ?? null); // test hook
conn.listen();
```

- [ ] **Step 2: Write the failing test**

```ts
// backend-client.test.ts
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { BackendClient } from './backend-client.js';
import type { BackendConfig } from '../config/types.js';

const FIXTURE = fileURLToPath(new URL('../../tests/fixtures/echo-lsp-server.mjs', import.meta.url));
const cfg: BackendConfig = { name: 'echo', command: process.execPath, args: [FIXTURE], extensionToLanguage: { '.ts': 'typescript' } };

let client: BackendClient;
afterEach(async () => { await client?.dispose(); });

describe('BackendClient', () => {
    it('initializes and answers a request', async () => {
        client = new BackendClient(cfg, '/fixture');
        await client.whenReady();
        const res = await client.request('workspace/symbol', { query: 'Foo' });
        expect(Array.isArray(res)).toBe(true);
    });

    it('sends didChange with a bumped version when the file changes on disk', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'lspmesh-bc-'));
        const file = join(dir, 'a.ts');
        writeFileSync(file, 'export const a = 1;');
        client = new BackendClient(cfg, dir);
        await client.whenReady();
        client.open(file);
        const v1 = await client.request('$/getOpenVersion', { uri: `file://${file}` });
        writeFileSync(file, 'export const a = 2;'); // mtime changes
        client.open(file);
        const v2 = await client.request('$/getOpenVersion', { uri: `file://${file}` });
        expect(v2).toBe((v1 as number) + 1);
    });

    it('rejects an in-flight request when the backend dies', async () => {
        client = new BackendClient(cfg, '/fixture');
        await client.whenReady();
        const p = client.request('$/never', {}, 60000); // fixture never answers this
        await client.dispose(); // kills the child
        await expect(p).rejects.toThrow();
    });
});
```

- [ ] **Step 3: Run — verify it fails** → `pnpm --filter lspmesh test src/core/backend-client.test.ts`

- [ ] **Step 4: Implement `backend-client.ts`**

```ts
// core/backend-client.ts
import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import {
    createMessageConnection,
    type MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
} from 'vscode-jsonrpc/node';
import type { BackendConfig } from '../config/types.js';
import { languageIdFor, matchesBackend } from './routing.js';

const DEFAULT_TIMEOUT = 45_000;

/**
 * A single backend LSP server fronted by lspmesh. Owns the child process and a
 * vscode-jsonrpc connection; tracks open documents by mtime so a changed file is
 * re-synced via didChange. Requests time out and a dead child rejects every
 * in-flight request.
 */
export class BackendClient {
    readonly config: BackendConfig;
    readonly #root: string;
    #proc: ChildProcess;
    #conn: MessageConnection;
    #ready: Promise<void>;
    #dead = false;
    #opened = new Map<string, { version: number; mtimeMs: number }>();

    constructor(config: BackendConfig, root: string) {
        this.config = config;
        this.#root = root;
        this.#proc = spawn(config.command, config.args, {
            cwd: config.cwd ?? root,
            env: { ...process.env, ...config.env },
            stdio: ['pipe', 'pipe', 'inherit'],
        });
        this.#conn = createMessageConnection(
            new StreamMessageReader(this.#proc.stdout!),
            new StreamMessageWriter(this.#proc.stdin!),
        );
        this.#conn.onClose(() => this.#die('connection closed'));
        this.#proc.on('exit', (code) => this.#die(`backend "${config.name}" exited (${code})`));
        this.#proc.on('error', (err) => this.#die(`backend "${config.name}" failed: ${err.message}`));
        this.#conn.listen();
        this.#ready = this.#initialize();
    }

    get name(): string {
        return this.config.name;
    }
    get dead(): boolean {
        return this.#dead;
    }

    #die(reason: string): void {
        if (this.#dead) return;
        this.#dead = true;
        this.#conn.dispose();
        try {
            this.#proc.kill();
        } catch {
            /* already gone */
        }
        // vscode-jsonrpc rejects pending requests on dispose(); this guards new calls.
        void reason;
    }

    async #initialize(): Promise<void> {
        await this.#conn.sendRequest('initialize', {
            processId: process.pid,
            rootUri: `file://${this.#root}`,
            workspaceFolders: [{ uri: `file://${this.#root}`, name: 'lspmesh' }],
            capabilities: {},
        });
        this.#conn.sendNotification('initialized', {});
    }

    whenReady(): Promise<void> {
        return this.#ready;
    }

    /** Whether this backend handles `path` (by extension). */
    handles(path: string): boolean {
        return matchesBackend(this.config, path);
    }

    /** Ensure the child has the current contents of `path` open (didOpen/didChange). */
    open(path: string): void {
        let mtimeMs: number;
        try {
            mtimeMs = statSync(path).mtimeMs;
        } catch {
            return;
        }
        const prev = this.#opened.get(path);
        if (prev && prev.mtimeMs === mtimeMs) return;
        let text: string;
        try {
            text = readFileSync(path, 'utf8');
        } catch {
            return;
        }
        const uri = `file://${path}`;
        const languageId = languageIdFor(this.config, path) ?? 'plaintext';
        if (!prev) {
            this.#opened.set(path, { version: 1, mtimeMs });
            this.#conn.sendNotification('textDocument/didOpen', {
                textDocument: { uri, languageId, version: 1, text },
            });
        } else {
            const version = prev.version + 1;
            this.#opened.set(path, { version, mtimeMs });
            this.#conn.sendNotification('textDocument/didChange', {
                textDocument: { uri, version },
                contentChanges: [{ text }],
            });
        }
    }

    /** Send an LSP request, rejecting on timeout or backend death. */
    async request<T = unknown>(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
        if (this.#dead) throw new Error(`backend "${this.config.name}" is not running`);
        let timer: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`LSP ${method} timed out after ${timeoutMs}ms`)), timeoutMs);
            if (timer.unref) timer.unref();
        });
        try {
            return (await Promise.race([this.#conn.sendRequest(method, params) as Promise<T>, timeout])) as T;
        } finally {
            clearTimeout(timer!);
        }
    }

    async dispose(): Promise<void> {
        this.#die('disposed');
    }
}
```

> `vscode-jsonrpc` already rejects pending `sendRequest` promises when the connection is disposed, satisfying the "dead child rejects in-flight" test. The explicit `timeout` race adds the 45s ceiling.

- [ ] **Step 5: Run — verify PASS** → `pnpm --filter lspmesh test src/core/backend-client.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/ai/lspmesh/src/core/backend-client.ts packages/ai/lspmesh/src/core/backend-client.test.ts packages/ai/lspmesh/tests/fixtures/echo-lsp-server.mjs
git commit -m "feat(lspmesh): add the per-backend LSP client with timeouts, restart-on-death, and mtime sync."
```

### Task 3.3: Respawn-on-death registry wrapper

**Files:**
- Create: `packages/ai/lspmesh/src/core/backend-registry.ts`
- Test: `packages/ai/lspmesh/src/core/backend-registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend-registry.test.ts
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { BackendRegistry } from './backend-registry.js';
import type { LspMeshConfig } from '../config/types.js';

const FIXTURE = fileURLToPath(new URL('../../tests/fixtures/echo-lsp-server.mjs', import.meta.url));
const config: LspMeshConfig = {
    root: '/fixture',
    backends: [{ name: 'echo', command: process.execPath, args: [FIXTURE], extensionToLanguage: { '.ts': 'typescript' } }],
};

let reg: BackendRegistry;
afterEach(async () => { await reg?.dispose(); });

describe('BackendRegistry', () => {
    it('returns backends that handle a path', async () => {
        reg = new BackendRegistry(config);
        await reg.init();
        expect(reg.backendsFor('/x/y.ts').map((b) => b.name)).toEqual(['echo']);
        expect(reg.backendsFor('/x/y.css')).toEqual([]);
    });

    it('respawns a backend after it dies', async () => {
        reg = new BackendRegistry(config);
        await reg.init();
        await reg.backendsFor('/x/y.ts')[0]!.dispose(); // kill it
        const live = reg.backendsFor('/x/y.ts');
        expect(live).toHaveLength(1);
        expect(live[0]!.dead).toBe(false); // a fresh one
        await live[0]!.whenReady();
    });
});
```

- [ ] **Step 2: Run — fails** → `pnpm --filter lspmesh test src/core/backend-registry.test.ts`

- [ ] **Step 3: Implement `backend-registry.ts`**

```ts
// core/backend-registry.ts
import type { LspMeshConfig } from '../config/types.js';
import { BackendClient } from './backend-client.js';

/** Owns one BackendClient per configured backend, respawning dead ones lazily. */
export class BackendRegistry {
    readonly #config: LspMeshConfig;
    #clients = new Map<string, BackendClient>();

    constructor(config: LspMeshConfig) {
        this.#config = config;
    }

    /** Eagerly spawn + initialize every backend. */
    async init(): Promise<void> {
        for (const b of this.#config.backends) this.#clients.set(b.name, new BackendClient(b, this.#config.root));
        await Promise.allSettled([...this.#clients.values()].map((c) => c.whenReady()));
    }

    /** Live clients (respawning any that died) whose extension map matches `path`. */
    backendsFor(path: string): BackendClient[] {
        const out: BackendClient[] = [];
        for (const b of this.#config.backends) {
            if (!(b.extensionToLanguage[require('node:path').extname(path).toLowerCase()])) continue;
            let client = this.#clients.get(b.name);
            if (!client || client.dead) {
                client = new BackendClient(b, this.#config.root);
                this.#clients.set(b.name, client);
            }
            out.push(client);
        }
        return out;
    }

    /** All live clients (respawning dead ones). */
    all(): BackendClient[] {
        return this.#config.backends.map((b) => {
            let client = this.#clients.get(b.name);
            if (!client || client.dead) {
                client = new BackendClient(b, this.#config.root);
                this.#clients.set(b.name, client);
            }
            return client;
        });
    }

    async dispose(): Promise<void> {
        await Promise.allSettled([...this.#clients.values()].map((c) => c.dispose()));
        this.#clients.clear();
    }
}
```

> Replace the inline `require('node:path')` with a top-level `import { extname } from 'node:path'` and use `matchesBackend` from `routing.ts` (ESM — no `require`). The snippet shows intent; the engineer must wire the import. Use `matchesBackend(b, path)`.

- [ ] **Step 4: Fix the import (ESM)**, re-run → PASS, then **commit**

```bash
git add packages/ai/lspmesh/src/core/backend-registry.ts packages/ai/lspmesh/src/core/backend-registry.test.ts
git commit -m "feat(lspmesh): add the backend registry with lazy respawn and extension routing."
```

---

## Phase 4 — Aggregator engine

Routes requests to matching backends, merges per-op, and carries the seed-and-fan `workspace/symbol` + MCP `find_*` logic. Depends on Phases 2–3.

### Task 4.1: Per-op location merge

**Files:**
- Create: `packages/ai/lspmesh/src/core/merge.ts`
- Test: `packages/ai/lspmesh/src/core/merge.test.ts`

- [ ] **Step 1: Failing test**

```ts
// merge.test.ts
import { describe, expect, it } from 'vitest';
import { mergeLocations } from './merge.js';
import type { Location } from 'vscode-languageserver-protocol';

const loc = (uri: string, line: number): Location => ({ uri, range: { start: { line, character: 0 }, end: { line, character: 1 } } });

describe('mergeLocations', () => {
    it('unions and dedupes by uri:line:character', () => {
        const a = [loc('file:///a.ts', 1), loc('file:///a.ts', 2)];
        const b = [loc('file:///a.ts', 2), loc('file:///b.ts', 5)];
        const merged = mergeLocations([a, b]);
        expect(merged).toHaveLength(3);
    });
    it('drops null/undefined backend replies', () => {
        expect(mergeLocations([null, undefined, [loc('file:///a.ts', 1)]])).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run — fails.**

- [ ] **Step 3: Implement `merge.ts`**

```ts
// core/merge.ts
import type { Location, LocationLink } from 'vscode-languageserver-protocol';
import { normLoc } from './locations.js';

type LocReply = Location | Location[] | LocationLink[] | null | undefined;

/** Union + dedupe location replies from several backends, keyed by uri:line:char. */
export const mergeLocations = (replies: LocReply[]): Location[] => {
    const seen = new Map<string, Location>();
    for (const reply of replies) {
        if (!reply) continue;
        const arr = Array.isArray(reply) ? reply : [reply];
        for (const raw of arr) {
            const l = normLoc(raw);
            const key = `${l.uri}:${l.range.start.line}:${l.range.start.character}`;
            if (!seen.has(key)) seen.set(key, l);
        }
    }
    return [...seen.values()];
};
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add packages/ai/lspmesh/src/core/merge.ts packages/ai/lspmesh/src/core/merge.test.ts
git commit -m "feat(lspmesh): add per-op location merge and dedupe."
```

### Task 4.2: The engine — position ops, workspace/symbol, find_*

**Files:**
- Create: `packages/ai/lspmesh/src/core/engine.ts`
- Create: `packages/ai/lspmesh/src/core/git-grep.ts` (seed source — git grep over the root)
- Test: `packages/ai/lspmesh/src/core/engine.test.ts` (with the echo fixture backend)

- [ ] **Step 1: Implement `git-grep.ts`** (port `seedFiles`'s git-grep from MJS; returns repo-relative paths)

```ts
// core/git-grep.ts
import { spawn } from 'node:child_process';

/** Repo-relative TS/TSX files mentioning `query` as a word (tracked + untracked). */
export const gitGrepFiles = (query: string, root: string): Promise<string[]> =>
    new Promise((resolve) => {
        const git = spawn('git', ['grep', '-l', '--untracked', '-w', '-F', '-e', query, '--', '*.ts', '*.tsx', '*.mts', '*.cts'], { cwd: root });
        let out = '';
        git.stdout.on('data', (d) => (out += d));
        git.on('close', () => resolve(out.split('\n').filter(Boolean)));
        git.on('error', () => resolve([]));
    });
```

- [ ] **Step 2: Write the failing engine test** (echo fixture returns a canned symbol + references)

```ts
// engine.test.ts
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { AggregatorEngine } from './engine.js';
import type { LspMeshConfig } from '../config/types.js';

const FIXTURE = fileURLToPath(new URL('../../tests/fixtures/echo-lsp-server.mjs', import.meta.url));
const config: LspMeshConfig = {
    root: '/fixture',
    backends: [{ name: 'echo', command: process.execPath, args: [FIXTURE], extensionToLanguage: { '.ts': 'typescript' } }],
};

let engine: AggregatorEngine;
afterEach(async () => { await engine?.dispose(); });

describe('AggregatorEngine', () => {
    it('aggregates workspace/symbol across backends', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const res = await engine.workspaceSymbol('Foo');
        expect(res.length).toBeGreaterThan(0);
        expect(res[0]!.name).toBe('Foo');
    });

    it('merges a position op (references) from matching backends', async () => {
        engine = new AggregatorEngine(config);
        await engine.init();
        const refs = await engine.positionOp('textDocument/references', { uri: 'file:///fixture/a.ts', line: 0, character: 0 });
        expect(refs.length).toBeGreaterThan(0);
    });
});
```

> The seed-driven `find_*` paths need git + a real TS project; cover those in the Phase 8 integration suite, not here. This unit test only proves routing + merge wiring against the fixture.

- [ ] **Step 3: Run — fails.**

- [ ] **Step 4: Implement `engine.ts`**

```ts
// core/engine.ts
import type { Location } from 'vscode-languageserver-protocol';
import type { LspMeshConfig } from '../config/types.js';
import { BackendRegistry } from './backend-registry.js';
import { isDefinitionSnippet } from './definitions.js';
import { gitGrepFiles } from './git-grep.js';
import { relPath, snippet, uriToPath } from './locations.js';
import { mergeLocations } from './merge.js';
import { orderSeedFiles } from './seed.js';

export interface SymbolResult {
    name: string;
    kind: number;
    file: string;
    line: number;
    character: number;
    snippet: string;
}
export interface RefResult {
    file: string;
    line: number;
    character: number;
    snippet: string;
    definedAt?: string;
}
export interface Position {
    uri: string;
    line: number;
    character: number;
}

/** Shared aggregator core behind both the LSP and MCP front-ends. */
export class AggregatorEngine {
    readonly #config: LspMeshConfig;
    readonly #registry: BackendRegistry;

    constructor(config: LspMeshConfig) {
        this.#config = config;
        this.#registry = new BackendRegistry(config);
    }

    init(): Promise<void> {
        return this.#registry.init();
    }
    dispose(): Promise<void> {
        return this.#registry.dispose();
    }

    /** Fan a position-based op to every backend handling the file; merge locations. */
    async positionOp(method: string, pos: Position, extraParams: Record<string, unknown> = {}): Promise<Location[]> {
        const path = uriToPath(pos.uri);
        const backends = this.#registry.backendsFor(path);
        for (const b of backends) b.open(path);
        const replies = await Promise.all(
            backends.map((b) =>
                b
                    .request<Location[]>(method, {
                        textDocument: { uri: pos.uri },
                        position: { line: pos.line, character: pos.character },
                        ...extraParams,
                    })
                    .catch(() => null),
            ),
        );
        return mergeLocations(replies);
    }

    /** Aggregate workspace/symbol across ALL backends, seeding TS projects first. */
    async workspaceSymbol(query: string, opts: { definitionsOnly?: boolean } = {}): Promise<SymbolResult[]> {
        // Seed: open the definition-likely files so lazy TS projects load.
        const files = await gitGrepFiles(query, this.#config.root);
        const { ordered } = orderSeedFiles(files, query);
        for (const rel of ordered) {
            const abs = `${this.#config.root}/${rel}`;
            for (const b of this.#registry.backendsFor(abs)) b.open(abs);
        }

        const replies = await Promise.all(
            this.#registry.all().map((b) => b.request<RawSymbol[]>('workspace/symbol', { query }).catch(() => null)),
        );
        const seen = new Set<string>();
        let results: SymbolResult[] = [];
        for (const reply of replies) {
            for (const s of reply ?? []) {
                if (!(s.name === query || s.name.endsWith(`.${query}`) || s.name.endsWith(`::${query}`))) continue;
                const loc = s.location;
                const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}`;
                if (seen.has(key)) continue;
                seen.add(key);
                results.push({
                    name: s.name,
                    kind: s.kind,
                    file: relPath(loc.uri, this.#config.root),
                    line: loc.range.start.line + 1,
                    character: loc.range.start.character + 1,
                    snippet: snippet(loc.uri, loc.range.start.line),
                });
            }
        }
        if (opts.definitionsOnly) results = results.filter((r) => isDefinitionSnippet(r.snippet));
        else results.sort((a, b) => (isDefinitionSnippet(b.snippet) ? 1 : 0) - (isDefinitionSnippet(a.snippet) ? 1 : 0));
        return results;
    }

    /** MCP find_symbol — workspace/symbol with the definitionsOnly option. */
    findSymbol(query: string, opts: { definitionsOnly?: boolean } = {}): Promise<SymbolResult[]> {
        return this.workspaceSymbol(query, opts);
    }

    /** MCP find_references — resolve every definition, union references, tag definedAt. */
    findReferences(query: string, file?: string): Promise<RefResult[]> {
        return this.#unionOverDefinitions('textDocument/references', query, file, { context: { includeDeclaration: true } });
    }

    /** MCP find_implementations — same union shape against textDocument/implementation. */
    findImplementations(query: string, file?: string): Promise<RefResult[]> {
        return this.#unionOverDefinitions('textDocument/implementation', query, file);
    }

    async #unionOverDefinitions(method: string, query: string, file: string | undefined, extra: Record<string, unknown> = {}): Promise<RefResult[]> {
        const all = await this.workspaceSymbol(query);
        let defs = all.filter((d) => isDefinitionSnippet(d.snippet));
        if (defs.length === 0) defs = all;
        if (file) defs = defs.filter((d) => d.file === file);
        const seenDef = new Set<string>();
        defs = defs.filter((d) => {
            const k = `${d.file}:${d.line}`;
            if (seenDef.has(k)) return false;
            seenDef.add(k);
            return true;
        });

        const merged = new Map<string, RefResult>();
        for (const def of defs) {
            const uri = `file://${this.#config.root}/${def.file}`;
            const locs = await this.positionOp(method, { uri, line: def.line - 1, character: def.character - 1 }, extra);
            const definedAt = `${def.file}:${def.line}`;
            for (const l of locs) {
                const f = relPath(l.uri, this.#config.root);
                const line = l.range.start.line + 1;
                const character = l.range.start.character + 1;
                const key = `${f}:${line}:${character}`;
                if (merged.has(key)) continue;
                merged.set(key, { file: f, line, character, snippet: snippet(l.uri, l.range.start.line), definedAt });
            }
        }
        return [...merged.values()];
    }
}

interface RawSymbol {
    name: string;
    kind: number;
    location: { uri: string; range: { start: { line: number; character: number } } };
}
```

- [ ] **Step 5: Run → PASS. Commit**

```bash
git add packages/ai/lspmesh/src/core/engine.ts packages/ai/lspmesh/src/core/git-grep.ts packages/ai/lspmesh/src/core/engine.test.ts
git commit -m "feat(lspmesh): add the aggregator engine — routing, merge, workspace/symbol seed-and-fan, and find_*."
```

---

## Phase 5 — LSP server mode

Wire the Claude Code op set to the engine using `vscode-languageserver`. Forward position ops via `positionOp`, and `workspace/symbol` via the engine's aggregation.

### Task 5.1: LSP server entry

**Files:**
- Create: `packages/ai/lspmesh/src/lsp/server.ts`
- Test: covered by Phase 8 integration (a full LSP server is best tested end-to-end). Add a thin unit test asserting `createLspServer` wires handlers without throwing using the fixture engine config.

- [ ] **Step 1: Implement `lsp/server.ts`**

```ts
// lsp/server.ts
import {
    createConnection,
    type InitializeResult,
    ProposedFeatures,
    TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import type { Location, SymbolInformation } from 'vscode-languageserver-protocol';
import { AggregatorEngine } from '../core/engine.js';
import { loadConfig } from '../config/load-config.js';

/**
 * Start the lspmesh LSP server over stdio: it advertises the Claude Code op set,
 * forwards position ops to every matching backend (merged), and aggregates
 * workspace/symbol across all backends.
 */
export const startLspServer = (): void => {
    const connection = createConnection(ProposedFeatures.all);
    const engine = new AggregatorEngine(loadConfig());

    connection.onInitialize(async (): Promise<InitializeResult> => {
        await engine.init();
        return {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Full,
                definitionProvider: true,
                referencesProvider: true,
                hoverProvider: true,
                implementationProvider: true,
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                callHierarchyProvider: true,
            },
        };
    });

    const toPos = (p: { textDocument: { uri: string }; position: { line: number; character: number } }) => ({
        uri: p.textDocument.uri,
        line: p.position.line,
        character: p.position.character,
    });

    connection.onDefinition((p): Promise<Location[]> => engine.positionOp('textDocument/definition', toPos(p)));
    connection.onReferences((p): Promise<Location[]> => engine.positionOp('textDocument/references', toPos(p), { context: p.context }));
    connection.onImplementation((p): Promise<Location[]> => engine.positionOp('textDocument/implementation', toPos(p)));

    // Hover, documentSymbol, and callHierarchy are forwarded to the first
    // matching backend (not merged) — see note below.
    connection.onHover(async (p) => {
        const [first] = await engine.rawForward('textDocument/hover', toPos(p));
        return first ?? null;
    });

    connection.onWorkspaceSymbol(async (p): Promise<SymbolInformation[]> => {
        const results = await engine.workspaceSymbol(p.query);
        return results.map((r) => ({
            name: r.name,
            kind: r.kind,
            location: {
                uri: `file://${loadConfig().root}/${r.file}`,
                range: { start: { line: r.line - 1, character: r.character - 1 }, end: { line: r.line - 1, character: r.character - 1 } },
            },
        }));
    });

    connection.listen();
};
```

> **Engineer note:** add a `rawForward(method, pos)` method to `AggregatorEngine` that returns the raw per-backend replies (array, not merged) for ops like `hover`/`documentSymbol`/`callHierarchy` where merging isn't a simple location union. Implement it as a sibling of `positionOp` returning `Promise<unknown[]>` (filter nulls). Wire `onDocumentSymbol`, `onPrepareCallHierarchy`, `onCallHierarchyIncomingCalls`, `onCallHierarchyOutgoingCalls` the same way (first non-empty reply wins; for documentSymbol prefer the typescript backend). Add unit coverage for `rawForward` in `engine.test.ts` using the fixture, mirroring Task 4.2 Step 2.

- [ ] **Step 2: Add `rawForward` to the engine (TDD)** — write a failing `engine.test.ts` case asserting `rawForward('textDocument/references', ...)` returns one reply per matching backend, then implement:

```ts
// add to AggregatorEngine
async rawForward(method: string, pos: Position, extra: Record<string, unknown> = {}): Promise<unknown[]> {
    const path = uriToPath(pos.uri);
    const backends = this.#registry.backendsFor(path);
    for (const b of backends) b.open(path);
    const replies = await Promise.all(
        backends.map((b) =>
            b.request(method, { textDocument: { uri: pos.uri }, position: { line: pos.line, character: pos.character }, ...extra }).catch(() => null),
        ),
    );
    return replies.filter((r) => r != null);
}
```

- [ ] **Step 3: Run engine tests → PASS. Commit**

```bash
git add packages/ai/lspmesh/src/lsp packages/ai/lspmesh/src/core/engine.ts packages/ai/lspmesh/src/core/engine.test.ts
git commit -m "feat(lspmesh): add LSP server mode wiring the Claude Code op set to the engine."
```

---

## Phase 6 — MCP server mode

Expose `find_symbol` / `find_references` / `find_implementations` via `@modelcontextprotocol/sdk`, calling the same engine. Mirror the tool schemas + truncation behavior of the current `lsp-symbols.mjs`.

### Task 6.1: MCP server entry

**Files:**
- Create: `packages/ai/lspmesh/src/mcp/server.ts`
- Test: `packages/ai/lspmesh/src/mcp/server.test.ts` (construct the server, list tools, assert names/schemas — no transport)

- [ ] **Step 1: Failing test**

```ts
// mcp/server.test.ts
import { describe, expect, it } from 'vitest';
import { buildMcpServer } from './server.js';
import { AggregatorEngine } from '../core/engine.js';

describe('buildMcpServer', () => {
    it('registers the three find_* tools', async () => {
        const engine = { findSymbol: async () => [], findReferences: async () => [], findImplementations: async () => [] } as unknown as AggregatorEngine;
        const server = buildMcpServer(engine);
        // The SDK exposes registered tools; assert our three names are present.
        expect(server.listToolNames()).toEqual(['find_implementations', 'find_references', 'find_symbol']);
    });
});
```

> `listToolNames()` is a thin test helper we expose from `buildMcpServer` (return `{ server, listToolNames }` or attach a non-enumerable helper). Adjust the assertion to whatever the installed `@modelcontextprotocol/sdk` version exposes for introspection; if none, assert by calling the tool handlers directly instead.

- [ ] **Step 2: Run — fails.**

- [ ] **Step 3: Implement `mcp/server.ts`** (API shape per the installed SDK version — verify against its README via Context7/MCP docs before writing)

```ts
// mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AggregatorEngine } from '../core/engine.js';

/** Build the lspmesh MCP server exposing by-name search over the engine. */
export const buildMcpServer = (engine: AggregatorEngine): McpServer => {
    const server = new McpServer({ name: 'lspmesh', version: '0.0.1' });

    server.tool(
        'find_symbol',
        'Find where a symbol is defined across the workspace, by exact name. Definitions ranked ahead of import sites; pass definitionsOnly to drop imports.',
        { query: z.string(), definitionsOnly: z.boolean().optional() },
        async ({ query, definitionsOnly }) => {
            const results = await engine.findSymbol(query, { definitionsOnly });
            return { content: [{ type: 'text', text: results.length ? JSON.stringify(results, null, 2) : `No symbol named "${query}" found.` }] };
        },
    );

    server.tool(
        'find_references',
        'Find all references to a symbol by exact name, unioned over every definition; each result tagged with definedAt. Pass file to pin one definition.',
        { query: z.string(), file: z.string().optional() },
        async ({ query, file }) => {
            const r = await engine.findReferences(query, file);
            return { content: [{ type: 'text', text: r.length ? JSON.stringify(r, null, 2) : `No references found for "${query}".` }] };
        },
    );

    server.tool(
        'find_implementations',
        'Find implementations of an interface/abstract member by exact name, unioned over every definition. Pass file to pin one definition.',
        { query: z.string(), file: z.string().optional() },
        async ({ query, file }) => {
            const r = await engine.findImplementations(query, file);
            return { content: [{ type: 'text', text: r.length ? JSON.stringify(r, null, 2) : `No implementations found for "${query}".` }] };
        },
    );

    return server;
};

/** Start the MCP server over stdio. */
export const startMcpServer = async (engine: AggregatorEngine): Promise<void> => {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const server = buildMcpServer(engine);
    await server.connect(new StdioServerTransport());
};
```

> `zod` is a transitive of the MCP SDK in this repo (root pins `zod@4.4.3`). If `server.tool(...)` signature differs in the installed SDK version, adapt — confirm via the SDK docs (use the `mcp__context7` tool: resolve `@modelcontextprotocol/sdk`, query "register tool zod schema stdio"). Add `zod` to `dependencies` if not already resolvable.

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add packages/ai/lspmesh/src/mcp packages/ai/lspmesh/package.json
git commit -m "feat(lspmesh): add MCP server mode exposing find_symbol/find_references/find_implementations."
```

---

## Phase 7 — CLI entry

### Task 7.1: `lspmesh lsp` / `lspmesh mcp`

**Files:**
- Create: `packages/ai/lspmesh/src/cli.ts`
- Modify: `packages/ai/lspmesh/src/index.ts` (export the public API)
- Test: `packages/ai/lspmesh/src/cli.test.ts` (parse-mode unit; spawn covered in Phase 8)

- [ ] **Step 1: Failing test for the arg parser**

```ts
// cli.test.ts
import { describe, expect, it } from 'vitest';
import { parseMode } from './cli.js';

describe('parseMode', () => {
    it('accepts lsp and mcp', () => {
        expect(parseMode(['lsp'])).toBe('lsp');
        expect(parseMode(['mcp'])).toBe('mcp');
    });
    it('throws on unknown/missing mode', () => {
        expect(() => parseMode([])).toThrow(/usage/i);
        expect(() => parseMode(['frob'])).toThrow(/frob/);
    });
});
```

- [ ] **Step 2: Run — fails.**

- [ ] **Step 3: Implement `cli.ts`**

```ts
// cli.ts
import { loadConfig } from './config/load-config.js';
import { AggregatorEngine } from './core/engine.js';
import { startLspServer } from './lsp/server.js';
import { startMcpServer } from './mcp/server.js';

export type Mode = 'lsp' | 'mcp';

/** Parse the subcommand; throws with a usage message on anything unexpected. */
export const parseMode = (argv: string[]): Mode => {
    const mode = argv[0];
    if (mode === 'lsp' || mode === 'mcp') return mode;
    if (!mode) throw new Error('usage: lspmesh <lsp|mcp>');
    throw new Error(`lspmesh: unknown mode "${mode}" (usage: lspmesh <lsp|mcp>)`);
};

const main = async (): Promise<void> => {
    const mode = parseMode(process.argv.slice(2));
    if (mode === 'lsp') {
        startLspServer();
        return;
    }
    const engine = new AggregatorEngine(loadConfig());
    await engine.init();
    await startMcpServer(engine);
};

// Only run when invoked as the bin, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        process.stderr.write(`lspmesh: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    });
}
```

- [ ] **Step 4: Export public API in `index.ts`**

```ts
// index.ts
export { AggregatorEngine } from './core/engine.js';
export { loadConfig } from './config/load-config.js';
export { DEFAULT_CONFIG } from './config/default-config.js';
export type { BackendConfig, LspMeshConfig } from './config/types.js';
export const LSPMESH_VERSION = '0.0.1';
```

- [ ] **Step 5: Run cli test → PASS. Build + verify shebang + smoke-run**

```bash
pnpm --filter lspmesh build
head -1 packages/ai/lspmesh/dist/cli.js   # expect: #!/usr/bin/env node
node packages/ai/lspmesh/dist/cli.js nope; echo "exit=$?"   # expect: usage error, exit=1
```

- [ ] **Step 6: Commit**

```bash
git add packages/ai/lspmesh/src/cli.ts packages/ai/lspmesh/src/cli.test.ts packages/ai/lspmesh/src/index.ts
git commit -m "feat(lspmesh): add the lspmesh CLI with lsp and mcp modes."
```

---

## Phase 8 — Integration tests (real backends + parity)

### Task 8.1: Integration harness + fixture workspace

**Files:**
- Create: `packages/ai/lspmesh/vitest.integration.config.ts`
- Create: `packages/ai/lspmesh/tests/integration/fixtures/workspace/` (a tiny TS project: `tsconfig.json`, `src/a.ts` exporting a symbol + `src/b.ts` referencing it; a `globals.css` with `@tailwind`; a `biome.json`)
- Create: `packages/ai/lspmesh/tests/integration/lsp.integration.test.ts`
- Create: `packages/ai/lspmesh/tests/integration/mcp.integration.test.ts`

- [ ] **Step 1: Write `vitest.integration.config.ts`** (longer timeout; backends spawn via npx)

```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
    root,
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/integration/**/*.integration.test.ts'],
        testTimeout: 120_000,
        hookTimeout: 120_000,
        pool: 'forks',
        fileParallelism: false,
    },
});
```

- [ ] **Step 2: Build the fixture workspace** (real, minimal). Example `src/a.ts`:

```ts
// tests/integration/fixtures/workspace/src/a.ts
export const widgetName = 'lspmesh';
export interface Greeter { greet(): string; }
```

```ts
// tests/integration/fixtures/workspace/src/b.ts
import { widgetName } from './a.js';
export const hello = widgetName.toUpperCase();
```

Add a `tsconfig.json` (extends nothing; `compilerOptions: { strict: true, module: "ESNext", moduleResolution: "Bundler" }`, `include: ["src"]`), a `biome.json` (`{ "$schema": "...", "linter": { "enabled": true } }`), and a `globals.css` (`@import "tailwindcss";`). Initialize it as a git repo in the test `beforeAll` (the seed step uses `git grep`):

```ts
// helper used by both integration tests
import { execFileSync } from 'node:child_process';
const initGit = (cwd: string) => {
    execFileSync('git', ['init', '-q'], { cwd });
    execFileSync('git', ['add', '-A'], { cwd });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixture'], { cwd });
};
```

- [ ] **Step 3: Write the LSP integration test** (drives the engine against the real typescript backend; tailwind/biome configured)

```ts
// lsp.integration.test.ts
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AggregatorEngine } from '../../src/core/engine.js';
import { DEFAULT_CONFIG } from '../../src/config/default-config.js';
// + initGit helper, fixture path

const WS = fileURLToPath(new URL('./fixtures/workspace', import.meta.url));
let engine: AggregatorEngine;

beforeAll(async () => {
    initGit(WS);
    engine = new AggregatorEngine({ root: WS, backends: DEFAULT_CONFIG.backends.map((b) => ({ ...b })) });
    await engine.init();
}, 120_000);
afterAll(async () => { await engine?.dispose(); });

describe('lspmesh LSP aggregation (real backends)', () => {
    it('finds widgetName via workspace/symbol (typescript backend)', async () => {
        const res = await engine.workspaceSymbol('widgetName');
        expect(res.some((r) => r.file.endsWith('src/a.ts'))).toBe(true);
    }, 120_000);

    it('finds references to widgetName across files', async () => {
        const refs = await engine.findReferences('widgetName');
        expect(refs.some((r) => r.file.endsWith('src/b.ts'))).toBe(true);
    }, 120_000);

    it('finds implementations of Greeter', async () => {
        const impls = await engine.findImplementations('Greeter');
        expect(Array.isArray(impls)).toBe(true); // no impl in fixture → [] is valid
    }, 120_000);
});
```

- [ ] **Step 4: Write the MCP integration test** — spawn `node dist/cli.js mcp` over stdio (after build), `tools/call` `find_symbol`, assert it resolves `widgetName`. Mirror the harness in `/tmp/lsp-symbols-e2e.mjs` from the earlier MJS work (drive MCP JSON-RPC line-delimited; or use the MCP SDK client). Build first in a `beforeAll`.

- [ ] **Step 5: Write the parity test** (`tests/integration/parity.integration.test.ts`): run `engine.findReferences('isProduction')` against the **commerce repo root** and assert it returns ≥2 `definedAt` groups including `packages/utils/src/runtime-env.ts` — matching the verified old-`lsp-symbols` behavior. Guard with a skip when `packages/utils` isn't present.

- [ ] **Step 6: Run the integration suite**

Run: `pnpm --filter lspmesh test:integration`
Expected: PASS (real typescript-language-server resolves the fixture; tailwind/biome at least initialize without error).

> If npx-pinned backends are slow/flaky in CI, add a `beforeAll` warmup that pre-resolves them with `pnpm dlx`, and mark the suite `test:integration` as a separate CI job (Phase 12) with a longer timeout. Log (don't silently skip) any backend that fails to start.

- [ ] **Step 7: Commit**

```bash
git add packages/ai/lspmesh/tests packages/ai/lspmesh/vitest.integration.config.ts
git commit -m "test(lspmesh): add real-backend LSP/MCP integration tests and a parity check vs lsp-symbols."
```

---

## Phase 9 — Marketplace plugin

Add an `lspmesh` plugin to the public `filiphsps/commerce` marketplace so people can install it. Register both `lspServers` and `mcpServers` via `npx lspmesh`.

### Task 9.1: Marketplace + plugin manifest

**Files:**
- Modify: `.claude/plugins/commerce-plugins/.claude-plugin/marketplace.json` (add the `lspmesh` plugin)
- Create: `.claude/plugins/commerce-plugins/lspmesh/.claude-plugin/plugin.json`
- Create: `.claude/plugins/commerce-plugins/lspmesh/.lsp.json`
- Create: `.claude/plugins/commerce-plugins/lspmesh/.mcp.json`
- Create: `.claude/plugins/commerce-plugins/lspmesh/README.md`

- [ ] **Step 1: Add the plugin to `marketplace.json`** (append to `plugins[]`)

```json
{
    "name": "lspmesh",
    "description": "LSP aggregator + MCP server — fronts TypeScript, Tailwind, and Biome behind one endpoint, with by-name symbol/reference/implementation search.",
    "version": "0.0.1",
    "author": { "name": "Filiph Sandström", "email": "filfat@hotmail.se" },
    "source": "./lspmesh",
    "category": "development",
    "strict": false,
    "lspServers": {
        "lspmesh": {
            "command": "npx",
            "args": ["-y", "lspmesh@latest", "lsp"],
            "extensionToLanguage": {
                ".ts": "typescript", ".tsx": "typescriptreact", ".mts": "typescript", ".cts": "typescript",
                ".js": "javascript", ".jsx": "javascriptreact", ".mjs": "javascript", ".cjs": "javascript",
                ".css": "css", ".scss": "scss", ".json": "json", ".jsonc": "jsonc"
            }
        }
    },
    "mcpServers": {
        "lspmesh": { "command": "npx", "args": ["-y", "lspmesh@latest", "mcp"] }
    }
}
```

- [ ] **Step 2: Write `lspmesh/.claude-plugin/plugin.json`**, `.lsp.json`, `.mcp.json` (mirror the same `lspServers`/`mcpServers` blocks — the existing `typescript-lsp` plugin carries both a marketplace entry and a top-level `.lsp.json`; match that convention exactly), and a short README.

- [ ] **Step 3: Validate JSON** (`node -e "JSON.parse(require('fs').readFileSync('<file>','utf8'))"` for each) and commit

```bash
git add .claude/plugins/commerce-plugins
git commit -m "feat(lspmesh): add the lspmesh Claude marketplace plugin (lsp + mcp via npx)."
```

> Note in the package README + docs: external install is `claude plugin marketplace add filiphsps/commerce` → enable `lspmesh`. It pulls `lspmesh@latest` from npm via npx, so it works **after** the 0.0.1 release (Phase 12). Until then, dogfood via the workspace `dist` (Phase 11).

---

## Phase 10 — Docs site integration

Mirror `next-build-notifier`: ship a `docs/` dir (mirrored into the site), register a new "AI" category, and let TypeDoc auto-generate the API reference.

### Task 10.1: Package docs + category registration

**Files:**
- Create: `packages/ai/lspmesh/docs/overview.mdx`
- Create: `packages/ai/lspmesh/docs/configuration.mdx`
- Modify: `apps/docs/content/packages/_categories.json` (add `ai` category)
- Modify: `apps/docs/content/packages/meta.json` (add `ai` page)
- Modify: `apps/docs/scripts/mirror-workspace-docs.ts` (`CATEGORY_TITLES` → add `ai: 'AI'`)

- [ ] **Step 1: Write `docs/overview.mdx`** (frontmatter like `next-build-notifier/docs/overview.mdx`)

```mdx
---
title: Overview
sidebar_position: 1
---

`lspmesh` fronts multiple language servers — TypeScript, Tailwind, Biome — behind one
LSP endpoint, routing each request to every backend that handles the file and merging
the results. It also exposes the same intelligence as MCP tools for AI agents.

## Install

```bash
claude plugin marketplace add filiphsps/commerce
# then enable the "lspmesh" plugin
```

Or run it directly:

```bash
npx lspmesh lsp   # LSP server over stdio
npx lspmesh mcp   # MCP server over stdio
```

## Modes

- **`lspmesh lsp`** — an LSP server speaking the Claude Code op set (definition,
  references, hover, documentSymbol, implementation, call hierarchy, workspace/symbol),
  aggregated across all configured backends.
- **`lspmesh mcp`** — an MCP server exposing `find_symbol`, `find_references`, and
  `find_implementations` by exact name.
```

- [ ] **Step 2: Write `docs/configuration.mdx`** documenting `lspmesh.json` (the `backends[]` schema, the npx-pinned default, how to add a backend).

- [ ] **Step 3: Add the `ai` category to `_categories.json`**

```json
"ai": {
    "title": "AI",
    "order": 6,
    "packages": ["ai/lspmesh"]
}
```

- [ ] **Step 4: Add `"ai"` to the `pages` array in `apps/docs/content/packages/meta.json`** and `ai: 'AI'` to `CATEGORY_TITLES` in `mirror-workspace-docs.ts`.

- [ ] **Step 5: Generate + verify**

Run: `pnpm --filter @nordcom/commerce-docs gen`
Then: `pnpm --filter @nordcom/commerce-docs docs:gen:check`
Expected: lspmesh appears under content/packages/ai/lspmesh; gen:check passes (no uncommitted generated drift). Confirm `.typedoc-out/ai/lspmesh` (or equivalent) is produced — if TypeDoc's entry-point discovery doesn't pick up the nested path, add `packages/ai/lspmesh/src` to the relevant TypeDoc include/entryPoints in `apps/docs` (search for where `.typedoc-out` packages are enumerated: `apps/docs/scripts/emit-typedoc-json.ts`).

- [ ] **Step 6: Commit**

```bash
git add packages/ai/lspmesh/docs apps/docs/content/packages/_categories.json apps/docs/content/packages/meta.json apps/docs/scripts/mirror-workspace-docs.ts
git commit -m "docs(lspmesh): integrate the package into the docs site under a new AI category."
```

---

## Phase 11 — Consolidate commerce onto lspmesh

Replace the two LSP plugins + `lsp-symbols.mjs` with lspmesh, **gated on the parity test (Phase 8) being green**. Commerce dogfoods via the workspace `dist` build (pre-publish).

### Task 11.1: Repoint commerce's Claude Code config

**Files:**
- Modify: `.claude/settings.json` (`enabledPlugins`: disable `typescript-lsp@commerce-plugins` + `tailwind-lsp-adapter@commerce-plugins`)
- Create/modify: a local lspmesh MCP/LSP registration that runs the **workspace build** (`node packages/ai/lspmesh/dist/cli.js lsp` / `... mcp`) — mirror however `lsp-symbols` was registered (local MCP) but for both modes. For LSP, add an `lspmesh` plugin variant whose command points at the dist path, OR enable the new `lspmesh@commerce-plugins` plugin with a dev override.
- Delete: `.claude/mcp/lsp-symbols.mjs`, `.claude/mcp/README.md`
- Modify: `CLAUDE.md` (the "Code intelligence" section references `lsp-symbols`; update it to describe lspmesh)

- [ ] **Step 1: Verify parity first**

Run: `pnpm --filter lspmesh test:integration`
Expected: parity test green. **Do not proceed if red.**

- [ ] **Step 2: Build the package so the dist exists for local registration**

Run: `pnpm --filter lspmesh build`

- [ ] **Step 3: Disable the two superseded plugins** in `.claude/settings.json` `enabledPlugins`:

```json
"typescript-lsp@commerce-plugins": false,
"tailwind-lsp-adapter@commerce-plugins": false
```

- [ ] **Step 4: Register lspmesh for commerce** (dist-based, dev). For MCP, add to the project `.mcp.json` or a local registration:

```json
"lspmesh": { "command": "node", "args": ["packages/ai/lspmesh/dist/cli.js", "mcp"] }
```

For LSP, point a commerce-plugins `lspmesh` dev entry's `command`/`args` at `node packages/ai/lspmesh/dist/cli.js lsp` (instead of `npx lspmesh@latest`) until 0.0.1 is published, then switch to npx.

- [ ] **Step 5: Delete the old MJS server + its README; update `CLAUDE.md`** Code-intelligence section to point at lspmesh (`find_symbol`/`find_references`/`find_implementations` now served by `lspmesh mcp`; position ops + aggregated workspace/symbol by `lspmesh lsp`).

- [ ] **Step 6: Reconnect + manually verify in this repo** — `/mcp` reconnect, run `find_references` for `isProduction`, confirm the two `definedAt` groups. Run an LSP `hover` on `apps/storefront/src/api/shopify.ts:107` and a `workspaceSymbol` for `ShopifyApolloApiClient` (now non-empty via lspmesh).

- [ ] **Step 7: Commit**

```bash
git add .claude CLAUDE.md
git rm .claude/mcp/lsp-symbols.mjs .claude/mcp/README.md
git commit -m "refactor(lspmesh): consolidate commerce onto lspmesh and retire lsp-symbols + the ts/tailwind LSP plugins."
```

---

## Phase 12 — Release wiring (changeset + trusted publishing)

### Task 12.1: Changeset + release workflow

**Files:**
- Create: `.changeset/<random-name>.md`
- Modify: `.github/workflows/release.yml` (add OIDC `id-token: write` permission + ensure `lspmesh` builds before publish; provenance)
- Verify: `.changeset/config.json` (bare `lspmesh` is **not** ignored — confirm; `@nordcom/*` ignore doesn't match it)

- [ ] **Step 1: Confirm changesets will include lspmesh**

Run: `pnpm changeset status --verbose`
Expected: `lspmesh` listed as releasable (not ignored).

- [ ] **Step 2: Add the first changeset** (the 0.0.1 feature release)

```bash
pnpm changeset
```

Pick `lspmesh` → `patch` (0.0.0 → 0.0.1 is the first real release; choose the level that yields `0.0.1`). Summary (WHY-only): "Initial release: LSP aggregator fronting TypeScript, Tailwind, and Biome, plus MCP by-name search."

- [ ] **Step 3: Wire trusted publishing in `release.yml`** — read the current file first; ensure the publish job has:

```yaml
permissions:
  contents: write
  id-token: write   # required for npm trusted publishing (OIDC provenance)
```

and that `pnpm build:packages` builds `lspmesh` before `changeset publish`. npm ≥ 11.5 + the trusted publisher configured on npmjs.com (Phase 0 manual step) means `changeset publish` mints provenance automatically — no `NODE_AUTH_TOKEN` needed for lspmesh. Keep tokenful publish for the existing `@nordcom/cart-*` packages if they still use it.

- [ ] **Step 4: Validate the workflow locally** (lint the YAML; dry-run the build)

Run: `pnpm build:packages --filter lspmesh && pnpm --filter lspmesh test`
Expected: build + unit tests green.

- [ ] **Step 5: Commit**

```bash
git add .changeset .github/workflows/release.yml
git commit -m "ci(lspmesh): add the release changeset and wire npm trusted publishing."
```

- [ ] **Step 6 (post-merge, owner):** after the PR merges and the npm Trusted Publisher is configured (Phase 0), the changesets release action publishes `lspmesh@0.0.1` with provenance. Verify: `pnpm view lspmesh version` → `0.0.1`. Then flip the commerce-plugins `lspmesh` LSP entry + commerce MCP registration from the dist path to `npx lspmesh@latest` (or keep dist for dev — decide per team preference) and the marketplace install path goes live.

---

## Phase 13 — Finish the branch

- [ ] **Step 1: Full gate**

```bash
pnpm build:packages
pnpm --filter lspmesh lint && pnpm --filter lspmesh typecheck && pnpm --filter lspmesh test
pnpm --filter lspmesh test:integration
pnpm --filter @nordcom/commerce-docs docs:gen:check
```

- [ ] **Step 2: Open the PR** (`feat/lspmesh` → `master`), rebase (never merge) per repo policy. Use the REQUIRED SUB-SKILL `superpowers:finishing-a-development-branch`.

---

## Self-review notes (resolved)

- **Spec coverage:** every ledger row maps to a phase — name/identity (Phase 0/1/12), location+workspace (1.1–1.2), config-driven backends (2), carry-over hardening (3–4), Claude Code op set LSP (5), MCP tools (6), CLI modes (7), 3-backend per-op merge (4–5, validated in 8), marketplace (9), docs (10), consolidation (11), trusted publishing + changesets (12).
- **Type consistency:** `BackendConfig`/`LspMeshConfig` (2.1) are consumed unchanged by `BackendClient` (3.2), `BackendRegistry` (3.3), and `AggregatorEngine` (4.2). `SymbolResult`/`RefResult`/`Position` are defined once in `engine.ts` and reused by LSP (5) and MCP (6). `positionOp`/`rawForward`/`workspaceSymbol`/`findSymbol`/`findReferences`/`findImplementations` names are stable across Phases 4–7.
- **Known follow-ups flagged inline:** vite shebang-banner fallback (1.2 S4), biome version pin (2.1 S4), MCP SDK API drift (6.1 S3), TypeDoc nested-path discovery (10 S5), npx backend flakiness in CI (8 S6).
