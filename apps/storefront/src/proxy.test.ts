import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/middleware/admin', () => ({
    admin: vi.fn(),
}));

vi.mock('@/middleware/storefront', () => ({
    storefront: vi.fn(),
}));

import { admin } from '@/middleware/admin';
import { storefront } from '@/middleware/storefront';
import proxy from './proxy';

describe('proxy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(admin).mockResolvedValue(NextResponse.next());
        vi.mocked(storefront).mockResolvedValue(NextResponse.next());
    });

    it('dispatches /admin/... to admin() and not storefront()', async () => {
        const req = new NextRequest('http://localhost/admin/dashboard');
        await proxy(req);

        expect(admin).toHaveBeenCalledOnce();
        expect(storefront).not.toHaveBeenCalled();
    });

    it('dispatches non-admin paths to storefront() and not admin()', async () => {
        const req = new NextRequest('http://localhost/products');
        await proxy(req);

        expect(storefront).toHaveBeenCalledOnce();
        expect(admin).not.toHaveBeenCalled();
    });

    it('returns NextResponse.next() for /.well-known/vercel/... without calling admin or storefront', async () => {
        const nextSpy = vi.spyOn(NextResponse, 'next');
        const req = new NextRequest('http://localhost/.well-known/vercel/flags');
        await proxy(req);

        expect(nextSpy).toHaveBeenCalled();
        expect(admin).not.toHaveBeenCalled();
        expect(storefront).not.toHaveBeenCalled();
    });

    describe('visitor ID cookie', () => {
        it('sets nordcom-visitor-id cookie when absent', async () => {
            const req = new NextRequest('http://shop.example.com/en-US/');
            const res = await proxy(req);
            expect(res.cookies.get('nordcom-visitor-id')?.value).toMatch(/^[0-9a-f-]{36}$/);
        });

        it('does not overwrite an existing nordcom-visitor-id cookie', async () => {
            const req = new NextRequest('http://shop.example.com/en-US/');
            req.cookies.set('nordcom-visitor-id', 'existing-id');
            const res = await proxy(req);
            // The cookie should not be set in the response (only set on first request).
            expect(res.cookies.get('nordcom-visitor-id')).toBeUndefined();
            // The current request's adapter should not see an x-nordcom-visitor-id header.
            expect(req.headers.get('x-nordcom-visitor-id')).toBeNull();
        });

        it('mirrors the visitor ID into request headers for the current request', async () => {
            const req = new NextRequest('http://shop.example.com/en-US/');
            await proxy(req);
            expect(req.headers.get('x-nordcom-visitor-id')).toMatch(/^[0-9a-f-]{36}$/);
        });
    });
});
