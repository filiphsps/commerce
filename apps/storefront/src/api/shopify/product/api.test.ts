import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { ProductApi, ProductHandlesApi, ProductsApi, ProductsPaginationApi, ProductsPaginationCountApi } from './index';

vi.mock('@apollo/client', () => ({
    gql: vi.fn(),
}));

vi.mock('crypto-js/md5', () => ({
    default: vi.fn(() => ({ toString: vi.fn(() => 'mocked-md5') })),
}));

describe('api', () => {
    describe('shopify', () => {
        describe('product', () => {
            describe('ProductApi', () => {
                const mockApi = {
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: vi.fn(),
                };

                it('should return InvalidHandleError if handle is not provided', async () => {
                    const [result, error] = await ProductApi({ api: mockApi as any, handle: '' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(InvalidHandleError.name);
                });

                it('should return NotFoundError if product is not found', async () => {
                    mockApi.query.mockResolvedValueOnce({ data: { product: null }, errors: [] });

                    const [result, error] = await ProductApi({ api: mockApi as any, handle: 'non-existent-handle' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(NotFoundError.name);
                });

                it('should return ProviderFetchError if there are errors in the response', async () => {
                    const mockErrors = [{ message: 'Some error' }];
                    mockApi.query.mockResolvedValueOnce({ data: null, errors: mockErrors });

                    const [result, error] = await ProductApi({ api: mockApi as any, handle: 'some-handle' });

                    expect(result).toBeUndefined();
                    expect(error?.name).toBe(ProviderFetchError.name);
                });

                it('should return product data if product is found', async () => {
                    const mockProduct = {
                        handle: 'some-handle',
                        descriptionHtml: '<p>Some description</p>',
                    };
                    mockApi.query.mockResolvedValueOnce({ data: { product: mockProduct }, errors: [] });

                    const [result, error] = await ProductApi({ api: mockApi as any, handle: 'some-handle' });

                    expect(result).toEqual({
                        handle: 'some-handle',
                        descriptionHtml: '<p>Some description</p>',
                    });
                    expect(error).toBeUndefined();
                });
            });

            describe('ProductsApi', () => {
                const makeApi = (queryMock: ReturnType<typeof vi.fn>) => ({
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: queryMock,
                    locale: vi.fn(() => ({ code: 'en-US' })),
                });

                it('throws NotFoundError when products list is empty', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: { products: { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } } },
                            errors: [],
                        }),
                    );

                    await expect(ProductsApi({ api: api as any })).rejects.toMatchObject({ name: NotFoundError.name });
                });

                it('returns products with cursor and pagination flags when products are found', async () => {
                    const edge = {
                        cursor: 'abc',
                        node: { id: 'prod-1', handle: 'prod-1', descriptionHtml: '' },
                    };
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                products: {
                                    edges: [edge],
                                    pageInfo: { hasNextPage: true, hasPreviousPage: false },
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await ProductsApi({ api: api as any });

                    expect(result.products).toHaveLength(1);
                    expect(result.cursor).toBe('abc');
                    expect(result.pagination.next).toBe(true);
                    expect(result.pagination.previous).toBe(false);
                });

                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: null,
                            errors: [{ message: 'boom' }],
                        }),
                    );

                    await expect(ProductsApi({ api: api as any })).rejects.toMatchObject({
                        name: ProviderFetchError.name,
                    });
                });
            });

            describe('ProductHandlesApi', () => {
                const makeApi = (queryMock: ReturnType<typeof vi.fn>) => ({
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: queryMock,
                    locale: vi.fn(() => ({ code: 'en-US' })),
                });

                it('returns only handles, preserving the best-selling order from the API', async () => {
                    const query = vi.fn().mockResolvedValue({
                        data: {
                            products: {
                                edges: [
                                    { node: { handle: 'top-seller' } },
                                    { node: { handle: 'runner-up' } },
                                    { node: { handle: 'third-place' } },
                                ],
                            },
                        },
                        errors: [],
                    });
                    const api = makeApi(query);

                    const handles = await ProductHandlesApi({ api: api as any, limit: 10 });

                    // Order is delegated to Shopify's BEST_SELLING sort; the helper must
                    // not reshuffle it, and it must request that sort explicitly.
                    expect(handles).toEqual(['top-seller', 'runner-up', 'third-place']);
                    expect(query).toHaveBeenCalledWith(
                        expect.anything(),
                        { first: 10, sorting: 'BEST_SELLING' },
                        expect.objectContaining({ tags: expect.arrayContaining(['products']) }),
                    );
                });

                it('throws NotFoundError when the shop has no products', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { products: { edges: [] } }, errors: [] }));

                    await expect(ProductHandlesApi({ api: api as any })).rejects.toMatchObject({
                        name: NotFoundError.name,
                    });
                });

                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'boom' }] }));

                    await expect(ProductHandlesApi({ api: api as any })).rejects.toMatchObject({
                        name: ProviderFetchError.name,
                    });
                });
            });

            describe('ProductsPaginationApi', () => {
                const makeApi = (queryMock: ReturnType<typeof vi.fn>) => ({
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: queryMock,
                    locale: vi.fn(() => ({ code: 'en-US' })),
                });

                it('returns page_info and products when data is present', async () => {
                    const edge = { cursor: 'c1', node: { id: 'p1', handle: 'p1', descriptionHtml: '' } };
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                products: {
                                    edges: [edge],
                                    pageInfo: {
                                        startCursor: 'c1',
                                        endCursor: 'c1',
                                        hasNextPage: false,
                                        hasPreviousPage: false,
                                    },
                                    filters: [],
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await ProductsPaginationApi({ api: api as any, filters: {} });

                    expect(result.page_info.has_next_page).toBe(false);
                    expect(result.page_info.start_cursor).toBe('c1');
                    expect(result.products).toHaveLength(1);
                    expect(result.filters).toEqual([]);
                });

                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: null,
                            errors: [{ message: 'bad request' }],
                        }),
                    );

                    await expect(ProductsPaginationApi({ api: api as any, filters: {} })).rejects.toMatchObject({
                        name: ProviderFetchError.name,
                    });
                });
            });

            describe('ProductsPaginationCountApi', () => {
                const makeApi = (queryMock: ReturnType<typeof vi.fn>) => ({
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: queryMock,
                    locale: vi.fn(() => ({ code: 'en-US' })),
                });

                it('synthesizes facet filters from the walk the root products connection omits', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                products: {
                                    edges: [
                                        {
                                            cursor: 'c1',
                                            node: {
                                                id: 'p1',
                                                vendor: 'Acme',
                                                productType: 'Shoes',
                                                availableForSale: true,
                                                priceRange: { minVariantPrice: { amount: '10.0' } },
                                            },
                                        },
                                        {
                                            cursor: 'c2',
                                            node: {
                                                id: 'p2',
                                                vendor: 'Globex',
                                                productType: '',
                                                availableForSale: false,
                                                priceRange: { minVariantPrice: { amount: '50.0' } },
                                            },
                                        },
                                    ],
                                    pageInfo: {
                                        startCursor: 'c1',
                                        endCursor: 'c2',
                                        hasNextPage: false,
                                        hasPreviousPage: false,
                                    },
                                },
                            },
                            errors: null,
                        }),
                    );

                    const result = await ProductsPaginationCountApi({ api: api as any, filters: { first: 35 } });

                    expect(result.products).toBe(2);

                    const ids = result.filters.map((filter) => filter.id);
                    expect(ids).toContain('filter.v.availability');
                    expect(ids).toContain('filter.p.vendor');
                    expect(ids).toContain('filter.p.product_type');
                    expect(ids).toContain('filter.v.price');

                    const vendor = result.filters.find((filter) => filter.id === 'filter.p.vendor');
                    expect(vendor?.values.map((value) => value.label)).toEqual(['Acme', 'Globex']);
                    expect(vendor?.values.every((value) => value.count === 1)).toBe(true);

                    // An empty productType (p2) is dropped, so only the populated type surfaces as a facet.
                    const type = result.filters.find((filter) => filter.id === 'filter.p.product_type');
                    expect(type?.values.map((value) => value.label)).toEqual(['Shoes']);
                });

                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'bad request' }] }),
                    );

                    await expect(
                        ProductsPaginationCountApi({ api: api as any, filters: { first: 35 } }),
                    ).rejects.toMatchObject({ name: ProviderFetchError.name });
                });
            });
        });
    });
});
