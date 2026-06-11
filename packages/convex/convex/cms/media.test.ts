import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';
import { CmsListErrorCode } from './list';
import { CmsMediaErrorCode, isAllowedMediaMimeType } from './media';

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
 * Module map for `convex-test`: the real `cms/media` module is mapped so the upload mutations and
 * read queries resolve by `FunctionReference` and run end to end (`cms/media_derivatives` rides
 * along for the URL-resolution tests' fulfillment calls); the dummy `_generated` key only anchors
 * convex-test's `/convex/` module-root detection (see `cms/access.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/media.ts': () => import('./media'),
    '/convex/cms/media_derivatives.ts': () => import('./media_derivatives'),
};

const generateUploadUrlRef = makeFunctionReference<'mutation'>('cms/media:generateUploadUrl');
const finalizeUploadRef = makeFunctionReference<'mutation'>('cms/media:finalizeUpload');
const listRef = makeFunctionReference<'query'>('cms/media:list');
const byIdRef = makeFunctionReference<'query'>('cms/media:byId');
const pageRef = makeFunctionReference<'query'>('cms/media:page');
const updateMediaMetadataRef = makeFunctionReference<'mutation'>('cms/media:updateMediaMetadata');
const saveDerivativesRef = makeFunctionReference<'mutation'>('cms/media_derivatives:saveDerivatives');

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them —
 * through convex-test's raw `t.run` ctx (the unscoped path for platform-global `users`/`shops`).
 * The email is the claim `resolveAdminShopId` resolves the tenant from.
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
 * Stores raw bytes into convex-test's in-memory file storage, simulating the client's POST to the
 * `generateUploadUrl` byte sink (convex-test exposes no HTTP upload endpoint, so the storage write
 * happens through the raw ctx instead).
 *
 * @param t - The convex-test harness.
 * @param bytes - The blob contents.
 * @returns The stored blob's storage id.
 */
async function storeBlob(t: ReturnType<typeof convexTest>, bytes: Uint8Array<ArrayBuffer>): Promise<Id<'_storage'>> {
    return t.run(async (ctx) => ctx.storage.store(new Blob([bytes])));
}

/**
 * Unwraps the stable error code from a ConvexError thrown by a media function.
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

describe('cms media storage', () => {
    it('round-trips an upload: url, original blob, tenant-scoped row, contract-shaped emission', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const { url } = await asOp.mutation(generateUploadUrlRef, {});
        expect(url).toMatch(/upload/);

        const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        const storageId = await storeBlob(t, bytes);
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId,
            filename: 'logo.png',
            mimeType: 'image/png',
            alt: 'The shop logo',
            caption: 'Logo',
        });

        expect(media).toMatchObject({
            tenant: String(shopId),
            alt: 'The shop logo',
            caption: 'Logo',
            filename: 'logo.png',
            mimeType: 'image/png',
            filesize: bytes.byteLength,
        });
        // CMSMEDIA-03: the original's serving URL resolves at read time from Convex storage.
        expect(typeof media.url).toBe('string');
        expect(typeof media.id).toBe('string');
        expect(new Date(media.createdAt).getTime()).toBeGreaterThan(0);

        // The persisted row is tenant-scoped and keeps the original-asset reference.
        const row = await t.run(async (ctx) => ctx.db.get(media.id as Id<'cmsMedia'>));
        expect(row?.shopId).toBe(shopId);
        expect(row?.storageId).toBe(storageId);
        // The blob itself is not Convex-serializable across `t.run`, so only its size escapes.
        const blobSize = await t.run(async (ctx) => (await ctx.storage.get(storageId))?.size ?? null);
        expect(blobSize).toBe(bytes.byteLength);

        // The by_shop read paths surface the same contract shape.
        const listed = await asOp.query(listRef, {});
        expect(listed).toHaveLength(1);
        expect(listed[0]?.id).toBe(media.id);
        const fetched = await asOp.query(byIdRef, { mediaId: media.id });
        expect(fetched?.filename).toBe('logo.png');
    });

    it('rejects a disallowed mime type with the stable error code and persists nothing', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e]));
        let caught: unknown;
        try {
            await asOp.mutation(finalizeUploadRef, {
                storageId,
                filename: 'evil.html',
                mimeType: 'text/html',
                alt: 'nope',
            });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaErrorCode.UNSUPPORTED_MIME_TYPE);
        await expect(asOp.query(listRef, {})).resolves.toEqual([]);
    });

    it('accepts every allowlisted family: image/*, video/mp4, application/pdf', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const accepted = ['image/webp', 'image/png', 'video/mp4', 'application/pdf'];
        for (const mimeType of accepted) {
            const storageId = await storeBlob(t, new Uint8Array([1, 2, 3]));
            const media = await asOp.mutation(finalizeUploadRef, {
                storageId,
                filename: `asset.${mimeType.split('/')[1]}`,
                mimeType,
                alt: 'asset',
            });
            expect(media.mimeType).toBe(mimeType);
        }
        await expect(asOp.query(listRef, {})).resolves.toHaveLength(accepted.length);
    });

    it('rejects a non-mp4 video (the video family is NOT wildcarded)', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([1]));
        let caught: unknown;
        try {
            await asOp.mutation(finalizeUploadRef, {
                storageId,
                filename: 'clip.webm',
                mimeType: 'video/webm',
                alt: 'clip',
            });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaErrorCode.UNSUPPORTED_MIME_TYPE);
    });

    it('fails closed when no blob exists behind the storage id', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([1]));
        await t.run(async (ctx) => ctx.storage.delete(storageId));

        let caught: unknown;
        try {
            await asOp.mutation(finalizeUploadRef, {
                storageId,
                filename: 'gone.png',
                mimeType: 'image/png',
                alt: 'gone',
            });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaErrorCode.BLOB_NOT_FOUND);
    });

    it('confines reads to the resolved tenant: foreign media is invisible to list and byId', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([1, 2]));
        const media = await asA.mutation(finalizeUploadRef, {
            storageId,
            filename: 'a.png',
            mimeType: 'image/png',
            alt: 'a',
        });

        await expect(asB.query(listRef, {})).resolves.toEqual([]);
        await expect(asB.query(byIdRef, { mediaId: media.id })).resolves.toBeNull();
        await expect(asA.query(byIdRef, { mediaId: media.id })).resolves.not.toBeNull();
    });

    it('reads an unparseable byId id as null — the bridge passes the URL segment through unbranded', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        await expect(asA.query(byIdRef, { mediaId: 'not-a-convex-id' })).resolves.toBeNull();
    });

    it('resolves the original URL plus every ready derivative URL from its own blob (CMSMEDIA-03)', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const originalId = await storeBlob(t, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId: originalId,
            filename: 'photo.png',
            mimeType: 'image/png',
            alt: 'photo',
        });

        const frozenSizes = [
            { size: 'thumbnail', width: 320, height: 240 },
            { size: 'card', width: 768, height: 576 },
            { size: 'feature', width: 1280, height: 720 },
            { size: 'hero', width: 1920, height: 1080 },
        ] as const;
        const derivatives = [];
        for (const { size, width, height } of frozenSizes) {
            derivatives.push({ size, width, height, storageId: await storeBlob(t, new Uint8Array([1, 2])) });
        }
        await asOp.mutation(saveDerivativesRef, {
            mediaId: media.id,
            original: { width: 4000, height: 3000 },
            derivatives,
        });

        const resolved = await asOp.query(byIdRef, { mediaId: media.id });
        expect(typeof resolved?.url).toBe('string');
        expect(resolved?.sizes).toBeDefined();
        for (const { size, width, height } of frozenSizes) {
            const entry = resolved?.sizes?.[size];
            expect(typeof entry?.url).toBe('string');
            // A ready derivative serves ITS OWN blob, never the original.
            expect(entry?.url).not.toBe(resolved?.url);
            expect(entry?.width).toBe(width);
            expect(entry?.height).toBe(height);
            expect(entry?.filesize).toBe(2);
        }
        expect(resolved?.thumbnailURL).toBe(resolved?.sizes?.thumbnail?.url);
    });

    it('falls back to the original URL for pending derivatives so no size ever serves broken', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const originalId = await storeBlob(t, new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId: originalId,
            filename: 'fresh.png',
            mimeType: 'image/png',
            alt: 'fresh',
        });

        // Fulfill only the thumbnail; the other three plan rows stay `pending`.
        const thumbnailBlob = await storeBlob(t, new Uint8Array([9, 9, 9]));
        await asOp.mutation(saveDerivativesRef, {
            mediaId: media.id,
            original: { width: 1024, height: 768 },
            derivatives: [{ size: 'thumbnail', width: 320, height: 240, storageId: thumbnailBlob }],
        });

        const resolved = await asOp.query(byIdRef, { mediaId: media.id });
        expect(typeof resolved?.url).toBe('string');
        expect(resolved?.sizes?.thumbnail?.url).not.toBe(resolved?.url);
        for (const pending of ['card', 'feature', 'hero'] as const) {
            const entry = resolved?.sizes?.[pending];
            expect(entry?.url).toBe(resolved?.url);
            // The fallback carries the ORIGINAL's metadata, post-fulfillment dimensions included.
            expect(entry?.width).toBe(1024);
            expect(entry?.height).toBe(768);
            expect(entry?.mimeType).toBe('image/png');
            expect(entry?.filename).toBe('fresh.png');
        }
        expect(resolved?.thumbnailURL).toBe(resolved?.sizes?.thumbnail?.url);

        // An untouched plan (zero fulfillments) serves the original everywhere, thumbnail included.
        const untouchedId = await storeBlob(t, new Uint8Array([0x89, 0x50]));
        const untouched = await asOp.mutation(finalizeUploadRef, {
            storageId: untouchedId,
            filename: 'untouched.png',
            mimeType: 'image/png',
            alt: 'untouched',
        });
        expect(typeof untouched.url).toBe('string');
        expect(untouched.thumbnailURL).toBe(untouched.url);
        for (const size of ['thumbnail', 'card', 'feature', 'hero'] as const) {
            expect(untouched.sizes?.[size]?.url).toBe(untouched.url);
        }
    });

    it('carries only the original URL for non-image media (no sizes map)', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId,
            filename: 'manual.pdf',
            mimeType: 'application/pdf',
            alt: 'manual',
        });
        expect(typeof media.url).toBe('string');
        expect(media.thumbnailURL).toBeNull();
        expect(media.sizes).toBeUndefined();

        const listed = await asOp.query(listRef, {});
        expect(listed[0]?.url).toBe(media.url);
    });

    it('updates alt and caption post-upload, and an explicit null clears the caption', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId,
            filename: 'manual.pdf',
            mimeType: 'application/pdf',
            alt: 'manual',
            caption: 'v1 manual',
        });

        const updated = await asOp.mutation(updateMediaMetadataRef, {
            mediaId: media.id,
            alt: 'Product manual',
            caption: 'Second edition',
        });
        expect(updated.rearmedDerivatives).toBe(false);
        expect(updated.media).toMatchObject({ alt: 'Product manual', caption: 'Second edition' });

        const cleared = await asOp.mutation(updateMediaMetadataRef, { mediaId: media.id, caption: null });
        expect(cleared.media.caption).toBeNull();
        // The clear removed the optional column, not just the wire value.
        const row = await t.run(async (ctx) => ctx.db.get(media.id as Id<'cmsMedia'>));
        expect(row?.caption).toBeUndefined();
        expect(row?.alt).toBe('Product manual');
    });

    it('denies a cross-tenant metadata update with the stable MEDIA_NOT_FOUND code', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([1, 2]));
        const media = await asA.mutation(finalizeUploadRef, {
            storageId,
            filename: 'a.png',
            mimeType: 'image/png',
            alt: 'a',
        });

        let caught: unknown;
        try {
            await asB.mutation(updateMediaMetadataRef, { mediaId: media.id, alt: 'stolen' });
        } catch (error) {
            caught = error;
        }
        expect(codeOf(caught)).toBe(CmsMediaErrorCode.MEDIA_NOT_FOUND);
        // The foreign row is untouched, and an unparseable id reads the same as a foreign one.
        const fetched = await asA.query(byIdRef, { mediaId: media.id });
        expect(fetched?.alt).toBe('a');
        let garbled: unknown;
        try {
            await asA.mutation(updateMediaMetadataRef, { mediaId: 'not-a-convex-id', alt: 'x' });
        } catch (error) {
            garbled = error;
        }
        expect(codeOf(garbled)).toBe(CmsMediaErrorCode.MEDIA_NOT_FOUND);
    });

    it('re-arms every ready derivative on a focal move, and regeneration re-fulfills idempotently', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const originalId = await storeBlob(t, new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId: originalId,
            filename: 'photo.png',
            mimeType: 'image/png',
            alt: 'photo',
        });

        const sizes = ['thumbnail', 'card', 'feature', 'hero'] as const;
        const firstPass = [];
        for (const size of sizes) {
            firstPass.push({ size, width: 100, height: 100, storageId: await storeBlob(t, new Uint8Array([7])) });
        }
        await asOp.mutation(saveDerivativesRef, {
            mediaId: media.id,
            original: { width: 2000, height: 1000 },
            derivatives: firstPass,
        });

        // The raw `t.run` ctx is typed off the spread-erased schema (no app index typing), so this
        // unscoped test-only read scans and filters instead of using `by_media`.
        const readRows = async (): Promise<Doc<'cmsMediaDerivatives'>[]> =>
            t.run(async (ctx) => {
                const rows = await ctx.db.query('cmsMediaDerivatives').collect();
                return rows.filter((row) => row.mediaId === (media.id as Id<'cmsMedia'>));
            });
        expect((await readRows()).every((row) => row.status === 'ready')).toBe(true);

        const updated = await asOp.mutation(updateMediaMetadataRef, {
            mediaId: media.id,
            focal: { x: 0.2, y: 0.8 },
        });
        expect(updated.rearmedDerivatives).toBe(true);
        expect(updated.media.focalX).toBe(0.2);
        expect(updated.media.focalY).toBe(0.8);

        // All four sizes are focal-aware cover crops, so the whole plan re-pends — keeping each
        // row's storageId so the regeneration fulfillment can replace + delete the stale blob.
        const rearmed = await readRows();
        expect(rearmed).toHaveLength(sizes.length);
        for (const row of rearmed) {
            expect(row.status).toBe('pending');
            expect(row.storageId).toBeDefined();
        }
        // A pending row falls back to the original's URL at read time, so nothing serves broken.
        const midRegeneration = await asOp.query(byIdRef, { mediaId: media.id });
        for (const size of sizes) {
            expect(midRegeneration?.sizes?.[size]?.url).toBe(midRegeneration?.url);
        }

        // The CMSMEDIA-02 regeneration contract: re-fulfillment patches the SAME rows back to
        // ready, replaces their storageIds, and deletes the superseded blobs — row count is stable.
        const staleBlobIds = rearmed.map((row) => row.storageId);
        const secondPass = [];
        for (const size of sizes) {
            secondPass.push({ size, width: 100, height: 100, storageId: await storeBlob(t, new Uint8Array([8])) });
        }
        await asOp.mutation(saveDerivativesRef, {
            mediaId: media.id,
            original: { width: 2000, height: 1000 },
            focal: { x: 0.2, y: 0.8 },
            derivatives: secondPass,
        });
        const regenerated = await readRows();
        expect(regenerated).toHaveLength(sizes.length);
        expect(regenerated.every((row) => row.status === 'ready')).toBe(true);
        for (const staleId of staleBlobIds) {
            expect(staleId).toBeDefined();
            const blob = await t.run(async (ctx) => (staleId ? ctx.storage.get(staleId) : null));
            expect(blob).toBeNull();
        }
    });

    it('leaves ready derivatives alone when the focal point is unchanged or only text changes', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const originalId = await storeBlob(t, new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
        const media = await asOp.mutation(finalizeUploadRef, {
            storageId: originalId,
            filename: 'still.png',
            mimeType: 'image/png',
            alt: 'still',
        });
        const derivatives = [];
        for (const size of ['thumbnail', 'card', 'feature', 'hero'] as const) {
            derivatives.push({ size, width: 10, height: 10, storageId: await storeBlob(t, new Uint8Array([3])) });
        }
        await asOp.mutation(saveDerivativesRef, {
            mediaId: media.id,
            original: { width: 800, height: 600 },
            derivatives,
        });

        // Fulfillment defaulted the focal to center; resubmitting center is NOT a focal move.
        const sameFocal = await asOp.mutation(updateMediaMetadataRef, {
            mediaId: media.id,
            alt: 'still life',
            focal: { x: 0.5, y: 0.5 },
        });
        expect(sameFocal.rearmedDerivatives).toBe(false);
        const textOnly = await asOp.mutation(updateMediaMetadataRef, { mediaId: media.id, caption: 'quiet' });
        expect(textOnly.rearmedDerivatives).toBe(false);

        const rows = await t.run(async (ctx) => {
            const all = await ctx.db.query('cmsMediaDerivatives').collect();
            return all.filter((row) => row.mediaId === (media.id as Id<'cmsMedia'>));
        });
        expect(rows.every((row) => row.status === 'ready')).toBe(true);
        expect(textOnly.media.alt).toBe('still life');
    });

    it('pages through the full library with list.ts addressing metadata, newest first', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        for (let index = 1; index <= 5; index += 1) {
            const storageId = await storeBlob(t, new Uint8Array([index]));
            await asOp.mutation(finalizeUploadRef, {
                storageId,
                filename: `doc-${index}.pdf`,
                mimeType: 'application/pdf',
                alt: `doc ${index}`,
            });
        }

        const first = await asOp.query(pageRef, { page: 1, pageSize: 2 });
        expect(first).toMatchObject({ page: 1, pageSize: 2, totalDocs: 5, totalPages: 3, isDone: false });
        expect(first.docs.map((doc: { filename: string }) => doc.filename)).toEqual(['doc-5.pdf', 'doc-4.pdf']);

        const second = await asOp.query(pageRef, { page: 2, pageSize: 2 });
        expect(second.docs.map((doc: { filename: string }) => doc.filename)).toEqual(['doc-3.pdf', 'doc-2.pdf']);
        expect(second.isDone).toBe(false);

        const last = await asOp.query(pageRef, { page: 3, pageSize: 2 });
        expect(last.docs.map((doc: { filename: string }) => doc.filename)).toEqual(['doc-1.pdf']);
        expect(last.isDone).toBe(true);

        // An empty library still serves page 1 (the friendly zero-state, not a refusal).
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });
        const empty = await asB.query(pageRef, {});
        expect(empty).toMatchObject({ docs: [], page: 1, totalDocs: 0, totalPages: 1, isDone: true });
    });

    it('refuses a page past the last addressable page with the shared typed code', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const storageId = await storeBlob(t, new Uint8Array([1]));
        await asOp.mutation(finalizeUploadRef, {
            storageId,
            filename: 'only.pdf',
            mimeType: 'application/pdf',
            alt: 'only',
        });

        let caught: unknown;
        try {
            await asOp.query(pageRef, { page: 2, pageSize: 25 });
        } catch (error) {
            caught = error;
        }
        // The SAME code `cms/list:list` throws, so the editor shell's notFound mapping inherits.
        expect(codeOf(caught)).toBe(CmsListErrorCode.PAGE_OUT_OF_RANGE);
    });

    it('matches mime types case-insensitively, with parameters, and fails closed on garbage', () => {
        expect(isAllowedMediaMimeType('IMAGE/PNG')).toBe(true);
        expect(isAllowedMediaMimeType('image/svg+xml; charset=utf-8')).toBe(true);
        expect(isAllowedMediaMimeType('video/mp4')).toBe(true);
        expect(isAllowedMediaMimeType('application/pdf')).toBe(true);
        expect(isAllowedMediaMimeType('text/html')).toBe(false);
        expect(isAllowedMediaMimeType('application/pdfx')).toBe(false);
        expect(isAllowedMediaMimeType('')).toBe(false);
        expect(isAllowedMediaMimeType('not-a-mime')).toBe(false);
    });
});
