import { ConvexError } from 'convex/values';

import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { seedCmsMutation } from './cms';
import { type SeedShopOptions, seedShopMutation } from './shop';

/**
 * Customization knobs for the canonical seed. Identical to the shop seed's options — the CMS phase has
 * no knobs of its own (its documents key off the shop id the shop phase resolves), so the orchestrator
 * forwards these to {@link seedShopMutation} verbatim.
 */
export type SeedCanonicalOptions = SeedShopOptions;

/**
 * The canonical seed orchestrator: seeds the demo tenant (`nordcom-demo-shop.com` shop row, split-out
 * credentials, per-domain routing rows) and then EVERY CMS fixture scoped to it (header/footer/
 * businessData singletons, rich-text-bearing pages/articles/productMetadata/collectionMetadata, global
 * feature flags plus their shop links) by composing {@link seedShopMutation} and {@link seedCmsMutation}
 * rather than duplicating their logic.
 *
 * Idempotent END-TO-END: the shop phase keys on the primary domain via the `shopDomains.by_domain`
 * index and returns the existing shop id on re-run, and the CMS phase guards every document by its
 * natural key within the shop's `by_shop` range, so a second call writes nothing. Because each document
 * is guarded individually, a re-run also HEALS a partially-seeded deployment (e.g. a shop row without
 * its CMS corpus) instead of duplicating the parts that already exist. Runs inside one Convex
 * transaction, so a first run lands all-or-nothing.
 *
 * This is the single entry `pnpm dev` first-run and the e2e global setup (HARNESS-07/08) depend on.
 *
 * @param ctx - A Convex mutation context (raw `db` writer), e.g. from `convex-test`'s `run` or a
 *   registered seed mutation.
 * @param opts - Optional domain/name overrides forwarded to the shop phase; omitting them yields the
 *   canonical fixture.
 * @returns The `_id` of the seeded (or pre-existing) canonical shop.
 */
export async function seedCanonicalMutation(ctx: MutationCtx, opts: SeedCanonicalOptions = {}): Promise<Id<'shops'>> {
    const shopId = await seedShopMutation(ctx, opts);
    await seedCmsMutation(ctx, { shopId });
    return shopId;
}

/**
 * Live-backend transport wrapper around {@link seedCanonicalMutation}, the entry the HARNESS-02 CLI's
 * `seed` subcommand dispatches to. Seeding a running deployment requires invoking the seed mutation over
 * the wire (a deployed function reference plus an authenticated client), which the live mutation runner
 * (HARNESS-07/08) wires up; until then this entry throws rather than silently skipping, exactly like the
 * per-phase `seedShop`/`seedCms` wrappers.
 *
 * @param url - Deployment URL the seed mutation runs against.
 * @param opts - Optional overrides forwarded to {@link seedCanonicalMutation}.
 * @returns The canonical shop id as a plain string (the wire boundary erases the branded `Id<'shops'>`).
 * @throws {ConvexError} Always, until the live mutation runner lands.
 */
export async function seedCanonical(url: string, opts: SeedCanonicalOptions = {}): Promise<string> {
    throw new ConvexError(
        `@nordcom/commerce-test-convex: seedCanonical(${url}, ${JSON.stringify(opts)}) requires the live mutation runner; use seedCanonicalMutation(ctx, opts) directly against a Convex mutation context.`,
    );
}
