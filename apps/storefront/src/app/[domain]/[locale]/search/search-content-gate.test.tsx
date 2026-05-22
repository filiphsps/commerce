import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/flags/definitions', () => ({
    searchFilter: vi.fn(),
}));

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

import { searchFilter } from '@/utils/flags/definitions';
import { render, screen } from '@/utils/test/react';
import SearchContentGate from './search-content-gate';

const shop = { id: 'shop-1', domain: 'shop.example.com' } as never;
const locale = { code: 'en-US' } as never;
const i18n = {} as never;
const data = { products: [], productFilters: [] };

describe('SearchContentGate', () => {
    it('passes showFilters=true to SearchContent when searchFilter resolves true', async () => {
        vi.mocked(searchFilter).mockResolvedValueOnce(true);
        const ui = await SearchContentGate({ shop, locale, i18n, data });
        render(ui as never);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=true');
        expect(searchFilter).toHaveBeenCalledTimes(1);
    });

    it('passes showFilters=false when searchFilter resolves false', async () => {
        vi.mocked(searchFilter).mockResolvedValueOnce(false);
        const ui = await SearchContentGate({ shop, locale, i18n, data });
        render(ui as never);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=false');
    });
});
