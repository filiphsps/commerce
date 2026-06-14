import { generateKeyPairSync } from 'node:crypto';
import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { ACTIVE_SHOP_CLAIM } from '../../../../packages/convex/convex/auth/admin_shop_resolver';
import { CONVEX_ACTIVE_SHOP_CLAIM, isOperatorTokenMintingConfigured, mintConvexOperatorToken } from './convex-token';

const ISSUER = 'https://admin.test.nordcom.io';
const AUDIENCE = 'convex-admin';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

/**
 * Builds a fully-configured signing env. The repo's `ProcessEnv` augmentation requires `NODE_ENV`,
 * so the fixture always carries it.
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

/**
 * Mints with the real RS256 path and returns the signature-verified payload — every claim
 * assertion below runs against what the Convex deployment would actually validate, not a bare
 * base64 decode.
 *
 * @param operator - The operator identity to mint for.
 * @returns The verified JWT payload.
 */
async function mintAndVerify(operator: Parameters<typeof mintConvexOperatorToken>[0]) {
    const token = await mintConvexOperatorToken(operator, signingEnv());
    expect(token).toBeTypeOf('string');
    if (!token) throw new TypeError('expected a minted token');
    const { payload } = await jwtVerify(token, publicKey, { issuer: ISSUER, audience: AUDIENCE });
    return payload;
}

describe('mintConvexOperatorToken (active-shop selection claim)', () => {
    it('pins the claim name to the Convex resolver contract', () => {
        // The resolver reads exactly this key off the validated identity; a drift here would
        // silently demote every multi-shop operator back to AMBIGUOUS_SHOP_MEMBERSHIP.
        expect(CONVEX_ACTIVE_SHOP_CLAIM).toBe(ACTIVE_SHOP_CLAIM);
    });

    it('stamps the active-shop claim from the operator selection alongside the identity claims', async () => {
        const payload = await mintAndVerify({
            email: 'operator@example.com',
            name: 'Multi-Shop Operator',
            activeShop: 'shop_b',
        });

        expect(payload[CONVEX_ACTIVE_SHOP_CLAIM]).toBe('shop_b');
        expect(payload.email).toBe('operator@example.com');
        expect(payload.sub).toBe('operator@example.com');
        expect(payload.name).toBe('Multi-Shop Operator');
    });

    it('mints a claim-less token when the operator carries no selection (single-shop back-compat)', async () => {
        const payload = await mintAndVerify({ email: 'operator@example.com' });

        expect(payload).not.toHaveProperty(CONVEX_ACTIVE_SHOP_CLAIM);
        expect(payload.email).toBe('operator@example.com');
    });

    it('treats a blank selection as no selection rather than stamping an empty claim', async () => {
        const payload = await mintAndVerify({ email: 'operator@example.com', activeShop: '   ' });

        expect(payload).not.toHaveProperty(CONVEX_ACTIVE_SHOP_CLAIM);
    });
});

describe('isOperatorTokenMintingConfigured', () => {
    it('is true when the key, issuer, and audience are all present', () => {
        expect(isOperatorTokenMintingConfigured(signingEnv())).toBe(true);
    });

    it('is false when the RS256 private key is missing (the reseeded-dev gap)', () => {
        expect(isOperatorTokenMintingConfigured(signingEnv({ CONVEX_AUTH_PRIVATE_KEY: undefined }))).toBe(false);
    });

    it('is false when the issuer or audience is missing', () => {
        expect(isOperatorTokenMintingConfigured(signingEnv({ CONVEX_AUTH_ISSUER: undefined }))).toBe(false);
        expect(isOperatorTokenMintingConfigured(signingEnv({ CONVEX_AUTH_APPLICATION_ID: '   ' }))).toBe(false);
    });
});
