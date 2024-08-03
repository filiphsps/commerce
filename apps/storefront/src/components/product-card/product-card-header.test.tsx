import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import ProductCardHeader from '@/components/product-card/product-card-header';

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardHeader', () => {
            vi.mock('@shopify/hydrogen-react', async () => {
                return {
                    ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
                    useProduct: vi.fn().mockReturnValue({
                        selectedVariant: {
                            availableForSale: true
                        }
                    }),
                    useCart: vi.fn().mockReturnValue({
                        status: 'idle'
                    }),
                    useShop: vi.fn().mockReturnValue({}),
                    useShopifyCookies: vi.fn().mockReturnValue({})
                };
            });

            it('renders without crashing when no image is supplied', () => {
                expect(() => render(<ProductCardHeader shop={{} as any} />)).not.toThrow();
            });
        });
    });
});
