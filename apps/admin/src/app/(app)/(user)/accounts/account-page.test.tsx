import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { getOwnAccount } = vi.hoisted(() => ({ getOwnAccount: vi.fn() }));

vi.mock('@clerk/nextjs/server', () => ({ auth: () => Promise.resolve({ userId: 'user_clerk_1' }) }));
vi.mock('@/lib/account-convex', () => ({ getOwnAccount }));
vi.mock('@/utils/gravatar', () => ({ gravatarUrl: () => 'https://www.gravatar.com/avatar/abc?d=mp&s=160' }));
vi.mock('./profile-form', () => ({
    ProfileForm: ({ initialName }: { initialName: string }) => <div data-testid="profile-form">{initialName}</div>,
}));
vi.mock('./theme-toggle', () => ({
    ThemeToggle: ({ initialTheme }: { initialTheme: string }) => <div data-testid="theme-toggle">{initialTheme}</div>,
}));

import AccountPage from './page';

describe('AccountPage', () => {
    it('renders every section from the account view', async () => {
        getOwnAccount.mockResolvedValue({
            name: 'Op Erator',
            email: 'op@example.com',
            emailVerified: 1_700_000_000_000,
            createdAt: 1_690_000_000_000,
            theme: 'dark',
            identities: [{ provider: 'github', identity: 'gh-1', createdAt: 1_690_000_000_000 }],
        });

        const ui = await AccountPage();
        const { getByTestId, getByText } = render(ui);

        expect(getByText('op@example.com')).toBeTruthy();
        expect(getByTestId('profile-form').textContent).toBe('Op Erator');
        expect(getByTestId('theme-toggle').textContent).toBe('dark');
        // Connected accounts + Gravatar helper copy.
        expect(getByText(/github/i)).toBeTruthy();
        expect(getByText(/gravatar/i)).toBeTruthy();
    });
});
