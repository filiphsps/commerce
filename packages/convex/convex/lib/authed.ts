import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { mutation, query } from '../_generated/server';
import { getTrustedIdentity, requireIdentityEmail } from './auth';
import { wrapCustomerDatabaseReader, wrapCustomerDatabaseWriter } from './rls';

/**
 * Public, identity-bearing-but-TENANT-LESS query constructor — the customer tier, sitting between
 * {@link tenantQuery} (lib/tenant.ts) and the secret-guarded {@link serverQuery} (lib/server.ts):
 *
 * - `tenantQuery` requires the identity to resolve through `shopCollaborators` to exactly one shop
 *   and scopes `ctx.db` to that tenant — the OPERATOR provenance. A storefront customer holds a
 *   valid token but no collaborator row, so the tenant tier rejects it by design.
 * - `authedQuery` requires only a validated identity (issuer re-asserted via
 *   {@link getTrustedIdentity}) carrying an email claim ({@link requireIdentityEmail}) — the
 *   CUSTOMER provenance. It deliberately resolves NO tenant: instead of a shop-scoped db it
 *   substitutes {@link wrapCustomerDatabaseReader}, which exposes exactly one row in the whole
 *   database — the caller's own `users` row, keyed by the trusted email claim — and denies every
 *   other table (including every tenant table) under `defaultPolicy: 'deny'` with total table
 *   coverage. A customer-tier function is therefore structurally unable to grant operator-tier
 *   tenant access; gaining a tenant still requires the collaborator-membership chain the tenant
 *   constructors enforce.
 *
 * The trusted email is pinned onto `ctx.identityEmail` (and the full identity onto `ctx.identity`)
 * so handlers key their reads/writes on server-derived claims, never on client arguments.
 *
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` from {@link getTrustedIdentity};
 *   `IDENTITY_WITHOUT_EMAIL` from {@link requireIdentityEmail}.
 */
export const authedQuery = customQuery(
    query,
    customCtx(async (ctx) => {
        const identity = await getTrustedIdentity(ctx);
        const identityEmail = requireIdentityEmail(identity);
        return {
            identity,
            identityEmail,
            db: wrapCustomerDatabaseReader(ctx, ctx.db, identityEmail),
        };
    }),
);

/**
 * Public, identity-bearing-but-tenant-less mutation constructor — the write-side companion to
 * {@link authedQuery}, carrying the SAME customer provenance (validated identity + email claim, no
 * tenant resolution) and substituting {@link wrapCustomerDatabaseWriter} for `ctx.db`: the caller
 * can read, patch, or insert ONLY its own email-keyed `users` row, with every other table denied.
 *
 * It exists for exactly one job today: first-visit customer provisioning (`account/profile:provision`),
 * where the storefront's authenticated server path materializes the platform `users` row a customer's
 * trusted identity maps onto. The insert predicate makes that safe to expose publicly — a forged or
 * replayed call can only ever create/touch the row matching the token's own email claim.
 *
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` from {@link getTrustedIdentity};
 *   `IDENTITY_WITHOUT_EMAIL` from {@link requireIdentityEmail}.
 */
export const authedMutation = customMutation(
    mutation,
    customCtx(async (ctx) => {
        const identity = await getTrustedIdentity(ctx);
        const identityEmail = requireIdentityEmail(identity);
        return {
            identity,
            identityEmail,
            db: wrapCustomerDatabaseWriter(ctx, ctx.db, identityEmail),
        };
    }),
);
