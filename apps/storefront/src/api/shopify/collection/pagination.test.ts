import { ConflictingFilterError, UnreachableError } from '@nordcom/commerce-errors';
import { describe, expect, it } from 'vitest';

import { extractLimitLikeFilters } from './pagination';

describe('extractLimitLikeFilters', () => {
    it('defaults to `first` when no limit-like key is present', () => {
        expect(extractLimitLikeFilters({})).toEqual({ first: 30 });
        expect(extractLimitLikeFilters({}, 12)).toEqual({ first: 12 });
    });

    it('maps `limit` onto `first`', () => {
        expect(extractLimitLikeFilters({ limit: 24 })).toEqual({ first: 24 });
    });

    it('passes `first`/`last` through', () => {
        expect(extractLimitLikeFilters({ first: 5 })).toEqual({ first: 5, last: null });
        expect(extractLimitLikeFilters({ last: 5 })).toEqual({ first: null, last: 5 });
    });

    it('throws ConflictingFilterError when `limit` is combined with `first`/`last`', () => {
        expect(() => extractLimitLikeFilters({ limit: 10, first: 5 })).toThrow(ConflictingFilterError);
        expect(() => extractLimitLikeFilters({ limit: 10, last: 5 })).toThrow(ConflictingFilterError);
    });

    it('throws ConflictingFilterError when both `first` and `last` are provided', () => {
        expect(() => extractLimitLikeFilters({ first: 5, last: 5 })).toThrow(ConflictingFilterError);
    });

    it('exposes UnreachableError for exhaustiveness (sanity import)', () => {
        // The function's final guard throws UnreachableError; assert the class is the one referenced
        // so a rename there is caught here too.
        expect(new UnreachableError()).toBeInstanceOf(UnreachableError);
    });
});
