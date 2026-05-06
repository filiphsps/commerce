import { describe, expect, it, vi } from 'vitest';
import ProductCardHeader from '@/components/product-card/product-card-header';
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
    describe('product-card', () => {
        describe('ProductCardHeader', () => {
            it('renders without crashing when no image is supplied', () => {
                expect(() => render(<ProductCardHeader />)).not.toThrow();
            });
        });
    });
});
