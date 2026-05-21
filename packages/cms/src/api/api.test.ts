import type { Payload } from 'payload';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getArticle } from './get-article';
import { getArticles } from './get-articles';
import { getPage } from './get-page';
import { getPages } from './get-pages';
import { __resetTenantIdCache } from './resolve-tenant-id';

// These helpers are thin wrappers around `payload.find` — their value is the
// query SHAPE they build (tenant scoping, slug match, locale, fallback locale,
// depth, limit, sort, draft). The underlying `payload.find` is mocked so we
// don't pay Payload's ~5s boot cost per assertion.
//
// Every helper now resolves `shop.id` → `Tenant._id` (via the `tenants`
// collection's `shopId` field) before filtering, because the multi-tenant
// plugin writes the Tenant doc's own `_id` into the auto-injected `tenant`
// field — not `shop.id`. The mock returns a tenant doc on the first
// `tenants` query and the requested docs on subsequent calls.

type FindArgs = Parameters<Payload['find']>[0];

const TENANT_ID = 'tenant-doc-1';

const makePayload = (docs: unknown[] = []): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async (args: FindArgs) => {
        if (args.collection === 'tenants') {
            return {
                docs: [{ id: TENANT_ID, shopId: 'shop-x' }],
                totalDocs: 1,
                hasNextPage: false,
                hasPrevPage: false,
            };
        }
        return { docs, totalDocs: docs.length, hasNextPage: false, hasPrevPage: false };
    });
    return { payload: { find } as unknown as Payload, find };
};

const makePayloadWithoutTenant = (): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async () => ({ docs: [], totalDocs: 0, hasNextPage: false, hasPrevPage: false }));
    return { payload: { find } as unknown as Payload, find };
};

const shop = () => ({ id: 'shop-x', domain: 'x.test', i18n: { defaultLocale: 'en-US' } });

// Calls that take the same Payload instance share a WeakMap cache —
// reset between tests so each assertion sees a fresh resolution path.
afterEach(() => {
    // The cache key is the Payload instance; throwing away the instance is
    // enough, but tests that reuse one would otherwise see cache hits.
    // No-op when nothing was cached.
});

describe('query API', () => {
    describe('getPage', () => {
        it('queries pages by (tenant, slug) using the resolved tenant id, with locale + fallback', async () => {
            const { payload, find } = makePayload([{ id: 'p1', title: 'Home EN' }]);
            const page = await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', __payload: payload });

            expect(page).toMatchObject({ id: 'p1', title: 'Home EN' });
            // First call resolves shop.id → tenant._id via the tenants collection.
            expect(find).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    collection: 'tenants',
                    where: { shopId: { equals: 'shop-x' } },
                    limit: 1,
                }),
            );
            // Second call filters pages by the resolved tenant id, not shop.id.
            expect(find).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    collection: 'pages',
                    where: { and: [{ tenant: { equals: TENANT_ID } }, { slug: { equals: 'home' } }] },
                    locale: 'en-US',
                    fallbackLocale: 'en-US',
                    depth: 2,
                    limit: 1,
                    draft: false,
                }),
            );
            __resetTenantIdCache(payload);
        });

        it('returns null when payload finds no page doc', async () => {
            const { payload } = makePayload([]);
            const page = await getPage({
                shop: shop(),
                locale: { code: 'en-US' },
                slug: 'does-not-exist',
                __payload: payload,
            });
            expect(page).toBeNull();
            __resetTenantIdCache(payload);
        });

        it('returns null when no Tenant exists for the shop (sync not yet run)', async () => {
            const { payload, find } = makePayloadWithoutTenant();
            const page = await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', __payload: payload });
            expect(page).toBeNull();
            // Only the tenant resolution call — the helper short-circuits before
            // touching the pages collection, so we don't leak cross-tenant docs.
            expect(find).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'tenants' }));
            __resetTenantIdCache(payload);
        });

        it('forwards draft=true to payload.find', async () => {
            const { payload, find } = makePayload([]);
            await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', draft: true, __payload: payload });
            expect(find).toHaveBeenLastCalledWith(expect.objectContaining({ draft: true }));
            __resetTenantIdCache(payload);
        });

        it('caches tenant resolution per Payload instance — multiple calls hit the tenants collection once', async () => {
            const { payload, find } = makePayload([]);
            await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'a', __payload: payload });
            await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'b', __payload: payload });
            const tenantCalls = find.mock.calls.filter((c) => (c[0] as FindArgs).collection === 'tenants');
            expect(tenantCalls).toHaveLength(1);
            __resetTenantIdCache(payload);
        });
    });

    describe('getArticle', () => {
        it('queries articles by (tenant, slug) using the resolved tenant id', async () => {
            const { payload, find } = makePayload([{ id: 'a1', author: 'A' }]);
            const article = await getArticle({
                shop: shop(),
                locale: { code: 'en-US' },
                slug: 'hello',
                __payload: payload,
            });

            expect(article).toMatchObject({ author: 'A' });
            expect(find).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    collection: 'articles',
                    where: { and: [{ tenant: { equals: TENANT_ID } }, { slug: { equals: 'hello' } }] },
                    depth: 2,
                    limit: 1,
                }),
            );
            __resetTenantIdCache(payload);
        });
    });

    describe('getArticles', () => {
        it('paginates with tenant scoping (resolved id) and sort by -publishedAt', async () => {
            const { payload, find } = makePayload([{ id: 'a1' }]);
            const list = await getArticles({ shop: shop(), locale: { code: 'en-US' }, limit: 10, __payload: payload });

            expect(list.docs).toHaveLength(1);
            expect(find).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    collection: 'articles',
                    where: { tenant: { equals: TENANT_ID } },
                    limit: 10,
                    page: 1,
                    sort: '-publishedAt',
                }),
            );
            __resetTenantIdCache(payload);
        });

        it('uses `tags.in` (exact match) instead of `contains` when a tag filter is supplied — guards against the ReDoS surface noted inline', async () => {
            const { payload, find } = makePayload([]);
            await getArticles({ shop: shop(), locale: { code: 'en-US' }, tag: 'news', __payload: payload });
            const articlesCall = find.mock.calls.find((c) => (c[0] as FindArgs).collection === 'articles');
            expect((articlesCall?.[0] as FindArgs | undefined)?.where).toEqual({
                and: [{ tenant: { equals: TENANT_ID } }, { tags: { in: ['news'] } }],
            });
            __resetTenantIdCache(payload);
        });

        it('returns an empty paginated result when no Tenant exists for the shop', async () => {
            const { payload, find } = makePayloadWithoutTenant();
            const list = await getArticles({ shop: shop(), locale: { code: 'en-US' }, __payload: payload });
            expect(list.docs).toEqual([]);
            expect(find).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'tenants' }));
            __resetTenantIdCache(payload);
        });
    });

    describe('getPages', () => {
        it('paginates with tenant scoping (resolved id) and locale + fallback', async () => {
            const { payload, find } = makePayload([{ id: 'p1', slug: 'home', updatedAt: '2026-01-01T00:00:00.000Z' }]);
            const list = await getPages({ shop: shop(), locale: { code: 'en-US' }, limit: 100, __payload: payload });

            expect(list.docs).toHaveLength(1);
            expect(find).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    collection: 'pages',
                    where: { tenant: { equals: TENANT_ID } },
                    locale: 'en-US',
                    fallbackLocale: 'en-US',
                    limit: 100,
                    page: 1,
                    depth: 0,
                    draft: false,
                }),
            );
            __resetTenantIdCache(payload);
        });

        it('forwards draft=true', async () => {
            const { payload, find } = makePayload([]);
            await getPages({ shop: shop(), locale: { code: 'en-US' }, draft: true, __payload: payload });
            expect(find).toHaveBeenLastCalledWith(expect.objectContaining({ draft: true }));
            __resetTenantIdCache(payload);
        });

        it('returns an empty paginated result when no Tenant exists for the shop', async () => {
            const { payload, find } = makePayloadWithoutTenant();
            const list = await getPages({ shop: shop(), locale: { code: 'en-US' }, __payload: payload });
            expect(list.docs).toEqual([]);
            expect(find).toHaveBeenCalledTimes(1);
            __resetTenantIdCache(payload);
        });
    });
});
