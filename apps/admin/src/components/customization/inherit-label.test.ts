import { describe, expect, it } from 'vitest';

import { inheritSourceLabel } from './inherit-label';

describe('inheritSourceLabel', () => {
    it('labels a base-scope field as the platform default regardless of base state', () => {
        expect(inheritSourceLabel({ scope: 'base', baseSet: false })).toBe('Platform default');
        expect(inheritSourceLabel({ scope: 'base', baseSet: true })).toBe('Platform default');
    });

    it('labels a surface-scope field as Base when the store-wide base sets the key', () => {
        expect(inheritSourceLabel({ scope: 'surface', baseSet: true })).toBe('Base');
    });

    it('labels a surface-scope field as the platform default when the base leaves the key unset', () => {
        expect(inheritSourceLabel({ scope: 'surface', baseSet: false })).toBe('Platform default');
    });
});
