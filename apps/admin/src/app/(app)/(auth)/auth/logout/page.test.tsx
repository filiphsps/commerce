import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

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

vi.mock('lucide-react', () => ({
    Loader2: () => <svg data-testid="spinner" />,
}));

vi.mock('./logout-action', () => ({
    LogoutAction: () => <div data-testid="logout-action" />,
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import IndexAdminPage from './page';

describe('(auth)/auth/logout/page', () => {
    it('is an async function (server component)', () => {
        expect(typeof IndexAdminPage).toBe('function');
    });

    it('renders the "Signing out…" heading and the logout action', async () => {
        const { container } = await renderRSC(() => IndexAdminPage());
        const q = within(container as HTMLElement);

        expect(q.getByRole('heading', { level: 1 })).toHaveTextContent('Signing out…');
        expect(q.getByTestId('logout-action')).toBeInTheDocument();
    });

    it('shows an in-progress spinner and status copy', async () => {
        const { container } = await renderRSC(() => IndexAdminPage());
        const q = within(container as HTMLElement);

        expect(q.getByTestId('spinner')).toBeInTheDocument();
        expect(q.getByText(/signing you out/i)).toBeInTheDocument();
    });

    it('exports metadata with title "Logout"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Logout');
    });
});
