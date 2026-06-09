import type { Media } from '@nordcom/commerce-cms/types';
import { ConvexError, v } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { tenantMutation, tenantQuery } from '../lib/tenant';
import { scheduleDerivativePlan } from './media_derivatives';

/**
 * Stable string codes carried on every {@link ConvexError} the media storage layer throws, so call
 * sites and `convex-test` branch on the cause without string-matching messages. Convex functions
 * run in the Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a
 * `ConvexError` payload with a stable code is the sanctioned in-runtime error contract (the same
 * pattern as `cms/documents.ts`'s `CmsDocumentErrorCode`).
 */
export const CmsMediaErrorCode = {
    /** The uploaded blob's mime type is outside the media allowlist. */
    UNSUPPORTED_MIME_TYPE: 'CMS_MEDIA_UNSUPPORTED_MIME_TYPE',
    /** A finalize referenced a storage id with no stored blob behind it. */
    BLOB_NOT_FOUND: 'CMS_MEDIA_BLOB_NOT_FOUND',
} as const;

/**
 * The frozen media mime allowlist: any image, mp4 video, and PDF. Mirror of `MEDIA_MIME_TYPES` in
 * `@nordcom/commerce-cms`'s `collections/media.ts` (the Payload upload collection's `mimeTypes`) —
 * mirrored rather than imported because that module sits behind the payload-coupled `collections`
 * barrel, which is off the Convex isolate's bundle surface (the same pattern as `cms/secrets.ts`'s
 * `SHOP_SECRET_PATHS` mirror).
 */
export const MEDIA_MIME_ALLOWLIST = ['image/*', 'video/mp4', 'application/pdf'] as const;

/**
 * Decides whether a mime type is inside {@link MEDIA_MIME_ALLOWLIST}. Parameters (`; charset=…`)
 * are stripped and matching is case-insensitive per RFC 2045; a `type/*` allowlist entry matches
 * the whole top-level type family, every other entry matches exactly. An empty or unparsable value
 * fails closed.
 *
 * @param mimeType - The candidate mime type (may carry parameters).
 * @returns `true` when the type is allowed for media storage.
 */
export function isAllowedMediaMimeType(mimeType: string): boolean {
    const essence = mimeType.split(';')[0]?.trim().toLowerCase();
    if (!essence?.includes('/')) return false;
    return MEDIA_MIME_ALLOWLIST.some((allowed) =>
        allowed.endsWith('/*') ? essence.startsWith(allowed.slice(0, -1)) : essence === allowed,
    );
}

/**
 * Projects a `cmsMedia` row onto the frozen `Media` read contract (`@nordcom/commerce-cms/types`,
 * the CMSDESC-02 generated shape). Storage fields are populated from the row; `url`/`thumbnailURL`
 * stay `null` until the CDN/consumption layer (CMSMEDIA-03). `focalX`/`focalY` are set at finalize
 * for images (default center) and `width`/`height` once the Node-side derivative pass (CMSMEDIA-02)
 * reports the original's dimensions through `cms/media_derivatives:saveDerivatives`; non-image rows
 * keep them `null`. `sizes` is omitted — per-size metadata is queryable via
 * `cms/media_derivatives:byMedia` instead. The `Media` return annotation is the compile-time
 * contract gate: drift between this projection and the frozen type fails `tsc`.
 *
 * @param doc - The tenant-scoped media row.
 * @returns The `Media`-shaped wire object (Convex `_id`/`shopId` surfaced as plain strings).
 */
function toMedia(doc: Doc<'cmsMedia'>): Media {
    return {
        id: String(doc._id),
        tenant: String(doc.shopId),
        alt: doc.alt,
        caption: doc.caption ?? null,
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString(),
        url: null,
        thumbnailURL: null,
        filename: doc.filename,
        mimeType: doc.mimeType,
        filesize: doc.filesize,
        width: doc.width ?? null,
        height: doc.height ?? null,
        focalX: doc.focalX ?? null,
        focalY: doc.focalY ?? null,
    };
}

/**
 * Issues a short-lived Convex file-storage upload URL for the resolved tenant's editor. The client
 * POSTs the file bytes to the returned URL (with its `Content-Type` header set) and receives the
 * `storageId` it then passes to {@link finalizeUpload}. No allowlist check happens here — the URL
 * upload is a raw byte sink the client drives, so enforcement is deferred to finalize where the
 * stored blob's recorded metadata can be inspected.
 *
 * @returns The upload URL the client posts the file to.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantMutation` constructor
 *   (`UNAUTHENTICATED`, `UNKNOWN_USER`, `NO_SHOP_MEMBERSHIP`, …).
 */
export const generateUploadUrl = tenantMutation({
    args: {},
    handler: async (ctx): Promise<{ url: string }> => ({ url: await ctx.storage.generateUploadUrl() }),
});

/**
 * Finalizes an upload: verifies the stored blob exists, enforces the mime allowlist, persists the
 * tenant-scoped `cmsMedia` row referencing the original asset, and — for images — schedules the
 * derivative plan in the same transaction (`scheduleDerivativePlan`: one `pending`
 * `cmsMediaDerivatives` row per frozen size plus the clamped focal point, default center, on the
 * media row; the Node-side sharp pass fulfills the plan via `cms/media_derivatives:saveDerivatives`).
 * Non-image uploads schedule zero derivative work.
 *
 * The allowlist runs against the blob's RECORDED storage metadata (`ctx.db.system.get` on
 * `_storage`) in preference to the caller's `mimeType` claim — the storage-URL upload cannot trust
 * a client-declared type, and the recorded `contentType` is what was actually presented to the
 * byte sink. The declared arg is the fallback for blobs stored without a content type (uploads
 * omitting the header; `convex-test`'s in-memory storage records none) and is held to the SAME
 * allowlist, so the check fails closed either way. A rejected blob is left in place rather than
 * deleted: a mutation throw rolls the whole transaction back, including any `storage.delete`, so
 * orphan cleanup is necessarily a separate concern.
 *
 * @returns The persisted media document projected onto the frozen `Media` contract.
 * @throws {ConvexError} `CMS_MEDIA_BLOB_NOT_FOUND` when no blob exists for `storageId`;
 *   `CMS_MEDIA_UNSUPPORTED_MIME_TYPE` when the effective mime type is outside the allowlist; any
 *   tenant-resolution failure from the `tenantMutation` constructor.
 */
export const finalizeUpload = tenantMutation({
    args: {
        storageId: v.id('_storage'),
        filename: v.string(),
        mimeType: v.string(),
        alt: v.string(),
        caption: v.optional(v.string()),
        focal: v.optional(v.object({ x: v.number(), y: v.number() })),
    },
    handler: async (ctx, { storageId, filename, mimeType, alt, caption, focal }): Promise<Media> => {
        const stored = await ctx.db.system.get(storageId);
        if (!stored) {
            throw new ConvexError({
                code: CmsMediaErrorCode.BLOB_NOT_FOUND,
                message: 'No stored blob for this storage id.',
            });
        }

        const effectiveMimeType = stored.contentType ?? mimeType;
        if (!isAllowedMediaMimeType(effectiveMimeType)) {
            throw new ConvexError({
                code: CmsMediaErrorCode.UNSUPPORTED_MIME_TYPE,
                message: `Mime type "${effectiveMimeType}" is not allowed for media uploads.`,
            });
        }

        const now = Date.now();
        const mediaId = await ctx.db.insert('cmsMedia', {
            shopId: ctx.shopId,
            storageId,
            filename,
            mimeType: effectiveMimeType,
            filesize: stored.size,
            alt,
            ...(caption === undefined ? {} : { caption }),
            createdAt: now,
            updatedAt: now,
        });

        await scheduleDerivativePlan(ctx, {
            mediaId,
            mimeType: effectiveMimeType,
            ...(focal === undefined ? {} : { focal }),
        });

        const doc = await ctx.db.get(mediaId);
        if (!doc) {
            // Unreachable in practice (same transaction as the insert); guarded so the projection
            // never fabricates a row.
            throw new ConvexError({
                code: CmsMediaErrorCode.BLOB_NOT_FOUND,
                message: 'Media row vanished within its own transaction.',
            });
        }
        return toMedia(doc);
    },
});

/**
 * Default page size for {@link list} when the caller omits one — mirrors the admin media grid's
 * historical Payload `limit: 25` window.
 */
const DEFAULT_LIST_LIMIT = 25;

/** Hard ceiling on a caller-supplied {@link list} limit, keeping one read range-bounded. */
const MAX_LIST_LIMIT = 100;

/**
 * Lists the tenant's media documents, newest first, range-bounded via the `by_shop` index and a
 * clamped limit (defense in depth on top of the RLS read predicate).
 *
 * @returns Up to `limit` media documents projected onto the frozen `Media` contract.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const list = tenantQuery({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, { limit }): Promise<Media[]> => {
        const bounded =
            limit === undefined || !Number.isFinite(limit)
                ? DEFAULT_LIST_LIMIT
                : Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(limit)));
        const docs = await ctx.db
            .query('cmsMedia')
            .withIndex('by_shop', (q) => q.eq('shopId', ctx.shopId))
            .order('desc')
            .take(bounded);
        return docs.map(toMedia);
    },
});

/**
 * Fetches one media document by id. A cross-tenant id resolves to `null` rather than an error —
 * the RLS read predicate filters the row, making another tenant's media indistinguishable from a
 * nonexistent one.
 *
 * @returns The media document on the frozen `Media` contract, or `null` when absent/foreign.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const byId = tenantQuery({
    args: { mediaId: v.id('cmsMedia') },
    handler: async (ctx, { mediaId }): Promise<Media | null> => {
        const doc = await ctx.db.get(mediaId);
        return doc ? toMedia(doc) : null;
    },
});
