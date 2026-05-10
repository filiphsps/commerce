import { describe, expect, it, vi } from 'vitest';
import AddToCart from '@/components/products/add-to-cart';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useProduct: vi.fn().mockReturnValue({
            selectedVariant: {
                availableForSale: true,
            },
        }),
        useCart: vi.fn().mockReturnValue({
            status: 'idle',
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

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
});
