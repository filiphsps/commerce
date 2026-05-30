import { describe, expect, it } from 'vitest';

import { SURFACE_PRESETS } from './presets';

describe('SURFACE_PRESETS', () => {
    it('exposes collection, recommendation, search', () => {
        expect(Object.keys(SURFACE_PRESETS).sort()).toEqual(['collection', 'recommendation', 'search']);
    });

    it('collection uses vertical/boxed/inline-button/inline', () => {
        expect(SURFACE_PRESETS.collection).toEqual({
            layout: 'vertical',
            chrome: 'boxed',
            ctaPlacement: 'inline-button',
            pickerPresentation: 'inline',
        });
    });

    it('recommendation uses vertical/boxed/float-pill/auto', () => {
        expect(SURFACE_PRESETS.recommendation).toEqual({
            layout: 'vertical',
            chrome: 'boxed',
            ctaPlacement: 'float-pill',
            pickerPresentation: 'auto',
        });
    });

    it('search uses horizontal/boxed', () => {
        expect(SURFACE_PRESETS.search.layout).toBe('horizontal');
        expect(SURFACE_PRESETS.search.chrome).toBe('boxed');
    });
});
