import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartActions, useCartLines, useCartStatus } from '@/components/cart/provider';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCardActions from '@/components/product-card/primitives/product-card-actions';
import * as ProductOptions from '@/components/product-options';
import { render } from '@/utils/test/react';

vi.mock('@/components/cart/provider', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useCartLines: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
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
                beforeEach(() => {
                    vi.mocked(useCartActions).mockReturnValue({
                        addLine: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        updateLine: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        removeLine: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        applyDiscountCode: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        removeDiscountCode: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        applyGiftCard: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        removeGiftCard: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        updateNote: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                        updateAttributes: vi.fn().mockResolvedValue({ ok: true, cart: {} }),
                    } as any);
                    vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', error: null, cartReady: true });
                    vi.mocked(useCartLines).mockReturnValue({ lines: [], cartId: 'cart-1' });
                });

                it('renders an Add-to-cart button by default', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { getByRole } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="full" i18n={i18n} />,
                    );
                    expect(getByRole('button', { name: /add to cart/i })).toBeTruthy();
                });

                it('renders an icon-mode button when mode="icon"', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { container } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="icon" i18n={i18n} />,
                    );
                    expect(container.querySelector('button[data-mode="icon"]')).toBeTruthy();
                });

                it('forwards the seed variant id to the client component', () => {
                    const product = productSimple();
                    const seed = product.variants!.edges![0]!.node;
                    const { getByRole } = renderWithOptions(
                        <ProductCardActions product={product} seedVariant={seed} mode="full" i18n={i18n} />,
                    );
                    expect(getByRole('button', { name: /add to cart/i })).toBeTruthy();
                });
            });
        });
    });
});
