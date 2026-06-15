import { describe, expect, it } from 'vitest';

import {
    BREAKPOINT_MIN_WIDTH,
    breakpointForWidth,
    CORE_RESPONSIVE_MATRIX,
    VIEWPORT_PRESETS,
    VIEWPORT_PRESETS_BY_ID,
} from './presets';

describe('breakpointForWidth', () => {
    it('maps each min-width boundary to its breakpoint', () => {
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.base)).toBe('base');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.sm)).toBe('sm');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.md)).toBe('md');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.lg)).toBe('lg');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.xl)).toBe('xl');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH['2xl'])).toBe('2xl');
    });

    it('resolves just below a boundary to the lower tier', () => {
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.sm - 1)).toBe('base');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH.lg - 1)).toBe('md');
        expect(breakpointForWidth(BREAKPOINT_MIN_WIDTH['2xl'] - 1)).toBe('xl');
    });
});

describe('VIEWPORT_PRESETS', () => {
    it('derives every preset breakpoint from its width', () => {
        for (const preset of VIEWPORT_PRESETS) {
            expect(preset.breakpoint).toBe(breakpointForWidth(preset.width));
        }
    });

    it('has unique, non-empty ids and positive dimensions', () => {
        const ids = VIEWPORT_PRESETS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const preset of VIEWPORT_PRESETS) {
            expect(preset.id).not.toBe('');
            expect(preset.width).toBeGreaterThan(0);
            expect(preset.height).toBeGreaterThan(0);
        }
    });

    it('indexes by id', () => {
        for (const preset of VIEWPORT_PRESETS) {
            expect(VIEWPORT_PRESETS_BY_ID[preset.id]).toBe(preset);
        }
    });

    it('flags only book-style foldables as foldable', () => {
        const foldables = VIEWPORT_PRESETS.filter((p) => p.foldable).map((p) => p.id);
        expect(foldables).toEqual(['foldable-folded', 'foldable-unfolded']);
    });

    it('covers a folded foldable narrow enough to stress horizontal overflow', () => {
        const folded = VIEWPORT_PRESETS_BY_ID['foldable-folded'];
        expect(folded?.width).toBeLessThanOrEqual(320);
    });
});

describe('CORE_RESPONSIVE_MATRIX', () => {
    it('spans distinct device widths from a narrow foldable up to a desktop tier', () => {
        // Folded foldable and phone share the `base` breakpoint but are distinct
        // form factors, so uniqueness is asserted on width, not breakpoint.
        const widths = CORE_RESPONSIVE_MATRIX.map((p) => p.width);
        expect(new Set(widths).size).toBe(widths.length);
        // Must include at least one side-by-side desktop tier and the narrow stress case.
        expect(CORE_RESPONSIVE_MATRIX.some((p) => p.width >= BREAKPOINT_MIN_WIDTH.lg)).toBe(true);
        expect(CORE_RESPONSIVE_MATRIX.some((p) => p.foldable)).toBe(true);
    });
});
