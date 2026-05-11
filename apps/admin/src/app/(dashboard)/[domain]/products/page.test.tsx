import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockRedirect, mockNotFound, mockAuth, mockFindByDomain } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockAuth: vi.fn(),
    mockFindByDomain: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
    notFound: mockNotFound,
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@nordcom/commerce-errors', () => ({
    Error: { isNotFound: (e: unknown) => (e instanceof globalThis.Error && e.message === 'NOT_FOUND') },
}));

vi.mock('@nordcom/nordstar', () => ({
    Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

import React from 'react';
import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import ShopProductsPage from './page';

describe('(dashboard)/[domain]/products/page', () => {
    const mockShop = { id: 's1', name: 'Acme Store', domain: 'acme.myshopify.com' };
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockAuth.mockReset();
        mockFindByDomain.mockReset();
        mockRedirect.mockClear();
        mockNotFound.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof ShopProductsPage).toBe('function');
    });

    it('redirects to /auth/login/ when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(ShopProductsPage({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects to /auth/login/ when session has no user', async () => {
        mockAuth.mockResolvedValue({ user: undefined });
        await expect(ShopProductsPage({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders the Products heading when authenticated', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        const { container } = await renderRSC(() => ShopProductsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Products')).toBeInTheDocument();
    });

    it('calls notFound when shop is not found', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        const notFoundErr = new Error('NOT_FOUND');
        mockFindByDomain.mockRejectedValue(notFoundErr);

        await expect(ShopProductsPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('fetches shop using the domain from route params', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        await renderRSC(() => ShopProductsPage({ params: validParams }));

        expect(mockFindByDomain).toHaveBeenCalledWith('acme.myshopify.com', { convert: true });
    });

    it('exports metadata with title "Products"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Products');
    });
});
