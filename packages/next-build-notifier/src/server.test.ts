import { afterEach, describe, expect, it, vi } from 'vitest';

import { createVersionRoute } from './server';

describe('createVersionRoute', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns the resolved build id as no-store JSON', async () => {
        vi.stubEnv('GIT_COMMIT_SHA', 'abc123');
        const { GET } = createVersionRoute();
        const res = await GET();

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect(res.headers.get('cache-control')).toContain('no-store');

        const body = (await res.json()) as { id: string; ts: number };
        expect(body.id).toBe('abc123');
        expect(typeof body.ts).toBe('number');
        expect(body.ts).toBeGreaterThan(Date.now() - 1000);
    });

    it('reports the build-baked NEXT_PUBLIC_BUILD_ID over a divergent runtime var', async () => {
        // The client bakes `currentBuildId` from `NEXT_PUBLIC_BUILD_ID` (inlined at build). The endpoint
        // must report that SAME id or the "update available" banner never clears. A runtime-only var
        // (here a higher-priority `VERCEL_DEPLOYMENT_ID`) must not win, because the client never saw it.
        vi.stubEnv('NEXT_PUBLIC_BUILD_ID', 'baked-sha');
        vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_runtime');
        const { GET } = createVersionRoute();
        const body = (await (await GET()).json()) as { id: string };

        expect(body.id).toBe('baked-sha');
    });

    it('falls back to resolveBuildId when no baked id is present', async () => {
        vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_runtime');
        const { GET } = createVersionRoute();
        const body = (await (await GET()).json()) as { id: string };

        expect(body.id).toBe('dpl_runtime');
    });

    it('honors a custom resolveId and extra headers', async () => {
        const { GET } = createVersionRoute({
            resolveId: () => 'custom',
            headers: { 'x-test': '1' },
        });
        const res = await GET();
        const body = (await res.json()) as { id: string };

        expect(body.id).toBe('custom');
        expect(res.headers.get('x-test')).toBe('1');
    });

    it('lets options.headers override the default cache-control', async () => {
        const { GET } = createVersionRoute({ headers: { 'cache-control': 'max-age=60' } });
        const res = await GET();

        expect(res.headers.get('cache-control')).toBe('max-age=60');
    });
});
