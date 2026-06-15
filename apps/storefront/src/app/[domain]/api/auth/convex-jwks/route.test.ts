import { generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('GET /api/auth/convex-jwks', () => {
    it('serves the public JWKS derived from the configured private key, briefly cacheable', async () => {
        vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', PEM);

        const response = await GET();
        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('public, max-age=300, must-revalidate');

        const body = (await response.json()) as { keys: Record<string, unknown>[] };
        expect(body.keys).toHaveLength(1);
        expect(body.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
        // The private RSA members must never be served.
        expect(body.keys[0]?.d).toBeUndefined();
        expect(body.keys[0]?.p).toBeUndefined();
        expect(body.keys[0]?.q).toBeUndefined();
    });

    it('returns 404 (no-store) when no signing key is configured', async () => {
        // Hermetic: clear the key so the test holds even when a developer's `.env.local` (loaded by
        // `pnpm test` via dotenv) sets CONVEX_AUTH_PRIVATE_KEY; `afterEach` unstubs.
        vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', '');
        const response = await GET();
        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});
