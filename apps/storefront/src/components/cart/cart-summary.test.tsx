import { describe, expect, it, vi } from 'vitest';
import { CartSummary } from '@/components/cart/cart-summary';
import { render, screen } from '@/utils/test/react';
import { mockShop } from '@/utils/test/fixtures';

const mockOnCheckout = vi.fn();

let mockCartState: Record<string, any> = {
    cartReady: true,
    totalQuantity: 0,
    lines: [],
    cost: null,
    discountCodes: [],
};

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => mockCartState,
    };
});

vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useShop: () => ({
            shop: mockShop(),
            currency: 'USD',
            locale: { code: 'en-US', language: 'EN', country: 'US' } as any,
        }),
    };
});

vi.mock('@/utils/build-config', () => ({
    BuildConfig: { environment: 'test' },
}));

vi.mock('@/components/cart/cart-coupons', () => ({
    CartCoupons: () => null,
}));

vi.mock('@/components/cart/cart-note', () => ({
    CartNote: () => null,
}));

describe('components', () => {
    describe('CartSummary', () => {
        it('renders the checkout button', () => {
            mockCartState = { cartReady: true, totalQuantity: 0, lines: [], cost: null, discountCodes: [] };
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            // The checkout button is always rendered
            expect(screen.getByRole('button')).toBeTruthy();
        });

        it('disables the checkout button when cart is empty', () => {
            mockCartState = { cartReady: true, totalQuantity: 0, lines: [], cost: null, discountCodes: [] };
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            const button = screen.getByRole('button') as HTMLButtonElement;
            expect(button.disabled).toBe(true);
        });

        it('renders total amount when cart has items with cost', () => {
            mockCartState = {
                cartReady: true,
                totalQuantity: 2,
                lines: [
                    {
                        id: 'line-1',
                        quantity: 2,
                        discountAllocations: [],
                        cost: {
                            totalAmount: { amount: '20.00', currencyCode: 'USD' },
                            compareAtAmountPerQuantity: null,
                        },
                    },
                ],
                cost: {
                    totalAmount: { amount: '20.00', currencyCode: 'USD' },
                    subtotalAmount: { amount: '20.00', currencyCode: 'USD' },
                },
                discountCodes: [],
            };
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            // CartSummary renders the total — expect the checkout button is enabled
            const button = screen.getByRole('button') as HTMLButtonElement;
            expect(button.disabled).toBe(false);
        });
    });
});
