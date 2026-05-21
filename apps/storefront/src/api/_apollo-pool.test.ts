import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _poolSize, evictAllApolloClients, evictApolloClient, getApolloClient } from './_apollo-pool';

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

    it('logs a warning when pool size exceeds the threshold', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        try {
            for (let i = 0; i < 1001; i++) {
                getApolloClient({
                    shop: { id: `s-${i}`, domain: `d-${i}` } as any,
                    locale: fakeLocale,
                    factory,
                });
            }
            expect(warn).toHaveBeenCalled();
            const lastCall = warn.mock.calls[warn.mock.calls.length - 1]?.[0] as string;
            expect(String(lastCall)).toMatch(/1000/);
        } finally {
            warn.mockRestore();
        }
    });
});
