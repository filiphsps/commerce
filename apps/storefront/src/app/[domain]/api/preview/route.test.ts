import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
    draftMode: vi.fn().mockResolvedValue({ enable: vi.fn() }),
}));

vi.mock('@/utils/prismic', () => ({
    createClient: vi.fn().mockReturnValue({
        getByUID: vi.fn().mockResolvedValue({
            data: {},
        }),
    }),
}));

vi.mock('@prismicio/next', () => ({
    redirectToPreviewURL: vi.fn().mockResolvedValue(new Response('Redirect', { status: 307 })),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn().mockResolvedValue({
            id: 'mock-shop-id',
            domain: 'staging.demo.nordcom.io',
            contentProvider: {
                type: 'prismic',
            },
        }),
    },
}));

import { GET } from './route';

describe('GET /api/preview', () => {
    it('returns a response (200, 302, or 307)', async () => {
        const req = new Request('http://x.com/api/preview?token=valid&documentId=doc-1&redirect=/about/');
        const res = await GET(req as any, {
            params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
        });
        expect([200, 302, 307]).toContain(res.status);
    });
});
