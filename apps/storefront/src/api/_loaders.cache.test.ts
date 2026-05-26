import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const cacheTagMock = vi.fn();
const revalidateTagMock = vi.fn();
const cacheLifeMock = vi.fn();

vi.mock('next/cache', () => ({
    cacheTag: cacheTagMock,
    cacheLife: cacheLifeMock,
    revalidateTag: revalidateTagMock,
    unstable_cache: vi.fn().mockImplementation((func) => func),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: vi.fn(), findAll: vi.fn() },
}));

import type * as productMod from '@/api/shopify/product';

vi.mock('@/api/shopify/product', async () => {
    const actual = await vi.importActual<typeof productMod>('@/api/shopify/product');
    return {
        ...actual,
        ProductApi: vi.fn().mockResolvedValue([{ id: 'p1', handle: 'red-widget' }, null]),
    };
});

describe('cacheTag end-to-end (active)', () => {
    // Heavy dynamic imports of `@/api/_loaders` and `@/cache` push past the
    // 5s default when this suite races against the full storefront set.
    it('tags ProductApi reads with the same tag set that invalidate.product() targets', {
        timeout: 20_000,
    }, async () => {
        cacheTagMock.mockClear();
        revalidateTagMock.mockClear();

        const { ProductApi } = await import('@/api/_loaders');
        const { cache: shopifyCache } = await import('@/cache');

        const fakeApi = {
            shop: () => ({ id: 'shop-1', domain: 'shop-1.com' }),
            locale: () => ({ code: 'en-US' }),
        } as any;

        await ProductApi({ api: fakeApi, handle: 'red-widget' });

        const tagsWrittenByLoader = cacheTagMock.mock.calls.flat();

        await shopifyCache.invalidate.product({
            tenant: { id: 'shop-1', domain: 'shop-1.com' } as any,
            handle: 'red-widget',
        });

        const tagsRevalidated = revalidateTagMock.mock.calls.map((call) => call[0]);

        // Loader-written tags should be a subset of what invalidate.product() revalidates.
        // (Or vice versa — at minimum, the leaf tag must appear in both.)
        const leafTag = `shopify.shop-1.product.red-widget`;
        expect(tagsWrittenByLoader).toContain(leafTag);
        expect(tagsRevalidated).toContain(leafTag);
    });
});

describe('cacheTag end-to-end (skipped — environment limitation)', () => {
    // The original plan test asserts:
    //   - Two ProductApi calls in a row → source called once (cache hit)
    //   - revalidateTag(tag) for the leaf
    //   - Third call → source called twice (cache miss after invalidation)
    //
    // This cannot be unit-tested in Vitest because:
    //   1. react.cache() only memoizes inside the RSC renderer ('react-server'
    //      export condition); outside RSC it's a transparent passthrough.
    //      Outside the Next.js App Router, every call goes straight to the
    //      underlying function — there is no per-request cache store.
    //   2. Next.js 16's 'use cache' directive isn't active outside the Next
    //      runtime, so cacheTag/revalidateTag don't influence the actual cache.
    //   3. revalidateTag is mocked in unit tests so it doesn't evict anything.
    //
    // The active test above verifies what we CAN verify: that the loader writes
    // the same tag scheme that the invalidation helper revalidates. The full
    // round-trip belongs in an OTEL-driven integration test (see Task 12 of the
    // storefront-cleanup plan).
    it.skip('refetches after revalidateTag fires for the entity tag', async () => {
        // Original spec body retained for documentation:
        // const sourceSpy = vi.mocked(productMod.ProductApi);
        // sourceSpy.mockClear();
        // const { ProductApi } = await import('@/api/_loaders');
        // const api = { shop: () => ({...}), locale: () => ({...}) } as any;
        // await ProductApi({ api, handle: 'red-widget' });
        // await ProductApi({ api, handle: 'red-widget' });
        // expect(sourceSpy).toHaveBeenCalledTimes(1);  // would require RSC cache
        // revalidateTag('shopify.shop-1.product.red-widget');
        // await ProductApi({ api, handle: 'red-widget' });
        // expect(sourceSpy).toHaveBeenCalledTimes(2);  // would require RSC cache
    });
});
