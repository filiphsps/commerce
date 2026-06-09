import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Media STORAGE table group (CMSMEDIA-01) — the original-asset ledger behind the CMS upload flow.
 * One `cmsMedia` row per uploaded original: the Convex file-storage blob reference (`storageId`)
 * plus the storage fields the frozen `Media` read contract surfaces (`filename`, `mimeType`,
 * `filesize`, `alt`, `caption`). The mime type persisted here is the FINALIZE-VERIFIED value (see
 * `cms/media.ts`), never a raw client claim.
 *
 * Spread into `coreTables` (NOT `cmsTables`) via `tables/index.ts` for the same reason as
 * `cmsVersionTables`: the table keys on a real `v.id('shops')` foreign key, joining the
 * `v.id('shops')`-keyed tenant tier the RLS rule set (`lib/rls.ts`) scopes — distinct from the
 * descriptor-generated `media` CONTENT table in `tables/cms.ts`, which keys on the
 * forward-referenced `shop: v.string()` and carries only the editorial fields.
 *
 * `width`/`height`/`focalX`/`focalY` are CMSMEDIA-02 placeholders (sharp derivative + focal-point
 * pass); they stay optional so storage-only rows persist without them.
 */
export const cmsMediaTables = {
    cmsMedia: defineTable(
        v.object({
            shopId: v.id('shops'),
            storageId: v.id('_storage'),
            filename: v.string(),
            mimeType: v.string(),
            filesize: v.number(),
            alt: v.string(),
            caption: v.optional(v.string()),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            focalX: v.optional(v.number()),
            focalY: v.optional(v.number()),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
    ).index('by_shop', ['shopId']),
};
