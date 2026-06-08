import type { GenericQueryCtx, UserIdentity } from 'convex/server';
import { ConvexError } from 'convex/values';

import type { DataModel, Id } from '../_generated/dataModel';
import { getTrustedIdentity, resolveAdminShopId, resolveUserFromIdentity } from '../lib/auth';

/**
 * The slice of a Convex function context this resolver reads: `auth` (to pull the validated
 * {@link UserIdentity}) and the `db` reader (to map the active-tenant selection onto its `shops` row
 * and re-check membership). Typed as a `Pick` of the read context so BOTH a query and a mutation ctx
 * satisfy it — a mutation's writer `db` is assignable to the reader `db` — mirroring `lib/auth.ts`'s
 * own `AuthReadCtx`, which is module-private there.
 */
type AdminResolveCtx = Pick<GenericQueryCtx<DataModel>, 'auth' | 'db'>;

/**
 * The custom JWT claim that carries the admin operator's ACTIVE tenant selection — the server-trusted
 * analog of Payload's `payload-tenant` cookie. The admin app's Convex token minter
 * (`apps/admin/src/lib/convex-auth.ts`) stamps the operator's currently-selected shop's external
 * `shop.id` (the `shops.legacyId`, the same id the Payload tenant switcher uses) into this claim, so
 * the selection rides INSIDE the signed identity and can never arrive as a spoofable function argument.
 */
export const ACTIVE_SHOP_CLAIM = 'activeShop';

/**
 * Stable string codes carried on the {@link ConvexError}s this resolver raises beyond the
 * identity/membership failures it inherits from `lib/auth.ts` ({@link AuthErrorCode}). Call sites and
 * `convex-test` branch on these instead of string-matching messages.
 */
export const AdminShopResolverErrorCode = {
    /** The active-tenant claim names a `shops.legacyId` that resolves to no shop row (stale / deleted tenant). */
    ACTIVE_SHOP_UNKNOWN: 'ACTIVE_SHOP_UNKNOWN',
    /** The claim names a real shop the operator does NOT collaborate on — a cross-tenant escalation, refused. */
    ACTIVE_SHOP_FORBIDDEN: 'ACTIVE_SHOP_FORBIDDEN',
} as const;

/**
 * Reads the active-tenant selection from a validated identity's {@link ACTIVE_SHOP_CLAIM}.
 *
 * Custom JWT claims surface on {@link UserIdentity} via its index signature as `JSONValue | undefined`;
 * only a non-empty string is a usable shop selector. Anything else (absent, wrong type, blank) is
 * treated as "no selection", which routes the caller to the single-membership fallback.
 *
 * @param identity - The server-trusted identity Convex validated for the request.
 * @returns The selected shop's external `legacyId`, or `undefined` when the identity carries no usable selection.
 */
function readActiveShopSelection(identity: UserIdentity): string | undefined {
    const raw = identity[ACTIVE_SHOP_CLAIM];
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Resolves the single server-trusted `shopId` an admin request is scoped to, honoring the operator's
 * ACTIVE tenant selection.
 *
 * This is the admin-side tenant provenance the tenant tier (`tenantQuery`/`tenantMutation`,
 * CONVEXCORE-07) pins into `ctx.shopId`, layering active-tenant selection on top of CONVEXCORE-14's
 * membership check. The selection is derived ENTIRELY from the signed identity's {@link ACTIVE_SHOP_CLAIM}
 * (never a client argument), so an operator cannot redirect the scope by passing a different shop:
 *
 * - No selection claim → delegate to {@link resolveAdminShopId}, which resolves the operator's lone
 *   membership and deliberately rejects a multi-shop operator as `AMBIGUOUS_SHOP_MEMBERSHIP` (there is
 *   no active tenant to disambiguate to).
 * - A selection claim → resolve it to a `shops` row by `legacyId` and CONFIRM the operator actually
 *   collaborates on it before returning. The claim selects AMONG the operator's own tenants; it never
 *   grants access to one they lack, so a claim naming a foreign shop is refused, not honored.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @returns The `shops` document id the request is scoped to.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` / `UNKNOWN_USER` from the identity → user resolution.
 * @throws {ConvexError} `NO_SHOP_MEMBERSHIP` / `AMBIGUOUS_SHOP_MEMBERSHIP` from {@link resolveAdminShopId} on the no-selection path.
 * @throws {ConvexError} `ACTIVE_SHOP_UNKNOWN` when the selection claim resolves to no shop.
 * @throws {ConvexError} `ACTIVE_SHOP_FORBIDDEN` when the selected shop exists but the operator does not collaborate on it.
 */
export async function resolveActiveAdminShopId(ctx: AdminResolveCtx): Promise<Id<'shops'>> {
    const identity = await getTrustedIdentity(ctx);
    const selection = readActiveShopSelection(identity);

    if (selection === undefined) {
        return resolveAdminShopId(ctx);
    }

    const user = await resolveUserFromIdentity(ctx);

    const shop = await ctx.db
        .query('shops')
        .withIndex('by_legacy_id', (q) => q.eq('legacyId', selection))
        .first();
    if (!shop) {
        throw new ConvexError({
            code: AdminShopResolverErrorCode.ACTIVE_SHOP_UNKNOWN,
            message: 'Active-tenant selection does not resolve to a known shop.',
        });
    }

    const membership = await ctx.db
        .query('shopCollaborators')
        .withIndex('by_shop_user', (q) => q.eq('shop', shop._id).eq('user', user._id))
        .first();
    if (!membership) {
        throw new ConvexError({
            code: AdminShopResolverErrorCode.ACTIVE_SHOP_FORBIDDEN,
            message: 'Operator does not collaborate on the selected shop.',
        });
    }

    return shop._id;
}
