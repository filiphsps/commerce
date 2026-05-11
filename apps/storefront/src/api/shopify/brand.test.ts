import type { OnlineShop } from '@nordcom/commerce-db';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { BrandApi } from '@/api/shopify/brand';
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
        describe('brand', () => {
            describe('BrandApi', () => {
                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'boom' }] }));

                    await expect(BrandApi({ api })).rejects.toMatchObject({ name: ProviderFetchError.name });
                });

                it('throws NotFoundError when data is null', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [] }));

                    await expect(BrandApi({ api })).rejects.toMatchObject({ name: NotFoundError.name });
                });

                it('returns brand data when query succeeds', async () => {
                    const brand = {
                        colors: { primary: [{ background: '#fff', foreground: '#000' }], secondary: [] },
                        logo: null,
                        squareLogo: null,
                        coverImage: null,
                        shortDescription: 'Test brand',
                        slogan: 'Just test it',
                    };
                    const api = makeApi(vi.fn().mockResolvedValue({ data: { shop: { brand } }, errors: [] }));

                    const result = await BrandApi({ api });

                    expect(result).toEqual(brand);
                });
            });
        });
    });
});
