import type { OnlineShop } from '@nordcom/commerce-db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() called inside cache-safe evaluation');
    }),
    cookies: vi.fn(() => {
        throw new Error('cookies() called inside cache-safe evaluation');
    }),
}));

vi.mock('./report', () => ({
    reportFlagValue: vi.fn(),
}));

vi.mock('./adapter', () => ({
    nordcomFlagAdapter: () => ({
        identify: () => ({}),
        decide: () => false,
    }),
}));

import { defineFlag } from './define';
import { __resetPredicatesForTest, registerPredicate } from './predicates';
import { reportFlagValue } from './report';

type FlagShape = {
    key: string;
    defaultValue: unknown;
    targeting: Array<{ rule: string; params: Record<string, unknown>; value: unknown }>;
};
type ShopOverrides = { featureFlags?: Array<{ flag: FlagShape }> };

function makeShop(overrides: ShopOverrides = {}): OnlineShop {
    return { id: 'shop-1', ...overrides } as unknown as OnlineShop;
}

describe('utils/flags/define', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        vi.mocked(reportFlagValue).mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('exposes key and defaultValue from config', () => {
        const f = defineFlag<boolean>({
            key: 'demo',
            description: 'demo',
            defaultValue: true,
            options: [
                { label: 'Off', value: false },
                { label: 'On', value: true },
            ],
        });
        expect(f.key).toBe('demo');
        expect(f.defaultValue).toBe(true);
    });

    it('returns a callable for the SDK async path', () => {
        const f = defineFlag<boolean>({
            key: 'demo',
            description: 'demo',
            defaultValue: false,
            options: [],
        });
        expect(typeof f).toBe('function');
        expect(typeof f.evaluate).toBe('function');
    });

    describe('.evaluate', () => {
        it('returns declaration defaultValue when shop has no matching ref', () => {
            const f = defineFlag<boolean>({
                key: 'missing',
                description: 'missing',
                defaultValue: true,
                options: [],
            });
            expect(f.evaluate(makeShop())).toBe(true);
        });

        it('returns rule value when a no-user predicate matches', () => {
            registerPredicate('always', () => true, { requiresUser: false });
            const f = defineFlag<boolean>({
                key: 'demo',
                description: 'demo',
                defaultValue: false,
                options: [],
            });
            const shop = makeShop({
                featureFlags: [
                    {
                        flag: {
                            key: 'demo',
                            defaultValue: false,
                            targeting: [{ rule: 'always', params: {}, value: true }],
                        },
                    },
                ],
            });
            expect(f.evaluate(shop)).toBe(true);
        });

        it('skips rules whose predicate requiresUser', () => {
            registerPredicate('authed', () => true, { requiresUser: true });
            const f = defineFlag<boolean>({
                key: 'demo',
                description: 'demo',
                defaultValue: false,
                options: [],
            });
            const shop = makeShop({
                featureFlags: [
                    {
                        flag: {
                            key: 'demo',
                            defaultValue: false,
                            targeting: [{ rule: 'authed', params: {}, value: true }],
                        },
                    },
                ],
            });
            expect(f.evaluate(shop)).toBe(false);
        });

        it('falls back to populated flagDoc.defaultValue when no rules match', () => {
            const f = defineFlag<boolean>({
                key: 'demo',
                description: 'demo',
                defaultValue: false,
                options: [],
            });
            const shop = makeShop({
                featureFlags: [{ flag: { key: 'demo', defaultValue: true, targeting: [] } }],
            });
            expect(f.evaluate(shop)).toBe(true);
        });

        it('calls reportFlagValue with the resolved value', () => {
            const f = defineFlag<boolean>({
                key: 'demo',
                description: 'demo',
                defaultValue: true,
                options: [],
            });
            f.evaluate(makeShop());
            expect(reportFlagValue).toHaveBeenCalledWith('demo', true);
        });

        it('does not call cookies() or headers() (cache-safety regression)', async () => {
            const { cookies, headers } = await import('next/headers');
            const f = defineFlag<boolean>({
                key: 'demo',
                description: 'demo',
                defaultValue: false,
                options: [],
            });
            f.evaluate(makeShop());
            expect(cookies).not.toHaveBeenCalled();
            expect(headers).not.toHaveBeenCalled();
        });
    });
});
