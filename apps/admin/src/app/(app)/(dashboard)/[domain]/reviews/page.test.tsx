import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockNotFound, mockFindByShop } = vi.hoisted(() => ({
    mockGetAuthedCmsCtx: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockFindByShop: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
}));

vi.mock('@/lib/cms-ctx', () => ({
    getAuthedCmsCtx: mockGetAuthedCmsCtx,
}));

vi.mock('@nordcom/commerce-db', () => ({
    Review: { findByShop: mockFindByShop },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import ReviewsPage from './page';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeCtx(
    tenant: { id: string; slug: string; name: string } | null = { id: 't1', slug: 'shop-public-1', name: 'Acme' },
) {
    return {
        user: {
            id: 'user-1',
            email: 'op@example.com',
            role: 'admin' as const,
            tenants: [],
            collection: 'users' as const,
        },
        tenant,
        session: { user: { email: 'op@example.com' }, expires: '2099-01-01' },
    };
}

describe('(dashboard)/[domain]/reviews/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockNotFound.mockClear();
        mockFindByShop.mockReset();
    });

    it('is an async function (server component)', () => {
        expect(typeof ReviewsPage).toBe('function');
    });

    it('calls notFound when there is no tenant', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(null));

        await expect(ReviewsPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
        expect(mockFindByShop).not.toHaveBeenCalled();
    });

    it('reads reviews by the tenant public shop id with a count of 100', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockFindByShop.mockResolvedValue([]);

        await renderRSC(() => ReviewsPage({ params: validParams }));

        expect(mockFindByShop).toHaveBeenCalledWith('shop-public-1', { count: 100 });
    });

    it('renders the zero-review copy and no list when empty', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockFindByShop.mockResolvedValue([]);

        const { container } = await renderRSC(() => ReviewsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText(/0 reviews for acme\.myshopify\.com/)).toBeInTheDocument();
        expect((container as HTMLElement).querySelector('ul')).toBeNull();
    });

    it('renders the singular copy for exactly one review', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockFindByShop.mockResolvedValue([{ id: 'r1', updatedAt: 1_700_000_000_000 }]);

        const { container } = await renderRSC(() => ReviewsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText(/1 review for acme\.myshopify\.com/)).toBeInTheDocument();
        // Singular, not the plural "reviews".
        expect(q.queryByText(/1 reviews for/)).not.toBeInTheDocument();
    });

    it('renders the plural copy and a list row per review', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockFindByShop.mockResolvedValue([
            { id: 'r1', updatedAt: 1_700_000_000_000 },
            { id: 'r2', updatedAt: 1_700_000_100_000 },
        ]);

        const { container } = await renderRSC(() => ReviewsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText(/2 reviews for acme\.myshopify\.com/)).toBeInTheDocument();
        expect(q.getByText('r1')).toBeInTheDocument();
        expect(q.getByText('r2')).toBeInTheDocument();
        expect((container as HTMLElement).querySelectorAll('li')).toHaveLength(2);
    });

    it('exports metadata with title "Reviews"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Reviews');
    });
});
