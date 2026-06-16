import type { GenericQueryCtx, UserIdentity } from 'convex/server';

import type { DataModel, Id } from '../_generated/dataModel';
import { resolveAdminShopId, resolveShopAccess } from '../lib/auth';

/**
 * The slice of a Convex function context this resolver reads: `auth` (to pull the validated
 * {@link UserIdentity}) and the `db` reader (to map the routed selector onto its `shops` row and
 * re-check owning-org membership). Typed as a `Pick` of the read context so BOTH a query and a
 * mutation ctx satisfy it — a mutation's writer `db` is assignable to the reader `db` — mirroring
 * `lib/auth.ts`'s own `AuthReadCtx`, which is module-private there.
 */
type AdminResolveCtx = Pick<GenericQueryCtx<DataModel>, 'auth' | 'db'>;

/**
 * Resolves the single server-trusted `shopId` an admin request is scoped to, honoring the operator's
 * ROUTED tenant selection.
 *
 * This is the admin-side tenant provenance the tenant tier (`tenantQuery`/`tenantMutation`) pins into
 * `ctx.shopId`. Post-Clerk-migration the active tenant rides as the routed `/[domain]/` selector the
 * admin injects (a reserved `shopDomain` arg consumed by the tenant constructor), NOT a signed JWT
 * claim: a Clerk `org_id` cannot identify the shop because one org owns many shops, so the routed
 * domain is what disambiguates a multi-org/multi-shop operator. The selection is never honored as a
 * bare client choice — {@link resolveShopAccess} re-checks the operator's membership in the shop's
 * OWNING org before returning, so a spoofed domain can select among the operator's own tenants but
 * never grant a foreign one:
 *
 * - No routed `domain` → delegate to {@link resolveAdminShopId}, which resolves the operator's lone
 *   membership and deliberately rejects a multi-shop operator as `AMBIGUOUS_SHOP_MEMBERSHIP` (there is
 *   no active tenant to disambiguate to). This keeps single-shop operators and selector-less calls
 *   resolving exactly as before.
 * - A routed `domain` → authorize it through {@link resolveShopAccess} (routed domain → shop → owning
 *   org → `orgMemberships` join), returning the shop id only when the operator belongs to its org.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @param domain - The routed `/[domain]/` selector the admin injected, or `undefined` for the
 *   selector-less lone-membership fallback (single-shop operators, non-routed calls).
 * @returns The `shops` document id the request is scoped to.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` / `UNKNOWN_USER` from the identity → user resolution.
 * @throws {ConvexError} `NO_SHOP_MEMBERSHIP` / `AMBIGUOUS_SHOP_MEMBERSHIP` from {@link resolveAdminShopId} on the no-selector path.
 * @throws {ConvexError} `UNKNOWN_SHOP` / `SHOP_ORPHANED` / `SHOP_WITHOUT_ORG` / `NO_ORG_MEMBERSHIP` from {@link resolveShopAccess} on the routed path.
 */
export async function resolveActiveAdminShopId(ctx: AdminResolveCtx, domain?: string): Promise<Id<'shops'>> {
    if (domain === undefined) {
        return resolveAdminShopId(ctx);
    }
    return resolveShopAccess(ctx, domain);
}
