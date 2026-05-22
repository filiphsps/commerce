import { describe, expect, it, vi } from 'vitest';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardStockUrgency from '@/components/product-card/primitives/product-card-stock-urgency';
import { render, screen } from '@/utils/test/react';

const ctx = (overrides: Partial<Parameters<typeof ProductCardContextProvider>[0]['value']> = {}) => ({
    variant: 'vertical-boxed' as const,
    data: {} as any,
    selected: undefined,
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
            describe('ProductCardStockUrgency', () => {
                it('renders nothing when no variant is selected', () => {
                    render(
                        <ProductCardContextProvider value={ctx({ selected: undefined })}>
                            <ProductCardStockUrgency />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.queryByTestId('product-card-stock-urgency')).toBeNull();
                });

                it('renders nothing when quantityAvailable is nullish', () => {
                    render(
                        <ProductCardContextProvider
                            value={ctx({ selected: { quantityAvailable: null, availableForSale: true } as any })}
                        >
                            <ProductCardStockUrgency />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.queryByTestId('product-card-stock-urgency')).toBeNull();
                });

                it('renders nothing when stock is above threshold', () => {
                    render(
                        <ProductCardContextProvider
                            value={ctx({ selected: { quantityAvailable: 99, availableForSale: true } as any })}
                        >
                            <ProductCardStockUrgency />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.queryByTestId('product-card-stock-urgency')).toBeNull();
                });

                it('renders "Only N left" when quantity is below threshold', () => {
                    render(
                        <ProductCardContextProvider
                            value={ctx({ selected: { quantityAvailable: 3, availableForSale: true } as any })}
                        >
                            <ProductCardStockUrgency threshold={5} />
                        </ProductCardContextProvider>,
                    );
                    expect(screen.getByTestId('product-card-stock-urgency')).toHaveTextContent(/only\s*3\s*left/i);
                });
            });
        });
    });
});
