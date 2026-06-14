import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';

import { resolveConvexProjectDir } from '../start';
import type { SeedCanonicalOptions } from './canonical';
import { articleFixtures } from './fixtures/articles';
import { businessDataFixture } from './fixtures/business-data';
import { collectionMetadataFixtures } from './fixtures/collection-metadata';
import { featureFlagFixtures } from './fixtures/feature-flags';
import { footerData } from './fixtures/footer';
import { headerData } from './fixtures/header';
import { pageFixtures } from './fixtures/pages';
import { productMetadataFixtures } from './fixtures/product-metadata';
import { buildCanonicalShopFixture } from './fixtures/shop';

const requireFromHere = createRequire(import.meta.url);

/** Hostname → shop server query (`db/shops.ts`'s `byDomain`) — the canonical-shop idempotency probe. */
export const shopByDomainRef = makeFunctionReference<'query'>('db/shops:byDomain');
/** Atomic shop upsert (`db/shop_write.ts`'s `upsertShop`) — the deployed shop-phase writer. */
export const shopUpsertRef = makeFunctionReference<'mutation'>('db/shop_write:upsertShop');
/** Key → flag server query (`db/feature_flags.ts`'s `byKey`) — resolves deployment-issued flag ids. */
export const featureFlagByKeyRef = makeFunctionReference<'query'>('db/feature_flags:byKey');
/** Domain verification writer (`db/shop_domain_write.ts`) — stamps seeded domain statuses. */
export const setDomainVerificationRef = makeFunctionReference<'mutation'>('db/shop_domain_write:setDomainVerification');

/** The narrow `byDomain` result surface the live seed consumes (the wire erases the branded ids). */
type LiveShopView = { shop: { _id: string; legacyId: string } } | null;

/**
 * Reads the server-tier shared secret the deployed `serverQuery`/`serverMutation` seam demands.
 * The live seed deliberately authenticates as the SERVER TIER (the same identity-less seam the
 * storefront middleware uses) rather than via admin-key act-as, so it works against both the
 * test-convex launcher backend and a configured cloud dev deployment.
 *
 * @returns The `CONVEX_SERVER_SECRET` value.
 * @throws {ConvexError} When the variable is unset — seeding silently against a closed server tier
 *   would otherwise surface as an opaque `SERVER_SECRET_UNCONFIGURED` from the deployment.
 */
function requireServerSecret(): string {
    const secret = process.env.CONVEX_SERVER_SECRET;
    if (!secret) {
        throw new ConvexError(
            '@nordcom/commerce-test-convex: CONVEX_SERVER_SECRET must be set to the value configured on the target deployment before running the live canonical seed.',
        );
    }
    return secret;
}

/**
 * Builds the environment for one bundled-Convex-CLI invocation against the seed's target
 * deployment, selecting whichever credential the caller holds: the self-hosted admin-key pair
 * (test-convex launcher backends; `cli.ts seed` exports it) wins, else a `CONVEX_DEPLOY_KEY`
 * (cloud dev deployments; the root `.env.local` carries it). The unused selector family — plus
 * `CONVEX_DEPLOYMENT`, which `packages/convex/.env.local` would otherwise dotenv-shadow onto the
 * wrong deployment — is blanked, mirroring `limits/live.ts`'s `runConvexCli` (which is admin-key
 * only and therefore not reusable here).
 *
 * @param url - Deployment URL the CLI must target.
 * @param env - Source environment (injectable for unit tests).
 * @returns The child-process environment.
 * @throws {ConvexError} When neither credential is present.
 */
export function buildSeedCliEnv(url: string, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    if (env.CONVEX_SELF_HOSTED_ADMIN_KEY) {
        return { ...env, CONVEX_SELF_HOSTED_URL: url, CONVEX_DEPLOYMENT: '', CONVEX_DEPLOY_KEY: '' };
    }
    if (env.CONVEX_DEPLOY_KEY) {
        return { ...env, CONVEX_SELF_HOSTED_URL: '', CONVEX_SELF_HOSTED_ADMIN_KEY: '', CONVEX_DEPLOYMENT: '' };
    }
    throw new ConvexError(
        '@nordcom/commerce-test-convex: the live canonical seed needs CONVEX_SELF_HOSTED_ADMIN_KEY (launcher backend) or CONVEX_DEPLOY_KEY (cloud deployment) to import CMS fixture rows.',
    );
}

/**
 * Resolves the bundled `convex` CLI entry point relative to `convex/package.json` (the bin path is
 * not in the package `exports` map).
 *
 * @returns Absolute path to `convex/bin/main.js`.
 */
function resolveConvexBin(): string {
    return resolve(dirname(requireFromHere.resolve('convex/package.json')), 'bin', 'main.js');
}

/**
 * Runs one bundled-Convex-CLI command against the seed's target deployment, blocking until it
 * exits. Non-zero exits whose output matches a transient signature (a freshly booted backend's
 * bootstrap 503s) are retried a bounded number of times; every command the seed issues is
 * idempotent against the same input, so a blind resubmission is safe.
 *
 * @param url - Deployment URL to target.
 * @param args - CLI argv after the `convex` binary.
 * @returns The CLI's stdout.
 * @throws {ConvexError} When the CLI exits non-zero past the transient-retry budget.
 */
export function runSeedCli(url: string, args: string[]): string {
    const TRANSIENT = /503|OptimisticConcurrencyControlFailure|ECONNRESET|ECONNREFUSED|socket hang up/i;
    const ATTEMPTS = 3;
    const env = buildSeedCliEnv(url);
    let lastFailure = '';
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        const result = spawnSync(process.execPath, [resolveConvexBin(), ...args], {
            cwd: resolveConvexProjectDir(),
            encoding: 'utf8',
            env,
        });
        if (result.status === 0) {
            return result.stdout ?? '';
        }
        lastFailure =
            `[test-convex/seed] convex ${args.join(' ')} exited ${result.status}: ` +
            `${(result.stdout ?? '').slice(-2000)}\n${(result.stderr ?? '').slice(-2000)}`;
        if (attempt < ATTEMPTS && TRANSIENT.test(lastFailure)) {
            // Synchronous back-off keeps the helper's blocking contract.
            spawnSync(process.execPath, ['-e', `setTimeout(() => {}, ${attempt * 1_000})`]);
            continue;
        }
        break;
    }
    throw new ConvexError(lastFailure);
}

/**
 * Bulk-inserts rows into one table through `convex import --format jsonLines --append` — the
 * sanctioned admin-key/deploy-key path for the Convex-native CMS tables, which deliberately have no
 * deployed public writer (they are read-shadow targets; their only production writer is the ETL).
 * Rows are schema-validated by the import, so a drifted fixture fails loud.
 *
 * @param url - Deployment URL to import into.
 * @param table - The target table name.
 * @param rows - Plain JSON rows (foreign keys as id strings).
 */
export function importSeedRows(url: string, table: string, rows: readonly Record<string, unknown>[]): void {
    if (rows.length === 0) return;
    const dir = mkdtempSync(join(tmpdir(), 'convex-canonical-seed-'));
    const file = join(dir, `${table}.jsonl`);
    try {
        writeFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n'));
        runSeedCli(url, ['import', '--table', table, '--format', 'jsonLines', '--append', '-y', file]);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * Seeds the platform-global `featureFlags` rows (per-key idempotent: a flag another tenant already
 * seeded is reused, never duplicated) and links every flag to the shop via `shopFeatureFlags`. The
 * join rows are appended without a per-row probe because the caller only runs this phase for a
 * freshly created shop, which cannot yet hold links.
 *
 * @param client - Server-tier client for the target deployment.
 * @param url - Deployment URL (for the CLI import phase).
 * @param serverSecret - The deployment's server-tier shared secret.
 * @param shopId - The freshly created `shops` document id string.
 * @param now - Timestamp to stamp onto inserted flag rows.
 * @throws {ConvexError} When a flag row cannot be read back after import.
 */
async function seedFeatureFlagsLive(
    client: ConvexHttpClient,
    url: string,
    serverSecret: string,
    shopId: string,
    now: number,
): Promise<void> {
    const missing = [];
    for (const flag of featureFlagFixtures) {
        const row = (await client.query(featureFlagByKeyRef, { serverSecret, key: flag.key })) as {
            _id: string;
        } | null;
        if (!row) missing.push({ ...flag, createdAt: now, updatedAt: now });
    }
    importSeedRows(url, 'featureFlags', missing);

    const links: { shop: string; flag: string }[] = [];
    for (const flag of featureFlagFixtures) {
        const row = (await client.query(featureFlagByKeyRef, { serverSecret, key: flag.key })) as {
            _id: string;
        } | null;
        if (!row) {
            throw new ConvexError(
                `@nordcom/commerce-test-convex: feature flag "${flag.key}" is still missing after the seed import.`,
            );
        }
        links.push({ shop: shopId, flag: row._id });
    }
    importSeedRows(url, 'shopFeatureFlags', links);
}

/**
 * The HARNESS-07 live mutation runner behind {@link seedCanonical}: seeds a RUNNING deployment with
 * the canonical tenant by composing the deployed server-tier seam (shop phase) with schema-validated
 * CLI imports (CMS phase), since `seedCanonicalMutation` only runs inside a Convex mutation context.
 *
 * Idempotency is keyed on the canonical primary domain through `db/shops:byDomain` — the SAME seam
 * the storefront middleware resolves tenants through, so a hit also proves the app under e2e can
 * route. When the shop already exists the run is a single query and the CMS corpus is treated as
 * present (the orchestrator is the only writer of these fixtures on test deployments); only a fresh
 * shop triggers the import phase, so re-runs cannot append duplicate fixture rows.
 *
 * @param url - Deployment URL to seed.
 * @param opts - Optional domain/name overrides forwarded to the shop fixture.
 * @returns The canonical `shops` document id as a plain string.
 * @throws {ConvexError} When `CONVEX_SERVER_SECRET` is unset, no CLI credential is available for a
 *   fresh seed, or the deployed shop upsert returns an unusable shape.
 */
export async function seedCanonicalLive(url: string, opts: SeedCanonicalOptions = {}): Promise<string> {
    const serverSecret = requireServerSecret();
    const client = new ConvexHttpClient(url);
    const fixture = buildCanonicalShopFixture(opts);

    const existing = (await client.query(shopByDomainRef, {
        serverSecret,
        domain: fixture.shop.domain,
    })) as LiveShopView;
    if (existing) return existing.shop._id;

    const { legacyId, ...shop } = fixture.shop;
    const view = (await client.mutation(shopUpsertRef, {
        serverSecret,
        legacyId,
        upsert: true,
        shop,
        credentials: fixture.credentials,
    })) as LiveShopView;
    if (!view) {
        throw new ConvexError(
            '@nordcom/commerce-test-convex: db/shop_write:upsertShop returned null while seeding the canonical shop.',
        );
    }
    const shopId = view.shop._id;

    // Stamp the seeded domain verification states. upsertShop's reconcile inserts each domain row as
    // `pending`; this flips the canonical set to its intended statuses through the shipped mutation.
    const { CANONICAL_DOMAIN_STATUSES } = await import('./fixtures/shop');
    for (const entry of CANONICAL_DOMAIN_STATUSES) {
        await client.mutation(setDomainVerificationRef, {
            serverSecret,
            domain: entry.domain,
            status: entry.status,
            ...(entry.via ? { via: entry.via } : {}),
        });
    }

    const now = Date.now();
    const stamp = { createdAt: now, updatedAt: now };
    importSeedRows(url, 'header', [{ shop: shopId, ...headerData, ...stamp }]);
    importSeedRows(url, 'footer', [{ shop: shopId, ...footerData, ...stamp }]);
    importSeedRows(url, 'businessData', [{ shop: shopId, ...businessDataFixture, ...stamp }]);
    importSeedRows(
        url,
        'pages',
        pageFixtures.map((page) => ({ shop: shopId, ...page, ...stamp })),
    );
    // The flipped CMS cohorts also land as live `cmsDocuments` rows — the editor-model table the
    // default-flipped storefront getters read (`cms/read.ts`); the pointerless published shape
    // serves its own `data` as the published content. CUTOVER-04: header + pages; CUTOVER-05:
    // articles (by slug) + the metadata overlays (by Shopify handle); CUTOVER-06: the footer and
    // businessData singletons. Mirrors `seedCmsMutation`'s cohort blocks.
    importSeedRows(url, 'cmsDocuments', [
        { shopId, collection: 'header', data: { ...headerData }, status: 'published', ...stamp },
        { shopId, collection: 'footer', data: { ...footerData }, status: 'published', ...stamp },
        { shopId, collection: 'businessData', data: { ...businessDataFixture }, status: 'published', ...stamp },
        ...pageFixtures.map((page) => ({
            shopId,
            collection: 'pages',
            data: { ...page },
            status: 'published',
            ...stamp,
        })),
        ...articleFixtures.map((article) => ({
            shopId,
            collection: 'articles',
            data: { ...article },
            status: 'published',
            ...stamp,
        })),
        ...productMetadataFixtures.map((overlay) => ({
            shopId,
            collection: 'productMetadata',
            data: { ...overlay },
            status: 'published',
            ...stamp,
        })),
        ...collectionMetadataFixtures.map((overlay) => ({
            shopId,
            collection: 'collectionMetadata',
            data: { ...overlay },
            status: 'published',
            ...stamp,
        })),
    ]);
    importSeedRows(
        url,
        'articles',
        articleFixtures.map((article) => ({ shop: shopId, ...article, ...stamp })),
    );
    importSeedRows(
        url,
        'productMetadata',
        productMetadataFixtures.map((row) => ({ shop: shopId, ...row, ...stamp })),
    );
    importSeedRows(
        url,
        'collectionMetadata',
        collectionMetadataFixtures.map((row) => ({ shop: shopId, ...row, ...stamp })),
    );
    await seedFeatureFlagsLive(client, url, serverSecret, shopId, now);

    // Collaborators: import the users + standalone identities, then link them (with a session each)
    // to the shop. The link rides through `upsertShop`'s `(shop, user)`-idempotent collaborator sync.
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
    const usersByEmailRef = makeFunctionReference<'query'>('db/users:byEmail');
    const collaboratorLinks: { user: string; permissions: string[] }[] = [];
    for (const c of collaboratorFixtures) {
        const u = (await client.query(usersByEmailRef, { serverSecret, email: c.user.email })) as {
            _id: string;
        } | null;
        if (!u) {
            throw new ConvexError(`@nordcom/commerce-test-convex: seeded user ${c.user.email} not found after import.`);
        }
        importSeedRows(url, 'sessions', [
            { user: u._id, token: c.session.token, expiresAt: c.session.expiresAt, createdAt: now, updatedAt: now },
        ]);
        collaboratorLinks.push({ user: u._id, permissions: c.permissions });
    }
    await client.mutation(shopUpsertRef, {
        serverSecret,
        legacyId,
        upsert: true,
        shop,
        collaborators: collaboratorLinks,
    });

    // Reviews + media for the advanced shop.
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

    // Minimal second tenant — a distinct legacyId + single domain so multi-tenant routing is exercised.
    const minimal = buildCanonicalShopFixture({
        domain: 'minimal-demo.com',
        name: 'Minimal Demo',
        legacyId: 'b1b2c3d4e5f6b1b2c3d4e5f6',
        alternativeDomains: [],
    });
    const minimalExisting = (await client.query(shopByDomainRef, {
        serverSecret,
        domain: 'minimal-demo.com',
    })) as LiveShopView;
    if (!minimalExisting) {
        const { legacyId: minimalLegacyId, ...minimalShop } = minimal.shop;
        await client.mutation(shopUpsertRef, {
            serverSecret,
            legacyId: minimalLegacyId,
            upsert: true,
            shop: minimalShop,
            credentials: minimal.credentials,
        });
    }

    return shopId;
}
