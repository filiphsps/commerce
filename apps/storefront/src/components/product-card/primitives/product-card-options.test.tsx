import { describe, expect, it } from 'vitest';
import * as ProductOptions from '@/components/product-options';
import { render } from '@/utils/test/react';
import ProductCardOptions from './product-card-options';

const product = {
    options: [{ name: 'Color', values: ['Red'], optionValues: [{ name: 'Red', swatch: { color: '#f00' } }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v',
                    availableForSale: true,
                    selectedOptions: [{ name: 'Color', value: 'Red' }],
                },
            },
        ],
    },
} as any;

describe('ProductCard.Options', () => {
    it('renders one row per real option with a Swatch inside', () => {
        const { container } = render(
            <ProductOptions.Root product={product} initialSelection={{ Color: 'Red' }}>
                <ProductCardOptions product={product} />
            </ProductOptions.Root>,
        );
        expect(container.querySelector('.product-options-swatch')).toBeTruthy();
    });

    it('returns null when product has no real options (only Default Title)', () => {
        const titleOnlyProduct = {
            options: [{ name: 'Title', values: ['Default Title'], optionValues: [{ name: 'Default Title' }] }],
            variants: {
                edges: [
                    {
                        node: {
                            id: 'v',
                            availableForSale: true,
                            selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                        },
                    },
                ],
            },
        } as any;
        const { container } = render(
            <ProductOptions.Root product={titleOnlyProduct} initialSelection={{}}>
                <ProductCardOptions product={titleOnlyProduct} />
            </ProductOptions.Root>,
        );
        expect(container.firstChild).toBeNull();
    });
});
