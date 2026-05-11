import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { Convertor, VendorsApi } from '@/api/shopify/vendor';
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
        describe('vendor', () => {
            describe('Convertor', () => {
                it('returns empty array when products have no vendor', () => {
                    const result = Convertor([{ node: { vendor: '' } as any }]);
                    expect(result).toEqual([]);
                });

                it('deduplicates vendors across products', () => {
                    const result = Convertor([
                        { node: { vendor: 'Acme' } as any },
                        { node: { vendor: 'Acme' } as any },
                        { node: { vendor: 'Beta' } as any },
                    ]);

                    expect(result).toHaveLength(2);
                    expect(result.map((v) => v.title)).toEqual(expect.arrayContaining(['Acme', 'Beta']));
                });

                it('converts vendor titles to handles', () => {
                    const result = Convertor([{ node: { vendor: 'My Brand' } as any }]);

                    expect(result[0]?.handle).toBe('my-brand');
                });
            });

            describe('VendorsApi', () => {
                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'err' }] }));

                    await expect(VendorsApi({ api })).rejects.toMatchObject({ name: ProviderFetchError.name });
                });

                it('throws NotFoundError when products list is empty', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { products: { edges: [] } }, errors: [] }));

                    await expect(VendorsApi({ api })).rejects.toMatchObject({ name: NotFoundError.name });
                });

                it('returns deduplicated vendors from products', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: {
                                products: {
                                    edges: [
                                        { node: { id: '1', vendor: 'Acme' } },
                                        { node: { id: '2', vendor: 'Acme' } },
                                        { node: { id: '3', vendor: 'Beta' } },
                                    ],
                                },
                            },
                            errors: [],
                        }),
                    );

                    const result = await VendorsApi({ api });

                    expect(result).toHaveLength(2);
                    expect(result.map((v) => v.title)).toEqual(expect.arrayContaining(['Acme', 'Beta']));
                });
            });
        });
    });
});
