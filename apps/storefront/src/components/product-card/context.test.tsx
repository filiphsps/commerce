import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ALL_VARIANTS, useProductCardContext } from '@/components/product-card/context';

describe('components', () => {
    describe('product-card', () => {
        describe('context', () => {
            it('exposes the five variants', () => {
                expect(ALL_VARIANTS).toEqual([
                    'vertical-boxed',
                    'vertical-bare',
                    'horizontal-boxed',
                    'horizontal-bare',
                    'micro',
                ]);
            });

            it('throws when useProductCardContext is called outside a provider', () => {
                expect(() => renderHook(() => useProductCardContext())).toThrow(
                    /must be used within a <ProductCard.Root>/,
                );
            });
        });
    });
});
