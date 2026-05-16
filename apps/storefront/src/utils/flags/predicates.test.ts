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
        expect(() => registerPredicate('dup', () => false)).toThrow(/already registered/);
    });

    it('evaluatePredicate returns false for unknown predicate and warns once', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(evaluatePredicate('missing', {}, ents())).toBe(false);
        expect(evaluatePredicate('missing', {}, ents())).toBe(false);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('getPredicateMetadata returns registered metadata', () => {
        registerPredicate('flag-rule', () => true, { requiresUser: true });
        expect(getPredicateMetadata('flag-rule')).toEqual({ requiresUser: true });
    });

    it('getPredicateMetadata returns undefined for unknown predicate', () => {
        expect(getPredicateMetadata('nope')).toBeUndefined();
    });

    it('a thrown predicate is treated as false and logged', () => {
        const err = vi.spyOn(console, 'error').mockImplementation(() => {});
        registerPredicate('throws', () => {
            throw new Error('boom');
        });
        expect(evaluatePredicate('throws', {}, ents())).toBe(false);
        expect(err).toHaveBeenCalled();
    });
});
