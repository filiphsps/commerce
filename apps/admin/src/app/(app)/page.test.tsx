import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns (must be declared before vi.mock calls)
// ------------------------------------------------------------------

const { mockRedirect, mockAuth, mockGetShopsForUser } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockAuth: vi.fn(),
    mockGetShopsForUser: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
    notFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('@/utils/fetchers', () => ({ getShopsForUser: mockGetShopsForUser }));

vi.mock('next/image', () => ({
    // biome-ignore lint/performance/noImgElement: test mock for next/image
    default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@nordcom/nordstar', () => ({
    Accented: ({ children }: { children: React.ReactNode }) => <span data-testid="accented">{children}</span>,
    Button: ({ children, title }: { children: React.ReactNode; title?: string }) => (
        <button type="button" aria-label={title}>
            {children}
        </button>
    ),
    Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock('lucide-react', () => ({ Settings: () => <svg /> }));

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import Overview from './page';

describe('app/page (root Overview)', () => {
    const mockUser = { id: 'u1', name: 'Alice Smith', email: 'alice@example.com' };

    beforeEach(() => {
        mockAuth.mockReset();
        mockGetShopsForUser.mockReset();
        mockRedirect.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof Overview).toBe('function');
    });

    it('redirects to /auth/login/ when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(Overview()).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('redirects to /auth/login/ when session has no user', async () => {
        mockAuth.mockResolvedValue({ user: undefined });
        await expect(Overview()).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders a greeting with the user first name when authenticated', async () => {
        mockAuth.mockResolvedValue({ user: mockUser });
        mockGetShopsForUser.mockResolvedValue([]);

        const { container } = await renderRSC(() => Overview());
        const q = within(container as HTMLElement);

        // The page renders "Hi <Accented>Alice</Accented> Smith" — find the Accented span.
        expect(q.getByTestId('accented')).toHaveTextContent('Alice');
    });

    it('renders shop buttons for each shop returned by getShopsForUser', async () => {
        mockAuth.mockResolvedValue({ user: mockUser });
        mockGetShopsForUser.mockResolvedValue([
            { id: 's1', domain: 'shop-a.myshopify.com', name: 'Shop A' },
            { id: 's2', domain: 'shop-b.myshopify.com', name: 'Shop B' },
        ]);

        const { container } = await renderRSC(() => Overview());
        const q = within(container as HTMLElement);

        expect(q.getByText('Shop A')).toBeInTheDocument();
        expect(q.getByText('Shop B')).toBeInTheDocument();
    });

    it('fetches shops using the authenticated user id', async () => {
        mockAuth.mockResolvedValue({ user: mockUser });
        mockGetShopsForUser.mockResolvedValue([]);

        await renderRSC(() => Overview());

        expect(mockGetShopsForUser).toHaveBeenCalledWith('u1');
    });

    it('exports metadata with title "Your Shops"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Your Shops');
    });
});
