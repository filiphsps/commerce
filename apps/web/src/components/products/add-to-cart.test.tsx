import AddToCart from '@/components/products/add-to-cart';
import { render } from '@/utils/test/react';
import { describe, expect, it, vi } from 'vitest';

describe('components', () => {
    describe('AddToCart', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useProduct: vi.fn().mockReturnValue({
                    selectedVariant: {
                        availableForSale: true
                    }
                }),
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({})
            };
        });

        it('should render with normal quantity', () => {
            const props = {
                locale: {
                    locale: 'en-US',
                    country: 'US',
                    language: 'EN'
                },
                i18n: {},
                quantity: 1
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with zero quantity', () => {
            const props = {
                locale: {
                    locale: 'en-US',
                    country: 'US',
                    language: 'EN'
                },
                i18n: {},
                quantity: 0
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with negative quantity', () => {
            const props = {
                locale: {
                    locale: 'en-US',
                    country: 'US',
                    language: 'EN'
                },
                i18n: {},
                quantity: -5
            } as any;
            const wrapper = render(<AddToCart {...props} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
