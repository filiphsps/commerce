import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/product-card', () => {
    const ProductCard = () => <div data-testid="product-card" />;
    ProductCard.skeleton = () => <div data-testid="product-card-skeleton" />;
    return { default: ProductCard };
});

vi.mock('@/components/products/search-product-card', () => ({
    __esModule: true,
    default: ({ data }: { data: { handle: string } }) => (
        <article data-testid="product-card-root">{data.handle}</article>
    ),
}));

vi.mock('./search-content', () => ({
    default: ({ productCards }: { productCards: React.ReactNode[] }) => (
        <div data-testid="search-content">{productCards}</div>
    ),
}));

// The gate reads the tenant `search` singleton for its no-query landing; stub it so this regression
// test stays focused on result-card rendering without reaching Convex.
vi.mock('@/api/_loaders', () => ({ SearchApi: vi.fn().mockResolvedValue(null) }));

import { render, screen } from '@/utils/test/react';
import SearchContentGate from './search-content-gate';

const shop = { id: 'shop-1', domain: 'shop.example.com' } as never;
const locale = { code: 'en-US' } as never;
const i18n = {} as never;

describe('SearchContentGate — phase 1 regression', () => {
    it('renders one product-card-root per result returned by cachedSearch', async () => {
        const data = {
            products: [
                {
                    id: 'gid://shopify/Product/1',
                    handle: 'a',
                    variants: { edges: [{ node: { id: 'v1', availableForSale: true } }] },
                } as never,
                {
                    id: 'gid://shopify/Product/2',
                    handle: 'b',
                    variants: { edges: [{ node: { id: 'v2', availableForSale: true } }] },
                } as never,
                {
                    id: 'gid://shopify/Product/3',
                    handle: 'c',
                    variants: { edges: [{ node: { id: 'v3', availableForSale: true } }] },
                } as never,
            ],
            productFilters: [],
            totalCount: 3,
        };

        render(await SearchContentGate({ shop, locale, i18n, data, showFilters: false }));

        expect(screen.getAllByTestId('product-card-root')).toHaveLength(3);
    });
});
