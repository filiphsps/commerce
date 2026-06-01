import type { Payload } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { getArticle } from './get-article';
import { getArticles } from './get-articles';
import { getBusinessData } from './get-business-data';
import { getCollectionMetadata } from './get-collection-metadata';
import { getFooter } from './get-footer';
import { getHeader } from './get-header';
import { getPage } from './get-page';
import { getPages } from './get-pages';
import { getProductMetadata } from './get-product-metadata';
import { __resetTenantIdCache } from './resolve-tenant-id';

// Phase-0 regression gate for the Mongo→Convex migration. Every CMS read getter
// MUST keep emitting the exact `where` predicate SHAPE it emits today. These are
// CHARACTERIZATION tests: they pin the CURRENT behavior (shop-id tenant scoping,
// the never-drop sentinel, and null-on-missing), not an idealized one. If a
// refactor changes any shape below, this gate fails loudly instead of silently
// leaking or dropping tenant-scoped content.
//
// Since UNIFY-03 repointed `tenantsSlug` to `shops`, the tenant key IS the shop
// row id: `resolveTenantId` confirms the shop exists in the unified `shops`
// collection and returns that id, and every getter filters by it. The `where`
// SHAPE is unchanged; only the value's source moved from a translated
// Tenant._id to the shop id itself.

type FindArgs = Parameters<Payload['find']>[0];

const SHOP_ID = 'shop-x';

const makePayload = (docs: unknown[] = []): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async (args: FindArgs) => {
        if (args.collection === 'shops') {
            return { docs: [{ id: SHOP_ID }], totalDocs: 1, hasNextPage: false, hasPrevPage: false };
        }
        return { docs, totalDocs: docs.length, hasNextPage: false, hasPrevPage: false };
    });
    return { payload: { find } as unknown as Payload, find };
};

const makePayloadWithoutShop = (): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async () => ({ docs: [], totalDocs: 0, hasNextPage: false, hasPrevPage: false }));
    return { payload: { find } as unknown as Payload, find };
};

/** Minimal shop reference accepted by every getter. */
const shop = () => ({ id: SHOP_ID, domain: 'x.test', i18n: { defaultLocale: 'en-US' } });

const locale = { code: 'en-US' };

/**
 * Pull the `where` clause from the spy call that targeted the given collection.
 *
 * @param find - The `find` spy to inspect.
 * @param collection - Collection name whose call's `where` to return.
 * @returns The `where` clause, or `undefined` when the collection was never queried.
 */
const whereFor = (find: ReturnType<typeof vi.fn>, collection: string): unknown =>
    (find.mock.calls.find((c) => (c[0] as FindArgs).collection === collection)?.[0] as FindArgs | undefined)?.where;

describe('CMS getter tenant-filter contract (characterization)', () => {
    describe('tenant-scoped where shape filters by the shop id', () => {
        it('getPage filters pages by (shop id, slug)', async () => {
            const { payload, find } = makePayload([{ id: 'p1' }]);
            await getPage({ shop: shop(), locale, slug: 'home', __payload: payload });
            expect(whereFor(find, 'pages')).toEqual({
                and: [{ tenant: { equals: SHOP_ID } }, { slug: { equals: 'home' } }],
            });
            __resetTenantIdCache(payload);
        });

        it('getPages filters pages by the shop id only', async () => {
            const { payload, find } = makePayload([{ id: 'p1' }]);
            await getPages({ shop: shop(), locale, __payload: payload });
            expect(whereFor(find, 'pages')).toEqual({ tenant: { equals: SHOP_ID } });
            __resetTenantIdCache(payload);
        });

        it('getHeader filters the header singleton by the shop id', async () => {
            const { payload, find } = makePayload([{ id: 'h1' }]);
            await getHeader({ shop: shop(), locale, __payload: payload });
            expect(whereFor(find, 'header')).toEqual({ tenant: { equals: SHOP_ID } });
            __resetTenantIdCache(payload);
        });

        it('getFooter filters the footer singleton by the shop id', async () => {
            const { payload, find } = makePayload([{ id: 'f1' }]);
            await getFooter({ shop: shop(), locale, __payload: payload });
            expect(whereFor(find, 'footer')).toEqual({ tenant: { equals: SHOP_ID } });
            __resetTenantIdCache(payload);
        });

        it('getArticle filters articles by (shop id, slug)', async () => {
            const { payload, find } = makePayload([{ id: 'a1' }]);
            await getArticle({ shop: shop(), locale, slug: 'hello', __payload: payload });
            expect(whereFor(find, 'articles')).toEqual({
                and: [{ tenant: { equals: SHOP_ID } }, { slug: { equals: 'hello' } }],
            });
            __resetTenantIdCache(payload);
        });

        it('getArticles filters articles by the shop id only when no tag is supplied', async () => {
            const { payload, find } = makePayload([{ id: 'a1' }]);
            await getArticles({ shop: shop(), locale, __payload: payload });
            expect(whereFor(find, 'articles')).toEqual({ tenant: { equals: SHOP_ID } });
            __resetTenantIdCache(payload);
        });

        it('getArticles ANDs an exact `tags.in` match onto the tenant filter when a tag is supplied', async () => {
            const { payload, find } = makePayload([{ id: 'a1' }]);
            await getArticles({ shop: shop(), locale, tag: 'news', __payload: payload });
            expect(whereFor(find, 'articles')).toEqual({
                and: [{ tenant: { equals: SHOP_ID } }, { tags: { in: ['news'] } }],
            });
            __resetTenantIdCache(payload);
        });

        it('getBusinessData filters the businessData singleton by the shop id', async () => {
            const { payload, find } = makePayload([{ id: 'b1' }]);
            await getBusinessData({ shop: shop(), locale, __payload: payload });
            expect(whereFor(find, 'businessData')).toEqual({ tenant: { equals: SHOP_ID } });
            __resetTenantIdCache(payload);
        });

        it('getCollectionMetadata filters by (shop id, shopifyHandle)', async () => {
            const { payload, find } = makePayload([{ id: 'c1' }]);
            await getCollectionMetadata({ shop: shop(), locale, shopifyHandle: 'sale', __payload: payload });
            expect(whereFor(find, 'collectionMetadata')).toEqual({
                and: [{ tenant: { equals: SHOP_ID } }, { shopifyHandle: { equals: 'sale' } }],
            });
            __resetTenantIdCache(payload);
        });

        it('getProductMetadata filters by (shop id, shopifyHandle)', async () => {
            const { payload, find } = makePayload([{ id: 'm1' }]);
            await getProductMetadata({ shop: shop(), locale, shopifyHandle: 'my-product', __payload: payload });
            expect(whereFor(find, 'productMetadata')).toEqual({
                and: [{ tenant: { equals: SHOP_ID } }, { shopifyHandle: { equals: 'my-product' } }],
            });
            __resetTenantIdCache(payload);
        });
    });

    describe('unresolved-shop branch — never drops the tenant predicate', () => {
        it('getPages substitutes the sentinel and still queries pages', async () => {
            const { payload, find } = makePayloadWithoutShop();
            const list = await getPages({ shop: shop(), locale, __payload: payload });
            expect(list.docs).toEqual([]);
            expect(find).toHaveBeenCalledTimes(2);
            expect(whereFor(find, 'pages')).toEqual({ tenant: { equals: '__cms_no_tenant_resolved__' } });
            __resetTenantIdCache(payload);
        });

        it('getArticles substitutes the sentinel and still queries articles', async () => {
            const { payload, find } = makePayloadWithoutShop();
            const list = await getArticles({ shop: shop(), locale, __payload: payload });
            expect(list.docs).toEqual([]);
            expect(find).toHaveBeenCalledTimes(2);
            expect(whereFor(find, 'articles')).toEqual({ tenant: { equals: '__cms_no_tenant_resolved__' } });
            __resetTenantIdCache(payload);
        });

        it('getArticles still applies the sentinel alongside a tag filter', async () => {
            const { payload, find } = makePayloadWithoutShop();
            await getArticles({ shop: shop(), locale, tag: 'news', __payload: payload });
            expect(whereFor(find, 'articles')).toEqual({
                and: [{ tenant: { equals: '__cms_no_tenant_resolved__' } }, { tags: { in: ['news'] } }],
            });
            __resetTenantIdCache(payload);
        });
    });

    describe('unresolved-shop branch — short-circuits to null without an unscoped query', () => {
        it.each([
            {
                name: 'getPage',
                collection: 'pages',
                run: (p: Payload) => getPage({ shop: shop(), locale, slug: 'home', __payload: p }),
            },
            {
                name: 'getHeader',
                collection: 'header',
                run: (p: Payload) => getHeader({ shop: shop(), locale, __payload: p }),
            },
            {
                name: 'getFooter',
                collection: 'footer',
                run: (p: Payload) => getFooter({ shop: shop(), locale, __payload: p }),
            },
            {
                name: 'getArticle',
                collection: 'articles',
                run: (p: Payload) => getArticle({ shop: shop(), locale, slug: 'x', __payload: p }),
            },
            {
                name: 'getBusinessData',
                collection: 'businessData',
                run: (p: Payload) => getBusinessData({ shop: shop(), locale, __payload: p }),
            },
            {
                name: 'getCollectionMetadata',
                collection: 'collectionMetadata',
                run: (p: Payload) => getCollectionMetadata({ shop: shop(), locale, shopifyHandle: 'h', __payload: p }),
            },
            {
                name: 'getProductMetadata',
                collection: 'productMetadata',
                run: (p: Payload) => getProductMetadata({ shop: shop(), locale, shopifyHandle: 'h', __payload: p }),
            },
        ])('$name returns null and never queries its collection when the shop is unresolved', async ({
            run,
            collection,
        }) => {
            const { payload, find } = makePayloadWithoutShop();
            const result = await run(payload);
            expect(result).toBeNull();
            // Only the `shops` resolution call fires — the content collection is never touched.
            expect(find).toHaveBeenCalledTimes(1);
            expect(whereFor(find, collection)).toBeUndefined();
            __resetTenantIdCache(payload);
        });
    });
});
