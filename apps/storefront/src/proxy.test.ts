import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/middleware/admin', () => ({
    admin: vi.fn().mockResolvedValue(new Response('admin')),
}));

vi.mock('@/middleware/storefront', () => ({
    storefront: vi.fn().mockResolvedValue(new Response('storefront')),
}));

import { admin } from '@/middleware/admin';
import { storefront } from '@/middleware/storefront';
import proxy from '@/proxy';

describe('proxy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
});
