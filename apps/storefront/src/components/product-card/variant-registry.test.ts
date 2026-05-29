import { describe, expect, it } from 'vitest';

import { getProductCardCta } from './cta/registry';
import { getProductCardPicker } from './picker/registry';
import { BUILTIN_PRODUCT_CARD_SURFACE, resolveProductCardSurface, SURFACE_PRESETS } from './presets';

describe('tenant-aware product-card variant resolution', () => {
    describe('no-override shop (byte-identical default)', () => {
        it('resolves every surface to its current preset unchanged', () => {
            for (const surface of Object.keys(SURFACE_PRESETS) as Array<keyof typeof SURFACE_PRESETS>) {
                expect(resolveProductCardSurface(surface)).toEqual(SURFACE_PRESETS[surface]);
            }
        });

        it('resolves each picker presentation (inline/float/sheet) to a distinct built-in', () => {
            const float = getProductCardPicker('float');
            const sheet = getProductCardPicker('sheet');
            const inline = getProductCardPicker('inline');

            expect(new Set([float, sheet, inline]).size).toBe(3);
            // An unknown shape falls back to the float picker — the current pre-registry behavior.
            expect(getProductCardPicker('unknown-shape')).toBe(float);
        });

        it('resolves each CTA placement to a distinct built-in', () => {
            const floatPill = getProductCardCta('float-pill');
            const inlineButton = getProductCardCta('inline-button');

            expect(floatPill).not.toBe(inlineButton);
            // An unknown placement falls back to the float-pill CTA — the current behavior.
            expect(getProductCardCta('unknown-placement')).toBe(floatPill);
        });
    });

    describe('override layering precedence', () => {
        it('layers a shop/CMS override on top of the surface preset, keeping unset fields', () => {
            const resolved = resolveProductCardSurface('collection', {
                ctaPlacement: 'inline-button',
                pickerPresentation: 'inline',
            });

            expect(resolved).toEqual({
                layout: SURFACE_PRESETS.collection.layout,
                chrome: SURFACE_PRESETS.collection.chrome,
                ctaPlacement: 'inline-button',
                pickerPresentation: 'inline',
            });
        });

        it('falls through preset to the built-in default for an unknown surface', () => {
            expect(resolveProductCardSurface('unknown-surface')).toEqual(BUILTIN_PRODUCT_CARD_SURFACE);
            expect(resolveProductCardSurface('unknown-surface', { layout: 'horizontal' })).toEqual({
                ...BUILTIN_PRODUCT_CARD_SURFACE,
                layout: 'horizontal',
            });
        });

        it('ignores undefined override fields so partial overrides layer cleanly', () => {
            expect(resolveProductCardSurface('search', { ctaPlacement: undefined })).toEqual(SURFACE_PRESETS.search);
        });
    });
});
