import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedCanonical } from '../seed/canonical';
import { featureFlagFixtures } from '../seed/fixtures/feature-flags';
import { pageFixtures } from '../seed/fixtures/pages';
import { DEFAULT_SHOP_DOMAIN, DEFAULT_SHOP_LEGACY_ID } from '../seed/fixtures/shop';
import { featureFlagByKeyRef, shopByDomainRef } from '../seed/live';
import { createServerClient, type LiveConvex, runConvexCli, startLiveConvex } from './live';

/**
 * HARNESS-07 live-seed suite — REAL local backend only. Proves the over-the-wire canonical seed the
 * e2e global-setups depend on: a fresh deployment gets the full canonical tenant (shop row routable
 * via the same `db/shops:byDomain` seam the storefront middleware uses, CMS corpus imported, flags
 * linked), and a second run is a pure-read no-op that returns the same shop id without appending
 * duplicate fixture rows. Gated behind `CONVEX_LIMITS_TESTS=1`; 300s boot hook, 300s test (the
 * fresh-seed path shells one `convex import` per fixture table).
 */
const limitsSuite = process.env.CONVEX_LIMITS_TESTS === '1' ? describe : describe.skip;

/**
 * Counts a table's rows on the live backend through `convex data` (admin-key CLI), the only reader
 * for the Convex-native CMS tables, which expose no deployed query. The CLI prints one row per
 * line with no header for non-empty tables.
 *
 * @param live - The backend to inspect.
 * @param table - The table to count.
 * @returns The number of stored rows.
 */
function countRows(live: LiveConvex, table: string): number {
    const stdout = runConvexCli(live, ['data', table, '--limit', '1000']);
    return stdout.split('\n').filter((line) => line.trim().length > 0 && !/^\s*_id\b|^[-| ]+$/.test(line)).length;
}

limitsSuite('canonical seed: live runner seeds a fresh deployment and re-runs as a no-op', () => {
    let live: LiveConvex;
    const previousEnv: Record<string, string | undefined> = {};

    beforeAll(async () => {
        live = await startLiveConvex();
        // The live runner authenticates as the server tier and shells the CLI with the launcher's
        // admin key — expose both exactly like `cli.ts seed` / the e2e environment would.
        for (const key of ['CONVEX_SERVER_SECRET', 'CONVEX_SELF_HOSTED_ADMIN_KEY', 'CONVEX_DEPLOY_KEY']) {
            previousEnv[key] = process.env[key];
        }
        process.env.CONVEX_SERVER_SECRET = live.serverSecret;
        process.env.CONVEX_SELF_HOSTED_ADMIN_KEY = live.adminKey;
        delete process.env.CONVEX_DEPLOY_KEY;
    }, 300_000);

    afterAll(async () => {
        for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        await live?.stop();
    }, 60_000);

    it('seeds shop + CMS corpus + flags, resolves via byDomain, and double-runs without duplicates', async () => {
        const shopId = await seedCanonical(live.url);

        const view = (await createServerClient(live).query(shopByDomainRef, {
            serverSecret: live.serverSecret,
            domain: DEFAULT_SHOP_DOMAIN,
        })) as { shop: { _id: string; legacyId: string }; flags: unknown } | null;
        expect(view).not.toBeNull();
        expect(view?.shop._id).toBe(shopId);
        expect(view?.shop.legacyId).toBe(DEFAULT_SHOP_LEGACY_ID);

        // The minimal second tenant resolves through the SAME routing seam as a distinct shop.
        const minimalView = (await createServerClient(live).query(shopByDomainRef, {
            serverSecret: live.serverSecret,
            domain: 'minimal-demo.com',
        })) as { shop: { _id: string } } | null;
        expect(minimalView).not.toBeNull();
        expect(minimalView?.shop._id).not.toBe(shopId);

        const firstFlag = featureFlagFixtures[0];
        expect(firstFlag).toBeDefined();
        const flagRow = (await createServerClient(live).query(featureFlagByKeyRef, {
            serverSecret: live.serverSecret,
            key: firstFlag?.key ?? '',
        })) as { _id: string } | null;
        expect(flagRow).not.toBeNull();

        const countsAfterFirst = {
            header: countRows(live, 'header'),
            pages: countRows(live, 'pages'),
            featureFlags: countRows(live, 'featureFlags'),
            shopFeatureFlags: countRows(live, 'shopFeatureFlags'),
            users: countRows(live, 'users'),
            reviews: countRows(live, 'reviews'),
            media: countRows(live, 'media'),
            shopCollaborators: countRows(live, 'shopCollaborators'),
        };
        expect(countsAfterFirst.header).toBe(1);
        expect(countsAfterFirst.pages).toBe(pageFixtures.length);
        expect(countsAfterFirst.featureFlags).toBe(featureFlagFixtures.length);
        expect(countsAfterFirst.shopFeatureFlags).toBe(featureFlagFixtures.length);
        // Enriched superset: 3 collaborator users, 3 reviews, 3 media, and 4 collaborator links
        // (3 advanced tiers + the owner's admin link on the minimal tenant).
        expect(countsAfterFirst.users).toBe(3);
        expect(countsAfterFirst.reviews).toBe(3);
        expect(countsAfterFirst.media).toBe(3);
        expect(countsAfterFirst.shopCollaborators).toBe(4);

        const secondRunId = await seedCanonical(live.url);
        expect(secondRunId).toBe(shopId);
        expect({
            header: countRows(live, 'header'),
            pages: countRows(live, 'pages'),
            featureFlags: countRows(live, 'featureFlags'),
            shopFeatureFlags: countRows(live, 'shopFeatureFlags'),
            users: countRows(live, 'users'),
            reviews: countRows(live, 'reviews'),
            media: countRows(live, 'media'),
            shopCollaborators: countRows(live, 'shopCollaborators'),
        }).toEqual(countsAfterFirst);
    }, 300_000);
});
