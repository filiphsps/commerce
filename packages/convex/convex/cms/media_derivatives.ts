import type { GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import type { DataModel, Doc, Id } from '../_generated/dataModel';
import { tenantMutation, tenantQuery } from '../lib/tenant';
import {
    MEDIA_DERIVATIVE_SIZE_NAMES,
    type MediaDerivativeSizeName,
    mediaDerivativeSizeValidator,
} from '../tables/cms_media';

/**
 * CMSMEDIA-02 — the Convex half of the media derivative pipeline (four frozen named sizes +
 * focal-point crop) for the CMSMEDIA-01 originals.
 *
 * ARCHITECTURE (option (b), chosen over a `'use node'` action): sharp is a native Node library
 * that cannot run in the default Convex isolate, and shipping it as a node-action dependency
 * would force the ephemeral self-host CI backend to build a native module on every deploy. So
 * generation happens in the trusted Node layer at upload time
 * (`@nordcom/commerce-cms/media/derive`, driven by the admin upload action's server side) and
 * Convex owns only the LEDGER: `cms/media:finalizeUpload` transactionally plants one `pending`
 * row per frozen size for every image upload (zero for non-images) via
 * {@link scheduleDerivativePlan}, and the Node side fulfills the plan through
 * {@link saveDerivatives} after POSTing each generated blob to a `generateUploadUrl` byte sink.
 *
 * IDEMPOTENCY CONTRACT: a derivative row's identity is the `(mediaId, size)` pair (the `by_media`
 * index). Re-running generation patches the existing row — REPLACING its `storageId` and deleting
 * the superseded blob — and never inserts a duplicate, so regeneration converges instead of
 * accreting rows or leaking storage.
 */

/**
 * Stable string codes carried on every {@link ConvexError} this module throws — the sanctioned
 * in-isolate error contract (`@nordcom/commerce-errors` is off the Convex bundle surface; same
 * pattern as `cms/media.ts`'s `CmsMediaErrorCode`).
 */
export const CmsMediaDerivativeErrorCode = {
    /** The referenced media row does not exist for this tenant (foreign rows are invisible). */
    MEDIA_NOT_FOUND: 'CMS_MEDIA_DERIVATIVE_MEDIA_NOT_FOUND',
    /** Derivatives were submitted for a non-image original, which schedules zero derivative work. */
    NOT_AN_IMAGE: 'CMS_MEDIA_DERIVATIVE_NOT_AN_IMAGE',
    /** The same frozen size appeared twice in one fulfillment call. */
    DUPLICATE_SIZE: 'CMS_MEDIA_DERIVATIVE_DUPLICATE_SIZE',
    /** A fulfillment referenced a derivative storage id with no stored blob behind it. */
    BLOB_NOT_FOUND: 'CMS_MEDIA_DERIVATIVE_BLOB_NOT_FOUND',
} as const;

/**
 * Decides whether a mime type denotes a raster-derivable image (`image/*` essence, parameters
 * stripped, case-insensitive; garbage fails closed). Mirror of `isImageMimeType` in
 * `@nordcom/commerce-cms/media` — mirrored rather than imported to keep the cms workspace package
 * off the Convex isolate's bundle surface.
 *
 * @param mimeType - The candidate mime type (may carry parameters).
 * @returns `true` when the type is in the `image/*` family.
 */
export function isImageMimeType(mimeType: string): boolean {
    const essence = mimeType.split(';')[0]?.trim().toLowerCase();
    if (!essence?.includes('/')) return false;
    return essence.startsWith('image/');
}

/**
 * Clamps a `0..1` focal coordinate, degrading non-finite input to the centered `0.5` so corrupt
 * client values produce the default rather than NaN geometry.
 *
 * @param value - The candidate coordinate.
 * @returns The coordinate clamped into `0..1`.
 */
function clampUnit(value: number): number {
    if (!Number.isFinite(value)) return 0.5;
    return Math.min(1, Math.max(0, value));
}

/**
 * Normalizes an optional focal point onto the `{x, y} ∈ 0..1` contract, defaulting to the image
 * center.
 *
 * @param focal - The candidate focal point, possibly absent.
 * @returns A complete, clamped focal point.
 */
function clampFocal(focal?: { x: number; y: number }): { x: number; y: number } {
    return { x: clampUnit(focal?.x ?? 0.5), y: clampUnit(focal?.y ?? 0.5) };
}

/**
 * Coerces a reported pixel dimension into a sane positive integer (floor, minimum 1) so a garbage
 * numeric arg cannot persist zero/negative/NaN dimensions.
 *
 * @param value - The candidate dimension.
 * @returns The dimension as an integer of at least 1.
 */
function toPixelCount(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
}

/** One derivative row projected onto the per-asset wire contract {@link byMedia} returns. */
export interface MediaDerivativeMetadata {
    id: string;
    size: MediaDerivativeSizeName;
    status: 'pending' | 'ready';
    storageId: string | null;
    width: number | null;
    height: number | null;
    updatedAt: number;
}

/**
 * Projects a `cmsMediaDerivatives` row onto the wire contract (Convex ids surfaced as plain
 * strings, absent optionals as `null`).
 *
 * @param doc - The tenant-scoped derivative row.
 * @returns The wire-shaped derivative metadata.
 */
function toDerivativeMetadata(doc: Doc<'cmsMediaDerivatives'>): MediaDerivativeMetadata {
    return {
        id: String(doc._id),
        size: doc.size,
        status: doc.status,
        storageId: doc.storageId ? String(doc.storageId) : null,
        width: doc.width ?? null,
        height: doc.height ?? null,
        updatedAt: doc.updatedAt,
    };
}

/**
 * Reads every derivative row for one asset through the `by_media` index, in the frozen size-name
 * declaration order (index order is `(mediaId, size)` — alphabetical by size — so the frozen order
 * is restored explicitly for a stable wire contract). Exported for the CMSMEDIA-03 URL resolution
 * in `cms/media.ts`, which maps each row to its per-size serving URL.
 *
 * @param db - The (RLS-wrapped) database reader (the writer is assignable, being its extension).
 * @param mediaId - The owning `cmsMedia` row id.
 * @returns The asset's derivative rows in frozen size order.
 */
export async function readDerivativeRows(
    db: GenericDatabaseReader<DataModel>,
    mediaId: Id<'cmsMedia'>,
): Promise<Doc<'cmsMediaDerivatives'>[]> {
    const rows = await db
        .query('cmsMediaDerivatives')
        .withIndex('by_media', (q) => q.eq('mediaId', mediaId))
        .collect();
    const order = new Map(MEDIA_DERIVATIVE_SIZE_NAMES.map((name, index) => [name, index]));
    return rows.toSorted((a, b) => (order.get(a.size) ?? 0) - (order.get(b.size) ?? 0));
}

/**
 * Plants the derivative PLAN for a freshly finalized upload: one `pending` `cmsMediaDerivatives`
 * row per frozen size for an image (plus the clamped focal point persisted onto the media row,
 * defaulting to center), and NOTHING for a non-image — non-images schedule zero derivative work.
 * Runs inside `finalizeUpload`'s transaction, so the plan exists exactly when the media row does.
 *
 * Idempotent by row identity: a `(mediaId, size)` plan row that already exists is left untouched,
 * so replaying the schedule never duplicates the plan.
 *
 * @param ctx - The tenant-scoped mutation context (RLS-wrapped `db` plus the pinned `shopId`).
 * @param args - The owning media row, its finalize-verified mime type, and the optional focal point.
 * @returns The size count of the idempotent plan — the frozen four for an image (even when every
 *   plan row already existed and zero were inserted this call), zero for a non-image.
 */
export async function scheduleDerivativePlan(
    ctx: { db: GenericDatabaseWriter<DataModel>; shopId: Id<'shops'> },
    args: { mediaId: Id<'cmsMedia'>; mimeType: string; focal?: { x: number; y: number } },
): Promise<number> {
    if (!isImageMimeType(args.mimeType)) return 0;

    const now = Date.now();
    const focal = clampFocal(args.focal);
    await ctx.db.patch(args.mediaId, { focalX: focal.x, focalY: focal.y, updatedAt: now });

    const existing = new Set((await readDerivativeRows(ctx.db, args.mediaId)).map((row) => row.size));
    for (const size of MEDIA_DERIVATIVE_SIZE_NAMES) {
        if (existing.has(size)) continue;
        await ctx.db.insert('cmsMediaDerivatives', {
            shopId: ctx.shopId,
            mediaId: args.mediaId,
            size,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
    }
    return MEDIA_DERIVATIVE_SIZE_NAMES.length;
}

/**
 * Persists the Node-side sharp pass's results for one asset: flips each submitted size's plan row
 * to `ready` with the generated blob's `storageId` and dimensions, records the original's pixel
 * dimensions (and optionally a corrected focal point) on the media row, and returns the asset's
 * full derivative metadata.
 *
 * REGENERATION IS IDEMPOTENT — documented choice: stable row identity with REPLACED storageIds. A
 * resubmitted size patches its existing `(mediaId, size)` row and deletes the superseded blob (the
 * delete rides the same transaction as the patch, so a throw rolls both back together); row count
 * never grows past the frozen four and no orphan blobs accumulate. A subset fulfillment is legal:
 * unsubmitted sizes simply stay `pending`.
 *
 * @returns The asset's derivative metadata in frozen size order.
 * @throws {ConvexError} `CMS_MEDIA_DERIVATIVE_MEDIA_NOT_FOUND` when the media row is absent or
 *   foreign; `CMS_MEDIA_DERIVATIVE_NOT_AN_IMAGE` for a non-image original;
 *   `CMS_MEDIA_DERIVATIVE_DUPLICATE_SIZE` when one call submits a size twice;
 *   `CMS_MEDIA_DERIVATIVE_BLOB_NOT_FOUND` when a submitted storage id has no blob; any
 *   tenant-resolution failure from the `tenantMutation` constructor.
 */
export const saveDerivatives = tenantMutation({
    args: {
        mediaId: v.id('cmsMedia'),
        original: v.object({ width: v.number(), height: v.number() }),
        focal: v.optional(v.object({ x: v.number(), y: v.number() })),
        derivatives: v.array(
            v.object({
                size: mediaDerivativeSizeValidator,
                storageId: v.id('_storage'),
                width: v.number(),
                height: v.number(),
            }),
        ),
    },
    handler: async (ctx, { mediaId, original, focal, derivatives }): Promise<MediaDerivativeMetadata[]> => {
        const media = await ctx.db.get(mediaId);
        if (!media) {
            throw new ConvexError({
                code: CmsMediaDerivativeErrorCode.MEDIA_NOT_FOUND,
                message: 'No media row for this id.',
            });
        }
        if (!isImageMimeType(media.mimeType)) {
            throw new ConvexError({
                code: CmsMediaDerivativeErrorCode.NOT_AN_IMAGE,
                message: `Media of type "${media.mimeType}" derives no image sizes.`,
            });
        }
        const submittedSizes = new Set(derivatives.map(({ size }) => size));
        if (submittedSizes.size !== derivatives.length) {
            throw new ConvexError({
                code: CmsMediaDerivativeErrorCode.DUPLICATE_SIZE,
                message: 'Each frozen size may be submitted at most once per call.',
            });
        }

        const now = Date.now();
        const existingRows = await readDerivativeRows(ctx.db, mediaId);
        const existingBySize = new Map(existingRows.map((row) => [row.size, row]));

        for (const derivative of derivatives) {
            const stored = await ctx.db.system.get(derivative.storageId);
            if (!stored) {
                throw new ConvexError({
                    code: CmsMediaDerivativeErrorCode.BLOB_NOT_FOUND,
                    message: `No stored blob for the "${derivative.size}" derivative.`,
                });
            }

            const fulfilled = {
                status: 'ready' as const,
                storageId: derivative.storageId,
                width: toPixelCount(derivative.width),
                height: toPixelCount(derivative.height),
                updatedAt: now,
            };
            const existing = existingBySize.get(derivative.size);
            if (existing) {
                if (existing.storageId && existing.storageId !== derivative.storageId) {
                    // The superseded blob would be unreachable once the row points elsewhere;
                    // deleting it inside the same transaction keeps regeneration leak-free.
                    await ctx.storage.delete(existing.storageId);
                }
                await ctx.db.patch(existing._id, fulfilled);
            } else {
                // No plan row exists (a pre-CMSMEDIA-02 original being backfilled): fulfillment
                // creates the row directly, keeping the (mediaId, size) identity invariant.
                await ctx.db.insert('cmsMediaDerivatives', {
                    shopId: ctx.shopId,
                    mediaId,
                    size: derivative.size,
                    createdAt: now,
                    ...fulfilled,
                });
            }
        }

        const resolvedFocal = focal
            ? clampFocal(focal)
            : clampFocal(
                  media.focalX !== undefined && media.focalY !== undefined
                      ? { x: media.focalX, y: media.focalY }
                      : undefined,
              );
        await ctx.db.patch(mediaId, {
            width: toPixelCount(original.width),
            height: toPixelCount(original.height),
            focalX: resolvedFocal.x,
            focalY: resolvedFocal.y,
            updatedAt: now,
        });

        return (await readDerivativeRows(ctx.db, mediaId)).map(toDerivativeMetadata);
    },
});

/**
 * Lists one asset's derivative metadata in frozen size order — the per-asset query surface the
 * consumption layer (CMSMEDIA-03) and the admin media UI read. A foreign or nonexistent asset
 * yields an empty list: the RLS read predicate filters foreign rows, making them indistinguishable
 * from absent ones.
 *
 * @returns The asset's derivative metadata (empty for non-images, foreign, or unknown assets).
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const byMedia = tenantQuery({
    args: { mediaId: v.id('cmsMedia') },
    handler: async (ctx, { mediaId }): Promise<MediaDerivativeMetadata[]> =>
        (await readDerivativeRows(ctx.db, mediaId)).map(toDerivativeMetadata),
});
