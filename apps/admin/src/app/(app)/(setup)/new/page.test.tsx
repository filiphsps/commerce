import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/utils/test/react';

const { mockAuth, mockRedirect } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockRedirect: vi.fn((url: string): never => {
        throw new RangeError(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('server-only', () => ({}));
vi.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('./wizard', () => ({ NewShopWizard: () => <div data-testid="wizard" /> }));

import SetupNewPage from './page';

describe('SetupNewPage', () => {
    it('redirects to sign-in without a session', async () => {
        mockAuth.mockResolvedValue({ userId: null });
        await expect(SetupNewPage()).rejects.toThrow('NEXT_REDIRECT:/auth/sign-in/');
    });

    it('renders the wizard for an authenticated user', async () => {
        mockAuth.mockResolvedValue({ userId: 'user_1' });
        render(await SetupNewPage());
        expect(screen.getByTestId('wizard')).toBeTruthy();
    });
});
