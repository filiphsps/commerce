import { buildInitialFormState } from '@nordcom/commerce-cms/editor';
import { describe, expect, it } from 'vitest';

/**
 * Regression guard: the Theme Editor relies on every `theme.*` leaf surviving
 * in `FormState` so its token controls bind and the save pipeline round-trips
 * the whole subtree. The native `buildInitialFormState` (which replaced the
 * Payload-era `buildCmsFormState` + hidden-field strip in CMSDATA-07) must
 * keep flattening the shop document's `theme` group into live dotted paths —
 * including array rows like `theme.colors.accents.0.*`.
 */
describe('theme form-state survival', () => {
    it('keeps every theme.* path in the native form state', () => {
        const state = buildInitialFormState({
            name: 'Acme',
            theme: {
                colors: {
                    background: '#fefefe',
                    accents: [{ type: 'primary', color: '#14110b', foreground: '#fefefe' }],
                },
                productCard: { ctaBg: '#14110b' },
            },
        });

        expect(Object.keys(state).sort()).toEqual([
            'name',
            'theme.colors.accents.0.color',
            'theme.colors.accents.0.foreground',
            'theme.colors.accents.0.type',
            'theme.colors.background',
            'theme.productCard.ctaBg',
        ]);
        expect(state['theme.colors.background']).toEqual({ value: '#fefefe', initialValue: '#fefefe' });
    });
});
