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
