import 'server-only';

import { calculateJwkThumbprint, exportJWK, importPKCS8, type JWK, SignJWT } from 'jose';

import type { ConvexOperatorIdentity } from './convex-auth';

/**
 * Lifetime of a minted operator token. Short by design: every editor server
 * action re-mints from the live NextAuth session, so a long lifetime would
 * only widen the replay window after an operator signs out.
 */
export const CONVEX_OPERATOR_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * The signing material every mint needs: the imported PKCS8 private key and
 * the RFC 7638 thumbprint used as the `kid` binding tokens to that key.
 */
interface ConvexSigningKey {
    privateKey: CryptoKey;
    kid: string;
}

/**
 * Reads and normalizes the RS256 signing key PEM from the environment.
 * Deployment dashboards frequently flatten multi-line PEMs into a single line
 * with literal `\n` sequences, so those are expanded back into real newlines
 * before the PKCS8 import.
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
 * Imports the deployment's RS256 signing key and derives its `kid`. The same
 * `CONVEX_AUTH_PRIVATE_KEY` material the storefront's minter and JWKS endpoint
 * use (`apps/storefront/src/utils/convex-token.ts`), so admin-minted tokens
 * validate against the one JWKS the Convex deployment is pointed at.
 *
 * @param env - Environment to read the PEM from.
 * @returns The signing material, or `null` when no key is configured.
 * @throws Propagates `jose` import errors for a PRESENT-but-malformed PEM —
 *   misconfiguration must surface to the caller rather than silently minting nothing.
 */
async function loadSigningKey(env: NodeJS.ProcessEnv): Promise<ConvexSigningKey | null> {
    const pem = readPrivateKeyPem(env);
    if (!pem) return null;

    const privateKey = await importPKCS8(pem, 'RS256', { extractable: true });
    const fullJwk = await exportJWK(privateKey);
    const publicJwk: JWK = { kty: fullJwk.kty, n: fullJwk.n, e: fullJwk.e };
    const kid = await calculateJwkThumbprint(publicJwk);
    return { privateKey, kid };
}

/**
 * Mints the RS256 JWT the Convex deployment validates for an admin OPERATOR
 * session — the concrete {@link import('./convex-auth').ConvexTokenMinter}
 * behind `authenticateConvexClient`. Shares the storefront customer minter's
 * signing contract exactly (key, `iss` = `CONVEX_AUTH_ISSUER`, `aud` =
 * `CONVEX_AUTH_APPLICATION_ID`, `kid` binding): `email` is the load-bearing
 * claim `resolveUserFromIdentity` keys on, with `sub` = the operator's email
 * and `name` as an additive display claim. The `activeShop` tenant-selection
 * claim (`auth/admin_shop_resolver.ts`) is NOT stamped yet — the bridge seam
 * carries no tenant selection and the resolver stays dormant until the
 * multi-tenant operator flow wires it.
 *
 * Fail-closed contract: missing configuration or a signing failure yields
 * `null` (the caller fails loud at the write seam), never a token signed with
 * the wrong material.
 *
 * @param operator - The session-derived identity to mint for; `email` is required.
 * @param env - Environment to read configuration from; defaults to `process.env`.
 * @returns The signed compact JWT, or `null` when minting is unconfigured or fails.
 */
export async function mintConvexOperatorToken(
    operator: ConvexOperatorIdentity,
    env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
    const issuer = env.CONVEX_AUTH_ISSUER?.trim();
    const audience = env.CONVEX_AUTH_APPLICATION_ID?.trim();
    if (!issuer || !audience) return null;

    try {
        const signingKey = await loadSigningKey(env);
        if (!signingKey) return null;

        const jwt = new SignJWT({
            email: operator.email,
            ...(operator.name ? { name: operator.name } : {}),
        })
            .setProtectedHeader({ alg: 'RS256', kid: signingKey.kid, typ: 'JWT' })
            .setIssuer(issuer)
            .setAudience(audience)
            .setSubject(operator.email)
            .setIssuedAt()
            .setExpirationTime(`${CONVEX_OPERATOR_TOKEN_TTL_SECONDS}s`);

        return await jwt.sign(signingKey.privateKey);
    } catch (error) {
        // A present-but-broken key is an operations problem; surface it in logs and
        // let the caller fail loud (ConvexOperatorTokenMintError) instead of 500ing here.
        console.warn('convex-token: failed to mint operator token', error);
        return null;
    }
}
