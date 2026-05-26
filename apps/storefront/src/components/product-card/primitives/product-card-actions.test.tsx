import { describe, expect, it, vi } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import * as ProductOptions from '@/components/product-options';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ lines: [], linesAdd: vi.fn(), linesUpdate: vi.fn() }),
    };
});

vi.mock('@/pages/_actions/cart', () => ({
    addToCartAction: vi.fn(),
    updateCartLineQuantityAction: vi.fn(),
    removeCartLineAction: vi.fn(),
}));

const i18n = { common: { 'add-to-cart': 'Add to cart' } } as any;

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
            describe('ProductCardActions (server)', () => {
                it('renders a <form> whose submit button is labeled "Add to cart" by default', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { container, getByRole } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="full" i18n={i18n} />,
                    );
                    expect(container.querySelector('form')).toBeTruthy();
                    expect(getByRole('button', { name: /add to cart/i })).toBeTruthy();
                });

                it('renders an icon-mode submit button when mode="icon"', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { container } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="icon" i18n={i18n} />,
                    );
                    expect(container.querySelector('button[data-mode="icon"]')).toBeTruthy();
                });

                it('emits hidden inputs carrying the selected variant id and quantity', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { container } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="full" i18n={i18n} />,
                    );
                    expect(container.querySelector('input[name="variantId"]')).toBeTruthy();
                    expect(container.querySelector('input[name="quantity"]')).toBeTruthy();
                });
            });
        });
    });
});
