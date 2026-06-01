import type { AuthConfig } from 'convex/server';

import { getServerEnv } from './lib/env';

/**
 * The NextAuth (Auth.js) app mints the JWTs Convex validates. Its issuer URL (the JWT
 * `iss` claim) and the audience the token is minted for (its `aud` claim) are DEPLOYMENT
 * configuration — set as Convex environment variables on the deployment, never hardcoded
 * — so the same functions validate tokens from the staging and production NextAuth
 * origins without a code change. `CONVEX_AUTH_ISSUER` MUST equal the `iss` the NextAuth
 * `jwt`/`session` callback mints; `CONVEX_AUTH_APPLICATION_ID` MUST equal its `aud`.
 *
 * Read with an empty-string fallback (rather than throwing) because this module is
 * evaluated during codegen/offline `convex dev`, where the deployment env is not present —
 * a throw there would break codegen for an unrelated reason. A real deployment that leaves
 * these unset gets a provider that matches no token, which fails closed (every
 * `getUserIdentity()` returns `null`) rather than trusting an unverified token.
 */
const issuer = getServerEnv('CONVEX_AUTH_ISSUER') ?? '';
const applicationID = getServerEnv('CONVEX_AUTH_APPLICATION_ID') ?? '';

/**
 * Where Convex fetches the NextAuth app's PUBLIC signing keys to verify the JWT signature.
 * NextAuth signs the Convex-targeted token with an RS256 private key and publishes the
 * matching public JWKS at this URL; Convex caches and rotates from it. Defaults to the
 * conventional `/.well-known/jwks.json` under the issuer when an explicit URL is not set.
 */
const jwks = getServerEnv('CONVEX_AUTH_JWKS_URL') ?? `${issuer}/.well-known/jwks.json`;

/**
 * Convex auth provider configuration. Declares the NextAuth app as a `customJwt` provider
 * so `ctx.auth.getUserIdentity()` returns a server-trusted identity ONLY for tokens whose
 * `iss` matches {@link issuer} AND whose `aud` matches {@link applicationID}, verified
 * against the {@link jwks} public keys with RS256.
 *
 * NextAuth's default session cookie is an encrypted JWE that Convex cannot verify, so the
 * integration mints a separate RS256-signed JWT carrying the operator/customer identity
 * (applied to the server `ConvexHttpClient` in `apps/admin/src/lib/convex-auth.ts`, and
 * refreshed into the browser `ConvexReactClient` in
 * `apps/storefront/src/lib/convex-auth-fetcher.ts`); THIS config is the gate that validates
 * it. The `customJwt` form (rather than the OIDC `domain` form) is used because Auth.js
 * exposes no OIDC discovery document, so the JWKS URL must be supplied explicitly.
 *
 * The validated identity is what `lib/auth.ts` (`getTrustedIdentity` / `resolveAdminShopId`)
 * consumes to pin a server-trusted `shopId` for the tenant tier, never a spoofable client arg.
 */
export default {
    providers: [
        {
            type: 'customJwt',
            applicationID,
            issuer,
            jwks,
            algorithm: 'RS256',
        },
    ],
} satisfies AuthConfig;
