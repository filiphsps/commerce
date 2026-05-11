import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks — use vi.hoisted so the variable is available at hoist-time.
// ------------------------------------------------------------------

const { mockSignOut } = vi.hoisted(() => ({ mockSignOut: vi.fn() }));

vi.mock('next-auth/react', () => ({
    signOut: mockSignOut,
    SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ------------------------------------------------------------------
// Note: LogoutAction is a 'use client' component, not a 'use server'
// server action. It calls next-auth/react's `signOut` inside useEffect.
// We test:
//   1. The component renders without errors (no-crash smoke test).
//   2. signOut() is invoked with the expected callbackUrl on mount.
// ------------------------------------------------------------------

import React from 'react';
import { LogoutAction } from './logout-action';

describe('(auth)/auth/logout/logout-action', () => {
    afterEach(() => {
        cleanup();
        mockSignOut.mockReset();
    });

    it('is a function (React component)', () => {
        expect(typeof LogoutAction).toBe('function');
    });

    it('renders without throwing', () => {
        expect(() => render(<LogoutAction />)).not.toThrow();
    });

    it('calls signOut with callbackUrl "/" on mount', async () => {
        render(<LogoutAction />);

        // useEffect runs after render; wait for it.
        await vi.waitFor(() => {
            expect(mockSignOut).toHaveBeenCalledTimes(1);
        });

        expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });

    it('returns null from render (no visible UI output)', () => {
        const { container } = render(<LogoutAction />);
        expect(container.firstChild).toBeNull();
    });
});
