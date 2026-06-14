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
export function convexLocalCliEnv(
    url: string,
    adminKey: string,
    env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
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
