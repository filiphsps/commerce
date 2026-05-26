import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '@/components/product-options/context';
import type { ProductOptionsContextValue } from '@/components/product-options/types';
import { render } from '@/utils/test/react';
import VariantStockUrgencyClient from './variant-stock-urgency-client';

const i18n = {
    product: { 'only-n-left': 'Only {0} left' },
    locale: { code: 'en-US' },
} as any;

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
            <VariantStockUrgencyClient initialMessage="Only 3 left" threshold={5} i18n={i18n} />
        </ProductOptionsContext.Provider>,
    );
}

describe('VariantStockUrgencyClient', () => {
    it('renders seed message when no selected variant', () => {
        const { getByText } = wrap({});
        expect(getByText(/Only 3 left/)).toBeTruthy();
    });

    it('swaps to selected variant quantityAvailable when below threshold', () => {
        const { getByText } = wrap({ selectedVariant: { quantityAvailable: 1 } as any });
        expect(getByText(/Only 1 left/)).toBeTruthy();
    });

    it('renders nothing if selected variant has plenty in stock', () => {
        const { container } = wrap({ selectedVariant: { quantityAvailable: 100 } as any });
        expect(container.textContent?.trim() ?? '').toBe('');
    });
});
