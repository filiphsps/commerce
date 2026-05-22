import { describe, expect, it, vi } from 'vitest';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardPrice from '@/components/product-card/primitives/product-card-price';
import { render, screen } from '@/utils/test/react';

const ctx = (overrides: any = {}) => ({
    variant: 'vertical-boxed' as const,
    data: {} as any,
    selected: {
        id: 'v-1',
        price: { amount: '9.99', currencyCode: 'USD' },
    } as any,
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
            describe('ProductCardPrice', () => {
                it('renders the selected variant price', () => {
                    render(
                        <ProductCardContextProvider value={ctx()}>
                            <ProductCardPrice />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByText(/9\.99/)).toBeInTheDocument();
                });

                it('renders strike-through compare-at when on sale', () => {
                    render(
                        <ProductCardContextProvider
                            value={ctx({
                                selected: {
                                    id: 'v-1',
                                    price: { amount: '7.99', currencyCode: 'USD' },
                                    compareAtPrice: { amount: '9.99', currencyCode: 'USD' },
                                },
                            })}
                        >
                            <ProductCardPrice />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByText(/7\.99/)).toBeInTheDocument();
                    expect(screen.getByText(/9\.99/)).toBeInTheDocument();
                });

                it('renders null when no variant is selected', () => {
                    const { container } = render(
                        <ProductCardContextProvider value={ctx({ selected: undefined })}>
                            <ProductCardPrice />
                        </ProductCardContextProvider>,
                    );
                    expect(container).toBeEmptyDOMElement();
                });
            });
        });
    });
});
