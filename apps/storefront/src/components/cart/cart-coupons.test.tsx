import { describe, expect, it, vi } from 'vitest';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { fireEvent, render, screen } from '@/utils/test/react';

const mockDiscountCodesUpdate = vi.fn();

let mockCartState: {
    cartReady: boolean;
    discountCodes: { applicable: boolean; code: string }[];
    discountCodesUpdate: typeof mockDiscountCodesUpdate;
} = {
    cartReady: true,
    discountCodes: [],
    discountCodesUpdate: mockDiscountCodesUpdate,
};

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => mockCartState,
    };
});

describe('components', () => {
    describe('CartCoupons', () => {
        it('renders nothing when cart is not ready', () => {
            mockCartState = {
                cartReady: false,
                discountCodes: [{ applicable: true, code: 'SAVE10' }],
                discountCodesUpdate: mockDiscountCodesUpdate,
            };

            const { container } = render(<CartCoupons />);
            expect(container.firstChild).toBeNull();
        });

        it('renders nothing when there are no discount codes', () => {
            mockCartState = {
                cartReady: true,
                discountCodes: [],
                discountCodesUpdate: mockDiscountCodesUpdate,
            };

            const { container } = render(<CartCoupons />);
            expect(container.firstChild).toBeNull();
        });

        it('renders active discount codes when cart is ready and codes exist', () => {
            mockCartState = {
                cartReady: true,
                discountCodes: [{ applicable: true, code: 'SAVE10' }],
                discountCodesUpdate: mockDiscountCodesUpdate,
            };

            render(<CartCoupons />);
            expect(screen.getByText('SAVE10')).toBeTruthy();
        });

        it('calls discountCodesUpdate without the removed code when the remove button is clicked', () => {
            mockDiscountCodesUpdate.mockClear();
            mockCartState = {
                cartReady: true,
                discountCodes: [
                    { applicable: true, code: 'SAVE10' },
                    { applicable: true, code: 'FREESHIP' },
                ],
                discountCodesUpdate: mockDiscountCodesUpdate,
            };

            render(<CartCoupons />);

            const removeButtons = screen.getAllByTitle(/Remove promo code/);
            fireEvent.click(removeButtons[0]!);

            expect(mockDiscountCodesUpdate).toHaveBeenCalledWith(['FREESHIP']);
        });
    });
});
