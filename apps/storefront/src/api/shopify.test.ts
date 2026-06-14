import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { ShopMisconfigurationError } from '@nordcom/commerce-errors';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apolloPool from '@/api/_apollo-pool';
import { ShopifyApiClient, ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
        // `shopify.ts` now routes tenant lookups through the React-cached
        // `_shop-loader`, whose module init binds `findAll` — stub it so import
        // doesn't throw.
        findAll: vi.fn(),
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
            const first = await spy.mock.results[0]?.value;
            const second = await spy.mock.results[1]?.value;
            expect(first).toBe(second);

            spy.mockRestore();
        });

        it('does not hit the DB (Shop.findByDomain) on a pool hit', async () => {
            vi.mocked(Shop.findByDomain).mockClear();
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                commerceProvider: {
                    type: 'shopify',
                    domain: 'shop-hit.myshopify.com',
                    authentication: { publicToken: 'p', token: 't' },
                },
            } as unknown as OnlineShop);

            const shop = { id: 'shop-hit', domain: 'shop-hit.com' } as OnlineShop;
            const locale = { code: 'en-US' } as any;

            // First call misses the pool → factory runs → ShopifyApiConfig does
            // its single Shop.findByDomain round-trip.
            await ShopifyApolloApiClient({ shop, locale });
            // Second call hits the pool → factory must NOT run → no DB round-trip.
            await ShopifyApolloApiClient({ shop, locale });

            expect(Shop.findByDomain).toHaveBeenCalledTimes(1);
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

    describe('ShopifyApiClient (fetch transport)', () => {
        const fetchShop = { id: 'shop_fetch', domain: 'fetch.example.com' } as OnlineShop;
        const fetchConfig = { uri: 'https://fetch.example.com/api', headers: { authorization: 't' } };

        it('uses private headers when they resolve', async () => {
            const privateFn = vi.fn(() => fetchConfig);
            const publicFn = vi.fn(() => fetchConfig);

            const api = await ShopifyApiClient({
                shop: fetchShop,
                apiConfig: { private: privateFn, public: publicFn },
            });

            expect(privateFn).toHaveBeenCalledTimes(1);
            expect(publicFn).not.toHaveBeenCalled();
            expect(typeof api.query).toBe('function');
        });

        it('falls back to public headers when private() throws', async () => {
            const privateFn = vi.fn(() => {
                throw new ShopMisconfigurationError(fetchShop.domain, ['authentication.token']);
            });
            const publicFn = vi.fn(() => fetchConfig);

            const api = await ShopifyApiClient({
                shop: fetchShop,
                apiConfig: { private: privateFn, public: publicFn },
            });

            expect(privateFn).toHaveBeenCalledTimes(1);
            expect(publicFn).toHaveBeenCalledTimes(1);
            expect(typeof api.query).toBe('function');
        });
    });
});
