import { useCartActions, useCartStatus } from '@nordcom/cart-react';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddToCart from '@/components/products/add-to-cart';
import { render } from '@/utils/test/react';

vi.mock('@nordcom/cart-react', () => ({
    useCartActions: vi.fn(),
    useCartStatus: vi.fn(),
    useMaybeCart: vi.fn().mockReturnValue(null),
}));

const mockAddLine = vi.fn().mockResolvedValue({ ok: true, cart: {} });

const baseProps = {
    i18n: {},
    quantity: 1,
    data: {
        product: {
            id: 'gid://shopify/Product/1',
            title: 'Demo Product',
            vendor: 'Demo Vendor',
            productType: 'Demo',
            handle: 'demo-product',
        },
        selectedVariant: {
            id: 'gid://shopify/ProductVariant/1',
            availableForSale: true,
            title: 'Default',
            sku: 'SKU-1',
            price: { amount: '10.00', currencyCode: 'USD' },
        },
    },
} as any;

describe('components', () => {
    beforeEach(() => {
        mockAddLine.mockClear();
        mockAddLine.mockResolvedValue({ ok: true, cart: {} });
        vi.mocked(useCartActions).mockReturnValue({
            addLine: mockAddLine,
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
    });

    describe('AddToCart', () => {
        it('should render with normal quantity', () => {
            const props = {
                locale: {
                    code: 'en-US',
                    country: 'US',
                    language: 'EN',
                },
                i18n: {},
                quantity: 1,
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with zero quantity', () => {
            const props = {
                locale: {
                    code: 'en-US',
                    country: 'US',
                    language: 'EN',
                },
                i18n: {},
                quantity: 0,
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with negative quantity', () => {
            const props = {
                locale: {
                    code: 'en-US',
                    country: 'US',
                    language: 'EN',
                },
                i18n: {},
                quantity: -5,
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('calls addLine with variantId, quantity, and ProductSnapshot when clicked', async () => {
            const { getByRole } = render(<AddToCart {...baseProps} />);

            await act(async () => {
                getByRole('button').click();
            });

            expect(mockAddLine).toHaveBeenCalledWith(
                expect.objectContaining({
                    variantId: 'gid://shopify/ProductVariant/1',
                    quantity: 1,
                    snapshot: expect.objectContaining({
                        variantId: 'gid://shopify/ProductVariant/1',
                        productHandle: 'demo-product',
                        productTitle: 'Demo Product',
                        variantTitle: 'Default',
                        unitPrice: { amount: '10.00', currencyCode: 'USD' },
                    }),
                }),
            );
        });
    });

    describe('AddToCart cleanup', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('does not warn when unmounted before 3s animation finishes', async () => {
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            const { unmount, getByRole } = render(<AddToCart {...baseProps} />);

            // Click add-to-cart to start the 3 s animation timer.
            await act(async () => {
                getByRole('button').click();
            });

            // Unmount before the timer fires.
            act(() => {
                unmount();
            });

            // Advance past the timer — without cleanup this would attempt to call
            // setAnimating on an already-unmounted component and trigger a warning.
            act(() => {
                vi.advanceTimersByTime(5000);
            });

            const calls = consoleErr.mock.calls.filter((c) => String(c[0]).includes('unmounted component'));
            expect(calls).toHaveLength(0);

            consoleErr.mockRestore();
        });
    });
});
