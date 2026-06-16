import { describe, expect, it } from 'vitest';

import { resolveProductCardSurface, SURFACE_PRESETS } from './presets';

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

describe('resolveProductCardSurface — per-instance tier', () => {
    it('instance overrides per-surface, base, and preset per field', () => {
        const resolved = resolveProductCardSurface(
            'collection',
            { layout: 'horizontal' }, // per-surface override
            { chrome: 'frameless' }, // store-wide base
            { ctaPlacement: 'float-pill', layout: 'vertical' }, // per-instance override
        );
        expect(resolved).toEqual({
            layout: 'vertical', // instance wins over the per-surface 'horizontal'
            chrome: 'frameless', // base, untouched by instance
            ctaPlacement: 'float-pill', // instance
            pickerPresentation: SURFACE_PRESETS.collection.pickerPresentation, // preset
        });
    });

    it('a partial instance override falls through field-by-field', () => {
        const resolved = resolveProductCardSurface('collection', undefined, undefined, { chrome: 'frameless' });
        expect(resolved).toEqual({
            layout: SURFACE_PRESETS.collection.layout,
            chrome: 'frameless',
            ctaPlacement: SURFACE_PRESETS.collection.ctaPlacement,
            pickerPresentation: SURFACE_PRESETS.collection.pickerPresentation,
        });
    });

    it('an absent instance override is byte-identical to the three-tier result', () => {
        const withInstance = resolveProductCardSurface('collection', { layout: 'horizontal' }, { chrome: 'frameless' });
        const explicitUndefined = resolveProductCardSurface(
            'collection',
            { layout: 'horizontal' },
            { chrome: 'frameless' },
            undefined,
        );
        expect(explicitUndefined).toEqual(withInstance);
    });
});
