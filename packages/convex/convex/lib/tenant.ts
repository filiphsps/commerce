import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { mutation, query } from '../_generated/server';
import { resolveAdminShopId } from './auth';
import { wrapTenantDatabaseReader, wrapTenantDatabaseWriter } from './rls';

/**
 * Public, tenant-scoped query constructor. The companion to {@link systemQuery} (lib/system.ts): where
 * the system tier deliberately leaves the RAW `ctx.db` un-wrapped, this is the DEFAULT surface every
 * tenant read path must use.
 *
 * The customization resolves the active tenant ENTIRELY from server-trusted context — the validated
 * Convex auth identity, via {@link resolveAdminShopId} (identity → `users.by_email` → `shopCollaborators`)
 * — and then:
 * - pins it onto `ctx.shopId`, so handlers read the trusted tenant id rather than re-deriving it; and
 * - replaces `ctx.db` with {@link wrapTenantDatabaseReader}, which range-bounds + deny-default filters
 *   every read to that one shop's rows.
 *
 * The provenance lives in `customCtx`, which receives ONLY the context and never the call arguments, so a
 * client-supplied `shopId` arg is structurally unable to influence the scope: the trusted `ctx.shopId`
 * always wins and any spoofed arg is inert. Built on the PUBLIC `query` builder (not `internalQuery`)
 * because this is the safe, client-reachable surface — the wrapping is exactly what makes public exposure
 * safe.
 *
 * The storefront provenance (a hostname-resolved `shopId` established before any identity exists) is a
 * later task; this constructor ships the admin/identity provenance, which is the one expressible as a
 * server-trusted `ctx` derivation today.
 *
 * @throws {ConvexError} Any auth-resolution failure from {@link resolveAdminShopId} (`UNAUTHENTICATED`,
 *   `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`, `NO_SHOP_MEMBERSHIP`,
 *   `AMBIGUOUS_SHOP_MEMBERSHIP`).
 */
export const tenantQuery = customQuery(
    query,
    customCtx(async (ctx) => {
        const shopId = await resolveAdminShopId(ctx);
        return { shopId, db: wrapTenantDatabaseReader(ctx, ctx.db, shopId) };
    }),
);

/**
 * Public, tenant-scoped mutation constructor — the write-side companion to {@link tenantQuery}, and the
 * tenant-tier counterpart to {@link systemMutation}'s raw-db escape hatch.
 *
 * Resolves the active tenant from the SAME server-trusted identity provenance ({@link resolveAdminShopId}),
 * pins it onto `ctx.shopId`, and replaces `ctx.db` with {@link wrapTenantDatabaseWriter} so every read,
 * insert, patch, replace, and delete is confined to the resolved shop's own rows under a deny-default
 * policy (a cross-tenant write is rejected because the wrapped writer re-checks the read predicate before
 * mutating). As with {@link tenantQuery}, the scope comes only from `ctx`, so a client-supplied `shopId`
 * arg cannot redirect the write.
 *
 * @throws {ConvexError} Any auth-resolution failure from {@link resolveAdminShopId} (`UNAUTHENTICATED`,
 *   `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`, `NO_SHOP_MEMBERSHIP`,
 *   `AMBIGUOUS_SHOP_MEMBERSHIP`).
 */
export const tenantMutation = customMutation(
    mutation,
    customCtx(async (ctx) => {
        const shopId = await resolveAdminShopId(ctx);
        return { shopId, db: wrapTenantDatabaseWriter(ctx, ctx.db, shopId) };
    }),
);
