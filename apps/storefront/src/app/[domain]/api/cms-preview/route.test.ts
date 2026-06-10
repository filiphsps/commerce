import { draftMode } from 'next/headers';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));

const SECRET = 'preview-secret-value';

/** Builds the activation request the admin preview iframe issues. */
function previewRequest(params: Record<string, string>): NextRequest {
    const url = new URL('https://shop.example.com/api/cms-preview');
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return new NextRequest(url);
}

describe('cms-preview activation route', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.mocked(draftMode).mockReset();
    });

    it('enables draft mode and redirects to the requested storefront path on a valid secret', async () => {
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', SECRET);
        const enable = vi.fn();
        vi.mocked(draftMode).mockResolvedValue({ enable } as never);

        const res = await GET(previewRequest({ secret: SECRET, redirect: '/en-US/about/' }));
        expect(enable).toHaveBeenCalledTimes(1);
        expect(res.status).toBeGreaterThanOrEqual(300);
        expect(res.status).toBeLessThan(400);
        expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/en-US/about/');
    });

    it('rejects a wrong secret with 401 and never toggles the draft cookie', async () => {
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', SECRET);
        const enable = vi.fn();
        vi.mocked(draftMode).mockResolvedValue({ enable } as never);

        const res = await GET(previewRequest({ secret: 'wrong', redirect: '/en-US/about/' }));
        expect(res.status).toBe(401);
        expect(enable).not.toHaveBeenCalled();
    });

    it('fails closed when no secret is configured at all', async () => {
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', '');
        const enable = vi.fn();
        vi.mocked(draftMode).mockResolvedValue({ enable } as never);

        const res = await GET(previewRequest({ secret: '', redirect: '/en-US/' }));
        expect(res.status).toBe(401);
        expect(enable).not.toHaveBeenCalled();
    });

    it('coerces a non-storefront redirect target to the root', async () => {
        vi.stubEnv('STOREFRONT_PREVIEW_SECRET', SECRET);
        vi.mocked(draftMode).mockResolvedValue({ enable: vi.fn() } as never);

        const res = await GET(previewRequest({ secret: SECRET, redirect: '/admin/secrets/' }));
        expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/');
    });
});
