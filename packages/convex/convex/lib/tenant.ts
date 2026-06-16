import type { Infer } from 'convex/values';
import { v } from 'convex/values';
import { customMutation, customQuery } from 'convex-helpers/server/customFunctions';

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
 * The reserved selector arg the tenant constructors MERGE into every tenant function's args schema and
 * CONSUME before the inner handler runs — the routed `/[domain]/` tenant selection the admin injects
 * centrally (`apps/admin/src/lib/editor-convex-bridge.ts`). Declaring it on the customization (not on
 * each function) is what makes Convex's arg validation ACCEPT the injected selector everywhere while
 * keeping each handler's own validator unchanged: the `input` callback reads it, resolves the scope,
 * and returns `args: {}` so the handler never sees `shopDomain`.
 *
 * Optional because the selector-less path is load-bearing: a single-shop operator (and any non-routed
 * call) omits it and falls back to the lone-membership resolution in {@link resolveActiveAdminShopId}.
 * It can never be spoofed to reach a foreign tenant — `resolveActiveAdminShopId` authorizes the routed
 * domain through `resolveShopAccess`, which re-checks the operator's membership in the shop's owning
 * org before pinning the scope.
 */
const tenantSelectorArgs = { shopDomain: v.optional(v.string()) };

/**
 * Public, tenant-scoped query constructor. The companion to {@link systemQuery} (lib/system.ts): where
 * the system tier deliberately leaves the RAW `ctx.db` un-wrapped, this is the DEFAULT surface every
 * tenant read path must use.
 *
 * The customization resolves the active tenant ENTIRELY from server-trusted context — the validated
 * Convex auth identity plus the routed {@link tenantSelectorArgs} selector — via
 * {@link resolveActiveAdminShopId}: a provided `shopDomain` is authorized through `resolveShopAccess`
 * (routed domain → shop → owning org → `orgMemberships` join), and an absent one falls back to the
 * operator's lone `shopCollaborators` membership. Either way the result is then:
 * - pinned onto `ctx.shopId`, so handlers read the trusted tenant id rather than re-deriving it; and
 * - used to replace `ctx.db` with {@link wrapTenantDatabaseReader}, which range-bounds + deny-default
 *   filters every read to that one shop's rows.
 *
 * The selector is the ONLY tenant input, and it is consumed by the customization — the `input` callback
 * strips `shopDomain` before the handler runs, so a handler's own `shopId`-shaped arg is structurally
 * unable to influence the scope: the trusted `ctx.shopId` always wins and any spoofed arg is inert. The
 * routed selector itself cannot escalate either, because `resolveShopAccess` re-verifies owning-org
 * membership. Built on the PUBLIC `query` builder (not `internalQuery`) because this is the safe,
 * client-reachable surface — the wrapping is exactly what makes public exposure safe.
 *
 * It also admits each invocation through the in-isolate {@link tenantSubscriptionRegistry}: the resolved
 * tenant's open-subscription count drives a per-tenant circuit breaker, so once a shop saturates its live
 * budget further reads surface `ctx.subscriptionMode === 'snapshot'` (a one-shot the handler is expected to
 * poll) instead of a live subscription. The admission is purely additive context — it never relaxes the
 * RLS scope, so the tenant-isolation contract is unchanged. `ctx.releaseSubscription` returns the live slot
 * (a no-op when degraded), letting a one-shot handler reset the breaker as it completes.
 *
 * @throws {ConvexError} Any auth/authorization failure from {@link resolveActiveAdminShopId}
 *   (`UNAUTHENTICATED`, `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`,
 *   `NO_SHOP_MEMBERSHIP`, `AMBIGUOUS_SHOP_MEMBERSHIP`, `UNKNOWN_SHOP`, `SHOP_ORPHANED`,
 *   `SHOP_WITHOUT_ORG`, `NO_ORG_MEMBERSHIP`).
 */
export const tenantQuery = customQuery(query, {
    args: tenantSelectorArgs,
    input: async (ctx, { shopDomain }) => {
        const shopId = await resolveActiveAdminShopId(ctx, shopDomain);
        const subscription = tenantSubscriptionRegistry.open(shopId);
        return {
            ctx: {
                shopId,
                subscriptionMode: subscription.mode,
                releaseSubscription: subscription.release,
                db: wrapTenantDatabaseReader(ctx, ctx.db, shopId),
            },
            args: {},
        };
    },
});

/**
 * Public, tenant-scoped mutation constructor — the write-side companion to {@link tenantQuery}, and the
 * tenant-tier counterpart to {@link systemMutation}'s raw-db escape hatch.
 *
 * Resolves the active tenant from the SAME server-trusted provenance ({@link resolveActiveAdminShopId},
 * the routed {@link tenantSelectorArgs} selector with the lone-membership fallback), pins it onto
 * `ctx.shopId`, and replaces `ctx.db` with {@link wrapTenantDatabaseWriter} so every read, insert,
 * patch, replace, and delete is confined to the resolved shop's own rows under a deny-default policy
 * (a cross-tenant write is rejected because the wrapped writer re-checks the read predicate before
 * mutating). As with {@link tenantQuery}, the `shopDomain` selector is consumed (stripped from the
 * handler args) and authorized through `resolveShopAccess`, so neither a handler `shopId`-shaped arg
 * nor a spoofed routed domain can redirect the write.
 *
 * It admits through the same in-isolate {@link tenantSubscriptionRegistry} as {@link tenantQuery}, exposing
 * `ctx.subscriptionMode` and `ctx.releaseSubscription` for symmetry and the per-tenant cost/usage metric;
 * the admission is additive context only and never widens the RLS write scope.
 *
 * It also pins the ACTING PRINCIPAL onto `ctx.author` ({@link TenantMutationAuthor}) so audit-stamping
 * write paths (the `cmsVersions` author attribution, POLISH-05) read the identity the request already
 * resolved instead of re-deriving it under the RLS-wrapped db, where the platform-global `users` read
 * would be denied. Resolved here in the customization `input` — BEFORE the db is wrapped — via the same
 * {@link resolveUserFromIdentity} chain the shop resolution just walked; the extra indexed point-read is
 * the cost of keeping `resolveActiveAdminShopId`'s contract (an id, not a tuple) unchanged. The label
 * prefers the user's name and falls back to the email when the name is blank.
 *
 * @throws {ConvexError} Any auth/authorization failure from {@link resolveActiveAdminShopId}
 *   (`UNAUTHENTICATED`, `FORGED_IDENTITY`, `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`,
 *   `NO_SHOP_MEMBERSHIP`, `AMBIGUOUS_SHOP_MEMBERSHIP`, `UNKNOWN_SHOP`, `SHOP_ORPHANED`,
 *   `SHOP_WITHOUT_ORG`, `NO_ORG_MEMBERSHIP`).
 */
export const tenantMutation = customMutation(mutation, {
    args: tenantSelectorArgs,
    input: async (ctx, { shopDomain }) => {
        const shopId = await resolveActiveAdminShopId(ctx, shopDomain);
        const user = await resolveUserFromIdentity(ctx);
        const name = user.name.trim();
        const author: TenantMutationAuthor = { userId: user._id, label: name.length > 0 ? name : user.email };
        const subscription = tenantSubscriptionRegistry.open(shopId);
        return {
            ctx: {
                shopId,
                author,
                subscriptionMode: subscription.mode,
                releaseSubscription: subscription.release,
                db: wrapTenantDatabaseWriter(ctx, ctx.db, shopId),
            },
            args: {},
        };
    },
});
