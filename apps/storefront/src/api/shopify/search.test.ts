import type { OnlineShop } from '@nordcom/commerce-db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchApi } from '@/api/shopify/search';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

const { cacheTagMock, cacheLifeMock, findByDomainMock, shopifyClientMock } = vi.hoisted(() => ({
    cacheTagMock: vi.fn(),
    cacheLifeMock: vi.fn(),
    findByDomainMock: vi.fn(),
    shopifyClientMock: vi.fn(),
}));

vi.mock('@apollo/client', () => ({
    gql: vi.fn(),
}));

vi.mock('next/cache', () => ({
    cacheTag: cacheTagMock,
    cacheLife: cacheLifeMock,
}));

vi.mock('@nordcom/commerce-db', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-db')>('@nordcom/commerce-db');
    return {
        ...actual,
        Shop: {
            ...actual.Shop,
            findByDomain: findByDomainMock,
            findAll: vi.fn(),
        },
    };
});

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: shopifyClientMock,
}));

const makeApi = (queryMock: ReturnType<typeof vi.fn>): AbstractApi => ({
    query: queryMock as unknown as AbstractApi['query'],
    mutate: vi.fn() as unknown as AbstractApi['mutate'],
    locale: () => Locale.default,
    shop: () => ({ id: 'mock-shop-id' }) as OnlineShop,
});

describe('api', () => {
    describe('shopify', () => {
        describe('search', () => {
            describe('SearchApi', () => {
                it('returns empty products and filters when query is empty', async () => {
                    const api = makeApi(vi.fn());

                    const result = await SearchApi({ client: api, query: '' });

                    expect(result.products).toEqual([]);
                    expect(result.productFilters).toEqual([]);
                });

                it('does not call the API when query is empty', async () => {
                    const queryMock = vi.fn();
                    const api = makeApi(queryMock);

                    await SearchApi({ client: api, query: '' });

                    expect(queryMock).not.toHaveBeenCalled();
                });

                it('returns products matching the search query', async () => {
                    const product = { id: 'p1', handle: 'candy', title: 'Candy' };
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                search: {
                                    edges: [{ node: product }],
                                    productFilters: [],
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await SearchApi({ client: api, query: 'candy' });

                    expect(result.products).toHaveLength(1);
                    expect(result.products[0]?.handle).toBe('candy');
                    expect(result.productFilters).toEqual([]);
                });

                it('passes the limit to the query when provided', async () => {
                    const queryMock = vi.fn().mockResolvedValue({
                        data: {
                            search: {
                                edges: [],
                                productFilters: [],
                            },
                        },
                        errors: [],
                    });
                    const api = makeApi(queryMock);

                    await SearchApi({ client: api, query: 'test', limit: 10 });

                    expect(queryMock).toHaveBeenCalledTimes(1);
                    expect(queryMock.mock.calls[0]?.[1]).toMatchObject({ first: 10 });
                });
            });

            describe('cachedSearch', () => {
                beforeEach(() => {
                    cacheTagMock.mockClear();
                    cacheLifeMock.mockClear();
                    findByDomainMock.mockClear();
                    shopifyClientMock.mockClear();

                    findByDomainMock.mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' } as OnlineShop);
                    shopifyClientMock.mockResolvedValue(
                        makeApi(
                            vi.fn().mockResolvedValue({
                                data: { search: { edges: [], productFilters: [], totalCount: 0 } },
                                errors: [],
                            }),
                        ),
                    );
                });

                afterEach(() => {
                    vi.clearAllMocks();
                });

                it('calls cacheLife with "hours"', async () => {
                    const { cachedSearch } = await import('@/api/shopify/search');
                    await cachedSearch({
                        shopId: 'shop-1',
                        shopDomain: 'mock.shop',
                        localeCode: 'en-US',
                        query: 'candy',
                        showFilters: false,
                    });
                    expect(cacheLifeMock).toHaveBeenCalledWith('hours');
                });

                it('tags the cache entry with search keyspace tags', async () => {
                    const { cachedSearch } = await import('@/api/shopify/search');
                    await cachedSearch({
                        shopId: 'shop-1',
                        shopDomain: 'mock.shop',
                        localeCode: 'en-US',
                        query: 'candy',
                        showFilters: false,
                    });
                    const { cache } = await import('@/cache');
                    const expectedTags = cache.keys.search({
                        tenant: { id: 'shop-1', domain: 'mock.shop' } as OnlineShop,
                        qualifier: Locale.from('en-US'),
                        query: 'candy',
                    }).tags;
                    expect(cacheTagMock).toHaveBeenCalledWith(...expectedTags);
                });

                it('returns shape compatible with SearchApi', async () => {
                    const { cachedSearch } = await import('@/api/shopify/search');
                    const result = await cachedSearch({
                        shopId: 'shop-1',
                        shopDomain: 'mock.shop',
                        localeCode: 'en-US',
                        query: 'candy',
                        showFilters: false,
                    });
                    expect(result).toEqual({ products: [], productFilters: [], totalCount: 0 });
                });

                it('returns empty result without invoking the Shopify client when query is empty', async () => {
                    const { cachedSearch } = await import('@/api/shopify/search');
                    const result = await cachedSearch({
                        shopId: 'shop-1',
                        shopDomain: 'mock.shop',
                        localeCode: 'en-US',
                        query: '',
                        showFilters: false,
                    });
                    expect(result).toEqual({ products: [], productFilters: [], totalCount: 0 });
                    expect(shopifyClientMock).not.toHaveBeenCalled();
                });
            });
        });
    });
});
