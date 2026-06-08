import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * The draft lifecycle state carried by a live CMS document and every version snapshot — the
 * Convex-native replacement for Payload's `_status`. `draft` is editor-only (hidden from anonymous
 * storefront reads); `published` is the live, validated state. Exported so the document/version
 * mutations validate against the SAME shape the schema persists.
 */
export const cmsDocumentStatusValidator = v.union(v.literal('draft'), v.literal('published'));

/**
 * Convex-native drafts + version-history table group, replacing Payload's per-collection
 * `_status` column and `_versions` companion tables plus `payload.restoreVersion`. Spread into
 * `coreTables` (NOT `cmsTables`) via `tables/index.ts` because both tables key on a real
 * `v.id('shops')` foreign key — the same `v.id('shops')`-keyed tenant tier the shop-family and
 * `reviews` tables live in, and the tier the RLS rule set (`lib/rls.ts`) range-scopes — rather
 * than the forward-referenced `shop: v.string()` the descriptor-generated CMS content tables use.
 *
 * - `cmsDocuments` is the live document: one row per logical document, carrying its current
 *   serialized `data`, its draft `status`, and a `latestVersionId` pointer advanced on every save.
 * - `cmsVersions` is the append-only history: exactly one row per logical save, each a frozen
 *   snapshot pointing back at its live document. Ordered by creation (the `by_document` index then
 *   `_creationTime`), so a version-list query returns chronological history.
 */
export const cmsVersionTables = {
    cmsDocuments: defineTable(
        v.object({
            shopId: v.id('shops'),
            collection: v.string(),
            data: v.any(),
            status: cmsDocumentStatusValidator,
            latestVersionId: v.optional(v.id('cmsVersions')),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
    )
        .index('by_shop', ['shopId'])
        .index('by_shop_collection', ['shopId', 'collection']),
    cmsVersions: defineTable(
        v.object({
            shopId: v.id('shops'),
            documentId: v.id('cmsDocuments'),
            collection: v.string(),
            snapshot: v.any(),
            status: cmsDocumentStatusValidator,
            createdAt: v.number(),
        }),
    )
        .index('by_shop', ['shopId'])
        .index('by_document', ['documentId']),
};
