import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { seedCmsMutation } from './cms';
import { seedCollaboratorsMutation } from './collaborators';
import { seedCanonicalLive } from './live';
import { seedReviewsMediaMutation } from './reviews-media';
import { type SeedShopOptions, seedShopMutation } from './shop';
import { seedVersionsMutation } from './versions';

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
    await seedCollaboratorsMutation(ctx, shopId);
    await seedReviewsMediaMutation(ctx, shopId);
    await seedVersionsMutation(ctx, shopId);

    // Minimal second tenant — proves hostname→shop isolation. Shop + credentials + one domain, plus a
    // single admin link (the owner user). No CMS/reviews/media/version corpus of its own.
    const minimalShopId = await seedShopMutation(ctx, {
        domain: 'minimal-demo.com',
        name: 'Minimal Demo',
        legacyId: 'b1b2c3d4e5f6b1b2c3d4e5f6',
        alternativeDomains: [],
    });
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

    return shopId;
}

/**
 * Live-backend transport wrapper around the canonical seed — the entry the HARNESS-02 CLI's `seed`
 * subcommand and the e2e global-setups (HARNESS-07/08) dispatch to. A registered seed mutation does
 * not exist on the deployment (fixtures must not ship in the production bundle), so the live runner
 * (`seed/live.ts`) re-expresses {@link seedCanonicalMutation} over the wire: the deployed server-tier
 * seam for the shop phase, schema-validated CLI imports for the CMS phase, both behind the same
 * `byDomain` idempotency key.
 *
 * Requires `CONVEX_SERVER_SECRET` (the deployment's server-tier secret) plus, for a FRESH deployment
 * only, a CLI credential (`CONVEX_SELF_HOSTED_ADMIN_KEY` or `CONVEX_DEPLOY_KEY`).
 *
 * @param url - Deployment URL the seed runs against.
 * @param opts - Optional overrides forwarded to the shop fixture.
 * @returns The canonical shop id as a plain string (the wire boundary erases the branded `Id<'shops'>`).
 * @throws {ConvexError} See `seed/live.ts`'s `seedCanonicalLive`.
 */
export async function seedCanonical(url: string, opts: SeedCanonicalOptions = {}): Promise<string> {
    return seedCanonicalLive(url, opts);
}
