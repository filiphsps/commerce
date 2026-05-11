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
    Error: { isNotFound: (e: unknown) => e instanceof globalThis.Error && e.message === 'NOT_FOUND' },
}));

vi.mock('@nordcom/nordstar', () => ({
    Details: ({ label, children }: { label: string; children: React.ReactNode }) => (
        <details>
            <summary>{label}</summary>
            {children}
        </details>
    ),
    Heading: ({ children, level }: { children: React.ReactNode; level: string }) => {
        const Tag = level as 'h1' | 'h2' | 'h4';
        return <Tag>{children}</Tag>;
    },
}));

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import ShopPage from './page';

describe('(dashboard)/[domain]/page', () => {
    const mockShop = { id: 's1', name: 'Acme Store', domain: 'acme.myshopify.com' };
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockAuth.mockReset();
        mockFindByDomain.mockReset();
        mockRedirect.mockClear();
        mockNotFound.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof ShopPage).toBe('function');
    });

    it('redirects to /auth/login/ when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(ShopPage({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects to /auth/login/ when session has no user', async () => {
        mockAuth.mockResolvedValue({ user: undefined });
        await expect(ShopPage({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders the shop name as a heading when authenticated', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        const { container } = await renderRSC(() => ShopPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Acme Store')).toBeInTheDocument();
    });

    it('calls notFound when shop is not found', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        const notFoundErr = new Error('NOT_FOUND');
        mockFindByDomain.mockRejectedValue(notFoundErr);

        await expect(ShopPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('fetches shop using the domain from route params', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        await renderRSC(() => ShopPage({ params: validParams }));

        expect(mockFindByDomain).toHaveBeenCalledWith('acme.myshopify.com', { convert: true });
    });

    it('exports metadata with title "Home"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Home');
    });
});
