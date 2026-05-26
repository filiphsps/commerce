import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '@/components/product-options/context';
import type { ProductOptionsContextValue } from '@/components/product-options/types';
import { render } from '@/utils/test/react';
import VariantPriceClient from './variant-price-client';

function wrap(ctx: Partial<ProductOptionsContextValue>) {
    const full: ProductOptionsContextValue = {
        product: {} as any,
        resolved: [],
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
        ...ctx,
    };
    return render(
        <ProductOptionsContext.Provider value={full}>
            <VariantPriceClient initialPrice="€62.30" initialCompare="€89.00" initialPct={30} locale="en-US" />
        </ProductOptionsContext.Provider>,
    );
}

describe('VariantPriceClient', () => {
    it('renders the initial seed strings when no selectedVariant', () => {
        const { container } = wrap({});
        expect(container.textContent).toMatch(/€62\.30/);
        expect(container.textContent).toMatch(/30%/);
    });

    it('swaps to selected variant price', () => {
        const { container } = wrap({
            selectedVariant: { id: 'v2', price: { amount: '70', currencyCode: 'EUR' } } as any,
        });
        expect(container.textContent).toMatch(/€70\.00/);
    });
});
