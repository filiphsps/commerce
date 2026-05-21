import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_HOSTNAME, admin } from '@/middleware/admin';

// ---------------------------------------------------------------------------
// describe: admin middleware — hostname-based redirect to the admin domain
// ---------------------------------------------------------------------------

describe('admin middleware', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('redirects a valid hostname to the admin domain with the hostname as a path segment', async () => {
        const req = new NextRequest('http://myshop.com/');
        const res = await admin(req);

        // Default ADMIN_HOSTNAME is 'admin.localhost' when ADMIN_DOMAIN is unset.
        expect(res.headers.get('location')).toBe(`https://${ADMIN_HOSTNAME}/myshop.com/`);
    });

    it('returns a 3xx redirect status (Next.js default)', async () => {
        const req = new NextRequest('http://myshop.com/');
        const res = await admin(req);

        // Don't pin a specific status — Next.js may use 307 or 308 depending on version.
        expect(res.status).toBeGreaterThanOrEqual(300);
        expect(res.status).toBeLessThan(400);
    });

    it('URI-encodes the hostname into the redirect path segment', async () => {
        // VALID_HOSTNAME forbids most special chars, but a valid hostname like
        // 'sub.domain.com' still contains dots which `encodeURIComponent` leaves alone.
        // Use a known-safe hostname and assert the encoded form appears verbatim.
        const req = new NextRequest('http://sub.domain.com/');
        const res = await admin(req);

        expect(res.headers.get('location')).toBe(`https://${ADMIN_HOSTNAME}/${encodeURIComponent('sub.domain.com')}/`);
    });

    it('accepts a hostname of exactly 253 characters (DNS cap boundary)', async () => {
        // 249 a's + '.com' → 253 chars total, the largest allowed by the > 253 guard.
        const boundaryHost = `${'a'.repeat(249)}.com`;
        expect(boundaryHost).toHaveLength(253);
        const req = new NextRequest(`http://${boundaryHost}/`);
        const res = await admin(req);

        expect(res.status).toBeGreaterThanOrEqual(300);
        expect(res.status).toBeLessThan(400);
    });

    it('returns 400 Bad Request when the hostname is 254 characters (just over the DNS cap)', async () => {
        // 250 a's + '.com' → 254 chars total, the smallest value rejected by > 253.
        // Targets the off-by-one boundary precisely; a regression to `>= 253` or
        // `> 254` would slip past a smoke test that just uses a "very long" host.
        const longHost = `${'a'.repeat(250)}.com`;
        expect(longHost).toHaveLength(254);
        const req = new NextRequest(`http://${longHost}/`);
        const res = await admin(req);

        expect(res.status).toBe(400);
        expect(res.headers.get('cache-control')).toBe('no-store');
        await expect(res.text()).resolves.toBe('Bad Request');
    });

    it('returns 400 for hostnames that fail the VALID_HOSTNAME format (e.g., underscore)', async () => {
        // Underscores are URL-parseable but rejected by VALID_HOSTNAME — protects
        // against host-header injection that could pass through URL parsing.
        const req = new NextRequest('http://under_score.com/');
        const res = await admin(req);

        expect(res.status).toBe(400);
        expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('returns 400 when the hostname is empty', async () => {
        // An empty hostname cannot be produced via a NextRequest URL string, and
        // the middleware reads `.hostname` off `req.nextUrl.clone()`, not the
        // original — so stub the `clone()` method to return an empty-hostname URL.
        const req = new NextRequest('http://myshop.com/');
        const fakeClone = { hostname: '' };
        vi.spyOn(req.nextUrl, 'clone').mockReturnValue(fakeClone as unknown as ReturnType<typeof req.nextUrl.clone>);

        const res = await admin(req);

        expect(res.status).toBe(400);
        expect(res.headers.get('cache-control')).toBe('no-store');
    });

    it('honors ADMIN_DOMAIN env when set (captured at module load)', async () => {
        // ADMIN_HOSTNAME is read once at module-init via `??`, so we must reset
        // the module registry and re-import to pick up the new env value.
        vi.resetModules();
        const original = process.env.ADMIN_DOMAIN;
        process.env.ADMIN_DOMAIN = 'admin.example.com';
        try {
            const { admin: scopedAdmin } = await import('./admin');
            const req = new NextRequest('http://myshop.com/');
            const res = await scopedAdmin(req);

            expect(res.headers.get('location')).toBe('https://admin.example.com/myshop.com/');
        } finally {
            if (original !== undefined) {
                process.env.ADMIN_DOMAIN = original;
            } else {
                delete process.env.ADMIN_DOMAIN;
            }
            vi.resetModules();
        }
    });

    it('defaults ADMIN_HOSTNAME to "admin.localhost" when ADMIN_DOMAIN env is unset', async () => {
        // Lock-in test for the literal fallback used in dev / test environments.
        vi.resetModules();
        const original = process.env.ADMIN_DOMAIN;
        delete process.env.ADMIN_DOMAIN;
        try {
            const { ADMIN_HOSTNAME: scopedHostname } = await import('./admin');
            expect(scopedHostname).toBe('admin.localhost');
        } finally {
            if (original !== undefined) {
                process.env.ADMIN_DOMAIN = original;
            }
            vi.resetModules();
        }
    });
});
