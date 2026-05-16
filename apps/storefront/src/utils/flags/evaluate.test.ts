import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Undo the global mock from vitest.setup.ts — this test exercises the real
// evaluateShopFlag implementation.
vi.unmock('@/utils/flags/evaluate');

vi.mock('./report', () => ({ reportFlagValue: vi.fn() }));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() must not be called inside evaluateShopFlag');
    }),
    cookies: vi.fn(() => {
        throw new Error('cookies() must not be called inside evaluateShopFlag');
    }),
}));

import { evaluateShopFlag } from './evaluate';
import { __resetPredicatesForTest } from './predicates';
import { registerBuiltinPredicates } from './register-builtin-predicates';
import { reportFlagValue } from './report';

const shopWith = (flags: unknown[]) =>
    ({
        id: 'shop-1',
        featureFlags: flags,
    }) as never;

const flagDoc = (overrides: Record<string, unknown> = {}) => ({
    flag: {
        key: 'feat-a',
        defaultValue: false,
        targeting: [],
        ...overrides,
    },
});

describe('utils/flags/evaluate.evaluateShopFlag', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        registerBuiltinPredicates();
        vi.mocked(reportFlagValue).mockReset();
    });
    afterEach(() => {
        __resetPredicatesForTest();
    });

    it('returns code-level fallback when the shop has no flag refs', () => {
        const v = evaluateShopFlag<boolean>(shopWith([]), 'feat-a', { codeDefaultValue: false });
        expect(v).toBe(false);
    });

    it('returns flag.defaultValue when targeting is empty', () => {
        const v = evaluateShopFlag<boolean>(shopWith([flagDoc({ defaultValue: true })]), 'feat-a');
        expect(v).toBe(true);
    });

    it('returns first-matching rule value (and stops walking)', () => {
        const v = evaluateShopFlag<string>(
            shopWith([
                flagDoc({
                    defaultValue: 'fallback',
                    targeting: [
                        { rule: 'shop', params: { shopIds: ['nope'] }, value: 'skip' },
                        { rule: 'shop', params: { shopIds: ['shop-1'] }, value: 'match' },
                        { rule: 'shop', params: { shopIds: ['shop-1'] }, value: 'never' },
                    ],
                }),
            ]),
            'feat-a',
        );
        expect(v).toBe('match');
    });

    it('skips rules that require user data', () => {
        const v = evaluateShopFlag<boolean>(
            shopWith([
                flagDoc({
                    defaultValue: false,
                    targeting: [
                        { rule: 'group', params: { groups: ['internal'] }, value: true },
                        { rule: 'shop', params: { shopIds: ['shop-1'] }, value: true },
                    ],
                }),
            ]),
            'feat-a',
        );
        expect(v).toBe(true);
    });

    it('honors overrides over targeting and defaultValue', () => {
        const v = evaluateShopFlag<boolean>(
            shopWith([flagDoc({ defaultValue: false, targeting: [{ rule: 'always', params: {}, value: false }] })]),
            'feat-a',
            { overrides: { 'feat-a': true } },
        );
        expect(v).toBe(true);
    });

    it('falls through unknown predicate names without throwing', () => {
        const v = evaluateShopFlag<string>(
            shopWith([
                flagDoc({
                    defaultValue: 'fallback',
                    targeting: [{ rule: 'not-registered', params: {}, value: 'no' }],
                }),
            ]),
            'feat-a',
        );
        expect(v).toBe('fallback');
    });

    it('reports the resolved value', () => {
        evaluateShopFlag<boolean>(shopWith([flagDoc({ defaultValue: true })]), 'feat-a');
        expect(reportFlagValue).toHaveBeenCalledWith('feat-a', true);
    });

    it('does not call headers() or cookies()', () => {
        expect(() => evaluateShopFlag<boolean>(shopWith([flagDoc({ defaultValue: false })]), 'feat-a')).not.toThrow();
    });
});
