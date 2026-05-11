import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidIDError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

import { RecommendationApi } from '@/api/shopify/recommendation';
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
        describe('recommendation', () => {
            describe('RecommendationApi', () => {
                it('throws InvalidIDError when id is not a valid GID', async () => {
                    const api = makeApi(vi.fn());

                    await expect(RecommendationApi({ api, id: 'not-a-gid' })).rejects.toMatchObject({
                        name: InvalidIDError.name,
                    });
                });

                it('throws ProviderFetchError when errors are present', async () => {
                    const api = makeApi(vi.fn().mockResolvedValue({ data: null, errors: [{ message: 'err' }] }));

                    await expect(RecommendationApi({ api, id: 'gid://shopify/Product/123' })).rejects.toMatchObject({
                        name: ProviderFetchError.name,
                    });
                });

                it('throws NotFoundError when recommendations list is empty', async () => {
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: { productRecommendations: [] },
                            errors: [],
                        }),
                    );

                    await expect(RecommendationApi({ api, id: 'gid://shopify/Product/123' })).rejects.toMatchObject({
                        name: NotFoundError.name,
                    });
                });

                it('returns recommendation list when data is present', async () => {
                    const products = [{ id: 'p1', handle: 'product-1' }];
                    const api = makeApi(
                        vi.fn().mockResolvedValue({
                            data: { productRecommendations: products },
                            errors: [],
                        }),
                    );

                    const result = await RecommendationApi({ api, id: 'gid://shopify/Product/123' });

                    expect(result).toEqual(products);
                });
            });
        });
    });
});
