import { MEDIA_IMAGE_SIZES } from '@nordcom/commerce-cms/media';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';
import { MEDIA_DERIVATIVE_SIZE_NAMES } from '../tables/cms_media';
import { CmsMediaDerivativeErrorCode, isImageMimeType } from './media_derivatives';

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`),
 * stubbed into `CONVEX_AUTH_ISSUER` so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed timestamps; its value only has to satisfy the
 * numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Module map for `convex-test`: `cms/media` (the finalize entry point that plants the plan) and
 * `cms/media_derivatives` (fulfillment + per-asset query) are mapped so both resolve by
 * `FunctionReference`; the dummy `_generated` key anchors convex-test's `/convex/` module-root
 * detection (see `cms/access.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/media.ts': () => import('./media'),
    '/convex/cms/media_derivatives.ts': () => import('./media_derivatives'),
};

const finalizeUploadRef = makeFunctionReference<'mutation'>('cms/media:finalizeUpload');
const saveDerivativesRef = makeFunctionReference<'mutation'>('cms/media_derivatives:saveDerivatives');
const byMediaRef = makeFunctionReference<'query'>('cms/media_derivatives:byMedia');

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them —
 * through convex-test's raw `t.run` ctx (the unscoped path for platform-global `users`/`shops`).
 *
 * @param t - The convex-test harness.
 * @param email - The operator's identity email.
 * @param legacyId - The shop's legacy id/display name and primary domain seed.
 * @returns The seeded `shops` id.
 */
async function seedTenant(t: ReturnType<typeof convexTest>, email: string, legacyId: string): Promise<Id<'shops'>> {
    return t.run(async (ctx) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId,
            name: legacyId,
            domain: `${legacyId}.example.com`,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        return shopId;
    });
}

/**
 * Stores raw bytes into convex-test's in-memory file storage, simulating a POST to the
 * `generateUploadUrl` byte sink.
 *
 * @param t - The convex-test harness.
 * @param bytes - The blob contents.
 * @returns The stored blob's storage id.
 */
async function storeBlob(t: ReturnType<typeof convexTest>, bytes: Uint8Array<ArrayBuffer>): Promise<Id<'_storage'>> {
    return t.run(async (ctx) => ctx.storage.store(new Blob([bytes])));
}

/**
 * Reads an asset's raw `cmsMediaDerivatives` rows through the unscoped ctx, sorted by size name
 * for stable assertions.
 *
 * @param t - The convex-test harness.
 * @param mediaId - The owning media row id.
 * @returns The asset's derivative rows.
 */
async function rawDerivativeRows(
    t: ReturnType<typeof convexTest>,
    mediaId: Id<'cmsMedia'>,
): Promise<Doc<'cmsMediaDerivatives'>[]> {
    return t.run(async (ctx) => {
        // The raw `t.run` ctx is typed off the spread-erased schema, which drops app index typing,
        // so this unscoped test-only read scans and filters instead of using `by_media`.
        const rows = await ctx.db.query('cmsMediaDerivatives').collect();
        return rows.filter((row) => row.mediaId === mediaId).toSorted((a, b) => a.size.localeCompare(b.size));
    });
}

/**
 * Finalizes an image upload as the given operator and returns the new media id.
 *
 * @param t - The convex-test harness.
 * @param asOp - The identity-bound harness accessor.
 * @param focal - Optional focal point forwarded to finalize.
 * @returns The created `cmsMedia` id.
 */
async function finalizeImage(
    t: ReturnType<typeof convexTest>,
    asOp: ReturnType<ReturnType<typeof convexTest>['withIdentity']>,
    focal?: { x: number; y: number },
): Promise<Id<'cmsMedia'>> {
    const storageId = await storeBlob(t, new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    const media = await asOp.mutation(finalizeUploadRef, {
        storageId,
        filename: 'photo.png',
        mimeType: 'image/png',
        alt: 'A photo',
        ...(focal === undefined ? {} : { focal }),
    });
    return media.id as Id<'cmsMedia'>;
}

/**
 * Unwraps the stable error code from a ConvexError thrown by a derivative function.
 *
 * @param error - The caught value.
 * @returns The `code` carried on the error's data payload, or `undefined`.
 */
function codeOf(error: unknown): string | undefined {
    if (!(error instanceof ConvexError)) return undefined;
    return (error.data as { code?: string }).code;
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('cms media derivatives', () => {
    it('mirrors the frozen cms size names exactly (sorted equality, no drift)', () => {
        expect([...MEDIA_DERIVATIVE_SIZE_NAMES].sort()).toEqual(MEDIA_IMAGE_SIZES.map(({ name }) => name).sort());
    });

    it('classifies image mime types like the cms helper and fails closed on garbage', () => {
        expect(isImageMimeType('image/png')).toBe(true);
        expect(isImageMimeType('IMAGE/WEBP; q=80')).toBe(true);
        expect(isImageMimeType('video/mp4')).toBe(false);
        expect(isImageMimeType('')).toBe(false);
    });

    it('finalizing an image plants all four pending plan rows and the default-center focal point', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const mediaId = await finalizeImage(t, asOp);

        const rows = await rawDerivativeRows(t, mediaId);
        expect(rows.map(({ size }) => size)).toEqual([...MEDIA_DERIVATIVE_SIZE_NAMES].sort());
        for (const row of rows) {
            expect(row.status).toBe('pending');
            expect(row.shopId).toBe(shopId);
            expect(row.storageId).toBeUndefined();
        }
        const media = await t.run(async (ctx) => ctx.db.get(mediaId));
        expect(media?.focalX).toBe(0.5);
        expect(media?.focalY).toBe(0.5);
    });

    it('persists a clamped caller-supplied focal point at finalize', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const mediaId = await finalizeImage(t, asOp, { x: 0.9, y: -3 });
        const media = await t.run(async (ctx) => ctx.db.get(mediaId));
        expect(media?.focalX).toBe(0.9);
        expect(media?.focalY).toBe(0);
    });

    it('schedules zero derivative work for non-image uploads', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        for (const [filename, mimeType] of [
            ['doc.pdf', 'application/pdf'],
            ['clip.mp4', 'video/mp4'],
        ] as const) {
            const storageId = await storeBlob(t, new Uint8Array([1, 2, 3]));
            const media = await asOp.mutation(finalizeUploadRef, { storageId, filename, mimeType, alt: 'asset' });
            const rows = await rawDerivativeRows(t, media.id as Id<'cmsMedia'>);
            expect(rows).toEqual([]);
            expect(media.focalX).toBeNull();
            expect(media.focalY).toBeNull();
        }
    });

    it('fulfills the plan: four ready rows, original dimensions on the media row, queryable per asset', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const mediaId = await finalizeImage(t, asOp);

        const derivatives = [];
        for (const size of MEDIA_DERIVATIVE_SIZE_NAMES) {
            const dimensions = MEDIA_IMAGE_SIZES.find(({ name }) => name === size);
            if (!dimensions) throw new TypeError(`no frozen dimensions for ${size}`);
            derivatives.push({
                size,
                storageId: await storeBlob(t, new Uint8Array([1, 2, 3, 4])),
                width: dimensions.width,
                height: dimensions.height,
            });
        }
        const saved = await asOp.mutation(saveDerivativesRef, {
            mediaId,
            original: { width: 1600, height: 800 },
            derivatives,
        });

        expect(saved.map(({ size, status }: { size: string; status: string }) => ({ size, status }))).toEqual(
            MEDIA_DERIVATIVE_SIZE_NAMES.map((size) => ({ size, status: 'ready' })),
        );
        const media = await t.run(async (ctx) => ctx.db.get(mediaId));
        expect(media?.width).toBe(1600);
        expect(media?.height).toBe(800);

        const queried = await asOp.query(byMediaRef, { mediaId });
        expect(queried).toHaveLength(MEDIA_DERIVATIVE_SIZE_NAMES.length);
        expect(queried.map(({ size }: { size: string }) => size)).toEqual([...MEDIA_DERIVATIVE_SIZE_NAMES]);
        for (const entry of queried) {
            expect(entry.status).toBe('ready');
            expect(entry.storageId).toBeTruthy();
            expect(entry.width).toBeGreaterThan(0);
            expect(entry.height).toBeGreaterThan(0);
        }
    });

    it('regeneration is idempotent: stable row identity, replaced storageIds, superseded blobs deleted', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const mediaId = await finalizeImage(t, asOp);

        const buildDerivatives = async () => {
            const derivatives = [];
            for (const size of MEDIA_DERIVATIVE_SIZE_NAMES) {
                derivatives.push({
                    size,
                    storageId: await storeBlob(t, new Uint8Array([9, 9, 9])),
                    width: 100,
                    height: 100,
                });
            }
            return derivatives;
        };

        const first = await buildDerivatives();
        await asOp.mutation(saveDerivativesRef, { mediaId, original: { width: 800, height: 600 }, derivatives: first });
        const rowsAfterFirst = await rawDerivativeRows(t, mediaId);

        const second = await buildDerivatives();
        await asOp.mutation(saveDerivativesRef, {
            mediaId,
            original: { width: 800, height: 600 },
            derivatives: second,
        });
        const rowsAfterSecond = await rawDerivativeRows(t, mediaId);

        // No new rows; the (mediaId, size) row identity is stable across the re-run.
        expect(rowsAfterSecond).toHaveLength(MEDIA_DERIVATIVE_SIZE_NAMES.length);
        expect(rowsAfterSecond.map(({ _id }) => _id).sort()).toEqual(rowsAfterFirst.map(({ _id }) => _id).sort());

        // Storage keys are REPLACED (the documented choice) and the superseded blobs deleted.
        const firstIds = new Set(first.map(({ storageId }) => storageId));
        for (const row of rowsAfterSecond) {
            expect(row.storageId).toBeDefined();
            if (row.storageId) expect(firstIds.has(row.storageId)).toBe(false);
        }
        for (const { storageId } of first) {
            const blob = await t.run(async (ctx) => ctx.storage.get(storageId));
            expect(blob).toBeNull();
        }
    });

    it('rejects fulfillment for non-images, duplicates, missing blobs, and foreign/unknown media', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const original = { width: 100, height: 100 };
        const fulfillment = async () => [
            { size: 'thumbnail' as const, storageId: await storeBlob(t, new Uint8Array([1])), width: 10, height: 10 },
        ];

        // Non-image original.
        const pdfStorageId = await storeBlob(t, new Uint8Array([1]));
        const pdf = await asA.mutation(finalizeUploadRef, {
            storageId: pdfStorageId,
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            alt: 'doc',
        });
        let caught: unknown;
        try {
            await asA.mutation(saveDerivativesRef, {
                mediaId: pdf.id,
                original,
                derivatives: await fulfillment(),
            });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaDerivativeErrorCode.NOT_AN_IMAGE);

        const mediaId = await finalizeImage(t, asA);

        // Duplicate size within one call.
        try {
            caught = undefined;
            const duplicate = [...(await fulfillment()), ...(await fulfillment())];
            await asA.mutation(saveDerivativesRef, { mediaId, original, derivatives: duplicate });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaDerivativeErrorCode.DUPLICATE_SIZE);

        // Missing blob behind a submitted storage id.
        try {
            caught = undefined;
            const [entry] = await fulfillment();
            if (!entry) throw new TypeError('expected a fulfillment entry');
            await t.run(async (ctx) => ctx.storage.delete(entry.storageId));
            await asA.mutation(saveDerivativesRef, { mediaId, original, derivatives: [entry] });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaDerivativeErrorCode.BLOB_NOT_FOUND);

        // Foreign media is indistinguishable from absent media for the other tenant.
        try {
            caught = undefined;
            await asB.mutation(saveDerivativesRef, { mediaId, original, derivatives: await fulfillment() });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaDerivativeErrorCode.MEDIA_NOT_FOUND);
        await expect(asB.query(byMediaRef, { mediaId })).resolves.toEqual([]);
    });
});
