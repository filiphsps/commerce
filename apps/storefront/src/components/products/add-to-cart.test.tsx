import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddToCart from '@/components/products/add-to-cart';
import { render } from '@/utils/test/react';

const { mockLinesAdd } = vi.hoisted(() => ({ mockLinesAdd: vi.fn() }));

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useProduct: vi.fn().mockReturnValue({
            selectedVariant: {
                availableForSale: true,
            },
        }),
        useCart: vi.fn().mockReturnValue({
            status: 'idle',
            cartReady: true,
            linesAdd: mockLinesAdd,
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

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
    });

    describe('AddToCart cleanup', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('does not warn when unmounted before 3s animation finishes', () => {
            const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            const { unmount, getByRole } = render(<AddToCart {...baseProps} />);

            // Click add-to-cart to start the 3 s animation timer.
            act(() => {
                getByRole('button').click();
            });

            // Unmount before the timer fires.
            unmount();

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
