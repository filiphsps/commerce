import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesApi = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
};

vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => cookiesApi),
}));

import { httpOnlyCookieStorage } from '../src/cookie-storage';

describe('httpOnlyCookieStorage', () => {
    beforeEach(() => {
        cookiesApi.get.mockReset();
        cookiesApi.set.mockReset();
        cookiesApi.delete.mockReset();
    });

    it('get returns the cookie value when present and within length', async () => {
        cookiesApi.get.mockReturnValue({ value: 'gid://Cart/abc' });
        const storage = httpOnlyCookieStorage();
        expect(await storage.get()).toBe('gid://Cart/abc');
    });

    it('get returns null when value is empty or > 512 chars', async () => {
        cookiesApi.get.mockReturnValue({ value: '' });
        expect(await httpOnlyCookieStorage().get()).toBeNull();
        cookiesApi.get.mockReturnValue({ value: 'x'.repeat(513) });
        expect(await httpOnlyCookieStorage().get()).toBeNull();
    });

    it('get returns null when cookie is missing entirely', async () => {
        cookiesApi.get.mockReturnValue(undefined);
        expect(await httpOnlyCookieStorage().get()).toBeNull();
    });

    it('set writes httpOnly cookie with 180-day default maxAge', async () => {
        await httpOnlyCookieStorage().set('gid://Cart/new');
        expect(cookiesApi.set).toHaveBeenCalledWith(
            'nordcom-cart',
            'gid://Cart/new',
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 180,
            }),
        );
    });

    it('set passes overrides (name, sameSite, maxAge, domain) through', async () => {
        const storage = httpOnlyCookieStorage({
            name: 'custom-name',
            sameSite: 'strict',
            maxAge: 3600,
            domain: '.example.com',
            secure: true,
        });
        await storage.set('id-1');
        expect(cookiesApi.set).toHaveBeenCalledWith(
            'custom-name',
            'id-1',
            expect.objectContaining({
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 3600,
                domain: '.example.com',
                secure: true,
                path: '/',
            }),
        );
    });

    it('clear deletes the cookie', async () => {
        await httpOnlyCookieStorage().clear();
        expect(cookiesApi.delete).toHaveBeenCalledWith('nordcom-cart');
    });
});
