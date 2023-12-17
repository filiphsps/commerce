import ProductCardImage from '@/components/ProductCard/product-card-image';
import { render } from '@/utils/test/react';
import { describe, expect, it, vi } from 'vitest';

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
                    useShop: vi.fn().mockReturnValue({})
                };
            });

            it('renders without crashing when no image is supplied', () => {
                expect(() => render(<ProductCardImage />)).not.toThrow();
            });
        });
    });
});
