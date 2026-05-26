import { describe, expect, it, vi } from 'vitest';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { useCartActions, useCartMeta, useCartStatus } from '@/components/cart/provider';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@/components/cart/provider', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
        ...actual,
        useCartActions: vi.fn(),
        useCartMeta: vi.fn(),
        useCartStatus: vi.fn(),
        useMaybeCart: vi.fn().mockReturnValue(null),
    };
});

const removeDiscountCode = vi.fn().mockResolvedValue({ ok: true, cart: {} });
const noopAction = vi.fn().mockResolvedValue({ ok: true, cart: {} });

const setState = ({
    cartReady,
    discountCodes,
}: {
    cartReady: boolean;
    discountCodes: { applicable: boolean; code: string }[];
}) => {
    vi.mocked(useCartActions).mockReturnValue({
        addLine: noopAction,
        updateLine: noopAction,
        removeLine: noopAction,
        applyDiscountCode: noopAction,
        removeDiscountCode,
        applyGiftCard: noopAction,
        removeGiftCard: noopAction,
        updateNote: noopAction,
        updateAttributes: noopAction,
    } as any);
    vi.mocked(useCartMeta).mockReturnValue({
        discountCodes,
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        checkoutUrl: null,
    });
    vi.mocked(useCartStatus).mockReturnValue({ status: 'idle', cartReady, error: null });
};

describe('components', () => {
    describe('CartCoupons', () => {
        it('renders nothing when cart is not ready', () => {
            setState({ cartReady: false, discountCodes: [{ applicable: true, code: 'SAVE10' }] });

            const { container } = render(<CartCoupons />);
            expect(container.firstChild).toBeNull();
        });

        it('renders nothing when there are no discount codes', () => {
            setState({ cartReady: true, discountCodes: [] });

            const { container } = render(<CartCoupons />);
            expect(container.firstChild).toBeNull();
        });

        it('renders active discount codes when cart is ready and codes exist', () => {
            setState({ cartReady: true, discountCodes: [{ applicable: true, code: 'SAVE10' }] });

            render(<CartCoupons />);
            expect(screen.getByText('SAVE10')).toBeTruthy();
        });

        it('calls removeDiscountCode with the removed code when the remove button is clicked', () => {
            removeDiscountCode.mockClear();
            setState({
                cartReady: true,
                discountCodes: [
                    { applicable: true, code: 'SAVE10' },
                    { applicable: true, code: 'FREESHIP' },
                ],
            });

            render(<CartCoupons />);

            const removeButtons = screen.getAllByTitle(/Remove promo code/);
            fireEvent.click(removeButtons[0]!);

            expect(removeDiscountCode).toHaveBeenCalledWith('SAVE10');
        });
    });
});
