import { describe, expect, it, vi } from 'vitest';
import ProductCardOptions from '@/components/product-card/product-card-options';
import { mockProduct } from '@/utils/test/fixtures';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@/utils/locale', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/utils/locale')>();
    return {
        ...actual,
        isSizeOption: () => false,
        formatWeight: (v: any) => String(v),
        localizeWeight: (_locale: any, v: any) => v,
    };
});

const makeProductWithVariants = (variants: any[]) =>
    mockProduct({
        variants: {
            edges: variants.map((v) => ({ node: v })),
            pageInfo: {},
        },
    }) as any;

const makeVariant = (id: string, title: string, availableForSale = true) => ({
    id,
    title,
    availableForSale,
    selectedOptions: [{ name: 'Size', value: title }],
    price: { amount: '10.00', currencyCode: 'USD' },
    compareAtPrice: null,
    sku: null,
    image: null,
});

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardOptions', () => {
            it('renders nothing when there is only one variant', () => {
                const product = makeProductWithVariants([makeVariant('v1', 'S')]);
                const selected = product.variants.edges[0].node;
                const { container } = render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={product}
                        selectedVariant={selected}
                        setSelectedVariant={vi.fn()}
                    />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders variant buttons when multiple variants are available', () => {
                const product = makeProductWithVariants([
                    makeVariant('v1', 'S'),
                    makeVariant('v2', 'M'),
                    makeVariant('v3', 'L'),
                ]);
                const selected = product.variants.edges[0].node;
                render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={product}
                        selectedVariant={selected}
                        setSelectedVariant={vi.fn()}
                    />,
                );
                expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(1);
            });

            it('calls setSelectedVariant when a non-selected variant button is clicked', () => {
                const setSelected = vi.fn();
                const product = makeProductWithVariants([
                    makeVariant('v1', 'S'),
                    makeVariant('v2', 'M'),
                    makeVariant('v3', 'L'),
                ]);
                const selected = product.variants.edges[0].node;
                render(
                    <ProductCardOptions
                        locale={{ code: 'en-US' } as any}
                        data={product}
                        selectedVariant={selected}
                        setSelectedVariant={setSelected}
                    />,
                );
                const buttons = screen.getAllByRole('button');
                fireEvent.click(buttons[0]!);
                expect(setSelected).toHaveBeenCalled();
            });
        });
    });
});
