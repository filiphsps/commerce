import type { AuthConfig } from 'convex/server';

import { getServerEnv } from './lib/env';

/**
 * Issuer (`iss`) and audience (`aud`) of the RS256 JWTs the STOREFRONT customer minter and
 * the (legacy) admin minter produce. These remain DEPLOYMENT configuration — set as Convex
 * environment variables, never hardcoded — so the same functions validate tokens from the
 * staging and production origins without a code change. `CONVEX_AUTH_ISSUER` MUST equal the
 * `iss` the minter signs; `CONVEX_AUTH_APPLICATION_ID` MUST equal its `aud`.
 *
 * Retained AFTER the admin Clerk migration because storefront CUSTOMER auth still depends on
 * this provider: `apps/storefront/src/utils/convex-token.ts` mints customer RS256 tokens that
 * `lib/authed.ts` (`authedQuery`/`authedMutation`) validates through `getTrustedIdentity`.
 * Only the ADMIN operator path moves to Clerk; the customer customJwt provider stays until the
 * storefront is migrated in a separate project.
 *
 * Read with an empty-string fallback (rather than throwing) because this module is evaluated
 * during codegen/offline `convex dev`, where the deployment env is absent — a throw there would
 * break codegen. A real deployment that leaves these unset gets a provider that matches no
 * token, failing closed (every `getUserIdentity()` returns `null`) rather than trusting an
 * unverified token.
 */
const issuer = getServerEnv('CONVEX_AUTH_ISSUER') ?? '';
const applicationID = getServerEnv('CONVEX_AUTH_APPLICATION_ID') ?? '';

/**
 * Where Convex fetches the storefront minter's PUBLIC signing keys to verify the customer JWT
 * signature. The minter signs with an RS256 private key and publishes the matching public JWKS
 * at this URL; Convex caches and rotates from it. Defaults to the conventional
 * `/.well-known/jwks.json` under the issuer when an explicit URL is not set.
 */
const jwks = getServerEnv('CONVEX_AUTH_JWKS_URL') ?? `${issuer}/.well-known/jwks.json`;

/**
 * Clerk's Frontend API origin (e.g. `https://clerk.example.com` or the dev
 * `https://<slug>.clerk.accounts.dev`). Convex's native Clerk provider discovers Clerk's JWKS
 * from this domain and validates ADMIN operator tokens issued by Clerk's `convex` JWT template
 * (`applicationID: 'convex'`). DEPLOYMENT configuration — set as a Convex env var per
 * deployment (dev/prod). Empty fallback fails closed during offline codegen and on a
 * misconfigured deployment, exactly like the customJwt issuer above.
 */
const clerkFrontendApiUrl = getServerEnv('CLERK_FRONTEND_API_URL') ?? '';

/**
 * Convex auth provider configuration. Two providers coexist so `ctx.auth.getUserIdentity()`
 * returns a server-trusted identity for a token matching EITHER:
 *
 * 1. **Clerk** (`domain` form) — ADMIN operators. Validated against Clerk's discovered JWKS;
 *    carries the Clerk subject (`user_…`), the `email` claim from the `convex` JWT template,
 *    and the active-organization claims (`org_id`/`org_role`/`org_slug`). `lib/auth.ts`
 *    consumes these to resolve the operator and authorize the active shop via its owning org.
 * 2. **customJwt / RS256** — STOREFRONT customers (and, until removed, the legacy admin minter).
 *    Validated only when `iss` matches {@link issuer} AND `aud` matches {@link applicationID},
 *    against the {@link jwks} public keys. `lib/authed.ts` consumes these for the customer tier.
 *
 * A token authenticates if it satisfies ANY provider; the two issuers are disjoint, so admin
 * Clerk tokens never validate against the customer rule and vice versa. Because the issuers
 * differ, admin/operator code MUST assert the Clerk issuer/claims on its own path rather than
 * reuse the customer-tier `getTrustedIdentity`, which pins {@link issuer}.
 */
export default {
    providers: [
        {
            domain: clerkFrontendApiUrl,
            applicationID: 'convex',
        },
        {
            type: 'customJwt',
            applicationID,
            issuer,
            jwks,
            algorithm: 'RS256',
        },
    ],
} satisfies AuthConfig;
