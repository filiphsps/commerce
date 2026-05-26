import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartSummary } from '@/components/cart/cart-summary';
import { useCartCost, useCartCount, useCartLines, useCartMeta, useCartStatus } from '@/components/cart/provider';
import { mockShop } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';

const mockOnCheckout = vi.fn();

vi.mock('@/components/cart/provider', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        useCartCost: vi.fn(),
        useCartCount: vi.fn(),
        useCartLines: vi.fn(),
        useCartMeta: vi.fn(),
        useCartStatus: vi.fn(),
        useMaybeCart: vi.fn().mockReturnValue(null),
    };
});

type SetStateInput = {
    cartReady?: boolean;
    status?: 'idle' | 'loading' | 'mutating' | 'error';
    totalQuantity?: number;
    lines?: any[];
    subtotal?: { amount: string; currencyCode: string } | null;
    total?: { amount: string; currencyCode: string } | null;
    discountCodes?: Array<{ code: string; applicable: boolean }>;
};

const setState = ({
    cartReady = true,
    status = 'idle',
    totalQuantity = 0,
    lines = [],
    subtotal = null,
    total = null,
    discountCodes = [],
}: SetStateInput) => {
    vi.mocked(useCartStatus).mockReturnValue({ status, cartReady, error: null });
    vi.mocked(useCartCount).mockReturnValue(totalQuantity);
    vi.mocked(useCartLines).mockReturnValue({ lines, cartId: lines.length > 0 ? 'cart-id' : null });
    vi.mocked(useCartCost).mockReturnValue({ subtotal, total, tax: null, shipping: null, stale: false });
    vi.mocked(useCartMeta).mockReturnValue({
        discountCodes,
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        checkoutUrl: null,
    });
};

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

const lineWithCompareAt = {
    id: 'line-1',
    quantity: 1,
    merchandise: {
        compareAtUnitPrice: { amount: '20', currencyCode: 'USD' },
        unitPrice: { amount: '10', currencyCode: 'USD' },
        selectedOptions: [],
    },
    cost: {
        total: { amount: '10', currencyCode: 'USD' },
        subtotal: { amount: '10', currencyCode: 'USD' },
    },
    discountAllocations: [],
};

describe('components', () => {
    describe('CartSummary', () => {
        beforeEach(() => {
            setState({});
        });

        it('hides sale line while cart is mutating', () => {
            setState({
                cartReady: true,
                status: 'mutating',
                totalQuantity: 1,
                lines: [lineWithCompareAt],
                subtotal: { amount: '10', currencyCode: 'USD' },
                total: { amount: '10', currencyCode: 'USD' },
            });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            expect(screen.queryByTestId('cart-summary-sale')).toBeNull();
        });

        it('hides sale line while cart is loading', () => {
            setState({
                cartReady: true,
                status: 'loading',
                totalQuantity: 1,
                lines: [lineWithCompareAt],
                subtotal: { amount: '10', currencyCode: 'USD' },
                total: { amount: '10', currencyCode: 'USD' },
            });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            expect(screen.queryByTestId('cart-summary-sale')).toBeNull();
        });

        it('shows sale line when cart is idle', () => {
            setState({
                cartReady: true,
                status: 'idle',
                totalQuantity: 1,
                lines: [lineWithCompareAt],
                subtotal: { amount: '10', currencyCode: 'USD' },
                total: { amount: '10', currencyCode: 'USD' },
            });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            const saleRow = screen.queryByTestId('cart-summary-sale');
            expect(saleRow).not.toBeNull();
            expect(saleRow?.textContent).toMatch(/10/);
        });

        it('renders the checkout button', () => {
            setState({ cartReady: true, totalQuantity: 0, lines: [] });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            expect(screen.getByRole('button')).toBeTruthy();
        });

        it('disables the checkout button when cart is empty', () => {
            setState({ cartReady: true, totalQuantity: 0, lines: [] });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            const button = screen.getByRole('button') as HTMLButtonElement;
            expect(button.disabled).toBe(true);
        });

        it('renders total amount when cart has items with cost', () => {
            setState({
                cartReady: true,
                totalQuantity: 2,
                lines: [
                    {
                        id: 'line-1',
                        quantity: 2,
                        merchandise: {
                            unitPrice: { amount: '10', currencyCode: 'USD' },
                            compareAtUnitPrice: null,
                            selectedOptions: [],
                        },
                        cost: {
                            total: { amount: '20.00', currencyCode: 'USD' },
                            subtotal: { amount: '20.00', currencyCode: 'USD' },
                        },
                        discountAllocations: [],
                    },
                ],
                subtotal: { amount: '20.00', currencyCode: 'USD' },
                total: { amount: '20.00', currencyCode: 'USD' },
            });
            render(<CartSummary shop={mockShop()} onCheckout={mockOnCheckout} i18n={{} as any} />);
            const button = screen.getByRole('button') as HTMLButtonElement;
            expect(button.disabled).toBe(false);
        });
    });
});
