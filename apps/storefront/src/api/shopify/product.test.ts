import { describe, expect, it, vi } from 'vitest';

import { InvalidHandleError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';

import { ProductApi } from './product';

describe('api', () => {
    describe('shopify', () => {
        describe('product', () => {
            vi.mock('@apollo/client', () => ({
                gql: vi.fn()
            }));

            vi.mock('crypto-js/md5', () => ({
                default: vi.fn(() => ({ toString: vi.fn(() => 'mocked-md5') }))
            }));

            vi.mock('@/utils/abstract-api', () => ({
                cleanShopifyHtml: vi.fn(() => 'cleaned-html')
            }));

            describe('ProductApi', () => {
                const mockApi = {
                    shop: vi.fn(() => ({ id: 'mock-shop-id' })),
                    query: vi.fn()
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
                        descriptionHtml: '<p>Some description</p>'
                    };
                    mockApi.query.mockResolvedValueOnce({ data: { product: mockProduct }, errors: [] });

                    const [result, error] = await ProductApi({ api: mockApi as any, handle: 'some-handle' });

                    expect(result).toEqual({
                        handle: 'some-handle',
                        descriptionHtml: 'cleaned-html'
                    });
                    expect(error).toBeUndefined();
                });
            });
        });
    });
});
