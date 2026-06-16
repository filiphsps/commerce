import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';

import { resolveConvexProjectDir } from './start';

type ProcessEnv = Omit<NodeJS.ProcessEnv, 'NODE_ENV'>;

const requireFromHere = createRequire(import.meta.url);

/** Absolute path to the bundled `convex` CLI entry (`convex/bin/main.js`). */
function resolveConvexBin(): string {
    return resolve(dirname(requireFromHere.resolve('convex/package.json')), 'bin', 'main.js');
}

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
export function convexLocalCliEnv(url: string, adminKey: string, env: ProcessEnv = process.env): ProcessEnv {
    return {
        ...env,
        CONVEX_SELF_HOSTED_URL: url,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_DEPLOYMENT: '',
        CONVEX_DEPLOY_KEY: '',
    };
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
 * Polls for the daemon's `.admin-key` marker until it holds a non-empty value, or the budget elapses.
 *
 * The detached daemon writes the marker only after its own `startConvex` resolves, and that lags
 * backend health: the Convex CLI answers `/instance_name` before it persists the deployment admin key
 * (`startConvex` then waits up to 5s for it). A consumer that probes health and reads the marker in one
 * shot therefore races a cold boot and spuriously reports it missing — the exact failure that took both
 * e2e matrix jobs down. Waiting on the condition rather than guessing a single read closes the race.
 *
 * @param adminKeyFile - Absolute path to the `.admin-key` marker the daemon writes.
 * @param timeoutMs - Poll budget (default 30s; covers `startConvex`'s 5s admin-key persistence wait
 *   plus the detached daemon's lag behind the parent's health probe).
 * @param pollIntervalMs - Delay between marker probes (default mirrors the backend readiness cadence).
 * @returns The trimmed admin key.
 * @throws {ConvexError} When the marker never holds a non-empty value within the budget.
 */
export async function waitForAdminKeyMarker(
    adminKeyFile: string,
    timeoutMs = 30_000,
    pollIntervalMs = 250,
): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (existsSync(adminKeyFile)) {
            const key = readFileSync(adminKeyFile, 'utf8').trim();
            if (key) return key;
        }
        if (Date.now() >= deadline) {
            throw new ConvexError(`[test-convex] admin-key marker missing at ${adminKeyFile}; is the daemon running?`);
        }
        await sleep(pollIntervalMs);
    }
}

/**
 * Resolves the auth-provider config seeded onto the local backend's deployment, letting an explicit
 * environment override the {@link DEV_LOCAL} placeholders.
 *
 * Dev and the unit/integration backends keep the unreachable `*.localhost.invalid` defaults — no
 * operator JWT is exercised against them, so the deployment's `customJwt` provider never fetches the
 * JWKS. The admin e2e job, by contrast, runs the real admin app, which mints operator tokens the
 * backend must verify: it sets `CONVEX_AUTH_ISSUER`/`CONVEX_AUTH_APPLICATION_ID` to match the minter
 * and `CONVEX_AUTH_JWKS_URL` at the running app's reachable `/.well-known/jwks.json`, so a minted
 * token validates against the one key the app serves.
 *
 * @param env - Environment to read overrides from; defaults to `process.env`.
 * @returns The issuer, application id, and JWKS URL to seed on the backend deployment.
 */
export function resolveBackendAuthEnv(env: ProcessEnv = process.env): {
    issuer: string;
    applicationId: string;
    jwksUrl: string;
} {
    return {
        issuer: env.CONVEX_AUTH_ISSUER?.trim() || DEV_LOCAL.auth.issuer,
        applicationId: env.CONVEX_AUTH_APPLICATION_ID?.trim() || DEV_LOCAL.auth.applicationId,
        jwksUrl: env.CONVEX_AUTH_JWKS_URL?.trim() || DEV_LOCAL.auth.jwksUrl,
    };
}

/** Primary domain of the canonical seed tenant — the probe key for "is this deployment already seeded?". */
export const CANONICAL_SEED_DOMAIN = 'nordcom-demo-shop.com';

/** Server-tier `db/shops:byDomain` reference, resolved by name so this module never imports the convex `api`. */
const shopByDomainRef = makeFunctionReference<'query'>('db/shops:byDomain');

/**
 * Probes whether the canonical tenant is already present on a running deployment — the fast-path gate
 * for a restored, pre-seeded state directory (the CI bootstrap-cache reuse). Resolves through the
 * server-tier `db/shops:byDomain` seam, so it doubles as a "functions are pushed AND data is seeded"
 * check: a fresh backend whose modules never pushed throws (the query 404s) and reports unseeded.
 *
 * @param url - Local deployment URL.
 * @param serverSecret - The server-tier secret admitting the privileged query.
 * @returns `true` when the canonical shop resolves; `false` on any error (functions absent, shop
 *   missing, backend not answering) so the caller falls back to the full push + seed.
 */
export async function isCanonicalSeeded(url: string, serverSecret: string): Promise<boolean> {
    try {
        const client = new ConvexHttpClient(url);
        const shop = await client.query(shopByDomainRef, { serverSecret, domain: CANONICAL_SEED_DOMAIN });
        return shop != null;
    } catch {
        // Functions not pushed (query 404s), backend not answering, or any transport error → not seeded.
        return false;
    }
}

/**
 * Runs `fn`, retrying on a thrown error with linear backoff. Hardens the transient failures the local
 * Convex push exhibits under load — the backend's `wait_for_schema` endpoint intermittently answers
 * `500 InternalServerError` while a fresh deployment settles, which the CLI surfaces as a non-zero exit
 * even though an immediate re-push succeeds.
 *
 * @param fn - The (possibly synchronous) operation to attempt.
 * @param opts.attempts - Total attempts before giving up (default 3).
 * @param opts.baseDelayMs - Backoff base; attempt N waits `baseDelayMs * N` (default 1000).
 * @param opts.label - Human label for the retry log line.
 * @returns The operation's result on the first success.
 * @throws The last error when every attempt fails.
 */
export async function withRetry<T>(
    fn: () => T,
    {
        attempts = 3,
        baseDelayMs = 1_000,
        label = 'operation',
    }: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return fn();
        } catch (err) {
            lastErr = err;
            if (attempt < attempts) {
                const delayMs = baseDelayMs * attempt;
                console.warn(
                    `[test-convex] ${label} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`,
                );
                await sleep(delayMs);
            }
        }
    }
    throw lastErr;
}

/**
 * Resolves the Clerk auth-provider config to seed onto the local backend's deployment. Convex's native
 * Clerk provider (`auth.config.ts`) needs `CLERK_FRONTEND_API_URL` to discover Clerk's JWKS and verify
 * the ADMIN operator tokens the admin app mints (`getToken({ template: 'convex' })`); without it every
 * operator `getUserIdentity()` returns `null` and the chooser/cms reads fail closed. The optional
 * `CLERK_WEBHOOK_SIGNING_SECRET` is only needed when an e2e exercises the webhook httpAction directly
 * (the spec suite does not — the seed re-expresses the webhook writes), so it is set only when present.
 *
 * Unit/integration backends never mint a Clerk token, so they leave `frontendApiUrl` empty (the
 * provider then matches no token, exactly like the unreachable customJwt placeholders). The admin e2e
 * job sets `CLERK_FRONTEND_API_URL` to the dev Clerk instance's Frontend API origin so a real operator
 * token validates.
 *
 * `CLERK_FRONTEND_API_URL_PROD` is the SECOND (prod) Clerk instance's origin: `auth.config.ts` also
 * references it, so `convex dev`'s push hard-errors when it is referenced-but-unset. CI/unit backends
 * mint no prod token and leave it empty (the prod provider then matches no token), exactly like
 * `frontendApiUrl` above.
 *
 * @param env - Environment to read overrides from; defaults to `process.env`.
 * @returns The Clerk frontend API URLs (dev + prod) and optional webhook signing secret to seed.
 */
export function resolveClerkBackendEnv(env: ProcessEnv = process.env): {
    frontendApiUrl: string;
    frontendApiUrlProd: string;
    webhookSigningSecret: string;
} {
    return {
        frontendApiUrl: env.CLERK_FRONTEND_API_URL?.trim() || '',
        frontendApiUrlProd: env.CLERK_FRONTEND_API_URL_PROD?.trim() || '',
        webhookSigningSecret: env.CLERK_WEBHOOK_SIGNING_SECRET?.trim() || '',
    };
}

/**
 * Idempotently ensures the local-first dev backend is up, configured, and seeded:
 *   1. If `/instance_name` is already healthy, skip the boot.
 *   2. Otherwise spawn the `test-convex start` daemon DETACHED (the CLI blocks, so `pnpm dev` cannot
 *      run it foreground) and poll until healthy.
 *   3. Read the admin key marker, set the server secret + auth placeholders on the backend.
 *   4. Push the functions (with retry — this bakes the per-run auth env, so it always runs).
 *   5. Skip the canonical seed when the tenant already resolves (a restored, pre-seeded state dir — the
 *      CI bootstrap cache); otherwise run it (idempotent — a no-op when the shop already exists).
 *
 * @param opts.timeoutMs - Health-poll budget (default 120s; covers a first-run binary download).
 * @returns The backend URL once it is healthy and seeded.
 * @throws {Error} When the backend never becomes healthy within the budget.
 */
export async function ensureLocalConvex(opts: { timeoutMs?: number } = {}): Promise<string> {
    const { url, dataDir, serverSecret } = DEV_LOCAL;
    const adminKeyFile = resolve(dataDir, '.admin-key');

    if (!(await isBackendHealthy(url))) {
        // Detached so the daemon outlives this orchestration process and `pnpm dev` continues.
        // Re-use the parent interpreter's loader flags (e.g. tsx in dev) and the sibling cli's
        // extension so the detached daemon runs exactly the way this orchestration does.
        const here = fileURLToPath(import.meta.url);
        const cliEntry = resolve(dirname(here), here.endsWith('.ts') ? 'cli.ts' : 'cli.js');
        const child = spawn(
            process.execPath,
            [...process.execArgv, cliEntry, 'start', '--dataDir', dataDir, '--port', String(DEV_LOCAL.port)],
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

    const adminKey = await waitForAdminKeyMarker(adminKeyFile);

    const backendAuth = resolveBackendAuthEnv();
    convexEnvSet(url, adminKey, 'CONVEX_SERVER_SECRET', serverSecret);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_ISSUER', backendAuth.issuer);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_APPLICATION_ID', backendAuth.applicationId);
    convexEnvSet(url, adminKey, 'CONVEX_AUTH_JWKS_URL', backendAuth.jwksUrl);

    // Clerk operator-token validation: the admin e2e mints Clerk `convex`-template tokens the backend
    // must verify, so set the Frontend API origin the native Clerk provider discovers its JWKS from.
    // ALWAYS set it (even to empty) because `auth.config.ts` REFERENCES the var and `convex dev`'s push
    // hard-errors on a referenced-but-unset env var; an empty value fails operator tokens closed (the
    // provider then matches no token, exactly like the unreachable customJwt placeholders) — the right
    // posture for unit/integration backends that mint no Clerk token. The webhook secret is set only when
    // present, since `auth.config.ts` does not reference it (only the webhook httpAction reads it).
    const clerkAuth = resolveClerkBackendEnv();
    convexEnvSet(url, adminKey, 'CLERK_FRONTEND_API_URL', clerkAuth.frontendApiUrl);
    // The prod Clerk provider in `auth.config.ts` references CLERK_FRONTEND_API_URL_PROD, so set it too
    // (empty on CI/unit backends — the prod provider then matches no token) or the push hard-errors on
    // the referenced-but-unset var.
    convexEnvSet(url, adminKey, 'CLERK_FRONTEND_API_URL_PROD', clerkAuth.frontendApiUrlProd);
    if (clerkAuth.webhookSigningSecret) {
        convexEnvSet(url, adminKey, 'CLERK_WEBHOOK_SIGNING_SECRET', clerkAuth.webhookSigningSecret);
    }

    // Always push, even when reusing a cached state dir: auth.config.ts captures CONVEX_AUTH_* and the
    // Clerk Frontend API URL only at push time (admin e2e overrides the issuer/JWKS and Clerk origin per
    // run), and the daemon's own continuous push failed before the env was set and does not retry on an
    // env change. Retried because the backend's wait_for_schema endpoint intermittently 500s while a
    // deployment settles; cheap when the restored state already carries the matching modules. This is the
    // flaky-but-necessary step the seed is not.
    await withRetry(() => convexDevOnce(url, adminKey), { label: 'convex dev --once (function push)' });

    // Skip the (expensive) canonical seed when the tenant already resolves — a restored, pre-seeded
    // state dir (the CI bootstrap-cache reuse) needs no rebuild, and the re-push above preserves its
    // data. The probe resolves through the same server-tier seam the seed targets, so an empty/partial
    // cache reports unseeded and falls through to the full seed. The live runner reads
    // CONVEX_SERVER_SECRET (server-tier) and the self-hosted admin key for the CMS imports.
    process.env.CONVEX_SERVER_SECRET = serverSecret;
    process.env.CONVEX_SELF_HOSTED_URL = url;
    process.env.CONVEX_SELF_HOSTED_ADMIN_KEY = adminKey;
    if (await isCanonicalSeeded(url, serverSecret)) {
        console.info('[test-convex] canonical tenant already present; reusing seeded data (skipping seed)');
        return url;
    }

    const { seedCanonical } = await import('./seed/canonical');
    await seedCanonical(url);

    return url;
}

/**
 * Pushes the project's functions to the already-running local backend via a one-shot
 * `convex dev --once`. Run AFTER the deployment env is set: a fresh anonymous backend has no env,
 * so the daemon's initial continuous push fails auth.config.ts validation and does not retry on a
 * later `convex env set`. This synchronous push deploys the functions once the auth env exists, so
 * the seed's db/shops:byDomain probe resolves.
 *
 * @param url - Local deployment URL.
 * @param adminKey - The daemon's admin key.
 * @throws {Error} When the push exits non-zero.
 */
export function convexDevOnce(url: string, adminKey: string): void {
    const result = spawnSync(process.execPath, [resolveConvexBin(), 'dev', '--once'], {
        cwd: resolveConvexProjectDir(),
        encoding: 'utf8',
        env: convexLocalCliEnv(url, adminKey),
    });
    if (result.status !== 0) {
        throw new Error(
            `[test-convex] convex dev --once (function push) failed: ${(result.stderr ?? '').slice(-1500)}`,
        );
    }
}
