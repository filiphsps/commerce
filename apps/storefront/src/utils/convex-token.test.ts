import { generateKeyPairSync } from 'node:crypto';
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { CONVEX_CUSTOMER_TOKEN_TTL_SECONDS, getConvexAuthJwks, mintConvexCustomerToken } from './convex-token';

const ISSUER = 'https://storefront.test.nordcom.io';
const AUDIENCE = 'convex-storefront';

/**
 * Generates a throwaway RS256 keypair and returns its PKCS8 PEM — the same material an operator
 * would put in `CONVEX_AUTH_PRIVATE_KEY`.
 *
 * @returns The PKCS8-encoded private key PEM.
 */
function generatePrivateKeyPem(): string {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}

const PEM = generatePrivateKeyPem();

/**
 * Builds a fully-configured signing env. The repo's `ProcessEnv` augmentation requires
 * `NODE_ENV`, so the fixture always carries it.
 *
 * @param overrides - Variables layered over (or deleted from, via `undefined`) the baseline.
 * @returns A `ProcessEnv`-shaped fixture.
 */
function signingEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
    return {
        NODE_ENV: 'test',
        CONVEX_AUTH_PRIVATE_KEY: PEM,
        CONVEX_AUTH_ISSUER: ISSUER,
        CONVEX_AUTH_APPLICATION_ID: AUDIENCE,
        ...overrides,
    } as NodeJS.ProcessEnv;
}

describe('mintConvexCustomerToken', () => {
    it('mints an RS256 JWT carrying the iss/aud/sub/email claims the Convex deployment validates', async () => {
        const env = signingEnv();
        const token = await mintConvexCustomerToken(
            {
                email: 'jane@example.com',
                name: 'Jane Customer',
                id: 'customer-1',
                image: 'https://cdn.example.com/jane.png',
            },
            env,
        );

        expect(token).toBeTypeOf('string');
        if (!token) return;

        const jwks = await getConvexAuthJwks(env);
        expect(jwks).not.toBeNull();
        if (!jwks) return;

        const { payload, protectedHeader } = await jwtVerify(token, createLocalJWKSet(jwks), {
            issuer: ISSUER,
            audience: AUDIENCE,
        });

        expect(protectedHeader.alg).toBe('RS256');
        expect(payload.sub).toBe('customer-1');
        expect(payload.email).toBe('jane@example.com');
        expect(payload.name).toBe('Jane Customer');
        expect(payload.picture).toBe('https://cdn.example.com/jane.png');
        expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(CONVEX_CUSTOMER_TOKEN_TTL_SECONDS);
    });

    it('binds the token to the published key: the protected header kid matches the JWKS kid', async () => {
        const env = signingEnv();
        const token = await mintConvexCustomerToken({ email: 'jane@example.com' }, env);
        const jwks = await getConvexAuthJwks(env);

        expect(token).toBeTypeOf('string');
        expect(jwks?.keys[0]?.kid).toBeTypeOf('string');
        if (!token) return;
        expect(decodeProtectedHeader(token).kid).toBe(jwks?.keys[0]?.kid);
    });

    it('falls back to the email as the subject when the session carries no stable id', async () => {
        const token = await mintConvexCustomerToken({ email: 'jane@example.com', id: '   ' }, signingEnv());
        expect(token).toBeTypeOf('string');
        if (!token) return;

        const jwks = await getConvexAuthJwks(signingEnv());
        if (!jwks) return;
        const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), { issuer: ISSUER, audience: AUDIENCE });
        expect(payload.sub).toBe('jane@example.com');
    });

    it('returns null whenever any of the three signing env vars is unconfigured', async () => {
        const customer = { email: 'jane@example.com' };
        await expect(
            mintConvexCustomerToken(customer, signingEnv({ CONVEX_AUTH_PRIVATE_KEY: undefined })),
        ).resolves.toBeNull();
        await expect(
            mintConvexCustomerToken(customer, signingEnv({ CONVEX_AUTH_ISSUER: undefined })),
        ).resolves.toBeNull();
        await expect(
            mintConvexCustomerToken(customer, signingEnv({ CONVEX_AUTH_APPLICATION_ID: undefined })),
        ).resolves.toBeNull();
    });

    it('degrades (null, never a throw) on a present-but-malformed signing key', async () => {
        await expect(
            mintConvexCustomerToken(
                { email: 'jane@example.com' },
                signingEnv({
                    CONVEX_AUTH_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nnot-a-key\n-----END PRIVATE KEY-----',
                }),
            ),
        ).resolves.toBeNull();
    });
});

describe('getConvexAuthJwks', () => {
    it('serves exactly one RS256 signature key with only public RSA members', async () => {
        const jwks = await getConvexAuthJwks(signingEnv());

        expect(jwks?.keys).toHaveLength(1);
        const key = jwks?.keys[0];
        expect(key).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
        expect(key?.n).toBeTypeOf('string');
        expect(key?.e).toBeTypeOf('string');
        expect(key?.kid).toBeTypeOf('string');
        // The private RSA members must never leak into the public document.
        for (const member of ['d', 'p', 'q', 'dp', 'dq', 'qi'] as const) {
            expect(key?.[member]).toBeUndefined();
        }
    });

    it('returns null when no signing key is configured', async () => {
        await expect(getConvexAuthJwks(signingEnv({ CONVEX_AUTH_PRIVATE_KEY: undefined }))).resolves.toBeNull();
    });

    it('expands the single-line `\\n`-escaped PEM form deployment dashboards produce', async () => {
        const flattened = PEM.replace(/\n/g, '\\n');
        const jwks = await getConvexAuthJwks(signingEnv({ CONVEX_AUTH_PRIVATE_KEY: flattened }));
        expect(jwks?.keys).toHaveLength(1);
    });
});
