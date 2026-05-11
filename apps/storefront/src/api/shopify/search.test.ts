import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it, vi } from 'vitest';

import { SearchApi } from '@/api/shopify/search';
import type { AbstractApi } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

vi.mock('@apollo/client', () => ({
    gql: vi.fn(),
}));

const makeApi = (queryMock: ReturnType<typeof vi.fn>): AbstractApi => ({
    query: queryMock as unknown as AbstractApi['query'],
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
        });
    });
});
