import { ConvexError, v } from 'convex/values';

import { tenantMutation, tenantQuery } from '../lib/tenant';

/**
 * Stable string code carried on the {@link ConvexError} the restore mutation throws, so call sites
 * and `convex-test` branch on the cause without string-matching. A `ConvexError` payload with a
 * stable code is the sanctioned in-isolate error contract (see `cms/documents.ts`).
 */
export const CmsVersionErrorCode = {
    /** A restore targeted a `versionId` not visible to the resolved tenant. */
    VERSION_NOT_FOUND: 'CMS_VERSION_NOT_FOUND',
} as const;

/**
 * Lists a live document's version history, oldest first. Tenant-scoped via {@link tenantQuery}: the
 * RLS-wrapped reader returns only snapshots owned by the resolved shop, so passing another tenant's
 * `documentId` yields an empty list rather than leaking history. Ordering is creation-ascending —
 * the `by_document` index orders by `documentId` then `_creationTime`, so saves within the same
 * millisecond still return in insertion order.
 *
 * @param ctx - The tenant query context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The live `documentId` whose history to list.
 * @returns The document's version snapshots, ordered oldest to newest.
 */
export const list = tenantQuery({
    args: { documentId: v.id('cmsDocuments') },
    handler: async (ctx, { documentId }) =>
        ctx.db
            .query('cmsVersions')
            .withIndex('by_document', (q) => q.eq('documentId', documentId))
            .order('asc')
            .collect(),
});

/**
 * Restores a prior version by re-materializing its snapshot onto the live document as a NEW draft,
 * the Convex-native replacement for `payload.restoreVersion`. History is never mutated: the prior
 * version rows are left untouched and a fresh `draft` snapshot is appended, so the restore is itself
 * an auditable save. The live row's `data`/`latestVersionId`/`revision` advance to the restored
 * draft; `status` and `publishedVersionId` are deliberately untouched (G4FIX-01) — a restore is a
 * draft operation, so a published document keeps serving its last-published snapshot and a publish
 * is still required to make the restored content live.
 *
 * Built on {@link tenantMutation}, so the resolved tenant is pinned from server-trusted context and a
 * `versionId` outside the tenant reads as missing under RLS and fails closed.
 *
 * @param ctx - The tenant mutation context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The `versionId` to re-materialize.
 * @returns The live `documentId` and the newly appended draft `versionId`.
 * @throws {ConvexError} `CMS_VERSION_NOT_FOUND` when the version (or its live document) is not
 *   visible to the tenant.
 */
export const restore = tenantMutation({
    args: { versionId: v.id('cmsVersions') },
    handler: async (ctx, { versionId }) => {
        const version = await ctx.db.get(versionId);
        const doc = version ? await ctx.db.get(version.documentId) : null;
        if (!version || !doc) {
            throw new ConvexError({
                code: CmsVersionErrorCode.VERSION_NOT_FOUND,
                message: 'No such version for this tenant.',
            });
        }

        const now = Date.now();
        const revision = (doc.revision ?? 0) + 1;
        const newVersionId = await ctx.db.insert('cmsVersions', {
            shopId: ctx.shopId,
            documentId: version.documentId,
            collection: version.collection,
            snapshot: version.snapshot,
            status: 'draft',
            revision,
            // Attribution credits the RESTORER, not the snapshot's original author — the restore is
            // itself the auditable act this row records (POLISH-05).
            author: ctx.author,
            createdAt: now,
        });
        await ctx.db.patch(version.documentId, {
            data: version.snapshot,
            latestVersionId: newVersionId,
            revision,
            updatedAt: now,
        });

        return { documentId: version.documentId, versionId: newVersionId };
    },
});
