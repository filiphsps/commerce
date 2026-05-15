import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

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
            const { default: proxy } = await import('./proxy');
            const request = new NextRequest('http://localhost/cms');
            const response = proxy(request);
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('redirects /cms/ with 301 to /', async () => {
            const { default: proxy } = await import('./proxy');
            const request = new NextRequest('http://localhost/cms/');
            const response = proxy(request);
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('redirects /cms/collections/anything with 301 to /', async () => {
            const { default: proxy } = await import('./proxy');
            const request = new NextRequest('http://localhost/cms/collections/anything');
            const response = proxy(request);
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('http://localhost/');
        });

        it('passes through /some-domain/content/ without redirect', async () => {
            const { default: proxy } = await import('./proxy');
            const request = new NextRequest('http://localhost/some-domain/content/');
            const response = proxy(request);
            // NextResponse.next() does not set a Location header
            expect(response.headers.get('location')).toBeNull();
        });

        it('passes through /cms-admin without redirect (not a /cms/ prefix match)', async () => {
            const { default: proxy } = await import('./proxy');
            const request = new NextRequest('http://localhost/cms-admin');
            const response = proxy(request);
            expect(response.headers.get('location')).toBeNull();
        });
    });
});
