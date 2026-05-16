import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Undo the global mock from vitest.setup.ts — this test exercises the real
// evaluateShopFlag implementation end-to-end.
vi.unmock('@/utils/flags/evaluate');

// In a real 'use cache' scope, headers() and cookies() throw. Simulate that
// strictness here so the test would catch regressions introduced by any future
// change that adds a headers() call inside the cache-safe path.
vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() forbidden in cache scope');
    }),
    cookies: vi.fn(() => {
        throw new Error('cookies() forbidden in cache scope');
    }),
}));

vi.mock('./report', () => ({ reportFlagValue: vi.fn() }));

import { evaluateShopFlag } from './evaluate';
import { __resetPredicatesForTest } from './predicates';
import { registerBuiltinPredicates } from './register-builtin-predicates';

describe('utils/flags — integration', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        registerBuiltinPredicates();
    });

    afterEach(() => {
        __resetPredicatesForTest();
    });

    it('cache-safe evaluation does not read request headers/cookies', () => {
        const shop = {
            id: 'shop-1',
            featureFlags: [
                {
                    flag: {
                        key: 'header-search-bar',
                        defaultValue: false,
                        targeting: [{ rule: 'shop', params: { shopIds: ['shop-1'] }, value: true }],
                    },
                },
            ],
        } as never;
        expect(() => evaluateShopFlag(shop, 'header-search-bar')).not.toThrow();
        expect(evaluateShopFlag<boolean>(shop, 'header-search-bar')).toBe(true);
    });

    it('an override forwarded by the uncached parent wins over targeting', () => {
        const shop = {
            id: 'shop-1',
            featureFlags: [
                {
                    flag: {
                        key: 'header-search-bar',
                        defaultValue: false,
                        targeting: [{ rule: 'always', params: {}, value: false }],
                    },
                },
            ],
        } as never;
        const v = evaluateShopFlag<boolean>(shop, 'header-search-bar', {
            overrides: { 'header-search-bar': true },
        });
        expect(v).toBe(true);
    });
});
