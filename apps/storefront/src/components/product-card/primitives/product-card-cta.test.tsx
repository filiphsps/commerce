import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import { ProductCardOptionsProvider } from './product-card-options-provider';
import ProductCardCta from './product-card-cta';

const product = {
    handle: 'tee',
    variants: { edges: [{ node: { id: 'v1', availableForSale: true } }] },
} as never;

describe('ProductCardCta host', () => {
    it('renders the float-pill strategy when placement is float-pill', () => {
        const { container } = render(
            <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
                <ProductCardCta placement="float-pill" />
            </ProductCardOptionsProvider>,
        );
        const btn = container.querySelector('button');
        expect(btn?.getAttribute('aria-label')).toMatch(/choose options/i);
    });

    it('renders the inline-button strategy when placement is inline-button', () => {
        const { container } = render(
            <ProductCardOptionsProvider product={product} seedVariantId="v1" isSingleBuyable={false}>
                <ProductCardCta placement="inline-button" />
            </ProductCardOptionsProvider>,
        );
        expect(container.textContent).toMatch(/add to bag/i);
    });
});
