import { tenantQuery } from '../_constructors';
import { getTrustedIdentity } from '../lib/auth';

/**
 * The read-only profile slice the storefront's lane-2 account island renders — kept in lockstep
 * with `AccountProfileSnapshot` in the storefront's `account-profile-contract.ts` so the live
 * result and the server-derived session snapshot are interchangeable (the load-bearing property
 * of the snapshot-then-live contract).
 */
export interface AccountProfile {
    id: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
}

/**
 * The identity-derived "my profile" read behind the storefront wire name `account/profile:get`
 * (`ACCOUNT_PROFILE_QUERY_NAME`): zero client args — the caller is whoever the validated RS256
 * bearer JWT says, never a spoofable argument — returning the claims the storefront minted into
 * that token (`sub`/`name`/`email`/`picture`, re-validated by Convex's `customJwt` provider and
 * the in-handler issuer re-assertion).
 *
 * Built on `tenantQuery`, so the constructor's server-trusted provenance chain (identity →
 * `users.by_email` → single `shopCollaborators` membership) gates the call BEFORE the handler
 * runs: an identity with no platform `users` row (today's storefront customers — they are minted
 * a valid token but have no Convex user yet) or no/ambiguous shop membership is rejected, and the
 * island degrades to its session snapshot. The profile fields come from the trusted identity
 * claims rather than a `users`-row read because the tenant tier's RLS reader denies the
 * platform-global `users` table by design — and the claims are exactly what the island's
 * snapshot renders, keeping both sources pixel-identical.
 *
 * @returns The caller's {@link AccountProfile}.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` /
 *   `UNKNOWN_USER` / `NO_SHOP_MEMBERSHIP` / `AMBIGUOUS_SHOP_MEMBERSHIP` from the tenant
 *   constructor's identity resolution (and the redundant in-handler `getTrustedIdentity`).
 */
export const get = tenantQuery({
    args: {},
    handler: async (ctx): Promise<AccountProfile> => {
        const identity = await getTrustedIdentity(ctx);

        return {
            id: identity.subject,
            name: identity.name ?? null,
            email: identity.email ?? null,
            image: identity.pictureUrl ?? null,
        };
    },
});
