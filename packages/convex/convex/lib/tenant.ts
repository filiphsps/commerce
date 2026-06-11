import type { Infer } from 'convex/values';
import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { mutation, query } from '../_generated/server';
import { resolveActiveAdminShopId } from '../auth/admin_shop_resolver';
import type { cmsVersionAuthorValidator } from '../tables/cmsVersions';
import { resolveUserFromIdentity } from './auth';
import { wrapTenantDatabaseReader, wrapTenantDatabaseWriter } from './rls';
import { tenantSubscriptionRegistry } from './subscription_registry';

/**
 * The acting principal a {@link tenantMutation} pins onto `ctx.author`: the platform `users` id the
 * trusted identity resolved to plus a display label frozen at request time. Typed off the
 * `cmsVersions.author` validator so the ctx shape and the persisted shape can never drift.
 */
export type TenantMutationAuthor = Infer<typeof cmsVersionAuthorValidator>;

/**
 * Public, tenant-scoped query constructor. The companion to {@link systemQuery} (lib/system.ts): where
 * the system tier deliberately leaves the RAW `ctx.db` un-wrapped, this is the DEFAULT surface every
 * tenant read path must use.
 *
 * The customization resolves the active tenant ENTIRELY from server-trusted context — the validated
 * Convex auth identity, via {@link resolveActiveAdminShopId} (identity → `users.by_email` →
 * `shopCollaborators`, honoring the signed active-shop selection claim a multi-shop operator's token
 * carries; membership is re-verified before the selection pins, so the claim can select among the
 * operator's own tenants but never grant a foreign one) — and then:
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
 * It also admits each invocation through the in-isolate {@link tenantSubscriptionRegistry}: the resolved
 * tenant's open-subscription count drives a per-tenant circuit breaker, so once a shop saturates its live
 * budget further reads surface `ctx.subscriptionMode === 'snapshot'` (a one-shot the handler is expected to
 * poll) instead of a live subscription. The admission is purely additive context — it never relaxes the
 * RLS scope, so the tenant-isolation contract is unchanged. `ctx.releaseSubscription` returns the live slot
 * (a no-op when degraded), letting a one-shot handler reset the breaker as it completes.
 *
 * @throws {ConvexError} Any auth-resolution failure from {@link resolveActiveAdminShopId}
 *   (`UNAUTHENTICATED`, `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`,
 *   `NO_SHOP_MEMBERSHIP`, `AMBIGUOUS_SHOP_MEMBERSHIP`, `ACTIVE_SHOP_UNKNOWN`, `ACTIVE_SHOP_FORBIDDEN`).
 */
export const tenantQuery = customQuery(
    query,
    customCtx(async (ctx) => {
        const shopId = await resolveActiveAdminShopId(ctx);
        const subscription = tenantSubscriptionRegistry.open(shopId);
        return {
            shopId,
            subscriptionMode: subscription.mode,
            releaseSubscription: subscription.release,
            db: wrapTenantDatabaseReader(ctx, ctx.db, shopId),
        };
    }),
);

/**
 * Public, tenant-scoped mutation constructor — the write-side companion to {@link tenantQuery}, and the
 * tenant-tier counterpart to {@link systemMutation}'s raw-db escape hatch.
 *
 * Resolves the active tenant from the SAME server-trusted identity provenance
 * ({@link resolveActiveAdminShopId}, active-shop selection included),
 * pins it onto `ctx.shopId`, and replaces `ctx.db` with {@link wrapTenantDatabaseWriter} so every read,
 * insert, patch, replace, and delete is confined to the resolved shop's own rows under a deny-default
 * policy (a cross-tenant write is rejected because the wrapped writer re-checks the read predicate before
 * mutating). As with {@link tenantQuery}, the scope comes only from `ctx`, so a client-supplied `shopId`
 * arg cannot redirect the write.
 *
 * It admits through the same in-isolate {@link tenantSubscriptionRegistry} as {@link tenantQuery}, exposing
 * `ctx.subscriptionMode` and `ctx.releaseSubscription` for symmetry and the per-tenant cost/usage metric;
 * the admission is additive context only and never widens the RLS write scope.
 *
 * It also pins the ACTING PRINCIPAL onto `ctx.author` ({@link TenantMutationAuthor}) so audit-stamping
 * write paths (the `cmsVersions` author attribution, POLISH-05) read the identity the request already
 * resolved instead of re-deriving it under the RLS-wrapped db, where the platform-global `users` read
 * would be denied. Resolved here in `customCtx` — BEFORE the db is wrapped — via the same
 * {@link resolveUserFromIdentity} chain the shop resolution just walked; the extra indexed point-read is
 * the cost of keeping `resolveActiveAdminShopId`'s contract (an id, not a tuple) unchanged. The label
 * prefers the user's name and falls back to the email when the name is blank.
 *
 * @throws {ConvexError} Any auth-resolution failure from {@link resolveActiveAdminShopId}
 *   (`UNAUTHENTICATED`, `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`,
 *   `NO_SHOP_MEMBERSHIP`, `AMBIGUOUS_SHOP_MEMBERSHIP`, `ACTIVE_SHOP_UNKNOWN`, `ACTIVE_SHOP_FORBIDDEN`).
 */
export const tenantMutation = customMutation(
    mutation,
    customCtx(async (ctx) => {
        const shopId = await resolveActiveAdminShopId(ctx);
        const user = await resolveUserFromIdentity(ctx);
        const name = user.name.trim();
        const author: TenantMutationAuthor = { userId: user._id, label: name.length > 0 ? name : user.email };
        const subscription = tenantSubscriptionRegistry.open(shopId);
        return {
            shopId,
            author,
            subscriptionMode: subscription.mode,
            releaseSubscription: subscription.release,
            db: wrapTenantDatabaseWriter(ctx, ctx.db, shopId),
        };
    }),
);
