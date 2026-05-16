import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Undo the global vi.mock('flags', ...) and vi.mock('@/utils/flags', ...)
// from vitest.setup.ts — we need the real flag declarations + access-proof helpers.
vi.unmock('flags');
vi.unmock('@/utils/flags');

vi.mock('next/headers', () => ({
    headers: vi.fn(),
    cookies: vi.fn(),
}));

vi.mock('@/utils/flags/adapter', () => ({
    nordcomFlagAdapter: () => ({
        identify: () => ({}),
        decide: () => false,
    }),
}));

const { createAccessProof } = (await vi.importActual('flags')) as {
    createAccessProof(secret: string): Promise<string>;
};

// 32-byte base64 key (256-bit) — sufficient for verifyAccess / signing.
const SECRET = Buffer.from('test-secret-test-secret-test-sec').toString('base64');
const originalSecret = process.env.FLAGS_SECRET;

describe('GET /.well-known/vercel/flags', () => {
    beforeEach(() => {
        process.env.FLAGS_SECRET = SECRET;
        vi.resetModules();
    });

    afterEach(() => {
        if (originalSecret === undefined) delete process.env.FLAGS_SECRET;
        else process.env.FLAGS_SECRET = originalSecret;
    });

    it('returns 401 when Authorization header is missing', async () => {
        const { GET } = await import('@/app/.well-known/vercel/flags/route');
        const req = new Request('http://shop.example.com/.well-known/vercel/flags');
        const res = await GET(req as never);
        expect(res.status).toBe(401);
    });

    it('returns 200 with x-flags-sdk-version when authorized', async () => {
        const proof = await createAccessProof(SECRET);
        const { GET } = await import('@/app/.well-known/vercel/flags/route');
        const req = new Request('http://shop.example.com/.well-known/vercel/flags', {
            headers: { Authorization: `Bearer ${proof}` },
        });
        const res = await GET(req as never);
        expect(res.status).toBe(200);
        expect(res.headers.get('x-flags-sdk-version')).toBeTruthy();
    });

    it('payload includes every declared flag', async () => {
        const proof = await createAccessProof(SECRET);
        const { GET } = await import('@/app/.well-known/vercel/flags/route');
        const req = new Request('http://shop.example.com/.well-known/vercel/flags', {
            headers: { Authorization: `Bearer ${proof}` },
        });
        const res = await GET(req as never);
        const body = (await res.json()) as { definitions?: Record<string, unknown> };
        const keys = Object.keys(body.definitions ?? {});
        expect(keys).toEqual(
            expect.arrayContaining([
                'search-filter',
                'product-page-info-lines',
                'header-search-bar',
                'products-page',
                'accounts-functionality',
            ]),
        );
    });
});
