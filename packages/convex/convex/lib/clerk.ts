import { customCtx, customMutation } from 'convex-helpers/server/customFunctions';

import { mutation } from '../_generated/server';
import { getClerkOperatorIdentity, requireIdentityEmail } from './auth';

/**
 * Public, Clerk-operator-authenticated mutation constructor — the Clerk tier, sitting alongside the
 * customer tier ({@link authedMutation}) and the system tier ({@link systemMutation}):
 *
 * - `authedMutation` (lib/authed.ts) validates through {@link getTrustedIdentity} (which accepts any
 *   issuer in `auth.config.ts`) and wraps `ctx.db` with the customer RLS policy — one `users` row,
 *   deny all else. For storefront customers.
 * - `systemMutation` (lib/system.ts) is `internalMutation`-backed — internal visibility only, never
 *   callable from the public surface. For webhooks, crons, and migrations.
 * - `clerkMutation` is `mutation`-backed (public visibility) and validates through
 *   {@link getClerkOperatorIdentity}, which re-asserts the `CLERK_FRONTEND_API_URL` issuer specifically
 *   — not just any configured issuer. `ctx.db` is NOT RLS-wrapped: functions defined with this
 *   constructor are the Clerk-operator analog of the system exemptions for the platform-global `users`
 *   table (no tenant key, unreachable through tenant RLS). The identity and email are pinned onto
 *   `ctx.identity` / `ctx.identityEmail` so handlers key writes on JWT claims, not client arguments.
 *
 * The Clerk tier exists for exactly one sanctioned case today: the lazy first-sign-in provisioning
 * path (`clerk/provisioning:ensureCurrentUser`), where the operator's JWT arrives before the
 * `user.created` webhook has delivered the `users` row. The mutation must be PUBLIC (callable from
 * the admin Next.js server) yet must NOT go through `authedMutation` (wrong issuer path) or
 * `tenantMutation` (requires a pre-existing collaborator row).
 *
 * @throws {ConvexError} `UNAUTHENTICATED` when there is no Clerk identity on the request.
 * @throws {ConvexError} `FORGED_IDENTITY` when the identity's issuer does not match `CLERK_FRONTEND_API_URL`.
 * @throws {ConvexError} `IDENTITY_WITHOUT_EMAIL` when the Clerk JWT carries no `email` claim.
 */
export const clerkMutation = customMutation(
    mutation,
    customCtx(async (ctx) => {
        const identity = await getClerkOperatorIdentity(ctx);
        const identityEmail = requireIdentityEmail(identity);
        return { identity, identityEmail };
    }),
);
