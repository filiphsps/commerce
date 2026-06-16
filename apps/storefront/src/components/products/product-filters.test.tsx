import { describe, expect, it, vi } from 'vitest';
import { ProductFilters } from '@/components/products/product-filters';
import { render, screen } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en-US/products',
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const i18n = {
    common: {
        filters: 'Filters',
        sort: 'Sort',
        'sort-best-selling': 'Best selling',
        'sort-newest': 'Newest',
        'sort-price': 'Price',
        'sort-alphabetical': 'Alphabetical',
    },
} as any;

describe('components', () => {
    describe('ProductFilters', () => {
        it('renders the toolbar controls with localized labels', () => {
            render(<ProductFilters filters={[]} i18n={i18n} />);

            // Sort control resolves its label and every option from the dictionary, not literals.
            expect(screen.getByRole('combobox', { name: 'Sort' })).toBeTruthy();
            expect(screen.getByRole('option', { name: 'Best selling' })).toBeTruthy();
            expect(screen.getByRole('option', { name: 'Alphabetical' })).toBeTruthy();
            // Filters trigger uses the localized label.
            expect(screen.getByRole('button', { name: /Filters/ })).toBeTruthy();
        });
    });
});
