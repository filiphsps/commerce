import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';

/**
 * Builds a published-baseline + working-draft version history for the FIRST `pages` `cmsDocuments`
 * row of the shop, wiring `publishedVersionId`/`latestVersionId`/`revision`. Idempotent: a no-op once
 * the chosen document already carries a `latestVersionId`. The shop's `admin` collaborator (the
 * `owner@` seeded user) authors the snapshots; falls back to author-less when that user is absent.
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

    const draftSnapshot = {
        ...(doc.data as Record<string, unknown>),
        __draftNote: 'Working copy edited after publish.',
    };
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
