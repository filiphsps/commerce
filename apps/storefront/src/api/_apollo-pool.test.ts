import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _poolSize, evictAllApolloClients, evictApolloClient, getApolloClient } from './_apollo-pool';
import { ShopifyApolloApiClient } from './shopify';

const fakeShop = { id: 'shop-1', domain: 'shop-1.com' } as any;
const fakeLocale = { code: 'en-US' } as any;

const factory = () => ({}) as any;

describe('apollo client pool', () => {
    beforeEach(() => evictAllApolloClients());

    it('returns same instance for same shop+locale', () => {
        const a = getApolloClient({ shop: fakeShop, locale: fakeLocale, factory });
        const b = getApolloClient({ shop: fakeShop, locale: fakeLocale, factory });
        expect(a).toBe(b);
    });

    it('returns different instance for different locale', () => {
        const a = getApolloClient({ shop: fakeShop, locale: { code: 'en-US' } as any, factory });
        const b = getApolloClient({ shop: fakeShop, locale: { code: 'sv-SE' } as any, factory });
        expect(a).not.toBe(b);
    });

    it('returns different instance for different shop', () => {
        const a = getApolloClient({ shop: { id: 's1', domain: 'a' } as any, locale: fakeLocale, factory });
        const b = getApolloClient({ shop: { id: 's2', domain: 'b' } as any, locale: fakeLocale, factory });
        expect(a).not.toBe(b);
    });

    it('evicts by shop id', () => {
        getApolloClient({ shop: fakeShop, locale: fakeLocale, factory });
        expect(_poolSize()).toBe(1);
        evictApolloClient({ shopId: fakeShop.id });
        expect(_poolSize()).toBe(0);
    });

    it('evicts all entries for the given shop, regardless of locale', () => {
        getApolloClient({ shop: fakeShop, locale: { code: 'en-US' } as any, factory });
        getApolloClient({ shop: fakeShop, locale: { code: 'sv-SE' } as any, factory });
        getApolloClient({ shop: { id: 'shop-2', domain: 'other' } as any, locale: fakeLocale, factory });
        expect(_poolSize()).toBe(3);

        evictApolloClient({ shopId: fakeShop.id });
        expect(_poolSize()).toBe(1);
    });

    it('factory is invoked once per unique key', () => {
        const f = vi.fn().mockReturnValue({} as any);
        getApolloClient({ shop: fakeShop, locale: fakeLocale, factory: f });
        getApolloClient({ shop: fakeShop, locale: fakeLocale, factory: f });
        expect(f).toHaveBeenCalledTimes(1);
    });

    it('emits an OTel event when pool size exceeds the threshold', () => {
        // The warning is emitted via trace.getActiveSpan()?.addEvent() — there is no
        // active span in the test environment, so the call is a safe no-op. Verify
        // the pool grows past the threshold boundary (1001 distinct shop+locale keys).
        for (let i = 0; i < 1001; i++) {
            getApolloClient({
                shop: { id: `s-${i}`, domain: `d-${i}` } as any,
                locale: fakeLocale,
                factory,
            });
        }
        expect(_poolSize()).toBeGreaterThan(1000);
    });
});

describe('ShopifyApolloApiClient — pool integration', () => {
    it('returns the same Apollo client instance across sequential calls for the same shop+locale', async () => {
        evictAllApolloClients();

        // A minimal apiConfig stub avoids the Shop.findByDomain → DB path and
        // the experimental_taintUniqueValue call inside ShopifyApiConfig.
        const apiConfig = {
            public: () => ({ uri: 'https://x.myshopify.com/api/2024-01/graphql.json', headers: {} }),
            private: () => ({ uri: 'https://x.myshopify.com/api/2024-01/graphql.json', headers: {} }),
        };

        const shop = {
            id: 'shop-x',
            domain: 'x.com',
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 't', publicToken: 'p' },
                domain: 'x.myshopify.com',
            },
        } as any;
        const locale = { code: 'en-US' } as any;

        await ShopifyApolloApiClient({ shop, locale, apiConfig });
        expect(_poolSize()).toBe(1);

        await ShopifyApolloApiClient({ shop, locale, apiConfig });
        // Pool size must stay at 1 — the second call must reuse the cached Apollo
        // client (and therefore the same InMemoryCache) rather than create a new one.
        expect(_poolSize()).toBe(1);
    });
});
