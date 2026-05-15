import { describe, expect, it, vi } from 'vitest';
import ProductCardOptions from '@/components/product-card/product-card-options';
import { fireEvent, render, screen } from '@/utils/test/react';

const mkVariant = (id: string, sizeValue: string) => ({
    id: `gid://shopify/ProductVariant/${id}`,
    title: sizeValue,
    availableForSale: true,
    selectedOptions: [{ name: 'Size', value: sizeValue }],
    product: { handle: 'demo' },
});

const v1 = mkVariant('1', '100g');
const v2 = mkVariant('2', '200g');
const v3 = mkVariant('3', '300g');
const v4 = mkVariant('4', '400g');

// v1_ prefix is required; 0-3 encodes variant indices 0,1,2,3 all existing & available for a single-option product
const productWithSizes = {
    id: 'gid://shopify/Product/1',
    handle: 'demo',
    title: 'Demo',
    vendor: 'Demo Co',
    encodedVariantExistence: 'v1_0-3',
    encodedVariantAvailability: 'v1_0-3',
    options: [
        {
            id: 'opt1',
            name: 'Size',
            optionValues: [
                { name: '100g', firstSelectableVariant: v1 },
                { name: '200g', firstSelectableVariant: v2 },
                { name: '300g', firstSelectableVariant: v3 },
                { name: '400g', firstSelectableVariant: v4 },
            ],
        },
    ],
    selectedOrFirstAvailableVariant: v1,
    adjacentVariants: [v2, v3, v4],
    variants: { nodes: [v1, v2, v3, v4] },
} as any;

const defaultTitleVariant = {
    id: 'gid://shopify/ProductVariant/0',
    title: 'Default Title',
    availableForSale: true,
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    product: { handle: 'demo-default' },
};

const defaultTitleProduct = {
    id: 'gid://shopify/Product/2',
    handle: 'demo-default',
    title: 'Demo Default',
    vendor: 'Demo Co',
    encodedVariantExistence: 'v1_0',
    encodedVariantAvailability: 'v1_0',
    options: [
        {
            id: 'opt1',
            name: 'Title',
            optionValues: [{ name: 'Default Title', firstSelectableVariant: defaultTitleVariant }],
        },
    ],
    selectedOrFirstAvailableVariant: defaultTitleVariant,
    adjacentVariants: [],
    variants: { nodes: [defaultTitleVariant] },
} as any;

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardOptions', () => {
            it('renders nothing when the product has only the Default Title placeholder', () => {
                const setSelectedVariant = vi.fn();
                const { container } = render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={defaultTitleProduct}
                        selectedVariant={defaultTitleProduct.variants.nodes[0]}
                        setSelectedVariant={setSelectedVariant}
                    />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders chips for each value up to maxValuesPerOption=3', () => {
                const setSelectedVariant = vi.fn();
                render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={productWithSizes}
                        selectedVariant={productWithSizes.variants.nodes[1]}
                        setSelectedVariant={setSelectedVariant}
                    />,
                );
                expect(screen.getByRole('button', { name: 'Size: 100g' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: 200g' })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Size: 300g' })).toBeInTheDocument();
                expect(screen.queryByRole('button', { name: 'Size: 400g' })).not.toBeInTheDocument();
            });

            it('calls setSelectedVariant when a different value is clicked', () => {
                const setSelectedVariant = vi.fn();
                render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={productWithSizes}
                        selectedVariant={productWithSizes.variants.nodes[0]}
                        setSelectedVariant={setSelectedVariant}
                    />,
                );
                fireEvent.click(screen.getByRole('button', { name: 'Size: 200g' }));
                expect(setSelectedVariant).toHaveBeenCalledTimes(1);
                // The variant passed should be the one whose selectedOptions match {Size: '200g'}.
                const call = setSelectedVariant.mock.calls[0]![0];
                expect(call?.selectedOptions?.[0]?.value ?? call?.title).toBe('200g');
            });
        });
    });
});
