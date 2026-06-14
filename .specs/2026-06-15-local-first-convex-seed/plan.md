# Local-first Convex + Advanced Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm dev` and GitHub CI run against a seeded **local** Convex backend instead of the Convex Cloud dev deployment, with an enriched canonical seed modeling an advanced shop (plus a minimal second shop) across every Convex table.

**Architecture:** Reuse the existing `@nordcom/commerce-test-convex` local-backend toolkit (`startConvex`/daemon/CLI/`seedCanonical`). Phase 1 adds a detached dev orchestration that boots a fixed-port (3210) persistent local backend, sets its env, and seeds it — wired into the existing `predev` hook. Phase 2 enriches `seedCanonical` (both the in-process `seedCanonicalMutation` and the live `seedCanonicalLive` paths) into an advanced + minimal shop. Phase 3 extracts a CI composite that boots+seeds the local backend and runs an integration job + re-enabled e2e against it on every PR.

**Tech Stack:** Convex 1.39 (anonymous local backend), `@nordcom/commerce-test-convex`, Node 24, pnpm + turbo + portless, Vitest (`convex-test` in-memory + real ephemeral backend), Playwright, GitHub Actions.

**Conventions (apply to every task):**
- `pnpm build:packages` before lint/typecheck/test in a fresh checkout.
- Run a single package's tests with `pnpm --filter @nordcom/commerce-test-convex run test <path>` (forwards to `vitest run <path>`).
- Convex seed fixtures are typed off generated `Doc<'table'>` so drift fails typecheck.
- Throw via `@nordcom/commerce-errors` only in app/package runtime code; the seed/harness package throws `ConvexError` (its existing convention).
- Conventional Commits with scope; trailing period.
- **No changeset** — `.changeset/config.json` ignores all `@nordcom/*` except `@nordcom/cart-*`; this plan touches none of those.

---

## Pinned constants (used across tasks — keep identical everywhere)

- Dev backend: port **3210**, dataDir **`.convex-local`**, URL **`http://127.0.0.1:3210`**.
- Dev secret: **`dev-local-secret`**. CI secret: **`ci-local-secret`**.
- Dev auth placeholders: `CONVEX_AUTH_ISSUER=https://dev.localhost.invalid`, `CONVEX_AUTH_APPLICATION_ID=convex`, `CONVEX_AUTH_JWKS_URL=https://dev.localhost.invalid/.well-known/jwks.json`.
- Advanced shop: `nordcom-demo-shop.com` (existing canonical). Minimal shop: `minimal-demo.com`.

---

# PHASE 1 — Local dev wiring

Deliverable: `pnpm dev` boots a seeded local backend on :3210 and runs the apps against it.

### Task 1: Env defaults + gitignore

**Files:**
- Modify: `.env.example`, `apps/storefront/.env.example`, `apps/admin/.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Set local-first Convex defaults in the three env examples**

In each of `.env.example`, `apps/storefront/.env.example`, `apps/admin/.env.example`, replace the empty Convex lines:

```
CONVEX_URL=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_SERVER_SECRET=
```

with the local-first defaults:

```
# Local-first by default: `pnpm dev` boots a seeded local Convex backend on :3210
# (see `pnpm convex:local`). Point these at a cloud deployment to override.
CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
CONVEX_SERVER_SECRET=dev-local-secret
```

Leave `CONVEX_DEPLOY_KEY` empty (CI-only). Do not touch other vars.

- [ ] **Step 2: Ignore the local backend state dir**

Add to `.gitignore`:

```
# Local-first Convex backend state (pnpm convex:local)
.convex-local/
```

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/storefront/.env.example apps/admin/.env.example .gitignore
git commit -m "chore(dev): default the apps to a local Convex backend on :3210."
```

### Task 2: `convexLocalCliEnv` helper (reusable CLI env for the local backend)

**Files:**
- Create: `packages/test-convex/src/dev-local.ts`
- Test: `packages/test-convex/src/dev-local.test.ts`

This helper builds the child-process env for running the bundled `convex` CLI against the local backend with the admin key (used by both `convex env set` and `convex import`/seed). It mirrors `seed/live.ts`'s `buildSeedCliEnv` but is admin-key-first and never throws (the daemon always has an admin key).

- [ ] **Step 1: Write the failing test**

Create `packages/test-convex/src/dev-local.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { convexLocalCliEnv, DEV_LOCAL } from './dev-local';

describe('DEV_LOCAL constants', () => {
    it('pins the fixed dev backend shape', () => {
        expect(DEV_LOCAL.port).toBe(3210);
        expect(DEV_LOCAL.url).toBe('http://127.0.0.1:3210');
        expect(DEV_LOCAL.dataDir).toBe('.convex-local');
        expect(DEV_LOCAL.serverSecret).toBe('dev-local-secret');
    });
});

describe('convexLocalCliEnv', () => {
    it('targets the self-hosted local backend with the admin key and blanks cloud selectors', () => {
        const env = convexLocalCliEnv('http://127.0.0.1:3210', 'admin-key-123', { PATH: '/bin' });
        expect(env.CONVEX_SELF_HOSTED_URL).toBe('http://127.0.0.1:3210');
        expect(env.CONVEX_SELF_HOSTED_ADMIN_KEY).toBe('admin-key-123');
        expect(env.CONVEX_DEPLOYMENT).toBe('');
        expect(env.CONVEX_DEPLOY_KEY).toBe('');
        expect(env.PATH).toBe('/bin');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/dev-local`
Expected: FAIL — module `./dev-local` not found.

- [ ] **Step 3: Implement the constants + helper**

Create `packages/test-convex/src/dev-local.ts`:

```ts
/** Fixed shape of the local-first dev backend. Pinned so env defaults and scripts stay deterministic. */
export const DEV_LOCAL = {
    /** Port the local backend listens on (matches CONVEX_URL in the env examples). */
    port: 3210,
    /** Deployment URL the apps and seed target. */
    url: 'http://127.0.0.1:3210',
    /** Persistent state directory (gitignored). */
    dataDir: '.convex-local',
    /** Server-tier secret set on the backend AND used by the apps + seed. */
    serverSecret: 'dev-local-secret',
    /** Auth placeholders the deployed functions' auth.config.ts validates against. */
    auth: {
        issuer: 'https://dev.localhost.invalid',
        applicationId: 'convex',
        jwksUrl: 'https://dev.localhost.invalid/.well-known/jwks.json',
    },
} as const;

/**
 * Builds the child-process environment for one bundled-Convex-CLI invocation against the local
 * backend, authenticating with the daemon's admin key. Blanks the cloud-deployment selectors (and
 * `CONVEX_DEPLOYMENT`, which `packages/convex/.env.local` would otherwise dotenv-shadow onto the wrong
 * deployment), mirroring `seed/live.ts`'s `buildSeedCliEnv` self-hosted branch.
 *
 * @param url - Local deployment URL.
 * @param adminKey - The daemon's admin key (from the `.admin-key` marker).
 * @param env - Source environment (injectable for unit tests).
 * @returns The child-process environment.
 */
export function convexLocalCliEnv(url: string, adminKey: string, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    return {
        ...env,
        CONVEX_SELF_HOSTED_URL: url,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_DEPLOYMENT: '',
        CONVEX_DEPLOY_KEY: '',
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/dev-local`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/test-convex/src/dev-local.ts packages/test-convex/src/dev-local.test.ts
git commit -m "feat(test-convex): add local-backend constants and CLI env helper."
```

### Task 3: `ensureLocalConvex` orchestration (detached boot → env → seed)

**Files:**
- Modify: `packages/test-convex/src/dev-local.ts`
- Modify: `packages/test-convex/src/dev-local.test.ts`

`ensureLocalConvex()` is idempotent: if the backend is already healthy it env-sets + seeds (cheap) and returns; otherwise it spawns the daemon **detached** (the CLI `start` blocks, so dev cannot run it foreground), waits for health, then env-sets + seeds.

- [ ] **Step 1: Write the failing test for the healthcheck helper**

Add to `packages/test-convex/src/dev-local.test.ts`:

```ts
import { afterEach, vi } from 'vitest';
import { isBackendHealthy } from './dev-local';

afterEach(() => vi.restoreAllMocks());

describe('isBackendHealthy', () => {
    it('is true on a 200 from /instance_name', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(true);
    });

    it('is false when the fetch rejects (nothing listening)', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });

    it('is false on a non-200', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/dev-local`
Expected: FAIL — `isBackendHealthy` not exported.

- [ ] **Step 3: Implement `isBackendHealthy`, `convexEnvSet`, and `ensureLocalConvex`**

Append to `packages/test-convex/src/dev-local.ts`:

```ts
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { resolveConvexProjectDir } from './start';

const requireFromHere = createRequire(import.meta.url);

/** Absolute path to the bundled `convex` CLI entry (`convex/bin/main.js`). */
function resolveConvexBin(): string {
    return resolve(dirname(requireFromHere.resolve('convex/package.json')), 'bin', 'main.js');
}

/**
 * Whether the backend answers `/instance_name` with a 200 — the same readiness probe `startConvex`
 * polls. A rejected fetch (nothing listening) or a non-200 is unhealthy.
 *
 * @param url - Deployment URL to probe.
 * @returns `true` when the backend is up.
 */
export async function isBackendHealthy(url: string): Promise<boolean> {
    try {
        const response = await fetch(`${url}/instance_name`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Sets one environment variable on the local backend via the bundled CLI (`convex env set`). Throws
 * on a non-zero exit so a misconfigured backend fails loud rather than seeding against a closed gate.
 *
 * @param url - Local deployment URL.
 * @param adminKey - The daemon's admin key.
 * @param key - Variable name.
 * @param value - Variable value.
 */
export function convexEnvSet(url: string, adminKey: string, key: string, value: string): void {
    const result = spawnSync(process.execPath, [resolveConvexBin(), 'env', 'set', key, value], {
        cwd: resolveConvexProjectDir(),
        encoding: 'utf8',
        env: convexLocalCliEnv(url, adminKey),
    });
    if (result.status !== 0) {
        throw new Error(`[test-convex] convex env set ${key} failed: ${result.stderr ?? ''}`);
    }
}

/**
 * Idempotently ensures the local-first dev backend is up, configured, and seeded:
 *   1. If `/instance_name` is already healthy, skip the boot.
 *   2. Otherwise spawn the `test-convex start` daemon DETACHED (the CLI blocks, so `pnpm dev` cannot
 *      run it foreground) and poll until healthy.
 *   3. Read the admin key marker, set the server secret + auth placeholders on the backend.
 *   4. Run the canonical seed (idempotent — a no-op when the shop already exists).
 *
 * @param opts.timeoutMs - Health-poll budget (default 120s; covers a first-run binary download).
 * @returns The backend URL once it is healthy and seeded.
 * @throws {Error} When the backend never becomes healthy within the budget.
 */
export async function ensureLocalConvex(opts: { timeoutMs?: number } = {}): Promise<string> {
    const { url, dataDir, serverSecret, auth } = DEV_LOCAL;
    const adminKeyFile = resolve(dataDir, '.admin-key');

    if (!(await isBackendHealthy(url))) {
        // Detached so the daemon outlives this orchestration process and `pnpm dev` continues.
        const cliEntry = requireFromHere.resolve('./cli');
        const child = spawn(
            process.execPath,
            [cliEntry, 'start', '--dataDir', dataDir, '--port', String(DEV_LOCAL.port)],
            { detached: true, stdio: 'ignore' },
        );
        child.unref();

        const deadline = Date.now() + (opts.timeoutMs ?? 120_000);
        while (Date.now() < deadline) {
            if (await isBackendHealthy(url)) break;
            await sleep(500);
        }
        if (!(await isBackendHealthy(url))) {
            throw new Error(`[test-convex] local backend did not become healthy at ${url} within the timeout.`);
        }
    }

    if (!existsSync(adminKeyFile)) {
        throw new Error(`[test-convex] admin-key marker missing at ${adminKeyFile}; is the daemon running?`);
    }
    const adminKey = readFileSync(adminKeyFile, 'utf8').trim();

    convexEnvSet(url, adminKey, 'CONVEX_SERVER_SECRET', serverSecret);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_ISSUER', auth.issuer);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_APPLICATION_ID', auth.applicationId);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_JWKS_URL', auth.jwksUrl);

    // Seed via the live runner; it reads CONVEX_SERVER_SECRET (server-tier) and the self-hosted
    // admin key for the CMS imports. Set both on this process before dispatching.
    process.env.CONVEX_SERVER_SECRET = serverSecret;
    process.env.CONVEX_SELF_HOSTED_URL = url;
    process.env.CONVEX_SELF_HOSTED_ADMIN_KEY = adminKey;
    const { seedCanonical } = await import('./seed/canonical');
    await seedCanonical(url);

    return url;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/dev-local`
Expected: PASS (the healthcheck/constants/env tests; `ensureLocalConvex` itself is covered by the manual run in Task 6 and CI in Phase 3).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @nordcom/commerce-test-convex run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/test-convex/src/dev-local.ts packages/test-convex/src/dev-local.test.ts
git commit -m "feat(test-convex): add ensureLocalConvex detached boot+seed orchestration."
```

### Task 4: CLI `up` subcommand

**Files:**
- Modify: `packages/test-convex/src/cli.ts`
- Test: `packages/test-convex/src/cli.test.ts` (append; create if absent — check `ls packages/test-convex/src/cli.test.ts`)

- [ ] **Step 1: Write the failing test**

Append to `packages/test-convex/src/cli.test.ts` (mirror the file's existing `runCli` test style; if the file does not exist, create it with this content and the import `import { runCli } from './cli';`):

```ts
import { describe, expect, it, vi } from 'vitest';
import { runCli } from './cli';

describe('runCli up', () => {
    it('dispatches `up` to ensureLocalConvex and returns 0', async () => {
        const ensure = vi.fn().mockResolvedValue('http://127.0.0.1:3210');
        vi.doMock('./dev-local', () => ({ ensureLocalConvex: ensure, DEV_LOCAL: { dataDir: '.convex-local', port: 3210 } }));
        const { runCli: freshRunCli } = await import('./cli');
        expect(await freshRunCli(['up'])).toBe(0);
        expect(ensure).toHaveBeenCalled();
    });

    it('returns 1 for an unknown subcommand', async () => {
        expect(await runCli(['bogus'])).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/cli`
Expected: FAIL — `up` falls through to the default (`return 1`).

- [ ] **Step 3: Add the `up` subcommand**

In `packages/test-convex/src/cli.ts`, add a handler and a switch case. Add near `cmdSeed`:

```ts
/**
 * Idempotently boots + configures + seeds the local-first dev backend (the entry `predev` calls).
 * Delegates to {@link ensureLocalConvex}; lazy-imported so `start`/`stop`/`reset` never pull in the
 * seed chain.
 *
 * @returns `0` once the backend is healthy and seeded.
 */
const cmdUp = async (): Promise<number> => {
    const { ensureLocalConvex } = await import('./dev-local');
    const url = await ensureLocalConvex();
    console.info(`[test-convex] local backend ready and seeded at ${url}`);
    return 0;
};
```

In the `runCli` switch, add before `default`:

```ts
        case 'up':
            return cmdUp();
```

And extend the usage string to include `up`:

```ts
            console.error(
                'usage: test-convex {up|start|stop|reset|seed} [--dataDir path] [--port n] [--url ...] [--adminKey ...]',
            );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/cli`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/test-convex/src/cli.ts packages/test-convex/src/cli.test.ts
git commit -m "feat(test-convex): add `up` CLI subcommand for the local-first dev backend."
```

### Task 5: Root scripts + `predev` wiring

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add the local-backend scripts and wire `predev`**

In root `package.json` `scripts`, add:

```json
        "convex:local": "pnpm --filter @nordcom/commerce-test-convex exec test-convex up --dataDir .convex-local --port 3210",
        "convex:local:stop": "pnpm --filter @nordcom/commerce-test-convex exec test-convex stop --dataDir .convex-local",
        "convex:local:reset": "pnpm --filter @nordcom/commerce-test-convex exec test-convex reset --dataDir .convex-local && pnpm convex:local",
```

Change the existing `predev` so the local backend is up + seeded before any app dev server starts (it already bootstraps portless):

```json
        "predev": "portless proxy status >/dev/null 2>&1 || portless proxy start --https --wildcard; pnpm convex:local",
```

> `predev:admin`/`predev:landing`/`predev:storefront`/`predev:docs` already delegate to `pnpm predev`, so they inherit the convex bootstrap.

> The `test-convex` bin resolves from the package's `dist/cli.js`; run `pnpm build:packages` once so `pnpm convex:local` finds it. `.convex-local` is created relative to the repo root (the script runs there).

- [ ] **Step 2: Build packages so the bin exists**

Run: `pnpm build:packages`
Expected: PASS (builds `@nordcom/commerce-test-convex` → `dist/cli.js`).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(dev): boot+seed the local Convex backend from predev."
```

### Task 6: Storefront dev CSP allows the local backend + manual verification

**Files:**
- Modify: `apps/storefront/next.config.js` (the `buildContentSecurityPolicy` call / its definition)

- [ ] **Step 1: Confirm the dev CSP allows `http://127.0.0.1:3210` (ws+http)**

Read `apps/storefront/next.config.js` around the `buildContentSecurityPolicy({ convexUrl, isDev })` call and its definition (grep `connect-src` / `convexUrl`). The browser opens a WebSocket to `NEXT_PUBLIC_CONVEX_URL`. Confirm `connect-src` includes the convex URL and its `ws:`/`wss:` origin in dev. If the dev branch already injects `convexUrl` into `connect-src`, no change is needed. If it only allows `*.convex.cloud`, add the resolved `convexUrl` origin (and its `ws://`/`wss://` form) to the dev `connect-src` list.

If a change is needed, make the dev `connect-src` include the literal origin derived from `convexUrl` (both `http(s)://` and `ws(s)://`). Keep production behavior unchanged.

- [ ] **Step 2: Manual verification of the full dev loop**

Run:
```bash
pnpm build:packages
pnpm convex:local           # boots :3210, sets env, seeds (first run downloads the backend binary)
curl -s http://127.0.0.1:3210/instance_name   # expect a 200 body
```
Then in a second shell, confirm the seed landed by querying the shop through the seam (or run the storefront and load `https://nordcom-demo-shop.com.localhost/` behind portless). Expected: the demo shop resolves; no calls to `*.convex.cloud`.

Stop with `pnpm convex:local:stop` when done.

- [ ] **Step 3: Commit (only if the CSP needed a change)**

```bash
git add apps/storefront/next.config.js
git commit -m "fix(storefront): allow the local Convex origin in the dev CSP."
```

---

# PHASE 2 — Seed enrichment (advanced + minimal shop)

Deliverable: `seedCanonical` produces an advanced `nordcom-demo-shop.com` spanning every Convex table + a minimal `minimal-demo.com`, idempotently, on BOTH seed paths.

> **Both paths rule:** every new fixture family MUST be applied by (a) `seedCanonicalMutation` (in-process, `ctx.db.insert`) for `convex-test`, AND (b) `seedCanonicalLive` (over-the-wire CLI import / seam mutation) for dev + e2e. The existing CMS phase is the template: a fixture module + a mutation block + a live `importSeedRows` block.

### Task 7: Domain status states on the advanced shop

**Files:**
- Modify: `packages/test-convex/src/seed/fixtures/shop.ts`
- Modify: `packages/test-convex/src/seed/shop.ts`
- Modify: `packages/test-convex/src/seed/live.ts`
- Test: `packages/test-convex/src/seed/seed-domains.test.ts`

Add a typed domain-status map to the fixture and apply it on both paths. The mutation path inserts `shopDomains` rows with `status`/`via` directly; the live path calls the shipped `db/shop_domain_write:setDomainVerification` mutation per alternative domain after the shop upsert.

- [ ] **Step 1: Write the failing test (mutation path)**

Create `packages/test-convex/src/seed/seed-domains.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded domain statuses', () => {
    it('marks the alternative domains with verified/pending/failed states', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const rows = await t.run((ctx) => ctx.db.query('shopDomains').collect());
        const byDomain = new Map(rows.map((r) => [r.domain, r]));
        expect(byDomain.get('nordcom-demo-shop.com')?.status).toBe('verified');
        expect(byDomain.get('nordcom.shop')?.status).toBe('verified');
        expect(byDomain.get('demo.nordcom.commerce')?.status).toBe('pending');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-domains`
Expected: FAIL — `status` is `undefined` on the seeded rows.

- [ ] **Step 3: Add the domain-status map to the fixture**

In `packages/test-convex/src/seed/fixtures/shop.ts`, export a status map and a typed entry shape. Add after `ALTERNATIVE_DOMAINS`:

```ts
/** Connection state to stamp on each seeded routing row, exercising every `shopDomain.status`. */
export type SeedDomainStatus = {
    domain: string;
    status: 'pending' | 'verified' | 'failed';
    via?: 'vercel' | 'service_domain' | 'localhost';
};

/**
 * The status each seeded domain should carry, so the connect/verify UI and any status-gated logic
 * have realistic material: the primary + one alternative are `verified`, one is `pending`.
 */
export const CANONICAL_DOMAIN_STATUSES: SeedDomainStatus[] = [
    { domain: DEFAULT_SHOP_DOMAIN, status: 'verified', via: 'service_domain' },
    { domain: 'nordcom.shop', status: 'verified', via: 'service_domain' },
    { domain: 'demo.nordcom.commerce', status: 'pending' },
];
```

- [ ] **Step 4: Apply statuses on the mutation path**

In `packages/test-convex/src/seed/shop.ts`, import the map and stamp each inserted row. Change the domain insert loop:

```ts
import { buildCanonicalShopFixture, CANONICAL_DOMAIN_STATUSES, type SeedShopOptions } from './fixtures/shop';
```
(keep the existing `type SeedShopOptions = CanonicalShopFixtureOptions;` export; import the map alongside the builder)

Replace the loop at the domain-insert site:

```ts
    const statusByDomain = new Map(CANONICAL_DOMAIN_STATUSES.map((entry) => [entry.domain, entry]));
    for (const domain of domains) {
        const status = statusByDomain.get(domain);
        await ctx.db.insert('shopDomains', {
            shop: shopId,
            domain,
            ...(status ? { status: status.status, ...(status.via ? { via: status.via } : {}) } : {}),
        });
    }
```

> The minimal shop (Task 11) passes its own `domain` override and has no entry in the map, so its row is inserted plain (status absent → reads as `verified` per the seam coalescing).

- [ ] **Step 5: Apply statuses on the live path**

In `packages/test-convex/src/seed/live.ts`, after the shop upsert resolves `shopId` (around the `const now = Date.now();` line), add a call through the shipped verification mutation for each status entry. Add the function reference near the other refs at the top:

```ts
/** Domain verification writer (`db/shop_domain_write.ts`) — stamps seeded domain statuses. */
export const setDomainVerificationRef = makeFunctionReference<'mutation'>('db/shop_domain_write:setDomainVerification');
```

And after `const shopId = view.shop._id;` (only on the fresh-shop branch, before the CMS imports):

```ts
    const { CANONICAL_DOMAIN_STATUSES } = await import('./fixtures/shop');
    for (const entry of CANONICAL_DOMAIN_STATUSES) {
        await client.mutation(setDomainVerificationRef, {
            serverSecret,
            domain: entry.domain,
            status: entry.status,
            ...(entry.via ? { via: entry.via } : {}),
        });
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-domains`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/test-convex/src/seed/fixtures/shop.ts packages/test-convex/src/seed/shop.ts packages/test-convex/src/seed/live.ts packages/test-convex/src/seed/seed-domains.test.ts
git commit -m "feat(test-convex): seed alternative-domain verification states."
```

### Task 8: Collaborators + auth users (admin / editor / viewer)

**Files:**
- Create: `packages/test-convex/src/seed/fixtures/collaborators.ts`
- Create: `packages/test-convex/src/seed/collaborators.ts`
- Modify: `packages/test-convex/src/seed/canonical.ts`
- Modify: `packages/test-convex/src/seed/live.ts`
- Test: `packages/test-convex/src/seed/seed-collaborators.test.ts`

Seed three platform users (with one embedded OAuth identity + a standalone identity row + an active session each) and link them to the advanced shop via `shopCollaborators` at three permission tiers.

- [ ] **Step 1: Write the failing test (mutation path)**

Create `packages/test-convex/src/seed/seed-collaborators.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded collaborators', () => {
    it('creates three users linked to the shop at admin/editor/viewer tiers', async () => {
        const t = convexTest(schema);
        const shopId = await t.run((ctx) => seedCanonicalMutation(ctx));

        const users = await t.run((ctx) => ctx.db.query('users').collect());
        expect(users.map((u) => u.email).sort()).toEqual([
            'editor@nordcom-demo-shop.com',
            'owner@nordcom-demo-shop.com',
            'viewer@nordcom-demo-shop.com',
        ]);

        const links = await t.run((ctx) =>
            ctx.db.query('shopCollaborators').withIndex('by_shop', (q) => q.eq('shop', shopId)).collect(),
        );
        const perms = links.map((l) => l.permissions.join(',')).sort();
        expect(perms).toEqual(['admin', 'editor', 'viewer']);

        const sessions = await t.run((ctx) => ctx.db.query('sessions').collect());
        expect(sessions.length).toBe(3);
    });

    it('is idempotent — a second run adds no duplicate users or links', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const users = await t.run((ctx) => ctx.db.query('users').collect());
        expect(users.length).toBe(3);
        const links = await t.run((ctx) => ctx.db.query('shopCollaborators').collect());
        expect(links.length).toBe(3);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-collaborators`
Expected: FAIL — no users/collaborators seeded.

- [ ] **Step 3: Write the fixture**

Create `packages/test-convex/src/seed/fixtures/collaborators.ts`:

```ts
import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** A seeded collaborator: the platform user, its standalone identity, a session, and the shop tier. */
export type CollaboratorSeed = {
    /** `users` row sans system fields/timestamps. */
    user: Omit<Doc<'users'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;
    /** Standalone `identities` row sans system fields/timestamps (mirrors the user's embedded identity). */
    identity: Omit<Doc<'identities'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;
    /** Session token + epoch-ms expiry. */
    session: { token: string; expiresAt: number };
    /** Permission set linked via `shopCollaborators`. */
    permissions: string[];
};

/** Far-future epoch-ms so seeded sessions never expire under test/dev. */
const SESSION_EXPIRY = 4_102_444_800_000; // 2100-01-01

/**
 * Three collaborators for the advanced shop, one per permission tier, each with a GitHub OAuth
 * identity (embedded on the user AND as a standalone row) and a live session — enough material for
 * the admin's auth/tenant-access and collaborator-management surfaces.
 */
export const collaboratorFixtures: CollaboratorSeed[] = [
    {
        user: {
            email: 'owner@nordcom-demo-shop.com',
            name: 'Olivia Owner',
            emailVerified: SESSION_EXPIRY,
            groups: ['staff'],
            identities: [
                {
                    id: 'idsub-owner-github',
                    provider: 'github',
                    identity: 'gh-owner-1',
                    createdAt: 0,
                    updatedAt: 0,
                },
            ],
        },
        identity: { provider: 'github', identity: 'gh-owner-1' },
        session: { token: 'seed-session-owner', expiresAt: SESSION_EXPIRY },
        permissions: ['admin'],
    },
    {
        user: {
            email: 'editor@nordcom-demo-shop.com',
            name: 'Eddie Editor',
            emailVerified: SESSION_EXPIRY,
            identities: [
                { id: 'idsub-editor-github', provider: 'github', identity: 'gh-editor-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        identity: { provider: 'github', identity: 'gh-editor-1' },
        session: { token: 'seed-session-editor', expiresAt: SESSION_EXPIRY },
        permissions: ['editor'],
    },
    {
        user: {
            email: 'viewer@nordcom-demo-shop.com',
            name: 'Vera Viewer',
            emailVerified: null,
            identities: [
                { id: 'idsub-viewer-github', provider: 'github', identity: 'gh-viewer-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        identity: { provider: 'github', identity: 'gh-viewer-1' },
        session: { token: 'seed-session-viewer', expiresAt: SESSION_EXPIRY },
        permissions: ['viewer'],
    },
];
```

- [ ] **Step 4: Write the mutation-path seeder**

Create `packages/test-convex/src/seed/collaborators.ts`:

```ts
import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { collaboratorFixtures } from './fixtures/collaborators';

/**
 * Seeds the advanced shop's collaborators in-process: each fixture user (idempotent by `email` via
 * `users.by_email`), its standalone identity (idempotent by `(provider, identity)`), a session, and a
 * `shopCollaborators` link (idempotent by `(shop, user)`). All inserts stamp the managed timestamps.
 *
 * @param ctx - A Convex mutation context.
 * @param shopId - The advanced shop the collaborators belong to.
 */
export async function seedCollaboratorsMutation(ctx: MutationCtx, shopId: Id<'shops'>): Promise<void> {
    const now = Date.now();
    for (const fixture of collaboratorFixtures) {
        let user = await ctx.db.query('users').withIndex('by_email', (q) => q.eq('email', fixture.user.email)).unique();
        let userId: Id<'users'>;
        if (user) {
            userId = user._id;
        } else {
            userId = await ctx.db.insert('users', { ...fixture.user, createdAt: now, updatedAt: now });
        }

        const identity = await ctx.db
            .query('identities')
            .withIndex('by_provider_identity', (q) =>
                q.eq('provider', fixture.identity.provider).eq('identity', fixture.identity.identity),
            )
            .unique();
        if (!identity) {
            await ctx.db.insert('identities', { ...fixture.identity, createdAt: now, updatedAt: now });
        }

        const session = await ctx.db
            .query('sessions')
            .withIndex('by_token', (q) => q.eq('token', fixture.session.token))
            .unique();
        if (!session) {
            await ctx.db.insert('sessions', {
                user: userId,
                token: fixture.session.token,
                expiresAt: fixture.session.expiresAt,
                createdAt: now,
                updatedAt: now,
            });
        }

        const link = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_shop_user', (q) => q.eq('shop', shopId).eq('user', userId))
            .unique();
        if (!link) {
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: fixture.permissions });
        }
    }
}
```

- [ ] **Step 5: Wire it into the mutation orchestrator**

In `packages/test-convex/src/seed/canonical.ts`, import and call the seeder. Change `seedCanonicalMutation`:

```ts
import { seedCollaboratorsMutation } from './collaborators';
```
```ts
export async function seedCanonicalMutation(ctx: MutationCtx, opts: SeedCanonicalOptions = {}): Promise<Id<'shops'>> {
    const shopId = await seedShopMutation(ctx, opts);
    await seedCmsMutation(ctx, { shopId });
    await seedCollaboratorsMutation(ctx, shopId);
    return shopId;
}
```

- [ ] **Step 6: Wire the live path**

In `packages/test-convex/src/seed/live.ts`, after the CMS imports and before `return shopId;`, seed collaborators over the wire. Insert users/identities/sessions via `importSeedRows`, then link through the existing `shopUpsertRef` collaborators argument (which resolves `(shop, user)` idempotently). Add:

```ts
    const { collaboratorFixtures } = await import('./fixtures/collaborators');
    importSeedRows(
        url,
        'users',
        collaboratorFixtures.map((c) => ({ ...c.user, createdAt: now, updatedAt: now })),
    );
    importSeedRows(
        url,
        'identities',
        collaboratorFixtures.map((c) => ({ ...c.identity, createdAt: now, updatedAt: now })),
    );
    // Resolve the freshly-imported user ids by email to link sessions + collaborators.
    const usersByEmailRef = makeFunctionReference<'query'>('db/users:byEmail');
    const collaboratorLinks: { user: string; permissions: string[] }[] = [];
    for (const c of collaboratorFixtures) {
        const u = (await client.query(usersByEmailRef, { serverSecret, email: c.user.email })) as { _id: string } | null;
        if (!u) throw new ConvexError(`@nordcom/commerce-test-convex: seeded user ${c.user.email} not found after import.`);
        importSeedRows(url, 'sessions', [
            { user: u._id, token: c.session.token, expiresAt: c.session.expiresAt, createdAt: now, updatedAt: now },
        ]);
        collaboratorLinks.push({ user: u._id, permissions: c.permissions });
    }
    await client.mutation(shopUpsertRef, { serverSecret, legacyId, upsert: true, shop, collaborators: collaboratorLinks });
```

> Confirm the `db/users:byEmail` function reference exists (grep `packages/convex/convex/db/users.ts` for `byEmail`); if the export name differs, use the actual one. `legacyId`/`shop` are already in scope from the earlier upsert in this function.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-collaborators`
Expected: PASS (both cases).

- [ ] **Step 8: Commit**

```bash
git add packages/test-convex/src/seed/fixtures/collaborators.ts packages/test-convex/src/seed/collaborators.ts packages/test-convex/src/seed/canonical.ts packages/test-convex/src/seed/live.ts packages/test-convex/src/seed/seed-collaborators.test.ts
git commit -m "feat(test-convex): seed collaborators (admin/editor/viewer) with auth rows."
```

### Task 9: Reviews + media

**Files:**
- Create: `packages/test-convex/src/seed/fixtures/reviews-media.ts`
- Create: `packages/test-convex/src/seed/reviews-media.ts`
- Modify: `packages/test-convex/src/seed/canonical.ts`
- Modify: `packages/test-convex/src/seed/live.ts`
- Test: `packages/test-convex/src/seed/seed-reviews-media.test.ts`

`reviews` is `{ shopId, createdAt, updatedAt }`; `media` is `{ shop: string, alt, caption?, createdAt, updatedAt }` (note `shop` is a STRING here — the descriptor-generated CMS table — so it carries the shop id as a string).

- [ ] **Step 1: Write the failing test**

Create `packages/test-convex/src/seed/seed-reviews-media.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded reviews + media', () => {
    it('seeds reviews and media rows scoped to the shop', async () => {
        const t = convexTest(schema);
        const shopId = await t.run((ctx) => seedCanonicalMutation(ctx));
        const reviews = await t.run((ctx) => ctx.db.query('reviews').collect());
        expect(reviews.length).toBeGreaterThanOrEqual(2);
        expect(reviews.every((r) => r.shopId === shopId)).toBe(true);

        const media = await t.run((ctx) => ctx.db.query('media').collect());
        expect(media.length).toBeGreaterThanOrEqual(2);
        expect(media.every((m) => m.shop === shopId)).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-reviews-media`
Expected: FAIL — no reviews/media.

- [ ] **Step 3: Write the fixture**

Create `packages/test-convex/src/seed/fixtures/reviews-media.ts`:

```ts
import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** `media` row sans system fields/timestamps and sans the `shop` ref (the seeder supplies the id). */
export type MediaSeed = Omit<Doc<'media'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

/** How many `reviews` rows to seed for the advanced shop (the table carries only `shopId` + timestamps). */
export const REVIEW_COUNT = 3;

/** Media library fixtures for the advanced shop. */
export const mediaFixtures: MediaSeed[] = [
    { alt: 'Atelier flat-lay of the core collection', caption: 'Spring lookbook hero' },
    { alt: 'Repair guarantee illustration', caption: 'Lifetime repair promise' },
    { alt: 'Stockholm studio portrait' },
];
```

- [ ] **Step 4: Write the seeder**

Create `packages/test-convex/src/seed/reviews-media.ts`:

```ts
import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { mediaFixtures, REVIEW_COUNT } from './fixtures/reviews-media';

/**
 * Seeds the advanced shop's reviews and media. Idempotent by COUNT: re-running tops the tables up to
 * the fixture target rather than appending (the `reviews` table has no natural key, and media is
 * keyed by its `alt` text within the shop).
 *
 * @param ctx - A Convex mutation context.
 * @param shopId - The advanced shop.
 */
export async function seedReviewsMediaMutation(ctx: MutationCtx, shopId: Id<'shops'>): Promise<void> {
    const now = Date.now();

    const existingReviews = await ctx.db.query('reviews').withIndex('by_shop', (q) => q.eq('shopId', shopId)).collect();
    for (let i = existingReviews.length; i < REVIEW_COUNT; i += 1) {
        await ctx.db.insert('reviews', { shopId, createdAt: now, updatedAt: now });
    }

    const existingMedia = await ctx.db.query('media').withIndex('by_shop', (q) => q.eq('shop', shopId)).collect();
    const seenAlt = new Set(existingMedia.map((m) => m.alt));
    for (const media of mediaFixtures) {
        if (seenAlt.has(media.alt)) continue;
        await ctx.db.insert('media', { shop: shopId, ...media, createdAt: now, updatedAt: now });
    }
}
```

> `media.shop` is a `v.string()`; passing the branded `Id<'shops'>` is assignable to `string`, and the `by_shop` index compares it as a string. The `reviews.shopId` is a `v.id('shops')`.

- [ ] **Step 5: Wire both paths**

In `canonical.ts` add `await seedReviewsMediaMutation(ctx, shopId);` after the collaborators call, with the import. In `live.ts`, before `return shopId;` (fresh-shop branch) add:

```ts
    const { mediaFixtures, REVIEW_COUNT } = await import('./fixtures/reviews-media');
    importSeedRows(
        url,
        'reviews',
        Array.from({ length: REVIEW_COUNT }, () => ({ shopId, createdAt: now, updatedAt: now })),
    );
    importSeedRows(
        url,
        'media',
        mediaFixtures.map((m) => ({ shop: shopId, ...m, createdAt: now, updatedAt: now })),
    );
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-reviews-media`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/test-convex/src/seed/fixtures/reviews-media.ts packages/test-convex/src/seed/reviews-media.ts packages/test-convex/src/seed/canonical.ts packages/test-convex/src/seed/live.ts packages/test-convex/src/seed/seed-reviews-media.test.ts
git commit -m "feat(test-convex): seed reviews and media for the advanced shop."
```

### Task 10: CMS draft/published version history

**Files:**
- Create: `packages/test-convex/src/seed/versions.ts`
- Modify: `packages/test-convex/src/seed/canonical.ts`
- Modify: `packages/test-convex/src/seed/live.ts`
- Test: `packages/test-convex/src/seed/seed-versions.test.ts`

Give one already-seeded `cmsDocuments` row (a page) a published + draft `cmsVersions` history with the pointers wired, so the editor versions UI has material. The advanced shop's first collaborator (the `admin`/owner user) is the version author.

- [ ] **Step 1: Write the failing test**

Create `packages/test-convex/src/seed/seed-versions.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded CMS version history', () => {
    it('gives a page a published baseline + a working draft with wired pointers', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const page = await t.run((ctx) =>
            ctx.db.query('cmsDocuments').withIndex('by_shop_collection', (q) => q.eq('shopId', (await ctxShop(ctx)) as never)).first(),
        );
        // Simpler: assert there is at least one document with both pointers set and >=2 versions.
        const docs = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        const withHistory = docs.find((d) => d.publishedVersionId && d.latestVersionId);
        expect(withHistory).toBeTruthy();
        const versions = await t.run((ctx) =>
            ctx.db.query('cmsVersions').withIndex('by_document', (q) => q.eq('documentId', withHistory!._id)).collect(),
        );
        expect(versions.length).toBeGreaterThanOrEqual(2);
        expect(versions.some((v) => v.status === 'published')).toBe(true);
        expect(versions.some((v) => v.status === 'draft')).toBe(true);
    });
});

// helper omitted from final code — see Step 3 for the real, simpler assertion
async function ctxShop(_ctx: unknown): Promise<unknown> {
    return undefined;
}
```

> Replace the over-complicated `page`/`ctxShop` lines above with ONLY the `docs`/`withHistory`/`versions` assertions when writing the file — they are the real test. (Kept here to show intent; the helper is a no-op.)

Final test body (use this exactly):

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded CMS version history', () => {
    it('gives a page a published baseline + a working draft with wired pointers', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const docs = await t.run((ctx) => ctx.db.query('cmsDocuments').collect());
        const withHistory = docs.find((d) => d.publishedVersionId && d.latestVersionId);
        expect(withHistory).toBeTruthy();
        const versions = await t.run((ctx) =>
            ctx.db.query('cmsVersions').withIndex('by_document', (q) => q.eq('documentId', withHistory!._id)).collect(),
        );
        expect(versions.length).toBeGreaterThanOrEqual(2);
        expect(versions.some((v) => v.status === 'published')).toBe(true);
        expect(versions.some((v) => v.status === 'draft')).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-versions`
Expected: FAIL — no document has both pointers.

- [ ] **Step 3: Write the seeder**

Create `packages/test-convex/src/seed/versions.ts`:

```ts
import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';

/**
 * Builds a published-baseline + working-draft version history for the FIRST `pages` `cmsDocuments`
 * row of the shop, wiring `publishedVersionId`/`latestVersionId`/`revision`. Idempotent: a no-op once
 * the chosen document already carries a `latestVersionId`. The shop's `admin` collaborator authors
 * the snapshots (resolved by the `owner@` seeded email; falls back to author-less when absent).
 *
 * @param ctx - A Convex mutation context.
 * @param shopId - The advanced shop.
 */
export async function seedVersionsMutation(ctx: MutationCtx, shopId: Id<'shops'>): Promise<void> {
    const doc = await ctx.db
        .query('cmsDocuments')
        .withIndex('by_shop_collection', (q) => q.eq('shopId', shopId).eq('collection', 'pages'))
        .first();
    if (!doc || doc.latestVersionId) return;

    const owner = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'owner@nordcom-demo-shop.com'))
        .unique();
    const author = owner ? { userId: owner._id, label: owner.name } : undefined;
    const now = Date.now();

    const publishedVersionId = await ctx.db.insert('cmsVersions', {
        shopId,
        documentId: doc._id,
        collection: doc.collection,
        snapshot: doc.data,
        status: 'published',
        revision: 1,
        ...(author ? { author } : {}),
        createdAt: now - 2_000,
    });

    const draftSnapshot = { ...(doc.data as Record<string, unknown>), __draftNote: 'Working copy edited after publish.' };
    const latestVersionId = await ctx.db.insert('cmsVersions', {
        shopId,
        documentId: doc._id,
        collection: doc.collection,
        snapshot: draftSnapshot,
        status: 'draft',
        revision: 2,
        ...(author ? { author } : {}),
        createdAt: now - 1_000,
    });

    await ctx.db.patch(doc._id, {
        data: draftSnapshot,
        status: 'published',
        publishedVersionId,
        latestVersionId,
        revision: 2,
        updatedAt: now,
    });
}
```

- [ ] **Step 4: Wire the mutation path**

In `canonical.ts`, add `await seedVersionsMutation(ctx, shopId);` after the reviews/media call (it must run AFTER the CMS phase that creates the `cmsDocuments` rows), with the import.

- [ ] **Step 5: Wire the live path**

In `live.ts`, the live path already imports `cmsDocuments` rows. Versioning over the wire requires reading back a document id, inserting two `cmsVersions`, and patching the document's pointers. Add, before `return shopId;` (after the cmsDocuments import), using the CLI import for the version rows and a server-tier read for the document id:

```ts
    // Version history for the first page document. Resolve its id via the deployed read, insert the
    // two snapshots, and patch the pointers. The read seam is `db/cms_documents` (grep for the
    // by-shop+collection reader; if none is exported, skip the live version seed — the editor still
    // adopts a published baseline on first save).
```

> If no server-tier reader returns a `cmsDocuments` id by `(shop, collection)`, the live version seed is OPTIONAL for this wave: the editor's first native draft save adopts a published baseline (documented in `cmsVersions.ts`'s schema comment), so dev/e2e still function without pre-seeded history. Implement the live version seed only if such a reader exists; otherwise add a one-line `log` noting the skip and rely on the mutation-path coverage. Do NOT leave a half-wired pointer.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-versions`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/test-convex/src/seed/versions.ts packages/test-convex/src/seed/canonical.ts packages/test-convex/src/seed/live.ts packages/test-convex/src/seed/seed-versions.test.ts
git commit -m "feat(test-convex): seed CMS draft/published version history."
```

### Task 11: Minimal second shop

**Files:**
- Modify: `packages/test-convex/src/seed/canonical.ts`
- Modify: `packages/test-convex/src/seed/live.ts`
- Test: `packages/test-convex/src/seed/seed-minimal-shop.test.ts`

Seed a bare `minimal-demo.com` tenant (shop + credentials + one verified domain + one admin collaborator, NO CMS extras) so multi-tenant isolation is exercised. Reuse `seedShopMutation` with overrides — it already builds a valid shop from `{ domain, name }`.

- [ ] **Step 1: Write the failing test**

Create `packages/test-convex/src/seed/seed-minimal-shop.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

describe('seeded minimal second shop', () => {
    it('seeds minimal-demo.com as a distinct tenant', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const shops = await t.run((ctx) => ctx.db.query('shops').collect());
        expect(shops.map((s) => s.domain).sort()).toEqual(['minimal-demo.com', 'nordcom-demo-shop.com']);

        const minimal = shops.find((s) => s.domain === 'minimal-demo.com')!;
        // The minimal shop has NO CMS pages of its own.
        const pages = await t.run((ctx) =>
            ctx.db.query('cmsDocuments').withIndex('by_shop', (q) => q.eq('shopId', minimal._id)).collect(),
        );
        expect(pages.length).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-minimal-shop`
Expected: FAIL — only one shop exists.

- [ ] **Step 3: Seed the minimal shop on the mutation path**

In `packages/test-convex/src/seed/canonical.ts`, after the advanced-shop phases and before `return shopId;`, seed the minimal tenant. It must NOT receive the CMS/collaborator/version phases:

```ts
    // Minimal second tenant — proves hostname→shop isolation. Shop + credentials + domains only.
    const minimalShopId = await seedShopMutation(ctx, { domain: 'minimal-demo.com', name: 'Minimal Demo' });
    const minimalOwner = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'owner@nordcom-demo-shop.com'))
        .unique();
    if (minimalOwner) {
        const link = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_shop_user', (q) => q.eq('shop', minimalShopId).eq('user', minimalOwner._id))
            .unique();
        if (!link) {
            await ctx.db.insert('shopCollaborators', {
                shop: minimalShopId,
                user: minimalOwner._id,
                permissions: ['admin'],
            });
        }
    }
```

> `seedShopMutation` is keyed on the primary domain, so a re-run returns the existing minimal shop id (idempotent). `CANONICAL_DOMAIN_STATUSES` has no entry for `minimal-demo.com`, so its single domain row is inserted plain (reads as `verified`).

- [ ] **Step 4: Seed the minimal shop on the live path**

In `packages/test-convex/src/seed/live.ts`, at the END of `seedCanonicalLive` (before `return shopId;`), upsert the minimal tenant through the seam. Reuse `buildCanonicalShopFixture` with the override:

```ts
    const minimal = buildCanonicalShopFixture({ domain: 'minimal-demo.com', name: 'Minimal Demo' });
    const { legacyId: _ml, ...minimalShop } = { ...minimal.shop, legacyId: 'b1b2c3d4e5f6b1b2c3d4e5f6' };
    const minimalView = (await client.query(shopByDomainRef, { serverSecret, domain: 'minimal-demo.com' })) as LiveShopView;
    if (!minimalView) {
        await client.mutation(shopUpsertRef, {
            serverSecret,
            legacyId: 'b1b2c3d4e5f6b1b2c3d4e5f6',
            upsert: true,
            shop: minimalShop,
            credentials: minimal.credentials,
        });
    }
```

> The minimal shop reuses the canonical fixture's design/provider but a DISTINCT `legacyId` (so the two tenants never collide). It gets no CMS/collaborator/version imports.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-minimal-shop`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/test-convex/src/seed/canonical.ts packages/test-convex/src/seed/live.ts packages/test-convex/src/seed/seed-minimal-shop.test.ts
git commit -m "feat(test-convex): seed a minimal second shop for tenant isolation."
```

### Task 12: Whole-seed regression + idempotency + existing-suite green

**Files:**
- Test: `packages/test-convex/src/seed/seed-canonical-superset.test.ts`

- [ ] **Step 1: Write a coverage + idempotency test over the full superset**

Create `packages/test-convex/src/seed/seed-canonical-superset.test.ts`:

```ts
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../../../convex/convex/schema';
import { seedCanonicalMutation } from './canonical';

/** Tables the enriched seed must populate for the advanced shop. */
const POPULATED_TABLES = [
    'shops',
    'shopCredentials',
    'shopDomains',
    'shopCollaborators',
    'shopFeatureFlags',
    'featureFlags',
    'users',
    'sessions',
    'identities',
    'reviews',
    'media',
    'cmsDocuments',
    'cmsVersions',
] as const;

describe('enriched canonical seed', () => {
    it('populates every advanced-shop table', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        for (const table of POPULATED_TABLES) {
            const rows = await t.run((ctx) => ctx.db.query(table).collect());
            expect(rows.length, `expected rows in ${table}`).toBeGreaterThan(0);
        }
    });

    it('is fully idempotent — a second run leaves every table count unchanged', async () => {
        const t = convexTest(schema);
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const before = await Promise.all(POPULATED_TABLES.map((tbl) => t.run((ctx) => ctx.db.query(tbl).collect())));
        await t.run((ctx) => seedCanonicalMutation(ctx));
        const after = await Promise.all(POPULATED_TABLES.map((tbl) => t.run((ctx) => ctx.db.query(tbl).collect())));
        before.forEach((rows, i) => expect(after[i]!.length, `${POPULATED_TABLES[i]} count drifted`).toBe(rows.length));
    });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @nordcom/commerce-test-convex run test src/seed/seed-canonical-superset`
Expected: PASS.

- [ ] **Step 3: Run the FULL test-convex unit suite to catch broken existing assertions**

Run: `pnpm --filter @nordcom/commerce-test-convex run test`
Expected: PASS. If a pre-existing seed test now asserts a stale count (e.g. "exactly one shop", "N domains"), update that assertion to match the enriched seed and note it in the commit body. Do NOT weaken an assertion that guards real behavior — adjust the expected number.

- [ ] **Step 4: Run the convex package suite (in-memory seed consumers)**

Run: `pnpm build:packages && pnpm --filter @nordcom/commerce-convex run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/test-convex/src/seed/seed-canonical-superset.test.ts
git commit -m "test(test-convex): assert the enriched seed populates every table idempotently."
```

### Task 13: Live-seed integration test against a real backend

**Files:**
- Modify: `packages/test-convex/src/limits/canonical-seed.test.ts`

- [ ] **Step 1: Extend the existing canonical-seed integration test to assert the superset + idempotency on a REAL backend**

Read `packages/test-convex/src/limits/canonical-seed.test.ts` and add, after its existing single-seed assertion, a re-seed + table-count check (it already boots an ephemeral backend via `startConvex` and seeds through `seedCanonical`). Add an assertion block that:
1. After the first `seedCanonical(url)`, queries (via the seam, e.g. `db/shops:byDomain` for both `nordcom-demo-shop.com` and `minimal-demo.com`) that BOTH shops resolve.
2. Calls `seedCanonical(url)` a second time and asserts the same two shop ids come back (no duplication).

Use the file's existing client/secret setup; mirror its assertion style. Keep it under the file's existing `CONVEX_LIMITS_TESTS` gate.

- [ ] **Step 2: Run it (gated suite)**

Run: `CONVEX_LIMITS_TESTS=1 CONVEX_AGENT_MODE=anonymous pnpm --filter @nordcom/commerce-test-convex run test src/limits/canonical-seed`
Expected: PASS (boots a real backend; allow time for a first-run binary download).

> If the local environment cannot boot the backend binary, note it and rely on the CI `integration` job (Phase 3) to exercise this path.

- [ ] **Step 3: Commit**

```bash
git add packages/test-convex/src/limits/canonical-seed.test.ts
git commit -m "test(test-convex): assert the live superset seed is idempotent on a real backend."
```

---

# PHASE 3 — CI on the local backend

Deliverable: every PR runs an integration job + re-enabled e2e against the seeded local backend; no production Convex in CI.

### Task 14: Composite action — boot the local backend

**Files:**
- Create: `.github/common/convex-local/action.yml`

- [ ] **Step 1: Write the composite action**

Create `.github/common/convex-local/action.yml`. It boots the cached pinned backend on :3210 via the existing two-pass flow, sets the server secret + auth, and leaves it running for the job's subsequent steps. (It does NOT seed — e2e global-setup seeds; the integration job seeds explicitly.)

```yaml
name: Convex local backend
description: Boot the pinned anonymous local Convex backend on :3210 and configure its env.
inputs:
    server-secret:
        description: Value to set as CONVEX_SERVER_SECRET on the backend.
        required: true
runs:
    using: composite
    steps:
        - name: 🌐 Boot + configure local backend
          shell: bash
          env:
              CONVEX_AGENT_MODE: anonymous
          run: |
              # First pass provisions the pinned backend binary; auth-config validation fails until
              # the vars are seeded (no --local-backend-version flag on `convex env set`).
              pnpm convex:dev --once --local-backend-version "$CONVEX_LOCAL_BACKEND_VERSION" \
                  || echo "first pass provisions the backend; env validation fails until vars are set"
              pnpm convex:env set CONVEX_SERVER_SECRET "${{ inputs.server-secret }}"
              pnpm convex:env set CONVEX_AUTH_ISSUER https://ci.localhost.invalid
              pnpm convex:env set CONVEX_AUTH_APPLICATION_ID convex
              pnpm convex:env set CONVEX_AUTH_JWKS_URL https://ci.localhost.invalid/.well-known/jwks.json
              pnpm convex:dev --once --local-backend-version "$CONVEX_LOCAL_BACKEND_VERSION"
```

> `pnpm convex:dev`/`convex:env` operate against the anonymous backend the CLI provisions under the project's state dir (the same backend the `convex` job already uses). `CONVEX_LOCAL_BACKEND_VERSION` comes from the workflow's global `env`.

- [ ] **Step 2: Commit**

```bash
git add .github/common/convex-local/action.yml
git commit -m "ci: add composite action to boot the local Convex backend."
```

### Task 15: Integration job (every PR)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add an `integration` job that seeds + runs the integration suites against the local backend**

Add a new job to `.github/workflows/ci.yml` (alongside `convex`). It boots the backend via the composite, seeds it, then runs the limit/integration suites — on EVERY PR (no path gate):

```yaml
    integration:
        name: 🔌 Integration (local Convex)
        timeout-minutes: 20
        runs-on: ubuntu-latest
        env:
            CONVEX_AGENT_MODE: anonymous
            CONVEX_LIMITS_TESTS: "1"
            CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS: "600"
            CONVEX_SERVER_SECRET: ci-local-secret
        steps:
            - name: 🕶️ Checkout repository
              uses: actions/checkout@v6
            - name: 🚀 Bootstrap
              id: bootstrap
              uses: ./.github/common/bootstrap
              with:
                  turbo-cache: "false"
            - name: 🌐 Local Convex backend
              uses: ./.github/common/convex-local
              with:
                  server-secret: ci-local-secret
            - name: 🧪 Integration suites (real backend)
              run: pnpm --filter @nordcom/commerce-test-convex run test src/limits
            - name: 💾 Save bootstrap caches
              if: always()
              uses: ./.github/common/bootstrap-save
              with:
                  node-modules-cache-hit: ${{ steps.bootstrap.outputs.node-modules-cache-hit }}
                  convex-backend-cache-hit: ${{ steps.bootstrap.outputs.convex-backend-cache-hit }}
                  save-convex-backend: 'true'
```

> The existing `convex` job (deploy validation, path-gated) stays as-is. This new job always runs the integration suites against a seeded backend.

- [ ] **Step 2: Validate the YAML locally**

Run: `pnpm dlx @action-validator/cli@latest .github/workflows/ci.yml || true` (best-effort) and `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: no YAML parse error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run integration suites against a seeded local Convex backend on every PR."
```

### Task 16: Re-enable e2e against the local backend

**Files:**
- Modify: `.github/workflows/ci.yml` (the `build` and `e2e` jobs)

The e2e job downloads prebuilt app artifacts; `NEXT_PUBLIC_CONVEX_URL` is inlined at BUILD time, so the `build` job must bake the local URL, and each e2e shard must boot+configure the backend (global-setup then seeds).

- [ ] **Step 1: Bake the local Convex URL into the build job**

In the `build` job of `.github/workflows/ci.yml`, add to its env (so the storefront/admin bundles point at the local backend):

```yaml
        env:
            NEXT_PUBLIC_CONVEX_URL: http://127.0.0.1:3210
```

(Add it to the existing `build` job `env:` block; if none exists, add one.)

- [ ] **Step 2: Re-enable + wire the e2e job**

In the `e2e` job: remove `if: false` (line ~286). Add the backend env + boot+seed steps before the Playwright run. Add to the job `env:`:

```yaml
            CONVEX_URL: http://127.0.0.1:3210
            NEXT_PUBLIC_CONVEX_URL: http://127.0.0.1:3210
            CONVEX_SERVER_SECRET: ci-local-secret
            CONVEX_AGENT_MODE: anonymous
            CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS: "600"
```

Add a boot step after Bootstrap and before "Run E2E Tests":

```yaml
            - name: 🌐 Local Convex backend
              uses: ./.github/common/convex-local
              with:
                  server-secret: ci-local-secret
```

> The storefront/admin e2e `global-setup.ts` already seeds via `seedCanonical(CONVEX_URL)` and resolves the tenant, so no separate seed step is needed — it runs against the booted backend. Shopify is mocked in the specs (`page.route`).

- [ ] **Step 3: Keep the e2e job non-blocking for the first green, then make it required**

Leave `continue-on-error: true` for the FIRST PR that enables it (so a flaky discovery doesn't block), then, once green, remove `continue-on-error: true` in a follow-up commit so e2e gates merges. Note this in the commit body.

- [ ] **Step 4: Validate YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: no parse error.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: re-enable e2e against the seeded local Convex backend."
```

### Task 17: Docs

**Files:**
- Modify: `README.md` and/or `apps/docs/content/get-started/quickstart.mdx`
- Create: `apps/docs/content/operations/local-convex.mdx` (or a section in an existing ops page)

- [ ] **Step 1: Document the local-first workflow**

Add a short section covering: `pnpm dev` now boots a seeded local backend on :3210 (no cloud); `pnpm convex:local` / `:reset` / `:stop`; the seed contents (advanced + minimal shop); that CI runs integration + e2e against the same local backend; and how to opt into a cloud deployment (set `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL`/`CONVEX_SERVER_SECRET`). Mirror the existing docs voice.

- [ ] **Step 2: Commit**

```bash
git add README.md apps/docs/content
git commit -m "docs: document the local-first Convex dev workflow and seed."
```

---

# Final verification (run after all phases)

- [ ] **Build + typecheck + lint**

Run: `pnpm build:packages && pnpm typecheck && pnpm lint`
Expected: PASS (lint exits 0; pre-existing warnings tolerated).

- [ ] **Full affected suites**

Run:
```bash
pnpm --filter @nordcom/commerce-test-convex run test
pnpm --filter @nordcom/commerce-convex run test
```
Expected: PASS.

- [ ] **Manual dev smoke**

Run: `pnpm convex:local && curl -s http://127.0.0.1:3210/instance_name` → expect 200; load a storefront tenant behind portless; `pnpm convex:local:stop`.

- [ ] **Confirm no changeset needed** — only `@nordcom/*` (ignored) packages + workflows/docs touched.

---

## Self-Review notes

- **Spec coverage:** dev wiring (Tasks 1–6), seed enrichment — domains/status (7), collaborators+auth (8), reviews+media (9), CMS versions (10), minimal shop (11), idempotency (12–13); CI composite (14), integration (15), e2e (16), docs (17). Every spec section maps to ≥1 task. ✔
- **Scope boundary:** products stay in Shopify; e2e mocks them — restated in Tasks 9 & 16. ✔
- **Both-paths rule:** every seed task wires BOTH `seedCanonicalMutation` and `seedCanonicalLive`. ✔
- **Idempotency:** every seeder keys on a natural key or tops-up to a count; asserted in Tasks 8, 12, 13. ✔
- **Type consistency:** `DEV_LOCAL`, `ensureLocalConvex`, `convexLocalCliEnv`, `CANONICAL_DOMAIN_STATUSES`, `collaboratorFixtures`, `seed*Mutation` names are used identically across tasks. ✔
- **Known follow-up flagged (not a placeholder):** live-path CMS-version seed (Task 10 Step 5) is gated on an existing `cmsDocuments` id reader; if absent, the mutation-path coverage stands and the editor adopts a published baseline on first save — explicitly decided, not deferred.
