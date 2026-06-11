import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';

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
 * Module map for `convex-test`: the real `cms/documents` module is mapped so `save`/`get` resolve
 * by `FunctionReference` and run end to end; the dummy `_generated` key only anchors convex-test's
 * `/convex/` module-root detection (see `cms/access.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/documents.ts': () => import('./documents'),
};

const saveRef = makeFunctionReference<'mutation'>('cms/documents:save');
const getRef = makeFunctionReference<'query'>('cms/documents:get');

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them — through
 * convex-test's raw `t.run` ctx (the unscoped path for platform-global `users`/`shops`). The email
 * is the claim `resolveAdminShopId` resolves the tenant from.
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

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('cms/documents.get (CMSDATA-07 shell read)', () => {
    it('reads by documentId, and an unparseable id reads as null', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const saved = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'Hello', slug: 'hello' },
            status: 'draft',
        });

        const doc: Doc<'cmsDocuments'> | null = await asOp.query(getRef, {
            collection: 'pages',
            documentId: saved.documentId,
        });
        expect(doc?._id).toBe(saved.documentId);
        expect((doc?.data as { title: string }).title).toBe('Hello');
        expect(doc?.latestVersionId).toBe(saved.versionId);

        const missing = await asOp.query(getRef, { collection: 'pages', documentId: 'not-an-id' });
        expect(missing).toBeNull();
    });

    it('resolves a singleton target (no addressing args) to the tenant single row', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        expect(await asOp.query(getRef, { collection: 'footer' })).toBeNull();

        const saved = await asOp.mutation(saveRef, {
            collection: 'footer',
            data: { copyrightLine: '© Acme' },
            status: 'draft',
        });

        const doc: Doc<'cmsDocuments'> | null = await asOp.query(getRef, { collection: 'footer' });
        expect(doc?._id).toBe(saved.documentId);
    });

    it('resolves a keyField target on the serialized data and stays tenant-scoped', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const saved = await asA.mutation(saveRef, {
            collection: 'productMetadata',
            data: { shopifyHandle: 'sneaker' },
            status: 'draft',
        });

        const doc: Doc<'cmsDocuments'> | null = await asA.query(getRef, {
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'sneaker',
        });
        expect(doc?._id).toBe(saved.documentId);

        // Tenant B sees nothing under the same key — RLS confines the scan to B's rows.
        const seenByB = await asB.query(getRef, {
            collection: 'productMetadata',
            keyField: 'shopifyHandle',
            keyValue: 'sneaker',
        });
        expect(seenByB).toBeNull();

        // A foreign documentId reads as null too, never as another tenant's row.
        const foreign = await asB.query(getRef, { collection: 'productMetadata', documentId: saved.documentId });
        expect(foreign).toBeNull();
    });

    it('rejects a half-supplied key pair with the typed invalid-target error', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        await expect(
            asOp.query(getRef, { collection: 'productMetadata', keyField: 'shopifyHandle' }),
        ).rejects.toMatchObject({ data: { code: 'CMS_INVALID_DOCUMENT_TARGET' } });
    });
});

describe('cms/documents.save — published state vs working draft (G4FIX-01)', () => {
    it('keeps a published doc published when a draft save lands afterwards (the CMSGATE-02 race)', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const published = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'Live', slug: 'race' },
            status: 'published',
        });

        // The stale autosave arrives AFTER the publish. It must update the working draft only —
        // never the published snapshot or the row's published state.
        const draft = await asOp.mutation(saveRef, {
            documentId: published.documentId,
            collection: 'pages',
            data: { title: 'In-flight draft', slug: 'race' },
            status: 'draft',
        });

        const doc: Doc<'cmsDocuments'> | null = await asOp.query(getRef, {
            collection: 'pages',
            documentId: published.documentId,
        });
        expect(doc?.status).toBe('published');
        expect(doc?.publishedVersionId).toBe(published.versionId);
        expect(doc?.latestVersionId).toBe(draft.versionId);
        expect((doc?.data as { title: string }).title).toBe('In-flight draft');
    });

    it('publishing again moves the published snapshot to the new version', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const first = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'v1', slug: 'repub' },
            status: 'published',
        });
        await asOp.mutation(saveRef, {
            documentId: first.documentId,
            collection: 'pages',
            data: { title: 'v2 draft', slug: 'repub' },
            status: 'draft',
        });
        const second = await asOp.mutation(saveRef, {
            documentId: first.documentId,
            collection: 'pages',
            data: { title: 'v2', slug: 'repub' },
            status: 'published',
        });

        const doc: Doc<'cmsDocuments'> | null = await asOp.query(getRef, {
            collection: 'pages',
            documentId: first.documentId,
        });
        expect(doc?.status).toBe('published');
        expect(doc?.publishedVersionId).toBe(second.versionId);
        expect(doc?.latestVersionId).toBe(second.versionId);
    });

    it('flags a draft save whose optimistic base predates the publish, but still applies it forward', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const seed = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'v1', slug: 'stale' },
            status: 'draft',
        });
        const published = await asOp.mutation(saveRef, {
            documentId: seed.documentId,
            collection: 'pages',
            data: { title: 'v1', slug: 'stale' },
            status: 'published',
        });

        // The stale wire save was crafted against the pre-publish version: merged forward as the
        // working draft, surfaced via the conflict marker, and the publish state untouched.
        const stale = await asOp.mutation(saveRef, {
            documentId: seed.documentId,
            collection: 'pages',
            data: { title: 'stale payload', slug: 'stale' },
            status: 'draft',
            baseVersionId: seed.versionId,
        });
        expect(stale.conflict).toBe('publish-superseded-base');

        const doc: Doc<'cmsDocuments'> | null = await asOp.query(getRef, {
            collection: 'pages',
            documentId: seed.documentId,
        });
        expect(doc?.status).toBe('published');
        expect(doc?.publishedVersionId).toBe(published.versionId);
        expect((doc?.data as { title: string }).title).toBe('stale payload');

        // Draft-on-draft divergence (no publish in between) keeps last-write-wins WITHOUT a marker.
        const peer = await asOp.mutation(saveRef, {
            documentId: seed.documentId,
            collection: 'pages',
            data: { title: 'peer draft', slug: 'stale' },
            status: 'draft',
            baseVersionId: stale.versionId,
        });
        expect(peer.conflict).toBeUndefined();

        // A base AT the published snapshot is current — no marker either.
        const rebased = await asOp.mutation(saveRef, {
            documentId: seed.documentId,
            collection: 'pages',
            data: { title: 'rebased draft', slug: 'stale' },
            status: 'draft',
            baseVersionId: published.versionId,
        });
        expect(rebased.conflict).toBeUndefined();
    });

    it('adopts a pointer-less published row (migrated shape) before the first draft save touches it', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        // An ETL/seed-shaped row: published, but with no publishedVersionId pointer.
        const migratedId = await t.run(async (ctx) =>
            ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'pages',
                data: { title: 'Migrated live', slug: 'migrated' },
                status: 'published',
                createdAt: NOW,
                updatedAt: NOW,
            }),
        );

        await asOp.mutation(saveRef, {
            documentId: migratedId,
            collection: 'pages',
            data: { title: 'Draft over migrated', slug: 'migrated' },
            status: 'draft',
        });

        const doc = await t.run(async (ctx) => ctx.db.get(migratedId));
        expect(doc?.status).toBe('published');
        expect(doc?.publishedVersionId).toBeDefined();
        const baseline = await t.run(async (ctx) =>
            doc?.publishedVersionId ? ctx.db.get(doc.publishedVersionId) : null,
        );
        expect(baseline?.status).toBe('published');
        expect((baseline?.snapshot as { title: string }).title).toBe('Migrated live');
        expect((doc?.data as { title: string }).title).toBe('Draft over migrated');
    });
});
