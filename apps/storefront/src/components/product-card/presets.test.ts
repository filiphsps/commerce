import { describe, expect, it } from 'vitest';

import { SURFACE_PRESETS } from './presets';

describe('SURFACE_PRESETS', () => {
    it('exposes collection, recommendation, search', () => {
        expect(Object.keys(SURFACE_PRESETS).sort()).toEqual(['collection', 'recommendation', 'search']);
    });

    it('collection + recommendation use vertical/boxed/float-pill/auto', () => {
        for (const k of ['collection', 'recommendation'] as const) {
            expect(SURFACE_PRESETS[k]).toEqual({
                layout: 'vertical',
                chrome: 'boxed',
                ctaPlacement: 'float-pill',
                pickerPresentation: 'auto'
            });
        }
    });

    it('search uses horizontal/boxed', () => {
        expect(SURFACE_PRESETS.search.layout).toBe('horizontal');
        expect(SURFACE_PRESETS.search.chrome).toBe('boxed');
    });
});
