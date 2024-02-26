import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import ProductCardImage from '@/components/product-card/product-card-image';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardImage', () => {
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
                    useShop: vi.fn().mockReturnValue({}),
                    useShopifyCookies: vi.fn().mockReturnValue({})
                };
            });

            it('renders without crashing when no image is supplied', () => {
                expect(() => render(<ProductCardImage shop={{} as any} />)).not.toThrow();
            });
        });
    });
});
