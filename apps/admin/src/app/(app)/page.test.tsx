import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns (must be declared before vi.mock calls)
// ------------------------------------------------------------------

const { mockRedirect, mockAuth, mockCurrentUser, mockGetChooserOrgs } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockAuth: vi.fn(),
    mockCurrentUser: vi.fn(),
    mockGetChooserOrgs: vi.fn(),
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

vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth, currentUser: mockCurrentUser }));
vi.mock('@clerk/nextjs', () => ({
    UserButton: () => <div data-testid="user-button" />,
}));
vi.mock('@/lib/orgs-convex', () => ({ getChooserOrgs: mockGetChooserOrgs }));

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

vi.mock('lucide-react', () => ({
    Building2: () => <svg />,
    ChevronRight: () => <svg />,
    Plus: () => <svg />,
    Store: () => <svg />,
}));

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import Overview from './page';

describe('app/page (org×storefront chooser)', () => {
    const CLERK_USER = {
        firstName: 'Alice',
        fullName: 'Alice Smith',
        primaryEmailAddress: { emailAddress: 'alice@example.com' },
    };

    beforeEach(() => {
        mockAuth.mockReset();
        mockCurrentUser.mockReset();
        mockGetChooserOrgs.mockReset();
        mockRedirect.mockClear();

        mockAuth.mockResolvedValue({ userId: 'user_clerk_1' });
        mockCurrentUser.mockResolvedValue(CLERK_USER);
        mockGetChooserOrgs.mockResolvedValue([]);
    });

    it('is an async function (server component)', () => {
        expect(typeof Overview).toBe('function');
    });

    it('redirects to /auth/sign-in/ when unauthenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        await expect(Overview()).rejects.toThrow('NEXT_REDIRECT:/auth/sign-in/');
    });

    it('redirects to /auth/sign-in/ when the Clerk user has no primary email', async () => {
        mockCurrentUser.mockResolvedValue({ primaryEmailAddress: null });
        await expect(Overview()).rejects.toThrow('NEXT_REDIRECT:/auth/sign-in/');
    });

    it('renders a greeting with the user first name when authenticated', async () => {
        const { container } = await renderRSC(() => Overview());
        const q = within(container as HTMLElement);

        expect(q.getByTestId('accented')).toHaveTextContent('Alice');
    });

    it('renders the empty state when the operator has no orgs', async () => {
        const { container } = await renderRSC(() => Overview());
        const q = within(container as HTMLElement);

        expect(q.getByText(/No storefronts yet — create your first one\./i)).toBeInTheDocument();
    });

    it('renders each org group with its shop cards', async () => {
        mockGetChooserOrgs.mockResolvedValue([
            {
                clerkOrgId: 'org_a',
                name: 'Acme Org',
                imageUrl: null,
                shops: [
                    { name: 'Shop A', domain: 'shop-a.example.com' },
                    { name: 'Shop B', domain: 'shop-b.example.com' },
                ],
            },
        ]);

        const { container } = await renderRSC(() => Overview());
        const q = within(container as HTMLElement);

        expect(q.getByText('Acme Org')).toBeInTheDocument();
        expect(q.getByText('Shop A')).toBeInTheDocument();
        expect(q.getByText('Shop B')).toBeInTheDocument();
    });

    it('exports metadata with title "Choose a storefront"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Choose a storefront');
    });
});
