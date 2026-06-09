import 'server-only';

import { calculateJwkThumbprint, exportJWK, importPKCS8, type JWK, SignJWT } from 'jose';

/**
 * Lifetime of a minted customer token. Short by design: the token is re-minted from the live
 * NextAuth session on every server-side preload and on every browser `forceRefreshToken` round
 * trip (`convex-auth-fetcher.ts`), so a long lifetime would only widen the replay window after
 * a customer signs out.
 */
export const CONVEX_CUSTOMER_TOKEN_TTL_SECONDS = 60 * 60;

/** The identity slice a Convex customer token is minted from — always derived from the server-trusted NextAuth session, never client input. */
export interface ConvexCustomerClaims {
    email: string;
    name?: string | null;
    id?: string | null;
    image?: string | null;
}

/**
 * The signing material every mint/JWKS call needs: the imported PKCS8 private key, its derived
 * public JWK (the ONLY part the JWKS endpoint serves), and the RFC 7638 thumbprint used as the
 * `kid` binding tokens to that key.
 */
interface ConvexSigningKey {
    privateKey: CryptoKey;
    publicJwk: JWK;
    kid: string;
}

/**
 * Reads and normalizes the RS256 signing key PEM from the environment. Deployment dashboards
 * frequently flatten multi-line PEMs into a single line with literal `\n` sequences, so those
 * are expanded back into real newlines before the PKCS8 import.
 *
 * @param env - Environment to read; defaults to `process.env`.
 * @returns The PKCS8 PEM, or `null` when `CONVEX_AUTH_PRIVATE_KEY` is unset/blank.
 */
function readPrivateKeyPem(env: NodeJS.ProcessEnv): string | null {
    const raw = env.CONVEX_AUTH_PRIVATE_KEY?.trim();
    if (!raw) return null;
    return raw.replace(/\\n/g, '\n');
}

/**
 * Imports the deployment's RS256 signing key and derives its public JWK + `kid`. The public JWK
 * is rebuilt from only the RSA public members (`kty`/`n`/`e`) so a private field can never leak
 * into the JWKS even if `exportJWK` returns the full private key.
 *
 * @param env - Environment to read the PEM from.
 * @returns The signing material, or `null` when no key is configured.
 * @throws Propagates `jose` import errors for a PRESENT-but-malformed PEM — misconfiguration
 *   must surface to the caller (which degrades or logs) rather than silently minting nothing.
 */
async function loadSigningKey(env: NodeJS.ProcessEnv): Promise<ConvexSigningKey | null> {
    const pem = readPrivateKeyPem(env);
    if (!pem) return null;

    const privateKey = await importPKCS8(pem, 'RS256', { extractable: true });
    const fullJwk = await exportJWK(privateKey);
    const publicJwk: JWK = { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e };
    const kid = await calculateJwkThumbprint(publicJwk);
    return { privateKey, publicJwk, kid };
}

/**
 * Mints the RS256 JWT the Convex deployment validates for a storefront CUSTOMER session — the
 * concrete implementation behind the `ConvexCustomerTokenMinter` seam and the
 * `/api/auth/convex-token/` endpoint. Claims match what `packages/convex` trusts:
 * `iss` = `CONVEX_AUTH_ISSUER` (re-asserted by `getTrustedIdentity`), `aud` =
 * `CONVEX_AUTH_APPLICATION_ID` (the `customJwt` provider's `applicationID`), and `email` — the
 * load-bearing claim `resolveUserFromIdentity` keys on. `sub` is the session's stable customer
 * id (falling back to the email), with `name`/`picture` as additive display claims surfaced on
 * `UserIdentity.name`/`pictureUrl`.
 *
 * Fail-closed contract: any missing configuration or signing failure yields `null` (the caller
 * degrades to the read-only snapshot), never a token signed with the wrong material.
 *
 * @param customer - The session-derived identity to mint for; `email` is required.
 * @param env - Environment to read configuration from; defaults to `process.env`.
 * @returns The signed compact JWT, or `null` when minting is unconfigured or fails.
 */
export async function mintConvexCustomerToken(
    customer: ConvexCustomerClaims,
    env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
    const issuer = env.CONVEX_AUTH_ISSUER?.trim();
    const audience = env.CONVEX_AUTH_APPLICATION_ID?.trim();
    if (!issuer || !audience) return null;

    try {
        const signingKey = await loadSigningKey(env);
        if (!signingKey) return null;

        const jwt = new SignJWT({
            email: customer.email,
            ...(customer.name ? { name: customer.name } : {}),
            ...(customer.image ? { picture: customer.image } : {}),
        })
            .setProtectedHeader({ alg: 'RS256', kid: signingKey.kid, typ: 'JWT' })
            .setIssuer(issuer)
            .setAudience(audience)
            .setSubject(customer.id?.trim() || customer.email)
            .setIssuedAt()
            .setExpirationTime(`${CONVEX_CUSTOMER_TOKEN_TTL_SECONDS}s`);

        return await jwt.sign(signingKey.privateKey);
    } catch (error) {
        // A present-but-broken key is an operations problem; surface it in logs but keep the
        // SFREAD-08 contract — the account surface degrades to its snapshot instead of 500ing.
        console.warn('convex-token: failed to mint customer token', error);
        return null;
    }
}

/**
 * Derives the public JWKS document for the deployment's signing key — what
 * `/api/auth/convex-jwks/` serves and `CONVEX_AUTH_JWKS_URL` points the Convex deployment at.
 * There is no separate public-key env var: the public half is always derived from
 * `CONVEX_AUTH_PRIVATE_KEY`, so the pair can never drift.
 *
 * @param env - Environment to read the private key from; defaults to `process.env`.
 * @returns The JWKS (`{ keys: [...] }`) containing only public members, or `null` when no
 *   signing key is configured or the configured key fails to import.
 */
export async function getConvexAuthJwks(env: NodeJS.ProcessEnv = process.env): Promise<{ keys: JWK[] } | null> {
    try {
        const signingKey = await loadSigningKey(env);
        if (!signingKey) return null;

        return {
            keys: [{ ...signingKey.publicJwk, alg: 'RS256', use: 'sig', kid: signingKey.kid }],
        };
    } catch (error) {
        console.warn('convex-token: failed to derive the public JWKS', error);
        return null;
    }
}
