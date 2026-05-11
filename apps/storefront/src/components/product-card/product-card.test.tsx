import { describe, expect, it, vi } from 'vitest';
import ProductCard from '@/components/product-card/product-card';
import { render } from '@/utils/test/react';
import { mockProduct, mockShop } from '@/utils/test/fixtures';

vi.mock('@/utils/dictionary', () => ({
    getDictionary: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/product-card/product-card-badges', () => ({
    default: () => null,
}));

vi.mock('@/components/product-card/product-card-content', () => ({
    default: () => <div data-testid="product-card-content" />,
}));

vi.mock('@/components/product-card/product-card-title', () => ({
    default: () => <div data-testid="product-card-title" />,
}));

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCard', () => {
            it('is an async function (RSC)', () => {
                // ProductCard is an async RSC — we verify it is a function
                expect(typeof ProductCard).toBe('function');
            });

            it('renders null when no product is provided', async () => {
                const shop = mockShop();
                const locale = { code: 'en-US' } as any;
                const result = await ProductCard({ shop, locale });
                expect(result).toBeNull();
            });

            it('renders a card wrapper when product is provided', async () => {
                const shop = mockShop();
                const locale = { code: 'en-US' } as any;
                const product = mockProduct({
                    variants: {
                        edges: [
                            {
                                node: {
                                    id: 'gid://shopify/ProductVariant/1',
                                    availableForSale: true,
                                    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                                    price: { amount: '10.00', currencyCode: 'USD' },
                                    compareAtPrice: null,
                                },
                            },
                        ],
                        pageInfo: {},
                    },
                    tags: [],
                }) as any;

                const jsx = await ProductCard({ shop, locale, data: product });
                const { container } = render(jsx as any);
                expect(container.firstChild).toBeTruthy();
            });
        });
    });
});
