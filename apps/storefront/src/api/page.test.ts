import type { OnlineShop } from '@nordcom/commerce-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrismicPageApi, mockPrismicPagesApi, mockShopifyPageApi, mockShopifyPagesApi, mockShopifyApolloApiClient } =
    vi.hoisted(() => ({
        mockPrismicPageApi: vi.fn(),
        mockPrismicPagesApi: vi.fn(),
        mockShopifyPageApi: vi.fn(),
        mockShopifyPagesApi: vi.fn(),
        mockShopifyApolloApiClient: vi.fn(),
    }));

vi.mock('server-only', () => ({}));

vi.mock('@/api/prismic/page', () => ({
    PageApi: mockPrismicPageApi,
    PagesApi: mockPrismicPagesApi,
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: mockShopifyApolloApiClient,
}));

vi.mock('@/api/shopify/page', () => ({
    ShopifyPageApi: mockShopifyPageApi,
    ShopifyPagesApi: mockShopifyPagesApi,
}));

import { Locale } from '@/utils/locale';
import { PageApi, PagesApi } from './page';

const locale = Locale.from('en-US');

const makeShop = (contentProviderType: string): OnlineShop =>
    ({
        id: 'shop-1',
        domain: 'shop.example.com',
        contentProvider: { type: contentProviderType },
    }) as unknown as OnlineShop;

describe('api/page > PagesApi', () => {
    beforeEach(() => {
        mockPrismicPagesApi.mockReset();
        mockShopifyPagesApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns null (gracefully degrades) for unsupported content providers — regression for the missing-case TodoError', async () => {
        const result = await PagesApi({ shop: makeShop('builder.io'), locale });
        expect(result).toBeNull();
        expect(mockPrismicPagesApi).not.toHaveBeenCalled();
        expect(mockShopifyPagesApi).not.toHaveBeenCalled();
    });

    it('delegates to PrismicPagesApi for prismic shops', async () => {
        mockPrismicPagesApi.mockResolvedValue([{ id: 'doc' }]);
        const result = await PagesApi({ shop: makeShop('prismic'), locale });
        expect(result).toEqual({ provider: 'prismic', items: [{ id: 'doc' }] });
    });

    it('delegates to ShopifyPagesApi for shopify shops', async () => {
        mockShopifyPagesApi.mockResolvedValue([[{ handle: 'about' }], undefined]);
        const result = await PagesApi({ shop: makeShop('shopify'), locale });
        expect(result).toEqual({ provider: 'shopify', items: [{ handle: 'about' }] });
    });
});

describe('api/page > PageApi', () => {
    beforeEach(() => {
        mockPrismicPageApi.mockReset();
        mockShopifyPageApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns null (gracefully degrades) for unsupported content providers — regression for the missing-case TodoError', async () => {
        const result = await PageApi({ shop: makeShop('builder.io'), locale, handle: 'home' });
        expect(result).toBeNull();
        expect(mockPrismicPageApi).not.toHaveBeenCalled();
        expect(mockShopifyPageApi).not.toHaveBeenCalled();
    });

    it('delegates to PrismicPageApi for prismic shops', async () => {
        mockPrismicPageApi.mockResolvedValue({ uid: 'home' });
        const result = await PageApi({ shop: makeShop('prismic'), locale, handle: 'home' });
        expect(result).toEqual({ provider: 'prismic', data: { uid: 'home' } });
    });

    it('delegates to ShopifyPageApi for shopify shops', async () => {
        mockShopifyPageApi.mockResolvedValue([{ handle: 'about' }, undefined]);
        const result = await PageApi({ shop: makeShop('shopify'), locale, handle: 'about' });
        expect(result).toEqual({ provider: 'shopify', data: { handle: 'about' } });
    });
});
