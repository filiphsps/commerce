import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks — declared before any dynamic imports so Vitest hoists them.
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

const mockRedirect = vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
    notFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

// Auth mock — defaults to unauthenticated; tests override per-case.
const mockAuth = vi.fn();
vi.mock('@/auth', () => ({ auth: mockAuth }));

// DB mock.
const mockFindByDomain = vi.fn();
vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

// UI components don't need to render for these server-component tests.
vi.mock('@nordcom/nordstar', () => ({
    Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    Card: Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, {
        Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        Divider: () => <hr />,
    }),
    Input: ({ label }: { label: string }) => <input aria-label={label} />,
    Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

import React from 'react';

describe('(dashboard)/[domain]/reviews/new/page', () => {
    const validParams = Promise.resolve({ domain: 'example.myshopify.com' });
    const mockShop = { domain: 'example.myshopify.com', name: 'Test Shop' };

    it('is an async function (server component)', async () => {
        const { default: Page } = await import('./page');
        expect(typeof Page).toBe('function');
    });

    it('redirects to /auth/login/ when there is no session', async () => {
        mockAuth.mockResolvedValue(null);
        const { default: Page } = await import('./page');

        await expect(Page({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
        expect(mockRedirect).toHaveBeenCalledWith('/auth/login/');
    });

    it('redirects to /auth/login/ when session has no user', async () => {
        mockAuth.mockResolvedValue({ user: null });
        const { default: Page } = await import('./page');

        await expect(Page({ params: validParams })).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders when authenticated with a valid session', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        const { default: Page } = await import('./page');
        const result = await Page({ params: validParams });

        // Should return a React element (not throw / redirect).
        expect(result).not.toBeNull();
        expect(typeof result).toBe('object');
    });

    it('fetches the shop by the domain from route params when authenticated', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com' } });
        mockFindByDomain.mockResolvedValue(mockShop);

        const { default: Page } = await import('./page');
        await Page({ params: validParams });

        expect(mockFindByDomain).toHaveBeenCalledWith('example.myshopify.com');
    });

    it('exports metadata with title "New Review"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('New Review');
    });
});
