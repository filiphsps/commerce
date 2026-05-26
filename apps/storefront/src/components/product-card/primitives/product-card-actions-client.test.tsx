import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartActions, useCartLines, useCartStatus } from '@/components/cart/provider';
import ProductCardActionsClient from '@/components/product-card/primitives/product-card-actions-client';
import { ProductOptionsContext } from '@/components/product-options/context';
import type { ProductOptionsContextValue } from '@/components/product-options/types';
import { render } from '@/utils/test/react';

vi.mock('@/components/cart/provider', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useCartLines: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

const i18n = {
    common: { 'add-to-cart': 'Add to cart', decrease: 'Decrease', increase: 'Increase' },
} as any;

const product = { id: 'gid://shopify/Product/1', handle: 'p' } as any;

const buildCtx = (): ProductOptionsContextValue =>
    ({
        product,
        resolved: [],
        selection: {},
        selectVariant: () => {},
        selectedVariant: undefined,
        hoveredVariant: undefined,
        setHoveredVariant: () => {},
        renderers: {},
    }) as ProductOptionsContextValue;

const wrap = (props: any) =>
    render(
        <ProductOptionsContext.Provider value={buildCtx()}>
            <ProductCardActionsClient {...props} />
        </ProductOptionsContext.Provider>,
    );

const setMocks = ({
    lines = [],
    cartReady = true,
}: {
    lines?: Array<{ id: string; quantity: number; merchandise: { id: string } }>;
    cartReady?: boolean;
} = {}) => {
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
    vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', error: null, cartReady });
    vi.mocked(useCartLines).mockReturnValue({ lines: lines as any, cartId: cartReady ? 'cart-1' : null });
};

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardActionsClient', () => {
                beforeEach(() => {
                    setMocks();
                });

                it('renders the Add-to-cart button by default', () => {
                    const { getByRole } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                    });
                    expect(getByRole('button', { name: /add to cart/i })).toBeTruthy();
                });

                it('marks the icon-mode button with data-mode="icon"', () => {
                    const { container } = wrap({
                        product,
                        mode: 'icon',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                    });
                    expect(container.querySelector('button[data-mode="icon"]')).toBeTruthy();
                });

                it('renders a quantity stepper when a cart line matches the seed variant', () => {
                    setMocks({
                        lines: [
                            {
                                id: 'line-1',
                                quantity: 2,
                                merchandise: { id: 'gid://shopify/ProductVariant/1' },
                            },
                        ],
                    });
                    const { getByRole, container } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                    });
                    expect(getByRole('button', { name: /decrease/i })).toBeTruthy();
                    expect(getByRole('button', { name: /increase/i })).toBeTruthy();
                    expect(container.textContent).toContain('2');
                });

                it('disables the Add-to-cart button when cartReady is false', () => {
                    setMocks({ cartReady: false });
                    const { getByRole } = wrap({
                        product,
                        mode: 'full',
                        i18n,
                        seedVariantId: 'gid://shopify/ProductVariant/1',
                    });
                    expect((getByRole('button', { name: /add to cart/i }) as HTMLButtonElement).disabled).toBe(true);
                });
            });
        });
    });
});
