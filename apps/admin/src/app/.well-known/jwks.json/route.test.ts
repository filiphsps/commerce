import { generateKeyPairSync } from 'node:crypto';
import { decodeProtectedHeader } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mintConvexOperatorToken } from '@/lib/convex-token';
import { GET } from './route';

const PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('GET /.well-known/jwks.json', () => {
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

    // The whole point of the endpoint: the key it serves must carry the SAME `kid` the minter
    // stamps on operator tokens, or the Convex deployment's customJwt provider can never match a
    // minted token to a public key — every identity-scoped read would fail closed.
    it('serves the kid the operator-token minter stamps, so minted tokens validate', async () => {
        const env = {
            NODE_ENV: 'test',
            CONVEX_AUTH_PRIVATE_KEY: PEM,
            CONVEX_AUTH_ISSUER: 'https://admin.test.nordcom.io',
            CONVEX_AUTH_APPLICATION_ID: 'convex',
        } as NodeJS.ProcessEnv;
        const token = await mintConvexOperatorToken({ email: 'op@example.com' }, env);
        if (!token) throw new TypeError('expected a minted token');
        const mintedKid = decodeProtectedHeader(token).kid;

        vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', PEM);
        const body = (await (await GET()).json()) as { keys: Array<{ kid?: string }> };

        expect(mintedKid).toBeTypeOf('string');
        expect(body.keys[0]?.kid).toBe(mintedKid);
    });

    it('returns 404 (no-store) when no signing key is configured', async () => {
        // Force-clear the ambient key (dotenv loads a real one) so the unconfigured branch runs.
        vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', '');
        const response = await GET();
        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });
});
