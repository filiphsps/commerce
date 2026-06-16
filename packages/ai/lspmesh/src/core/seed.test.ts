import { describe, expect, it } from 'vitest';

import { orderSeedFiles, seedScore } from '@/core/seed';

describe('seedScore', () => {
    it('defers tests, dist, and .d.ts; floats basename matches', () => {
        expect(seedScore('apps/x/foo.test.ts', 'foo')).toBeGreaterThan(0);
        expect(seedScore('packages/x/dist/foo.js', 'foo')).toBeGreaterThan(0);
        expect(seedScore('packages/utils/src/locale/locale.ts', 'locale')).toBeLessThan(0);
        expect(seedScore('apps/x/uses-locale.ts', 'locale')).toBe(0);
    });
});

describe('orderSeedFiles', () => {
    it('puts the basename match first and caps the list', () => {
        const files = ['apps/a.ts', 'apps/b.ts', 'packages/utils/src/locale/locale.ts'];
        const { ordered, truncated } = orderSeedFiles(files, 'Locale', 2);
        expect(ordered[0]).toBe('packages/utils/src/locale/locale.ts');
        expect(ordered).toHaveLength(2);
        expect(truncated).toBe(true);
    });
});
