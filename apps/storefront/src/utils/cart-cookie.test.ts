import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
};

vi.mock('next/headers', () => ({
    cookies: async () => mockCookieStore,
}));

import { clearCartIdCookie, getCartIdCookie, setCartIdCookie } from './cart-cookie';

describe('cart-cookie', () => {
    beforeEach(() => {
        mockCookieStore.get.mockReset();
        mockCookieStore.set.mockReset();
        mockCookieStore.delete.mockReset();
    });

    it('returns null when cookie missing', async () => {
        mockCookieStore.get.mockReturnValue(undefined);
        expect(await getCartIdCookie()).toBeNull();
    });

    it('returns null when cookie value is empty', async () => {
        mockCookieStore.get.mockReturnValue({ value: '' });
        expect(await getCartIdCookie()).toBeNull();
    });

    it('returns null when cookie value exceeds 512 chars', async () => {
        mockCookieStore.get.mockReturnValue({ value: 'x'.repeat(513) });
        expect(await getCartIdCookie()).toBeNull();
    });

    it('returns the cart id when valid', async () => {
        mockCookieStore.get.mockReturnValue({ value: 'gid://shopify/Cart/abc' });
        expect(await getCartIdCookie()).toBe('gid://shopify/Cart/abc');
    });

    it('sets cookie with HttpOnly, SameSite=lax, 180-day Max-Age', async () => {
        await setCartIdCookie('gid://shopify/Cart/abc');
        expect(mockCookieStore.set).toHaveBeenCalledWith(
            'nordcom-cart',
            'gid://shopify/Cart/abc',
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 180,
            }),
        );
    });

    it('clears cookie', async () => {
        await clearCartIdCookie();
        expect(mockCookieStore.delete).toHaveBeenCalledWith('nordcom-cart');
    });
});
