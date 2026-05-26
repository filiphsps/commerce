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

import { render, screen } from '@/utils/test/react';
import SearchContentGate from './search-content-gate';

const shop = { id: 'shop-1', domain: 'shop.example.com' } as never;
const locale = { code: 'en-US' } as never;
const i18n = {} as never;
const data = { products: [], productFilters: [] };

describe('SearchContentGate', () => {
    it('forwards showFilters=true to SearchContent', () => {
        render(<SearchContentGate shop={shop} locale={locale} i18n={i18n} data={data} showFilters={true} />);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=true');
    });

    it('forwards showFilters=false to SearchContent', () => {
        render(<SearchContentGate shop={shop} locale={locale} i18n={i18n} data={data} showFilters={false} />);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=false');
    });
});
