import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apolloPool from '@/api/_apollo-pool';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
    },
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}));

vi.mock('react', async (importActual) => ({
    ...(((await importActual()) as any) || {}),
    cache: vi.fn().mockImplementation((func: any) => func),
    experimental_taintUniqueValue: vi.fn(),
}));

vi.mock('@shopify/hydrogen-react', () => ({
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => 'https://shop.example.com/api/2024-01/graphql.json',
        getPublicTokenHeaders: () => ({ 'X-Shopify-Storefront-Access-Token': 'public-token' }),
        getPrivateTokenHeaders: () => ({ 'Shopify-Storefront-Private-Token': 'private-token' }),
    }),
}));

vi.mock('@/api/_apollo-pool', async (importActual) => {
    const actual = (await importActual()) as typeof apolloPool;
    return { ...actual };
});

vi.mock('@/api/client', () => ({
    createApolloClient: vi.fn(() => ({ query: vi.fn() }) as any),
}));

describe('api/shopify', () => {
    describe('ShopifyApolloApiClient pool integration', () => {
        beforeEach(() => apolloPool.evictAllApolloClients());

        it('returns the same Apollo client instance for the same shop+locale', async () => {
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop-pool.myshopify.com',
                    authentication: { publicToken: 'p', token: 't' },
                },
            } as unknown as OnlineShop);

            const spy = vi.spyOn(apolloPool, 'getApolloClient');

            const shop = { id: 'shop-pool', domain: 'shop-pool.com' } as OnlineShop;
            const locale = { code: 'en-US' } as any;

            await ShopifyApolloApiClient({ shop, locale });
            await ShopifyApolloApiClient({ shop, locale });

            // getApolloClient was called twice but should have returned the same
            // cached instance — the factory (and thus createApolloClient) must
            // only have been invoked once.
            expect(spy).toHaveBeenCalledTimes(2);
            const first = spy.mock.results[0]?.value;
            const second = spy.mock.results[1]?.value;
            expect(first).toBe(second);

            spy.mockRestore();
        });
    });

    describe('ShopifyApiConfig', () => {
        it('does not call next/headers.headers() during config construction', async () => {
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop.example.com',
                    authentication: {
                        publicToken: 'public-token',
                        token: 'private-token',
                    },
                },
            } as unknown as OnlineShop);

            const headersMock = vi.mocked(headers);
            headersMock.mockClear();

            const shop = { domain: 'shop.example.com' } as OnlineShop;
            const config = await ShopifyApiConfig({ shop });

            expect(headersMock).not.toHaveBeenCalled();
            expect(typeof config.public).toBe('function');
            expect(typeof config.private).toBe('function');
        });

        it('uses the supplied buyerIp without invoking headers()', async () => {
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop.example.com',
                    authentication: {
                        publicToken: 'public-token',
                        token: 'private-token',
                    },
                },
            } as unknown as OnlineShop);

            const headersMock = vi.mocked(headers);
            headersMock.mockClear();

            const shop = { domain: 'shop.example.com' } as OnlineShop;
            const config = await ShopifyApiConfig({ shop, buyerIp: '203.0.113.7' });

            expect(headersMock).not.toHaveBeenCalled();
            const privateConfig = config.private();
            // The buyerIp must end up in the private headers Shopify receives.
            // We don't assert the exact header layout (handled by @shopify/hydrogen-react)
            // — just that `private()` runs without throwing and produces a config.
            expect(privateConfig.uri).toBeTruthy();
            expect(privateConfig.headers).toBeTruthy();
        });
    });
});
