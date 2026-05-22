import { describe, expect, it, vi } from 'vitest';
import { productMultiImage, productSimple } from '@/components/product-card/__fixtures__';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardImage from '@/components/product-card/primitives/product-card-image';
import { render, screen } from '@/utils/test/react';

const ctx = (data: any, overrides: any = {}) => ({
    variant: 'vertical-boxed' as const,
    data,
    selected: data.variants?.edges?.[0]?.node ?? ({ id: 'fallback', image: undefined } as any),
    setSelected: vi.fn(),
    hoveredImage: undefined,
    setHoveredImage: vi.fn(),
    i18n: {} as any,
    locale: { code: 'en-US' } as any,
    priority: false,
    ...overrides,
});

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardImage', () => {
                it('renders the primary image when product has one', () => {
                    const product = productSimple();
                    render(
                        <ProductCardContextProvider value={ctx(product)}>
                            <ProductCardImage />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByRole('img', { name: /simple front/i })).toBeInTheDocument();
                });

                it('renders a placeholder when product has no images', () => {
                    const product = { ...productSimple(), images: { edges: [] }, featuredImage: null };
                    render(
                        <ProductCardContextProvider value={ctx(product)}>
                            <ProductCardImage />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByTestId('product-card-image-placeholder')).toBeInTheDocument();
                });

                it('does not render a swap image when only one image exists', () => {
                    const product = productSimple();
                    render(
                        <ProductCardContextProvider value={ctx(product)}>
                            <ProductCardImage />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.queryByTestId('product-card-image-swap')).toBeNull();
                });

                it('renders a swap image when the product has 2+ images', () => {
                    const product = productMultiImage();
                    render(
                        <ProductCardContextProvider value={ctx(product)}>
                            <ProductCardImage />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByTestId('product-card-image-swap')).toBeInTheDocument();
                });

                it('renders the hovered image when context.hoveredImage is set', () => {
                    const product = productSimple();
                    const hovered = {
                        id: 'hovered',
                        url: 'https://cdn.test/hovered.jpg',
                        altText: 'Hovered preview',
                    };
                    render(
                        <ProductCardContextProvider value={ctx(product, { hoveredImage: hovered })}>
                            <ProductCardImage />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByRole('img', { name: /hovered preview/i })).toBeInTheDocument();
                });
            });
        });
    });
});
