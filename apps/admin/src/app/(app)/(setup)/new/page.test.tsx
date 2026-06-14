import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/utils/test/react';

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockRedirect: vi.fn((url: string): never => {
        throw new RangeError(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('./wizard', () => ({ NewShopWizard: () => <div data-testid="wizard" /> }));

import SetupNewPage from './page';

describe('SetupNewPage', () => {
    it('redirects to login without a session', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(SetupNewPage()).rejects.toThrow('NEXT_REDIRECT:/auth/login/');
    });

    it('renders the wizard for an authenticated user', async () => {
        mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
        render(await SetupNewPage());
        expect(screen.getByTestId('wizard')).toBeTruthy();
    });
});
