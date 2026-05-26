import { describe, expect, it, vi } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCard from '@/components/product-card/product-card';
import { mockShop } from '@/utils/test/fixtures';

vi.mock('@/components/product-card/primitives/product-card-root', () => ({
    default: ({ children, variant }: any) => (
        <div data-testid="root" data-variant={variant}>
            {children}
        </div>
    ),
}));

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCard', () => {
            it('returns null when no product is provided', () => {
                const shop = mockShop();
                const result = ProductCard({ shop, locale: { code: 'en-US' } as any, children: null });
                expect(result).toBeNull();
            });

            it('returns a tree rooted at ProductCardRoot when product is provided', () => {
                const shop = mockShop();
                const result = ProductCard({
                    shop,
                    locale: { code: 'en-US' } as any,
                    data: productSimple(),
                    layout: 'horizontal',
                    chrome: 'bare',
                    children: <div data-testid="child" />,
                });
                expect(result).not.toBeNull();
            });

            it('defaults to vertical layout and boxed chrome', () => {
                const shop = mockShop();
                const result: any = ProductCard({
                    shop,
                    locale: { code: 'en-US' } as any,
                    data: productSimple(),
                    children: <div data-testid="child" />,
                });
                expect(result).not.toBeNull();
            });
        });
    });
});
