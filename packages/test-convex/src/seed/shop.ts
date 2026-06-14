import { ConvexError } from 'convex/values';

import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import {
    buildCanonicalShopFixture,
    CANONICAL_DOMAIN_STATUSES,
    type CanonicalShopFixtureOptions,
} from './fixtures/shop';

/**
 * Customization knobs for the shop seed. All fields are optional — defaults produce the canonical
 * `nordcom-demo-shop.com` fixture. The Mongo seed's free-form `overrides` escape hatch is intentionally
 * dropped: the unified `shopValidator` rejects unknown keys, so arbitrary overrides cannot be merged in.
 */
export type SeedShopOptions = CanonicalShopFixtureOptions;

/**
 * The Convex seed mutation re-expressing Mongo's `seed/shop.ts`: inserts the canonical demo tenant into
 * the unified `shops` table, shreds the private Storefront `token` into a 1:1 `shopCredentials` row so
 * the public row carries no secret, and writes one `shopDomains` row per routable domain (primary plus
 * each alternative) for the `findByDomain` hot path. Idempotent — keyed on the primary domain via the
 * `shopDomains.by_domain` index, so a second run is a no-op that returns the existing shop id.
 *
 * Runs inside a single Convex transaction, so the row/credentials/domains land all-or-nothing. The
 * source `contentProvider` field is dropped (see {@link buildCanonicalShopFixture}).
 *
 * @param ctx - A Convex mutation context (raw `db` writer), e.g. from `convex-test`'s `run` or a
 *   registered seed mutation.
 * @param opts - Optional domain/name overrides; omitting them yields the canonical fixture.
 * @returns The `_id` of the seeded (or pre-existing) shop.
 */
export async function seedShopMutation(ctx: MutationCtx, opts: SeedShopOptions = {}): Promise<Id<'shops'>> {
    const { shop, credentials, domains } = buildCanonicalShopFixture(opts);

    const existing = await ctx.db
        .query('shopDomains')
        .withIndex('by_domain', (q) => q.eq('domain', shop.domain))
        .unique();
    if (existing) return existing.shop;

    const now = Date.now();
    const shopId = await ctx.db.insert('shops', { ...shop, createdAt: now, updatedAt: now });

    const credentialsRow: { shop: Id<'shops'>; token?: string; clientSecret?: string } = { shop: shopId };
    if (credentials.token !== undefined) credentialsRow.token = credentials.token;
    if (credentials.clientSecret !== undefined) credentialsRow.clientSecret = credentials.clientSecret;
    await ctx.db.insert('shopCredentials', credentialsRow);

    const statusByDomain = new Map(CANONICAL_DOMAIN_STATUSES.map((entry) => [entry.domain, entry]));
    for (const domain of domains) {
        const status = statusByDomain.get(domain);
        await ctx.db.insert('shopDomains', {
            shop: shopId,
            domain,
            ...(status ? { status: status.status, ...(status.via ? { via: status.via } : {}) } : {}),
        });
    }

    return shopId;
}

/**
 * Live-backend transport wrapper around {@link seedShopMutation}. Seeding a running deployment requires
 * invoking the seed mutation over the wire (a deployed function reference plus an authenticated client),
 * which HARNESS-02 wires into the launcher; until then this entry throws rather than silently skipping.
 *
 * @param url - Deployment URL the seed mutation runs against.
 * @param opts - Optional overrides forwarded to {@link seedShopMutation}.
 * @returns Resolves once the canonical shop is present in the deployment.
 * @throws {ConvexError} Always, until HARNESS-02 wires the live mutation runner.
 */
export async function seedShop(url: string, opts: SeedShopOptions = {}): Promise<void> {
    throw new ConvexError(
        `@nordcom/commerce-test-convex: seedShop(${url}, ${JSON.stringify(opts)}) requires the HARNESS-02 live mutation runner; use seedShopMutation(ctx, opts) directly against a Convex mutation context.`,
    );
}
