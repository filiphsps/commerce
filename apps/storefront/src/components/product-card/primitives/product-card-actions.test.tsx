import { describe, expect, it, vi } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import * as ProductOptions from '@/components/product-options';
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

const renderWithOptions = (children: React.ReactNode) => {
    const product = productSimple();
    return render(
        <ProductOptions.Root product={product} initialSelection={{ Title: 'Default Title' }}>
            {children}
        </ProductOptions.Root>,
    );
};

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardActions', () => {
                it('renders full add-to-cart by default', () => {
                    renderWithOptions(<ProductCardActions i18n={{} as any} />);
                    const cta = screen.getByTestId('add-to-cart');
                    expect(cta).toBeInTheDocument();
                    expect(cta.className).toMatch(/w-full/);
                });

                it('renders icon-mode add-to-cart when mode="icon"', () => {
                    renderWithOptions(<ProductCardActions i18n={{} as any} mode="icon" />);
                    const cta = screen.getByTestId('add-to-cart');
                    expect(cta).toBeInTheDocument();
                    expect(cta.className).toMatch(/rounded-full/);
                });
            });
        });
    });
});
