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
 * The acting principal stamped onto a `cmsVersions` row at write time — the Payload-parity author
 * attribution the versions page renders. `userId` is the platform `users` row the save's trusted
 * identity resolved to; `label` is the display string frozen AT SAVE TIME (the user's name, or
 * email when the name is blank) so a later rename never rewrites history. Exported so the tenant
 * mutation tier (`lib/tenant.ts`) derives its `ctx.author` from the SAME shape the schema persists.
 */
export const cmsVersionAuthorValidator = v.object({
    userId: v.id('users'),
    label: v.string(),
});

/**
 * Convex-native drafts + version-history table group, replacing Payload's per-collection
 * `_status` column and `_versions` companion tables plus `payload.restoreVersion`. Spread into
 * `coreTables` (NOT `cmsTables`) via `tables/index.ts` because both tables key on a real
 * `v.id('shops')` foreign key — the same `v.id('shops')`-keyed tenant tier the shop-family and
 * `reviews` tables live in, and the tier the RLS rule set (`lib/rls.ts`) range-scopes — rather
 * than the forward-referenced `shop: v.string()` the descriptor-generated CMS content tables use.
 *
 * - `cmsDocuments` is the live document: one row per logical document, carrying its current
 *   serialized `data` (the WORKING DRAFT — what the editor reads and the preview seam serves), a
 *   `latestVersionId` pointer advanced on every save, and a `publishedVersionId` pointer naming the
 *   last-published snapshot in `cmsVersions`. Live storefront reads resolve content through
 *   `publishedVersionId`, so a draft save after a publish never changes what the storefront serves
 *   (G4FIX-01). `status` is DERIVED, kept for the editor/list/contract consumers that read it:
 *   `published` exactly when the document has a published snapshot, `draft` when it never has —
 *   only a publish writes it, never a draft save or a restore. Rows migrated by the ETL (or seeded
 *   by the harness) may be `published` with NO pointer; the read path serves their own `data` and
 *   the first native draft save adopts that data as a published baseline snapshot before diverging.
 * - `cmsVersions` is the append-only history: exactly one row per logical save, each a frozen
 *   snapshot pointing back at its live document. Ordered by creation (the `by_document` index then
 *   `_creationTime`), so a version-list query returns chronological history. `revision` is the
 *   document's monotonic save counter at snapshot time — the clock-free ordering signal the
 *   stale-write guard compares an autosave's optimistic base against (absent on migrated rows,
 *   which compare as 0). `author` is the acting principal stamped at write time; optional because
 *   ETL-migrated and pre-stamp rows are never backfilled (an absent author renders as an em-dash).
 */
export const cmsVersionTables = {
    cmsDocuments: defineTable(
        v.object({
            shopId: v.id('shops'),
            collection: v.string(),
            data: v.any(),
            status: cmsDocumentStatusValidator,
            latestVersionId: v.optional(v.id('cmsVersions')),
            publishedVersionId: v.optional(v.id('cmsVersions')),
            revision: v.optional(v.number()),
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
            revision: v.optional(v.number()),
            author: v.optional(cmsVersionAuthorValidator),
            createdAt: v.number(),
        }),
    )
        .index('by_shop', ['shopId'])
        .index('by_document', ['documentId']),
};
