import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doc, Id } from '../_generated/dataModel';
import schema from '../schema';

/**
 * The trusted Clerk operator issuer the tenant constructors assert against (via the resolveActiveAdminShopId chain),
 * stubbed into `CLERK_FRONTEND_API_URL` so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed timestamps; its value only has to satisfy the
 * numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Module map for `convex-test`: the real `cms/documents` + `cms/versions` modules are mapped so
 * `save`/`list`/`restore` resolve by `FunctionReference` and run end to end; the dummy `_generated`
 * key only anchors convex-test's `/convex/` module-root detection (see `cms/access.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/documents.ts': () => import('./documents'),
    '/convex/cms/versions.ts': () => import('./versions'),
};

const saveRef = makeFunctionReference<'mutation'>('cms/documents:save');
const listRef = makeFunctionReference<'query'>('cms/versions:list');
const restoreRef = makeFunctionReference<'mutation'>('cms/versions:restore');

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
    vi.stubEnv('CLERK_FRONTEND_API_URL', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('cms drafts / versions / restore', () => {
    it('save writes exactly one version row and advances latestVersionId', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const first = await asOp.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'Hello', slug: 'hello' },
            status: 'draft',
        });

        const afterFirst = await asOp.query(listRef, { documentId: first.documentId });
        expect(afterFirst).toHaveLength(1);
        expect(afterFirst[0]?._id).toBe(first.versionId);

        const liveAfterFirst = await t.run((ctx) => ctx.db.get(first.documentId));
        expect(liveAfterFirst?.shopId).toBe(shopId);
        expect(liveAfterFirst?.latestVersionId).toBe(first.versionId);

        const second = await asOp.mutation(saveRef, {
            documentId: first.documentId,
            collection: 'pages',
            data: { title: 'Hello again', slug: 'hello' },
            status: 'published',
        });

        const afterSecond = await asOp.query(listRef, { documentId: first.documentId });
        // Exactly one new row per save — two saves total two versions, not more.
        expect(afterSecond).toHaveLength(2);
        const liveAfterSecond = await t.run((ctx) => ctx.db.get(first.documentId));
        expect(liveAfterSecond?.latestVersionId).toBe(second.versionId);
        expect(liveAfterSecond?.status).toBe('published');
    });

    it('list returns history ordered oldest-first and scoped to the tenant', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const created = await asA.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'v1', slug: 's' },
            status: 'draft',
        });
        const v2 = await asA.mutation(saveRef, {
            documentId: created.documentId,
            collection: 'pages',
            data: { title: 'v2', slug: 's' },
            status: 'draft',
        });
        const v3 = await asA.mutation(saveRef, {
            documentId: created.documentId,
            collection: 'pages',
            data: { title: 'v3', slug: 's' },
            status: 'draft',
        });

        const history = await asA.query(listRef, { documentId: created.documentId });
        expect(history.map((row: Doc<'cmsVersions'>) => row._id)).toEqual([
            created.versionId,
            v2.versionId,
            v3.versionId,
        ]);
        expect(history.map((row: Doc<'cmsVersions'>) => (row.snapshot as { title: string }).title)).toEqual([
            'v1',
            'v2',
            'v3',
        ]);

        // Tenant B cannot see tenant A's history even when handed A's documentId — RLS denies the rows.
        const seenByB = await asB.query(listRef, { documentId: created.documentId });
        expect(seenByB).toEqual([]);
    });

    it('restore re-materializes a prior version as a new draft without mutating history', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        const v1 = await asA.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'original', slug: 'orig' },
            status: 'draft',
        });
        await asA.mutation(saveRef, {
            documentId: v1.documentId,
            collection: 'pages',
            data: { title: 'replacement', slug: 'orig' },
            status: 'published',
        });

        const restored = await asA.mutation(restoreRef, { versionId: v1.versionId });
        expect(restored.documentId).toBe(v1.documentId);

        const live = await t.run((ctx) => ctx.db.get(v1.documentId));
        // Live doc carries v1's snapshot again as the WORKING DRAFT pointing at the appended
        // version — while the published snapshot (and the derived status) stay pinned, so a
        // restore never unpublishes (G4FIX-01): a publish is still required to make it live.
        expect((live?.data as { title: string }).title).toBe('original');
        expect(live?.status).toBe('published');
        expect(live?.publishedVersionId).toBeDefined();
        expect(live?.latestVersionId).toBe(restored.versionId);

        const history = await asA.query(listRef, { documentId: v1.documentId });
        // History is append-only: the two saves plus the restore snapshot, oldest first.
        expect(history).toHaveLength(3);
        expect(history[0]?._id).toBe(v1.versionId);
        expect((history[2]?.snapshot as { title: string }).title).toBe('original');
        expect(history[2]?.status).toBe('draft');
    });

    it('restore of another tenant version fails closed', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        await seedTenant(t, 'op@b.example.com', 'shop_b');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op@b.example.com' });

        const v1 = await asA.mutation(saveRef, {
            collection: 'pages',
            data: { title: 't', slug: 's' },
            status: 'draft',
        });

        await expect(asB.mutation(restoreRef, { versionId: v1.versionId })).rejects.toThrow(ConvexError);
    });

    it('stamps the acting principal as the version author; restore attribution is the restorer', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedTenant(t, 'op@a.example.com', 'shop_a');
        // A second collaborator on the SAME shop, with a blank name so the label falls back to the
        // email — the restorer whose attribution the restore snapshot must carry.
        const restorerId = await t.run(async (ctx) => {
            const userId = await ctx.db.insert('users', {
                email: 'restorer@a.example.com',
                name: '   ',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
            return userId;
        });
        const authorId = await t.run(async (ctx) => {
            const users: Doc<'users'>[] = await ctx.db.query('users').collect();
            return users.find((user) => user.email === 'op@a.example.com')?._id;
        });
        const asAuthor = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });
        const asRestorer = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|r',
            email: 'restorer@a.example.com',
        });

        const v1 = await asAuthor.mutation(saveRef, {
            collection: 'pages',
            data: { title: 'authored', slug: 'a' },
            status: 'draft',
        });
        const restored = await asRestorer.mutation(restoreRef, { versionId: v1.versionId });

        const history = await asAuthor.query(listRef, { documentId: v1.documentId });
        expect(history).toHaveLength(2);
        // The save stamps the saver (display label = the user's name)…
        expect(history[0]?.author).toEqual({ userId: authorId, label: 'Operator' });
        // …and the restore stamps the RESTORER, with the blank name falling back to the email.
        expect(history[1]?._id).toBe(restored.versionId);
        expect(history[1]?.author).toEqual({ userId: restorerId, label: 'restorer@a.example.com' });
    });

    it('draft save persists with required fields empty; publish enforces them', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        // Draft with no title/slug persists — server-side required validation is skipped for drafts.
        const draft = await asA.mutation(saveRef, { collection: 'pages', data: {}, status: 'draft' });
        const live = await t.run((ctx) => ctx.db.get(draft.documentId));
        expect(live?.status).toBe('draft');
        const history = await asA.query(listRef, { documentId: draft.documentId });
        expect(history).toHaveLength(1);

        // Publishing the same empty document fails closed on the required-field contract.
        await expect(
            asA.mutation(saveRef, { documentId: draft.documentId, collection: 'pages', data: {}, status: 'published' }),
        ).rejects.toThrow(/required field/i);

        // Publishing with the required fields present succeeds.
        const published = await asA.mutation(saveRef, {
            documentId: draft.documentId,
            collection: 'pages',
            data: { title: 'Now valid', slug: 'now-valid' },
            status: 'published',
        });
        const afterPublish = await t.run((ctx) => ctx.db.get(published.documentId));
        expect(afterPublish?.status).toBe('published');
    });
});
