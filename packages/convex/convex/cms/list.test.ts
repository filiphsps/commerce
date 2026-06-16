import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { CmsListErrorCode, type CmsListPage } from './list';

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
 * Module map for `convex-test`: the real `cms/documents` (the seeding `save`) and `cms/list` modules
 * are mapped so `save`/`list` resolve by `FunctionReference` and run end to end; the dummy `_generated`
 * key only anchors convex-test's `/convex/` module-root detection (see `cms/versions.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/documents.ts': () => import('./documents'),
    '/convex/cms/list.ts': () => import('./list'),
};

const saveRef = makeFunctionReference<'mutation'>('cms/documents:save');
const listRef = makeFunctionReference<'query'>('cms/list:list');

/**
 * Seeds an isolated tenant — one operator user, one shop, and a collaborator linking them — through
 * convex-test's raw `t.run` ctx. The email is the claim `resolveAdminShopId` resolves the tenant from.
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

describe('cms admin list pagination', () => {
    it('returns aggregate totalDocs matching the seeded volume', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        for (let i = 0; i < 5; i += 1) {
            await asOp.mutation(saveRef, {
                collection: 'pages',
                data: { title: `p${i}`, slug: `p-${i}` },
                status: 'draft',
            });
        }

        const first = (await asOp.query(listRef, { collection: 'pages', pageSize: 2 })) as CmsListPage;
        expect(first.totalDocs).toBe(5);
        expect(first.totalPages).toBe(3);
        expect(first.page).toBe(1);
        expect(first.docs).toHaveLength(2);
        // A different collection on the same tenant counts independently (tenant + collection scoped).
        expect((await asOp.query(listRef, { collection: 'articles' })).totalDocs).toBe(0);
    });

    it('derives a stable page-N cursor and walks to the requested page', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        for (let i = 0; i < 5; i += 1) {
            await asOp.mutation(saveRef, {
                collection: 'pages',
                data: { title: `p${i}`, slug: `p-${i}` },
                status: 'draft',
            });
        }

        const page2a = (await asOp.query(listRef, { collection: 'pages', page: 2, pageSize: 2 })) as CmsListPage;
        const page2b = (await asOp.query(listRef, { collection: 'pages', page: 2, pageSize: 2 })) as CmsListPage;

        // The cursor that ADDRESSES page 2 is deterministic for fixed data, and so is its window.
        expect(page2a.cursor).toBe(page2b.cursor);
        expect(page2a.cursor).not.toBeNull();
        expect(page2a.docs.map((d) => d._id)).toEqual(page2b.docs.map((d) => d._id));
        expect(page2a.docs).toHaveLength(2);
        expect(page2a.isDone).toBe(false);

        const page3 = (await asOp.query(listRef, { collection: 'pages', page: 3, pageSize: 2 })) as CmsListPage;
        expect(page3.docs).toHaveLength(1);
        expect(page3.isDone).toBe(true);
        expect(page3.continueCursor).toBeNull();

        // Page 1 + 2 + 3 partition the volume with no overlap and no dropped rows.
        const page1 = (await asOp.query(listRef, { collection: 'pages', page: 1, pageSize: 2 })) as CmsListPage;
        const seen = new Set([...page1.docs, ...page2a.docs, ...page3.docs].map((d) => d._id));
        expect(seen.size).toBe(5);
    });

    it('refuses a page past the last addressable page with a typed error', async () => {
        const t = convexTest(schema, modules);
        await seedTenant(t, 'op@a.example.com', 'shop_a');
        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op@a.example.com' });

        for (let i = 0; i < 5; i += 1) {
            await asOp.mutation(saveRef, {
                collection: 'pages',
                data: { title: `p${i}`, slug: `p-${i}` },
                status: 'draft',
            });
        }

        const error = await asOp
            .query(listRef, { collection: 'pages', page: 4, pageSize: 2 })
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ConvexError);
        expect((error as ConvexError<{ code: string }>).data.code).toBe(CmsListErrorCode.PAGE_OUT_OF_RANGE);
    });
});
