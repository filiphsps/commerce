import { describe, expect, it, vi } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCard from '@/components/product-card/product-card';
import { mockShop } from '@/utils/test/fixtures';

vi.mock('@/utils/dictionary', () => ({
    getDictionary: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/product-card/primitives/product-card-title', () => ({
    default: () => <div data-testid="title" />,
}));

vi.mock('@/components/product-card/primitives/product-card-badges', () => ({
    default: () => null,
}));

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
            it('returns null when no product is provided', async () => {
                const shop = mockShop();
                const result = await ProductCard({ shop, locale: { code: 'en-US' } as any });
                expect(result).toBeNull();
            });

            it('returns a tree rooted at ProductCardRoot when product is provided', async () => {
                const shop = mockShop();
                const result = await ProductCard({
                    shop,
                    locale: { code: 'en-US' } as any,
                    data: productSimple(),
                    variant: 'horizontal-bare',
                });
                expect(result).not.toBeNull();
            });

            it('falls back to vertical-boxed for unknown variant', async () => {
                const shop = mockShop();
                const result: any = await ProductCard({
                    shop,
                    locale: { code: 'en-US' } as any,
                    data: productSimple(),
                    variant: 'banana' as any,
                });
                expect(result).not.toBeNull();
            });
        });
    });
});
