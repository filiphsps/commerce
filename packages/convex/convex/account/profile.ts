import { ConvexError } from 'convex/values';

import { authedMutation, authedQuery } from '../_constructors';
import { AuthErrorCode } from '../lib/auth';

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
 * Result of `account/profile:provision`, echoing whether this call materialized the row or found
 * it already present — pinned by tests as the idempotency signal, and useful operator telemetry
 * (a `created: true` burst maps to first-visit traffic, not re-auth churn).
 */
export interface ProvisionResult {
    created: boolean;
}

/**
 * The identity-derived "my profile" read behind the storefront wire name `account/profile:get`
 * (`ACCOUNT_PROFILE_QUERY_NAME`): zero client args — the caller is whoever the validated RS256
 * bearer JWT says, never a spoofable argument — returning the claims the storefront minted into
 * that token (`sub`/`name`/`email`/`picture`, re-validated by Convex's `customJwt` provider and
 * the issuer re-assertion inside the constructor).
 *
 * Built on `authedQuery` — the CUSTOMER provenance — rather than `tenantQuery`: a storefront
 * customer holds a valid token but no `shopCollaborators` row, so the tenant tier's identity →
 * user → exactly-one-membership chain rejected every customer by design. The customer tier
 * anchors the call on the caller's own platform `users` row instead (identity email →
 * `users.by_email`, read through the customer-scoped db that exposes ONLY that row): provisioned
 * customers serve live, while an identity with no `users` row (not yet provisioned) is still
 * rejected as `UNKNOWN_USER` and the island degrades to its session snapshot. Crucially this
 * grants NO tenant reach — the customer-scoped db denies every tenant table, so a customer
 * reading its profile gains nothing an operator's collaborator membership would grant.
 *
 * The profile fields come from the trusted identity claims rather than the `users` row because
 * the claims are exactly what the island's snapshot renders, keeping both sources
 * pixel-identical; the row read is the provenance anchor, not the display source.
 *
 * @returns The caller's {@link AccountProfile}.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   customer constructor's identity resolution; `UNKNOWN_USER` when no platform `users` row backs
 *   the identity (the not-yet-provisioned customer, degrading the island to its snapshot).
 */
export const get = authedQuery({
    args: {},
    handler: async (ctx): Promise<AccountProfile> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .first();
        if (!user) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'No platform user matches the trusted identity.',
            });
        }

        return {
            id: ctx.identity.subject,
            name: ctx.identity.name ?? null,
            email: ctx.identity.email ?? null,
            image: ctx.identity.pictureUrl ?? null,
        };
    },
});

/**
 * First-visit customer provisioning behind the storefront wire name `account/profile:provision`:
 * idempotently materializes the platform `users` row the caller's trusted identity maps onto, so
 * the subsequent `account/profile:get` serves live instead of rejecting `UNKNOWN_USER`.
 *
 * Zero client args by contract — every field of the new row derives from the TRUSTED identity
 * claims (the email key via `ctx.identityEmail`, display name and avatar from the validated
 * token), so a malicious caller cannot provision or reshape anyone else's row; the customer
 * tier's insert predicate additionally rejects any row whose email differs from the claim.
 *
 * Idempotency reuses the `identities` upsert uniqueness pattern (`db/identities.ts`): the
 * `by_email` lookup and the insert share one serializable Convex transaction, so two concurrent
 * first visits still yield exactly one row — `.unique()` would surface a pre-existing duplicate
 * loudly rather than silently picking one. A pre-existing row is returned untouched (NOT patched
 * with fresher claims): the row may have been created by the admin's Auth.js adapter with richer
 * fields, and a customer token must never overwrite operator-managed user data.
 *
 * @returns A {@link ProvisionResult} flagging whether this call created the row.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   customer constructor's identity resolution.
 */
export const provision = authedMutation({
    args: {},
    handler: async (ctx): Promise<ProvisionResult> => {
        const existing = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .unique();
        if (existing) {
            return { created: false };
        }

        const now = Date.now();
        await ctx.db.insert('users', {
            email: ctx.identityEmail,
            name: ctx.identity.name ?? '',
            ...(ctx.identity.pictureUrl ? { avatar: ctx.identity.pictureUrl } : {}),
            emailVerified: null,
            identities: [],
            createdAt: now,
            updatedAt: now,
        });
        return { created: true };
    },
});
