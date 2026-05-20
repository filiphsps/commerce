import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/flags/read', () => ({
    readFlag: vi.fn(),
}));

vi.mock('./search-content', () => ({
    default: ({ showFilters }: { showFilters?: boolean }) => (
        <div data-testid="search-content">showFilters={String(showFilters)}</div>
    ),
}));

import { readFlag } from '@/utils/flags/read';
import { render, screen } from '@/utils/test/react';
import SearchContentGate from './search-content-gate';

const shop = { id: 'shop-1', domain: 'shop.example.com' } as never;
const locale = { code: 'en-US' } as never;
const i18n = {} as never;
const data = { products: [], productFilters: [] };

describe('SearchContentGate', () => {
    it('passes showFilters=true to SearchContent when readFlag returns true', async () => {
        vi.mocked(readFlag).mockResolvedValueOnce(true);
        const ui = await SearchContentGate({ shop, locale, i18n, data });
        render(ui as never);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=true');
        expect(readFlag).toHaveBeenCalledWith(shop, 'search-filter', { codeDefaultValue: false });
    });

    it('passes showFilters=false to SearchContent when readFlag returns false', async () => {
        vi.mocked(readFlag).mockResolvedValueOnce(false);
        const ui = await SearchContentGate({ shop, locale, i18n, data });
        render(ui as never);
        expect(screen.getByTestId('search-content').textContent).toBe('showFilters=false');
    });
});
