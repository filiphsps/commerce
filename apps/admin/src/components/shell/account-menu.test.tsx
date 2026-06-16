import { describe, expect, it, vi } from 'vitest';
import { AccountMenu } from '@/components/shell/account-menu';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { render, screen } from '@/utils/test/react';

// Clerk's <UserButton> reaches for the live session; stub it (and its compound parts) to passthrough
// renderers so the themed account control can be asserted without a real ClerkProvider. The Action's
// label is surfaced as text so the theme-toggle wiring stays observable.
vi.mock('@clerk/nextjs', () => {
    const UserButton = Object.assign(
        ({ children }: { children?: React.ReactNode }) => <div data-testid="user-button">{children}</div>,
        {
            MenuItems: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
            Action: ({ label, onClick }: { label: string; onClick?: () => void }) => (
                <button type="button" onClick={onClick}>
                    {label}
                </button>
            ),
        },
    );
    return { UserButton };
});

describe('AccountMenu', () => {
    it('renders the Clerk user button with a theme-toggle action', () => {
        render(
            <ThemeProvider initialPreference="dark">
                <AccountMenu />
            </ThemeProvider>,
        );
        expect(screen.getByTestId('user-button')).toBeInTheDocument();
        // From the 'dark' preference the toggle offers the 'system' switch.
        expect(screen.getByRole('button', { name: /Switch to system theme/i })).toBeInTheDocument();
    });
});
