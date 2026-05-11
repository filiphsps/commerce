import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: any) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

const { GET } = await import('@/app/[domain]/robots.txt/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/robots.txt');
}

describe('app/[domain]/robots.txt', () => {
    describe('GET', () => {
        it('returns 200 status', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            expect(res.status).toBe(200);
        });

        it('returns plain-text content-type', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            // NextResponse defaults to text/plain when no explicit type is set
            const contentType = res.headers.get('content-type');
            // Either unset (default text/plain) or explicitly text/plain
            expect(contentType === null || contentType.includes('text/plain')).toBe(true);
        });

        it('body includes a Sitemap directive pointing to sitemap.xml', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('Sitemap:');
            expect(body).toContain('sitemap.xml');
        });

        it('body includes User-agent allow rule', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('User-agent: *');
            expect(body).toContain('Allow: /');
        });

        it('body includes Host directive with shop domain', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('Host: https://staging.demo.nordcom.io');
        });

        it('body includes Disallow entries for admin and private paths', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('Disallow: /admin/');
            expect(body).toContain('Disallow: /_next/static/chunks/');
        });
    });
});
