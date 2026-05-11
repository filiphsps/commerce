import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { InvalidHandleError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { ProductApi, ProductsApi, ProductsPaginationApi } from './product';

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
        });
    });
});
