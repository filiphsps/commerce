import { afterEach, describe, expect, it, vi } from 'vitest';

import { convexLocalCliEnv, DEV_LOCAL, isBackendHealthy } from './dev-local';

afterEach(() => vi.restoreAllMocks());

describe('DEV_LOCAL constants', () => {
    it('pins the fixed dev backend shape', () => {
        expect(DEV_LOCAL.port).toBe(3210);
        expect(DEV_LOCAL.url).toBe('http://127.0.0.1:3210');
        expect(DEV_LOCAL.dataDir).toBe('.convex-local');
        expect(DEV_LOCAL.serverSecret).toBe('dev-local-secret');
    });
});

describe('convexLocalCliEnv', () => {
    it('targets the self-hosted local backend with the admin key and blanks cloud selectors', () => {
        const env = convexLocalCliEnv('http://127.0.0.1:3210', 'admin-key-123', { PATH: '/bin' });
        expect(env.CONVEX_SELF_HOSTED_URL).toBe('http://127.0.0.1:3210');
        expect(env.CONVEX_SELF_HOSTED_ADMIN_KEY).toBe('admin-key-123');
        expect(env.CONVEX_DEPLOYMENT).toBe('');
        expect(env.CONVEX_DEPLOY_KEY).toBe('');
        expect(env.PATH).toBe('/bin');
    });
});

describe('isBackendHealthy', () => {
    it('is true on a 200 from /instance_name', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(true);
    });

    it('is false when the fetch rejects (nothing listening)', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });

    it('is false on a non-200', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
        expect(await isBackendHealthy('http://127.0.0.1:3210')).toBe(false);
    });
});
