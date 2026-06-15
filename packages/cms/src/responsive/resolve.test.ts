import { describe, expect, it } from 'vitest';
import type { Breakpoint } from './breakpoints';
import { normalizeResponsiveValue, resolveResponsiveValue, responsiveClassName, responsiveEntries } from './resolve';
import type { ResponsiveValue } from './types';

describe('normalizeResponsiveValue', () => {
    it('uses the fallback base for nullish input', () => {
        expect(normalizeResponsiveValue(null, 'grid')).toEqual({ base: 'grid' });
        expect(normalizeResponsiveValue(undefined, 'carousel')).toEqual({ base: 'carousel' });
    });

    it('promotes a bare scalar to the base (legacy single-value content)', () => {
        expect(normalizeResponsiveValue('carousel', 'grid')).toEqual({ base: 'carousel' });
    });

    it('keeps defined breakpoints and drops null/undefined ones', () => {
        expect(normalizeResponsiveValue({ base: 'carousel', md: 'grid', lg: null, xl: undefined }, 'grid')).toEqual({
            base: 'carousel',
            md: 'grid',
        });
    });

    it('fills a missing base from the fallback while preserving overrides', () => {
        expect(normalizeResponsiveValue({ md: 'grid' }, 'carousel')).toEqual({ base: 'carousel', md: 'grid' });
    });
});

describe('resolveResponsiveValue', () => {
    const layout: ResponsiveValue<'grid' | 'carousel'> = { base: 'carousel', md: 'grid' };

    it('returns base below the first override and cascades upward', () => {
        expect(resolveResponsiveValue(layout, 'base')).toBe('carousel');
        expect(resolveResponsiveValue(layout, 'sm')).toBe('carousel');
        expect(resolveResponsiveValue(layout, 'md')).toBe('grid');
        expect(resolveResponsiveValue(layout, 'lg')).toBe('grid');
        expect(resolveResponsiveValue(layout, '2xl')).toBe('grid');
    });

    it('cascades across a gap (lg override skips md)', () => {
        const threeStop: ResponsiveValue<'a' | 'b' | 'c'> = { base: 'a', md: 'b', lg: 'c' };
        expect(resolveResponsiveValue(threeStop, 'sm')).toBe('a');
        expect(resolveResponsiveValue(threeStop, 'md')).toBe('b');
        expect(resolveResponsiveValue(threeStop, 'lg')).toBe('c');
        expect(resolveResponsiveValue(threeStop, 'xl')).toBe('c');
    });
});

describe('responsiveEntries', () => {
    it('returns only defined breakpoints in ascending order', () => {
        expect(responsiveEntries({ base: 'carousel', lg: 'grid' })).toEqual([
            ['base', 'carousel'],
            ['lg', 'grid'],
        ]);
    });
});

describe('responsiveClassName', () => {
    const table: Record<Breakpoint, Record<'grid' | 'carousel', string>> = {
        base: { grid: 'rail-grid', carousel: 'rail-carousel' },
        sm: { grid: 'sm:rail-grid', carousel: 'sm:rail-carousel' },
        md: { grid: 'md:rail-grid', carousel: 'md:rail-carousel' },
        lg: { grid: 'lg:rail-grid', carousel: 'lg:rail-carousel' },
        xl: { grid: 'xl:rail-grid', carousel: 'xl:rail-carousel' },
        '2xl': { grid: '2xl:rail-grid', carousel: '2xl:rail-carousel' },
    };

    it('emits one prefixed class per defined breakpoint', () => {
        expect(responsiveClassName({ base: 'carousel', md: 'grid' }, table)).toBe('rail-carousel md:rail-grid');
    });

    it('emits only the base class for a single-value layout', () => {
        expect(responsiveClassName({ base: 'carousel' }, table)).toBe('rail-carousel');
    });

    it('preserves breakpoint order across a multi-stop cascade', () => {
        expect(responsiveClassName({ base: 'carousel', md: 'grid', lg: 'carousel' }, table)).toBe(
            'rail-carousel md:rail-grid lg:rail-carousel',
        );
    });
});
