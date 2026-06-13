import type { Media } from '@nordcom/commerce-cms/types';
import type { GenericDatabaseReader, StorageReader } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import type { DataModel, Doc } from '../_generated/dataModel';
import { countWithinBudget } from '../lib/scan_budget';
import { tenantMutation, tenantQuery } from '../lib/tenant';
import { MEDIA_DERIVATIVE_SIZE_NAMES } from '../tables/cms_media';
import { CmsListErrorCode, clampPageSize, normalizePage } from './list';
import { clampFocal, isImageMimeType, readDerivativeRows, scheduleDerivativePlan } from './media_derivatives';

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
    /** A metadata update addressed a media row that is absent, foreign, or unparseable. */
    MEDIA_NOT_FOUND: 'CMS_MEDIA_NOT_FOUND',
} as const;

/**
 * The frozen media mime allowlist: any image, mp4 video, and PDF. Mirror of `MEDIA_MIME_TYPES` in
 * `@nordcom/commerce-cms`'s `collections/media.ts` (the Payload upload collection's `mimeTypes`) —
 * mirrored rather than imported because that module sits behind the payload-coupled `collections`
 * barrel, which is off the Convex isolate's bundle surface (the same pattern as `cms/secrets.ts`'s
 * `SHOP_SECRET_PATHS` mirror). The cms-side drift guard
 * (`packages/cms/src/collections/media-mime-drift.test.ts`) pins the two lists equal, so a
 * divergence fails CI instead of silently rejecting (or admitting) uploads on one side only.
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
 * the CMSDESC-02 generated shape) WITHOUT serving URLs — the synchronous base every read path
 * passes through {@link resolveMediaUrls}, which fills `url`/`thumbnailURL`/`sizes` at read time.
 * `focalX`/`focalY` are set at finalize for images (default center) and `width`/`height` once the
 * Node-side derivative pass (CMSMEDIA-02) reports the original's dimensions through
 * `cms/media_derivatives:saveDerivatives`; non-image rows keep them `null`. The `Media` return
 * annotation is the compile-time contract gate: drift between this projection and the frozen type
 * fails `tsc`.
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

/** The populated per-size URL map on the frozen `Media` contract (`sizes` made required). */
type MediaSizes = NonNullable<Media['sizes']>;

/**
 * The context slice URL resolution needs: the (RLS-wrapped) database reader plus the storage
 * reader. Both tenant queries and tenant mutations satisfy it, so finalize and the read paths
 * share one resolver.
 */
type MediaUrlResolutionCtx = {
    db: GenericDatabaseReader<DataModel>;
    storage: StorageReader;
};

/**
 * Resolves a media row's serving URLs AT READ TIME onto the frozen `Media` contract — the
 * CMSMEDIA-03 canonical scheme (documented in `@nordcom/commerce-cms/media/urls`): every URL comes
 * from Convex file storage via `storage.getUrl` and is never persisted, which keeps the row valid
 * if storage URLs rotate and makes derivative regeneration (which REPLACES the blob and its
 * `storageId`) self-cache-busting. Migrated assets resolve identically because the PIPELINE-02
 * import copies each preserved S3/R2 object into Convex storage before inserting the row.
 *
 * For images, every frozen size is always present on `sizes`: a `ready` derivative serves its own
 * blob's URL (dimensions from the row, `mimeType`/`filesize` from the blob's recorded storage
 * metadata), while a `pending` or unplanned size FALLS BACK to the original's URL and metadata so
 * a consumer that picked a size never renders a broken image while generation is in flight.
 * `thumbnailURL` mirrors `sizes.thumbnail`. Non-images (video, PDF) carry only the original `url`.
 * A vanished original blob degrades `url` to `null` rather than throwing — absent media is a
 * render-nothing condition for every consumer, not a page error.
 *
 * @param ctx - The database + storage slice of a tenant query/mutation context.
 * @param doc - The tenant-scoped media row to resolve.
 * @returns The `Media`-shaped wire object with `url`, `thumbnailURL`, and `sizes` populated.
 */
async function resolveMediaUrls(ctx: MediaUrlResolutionCtx, doc: Doc<'cmsMedia'>): Promise<Media> {
    const base = toMedia(doc);
    const url = await ctx.storage.getUrl(doc.storageId);
    if (!isImageMimeType(doc.mimeType)) return { ...base, url };

    const rows = await readDerivativeRows(ctx.db, doc._id);
    const rowsBySize = new Map(rows.map((row) => [row.size, row]));
    const sizes: MediaSizes = {};
    for (const size of MEDIA_DERIVATIVE_SIZE_NAMES) {
        const row = rowsBySize.get(size);
        if (row?.status === 'ready' && row.storageId) {
            const blob = await ctx.db.system.get(row.storageId);
            sizes[size] = {
                url: (await ctx.storage.getUrl(row.storageId)) ?? url,
                width: row.width ?? null,
                height: row.height ?? null,
                mimeType: blob?.contentType ?? null,
                filesize: blob?.size ?? null,
                filename: null,
            };
            continue;
        }
        sizes[size] = {
            url,
            width: doc.width ?? null,
            height: doc.height ?? null,
            mimeType: doc.mimeType,
            filesize: doc.filesize,
            filename: doc.filename,
        };
    }
    return { ...base, url, thumbnailURL: sizes.thumbnail?.url ?? url, sizes };
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
        return resolveMediaUrls(ctx, doc);
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
 * clamped limit (defense in depth on top of the RLS read predicate). Serving URLs are resolved at
 * read time per {@link resolveMediaUrls}.
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
        return Promise.all(docs.map((doc) => resolveMediaUrls(ctx, doc)));
    },
});

/**
 * Fetches one media document by id. The id arrives as a plain string (the admin detail route's URL
 * segment travels unbranded across the bridge) and is normalized here — an unparseable id reads as
 * `null` instead of failing argument validation, matching `cms/documents:get`'s null-on-missing
 * posture. A cross-tenant id also resolves to `null` rather than an error — the RLS read predicate
 * filters the row, making another tenant's media indistinguishable from a nonexistent one. Serving
 * URLs are resolved at read time per {@link resolveMediaUrls}.
 *
 * @returns The media document on the frozen `Media` contract, or `null` when absent/foreign/garbled.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const byId = tenantQuery({
    args: { mediaId: v.string() },
    handler: async (ctx, { mediaId }): Promise<Media | null> => {
        const normalized = ctx.db.normalizeId('cmsMedia', mediaId);
        if (!normalized) return null;
        const doc = await ctx.db.get(normalized);
        return doc ? resolveMediaUrls(ctx, doc) : null;
    },
});

/**
 * One page of the tenant's media library — the wire shape {@link page} returns. Mirrors
 * `cms/list.ts`'s `CmsListPage` addressing metadata (1-based page coordinates over a
 * budget-counted total) with the docs already projected onto the frozen `Media` contract, so the
 * admin bridge binds both list reads to one pagination model.
 */
export type CmsMediaPage = {
    /** The page's media documents, newest first, with read-time serving URLs resolved. */
    readonly docs: Media[];
    /** The 1-based page index actually served. */
    readonly page: number;
    /** The page size in force. */
    readonly pageSize: number;
    /** Total media documents for the tenant, from a bounded counted scan. */
    readonly totalDocs: number;
    /** Last addressable page = `ceil(totalDocs / pageSize)`, at least 1. */
    readonly totalPages: number;
    /** Whether the served page is the final page of results. */
    readonly isDone: boolean;
};

/**
 * Tenant-scoped, page-bounded media library read — the paginated successor to the single
 * server-clamped {@link list} window, built on the same `cms/list.ts`/scan-budget conventions:
 * `totalDocs` from {@link countWithinBudget} (an over-large library fails with the typed
 * `CMS_BOUNDED_SCAN_EXCEEDED` instead of truncating silently), the requested page range-checked
 * against `totalPages` (the SAME `CMS_LIST_PAGE_OUT_OF_RANGE` code as `cms/list:list`, so the
 * editor shell's existing typed-refusal handling applies unchanged), and the page reached by
 * walking Convex's native cursor pagination — never an unbounded `.collect()`.
 *
 * @returns The {@link CmsMediaPage} for the requested page.
 * @throws {ConvexError} `CMS_LIST_PAGE_OUT_OF_RANGE` when `page` exceeds the last addressable
 *   page; any tenant-resolution failure from the `tenantQuery` constructor.
 * @throws {BoundedScanExceededError} When counting the tenant's media reaches the scan budget.
 */
export const page = tenantQuery({
    args: { page: v.optional(v.number()), pageSize: v.optional(v.number()) },
    handler: async (ctx, args): Promise<CmsMediaPage> => {
        const size = clampPageSize(args.pageSize);
        const requestedPage = normalizePage(args.page);

        // A fresh, single-use query per read — the same indexed range is re-issued for the count
        // and for every page-walk step rather than reusing a drained iterator.
        const scoped = () =>
            ctx.db
                .query('cmsMedia')
                .withIndex('by_shop', (q) => q.eq('shopId', ctx.shopId))
                .order('desc');

        const totalDocs = await countWithinBudget(scoped());
        const totalPages = Math.max(1, Math.ceil(totalDocs / size));

        if (requestedPage > totalPages) {
            throw new ConvexError({
                code: CmsListErrorCode.PAGE_OUT_OF_RANGE,
                message: `Page ${requestedPage} is past the last addressable page (${totalPages}).`,
                requestedPage,
                totalPages,
            });
        }

        let cursor: string | null = null;
        let result = await scoped().paginate({ numItems: size, cursor });
        for (let walked = 2; walked <= requestedPage; walked += 1) {
            cursor = result.continueCursor;
            result = await scoped().paginate({ numItems: size, cursor });
        }

        return {
            docs: await Promise.all(result.page.map((doc) => resolveMediaUrls(ctx, doc))),
            page: requestedPage,
            pageSize: size,
            totalDocs,
            totalPages,
            isDone: result.isDone,
        };
    },
});

/**
 * Updates a media row's post-upload editorial metadata — alt text, caption, and the focal point —
 * closing the immutability gap the cutover left (media rows previously froze at finalize). Each
 * field updates only when supplied; an explicit `null` caption CLEARS the stored caption (the
 * optional column is removed, reading as `null` on the wire).
 *
 * A focal change on an image RE-ARMS the derivative plan: every `ready` row flips back to
 * `pending` — all four frozen sizes are focal-aware cover crops (`resolveCoverCrop` in
 * `@nordcom/commerce-cms/media`), so a focal move invalidates each of them — and
 * {@link scheduleDerivativePlan} re-runs for its established idempotency (focal persisted onto the
 * media row, any missing plan rows backfilled, never a duplicate). Re-pended rows KEEP their
 * `storageId`: per the CMSMEDIA-02 regeneration contract, the next `saveDerivatives` fulfillment
 * replaces the blob and deletes the superseded one inside its own transaction, and a `pending` row
 * meanwhile serves the original's URL at read time, so nothing ever renders broken.
 * `rearmedDerivatives` tells the trusted Node caller whether to run the sharp regeneration pass;
 * an unchanged focal (or a non-image) schedules nothing.
 *
 * @returns The updated document on the frozen `Media` contract plus the re-arm signal.
 * @throws {ConvexError} `CMS_MEDIA_NOT_FOUND` when the id is absent, foreign (RLS-filtered), or
 *   unparseable; any tenant-resolution failure from the `tenantMutation` constructor.
 */
export const updateMediaMetadata = tenantMutation({
    args: {
        mediaId: v.string(),
        alt: v.optional(v.string()),
        caption: v.optional(v.union(v.string(), v.null())),
        focal: v.optional(v.object({ x: v.number(), y: v.number() })),
    },
    handler: async (ctx, { mediaId, alt, caption, focal }): Promise<{ media: Media; rearmedDerivatives: boolean }> => {
        const normalized = ctx.db.normalizeId('cmsMedia', mediaId);
        const doc = normalized ? await ctx.db.get(normalized) : null;
        if (!doc) {
            throw new ConvexError({
                code: CmsMediaErrorCode.MEDIA_NOT_FOUND,
                message: 'No media row for this id.',
            });
        }

        const now = Date.now();
        await ctx.db.patch(doc._id, {
            ...(alt === undefined ? {} : { alt }),
            // `undefined` removes the optional column — Convex's field-clear semantics.
            ...(caption === undefined ? {} : { caption: caption ?? undefined }),
            updatedAt: now,
        });

        let rearmedDerivatives = false;
        if (focal !== undefined && isImageMimeType(doc.mimeType)) {
            const next = clampFocal(focal);
            const current = clampFocal(
                doc.focalX !== undefined && doc.focalY !== undefined ? { x: doc.focalX, y: doc.focalY } : undefined,
            );
            await ctx.db.patch(doc._id, { focalX: next.x, focalY: next.y, updatedAt: now });
            if (next.x !== current.x || next.y !== current.y) {
                for (const row of await readDerivativeRows(ctx.db, doc._id)) {
                    if (row.status === 'ready') {
                        await ctx.db.patch(row._id, { status: 'pending', updatedAt: now });
                    }
                }
                await scheduleDerivativePlan(ctx, { mediaId: doc._id, mimeType: doc.mimeType, focal: next });
                rearmedDerivatives = true;
            }
        }

        const updated = await ctx.db.get(doc._id);
        if (!updated) {
            // Unreachable in practice (same transaction as the patches); guarded so the projection
            // never fabricates a row.
            throw new ConvexError({
                code: CmsMediaErrorCode.MEDIA_NOT_FOUND,
                message: 'Media row vanished within its own transaction.',
            });
        }
        return { media: await resolveMediaUrls(ctx, updated), rearmedDerivatives };
    },
});
