import type { OnlineShop } from '@nordcom/commerce-db';
import { GenericErrorKind } from '@nordcom/commerce-errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
        throw new Error('headers() called inside cache-safe evaluation');
    }),
    cookies: vi.fn(() => {
        throw new Error('cookies() called inside cache-safe evaluation');
    }),
}));

vi.mock('../report', () => ({
    reportFlagValue: vi.fn(),
}));

vi.mock('../adapter', () => ({
    nordcomFlagAdapter: () => ({
        identify: () => ({}),
        decide: () => false,
    }),
}));

// The global vitest setup mocks `@nordcom/commerce-db` down to `{ Shop }`; re-mock here so the
// section-key helpers `section.ts` imports resolve. Logic mirrors the real db helpers.
vi.mock('@nordcom/commerce-db', () => ({
    SECTION_FLAG_PREFIX: 'section:',
    sectionFlagKey: (id: string) => `section:${id}`,
    isSectionFlagKey: (key: string) => typeof key === 'string' && key.startsWith('section:'),
}));

import { __resetPredicatesForTest, registerPredicate } from '../predicates';
import { sectionEnabled } from './section';

type FlagShape = {
    key: string;
    defaultValue: unknown;
    targeting: Array<{ rule: string; params: Record<string, unknown>; value: unknown }>;
};
type ShopOverrides = { featureFlags?: Array<{ flag: FlagShape }> };

function makeShop(overrides: ShopOverrides = {}): OnlineShop {
    return { id: 'shop-1', ...overrides } as unknown as OnlineShop;
}

describe('utils/flags/definitions/section', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('key and defaultValue', () => {
        it('namespaces the key as `section:<id>` and defaults to visible (true)', () => {
            const f = sectionEnabled('hero');
            expect(f.key).toBe('section:hero');
            expect(f.defaultValue).toBe(true);
        });

        it('honors an explicit defaultValue', () => {
            const f = sectionEnabled('promo', false);
            expect(f.key).toBe('section:promo');
            expect(f.defaultValue).toBe(false);
        });

        it('returns a callable with a sync `.evaluate` method', () => {
            const f = sectionEnabled('callable');
            expect(typeof f).toBe('function');
            expect(typeof f.evaluate).toBe('function');
        });
    });

    describe('memoization', () => {
        it('returns the same instance for the same section id', () => {
            expect(sectionEnabled('memo')).toBe(sectionEnabled('memo'));
        });
    });

    describe('.evaluate (per-shop resolution)', () => {
        it('resolves to the default (visible) when the shop has no matching flag ref — renders as today', () => {
            const f = sectionEnabled('no-ref-visible');
            expect(f.evaluate(makeShop())).toBe(true);
        });

        it('resolves to an explicit default when the shop has no matching flag ref', () => {
            const f = sectionEnabled('no-ref-hidden', false);
            expect(f.evaluate(makeShop())).toBe(false);
        });

        it('resolves to the rule value when a no-user targeting predicate matches', () => {
            registerPredicate('always', () => true, { requiresUser: false });
            const f = sectionEnabled('targeted');
            const shop = makeShop({
                featureFlags: [
                    {
                        flag: {
                            key: 'section:targeted',
                            defaultValue: true,
                            targeting: [{ rule: 'always', params: {}, value: false }],
                        },
                    },
                ],
            });
            expect(f.evaluate(shop)).toBe(false);
        });

        it('does not read cookies() or headers() (cache-safety regression)', async () => {
            const { cookies, headers } = await import('next/headers');
            const f = sectionEnabled('cache-safe');
            f.evaluate(makeShop());
            expect(cookies).not.toHaveBeenCalled();
            expect(headers).not.toHaveBeenCalled();
        });
    });

    describe('validation', () => {
        // Assert on the commerce-errors `code` rather than `instanceof` — the test and `section.ts`
        // can resolve `@nordcom/commerce-errors` to distinct module instances under Vitest, which
        // breaks class-identity checks but not the (stable, string) error code.
        const codeOf = (run: () => unknown): unknown => {
            try {
                run();
            } catch (error: unknown) {
                return (error as { code?: unknown }).code;
            }
            return undefined;
        };

        it('throws a commerce INVALID_TYPE error on an empty id', () => {
            expect(codeOf(() => sectionEnabled(''))).toBe(GenericErrorKind.INVALID_TYPE);
        });

        it('throws a commerce INVALID_TYPE error on a whitespace-only id', () => {
            expect(codeOf(() => sectionEnabled('   '))).toBe(GenericErrorKind.INVALID_TYPE);
        });

        it('throws a commerce INVALID_TYPE error on an already-namespaced id', () => {
            expect(codeOf(() => sectionEnabled('section:hero'))).toBe(GenericErrorKind.INVALID_TYPE);
        });
    });
});
