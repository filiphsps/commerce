import { describe, expect, it } from 'vitest';
import { ProductOptionsContext } from '@/components/product-options/context';
import type { ProductOptionsContextValue } from '@/components/product-options/types';
import { render } from '@/utils/test/react';
import VariantImageClient from './variant-image-client';

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
            <VariantImageClient
                initialImage={{ url: 'https://cdn/seed.jpg', altText: 'seed', width: 800, height: 1000 }}
                swapImage={{ url: 'https://cdn/swap.jpg', altText: 'swap', width: 800, height: 1000 }}
                aspect="vertical"
                href="/products/h/"
                title="H"
                priority={false}
            />
        </ProductOptionsContext.Provider>,
    );
}

describe('VariantImageClient', () => {
    it('renders seed image by default', () => {
        const { container } = wrap({});
        expect(container.querySelector('img')?.getAttribute('src')).toContain('seed.jpg');
    });

    it('swaps to selected variant image when set', () => {
        const { container } = wrap({
            selectedVariant: { image: { url: 'https://cdn/sel.jpg', altText: 's', width: 800, height: 1000 } } as any,
        });
        expect(container.querySelector('img')?.getAttribute('src')).toContain('sel.jpg');
    });

    it('renders the secondary swap image alongside the primary', () => {
        const { getByTestId } = wrap({});
        expect(getByTestId('product-card-image-swap')).toBeTruthy();
    });
});
