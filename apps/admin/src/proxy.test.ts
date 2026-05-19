import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// The proxy is wrapped in NextAuth's `auth(...)` higher-order function so the
// admin app's request pipeline can read the session before our redirect rules
// run. For these tests the wrapper has nothing meaningful to do — we only want
// to exercise the inner request handler. Stub `next-auth` so `NextAuth(...).auth`
// is the identity function: `auth(fn) => fn`. With that in place, the module
// graph's `export default auth(handler)` resolves to `handler` and the tests
// can call it directly with a single `NextRequest`.
//
// The auth.config import is stubbed alongside because its module is server-only
// and pulls in cookie / crypto dependencies that vitest's node env can't satisfy.
vi.mock('next-auth', () => ({
    default: () => ({
        auth: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    }),
}));
vi.mock('@/utils/auth.config', () => ({ default: {} }));

describe('admin proxy', () => {
    it('exports a default function (pass-through)', async () => {
        const mod = await import('./proxy');
        expect(typeof mod.default).toBe('function');
    });

    it('exports a config object with a matcher array', async () => {
        const { config } = await import('./proxy');
        expect(Array.isArray(config.matcher)).toBe(true);
        expect(config.matcher.length).toBeGreaterThan(0);
    });

    it('matcher pattern excludes Next.js internal prefixes (_next, _static, _vercel)', async () => {
        const { config } = await import('./proxy');
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('_next');
        expect(matcherStr).toContain('_static');
        expect(matcherStr).toContain('_vercel');
    });

    it('matcher pattern excludes favicon.ico and static files', async () => {
        const { config } = await import('./proxy');
        const matcherStr = String(config.matcher[0]);
        expect(matcherStr).toContain('favicon.ico');
    });

    it('config includes missing header conditions to skip prefetch requests', async () => {
        const { config } = await import('./proxy');
        expect(Array.isArray(config.missing)).toBe(true);
        const keys = config.missing!.map((m: { key: string }) => m.key);
        expect(keys).toContain('next-router-prefetch');
        expect(keys).toContain('purpose');
    });

    describe('legacy /cms redirect', () => {
        it('redirects /cms (exact) with 301 to /', async () => {
            const { default: proxy } = (await import('./proxy')) as unknown as {
                default: (request: NextRequest) => Promise<Response> | Response;
            };
            const request = new NextRequest('http://localhost/cms');
            const response = (await proxy(request)) as Response;
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('redirects /cms/ with 301 to /', async () => {
            const { default: proxy } = (await import('./proxy')) as unknown as {
                default: (request: NextRequest) => Promise<Response> | Response;
            };
            const request = new NextRequest('http://localhost/cms/');
            const response = (await proxy(request)) as Response;
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('redirects /cms/collections/anything with 301 to /', async () => {
            const { default: proxy } = (await import('./proxy')) as unknown as {
                default: (request: NextRequest) => Promise<Response> | Response;
            };
            const request = new NextRequest('http://localhost/cms/collections/anything');
            const response = (await proxy(request)) as Response;
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('passes through /some-domain/content/ without redirect', async () => {
            const { default: proxy } = (await import('./proxy')) as unknown as {
                default: (request: NextRequest) => Promise<Response> | Response;
            };
            const request = new NextRequest('http://localhost/some-domain/content/');
            const response = (await proxy(request)) as Response;
            // NextResponse.next() does not set a Location header
            expect(response.headers.get('location')).toBeNull();
        });

        it('passes through /cms-admin without redirect (not a /cms/ prefix match)', async () => {
            const { default: proxy } = (await import('./proxy')) as unknown as {
                default: (request: NextRequest) => Promise<Response> | Response;
            };
            const request = new NextRequest('http://localhost/cms-admin');
            const response = (await proxy(request)) as Response;
            expect(response.headers.get('location')).toBeNull();
        });
    });
});
