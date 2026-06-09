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
 * `width`/`height`/`focalX`/`focalY` are filled by the CMSMEDIA-02 derivative pass (the original's
 * pixel dimensions plus the `0..1` focal point, default center); they stay optional so storage-only
 * rows (non-images, or images whose Node-side generation has not run yet) persist without them.
 */

/**
 * The four frozen derivative size names, in declaration order. MIRROR of `MEDIA_IMAGE_SIZES` in
 * `@nordcom/commerce-cms/media` (itself pinned against the frozen Payload media collection's
 * `upload.imageSizes`) — mirrored rather than imported to keep the cms workspace package off the
 * Convex isolate's bundle surface (the same pattern as `cms/media.ts`'s `MEDIA_MIME_ALLOWLIST`);
 * `cms/media_derivatives.test.ts` pins the two lists equal.
 */
export const MEDIA_DERIVATIVE_SIZE_NAMES = ['thumbnail', 'card', 'feature', 'hero'] as const;

/** The frozen derivative size-name union (`'thumbnail' | 'card' | 'feature' | 'hero'`). */
export type MediaDerivativeSizeName = (typeof MEDIA_DERIVATIVE_SIZE_NAMES)[number];

/** Validator pinning a derivative row's `size` to the frozen size-name union. */
export const mediaDerivativeSizeValidator = v.union(
    v.literal('thumbnail'),
    v.literal('card'),
    v.literal('feature'),
    v.literal('hero'),
);

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
    // One row per (original asset, frozen size): finalize plants the four `pending` plan rows for
    // every image upload (zero for non-images), and the Node-side sharp pass flips them `ready`
    // via `cms/media_derivatives:saveDerivatives`. Row identity is stable across regeneration —
    // refulfillment patches the existing `(mediaId, size)` row (replacing its `storageId`) rather
    // than inserting, which is what keeps the derivative pass idempotent.
    cmsMediaDerivatives: defineTable(
        v.object({
            shopId: v.id('shops'),
            mediaId: v.id('cmsMedia'),
            size: mediaDerivativeSizeValidator,
            status: v.union(v.literal('pending'), v.literal('ready')),
            storageId: v.optional(v.id('_storage')),
            width: v.optional(v.number()),
            height: v.optional(v.number()),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
    )
        .index('by_shop', ['shopId'])
        .index('by_media', ['mediaId', 'size']),
};
