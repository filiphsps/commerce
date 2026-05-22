import { describe, expect, it, vi } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import { render, screen } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ lines: [], linesUpdate: vi.fn(), cartReady: true }),
    };
});

vi.mock('@/components/products/add-to-cart', () => ({
    default: ({ className, children }: any) => (
        <button type="button" data-testid="add-to-cart" className={className}>
            {children ?? 'Add to cart'}
        </button>
    ),
}));

vi.mock('@/components/products/quantity-selector', () => ({
    QuantitySelector: ({ value }: any) => <div data-testid="quantity-selector">{value}</div>,
}));

const ctx = (overrides: any = {}) => {
    const product = productSimple();
    return {
        variant: 'vertical-boxed' as const,
        data: product,
        selected: { id: 'v-1', availableForSale: true, price: { amount: '5.00', currencyCode: 'USD' } } as any,
        setSelected: vi.fn(),
        hoveredImage: undefined,
        setHoveredImage: vi.fn(),
        i18n: {} as any,
        locale: { code: 'en-US' } as any,
        priority: false,
        ...overrides,
    };
};

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardActions', () => {
                it('renders full add-to-cart by default', () => {
                    render(
                        <ProductCardContextProvider value={ctx()}>
                            <ProductCardActions />
                        </ProductCardContextProvider>,
                    );
                    const cta = screen.getByTestId('add-to-cart');
                    expect(cta).toBeInTheDocument();
                    expect(cta.className).toMatch(/w-full/);
                });

                it('renders icon-mode add-to-cart when mode="icon"', () => {
                    render(
                        <ProductCardContextProvider value={ctx()}>
                            <ProductCardActions mode="icon" />
                        </ProductCardContextProvider>,
                    );
                    const cta = screen.getByTestId('add-to-cart');
                    expect(cta).toBeInTheDocument();
                    expect(cta.className).toMatch(/rounded-full/);
                });
            });
        });
    });
});
