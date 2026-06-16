import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/product-card', () => {
    const ProductCard = () => <div data-testid="product-card" />;
    ProductCard.skeleton = () => <div data-testid="product-card-skeleton" />;
    return { default: ProductCard };
});

vi.mock('./search-content', () => ({
    default: ({ showFilters }: { showFilters?: boolean }) => (
        <div data-testid="search-content">showFilters={String(showFilters)}</div>
    ),
}));

// The gate reads the tenant `search` singleton for its no-query landing; stub it so the test never
// reaches Convex and falls back to the platform-default landing copy.
vi.mock('@/api/_loaders', () => ({ SearchApi: vi.fn().mockResolvedValue(null) }));

import { render, screen } from '@/utils/test/react';
import SearchContentGate from './search-content-gate';

const shop = { id: 'shop-1', domain: 'shop.example.com' } as never;
const locale = { code: 'en-US' } as never;
const i18n = {} as never;
const data = { products: [], productFilters: [] };

describe('SearchContentGate', () => {
    it('forwards showFilters=true to SearchContent', async () => {
        render(await SearchContentGate({ shop, locale, i18n, data, showFilters: true }));
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=true');
    });

    it('forwards showFilters=false to SearchContent', async () => {
        render(await SearchContentGate({ shop, locale, i18n, data, showFilters: false }));
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=false');
    });
});
