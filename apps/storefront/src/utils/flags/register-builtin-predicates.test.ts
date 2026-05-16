import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FlagEntities } from './entities';
import { __resetPredicatesForTest, evaluatePredicate, getPredicateMetadata } from './predicates';
import { registerBuiltinPredicates } from './register-builtin-predicates';

const ents = (overrides: Partial<FlagEntities> = {}): FlagEntities => ({
    shop: { id: 'shop-1' } as never,
    session: null,
    user: null,
    visitorId: 'visitor-1',
    ...overrides,
});

describe('utils/flags/register-builtin-predicates', () => {
    beforeEach(() => {
        __resetPredicatesForTest();
        registerBuiltinPredicates();
    });
    afterEach(() => {
        __resetPredicatesForTest();
    });

    describe('shop', () => {
        it('matches when shopIds contains the entity shop id', () => {
            expect(evaluatePredicate('shop', { shopIds: ['shop-1'] }, ents())).toBe(true);
        });
        it('does not match when shopIds is missing the entity shop id', () => {
            expect(evaluatePredicate('shop', { shopIds: ['shop-2'] }, ents())).toBe(false);
        });
        it('has requiresUser=false', () => {
            expect(getPredicateMetadata('shop')).toEqual({ requiresUser: false });
        });
    });

    describe('authenticated', () => {
        it('matches when session is non-null', () => {
            expect(evaluatePredicate('authenticated', {}, ents({ session: { user: {} } as never }))).toBe(true);
        });
        it('does not match when session is null', () => {
            expect(evaluatePredicate('authenticated', {}, ents({ session: null }))).toBe(false);
        });
        it('has requiresUser=true', () => {
            expect(getPredicateMetadata('authenticated')).toEqual({ requiresUser: true });
        });
    });

    describe('group', () => {
        it('matches when user.groups intersects params.groups', () => {
            expect(
                evaluatePredicate(
                    'group',
                    { groups: ['internal'] },
                    ents({ user: { id: 'u-1', groups: ['internal', 'beta'] } }),
                ),
            ).toBe(true);
        });
        it('does not match when user.groups misses', () => {
            expect(
                evaluatePredicate(
                    'group',
                    { groups: ['internal'] },
                    ents({ user: { id: 'u-1', groups: ['external'] } }),
                ),
            ).toBe(false);
        });
        it('does not match when user is null', () => {
            expect(evaluatePredicate('group', { groups: ['internal'] }, ents())).toBe(false);
        });
        it('has requiresUser=true', () => {
            expect(getPredicateMetadata('group')).toEqual({ requiresUser: true });
        });
    });

    describe('percentage', () => {
        it('always matches when bucket is 100', () => {
            expect(evaluatePredicate('percentage', { bucket: 100 }, ents())).toBe(true);
        });
        it('never matches when bucket is 0', () => {
            expect(evaluatePredicate('percentage', { bucket: 0 }, ents())).toBe(false);
        });
        it('is deterministic for the same visitor', () => {
            const a = evaluatePredicate('percentage', { bucket: 50 }, ents({ visitorId: 'v-X' }));
            const b = evaluatePredicate('percentage', { bucket: 50 }, ents({ visitorId: 'v-X' }));
            expect(a).toBe(b);
        });
        it('has requiresUser=false', () => {
            expect(getPredicateMetadata('percentage')).toEqual({ requiresUser: false });
        });
    });

    describe('always', () => {
        it('always returns true', () => {
            expect(evaluatePredicate('always', {}, ents())).toBe(true);
        });
        it('has requiresUser=false', () => {
            expect(getPredicateMetadata('always')).toEqual({ requiresUser: false });
        });
    });
});
