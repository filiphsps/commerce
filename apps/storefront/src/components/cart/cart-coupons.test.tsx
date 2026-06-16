import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { describe, expect, it, vi } from 'vitest';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', async (importOriginal) => {
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

const i18n = { cart: { 'active-discounts': 'Active discounts', 'remove-discount': 'Remove discount {0}' } } as any;

describe('components', () => {
    describe('CartCoupons', () => {
        it('renders nothing when cart is not ready', () => {
            setState({ cartReady: false, discountCodes: [{ applicable: true, code: 'SAVE10' }] });

            const { container } = render(<CartCoupons i18n={i18n} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders nothing when there are no discount codes', () => {
            setState({ cartReady: true, discountCodes: [] });

            const { container } = render(<CartCoupons i18n={i18n} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders active discount codes when cart is ready and codes exist', () => {
            setState({ cartReady: true, discountCodes: [{ applicable: true, code: 'SAVE10' }] });

            render(<CartCoupons i18n={i18n} />);
            expect(screen.getByText('SAVE10')).toBeTruthy();
        });

        it('labels each remove control with the interpolated, localized code', () => {
            setState({ cartReady: true, discountCodes: [{ applicable: true, code: 'SAVE10' }] });

            render(<CartCoupons i18n={i18n} />);
            expect(screen.getByRole('button', { name: 'Remove discount SAVE10' })).toBeTruthy();
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

            render(<CartCoupons i18n={i18n} />);

            const removeButtons = screen.getAllByTitle(/Remove discount/);
            fireEvent.click(removeButtons[0]!);

            expect(removeDiscountCode).toHaveBeenCalledWith('SAVE10');
        });
    });
});
