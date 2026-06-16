# `next-build-notifier` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, public, Next.js npm package `next-build-notifier` that detects a newer deployment and exposes a headless provider/hook/render-prop, then wire it into storefront (per-shop CMS-configurable), admin, and landing.

**Architecture:** A pluggable build-id comparison. `resolveBuildId(env)` is the single source of truth used on both ends. `withBuildNotifier()` (next.config) bakes the client's own id into `NEXT_PUBLIC_BUILD_ID`; `createVersionRoute()` serves the *current* id at runtime; the client polls and compares. Headless client API ships zero styles — each app renders its own UI.

**Tech Stack:** TypeScript, React 19, Next.js 16 (App Router), Vite 8 + rolldown (lib build), Vitest 4 + happy-dom + @testing-library/react, Playwright (e2e), Convex (storefront config persistence), `@nordcom/nordstar` (admin/landing UI), Biome (lint/format), Changesets + npm OIDC trusted publishing, fumadocs (docs).

**Reference spec:** `.specs/2026-06-16-next-build-notifier/spec.md`

---

## Conventions for every task

- **Build packages first in a fresh worktree:** `pnpm build:packages` before any lint/typecheck/test (apps import workspace packages from built `dist/`).
- **Lint/format:** Biome only. After editing files: `pnpm biome check --write <files>`; fix diagnostics.
- **No `new Error(...)`** — throw via `@nordcom/commerce-errors` *inside the monorepo apps/packages*. The published package `next-build-notifier` is dependency-free and standalone, so inside it use plain `Error` (it must not depend on `@nordcom/*`). This is the one place the repo rule is intentionally not applied; note it in the package README.
- **JSDoc on every exported and internal function/component** (purpose + `@param`/`@returns`/`@throws`).
- **noUncheckedIndexedAccess** is on — index access is `T | undefined`.
- **American English**, **trailing slashes** on internal links.
- **Commit after each task** with Conventional Commits + scope (lowercase imperative subject, trailing period).

---

## File Structure

### New package — `packages/next-build-notifier/`

| File | Responsibility |
|---|---|
| `package.json` | Public package manifest; `.`/`/server`/`/config` exports; peer deps; homepage → docs |
| `tsconfig.json` | Extends `../../tsconfig.lib.json`, `jsx: react-jsx` |
| `vite.config.ts` | `react()` + codecov, merges shared `../vite.config` |
| `vitest.config.ts` | happy-dom + react plugin |
| `README.md` | Public docs entry (install, API, Vercel notes) |
| `src/shared/resolve-build-id.ts` | Pure `resolveBuildId(env)` + `BuildIdEnv` type |
| `src/shared/types.ts` | `VersionResponse`, `BuildNotifierConfig`, `BuildNotificationState` |
| `src/shared/reload.ts` | `reload()` (hard `location.reload()`), SSR-safe |
| `src/server.ts` | `createVersionRoute()` factory (re-exports `resolveBuildId`) |
| `src/config.ts` | `withBuildNotifier()` next.config wrapper (re-exports `resolveBuildId`) |
| `src/client/dismissal.ts` | per-build-id `sessionStorage` read/write |
| `src/client/default-fetcher.ts` | `no-store`, cache-busted version fetch |
| `src/client/use-build-notifier-engine.ts` | the polling/compare/dismiss engine hook |
| `src/client/context.ts` | `BuildNotifierContext` + `useBuildNotification()` |
| `src/client/provider.tsx` | `BuildNotifierProvider` |
| `src/client/build-notifier.tsx` | `<BuildNotifier>` render-prop |
| `src/index.ts` | client entry (`'use client'`) re-exporting the client API |
| `src/**/*.test.ts(x)` | co-located unit tests |

### Monorepo edits (integration)

| File | Change |
|---|---|
| `packages/db/src/lib/extensions.ts` | add `buildNotifier` to `ShopExtensionManifest` |
| `packages/cms/src/extensions/component-settings.ts` | add `buildNotifier` `COMPONENT_SETTINGS` entry |
| `packages/cms/src/extensions/resolve.ts` | add `buildNotifier` to `ResolvedExtensions` + composition |
| `packages/convex/convex/lib/validators.ts` | add `buildNotifier` to `shopExtensionManifestValidator` |
| `apps/storefront/next.config.js` | wrap with `withBuildNotifier`; `transpilePackages` |
| `apps/storefront/src/app/[domain]/api/version/route.ts` | new version route |
| `apps/storefront/src/locales/*.json` | add `build-notifier` copy |
| `apps/storefront/src/components/build-notifier/*` | provider mount + themed banner |
| `apps/storefront/src/app/[domain]/[locale]/layout.tsx` | mount provider |
| `apps/storefront/e2e/build-notifier.spec.ts` | storefront e2e |
| `apps/admin/next.config.js` | wrap with `withBuildNotifier`; `transpilePackages` |
| `apps/admin/src/app/api/version/route.ts` | new version route |
| `apps/admin/src/components/build-notifier/*` | nordstar banner + provider mount |
| `apps/admin/src/app/(app)/layout.tsx` | mount provider |
| `apps/admin/e2e/build-notifier.spec.ts` | admin e2e (config editor + banner) |
| `apps/landing/next.config.js` | wrap with `withBuildNotifier`; `transpilePackages` |
| `apps/landing/src/app/api/version/route.ts` | new version route |
| `apps/landing/src/components/build-notifier/*` | nordstar banner + provider mount |
| `apps/landing/src/app/(marketing)/layout.tsx`, `(status)/layout.tsx` | mount provider |
| `apps/docs/content/packages/...` + `_categories.json` + `meta.json` | docs |
| `.changeset/*.md` | changeset for `next-build-notifier` |

---

# Phase 0 — Workspace, branch & npm name reservation

### Task 0.1: Create the worktree and branch

**Files:** none (git).

- [ ] **Step 1: Create the sibling worktree on a new branch**

Run from the repo root:

```bash
git fetch origin
git worktree add ../commerce-build-notifier -b feat/2029-build-notifier origin/master
```

Expected: `Preparing worktree (new branch 'feat/2029-build-notifier')`. All subsequent work happens in `../commerce-build-notifier`.

- [ ] **Step 2: Bootstrap the worktree**

```bash
cd ../commerce-build-notifier
pnpm install
pnpm build:packages
```

Expected: install completes; `build:packages` succeeds.

> If you prefer to keep the plan file accessible, the `.specs/` dir is committed on `master` and will be present in the worktree.

### Task 0.2: Reserve the npm name (MAINTAINER-RUN, irreversible)

**Files:** none.

> **This step publishes to npm and reserves a public name — it is outward-facing and not reversible (you cannot unpublish a name freely). It must be run by the maintainer with npm auth; the agent must NOT run it.** Surface it to the user and wait for confirmation it's done before relying on the name.

- [ ] **Step 1: Maintainer publishes a stub to reserve `next-build-notifier`**

Maintainer runs (in the session, prefix with `!`):

```bash
! npm whoami            # confirm logged in
```

Then in a scratch dir:

```bash
mkdir -p /tmp/nbn-stub && cd /tmp/nbn-stub
npm init -y
# edit package.json: name "next-build-notifier", version "0.0.0", private false,
#   "publishConfig": { "access": "public" }, add a one-line README.md
npm publish --access public
```

Expected: `+ next-build-notifier@0.0.0`.

- [ ] **Step 2: Maintainer configures the GitHub Actions trusted publisher**

On npmjs.com → the `next-build-notifier` package → Settings → Publishing Access → Trusted Publishers → Add → GitHub Actions, repo `filiphsps/commerce`, workflow `release.yml`. (Same flow documented in `.github/workflows/release.yml` for `@tagtree/*`.)

- [ ] **Step 3: Confirm**

The agent records in the task notes that the name is reserved and the trusted publisher is configured, then proceeds. The real `0.1.0` release later flows through the existing `release.yml` (OIDC, no token).

---

# Phase 1 — Package scaffold

### Task 1: Create the package skeleton and verify it builds empty

**Files:**
- Create: `packages/next-build-notifier/package.json`
- Create: `packages/next-build-notifier/tsconfig.json`
- Create: `packages/next-build-notifier/vite.config.ts`
- Create: `packages/next-build-notifier/vitest.config.ts`
- Create: `packages/next-build-notifier/src/index.ts` (temporary stub)

- [ ] **Step 1: Write `package.json`**

```jsonc
{
    "$schema": "https://json.schemastore.org/package.json",
    "name": "next-build-notifier",
    "version": "0.1.0",
    "publishConfig": {
        "access": "public"
    },
    "description": "Headless 'new build available' notifier for Next.js — generic build detection with optional Vercel support.",
    "private": false,
    "sideEffects": false,
    "type": "module",
    "types": "./dist/index.d.ts",
    "module": "./dist/index.js",
    "exports": {
        ".": [
            "./src/index.ts",
            "./dist/index.js"
        ],
        "./server": [
            "./src/server.ts",
            "./dist/server.js"
        ],
        "./config": [
            "./src/config.ts",
            "./dist/config.js"
        ]
    },
    "scripts": {
        "build": "tsc && vite build",
        "clean": "rimraf -g dist coverage .turbo *.tsbuildinfo *.log node_modules",
        "lint": "biome lint .",
        "format": "concurrently -i pnpm:format:*",
        "format:lint": "biome lint --write .",
        "format:format": "biome format --write .",
        "format:check": "biome check --write --unsafe .",
        "test": "vitest run",
        "typecheck": "tsc -noEmit"
    },
    "author": {
        "name": "Filiph Sandström",
        "email": "filfat@hotmail.se",
        "url": "https://github.com/filiphsps/"
    },
    "contributors": [
        {
            "name": "Filiph Sandström",
            "email": "filfat@hotmail.se",
            "url": "https://github.com/filiphsps/"
        }
    ],
    "license": "MIT",
    "repository": {
        "type": "git",
        "url": "git+https://github.com/filiphsps/commerce.git",
        "directory": "packages/next-build-notifier"
    },
    "keywords": [
        "next",
        "nextjs",
        "vercel",
        "deployment",
        "build",
        "version",
        "skew",
        "notifier",
        "headless",
        "react"
    ],
    "bugs": {
        "url": "https://github.com/filiphsps/commerce/issues"
    },
    "homepage": "https://nordcom.store/docs/docs/next-build-notifier/",
    "files": [
        "dist",
        "README.md"
    ],
    "peerDependencies": {
        "next": ">=14",
        "react": ">=18",
        "react-dom": ">=18"
    },
    "peerDependenciesMeta": {
        "next": { "optional": true }
    },
    "devDependencies": {
        "@codecov/vite-plugin": "2.0.1",
        "@testing-library/react": "16.3.2",
        "@types/react": "19.2.17",
        "@types/react-dom": "19.2.3",
        "@vitejs/plugin-react": "5.1.1",
        "concurrently": "10.0.3",
        "happy-dom": "20.10.3",
        "next": "16.0.1",
        "react": "^19.2.7",
        "react-dom": "^19.2.7",
        "rimraf": "6.1.3",
        "typescript": "6.0.3",
        "vite": "8.0.16",
        "vitest": "4.1.8"
    }
}
```

> Pin `@vitejs/plugin-react` and `next` to the versions already present in the lockfile if they differ — run `pnpm why @vitejs/plugin-react next` and match. `next` is a peer (optional) because `/config` and `/server` only reference Next *types*, never import Next at runtime.

- [ ] **Step 2: Write `tsconfig.json`** (mirrors `react-payment-brand-icons`)

```jsonc
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "extends": "../../tsconfig.lib.json",
    "compilerOptions": {
        "jsx": "react-jsx"
    },
    "include": ["./src/**/*.ts", "./src/**/*.tsx"]
}
```

- [ ] **Step 3: Write `vite.config.ts`** (mirrors `react-payment-brand-icons`)

```ts
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codecovVitePlugin } from '@codecov/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = 'next-build-notifier';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: { force: true },
        root: resolve(__dirname),
        build: {
            target: 'esnext',
            rolldownOptions: {
                external: ['react', 'react-dom', 'react/jsx-runtime', 'next', 'next/server'],
                output: { name },
            },
        },
        plugins: [
            react(),
            codecovVitePlugin({
                enableBundleAnalysis: Boolean(process.env.CI) && !!process.env.CODECOV_TOKEN,
                bundleName: name,
                uploadToken: process.env.CODECOV_TOKEN,
            }),
        ],
    }),
);
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['src/**/*.test.{ts,tsx}'],
    },
});
```

- [ ] **Step 5: Write a temporary `src/index.ts` stub** (replaced in Phase 7)

```ts
export const __placeholder = true;
```

- [ ] **Step 6: Install and build**

```bash
pnpm install
pnpm --filter next-build-notifier build
```

Expected: install links the new workspace package; build emits `dist/index.js` + `dist/index.d.ts`.

- [ ] **Step 7: Commit**

```bash
git add packages/next-build-notifier
git commit -m "feat(next-build-notifier): scaffold package skeleton."
```

---

# Phase 2 — `resolveBuildId` (shared core, TDD)

### Task 2: Pure build-id resolution

**Files:**
- Create: `packages/next-build-notifier/src/shared/resolve-build-id.ts`
- Test: `packages/next-build-notifier/src/shared/resolve-build-id.test.ts`

- [ ] **Step 1: Write the failing test**

`src/shared/resolve-build-id.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { resolveBuildId } from './resolve-build-id';

describe('resolveBuildId', () => {
    it('prefers VERCEL_DEPLOYMENT_ID above all', () => {
        expect(
            resolveBuildId({
                VERCEL_DEPLOYMENT_ID: 'dpl_1',
                GIT_COMMIT_SHA: 'sha',
                NEXT_PUBLIC_BUILD_ID: 'nb',
            }),
        ).toBe('dpl_1');
    });

    it('falls back through git sha sources then build id', () => {
        expect(resolveBuildId({ GIT_COMMIT_SHA: 'sha1' })).toBe('sha1');
        expect(resolveBuildId({ VERCEL_GIT_COMMIT_SHA: 'sha2' })).toBe('sha2');
        expect(resolveBuildId({ NEXT_PUBLIC_BUILD_ID: 'nb' })).toBe('nb');
        expect(resolveBuildId({ BUILD_ID: 'b' })).toBe('b');
    });

    it("returns 'development' when nothing is set", () => {
        expect(resolveBuildId({})).toBe('development');
    });

    it('ignores empty-string values', () => {
        expect(resolveBuildId({ VERCEL_DEPLOYMENT_ID: '', GIT_COMMIT_SHA: 'sha' })).toBe('sha');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter next-build-notifier test resolve-build-id`
Expected: FAIL — `Failed to resolve import './resolve-build-id'`.

- [ ] **Step 3: Write the implementation**

`src/shared/resolve-build-id.ts`:

```ts
/**
 * The subset of environment variables {@link resolveBuildId} reads, in priority order.
 */
export type BuildIdEnv = Partial<
    Record<'VERCEL_DEPLOYMENT_ID' | 'GIT_COMMIT_SHA' | 'VERCEL_GIT_COMMIT_SHA' | 'NEXT_PUBLIC_BUILD_ID' | 'BUILD_ID', string>
>;

/**
 * Resolves a single canonical build identifier from the environment so the client (baked at build
 * time) and the version endpoint (read at runtime) always derive their id from the same source.
 * Vercel's deployment id wins when present; otherwise the git commit sha, then an explicit build id.
 *
 * @param env - The environment bag. Defaults to `process.env`. Inject a plain object in tests.
 * @returns The resolved build id, or `'development'` when no source is set.
 */
export function resolveBuildId(env: BuildIdEnv = process.env as BuildIdEnv): string {
    return (
        env.VERCEL_DEPLOYMENT_ID ||
        env.GIT_COMMIT_SHA ||
        env.VERCEL_GIT_COMMIT_SHA ||
        env.NEXT_PUBLIC_BUILD_ID ||
        env.BUILD_ID ||
        'development'
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter next-build-notifier test resolve-build-id`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/next-build-notifier/src/shared/resolve-build-id.ts packages/next-build-notifier/src/shared/resolve-build-id.test.ts
git commit -m "feat(next-build-notifier): add resolveBuildId env resolver."
```

---

# Phase 3 — `createVersionRoute` (server, TDD)

### Task 3: Version endpoint route-handler factory

**Files:**
- Create: `packages/next-build-notifier/src/server.ts`
- Test: `packages/next-build-notifier/src/server.test.ts`

- [ ] **Step 1: Write the failing test**

`src/server.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createVersionRoute } from './server';

describe('createVersionRoute', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns the resolved build id as no-store JSON', async () => {
        vi.stubEnv('GIT_COMMIT_SHA', 'abc123');
        const { GET } = createVersionRoute();
        const res = await GET();

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('cache-control')).toContain('no-store');

        const body = (await res.json()) as { id: string; ts: number };
        expect(body.id).toBe('abc123');
        expect(typeof body.ts).toBe('number');
    });

    it('honors a custom resolveId and extra headers', async () => {
        const { GET } = createVersionRoute({
            resolveId: () => 'custom',
            headers: { 'x-test': '1' },
        });
        const res = await GET();
        const body = (await res.json()) as { id: string };

        expect(body.id).toBe('custom');
        expect(res.headers.get('x-test')).toBe('1');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter next-build-notifier test server`
Expected: FAIL — cannot resolve `./server`.

- [ ] **Step 3: Write the implementation**

`src/server.ts`:

```ts
import { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

export { resolveBuildId, type BuildIdEnv } from './shared/resolve-build-id';

/**
 * Options for {@link createVersionRoute}.
 */
export type CreateVersionRouteOptions = {
    /** Override how the runtime build id is derived. Defaults to {@link resolveBuildId}. */
    resolveId?: (env: BuildIdEnv) => string;
    /** Extra response headers merged over the defaults. */
    headers?: Record<string, string>;
};

/**
 * Creates a Next.js App Router route handler that serves the current deployment's build id as
 * `{ id, ts }`. Mount it at a stable path (default convention: `/api/version`) and export its `GET`.
 * The response is `no-store` so a polling client always sees the live deployment's id.
 *
 * @param options - See {@link CreateVersionRouteOptions}.
 * @returns An object with a `GET` handler returning a web `Response`.
 * @example
 * ```ts
 * // app/api/version/route.ts
 * import { createVersionRoute } from 'next-build-notifier/server';
 * export const dynamic = 'force-dynamic';
 * export const { GET } = createVersionRoute();
 * ```
 */
export function createVersionRoute(options: CreateVersionRouteOptions = {}): { GET: () => Promise<Response> } {
    const resolveId = options.resolveId ?? resolveBuildId;

    async function GET(): Promise<Response> {
        const id = resolveId(process.env as BuildIdEnv);
        return new Response(JSON.stringify({ id, ts: Date.now() }), {
            status: 200,
            headers: {
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store, max-age=0, must-revalidate',
                ...options.headers,
            },
        });
    }

    return { GET };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter next-build-notifier test server`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/next-build-notifier/src/server.ts packages/next-build-notifier/src/server.test.ts
git commit -m "feat(next-build-notifier): add createVersionRoute handler factory."
```

---

# Phase 4 — `withBuildNotifier` (config wrapper, TDD)

### Task 4: next.config plugin that bakes the client build id

**Files:**
- Create: `packages/next-build-notifier/src/config.ts`
- Test: `packages/next-build-notifier/src/config.test.ts`

- [ ] **Step 1: Write the failing test**

`src/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { withBuildNotifier } from './config';

describe('withBuildNotifier', () => {
    it('bakes NEXT_PUBLIC_BUILD_ID and sets deploymentId from the resolved id', () => {
        const out = withBuildNotifier({ reactStrictMode: true }, { env: { GIT_COMMIT_SHA: 'sha9' } });

        expect(out.reactStrictMode).toBe(true);
        expect(out.env?.NEXT_PUBLIC_BUILD_ID).toBe('sha9');
        expect(out.deploymentId).toBe('sha9');
    });

    it('preserves an existing env and generateBuildId', async () => {
        const generateBuildId = async () => 'dev';
        const out = withBuildNotifier(
            { env: { ENVIRONMENT: 'production' }, generateBuildId },
            { env: { GIT_COMMIT_SHA: 'sha9' } },
        );

        expect(out.env).toMatchObject({ ENVIRONMENT: 'production', NEXT_PUBLIC_BUILD_ID: 'sha9' });
        expect(await out.generateBuildId?.()).toBe('dev');
    });

    it('respects an explicit buildId and can skip deploymentId', () => {
        const out = withBuildNotifier({}, { buildId: 'explicit', setDeploymentId: false });
        expect(out.env?.NEXT_PUBLIC_BUILD_ID).toBe('explicit');
        expect(out.deploymentId).toBeUndefined();
    });

    it('keeps a pre-existing deploymentId', () => {
        const out = withBuildNotifier({ deploymentId: 'mine' }, { env: { GIT_COMMIT_SHA: 'sha9' } });
        expect(out.deploymentId).toBe('mine');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter next-build-notifier test config`
Expected: FAIL — cannot resolve `./config`.

- [ ] **Step 3: Write the implementation**

`src/config.ts`:

```ts
import type { NextConfig } from 'next';

import { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

export { resolveBuildId, type BuildIdEnv } from './shared/resolve-build-id';

/**
 * Options for {@link withBuildNotifier}.
 */
export type WithBuildNotifierOptions = {
    /** Explicit build id. Defaults to `resolveBuildId(options.env)`. */
    buildId?: string;
    /** Environment bag used to resolve the build id. Defaults to `process.env`. */
    env?: BuildIdEnv;
    /**
     * Also set Next's native `deploymentId` (version-skew hard navigation) to the resolved id, unless
     * the config already has one. Defaults to `true`.
     */
    setDeploymentId?: boolean;
};

/**
 * Wraps a Next.js config so the running client knows its own build id: bakes `NEXT_PUBLIC_BUILD_ID`
 * (merged into `env`) and, by default, sets `deploymentId` to the same value so Next's native skew
 * handling and this notifier agree on one source of truth. Composes with an existing `env` and
 * `generateBuildId`.
 *
 * @param nextConfig - The Next.js config to wrap.
 * @param options - See {@link WithBuildNotifierOptions}.
 * @returns The wrapped Next.js config.
 * @example
 * ```js
 * import { withBuildNotifier } from 'next-build-notifier/config';
 * export default withBuildNotifier(config);
 * ```
 */
export function withBuildNotifier(nextConfig: NextConfig = {}, options: WithBuildNotifierOptions = {}): NextConfig {
    const env = options.env ?? (process.env as BuildIdEnv);
    const buildId = options.buildId ?? resolveBuildId(env);
    const setDeploymentId = options.setDeploymentId !== false;

    return {
        ...nextConfig,
        env: { ...nextConfig.env, NEXT_PUBLIC_BUILD_ID: buildId },
        ...(setDeploymentId && !nextConfig.deploymentId ? { deploymentId: buildId } : {}),
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter next-build-notifier test config`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/next-build-notifier/src/config.ts packages/next-build-notifier/src/config.test.ts
git commit -m "feat(next-build-notifier): add withBuildNotifier config wrapper."
```

---

# Phase 5 — Client engine (TDD)

### Task 5a: Types, reload, dismissal, default fetcher

**Files:**
- Create: `packages/next-build-notifier/src/shared/types.ts`
- Create: `packages/next-build-notifier/src/shared/reload.ts`
- Create: `packages/next-build-notifier/src/client/dismissal.ts`
- Create: `packages/next-build-notifier/src/client/default-fetcher.ts`
- Test: `packages/next-build-notifier/src/client/dismissal.test.ts`

- [ ] **Step 1: Write `src/shared/types.ts`**

```ts
/**
 * The shape returned by the version endpoint.
 */
export type VersionResponse = {
    /** The current deployment's build id. */
    id: string;
    /** Server timestamp (ms) the response was produced. */
    ts: number;
};

/**
 * Configuration for the build notifier engine, provider, and render-prop.
 */
export type BuildNotifierConfig = {
    /** The build id baked into the running client (e.g. `process.env.NEXT_PUBLIC_BUILD_ID`). */
    currentBuildId: string;
    /** Version endpoint path. Default `'/api/version'`. */
    endpoint?: string;
    /**
     * Periodic poll interval in ms. A falsy value (`0` or `undefined`) disables the timer; the
     * focus/visibility/online triggers still fire. Apps should pass an explicit value (e.g. `60_000`).
     */
    intervalMs?: number;
    /** Re-check on `window` focus. Default `true`. */
    refetchOnFocus?: boolean;
    /** Re-check when the tab becomes visible. Default `true`. */
    refetchOnVisible?: boolean;
    /** Re-check when the network reconnects (`online`). Default `true`. */
    refetchOnReconnect?: boolean;
    /** Skip the periodic tick while the tab is hidden. Default `true`. */
    pauseWhenHidden?: boolean;
    /** Hard-reload automatically the first time an update is detected. Default `false`. */
    autoReload?: boolean;
    /** `sessionStorage` key for per-build dismissal. Default `'next-build-notifier:dismissed'`. */
    storageKey?: string;
    /** Custom version fetcher. Defaults to a `no-store`, cache-busted fetch of `endpoint`. */
    fetcher?: (endpoint: string) => Promise<VersionResponse>;
    /** Called once per newly-detected build id. */
    onUpdateAvailable?: (latestBuildId: string) => void;
    /**
     * Master switch. Default `true`. The engine is also inert when `currentBuildId` is falsy or one
     * of `'development'` / `'dev'`, so it never polls in development.
     */
    enabled?: boolean;
};

/**
 * The reactive state + actions exposed by the engine, context hook, and render-prop.
 */
export type BuildNotificationState = {
    /** A newer build id was observed and not dismissed for that id. */
    updateAvailable: boolean;
    /** The current update was dismissed (still tracked so a *newer* build re-surfaces). */
    dismissed: boolean;
    /** The client's own baked build id. */
    currentBuildId: string;
    /** The latest build id observed from the endpoint, or `null` before the first check. */
    latestBuildId: string | null;
    /** Engine status. */
    status: 'idle' | 'checking' | 'error';
    /** Epoch ms of the last successful check, or `null`. */
    lastCheckedAt: number | null;
    /** Hard-reload the page (`window.location.reload()`). */
    reload: () => void;
    /** Dismiss the current update (persisted per build id). */
    dismiss: () => void;
    /** Trigger an immediate version check. */
    check: () => void;
};
```

- [ ] **Step 2: Write `src/shared/reload.ts`**

```ts
/**
 * Hard-reloads the document to fetch the new deployment's assets. SSR-safe no-op when `window` is
 * unavailable.
 */
export function reload(): void {
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
}
```

- [ ] **Step 3: Write `src/client/dismissal.ts`**

```ts
/**
 * Reads the dismissed build id from `sessionStorage`. Returns `null` on any access error
 * (private mode, disabled storage, SSR).
 *
 * @param storageKey - The storage key.
 * @returns The dismissed build id, or `null`.
 */
export function readDismissed(storageKey: string): string | null {
    try {
        return globalThis.sessionStorage?.getItem(storageKey) ?? null;
    } catch {
        return null;
    }
}

/**
 * Persists the dismissed build id to `sessionStorage`, swallowing access errors.
 *
 * @param storageKey - The storage key.
 * @param buildId - The build id being dismissed.
 */
export function writeDismissed(storageKey: string, buildId: string): void {
    try {
        globalThis.sessionStorage?.setItem(storageKey, buildId);
    } catch {
        /* storage unavailable — dismissal is best-effort */
    }
}
```

- [ ] **Step 4: Write `src/client/default-fetcher.ts`**

```ts
import type { VersionResponse } from '../shared/types';

/**
 * Default version fetcher: a cache-busted, `no-store` GET of the endpoint, coercing the payload into
 * a {@link VersionResponse}.
 *
 * @param endpoint - The version endpoint path.
 * @returns The parsed version response.
 * @throws {Error} When the response is not OK.
 */
export async function defaultFetcher(endpoint: string): Promise<VersionResponse> {
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
    });
    if (!res.ok) {
        throw new Error(`next-build-notifier: version endpoint responded ${res.status}`);
    }
    const data = (await res.json()) as Partial<VersionResponse>;
    return { id: String(data.id ?? ''), ts: typeof data.ts === 'number' ? data.ts : 0 };
}
```

- [ ] **Step 5: Write the dismissal test**

`src/client/dismissal.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { readDismissed, writeDismissed } from './dismissal';

describe('dismissal', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('round-trips a dismissed build id', () => {
        expect(readDismissed('k')).toBeNull();
        writeDismissed('k', 'build-1');
        expect(readDismissed('k')).toBe('build-1');
    });
});
```

- [ ] **Step 6: Run test**

Run: `pnpm --filter next-build-notifier test dismissal`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add packages/next-build-notifier/src/shared/types.ts packages/next-build-notifier/src/shared/reload.ts packages/next-build-notifier/src/client/dismissal.ts packages/next-build-notifier/src/client/default-fetcher.ts packages/next-build-notifier/src/client/dismissal.test.ts
git commit -m "feat(next-build-notifier): add client types, reload, dismissal, fetcher."
```

### Task 5b: The engine hook

**Files:**
- Create: `packages/next-build-notifier/src/client/use-build-notifier-engine.ts`
- Test: `packages/next-build-notifier/src/client/use-build-notifier-engine.test.ts`

- [ ] **Step 1: Write the failing test**

`src/client/use-build-notifier-engine.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBuildNotifierEngine } from './use-build-notifier-engine';

const flush = () => act(async () => { await Promise.resolve(); });

describe('useBuildNotifierEngine', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('flags an update when the endpoint id differs', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        const { result } = renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher }),
        );
        await waitFor(() => expect(result.current.updateAvailable).toBe(true));
        expect(result.current.latestBuildId).toBe('NEW');
    });

    it('does not flag when ids match', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'SAME', ts: 1 });
        const { result } = renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'SAME', fetcher }),
        );
        await flush();
        expect(result.current.updateAvailable).toBe(false);
    });

    it('is inert in development (no fetch)', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() => useBuildNotifierEngine({ currentBuildId: 'development', fetcher }));
        await flush();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('does not fetch when disabled', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() => useBuildNotifierEngine({ currentBuildId: 'OLD', enabled: false, fetcher }));
        await flush();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('dismiss hides the current build but a newer build re-surfaces', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'B1', ts: 1 });
        const { result, rerender } = renderHook(
            (props: { fetcher: () => Promise<{ id: string; ts: number }> }) =>
                useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher: props.fetcher }),
            { initialProps: { fetcher } },
        );
        await waitFor(() => expect(result.current.updateAvailable).toBe(true));

        act(() => result.current.dismiss());
        expect(result.current.dismissed).toBe(true);

        const fetcher2 = vi.fn().mockResolvedValue({ id: 'B2', ts: 2 });
        rerender({ fetcher: fetcher2 });
        act(() => result.current.check());
        await waitFor(() => expect(result.current.latestBuildId).toBe('B2'));
        expect(result.current.dismissed).toBe(false);
        expect(result.current.updateAvailable).toBe(true);
    });

    it('calls onUpdateAvailable once per new id and auto-reloads when enabled', async () => {
        const onUpdateAvailable = vi.fn();
        const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher, autoReload: true, onUpdateAvailable }),
        );
        await waitFor(() => expect(onUpdateAvailable).toHaveBeenCalledWith('NEW'));
        expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
        expect(reloadSpy).toHaveBeenCalled();
    });

    it('sets status=error when the fetcher throws', async () => {
        const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() =>
            useBuildNotifierEngine({ currentBuildId: 'OLD', fetcher }),
        );
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.updateAvailable).toBe(false);
    });
});
```

> `window.location.reload` is read-only in some DOM envs. happy-dom allows `vi.spyOn(window.location, 'reload')`; if it errors, replace with mocking the module: `vi.mock('../shared/reload', () => ({ reload: vi.fn() }))` and assert that mock instead.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter next-build-notifier test use-build-notifier-engine`
Expected: FAIL — cannot resolve the engine module.

- [ ] **Step 3: Write the engine**

`src/client/use-build-notifier-engine.ts`:

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { reload } from '../shared/reload';
import type { BuildNotificationState, BuildNotifierConfig } from '../shared/types';
import { defaultFetcher } from './default-fetcher';
import { readDismissed, writeDismissed } from './dismissal';

const DEV_IDS = new Set(['', 'development', 'dev']);

/**
 * The polling/compare/dismiss engine behind {@link BuildNotifierProvider}. Most consumers use the
 * provider + {@link useBuildNotification} instead of calling this directly.
 *
 * Behavior: derives `active` from `enabled` and a non-dev `currentBuildId`; on mount (and on the
 * configured triggers/interval) fetches the endpoint and compares the returned id to
 * `currentBuildId`. A mismatch sets `updateAvailable`; `onUpdateAvailable` fires once per new id and
 * `autoReload` (if set) hard-reloads. Dismissal is keyed by the latest id in `sessionStorage`.
 *
 * @param config - See {@link BuildNotifierConfig}.
 * @returns The reactive {@link BuildNotificationState}.
 */
export function useBuildNotifierEngine(config: BuildNotifierConfig): BuildNotificationState {
    const {
        currentBuildId,
        endpoint = '/api/version',
        intervalMs,
        refetchOnFocus = true,
        refetchOnVisible = true,
        refetchOnReconnect = true,
        pauseWhenHidden = true,
        autoReload = false,
        storageKey = 'next-build-notifier:dismissed',
        fetcher = defaultFetcher,
        onUpdateAvailable,
        enabled = true,
    } = config;

    const active = enabled && !DEV_IDS.has(currentBuildId);

    const [latestBuildId, setLatestBuildId] = useState<string | null>(null);
    const [status, setStatus] = useState<BuildNotificationState['status']>('idle');
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
    const [dismissedId, setDismissedId] = useState<string | null>(() => readDismissed(storageKey));

    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const onUpdateRef = useRef(onUpdateAvailable);
    onUpdateRef.current = onUpdateAvailable;
    const notifiedRef = useRef<string | null>(null);

    const updateAvailable = active && latestBuildId !== null && latestBuildId !== currentBuildId;
    const dismissed = updateAvailable && dismissedId === latestBuildId;

    const check = useCallback(async () => {
        if (!active) return;
        setStatus('checking');
        try {
            const res = await fetcherRef.current(endpoint);
            setLatestBuildId(res.id);
            setLastCheckedAt(Date.now());
            setStatus('idle');
        } catch {
            setStatus('error');
        }
    }, [active, endpoint]);

    // Fire side-effects once per newly-detected build id.
    useEffect(() => {
        if (!updateAvailable || latestBuildId === null) return;
        if (notifiedRef.current === latestBuildId) return;
        notifiedRef.current = latestBuildId;
        onUpdateRef.current?.(latestBuildId);
        if (autoReload) reload();
    }, [updateAvailable, latestBuildId, autoReload]);

    // Initial check + event-driven re-checks.
    useEffect(() => {
        if (!active) return;
        void check();

        const onFocus = () => {
            if (refetchOnFocus) void check();
        };
        const onVisible = () => {
            if (refetchOnVisible && document.visibilityState === 'visible') void check();
        };
        const onOnline = () => {
            if (refetchOnReconnect) void check();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [active, refetchOnFocus, refetchOnVisible, refetchOnReconnect, check]);

    // Periodic poll — disabled when intervalMs is falsy.
    useEffect(() => {
        if (!active || !intervalMs) return;
        const timer = setInterval(() => {
            if (pauseWhenHidden && document.visibilityState === 'hidden') return;
            void check();
        }, intervalMs);
        return () => clearInterval(timer);
    }, [active, intervalMs, pauseWhenHidden, check]);

    const dismiss = useCallback(() => {
        setLatestBuildId((current) => {
            if (current) {
                writeDismissed(storageKey, current);
                setDismissedId(current);
            }
            return current;
        });
    }, [storageKey]);

    return {
        updateAvailable,
        dismissed,
        currentBuildId,
        latestBuildId,
        status,
        lastCheckedAt,
        reload,
        dismiss,
        check: () => void check(),
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter next-build-notifier test use-build-notifier-engine`
Expected: PASS (7 tests). If the `reload` spy errors, apply the module-mock fallback noted in Step 1.

- [ ] **Step 5: Commit**

```bash
git add packages/next-build-notifier/src/client/use-build-notifier-engine.ts packages/next-build-notifier/src/client/use-build-notifier-engine.test.ts
git commit -m "feat(next-build-notifier): add build notifier engine hook."
```

---

# Phase 6 — Provider, context hook, render-prop (TDD)

### Task 6: Public client API

**Files:**
- Create: `packages/next-build-notifier/src/client/context.ts`
- Create: `packages/next-build-notifier/src/client/provider.tsx`
- Create: `packages/next-build-notifier/src/client/build-notifier.tsx`
- Test: `packages/next-build-notifier/src/client/build-notifier.test.tsx`

- [ ] **Step 1: Write `src/client/context.ts`**

```ts
'use client';

import { createContext, useContext } from 'react';

import type { BuildNotificationState } from '../shared/types';

/**
 * Context carrying the live {@link BuildNotificationState}. `null` outside a provider.
 */
export const BuildNotifierContext = createContext<BuildNotificationState | null>(null);

/**
 * Reads the live build-notification state from the nearest {@link BuildNotifierProvider}.
 *
 * @returns The current {@link BuildNotificationState}.
 * @throws {Error} When used outside a `BuildNotifierProvider`.
 */
export function useBuildNotification(): BuildNotificationState {
    const value = useContext(BuildNotifierContext);
    if (value === null) {
        throw new Error('useBuildNotification must be used within a <BuildNotifierProvider>.');
    }
    return value;
}
```

- [ ] **Step 2: Write `src/client/provider.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

import type { BuildNotifierConfig } from '../shared/types';
import { BuildNotifierContext } from './context';
import { useBuildNotifierEngine } from './use-build-notifier-engine';

/**
 * Props for {@link BuildNotifierProvider}: every {@link BuildNotifierConfig} field plus `children`.
 */
export type BuildNotifierProviderProps = BuildNotifierConfig & {
    children: ReactNode;
};

/**
 * Runs the build-notifier engine and publishes its state via context. Place high in the tree; render
 * UI with {@link useBuildNotification} or {@link BuildNotifier}.
 *
 * @param props - See {@link BuildNotifierProviderProps}.
 * @returns The provider element.
 */
export function BuildNotifierProvider({ children, ...config }: BuildNotifierProviderProps): ReactNode {
    const state = useBuildNotifierEngine(config);
    return <BuildNotifierContext.Provider value={state}>{children}</BuildNotifierContext.Provider>;
}
```

- [ ] **Step 3: Write `src/client/build-notifier.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

import type { BuildNotificationState } from '../shared/types';
import { useBuildNotification } from './context';

/**
 * Props for {@link BuildNotifier}: a render function receiving the live state.
 */
export type BuildNotifierProps = {
    children: (state: BuildNotificationState) => ReactNode;
};

/**
 * Headless render-prop over the build-notification state from the nearest provider. Renders exactly
 * what the function returns — no markup or styles of its own.
 *
 * @param props - See {@link BuildNotifierProps}.
 * @returns The render function's output.
 */
export function BuildNotifier({ children }: BuildNotifierProps): ReactNode {
    return children(useBuildNotification());
}
```

- [ ] **Step 4: Write the integration test**

`src/client/build-notifier.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BuildNotifier } from './build-notifier';
import { useBuildNotification } from './context';
import { BuildNotifierProvider } from './provider';

describe('BuildNotifierProvider + BuildNotifier', () => {
    it('exposes updateAvailable through the render-prop', async () => {
        const fetcher = vi.fn().mockResolvedValue({ id: 'NEW', ts: 1 });
        render(
            <BuildNotifierProvider currentBuildId="OLD" fetcher={fetcher}>
                <BuildNotifier>
                    {(s) => <div>{s.updateAvailable ? 'update' : 'current'}</div>}
                </BuildNotifier>
            </BuildNotifierProvider>,
        );
        await waitFor(() => expect(screen.getByText('update')).toBeTruthy());
    });

    it('useBuildNotification throws outside a provider', () => {
        const Bad = () => {
            useBuildNotification();
            return null;
        };
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Bad />)).toThrow(/within a <BuildNotifierProvider>/);
        spy.mockRestore();
    });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter next-build-notifier test build-notifier`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/next-build-notifier/src/client/context.ts packages/next-build-notifier/src/client/provider.tsx packages/next-build-notifier/src/client/build-notifier.tsx packages/next-build-notifier/src/client/build-notifier.test.tsx
git commit -m "feat(next-build-notifier): add provider, context hook, render-prop."
```

---

# Phase 7 — Client entry, build verification, README, changeset

### Task 7: Wire the public entry and verify the published artifact

**Files:**
- Modify: `packages/next-build-notifier/src/index.ts`
- Create: `packages/next-build-notifier/README.md`
- Create: `.changeset/<random-name>.md`

- [ ] **Step 1: Replace `src/index.ts` with the real client entry**

```ts
'use client';

export { BuildNotifier, type BuildNotifierProps } from './client/build-notifier';
export { useBuildNotification } from './client/context';
export { BuildNotifierProvider, type BuildNotifierProviderProps } from './client/provider';
export { useBuildNotifierEngine } from './client/use-build-notifier-engine';
export { reload } from './shared/reload';
export type { BuildNotificationState, BuildNotifierConfig, VersionResponse } from './shared/types';
```

- [ ] **Step 2: Run the full package test + typecheck + build**

```bash
pnpm --filter next-build-notifier test
pnpm --filter next-build-notifier typecheck
pnpm --filter next-build-notifier build
```

Expected: all tests pass, no type errors, `dist/{index,server,config}.js` + `.d.ts` emitted.

- [ ] **Step 3: Verify the `'use client'` directive survives the build (HARD GATE)**

```bash
head -n 1 packages/next-build-notifier/dist/index.js
```

Expected: the first line is exactly `"use client";` (or `'use client';`). The client entry is consumed by Next apps from `dist/` — if the directive is missing, the provider/hook will be treated as Server Components and break.

If it is **missing**, fix the build before continuing:
1. Confirm rolldown directive preservation is on for the lib build, or
2. Add a directive-preserving step to `vite.config.ts` `rolldownOptions.output`:
   ```ts
   banner: (chunk) => (chunk.name === 'index' ? `'use client';` : ''),
   ```
   (Adjust to the rolldown `banner` signature in this Vite version; the goal is `dist/index.js` starting with the directive and `dist/server.js` / `dist/config.js` NOT having it.)
3. Rebuild and re-run this check until it passes. Verify `dist/server.js` and `dist/config.js` do **not** start with `'use client'`.

- [ ] **Step 4: Verify server/config entries are server-safe**

```bash
grep -l "use client" packages/next-build-notifier/dist/server.js packages/next-build-notifier/dist/config.js || echo "OK: no 'use client' in server/config"
```

Expected: `OK: no 'use client' in server/config`.

- [ ] **Step 5: Write `README.md`**

Author a public-facing README with: one-paragraph intro; install (`pnpm add next-build-notifier`); the three usage blocks (`/config` wrap, `/server` route, client provider + render-prop); the detection model; the Vercel note (Skew Protection + plain `fetch` not pinned + `no-store`); the `intervalMs` falsy-disables semantics; a note that the package is intentionally dependency-free (plain `Error`, not `@nordcom/commerce-errors`). Keep copy tight and active-voice. Example skeleton:

````markdown
# next-build-notifier

Headless "a new version is available" notifier for Next.js. Generic build detection (any host) with first-class Vercel support.

## Install

```bash
pnpm add next-build-notifier
```

## 1. Bake the build id (`next.config`)

```js
import { withBuildNotifier } from 'next-build-notifier/config';
export default withBuildNotifier(nextConfig);
```

## 2. Serve the version endpoint (route handler)

```ts
// app/api/version/route.ts
import { createVersionRoute } from 'next-build-notifier/server';
export const dynamic = 'force-dynamic';
export const { GET } = createVersionRoute();
```

## 3. Render your own UI (headless)

```tsx
'use client';
import { BuildNotifierProvider, BuildNotifier } from 'next-build-notifier';

export function Providers({ children }) {
  return (
    <BuildNotifierProvider currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID!} intervalMs={60_000}>
      {children}
      <BuildNotifier>
        {(s) => s.updateAvailable && !s.dismissed
          ? <button onClick={s.reload}>Reload — new version</button>
          : null}
      </BuildNotifier>
    </BuildNotifierProvider>
  );
}
```

## How detection works

…(build-id source, polling, Vercel skew note, no-store)…
````

- [ ] **Step 6: Create a changeset**

```bash
pnpm changeset
```

Select `next-build-notifier`, level **minor** (additive new package). Summary (WHY-only): `Add next-build-notifier: headless new-build indicator for Next.js with generic detection + Vercel support.` Verify the file written under `.changeset/`.

- [ ] **Step 7: Lint + commit**

```bash
pnpm biome check --write packages/next-build-notifier
git add packages/next-build-notifier .changeset
git commit -m "feat(next-build-notifier): wire public entry, README, changeset."
```

---

# Phase 8 — Public docs

### Task 8: Add docs pages and register the package

**Files:**
- Create: `apps/docs/content/packages/next/next-build-notifier/overview.mdx`
- Create: `apps/docs/content/packages/next/next-build-notifier/changelog.mdx`
- Modify: `apps/docs/content/packages/_categories.json`
- Modify: `apps/docs/content/packages/meta.json`

- [ ] **Step 1: Add a "Next.js" category** (or reuse `ui`) in `_categories.json`

Append a new category after `ui`:

```jsonc
    "next": {
        "title": "Next.js",
        "order": 5,
        "packages": ["next-build-notifier"]
    }
```

- [ ] **Step 2: Register the category page in `meta.json`**

Add `"next"` to the `pages` array:

```jsonc
    "pages": ["index", "applications", "cart", "core", "next", "shopify", "tagtree", "ui"]
```

- [ ] **Step 3: Write `overview.mdx`** (mirror `utils/overview.mdx` frontmatter)

```mdx
---
title: Overview
sidebar_position: 1
---

`next-build-notifier` is a standalone, headless package that tells users when a newer build of a
Next.js app is live so they can reload. Generic build detection works on any host; Vercel is a
first-class configuration of the same path.

## Architecture

- **`withBuildNotifier()`** (`next-build-notifier/config`) — bakes `NEXT_PUBLIC_BUILD_ID` into the
  client and sets Next's native `deploymentId`, both from one `resolveBuildId()` source.
- **`createVersionRoute()`** (`next-build-notifier/server`) — a `no-store` route handler that serves
  the running deployment's id.
- **Client API** (`next-build-notifier`) — `BuildNotifierProvider` polls + compares; render with the
  `useBuildNotification()` hook or the `<BuildNotifier>` render-prop. Zero styles shipped.

## Detection

The client's baked id is frozen at build time; the endpoint returns the live id at runtime. A
mismatch means a new build is available. On Vercel, a plain client `fetch()` is not pinned by Skew
Protection, so the version request observes the current deployment.

…(usage blocks mirroring the README)…
```

- [ ] **Step 4: Write `changelog.mdx`** (mirror `test-viewport/changelog.mdx`)

Match the exact frontmatter/shape of `apps/docs/content/packages/test-viewport/changelog.mdx` (open it first), pointing at the `next-build-notifier` package changelog.

- [ ] **Step 5: Generate + gate docs**

```bash
pnpm --filter @nordcom/commerce-docs gen
pnpm --filter @nordcom/commerce-docs docs:gen:check
```

Expected: gen succeeds and produces `apps/docs/content/reference/next-build-notifier/` (auto typedoc). If the package is not picked up, inspect `apps/docs/scripts/emit-typedoc-json.ts` / `mirror-workspace-docs.ts` for an explicit package allowlist and add `next-build-notifier`. `docs:gen:check` must exit 0.

- [ ] **Step 6: Commit**

```bash
pnpm biome check --write apps/docs/content/packages
git add apps/docs/content/packages
git commit -m "docs(next-build-notifier): add package overview, changelog, nav."
```

---

# Phase 9 — Storefront integration (per-shop CMS field)

### Task 9a: Add `buildNotifier` to the extensions manifest + resolver + validator

**Files:**
- Modify: `packages/db/src/lib/extensions.ts`
- Modify: `packages/cms/src/extensions/resolve.ts`
- Modify: `packages/convex/convex/lib/validators.ts`
- Test: `packages/cms/src/extensions/resolve.test.ts` (extend existing or create)

- [ ] **Step 1: Add the manifest type** in `packages/db/src/lib/extensions.ts`

Add to the `ShopExtensionManifest` interface:

```ts
    /** Per-shop "new build available" notifier config. */
    buildNotifier?: {
        enabled?: boolean;
        position?: 'top' | 'bottom';
        copy?: string;
        autoReload?: boolean;
        dismissable?: boolean;
    };
```

- [ ] **Step 2: Write the failing resolver test**

In `packages/cms/src/extensions/resolve.test.ts` (create if absent; mirror existing tests in the file/dir):

```ts
import { describe, expect, it } from 'vitest';

import { resolveExtensions } from './resolve';

// Reuse the test shop factory used by sibling tests in this package; if none exists,
// build a minimal OnlineShop stub the way the existing resolve tests do.
const shop = /* existing canonical test shop */ ({} as never);

describe('resolveExtensions buildNotifier', () => {
    it('defaults to enabled + bottom + dismissable when unset', () => {
        const r = resolveExtensions({ shop, manifest: null });
        expect(r.buildNotifier).toMatchObject({ enabled: true, position: 'bottom', dismissable: true, autoReload: false });
    });

    it('applies manifest overrides', () => {
        const r = resolveExtensions({
            shop,
            manifest: { buildNotifier: { enabled: false, position: 'top', copy: 'Update!', autoReload: true } },
        });
        expect(r.buildNotifier).toMatchObject({ enabled: false, position: 'top', copy: 'Update!', autoReload: true });
    });
});
```

> Inspect the existing tests next to `resolve.ts` for the real shop factory/import and use it instead of the stub.

- [ ] **Step 3: Run it (fails)**

Run: `pnpm --filter @nordcom/commerce-cms test resolve`
Expected: FAIL — `buildNotifier` is `undefined`.

- [ ] **Step 4: Extend `ResolvedExtensions` + composition** in `packages/cms/src/extensions/resolve.ts`

Add to the `ResolvedExtensions` type:

```ts
    /** Resolved per-shop build-notifier config (store override over platform defaults). */
    buildNotifier: {
        enabled: boolean;
        position: 'top' | 'bottom';
        copy?: string;
        autoReload: boolean;
        dismissable: boolean;
    };
```

Add composition (mirror the `productCard`/`blockDefaults` blocks), before the `return`:

```ts
    const bn = manifest?.buildNotifier;
    const buildNotifier = {
        enabled: bn?.enabled ?? true,
        position: bn?.position ?? 'bottom',
        copy: bn?.copy,
        autoReload: bn?.autoReload ?? false,
        dismissable: bn?.dismissable ?? true,
    } satisfies ResolvedExtensions['buildNotifier'];
```

Add `buildNotifier` to the returned object.

- [ ] **Step 5: Add the Convex validator** in `packages/convex/convex/lib/validators.ts`

Add to `shopExtensionManifestValidator`:

```ts
    buildNotifier: v.optional(
        v.object({
            enabled: v.optional(v.boolean()),
            position: v.optional(v.union(v.literal('top'), v.literal('bottom'))),
            copy: v.optional(v.string()),
            autoReload: v.optional(v.boolean()),
            dismissable: v.optional(v.boolean()),
        }),
    ),
```

- [ ] **Step 6: Build packages, run tests + limit-boundary gate**

```bash
pnpm build:packages
pnpm --filter @nordcom/commerce-cms test resolve
pnpm --filter @nordcom/commerce-test-convex run test src/limits
```

Expected: resolve tests PASS; the Convex limit-boundary gate (triggered by touching `packages/convex/**`) PASS.

- [ ] **Step 7: Run cms:gen check**

```bash
pnpm cms:gen
pnpm cms:gen:check
```

Expected: exit 0 (no descriptor drift). Commit any regenerated files.

- [ ] **Step 8: Commit**

```bash
pnpm biome check --write packages/db packages/cms packages/convex
git add packages/db packages/cms packages/convex
git commit -m "feat(cms): add per-shop buildNotifier to the extensions manifest."
```

### Task 9b: Register the admin editor descriptor

**Files:**
- Modify: `packages/cms/src/extensions/component-settings.ts`

- [ ] **Step 1: Add the `buildNotifier` settings + registry entry**

In `component-settings.ts`, mirror `productCardSettings` but with no `surfaces`:

```ts
const buildNotifierSettings: OverridableFieldDescriptor[] = [
    overridable(checkboxField({ name: 'enabled', label: 'Enabled' }), { inheritedSourceLabel: 'Platform default' }),
    overridable(
        selectField({
            name: 'position',
            label: 'Position',
            options: [
                { label: 'Bottom', value: 'bottom' },
                { label: 'Top', value: 'top' },
            ],
        }),
        { inheritedSourceLabel: 'Platform default' },
    ),
    overridable(textField({ name: 'copy', label: 'Banner text' }), { inheritedSourceLabel: 'Localized default' }),
    overridable(checkboxField({ name: 'autoReload', label: 'Auto-reload on new build' }), {
        inheritedSourceLabel: 'Platform default',
    }),
    overridable(checkboxField({ name: 'dismissable', label: 'Allow dismissal' }), {
        inheritedSourceLabel: 'Platform default',
    }),
];
```

Add to `COMPONENT_SETTINGS` (no `surfaces` ⇒ paths become `extensions.buildNotifier.<name>`):

```ts
    {
        id: 'buildNotifier',
        label: 'Build notifier',
        settings: buildNotifierSettings,
    },
```

Ensure `checkboxField`, `selectField`, `textField`, `overridable` are imported (match existing imports in the file).

- [ ] **Step 2: Build + typecheck + cms:gen check**

```bash
pnpm build:packages
pnpm --filter @nordcom/commerce-cms typecheck
pnpm cms:gen && pnpm cms:gen:check
```

Expected: clean. The admin **Customization → Components** tab now auto-renders a "Build notifier" section (no admin code change), with field testids `field-extensions.buildNotifier.{enabled,position,copy,autoReload,dismissable}`.

- [ ] **Step 3: Commit**

```bash
pnpm biome check --write packages/cms
git add packages/cms
git commit -m "feat(cms): expose buildNotifier in the customization components editor."
```

### Task 9c: Storefront copy (i18n)

**Files:**
- Modify: `apps/storefront/src/locales/en.json`, `de.json`, `fr.json`, `no.json`, `es.json`, `sv.json`

- [ ] **Step 1: Add a `build-notifier` scope to each locale**

Add to `en.json`:

```json
    "build-notifier": {
        "title": "A new version is available",
        "reload": "Reload",
        "dismiss": "Dismiss"
    }
```

Translate per locale (de: "Eine neue Version ist verfügbar" / "Neu laden" / "Schließen"; fr: "Une nouvelle version est disponible" / "Recharger" / "Ignorer"; no: "En ny versjon er tilgjengelig" / "Last inn på nytt" / "Lukk"; es: "Hay una nueva versión disponible" / "Recargar" / "Descartar"; sv: "En ny version är tillgänglig" / "Ladda om" / "Stäng"). Keep the same three keys.

- [ ] **Step 2: Lint + commit**

```bash
pnpm biome check --write apps/storefront/src/locales
git add apps/storefront/src/locales
git commit -m "feat(storefront): add build-notifier copy to locale dictionaries."
```

### Task 9d: Storefront version route + config wrap

**Files:**
- Create: `apps/storefront/src/app/[domain]/api/version/route.ts`
- Modify: `apps/storefront/next.config.js`

- [ ] **Step 1: Add the version route**

`apps/storefront/src/app/[domain]/api/version/route.ts`:

```ts
import { createVersionRoute } from 'next-build-notifier/server';

/**
 * Tenant-scoped version endpoint. The build id is global across tenants; tenant-scoping only keeps it
 * under the hostname rewrite so a relative client `fetch('/api/version')` resolves.
 */
export const dynamic = 'force-dynamic';

export const { GET } = createVersionRoute();
```

- [ ] **Step 2: Wrap `next.config.js`**

At the top imports add:

```js
import { withBuildNotifier } from 'next-build-notifier/config';
```

Add `next-build-notifier` to `transpilePackages`:

```js
    transpilePackages: ['@shopify/hydrogen-react', 'next-build-notifier'],
```

Change the final export from `export default wrapConfig(config);` to:

```js
export default wrapConfig(withBuildNotifier(config));
```

- [ ] **Step 3: Build + verify env baked**

```bash
pnpm --filter @nordcom/commerce-storefront build
```

Expected: build succeeds; `NEXT_PUBLIC_BUILD_ID` is defined. (The existing `generateBuildId` and `env.GIT_COMMIT_SHA` are preserved by the wrapper.)

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/next.config.js apps/storefront/src/app/[domain]/api/version/route.ts
git commit -m "feat(storefront): mount version endpoint and bake build id."
```

### Task 9e: Storefront themed banner + provider mount

**Files:**
- Create: `apps/storefront/src/components/build-notifier/build-notifier-banner.tsx`
- Create: `apps/storefront/src/components/build-notifier/build-notifier-provider.tsx`
- Modify: `apps/storefront/src/app/[domain]/[locale]/layout.tsx`

- [ ] **Step 1: Write the client provider wrapper** (`'use client'`)

`build-notifier-provider.tsx` — wraps the package provider, feeding the resolved per-shop config + localized copy + `currentBuildId`. It renders the banner via the render-prop.

```tsx
'use client';

import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { ReactNode } from 'react';

import { BuildNotifierBanner } from './build-notifier-banner';

/**
 * Props for {@link StorefrontBuildNotifier}.
 */
export type StorefrontBuildNotifierProps = {
    /** Whether the shop enabled the notifier (resolved server-side). */
    enabled: boolean;
    /** Banner anchor edge. */
    position: 'top' | 'bottom';
    /** Hard-reload automatically on a new build. */
    autoReload: boolean;
    /** Whether the banner is dismissable. */
    dismissable: boolean;
    /** Localized strings (title/reload/dismiss). */
    labels: { title: string; reload: string; dismiss: string };
};

/**
 * Storefront-side build notifier: drives the headless package with the resolved per-shop config and
 * renders the themed banner. Inert when disabled or in development (no `NEXT_PUBLIC_BUILD_ID`).
 *
 * @param props - See {@link StorefrontBuildNotifierProps}.
 * @returns The provider subtree, or just `children` passthrough is not needed here (sibling mount).
 */
export function StorefrontBuildNotifier({
    enabled,
    position,
    autoReload,
    dismissable,
    labels,
}: StorefrontBuildNotifierProps): ReactNode {
    return (
        <BuildNotifierProvider
            currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'}
            intervalMs={60_000}
            autoReload={autoReload}
            enabled={enabled}
        >
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !(dismissable && state.dismissed) ? (
                        <BuildNotifierBanner
                            position={position}
                            labels={labels}
                            dismissable={dismissable}
                            onReload={state.reload}
                            onDismiss={state.dismiss}
                        />
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}
```

- [ ] **Step 2: Write the themed banner** (`'use client'`) — frontend-design direction

`build-notifier-banner.tsx`. Themed from shop CSS vars (`--accent`, `--text-muted`, `--border-default`, `--surface-1`); one-shot motion; reduced-motion respected; `role="status"`; safe-area aware; bottom default / top via `position`.

```tsx
'use client';

import type { ReactNode } from 'react';

/**
 * Props for {@link BuildNotifierBanner}.
 */
export type BuildNotifierBannerProps = {
    position: 'top' | 'bottom';
    labels: { title: string; reload: string; dismiss: string };
    dismissable: boolean;
    onReload: () => void;
    onDismiss: () => void;
};

/**
 * The storefront's themed "new version available" banner. Headless package supplies state; this owns
 * presentation only. Colors come from the shop theme CSS variables for per-shop cohesion.
 *
 * @param props - See {@link BuildNotifierBannerProps}.
 * @returns The banner element.
 */
export function BuildNotifierBanner({
    position,
    labels,
    dismissable,
    onReload,
    onDismiss,
}: BuildNotifierBannerProps): ReactNode {
    const anchor =
        position === 'top'
            ? 'top-[calc(env(safe-area-inset-top)+0.75rem)] motion-safe:animate-[nbn-in-top_240ms_ease-out]'
            : 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] motion-safe:animate-[nbn-in-bottom_240ms_ease-out]';

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed inset-x-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-(--border-default) bg-(--surface-1) px-4 py-3 shadow-lg md:inset-x-auto md:right-4 ${anchor}`}
        >
            <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-(--accent) motion-safe:animate-[nbn-ring_600ms_ease-out]"
            />
            <p className="min-w-0 flex-1 truncate font-medium text-sm">{labels.title}</p>
            <button
                type="button"
                onClick={onReload}
                className="shrink-0 rounded-lg bg-(--accent) px-3 py-1.5 font-semibold text-(--accent-foreground,white) text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                {labels.reload}
            </button>
            {dismissable ? (
                <button
                    type="button"
                    aria-label={labels.dismiss}
                    onClick={onDismiss}
                    className="shrink-0 rounded-md p-1 text-(--text-muted) hover:text-current focus-visible:outline focus-visible:outline-2"
                >
                    <span aria-hidden>✕</span>
                </button>
            ) : null}
        </div>
    );
}
```

Add the keyframes once to the storefront global stylesheet (find it via `apps/storefront/src/app/**/globals.*` or the existing global CSS import):

```css
@keyframes nbn-in-bottom { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes nbn-in-top { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes nbn-ring { from { box-shadow: 0 0 0 0 var(--accent); } to { box-shadow: 0 0 0 6px transparent; } }
```

- [ ] **Step 3: Mount in the tenant layout**

In `apps/storefront/src/app/[domain]/[locale]/layout.tsx`, where the shop + dictionary are already loaded, resolve the extensions config and mount the notifier inside `ProvidersRegistry` (sibling to the chrome). Add near the other resolutions:

```tsx
import { ResolvedExtensionsApi } from '@/api/extensions';
import { StorefrontBuildNotifier } from '@/components/build-notifier/build-notifier-provider';
```

```tsx
const extensions = ResolvedExtensionsApi({ shop });
const { t: tNotifier } = getTranslations('build-notifier', i18n);
const notifier = extensions.buildNotifier;
```

Render inside `ProvidersRegistry` (e.g. just after `<CssVariablesProvider …/>`):

```tsx
<StorefrontBuildNotifier
    enabled={notifier.enabled}
    position={notifier.position}
    autoReload={notifier.autoReload}
    dismissable={notifier.dismissable}
    labels={{
        title: notifier.copy || tNotifier('title'),
        reload: tNotifier('reload'),
        dismiss: tNotifier('dismiss'),
    }}
/>
```

> Confirm `getTranslations` import is already present (it is used elsewhere in the layout / components); if the layout doesn't already import it, import from `@/utils/locale/locale`.

- [ ] **Step 4: Typecheck + LSP diagnostics + build**

```bash
pnpm --filter @nordcom/commerce-storefront typecheck
pnpm --filter @nordcom/commerce-storefront build
```

Expected: no type errors; build OK. Fix any LSP diagnostics on the edited files.

- [ ] **Step 5: Commit**

```bash
pnpm biome check --write apps/storefront/src
git add apps/storefront/src
git commit -m "feat(storefront): render per-shop themed build-notifier banner."
```

### Task 9f: Storefront e2e

**Files:**
- Create: `apps/storefront/e2e/build-notifier.spec.ts`

- [ ] **Step 1: Write the spec**

Drives the real app; the only stub is the **version endpoint response** (we cannot redeploy mid-test, so the deploy signal is simulated; the provider, banner, dismissal, and reload are all real).

```ts
import { expect, test } from '@playwright/test';

const SHOP = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/** Make the version endpoint report a different build id than the baked client id. */
async function serveBuild(page: import('@playwright/test').Page, id: string) {
    await page.route('**/api/version**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'cache-control': 'no-store' },
            body: JSON.stringify({ id, ts: Date.now() }),
        }),
    );
}

test.describe('storefront build notifier', () => {
    test('shows banner on new build, dismiss hides it, newer build re-surfaces', async ({ page }) => {
        await serveBuild(page, 'e2e-build-1');
        await page.goto('/');

        const banner = page.getByRole('status').filter({ hasText: /new version|version available/i });
        await expect(banner).toBeVisible();

        await banner.getByRole('button', { name: /dismiss/i }).click();
        await expect(banner).toBeHidden();

        // Same build id stays dismissed across a re-check (focus trigger).
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(banner).toBeHidden();

        // A newer build re-surfaces the banner.
        await serveBuild(page, 'e2e-build-2');
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        await expect(banner).toBeVisible();
    });

    test('reload button triggers a navigation', async ({ page }) => {
        await serveBuild(page, 'e2e-build-1');
        await page.goto('/');
        const banner = page.getByRole('status').filter({ hasText: /version/i });
        await expect(banner).toBeVisible();

        const reloaded = page.waitForLoadState('load');
        await banner.getByRole('button', { name: /reload/i }).click();
        await reloaded;
    });
});
```

> Adjust the `getByRole('status')` filter to the actual rendered title text. The storefront banner defaults to `enabled` (platform default true), so no admin setup is needed for these specs.

- [ ] **Step 2: Run the storefront e2e**

```bash
pnpm test:e2e --filter @nordcom/commerce-storefront -- build-notifier
```

Expected: both tests pass (boots its own server on port 1337 into `.next-e2e`).

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/e2e/build-notifier.spec.ts
git commit -m "test(storefront): cover build-notifier banner flow."
```

---

# Phase 10 — Admin integration

### Task 10a: Admin version route + config wrap

**Files:**
- Create: `apps/admin/src/app/api/version/route.ts`
- Modify: `apps/admin/next.config.js`

- [ ] **Step 1: Add the version route**

`apps/admin/src/app/api/version/route.ts`:

```ts
import { createVersionRoute } from 'next-build-notifier/server';

export const dynamic = 'force-dynamic';

export const { GET } = createVersionRoute();
```

- [ ] **Step 2: Wrap `next.config.js`**

Add import `import { withBuildNotifier } from 'next-build-notifier/config';`; add `next-build-notifier` to `transpilePackages` (create the array if absent: `transpilePackages: ['next-build-notifier'],`); change `export default wrapConfig(config);` to `export default wrapConfig(withBuildNotifier(config));`.

- [ ] **Step 3: Build + commit**

```bash
pnpm --filter @nordcom/commerce-admin build
git add apps/admin/next.config.js apps/admin/src/app/api/version/route.ts
git commit -m "feat(admin): mount version endpoint and bake build id."
```

### Task 10b: Admin nordstar banner + mount

**Files:**
- Create: `apps/admin/src/components/build-notifier/build-notifier.tsx`
- Modify: `apps/admin/src/app/(app)/layout.tsx`

- [ ] **Step 1: Write the admin banner + provider** (`'use client'`)

Nordstar `Card`/`Button`/`View`; bottom-right toast; the signature is the SHA delta (`a1b2c3d → ef45678`); reduced-motion respected.

```tsx
'use client';

import { Button, Card, View } from '@nordcom/nordstar';
import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { ReactNode } from 'react';

/**
 * Shortens a build id to a 7-char display token (full sha → short sha), passing through short ids.
 *
 * @param id - The build id.
 * @returns A display token.
 */
function shortId(id: string | null): string {
    if (!id) return '';
    return id.length > 10 ? id.slice(0, 7) : id;
}

/**
 * Admin "new build deployed" banner. Mounted app-wide; styled with nordstar to match the dashboard.
 * Operators see the short SHA delta so the indicator carries information, not just a prompt.
 *
 * @returns The provider subtree rendering the banner when an update is available.
 */
export function AdminBuildNotifier(): ReactNode {
    return (
        <BuildNotifierProvider
            currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'}
            intervalMs={60_000}
        >
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !state.dismissed ? (
                        <Card
                            as="aside"
                            role="status"
                            aria-live="polite"
                            className="fixed right-4 bottom-4 z-[60] flex max-w-sm items-center gap-3 motion-safe:animate-[nbn-in-bottom_240ms_ease-out]"
                        >
                            <View className="min-w-0 flex-1">
                                <strong className="block text-sm">New build deployed</strong>
                                <span className="block font-mono text-muted-foreground text-xs">
                                    {shortId(state.currentBuildId)} → {shortId(state.latestBuildId)}
                                </span>
                            </View>
                            <Button variant="solid" size="sm" onClick={state.reload}>
                                Reload
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Dismiss"
                                onClick={state.dismiss}
                            >
                                ✕
                            </Button>
                        </Card>
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}
```

> Verify the exact nordstar `Card`/`Button`/`View` prop names (`as`, `variant`, `size`) against `node_modules/@nordcom/nordstar/dist/components/*/index.d.ts` and adjust. If `Card` doesn't accept `role`, wrap in a `<div role="status">`. Reuse the `nbn-in-bottom` keyframes — add them to the admin global CSS (same as storefront) if not present.

- [ ] **Step 2: Mount in the app shell**

In `apps/admin/src/app/(app)/layout.tsx`, inside `<Providers>` and after `{children}`:

```tsx
import { AdminBuildNotifier } from '@/components/build-notifier/build-notifier';
```

```tsx
                <ThemeProvider initialPreference={preference}>
                    <PreviewBanner />
                    <Providers>
                        {children}
                        <AdminBuildNotifier />
                    </Providers>
                </ThemeProvider>
```

- [ ] **Step 3: Typecheck + build + commit**

```bash
pnpm --filter @nordcom/commerce-admin typecheck
pnpm --filter @nordcom/commerce-admin build
pnpm biome check --write apps/admin/src
git add apps/admin/src
git commit -m "feat(admin): add nordstar build-notifier banner."
```

### Task 10c: Admin e2e (config editor + banner)

**Files:**
- Create: `apps/admin/e2e/build-notifier.spec.ts`

- [ ] **Step 1: Write the spec**

Covers (a) the admin's own update banner via version stub, and (b) editing the per-shop config in Customization → Components and asserting persistence.

```ts
import { expect, test } from '@playwright/test';

const SHOP = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

test.describe('admin build notifier', () => {
    test('shows its own update banner on a new build', async ({ page }) => {
        await page.route('**/api/version**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-admin-new', ts: Date.now() }),
            }),
        );
        await page.goto('/');
        const banner = page.getByRole('status').filter({ hasText: /new build deployed/i });
        await expect(banner).toBeVisible();
        await banner.getByRole('button', { name: /dismiss/i }).click();
        await expect(banner).toBeHidden();
    });

    test('edits the per-shop build-notifier config', async ({ page }) => {
        await page.goto(`/${SHOP}/settings/customization/?tab=components`);

        const enabled = page.getByTestId('field-extensions.buildNotifier.enabled');
        await expect(enabled).toBeVisible();

        // Toggle dismissable off, set position to top, and type custom copy.
        await page.getByTestId('field-extensions.buildNotifier.position').locator('select').selectOption('top');
        await page.getByTestId('field-extensions.buildNotifier.copy').locator('input').fill('Heads up — new build');

        // Wait for autosave quiescence, then publish.
        await page.getByRole('button', { name: /publish/i }).click();
        await expect(page.getByTestId('editor-toolbar-error')).toHaveCount(0);

        // Reload and confirm the value persisted.
        await page.reload();
        await expect(page.getByTestId('field-extensions.buildNotifier.copy').locator('input')).toHaveValue(
            'Heads up — new build',
        );
    });
});
```

> Match the real testid widget structure (the field shell wraps a native `<input>`/`<select>`; the agent confirmed `field-<dotted.path>` shells). Wait on autosave **quiescence**, not the "Last saved" label (per CLAUDE.md). Stamp a unique token if the spec mutates shared state and restore it at the end to stay rerun-safe.

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --filter @nordcom/commerce-admin -- build-notifier
```

Expected: both tests pass (port 3000, `.next-e2e`).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/e2e/build-notifier.spec.ts
git commit -m "test(admin): cover build-notifier banner and config editor."
```

---

# Phase 11 — Landing integration

> **Scope note (explicit):** landing has **no Playwright e2e harness** and CLAUDE.md mandates e2e only for admin/storefront. This phase ships the feature with the package's own unit coverage; it does **not** stand up a new landing e2e harness. This is a deliberate scope boundary, not an omission.

### Task 11a: Landing version route + config wrap

**Files:**
- Create: `apps/landing/src/app/api/version/route.ts`
- Modify: `apps/landing/next.config.js`

- [ ] **Step 1: Create the `api/version` route** (landing has no `api/` dir yet)

```ts
import { createVersionRoute } from 'next-build-notifier/server';

export const dynamic = 'force-dynamic';

export const { GET } = createVersionRoute();
```

- [ ] **Step 2: Wrap `next.config.js`**

Add `import { withBuildNotifier } from 'next-build-notifier/config';`; add `transpilePackages: ['next-build-notifier'],` (landing's current `transpilePackages` is `[]`); change the export from `export default withMarkdoc({...})(config);` to:

```js
export default withBuildNotifier(
    withMarkdoc({
        mode: 'static',
        schemaPath: './src/markdoc',
        tokenizerOptions: { allowComments: true, slots: true },
    })(config),
);
```

- [ ] **Step 3: Build + commit**

```bash
pnpm --filter @nordcom/commerce-landing build
git add apps/landing/next.config.js apps/landing/src/app/api/version/route.ts
git commit -m "feat(landing): mount version endpoint and bake build id."
```

### Task 11b: Landing banner + mount in both group layouts

**Files:**
- Create: `apps/landing/src/components/build-notifier/build-notifier.tsx`
- Modify: `apps/landing/src/app/(marketing)/layout.tsx`
- Modify: `apps/landing/src/app/(status)/layout.tsx`

- [ ] **Step 1: Write the landing banner** (`'use client'`)

Mirror the admin banner (nordstar `Card`/`Button`) but with landing copy "We shipped an update" and no SHA delta (visitors don't need it):

```tsx
'use client';

import { Button, Card } from '@nordcom/nordstar';
import { BuildNotifier, BuildNotifierProvider } from 'next-build-notifier';
import type { ReactNode } from 'react';

/**
 * Landing "we shipped an update" banner, styled with nordstar to match the marketing site. Mounted in
 * each route-group layout.
 *
 * @returns The provider subtree rendering the banner when an update is available.
 */
export function LandingBuildNotifier(): ReactNode {
    return (
        <BuildNotifierProvider currentBuildId={process.env.NEXT_PUBLIC_BUILD_ID ?? 'development'} intervalMs={60_000}>
            <BuildNotifier>
                {(state) =>
                    state.updateAvailable && !state.dismissed ? (
                        <Card
                            as="aside"
                            className="fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-md items-center gap-3 motion-safe:animate-[nbn-in-bottom_240ms_ease-out] md:inset-x-auto md:right-4"
                        >
                            <span className="min-w-0 flex-1 text-sm">We shipped an update</span>
                            <Button variant="solid" size="sm" onClick={state.reload}>
                                Reload
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Dismiss" onClick={state.dismiss}>
                                ✕
                            </Button>
                        </Card>
                    ) : null
                }
            </BuildNotifier>
        </BuildNotifierProvider>
    );
}
```

Add the `nbn-in-bottom` keyframes to landing global CSS if not present.

- [ ] **Step 2: Mount in both layouts**

In each of `(marketing)/layout.tsx` and `(status)/layout.tsx`, import and place `<LandingBuildNotifier />` inside `<Providers>` after the page content:

```tsx
import { LandingBuildNotifier } from '@/components/build-notifier/build-notifier';
```

```tsx
                <Providers>
                    {/* …existing header/footer/children… */}
                    {children}
                    <LandingBuildNotifier />
                </Providers>
```

- [ ] **Step 3: Typecheck + build + commit**

```bash
pnpm --filter @nordcom/commerce-landing typecheck
pnpm --filter @nordcom/commerce-landing build
pnpm biome check --write apps/landing/src
git add apps/landing/src
git commit -m "feat(landing): add build-notifier banner."
```

---

# Phase 12 — Whole-repo verification & branch finish

### Task 12: Final gates and integration handoff

**Files:** none (verification) + possibly small fixes.

- [ ] **Step 1: Run every relevant gate from the repo root**

```bash
pnpm build:packages
pnpm lint
pnpm typecheck
pnpm test
pnpm cms:gen:check
pnpm --filter @nordcom/commerce-docs docs:gen:check
pnpm --filter @nordcom/commerce-test-convex run test src/limits
```

Expected: all pass. Fix any failures at root cause (no version reverts / empty-array band-aids).

- [ ] **Step 2: Run the e2e suites touched**

```bash
pnpm test:e2e --filter @nordcom/commerce-storefront -- build-notifier
pnpm test:e2e --filter @nordcom/commerce-admin -- build-notifier
```

Expected: green.

- [ ] **Step 3: Confirm the changeset exists and is correct**

```bash
ls .changeset/*.md
```

Expected: a `next-build-notifier` minor changeset present.

- [ ] **Step 4: Verify published-artifact shape one more time**

```bash
pnpm --filter next-build-notifier build
head -n1 packages/next-build-notifier/dist/index.js   # "use client";
node -e "console.log(Object.keys(require('./packages/next-build-notifier/package.json').exports))"  # ['.', './server', './config']
```

- [ ] **Step 5: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to choose merge/PR/cleanup. Open a PR titled `feat: new build indicator (#2029)` whose body links #2029, lists the package + three integrations, and notes the npm reservation status from Task 0.2. The existing `release.yml` will publish `next-build-notifier@0.1.0` via OIDC once the changeset lands on `master` and the trusted publisher is configured.

---

## Self-review (run before execution)

- **Spec coverage:** package (Phases 1–7) ✓; generic detection + Vercel via `resolveBuildId` ✓; headless provider/hook/render-prop ✓; `withBuildNotifier` config wrapper ✓; storefront per-shop CMS field (Phase 9) ✓; admin banner (Phase 10) ✓; landing banner (Phase 11) ✓; docs + homepage link (Phase 8) ✓; npm reserve-first + trusted publishing (Phase 0.2) ✓; changeset (Phase 7) ✓; worktree/branch (Phase 0.1) ✓; e2e storefront+admin ✓; landing e2e explicitly out of scope ✓; `intervalMs` falsy-disables ✓.
- **Type consistency:** `BuildNotifierConfig` / `BuildNotificationState` / `VersionResponse` are defined once in `shared/types.ts` and reused everywhere; `resolveBuildId` shared by `/server` and `/config`; engine `useBuildNotifierEngine` ↔ provider ↔ context hook names match.
- **Open verification points flagged for the executor (not placeholders — checks):** exact nordstar prop names; the storefront global-CSS file for keyframes; the resolve.ts test shop factory; whether docs typedoc auto-discovers the package; rolldown `'use client'` preservation (hard gate with fallback).
