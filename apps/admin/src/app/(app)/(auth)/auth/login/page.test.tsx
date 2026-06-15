import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRedirect, mockAuth, mockUserFind, mockIsNotFound } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    mockAuth: vi.fn(),
    mockUserFind: vi.fn(),
    mockIsNotFound: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('@nordcom/commerce-db', () => ({ User: { find: mockUserFind } }));
vi.mock('@nordcom/commerce-errors', () => ({ Error: { isNotFound: mockIsNotFound } }));
vi.mock('@nordcom/nordstar', () => ({
    Accented: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
// Render the shell as a thin passthrough — its chrome is covered by auth-shell.test.tsx.
vi.mock('@/components/auth-shell', () => ({
    AuthShell: ({
        eyebrow,
        title,
        children,
    }: {
        eyebrow?: React.ReactNode;
        title: React.ReactNode;
        children: React.ReactNode;
    }) => (
        <main>
            <div>{eyebrow}</div>
            <h1>{title}</h1>
            {children}
        </main>
    ),
}));
vi.mock('@/components/login-button', () => ({
    default: () => <button type="button">Sign in with GitHub</button>,
}));

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import IndexAdminPage, { IndexAdminPageContent } from './page';

describe('login page recovery', () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockUserFind.mockReset();
        mockIsNotFound.mockReset();
        mockRedirect.mockClear();
    });

    it('redirects a provisioned session to the shop picker', async () => {
        mockAuth.mockResolvedValue({ user: { email: 'a@b.com' } });
        mockUserFind.mockResolvedValue({ id: 'u1' });
        await expect(IndexAdminPageContent()).rejects.toThrow('NEXT_REDIRECT:/');
    });

    it('shows the sign-in button when the session has no backing users doc (re-auth recovery)', async () => {
        mockAuth.mockResolvedValue({ user: { email: 'a@b.com' } });
        mockUserFind.mockRejectedValue(new Error('missing'));
        mockIsNotFound.mockReturnValue(true);
        const { container } = await renderRSC(() => IndexAdminPageContent());
        expect(
            within(container as HTMLElement).getByRole('button', { name: /sign in with github/i }),
        ).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('shows the sign-in button when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null);
        const { container } = await renderRSC(() => IndexAdminPageContent());
        expect(
            within(container as HTMLElement).getByRole('button', { name: /sign in with github/i }),
        ).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('surfaces the provider scope reassurance copy', async () => {
        mockAuth.mockResolvedValue(null);
        const { container } = await renderRSC(() => IndexAdminPageContent());
        expect(within(container as HTMLElement).getByText(/only read your public profile/i)).toBeInTheDocument();
    });
});

describe('login page chrome', () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockAuth.mockResolvedValue(null);
    });

    it('renders inside the AuthShell with a "Sign in" heading and welcome eyebrow', async () => {
        const { container } = await renderRSC(() => IndexAdminPage({ params: {} }));
        const q = within(container as HTMLElement);
        expect(q.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in');
        expect(q.getByText(/welcome/i)).toBeInTheDocument();
    });

    it('exports metadata with title "Login"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Login');
    });
});
