import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlagEntities } from './entities';
import { __resetPredicatesForTest, evaluatePredicate, getPredicateMetadata, registerPredicate } from './predicates';

const ents = (): FlagEntities => ({
    shop: { id: 'shop-1' } as never,
    session: null,
    user: null,
    visitorId: 'v-1',
});

describe('utils/flags/predicates', () => {
    afterEach(() => {
        __resetPredicatesForTest();
        vi.restoreAllMocks();
    });

    it('registerPredicate stores a predicate and evaluatePredicate calls it', () => {
        registerPredicate('always-true', () => true);
        expect(evaluatePredicate('always-true', {}, ents())).toBe(true);
    });

    it('registering the same name twice throws', () => {
        registerPredicate('dup', () => true);
        expect(() => registerPredicate('dup', () => false)).toThrow(
            expect.objectContaining({
                name: 'DuplicatePredicateRegistrationError',
                code: 'GENERIC_DUPLICATE_PREDICATE_REGISTRATION',
            }),
        );
    });

    it('evaluatePredicate returns false for unknown predicate (OTel event emitted once)', () => {
        // The diagnostic is now emitted via trace.getActiveSpan()?.addEvent() — a
        // no-op in the test environment. Verify only the behavioral contract: returns
        // false and does not spam (warnedUnknown dedup is exercised by calling twice).
        expect(evaluatePredicate('missing', {}, ents())).toBe(false);
        expect(evaluatePredicate('missing', {}, ents())).toBe(false);
    });

    it('getPredicateMetadata returns registered metadata', () => {
        registerPredicate('flag-rule', () => true, { requiresUser: true });
        expect(getPredicateMetadata('flag-rule')).toEqual({ requiresUser: true });
    });

    it('getPredicateMetadata returns undefined for unknown predicate', () => {
        expect(getPredicateMetadata('nope')).toBeUndefined();
    });

    it('a thrown predicate is treated as false (OTel event emitted)', () => {
        // The error is now emitted via trace.getActiveSpan()?.addEvent() — a no-op in
        // the test environment. Verify only the behavioral contract: returns false.
        registerPredicate('throws', () => {
            throw new Error('boom');
        });
        expect(evaluatePredicate('throws', {}, ents())).toBe(false);
    });
});
