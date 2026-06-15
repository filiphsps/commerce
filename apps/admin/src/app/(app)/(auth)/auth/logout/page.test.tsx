import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('@nordcom/nordstar', () => ({
    Card: { Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
    Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
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

    it('renders the "Logging out..." heading and the logout action', async () => {
        const { container } = await renderRSC(() => IndexAdminPage({}));
        const q = within(container as HTMLElement);

        expect(q.getByText('Logging out...')).toBeInTheDocument();
        expect(q.getByTestId('logout-action')).toBeInTheDocument();
    });

    it('exports metadata with title "Logout"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Logout');
    });
});
