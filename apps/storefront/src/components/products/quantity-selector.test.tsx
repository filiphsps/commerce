import { describe, expect, it, vi } from 'vitest';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { fireEvent, render, screen, waitFor } from '@/utils/test/react';

vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useShop: () => ({
            shop: {
                commerce: { maxQuantity: 50 },
                commerceProvider: { type: 'shopify', domain: 'mock.shop' },
            } as any,
            currency: 'USD',
            locale: { code: 'en-US', language: 'EN', country: 'US' } as any,
        }),
    };
});

describe('components', () => {
    describe('QuantitySelector', () => {
        it('renders the quantity selector with initial value', () => {
            render(<QuantitySelector i18n={{} as any} update={() => {}} value={3} />);

            const quantityInput = screen.getByLabelText('quantity');
            expect(quantityInput).toHaveValue(3);
        });

        it('updates the quantity when input value changes', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={0} />);

            const quantityInput = screen.getByTestId('quantity-input');

            // Use fireEvent to simulate user event
            fireEvent.change(quantityInput, { target: { value: '5' } });
            fireEvent.blur(quantityInput);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(5);
            });
        });

        it('clamps input to shop.commerce.maxQuantity when present', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={0} />);

            const quantityInput = screen.getByTestId('quantity-input');
            fireEvent.change(quantityInput, { target: { value: '999999' } });
            fireEvent.blur(quantityInput);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(50);
            });
        });

        it.skip('decreases the quantity when decrease button is clicked', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={3} />);

            const decreaseButton = screen.getByTestId('quantity-decrease');
            fireEvent.click(decreaseButton);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(2);
            });
        });

        it.skip('increases the quantity when increase button is clicked', async () => {
            const updateMock = vi.fn();
            render(<QuantitySelector i18n={{} as any} update={updateMock} value={3} />);

            const increaseButton = screen.getByTestId('quantity-increase');
            fireEvent.click(increaseButton);

            await waitFor(() => {
                expect(updateMock).toHaveBeenCalledWith(4);
            });
        });
    });
});
