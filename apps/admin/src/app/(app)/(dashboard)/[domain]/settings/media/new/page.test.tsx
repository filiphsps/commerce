import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockRedirect } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import NewMediaPage from './page';

describe('(dashboard)/[domain]/settings/media/new/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockRedirect.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof NewMediaPage).toBe('function');
    });

    it('always redirects to the tenant upload page', async () => {
        await expect(NewMediaPage({ params: validParams })).rejects.toThrow(
            'NEXT_REDIRECT:/acme.myshopify.com/settings/media/upload/',
        );
        expect(mockRedirect).toHaveBeenCalledWith('/acme.myshopify.com/settings/media/upload/');
    });
});
