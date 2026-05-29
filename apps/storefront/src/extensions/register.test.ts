import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';

import { getProductCardCta } from '@/components/product-card/cta/registry';
import type { ProductCardCtaProps } from '@/components/product-card/cta/types';
import { getProductCardPicker } from '@/components/product-card/picker/registry';
import type { ProductCardPickerProps } from '@/components/product-card/picker/types';

import { registerExtensionComponents } from './register';

/** A throwaway picker stand-in — identity is all the registry test asserts on. */
const StubPicker: ComponentType<ProductCardPickerProps> = () => null;
/** A throwaway CTA stand-in — identity is all the registry test asserts on. */
const StubCta: ComponentType<ProductCardCtaProps> = () => null;

describe('registerExtensionComponents', () => {
    it('registers picker and CTA components retrievable via the existing registries', () => {
        registerExtensionComponents({
            pickers: { 'ext-carousel': StubPicker },
            ctas: { 'ext-sticky': StubCta },
        });

        expect(getProductCardPicker('ext-carousel')).toBe(StubPicker);
        expect(getProductCardCta('ext-sticky')).toBe(StubCta);
    });

    it('is a no-op for an empty registration, leaving built-in defaults intact', () => {
        const floatBefore = getProductCardPicker('float');
        const floatPillBefore = getProductCardCta('float-pill');

        registerExtensionComponents({});

        expect(getProductCardPicker('float')).toBe(floatBefore);
        expect(getProductCardCta('float-pill')).toBe(floatPillBefore);
        // An unknown name still falls back to the built-in default.
        expect(getProductCardPicker('still-unknown')).toBe(floatBefore);
        expect(getProductCardCta('still-unknown')).toBe(floatPillBefore);
    });
});
