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
    Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
    Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    Label: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/login-button', () => ({
    default: () => <button type="button">Sign in with GitHub</button>,
}));

import { within } from '@testing-library/react';
import type React from 'react';
import { renderRSC } from '@/utils/test/rsc';
import { IndexAdminPageContent } from './page';

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
        expect(within(container as HTMLElement).getByText(/sign in with github/i)).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('shows the sign-in button when unauthenticated', async () => {
        mockAuth.mockResolvedValue(null);
        const { container } = await renderRSC(() => IndexAdminPageContent());
        expect(within(container as HTMLElement).getByText(/sign in with github/i)).toBeInTheDocument();
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
