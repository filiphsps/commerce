import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';

import { resolveConvexProjectDir, type StartedConvex, startConvex } from '../start';

const requireFromHere = createRequire(import.meta.url);

/**
 * The trusted issuer the limits suites seed onto their OWN ephemeral deployment. Arbitrary but must
 * match {@link OPERATOR_IDENTITY}'s `issuer` exactly: `lib/auth.ts`'s `getTrustedIdentity` re-asserts
 * it as the forged-identity defense, and the acting-as identity below is what the tenant tier sees.
 */
export const LIMITS_ISSUER = 'https://limits.test';

/**
 * The acting-as operator identity every tenant-tier call in the limits suites runs under. Applied via
 * the admin-key `setAdminAuth(adminKey, identity)` transport (the same act-as mechanism the Convex CLI
 * and dashboard use), which makes the REAL backend's `ctx.auth.getUserIdentity()` return exactly these
 * claims — so `resolveAdminShopId`'s identity → `users.by_email` → `shopCollaborators` chain runs for
 * real, without standing up the full RS256 JWKS mint.
 */
export const OPERATOR_IDENTITY = {
    issuer: LIMITS_ISSUER,
    subject: 'limits-operator',
    tokenIdentifier: `${LIMITS_ISSUER}|limits-operator`,
    email: 'limits-operator@example.com',
} as const;

/** Tenant-tier editor save — the autosave path (`cms/documents.ts`'s `save`). */
export const saveRef = makeFunctionReference<'mutation'>('cms/documents:save');
/** Tenant-tier live-document read (`cms/documents.ts`'s `get`). */
export const documentGetRef = makeFunctionReference<'query'>('cms/documents:get');
/** Tenant-tier budgeted admin list (`cms/list.ts`'s `list`). */
export const listRef = makeFunctionReference<'query'>('cms/list:list');
/** Tenant-tier version-history list (`cms/versions.ts`'s `list`). */
export const versionsListRef = makeFunctionReference<'query'>('cms/versions:list');
/** Server-tier storefront singleton read (`cms/read.ts`'s `singleton`). */
export const singletonRef = makeFunctionReference<'query'>('cms/read:singleton');
/** Server-tier storefront article-by-slug read (`cms/read.ts`'s `articleBySlug`). */
export const articleBySlugRef = makeFunctionReference<'query'>('cms/read:articleBySlug');
/** Server-tier platform-user insert (`db/users.ts`'s `create`). */
export const userCreateRef = makeFunctionReference<'mutation'>('db/users:create');
/** Server-tier atomic shop upsert (`db/shop_write.ts`'s `upsertShop`). */
export const upsertShopRef = makeFunctionReference<'mutation'>('db/shop_write:upsertShop');

/**
 * A booted, deployed, secret-seeded local Convex backend the limits suites run against, plus the
 * handles needed to call it from a test: the deployment coordinates, the server-tier shared secret,
 * and a `stop()` that tears the whole process group down.
 */
export interface LiveConvex {
    /** Deployment URL (`http://127.0.0.1:<port>`). */
    url: string;
    /** Admin key minted for the ephemeral deployment; authenticates the act-as transport and the CLI. */
    adminKey: string;
    /** The `CONVEX_SERVER_SECRET` value seeded onto the deployment for the server tier. */
    serverSecret: string;
    /** Stops the backend and wipes its ephemeral state directory. */
    stop: () => Promise<void>;
}

/**
 * Resolves the bundled `convex` CLI entry point, mirroring `start.ts`'s resolution (the bin path is
 * not in the package `exports` map, so it is resolved relative to `convex/package.json`).
 *
 * @returns Absolute path to `convex/bin/main.js`.
 */
function resolveConvexBin(): string {
    return resolve(dirname(requireFromHere.resolve('convex/package.json')), 'bin', 'main.js');
}

/**
 * Runs one bundled-Convex-CLI command against a self-hosted deployment, blocking until it exits.
 * The self-hosted env pair (`CONVEX_SELF_HOSTED_URL`/`..._ADMIN_KEY`) pins the CLI to the ephemeral
 * backend, and the cloud selectors are blanked for the same dotenv-shadowing reason `start.ts`
 * documents — otherwise `packages/convex/.env.local`'s `CONVEX_DEPLOYMENT` would win.
 *
 * A freshly booted backend occasionally rejects its first admin commands with a transient 503
 * (`OptimisticConcurrencyControlFailure` on its internal bootstrap tables), so non-zero exits whose
 * output matches a transient signature are retried a bounded number of times. Every command the
 * suites issue (`env set`, `deploy`, `run`) is idempotent against the same input, so a blind
 * resubmission is safe.
 *
 * @param live - The backend to target.
 * @param args - CLI argv after the `convex` binary (e.g. `['env', 'set', 'KEY', 'value']`).
 * @returns The CLI's stdout.
 * @throws {ConvexError} When the CLI exits non-zero past the transient-retry budget.
 */
export function runConvexCli(live: Pick<LiveConvex, 'url' | 'adminKey'>, args: string[]): string {
    const TRANSIENT =
        /503|500 Internal Server Error|InternalServerError|Unable to wait for schema|OptimisticConcurrencyControlFailure|ECONNRESET|ECONNREFUSED|socket hang up/i;
    const ATTEMPTS = 5;
    let lastFailure = '';
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        const result = spawnSync(process.execPath, [resolveConvexBin(), ...args], {
            cwd: resolveConvexProjectDir(),
            encoding: 'utf8',
            env: {
                ...process.env,
                CONVEX_SELF_HOSTED_URL: live.url,
                CONVEX_SELF_HOSTED_ADMIN_KEY: live.adminKey,
                CONVEX_DEPLOYMENT: '',
                CONVEX_DEPLOY_KEY: '',
                // CI exports CONVEX_AGENT_MODE=anonymous for its own ephemeral deploy; left
                // ambient it can re-route this CLI away from the self-hosted pair, so env
                // sets/deploys land on a DIFFERENT deployment than the one the tests call.
                CONVEX_AGENT_MODE: '',
            },
        });
        if (result.status === 0) {
            return result.stdout ?? '';
        }
        lastFailure =
            `[test-convex/limits] convex ${args.join(' ')} exited ${result.status}: ` +
            `${(result.stdout ?? '').slice(-2000)}\n${(result.stderr ?? '').slice(-2000)}`;
        if (attempt < ATTEMPTS && TRANSIENT.test(lastFailure)) {
            // Synchronous back-off keeps the helper's blocking contract (callers run in hooks).
            // Linear-growth waits (3s/6s/9s/12s) because the dominant transient is a freshly
            // booted backend still warming on a cold CI runner, not a momentary blip.
            spawnSync(process.execPath, ['-e', `setTimeout(() => {}, ${attempt * 3_000})`]);
            continue;
        }
        break;
    }
    throw new ConvexError(lastFailure);
}

/**
 * Boots an ephemeral local Convex backend and makes it fully callable: seeds the deployment env vars
 * `auth.config.ts` validates (issuer/application-id/JWKS, pointing at the inert {@link LIMITS_ISSUER})
 * plus a fresh random `CONVEX_SERVER_SECRET`, then runs a one-shot `convex deploy` so the function
 * push passes the env validation that the launcher's initial watch-mode push intentionally fails
 * (the same two-phase shape ci.yml's Convex job uses).
 *
 * @returns The deployed {@link LiveConvex} handle.
 * @throws {ConvexError} When the backend fails to boot or any CLI phase exits non-zero.
 */
export async function startLiveConvex(): Promise<LiveConvex> {
    const backend: StartedConvex = await startConvex();
    const serverSecret = crypto.randomUUID();

    /** The deployment env the suites require; deploy fails closed on any one missing. */
    const requiredEnv: readonly (readonly [key: string, value: string])[] = [
        ['CONVEX_AUTH_ISSUER', LIMITS_ISSUER],
        ['CONVEX_AUTH_APPLICATION_ID', 'convex'],
        ['CONVEX_AUTH_JWKS_URL', `${LIMITS_ISSUER}/.well-known/jwks.json`],
        ['CONVEX_SERVER_SECRET', serverSecret],
    ];

    /**
     * Seeds the required env then reads `env list` back and re-sets anything missing. A freshly
     * booted backend on a cold CI runner intermittently drops early `env set` writes (exit 0,
     * value not persisted), which otherwise surfaces minutes later as the deploy's "used in auth
     * config file but its value was not set" or an opaque FORGED_IDENTITY inside a test.
     *
     * @throws {ConvexError} When a variable still fails to read back after a corrective re-set.
     */
    const seedEnv = (): void => {
        for (const [key, value] of requiredEnv) runConvexCli(backend, ['env', 'set', key, value]);
        for (const [key, value] of requiredEnv) {
            // `env get` echoes the VALUE — a key-only presence check missed the case where the
            // write landed on the wrong deployment or persisted a stale value.
            if (runConvexCli(backend, ['env', 'get', key]).includes(value)) continue;
            runConvexCli(backend, ['env', 'set', key, value]);
            if (!runConvexCli(backend, ['env', 'get', key]).includes(value)) {
                throw new ConvexError(
                    `[test-convex/limits] ${key} failed to seed onto the ephemeral backend; refusing to run suites against an unconfigured deployment.`,
                );
            }
        }
    };

    try {
        seedEnv();
        try {
            runConvexCli(backend, ['deploy', '--yes', '--typecheck', 'disable', '--codegen', 'disable']);
        } catch (deployError) {
            // A deploy rejected for MISSING env is persistent — the inner CLI retry cannot heal
            // it. One full re-seed + re-deploy covers the dropped-write boot race; anything else
            // re-throws.
            if (!String(deployError).includes('value was not set')) throw deployError;
            seedEnv();
            runConvexCli(backend, ['deploy', '--yes', '--typecheck', 'disable', '--codegen', 'disable']);
        }
    } catch (err) {
        await backend.stop();
        throw err;
    }
    return { url: backend.url, adminKey: backend.adminKey, serverSecret, stop: backend.stop };
}

/**
 * Bulk-inserts rows into one table through `convex import --format jsonLines --append` — the
 * sanctioned admin-key seeding path for data no deployed mutation writes (e.g. `cms_i18n` side rows,
 * whose only production writer is the ETL). Rows are schema-validated by the import, so a drifted
 * fixture fails loud.
 *
 * @param live - The backend to import into.
 * @param table - The target table name.
 * @param rows - Plain JSON rows (foreign keys as id strings).
 */
export function importRows(live: LiveConvex, table: string, rows: readonly Record<string, unknown>[]): void {
    const dir = mkdtempSync(join(tmpdir(), 'convex-limits-import-'));
    const file = join(dir, `${table}.jsonl`);
    try {
        writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n'));
        runConvexCli(live, ['import', '--table', table, '--format', 'jsonLines', '--append', '-y', file]);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * The narrow act-as surface of `ConvexHttpClient.setAdminAuth`. The method exists at runtime but is
 * `@internal` (stripped from the published typings), so the operator-client constructor goes through
 * this structural type instead of an unchecked `any`.
 */
type AdminAuthClient = {
    setAdminAuth: (adminKey: string, actingAsIdentity?: Record<string, unknown>) => void;
};

/**
 * Builds a server-tier client whose calls carry no identity; pair with the `serverSecret` argument on
 * `serverQuery`/`serverMutation` functions.
 *
 * @param live - The backend to connect to.
 * @returns A fresh `ConvexHttpClient` for the deployment.
 */
export function createServerClient(live: LiveConvex): ConvexHttpClient {
    return new ConvexHttpClient(live.url);
}

/**
 * Builds a tenant-tier client acting as {@link OPERATOR_IDENTITY} via admin-key act-as. Each call to
 * this returns an INDEPENDENT client: `ConvexHttpClient` serializes its own mutation queue, so
 * concurrency tests must hold one client per simulated editor.
 *
 * @param live - The backend to connect to.
 * @returns A `ConvexHttpClient` whose requests resolve the operator's tenant on the server.
 */
export function createOperatorClient(live: LiveConvex): ConvexHttpClient {
    const client = new ConvexHttpClient(live.url);
    (client as unknown as AdminAuthClient).setAdminAuth(live.adminKey, { ...OPERATOR_IDENTITY });
    return client;
}

/**
 * The provisioned single-shop tenant the limits suites operate on: the Convex shop id (`shops._id`
 * as a string, the value imported rows reference) and the PUBLIC shop id the server-tier read
 * functions take (`legacyId`, minted as the row's own id on insert).
 */
export interface LimitsTenant {
    /** The `shops` document id string — the foreign key value for imported tenant rows. */
    shopDocId: string;
    /** The public shop id (`legacyId`) the `cms/read` server queries resolve scope from. */
    publicShopId: string;
}

/**
 * Provisions the canonical limits tenant on a fresh backend: one platform user for
 * {@link OPERATOR_IDENTITY}'s email and one shop with that user as its single collaborator, so
 * `resolveAdminShopId` resolves exactly this shop for every tenant-tier call.
 *
 * @param live - The backend to provision.
 * @returns The provisioned {@link LimitsTenant} ids.
 * @throws {ConvexError} When a seam write returns an unusable shape.
 */
export async function provisionTenant(live: LiveConvex): Promise<LimitsTenant> {
    const server = createServerClient(live);
    const user = (await server.mutation(userCreateRef, {
        serverSecret: live.serverSecret,
        email: OPERATOR_IDENTITY.email,
        name: 'Limits Operator',
        emailVerified: null,
        identities: [],
    })) as { _id: string };

    const view = (await server.mutation(upsertShopRef, {
        serverSecret: live.serverSecret,
        shop: {
            name: 'Limits Shop',
            domain: 'limits.example.com',
            design: {
                header: { logo: { width: 175, height: 60, src: 'https://placehold.co/175x60.png', alt: 'Limits' } },
                accents: [{ type: 'primary', color: '#0a0a0a', foreground: '#fafafa' }],
            },
            commerceProvider: {
                type: 'shopify',
                id: 'limits',
                domain: 'limits.myshopify.com',
                storefrontId: 'gid://shopify/Shop/1',
                authentication: { publicToken: 'limits-public-token' },
            },
            i18n: { defaultLocale: 'en-US' },
        },
        collaborators: [{ user: user._id, permissions: ['admin'] }],
    })) as { shop: { _id: string; legacyId: string } } | null;

    if (!view) {
        throw new ConvexError('[test-convex/limits] upsertShop returned null while provisioning the tenant.');
    }
    return { shopDocId: view.shop._id, publicShopId: view.shop.legacyId };
}

/**
 * Deterministic, key-sorted JSON serialization — the byte-identity yardstick for the golden
 * round-trip assertions. Convex normalizes object key order in storage, so a naive
 * `JSON.stringify` comparison of saved-vs-read values would flake on key order while the values are
 * identical; sorting keys on BOTH sides makes "byte-identical" well-defined.
 *
 * @param value - Any JSON-serializable value.
 * @returns The canonical serialization.
 */
export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
    }
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}
